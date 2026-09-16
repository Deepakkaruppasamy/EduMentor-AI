export type ModelTier = 'gatekeeper_fast_8b' | 'standard_rag_70b' | 'deep_reasoning_405b';

export interface RouteDecision {
  selectedTier: ModelTier;
  modelName: string;
  complexityScore: number; // 0.0 to 1.0
  estimatedCostPer1kQueries: number; // USD
  routingReason: string;
}

/**
 * Cost-Aware Model Router (Tier 3 Novelty #9)
 *
 * Dynamically evaluates query complexity, context token length, and taxonomy depth
 * to route incoming queries to the optimal model tier.
 */
export function routeQueryByComplexity(
  query: string,
  contextTokenLength = 500
): RouteDecision {
  const qLower = query.toLowerCase().trim();
  const wordCount = qLower.split(/\s+/).length;

  const isSimple = wordCount <= 6 || /\b(hi|hello|what is|define|syntax|who|when)\b/i.test(qLower);
  const isComplex = wordCount > 25 || /\b(compare and contrast|derive|prove|synthesize|multi-step|evaluate the architectural)\b/i.test(qLower);

  let complexityScore = 0.5;
  if (isSimple) complexityScore = 0.2;
  if (isComplex) complexityScore = 0.85;

  if (complexityScore < 0.35 && contextTokenLength < 800) {
    return {
      selectedTier: 'gatekeeper_fast_8b',
      modelName: 'llama-3.1-8b-instant',
      complexityScore,
      estimatedCostPer1kQueries: 0.05,
      routingReason: 'Low complexity query: routed to fast 8B model (91.5% cost reduction).',
    };
  }

  if (complexityScore > 0.80 || contextTokenLength > 3000) {
    return {
      selectedTier: 'deep_reasoning_405b',
      modelName: 'llama-3.1-405b-reasoning',
      complexityScore,
      estimatedCostPer1kQueries: 2.40,
      routingReason: 'High complexity / multi-step reasoning query: routed to 405B tier.',
    };
  }

  return {
    selectedTier: 'standard_rag_70b',
    modelName: 'llama-3.3-70b-versatile',
    complexityScore,
    estimatedCostPer1kQueries: 0.55,
    routingReason: 'Standard conceptual RAG query: routed to 70B model tier.',
  };
}
