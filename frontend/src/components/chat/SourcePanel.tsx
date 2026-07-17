import React from 'react';
import { motion } from 'framer-motion';
import { ExplainabilityInfo, HallucinationInfo } from '../../types';
import { useChatStore } from '../../store/chat.store';

interface SourcePanelProps {
  explainability: ExplainabilityInfo;
  hallucination?: HallucinationInfo;
}

export const SourcePanel: React.FC<SourcePanelProps> = ({ explainability, hallucination }) => {
  const setActiveCitation = useChatStore(state => state.setActiveCitation);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full overflow-hidden rounded-xl text-xs"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📖</span>
            <span className="font-semibold text-white/80">Source Citations</span>
          </div>
          <span className="text-white/40">{explainability.retrievalMethod}</span>
        </div>

        {/* Hallucination verdict */}
        {hallucination && (
          <div className="rounded-lg p-3"
            style={{
              background: hallucination.trustScore >= 75
                ? 'rgba(52,168,122,0.08)'
                : hallucination.trustScore >= 45
                ? 'rgba(196,137,58,0.08)'
                : 'rgba(192,82,74,0.08)',
              border: `1px solid ${hallucination.trustScore >= 75 ? 'rgba(52,168,122,0.2)' : hallucination.trustScore >= 45 ? 'rgba(196,137,58,0.2)' : 'rgba(192,82,74,0.2)'}`,
            }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium" style={{
                color: hallucination.trustScore >= 75 ? '#34a87a' : hallucination.trustScore >= 45 ? '#c4893a' : '#c0524a'
              }}>
                {hallucination.status === 'verified' ? '✅ Verified' : hallucination.status === 'partially_verified' ? '⚠️ Partially Verified' : '❌ Unverified'}
              </span>
              <span className="font-bold" style={{ color: hallucination.trustScore >= 75 ? '#34a87a' : hallucination.trustScore >= 45 ? '#c4893a' : '#c0524a' }}>
                Trust: {hallucination.trustScore}%
              </span>
            </div>
            <p className="text-white/50">{hallucination.verdict}</p>
          </div>
        )}

        {/* Sources */}
        <div className="space-y-3">
          {explainability.sources.map((source, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'rgba(79,93,200,0.14)', color: '#8b94e0' }}>
                    {source.rank}
                  </div>
                  <span className="font-semibold text-white/80 truncate flex-1 min-w-0" title={source.documentName}>
                    {source.documentName}
                  </span>
                  {source.pageNumber && (
                    <span className="text-white/40 flex-shrink-0">p.{source.pageNumber}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveCitation(source)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/5 text-primary-400 hover:text-primary-300 transition-colors font-medium"
                  >
                    🔎 Inspect
                  </button>
                  <div className="flex-shrink-0 rounded-full px-2 py-0.5"
                    style={{ background: 'rgba(79,93,200,0.10)', color: '#8b94e0' }}>
                    {source.confidencePercent}%
                  </div>
                </div>
              </div>
              <p className="text-white/50 leading-relaxed line-clamp-3">{source.excerpt}</p>
            </div>
          ))}
        </div>

        {/* Summary */}
        <p className="text-white/30 italic leading-relaxed">
          {explainability.explanationSummary}
        </p>
      </div>
    </motion.div>
  );
};
