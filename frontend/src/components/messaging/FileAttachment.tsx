import React from 'react';
import { MsgAttachment } from '../../types/messaging.types';

const ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'application/msword': '📝',
  'application/vnd.ms-powerpoint': '📊',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileAttachment: React.FC<{ attachment: MsgAttachment }> = ({ attachment }) => {
  const icon = ICONS[attachment.fileType] || '📎';
  const ext = attachment.filename.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <a
      href={attachment.url}
      download={attachment.filename}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all group max-w-[280px]"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
        style={{ background: 'linear-gradient(135deg, rgba(79,99,255,0.15), rgba(159,122,234,0.1))' }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-white/80 truncate group-hover:text-white transition-colors">
          {attachment.filename}
        </div>
        <div className="text-[10px] text-white/30 mt-0.5">
          {ext} • {formatFileSize(attachment.fileSize)}
        </div>
      </div>
      <span className="text-white/20 group-hover:text-white/50 transition-colors text-sm flex-shrink-0">⬇</span>
    </a>
  );
};
