import React from 'react';

interface OnlineStatusProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({ isOnline, size = 'sm', className = '' }) => {
  const sizeMap = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' };

  return (
    <span
      className={`inline-block rounded-full border-2 border-[#0a0b0f] ${sizeMap[size]} ${className}`}
      style={{
        background: isOnline
          ? 'linear-gradient(135deg, #48bb78, #38a169)'
          : 'rgba(255,255,255,0.2)',
        boxShadow: isOnline ? '0 0 6px rgba(72,187,120,0.5)' : 'none',
      }}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
};
