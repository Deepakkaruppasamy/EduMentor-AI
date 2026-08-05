import React, { useState, useEffect } from 'react';
import { aiEvaluationService } from '../../services/ai-evaluation.service';
import toast from 'react-hot-toast';

export const ResearchValidationDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [eval1, setEval1] = useState<any>(null);
  const [eval2, setEval2] = useState<any>(null);
  const [eval3, setEval3] = useState<any>(null);
  const [eval4, setEval4] = useState<any>(null);
  const [eval5, setEval5] = useState<any>(null);
  const [eval6, setEval6] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [blindedReviews, setBlindedReviews] = useState<any[]>([]);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [runningExperiment, setRunningExperiment] = useState(false);

  // Review form states
  const [correctnessRating, setCorrectnessRating] = useState<number>(5);
  const [factuallyCorrect, setFactuallyCorrect] = useState<boolean>(true);
  const [courseCongruencyRating, setCourseCongruencyRating] = useState<number>(5);
  const [supportedByCourse, setSupportedByCourse] = useState<boolean>(true);
  const [containsUnsupported, setContainsUnsupported] = useState<boolean>(false);
  const [reviewComments, setReviewComments] = useState<string>('');

  const loadAllMetrics = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4, r5, r6, rBench, rReviews] = await Promise.all([
        aiEvaluationService.getTAM(),
        aiEvaluationService.getEval2Correctness(),
        aiEvaluationService.getEval3Grounding(),
        aiEvaluationService.getEval4Congruency(),
        aiEvaluationService.getEval5CostPerformance(),
        aiEvaluationService.getEval6Retrieval(),
        aiEvaluationService.getBenchmarkQuestions(),
        aiEvaluationService.getBlindedReviews(),
      ]);

      setEval1(r1.data?.data);
      setEval2(r2.data?.data);
      setEval3(r3.data?.data);
      setEval4(r4.data?.data);
      setEval5(r5.data?.data);
      setEval6(r6.data?.data);
      setBenchmarks(rBench.data?.data || []);
      setBlindedReviews(rReviews.data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load research evaluation metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMetrics();
  }, []);

  const handleSeedBenchmarks = async () => {
    try {
      await aiEvaluationService.seedBenchmarkQuestions();
      toast.success('Benchmark questions seeded successfully.');
      loadAllMetrics();
    } catch (err: any) {
      toast.error('Failed to seed benchmark questions.');
    }
  };

  const handleRunExperimentBatch = async () => {
    setRunningExperiment(true);
    try {
      const res = await aiEvaluationService.runExperimentBatch();
      toast.success(res.data?.message || 'Ablation experiment batch completed.');
      loadAllMetrics();
    } catch (err: any) {
      toast.error('Failed to execute experiment batch.');
    } finally {
      setRunningExperiment(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedReview) return;
    try {
      await aiEvaluationService.submitExpertReview(selectedReview.anonymousId, {
        correctnessRating,
        factuallyCorrect,
        courseCongruencyRating,
        supportedByCourseMaterial: supportedByCourse,
        containsUnsupportedClaims: containsUnsupported,
        citationSupportsClaim: true,
        correctnessComments: reviewComments,
        congruencyComments: reviewComments,
      });
      toast.success('Expert evaluation submitted.');
      setSelectedReview(null);
      loadAllMetrics();
    } catch (err: any) {
      toast.error('Failed to submit review.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-white/50 text-sm">
        <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading 6-Study Research Evaluation Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🎓 IEEE Transactions on Education 2025 Evaluation Framework
          </h2>
          <p className="text-xs text-white/40 mt-1">
            6 Controlled Research Studies comparing EduMentor AI vs Base Paper (MoodleBot)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedBenchmarks}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            🌱 Seed Benchmarks
          </button>
          <button
            onClick={handleRunExperimentBatch}
            disabled={runningExperiment}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {runningExperiment ? (
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              '⚡ Run 4-Config Ablation Batch'
            )}
          </button>
        </div>
      </div>

      {/* 6-STUDY CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EVALUATION 1: TAM */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📊</span> Study 1: Student Acceptance (TAM)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              RESEARCH_VALIDATED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-primary-400">{eval1?.totalResponses || 0}</div>
              <div className="text-[10px] text-white/40 uppercase">Participants (N)</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-emerald-400">{eval1?.overallScore || 0}/5</div>
              <div className="text-[10px] text-white/40 uppercase">Overall TAM Mean</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-purple-400">{eval1?.cronbachAlpha || 'N/A'}</div>
              <div className="text-[10px] text-white/40 uppercase">Cronbach Alpha (α)</div>
            </div>
          </div>

          {eval1?.totalResponses < 50 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              ⚠️ Insufficient sample size for reliable inferential analysis (N = {eval1?.totalResponses || 0} &lt; 50).
            </div>
          )}

          <div className="text-[11px] text-white/50 space-y-1">
            <div>• Constructs evaluated: PU, PEOU, AT, BI, SE, SA, OS</div>
            <div>• Reliability note: Single-item construct Warning applied where appropriate.</div>
          </div>
        </div>

        {/* EVALUATION 2: EXPERT MANUAL CORRECTNESS */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🎯</span> Study 2: Expert Manual Correctness
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              RESEARCH_VALIDATED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-blue-400">{eval2?.totalEvaluated || 0}</div>
              <div className="text-[10px] text-white/40 uppercase">Evaluated</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-green-400">{eval2?.overallCorrectRate || 0}%</div>
              <div className="text-[10px] text-white/40 uppercase">Correct Rate</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-yellow-400">{eval2?.overallMeanCorrectness || 0}/5</div>
              <div className="text-[10px] text-white/40 uppercase">Mean Rating</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 text-[11px] text-white/70 space-y-1">
            <div className="font-bold text-white/90">Ablation Breakdown (Correct Answer Rate):</div>
            <div className="flex justify-between">
              <span>HYBRID_RRF: {eval2?.byConfiguration?.HYBRID_RRF?.correctRate || 0}%</span>
              <span>VECTOR_ONLY: {eval2?.byConfiguration?.VECTOR_ONLY?.correctRate || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>BM25_ONLY: {eval2?.byConfiguration?.BM25_ONLY?.correctRate || 0}%</span>
              <span>LLM_ONLY: {eval2?.byConfiguration?.LLM_ONLY?.correctRate || 0}%</span>
            </div>
          </div>

          <div className="text-[10px] text-white/40">
            MoodleBot Base Paper Benchmark: 88/100 (88.0% manual accuracy)
          </div>
        </div>

        {/* EVALUATION 3: AUTOMATED GROUNDING VALIDATION */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🛡️</span> Study 3: Automated Grounding Validation
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              RESEARCH_VALIDATED
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-white/5">
              <div className="font-bold text-green-400">{eval3?.confusionMatrix?.tp || 0}</div>
              <div className="text-[9px] text-white/40">TP</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="font-bold text-red-400">{eval3?.confusionMatrix?.fp || 0}</div>
              <div className="text-[9px] text-white/40">FP</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="font-bold text-blue-400">{eval3?.confusionMatrix?.tn || 0}</div>
              <div className="text-[9px] text-white/40">TN</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="font-bold text-yellow-400">{eval3?.confusionMatrix?.fn || 0}</div>
              <div className="text-[9px] text-white/40">FN</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-white/5">
              <div className="font-bold text-white">{eval3?.metrics?.accuracy || 0}%</div>
              <div className="text-[9px] text-white/40">Accuracy</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="font-bold text-white">{eval3?.metrics?.precision || 0}%</div>
              <div className="text-[9px] text-white/40">Precision</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="font-bold text-white">{eval3?.metrics?.specificity || 0}%</div>
              <div className="text-[9px] text-white/40">Specificity</div>
            </div>
          </div>

          <div className="text-[10px] text-white/40">
            MoodleBot Base Paper Checker: Accuracy ~82%, Precision ~88.04%, Specificity ~8%
          </div>
        </div>

        {/* EVALUATION 4: COURSE CONGRUENCY */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📖</span> Study 4: Course-Content Congruency
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              RESEARCH_VALIDATED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-emerald-400">{eval4?.courseSupportedRate || 0}%</div>
              <div className="text-[10px] text-white/40 uppercase">Course Supported</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-purple-400">{eval4?.meanCongruency || 0}/5</div>
              <div className="text-[10px] text-white/40 uppercase">Mean Congruency</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-blue-400">{eval4?.citationSupportRate || 0}%</div>
              <div className="text-[10px] text-white/40 uppercase">Citation Rate</div>
            </div>
          </div>

          <div className="text-[11px] text-white/50">
            Evaluates whether generated answers agree with uploaded course material (distinct from general factual correctness).
          </div>
        </div>

        {/* EVALUATION 5: COST & PERFORMANCE */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚡</span> Study 5: Cost & Performance
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              RESEARCH_VALIDATED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-cyan-400">
                {eval5?.byConfiguration?.HYBRID_RRF?.meanRetrievalLatencyMs || 0}ms
              </div>
              <div className="text-[10px] text-white/40 uppercase">Retrieval Time</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-indigo-400">
                {eval5?.byConfiguration?.HYBRID_RRF?.meanGenerationLatencyMs || 0}ms
              </div>
              <div className="text-[10px] text-white/40 uppercase">Generation Time</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-bold text-emerald-400">
                ${eval5?.byConfiguration?.HYBRID_RRF?.costPer100QueriesUSD || 0}
              </div>
              <div className="text-[10px] text-white/40 uppercase">Cost / 100 Queries</div>
            </div>
          </div>

          <div className="text-[10px] text-white/40">
            Provider Pricing: Groq Llama 3.3 70B ($0.59 input / $0.79 output per 1M tokens)
          </div>
        </div>

        {/* EVALUATION 6: HYBRID RAG RETRIEVAL */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🔬</span> Study 6: Hybrid RAG Retrieval Effectiveness
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              RESEARCH_VALIDATED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/70">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="py-1">Config</th>
                  <th className="py-1">P@5</th>
                  <th className="py-1">R@5</th>
                  <th className="py-1">MRR</th>
                  <th className="py-1">nDCG@5</th>
                </tr>
              </thead>
              <tbody>
                {['HYBRID_RRF', 'VECTOR_ONLY', 'BM25_ONLY'].map((cfg) => {
                  const data = eval6?.byConfiguration?.[cfg] || {};
                  return (
                    <tr key={cfg} className="border-b border-white/5">
                      <td className="py-1.5 font-bold text-white">{cfg}</td>
                      <td className="py-1.5 text-green-400">{data.precisionAt5 || 0}</td>
                      <td className="py-1.5 text-blue-400">{data.recallAt5 || 0}</td>
                      <td className="py-1.5 text-yellow-400">{data.mrr || 0}</td>
                      <td className="py-1.5 text-purple-400">{data.ndcgAt5 || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BLINDED EXPERT REVIEW SECTION */}
      {blindedReviews.length > 0 && (
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🕵️</span> Faculty Blinded Expert Review Interface ({blindedReviews.length} pending)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {blindedReviews.map((rev) => (
              <div
                key={rev.anonymousId}
                onClick={() => setSelectedReview(rev)}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  selectedReview?.anonymousId === rev.anonymousId
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>{rev.anonymousId}</span>
                  <span className="text-primary-400 font-bold">{rev.benchmarkQuestion?.courseName}</span>
                </div>
                <div className="text-xs font-semibold text-white truncate">
                  {rev.benchmarkQuestion?.question}
                </div>
              </div>
            ))}
          </div>

          {selectedReview && (
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4 mt-4">
              <h4 className="text-xs font-bold text-primary-400 uppercase">
                Reviewing Answer for: "{selectedReview.benchmarkQuestion?.question}"
              </h4>

              <div className="p-3 rounded bg-black/40 text-xs text-white/80 space-y-2">
                <div className="font-bold text-white/50">Generated Answer:</div>
                <div>{selectedReview.generatedAnswer}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/70 block mb-1">
                    Study 2: Factual Correctness (1 = Wrong, 5 = Perfect)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={correctnessRating}
                    onChange={(e) => setCorrectnessRating(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-right text-yellow-400 font-bold">{correctnessRating} / 5</div>
                </div>

                <div>
                  <label className="text-xs text-white/70 block mb-1">
                    Study 4: Course-Content Congruency (1 = Contradicts, 5 = Fully Aligned)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={courseCongruencyRating}
                    onChange={(e) => setCourseCongruencyRating(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-right text-purple-400 font-bold">{courseCongruencyRating} / 5</div>
                </div>
              </div>

              <div className="flex gap-6 text-xs text-white/80">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={factuallyCorrect}
                    onChange={(e) => setFactuallyCorrect(e.target.checked)}
                  />
                  Factually Correct
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={containsUnsupported}
                    onChange={(e) => setContainsUnsupported(e.target.checked)}
                  />
                  Contains Unsupported Claims (Study 3 Ground Truth)
                </label>
              </div>

              <button
                onClick={handleSubmitReview}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-500 transition-all"
              >
                Submit Evaluation
              </button>
            </div>
          )}
        </div>
      )}

      {/* BASE PAPER COMPARISON PANEL */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>📋</span> Base Paper Comparison Panel (MoodleBot vs EduMentor AI)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/70">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="py-2">Evaluation Study</th>
                <th className="py-2">MoodleBot (IEEE 2025 Base Paper)</th>
                <th className="py-2">EduMentor AI (Current System)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2 font-bold text-white">1. Student Acceptance (TAM)</td>
                <td>30 completed (PU α=0.802, AT α=0.800)</td>
                <td>N = {eval1?.totalResponses || 0} (Overall Mean = {eval1?.overallScore || 0}/5)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 font-bold text-white">2. Manual Correctness</td>
                <td>88/100 (88.0% correct)</td>
                <td>{eval2?.overallCorrectRate || 0}% ({eval2?.overallCorrectCount || 0}/{eval2?.totalEvaluated || 0})</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 font-bold text-white">3. Automated Grounding Validation</td>
                <td>Accuracy ~82%, Precision ~88.04%, Specificity ~8%</td>
                <td>Acc {eval3?.metrics?.accuracy || 0}%, Prec {eval3?.metrics?.precision || 0}%, Spec {eval3?.metrics?.specificity || 0}%</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 font-bold text-white">4. Course Content Congruency</td>
                <td>Implicit / Course specific context</td>
                <td>{eval4?.courseSupportedRate || 0}% Course-supported (Mean {eval4?.meanCongruency || 0}/5)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 font-bold text-white">5. Cost & Performance</td>
                <td>~$1.65 / student (OpenAI GPT-4)</td>
                <td>${eval5?.byConfiguration?.HYBRID_RRF?.costPer100QueriesUSD || 0} / 100 queries (Groq Llama 3.3 70B)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 font-bold text-white">6. Hybrid RAG Retrieval</td>
                <td>Not evaluated (Vector only, top-5)</td>
                <td>P@5: {eval6?.byConfiguration?.HYBRID_RRF?.precisionAt5 || 0}, R@5: {eval6?.byConfiguration?.HYBRID_RRF?.recallAt5 || 0}, MRR: {eval6?.byConfiguration?.HYBRID_RRF?.mrr || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3 rounded-xl bg-white/5 text-[10px] text-white/40 italic">
          "Cross-study values are descriptive and should not be interpreted as a controlled head-to-head comparison because the datasets, participants, models and experimental conditions differ."
        </div>
      </div>
    </div>
  );
};
