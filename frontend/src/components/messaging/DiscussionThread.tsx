import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useMessagingStore } from '../../store/messaging.store';
import { messagingService } from '../../services/messaging.service';
import { BookmarkButton } from '../common/BookmarkButton';
import { recentlyViewedService } from '../../services/recently-viewed.service';
import { MsgDiscussion, MsgDiscussionReply } from '../../types/messaging.types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DiscussionThreadProps {
  discussion: MsgDiscussion;
}

export const DiscussionThread: React.FC<DiscussionThreadProps> = ({ discussion }) => {
  const { user } = useAuthStore();
  const { discussionReplies, setDiscussionReplies, updateDiscussion, addDiscussionReply } = useMessagingStore();
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isFaculty = user?.role === 'faculty' || user?.role === 'admin';

  useEffect(() => {
    loadReplies();
    recentlyViewedService.record({
      itemType: 'thread',
      itemId: discussion._id,
      title: `Thread: ${discussion.title}`,
      url: `/messages`
    }).catch(() => {});
  }, [discussion._id]);

  const loadReplies = async () => {
    try {
      const res = await messagingService.getDiscussion(discussion._id);
      setDiscussionReplies(res.data.data.replies || []);
    } catch (err) {
      console.error('Failed to load replies:', err);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await messagingService.replyToDiscussion(discussion._id, {
        content: replyText.trim(),
        parentReplyId: replyingTo || undefined,
      });
      if (res.data.data) {
        addDiscussionReply(res.data.data);
        updateDiscussion(discussion._id, { replyCount: discussion.replyCount + 1 });
      }
      setReplyText('');
      setReplyingTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reply');
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    try {
      const res = await messagingService.resolveDiscussion(discussion._id);
      if (res.data.data) {
        updateDiscussion(discussion._id, {
          isResolved: res.data.data.isResolved,
          resolvedBy: res.data.data.resolvedBy,
          resolvedAt: res.data.data.resolvedAt,
        });
      }
    } catch (err: any) {
      toast.error('Failed to update discussion');
    }
  };

  // Build threaded structure
  const rootReplies = discussionReplies.filter((r) => !r.parentReply);
  const childRepliesMap = new Map<string, MsgDiscussionReply[]>();
  discussionReplies.forEach((r) => {
    if (r.parentReply) {
      const existing = childRepliesMap.get(r.parentReply) || [];
      childRepliesMap.set(r.parentReply, [...existing, r]);
    }
  });

  const renderReply = (reply: MsgDiscussionReply, depth: number = 0) => {
    const children = childRepliesMap.get(reply._id) || [];
    return (
      <div key={reply._id} style={{ marginLeft: Math.min(depth * 24, 72) }}>
        <div className="flex gap-2.5 py-2 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: reply.author?.role === 'faculty' ? 'linear-gradient(135deg, rgba(159,122,234,0.25), rgba(79,99,255,0.15))' : 'linear-gradient(135deg, rgba(79,99,255,0.15), rgba(72,187,120,0.1))' }}>
            {reply.author?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold" style={{ color: reply.author?.role === 'faculty' ? '#9f7aea' : '#7c8fff' }}>
                {reply.author?.name}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: reply.author?.role === 'faculty' ? 'rgba(159,122,234,0.1)' : 'rgba(79,99,255,0.1)', color: reply.author?.role === 'faculty' ? '#9f7aea' : '#7c8fff' }}>
                {reply.author?.role}
              </span>
              <span className="text-[9px] text-white/20">{format(new Date(reply.createdAt), 'MMM d, h:mm a')}</span>
            </div>
            <p className="text-[13px] text-white/75 leading-relaxed">{reply.content}</p>
            <button
              onClick={() => setReplyingTo(reply._id)}
              className="text-[10px] text-white/25 hover:text-[#7c8fff] mt-1 opacity-0 group-hover:opacity-100 transition-all"
            >
              ↩ Reply
            </button>
          </div>
        </div>
        {children.map((child) => renderReply(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(79,99,255,0.15)', color: '#7c8fff' }}>
                {discussion.category}
              </span>
              {discussion.isResolved && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-green-500/15 text-green-400">
                  ✓ Resolved
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white/90">{discussion.title}</h3>
            <div className="text-xs text-white/40 mt-1">
              by {discussion.author?.name} • {format(new Date(discussion.createdAt), 'MMM d, yyyy')} • {discussion.replyCount} replies
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 items-center">
            <BookmarkButton
              itemType="thread"
              itemId={discussion._id}
              title={`Thread: ${discussion.title}`}
              category="Discussions"
              className="p-1 border border-white/5 bg-transparent text-white/40 hover:text-white"
            />
            {(isFaculty || discussion.author?._id === user?.id) && (
              <button
                onClick={handleResolve}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  discussion.isResolved
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                }`}
              >
                {discussion.isResolved ? '↩ Reopen' : '✓ Resolve'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Original post */}
      <div className="px-5 py-4 border-b border-white/[0.03]" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(79,99,255,0.2), rgba(159,122,234,0.15))' }}>
            {discussion.author?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="text-xs font-semibold text-[#7c8fff] mb-1">{discussion.author?.name}</div>
            <p className="text-sm text-white/70 leading-relaxed">{discussion.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-5 py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {rootReplies.length === 0 && (
          <div className="py-8 text-center text-white/20 text-xs">No replies yet. Be the first to respond!</div>
        )}
        {rootReplies.map((reply) => renderReply(reply))}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div className="px-5 py-3 border-t border-white/5">
        {replyingTo && (
          <div className="flex items-center gap-2 text-xs text-[#7c8fff] mb-2">
            <span>↩ Replying to a comment</span>
            <button onClick={() => setReplyingTo(null)} className="text-white/30 hover:text-white/60">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }
            }}
            placeholder="Write a reply…"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/[0.08] text-white/90 outline-none focus:border-[#4f63ff]/40 resize-none placeholder:text-white/20"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm disabled:opacity-30 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f63ff, #7c3aed)' }}
          >
            {sending ? '…' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
};
