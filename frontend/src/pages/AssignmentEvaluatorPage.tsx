import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';
import { courseService } from '../services/course.service';
import { assignmentEvaluationService } from '../services/assignment-evaluation.service';
import { Course } from '../types';
import { jsPDF } from 'jspdf';

interface EvaluationReport {
  _id: string;
  fileName: string;
  courseId: {
    _id: string;
    title: string;
    code: string;
  };
  evaluation: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    missingConcepts: string[];
    suggestedCorrections: {
      question: string;
      currentAnswer: string;
      suggestion: string;
      conceptMissing: string;
    }[];
    predefinedCriteria: {
      criterion: string;
      maxScore: number;
      score: number;
      comments: string;
    }[];
  };
  createdAt: string;
}

export const AssignmentEvaluatorPage: React.FC = () => {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [history, setHistory] = useState<EvaluationReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<EvaluationReport | null>(null);

  // Upload/Evaluation States
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  // UI state for accordion
  const [expandedCorrectionIndex, setExpandedCorrectionIndex] = useState<number | null>(null);

  const isStudent = user?.role === 'student';

  const loadCourses = useCallback(async () => {
    try {
      const list = isStudent ? await courseService.getMy() : await courseService.getAll();
      setCourses(list);
      if (list.length > 0) {
        setSelectedCourseId(list[0]._id);
      }
    } catch {
      toast.error('Failed to load courses.');
    }
  }, [isStudent]);

  const loadHistory = useCallback(async (courseId: string) => {
    try {
      const list = await assignmentEvaluationService.getHistory(courseId);
      setHistory(list);
    } catch {
      toast.error('Failed to load evaluation history.');
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (selectedCourseId) {
      loadHistory(selectedCourseId);
      setSelectedReport(null);
      setFile(null);
    }
  }, [selectedCourseId, loadHistory]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleEvaluate = async () => {
    if (!file) {
      toast.error('Please upload an assignment file.');
      return;
    }
    if (!selectedCourseId) {
      toast.error('Please select a course.');
      return;
    }

    setIsEvaluating(true);
    setUploadProgress(0);
    setStatusText('Uploading assignment document...');

    try {
      // Step 1: Upload and monitor progress
      const result = await assignmentEvaluationService.evaluate(
        file,
        selectedCourseId,
        (progress) => {
          setUploadProgress(progress);
          if (progress === 100) {
            setStatusText('🤖 Text extraction complete. Running RAG semantic search...');
          }
        }
      );

      setStatusText('📚 Comparing with lecture notes and syllabus database...');
      
      // Simulate small delays for dynamic status text updates
      await new Promise(r => setTimeout(r, 1200));
      setStatusText('🧠 Reviewing answers against grading rubrics...');
      await new Promise(r => setTimeout(r, 1200));
      setStatusText('✍️ Formatting correction feedback report...');
      await new Promise(r => setTimeout(r, 1000));

      toast.success('Assignment evaluated successfully!');
      setSelectedReport(result);
      // Reload history to insert new submission
      loadHistory(selectedCourseId);
      setFile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to evaluate assignment.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDownloadReport = (report: EvaluationReport) => {
    const doc = new jsPDF();
    let y = 20;

    // Header Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(79, 99, 255); // Brand color: Blue
    doc.text('AI Assignment Evaluation Report', 14, y);
    y += 10;

    // Metadata Details
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Course: ${report.courseId.code} - ${report.courseId.title}`, 14, y);
    y += 5;
    doc.text(`File Evaluated: ${report.fileName}`, 14, y);
    y += 5;
    doc.text(`Evaluation Date: ${new Date(report.createdAt).toLocaleDateString()}`, 14, y);
    y += 5;
    doc.setFont('Helvetica', 'bold');
    doc.text(`Overall Score: ${report.evaluation.score}/100`, 14, y);
    y += 8;

    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, 196, y);
    y += 10;

    // General Summary Feedback
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Overall Feedback Summary', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const splitFeedback = doc.splitTextToSize(report.evaluation.feedback, 182);
    doc.text(splitFeedback, 14, y);
    y += (splitFeedback.length * 5) + 8;

    // Grading Rubrics breakdown
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text('Rubric Score Breakdown', 14, y);
    y += 6;
    doc.setFontSize(10);
    report.evaluation.predefinedCriteria.forEach((crit) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('Helvetica', 'bold');
      doc.text(`${crit.criterion}: ${crit.score}/${crit.maxScore}`, 14, y);
      y += 5;
      doc.setFont('Helvetica', 'normal');
      const splitComment = doc.splitTextToSize(crit.comments || '', 182);
      doc.text(splitComment, 14, y);
      y += (splitComment.length * 5) + 6;
    });

    y += 4;

    // Strengths
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text('Key Strengths & Competencies', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    report.evaluation.strengths.forEach((str) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`✓ ${str}`, 14, y);
      y += 6;
    });

    y += 4;

    // Areas for Improvement
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text('Suggested Areas for Improvement', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    report.evaluation.improvements.forEach((imp) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`⚠ ${imp}`, 14, y);
      y += 6;
    });

    y += 4;

    // Missing Concepts
    if (report.evaluation.missingConcepts?.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.text('Missing Course Concepts', 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      report.evaluation.missingConcepts.forEach((concept) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(`• ${concept}`, 14, y);
        y += 6;
      });
      y += 4;
    }

    // Detailed Corrections
    if (report.evaluation.suggestedCorrections?.length > 0) {
      doc.addPage();
      y = 20;
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.text('Detailed Question Corrections', 14, y);
      y += 8;

      report.evaluation.suggestedCorrections.forEach((corr, index) => {
        if (y > 230) { doc.addPage(); y = 20; }
        
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.text(`${index + 1}. Topic/Question: ${corr.question}`, 14, y);
        y += 5;

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'bold');
        doc.text('Your Answer Summary:', 16, y);
        y += 5;
        doc.setFont('Helvetica', 'normal');
        const splitAns = doc.splitTextToSize(corr.currentAnswer, 178);
        doc.text(splitAns, 16, y);
        y += (splitAns.length * 5) + 2;

        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFont('Helvetica', 'bold');
        doc.text('Missing Concepts Identified:', 16, y);
        y += 5;
        doc.setFont('Helvetica', 'normal');
        doc.text(corr.conceptMissing || 'N/A', 16, y);
        y += 7;

        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFont('Helvetica', 'bold');
        doc.text('AI Evaluator Suggestion:', 16, y);
        y += 5;
        doc.setFont('Helvetica', 'normal');
        const splitSugg = doc.splitTextToSize(corr.suggestion, 178);
        doc.text(splitSugg, 16, y);
        y += (splitSugg.length * 5) + 10;

        doc.setDrawColor(240, 240, 240);
        doc.line(14, y - 5, 196, y - 5);
      });
    }

    doc.save(`Assignment_Evaluation_${report.courseId.code}_${new Date(report.createdAt).toISOString().split('T')[0]}.pdf`);
    toast.success('Report PDF downloaded!');
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#48bb78'; // Green
    if (score >= 65) return '#ecc94b'; // Yellow
    return '#f56565'; // Red
  };

  return (
    <div className="p-4 space-y-4 md:p-6 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">📝 AI Assignment Evaluator</h1>
        <p className="mt-0.5 text-xs md:text-sm text-white/40">
          Upload draft assignments in PDF/DOCX and receive instant, constructive rubric grading relative to course materials
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Panel */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Setup & Upload Section (Only display if not showing details or requesting a new evaluation) */}
          {!selectedReport && (
            <div className="glass-card p-5 space-y-4">
              <h2 className="text-sm font-bold text-white/80">Evaluate New Assignment</h2>

              {/* Course selection */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-white/60">Active Target Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="input-field text-white"
                  disabled={isEvaluating}
                >
                  <option value="" className="bg-[#111318]">Select Course...</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id} className="bg-[#111318]">
                      {course.code} - {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all
                  ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'}
                  ${isEvaluating ? 'pointer-events-none opacity-55' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="mb-3 text-4xl">📄</div>
                <p className="text-sm font-semibold text-white/70">
                  {isDragActive ? 'Drop assignment here' : 'Drag & drop draft assignment, or click to browse'}
                </p>
                <p className="mt-1 text-xs text-white/35">Supports PDF, DOC, DOCX up to 10MB</p>
              </div>

              {/* File details & evaluate action */}
              {file && !isEvaluating && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-md">{file.name}</p>
                      <p className="text-[10px] text-white/35">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-xs text-white/40 hover:text-red-400 font-bold px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Evaluator Loading Block */}
              {isEvaluating && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 font-semibold">{statusText}</span>
                    <span className="text-primary-400 font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {file && !isEvaluating && (
                <button
                  onClick={handleEvaluate}
                  className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  🚀 Evaluate Draft Assignment
                </button>
              )}
            </div>
          )}

          {/* Results Details Display */}
          {selectedReport && (
            <div className="space-y-6">
              {/* Back to evaluation form */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => { setSelectedReport(null); setFile(null); }}
                  className="btn-secondary px-3.5 py-2 text-xs font-semibold"
                >
                  ← Evaluate Another Document
                </button>

                <button
                  onClick={() => handleDownloadReport(selectedReport)}
                  className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  📥 Download Report PDF
                </button>
              </div>

              {/* Score card & Grade block */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="glass-card p-5 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Overall Score</div>
                  <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-4 border-white/5" style={{ borderColor: `${getScoreColor(selectedReport.evaluation.score)}22` }}>
                    <div className="absolute text-3xl font-black text-white">{selectedReport.evaluation.score}</div>
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke={getScoreColor(selectedReport.evaluation.score)}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={2 * Math.PI * 48 * (1 - selectedReport.evaluation.score / 100)}
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-[10px] text-white/50">Compared with Lecture Syllabus</div>
                </div>

                <div className="glass-card p-5 md:col-span-2 space-y-3">
                  <h3 className="text-xs uppercase font-bold text-white/40 tracking-wider">Overall Feedback</h3>
                  <p className="text-xs md:text-sm text-white/80 leading-relaxed font-medium">
                    {selectedReport.evaluation.feedback}
                  </p>
                  <div className="text-[10px] text-white/30 italic">
                    Evaluated File: {selectedReport.fileName} • {new Date(selectedReport.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Criteria detail list */}
              <div className="glass-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-white/85">Predefined Grading Rubrics</h3>
                <div className="space-y-3.5">
                  {selectedReport.evaluation.predefinedCriteria.map((crit, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white/90">{crit.criterion}</span>
                        <span className="font-black text-primary-400">{crit.score} / {crit.maxScore}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(crit.score / crit.maxScore) * 100}%` }} />
                      </div>
                      <p className="text-[11px] text-white/45">{crit.comments}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Lists Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-card p-5 space-y-3">
                  <h3 className="text-xs uppercase font-black text-green-400 tracking-wider">✓ Key Strengths</h3>
                  <ul className="space-y-2">
                    {selectedReport.evaluation.strengths.map((str, i) => (
                      <li key={i} className="text-xs text-white/80 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-card p-5 space-y-3">
                  <h3 className="text-xs uppercase font-black text-amber-400 tracking-wider">⚠ Areas for Improvement</h3>
                  <ul className="space-y-2">
                    {selectedReport.evaluation.improvements.map((imp, i) => (
                      <li key={i} className="text-xs text-white/80 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">⚠</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Missing concepts */}
              {selectedReport.evaluation.missingConcepts?.length > 0 && (
                <div className="glass-card p-5 border border-red-500/10 bg-red-500/[0.01] space-y-3">
                  <h3 className="text-xs uppercase font-black text-red-400 tracking-wider">🚨 Highlighted Missing Concepts</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.evaluation.missingConcepts.map((concept, i) => (
                      <span key={i} className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-500/10 text-red-300 border border-red-500/15">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Corrections Accordion */}
              {selectedReport.evaluation.suggestedCorrections?.length > 0 && (
                <div className="glass-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white/85">Detailed Suggested Corrections</h3>
                  <div className="space-y-2">
                    {selectedReport.evaluation.suggestedCorrections.map((corr, idx) => (
                      <div key={idx} className="rounded-xl border border-white/[0.04] overflow-hidden">
                        <button
                          onClick={() => setExpandedCorrectionIndex(expandedCorrectionIndex === idx ? null : idx)}
                          className="w-full flex items-center justify-between p-3.5 bg-white/[0.01] hover:bg-white/[0.02] text-left transition-colors"
                        >
                          <span className="text-xs font-semibold text-white/90 truncate max-w-[80%]">
                            {idx + 1}. {corr.question}
                          </span>
                          <span className="text-xs text-white/30">
                            {expandedCorrectionIndex === idx ? '▲' : '▼'}
                          </span>
                        </button>

                        <AnimatePresence>
                          {expandedCorrectionIndex === idx && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden bg-[#0d0e13]"
                            >
                              <div className="p-4 space-y-3.5 text-xs border-t border-white/[0.03]">
                                <div>
                                  <span className="block text-[10px] uppercase font-bold text-white/30 mb-0.5">Your Answer Summary</span>
                                  <p className="text-white/75">{corr.currentAnswer}</p>
                                </div>
                                {corr.conceptMissing && (
                                  <div>
                                    <span className="block text-[10px] uppercase font-bold text-red-400/80 mb-0.5">Missing Concept</span>
                                    <p className="text-red-300/90 font-medium">{corr.conceptMissing}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="block text-[10px] uppercase font-bold text-green-400/80 mb-0.5">AI Recommended Suggestion</span>
                                  <p className="text-white/85 bg-green-500/[0.02] border border-green-500/10 p-3 rounded-lg leading-relaxed">
                                    {corr.suggestion}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sidebar History log */}
        <div className="space-y-4">
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
              <h3 className="text-xs uppercase font-black text-white/50 tracking-wider">Evaluation History</h3>
              {selectedReport && (
                <button
                  onClick={() => { setSelectedReport(null); setFile(null); }}
                  className="text-[10px] font-bold text-primary-400 hover:text-primary-300"
                >
                  + New
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {history.map((report) => (
                <button
                  key={report._id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center gap-2
                    ${selectedReport?._id === report._id
                      ? 'bg-primary-500/15 border-primary-500/40'
                      : 'bg-white/[0.01] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]'}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[130px]">{report.fileName}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">{new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-black px-2 py-1 rounded bg-white/5 text-white/80" style={{ color: getScoreColor(report.evaluation.score) }}>
                    {report.evaluation.score}%
                  </span>
                </button>
              ))}

              {history.length === 0 && (
                <div className="text-center py-8 text-xs text-white/20">No draft evaluations yet.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
