import { vectorSearch } from '../../utils/chroma';
import { getBM25Index } from './bm25-search.service';
import { reciprocalRankFusion, RankedResult } from './rrf.service';
import { config } from '../../config/env';

export interface RetrievedChunk {
  id: string;
  text: string;
  documentId: string;
  documentName: string;
  pageNumber?: number;
  vectorScore: number;
  bm25Score: number;
  finalScore: number;
  rank: number;
  metadata?: Record<string, any>;
}

export interface HybridRAGResult {
  chunks: RetrievedChunk[];
  context: string;
  retrievalMethod: string;
}

/**
 * Hybrid RAG: combines vector similarity search + BM25 keyword search
 * Uses Reciprocal Rank Fusion to merge results
 */
export async function hybridRetrieve(
  query: string,
  collectionName: string,
  topK = config.TOP_K_RESULTS,
  targetDocumentId?: string
): Promise<HybridRAGResult> {
  const fetchCount = topK * 3; // fetch more, then re-rank

  // Run both retrieval methods in parallel
  const [vectorResults, bm25Results] = await Promise.all([
    vectorSearch(collectionName, query, fetchCount),
    Promise.resolve(getBM25Index(collectionName).search(query, fetchCount)),
  ]);

  let filteredVector = vectorResults;
  let filteredBM25 = bm25Results;

  if (targetDocumentId) {
    filteredVector = vectorResults.filter((v) => String(v.metadata?.documentId || '') === String(targetDocumentId));
    filteredBM25 = bm25Results.filter((b) => String(b.metadata?.documentId || '') === String(targetDocumentId));
  }

  // Map vector results to the structure expected by RRF (v.document -> text)
  const mappedVectorResults = filteredVector.map((v) => ({
    id: v.id,
    text: v.document,
    metadata: v.metadata,
    score: v.score,
  }));

  // Apply Reciprocal Rank Fusion
  const fused = reciprocalRankFusion(mappedVectorResults, filteredBM25);


  // Take top-K after fusion
  const topResults = fused.slice(0, topK);

  const chunks: RetrievedChunk[] = topResults.map((result: RankedResult) => ({
    id: result.id,
    text: result.text,
    documentId: result.metadata.documentId || '',
    documentName: result.metadata.documentName || 'Unknown Document',
    pageNumber: result.metadata.pageNumber,
    vectorScore: result.vectorScore,
    bm25Score: result.bm25Score,
    finalScore: result.rrfScore,
    rank: result.rank,
    metadata: result.metadata,
  }));

  // Aggregate context for LLM
  const context = chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.documentName}${chunk.pageNumber ? `, p.${chunk.pageNumber}` : ''}]\n${chunk.text}`
    )
    .join('\n\n---\n\n');

  const retrievalMethod = vectorResults.length > 0 && bm25Results.length > 0
    ? 'Hybrid (Vector + BM25 with RRF)'
    : vectorResults.length > 0
    ? 'Vector Only'
    : bm25Results.length > 0
    ? 'BM25 Only'
    : 'No retrieval';

  return { chunks, context, retrievalMethod };
}

/**
 * Vector-only retrieval for ablation studies
 */
export async function vectorOnlyRetrieve(
  query: string,
  collectionName: string,
  topK = config.TOP_K_RESULTS
): Promise<HybridRAGResult> {
  const vectorResults = await vectorSearch(collectionName, query, topK);

  const chunks: RetrievedChunk[] = vectorResults.map((v, i) => ({
    id: v.id,
    text: v.document,
    documentId: v.metadata.documentId || '',
    documentName: v.metadata.documentName || 'Unknown Document',
    pageNumber: v.metadata.pageNumber,
    vectorScore: v.score,
    bm25Score: 0,
    finalScore: v.score,
    rank: i + 1,
    metadata: v.metadata,
  }));

  const context = chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.documentName}${chunk.pageNumber ? `, p.${chunk.pageNumber}` : ''}]\n${chunk.text}`
    )
    .join('\n\n---\n\n');

  return { chunks, context, retrievalMethod: 'Vector Only' };
}

/**
 * BM25-only retrieval for ablation studies
 */
export async function bm25OnlyRetrieve(
  query: string,
  collectionName: string,
  topK = config.TOP_K_RESULTS
): Promise<HybridRAGResult> {
  const bm25Results = getBM25Index(collectionName).search(query, topK);

  const chunks: RetrievedChunk[] = bm25Results.map((b, i) => ({
    id: b.id,
    text: b.text,
    documentId: b.metadata.documentId || '',
    documentName: b.metadata.documentName || 'Unknown Document',
    pageNumber: b.metadata.pageNumber,
    vectorScore: 0,
    bm25Score: b.score,
    finalScore: b.score,
    rank: i + 1,
    metadata: b.metadata,
  }));

  const context = chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.documentName}${chunk.pageNumber ? `, p.${chunk.pageNumber}` : ''}]\n${chunk.text}`
    )
    .join('\n\n---\n\n');

  return { chunks, context, retrievalMethod: 'BM25 Only' };
}

