import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../../types';
import { SourcePanel } from './SourcePanel';
import { TrustScoreBadge } from './TrustScoreBadge';
import { ConceptGraph } from './ConceptGraph';
import { formatDate } from '../../utils/uuid';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface MessageBubbleProps {
  message: ChatMessage;
  chatId?: string;
  messageIndex?: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, chatId, messageIndex }) => {
  const [showSources, setShowSources] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<'original' | 'simply' | 'detail' | 'example' | 'realWorld' | 'exam'>('original');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, string>>(message.explanations || {});

  const isUser = message.role === 'user';

  const handleExplainClick = async (type: 'simply' | 'detail' | 'example' | 'realWorld' | 'exam') => {
    if (activeExplanation === type) {
      setActiveExplanation('original');
      return;
    }

    if (explanations[type]) {
      setActiveExplanation(type);
      return;
    }

    if (!chatId || messageIndex === undefined) {
      toast.error('Unable to retrieve explanation. Refresh session.');
      return;
    }

    setLoadingExplanation(true);
    try {
      const response = await api.post(`/chat/${chatId}/message/${messageIndex}/explain`, {
        explanationType: type
      });
      if (response.data.success) {
        setExplanations(prev => ({
          ...prev,
          [type]: response.data.explanation
        }));
        setActiveExplanation(type);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Explanation retrieval failed.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
        ${isUser
          ? 'bg-gradient-to-br from-primary-500 to-purple-600'
          : 'bg-gradient-to-br from-primary-600 to-purple-700'}`}>
        {isUser ? '👤' : '🎓'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-5 py-3.5 ${isUser
          ? 'rounded-tr-md text-sm text-white'
          : 'rounded-tl-md text-sm text-white/90'}`}
          style={isUser
            ? { background: 'linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(79,99,255,0.25)' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {message.isLoading ? (
            <div className="flex items-center gap-1 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              {loadingExplanation ? (
                <div className="flex items-center gap-2 py-1.5 text-white/40">
                  <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-primary-400 rounded-full animate-spin" />
                  <span className="text-[11px] animate-pulse font-medium">Re-explaining concepts...</span>
                </div>
              ) : (
                <ReactMarkdown>
                  {activeExplanation === 'original' ? message.content : explanations[activeExplanation]}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>

        {/* Concept Graph Visualization */}
        {!isUser && !message.isLoading && message.conceptGraph && (
          <ConceptGraph graph={message.conceptGraph} />
        )}

        {/* AI Explain Mode Options */}
        {!isUser && !message.isLoading && message.content && (
          <div className="w-full space-y-2 mt-1 bg-white/[0.01] border border-white/5 rounded-xl p-3 text-left">
            <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider font-mono flex items-center gap-1.5">
              <span>🧠</span> AI Explain Mode
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { type: 'simply', label: 'Explain Simply', icon: '🐣' },
                { type: 'detail', label: 'Explain in Detail', icon: '📚' },
                { type: 'example', label: 'Give Example', icon: '💡' },
                { type: 'realWorld', label: 'Real-World Example', icon: '🏭' },
                { type: 'exam', label: 'Exam Point of View', icon: '📝' }
              ].map((btn) => {
                const isActive = activeExplanation === btn.type;
                return (
                  <button
                    key={btn.type}
                    disabled={loadingExplanation}
                    onClick={() => handleExplainClick(btn.type as any)}
                    className={`text-[9px] px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition-all ${isActive ? 'bg-primary-600/20 border-primary-500/40 text-primary-300' : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-40'}`}
                  >
                    <span>{btn.icon}</span>
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata row (for AI messages) */}
        {!isUser && !message.isLoading && message.content && (
          <div className="flex items-center gap-2 flex-wrap px-1">
            {/* Trust Score */}
            {message.trustScore !== undefined && (
              <TrustScoreBadge score={message.trustScore} />
            )}

            {/* Confidence */}
            {message.confidenceScore !== undefined && (
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(79,99,255,0.15)', color: '#7c8fff', border: '1px solid rgba(79,99,255,0.25)' }}>
                {message.confidenceScore}% Confidence
              </span>
            )}

            {/* Sources toggle */}
            {message.explainability?.sources && message.explainability.sources.length > 0 && (
              <button
                onClick={() => setShowSources(!showSources)}
                className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                style={{
                  background: showSources ? 'rgba(159,122,234,0.2)' : 'rgba(159,122,234,0.1)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(159,122,234,0.25)',
                }}>
                {showSources ? '▲' : '▼'} {message.explainability.sources.length} Sources
              </button>
            )}

            {/* Timestamp */}
            <span className="text-[10px] text-white/25">
              {formatDate(message.timestamp)}
            </span>
          </div>
        )}

        {/* Source Panel */}
        {showSources && message.explainability && (
          <SourcePanel explainability={message.explainability} hallucination={message.hallucination} />
        )}
      </div>
    </motion.div>
  );
};
