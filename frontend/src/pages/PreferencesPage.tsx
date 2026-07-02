import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { preferenceService, UserPreferences } from '../services/preference.service';
import { useThemeStore } from '../store/theme.store';
import toast from 'react-hot-toast';

export const PreferencesPage: React.FC = () => {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setTheme } = useThemeStore();

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const data = await preferenceService.get();
      setPrefs(data);
    } catch {
      toast.error('Failed to load user preferences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const applyPreferencesToDOM = (preferences: UserPreferences) => {
    const root = document.documentElement;

    // 1. Theme
    const t = preferences.general.theme;
    if (t === 'light') {
      root.classList.add('light');
      setTheme('light');
    } else if (t === 'dark') {
      root.classList.remove('light');
      setTheme('dark');
    } else if (t === 'system') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemIsDark) {
        root.classList.remove('light');
        setTheme('dark');
      } else {
        root.classList.add('light');
        setTheme('light');
      }
    }

    // 2. Font Size
    const fs = preferences.general.fontSize;
    if (fs === 'small') {
      root.style.fontSize = '14px';
    } else if (fs === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }

    // 3. Accessibility modes
    const acc = preferences.accessibility;
    
    // High contrast
    if (acc.highContrastMode) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (acc.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Keyboard navigation
    if (acc.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }

    // Colorblind friendly
    if (acc.colorBlindFriendlyMode) {
      root.classList.add('colorblind-friendly');
    } else {
      root.classList.remove('colorblind-friendly');
    }
  };

  const handleSave = async (updatedPrefs: Partial<UserPreferences>) => {
    if (!prefs) return;
    setSaving(true);
    try {
      const merged = { ...prefs, ...updatedPrefs } as UserPreferences;
      const data = await preferenceService.update(updatedPrefs);
      setPrefs(data);
      applyPreferencesToDOM(data);
      toast.success('Preferences updated successfully!');
    } catch {
      toast.error('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetLayout = async () => {
    if (!window.confirm('Reset dashboard layout widgets to their default structure?')) return;
    setSaving(true);
    try {
      const data = await preferenceService.resetDashboard();
      setPrefs(data);
      toast.success('Dashboard layout widgets reset to default.');
    } catch {
      toast.error('Failed to reset dashboard layout.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <div className="p-6 text-center text-white/50 text-sm">
        Analyzing preference profiles...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fadeIn text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">⚙️ User Preference Center</h1>
          <p className="mt-1 text-xs text-white/40">Personalize language, appearance, notification channels, accessibility controls, and custom layouts</p>
        </div>
        <button
          onClick={handleResetLayout}
          disabled={saving}
          className="btn-primary self-start py-2 px-4 text-xs font-semibold"
        >
          🔄 Reset Dashboard Widgets
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Preferences */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-bold border-b border-white/5 pb-2">🌍 General Experience</h2>
          
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Preferred Language</label>
              <select
                value={prefs.general.language}
                onChange={e => handleSave({ general: { ...prefs.general, language: e.target.value } })}
                className="input-field cursor-pointer text-xs"
              >
                {['English', 'Tamil', 'Hindi', 'German', 'French'].map(lang => (
                  <option key={lang} value={lang} className="bg-[#1a1d27]">{lang}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Theme Mode</label>
              <select
                value={prefs.general.theme}
                onChange={e => handleSave({ general: { ...prefs.general, theme: e.target.value as any } })}
                className="input-field cursor-pointer text-xs"
              >
                <option value="light" className="bg-[#1a1d27]">Light Theme</option>
                <option value="dark" className="bg-[#1a1d27]">Dark Theme</option>
                <option value="system" className="bg-[#1a1d27]">System Sync</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Global Font Size</label>
              <select
                value={prefs.general.fontSize}
                onChange={e => handleSave({ general: { ...prefs.general, fontSize: e.target.value as any } })}
                className="input-field cursor-pointer text-xs"
              >
                <option value="small" className="bg-[#1a1d27]">Small text (14px)</option>
                <option value="medium" className="bg-[#1a1d27]">Medium standard (16px)</option>
                <option value="large" className="bg-[#1a1d27]">Large text (18px)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Default Dashboard Landing Page</label>
              <select
                value={prefs.general.defaultLandingPage}
                onChange={e => handleSave({ general: { ...prefs.general, defaultLandingPage: e.target.value } })}
                className="input-field cursor-pointer text-xs"
              >
                <option value="dashboard" className="bg-[#1a1d27]">Study Dashboard</option>
                <option value="chat" className="bg-[#1a1d27]">AI Tutor Chat</option>
                <option value="courses" className="bg-[#1a1d27]">My Enrolled Courses</option>
                <option value="profile" className="bg-[#1a1d27]">Profile Settings</option>
              </select>
            </div>

            <div className="pt-2 border-t border-white/5 mt-2">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div>
                  <span className="text-xs font-bold block text-white/95">⌨️ Keyboard Shortcuts</span>
                  <span className="text-[10px] text-white/40 mt-0.5 block">Enable global navigation hotkeys</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.general.shortcutsEnabled !== false}
                  onChange={e => handleSave({ general: { ...prefs.general, shortcutsEnabled: e.target.checked } })}
                  className="w-4.5 h-4.5 cursor-pointer mt-1"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Accessibility Panel */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-bold border-b border-white/5 pb-2">♿ Accessibility Mode</h2>
          
          <div className="space-y-2">
            {[
              { id: 'highContrastMode', label: '🔲 High Contrast Mode', desc: 'Higher text color contrast for visibility' },
              { id: 'largeText', label: '🔍 Large Text Mode', desc: 'Increases standard app font size base' },
              { id: 'reducedMotion', label: '📉 Reduced Motion Mode', desc: 'Minimize transitions and structural animations' },
              { id: 'keyboardNavigation', label: '⌨️ Screen Focus Rings', desc: 'Enhanced outline focus borders for keyboard navigate' },
              { id: 'colorBlindFriendlyMode', label: '🎨 Colorblind Palette Shift', desc: 'Adapts UI alert colors (green, red, yellow) for colorblindness' },
            ].map(item => (
              <label
                key={item.id}
                className="flex items-start justify-between bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl p-3.5 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={!!(prefs.accessibility as any)[item.id]}
                  onChange={e => {
                    const nextAccess = { ...prefs.accessibility, [item.id]: e.target.checked };
                    // If large text selected, also sync with font size large
                    if (item.id === 'largeText') {
                      handleSave({
                        accessibility: nextAccess,
                        general: { ...prefs.general, fontSize: e.target.checked ? 'large' : 'medium' }
                      });
                    } else {
                      handleSave({ accessibility: nextAccess });
                    }
                  }}
                  className="w-4 h-4 cursor-pointer mt-1"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-bold border-b border-white/5 pb-2">🔔 Fine-Grained Notification Channels</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-[10px] uppercase font-bold">
                <th className="pb-3">Notification Alert Scope</th>
                <th className="pb-3 text-center">Browser Push</th>
                <th className="pb-3 text-center">In-App Banner</th>
                <th className="pb-3 text-center">Email Inbox</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {[
                { id: 'announcements', label: '📣 Course Announcements' },
                { id: 'assignmentDeadlines', label: '📋 Assignment Deadlines' },
                { id: 'quizNotifications', label: '📝 Quizzes & Competitions' },
                { id: 'meetingReminders', label: '🏫 Appointments & Consults' },
                { id: 'calendarEvents', label: '📆 Academic Calendar Shifts' },
                { id: 'facultyReplies', label: '👨‍🏫 Instructor Thread Replies' },
                { id: 'studentMessages', label: '✉️ Peer Direct messages' },
                { id: 'aiRecommendations', label: '🎯 AI Smart Recommendations' },
                { id: 'supportTickets', label: '🛠️ Support Ticket Updates' },
                { id: 'researchAssistantCompletion', label: '🔬 Research Paper Index Runs' },
              ].map(row => {
                const val = prefs.notifications[row.id] || { browser: false, inApp: false, email: false };
                return (
                  <tr key={row.id}>
                    <td className="py-3 font-semibold text-white/90">{row.label}</td>
                    {['browser', 'inApp', 'email'].map(col => (
                      <td key={col} className="py-3 text-center">
                        <input
                          type="checkbox"
                          checked={(val as any)[col]}
                          onChange={e => {
                            const nextNotif = {
                              ...prefs.notifications,
                              [row.id]: { ...val, [col]: e.target.checked }
                            };
                            handleSave({ notifications: nextNotif });
                          }}
                          className="w-4.5 h-4.5 cursor-pointer align-middle"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Preferences */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-bold border-b border-white/5 pb-2">📬 Email Digests & Frequency</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { id: 'weeklySummary', label: '📊 Weekly Performance Summary', desc: 'Earned XP, ranks, strengths' },
            { id: 'dailyDigest', label: '📅 Daily Agenda Digest', desc: 'Today\'s tasks, meetings' },
            { id: 'assignmentReminderEmails', label: '📋 Assignment Due Alerts', desc: 'Upcoming deadline warnings' },
            { id: 'announcementEmails', label: '📣 Announcements Transcripts', desc: 'Direct copy of all faculty posts' },
            { id: 'aiRecommendationEmails', label: '🎯 AI Revision Recommendations', desc: 'Custom revision plans & files' },
            { id: 'securityAlerts', label: '🛡️ Device Login Failure Alerts', desc: 'Crucial account logins audit notifications' },
            { id: 'meetingReminderEmails', label: '🏫 Consultation Confirmations', desc: 'Approved slots reminders' },
          ].map(item => (
            <label
              key={item.id}
              className="flex items-start justify-between bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl p-3.5 cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold block text-white/90">{item.label}</span>
                <span className="text-[10px] text-white/40 mt-1 block">{item.desc}</span>
              </div>
              <input
                type="checkbox"
                checked={!!prefs.email[item.id]}
                onChange={e => {
                  const nextEmail = { ...prefs.email, [item.id]: e.target.checked };
                  handleSave({ email: nextEmail });
                }}
                className="w-4 h-4 cursor-pointer mt-0.5 ml-2"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
