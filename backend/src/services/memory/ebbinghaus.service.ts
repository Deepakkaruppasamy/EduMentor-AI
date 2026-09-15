import mongoose from 'mongoose';
import SpacedRepetition, { IConceptMemory } from '../../models/SpacedRepetition';

// ─────────────────────────────────────────────────────────────────────────────
// Ebbinghaus Spaced-Repetition Memory Engine
//
// Academic Novelty:
//   Applies the Ebbinghaus Forgetting Curve (Ebbinghaus, 1885) to model
//   per-student per-concept memory retention over time. Unlike static quiz
//   score tracking (used in prior educational RAG systems), this engine
//   dynamically computes retention probability and generates revision alerts
//   when R(t) drops below a threshold before exam dates.
//
//   Core Mathematical Model:
//     R(t) = exp(-t / S_k)
//   Where:
//     R(t)  - Retention probability at time t (days since last review)
//     S_k   - Memory strength for concept k (updated after each interaction)
//
//   Strength Update Rule (after each quiz/interaction):
//     S_k_new = S_k_old * (1 + γ * A_k)
//   Where:
//     A_k   - Student accuracy score for concept k (0–1)
//     γ     - Learning rate constant = 0.3
//
//   Revision Alert Threshold: R(t) < 0.60
//
// Reference: Ebbinghaus, H. (1885). Über das Gedächtnis. Leipzig: Duncker.
//   Cepeda, N.J. et al. (2006). Distributed practice in verbal recall tasks.
//   Psychological Bulletin, 132(3), 354–380.
// ─────────────────────────────────────────────────────────────────────────────

const LEARNING_RATE = 0.3;           // γ — controls memory strength growth
const INITIAL_STRENGTH = 1.5;        // S_0 — baseline retention (days)
const RETENTION_ALERT_THRESHOLD = 0.60; // Alert when R(t) drops below 60%
const MAX_STRENGTH = 60;             // Cap strength at 60 days (long-term memory)

export interface RetentionStatus {
  concept: string;
  retentionProbability: number;       // R(t) ∈ [0,1]
  daysSinceLastReview: number;
  memoryStrength: number;             // S_k
  needsRevision: boolean;             // R(t) < threshold
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  nextReviewDate: Date;
  recommendedReviewIntervalDays: number;
}

export interface RevisionAlert {
  studentId: string;
  courseId: string;
  urgentConcepts: RetentionStatus[];
  scheduledConcepts: RetentionStatus[];
  alertGeneratedAt: Date;
}

/**
 * Computes the Ebbinghaus retention probability for a concept.
 *
 *   R(t) = exp(-t / S_k)
 *
 * @param daysSinceLastReview  - t in days
 * @param memoryStrength       - S_k (updated strength value)
 * @returns Retention probability ∈ [0,1]
 */
export function computeRetention(daysSinceLastReview: number, memoryStrength: number): number {
  if (daysSinceLastReview <= 0) return 1.0;
  const strength = Math.max(0.1, memoryStrength);
  return Math.exp(-daysSinceLastReview / strength);
}

/**
 * Updates memory strength S_k using the accuracy-weighted learning rule:
 *
 *   S_k_new = S_k_old * (1 + γ * A_k)
 *
 * Strength is capped at MAX_STRENGTH (60 days) to represent long-term retention.
 * A failed quiz (A_k=0) decays strength by 10% to model forgetting on failure.
 *
 * @param currentStrength  - Current S_k
 * @param accuracyScore    - A_k ∈ [0,1]
 * @returns Updated strength S_k_new
 */
export function updateMemoryStrength(currentStrength: number, accuracyScore: number): number {
  if (accuracyScore < 0.3) {
    // Poor performance — decay memory strength by 20%
    return Math.max(0.5, currentStrength * 0.80);
  }
  const newStrength = currentStrength * (1 + LEARNING_RATE * accuracyScore);
  return Math.min(MAX_STRENGTH, newStrength);
}

/**
 * Computes the optimal next review interval using the stability-based schedule:
 *   nextInterval = S_k * ln(targetRetention) / ln(R_desired)
 * Simplified: schedule review when R(t) = RETENTION_ALERT_THRESHOLD.
 *
 * @param memoryStrength - S_k
 * @returns Optimal days until next review
 */
export function computeNextReviewInterval(memoryStrength: number): number {
  // Solve for t where R(t) = RETENTION_ALERT_THRESHOLD
  //   RETENTION_ALERT_THRESHOLD = exp(-t/S_k)
  //   t = -S_k * ln(RETENTION_ALERT_THRESHOLD)
  const interval = -memoryStrength * Math.log(RETENTION_ALERT_THRESHOLD);
  return Math.max(1, Math.round(interval));
}

