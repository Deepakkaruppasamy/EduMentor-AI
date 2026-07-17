import React from 'react';
import { motion } from 'framer-motion';
import { ChatSource } from '../../types';

interface CitationViewerProps {
  citation: ChatSource;
  onClose: () => void;
}

export const CitationViewer: React.FC<CitationViewerProps> = ({ citation, onClose }) => {
  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-80 lg:w-96 flex-shrink-0 flex flex-col h-full border-l border-white/5 bg-[#0f1118]/95 backdrop-blur-md relative"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
        }} 
      />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 z-10">
        <div>
          <span className="text-[9px] uppercase tracking-wider font-bold text-primary-400 font-mono">
            RAG Source Document
          </span>
          <h3 className="text-xs font-bold text-white mt-0.5 truncate max-w-[200px]" title={citation.documentName}>
            {citation.documentName}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 z-10">
        {/* Meta Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 border border-white/[0.04] bg-white/[0.01]">
            <span className="text-[9px] uppercase tracking-wider text-white/30 block font-semibold">Relevance Rank</span>
            <span className="text-sm font-bold text-white block mt-0.5">#{citation.rank} Match</span>
          </div>
          <div className="rounded-xl p-3 border border-white/[0.04] bg-white/[0.01]">
            <span className="text-[9px] uppercase tracking-wider text-white/30 block font-semibold">Confidence</span>
            <span className="text-sm font-bold text-green-400 block mt-0.5">{citation.confidencePercent}%</span>
          </div>
        </div>

        {/* Location Row */}
        {citation.pageNumber && (
          <div className="flex items-center gap-2 text-[10px] font-semibold text-white/50 px-1">
            <span>📍 Page Reference:</span>
            <span className="px-2 py-0.5 rounded bg-primary-500/15 border border-primary-500/25 text-primary-400 font-mono">
              Page {citation.pageNumber}
            </span>
          </div>
        )}

        {/* Cited Excerpt Text Box */}
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-wider font-bold text-white/30 block">
            Cited Excerpt
          </span>
          <div 
            className="rounded-2xl p-4 border border-primary-500/10 leading-relaxed text-xs text-white/70 relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, rgba(79,93,200,0.03) 0%, rgba(124,111,194,0.02) 100%)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.1)'
            }}
          >
            {/* Quote decoration */}
            <div className="text-4xl text-primary-500/10 absolute -left-1 -top-1 font-serif select-none pointer-events-none">
              “
            </div>
            <p className="relative z-10 whitespace-pre-wrap font-light">
              {citation.excerpt}
            </p>
          </div>
        </div>

        {/* Action Tip */}
        <div className="rounded-xl p-3 bg-primary-500/5 border border-primary-500/10 text-[10px] text-primary-300 leading-normal flex items-start gap-2.5">
          <span className="text-sm mt-0.5">💡</span>
          <div>
            <span className="font-semibold block mb-0.5">Study Helper Tip:</span>
            This text was automatically matched from course documents using vector similarity search. You can ask: *"Explain what the citation from {citation.documentName} means in simple terms."*
          </div>
        </div>
      </div>
    </motion.div>
  );
};
