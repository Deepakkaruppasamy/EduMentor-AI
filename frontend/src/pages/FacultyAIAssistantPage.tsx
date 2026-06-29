import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import { Loader } from '../components/common/Loader';

type ToolType = 'question_paper' | 'assignment' | 'mcq' | 'rubric' | 'lab_exercise';

interface ToolInfo {
  id: ToolType;
  label: string;
  icon: string;
  description: string;
}

const TOOLS: ToolInfo[] = [
  { id: 'question_paper', label: 'Question Paper', icon: '📝', description: 'Create comprehensive test and exam papers.' },
  { id: 'assignment', label: 'Assignment', icon: '📋', description: 'Design coursework instructions and tasks.' },
  { id: 'mcq', label: 'MCQ Generator', icon: '✍️', description: 'Generate diagnostic multiple choice questions.' },
  { id: 'rubric', label: 'Grading Rubric', icon: '📊', description: 'Create clean evaluation grids and criteria.' },
  { id: 'lab_exercise', label: 'Lab Exercise', icon: '💻', description: 'Design coding practicals and test cases.' },
];

export const FacultyAIAssistantPage: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('question_paper');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');

  // Form States
  const [qpTopic, setQpTopic] = useState('');
  const [qpDifficulty, setQpDifficulty] = useState('medium');
  const [qpDuration, setQpDuration] = useState('3 Hours');
  const [qpMarks, setQpMarks] = useState('Part A: 5 questions x 2 marks, Part B: 5 questions x 10 marks');

  const [asmTopic, setAsmTopic] = useState('');
  const [asmObjectives, setAsmObjectives] = useState('');
  const [asmInstructions, setAsmInstructions] = useState('');
  const [asmSubmission, setAsmSubmission] = useState('Submit a PDF report via the portal.');

  const [mcqTopic, setMcqTopic] = useState('');
  const [mcqCount, setMcqCount] = useState(5);
  const [mcqDifficulty, setMcqDifficulty] = useState('medium');

  const [rubTitle, setRubTitle] = useState('');
  const [rubCriteria, setRubCriteria] = useState('Correctness, Execution Time, Code Style, Documentation');
  const [rubScale, setRubScale] = useState('Excellent, Good, Satisfactory, Poor');

  const [labTopic, setLabTopic] = useState('');
  const [labLanguage, setLabLanguage] = useState('Python');
  const [labObjectives, setLabObjectives] = useState('');
  const [labInstructions, setLabInstructions] = useState('');
  const [labExpected, setLabExpected] = useState('');

  const getOptions = () => {
    switch (activeTool) {
      case 'question_paper':
        return { topic: qpTopic, difficulty: qpDifficulty, duration: qpDuration, marks: qpMarks };
      case 'assignment':
        return { topic: asmTopic, objectives: asmObjectives, instructions: asmInstructions, submission: asmSubmission };
      case 'mcq':
        return { topic: mcqTopic, count: mcqCount, difficulty: mcqDifficulty };
      case 'rubric':
        return { title: rubTitle, criteria: rubCriteria, scale: rubScale };
      case 'lab_exercise':
        return { topic: labTopic, language: labLanguage, objectives: labObjectives, instructions: labInstructions, expectedOutput: labExpected };
      default:
        return {};
    }
  };

  const validateForm = () => {
    switch (activeTool) {
      case 'question_paper':
        return !!qpTopic.trim();
      case 'assignment':
        return !!asmTopic.trim() && !!asmInstructions.trim();
      case 'mcq':
        return !!mcqTopic.trim();
      case 'rubric':
        return !!rubTitle.trim();
      case 'lab_exercise':
        return !!labTopic.trim() && !!labInstructions.trim();
      default:
        return false;
    }
  };

  const handleGenerate = async () => {
    if (!validateForm()) {
      toast.error('Please fill in the required fields.');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    try {
      const response = await api.post('/faculty/assistant/generate', {
        toolType: activeTool,
        options: getOptions()
      });
      if (response.data.success) {
        setGeneratedContent(response.data.content);
        toast.success('Material generated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Copied to clipboard!');
  };

  const downloadMarkdown = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `faculty_${activeTool}_material.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Markdown file downloaded!');
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const titleText = `${activeTool.toUpperCase().replace('_', ' ')} GENERATION`;
      doc.setFont('helvetica', 'bold');
      doc.text(titleText, 14, 20);
      doc.line(14, 22, 196, 22);
      
      doc.setFont('helvetica', 'normal');
      // Simple layout splitting lines to prevent overflow
      const splitText = doc.splitTextToSize(generatedContent.replace(/#/g, ''), 180);
      
      let y = 30;
      splitText.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 14, y);
        y += 6;
      });
      
      doc.save(`faculty_${activeTool}_material.pdf`);
      toast.success('PDF document downloaded!');
    } catch (e) {
      toast.error('PDF generation failed.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 h-screen flex flex-col overflow-hidden">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <span>🧙‍♂️</span> Faculty AI Assistant & Copilot
        </h1>
        <p className="mt-0.5 text-xs md:text-sm text-white/40">Design assessments, assignments, question banks, and lab guides instantly</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Side: Forms */}
        <div className="w-full lg:w-[400px] flex-shrink-0 flex flex-col bg-[#0b0c10]/40 border border-white/5 rounded-2xl p-5 overflow-y-auto">
          {/* Tool Chooser */}
          <div className="space-y-2 mb-6">
            <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Select AI Tool</label>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id);
                    setGeneratedContent('');
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${activeTool === tool.id ? 'bg-primary-600/20 border-primary-500/40 text-primary-300' : 'bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="text-base">{tool.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{tool.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-white/5 mb-6" />

          {/* Form Fields container */}
          <div className="flex-1 space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-white/70 tracking-wider flex items-center gap-1.5">
              <span>🔧</span> {TOOLS.find(t => t.id === activeTool)?.label} Parameters
            </h3>

            {activeTool === 'question_paper' && (
              <div className="space-y-3 text-left">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Topic *</label>
                  <input type="text" value={qpTopic} onChange={e => setQpTopic(e.target.value)} required
                    placeholder="e.g. Database Normalization & SQL Joins" className="input-field py-2 text-xs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Difficulty</label>
                  <select value={qpDifficulty} onChange={e => setQpDifficulty(e.target.value)} className="input-field py-2 text-xs">
                    <option value="easy" className="bg-[#13151f]">Easy (Conceptual)</option>
                    <option value="medium" className="bg-[#13151f]">Medium (Balanced)</option>
                    <option value="hard" className="bg-[#13151f]">Hard (Analytical)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Allowed Duration</label>
                  <input type="text" value={qpDuration} onChange={e => setQpDuration(e.target.value)}
                    placeholder="e.g. 3 Hours" className="input-field py-2 text-xs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Marks & Questions Pattern</label>
                  <textarea value={qpMarks} onChange={e => setQpMarks(e.target.value)} rows={2}
                    placeholder="e.g. Part A: 5 questions x 2 marks, Part B: 5 questions x 10 marks" className="input-field py-2 text-xs resize-none" />
                </div>
              </div>
            )}

            {activeTool === 'assignment' && (
              <div className="space-y-3 text-left">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Assignment Topic *</label>
                  <input type="text" value={asmTopic} onChange={e => setAsmTopic(e.target.value)} required
                    placeholder="e.g. Deadlock Avoidance Algorithms" className="input-field py-2 text-xs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Learning Objectives</label>
                  <textarea value={asmObjectives} onChange={e => setAsmObjectives(e.target.value)} rows={2}
                    placeholder="e.g. Evaluate resource graphs and implement Banker's Algorithm" className="input-field py-2 text-xs resize-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Assignment Task Instructions *</label>
                  <textarea value={asmInstructions} onChange={e => setAsmInstructions(e.target.value)} rows={3} required
                    placeholder="e.g. Provide a step-by-step description of process state allocations and calculate lock statuses." className="input-field py-2 text-xs resize-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Submission Guidelines</label>
                  <input type="text" value={asmSubmission} onChange={e => setAsmSubmission(e.target.value)}
                    placeholder="e.g. PDF document, maximum 5 pages" className="input-field py-2 text-xs" />
                </div>
              </div>
            )}

            {activeTool === 'mcq' && (
              <div className="space-y-3 text-left">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">MCQ Topic *</label>
                  <input type="text" value={mcqTopic} onChange={e => setMcqTopic(e.target.value)} required
                    placeholder="e.g. OSI Model Layer Functions" className="input-field py-2 text-xs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Question Count</label>
                  <input type="number" min={1} max={20} value={mcqCount} onChange={e => setMcqCount(Number(e.target.value))}
                    className="input-field py-2 text-xs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Difficulty</label>
                  <select value={mcqDifficulty} onChange={e => setMcqDifficulty(e.target.value)} className="input-field py-2 text-xs">
                    <option value="easy" className="bg-[#13151f]">Easy</option>
                    <option value="medium" className="bg-[#13151f]">Medium</option>
                    <option value="hard" className="bg-[#13151f]">Hard</option>
                  </select>
                </div>
              </div>
            )}

            {activeTool === 'rubric' && (
              <div className="space-y-3 text-left">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Assignment/Project Title *</label>
                  <input type="text" value={rubTitle} onChange={e => setRubTitle(e.target.value)} required
                    placeholder="e.g. Relational Database Design Project" className="input-field py-2 text-xs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Assessment Criteria (comma-separated)</label>
                  <textarea value={rubCriteria} onChange={e => setRubCriteria(e.target.value)} rows={2}
                    placeholder="e.g. Correctness, Code Quality, Documentation" className="input-field py-2 text-xs resize-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Grading Scale Columns (comma-separated)</label>
                  <input type="text" value={rubScale} onChange={e => setRubScale(e.target.value)}
                    placeholder="e.g. Excellent, Good, Satisfactory, Poor" className="input-field py-2 text-xs" />
                </div>
              </div>
            )}

            {activeTool === 'lab_exercise' && (
              <div className="space-y-3 text-left">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Lab Exercise Topic *</label>
                  <input type="text" value={labTopic} onChange={e => setLabTopic(e.target.value)} required
                    placeholder="e.g. Binary Search Tree Insertion" className="input-field py-2 text-xs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Programming Language</label>
                  <select value={labLanguage} onChange={e => setLabLanguage(e.target.value)} className="input-field py-2 text-xs">
                    <option value="Python" className="bg-[#13151f]">Python</option>
                    <option value="Java" className="bg-[#13151f]">Java</option>
                    <option value="C++" className="bg-[#13151f]">C++</option>
                    <option value="JavaScript" className="bg-[#13151f]">JavaScript</option>
                    <option value="SQL" className="bg-[#13151f]">SQL</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Lab Objectives</label>
                  <textarea value={labObjectives} onChange={e => setLabObjectives(e.target.value)} rows={2}
                    placeholder="e.g. Practice pointer links manipulation and BST binary traversal algorithms" className="input-field py-2 text-xs resize-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Exercise Task Details *</label>
                  <textarea value={labInstructions} onChange={e => setLabInstructions(e.target.value)} rows={3} required
                    placeholder="e.g. Implement TreeNode class and traverse tree using DFS." className="input-field py-2 text-xs resize-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Expected Output / Test Cases</label>
                  <input type="text" value={labExpected} onChange={e => setLabExpected(e.target.value)}
                    placeholder="e.g. Input: [10, 5, 20] -> Inorder: 5 10 20" className="input-field py-2 text-xs" />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !validateForm()}
            className="btn-primary w-full mt-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Compiling Materials...
              </>
            ) : (
              <>
                <span>✨</span> Generate Material
              </>
            )}
          </button>
        </div>

        {/* Right Side: Preview */}
        <div className="flex-1 flex flex-col bg-[#0b0c10]/40 border border-white/5 rounded-2xl p-5 min-w-0 min-h-0">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">AI Material Preview</span>
            {generatedContent && (
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="text-[10px] py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all flex items-center gap-1.5">
                  📋 Copy
                </button>
                <button onClick={downloadMarkdown} className="text-[10px] py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all flex items-center gap-1.5">
                  📥 Markdown
                </button>
                <button onClick={downloadPDF} className="text-[10px] py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all flex items-center gap-1.5">
                  📕 PDF
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 text-left bg-white/[0.01] border border-white/5 rounded-xl p-6">
            {isGenerating ? (
              <Loader message="EduMentor AI is constructing your customized curriculum materials..." />
            ) : generatedContent ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{generatedContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center text-white/20">
                <span className="text-4xl mb-2">🧙‍♂️</span>
                <span className="text-xs font-semibold">Your generated materials will appear here.</span>
                <span className="text-[10px] text-white/10 mt-1">Configure the parameters on the left and click "Generate Material"</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
