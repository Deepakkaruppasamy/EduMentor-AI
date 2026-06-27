import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { courseService } from '../services/course.service';
import { Course } from '../types';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

interface ReportOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [reportType, setReportType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [rawData, setRawData] = useState<any[]>([]);

  // Load courses for faculty
  useEffect(() => {
    if (user?.role === 'faculty' || user?.role === 'admin') {
      courseService.getAll().then(res => {
        setCourses(res);
        if (res.length > 0) {
          setSelectedCourse(res[0]._id);
        }
      });
    }
  }, [user]);

  // Determine report options based on role
  const getReportOptions = (): ReportOption[] => {
    if (user?.role === 'student') {
      return [
        { value: 'student_progress', label: 'Progress Report', description: 'Overall course scores, query averages, and strengths checklist.', icon: '📈' },
        { value: 'student_assignments', label: 'Assignment Report', description: 'Performance and grading overview for homework submissions.', icon: '📋' },
        { value: 'student_quizzes', label: 'Quiz Report', description: 'Detailed list of completed quizzes, scores, and mastery percentages.', icon: '📝' },
      ];
    } else if (user?.role === 'faculty') {
      return [
        { value: 'faculty_course', label: 'Course Report', description: 'Active enrollment volume, class average score, and concept struggles.', icon: '📚' },
        { value: 'faculty_performance', label: 'Performance Report', description: 'Gradebook analytics breakdown of students and risk alert listings.', icon: '🎓' },
      ];
    } else if (user?.role === 'admin') {
      return [
        { value: 'admin_analytics', label: 'University Analytics', description: 'System-wide registration counts, active sessions, and course summaries.', icon: '🏢' },
        { value: 'admin_ai_usage', label: 'AI Usage Audit', description: 'LLM chatbot request count trends, trust metrics, and response speed audit.', icon: '🤖' },
      ];
    }
    return [];
  };

  const options = getReportOptions();

  // Set default report type on load
  useEffect(() => {
    if (options.length > 0 && !reportType) {
      setReportType(options[0].value);
    }
  }, [options, reportType]);

  const handleGenerate = async () => {
    if (!reportType) return;
    setIsGenerating(true);
    setReportContent('');
    setRawData([]);

    try {
      const response = await api.post('/reports/generate', {
        reportType,
        options: {
          courseId: selectedCourse
        }
      });

      if (response.data.success) {
        setReportContent(response.data.content);
        setRawData(response.data.data || []);
        toast.success('Report compiled successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Report compilation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportContent);
    toast.success('Report text copied!');
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`EDUMENTOR AI - ACADEMIC ANALYTICS REPORT`, 14, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()} | User: ${user?.name} (${user?.role?.toUpperCase()})`, 14, 25);
      doc.line(14, 27, 196, 27);
      
      const cleanContent = reportContent.replace(/#/g, '').replace(/\*/g, '');
      const splitText = doc.splitTextToSize(cleanContent, 180);
      let y = 35;
      splitText.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 14, y);
        y += 6;
      });
      
      doc.save(`ai_report_${reportType}.pdf`);
      toast.success('PDF report downloaded!');
    } catch (e) {
      toast.error('PDF generation failed.');
    }
  };

  const downloadExcel = () => {
    if (rawData.length === 0) {
      toast.error('No tabular data available for this report.');
      return;
    }

    try {
      const headers = Object.keys(rawData[0]);
      const csvRows = [
        headers.join(','), // Header row
        ...rawData.map(row => 
          headers.map(fieldName => {
            const val = row[fieldName];
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(',')
        )
      ];
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ai_report_${reportType}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Excel-compatible CSV spreadsheet downloaded!');
    } catch (e) {
      toast.error('Excel download failed.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <span>🖨️</span> AI Report Generator Workspace
        </h1>
        <p className="mt-0.5 text-xs md:text-sm text-white/40">Generate custom summaries, learning streaks, course performance and system audit sheets</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Form Panel */}
        <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col bg-[#0b0c10]/40 border border-white/5 rounded-2xl p-5 overflow-y-auto">
          <div className="space-y-4 flex-1">
            <h3 className="text-xs font-extrabold uppercase text-white/70 tracking-wider">
              1. Choose Report Type
            </h3>

            <div className="space-y-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setReportType(opt.value);
                    setReportContent('');
                    setRawData([]);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${reportType === opt.value ? 'bg-primary-600/10 border-primary-500/40 text-primary-300' : 'bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/5'}`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white">{opt.label}</div>
                    <div className="text-[10px] text-white/40 mt-0.5 leading-normal">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {(user?.role === 'faculty' || (user?.role === 'admin' && (reportType === 'faculty_course' || reportType === 'faculty_performance'))) && (
              <div className="space-y-2 pt-3">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Select Context Course</label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="input-field py-2 text-xs"
                >
                  {courses.map(c => (
                    <option key={c._id} value={c._id} className="bg-[#13151f]">
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !reportType}
            className="btn-primary w-full mt-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Compiling Report...
              </>
            ) : (
              <>
                <span>📊</span> Compile Summary
              </>
            )}
          </button>
        </div>

        {/* Right Preview Panel */}
        <div className="flex-1 flex flex-col bg-[#0b0c10]/40 border border-white/5 rounded-2xl p-5 min-w-0 min-h-0">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Compiled Document Preview</span>
            {reportContent && (
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="text-[10px] py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all flex items-center gap-1.5 font-semibold">
                  📋 Copy text
                </button>
                <button onClick={downloadExcel} className="text-[10px] py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all flex items-center gap-1.5 font-semibold">
                  📊 Export Excel (CSV)
                </button>
                <button onClick={downloadPDF} className="text-[10px] py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all flex items-center gap-1.5 font-semibold font-mono">
                  📕 Download PDF
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 text-left bg-white/[0.01] border border-white/5 rounded-xl p-6">
            {isGenerating ? (
              <div className="h-full flex flex-col justify-center items-center text-white/40 gap-3">
                <div className="h-8 w-8 border-4 border-white/15 border-t-primary-500 rounded-full animate-spin" />
                <span className="text-xs font-semibold animate-pulse">Gathering live databases statistics and synthesizing audit summaries...</span>
              </div>
            ) : reportContent ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{reportContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center text-white/20">
                <span className="text-4xl mb-2">🖨️</span>
                <span className="text-xs font-semibold">Ready to compile document.</span>
                <span className="text-[10px] text-white/10 mt-1">Select the report parameters on the left and click "Compile Summary"</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
