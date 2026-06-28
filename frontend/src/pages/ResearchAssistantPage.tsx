import React, { useState, useEffect } from 'react';
import { researchService } from '../services/research.service';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const FEATURES = [
  { value: 'Summarize', icon: '📋', label: 'Summarize Paper', desc: 'Comprehensive overview' },
  { value: 'Explain', icon: '💡', label: 'Explain Simply', desc: 'For undergraduates' },
  { value: 'Compare', icon: '⚖️', label: 'Compare Papers', desc: 'Multi-paper analysis' },
  { value: 'LiteratureReview', icon: '📚', label: 'Literature Review', desc: 'Academic review section' },
  { value: 'IEEECitation', icon: '🏛️', label: 'IEEE Citation', desc: 'IEEE format citation' },
  { value: 'APACitation', icon: '📖', label: 'APA Citation', desc: 'APA 7th edition' },
  { value: 'MLACitation', icon: '📝', label: 'MLA Citation', desc: 'MLA 9th edition' },
  { value: 'ExplainFigures', icon: '📊', label: 'Explain Figures', desc: 'Charts & graphs' },
  { value: 'ExplainTables', icon: '📈', label: 'Explain Tables', desc: 'Data tables' },
  { value: 'Contributions', icon: '🔑', label: 'Key Contributions', desc: 'Novel aspects' },
  { value: 'FutureScope', icon: '🔮', label: 'Future Scope', desc: 'Research directions' },
  { value: 'PresentationPoints', icon: '🎯', label: 'Presentation Points', desc: 'Slide-ready content' },
];

