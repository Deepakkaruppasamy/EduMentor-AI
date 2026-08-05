import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ResearchBenchmarkQuestion, {
  IResearchBenchmarkQuestion,
  IGroundTruthSource,
} from '../models/ResearchBenchmarkQuestion';
import ExpertReview, {
  IExpertReview,
  RetrievalConfiguration,
  IIRMetrics,
  IPerformanceMetrics,
} from '../models/ExpertReview';
import Course from '../models/Course';
import {
  hybridRetrieve,
  vectorOnlyRetrieve,
  bm25OnlyRetrieve,
  RetrievedChunk,
} from '../services/rag/hybrid-rag.service';
import {
  generateResponse,
  generateWithoutContext,
} from '../services/ai/groq.service';
import { detectHallucination } from '../services/hallucination/hallucination.service';
import crypto from 'crypto';

// Provider pricing constants for Eval 5 (Groq Llama 3.3 70B & HuggingFace embeddings)
const GROQ_PRICING = {
  provider: 'Groq',
  model: 'llama-3.3-70b-versatile',
  inputTokenPricePer1M: 0.59,   // $0.59 per 1M input tokens
  outputTokenPricePer1M: 0.79,  // $0.79 per 1M output tokens
  pricingVersion: '2025-Q1',
};

// ─────────────────────────────────────────────────────────────
// HELPER: IR METRICS CALCULATION (Evaluation 6)
// ─────────────────────────────────────────────────────────────
function calculateIRMetrics(
  retrievedChunks: RetrievedChunk[],
  groundTruthSources: IGroundTruthSource[]
): IIRMetrics {
  if (!groundTruthSources || groundTruthSources.length === 0) {
    return {
      precisionAt1: 0, precisionAt3: 0, precisionAt5: 0,
      recallAt1: 0, recallAt3: 0, recallAt5: 0,
      hitRateAt1: 0, hitRateAt3: 0, hitRateAt5: 0,
      mrr: 0, ndcgAt1: 0, ndcgAt3: 0, ndcgAt5: 0,
    };
  }

  const isChunkRelevant = (chunk: RetrievedChunk): boolean => {
    return groundTruthSources.some((gt) => {
      // Match by documentName or text similarity
      const docMatch =
        gt.documentName.toLowerCase().trim() === chunk.documentName.toLowerCase().trim();
      const textMatch =
        chunk.text.includes(gt.supportingText.substring(0, 50)) ||
        gt.supportingText.includes(chunk.text.substring(0, 50));
      return docMatch || textMatch;
    });
  };

  const relevanceFlags = retrievedChunks.map((c) => (isChunkRelevant(c) ? 1 : 0));
  const totalGroundTruth = groundTruthSources.length;

  const precisionAtK = (k: number) => {
    const sub = relevanceFlags.slice(0, k);
    const hits = sub.reduce((a, b) => a + b, 0);
    return Math.min(1, hits / k);
  };

  const recallAtK = (k: number) => {
    const sub = relevanceFlags.slice(0, k);
    const hits = sub.reduce((a, b) => a + b, 0);
    return Math.min(1, hits / totalGroundTruth);
  };

  const hitRateAtK = (k: number) => {
    const sub = relevanceFlags.slice(0, k);
    return sub.some((r) => r === 1) ? 1 : 0;
  };

  // Mean Reciprocal Rank (MRR) for first relevant hit
  const firstHitIndex = relevanceFlags.findIndex((r) => r === 1);
  const mrr = firstHitIndex !== -1 ? 1 / (firstHitIndex + 1) : 0;

  // Normalized Discounted Cumulative Gain (nDCG)
  const calculateNDCG = (k: number) => {
    const sub = relevanceFlags.slice(0, k);
    let dcg = 0;
    for (let i = 0; i < sub.length; i++) {
      if (sub[i] === 1) {
        dcg += 1 / Math.log2(i + 2);
      }
    }
    // Ideal DCG
    let idcg = 0;
    const idealHits = Math.min(k, totalGroundTruth);
    for (let i = 0; i < idealHits; i++) {
      idcg += 1 / Math.log2(i + 2);
    }
    return idcg > 0 ? Number((dcg / idcg).toFixed(4)) : 0;
  };

  return {
    precisionAt1: Number(precisionAtK(1).toFixed(4)),
    precisionAt3: Number(precisionAtK(3).toFixed(4)),
    precisionAt5: Number(precisionAtK(5).toFixed(4)),
    recallAt1: Number(recallAtK(1).toFixed(4)),
    recallAt3: Number(recallAtK(3).toFixed(4)),
    recallAt5: Number(recallAtK(5).toFixed(4)),
    hitRateAt1: hitRateAtK(1),
    hitRateAt3: hitRateAtK(3),
    hitRateAt5: hitRateAtK(5),
    mrr: Number(mrr.toFixed(4)),
    ndcgAt1: calculateNDCG(1),
    ndcgAt3: calculateNDCG(3),
    ndcgAt5: calculateNDCG(5),
  };
}

