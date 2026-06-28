import React, { useState } from 'react';
import { MsgMessage } from '../../types/messaging.types';
import { useAuthStore } from '../../store/auth.store';
import { ReplyPreview } from './ReplyPreview';
import { ImagePreview } from './ImagePreview';
import { FileAttachment } from './FileAttachment';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: MsgMessage;
  onReply: (msg: MsgMessage) => void;
  onEdit: (msg: MsgMessage) => void;
  onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onReply,
  onEdit,
  onDelete,
  onPin,
}) => {
  const { user } = useAuthStore();
  const isMine = message.sender?._id === user?.id;
  const [showActions, setShowActions] = useState(false);

  // Check if editable (within 5 min)
  const isEditable = isMine && Date.now() - new Date(message.createdAt).getTime() < 5 * 60 * 1000;
  const isFaculty = user?.role === 'faculty' || user?.role === 'admin';

  // Read/delivered status
  const getStatus = () => {
    if (!isMine) return null;
    if (message.readBy?.some((r) => r.user !== user?.id)) return { icon: '✓✓', color: '#4f63ff', label: 'Read' };
    if (message.deliveredTo?.some((d) => d.user !== user?.id)) return { icon: '✓✓', color: 'rgba(255,255,255,0.3)', label: 'Delivered' };
    return { icon: '✓', color: 'rgba(255,255,255,0.2)', label: 'Sent' };
  };

  const status = getStatus();

  return (
    <div
      className={`group flex gap-2.5 px-4 py-1 hover:bg-white/[0.02] transition-colors ${
        isMine ? 'flex-row-reverse' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isMine && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, rgba(79,99,255,0.2), rgba(159,122,234,0.15))' }}>
          {message.sender?.name?.[0]?.toUpperCase() || '?'}
        </div>
      )}

      {/* Content */}
      <div className={`max-w-[65%] min-w-[80px] ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isMine && (
          <div className="text-[10px] font-semibold text-[#7c8fff] mb-0.5 px-1">
            {message.sender?.name}
            <span className="text-white/20 font-normal ml-1.5 capitalize">{message.sender?.role}</span>
          </div>
        )}

        {/* Reply preview */}
        {message.replyTo && <ReplyPreview replyTo={message.replyTo} />}

        {/* Message body */}
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm relative ${
            isMine
              ? 'rounded-tr-md'
              : 'rounded-tl-md'
          }`}
          style={{
            background: isMine
              ? 'linear-gradient(135deg, #4f63ff, #5a45c9)'
              : 'rgba(255,255,255,0.06)',
            border: isMine ? 'none' : '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Text */}
          {message.content && (
            <p className={`text-[13px] leading-relaxed break-words ${isMine ? 'text-white' : 'text-white/85'}`}>
              {message.content}
            </p>
          )}

          {/* Images */}
          {message.attachments
            ?.filter((a) => a.fileType?.startsWith('image/'))
            .map((att, i) => (
              <div key={i} className="mt-1">
                <ImagePreview src={att.url} alt={att.filename} />
              </div>
            ))}

          {/* Audio */}
          {message.attachments
            ?.filter((a) => a.fileType?.startsWith('audio/'))
            .map((att, i) => (
              <div key={i} className="mt-1">
                <audio controls className="max-w-full h-8" style={{ filter: isMine ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
                  <source src={att.url} type={att.fileType} />
                </audio>
              </div>
            ))}

          {/* Files */}
          {message.attachments
            ?.filter((a) => !a.fileType?.startsWith('image/') && !a.fileType?.startsWith('audio/'))
            .map((att, i) => (
              <div key={i} className="mt-1">
                <FileAttachment attachment={att} />
              </div>
            ))}

          {/* Pinned indicator */}
          {message.isPinned && (
            <div className="text-[9px] text-amber-400/70 mt-1 flex items-center gap-1">
              📌 Pinned
            </div>
          )}
        </div>

        {/* Footer: time + status + edited */}
        <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMine ? 'justify-end' : ''}`}>
          <span className="text-[9px] text-white/20">{format(new Date(message.createdAt), 'h:mm a')}</span>
          {message.isEdited && <span className="text-[9px] text-white/15 italic">edited</span>}
          {status && (
            <span className="text-[9px]" style={{ color: status.color }} title={status.label}>
              {status.icon}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className={`flex items-start gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => onReply(message)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60 flex items-center justify-center text-[10px] transition-colors" title="Reply">
            ↩
          </button>
          {isEditable && (
            <button onClick={() => onEdit(message)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60 flex items-center justify-center text-[10px] transition-colors" title="Edit">
              ✏️
            </button>
          )}
          {isMine && (
            <button onClick={() => onDelete(message._id)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 flex items-center justify-center text-[10px] transition-colors" title="Delete">
              🗑️
            </button>
          )}
          {isFaculty && (
            <button onClick={() => onPin(message._id)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-amber-500/20 text-white/30 hover:text-amber-400 flex items-center justify-center text-[10px] transition-colors" title={message.isPinned ? 'Unpin' : 'Pin'}>
              📌
            </button>
          )}
        </div>
      )}
    </div>
  );
};
