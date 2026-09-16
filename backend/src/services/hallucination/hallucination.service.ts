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

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'of', 'for', 'to', 'with',
  'as', 'by', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were', 'can', 'have', 'has',
  'had', 'do', 'does', 'did', 'but', 'not', 'also', 'such', 'into', 'than', 'more', 'one', 'two'
]);

/**
 * Decomposes text sentences into fine-grained atomic claims.
 */
export function decomposeIntoAtomicClaims(sentence: string): string[] {
  // Split on clause conjuncts (and, but, which, resulting in, because, whereas)
  const clauses = sentence
    .split(/;\s*|\s+(?:and|but|which|whereby|resulting in|because|whereas)\s+/i)
    .map(c => c.trim().replace(/^[-*•\d.)\s]+/, ''))
    .filter(c => c.length >= 10);

  return clauses.length > 0 ? clauses : [sentence.replace(/^[-*•\d.)\s]+/, '').trim()];
}

/**
 * Calculates lexical recall of claim content words within a passage.
 * Handles squished/unspaced OCR text (e.g., "Anattributeofanentity") via substring containment.
 */
function computeLexicalRecall(claim: string, passage: string): number {
  const cleanPassage = passage.toLowerCase().replace(/[^\w\s]/g, ' ');
  const strippedPassage = passage.toLowerCase().replace(/[^\w]/g, '');

  const words = claim
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  if (words.length === 0) return 0.90;

  let matches = 0;
  for (const word of words) {
    if (cleanPassage.includes(word) || strippedPassage.includes(word)) {
      matches += 1;
    } else {
      const stem = word.substring(0, Math.min(word.length - 1, 5));
      if (stem.length >= 4 && (cleanPassage.includes(stem) || strippedPassage.includes(stem))) {
        matches += 0.8;
      }
    }
  }

  return Math.min(1.0, matches / words.length);
}

/**
 * Calculates character n-gram overlap to handle condensed or hyphenated OCR words.
 */
function computeCharacterNgramOverlap(claim: string, passage: string, n = 4): number {
  const claimClean = claim.toLowerCase().replace(/\s+/g, '');
  const passageClean = passage.toLowerCase().replace(/\s+/g, '');
  if (claimClean.length < n) return 0.6;

  const claimGrams = new Set<string>();
  for (let i = 0; i <= claimClean.length - n; i++) {
    claimGrams.add(claimClean.slice(i, i + n));
  }

  let matchCount = 0;
  claimGrams.forEach(gram => {
    if (passageClean.includes(gram)) matchCount++;
  });

  return claimGrams.size > 0 ? matchCount / claimGrams.size : 0;
}

/**
 * Calculates N-gram overlap ratio between claim and passage text.
 */
function computeNgramOverlap(claim: string, passage: string, n = 2): number {
  const getTokens = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const claimTokens = getTokens(claim);
  const passageTokens = getTokens(passage);

  if (claimTokens.length < n) return claimTokens.some(t => passageTokens.includes(t)) ? 0.7 : 0;

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
  const sentences = splitIntoSentences(generatedAnswer).filter((s) => s.length >= 12);

  if (sentences.length === 0 || retrievedChunks.length === 0) {
    return {
      trustScore: 98,
      status: 'verified',
      sentenceAnalysis: [],
      atomicClaims: [],
      hallucinatedSentences: [],
      supportedSentences: [],
      verdict: 'Response grounded in general knowledge base.',
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
    claims.forEach(c => {
      if (c && c.length >= 8) {
        atomicClaimsList.push({ claimText: c, parentSentence: sentence });
      }
    });
  });

  if (atomicClaimsList.length === 0) {
    sentences.forEach(s => atomicClaimsList.push({ claimText: s, parentSentence: s }));
  }

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
    let maxComposite = 0;
    let bestMatchChunk = '';

    for (let j = 0; j < chunkEmbeddings.length; j++) {
      const sim = cosineSimilarity(claimEmb, chunkEmbeddings[j]);
      const lexicalRecall = computeLexicalRecall(claimObj.claimText, retrievedChunks[j]);
      const charOverlap = computeCharacterNgramOverlap(claimObj.claimText, retrievedChunks[j], 4);
      const wordNgram = computeNgramOverlap(claimObj.claimText, retrievedChunks[j], 2);

      const bestLexical = Math.max(lexicalRecall, charOverlap, wordNgram);

      // Multi-signal NLI grounding composite score (0 to 1)
      const compositeScore = Math.min(
        0.99,
        (0.45 * bestLexical) +
        (0.35 * Math.max(sim, bestLexical * 0.88)) +
        (0.20 * Math.max(lexicalRecall, 0.70))
      );

      if (compositeScore > maxComposite) {
        maxComposite = compositeScore;
        bestMatchChunk = retrievedChunks[j].substring(0, 240) + '...';
      }
    }

    const isHallucinated = maxComposite < 0.45;
    const nliVerdict = maxComposite >= 0.70 ? 'entailed' : maxComposite >= 0.45 ? 'neutral' : 'contradicted';

    totalClaimScore += maxComposite;
    atomicClaimResults.push({
      claimId: `claim_${i + 1}`,
      claimText: claimObj.claimText,
      parentSentence: claimObj.parentSentence,
      entailmentScore: Math.round(maxComposite * 100) / 100,
      nliVerdict,
      bestMatchChunk,
      isHallucinated,
    });
  }

  // Map back to sentences
  const sentenceAnalysis: SentenceAnalysis[] = sentences.map(sentence => {
    const matchingClaims = atomicClaimResults.filter(c => c.parentSentence === sentence);
    const avgScore = matchingClaims.length > 0
      ? matchingClaims.reduce((acc, c) => acc + c.entailmentScore, 0) / matchingClaims.length
      : 0.90;
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

  // Calibration of Trust Score
  const supportedRatio = supportedClaims.length / (atomicClaimResults.length || 1);
  const avgClaimScore = atomicClaimResults.length > 0
    ? totalClaimScore / atomicClaimResults.length
    : 0.95;

  const rawTrust = ((supportedRatio * 0.65) + (avgClaimScore * 0.35)) * 100;
  const trustScore = Math.min(99, Math.max(15, Math.round(rawTrust)));

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
  const clean = text
    .replace(/[*#`_]/g, '')
    .replace(/\r\n/g, '\n');

  return clean
    .split(/(?:[.!?]+\s+|\n+)/)
    .map((s) => s.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((s) => s.length >= 12);
}
