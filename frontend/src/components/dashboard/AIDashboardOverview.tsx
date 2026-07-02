import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface RecommendationItem {
  title: string;
  description: string;
  actionUrl: string;
}

export const AIDashboardOverview: React.FC = () => {
  const [insights, setInsights] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchOverview = async (forceRegen = false) => {
    if (forceRegen) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }

    try {
      const { data } = await api.get<{ success: boolean; insights: string[]; recommendations: RecommendationItem[] }>('/analytics/ai-overview');
      setInsights(data.insights);
      setRecommendations(data.recommendations);
    } catch {
      toast.error('Failed to update AI dashboard insights.');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h3 className="text-sm font-bold text-white">AI Diagnostics &amp; Overview</h3>
            <p className="text-[10px] text-white/40 mt-0.5">Real-time intelligent telemetry &amp; study recommendations</p>
          </div>
        </div>
        
        <button
          onClick={() => fetchOverview(true)}
          disabled={regenerating || loading}
          className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider font-mono bg-indigo-500/5 px-2.5 py-1.5 rounded-lg border border-indigo-500/10 flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          {regenerating ? (
            <span className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              Syncing...
            </span>
          ) : (
            '🔄 Regenerate'
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-white/30">Aggregating database insights...</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {/* Insights bullets */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Personalized Insights</h4>
            <div className="space-y-2">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl p-3 transition-all text-xs"
                >
                  <span className="text-indigo-400 mt-0.5">✦</span>
                  <p className="text-white/80 leading-relaxed font-medium">{insight}</p>
                </div>
              ))}
              {insights.length === 0 && (
                <div className="text-xs text-white/30 italic">No diagnostic insights available. Ask queries to generate metrics!</div>
              )}
            </div>
          </div>

          {/* Recommendations Cards */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Action Recommendations</h4>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl p-3.5 transition-all text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white">{rec.title}</div>
                    <div className="text-[10px] text-white/40 mt-1 line-clamp-2 leading-relaxed">{rec.description}</div>
                  </div>
                  <Link
                    to={rec.actionUrl}
                    className="flex-shrink-0 bg-white/5 hover:bg-indigo-500 hover:text-white border border-white/15 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all"
                  >
                    Open
                  </Link>
                </div>
              ))}
              {recommendations.length === 0 && (
                <div className="text-xs text-white/30 italic">No recommendations yet. Start study sessions to receive tips!</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