export const ResearchAssistantPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>('analyze');
  const [uploadedPapers, setUploadedPapers] = useState<{ name: string; text: string }[]>([]);
  const [selectedFeature, setSelectedFeature] = useState('Summarize');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const res = await researchService.getHistory();
      setHistory(res.data.data || []);
    } catch {}
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const validFiles = fileArray.filter(f => allowedTypes.includes(f.type) || f.name.endsWith('.txt') || f.name.endsWith('.pdf') || f.name.endsWith('.docx'));

    if (validFiles.length === 0) { toast.error('Please upload PDF, DOCX, or TXT files'); return; }

    const newPapers: { name: string; text: string }[] = [];
    for (const file of validFiles) {
      const text = await file.text();
      newPapers.push({ name: file.name, text });
    }
    setUploadedPapers(prev => [...prev, ...newPapers]);
    toast.success(`${validFiles.length} paper(s) loaded`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleAnalyze = async () => {
    if (uploadedPapers.length === 0) { toast.error('Please upload at least one paper'); return; }
    setAnalyzing(true);
    try {
      const res = await researchService.analyze({
        feature: selectedFeature,
        paperTexts: uploadedPapers.map(p => p.text),
        paperMeta: uploadedPapers.map(p => ({ filename: p.name, originalName: p.name, filePath: '', uploadedAt: new Date() })),
      });
      setResult(res.data.data);
      setHistory(prev => [res.data.data, ...prev]);
      toast.success('Analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Analysis failed');
    } finally { setAnalyzing(false); }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await researchService.deleteHistory(id);
      setHistory(prev => prev.filter(h => h._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  const featureData = FEATURES.find(f => f.value === selectedFeature);

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white/90">🔬 AI Research Assistant</h1>
          <p className="text-xs text-white/40 mt-0.5">Upload research papers and extract insights with AI-powered analysis</p>
        </div>
        <div className="flex gap-2">
          {(['analyze', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
              style={{ background: activeTab === tab ? 'linear-gradient(135deg,#4f63ff,#7c3aed)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {tab === 'analyze' ? '🔬 Analyze Paper' : `History (${history.length})`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analyze' && (
        <div className="flex gap-5 flex-1 min-h-0">
          {/* Left panel: upload + feature selection */}
          <div className="w-72 flex-shrink-0 space-y-4">
            {/* Upload Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`p-5 rounded-2xl text-center cursor-pointer transition-all border-2 border-dashed ${dragging ? 'border-[#4f63ff] bg-[#4f63ff]/5' : 'border-white/10 hover:border-white/20'}`}
              onClick={() => document.getElementById('research-file-input')?.click()}>
              <input id="research-file-input" type="file" multiple accept=".pdf,.docx,.txt" className="hidden"
                onChange={e => e.target.files && handleFiles(e.target.files)} />
              <div className="text-3xl mb-2">📂</div>
              <div className="text-xs font-semibold text-white/60">Drop papers here or click to upload</div>
              <div className="text-[10px] text-white/30 mt-1">PDF, DOCX, TXT supported (max 20MB)</div>
            </div>

            {/* Uploaded papers list */}
            {uploadedPapers.length > 0 && (
              <div className="p-4 rounded-2xl space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-[10px] text-white/40 uppercase font-bold">Uploaded Papers</div>
                {uploadedPapers.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="text-[#48bb78]">📄</span>
                    <span className="text-white/70 truncate flex-1">{p.name}</span>
                    <button onClick={() => setUploadedPapers(prev => prev.filter((_, idx) => idx !== i))} className="text-[#fc8181] opacity-60 hover:opacity-100">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Feature Selection */}
            <div className="p-4 rounded-2xl space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] text-white/40 uppercase font-bold mb-2">Analysis Feature</div>
              {FEATURES.map(f => (
                <button key={f.value} onClick={() => setSelectedFeature(f.value)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all`}
                  style={{ background: selectedFeature === f.value ? 'rgba(79,99,255,0.15)' : 'transparent', color: selectedFeature === f.value ? '#7c8fff' : 'rgba(255,255,255,0.4)' }}>
                  <span className="text-sm">{f.icon}</span>
                  <div>
                    <div className="text-[10px] font-bold">{f.label}</div>
                    <div style={{ fontSize: '9px', opacity: 0.7 }}>{f.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={handleAnalyze} disabled={analyzing || uploadedPapers.length === 0}
              className="w-full py-3 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#4f63ff,#7c3aed)' }}>
              {analyzing ? `🤖 Analyzing (${featureData?.label})…` : `✦ Run ${featureData?.label}`}
            </button>
          </div>

          {/* Result Panel */}
          <div className="flex-1 min-w-0">
            {result ? (
              <div className="h-full p-5 rounded-2xl flex flex-col" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                  <div>
                    <div className="text-xs font-bold text-white/80">{featureData?.icon} {featureData?.label}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">Papers: {result.papers?.map((p: any) => p.originalName).join(', ')}</div>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(result.result); toast.success('Copied!'); }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white/60 border border-white/10 hover:text-white">
                    📋 Copy
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto prose prose-invert prose-sm max-w-none" style={{ scrollbarWidth: 'thin' }}>
                  <ReactMarkdown>{result.result}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="text-5xl">🔬</div>
                  <div className="text-sm text-white/30">Upload papers and select an analysis feature</div>
                  <div className="text-xs text-white/20">AI will analyze and extract insights from your research papers</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 && <div className="text-center py-12 text-white/20 text-xs">No analysis history yet</div>}
          {history.map(item => {
            const f = FEATURES.find(feat => feat.value === item.feature);
            return (
              <div key={item._id} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{f?.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white/80">{f?.label || item.feature}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">{item.papers?.map((p: any) => p.originalName).join(', ')}</div>
                    <div className="text-[10px] text-white/30 mt-1 line-clamp-2">{item.result?.replace(/[#*`]/g, '').substring(0, 150)}…</div>
                    <div className="text-[9px] text-white/20 mt-1">{new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setResult(item); setSelectedFeature(item.feature); setActiveTab('analyze'); }}
                      className="px-2 py-1 rounded-lg text-[9px] font-semibold text-[#7c8fff]" style={{ background: 'rgba(79,99,255,0.08)' }}>View</button>
                    <button onClick={() => handleDeleteHistory(item._id)}
                      className="px-2 py-1 rounded-lg text-[9px] font-semibold text-[#fc8181]" style={{ background: 'rgba(252,129,129,0.08)' }}>Del</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
