import axios from 'axios';
import { config } from '../config/env';

const EMBEDDING_DIM = 384; // all-MiniLM-L6-v2 dimension

// Cache embeddings to avoid repeated API calls
const embeddingCache = new Map<string, number[]>();

/**
 * Generate embedding using HuggingFace Inference API (all-MiniLM-L6-v2)
 * Falls back to a simple TF-IDF-like vector if API is unavailable
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = text.substring(0, 100);
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  // Try HuggingFace API if key is available
  if (config.HF_API_KEY) {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
        { inputs: text },
        {
          headers: { Authorization: `Bearer ${config.HF_API_KEY}` },
          timeout: 10000,
        }
      );
      const embedding = response.data as number[];
      embeddingCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.warn('HuggingFace API failed, using fallback embedding:', error);
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
      const response = await axios.post(
        'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
        { inputs: texts },
        {
          headers: { Authorization: `Bearer ${config.HF_API_KEY}` },
          timeout: 30000,
        }
      );
      return response.data as number[][];
    } catch (error) {
      console.warn('Batch HuggingFace API failed, using fallback:', error);
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
