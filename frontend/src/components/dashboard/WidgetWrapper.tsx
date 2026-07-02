import React, { useState } from 'react';

interface WidgetMetadata {
  id: string;
  title: string;
  visible: boolean;
  gridSpan: string;
  isPinned?: boolean;
  isCollapsed?: boolean;
  height?: string;
}

interface WidgetWrapperProps {
  widget: WidgetMetadata;
  onUpdate: (updates: Partial<WidgetMetadata>) => void;
  onRefresh?: () => void;
  dragIndex: number;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onTouchStart: (e: React.TouchEvent, index: number) => void;
  onTouchMove: (e: React.TouchEvent, index: number) => void;
  onTouchEnd: (e: React.TouchEvent, index: number) => void;
  children: React.ReactNode;
}

export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  widget,
  onUpdate,
  onRefresh,
  dragIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  children,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showResizeMenu, setShowResizeMenu] = useState(false);

  // Height mappings to Tailwind classes
  const heightClasses: Record<string, string> = {
    small: 'max-h-[160px] overflow-y-auto',
    medium: 'max-h-[280px] overflow-y-auto',
    large: 'max-h-[440px] overflow-y-auto',
    auto: 'h-auto',
  };

  const currentHeightClass = heightClasses[widget.height || 'auto'];

  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleTogglePin = () => {
    onUpdate({ isPinned: !widget.isPinned });
  };

  const handleToggleCollapse = () => {
    onUpdate({ isCollapsed: !widget.isCollapsed });
  };

  const handleHide = () => {
    onUpdate({ visible: false });
  };

  const handleWidthChange = (span: string) => {
    onUpdate({ gridSpan: span });
    setShowResizeMenu(false);
  };

  const handleHeightChange = (height: string) => {
    onUpdate({ height });
    setShowResizeMenu(false);
  };

  const wrapperClass = isFullScreen
    ? 'fixed inset-4 z-[9999] bg-[#141620] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col'
    : 'glass-card border border-white/5 shadow-md flex flex-col transition-all duration-300 relative';

  return (
    <div
      className={wrapperClass}
      draggable={!isFullScreen}
      onDragStart={(e) => onDragStart(e, dragIndex)}
      onDragOver={(e) => onDragOver(e, dragIndex)}
      onDrop={(e) => onDrop(e, dragIndex)}
      style={isFullScreen ? { backdropFilter: 'blur(20px)' } : {}}
    >
      {/* Drag & Handle Header */}
      <div
        className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 cursor-grab select-none active:cursor-grabbing px-1"
        onTouchStart={(e) => onTouchStart(e, dragIndex)}
        onTouchMove={(e) => onTouchMove(e, dragIndex)}
        onTouchEnd={(e) => onTouchEnd(e, dragIndex)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white/20 text-[10px] cursor-grab">⋮⋮</span>
          <span className="text-xs font-bold text-white/90 truncate flex items-center gap-1">
            {widget.isPinned && <span className="text-indigo-400">📌</span>}
            {widget.title}
          </span>
        </div>

        {/* Action icons bar */}
        <div className="flex items-center gap-1.5 flex-shrink-0 text-white/40">
          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={handleRefreshClick}
              className="p-1 rounded hover:bg-white/5 hover:text-white transition-all text-[10px]"
              title="Refresh widget data"
            >
              🔄
            </button>
          )}

          {/* Pin */}
          <button
            onClick={handleTogglePin}
            className={`p-1 rounded hover:bg-white/5 transition-all text-[10px] ${widget.isPinned ? 'text-indigo-400 bg-indigo-500/10' : 'hover:text-white'}`}
            title={widget.isPinned ? 'Unpin widget' : 'Pin widget to top'}
          >
            📌
          </button>

          {/* Collapse */}
          <button
            onClick={handleToggleCollapse}
            className="p-1 rounded hover:bg-white/5 hover:text-white transition-all text-[10px]"
            title={widget.isCollapsed ? 'Expand body content' : 'Collapse body content'}
          >
            {widget.isCollapsed ? '➕' : '➖'}
          </button>

          {/* Resize options menu */}
          <div className="relative">
            <button
              onClick={() => setShowResizeMenu(!showResizeMenu)}
              className="p-1 rounded hover:bg-white/5 hover:text-white transition-all text-[10px]"
              title="Adjust dimensions"
            >
              📐
            </button>

            {showResizeMenu && (
              <div className="absolute right-0 top-6 z-[100] w-36 bg-[#1a1d27] border border-white/10 rounded-xl p-2 shadow-xl space-y-1.5 text-[10px]">
                <div>
                  <span className="text-white/30 block mb-1 font-bold uppercase tracking-wider text-[8px] px-1">Col Width</span>
                  {['col-span-1', 'col-span-2', 'col-span-3', 'col-span-4'].map(span => (
                    <button
                      key={span}
                      onClick={() => handleWidthChange(span)}
                      className={`w-full text-left px-1.5 py-1 rounded hover:bg-white/5 ${widget.gridSpan === span ? 'text-indigo-400 font-bold' : 'text-white/70'}`}
                    >
                      {span === 'col-span-1' ? 'Narrow (1/4)' : span === 'col-span-2' ? 'Medium (2/4)' : span === 'col-span-3' ? 'Wide (3/4)' : 'Full width'}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/5 pt-1.5 mt-1.5">
                  <span className="text-white/30 block mb-1 font-bold uppercase tracking-wider text-[8px] px-1">Height Max</span>
                  {['auto', 'small', 'medium', 'large'].map(h => (
                    <button
                      key={h}
                      onClick={() => handleHeightChange(h)}
                      className={`w-full text-left px-1.5 py-1 rounded hover:bg-white/5 ${widget.height === h ? 'text-indigo-400 font-bold' : 'text-white/70'}`}
                    >
                      {h.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Full Screen */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1 rounded hover:bg-white/5 hover:text-white transition-all text-[10px]"
            title={isFullScreen ? 'Minimize view' : 'Maximize to full screen'}
          >
            {isFullScreen ? '🗗' : '🗖'}
          </button>

          {/* Hide */}
          <button
            onClick={handleHide}
            className="p-1 rounded hover:bg-white/5 hover:text-red-400 transition-all text-[10px]"
            title="Hide widget from dashboard"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Widget Body Content */}
      <div className={`w-full flex-1 ${widget.isCollapsed ? 'hidden' : ''} ${currentHeightClass}`}>
        {children}
      </div>
    </div>
  );
};
