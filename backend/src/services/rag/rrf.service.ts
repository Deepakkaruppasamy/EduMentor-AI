export interface RankedResult {
  id: string;
  text: string;
  metadata: Record<string, any>;
  vectorScore: number;
  bm25Score: number;
  rrfScore: number;
  rank: number;
}

export type QueryIntent = 'definition' | 'conceptual' | 'procedural' | 'balanced';

export interface RrfWeightConfig {
  vectorWeight: number;
  bm25Weight: number;
  intent: QueryIntent;
  explanation: string;
}

/**
 * Classifies query intent to dynamically set RRF fusion weights.
 * Novelty: Static RRF uses equal 1/(k+r) weighting regardless of domain query properties.
 * Course-Adaptive RRF dynamically tunes alpha_vector and alpha_bm25 based on semantics:
 *   - Definition / Terminology / Acronym queries -> BM25 Heavy (0.75 BM25, 0.25 Vector)
 *   - Conceptual / Reasoning / Explanatory queries -> Dense Vector Heavy (0.75 Vector, 0.25 BM25)
 *   - Procedural / Code / Balanced -> Equal Weights (0.50 Vector, 0.50 BM25)
 */
export function classifyQueryIntent(query: string): RrfWeightConfig {
  const q = query.trim().toLowerCase();

  const isDefinition =
    /\b(what is|define|definition of|meaning of|stand for|acronym|term|syntax|what does)\b/i.test(q) ||
    (q.split(' ').length <= 3 && !/\b(how|why)\b/i.test(q));

  const isConceptual =
    /\b(why|how does|explain|difference between|compare|relationship|describe|impact of|overview|concept|principle|evaluate)\b/i.test(q);

  if (isDefinition) {
    return {
      vectorWeight: 0.25,
      bm25Weight: 0.75,
      intent: 'definition',
      explanation: 'Definition/Terminology query: weighted towards BM25 keyword matching (α_bm25=0.75, α_vec=0.25)',
    };
  }

  if (isConceptual) {
    return {
      vectorWeight: 0.75,
      bm25Weight: 0.25,
      intent: 'conceptual',
      explanation: 'Conceptual/Explanatory query: weighted towards Dense Vector embeddings (α_vec=0.75, α_bm25=0.25)',
    };
  }

  return {
    vectorWeight: 0.50,
    bm25Weight: 0.50,
    intent: 'balanced',
    explanation: 'Balanced query intent: symmetric RRF fusion weights (α_vec=0.50, α_bm25=0.50)',
  };
}

/**
 * Course-Adaptive Reciprocal Rank Fusion algorithm
 * RRF(d) = (alpha_vec / (k + rank_vec(d))) + (alpha_bm25 / (k + rank_bm25(d)))
 */
export function reciprocalRankFusion(
  vectorResults: Array<{ id: string; text: string; metadata: Record<string, any>; score: number }>,
  bm25Results: Array<{ id: string; text: string; metadata: Record<string, any>; score: number }>,
  k = 60,
  weights: { vectorWeight?: number; bm25Weight?: number } = { vectorWeight: 1, bm25Weight: 1 }
): RankedResult[] {
  const vectorWeight = weights.vectorWeight ?? 1;
  const bm25Weight = weights.bm25Weight ?? 1;

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
      existing.rrfScore += vectorWeight / (k + rank);
    } else {
      rrfScores.set(result.id, {
        text: result.text,
        metadata: result.metadata,
        vectorRank: rank,
        bm25Rank: Infinity,
        vectorScore: result.score,
        bm25Score: 0,
        rrfScore: vectorWeight / (k + rank),
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
      existing.rrfScore += bm25Weight / (k + rank);
    } else {
      rrfScores.set(result.id, {
        text: result.text,
        metadata: result.metadata,
        vectorRank: Infinity,
        bm25Rank: rank,
        vectorScore: 0,
        bm25Score: result.score,
        rrfScore: bm25Weight / (k + rank),
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
