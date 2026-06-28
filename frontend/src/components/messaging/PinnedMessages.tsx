import React, { useState } from 'react';
import { MsgMessage } from '../../types/messaging.types';
import { format } from 'date-fns';

interface PinnedMessagesProps {
  messages: MsgMessage[];
  onJumpTo?: (messageId: string) => void;
}

export const PinnedMessages: React.FC<PinnedMessagesProps> = ({ messages, onJumpTo }) => {
  const [expanded, setExpanded] = useState(false);

  if (messages.length === 0) return null;

  return (
    <div
      className="mx-3 mt-2 rounded-xl overflow-hidden"
      style={{ background: 'rgba(79,99,255,0.06)', border: '1px solid rgba(79,99,255,0.15)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs text-[#7c8fff] hover:bg-white/5 transition-colors"
      >
        <span>📌</span>
        <span className="font-medium">{messages.length} pinned message{messages.length > 1 ? 's' : ''}</span>
        <span className="ml-auto text-white/30">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-white/5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {messages.map((msg) => (
            <button
              key={msg._id}
              onClick={() => onJumpTo?.(msg._id)}
              className="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-semibold text-white/60">{msg.sender?.name}</span>
                <span className="text-[9px] text-white/25">{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
              </div>
              <div className="text-xs text-white/40 truncate">{msg.content || `[${msg.messageType}]`}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
