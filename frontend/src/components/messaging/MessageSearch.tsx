import React, { useState } from 'react';
import { messagingService } from '../../services/messaging.service';
import { MsgMessage } from '../../types/messaging.types';
import { format } from 'date-fns';

interface MessageSearchProps {
  onClose: () => void;
  onMessageSelect: (conversationId: string, messageId: string) => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ onClose, onMessageSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MsgMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await messagingService.searchMessages({ q: query });
      setResults(res.data.data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(17,19,24,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-4 border-b border-white/5">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search messages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input-field flex-1"
              autoFocus
            />
            <button onClick={handleSearch} className="btn-primary px-4">
              {loading ? '…' : '🔍'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {results.length === 0 && !loading && (
            <div className="p-8 text-center text-white/30 text-sm">
              {query ? 'No results found' : 'Type a keyword to search messages'}
            </div>
          )}
          {results.map((msg) => (
            <button
              key={msg._id}
              onClick={() => onMessageSelect(msg.conversation, msg._id)}
              className="w-full p-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(79,93,200,0.14), rgba(124,111,194,0.1))' }}>
                {msg.sender?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/80">{msg.sender?.name}</span>
                  <span className="text-[10px] text-white/30">{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
                </div>
                <div className="text-xs text-white/50 truncate mt-0.5">{msg.content}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Close */}
        <div className="p-3 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="text-xs text-white/40 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
