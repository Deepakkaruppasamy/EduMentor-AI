import axios from 'axios';
import { config } from '../config/env';

const EMBEDDING_DIM = 384; // all-MiniLM-L6-v2 dimension

// Cache embeddings to avoid repeated API calls
const embeddingCache = new Map<string, number[]>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust fetch helper with retries and exponential backoff
 */
async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`⚠️ HuggingFace API request failed (${error.message || error}). Retrying in ${delayMs}ms... (${retries} attempts left)`);
      await delay(delayMs);
      return fetchWithRetry(fn, retries - 1, delayMs * 1.5);
    }
    throw error;
  }
}

/**
 * Generate embedding using HuggingFace Inference API (all-MiniLM-L6-v2)
 * Falls back to a simple TF-IDF-like vector if API is unavailable
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = text.substring(0, 100);
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  if (config.HF_API_KEY) {
    try {
      const embedding = await fetchWithRetry(async () => {
        const response = await axios.post(
          'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
          { inputs: text },
          {
            headers: { Authorization: `Bearer ${config.HF_API_KEY}` },
            timeout: 15000,
          }
        );
        return response.data;
      }, 3, 2000);

      if (Array.isArray(embedding)) {
        let finalEmbedding: any = embedding;
        // Recursively unpack nested arrays if returned (e.g. [[...]])
        while (Array.isArray(finalEmbedding) && Array.isArray(finalEmbedding[0])) {
          finalEmbedding = finalEmbedding[0];
        }
        if (Array.isArray(finalEmbedding) && typeof finalEmbedding[0] === 'number') {
          embeddingCache.set(cacheKey, finalEmbedding);
          return finalEmbedding;
        }
      }
      console.warn('HuggingFace API returned invalid embedding format, using fallback:', embedding);
    } catch (error: any) {
      console.warn('HuggingFace API failed after retries, using fallback embedding:', error.message || error);
    }
  }

  // Fallback: deterministic hash-based embedding for development
  const embedding = hashToEmbedding(text);
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

/**
 * Generate embeddings for multiple texts efficiently
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (config.HF_API_KEY) {
    try {
      const data = await fetchWithRetry(async () => {
        const response = await axios.post(
          'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
          { inputs: texts },
          {
            headers: { Authorization: `Bearer ${config.HF_API_KEY}` },
            timeout: 30000,
          }
        );
        return response.data;
      }, 3, 2000);

      if (Array.isArray(data) && data.length > 0) {
        const validated: number[][] = [];
        for (const item of data) {
          if (Array.isArray(item)) {
            let finalVec: any = item;
            while (Array.isArray(finalVec) && Array.isArray(finalVec[0])) {
              finalVec = finalVec[0];
            }
            if (Array.isArray(finalVec) && typeof finalVec[0] === 'number') {
              validated.push(finalVec);
            }
          }
        }
        if (validated.length === data.length) {
          return validated;
        }
      }
      console.warn('Batch HuggingFace API returned invalid format, using fallback.');
    } catch (error: any) {
      console.warn('Batch HuggingFace API failed after retries, using fallback:', error.message || error);
    }
  }

  return texts.map((t) => hashToEmbedding(t));
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Simple deterministic hash-based embedding fallback
 * Used when no API key is available (development)
 */
function hashToEmbedding(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const idx = (word.charCodeAt(i) * (i + 1) * 31 + word.length * 17) % EMBEDDING_DIM;
      vec[idx] += 1 / words.length;
    }
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}
