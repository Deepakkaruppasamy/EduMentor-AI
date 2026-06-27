import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../../types';
import { SourcePanel } from './SourcePanel';
import { TrustScoreBadge } from './TrustScoreBadge';
import { ConceptGraph } from './ConceptGraph';
import { formatDate } from '../../utils/uuid';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';

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
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Concept Graph Visualization */}
        {!isUser && !message.isLoading && message.conceptGraph && (
          <ConceptGraph graph={message.conceptGraph} />
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