// ─────────────────────────────────────────────────────────────
// BENCHMARK QUESTIONS CRUD
// ─────────────────────────────────────────────────────────────

export const getBenchmarkQuestions = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questions = await ResearchBenchmarkQuestion.find().sort({ createdAt: -1 });
    res.json({ success: true, count: questions.length, data: questions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createBenchmarkQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { question, referenceAnswer, courseId, topic, difficulty, questionType, groundTruthSources, notes } = req.body;

    const courseObj = await Course.findById(courseId);
    if (!courseObj) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    const bq = await ResearchBenchmarkQuestion.create({
      question,
      referenceAnswer,
      course: courseId,
      courseName: courseObj.title,
      topic,
      difficulty,
      questionType,
      groundTruthSources: groundTruthSources || [],
      notes: notes || '',
      createdBy: req.user!._id,
    });

    res.status(201).json({ success: true, data: bq });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seed sample expert-verified benchmark questions for testing
export const seedSampleBenchmarkQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await Course.find({ isActive: true });
    if (!courses.length) {
      res.status(400).json({ success: false, message: 'No active courses found to link benchmark questions.' });
      return;
    }

    const defaultCourse = courses[0];
    const existing = await ResearchBenchmarkQuestion.countDocuments();
    if (existing > 0) {
      res.json({ success: true, message: `Benchmark questions already exist (${existing} present).` });
      return;
    }

    const samples = [
      {
        question: 'What is Third Normal Form (3NF) and how does it differ from 2NF?',
        referenceAnswer: 'Third Normal Form (3NF) requires a relation to be in 2NF and have no transitive functional dependencies, meaning non-prime attributes must depend ONLY on the primary key.',
        course: defaultCourse._id,
        courseName: defaultCourse.title,
        topic: 'Normalization',
        difficulty: 'medium',
        questionType: 'conceptual',
        groundTruthSources: [
          { documentName: 'Database_Fundamentals.pdf', pageNumber: 42, supportingText: '3NF prevents transitive dependencies where X -> Y and Y -> Z.', relevanceGrade: 3 }
        ],
        createdBy: req.user!._id,
      },
      {
        question: 'Explain the ACID properties of database transactions.',
        referenceAnswer: 'ACID stands for Atomicity (all-or-nothing), Consistency (state validity), Isolation (concurrent safety), and Durability (persist execution results).',
        course: defaultCourse._id,
        courseName: defaultCourse.title,
        topic: 'Transactions',
        difficulty: 'easy',
        questionType: 'factual',
        groundTruthSources: [
          { documentName: 'Transactions_Overview.pdf', pageNumber: 15, supportingText: 'ACID guarantees database transaction reliability.', relevanceGrade: 3 }
        ],
        createdBy: req.user!._id,
      },
      {
        question: 'Compare B-Tree and Hash indexing in terms of range query performance.',
        referenceAnswer: 'B-Trees support O(log N) range queries because nodes are kept sorted, whereas Hash indexes only provide O(1) exact match lookups and fail for range operators.',
        course: defaultCourse._id,
        courseName: defaultCourse.title,
        topic: 'Indexing',
        difficulty: 'hard',
        questionType: 'evaluative',
        groundTruthSources: [
          { documentName: 'Indexing_Structures.pdf', pageNumber: 88, supportingText: 'B-Tree stores keys in order allowing scan operators.', relevanceGrade: 3 }
        ],
        createdBy: req.user!._id,
      }
    ];

    const seeded = await ResearchBenchmarkQuestion.insertMany(samples);
    res.status(201).json({ success: true, count: seeded.length, data: seeded });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// EXPERIMENT RUNNER (Run 4 Ablation Configurations per Question)
// ─────────────────────────────────────────────────────────────

export const runExperimentBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questionIds } = req.body;
    const filter = questionIds && questionIds.length > 0 ? { _id: { $in: questionIds } } : { isActive: true };
    const questions = await ResearchBenchmarkQuestion.find(filter).populate('course');

    if (!questions.length) {
      res.status(404).json({ success: false, message: 'No benchmark questions found to evaluate.' });
      return;
    }

    const configs: RetrievalConfiguration[] = ['HYBRID_RRF', 'VECTOR_ONLY', 'BM25_ONLY', 'LLM_ONLY'];
    const createdReviews: any[] = [];

    for (const bq of questions) {
      const course = bq.course as any;
      const collectionName = course?.chromaCollection || 'default_collection';

      for (const configName of configs) {
        const anonymousId = `RVW-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        // 1. Instrumented Retrieval Phase (Eval 5 + Eval 6)
        const t0 = Date.now();
        let ragResult = { chunks: [] as RetrievedChunk[], context: '', retrievalMethod: configName };

        if (configName === 'HYBRID_RRF') {
          ragResult = await hybridRetrieve(bq.question, collectionName);
        } else if (configName === 'VECTOR_ONLY') {
          ragResult = await vectorOnlyRetrieve(bq.question, collectionName);
        } else if (configName === 'BM25_ONLY') {
          ragResult = await bm25OnlyRetrieve(bq.question, collectionName);
        }
        const retrievalLatencyMs = Date.now() - t0;

        // 2. Instrumented Generation Phase (Eval 5)
        const t1 = Date.now();
        let llmResponse;
        const messages = [{ role: 'user' as const, content: bq.question }];

        if (configName === 'LLM_ONLY') {
          llmResponse = await generateWithoutContext(
            messages,
            `You are an expert tutor for ${bq.courseName}. Answer accurately.`,
            0.3
          );
        } else {
          llmResponse = await generateResponse(
            messages,
            ragResult.context,
            0.3,
            'English',
            bq.courseName
          );
        }
        const generationLatencyMs = Date.now() - t1;
        const totalLatencyMs = retrievalLatencyMs + generationLatencyMs;

        // Token pricing calculations (Eval 5)
        const promptTokens = llmResponse.usage.promptTokens;
        const completionTokens = llmResponse.usage.completionTokens;
        const totalTokens = llmResponse.usage.totalTokens;
        const estimatedCostUSD = Number(
          (
            (promptTokens / 1_000_000) * GROQ_PRICING.inputTokenPricePer1M +
            (completionTokens / 1_000_000) * GROQ_PRICING.outputTokenPricePer1M
          ).toFixed(6)
        );

        const performance: IPerformanceMetrics = {
          retrievalLatencyMs,
          generationLatencyMs,
          totalLatencyMs,
          promptTokens,
          completionTokens,
          totalTokens,
          embeddingCallCount: configName === 'BM25_ONLY' || configName === 'LLM_ONLY' ? 0 : 1,
          llmCallCount: 1,
          estimatedCostUSD,
          costProvider: GROQ_PRICING.provider,
          costModel: GROQ_PRICING.model,
          costPricingVersion: GROQ_PRICING.pricingVersion,
        };

        // 3. Compute IR Metrics (Eval 6)
        const irMetrics = calculateIRMetrics(ragResult.chunks, bq.groundTruthSources);

        // 4. Hallucination Detection (Eval 3)
        const chunkTexts = ragResult.chunks.map((c) => c.text);
        const hallResult = await detectHallucination(llmResponse.content, chunkTexts);

        // Save or update ExpertReview entry
        const review = await ExpertReview.findOneAndUpdate(
          { benchmarkQuestion: bq._id, configuration: configName },
          {
            anonymousId,
            benchmarkQuestion: bq._id,
            configuration: configName,
            generatedAnswer: llmResponse.content,
            retrievedEvidence: ragResult.chunks.map((c) => ({
              chunkId: c.id,
              documentName: c.documentName,
              pageNumber: c.pageNumber,
              chunkText: c.text,
              vectorScore: c.vectorScore,
              bm25Score: c.bm25Score,
              finalScore: c.finalScore,
              rank: c.rank,
            })),
            irMetrics,
            hallucinationDetection: {
              trustScore: hallResult.trustScore,
              status: hallResult.status,
              hallucinatedSentences: hallResult.hallucinatedSentences,
              supportedSentences: hallResult.supportedSentences,
              threshold: 0.4,
            },
            performance,
            status: 'generated',
            generatedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        createdReviews.push(review);
      }
    }

    res.json({
      success: true,
      message: `Experiment execution complete for ${questions.length} benchmark questions across 4 configurations (${createdReviews.length} reviews prepared).`,
      count: createdReviews.length,
      data: createdReviews,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// BLINDED EXPERT REVIEW ENDPOINTS (Evals 2 & 4)
// ─────────────────────────────────────────────────────────────

// Get list of anonymous reviews requiring expert evaluation
export const getBlindedReviews = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await ExpertReview.find({ status: { $in: ['generated', 'under_review'] } })
      .populate('benchmarkQuestion', 'question referenceAnswer courseName topic difficulty')
      .select('-configuration') // BLINDING: Hide configuration from response!
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Expert submits correctness and congruency evaluations
export const submitExpertReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { anonymousId } = req.params;
    const expertId = req.user!._id;
    const {
      correctnessRating,
      factuallyCorrect,
      containsMajorError,
      errorCategories,
      correctnessComments,
      courseCongruencyRating,
      supportedByCourseMaterial,
      containsUnsupportedClaims,
      citationSupportsClaim,
      congruencyComments,
    } = req.body;

    const review = await ExpertReview.findOne({ anonymousId });
    if (!review) {
      res.status(404).json({ success: false, message: 'Review entry not found.' });
      return;
    }

    // Append / update correctness review (Eval 2)
    const correctnessEntry = {
      expertId,
      reviewedAt: new Date(),
      correctnessRating,
      factuallyCorrect,
      containsMajorError,
      errorCategories: errorCategories || [],
      comments: correctnessComments || '',
    };

    // Append / update congruency review (Eval 4)
    const congruencyEntry = {
      expertId,
      reviewedAt: new Date(),
      courseCongruencyRating,
      supportedByCourseMaterial,
      containsUnsupportedClaims,
      citationSupportsClaim,
      comments: congruencyComments || '',
    };

    // Remove existing evaluation by this expert if resubmitting
    review.correctnessReviews = review.correctnessReviews.filter((r) => r.expertId.toString() !== expertId.toString());
    review.congruencyReviews = review.congruencyReviews.filter((r) => r.expertId.toString() !== expertId.toString());

    review.correctnessReviews.push(correctnessEntry);
    review.congruencyReviews.push(congruencyEntry);
    review.status = 'completed';
    review.completedAt = new Date();

    // Populate Confusion Matrix TP/FP/TN/FN for Evaluation 3
    if (review.hallucinationDetection && containsUnsupportedClaims !== undefined) {
      const autoUnsupported = review.hallucinationDetection.trustScore < 45 || review.hallucinationDetection.status === 'hallucinated';
      const humanUnsupported = containsUnsupportedClaims === true;

      review.hallucinationDetection.tp = autoUnsupported && humanUnsupported ? 1 : 0;
      review.hallucinationDetection.fp = autoUnsupported && !humanUnsupported ? 1 : 0;
      review.hallucinationDetection.tn = !autoUnsupported && !humanUnsupported ? 1 : 0;
      review.hallucinationDetection.fn = !autoUnsupported && humanUnsupported ? 1 : 0;
    }

    await review.save();

    res.json({ success: true, message: 'Expert evaluation submitted successfully.', data: review });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// EVALUATION 2: EXPERT MANUAL CORRECTNESS METRICS
// ─────────────────────────────────────────────────────────────
export const getEvaluation2Correctness = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await ExpertReview.find({ 'correctnessReviews.0': { $exists: true } });

    if (!reviews.length) {
      res.json({
        success: true,
        data: {
          totalEvaluated: 0,
          overallCorrectRate: 0,
          meanCorrectness: 0,
          byConfiguration: {},
          classification: 'RESEARCH_VALIDATED',
          basePaperBenchmark: '88/100 (88.0% manual accuracy)',
        },
      });
      return;
    }

    const configStats: Record<string, { total: number; correct: number; scores: number[] }> = {
      HYBRID_RRF: { total: 0, correct: 0, scores: [] },
      VECTOR_ONLY: { total: 0, correct: 0, scores: [] },
      BM25_ONLY: { total: 0, correct: 0, scores: [] },
      LLM_ONLY: { total: 0, correct: 0, scores: [] },
    };

    let grandTotal = 0;
    let grandCorrect = 0;
    const grandScores: number[] = [];

    for (const r of reviews) {
      for (const cr of r.correctnessReviews) {
        if (cr.correctnessRating) {
          const cfg = r.configuration;
          if (!configStats[cfg]) configStats[cfg] = { total: 0, correct: 0, scores: [] };

          configStats[cfg].total += 1;
          grandTotal += 1;

          if (cr.factuallyCorrect || cr.correctnessRating >= 4) {
            configStats[cfg].correct += 1;
            grandCorrect += 1;
          }
          configStats[cfg].scores.push(cr.correctnessRating);
          grandScores.push(cr.correctnessRating);
        }
      }
    }

    const byConfigFormatted = Object.entries(configStats).reduce((acc: any, [cfg, stat]) => {
      const mean = stat.scores.length ? stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length : 0;
      acc[cfg] = {
        totalEvaluated: stat.total,
        correctCount: stat.correct,
        correctRate: stat.total ? Number(((stat.correct / stat.total) * 100).toFixed(1)) : 0,
        meanCorrectness: Number(mean.toFixed(2)),
      };
      return acc;
    }, {});

    const overallMean = grandScores.length ? grandScores.reduce((a, b) => a + b, 0) / grandScores.length : 0;

    res.json({
      success: true,
      data: {
        totalEvaluated: grandTotal,
        overallCorrectCount: grandCorrect,
        overallCorrectRate: grandTotal ? Number(((grandCorrect / grandTotal) * 100).toFixed(1)) : 0,
        overallMeanCorrectness: Number(overallMean.toFixed(2)),
        byConfiguration: byConfigFormatted,
        classification: 'RESEARCH_VALIDATED',
        basePaperBenchmark: '88/100 (88.0% manual accuracy)',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// EVALUATION 3: AUTOMATED GROUNDING VALIDATION VS HUMAN GROUND TRUTH
// ─────────────────────────────────────────────────────────────
export const getEvaluation3GroundingValidation = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await ExpertReview.find({ 'congruencyReviews.0': { $exists: true } });

    if (!reviews.length) {
      res.json({
        success: true,
        data: {
          totalEvaluated: 0,
          confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
          metrics: { accuracy: 0, precision: 0, recall: 0, specificity: 0, f1Score: 0, balancedAccuracy: 0 },
          thresholdSweep: [],
          basePaperBenchmark: 'Accuracy ~82%, Precision ~88.04%, Specificity ~8%',
          classification: 'RESEARCH_VALIDATED',
        },
      });
      return;
    }

    let tp = 0, fp = 0, tn = 0, fn = 0;

    for (const r of reviews) {
      const expertUnsupp = r.congruencyReviews.some((cr) => cr.containsUnsupportedClaims === true);
      const autoUnsupp = (r.hallucinationDetection?.trustScore || 100) < 45;

      if (autoUnsupp && expertUnsupp) tp++;
      else if (autoUnsupp && !expertUnsupp) fp++;
      else if (!autoUnsupp && !expertUnsupp) tn++;
      else if (!autoUnsupp && expertUnsupp) fn++;
    }

    const total = tp + fp + tn + fn;
    const accuracy = total ? Number(((tp + tn) / total).toFixed(4)) : 0;
    const precision = (tp + fp) > 0 ? Number((tp / (tp + fp)).toFixed(4)) : 0;
    const recall = (tp + fn) > 0 ? Number((tp / (tp + fn)).toFixed(4)) : 0;
    const specificity = (tn + fp) > 0 ? Number((tn / (tn + fp)).toFixed(4)) : 0;
    const f1Score = (precision + recall) > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0;
    const balancedAccuracy = Number(((recall + specificity) / 2).toFixed(4));

    // Threshold sweep simulation across thresholds 0.20 to 0.80
    const thresholds = [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80];
    const thresholdSweep = thresholds.map((thresh) => {
      let swTP = 0, swFP = 0, swTN = 0, swFN = 0;
      for (const r of reviews) {
        const expertUnsupp = r.congruencyReviews.some((cr) => cr.containsUnsupportedClaims === true);
        const score = (r.hallucinationDetection?.trustScore || 100) / 100;
        const autoUnsupp = score < thresh;

        if (autoUnsupp && expertUnsupp) swTP++;
        else if (autoUnsupp && !expertUnsupp) swFP++;
        else if (!autoUnsupp && !expertUnsupp) swTN++;
        else if (!autoUnsupp && expertUnsupp) swFN++;
      }
      const swTot = swTP + swFP + swTN + swFN;
      const swAcc = swTot ? (swTP + swTN) / swTot : 0;
      const swPrec = (swTP + swFP) > 0 ? swTP / (swTP + swFP) : 0;
      const swRec = (swTP + swFN) > 0 ? swTP / (swTP + swFN) : 0;
      const swSpec = (swTN + swFP) > 0 ? swTN / (swTN + swFP) : 0;
      const swF1 = (swPrec + swRec) > 0 ? (2 * swPrec * swRec) / (swPrec + swRec) : 0;

      return {
        threshold: thresh,
        tp: swTP, fp: swFP, tn: swTN, fn: swFN,
        accuracy: Number(swAcc.toFixed(4)),
        precision: Number(swPrec.toFixed(4)),
        recall: Number(swRec.toFixed(4)),
        specificity: Number(swSpec.toFixed(4)),
        f1Score: Number(swF1.toFixed(4)),
      };
    });

    res.json({
      success: true,
      data: {
        totalEvaluated: total,
        confusionMatrix: { tp, fp, tn, fn },
        metrics: {
          accuracy: Number((accuracy * 100).toFixed(1)),
          precision: Number((precision * 100).toFixed(1)),
          recall: Number((recall * 100).toFixed(1)),
          specificity: Number((specificity * 100).toFixed(1)),
          f1Score: Number((f1Score * 100).toFixed(1)),
          balancedAccuracy: Number((balancedAccuracy * 100).toFixed(1)),
        },
        thresholdSweep,
        basePaperBenchmark: 'Accuracy ~82%, Precision ~88.04%, Specificity ~8%',
        classification: 'RESEARCH_VALIDATED',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// EVALUATION 4: COURSE-CONTENT CONGRUENCY METRICS
// ─────────────────────────────────────────────────────────────
export const getEvaluation4Congruency = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await ExpertReview.find({ 'congruencyReviews.0': { $exists: true } });

    if (!reviews.length) {
      res.json({
        success: true,
        data: {
          totalEvaluated: 0,
          courseSupportedRate: 0,
          meanCongruency: 0,
          citationSupportRate: 0,
          byConfiguration: {},
          classification: 'RESEARCH_VALIDATED',
        },
      });
      return;
    }

    const configStats: Record<string, { total: number; supported: number; citationSupported: number; scores: number[] }> = {
      HYBRID_RRF: { total: 0, supported: 0, citationSupported: 0, scores: [] },
      VECTOR_ONLY: { total: 0, supported: 0, citationSupported: 0, scores: [] },
      BM25_ONLY: { total: 0, supported: 0, citationSupported: 0, scores: [] },
      LLM_ONLY: { total: 0, supported: 0, citationSupported: 0, scores: [] },
    };

    let grandTotal = 0;
    let grandSupported = 0;
    let grandCitationSupported = 0;
    const grandScores: number[] = [];

    for (const r of reviews) {
      for (const cr of r.congruencyReviews) {
        if (cr.courseCongruencyRating) {
          const cfg = r.configuration;
          if (!configStats[cfg]) configStats[cfg] = { total: 0, supported: 0, citationSupported: 0, scores: [] };

          configStats[cfg].total++;
          grandTotal++;

          if (cr.supportedByCourseMaterial || cr.courseCongruencyRating >= 4) {
            configStats[cfg].supported++;
            grandSupported++;
          }
          if (cr.citationSupportsClaim === true) {
            configStats[cfg].citationSupported++;
            grandCitationSupported++;
          }
          configStats[cfg].scores.push(cr.courseCongruencyRating);
          grandScores.push(cr.courseCongruencyRating);
        }
      }
    }

    const byConfigFormatted = Object.entries(configStats).reduce((acc: any, [cfg, stat]) => {
      const mean = stat.scores.length ? stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length : 0;
      acc[cfg] = {
        totalEvaluated: stat.total,
        supportedCount: stat.supported,
        courseSupportedRate: stat.total ? Number(((stat.supported / stat.total) * 100).toFixed(1)) : 0,
        citationSupportRate: stat.total ? Number(((stat.citationSupported / stat.total) * 100).toFixed(1)) : 0,
        meanCongruency: Number(mean.toFixed(2)),
      };
      return acc;
    }, {});

    const overallMean = grandScores.length ? grandScores.reduce((a, b) => a + b, 0) / grandScores.length : 0;

    res.json({
      success: true,
      data: {
        totalEvaluated: grandTotal,
        courseSupportedCount: grandSupported,
        courseSupportedRate: grandTotal ? Number(((grandSupported / grandTotal) * 100).toFixed(1)) : 0,
        citationSupportRate: grandTotal ? Number(((grandCitationSupported / grandTotal) * 100).toFixed(1)) : 0,
        meanCongruency: Number(overallMean.toFixed(2)),
        byConfiguration: byConfigFormatted,
        classification: 'RESEARCH_VALIDATED',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// EVALUATION 5: COST AND PERFORMANCE INSTRUMENTATION
// ─────────────────────────────────────────────────────────────
export const getEvaluation5CostPerformance = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await ExpertReview.find({ 'performance.totalLatencyMs': { $gt: 0 } });

    if (!reviews.length) {
      res.json({
        success: true,
        data: {
          totalEvaluated: 0,
          overallMetrics: { retrievalLatencyMs: 0, generationLatencyMs: 0, totalLatencyMs: 0, totalTokens: 0, estimatedCostUSD: 0 },
          byConfiguration: {},
          pricingModel: GROQ_PRICING,
          classification: 'RESEARCH_VALIDATED',
        },
      });
      return;
    }

    const configStats: Record<string, {
      total: number;
      retrievalMs: number[];
      generationMs: number[];
      totalMs: number[];
      promptTokens: number[];
      completionTokens: number[];
      costUSD: number[];
    }> = {
      HYBRID_RRF: { total: 0, retrievalMs: [], generationMs: [], totalMs: [], promptTokens: [], completionTokens: [], costUSD: [] },
      VECTOR_ONLY: { total: 0, retrievalMs: [], generationMs: [], totalMs: [], promptTokens: [], completionTokens: [], costUSD: [] },
      BM25_ONLY: { total: 0, retrievalMs: [], generationMs: [], totalMs: [], promptTokens: [], completionTokens: [], costUSD: [] },
      LLM_ONLY: { total: 0, retrievalMs: [], generationMs: [], totalMs: [], promptTokens: [], completionTokens: [], costUSD: [] },
    };

    for (const r of reviews) {
      const p = r.performance;
      if (!p) continue;
      const cfg = r.configuration;
      if (!configStats[cfg]) {
        configStats[cfg] = { total: 0, retrievalMs: [], generationMs: [], totalMs: [], promptTokens: [], completionTokens: [], costUSD: [] };
      }

      configStats[cfg].total++;
      configStats[cfg].retrievalMs.push(p.retrievalLatencyMs || 0);
      configStats[cfg].generationMs.push(p.generationLatencyMs || 0);
      configStats[cfg].totalMs.push(p.totalLatencyMs || 0);
      configStats[cfg].promptTokens.push(p.promptTokens || 0);
      configStats[cfg].completionTokens.push(p.completionTokens || 0);
      configStats[cfg].costUSD.push(p.estimatedCostUSD || 0);
    }

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const byConfigFormatted = Object.entries(configStats).reduce((acc: any, [cfg, stat]) => {
      acc[cfg] = {
        totalEvaluated: stat.total,
        meanRetrievalLatencyMs: Math.round(avg(stat.retrievalMs)),
        meanGenerationLatencyMs: Math.round(avg(stat.generationMs)),
        meanTotalLatencyMs: Math.round(avg(stat.totalMs)),
        meanPromptTokens: Math.round(avg(stat.promptTokens)),
        meanCompletionTokens: Math.round(avg(stat.completionTokens)),
        meanTotalTokens: Math.round(avg(stat.promptTokens) + avg(stat.completionTokens)),
        meanCostUSD: Number(avg(stat.costUSD).toFixed(6)),
        costPer100QueriesUSD: Number((avg(stat.costUSD) * 100).toFixed(4)),
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalEvaluated: reviews.length,
        byConfiguration: byConfigFormatted,
        pricingModel: GROQ_PRICING,
        basePaperBenchmark: '~$1.65 per student (OpenAI GPT-4 API)',
        classification: 'RESEARCH_VALIDATED',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// EVALUATION 6: HYBRID RAG RETRIEVAL EFFECTIVENESS METRICS
// ─────────────────────────────────────────────────────────────
export const getEvaluation6RetrievalMetrics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await ExpertReview.find({
      configuration: { $in: ['HYBRID_RRF', 'VECTOR_ONLY', 'BM25_ONLY'] },
      'irMetrics.precisionAt5': { $exists: true },
    });

    if (!reviews.length) {
      res.json({
        success: true,
        data: {
          totalEvaluated: 0,
          byConfiguration: {},
          classification: 'RESEARCH_VALIDATED',
        },
      });
      return;
    }

    const configStats: Record<string, {
      p1: number[]; p3: number[]; p5: number[];
      r1: number[]; r3: number[]; r5: number[];
      mrr: number[]; ndcg5: number[];
    }> = {
      HYBRID_RRF: { p1: [], p3: [], p5: [], r1: [], r3: [], r5: [], mrr: [], ndcg5: [] },
      VECTOR_ONLY: { p1: [], p3: [], p5: [], r1: [], r3: [], r5: [], mrr: [], ndcg5: [] },
      BM25_ONLY: { p1: [], p3: [], p5: [], r1: [], r3: [], r5: [], mrr: [], ndcg5: [] },
    };

    for (const r of reviews) {
      const m = r.irMetrics;
      if (!m) continue;
      const cfg = r.configuration;
      if (!configStats[cfg]) continue;

      configStats[cfg].p1.push(m.precisionAt1);
      configStats[cfg].p3.push(m.precisionAt3);
      configStats[cfg].p5.push(m.precisionAt5);
      configStats[cfg].r1.push(m.recallAt1);
      configStats[cfg].r3.push(m.recallAt3);
      configStats[cfg].r5.push(m.recallAt5);
      configStats[cfg].mrr.push(m.mrr);
      configStats[cfg].ndcg5.push(m.ndcgAt5);
    }

    const avg = (arr: number[]) => (arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4)) : 0);

    const byConfigFormatted = Object.entries(configStats).reduce((acc: any, [cfg, stat]) => {
      acc[cfg] = {
        totalEvaluated: stat.p5.length,
        precisionAt1: avg(stat.p1),
        precisionAt3: avg(stat.p3),
        precisionAt5: avg(stat.p5),
        recallAt1: avg(stat.r1),
        recallAt3: avg(stat.r3),
        recallAt5: avg(stat.r5),
        mrr: avg(stat.mrr),
        ndcgAt5: avg(stat.ndcg5),
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalEvaluated: reviews.length,
        byConfiguration: byConfigFormatted,
        classification: 'RESEARCH_VALIDATED',
        note: 'LLM_ONLY is excluded as it performs no retrieval.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
