import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { aiEvaluationService } from '../services/ai-evaluation.service';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Loader } from '../components/common/Loader';

// ── Constants ────────────────────────────────────────────────
const COLORS = ['#4f5dc8', '#7c6fc2', '#34a87a', '#c4893a', '#c0524a', '#2d9a8a', '#a78bcd'];
const TOOLTIP_STYLE = {
  background: 'rgba(15,16,26,0.97)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#f0f2f8',
  fontSize: '11px',
};

type Section =
  | 'overview' | 'chatbot' | 'rag' | 'explain' | 'assignments'
  | 'notes' | 'study-planner' | 'research' | 'support-bot'
  | 'communication' | 'faculty' | 'students' | 'system' | 'security'
  | 'tam' | 'reports';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'overview',       label: 'Overview',            icon: '🏠' },
  { id: 'chatbot',        label: 'AI Chatbot',          icon: '🤖' },
  { id: 'rag',            label: 'Hybrid RAG',          icon: '🔍' },
  { id: 'explain',        label: 'Explain Mode',        icon: '💡' },
  { id: 'assignments',    label: 'Assignments',         icon: '📝' },
  { id: 'notes',          label: 'Notes Generator',     icon: '📒' },
  { id: 'study-planner',  label: 'Study Planner',       icon: '📅' },
  { id: 'research',       label: 'Research AI',         icon: '🔬' },
  { id: 'support-bot',    label: 'Support Bot',         icon: '🛠️' },
  { id: 'communication',  label: 'Communication',       icon: '💬' },
  { id: 'faculty',        label: 'Faculty Analytics',   icon: '👨‍🏫' },
  { id: 'students',       label: 'Student Analytics',   icon: '🎓' },
  { id: 'system',         label: 'System Performance',  icon: '⚙️' },
  { id: 'security',       label: 'Security',            icon: '🛡️' },
  { id: 'tam',            label: 'TAM Evaluation',      icon: '📊' },
  { id: 'reports',        label: 'Export Reports',      icon: '📤' },
];

// ── Sub-components ───────────────────────────────────────────
const MetricCard: React.FC<{
  icon: string; label: string; value: string | number; sub?: string; color?: string; trend?: number;
}> = ({ icon, label, value, sub, color = '#8b94e0', trend }) => (
  <div
    className="rounded-2xl p-4 flex flex-col gap-2"
    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xl">{icon}</span>
      {trend !== undefined && (
        <span className="text-[10px] font-bold" style={{ color: trend >= 0 ? '#34a87a' : '#c0524a' }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="text-2xl font-black" style={{ color }}>{value}</div>
    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</div>
    {sub && <div className="text-[10px] text-white/25">{sub}</div>}
  </div>
);

const GaugeBar: React.FC<{ label: string; value: number; color?: string; max?: number }> = ({
  label, value, color = '#4f5dc8', max = 100,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-white/60">{label}</span>
      <span className="text-[11px] font-bold" style={{ color }}>{value}{max === 100 ? '%' : ''}</span>
    </div>
    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
      />
    </div>
  </div>
);

const SectionHeader: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
      style={{ background: 'linear-gradient(135deg,rgba(79,93,200,0.14),rgba(124,111,194,0.2))', border: '1px solid rgba(79,93,200,0.22)' }}>
      {icon}
    </div>
    <div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-white/35">{subtitle}</p>}
    </div>
  </div>
);

const Spinner: React.FC = () => (
  <Loader message="Aggregating performance metrics..." />
);

// ── Export utilities ─────────────────────────────────────────
const exportToPDF = (title: string, data: any) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`EduMentor AI — ${title}`, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.setFontSize(11);
  let y = 40;
  const lines = JSON.stringify(data, null, 2).split('\n');
  for (const line of lines) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line.substring(0, 90), 14, y);
    y += 5;
  }
  doc.save(`${title.replace(/\s/g, '_')}_${Date.now()}.pdf`);
  toast.success('PDF exported!');
};

