import { RetrievedChunk } from '../rag/hybrid-rag.service';

export interface ExplainableSource {
  rank: number;
  documentName: string;
  pageNumber?: number;
  excerpt: string;
  relevanceScore: number;
  confidencePercent: number;
}

export interface ExplainableAIResult {
  answer: string;
  sources: ExplainableSource[];
  overallConfidence: number;
  retrievalMethod: string;
  totalSourcesRetrieved: number;
  explanationSummary: string;
}

/**
 * Explainable AI Module
 * 
 * Enriches every AI response with:
 * - Source document citations
 * - Page numbers
 * - Retrieved context excerpts
 * - Confidence scores
 * - Overall confidence assessment
 */
export function buildExplainableResult(
  answer: string,
  chunks: RetrievedChunk[],
  retrievalMethod: string
): ExplainableAIResult {
  const sources: ExplainableSource[] = chunks.map((chunk, i) => {
    // Normalize score to 0-100 confidence
    const rawScore = chunk.finalScore;
    const confidencePercent = Math.min(100, Math.round(rawScore * 1000));

    return {
      rank: i + 1,
      documentName: chunk.documentName,
      pageNumber: chunk.pageNumber,
      excerpt: chunk.text.substring(0, 300) + (chunk.text.length > 300 ? '...' : ''),
      relevanceScore: Math.round(chunk.finalScore * 1000) / 1000,
      confidencePercent,
    };
  });

  // Overall confidence: weighted average of top sources
  const overallConfidence =
    sources.length > 0
      ? Math.min(
          100,
          Math.round(
            sources.reduce((sum, s) => sum + s.confidencePercent, 0) / sources.length
          )
        )
      : 0;

  const explanationSummary = buildExplanationSummary(sources, retrievalMethod);

  return {
    answer,
    sources,
    overallConfidence,
    retrievalMethod,
    totalSourcesRetrieved: sources.length,
    explanationSummary,
  };
}

function buildExplanationSummary(sources: ExplainableSource[], method: string): string {
  if (sources.length === 0) {
    return 'No course materials were retrieved for this query. The answer is based on general knowledge.';
  }

  const topSource = sources[0];
  const uniqueDocs = [...new Set(sources.map((s) => s.documentName))];

  return `Answer generated using ${method}. Top source: "${topSource.documentName}"${
    topSource.pageNumber ? ` (page ${topSource.pageNumber})` : ''
  } with ${topSource.confidencePercent}% relevance. Retrieved from ${uniqueDocs.length} document(s): ${uniqueDocs.join(', ')}.`;
}
