import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Document, Course } from '../../types';
import { documentService } from '../../services/document.service';
import { formatFileSize } from '../../utils/uuid';

interface DocumentUploaderProps {
  courses: Course[];
  onUploaded: (doc: Document) => void;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ courses, onUploaded }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((f) => ({ file: f, progress: 0, status: 'pending' as const }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'audio/mpeg': ['.mp3', '.mpeg'],
      'audio/wav': ['.wav'],
      'audio/x-m4a': ['.m4a'],
      'audio/webm': ['.webm'],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const uploadAll = async () => {
    if (!selectedCourse) { toast.error('Please select a course'); return; }
    if (uploadFiles.length === 0) { toast.error('Please add files'); return; }

    for (let i = 0; i < uploadFiles.length; i++) {
      const uf = uploadFiles[i];
      if (uf.status !== 'pending') continue;

      setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));

      try {
        const doc = await documentService.upload(uf.file, selectedCourse, (progress) => {
          setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, progress } : f));
        });
        setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'done', progress: 100 } : f));
        onUploaded(doc);
        toast.success(`${uf.file.name} uploaded!`);
      } catch (err: any) {
        setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.response?.data?.message || 'Upload failed' } : f));
        toast.error(`Failed to upload ${uf.file.name}`);
      }
    }
  };

  const removeFile = (i: number) => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {/* Course Selector */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/60">Upload to Course</label>
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="input-field text-white">
          <option value="" className="bg-[#1a1d27]">Select course...</option>
          {courses.map(c => <option key={c._id} value={c._id} className="bg-[#1a1d27]">{c.title} ({c.code})</option>)}
        </select>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all
        ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'}`}>
        <input {...getInputProps()} />
        <div className="mb-3 text-4xl">{isDragActive ? '📂' : '📁'}</div>
        <p className="text-sm font-medium text-white/70">
          {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="mt-1 text-xs text-white/35">Supports PDF, DOCX, PPTX, TXT, MP3, WAV, M4A, WEBM · Max 50MB each</p>
      </div>

      {/* File List */}
      <AnimatePresence>
        {uploadFiles.map((uf, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
            className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="text-xl">
                {uf.file.name.endsWith('.pdf') ? '📄' :
                 uf.file.name.endsWith('.docx') || uf.file.name.endsWith('.doc') ? '📝' :
                 uf.file.name.endsWith('.pptx') ? '📊' :
                 uf.file.name.endsWith('.txt') ? '📃' : '🎵'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white">{uf.file.name}</p>
                  <span className="flex-shrink-0 text-xs text-white/40">{formatFileSize(uf.file.size)}</span>
                </div>
                {uf.status === 'uploading' && (
                  <div className="progress-bar mt-2"><div className="progress-fill" style={{ width: `${uf.progress}%` }} /></div>
                )}
                {uf.status === 'done' && <p className="mt-1 text-xs text-green-400">✅ Uploaded successfully</p>}
                {uf.status === 'error' && <p className="mt-1 text-xs text-red-400">❌ {uf.error}</p>}
              </div>
              {uf.status === 'pending' && (
                <button onClick={() => removeFile(i)} className="text-white/30 hover:text-red-400 transition-colors text-sm">✕</button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {uploadFiles.some(f => f.status === 'pending') && (
        <button onClick={uploadAll} className="btn-primary w-full">
          🚀 Upload {uploadFiles.filter(f => f.status === 'pending').length} File(s)
        </button>
      )}
    </div>
  );
};
