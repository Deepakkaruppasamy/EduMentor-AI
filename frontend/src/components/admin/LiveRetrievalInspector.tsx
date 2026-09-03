import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface CourseOption {
  _id: string;
  title: string;
  code: string;
}

export const LiveRetrievalInspector: React.FC = () => {
  const [question, setQuestion] = useState('What is network layers and packet framing?');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectionData, setInspectionData] = useState<any>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      if (res.data.success && res.data.data.length > 0) {
        setCourses(res.data.data);
        setSelectedCourseId(res.data.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load course list:', err);
    }
  };

  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) {
      toast.error('Please enter a test question.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/chat/live-inspect', {
        params: {
          question,
          courseId: selectedCourseId || undefined,
        },
      });
      if (res.data.success) {
        setInspectionData(res.data.inspection);
        toast.success('Live retrieval inspection complete!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Retrieval inspection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔬</span>
              <h3 className="text-base font-bold text-white">Live Retrieval & Vector Inspector</h3>
            </div>
            <p className="text-xs text-white/40 mt-1">
              Test student questions live to inspect Cosine Similarity, BM25 scores, RRF merged ranks, and retrieval latency.
            </p>
          </div>
          <button
            onClick={() => handleInspect()}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Retrieving...</span>
              </>
            ) : (
              <>
                <span>⚡ Run Live Inspection</span>
              </>
            )}
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleInspect} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
              Test Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Explain deadlocks in Operating Systems..."
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
              Select Course Collection
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-primary-500 transition-colors"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id} className="bg-[#141722] text-white">
                  {c.title} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Results Display */}
      {inspectionData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block">Course Scope Check</span>
              <span className={`text-sm font-black mt-1 block ${inspectionData.relevanceCheck?.relevant ? 'text-emerald-400' : 'text-amber-400'}`}>
                {inspectionData.relevanceCheck?.relevant ? '✅ In-Scope' : '⚠️ Off-Topic'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block">Retrieval Latency</span>
              <span className="text-sm font-black text-amber-400 mt-1 block font-mono">
                {inspectionData.retrievalLatencyMs} ms
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block">Retrieval Method</span>
              <span className="text-sm font-black text-primary-400 mt-1 block font-mono">
                {inspectionData.retrievalMethod}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block">Top-K Chunks</span>
              <span className="text-sm font-black text-purple-400 mt-1 block font-mono">
                {inspectionData.totalChunksRetrieved} Chunks
              </span>
            </div>
          </div>

          {/* Retrieved Chunks Table */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📊</span> Multi-Vector & BM25 Scoring Breakdown
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/70">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 font-mono">
                    <th className="py-2">Rank</th>
                    <th className="py-2">Source Document</th>
                    <th className="py-2">Vector Cosine Score</th>
                    <th className="py-2">BM25 Term Score</th>
                    <th className="py-2">RRF Final Score</th>
                    <th className="py-2">Excerpt Snippet</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionData.retrievedChunks.map((chunk: any) => (
                    <tr key={chunk.id} className="border-b border-white/5 font-mono">
                      <td className="py-3 font-bold text-primary-400">#{chunk.rank}</td>
                      <td className="py-3 text-white font-sans font-medium">
                        {chunk.documentName}
                        {chunk.pageNumber && <span className="text-white/40 block text-[10px]">Page {chunk.pageNumber}</span>}
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">
                        {chunk.vectorScore !== undefined ? (chunk.vectorScore * 100).toFixed(1) + '%' : 'N/A'}
                      </td>
                      <td className="py-3 text-blue-400 font-bold">
                        {chunk.bm25Score !== undefined ? chunk.bm25Score.toFixed(2) : 'N/A'}
                      </td>
                      <td className="py-3 text-purple-400 font-black">
                        {(chunk.rrfFinalScore * 1000).toFixed(1)}
                      </td>
                      <td className="py-3 text-white/60 font-sans line-clamp-2 max-w-xs text-[11px]">
                        "{chunk.excerpt}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
