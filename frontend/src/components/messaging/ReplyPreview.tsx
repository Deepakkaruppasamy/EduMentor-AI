import React from 'react';
import { MsgMessage } from '../../types/messaging.types';

interface ReplyPreviewProps {
  replyTo: MsgMessage['replyTo'];
  onClear?: () => void;
  isComposer?: boolean;
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({ replyTo, onClear, isComposer }) => {
  if (!replyTo) return null;

  return (
    <div
      className={`flex items-center gap-2 text-xs rounded-lg ${
        isComposer
          ? 'bg-white/5 border border-white/10 px-3 py-2 mb-2'
          : 'bg-white/[0.03] px-2 py-1 mb-1 rounded-md'
      }`}
    >
      <div
        className="w-0.5 self-stretch rounded-full flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #4f63ff, #9f7aea)' }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[#7c8fff] truncate">{replyTo.sender?.name || 'Unknown'}</div>
        <div className="text-white/40 truncate">
          {replyTo.messageType === 'image' ? '📷 Image' :
           replyTo.messageType === 'audio' ? '🎤 Voice message' :
           replyTo.messageType === 'file' ? '📎 File' :
           replyTo.content?.substring(0, 80) || '…'}
        </div>
      </div>
      {isComposer && onClear && (
        <button
          onClick={onClear}
          className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
};
