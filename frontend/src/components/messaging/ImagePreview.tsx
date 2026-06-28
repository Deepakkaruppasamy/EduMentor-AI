import React, { useState } from 'react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  className?: string;
  isSendPreview?: boolean;
  onRemove?: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt = 'Image', className = '', isSendPreview, onRemove }) => {
  const [lightbox, setLightbox] = useState(false);

  if (isSendPreview) {
    return (
      <div className="relative inline-block">
        <img
          src={src}
          alt={alt}
          className="max-w-[200px] max-h-[150px] rounded-lg border border-white/10 object-cover"
        />
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/90 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`max-w-[280px] max-h-[200px] rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity object-cover ${className}`}
        onClick={() => setLightbox(true)}
      />
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <a
                href={src}
                download
                onClick={(e) => e.stopPropagation()}
                className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                title="Download"
              >
                ⬇
              </a>
              <button
                onClick={() => setLightbox(false)}
                className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
