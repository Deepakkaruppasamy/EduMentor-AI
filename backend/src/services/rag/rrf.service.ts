export interface RankedResult {
  id: string;
  text: string;
  metadata: Record<string, any>;
  vectorScore: number;
  bm25Score: number;
  rrfScore: number;
  rank: number;
}

/**
 * Reciprocal Rank Fusion algorithm
 * Combines rankings from multiple retrieval systems
 * RRF(d) = Σ 1/(k + rank(d)) where k=60 is the smoothing constant
 */
export function reciprocalRankFusion(
  vectorResults: Array<{ id: string; text: string; metadata: Record<string, any>; score: number }>,
  bm25Results: Array<{ id: string; text: string; metadata: Record<string, any>; score: number }>,
  k = 60
): RankedResult[] {
  const rrfScores = new Map<
    string,
    {
      text: string;
      metadata: Record<string, any>;
      vectorRank: number;
      bm25Rank: number;
      vectorScore: number;
      bm25Score: number;
      rrfScore: number;
    }
  >();

  // Process vector results
  vectorResults.forEach((result, index) => {
    const rank = index + 1;
    const existing = rrfScores.get(result.id);
    if (existing) {
      existing.vectorRank = rank;
      existing.vectorScore = result.score;
      existing.rrfScore += 1 / (k + rank);
    } else {
      rrfScores.set(result.id, {
        text: result.text,
        metadata: result.metadata,
        vectorRank: rank,
        bm25Rank: Infinity,
        vectorScore: result.score,
        bm25Score: 0,
        rrfScore: 1 / (k + rank),
      });
    }
  });

  // Process BM25 results
  bm25Results.forEach((result, index) => {
    const rank = index + 1;
    const existing = rrfScores.get(result.id);
    if (existing) {
      existing.bm25Rank = rank;
      existing.bm25Score = result.score;
      existing.rrfScore += 1 / (k + rank);
    } else {
      rrfScores.set(result.id, {
        text: result.text,
        metadata: result.metadata,
        vectorRank: Infinity,
        bm25Rank: rank,
        vectorScore: 0,
        bm25Score: result.score,
        rrfScore: 1 / (k + rank),
      });
    }
  });

  // Sort by RRF score descending
  const sorted = Array.from(rrfScores.entries())
    .sort(([, a], [, b]) => b.rrfScore - a.rrfScore)
    .map(([id, data], index) => ({
      id,
      text: data.text,
      metadata: data.metadata,
      vectorScore: data.vectorScore,
      bm25Score: data.bm25Score,
      rrfScore: data.rrfScore,
      rank: index + 1,
    }));

  return sorted;
}
