import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DocumentUploader } from '../components/documents/DocumentUploader';
import { documentService } from '../services/document.service';
import { courseService } from '../services/course.service';
import { Document, Course } from '../types';
import { ConceptMap } from '../components/documents/ConceptMap';
import { formatDate, formatFileSize } from '../utils/uuid';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#f6ad55', bg: 'rgba(246,173,85,0.1)' },
  processing: { label: 'Processing', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  completed: { label: 'Ready', color: '#48bb78', bg: 'rgba(72,187,120,0.1)' },
  failed: { label: 'Failed', color: '#fc8181', bg: 'rgba(252,129,129,0.1)' },
};

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');
  const [selectedDocForGuide, setSelectedDocForGuide] = useState<Document | null>(null);

  useEffect(() => {
    Promise.all([documentService.getAll(), courseService.getAll()])
      .then(([docs, crs]) => { setDocuments(docs); setCourses(crs); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleUploaded = (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
  };

  const handleDelete = async (id: string) => {
    try {
      await documentService.delete(id);
      setDocuments(prev => prev.filter(d => d._id !== id));
      toast.success('Document deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = filterCourse ? documents.filter(d => {
    const courseId = typeof d.course === 'string' ? d.course : (d.course as Course)?._id;
    return courseId === filterCourse;
  }) : documents;

  const FILE_ICONS: Record<string, string> = { pdf: '📄', docx: '📝', pptx: '📊', txt: '📃' };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">📁 Document Management</h1>
        <p className="mt-1 text-sm text-white/40">Upload and manage course materials</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Uploader */}
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-white/80">📤 Upload Documents</h2>
          <DocumentUploader courses={courses} onUploaded={handleUploaded} />
        </div>

        {/* Document List */}
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white/80">📋 Documents ({filtered.length})</h2>
            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
              className="input-field py-1.5 text-xs max-w-[180px]">
              <option value="" className="bg-[#1a1d27]">All Courses</option>
              {courses.map(c => <option key={c._id} value={c._id} className="bg-[#1a1d27]">{c.code}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/30">No documents yet</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map((doc, i) => {
                const status = STATUS_CONFIG[doc.processingStatus] || STATUS_CONFIG.pending;
                return (
                  <motion.div key={doc._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-xl flex-shrink-0">{FILE_ICONS[doc.fileType] || '📄'}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{doc.originalName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/30">{formatFileSize(doc.fileSize)}</span>
                        <span className="text-[10px] text-white/20">·</span>
                        <span className="text-[10px] text-white/30">{doc.totalChunks} chunks</span>
                        <span className="text-[10px] text-white/20">·</span>
                        <span className="text-[10px]" style={{ color: status.color }} title={doc.processingError}>{status.label}</span>
                      </div>
                    </div>
                    {doc.processingStatus === 'completed' && (
                      <button onClick={() => setSelectedDocForGuide(doc)}
                        className="btn-secondary px-2 py-1 text-[10px] rounded-lg flex-shrink-0 mr-1 hover:border-primary-500 hover:text-primary-400 transition-colors">
                        📖 Guide
                      </button>
                    )}
                    <button onClick={() => handleDelete(doc._id)}
                      className="text-white/20 hover:text-red-400 transition-colors text-xs flex-shrink-0">✕</button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Study Guide Modal */}
      {selectedDocForGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary-400">AI Generated Study Guide</span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedDocForGuide.originalName}</h3>
              </div>
              <button onClick={() => setSelectedDocForGuide(null)} className="text-white/40 hover:text-white text-lg">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-5 pr-2">
              <div>
                <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-2">📋 Summary Description</h4>
                <p className="text-xs text-white/70 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl whitespace-pre-line font-light">
                  {selectedDocForGuide.summary || 'Summary unavailable. Make sure your Groq API Key is configured.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-2">🗺️ Conceptual Mindmap</h4>
                {selectedDocForGuide.conceptMap ? (
                  <ConceptMap conceptMapText={selectedDocForGuide.conceptMap} />
                ) : (
                  <div className="text-center py-8 rounded-xl border border-dashed border-white/5 text-xs text-white/20">
                    Concept Mindmap outline unavailable.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
