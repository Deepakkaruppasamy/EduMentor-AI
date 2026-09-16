import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import ExpertReview from '../models/ExpertReview';
import Course from '../models/Course';
import ResearchBenchmarkQuestion from '../models/ResearchBenchmarkQuestion';
import { hybridRetrieve } from '../services/rag/hybrid-rag.service';
import { vectorSearch } from '../utils/chroma';
import { getBM25Index } from '../services/rag/bm25-search.service';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edumentor';

function calculateIRMetrics(retrievedChunks: any[], groundTruthSources: any[]) {
  if (!groundTruthSources || groundTruthSources.length === 0) {
    return {
      precisionAt1: 0, precisionAt3: 0, precisionAt5: 0,
      recallAt1: 0, recallAt3: 0, recallAt5: 0,
      hitRateAt1: 0, hitRateAt3: 0, hitRateAt5: 0,
      mrr: 0, ndcgAt1: 0, ndcgAt3: 0, ndcgAt5: 0,
    };
  }

  const getChunkRelevance = (chunk: any) => {
    for (const gt of groundTruthSources) {
      const chunkIdMatch = Boolean(gt.chunkId && gt.chunkId === chunk.id);
      const gtDoc = (gt.documentName || '').toLowerCase().trim();
      const chunkDoc = (chunk.documentName || '').toLowerCase().trim();
      const sameDoc = gtDoc !== '' && chunkDoc !== '' && (gtDoc === chunkDoc || chunkDoc.includes(gtDoc) || gtDoc.includes(chunkDoc));
      const pageMatch = Boolean(gt.pageNumber && chunk.pageNumber && gt.pageNumber === chunk.pageNumber);
      const gtText = (gt.supportingText || '').toLowerCase().trim();
      const chunkText = (chunk.text || '').toLowerCase().trim();
      const textSubstringMatch = Boolean(gtText.length > 5 && (chunkText.includes(gtText.substring(0, 20)) || gtText.includes(chunkText.substring(0, 20))));
      const gtWords = gtText.split(/\s+/).filter((w: string) => w.length >= 4);
      const chunkWords = new Set(chunkText.split(/\s+/).filter((w: string) => w.length >= 4));
      const wordMatchCount = gtWords.filter((w: string) => chunkWords.has(w)).length;
      const wordOverlapMatch = gtWords.length > 0 && wordMatchCount >= Math.min(2, gtWords.length);

      if (chunkIdMatch || textSubstringMatch || (sameDoc && (pageMatch || wordOverlapMatch))) {
        return { isRelevant: true, grade: gt.relevanceGrade || 3 };
      }
    }
    return { isRelevant: false, grade: 0 };
  };

  const relevanceEvaluations = retrievedChunks.map(getChunkRelevance);
  const relevanceFlags: number[] = relevanceEvaluations.map((e) => (e.isRelevant ? 1 : 0));
  const relevanceGrades: number[] = relevanceEvaluations.map((e) => e.grade);
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

  const firstHitIndex = relevanceFlags.findIndex((r) => r === 1);
  const mrr = firstHitIndex !== -1 ? 1 / (firstHitIndex + 1) : 0;

  const calculateNDCG = (k: number) => {
    const subGrades = relevanceGrades.slice(0, k);
    let dcg = 0;
    for (let i = 0; i < subGrades.length; i++) {
      if (subGrades[i] > 0) dcg += (Math.pow(2, subGrades[i]) - 1) / Math.log2(i + 2);
    }
    const idealGrades = groundTruthSources.map((gt) => gt.relevanceGrade || 3).sort((a, b) => b - a).slice(0, k);
    let idcg = 0;
    for (let i = 0; i < idealGrades.length; i++) {
      idcg += (Math.pow(2, idealGrades[i]) - 1) / Math.log2(i + 2);
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

async function runBenchmark() {
  console.log('===============================================================');
  console.log('🚀 EduMentor AI Multi-Domain RAG Benchmark & Component Ablation');
  console.log('===============================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB database.');

  const courses = await Course.find({ isActive: true }).lean();
  const defaultCourse = courses[0];

  // Seed baseline multi-domain ground-truth benchmark questions
  let benchmarkQuestions = await ResearchBenchmarkQuestion.find().lean();
  if (!benchmarkQuestions.length && defaultCourse) {
    console.log('Seeding multi-domain benchmark dataset (CS, Biology, History)...');
    await ResearchBenchmarkQuestion.create([
      {
        question: 'What is Third Normal Form (3NF) and functional dependency?',
        referenceAnswer: '3NF requires 2NF and no transitive functional dependencies.',
        course: defaultCourse._id,
        courseName: 'CS101 Database Systems',
        topic: 'Normalization',
        difficulty: 'medium',
        questionType: 'definition',
        datasetSplit: 'development',
        validationStatus: 'verified',
        groundTruthSources: [
          { documentName: 'Database_Fundamentals.pdf', pageNumber: 42, supportingText: '3NF prevents transitive dependencies', relevanceGrade: 3 }
        ],
      },
      {
        question: 'Explain deadlocks in operating systems and prevention techniques.',
        referenceAnswer: 'Deadlocks occur when processes wait indefinitely for resources held by each other.',
        course: defaultCourse._id,
        courseName: 'CS202 Operating Systems',
        topic: 'Operating Systems',
        difficulty: 'hard',
        questionType: 'conceptual',
        datasetSplit: 'development',
        validationStatus: 'verified',
        groundTruthSources: [
          { documentName: 'OS_Chapter_4.pdf', pageNumber: 15, supportingText: 'Deadlock prevention eliminates mutual exclusion or hold and wait', relevanceGrade: 3 }
        ],
      },
      {
        question: 'How does cellular respiration generate ATP in mitochondria?',
        referenceAnswer: 'Cellular respiration generates ATP via glycolysis, Krebs cycle, and oxidative phosphorylation.',
        course: defaultCourse._id,
        courseName: 'BIO101 Cellular Biology',
        topic: 'Metabolism',
        difficulty: 'medium',
        questionType: 'conceptual',
        datasetSplit: 'development',
        validationStatus: 'verified',
        groundTruthSources: [
          { documentName: 'Cellular_Biology.pdf', pageNumber: 88, supportingText: 'ATP synthesis via electron transport chain in inner membrane', relevanceGrade: 3 }
        ],
      },
      {
        question: 'Define the Industrial Revolution and key economic catalysts.',
        referenceAnswer: 'The transition to new manufacturing processes in Great Britain and Europe.',
        course: defaultCourse._id,
        courseName: 'HIST105 World History',
        topic: 'Modern History',
        difficulty: 'easy',
        questionType: 'definition',
        datasetSplit: 'development',
        validationStatus: 'verified',
        groundTruthSources: [
          { documentName: 'World_History_Vol2.pdf', pageNumber: 120, supportingText: 'Mechanization of textile industries and steam power', relevanceGrade: 3 }
        ],
      },
    ]);
    benchmarkQuestions = await ResearchBenchmarkQuestion.find().lean();
  }

  const configurations = [
    'FULL_ADAPTIVE_HYBRID', // Dynamic RRF + Re-Ranker
    'STATIC_RRF',            // Equal RRF weights, no Re-Ranker
    'NO_RERANKER',          // Adaptive RRF without Re-Ranker
    'VECTOR_ONLY',          // Dense Vector Search
    'BM25_ONLY',            // Sparse BM25 Search
  ];

  const resultsSummary: Record<string, { p5: number[]; r5: number[]; mrr: number[]; latency: number[] }> = {};
  configurations.forEach(c => { resultsSummary[c] = { p5: [], r5: [], mrr: [], latency: [] }; });

  for (const bq of benchmarkQuestions) {
    const courseObj = courses.find((c: any) => String(c._id) === String(bq.course)) || defaultCourse;
    const collectionName = courseObj ? courseObj.chromaCollection : 'general';

    console.log(`\n🔍 Evaluating Multi-Domain Query [${bq.questionType.toUpperCase()}]: "${bq.question}"`);

    for (const configName of configurations) {
      const t0 = Date.now();
      let chunks: any[] = [];

      try {
        if (configName === 'FULL_ADAPTIVE_HYBRID') {
          const res = await hybridRetrieve(bq.question, collectionName, 5, undefined, undefined, { enableAdaptiveRrf: true, enableReranker: true });
          chunks = res.chunks;
        } else if (configName === 'STATIC_RRF') {
          const res = await hybridRetrieve(bq.question, collectionName, 5, undefined, undefined, { enableAdaptiveRrf: false, enableReranker: false });
          chunks = res.chunks;
        } else if (configName === 'NO_RERANKER') {
          const res = await hybridRetrieve(bq.question, collectionName, 5, undefined, undefined, { enableAdaptiveRrf: true, enableReranker: false });
          chunks = res.chunks;
        } else if (configName === 'VECTOR_ONLY') {
          const raw = await vectorSearch(collectionName, bq.question, 5);
          chunks = raw.map((v, i) => ({ id: v.id, text: v.document, documentName: v.metadata?.documentName || 'Doc', pageNumber: v.metadata?.pageNumber || 1, finalScore: v.score, rank: i + 1 }));
        } else if (configName === 'BM25_ONLY') {
          const bm25Index = getBM25Index(collectionName);
          const raw = bm25Index.search(bq.question, 5);
          chunks = raw.map((b, i) => ({ id: b.id, text: b.text, documentName: b.metadata?.documentName || 'Doc', pageNumber: b.metadata?.pageNumber || 1, finalScore: b.score, rank: i + 1 }));
        }

        const latencyMs = Date.now() - t0;
        const irMetrics = calculateIRMetrics(chunks, bq.groundTruthSources);

        resultsSummary[configName].p5.push(irMetrics.precisionAt5);
        resultsSummary[configName].r5.push(irMetrics.recallAt5);
        resultsSummary[configName].mrr.push(irMetrics.mrr);
        resultsSummary[configName].latency.push(latencyMs);

        console.log(`  ✓ ${configName.padEnd(20)}: P@5=${irMetrics.precisionAt5.toFixed(2)}, R@5=${irMetrics.recallAt5.toFixed(2)}, MRR=${irMetrics.mrr.toFixed(2)} (${latencyMs}ms)`);
      } catch (err: any) {
        console.warn(`  ⚠️ ${configName} evaluation warning:`, err.message);
      }
    }
  }

  // Print Publication LaTeX Table
  console.log('\n===============================================================');
  console.log('📊 PUBLICATION RESULTS TABLE (LaTeX Format for Paper)');
  console.log('===============================================================\n');

  console.log('\\begin{table}[h]');
  console.log('\\centering');
  console.log('\\caption{Ablation Study of EduMentor AI RAG Architecture Components}');
  console.log('\\begin{tabular}{lcccc}');
  console.log('\\toprule');
  console.log('\\textbf{Architecture Variant} & \\textbf{P@5} & \\textbf{R@5} & \\textbf{MRR} & \\textbf{Latency (ms)} \\\\');
  console.log('\\midrule');

  const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  configurations.forEach(cfg => {
    const res = resultsSummary[cfg];
    const meanP5 = avg(res.p5).toFixed(3);
    const meanR5 = avg(res.r5).toFixed(3);
    const meanMRR = avg(res.mrr).toFixed(3);
    const meanLat = Math.round(avg(res.latency));
    const label = cfg === 'FULL_ADAPTIVE_HYBRID' ? '\\textbf{EduMentor Full (Adaptive + Re-Ranker)}' : cfg;
    console.log(`${label.padEnd(45)} & ${meanP5} & ${meanR5} & ${meanMRR} & ${meanLat} \\\\`);
  });

  console.log('\\bottomrule');
  console.log('\\end{tabular}');
  console.log('\\end{table}\n');

  await mongoose.disconnect();
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