/**
 * Determines urgency level based on retention probability.
 */
function getUrgencyLevel(retention: number): 'low' | 'medium' | 'high' | 'critical' {
  if (retention >= 0.80) return 'low';
  if (retention >= 0.65) return 'medium';
  if (retention >= 0.40) return 'high';
  return 'critical';
}

/**
 * Records a student interaction with a concept (query or quiz) and updates
 * the Ebbinghaus memory model for that concept.
 *
 * @param studentId    - Student's MongoDB ObjectId string
 * @param courseId     - Course MongoDB ObjectId string
 * @param concept      - Concept/topic name (extracted from RAG chunks)
 * @param accuracy     - Quiz accuracy A_k ∈ [0,1]; use 0.5 for non-quiz interactions
 */
export async function recordConceptInteraction(
  studentId: string,
  courseId: string,
  concept: string,
  accuracy: number = 0.5
): Promise<void> {
  let record = await SpacedRepetition.findOne({ student: studentId, course: courseId });

  if (!record) {
    record = new SpacedRepetition({
      student: new mongoose.Types.ObjectId(studentId),
      course: new mongoose.Types.ObjectId(courseId),
      concepts: [],
    });
  }

  const now = new Date();
  const existing = record.concepts.find((c: IConceptMemory) => c.concept === concept);

  if (existing) {
    const daysSince = (now.getTime() - existing.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);
    existing.memoryStrength = updateMemoryStrength(existing.memoryStrength, accuracy);
    existing.lastReviewedAt = now;
    existing.reviewCount += 1;
    existing.lastAccuracy = accuracy;
    existing.retentionAtLastReview = computeRetention(daysSince, existing.memoryStrength);
    existing.nextReviewDate = new Date(
      now.getTime() + computeNextReviewInterval(existing.memoryStrength) * 24 * 60 * 60 * 1000
    );
  } else {
    const initialStrength = INITIAL_STRENGTH * (1 + LEARNING_RATE * accuracy);
    record.concepts.push({
      concept,
      memoryStrength: initialStrength,
      lastReviewedAt: now,
      reviewCount: 1,
      lastAccuracy: accuracy,
      retentionAtLastReview: 1.0,
      nextReviewDate: new Date(
        now.getTime() + computeNextReviewInterval(initialStrength) * 24 * 60 * 60 * 1000
      ),
    });
  }

  record.lastUpdated = now;
  await record.save();
}

/**
 * Computes current retention status for all concepts a student has studied,
 * and identifies which concepts need urgent revision.
 *
 * @param studentId  - Student MongoDB ObjectId string
 * @param courseId   - Course MongoDB ObjectId string
 * @returns RevisionAlert with urgent and scheduled concepts
 */
export async function generateRevisionAlerts(
  studentId: string,
  courseId: string
): Promise<RevisionAlert | null> {
  const record = await SpacedRepetition.findOne({ student: studentId, course: courseId });

  if (!record || record.concepts.length === 0) return null;

  const now = new Date();
  const allStatuses: RetentionStatus[] = record.concepts.map((c: IConceptMemory) => {
    const daysSince = (now.getTime() - c.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);
    const retention = computeRetention(daysSince, c.memoryStrength);
    const nextInterval = computeNextReviewInterval(c.memoryStrength);

    return {
      concept: c.concept,
      retentionProbability: Math.round(retention * 1000) / 1000,
      daysSinceLastReview: Math.round(daysSince * 10) / 10,
      memoryStrength: Math.round(c.memoryStrength * 100) / 100,
      needsRevision: retention < RETENTION_ALERT_THRESHOLD,
      urgencyLevel: getUrgencyLevel(retention),
      nextReviewDate: c.nextReviewDate,
      recommendedReviewIntervalDays: nextInterval,
    };
  });

  // Sort by retention ascending (most forgotten first)
  allStatuses.sort((a, b) => a.retentionProbability - b.retentionProbability);

  return {
    studentId,
    courseId,
    urgentConcepts: allStatuses.filter((s) => s.needsRevision),
    scheduledConcepts: allStatuses.filter((s) => !s.needsRevision),
    alertGeneratedAt: now,
  };
}

/**
 * Returns the complete retention landscape for a student in a course.
 * Used by the analytics dashboard and study planner.
 */
export async function getRetentionLandscape(
  studentId: string,
  courseId: string
): Promise<RetentionStatus[]> {
  const alerts = await generateRevisionAlerts(studentId, courseId);
  if (!alerts) return [];
  return [...alerts.urgentConcepts, ...alerts.scheduledConcepts];
}