const exportToXLSX = (title: string, rows: any[]) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s/g, '_')}_${Date.now()}.xlsx`);
  toast.success('Excel file exported!');
};

// ── SECTION PANELS ───────────────────────────────────────────
const ChatbotPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="🤖" title="AI Educational Chatbot" subtitle="Response quality, hallucination detection & usage metrics" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard icon="🎯" label="Response Accuracy" value={`${data.responseAccuracy}%`} color="#34a87a" />
      <MetricCard icon="📐" label="Precision" value={`${data.precision}%`} color="#4f5dc8" />
      <MetricCard icon="🔄" label="Recall" value={`${data.recall}%`} color="#7c6fc2" />
      <MetricCard icon="⚖️" label="F1 Score" value={`${data.f1Score}%`} color="#2d9a8a" />
      <MetricCard icon="🔍" label="Retrieval Accuracy" value={`${data.retrievalAccuracy}%`} color="#c4893a" />
      <MetricCard icon="⚠️" label="Hallucination Rate" value={`${data.hallucinationRate}%`} color="#c0524a" />
      <MetricCard icon="📎" label="Citation Accuracy" value={`${data.sourceCitationAccuracy}%`} color="#a78bcd" />
      <MetricCard icon="🧠" label="Avg Confidence" value={`${data.avgConfidenceScore}%`} color="#34a87a" />
    </div>
    <div className="grid grid-cols-3 gap-3">
      <MetricCard icon="💬" label="Total Queries" value={data.totalQueries.toLocaleString()} sub="All time" />
      <MetricCard icon="✅" label="Correct Responses" value={data.correctResponses.toLocaleString()} color="#34a87a" />
      <MetricCard icon="❌" label="Incorrect Responses" value={data.incorrectResponses.toLocaleString()} color="#c0524a" />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">📈 Accuracy & Hallucination Trend (30 days)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.accuracyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="_id" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="avgTrustScore" stroke="#34a87a" fill="rgba(52,168,122,0.1)" name="Trust Score" />
            <Area type="monotone" dataKey="hallucinationRate" stroke="#c0524a" fill="rgba(192,82,74,0.1)" name="Hallucination %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">📊 Daily AI Usage</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.accuracyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="_id" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="queries" fill="url(#chatGrad)" radius={[4,4,0,0]} name="Queries">
              <defs>
                <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f5dc8" /><stop offset="100%" stopColor="#7c6fc2" />
                </linearGradient>
              </defs>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    {data.confidenceDistribution?.length > 0 && (
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">🎯 Confidence Score Distribution</h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.confidenceDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#2d9a8a" radius={[4,4,0,0]} name="Messages" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const RAGPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="🔍" title="Hybrid RAG Performance" subtitle="Vector + BM25 retrieval accuracy and latency metrics" />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <MetricCard icon="🧲" label="Vector Retrieval" value={`${data.vectorRetrievalAccuracy}%`} color="#4f5dc8" />
      <MetricCard icon="📚" label="BM25 Retrieval" value={`${data.bm25RetrievalAccuracy}%`} color="#7c6fc2" />
      <MetricCard icon="🔀" label="Hybrid Retrieval" value={`${data.hybridRetrievalAccuracy}%`} color="#34a87a" />
      <MetricCard icon="⚡" label="Avg Retrieval Time" value={`${data.avgRetrievalTime}s`} color="#c4893a" />
      <MetricCard icon="🎯" label="Top-K Accuracy" value={`${data.topKAccuracy}%`} color="#2d9a8a" />
      <MetricCard icon="📏" label="Context Relevance" value={`${data.contextRelevanceScore}%`} color="#a78bcd" />
    </div>
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h4 className="text-xs font-bold text-white/50 mb-1">⚡ Retrieval Latency Trend (30 days)</h4>
      <p className="text-[10px] text-white/25 mb-4">
        Left axis: avg response latency (seconds) · Right axis: retrieval accuracy (%)
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.latencyTrend} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
          {/* Left Y-axis — latency in seconds */}
          <YAxis
            yAxisId="latency"
            domain={[0, 'auto']}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
            tickFormatter={(v) => `${v}s`}
            label={{ value: 'Latency (s)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.2)', fontSize: 9, dx: 10 }}
          />
          {/* Right Y-axis — accuracy % */}
          <YAxis
            yAxisId="accuracy"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: any, name: string) => {
              if (name === 'Latency (s)') return [`${value}s`, name];
              return [`${value}%`, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line
            yAxisId="latency"
            type="monotone" dataKey="latency"
            stroke="#c4893a" strokeWidth={2} dot={{ r: 3, fill: '#c4893a' }}
            name="Latency (s)"
          />
          <Line
            yAxisId="accuracy"
            type="monotone" dataKey="retrievalAccuracy"
            stroke="#34a87a" strokeWidth={2} dot={{ r: 3, fill: '#34a87a' }}
            name="Accuracy %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <div className="space-y-3 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h4 className="text-xs font-bold text-white/50 mb-4">📊 Retrieval Performance Comparison</h4>
      <GaugeBar label="Vector Search Accuracy" value={data.vectorRetrievalAccuracy} color="#4f5dc8" />
      <GaugeBar label="BM25 Keyword Accuracy" value={data.bm25RetrievalAccuracy} color="#7c6fc2" />
      <GaugeBar label="Hybrid Combined Accuracy" value={data.hybridRetrievalAccuracy} color="#34a87a" />
      <GaugeBar label="Top-K Retrieval" value={data.topKAccuracy} color="#2d9a8a" />
      <GaugeBar label="Context Relevance Score" value={data.contextRelevanceScore} color="#a78bcd" />
    </div>
  </div>
);


const ExplainPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="💡" title="AI Explain Mode Evaluation" subtitle="Explanation quality across all 5 modes" />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <MetricCard icon="🧒" label="Explain Simply" value={`${data.explainSimplyAccuracy}%`} color="#4f5dc8" />
      <MetricCard icon="📖" label="Detailed Explanation" value={`${data.detailedExplanationAccuracy}%`} color="#7c6fc2" />
      <MetricCard icon="💎" label="Example Quality" value={`${data.exampleQualityScore}%`} color="#34a87a" />
      <MetricCard icon="🌍" label="Real-world Examples" value={`${data.realWorldExampleScore}%`} color="#c4893a" />
      <MetricCard icon="📋" label="Exam Point Accuracy" value={`${data.examPointAccuracy}%`} color="#2d9a8a" />
      <MetricCard icon="🔢" label="Total Explanations" value={data.totalExplanations.toLocaleString()} />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">📊 Explanation Mode Usage</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.usageBreakdown} layout="vertical">
            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} width={100} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#4f5dc8" radius={[0,4,4,0]} name="Usage Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">🎯 Quality Scores</h4>
        <GaugeBar label="Explain Simply Accuracy" value={data.explainSimplyAccuracy} color="#4f5dc8" />
        <GaugeBar label="Detailed Explanation Accuracy" value={data.detailedExplanationAccuracy} color="#7c6fc2" />
        <GaugeBar label="Example Quality Score" value={data.exampleQualityScore} color="#34a87a" />
        <GaugeBar label="Real-World Example Score" value={data.realWorldExampleScore} color="#c4893a" />
        <GaugeBar label="Exam Point Accuracy" value={data.examPointAccuracy} color="#2d9a8a" />
      </div>
    </div>
  </div>
);

const AssignmentPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="📝" title="AI Assignment Evaluator" subtitle="Evaluation accuracy, MAE and feedback quality metrics" />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <MetricCard icon="📋" label="Total Evaluations" value={data.total.toLocaleString()} />
      <MetricCard icon="🎯" label="Avg AI Score" value={`${data.avgScore}%`} color="#34a87a" />
      <MetricCard icon="📐" label="Mean Absolute Error" value={data.mae} color="#c0524a" sub="Lower is better" />
      <MetricCard icon="💬" label="Feedback Quality" value={`${data.feedbackQuality}%`} color="#4f5dc8" />
      <MetricCard icon="✏️" label="Suggestion Accuracy" value={`${data.suggestionAccuracy}%`} color="#7c6fc2" />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">📊 Score Distribution</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.scoreDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="url(#assignGrad)" radius={[4,4,0,0]} name="Assignments">
              <defs>
                <linearGradient id="assignGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c4893a"/><stop offset="100%" stopColor="#a78bcd"/>
                </linearGradient>
              </defs>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">📈 Evaluation Accuracy Trend</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.scoreTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="avgScore" stroke="#34a87a" strokeWidth={2} dot={false} name="Avg Score %" />
            <Line type="monotone" dataKey="count" stroke="#4f5dc8" strokeWidth={2} dot={false} name="Count" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const NotesPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="📒" title="AI Notes Generator" subtitle="Generation metrics, note types and readability scores" />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <MetricCard icon="📒" label="Total Notes" value={data.total.toLocaleString()} />
      <MetricCard icon="👥" label="Unique Students" value={data.uniqueStudents.toLocaleString()} color="#4f5dc8" />
      <MetricCard icon="✅" label="Generation Accuracy" value={`${data.noteGenerationAccuracy}%`} color="#34a87a" />
      <MetricCard icon="📖" label="Readability Score" value={`${data.readabilityScore}%`} color="#7c6fc2" />
      <MetricCard icon="🗺️" label="Topic Coverage" value={`${data.topicCoverage}%`} color="#c4893a" />
    </div>
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h4 className="text-xs font-bold text-white/50 mb-4">📊 Notes by Type</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data.byType}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="type" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" radius={[4,4,0,0]} name="Count">
            {data.byType.map((_: any, i: number) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const StudyPlannerPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="📅" title="AI Study Planner" subtitle="Plan generation, student acceptance and schedule effectiveness" />
    <div className="grid grid-cols-2 gap-3">
      <MetricCard icon="📅" label="Plans Generated" value={data.totalPlansGenerated.toLocaleString()} />
      <MetricCard icon="👥" label="Unique Students" value={data.uniqueStudents.toLocaleString()} color="#4f5dc8" />
      <MetricCard icon="⏱️" label="Avg Daily Study Hours" value={`${data.avgDailyHours}h`} color="#c4893a" />
      <MetricCard icon="🎯" label="Recommendation Accuracy" value={`${data.recommendationAccuracy}%`} color="#34a87a" />
    </div>
    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h4 className="text-xs font-bold text-white/50">📊 Effectiveness Metrics</h4>
      <GaugeBar label="Student Acceptance Rate" value={data.studentAcceptanceRate} color="#7c6fc2" />
      <GaugeBar label="Plan Completion Rate" value={data.planCompletionRate} color="#34a87a" />
      <GaugeBar label="Schedule Effectiveness" value={data.scheduleEffectiveness} color="#2d9a8a" />
      <GaugeBar label="Recommendation Accuracy" value={data.recommendationAccuracy} color="#c4893a" />
    </div>
  </div>
);

const ResearchPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="🔬" title="AI Research Assistant" subtitle="Paper summarization, citation and literature review accuracy" />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <MetricCard icon="🔬" label="Total Researches" value={data.totalResearches.toLocaleString()} />
      <MetricCard icon="👥" label="Unique Users" value={data.uniqueUsers.toLocaleString()} color="#4f5dc8" />
      <MetricCard icon="📝" label="Summary Accuracy" value={`${data.summaryAccuracy}%`} color="#34a87a" />
      <MetricCard icon="📌" label="Citation Accuracy" value={`${data.citationAccuracy}%`} color="#7c6fc2" />
      <MetricCard icon="📚" label="Literature Review" value={`${data.literatureReviewAccuracy}%`} color="#c4893a" />
      <MetricCard icon="🔀" label="Paper Comparison" value={`${data.paperComparisonAccuracy}%`} color="#2d9a8a" />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">📊 Feature Usage Breakdown</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data.byFeature} dataKey="count" nameKey="feature" cx="50%" cy="50%" outerRadius={70}>
              {data.byFeature.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">🎯 Accuracy Scores</h4>
        <GaugeBar label="Summary Accuracy" value={data.summaryAccuracy} color="#34a87a" />
        <GaugeBar label="Citation Accuracy" value={data.citationAccuracy} color="#7c6fc2" />
        <GaugeBar label="Literature Review" value={data.literatureReviewAccuracy} color="#c4893a" />
        <GaugeBar label="Paper Comparison" value={data.paperComparisonAccuracy} color="#2d9a8a" />
        <GaugeBar label="Future Scope Extraction" value={data.futureScopeExtractionAccuracy} color="#a78bcd" />
      </div>
    </div>
  </div>
);

const SupportBotPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="🛠️" title="AI Support Bot" subtitle="Ticket resolution, auto-resolve rate and satisfaction ratings" />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <MetricCard icon="🎫" label="Total Tickets" value={data.totalTickets.toLocaleString()} />
      <MetricCard icon="✅" label="Resolution Accuracy" value={`${data.resolutionAccuracy}%`} color="#34a87a" />
      <MetricCard icon="🤖" label="Auto-Resolved" value={data.autoResolvedTickets.toLocaleString()} color="#4f5dc8" />
      <MetricCard icon="🚨" label="Escalated Tickets" value={data.escalatedTickets.toLocaleString()} color="#c0524a" />
      <MetricCard icon="⭐" label="Feedback Rating" value={`${data.avgFeedbackRating}/5`} color="#c4893a" />
      <MetricCard icon="⏱️" label="Avg Resolution Time" value={`${data.avgResolutionTimeHours}h`} color="#7c6fc2" />
    </div>
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h4 className="text-xs font-bold text-white/50 mb-4">📈 Ticket Resolution Trend (30 days)</h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data.trend}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="created" stroke="#c0524a" fill="rgba(192,82,74,0.1)" name="Created" />
          <Area type="monotone" dataKey="resolved" stroke="#34a87a" fill="rgba(52,168,122,0.1)" name="Resolved" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const CommunicationPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="💬" title="Communication Module Analytics" subtitle="Messaging activity and delivery performance metrics" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard icon="📨" label="Total Messages" value={data.totalMessages.toLocaleString()} />
      <MetricCard icon="🔒" label="Private Chats" value={data.privateChats.toLocaleString()} color="#4f5dc8" />
      <MetricCard icon="👥" label="Group Discussions" value={data.publicDiscussions.toLocaleString()} color="#7c6fc2" />
      <MetricCard icon="🎙️" label="Audio Messages" value={data.audioMessages.toLocaleString()} color="#c4893a" />
      <MetricCard icon="🖼️" label="Image Messages" value={data.imageMessages.toLocaleString()} color="#a78bcd" />
      <MetricCard icon="⏱️" label="Avg Response Time" value={`${data.avgResponseTimeMinutes}m`} color="#2d9a8a" />
      <MetricCard icon="📡" label="Delivery Success" value={`${data.messageDeliverySuccessRate}%`} color="#34a87a" />
    </div>
  </div>
);

const FacultyPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="👨‍🏫" title="Faculty Analytics" subtitle="Activity, uploads, course management and student interaction" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard icon="👨‍🏫" label="Total Faculty" value={data.totalFaculty.toLocaleString()} />
      <MetricCard icon="🟢" label="Active Faculty" value={data.activeFaculty.toLocaleString()} color="#34a87a" />
      <MetricCard icon="📁" label="Notes Uploaded" value={data.notesUploaded.toLocaleString()} color="#4f5dc8" />
      <MetricCard icon="📝" label="Assignments Created" value={data.assignmentsCreated.toLocaleString()} color="#7c6fc2" />
      <MetricCard icon="📋" label="Quizzes Created" value={data.quizzesCreated.toLocaleString()} color="#c4893a" />
      <MetricCard icon="💬" label="Queries Answered" value={data.studentQueriesAnswered.toLocaleString()} color="#2d9a8a" />
      <MetricCard icon="📅" label="Meetings Approved" value={data.meetingRequestsApproved.toLocaleString()} color="#a78bcd" />
      <MetricCard icon="🏫" label="Office Hours Usage" value={data.officeHoursUsage.toLocaleString()} color="#c0524a" />
    </div>
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h4 className="text-xs font-bold text-white/50 mb-4">📊 Faculty Activity Overview</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={[
          { name: 'Notes', count: data.notesUploaded },
          { name: 'Assignments', count: data.assignmentsCreated },
          { name: 'Quizzes', count: data.quizzesCreated },
          { name: 'Meetings', count: data.meetingRequestsApproved },
        ]}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" radius={[4,4,0,0]} name="Count">
            {[0,1,2,3].map(i => <Cell key={i} fill={COLORS[i]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const StudentPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="🎓" title="Student Analytics" subtitle="Usage across all AI modules, progress, and topic mastery" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard icon="🎓" label="Total Students" value={data.totalStudents.toLocaleString()} />
      <MetricCard icon="🟢" label="Active Students" value={data.activeStudents.toLocaleString()} color="#34a87a" />
      <MetricCard icon="🤖" label="Chatbot Users" value={data.chatbotUsage.toLocaleString()} color="#4f5dc8" />
      <MetricCard icon="📒" label="Notes AI Users" value={data.aiNotesUsage.toLocaleString()} color="#7c6fc2" />
      <MetricCard icon="📝" label="Assignment Evals" value={data.assignmentEvaluations.toLocaleString()} color="#c4893a" />
      <MetricCard icon="📅" label="Study Planner Users" value={data.studyPlannerUsage.toLocaleString()} color="#2d9a8a" />
      <MetricCard icon="🔬" label="Research AI Users" value={data.researchAssistantUsage.toLocaleString()} color="#a78bcd" />
      <MetricCard icon="📋" label="Quizzes Completed" value={data.totalQuizzesCompleted.toLocaleString()} color="#c0524a" />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      {data.weakTopics?.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h4 className="text-xs font-bold text-white/50 mb-4">🔴 Top Weak Topics</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.weakTopics.slice(0,8)} layout="vertical">
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <YAxis dataKey="topic" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} width={100} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#c0524a" radius={[0,4,4,0]} name="Students Struggling" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.strongTopics?.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h4 className="text-xs font-bold text-white/50 mb-4">🟢 Top Strong Topics</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.strongTopics.slice(0,8)} layout="vertical">
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <YAxis dataKey="topic" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} width={100} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#34a87a" radius={[0,4,4,0]} name="Students Mastered" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </div>
);

const SystemPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="⚙️" title="System Performance" subtitle="API latency, memory, database health and uptime" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard icon="⚡" label="API Response Time" value={`${data.apiResponseTime}ms`} color="#4f5dc8" />
      <MetricCard icon="🗄️" label="DB Query Time" value={`${data.dbQueryTime}ms`} color="#7c6fc2" />
      <MetricCard icon="🔍" label="ChromaDB Retrieval" value={`${data.chromaRetrievalTime}ms`} color="#2d9a8a" />
      <MetricCard icon="💾" label="Memory Usage" value={`${data.memoryUsagePct}%`} color={data.memoryUsagePct > 80 ? '#c0524a' : '#34a87a'} sub={`${data.memUsedMB}/${data.memTotalMB} MB`} />
      <MetricCard icon="🖥️" label="CPU Usage" value={`${data.cpuUsagePct}%`} color={data.cpuUsagePct > 80 ? '#c0524a' : '#34a87a'} />
      <MetricCard icon="💿" label="Storage Used" value={`${data.storageGB} GB`} color="#c4893a" />
      <MetricCard icon="👥" label="Concurrent Users" value={data.concurrentUsers.toLocaleString()} color="#a78bcd" />
      <MetricCard icon="🟢" label="Uptime" value={`${data.uptimeDays}d ${data.uptimeHours}h`} color="#34a87a" />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">📈 Response Time Trend (30 days)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.responseTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="responseTime" stroke="#4f5dc8" fill="rgba(79,93,200,0.08)" name="Response Time (ms)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/50 mb-4">🔧 Resource Utilization</h4>
        <GaugeBar label="CPU Usage" value={data.cpuUsagePct} color={data.cpuUsagePct > 80 ? '#c0524a' : '#34a87a'} />
        <GaugeBar label="Memory Usage" value={data.memoryUsagePct} color={data.memoryUsagePct > 80 ? '#c0524a' : '#7c6fc2'} />
        <GaugeBar label="Error Rate" value={data.errorRate} max={10} color="#c0524a" />
        <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(52,168,122,0.05)', border: '1px solid rgba(52,168,122,0.15)' }}>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">●</span>
            <span className="text-white/60">System Uptime: <strong className="text-white">{data.uptimeDays}d {data.uptimeHours}h</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className="text-green-400">●</span>
            <span className="text-white/60">Error Rate: <strong className="text-white">{data.errorRate}%</strong></span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SecurityPanel: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <SectionHeader icon="🛡️" title="Security Analytics" subtitle="Login events, OTP, password resets and unauthorized access audit" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard icon="✅" label="Successful Logins" value={data.successfulLogins.toLocaleString()} color="#34a87a" />
      <MetricCard icon="❌" label="Failed Attempts" value={data.failedLoginAttempts.toLocaleString()} color="#c0524a" />
      <MetricCard icon="🔐" label="OTP Success Rate" value={`${data.otpSuccessRate}%`} color="#4f5dc8" />
      <MetricCard icon="🔑" label="Password Resets" value={data.passwordResetRequests.toLocaleString()} color="#7c6fc2" />
      <MetricCard icon="🚫" label="Unauthorized Attempts" value={data.unauthorizedAccessAttempts.toLocaleString()} color="#c0524a" />
      <MetricCard icon="🔒" label="Account Lock Events" value={data.accountLockEvents.toLocaleString()} color="#c4893a" />
    </div>
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h4 className="text-xs font-bold text-white/50 mb-4">📈 Login Activity Trend (30 days)</h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data.loginTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="_id" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="success" stroke="#34a87a" fill="rgba(52,168,122,0.1)" name="Successful" />
          <Area type="monotone" dataKey="failed" stroke="#c0524a" fill="rgba(192,82,74,0.1)" name="Failed" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    {data.recentAuditLogs?.length > 0 && (
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h4 className="text-xs font-bold text-white/50">🔍 Recent Audit Log</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Action', 'Performed By', 'Details', 'IP', 'Time'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-white/30 font-bold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentAuditLogs.slice(0, 10).map((log: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="hover:bg-white/2">
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{
                      background: log.action.includes('SUCCESS') || log.action.includes('VERIFIED') ? 'rgba(52,168,122,0.1)' : 'rgba(192,82,74,0.1)',
                      color: log.action.includes('SUCCESS') || log.action.includes('VERIFIED') ? '#34a87a' : '#c0524a',
                    }}>{log.action}</span>
                  </td>
                  <td className="px-4 py-2 text-white/60">{log.performedBy}</td>
                  <td className="px-4 py-2 text-white/40 max-w-[200px] truncate">{log.details}</td>
                  <td className="px-4 py-2 text-white/40 font-mono">{log.ip || '—'}</td>
                  <td className="px-4 py-2 text-white/30">{new Date(log.time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

const TAMPanel: React.FC<{ data: any }> = ({ data }) => {
  const DIMENSION_LABELS: Record<string, string> = {
    perceivedUsefulness: 'Perceived Usefulness',
    perceivedEaseOfUse: 'Ease of Use',
    attitudeTowardUse: 'Attitude',
    behavioralIntention: 'Behavioral Intention',
    selfEfficacy: 'Self-Efficacy',
    systemAccessibility: 'Accessibility',
    overallSatisfaction: 'Overall Satisfaction',
  };

  const radarData = data.dimensions?.map((d: any) => ({
    subject: DIMENSION_LABELS[d.dimension] || d.dimension,
    value: Math.round((d.avg / 5) * 100),
    fullMark: 100,
  })) || [];

  return (
    <div className="space-y-6">
      <SectionHeader icon="📊" title="TAM Evaluation Results" subtitle="Technology Acceptance Model — aggregated user survey analysis" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard icon="📋" label="Total Responses" value={data.totalResponses.toLocaleString()} />
        <MetricCard icon="⭐" label="Overall Score" value={`${data.overallScore}/5`} color="#c4893a" />
        <MetricCard icon="📐" label="Cronbach's Alpha" value={data.cronbachAlpha} color={data.cronbachAlpha >= 0.7 ? '#34a87a' : '#c0524a'} sub={data.cronbachAlpha >= 0.7 ? '✓ Reliable (α ≥ 0.7)' : '⚠ Needs improvement'} />
      </div>

      {data.totalResponses === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white/30 text-sm">No TAM survey responses yet</p>
          <p className="text-white/20 text-xs mt-1">Students and faculty can submit their survey from the sidebar "⭐ Rate Platform" link</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h4 className="text-xs font-bold text-white/50 mb-4">🕸️ TAM Dimension Radar Chart</h4>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 8 }} />
                <Radar name="Score" dataKey="value" stroke="#4f5dc8" fill="rgba(79,93,200,0.14)" strokeWidth={2} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h4 className="text-xs font-bold text-white/50 mb-4">📊 Dimension Scores</h4>
            {data.dimensions?.map((d: any) => (
              <GaugeBar key={d.dimension} label={DIMENSION_LABELS[d.dimension] || d.dimension} value={Math.round((d.avg / 5) * 100)} color="#4f5dc8" />
            ))}
          </div>
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h4 className="text-xs font-bold text-white/50 mb-4">⭐ Satisfaction Distribution</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="rating" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={v => `${v}⭐`} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[4,4,0,0]} name="Responses">
                  {data.distribution?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {data.comments?.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h4 className="text-xs font-bold text-white/50 mb-4">💬 Recent Comments</h4>
              <div className="space-y-2 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {data.comments.map((c: string, i: number) => (
                  <div key={i} className="text-[10px] text-white/50 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    "{c}"
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReportsPanel: React.FC<{ allData: any }> = ({ allData }) => {
  const reports = [
    { key: 'chatbot', label: 'AI Performance Report', icon: '🤖', desc: 'Chatbot accuracy, RAG metrics, explain mode' },
    { key: 'students', label: 'Student Analytics Report', icon: '🎓', desc: 'Usage, quiz scores, topic mastery' },
    { key: 'faculty', label: 'Faculty Analytics Report', icon: '👨‍🏫', desc: 'Activity, uploads, student interactions' },
    { key: 'system', label: 'System Performance Report', icon: '⚙️', desc: 'API latency, memory, uptime, errors' },
    { key: 'security', label: 'Security Report', icon: '🛡️', desc: 'Login events, OTP, audit log' },
    { key: 'tam', label: 'TAM Evaluation Report', icon: '📊', desc: "User acceptance survey results" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader icon="📤" title="Export Reports" subtitle="Download platform analytics as PDF or Excel" />
      <div className="grid md:grid-cols-2 gap-4">
        {reports.map(r => (
          <div key={r.key} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">{r.icon}</span>
              <div>
                <h4 className="text-sm font-bold text-white">{r.label}</h4>
                <p className="text-[10px] text-white/35 mt-0.5">{r.desc}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => allData[r.key] && exportToPDF(r.label, allData[r.key])}
                disabled={!allData[r.key]}
                className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all disabled:opacity-30"
                style={{ background: 'rgba(192,82,74,0.1)', border: '1px solid rgba(192,82,74,0.25)', color: '#c0524a' }}
              >
                📄 PDF
              </button>
              <button
                onClick={() => {
                  if (!allData[r.key]) return;
                  const rows = Object.entries(allData[r.key]).map(([k, v]) => ({
                    Metric: k, Value: typeof v === 'object' ? JSON.stringify(v) : String(v),
                  }));
                  exportToXLSX(r.label, rows);
                }}
                disabled={!allData[r.key]}
                className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all disabled:opacity-30"
                style={{ background: 'rgba(52,168,122,0.1)', border: '1px solid rgba(52,168,122,0.25)', color: '#34a87a' }}
              >
                📊 Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── OVERVIEW ────────────────────────────────────────────────
const OverviewPanel: React.FC<{ allData: any }> = ({ allData }) => {
  const chatbot = allData.chatbot;
  const system = allData.system;
  const students = allData.students;
  const security = allData.security;

  return (
    <div className="space-y-6">
      <SectionHeader icon="🏠" title="AI Evaluation Overview" subtitle="Platform-wide intelligence performance at a glance" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon="🎯" label="AI Accuracy" value={chatbot ? `${chatbot.responseAccuracy}%` : '—'} color="#34a87a" />
        <MetricCard icon="⚠️" label="Hallucination Rate" value={chatbot ? `${chatbot.hallucinationRate}%` : '—'} color="#c0524a" />
        <MetricCard icon="🔐" label="Login Success Rate" value={security ? `${Math.round((security.successfulLogins / Math.max(security.successfulLogins + security.failedLoginAttempts, 1)) * 100)}%` : '—'} color="#4f5dc8" />
        <MetricCard icon="🎓" label="Active Students" value={students ? students.activeStudents.toLocaleString() : '—'} color="#7c6fc2" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon="💬" label="Total AI Queries" value={chatbot ? chatbot.totalQueries.toLocaleString() : '—'} />
        <MetricCard
          icon="⚡" label="Avg API Response"
          value={system ? `${system.apiResponseTime}${system.apiResponseUnit || 's'}` : '—'}
          color="#2d9a8a"
        />
        <MetricCard
          icon="🟢" label="System Uptime"
          value={system
            ? (system.uptimeDays > 0
                ? `${system.uptimeDays}d ${system.uptimeHours}h`
                : `${system.uptimeHours}h`)
            : '—'}
          color="#34a87a"
        />
        <MetricCard icon="📊" label="TAM Overall Score" value={allData.tam?.overallScore ? `${allData.tam.overallScore}/5` : '—'} color="#c4893a" />
      </div>
      <div className="rounded-2xl p-5" style={{ background: 'rgba(79,93,200,0.03)', border: '1px solid rgba(79,93,200,0.10)' }}>
        <h4 className="text-xs font-bold text-primary-400 mb-3">🧪 Module Health Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'AI Chatbot', status: chatbot?.responseAccuracy > 70 ? 'good' : 'warn' },
            { label: 'Hybrid RAG', status: allData.rag?.hybridRetrievalAccuracy > 70 ? 'good' : 'warn' },
            { label: 'Assignment AI', status: allData.assignments?.total > 0 ? 'good' : 'info' },
            { label: 'Notes Generator', status: allData.notes?.total > 0 ? 'good' : 'info' },
            { label: 'Study Planner', status: allData.studyPlanner?.totalPlansGenerated > 0 ? 'good' : 'info' },
            { label: 'Research AI', status: allData.research?.totalResearches > 0 ? 'good' : 'info' },
            { label: 'Support Bot', status: allData.support?.resolutionAccuracy > 60 ? 'good' : 'warn' },
            { label: 'Security', status: security?.otpSuccessRate > 80 ? 'good' : 'warn' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-2 text-xs">
              <span style={{ color: m.status === 'good' ? '#34a87a' : m.status === 'warn' ? '#c4893a' : '#8b94e0' }}>●</span>
              <span className="text-white/60">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── MAIN PAGE ────────────────────────────────────────────────
export const AIEvaluationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [sectionData, setSectionData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchSection = useCallback(async (section: Section) => {
    if (sectionData[section] || loading[section]) return;
    setLoading(prev => ({ ...prev, [section]: true }));
    try {
      let res: any;
      switch (section) {
        case 'chatbot':       res = await aiEvaluationService.getChatbot(); break;
        case 'rag':           res = await aiEvaluationService.getRAG(); break;
        case 'explain':       res = await aiEvaluationService.getExplain(); break;
        case 'assignments':   res = await aiEvaluationService.getAssignments(); break;
        case 'notes':         res = await aiEvaluationService.getNotes(); break;
        case 'study-planner': res = await aiEvaluationService.getStudyPlanner(); break;
        case 'research':      res = await aiEvaluationService.getResearch(); break;
        case 'support-bot':   res = await aiEvaluationService.getSupportBot(); break;
        case 'communication': res = await aiEvaluationService.getCommunication(); break;
        case 'faculty':       res = await aiEvaluationService.getFaculty(); break;
        case 'students':      res = await aiEvaluationService.getStudents(); break;
        case 'system':        res = await aiEvaluationService.getSystem(); break;
        case 'security':      res = await aiEvaluationService.getSecurity(); break;
        case 'tam':           res = await aiEvaluationService.getTAM(); break;
        default: return;
      }
      setSectionData(prev => ({ ...prev, [section]: res?.data?.data }));
    } catch (err) {
      toast.error(`Failed to load ${section} metrics`);
    } finally {
      setLoading(prev => ({ ...prev, [section]: false }));
    }
  }, [sectionData, loading]);

  // Preload overview data in parallel
  useEffect(() => {
    const overviewSections: Section[] = ['chatbot', 'system', 'students', 'security', 'tam'];
    overviewSections.forEach(s => fetchSection(s));
  }, []);

  useEffect(() => {
    if (activeSection !== 'overview' && activeSection !== 'reports') {
      fetchSection(activeSection);
    }
  }, [activeSection]);

  const renderContent = () => {
    if (activeSection === 'overview') {
      return <OverviewPanel allData={{
        chatbot: sectionData.chatbot,
        system: sectionData.system,
        students: sectionData.students,
        security: sectionData.security,
        tam: sectionData.tam,
        rag: sectionData.rag,
        assignments: sectionData.assignments,
        notes: sectionData.notes,
        studyPlanner: sectionData['study-planner'],
        research: sectionData.research,
        support: sectionData['support-bot'],
      }} />;
    }
    if (activeSection === 'reports') {
      return <ReportsPanel allData={sectionData} />;
    }
    const d = sectionData[activeSection];
    if (loading[activeSection]) return <Spinner />;
    if (!d) return <div className="text-center py-16 text-white/30 text-sm">No data loaded yet</div>;

    switch (activeSection) {
      case 'chatbot':       return <ChatbotPanel data={d} />;
      case 'rag':           return <RAGPanel data={d} />;
      case 'explain':       return <ExplainPanel data={d} />;
      case 'assignments':   return <AssignmentPanel data={d} />;
      case 'notes':         return <NotesPanel data={d} />;
      case 'study-planner': return <StudyPlannerPanel data={d} />;
      case 'research':      return <ResearchPanel data={d} />;
      case 'support-bot':   return <SupportBotPanel data={d} />;
      case 'communication': return <CommunicationPanel data={d} />;
      case 'faculty':       return <FacultyPanel data={d} />;
      case 'students':      return <StudentPanel data={d} />;
      case 'system':        return <SystemPanel data={d} />;
      case 'security':      return <SecurityPanel data={d} />;
      case 'tam':           return <TAMPanel data={d} />;
      default:              return null;
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Side Nav */}
      <div
        className={`flex-shrink-0 h-full flex flex-col overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'w-52' : 'w-12'}`}
        style={{ background: 'rgba(10,11,18,0.8)', borderRight: '1px solid rgba(255,255,255,0.06)', scrollbarWidth: 'thin' }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center h-12 w-full text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-left transition-all flex-shrink-0 ${activeSection === s.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            style={{
              background: activeSection === s.id ? 'rgba(79,93,200,0.09)' : 'transparent',
              borderLeft: activeSection === s.id ? '2px solid #4f5dc8' : '2px solid transparent',
              minWidth: 0,
            }}
          >
            <span className="text-base flex-shrink-0">{s.icon}</span>
            {sidebarOpen && <span className="text-[11px] font-medium truncate">{s.label}</span>}
            {sidebarOpen && loading[s.id] && (
              <span className="ml-auto w-3 h-3 border border-primary-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ background: 'rgba(10,11,18,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-sm font-bold text-white">🧪 AI Evaluation & Performance Dashboard</h1>
            <p className="text-[10px] text-white/30">Super Admin Only · Real-time analytics from live database</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
            <button
              onClick={() => {
                setSectionData({});
                toast.success('Data refreshed');
              }}
              className="text-[10px] px-3 py-1.5 rounded-lg transition-all text-white/50 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              🔄 Refresh All
            </button>
          </div>
        </div>

        {/* Section Nav Pills (horizontal scroll) */}
        <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all"
              style={{
                background: activeSection === s.id ? 'rgba(79,93,200,0.10)' : 'rgba(255,255,255,0.03)',
                border: activeSection === s.id ? '1px solid rgba(79,93,200,0.32)' : '1px solid rgba(255,255,255,0.05)',
                color: activeSection === s.id ? '#8b94e0' : 'rgba(255,255,255,0.4)',
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
