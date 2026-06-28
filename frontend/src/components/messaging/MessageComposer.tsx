import React, { useState, useRef, useCallback } from 'react';
import { MsgMessage, MsgAttachment } from '../../types/messaging.types';
import { messagingService } from '../../services/messaging.service';
import { emitTyping, emitStopTyping } from '../../services/messaging-socket';
import { EmojiPicker } from './EmojiPicker';
import { AudioRecorder } from './AudioRecorder';
import { ImagePreview } from './ImagePreview';
import { ReplyPreview } from './ReplyPreview';
import toast from 'react-hot-toast';

interface MessageComposerProps {
  conversationId: string;
  replyTo: MsgMessage | null;
  editingMessage: MsgMessage | null;
  onClearReply: () => void;
  onClearEdit: () => void;
  onMessageSent: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  replyTo,
  editingMessage,
  onClearReply,
  onClearEdit,
  onMessageSent,
}) => {
  const [text, setText] = useState(editingMessage?.content || '');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update text when editing message changes
  React.useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleTyping = useCallback(() => {
    emitTyping(conversationId);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      emitStopTyping(conversationId);
    }, 2000);
  }, [conversationId]);

  const handleSend = async () => {
    if (sending) return;
    const hasContent = text.trim() || pendingImages.length > 0 || pendingFiles.length > 0;
    if (!hasContent && !editingMessage) return;

    setSending(true);
    try {
      // If editing
      if (editingMessage) {
        await messagingService.editMessage(editingMessage._id, text.trim());
        onClearEdit();
        setText('');
        onMessageSent();
        return;
      }

      // Upload attachments first
      const attachments: MsgAttachment[] = [];

      for (const img of pendingImages) {
        const res = await messagingService.uploadImage(img.file);
        if (res.data.data) attachments.push(res.data.data);
      }

      for (const file of pendingFiles) {
        const res = await messagingService.uploadFile(file);
        if (res.data.data) attachments.push(res.data.data);
      }

      // Determine message type
      let messageType = 'text';
      if (attachments.some((a) => a.fileType?.startsWith('image/'))) messageType = 'image';
      else if (attachments.some((a) => !a.fileType?.startsWith('image/') && !a.fileType?.startsWith('audio/'))) messageType = 'file';

      await messagingService.sendMessage({
        conversationId,
        content: text.trim(),
        messageType,
        replyTo: replyTo?._id,
        attachments,
      });

      setText('');
      setPendingImages([]);
      setPendingFiles([]);
      onClearReply();
      onMessageSent();
      emitStopTyping(conversationId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleAudioSend = async (blob: Blob) => {
    setSending(true);
    try {
      const uploadRes = await messagingService.uploadAudio(blob);
      if (uploadRes.data.data) {
        await messagingService.sendMessage({
          conversationId,
          content: '',
          messageType: 'audio',
          replyTo: replyTo?._id,
          attachments: [uploadRes.data.data],
        });
        onClearReply();
        onMessageSent();
      }
    } catch (err: any) {
      toast.error('Failed to send audio');
    } finally {
      setSending(false);
      setShowAudioRecorder(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setPendingImages((prev) => [...prev, ...newImages]);
    e.target.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  if (showAudioRecorder) {
    return (
      <div className="px-4 py-3 border-t border-white/5">
        <AudioRecorder
          onSend={handleAudioSend}
          onCancel={() => setShowAudioRecorder(false)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-white/5">
      {/* Reply preview */}
      {replyTo && (
        <ReplyPreview replyTo={replyTo} onClear={onClearReply} isComposer />
      )}

      {/* Editing indicator */}
      {editingMessage && (
        <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/10 rounded-lg px-3 py-2 mb-2">
          <span>✏️ Editing message</span>
          <button onClick={() => { onClearEdit(); setText(''); }} className="ml-auto text-white/30 hover:text-white/60">✕</button>
        </div>
      )}

      {/* Pending images preview */}
      {pendingImages.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {pendingImages.map((img, i) => (
            <ImagePreview
              key={i}
              src={img.preview}
              isSendPreview
              onRemove={() => {
                URL.revokeObjectURL(img.preview);
                setPendingImages((prev) => prev.filter((_, j) => j !== i));
              }}
            />
          ))}
        </div>
      )}

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {pendingFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">
              📎 {f.name}
              <button
                onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                className="text-white/30 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer bar */}
      <div className="flex items-end gap-2">
        {/* Attachment buttons */}
        <div className="flex items-center gap-1 mb-1">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] hover:bg-white/10 hover:border-white/15 text-white/40 hover:text-white/70 flex items-center justify-center transition-all text-sm"
            title="Image"
          >
            📷
          </button>
          <button
            onClick={() => setShowAudioRecorder(true)}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] hover:bg-white/10 hover:border-white/15 text-white/40 hover:text-white/70 flex items-center justify-center transition-all text-sm"
            title="Voice message"
          >
            🎙️
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] hover:bg-white/10 hover:border-white/15 text-white/40 hover:text-white/70 flex items-center justify-center transition-all text-sm"
            title="File"
          >
            📎
          </button>
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all text-sm ${
                showEmoji
                  ? 'bg-[#4f63ff]/20 border-[#4f63ff]/30 text-white/80'
                  : 'bg-white/5 border-white/[0.06] hover:bg-white/10 hover:border-white/15 text-white/40 hover:text-white/70'
              }`}
              title="Emoji"
            >
              😊
            </button>
            {showEmoji && (
              <EmojiPicker
                onSelect={(emoji) => {
                  handleEmojiSelect(emoji);
                  setShowEmoji(false);
                }}
                onClose={() => setShowEmoji(false)}
              />
            )}
          </div>
        </div>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/[0.08] text-white/90 outline-none focus:border-[#4f63ff]/40 resize-none placeholder:text-white/20 min-h-[40px] max-h-[120px]"
          style={{ scrollbarWidth: 'thin' }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && pendingImages.length === 0 && pendingFiles.length === 0 && !editingMessage)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm transition-all disabled:opacity-30 mb-0.5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f63ff, #7c3aed)' }}
        >
          {sending ? '…' : editingMessage ? '✓' : '➤'}
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpg,image/jpeg,image/gif"
        multiple
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.doc,.ppt"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
