import React, { useEffect, useRef, useState } from 'react';
import { useContextualAction } from '../context/ContextualActionContext';
import { ACTION_REGISTRY } from '../config/actionRegistry';
import { useAuthStore } from '../../../store/auth.store';
import { ActionId } from '../types';


export const ContextualActionToolbar: React.FC = () => {
  const {
    selection,
    metadata,
    isToolbarOpen,
    closeToolbar,
    setActiveAction,
    openResult,
  } = useContextualAction();

  const { user } = useAuthStore();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [showMore, setShowMore] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Filter actions based on role and current module context
  const filteredActions = ACTION_REGISTRY.filter((action) => {
    if (action.allowedRoles && user && !action.allowedRoles.includes(user.role)) {
      return false;
    }
    if (action.allowedModules && metadata && !action.allowedModules.includes(metadata.module)) {
      return false;
    }
    return true;
  });

  // Sort and split into primary & secondary actions
  const sortedActions = [...filteredActions].sort((a, b) => a.mobilePriority - b.mobilePriority);

  // Mobile gets 2 primary + More; Desktop gets 4 primary + More
  const isMobile = window.innerWidth < 640;
  const primaryCount = isMobile ? 2 : 4;
  const primaryActions = sortedActions.slice(0, primaryCount);
  const secondaryActions = sortedActions.slice(primaryCount);

  // Position calculation
  useEffect(() => {
    if (!selection?.rect || !isToolbarOpen) return;

    const calculatePosition = () => {
      const tb = toolbarRef.current;
      if (!tb) return;

      const tbWidth = tb.offsetWidth || 320;
      const tbHeight = tb.offsetHeight || 44;
      const gap = 8;

      let top = selection.rect!.top - tbHeight - gap;
      let left = selection.rect!.left + (selection.rect!.width - tbWidth) / 2;

      // Vertical overflow checks
      if (top < 12) {
        // Place below selection instead
        top = selection.rect!.bottom + gap;
      }

      // If still overflowing bottom, center
      if (top + tbHeight > window.innerHeight - 12) {
        top = (window.innerHeight - tbHeight) / 2;
      }

      // Horizontal overflow clamps
      left = Math.max(12, Math.min(left, window.innerWidth - tbWidth - 12));

      setCoords({ top, left });
    };

    calculatePosition();

    // Use requestAnimationFrame for smooth repositioning
    let frameId: number;
    const onReposition = () => {
      frameId = requestAnimationFrame(calculatePosition);
    };

    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [selection, isToolbarOpen, showMore]);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isToolbarOpen) return;

      const totalItems = primaryActions.length + (secondaryActions.length > 0 ? 1 : 0);

      if (e.key === 'Escape') {
        e.preventDefault();
        closeToolbar();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < primaryActions.length) {
          handleActionClick(primaryActions[focusedIndex].id);
        } else if (focusedIndex === primaryActions.length && secondaryActions.length > 0) {
          setShowMore((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isToolbarOpen, focusedIndex, primaryActions, secondaryActions]);

  // Global Keyboard Shortcuts (Ctrl/Cmd + Shift + E/Q)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      if (!selection?.text) return;

      if (isCtrl && isShift && e.key.toUpperCase() === 'E') {
        e.preventDefault();
        handleActionClick('explain');
      } else if (isCtrl && isShift && e.key.toUpperCase() === 'Q') {
        e.preventDefault();
        handleActionClick('generate-quiz');
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [selection]);

  const handleActionClick = (actionId: ActionId) => {
    setActiveAction(actionId);
    closeToolbar();
    openResult();
  };

  if (!isToolbarOpen || !selection) return null;

  return (
    <div
      ref={toolbarRef}
      id="contextual-action-toolbar"
      className="fixed z-[99990] flex flex-col rounded-xl overflow-visible border shadow-2xl transition-all duration-150"
      style={{
        top: coords.top,
        left: coords.left,
        background: 'linear-gradient(135deg, rgba(26,29,39,0.96) 0%, rgba(15,17,25,0.98) 100%)',
        borderColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        padding: '5px',
      }}
    >
      <div className="flex items-center gap-1">
        {primaryActions.map((action, idx) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white/80 hover:text-white hover:bg-white/8 transition-all h-[36px] min-w-[70px] justify-center ${
              focusedIndex === idx ? 'bg-white/10 ring-1 ring-indigo-500' : ''
            }`}
            title={action.description}
          >
            <span>{action.icon}</span>
            <span>{action.shortLabel}</span>
          </button>
        ))}

        {secondaryActions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMore((prev) => !prev)}
              className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold text-white/50 hover:text-white hover:bg-white/8 transition-all h-[36px] min-w-[36px] ${
                focusedIndex === primaryActions.length ? 'bg-white/10 ring-1 ring-indigo-500' : ''
              }`}
            >
              <span>⋯</span>
            </button>

            {showMore && (
              <div
                className="absolute bottom-full mb-2 right-0 w-[200px] rounded-xl border p-1 shadow-2xl flex flex-col gap-0.5"
                style={{
                  background: '#151722',
                  borderColor: 'rgba(255,255,255,0.08)',
                  animation: 'toolbarMoreIn 0.2s cubic-bezier(0.34,1.1,0.64,1)',
                }}
              >
                {secondaryActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.id)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes toolbarMoreIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};
