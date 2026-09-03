import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatSource } from '../../types';
import toast from 'react-hot-toast';

interface CitationViewerProps {
  citation: ChatSource;
  onClose: () => void;
}

export const CitationViewer: React.FC<CitationViewerProps> = ({ citation, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`"${citation.excerpt}"\n— Source: ${citation.documentName}${citation.pageNumber ? `, Page ${citation.pageNumber}` : ''}`);
    setCopied(true);
    toast.success('Citation excerpt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-80 lg:w-96 flex-shrink-0 flex flex-col h-full border-l border-primary-500/20 bg-[#0f1118]/95 backdrop-blur-xl relative shadow-2xl z-30"
    >
      {/* Background Radial Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[80px] pointer-events-none rounded-full" />
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 z-10 bg-white/[0.01]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] uppercase tracking-wider font-bold text-primary-400 font-mono">
              RAG Source Document
            </span>
          </div>
          <h3 className="text-xs font-bold text-white mt-0.5 truncate pr-2" title={citation.documentName}>
            {citation.documentName}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 z-10">
        {/* Meta Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] uppercase tracking-wider text-white/40 block font-semibold">Relevance Rank</span>
            <span className="text-sm font-black text-primary-300 block mt-0.5 font-mono">#{citation.rank} Match</span>
          </div>
          <div className="rounded-xl p-3 border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] uppercase tracking-wider text-white/40 block font-semibold">RRF Confidence</span>
            <span className="text-sm font-black text-emerald-400 block mt-0.5 font-mono">{citation.confidencePercent}%</span>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-white/40 font-semibold">
            <span>Evidence Alignment</span>
            <span className="text-emerald-400 font-mono">{citation.confidencePercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${citation.confidencePercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-400"
            />
          </div>
        </div>

        {/* Location Row */}
        {citation.pageNumber && (
          <div className="flex items-center justify-between text-[10px] font-semibold text-white/60 px-1 py-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="flex items-center gap-1.5">📍 <span>Page Location</span></span>
            <span className="px-2.5 py-0.5 rounded-md bg-primary-500/20 border border-primary-500/30 text-primary-300 font-mono font-bold">
              Page {citation.pageNumber}
            </span>
          </div>
        )}

        {/* Cited Excerpt Text Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-bold text-white/40">
              Verbatim Text Excerpt
            </span>
            <button
              onClick={handleCopy}
              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all font-medium flex items-center gap-1"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div
            className="rounded-2xl p-4 border border-primary-500/20 leading-relaxed text-xs text-white/80 relative overflow-hidden shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(79,93,200,0.06) 0%, rgba(124,111,194,0.04) 100%)',
            }}
          >
            <div className="text-4xl text-primary-500/20 absolute -left-1 -top-1 font-serif select-none pointer-events-none">
              “
            </div>
            <p className="relative z-10 whitespace-pre-wrap font-light text-white/90">
              {citation.excerpt}
            </p>
          </div>
        </div>

        {/* Action Tip */}
        <div className="rounded-xl p-3 bg-primary-500/10 border border-primary-500/20 text-[10px] text-primary-300 leading-normal flex items-start gap-2.5 shadow-sm">
          <span className="text-sm mt-0.5">💡</span>
          <div>
            <span className="font-bold block mb-0.5 text-primary-200">Interactive Research Tip:</span>
            Matched via Hybrid RAG (Dense Vector + BM25). You can ask: *"Summarize the key points from {citation.documentName} in bullet points."*
          </div>
        </div>
      </div>
    </motion.div>
  );
};

