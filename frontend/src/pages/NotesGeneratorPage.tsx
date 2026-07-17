import React, { useState, useEffect } from 'react';
import { notesService } from '../services/notes.service';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { BookmarkButton } from '../components/common/BookmarkButton';
import { recentlyViewedService } from '../services/recently-viewed.service';

const NOTE_TYPES = [
  { value: 'Revision', icon: '📖', desc: 'Key concepts & definitions' },
  { value: 'Short', icon: '⚡', desc: 'Bullet-point summary' },
  { value: 'Detailed', icon: '📚', desc: 'Full explanations & examples' },
  { value: 'CheatSheet', icon: '📄', desc: 'One-page quick reference' },
  { value: 'Formula', icon: '🔢', desc: 'Equations & formulas' },
  { value: 'KeyPoints', icon: '🎯', desc: 'Must-know exam points' },
  { value: 'MindMap', icon: '🕸️', desc: 'Visual concept map' },
  { value: 'ExamTips', icon: '💡', desc: 'Strategy & tips' },
];

export const NotesGeneratorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [courseName, setCourseName] = useState('');
  const [topic, setTopic] = useState('');
  const [noteType, setNoteType] = useState('Revision');
  const [generating, setGenerating] = useState(false);
  const [currentNote, setCurrentNote] = useState<any>(null);
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    try {
      const res = await notesService.getMyNotes();
      setSavedNotes(res.data.data || []);
    } catch {}
  };

  const handleGenerate = async () => {
    if (!courseName.trim() || !topic.trim()) {
      toast.error('Please enter course name and topic');
      return;
    }
    setGenerating(true);
    try {
      const res = await notesService.generate({ courseName: courseName.trim(), topic: topic.trim(), noteType });
      setCurrentNote(res.data.data);
      setSavedNotes(prev => [res.data.data, ...prev]);
      toast.success(`${noteType} notes generated!`);
      recentlyViewedService.record({
        itemType: 'note',
        itemId: res.data.data._id,
        title: `AI Note: ${res.data.data.courseName} - ${res.data.data.topic}`,
        url: `/notes-generator`
      }).catch(() => {});
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed. Please try again.');
    } finally { setGenerating(false); }
  };

  const handleCopy = () => {
    if (!currentNote) return;
    navigator.clipboard.writeText(currentNote.content);
    toast.success('Notes copied to clipboard!');
  };

  const handleDownloadPDF = () => {
    if (!currentNote) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${currentNote.noteType} Notes — ${currentNote.topic}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Course: ${currentNote.courseName}`, 14, 25);
    const lines = doc.splitTextToSize(currentNote.content.replace(/[#*`]/g, ''), 180);
    let y = 35;
    lines.forEach((line: string) => {
      if (y > 275) { doc.addPage(); y = 15; }
      doc.text(line, 14, y);
      y += 5;
    });
    doc.save(`${currentNote.topic}-${currentNote.noteType}.pdf`);
  };

  const handleDelete = async (id: string) => {
    try {
      await notesService.deleteNote(id);
      setSavedNotes(prev => prev.filter(n => n._id !== id));
      if (currentNote?._id === id) setCurrentNote(null);
      toast.success('Note deleted');
    } catch { toast.error('Delete failed'); }
  };

  const filteredNotes = savedNotes.filter(n =>
    !searchFilter || n.topic.toLowerCase().includes(searchFilter.toLowerCase()) || n.courseName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white/90">📓 AI Notes Generator</h1>
          <p className="text-xs text-white/40 mt-0.5">Generate 8 types of AI-powered study notes from any topic</p>
        </div>
        <div className="flex gap-2">
          {(['generate', 'saved'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
              style={{ background: activeTab === tab ? 'linear-gradient(135deg,#4f5dc8,#6359a8)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {tab === 'generate' ? '✦ Generate Notes' : `Saved (${savedNotes.length})`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'generate' && (
        <div className="flex gap-5 flex-1 min-h-0">
          {/* Controls Panel */}
          <div className="w-72 flex-shrink-0 space-y-4">
            <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <label className="block text-[10px] text-white/40 mb-1 uppercase font-bold">Course Name *</label>
                <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)}
                  placeholder="e.g. Data Structures" className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1 uppercase font-bold">Topic *</label>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Binary Search Trees" className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-2 uppercase font-bold">Note Type *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {NOTE_TYPES.map(nt => (
                    <button key={nt.value} onClick={() => setNoteType(nt.value)}
                      className={`p-2 rounded-xl text-left text-[10px] font-semibold transition-all`}
                      style={{ background: noteType === nt.value ? 'rgba(79,93,200,0.10)' : 'rgba(255,255,255,0.02)', color: noteType === nt.value ? '#8b94e0' : 'rgba(255,255,255,0.4)', border: `1px solid ${noteType === nt.value ? 'rgba(79,93,200,0.22)' : 'rgba(255,255,255,0.05)'}` }}>
                      <div className="text-base mb-0.5">{nt.icon}</div>
                      <div className="font-bold">{nt.value}</div>
                      <div style={{ fontSize: '9px', opacity: 0.7 }}>{nt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleGenerate} disabled={generating}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#4f5dc8,#6359a8)' }}>
                {generating ? '🤖 Generating…' : '✦ Generate Notes'}
              </button>
            </div>
          </div>

          {/* Generated Note Viewer */}
          <div className="flex-1 min-w-0 flex flex-col">
            {currentNote ? (
              <div className="flex flex-col h-full p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-bold text-white/90">{currentNote.topic}</h3>
                    <div className="text-[10px] text-white/40 mt-0.5">{currentNote.courseName} · {currentNote.noteType}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCopy} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white/60 border border-white/10 hover:text-white">📋 Copy</button>
                    <button onClick={handleDownloadPDF} className="btn-primary text-[10px] px-3 py-1.5">📥 PDF</button>
                    {currentNote._id && (
                      <BookmarkButton
                        itemType="note"
                        itemId={currentNote._id}
                        title={`AI Note: ${currentNote.courseName} - ${currentNote.topic}`}
                        category="AI Notes"
                        className="px-3 py-1.5 text-[10px] rounded-lg"
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto prose prose-invert prose-sm max-w-none" style={{ scrollbarWidth: 'thin' }}>
                  <ReactMarkdown>{currentNote.content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div className="space-y-2">
                  <div className="text-5xl">📓</div>
                  <div className="text-sm text-white/30">Select a course, topic, and note type</div>
                  <div className="text-xs text-white/20">Click Generate to create AI-powered study notes</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Notes Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-3">
          <input type="text" value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
            placeholder="Search saved notes by topic or course…" className="input-field text-xs max-w-md" />
          {filteredNotes.length === 0 && <div className="text-center py-10 text-white/20 text-xs">No saved notes found</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredNotes.map(note => {
              const nt = NOTE_TYPES.find(n => n.value === note.noteType);
              return (
                <div key={note._id} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{nt?.icon || '📝'}</span>
                      <div>
                        <div className="text-xs font-semibold text-white/80">{note.topic}</div>
                        <div className="text-[10px] text-white/40">{note.courseName} · {note.noteType}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => {
                        setCurrentNote(note);
                        setActiveTab('generate');
                        recentlyViewedService.record({
                          itemType: 'note',
                          itemId: note._id,
                          title: `AI Note: ${note.courseName} - ${note.topic}`,
                          url: `/notes-generator`
                        }).catch(() => {});
                      }}
                        className="px-2 py-1 rounded-lg text-[9px] font-semibold text-[#8b94e0]" style={{ background: 'rgba(79,93,200,0.06)' }}>View</button>
                      <BookmarkButton
                        itemType="note"
                        itemId={note._id}
                        title={`AI Note: ${note.courseName} - ${note.topic}`}
                        category="AI Notes"
                        className="px-2 py-1 text-[9px] font-semibold"
                      />
                      <button onClick={() => handleDelete(note._id)}
                        className="px-2 py-1 rounded-lg text-[9px] font-semibold text-[#c0524a]" style={{ background: 'rgba(192,82,74,0.08)' }}>Del</button>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-white/30 line-clamp-2">{note.content.replace(/[#*`]/g, '').substring(0, 100)}…</div>
                  <div className="text-[9px] text-white/20 mt-1">{new Date(note.createdAt).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
