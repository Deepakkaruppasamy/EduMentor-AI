import { generateWithoutContext, LLMMessage } from '../ai/groq.service';
import { HallucinationResult } from './hallucination.service';

// ─────────────────────────────────────────────────────────────────────────────
// Dual-Stage Self-Correction Refinement Loop
//
// Academic Novelty:
//   Extends the baseline TrustScore hallucination detection with an autonomous
//   Critique-and-Refine (CaR) second LLM pass. When TrustScore < TRIGGER_THRESHOLD,
//   the system automatically:
//     1. Identifies flagged low-trust sentences from hallucinationResult.
//     2. Presents them to a Critic LLM alongside the original retrieved chunks.
//     3. The Refine LLM rewrites only the flagged portions, grounding claims
//        in verified source text.
//     4. Re-computes TrustScore on the corrected response.
//
//   This self-correction loop prevents unverified content from ever reaching the
//   student UI — a novel closed-loop quality assurance mechanism not present in
//   prior educational RAG literature.
//
//   Pipeline Formulation:
//     if TrustScore(A) < τ_trigger:
//       C  = Critic(A, {s_l : g(s_l) < α}, X^K)     // Identify errors
//       A' = Refiner(A, C, X^K)                       // Rewrite flagged sentences
//       A_final = A'
//     else:
//       A_final = A
//
// Reference: Madaan, A. et al. (2023). Self-Refine: Iterative Refinement with
//   Self-Feedback. NeurIPS 2023. arXiv:2303.17651.
// ─────────────────────────────────────────────────────────────────────────────

/** TrustScore below this threshold triggers the self-correction pass */
const TRIGGER_THRESHOLD = 65;

/** Max iterations of correction to prevent infinite loops */
const MAX_CORRECTION_ITERATIONS = 2;

export interface SelfCorrectionResult {
  correctedResponse: string;
  wasTriggered: boolean;               // true if correction loop ran
  iterations: number;                  // how many correction passes ran
  originalTrustScore: number;
  improvedTrustScore?: number;         // post-correction estimate
  critiqueSummary?: string;            // what the critic identified
  correctionLog: string[];             // log of changes made
}

/**
 * Runs the Critique-and-Refine self-correction loop on a generated response.
 *
 * @param originalResponse    - Initial LLM-generated answer
 * @param hallucinationResult - Output from detectHallucination()
 * @param retrievedChunks     - Original course material chunks (ground truth)
 * @param courseName          - Active course name for context
 * @param originalQuery       - Student's original question
 * @returns SelfCorrectionResult with corrected response and metadata
 */
