import { vectorSearch } from '../../utils/chroma';
import { getBM25Index } from './bm25-search.service';
import { reciprocalRankFusion, classifyQueryIntent, RankedResult, RrfWeightConfig } from './rrf.service';
import { rerankPassages, RerankedResult } from './reranker.service';
import { config } from '../../config/env';
import { expandQueryWithGraph, GraphExpansionResult } from './knowledge-graph.service';
import { pruneContextChunks, PrunerStats } from './context-pruner.service';

export interface RetrievedChunk {
  id: string;
  text: string;
  documentId: string;
  documentName: string;
  pageNumber?: number;
  vectorScore: number;
  bm25Score: number;
  rerankScore?: number;
  finalScore: number;
  rank: number;
  metadata?: Record<string, any>;
}

export interface HybridRAGResult {
  chunks: RetrievedChunk[];
  context: string;
  retrievalMethod: string;
  /** Course-Adaptive RRF Weighting metadata (Tier 1 Novelty #1) */
  adaptiveWeights?: RrfWeightConfig;
  /** Cross-Encoder Re-Ranker metadata (Tier 1 Novelty #3) */
  isReranked?: boolean;
  /** Graph-RAG expansion metadata */
  graphExpansion?: GraphExpansionResult;
  /** Context pruning statistics */
  prunerStats?: PrunerStats;
}

/**
 * Hybrid RAG with Course-Adaptive RRF Weighting & Cross-Encoder Re-Ranking
 */
export async function hybridRetrieve(
  query: string,
  collectionName: string,
  topK = config.TOP_K_RESULTS,
  targetDocumentId?: string,
  courseId?: string,
  options: { enableAdaptiveRrf?: boolean; enableReranker?: boolean } = { enableAdaptiveRrf: true, enableReranker: true }
): Promise<HybridRAGResult> {
  let graphExpansion: GraphExpansionResult | undefined;
  let effectiveQuery = query;

  if (courseId) {
    try {
      graphExpansion = await expandQueryWithGraph(query, courseId);
      effectiveQuery = graphExpansion.expandedQuery;
    } catch (err) {
      console.warn('[GraphRAG] Query expansion failed, using original query:', err);
    }
  }

  // Determine Course-Adaptive RRF Fusion Weights based on query intent classification
  const adaptiveWeights = options.enableAdaptiveRrf !== false
    ? classifyQueryIntent(effectiveQuery)
    : { vectorWeight: 1.0, bm25Weight: 1.0, intent: 'balanced' as const, explanation: 'Static RRF (Equal Weights)' };

  const fetchCount = topK * 3;

  const [vectorResults, bm25Results] = await Promise.all([
    vectorSearch(collectionName, effectiveQuery, fetchCount),
    Promise.resolve(getBM25Index(collectionName).search(effectiveQuery, fetchCount)),
  ]);

  let filteredVector = vectorResults;
  let filteredBM25 = bm25Results;

  if (targetDocumentId) {
    filteredVector = vectorResults.filter((v) => String(v.metadata?.documentId || '') === String(targetDocumentId));
    filteredBM25 = bm25Results.filter((b) => String(b.metadata?.documentId || '') === String(targetDocumentId));
  }

  const mappedVectorResults = filteredVector.map((v) => ({
    id: v.id,
    text: v.document,
    metadata: v.metadata,
    score: v.score,
  }));

  // Apply Weighted Reciprocal Rank Fusion (Tier 1 Novelty #1)
  const fused = reciprocalRankFusion(mappedVectorResults, filteredBM25, 60, {
    vectorWeight: adaptiveWeights.vectorWeight,
    bm25Weight: adaptiveWeights.bm25Weight,
  });

  const candidatePool = fused.slice(0, topK * 2);

  // Apply Cross-Encoder Re-Ranker Pass (Tier 1 Novelty #3)
  let finalTopResults: (RankedResult | RerankedResult)[] = candidatePool.slice(0, topK);
  let isReranked = false;

  if (options.enableReranker !== false && candidatePool.length > 0) {
    try {
      finalTopResults = await rerankPassages(effectiveQuery, candidatePool, topK);
      isReranked = true;
    } catch (err) {
      console.warn('[ReRanker] Pass failed, falling back to RRF ordering:', err);
    }
  }

  const chunks: RetrievedChunk[] = finalTopResults.map((result, idx) => {
    const isRerankedResult = 'crossEncoderScore' in result;
    return {
      id: result.id,
      text: result.text,
      documentId: result.metadata.documentId || '',
      documentName: result.metadata.documentName || 'Unknown Document',
      pageNumber: result.metadata.pageNumber,
      vectorScore: result.vectorScore,
      bm25Score: result.bm25Score,
      rerankScore: isRerankedResult ? (result as RerankedResult).crossEncoderScore : undefined,
      finalScore: isRerankedResult ? (result as RerankedResult).finalScore : result.rrfScore,
      rank: idx + 1,
      metadata: result.metadata,
    };
  });

  // Semantic Context Token Pruning
  let context: string;
  let prunerStats: PrunerStats | undefined;

  try {
    const prunerInput = chunks.map((c) => ({
      text: c.text,
      documentName: c.documentName,
      pageNumber: c.pageNumber,
    }));
    const pruned = await pruneContextChunks(prunerInput, query);
    context = pruned.prunedText;
    prunerStats = pruned.stats;
  } catch (err) {
    context = chunks
      .map(
        (chunk, i) =>
          `[Source ${i + 1}: ${chunk.documentName}${chunk.pageNumber ? `, p.${chunk.pageNumber}` : ''}]\n${chunk.text}`
      )
      .join('\n\n---\n\n');
  }

  const retrievalMethod = `Adaptive Hybrid RAG (Intent: ${adaptiveWeights.intent}, Re-Ranked: ${isReranked ? 'Yes' : 'No'})`;

  return { chunks, context, retrievalMethod, adaptiveWeights, isReranked, graphExpansion, prunerStats };
}

