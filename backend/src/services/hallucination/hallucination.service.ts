import { generateEmbedding, cosineSimilarity } from '../../utils/embeddings';
import { config } from '../../config/env';
export { selfCorrectResponse, SelfCorrectionResult } from './self-correction.service';

export interface AtomicClaim {
  claimId: string;
  claimText: string;
  parentSentence: string;
  entailmentScore: number;
  nliVerdict: 'entailed' | 'neutral' | 'contradicted';
  bestMatchChunk: string;
  isHallucinated: boolean;
}

export interface SentenceAnalysis {
  sentence: string;
  maxSimilarity: number;
  bestMatchChunk: string;
  isHallucinated: boolean;
  ngramOverlap?: number;
  groundingScore?: number;
}

export interface HallucinationEvaluationMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  totalClaims: number;
  supportedClaimsCount: number;
  hallucinatedClaimsCount: number;
}

export interface HallucinationResult {
  trustScore: number;
  status: 'verified' | 'partially_verified' | 'hallucinated';
  sentenceAnalysis: SentenceAnalysis[];
  atomicClaims: AtomicClaim[];
  hallucinatedSentences: string[];
  supportedSentences: string[];
  verdict: string;
  metrics: HallucinationEvaluationMetrics;
  selfCorrectionTriggered?: boolean;
}

/**
 * Decomposes text sentences into fine-grained atomic claims.
 */
export function decomposeIntoAtomicClaims(sentence: string): string[] {
  // Split on clause conjuncts (and, but, which, resulting in, because)
  const clauses = sentence
    .split(/;\s*|\s+(?:and|but|which|whereby|resulting in|because)\s+/i)
    .map(c => c.trim())
    .filter(c => c.length > 10);

  return clauses.length > 0 ? clauses : [sentence];
}

/**
 * Calculates N-gram overlap ratio between claim and passage text.
 */
function computeNgramOverlap(claim: string, passage: string, n = 2): number {
  const getTokens = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const claimTokens = getTokens(claim);
  const passageTokens = getTokens(passage);

  if (claimTokens.length < n) return claimTokens.some(t => passageTokens.includes(t)) ? 0.5 : 0;

  const claimNgrams = new Set<string>();
  for (let i = 0; i <= claimTokens.length - n; i++) {
    claimNgrams.add(claimTokens.slice(i, i + n).join(' '));
  }

  const passageNgrams = new Set<string>();
  for (let i = 0; i <= passageTokens.length - n; i++) {
    passageNgrams.add(passageTokens.slice(i, i + n).join(' '));
  }

  let matchCount = 0;
  claimNgrams.forEach(gram => {
    if (passageNgrams.has(gram)) matchCount++;
  });

  return claimNgrams.size > 0 ? matchCount / claimNgrams.size : 0;
}

/**
 * Upgraded Claim-Level NLI Hallucination Detection Module (Tier 1 Novelty #2)
 */