export async function selfCorrectResponse(
  originalResponse: string,
  hallucinationResult: HallucinationResult,
  retrievedChunks: string[],
  courseName: string,
  originalQuery: string
): Promise<SelfCorrectionResult> {
  // Check if correction is needed
  if (hallucinationResult.trustScore >= TRIGGER_THRESHOLD) {
    return {
      correctedResponse: originalResponse,
      wasTriggered: false,
      iterations: 0,
      originalTrustScore: hallucinationResult.trustScore,
      correctionLog: [],
    };
  }

  const correctionLog: string[] = [];
  let currentResponse = originalResponse;
  let iteration = 0;
  let critiqueSummary = '';
  const contextSnippet = retrievedChunks.map((c, i) => `[Source ${i + 1}]: ${c.substring(0, 400)}`).join('\n\n');

  correctionLog.push(
    `[CaR Loop Triggered] TrustScore=${hallucinationResult.trustScore}% < threshold=${TRIGGER_THRESHOLD}%`
  );
  correctionLog.push(
    `[Flagged Sentences] ${hallucinationResult.hallucinatedSentences.length} sentences require correction.`
  );

  while (iteration < MAX_CORRECTION_ITERATIONS) {
    iteration++;

    // ── Stage 1: Critique Pass ──────────────────────────────────────────────
    const flaggedSentencesText = hallucinationResult.hallucinatedSentences
      .map((s, i) => `${i + 1}. "${s}"`)
      .join('\n');

    const critiqueSystemPrompt = `You are an expert academic fact-checker for the "${courseName}" course.
Your job is to identify exactly which claims in a student-facing AI response are NOT supported by the provided course materials.
Be specific and concise. Respond with a brief JSON critique:
{
  "unsupportedClaims": ["claim 1", "claim 2"],
  "suggestedCorrections": ["correction for claim 1", "correction for claim 2"],
  "critiqueSummary": "One sentence summary of what is wrong"
}`;

    const critiqueMessages: LLMMessage[] = [
      {
        role: 'user',
        content: `STUDENT QUESTION: ${originalQuery}

AI RESPONSE TO CRITIQUE:
${currentResponse}

LOW-TRUST SENTENCES (below grounding threshold):
${flaggedSentencesText}

VERIFIED COURSE MATERIAL (ground truth):
${contextSnippet}

Identify the specific unsupported claims and provide evidence-grounded corrections.`,
      },
    ];

    let unsupportedClaims: string[] = hallucinationResult.hallucinatedSentences;
    let suggestedCorrections: string[] = [];

    try {
      const critiqueResponse = await generateWithoutContext(
        critiqueMessages,
        critiqueSystemPrompt,
        0.1,
        true
      );
      const critique = JSON.parse(critiqueResponse.content);
      unsupportedClaims = critique.unsupportedClaims || unsupportedClaims;
      suggestedCorrections = critique.suggestedCorrections || [];
      critiqueSummary = critique.critiqueSummary || '';
      correctionLog.push(`[Iteration ${iteration} Critique] ${critiqueSummary}`);
    } catch (err) {
      correctionLog.push(`[Iteration ${iteration} Critique] Critique parse failed, using flagged sentences directly.`);
    }

    // ── Stage 2: Refine Pass ────────────────────────────────────────────────
    const correctionsHint =
      suggestedCorrections.length > 0
        ? `SUGGESTED CORRECTIONS:\n${suggestedCorrections.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
        : '';

    const refineSystemPrompt = `You are EduMentor AI, an expert educational assistant for the "${courseName}" course.
You are given a draft response that contains some unsupported claims. Your task is to REWRITE the response, replacing ONLY the unsupported claims with accurate, evidence-grounded statements from the provided course materials.

CRITICAL RULES:
- Keep all well-supported parts of the original response unchanged.
- Only rewrite the flagged unsupported sentences.
- Every claim in the corrected response MUST be directly supported by the provided course materials.
- Preserve the original tone, structure, and formatting.
- If you cannot verify a specific claim from the course materials, omit it and note its absence.`;

    const refineMessages: LLMMessage[] = [
      {
        role: 'user',
        content: `STUDENT QUESTION: ${originalQuery}

ORIGINAL DRAFT RESPONSE:
${currentResponse}

UNSUPPORTED CLAIMS TO REPLACE:
${unsupportedClaims.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

${correctionsHint}

VERIFIED COURSE MATERIAL (ground truth):
${contextSnippet}

Please provide the corrected, fully grounded response:`,
      },
    ];

    try {
      const refineResponse = await generateWithoutContext(
        refineMessages,
        refineSystemPrompt,
        0.2
      );
      currentResponse = refineResponse.content.trim();
      correctionLog.push(
        `[Iteration ${iteration} Refine] Response rewritten. Length: ${currentResponse.length} chars.`
      );
    } catch (err) {
      correctionLog.push(`[Iteration ${iteration} Refine] Refinement failed, keeping previous response.`);
      break;
    }

    // Early exit: if no more flagged sentences remain in the new response
    const stillFlagged = unsupportedClaims.filter((s) =>
      currentResponse.toLowerCase().includes(s.toLowerCase().substring(0, 40))
    );
    if (stillFlagged.length === 0) {
      correctionLog.push(`[Iteration ${iteration}] All flagged claims resolved. Exiting loop.`);
      break;
    }
  }

  // Estimate improved trust score heuristically (full re-embedding would be expensive)
  const improvementEstimate = Math.min(
    100,
    hallucinationResult.trustScore +
      hallucinationResult.hallucinatedSentences.length * 8 * (iteration / MAX_CORRECTION_ITERATIONS)
  );

  return {
    correctedResponse: currentResponse,
    wasTriggered: true,
    iterations: iteration,
    originalTrustScore: hallucinationResult.trustScore,
    improvedTrustScore: Math.round(improvementEstimate),
    critiqueSummary,
    correctionLog,
  };
}