/** Vector-only retrieval for ablation studies */
export async function vectorOnlyRetrieve(query: string, collectionName: string, topK = config.TOP_K_RESULTS): Promise<HybridRAGResult> {
  const vectorResults = await vectorSearch(collectionName, query, topK);
  const chunks: RetrievedChunk[] = vectorResults.map((v, i) => ({
    id: v.id, text: v.document, documentId: v.metadata.documentId || '',
    documentName: v.metadata.documentName || 'Unknown Document', pageNumber: v.metadata.pageNumber,
    vectorScore: v.score, bm25Score: 0, finalScore: v.score, rank: i + 1, metadata: v.metadata,
  }));
  const context = chunks.map((chunk, i) => `[Source ${i + 1}: ${chunk.documentName}]\n${chunk.text}`).join('\n\n---\n\n');
  return { chunks, context, retrievalMethod: 'Vector Only' };
}

/** BM25-only retrieval for ablation studies */
export async function bm25OnlyRetrieve(query: string, collectionName: string, topK = config.TOP_K_RESULTS): Promise<HybridRAGResult> {
  const bm25Results = getBM25Index(collectionName).search(query, topK);
  const chunks: RetrievedChunk[] = bm25Results.map((b, i) => ({
    id: b.id, text: b.text, documentId: b.metadata.documentId || '',
    documentName: b.metadata.documentName || 'Unknown Document', pageNumber: b.metadata.pageNumber,
    vectorScore: 0, bm25Score: b.score, finalScore: b.score, rank: i + 1, metadata: b.metadata,
  }));
  const context = chunks.map((chunk, i) => `[Source ${i + 1}: ${chunk.documentName}]\n${chunk.text}`).join('\n\n---\n\n');
  return { chunks, context, retrievalMethod: 'BM25 Only' };
}