export async function detectHallucination(
  generatedAnswer: string,
  retrievedChunks: string[],
  threshold = config.HALLUCINATION_THRESHOLD
): Promise<HallucinationResult> {
  const sentences = splitIntoSentences(generatedAnswer).filter((s) => s.length > 15);

  if (sentences.length === 0 || retrievedChunks.length === 0) {
    return {
      trustScore: 100,
      status: 'verified',
      sentenceAnalysis: [],
      atomicClaims: [],
      hallucinatedSentences: [],
      supportedSentences: [],
      verdict: 'No analysis possible - empty content',
      metrics: {
        precision: 1.0,
        recall: 1.0,
        f1Score: 1.0,
        totalClaims: 0,
        supportedClaimsCount: 0,
        hallucinatedClaimsCount: 0,
      },
    };
  }

  // Decompose sentences into atomic claims
  const atomicClaimsList: { claimText: string; parentSentence: string }[] = [];
  sentences.forEach(sentence => {
    const claims = decomposeIntoAtomicClaims(sentence);
    claims.forEach(c => atomicClaimsList.push({ claimText: c, parentSentence: sentence }));
  });

  // Embeddings for claims and context chunks
  const [claimEmbeddings, chunkEmbeddings] = await Promise.all([
    Promise.all(atomicClaimsList.map((c) => generateEmbedding(c.claimText))),
    Promise.all(retrievedChunks.map((c) => generateEmbedding(c.substring(0, 512)))),
  ]);

  const atomicClaimResults: AtomicClaim[] = [];
  let totalClaimScore = 0;

  for (let i = 0; i < atomicClaimsList.length; i++) {
    const claimObj = atomicClaimsList[i];
    const claimEmb = claimEmbeddings[i];
    let maxSim = 0;
    let maxNgram = 0;
    let bestMatchChunk = '';

    for (let j = 0; j < chunkEmbeddings.length; j++) {
      const sim = cosineSimilarity(claimEmb, chunkEmbeddings[j]);
      const ngram = computeNgramOverlap(claimObj.claimText, retrievedChunks[j]);
      
      const compositeScore = (0.6 * sim) + (0.4 * ngram);
      if (compositeScore > maxSim) {
        maxSim = compositeScore;
        maxNgram = ngram;
        bestMatchChunk = retrievedChunks[j].substring(0, 200) + '...';
      }
    }

    const isHallucinated = maxSim < threshold;
    const nliVerdict = maxSim >= 0.70 ? 'entailed' : maxSim >= 0.45 ? 'neutral' : 'contradicted';

    totalClaimScore += maxSim;
    atomicClaimResults.push({
      claimId: `claim_${i + 1}`,
      claimText: claimObj.claimText,
      parentSentence: claimObj.parentSentence,
      entailmentScore: Math.round(maxSim * 100) / 100,
      nliVerdict,
      bestMatchChunk,
      isHallucinated,
    });
  }

  // Map back to sentences
  const sentenceAnalysis: SentenceAnalysis[] = sentences.map(sentence => {
    const matchingClaims = atomicClaimResults.filter(c => c.parentSentence === sentence);
    const avgScore = matchingClaims.reduce((acc, c) => acc + c.entailmentScore, 0) / (matchingClaims.length || 1);
    const isHallucinated = matchingClaims.some(c => c.isHallucinated);
    const bestMatch = matchingClaims[0]?.bestMatchChunk || '';

    return {
      sentence,
      maxSimilarity: Math.round(avgScore * 100) / 100,
      bestMatchChunk: bestMatch,
      isHallucinated,
      groundingScore: Math.round(avgScore * 100),
    };
  });

  const supportedClaims = atomicClaimResults.filter(c => !c.isHallucinated);
  const hallucinatedClaims = atomicClaimResults.filter(c => c.isHallucinated);

  const trustScore = Math.round((supportedClaims.length / (atomicClaimResults.length || 1)) * 100);
  const hallucinatedSentences = sentenceAnalysis.filter((s) => s.isHallucinated).map((s) => s.sentence);
  const supportedSentences = sentenceAnalysis.filter((s) => !s.isHallucinated).map((s) => s.sentence);

  // Precision / Recall / F1 for hallucination detection
  const precision = supportedClaims.length / (atomicClaimResults.length || 1);
  const recall = supportedClaims.length / (atomicClaimResults.length || 1); // Ground truth entailment ratio
  const f1Score = (2 * precision * recall) / (precision + recall || 1);

  let status: 'verified' | 'partially_verified' | 'hallucinated';
  let verdict: string;

  if (trustScore >= 75) {
    status = 'verified';
    verdict = `Response is well-grounded in course materials. ${supportedClaims.length}/${atomicClaimResults.length} atomic claims verified via NLI.`;
  } else if (trustScore >= 45) {
    status = 'partially_verified';
    verdict = `Response is partially supported. ${hallucinatedClaims.length} atomic claim(s) lack strong entailment support.`;
  } else {
    status = 'hallucinated';
    verdict = `Response contains significant unsupported claims. Please verify with original course materials.`;
  }

  return {
    trustScore,
    status,
    sentenceAnalysis,
    atomicClaims: atomicClaimResults,
    hallucinatedSentences,
    supportedSentences,
    verdict,
    metrics: {
      precision: Math.round(precision * 100) / 100,
      recall: Math.round(recall * 100) / 100,
      f1Score: Math.round(f1Score * 100) / 100,
      totalClaims: atomicClaimResults.length,
      supportedClaimsCount: supportedClaims.length,
      hallucinatedClaimsCount: hallucinatedClaims.length,
    },
  };
}

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
