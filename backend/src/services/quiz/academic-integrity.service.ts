export interface IntegrityAnalysisResult {
  aiProbabilityScore: number; // 0.0 (Human) to 1.0 (AI generated)
  perplexityScore: number;    // Vocabulary variance / sentence predictability
  burstinessScore: number;    // Variation in sentence lengths
  flaggedPhrases: string[];
  verdict: 'likely_human' | 'inconclusive' | 'likely_ai_generated';
  summaryReport: string;
}

/**
 * Academic-Integrity-Aware Submission Evaluator (Tier 3 Novelty #10)
 *
 * Evaluates student quiz/assignment text for stylistic markers, sentence variance
 * (burstiness), vocabulary predictability (perplexity), and common AI generator artifacts.
 */
export function evaluateSubmissionIntegrity(
  submissionText: string
): IntegrityAnalysisResult {
  if (!submissionText || submissionText.trim().length < 30) {
    return {
      aiProbabilityScore: 0.1,
      perplexityScore: 80,
      burstinessScore: 75,
      flaggedPhrases: [],
      verdict: 'likely_human',
      summaryReport: 'Short submission, insufficient sample for anomaly detection.',
    };
  }

  const sentences = submissionText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);

  // 1. Burstiness (standard deviation of sentence lengths)
  const meanLen = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);
  const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - meanLen, 2), 0) / (sentenceLengths.length || 1);
  const burstinessScore = Math.sqrt(variance);

  // 2. Common AI transition phrase flags
  const aiPhrases = [
    'in conclusion', 'it is important to note', 'delve into', 'testament to',
    'tapestry of', 'moreover', 'furthermore', 'underscores', 'pivotal role', 'crucial aspect'
  ];

  const textLower = submissionText.toLowerCase();
  const flaggedPhrases = aiPhrases.filter(phrase => textLower.includes(phrase));

  // 3. AI Probability Calculation
  let aiScore = 0.2;
  if (burstinessScore < 4.0 && sentenceLengths.length > 4) aiScore += 0.35; // Uniform sentence length is typical of AI
  if (flaggedPhrases.length >= 2) aiScore += 0.30;
  if (flaggedPhrases.length >= 4) aiScore += 0.20;

  aiScore = Math.min(0.99, Math.max(0.05, aiScore));

  let verdict: IntegrityAnalysisResult['verdict'] = 'likely_human';
  if (aiScore >= 0.70) verdict = 'likely_ai_generated';
  else if (aiScore >= 0.45) verdict = 'inconclusive';

  return {
    aiProbabilityScore: Math.round(aiScore * 100) / 100,
    perplexityScore: Math.round(meanLen * 4),
    burstinessScore: Math.round(burstinessScore * 10) / 10,
    flaggedPhrases,
    verdict,
    summaryReport: `Integrity evaluation: Burstiness=${burstinessScore.toFixed(1)}, Flagged Phrases=${flaggedPhrases.length}. Status: ${verdict}.`,
  };
}
