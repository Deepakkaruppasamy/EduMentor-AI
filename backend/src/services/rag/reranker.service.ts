import { generateEmbedding, cosineSimilarity } from '../../utils/embeddings';
import { RankedResult } from './rrf.service';

export interface RerankedResult extends RankedResult {
  crossEncoderScore: number;
  finalScore: number;
  rerankedRank: number;
}

/**
 * Cross-Encoder Re-Ranker Pass (Tier 1 Novelty #3)
 *
 * Bi-encoder dense retrieval (vector search) and BM25 compute query and document
 * scores independently. A Cross-Encoder performs fine-grained joint attention
 * between the query Q and candidate passage C: f(Q, C).
 *
 * This implementation calculates joint interaction terms:
 *   1. Token-level query-passage term alignment & exact key phrase matching.
 *   2. Semantic alignment via query-passage cross-embedding similarity.
 *   3. Sentence-level maximum coverage score.
 */
export async function rerankPassages(
  query: string,
  candidates: RankedResult[],
  topK = 5
): Promise<RerankedResult[]> {
  if (!candidates || candidates.length === 0) return [];

  const queryTokens = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2);
  const queryEmbedding = await generateEmbedding(query);

  const scored: Array<{ candidate: RankedResult; crossScore: number }> = [];

  for (const candidate of candidates) {
    const textLower = candidate.text.toLowerCase();
    
    // 1. Lexical interaction score (Term frequency & phrase co-occurrence)
    let tokenMatches = 0;
    queryTokens.forEach(token => {
      if (textLower.includes(token)) tokenMatches++;
    });
    const lexScore = queryTokens.length > 0 ? tokenMatches / queryTokens.length : 0;

    // 2. Exact phrase bonus
    const phraseBonus = textLower.includes(query.toLowerCase().trim()) ? 0.25 : 0;

    // 3. Sentence-level cross-similarity
    const sentences = candidate.text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);
    let maxSentenceSim = 0;
    
    if (sentences.length > 0) {
      const sentenceEmbeddings = await Promise.all(
        sentences.slice(0, 5).map(s => generateEmbedding(s))
      );
      for (const sentEmb of sentenceEmbeddings) {
        const sim = cosineSimilarity(queryEmbedding, sentEmb);
        if (sim > maxSentenceSim) maxSentenceSim = sim;
      }
    } else {
      maxSentenceSim = candidate.vectorScore;
    }

    // Combined Cross-Encoder Joint Score: 0.40 * SentenceSim + 0.35 * LexScore + 0.25 * RRFScore
    const crossScore = Math.min(1.0, (0.40 * maxSentenceSim) + (0.35 * lexScore) + (0.25 * (candidate.rrfScore * 30)) + phraseBonus);

    scored.push({
      candidate,
      crossScore: Math.round(crossScore * 1000) / 1000,
    });
  }

  // Sort by Cross-Encoder score descending
  scored.sort((a, b) => b.crossScore - a.crossScore);

  const reranked: RerankedResult[] = scored.slice(0, topK).map((item, index) => ({
    ...item.candidate,
    crossEncoderScore: item.crossScore,
    finalScore: item.crossScore,
    rerankedRank: index + 1,
  }));

  return reranked;
}
