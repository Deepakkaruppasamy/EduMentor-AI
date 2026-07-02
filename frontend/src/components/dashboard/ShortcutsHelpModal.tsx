import React from 'react';

interface ShortcutsHelpModalProps {
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ onClose }) => {
  const categories = [
    {
      title: '🤖 AI & Productivity Tools',
      items: [
        { keys: ['Ctrl', 'Shift', 'N'], desc: 'Open AI Notes Generator' },
        { keys: ['Ctrl', 'Shift', 'Q'], desc: 'Open Quiz Generator' },
        { keys: ['Ctrl', 'Shift', 'A'], desc: 'Open AI Tutor' },
        { keys: ['Ctrl', 'Shift', 'R'], desc: 'Open AI Research Assistant' },
        { keys: ['Ctrl', 'Shift', 'S'], desc: 'Open AI Study Planner' },
        { keys: ['Ctrl', '/'], desc: 'Toggle AI Learning Widget' },
        { keys: ['Ctrl', 'Shift', 'G'], desc: 'Generate AI Notes from current page context' },
      ],
    },
    {
      title: '🧭 Navigation & Views',
      items: [
        { keys: ['Ctrl', 'Shift', 'D'], desc: 'Open Dashboard' },
        { keys: ['Ctrl', 'Shift', 'P'], desc: 'Open User Profile' },
        { keys: ['Ctrl', 'Shift', 'C'], desc: 'Open Calendar' },
        { keys: ['Ctrl', 'Shift', 'B'], desc: 'Open Bookmarks & Favorites' },
        { keys: ['Ctrl', 'Shift', 'H'], desc: 'Open Recently Viewed History' },
        { keys: ['Ctrl', 'Shift', 'T'], desc: 'Open Activity Feed Timeline' },
      ],
    },
    {
      title: '🔍 Global Actions',
      items: [
        { keys: ['Ctrl', 'K'], desc: 'Open AI Command Palette' },
        { keys: ['Ctrl', 'Shift', 'F'], desc: 'Global search and navigation' },
        { keys: ['Ctrl', 'Shift', 'U'], desc: 'Open Support Center' },
        { keys: ['Esc'], desc: 'Close any active modal, dialog, or drawer' },
        { keys: ['?'], desc: 'Show this Keyboard Shortcuts help reference' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      style={{ zIndex: 10000 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border p-5 flex flex-col max-h-[85vh] text-white"
        style={{
          background: '#151722',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <span>⌨️</span> Keyboard Shortcuts Reference
            </h3>
            <p className="text-[10px] text-white/40 mt-0.5">Speed up your learning flow using these application-wide shortcuts</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xs">✕</button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1" style={{ scrollbarWidth: 'thin' }}>
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 font-mono px-1">
                {cat.title}
              </h4>
              <div className="grid gap-2">
                {cat.items.map((item, keyIdx) => (
                  <div
                    key={keyIdx}
                    className="flex items-center justify-between gap-4 p-2 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl text-xs"
                  >
                    <span className="text-white/70 leading-relaxed font-medium">{item.desc}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          {kIdx > 0 && <span className="text-white/30 text-[9px]">+</span>}
                          <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white font-mono text-[9px] shadow-sm uppercase">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="border-t border-white/5 pt-3 mt-4 text-center text-[9px] text-white/35 font-mono uppercase tracking-wider">
          Press <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/5 text-white/70">Esc</kbd> or click outside to dismiss this reference.
        </div>
      </div>
    </div>
  );
};
