import { generateEmbedding, cosineSimilarity } from '../../utils/embeddings';
import { config } from '../../config/env';

export interface SentenceAnalysis {
  sentence: string;
  maxSimilarity: number;
  bestMatchChunk: string;
  isHallucinated: boolean;
}

export interface HallucinationResult {
  trustScore: number;
  status: 'verified' | 'partially_verified' | 'hallucinated';
  sentenceAnalysis: SentenceAnalysis[];
  hallucinatedSentences: string[];
  supportedSentences: string[];
  verdict: string;
}

/**
 * Hallucination Detection Module
 * 
 * Compares each sentence in the LLM response against the retrieved chunks.
 * Uses cosine similarity between sentence embeddings and chunk embeddings.
 * Computes a trust score based on how well the response is grounded in sources.
 */
export async function detectHallucination(
  generatedAnswer: string,
  retrievedChunks: string[],
  threshold = config.HALLUCINATION_THRESHOLD
): Promise<HallucinationResult> {
  // Split answer into sentences
  const sentences = splitIntoSentences(generatedAnswer).filter((s) => s.length > 20);

  if (sentences.length === 0 || retrievedChunks.length === 0) {
    return {
      trustScore: 100,
      status: 'verified',
      sentenceAnalysis: [],
      hallucinatedSentences: [],
      supportedSentences: [],
      verdict: 'No analysis possible - empty content',
    };
  }

  // Generate embeddings for all sentences and chunks in parallel
  const [sentenceEmbeddings, chunkEmbeddings] = await Promise.all([
    Promise.all(sentences.map((s) => generateEmbedding(s))),
    Promise.all(retrievedChunks.map((c) => generateEmbedding(c.substring(0, 512)))),
  ]);

  const sentenceAnalysis: SentenceAnalysis[] = [];
  let totalSimilarity = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentEmb = sentenceEmbeddings[i];
    let maxSim = 0;
    let bestMatchChunk = '';

    // Find best matching chunk for this sentence
    for (let j = 0; j < chunkEmbeddings.length; j++) {
      const sim = cosineSimilarity(sentEmb, chunkEmbeddings[j]);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatchChunk = retrievedChunks[j].substring(0, 200) + '...';
      }
    }

    totalSimilarity += maxSim;
    sentenceAnalysis.push({
      sentence: sentences[i],
      maxSimilarity: Math.round(maxSim * 100) / 100,
      bestMatchChunk,
      isHallucinated: maxSim < threshold,
    });
  }

  const avgSimilarity = totalSimilarity / sentences.length;
  const trustScore = Math.round(avgSimilarity * 100);
  const hallucinatedSentences = sentenceAnalysis.filter((s) => s.isHallucinated).map((s) => s.sentence);
  const supportedSentences = sentenceAnalysis.filter((s) => !s.isHallucinated).map((s) => s.sentence);

  let status: 'verified' | 'partially_verified' | 'hallucinated';
  let verdict: string;

  if (trustScore >= 75) {
    status = 'verified';
    verdict = `Response is well-grounded in course materials. ${supportedSentences.length}/${sentences.length} claims verified.`;
  } else if (trustScore >= 45) {
    status = 'partially_verified';
    verdict = `Response is partially supported. ${hallucinatedSentences.length} claim(s) may not be directly from course materials.`;
  } else {
    status = 'hallucinated';
    verdict = `Response contains significant unsupported claims. Please verify with original course materials.`;
  }

  return {
    trustScore,
    status,
    sentenceAnalysis,
    hallucinatedSentences,
    supportedSentences,
    verdict,
  };
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries
  return text
    .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
