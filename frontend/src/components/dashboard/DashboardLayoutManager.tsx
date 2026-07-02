import React, { useState, useEffect } from 'react';
import { preferenceService, UserPreferences } from '../../services/preference.service';
import toast from 'react-hot-toast';

interface DashboardLayoutManagerProps {
  onClose: () => void;
  onSaved: (prefs: UserPreferences) => void;
  currentPrefs: UserPreferences;
}

export const DashboardLayoutManager: React.FC<DashboardLayoutManagerProps> = ({ onClose, onSaved, currentPrefs }) => {
  const [widgets, setWidgets] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentPrefs?.dashboard?.widgets) {
      setWidgets(JSON.parse(JSON.stringify(currentPrefs.dashboard.widgets)));
    }
  }, [currentPrefs]);

  const handleToggleVisibility = (idx: number) => {
    setWidgets(prev => {
      const copy = [...prev];
      copy[idx].visible = !copy[idx].visible;
      return copy;
    });
  };

  const handleTogglePin = (idx: number) => {
    setWidgets(prev => {
      const copy = [...prev];
      copy[idx].isPinned = !copy[idx].isPinned;
      return copy;
    });
  };

  const handleToggleCollapse = (idx: number) => {
    setWidgets(prev => {
      const copy = [...prev];
      copy[idx].isCollapsed = !copy[idx].isCollapsed;
      return copy;
    });
  };

  const handleSizeChange = (idx: number, size: string) => {
    setWidgets(prev => {
      const copy = [...prev];
      copy[idx].gridSpan = size;
      return copy;
    });
  };

  const handleHeightChange = (idx: number, height: string) => {
    setWidgets(prev => {
      const copy = [...prev];
      copy[idx].height = height;
      return copy;
    });
  };

  const handleMove = (idx: number, direction: 'up' | 'down') => {
    setWidgets(prev => {
      const copy = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;

      // Swap
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await preferenceService.update({
        dashboard: { widgets },
      });
      onSaved(updated);
      toast.success('Dashboard layout updated!');
      onClose();
    } catch {
      toast.error('Failed to save dashboard layout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border p-5 flex flex-col max-h-[90vh]"
        style={{
          background: '#151722',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">🎛️ Customize Dashboard Layout</h3>
            <p className="text-[10px] text-white/40 mt-0.5">Toggle visibility, pinning, heights, column widths, or layout positioning</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xs">✕</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1" style={{ scrollbarWidth: 'thin' }}>
          {widgets.map((w, idx) => (
            <div
              key={w.id}
              className="flex flex-col gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs"
            >
              {/* Row 1: Visibility, Pin, Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={w.visible}
                    onChange={() => handleToggleVisibility(idx)}
                    className="w-4 h-4 cursor-pointer"
                    title="Toggle Visibility"
                  />
                  <span className={`font-bold ${w.visible ? 'text-white' : 'text-white/30 line-through'}`}>{w.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePin(idx)}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold ${w.isPinned ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-white/40 border border-white/5'}`}
                  >
                    {w.isPinned ? '📌 PINNED' : 'PIN'}
                  </button>
                  <button
                    onClick={() => handleToggleCollapse(idx)}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold ${w.isCollapsed ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-white/40 border border-white/5'}`}
                  >
                    {w.isCollapsed ? 'COLLAPSED' : 'EXPANDED'}
                  </button>
                </div>
              </div>

              {/* Row 2: Layout size/dimension controls */}
              <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px]">
                <div className="flex items-center gap-3">
                  {/* Column span */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40">Width:</span>
                    <select
                      value={w.gridSpan}
                      onChange={e => handleSizeChange(idx, e.target.value)}
                      disabled={!w.visible}
                      className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] outline-none text-white/80 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <option value="col-span-1">Narrow (1 col)</option>
                      <option value="col-span-2">Medium (2 cols)</option>
                      <option value="col-span-3">Wide (3 cols)</option>
                      <option value="col-span-4">Full width (4 cols)</option>
                    </select>
                  </div>

                  {/* Height */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40">Height:</span>
                    <select
                      value={w.height || 'auto'}
                      onChange={e => handleHeightChange(idx, e.target.value)}
                      disabled={!w.visible}
                      className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] outline-none text-white/80 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <option value="auto">Auto</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>

                {/* Move Actions */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'up')}
                    className="p-1 rounded bg-white/5 border border-white/5 disabled:opacity-20 text-[9px]"
                  >
                    ▲
                  </button>
                  <button
                    disabled={idx === widgets.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="p-1 rounded bg-white/5 border border-white/5 disabled:opacity-20 text-[9px]"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 justify-end border-t border-white/5 pt-4 mt-4">
          <button
            onClick={onClose}
            className="border border-white/10 text-white/70 bg-white/5 rounded-xl px-4 py-2 text-xs font-semibold hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-2 px-5 text-xs font-bold"
          >
            {saving ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
      </div>
    </div>
  );
};
