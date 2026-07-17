import React from 'react';

export const TypingIndicator: React.FC<{ names: string[] }> = ({ names }) => {
  if (names.length === 0) return null;

  const text = names.length === 1
    ? `${names[0]} is typing`
    : `${names.join(', ')} are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-white/50 animate-pulse">
      <div className="flex gap-1">
        <span className="typing-dot" style={{ width: 5, height: 5, background: '#8b94e0' }} />
        <span className="typing-dot" style={{ width: 5, height: 5, background: '#8b94e0', animationDelay: '0.2s' }} />
        <span className="typing-dot" style={{ width: 5, height: 5, background: '#8b94e0', animationDelay: '0.4s' }} />
      </div>
      <span className="italic">{text}…</span>
    </div>
  );
};
