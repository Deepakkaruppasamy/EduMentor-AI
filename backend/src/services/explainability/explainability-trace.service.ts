export interface PersonalizationTrace {
  recommendationId: string;
  topic: string;
  recommendedAction: string;
  reasoningChain: string[];
  evidencePoints: {
    quizScorePercent?: number;
    questionCountOnTopic?: number;
    prerequisiteStatus?: string;
    decayFactor?: number;
  };
  confidenceScore: number;
}

/**
 * Personalization Explainability Trace (Tier 3 Novelty #8)
 *
 * Generates transparent, human-auditable reasoning chains explaining WHY specific
 * learning activities or topics are recommended to the student.
 */
export function generateExplainabilityTrace(
  topic: string,
  quizScore?: number,
  questionsAskedCount?: number,
  prerequisiteWeakness?: string
): PersonalizationTrace {
  const reasoningChain: string[] = [];
  const evidencePoints: PersonalizationTrace['evidencePoints'] = {};

  if (quizScore !== undefined) {
    evidencePoints.quizScorePercent = quizScore;
    if (quizScore < 60) {
      reasoningChain.push(`Identified mastery gap: You scored ${quizScore}% on the recent "${topic}" assessment.`);
    } else {
      reasoningChain.push(`Mastery reinforcement: You scored ${quizScore}% on "${topic}".`);
    }
  }

  if (questionsAskedCount && questionsAskedCount > 2) {
    evidencePoints.questionCountOnTopic = questionsAskedCount;
    reasoningChain.push(`High student curiosity: You asked ${questionsAskedCount} targeted questions regarding "${topic}".`);
  }

  if (prerequisiteWeakness) {
    evidencePoints.prerequisiteStatus = `Prerequisite "${prerequisiteWeakness}" incomplete`;
    reasoningChain.push(`Knowledge Graph prerequisite constraint: Found prerequisite gap in "${prerequisiteWeakness}".`);
  }

  reasoningChain.push(`Recommended Action: Engage in interactive flashcards and targeted practice questions for "${topic}".`);

  return {
    recommendationId: `rec_${Date.now()}`,
    topic,
    recommendedAction: `Focus 25 minutes on ${topic}`,
    reasoningChain,
    evidencePoints,
    confidenceScore: quizScore !== undefined && quizScore < 60 ? 0.92 : 0.78,
  };
}
