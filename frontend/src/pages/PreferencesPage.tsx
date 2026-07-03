import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { preferenceService, UserPreferences } from '../services/preference.service';
import { privacyService } from '../services/privacy.service';
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

            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Time Zone</label>
              <select
                value={prefs.general.timezone || 'Asia/Kolkata'}
                onChange={e => handleSave({ general: { ...prefs.general, timezone: e.target.value } })}
                className="input-field cursor-pointer text-xs"
              >
                <option value="Asia/Kolkata" className="bg-[#1a1d27]">Asia/Kolkata (IST)</option>
                <option value="UTC" className="bg-[#1a1d27]">Coordinated Universal Time (UTC)</option>
                <option value="US/Eastern" className="bg-[#1a1d27]">US/Eastern (EST/EDT)</option>
                <option value="Europe/London" className="bg-[#1a1d27]">Europe/London (GMT/BST)</option>
                <option value="Asia/Tokyo" className="bg-[#1a1d27]">Asia/Tokyo (JST)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Date &amp; Time Format</label>
              <select
                value={prefs.general.dateFormat || 'YYYY-MM-DD'}
                onChange={e => handleSave({ general: { ...prefs.general, dateFormat: e.target.value } })}
                className="input-field cursor-pointer text-xs"
              >
                <option value="YYYY-MM-DD" className="bg-[#1a1d27]">YYYY-MM-DD (2026-07-03)</option>
                <option value="DD-MM-YYYY" className="bg-[#1a1d27]">DD-MM-YYYY (03-07-2026)</option>
                <option value="MM/DD/YYYY" className="bg-[#1a1d27]">MM/DD/YYYY (07/03/2026)</option>
                <option value="MMM DD, YYYY" className="bg-[#1a1d27]">MMM DD, YYYY (Jul 03, 2026)</option>
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
              { id: 'screenReaderSupport', label: '🗣️ Screen Reader Assist', desc: 'Optimizes Aria layout regions and text announcements' },
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

      {/* Privacy Settings Panel */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-bold border-b border-white/5 pb-2">🔒 Privacy &amp; Data Security Settings</h2>
        
        <div className="grid gap-5 md:grid-cols-2">
          {/* Settings Fields */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Profile Visibility</label>
              <select
                value={prefs.privacy.profileVisibility || 'public'}
                onChange={e => handleSave({ privacy: { ...prefs.privacy, profileVisibility: e.target.value as any } })}
                className="input-field cursor-pointer text-xs"
              >
                <option value="public" className="bg-[#1a1d27]">🌐 Public Profile (All students &amp; faculty)</option>
                <option value="contacts" className="bg-[#1a1d27]">👥 Enrolled Course Peers Only</option>
                <option value="private" className="bg-[#1a1d27]">🔒 Private (Only Instructors &amp; Admins)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Direct Message Permissions</label>
              <select
                value={prefs.privacy.messagePermissions || 'everyone'}
                onChange={e => handleSave({ privacy: { ...prefs.privacy, messagePermissions: e.target.value as any } })}
                className="input-field cursor-pointer text-xs"
              >
                <option value="everyone" className="bg-[#1a1d27]">💬 Allow messages from everyone</option>
                <option value="faculty_only" className="bg-[#1a1d27]">👨‍🏫 Allow only from Instructors</option>
                <option value="no_one" className="bg-[#1a1d27]">🚫 Disable direct messaging</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-start justify-between bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl p-3.5 cursor-pointer">
                <div>
                  <span className="text-xs font-bold block text-white/95">🟢 Active Status Visible</span>
                  <span className="text-[10px] text-white/40 mt-0.5 block">Show when you are currently online</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.privacy.onlineStatusVisibility !== false}
                  onChange={e => handleSave({ privacy: { ...prefs.privacy, onlineStatusVisibility: e.target.checked } })}
                  className="w-4 h-4 cursor-pointer mt-1"
                />
              </label>

              <label className="flex items-start justify-between bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl p-3.5 cursor-pointer">
                <div>
                  <span className="text-xs font-bold block text-white/95">📊 Learning Activity Tracker</span>
                  <span className="text-[10px] text-white/40 mt-0.5 block">Log timeline actions for progress analytics</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.privacy.activityVisibility !== false}
                  onChange={e => handleSave({ privacy: { ...prefs.privacy, activityVisibility: e.target.checked } })}
                  className="w-4 h-4 cursor-pointer mt-1"
                />
              </label>

              <label className="flex items-start justify-between bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl p-3.5 cursor-pointer">
                <div>
                  <span className="text-xs font-bold block text-white/95">🤖 AI Personalization</span>
                  <span className="text-[10px] text-white/40 mt-0.5 block">Customize responses using quiz and chat history context</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.privacy.aiPersonalization !== false}
                  onChange={e => handleSave({ privacy: { ...prefs.privacy, aiPersonalization: e.target.checked } })}
                  className="w-4 h-4 cursor-pointer mt-1"
                />
              </label>
            </div>
          </div>

          {/* Cookie & Data Archive Panel */}
          <div className="space-y-4 bg-white/[0.01] border border-white/5 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest">Cookie Consents &amp; Archives</h3>
            
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs">
                <span>Performance &amp; Analytics Cookies</span>
                <input
                  type="checkbox"
                  checked={prefs.privacy.cookiePreferences?.analytics !== false}
                  onChange={e => handleSave({
                    privacy: {
                      ...prefs.privacy,
                      cookiePreferences: { ...prefs.privacy.cookiePreferences, analytics: e.target.checked }
                    }
                  })}
                  className="w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between text-xs">
                <span>Targeted Marketing Cookies</span>
                <input
                  type="checkbox"
                  checked={!!prefs.privacy.cookiePreferences?.marketing}
                  onChange={e => handleSave({
                    privacy: {
                      ...prefs.privacy,
                      cookiePreferences: { ...prefs.privacy.cookiePreferences, marketing: e.target.checked }
                    }
                  })}
                  className="w-4 h-4"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-2.5">
              <h4 className="text-xs font-bold text-white/90">📥 Export Account Data Archive</h4>
              <p className="text-[10px] text-white/40 leading-relaxed">
                Download a JSON structured export containing your courses, active sessions, study notes, quiz scores, and support tickets history.
              </p>
              <button
                onClick={async () => {
                  if (!window.confirm('Request account data export archive? An instructions confirmation prompt will be sent.')) return;
                  try {
                    const res = await privacyService.requestDataDownload();
                    toast.success(res.message || 'Export archive download request queued successfully!');
                  } catch {
                    toast.error('Failed to trigger data archive export.');
                  }
                }}
                className="btn-secondary py-1.5 px-4 text-xs font-bold w-full"
              >
                📥 Request Personal Archive
              </button>
            </div>
          </div>
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
