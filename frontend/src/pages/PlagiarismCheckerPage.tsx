import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth.store';
import { plagiarismService, PlagiarismReport } from '../services/plagiarism.service';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────────────────── */

/** Animated circular progress ring */
const CircularScore: React.FC<{
  score: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel?: string;
}> = ({ score, size = 120, strokeWidth = 10, color, label, sublabel }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference - (animated / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{score}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f2f8' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
};

/** Risk level badge */
const RiskBadge: React.FC<{ level: 'low' | 'moderate' | 'high' }> = ({ level }) => {
  const config = {
    low: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', icon: '✅', text: 'Low Risk' },
    moderate: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: '⚠️', text: 'Moderate Risk' },
    high: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', icon: '🚨', text: 'High Risk' },
  }[level];

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 18px', borderRadius: 30,
      background: config.bg, border: `1px solid ${config.border}`,
      color: config.color, fontWeight: 700, fontSize: 14,
    }}>
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */
export const PlagiarismCheckerPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'checker' | 'history' | 'analytics'>('checker');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Results state
  const [currentReport, setCurrentReport] = useState<PlagiarismReport | null>(null);
  const [reportTab, setReportTab] = useState<'overview' | 'highlights' | 'suggestions' | 'citations'>('overview');

  // History state
  const [reports, setReports] = useState<PlagiarismReport[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';

  // Load history
  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const data = await plagiarismService.getReports(page, 10);
      setReports(data.reports);
      setHistoryTotal(data.total);
      setHistoryPage(page);
    } catch {
      toast.error('Failed to load report history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load analytics (admin only)
  const loadAnalytics = useCallback(async () => {
    if (!isAdmin) return;
    setAnalyticsLoading(true);
    try {
      const data = await plagiarismService.getAnalytics();
      setAnalytics(data);
    } catch {
      toast.error('Failed to load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory(1);
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab]);

  // Drag & Drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/msword'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
      toast.error('Only PDF, DOCX, and TXT files are supported.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB.');
      return;
    }
    setSelectedFile(file);
    setCurrentReport(null);
  };

  // Analysis with progress simulation
  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setAnalyzeProgress(0);

    const progressInterval = setInterval(() => {
      setAnalyzeProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return prev; }
        return prev + Math.random() * 8;
      });
    }, 400);

    try {
      const { report } = await plagiarismService.analyzeDocument(selectedFile);
      clearInterval(progressInterval);
      setAnalyzeProgress(100);
      await new Promise(r => setTimeout(r, 500));
      setCurrentReport(report);
      setReportTab('overview');
      toast.success('Analysis complete!');
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error(err?.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress(0);
    }
  };

  // Print report
  const handleDownload = () => {
    if (!currentReport) return;
    window.print();
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getSimilarityColor = (score: number) => {
    if (score < 30) return '#22c55e';
    if (score < 70) return '#f59e0b';
    return '#ef4444';
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 24px',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Page Header ──────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              flexShrink: 0,
            }}>🔍</div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                AI Plagiarism Checker
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                AI-powered similarity detection, citation analysis &amp; originality scoring
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 28,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: 5,
          width: 'fit-content',
        }}>
          {[
            { id: 'checker', label: '🔍 Check Document' },
            { id: 'history', label: '📋 My Reports' },
            ...(isAdmin ? [{ id: 'analytics', label: '📊 Analytics' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              id={`plagiarism-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* ── TAB: Checker ─────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'checker' && (
            <motion.div
              key="checker"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Upload Zone */}
              {!currentReport && (
                <div style={{
                  border: `2px dashed ${isDragOver ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 20,
                  padding: 40,
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  marginBottom: 24,
                  cursor: 'pointer',
                  background: isDragOver ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                }}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !selectedFile && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    id="plagiarism-file-input"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
                  />

                  <AnimatePresence mode="wait">
                    {!selectedFile ? (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.7 }}>📄</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                          Drop your document here
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                          Supports PDF, DOCX, and TXT files up to 50MB
                        </div>
                        <button
                          id="plagiarism-browse-btn"
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          style={{
                            padding: '10px 24px', borderRadius: 12,
                            border: '1px solid rgba(99,102,241,0.4)',
                            background: 'rgba(99,102,241,0.1)',
                            color: '#7b87d4', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                        >
                          Browse Files
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>
                          {selectedFile.name.endsWith('.pdf') ? '📕' : selectedFile.name.endsWith('.txt') ? '📝' : '📘'}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                          {formatSize(selectedFile.size)} · {selectedFile.type || 'Document'}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                            style={{
                              padding: '9px 20px', borderRadius: 12,
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.08)',
                              color: '#ef4444', cursor: 'pointer',
                              fontSize: 13, fontWeight: 600,
                            }}
                          >Remove</button>
                          <button
                            id="plagiarism-analyze-btn"
                            onClick={e => { e.stopPropagation(); handleAnalyze(); }}
                            disabled={isAnalyzing}
                            style={{
                              padding: '9px 24px', borderRadius: 12,
                              border: 'none',
                              background: isAnalyzing
                                ? 'rgba(99,102,241,0.5)'
                                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: '#fff', cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                              fontSize: 13, fontWeight: 700,
                              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                            }}
                          >
                            {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze Now'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Progress Bar */}
              <AnimatePresence>
                {isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginBottom: 24, overflow: 'hidden' }}
                  >
                    <div style={{
                      padding: '20px 24px',
                      background: 'rgba(99,102,241,0.06)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 16,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#7b87d4' }}>
                          🤖 AI Analyzing Document...
                        </span>
                        <span style={{ fontSize: 13, color: '#7b87d4', fontWeight: 700 }}>
                          {Math.round(analyzeProgress)}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                        <motion.div
                          style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #2d9a8a)',
                            borderRadius: 6,
                          }}
                          animate={{ width: `${analyzeProgress}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                        Extracting text · Detecting patterns · Analyzing citations · Generating suggestions
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results */}
              <AnimatePresence>
                {currentReport && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="print-section"
                  >
                    {/* Score Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16,
                      marginBottom: 24,
                    }}>
                      {/* Scores */}
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 18, padding: '28px 20px',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        gap: 32,
                        gridColumn: 'span 2',
                      }}>
                        <CircularScore
                          score={currentReport.similarityScore}
                          color={getSimilarityColor(currentReport.similarityScore)}
                          label="Similarity"
                          sublabel="Non-original content"
                        />
                        <div style={{ width: 1, height: 80, background: 'rgba(255,255,255,0.08)' }} />
                        <CircularScore
                          score={currentReport.originalityScore}
                          color="#22c55e"
                          label="Originality"
                          sublabel="Original content"
                        />
                      </div>

                      {/* Risk Level */}
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 18, padding: '24px 20px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 10,
                      }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Risk Level
                        </div>
                        <RiskBadge level={currentReport.riskLevel} />
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                          {currentReport.riskLevel === 'low' ? 'Acceptable — minor revisions may be needed'
                            : currentReport.riskLevel === 'moderate' ? 'Review highlighted sections carefully'
                              : 'Significant revision required before submission'}
                        </div>
                      </div>

                      {/* Document Info */}
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 18, padding: '20px',
                      }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                          Document Info
                        </div>
                        {[
                          { label: 'File', value: currentReport.fileName },
                          { label: 'Words', value: currentReport.wordCount?.toLocaleString() || 'N/A' },
                          { label: 'Pages', value: currentReport.pageCount || 'N/A' },
                          { label: 'Analyzed', value: new Date(currentReport.createdAt).toLocaleString() },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Report Tabs */}
                    <div style={{
                      display: 'flex', gap: 4, marginBottom: 20,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 12, padding: 4,
                    }}>
                      {[
                        { id: 'overview', label: '📊 Overview' },
                        { id: 'highlights', label: '🔦 Highlights' },
                        { id: 'suggestions', label: '💡 AI Suggestions' },
                        { id: 'citations', label: '📚 Citations' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          id={`report-tab-${tab.id}`}
                          onClick={() => setReportTab(tab.id as any)}
                          style={{
                            flex: 1, padding: '8px 6px',
                            borderRadius: 9, border: 'none', cursor: 'pointer',
                            background: reportTab === tab.id ? 'rgba(99,102,241,0.25)' : 'transparent',
                            color: reportTab === tab.id ? '#7b87d4' : 'rgba(255,255,255,0.4)',
                            fontWeight: reportTab === tab.id ? 700 : 500,
                            fontSize: 12, transition: 'all 0.2s',
                            borderColor: reportTab === tab.id ? 'rgba(99,102,241,0.3)' : 'transparent',
                          }}
                        >{tab.label}</button>
                      ))}
                    </div>

                    {/* Tab Panels */}
                    <AnimatePresence mode="wait">
                      {reportTab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                          {/* Similarity bar */}
                          <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 16, padding: '20px 24px',
                            marginBottom: 16,
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
                              📊 Similarity Distribution
                            </div>
                            {/* Score legend */}
                            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                              {[
                                { label: 'Low (0–30%)', color: '#22c55e' },
                                { label: 'Moderate (30–70%)', color: '#f59e0b' },
                                { label: 'High (70–100%)', color: '#ef4444' },
                              ].map(({ label, color }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                                </div>
                              ))}
                            </div>
                            <div style={{ height: 18, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${currentReport.similarityScore}%` }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                style={{
                                  background: getSimilarityColor(currentReport.similarityScore),
                                  boxShadow: `0 0 12px ${getSimilarityColor(currentReport.similarityScore)}60`,
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>0%</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: getSimilarityColor(currentReport.similarityScore) }}>
                                {currentReport.similarityScore}% similarity detected
                              </span>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>100%</span>
                            </div>
                          </div>

                          {/* Summary stats */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                            {[
                              { label: 'Flagged Sections', value: currentReport.highlightedSections.length, color: '#f59e0b', icon: '🔦' },
                              { label: 'AI Suggestions', value: currentReport.aiSuggestions.length, color: '#7b87d4', icon: '💡' },
                              { label: 'Missing Citations', value: currentReport.citationAnalysis?.missingCitations?.length || 0, color: '#ef4444', icon: '📚' },
                              { label: 'Citation Issues', value: (currentReport.citationAnalysis?.incorrectReferences?.length || 0) + (currentReport.citationAnalysis?.formattingIssues?.length || 0), color: '#f97316', icon: '⚠️' },
                            ].map(stat => (
                              <div key={stat.label} style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 14, padding: '16px 14px', textAlign: 'center',
                              }}>
                                <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{stat.label}</div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {reportTab === 'highlights' && (
                        <motion.div key="highlights" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                          {currentReport.highlightedSections.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                              <div style={{ fontSize: 15, fontWeight: 600 }}>No problematic sections detected</div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {currentReport.highlightedSections.map((section, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.06 }}
                                  style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${getSimilarityColor(section.similarityPercent)}25`,
                                    borderLeft: `4px solid ${getSimilarityColor(section.similarityPercent)}`,
                                    borderRadius: 14, padding: '14px 16px',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                                      Section {i + 1}
                                    </span>
                                    <span style={{
                                      fontSize: 11, fontWeight: 800,
                                      color: getSimilarityColor(section.similarityPercent),
                                      background: `${getSimilarityColor(section.similarityPercent)}15`,
                                      padding: '2px 8px', borderRadius: 6,
                                    }}>
                                      {section.similarityPercent}% similar
                                    </span>
                                  </div>
                                  <div style={{
                                    fontSize: 13, color: '#f0f2f8', lineHeight: 1.6,
                                    background: `${getSimilarityColor(section.similarityPercent)}08`,
                                    padding: '10px 12px', borderRadius: 10,
                                    fontStyle: 'italic', marginBottom: 8,
                                  }}>
                                    "{section.text}"
                                  </div>
                                  {section.reason && (
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                      <span style={{ flexShrink: 0 }}>ℹ️</span>
                                      <span>{section.reason}</span>
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {reportTab === 'suggestions' && (
                        <motion.div key="suggestions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                          {currentReport.aiSuggestions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                              <div style={{ fontSize: 15, fontWeight: 600 }}>No suggestions — document looks great!</div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {currentReport.aiSuggestions.map((suggestion, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.06 }}
                                  style={{
                                    display: 'flex', gap: 14, alignItems: 'flex-start',
                                    background: 'rgba(99,102,241,0.06)',
                                    border: '1px solid rgba(99,102,241,0.15)',
                                    borderRadius: 14, padding: '14px 16px',
                                  }}
                                >
                                  <div style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, flexShrink: 0, fontWeight: 800, color: '#fff',
                                  }}>{i + 1}</div>
                                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                                    {suggestion}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {reportTab === 'citations' && (
                        <motion.div key="citations" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {[
                              { title: '❌ Missing Citations', items: currentReport.citationAnalysis?.missingCitations || [], color: '#ef4444', emptyMsg: 'No missing citations found!' },
                              { title: '⚠️ Incorrect References', items: currentReport.citationAnalysis?.incorrectReferences || [], color: '#f59e0b', emptyMsg: 'No incorrect references found!' },
                              { title: '🔁 Duplicate References', items: currentReport.citationAnalysis?.duplicateReferences || [], color: '#f97316', emptyMsg: 'No duplicate references found!' },
                              { title: '📐 Formatting Issues', items: currentReport.citationAnalysis?.formattingIssues || [], color: '#7b87d4', emptyMsg: 'No formatting issues found!' },
                            ].map(({ title, items, color, emptyMsg }) => (
                              <div key={title} style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: `1px solid ${color}20`,
                                borderRadius: 14, overflow: 'hidden',
                              }}>
                                <div style={{
                                  padding: '12px 16px',
                                  background: `${color}08`,
                                  borderBottom: `1px solid ${color}15`,
                                  fontSize: 13, fontWeight: 700, color,
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                  {title}
                                  <span style={{
                                    fontSize: 11, fontWeight: 800,
                                    background: `${color}20`, padding: '2px 8px', borderRadius: 6,
                                  }}>{items.length}</span>
                                </div>
                                <div style={{ padding: '12px 16px' }}>
                                  {items.length === 0 ? (
                                    <div style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span>✅</span> {emptyMsg}
                                    </div>
                                  ) : (
                                    <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                                      {items.map((item, i) => (
                                        <li key={i} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginBottom: 6, lineHeight: 1.5 }}>
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                      <button
                        id="plagiarism-new-check"
                        onClick={() => { setCurrentReport(null); setSelectedFile(null); }}
                        style={{
                          padding: '10px 24px', borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                        }}
                      >📤 Check Another Document</button>
                      <button
                        id="plagiarism-download-report"
                        onClick={handleDownload}
                        style={{
                          padding: '10px 24px', borderRadius: 12,
                          border: 'none',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff', cursor: 'pointer',
                          fontSize: 13, fontWeight: 700,
                          boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                        }}
                      >⬇️ Download Report</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Instruction cards (when no file selected and no result) */}
              {!selectedFile && !currentReport && !isAnalyzing && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 8 }}>
                  {[
                    { icon: '📤', title: 'Upload Document', desc: 'Drop a PDF, DOCX, or TXT file into the upload zone above.' },
                    { icon: '🤖', title: 'AI Analysis', desc: 'Llama 3 analyzes your document for similarity, patterns, and citations.' },
                    { icon: '📊', title: 'Get Results', desc: 'Receive a detailed report with similarity score, highlights, and suggestions.' },
                    { icon: '⬇️', title: 'Download Report', desc: 'Export a formatted PDF report of your plagiarism analysis.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 16, padding: '18px 16px',
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: History ──────────────────────────────────── */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
                  <div>Loading reports...</div>
                </div>
              ) : reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No reports yet</div>
                  <div style={{ fontSize: 13 }}>Upload a document to run your first plagiarism check.</div>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                        <tr>
                          {['Document', 'Date', 'Similarity', 'Risk Level', 'Actions'].map(h => (
                            <th key={h} style={{
                              textAlign: 'left', padding: '8px 14px',
                              fontSize: 11, color: 'rgba(255,255,255,0.35)',
                              fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report, i) => (
                          <motion.tr
                            key={report._id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{
                              padding: '14px', background: 'rgba(255,255,255,0.02)',
                              borderTop: '1px solid rgba(255,255,255,0.05)',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              borderLeft: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '12px 0 0 12px',
                            }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {report.fileName}
                              </div>
                              {isAdmin && typeof report.userId === 'object' && (
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                                  by {(report.userId as any).name} ({(report.userId as any).role})
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                              {new Date(report.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{
                                fontSize: 13, fontWeight: 800,
                                color: getSimilarityColor(report.similarityScore),
                              }}>{report.similarityScore}%</span>
                            </td>
                            <td style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                color: report.riskLevel === 'low' ? '#22c55e' : report.riskLevel === 'moderate' ? '#f59e0b' : '#ef4444',
                                background: report.riskLevel === 'low' ? 'rgba(34,197,94,0.1)' : report.riskLevel === 'moderate' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                padding: '3px 9px', borderRadius: 6,
                                textTransform: 'capitalize',
                              }}>{report.riskLevel}</span>
                            </td>
                            <td style={{
                              padding: '14px', background: 'rgba(255,255,255,0.02)',
                              borderTop: '1px solid rgba(255,255,255,0.05)',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              borderRight: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '0 12px 12px 0',
                            }}>
                              <button
                                onClick={() => plagiarismService.getReportById(report._id).then(({ report: r }) => { setCurrentReport(r); setActiveTab('checker'); setReportTab('overview'); })}
                                style={{
                                  padding: '6px 14px', borderRadius: 8,
                                  border: '1px solid rgba(99,102,241,0.3)',
                                  background: 'rgba(99,102,241,0.1)',
                                  color: '#7b87d4', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                }}
                              >View</button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {historyTotal > 10 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                      <button
                        disabled={historyPage <= 1}
                        onClick={() => loadHistory(historyPage - 1)}
                        style={{
                          padding: '7px 16px', borderRadius: 9,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'transparent', color: 'rgba(255,255,255,0.6)',
                          cursor: historyPage <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: 12, opacity: historyPage <= 1 ? 0.4 : 1,
                        }}
                      >← Prev</button>
                      <span style={{ padding: '7px 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        Page {historyPage} of {Math.ceil(historyTotal / 10)}
                      </span>
                      <button
                        disabled={historyPage >= Math.ceil(historyTotal / 10)}
                        onClick={() => loadHistory(historyPage + 1)}
                        style={{
                          padding: '7px 16px', borderRadius: 9,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'transparent', color: 'rgba(255,255,255,0.6)',
                          cursor: historyPage >= Math.ceil(historyTotal / 10) ? 'not-allowed' : 'pointer',
                          fontSize: 12, opacity: historyPage >= Math.ceil(historyTotal / 10) ? 0.4 : 1,
                        }}
                      >Next →</button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── TAB: Analytics (Admin Only) ───────────────────── */}
          {activeTab === 'analytics' && isAdmin && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {analyticsLoading || !analytics ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                  Loading analytics...
                </div>
              ) : (
                <>
                  {/* Stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
                    {[
                      { label: 'Total Documents', value: analytics.totalDocuments, icon: '📄', color: '#7b87d4' },
                      { label: 'Avg Similarity', value: `${analytics.averageSimilarity}%`, icon: '📊', color: getSimilarityColor(analytics.averageSimilarity) },
                      { label: 'High Risk', value: analytics.highRiskDocuments, icon: '🚨', color: '#ef4444' },
                      { label: 'Moderate Risk', value: analytics.moderateRiskDocuments, icon: '⚠️', color: '#f59e0b' },
                      { label: 'Low Risk', value: analytics.lowRiskDocuments, icon: '✅', color: '#22c55e' },
                      { label: 'Faculty Usage', value: analytics.facultyUsage, icon: '👨‍🏫', color: '#2d9a8a' },
                      { label: 'Student Usage', value: analytics.studentUsage, icon: '👨‍🎓', color: '#9b96d4' },
                    ].map(({ label, value, icon, color }) => (
                      <div key={label} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 16, padding: '20px 16px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Monthly chart */}
                  {analytics.monthlyStats.length > 0 && (
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 18, padding: '24px',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
                        📈 Monthly Document Analysis
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, overflowX: 'auto', paddingBottom: 8 }}>
                        {analytics.monthlyStats.map((m: any) => {
                          const maxCount = Math.max(...analytics.monthlyStats.map((s: any) => s.count), 1);
                          const barH = Math.round((m.count / maxCount) * 110);
                          return (
                            <div key={`${m.year}-${m.month}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <span style={{ fontSize: 10, color: '#7b87d4', fontWeight: 700 }}>{m.count}</span>
                              <div style={{
                                width: 36, height: barH,
                                borderRadius: '6px 6px 0 0',
                                background: `linear-gradient(180deg, #6366f1, #8b5cf6)`,
                                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                                minHeight: 4,
                              }} />
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                                {monthNames[m.month - 1]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Print Styles ────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-section { display: block !important; }
          body { background: white !important; color: black !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
