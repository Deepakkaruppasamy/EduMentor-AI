import React, { useState, useEffect, useRef } from 'react';
import { studyPlannerService } from '../services/studyPlanner.service';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

const PREFERRED_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];
const SUBJECT_COLORS = ['#4f63ff', '#48bb78', '#f6ad55', '#9f7aea', '#fc8181', '#38b2ac', '#ed8936'];

export const StudyPlannerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'plan' | 'history'>('generate');
  const [examDate, setExamDate] = useState('');
  const [subjects, setSubjects] = useState<string[]>(['']);
  const [dailyHours, setDailyHours] = useState(4);
  const [preferredTime, setPreferredTime] = useState('Morning');
  const [generating, setGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const planRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const res = await studyPlannerService.getMyPlans();
      const plans = res.data.data || [];
      setHistory(plans);
      if (plans.length > 0 && !currentPlan) setCurrentPlan(plans[0]);
    } catch {}
  };

  const handleAddSubject = () => setSubjects(prev => [...prev, '']);
  const handleSubjectChange = (i: number, val: string) => setSubjects(prev => prev.map((s, idx) => idx === i ? val : s));
  const handleRemoveSubject = (i: number) => setSubjects(prev => prev.filter((_, idx) => idx !== i));

  const handleGenerate = async () => {
    const validSubjects = subjects.filter(s => s.trim());
    if (!examDate || validSubjects.length === 0) {
      toast.error('Please enter exam date and at least one subject');
      return;
    }
    setGenerating(true);
    try {
      const res = await studyPlannerService.generate({ examDate, subjects: validSubjects, dailyHours, preferredTime });
      const plan = res.data.data;
      setCurrentPlan(plan);
      setHistory(prev => [plan, ...prev]);
      setActiveTab('plan');
      toast.success('AI Study Plan generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally { setGenerating(false); }
  };

  const handleDownloadPDF = () => {
    if (!currentPlan) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('AI Study Plan', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exam Date: ${new Date(currentPlan.examDate).toLocaleDateString()}`, 14, 25);
    doc.text(`Subjects: ${currentPlan.subjects.join(', ')}`, 14, 32);
    doc.text(`Daily Study Hours: ${currentPlan.dailyHours}h`, 14, 39);

    let y = 50;
    currentPlan.generatedPlan.forEach((day: any) => {
      doc.setFontSize(11);
      doc.text(`${day.dayLabel} — ${day.date}`, 14, y);
      y += 6;
      doc.setFontSize(9);
      day.topics.forEach((t: any) => {
        const line = `  • ${t.subject}: ${t.topic} (${t.durationMinutes} min)`;
        doc.text(line, 14, y);
        y += 5;
        if (y > 280) { doc.addPage(); y = 15; }
      });
      y += 3;
    });

    if (currentPlan.examTips?.length) {
      doc.setFontSize(11);
      doc.text('Exam Tips:', 14, y);
      y += 6;
      doc.setFontSize(9);
      currentPlan.examTips.forEach((tip: string) => {
        doc.text(`• ${tip}`, 14, y);
        y += 5;
        if (y > 280) { doc.addPage(); y = 15; }
      });
    }

    doc.save('study-plan.pdf');
  };

  const handleDelete = async (id: string) => {
    try {
      await studyPlannerService.deletePlan(id);
      setHistory(prev => prev.filter(p => p._id !== id));
      if (currentPlan?._id === id) setCurrentPlan(history.find(p => p._id !== id) || null);
      toast.success('Plan deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white/90">🗓️ AI Study Planner</h1>
          <p className="text-xs text-white/40 mt-0.5">Let AI create a personalized study schedule tailored to your exam timeline</p>
        </div>
        <div className="flex gap-2">
          {(['generate', 'plan', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
              style={{ background: activeTab === tab ? 'linear-gradient(135deg,#4f63ff,#7c3aed)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {tab === 'generate' ? '✦ Generate Plan' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="max-w-xl space-y-5">
          <div className="p-6 rounded-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <label className="block text-[10px] text-white/40 mb-1 uppercase font-bold">Exam Date *</label>
              <input type="date" value={examDate} min={new Date().toISOString().split('T')[0]}
                onChange={e => setExamDate(e.target.value)} className="input-field text-xs" />
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-2 uppercase font-bold">Subjects *</label>
              <div className="space-y-2">
                {subjects.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={s} placeholder={`Subject ${i + 1}`}
                      onChange={e => handleSubjectChange(i, e.target.value)} className="input-field text-xs flex-1" />
                    {subjects.length > 1 && (
                      <button onClick={() => handleRemoveSubject(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#fc8181] text-xs"
                        style={{ background: 'rgba(252,129,129,0.08)' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleAddSubject} className="mt-2 text-xs text-[#7c8fff] hover:underline">+ Add Subject</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-white/40 mb-1 uppercase font-bold">Daily Study Hours</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={1} max={12} value={dailyHours} onChange={e => setDailyHours(Number(e.target.value))} className="flex-1 accent-[#4f63ff]" />
                  <span className="text-xs font-bold text-white/80 w-8 text-right">{dailyHours}h</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1 uppercase font-bold">Preferred Study Time</label>
                <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)} className="input-field text-xs">
                  {PREFERRED_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg,#4f63ff,#7c3aed)' }}>
              {generating ? '🤖 AI is building your study plan…' : '✦ Generate AI Study Plan'}
            </button>
          </div>
        </div>
      )}

      {/* Current Plan Tab */}
      {activeTab === 'plan' && currentPlan && (
        <div className="space-y-4" ref={planRef}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-white/40">Exam: <span className="text-white/70 font-semibold">{new Date(currentPlan.examDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
              <div className="flex flex-wrap gap-2 mt-1">
                {currentPlan.subjects.map((s: string, i: number) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}20`, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}>{s}</span>
                ))}
              </div>
            </div>
            <button onClick={handleDownloadPDF} className="btn-primary text-xs px-4 py-2">📥 Download PDF</button>
          </div>

          {/* Daily Schedule Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPlan.generatedPlan.map((day: any, di: number) => (
              <div key={di} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-white/80">{day.dayLabel}</span>
                  <span className="text-[10px] text-white/30">{day.date}</span>
                  <span className="text-[10px] text-[#7c8fff] font-semibold">{day.totalHours}h total</span>
                </div>
                <div className="space-y-2">
                  {day.topics.map((t: any, ti: number) => {
                    const subIdx = currentPlan.subjects.indexOf(t.subject);
                    const color = SUBJECT_COLORS[subIdx >= 0 ? subIdx : ti % SUBJECT_COLORS.length];
                    return (
                      <div key={ti} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                        <div className="w-1 h-full rounded-full flex-shrink-0 mt-0.5" style={{ background: color, minHeight: '14px' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold" style={{ color }}>{t.subject}</div>
                          <div className="text-xs text-white/80">{t.topic}</div>
                          <div className="text-[9px] text-white/30 mt-0.5">{t.durationMinutes} min {t.notes && `· ${t.notes}`}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Exam Tips */}
          {currentPlan.examTips?.length > 0 && (
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(79,99,255,0.06)', border: '1px solid rgba(79,99,255,0.15)' }}>
              <h4 className="text-xs font-bold text-[#7c8fff] mb-3 uppercase">💡 Exam Tips</h4>
              <div className="space-y-1.5">
                {currentPlan.examTips.map((tip: string, i: number) => (
                  <div key={i} className="text-xs text-white/70 flex items-start gap-2">
                    <span className="text-[#7c8fff] flex-shrink-0">✦</span>{tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'plan' && !currentPlan && (
        <div className="flex-1 flex items-center justify-center text-white/20 text-sm">No plan generated yet. Use the Generate tab.</div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 && <div className="text-center py-12 text-white/20 text-xs">No study plans generated yet</div>}
          {history.map(plan => (
            <div key={plan._id} className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white/80">{plan.subjects.join(', ')}</div>
                <div className="text-[10px] text-white/40 mt-0.5">Exam: {new Date(plan.examDate).toLocaleDateString()} · {plan.dailyHours}h/day</div>
                <div className="text-[10px] text-white/30">{plan.generatedPlan.length} days generated · {new Date(plan.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setCurrentPlan(plan); setActiveTab('plan'); }} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[#7c8fff]" style={{ background: 'rgba(79,99,255,0.08)' }}>View</button>
                <button onClick={() => handleDelete(plan._id)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[#fc8181]" style={{ background: 'rgba(252,129,129,0.08)' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
