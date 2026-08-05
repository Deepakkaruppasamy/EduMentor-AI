import React, { useState, useEffect } from 'react';
import { aiEvaluationService } from '../../services/ai-evaluation.service';
import toast from 'react-hot-toast';

interface CandidateInteraction {
  chatId: string;
  messageId: string;
  messageIndex: number;
  anonymizedStudentId: string;
  language: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  question: string;
  generatedAnswer: string;
  timestamp: string;
  trustScore: number;
  confidenceScore: number | null;
  sourcesCount: number;
  sources: Array<{ documentName: string; pageNumber?: number; chunkText: string; score: number }>;
  hallucinationFlags: string[];
  eligibleForResearch: boolean;
  exclusionReason: string | null;
  isImported: boolean;
}

export const AIChatSamplesManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'imported'>('candidates');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CandidateInteraction[]>([]);
  const [importedSamples, setImportedSamples] = useState<any[]>([]);

  // Filters
  const [courseFilter, setCourseFilter] = useState('');
  const [evaluatedStatus, setEvaluatedStatus] = useState('not_evaluated');
  const [flaggedLowAlignment, setFlaggedLowAlignment] = useState(false);
  const [hasSourcesOnly, setHasSourcesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await aiEvaluationService.getAIChatCandidates({
        courseId: courseFilter || undefined,
        evaluatedStatus,
        flaggedLowAlignment: flaggedLowAlignment ? 'true' : undefined,
        hasSources: hasSourcesOnly ? 'true' : undefined,
        search: searchQuery || undefined,
        page,
        limit: 15,
      });

      if (res.data?.success) {
        setCandidates(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.totalCount || 0);
        setEligibleCount(res.data.eligibleCount || 0);
      }
    } catch (err: any) {
      toast.error('Failed to load AI Chat candidates.');
    } finally {
      setLoading(false);
    }
  };

  const fetchImportedSamples = async () => {
    try {
      const res = await aiEvaluationService.getImportedAIChatSamples();
      if (res.data?.success) {
        setImportedSamples(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load imported research samples.');
    }
  };

  useEffect(() => {
    if (activeTab === 'candidates') {
      fetchCandidates();
    } else {
      fetchImportedSamples();
    }
  }, [activeTab, courseFilter, evaluatedStatus, flaggedLowAlignment, hasSourcesOnly, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates();
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selectedIds);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedIds(next);
  };

  const handleSelectAllEligible = () => {
    const next = new Set(selectedIds);
    candidates.filter(c => c.eligibleForResearch && !c.isImported).forEach(c => {
      next.add(`${c.chatId}_${c.messageId}`);
    });
    setSelectedIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleImportSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one interaction to import.');
      return;
    }

    const selections = Array.from(selectedIds).map(key => {
      const [chatId, messageId] = key.split('_');
      return { chatId, messageId };
    });

    setImporting(true);
    try {
      const res = await aiEvaluationService.importAIChatSamples({
        selections,
        samplingMethod: 'MANUAL_SELECTION',
      });

      if (res.data?.success) {
        toast.success(`Successfully imported ${res.data.importedCount} AI Chat sample(s) into Research Evaluation.`);
        setSelectedIds(new Set());
        fetchCandidates();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to import AI Chat samples.');
    } finally {
      setImporting(false);
    }
  };

  const getTrustBadgeClass = (score: number) => {
    if (score >= 75) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (score >= 45) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🤖 Real AI Chat Interaction Importer
          </h3>
          <p className="text-xs text-white/60 mt-1">
            Browse live EduMentor student queries, filter by quality/grounding metrics, and create immutable research snapshots.
          </p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'candidates' ? 'bg-primary-500 text-white shadow' : 'text-white/60 hover:text-white'
            }`}
          >
            Candidate Interactions ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('imported')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'imported' ? 'bg-primary-500 text-white shadow' : 'text-white/60 hover:text-white'
            }`}
          >
            Imported Snapshots ({importedSamples.length})
          </button>
        </div>
      </div>

      {activeTab === 'candidates' ? (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search question or answer keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[240px] px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary-500"
              />

              <select
                value={evaluatedStatus}
                onChange={(e) => { setEvaluatedStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="not_evaluated" className="bg-slate-900 text-white">Not Evaluated Yet</option>
                <option value="already_evaluated" className="bg-slate-900 text-white">Already Evaluated</option>
                <option value="all" className="bg-slate-900 text-white">All Statuses</option>
              </select>

              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  checked={flaggedLowAlignment}
                  onChange={(e) => { setFlaggedLowAlignment(e.target.checked); setPage(1); }}
                  className="rounded border-white/20 bg-white/10 text-primary-500 focus:ring-0"
                />
                Low Alignment Only (&lt;45%)
              </label>

              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  checked={hasSourcesOnly}
                  onChange={(e) => { setHasSourcesOnly(e.target.checked); setPage(1); }}
                  className="rounded border-white/20 bg-white/10 text-primary-500 focus:ring-0"
                />
                Has Source Citations
              </label>

              <button
                type="submit"
                className="px-4 py-2 bg-primary-500/20 text-primary-300 border border-primary-500/30 rounded-lg text-xs font-semibold hover:bg-primary-500/30 transition-all"
              >
                Apply Filters
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-white/50 border-t border-white/5 pt-3">
              <div>
                Showing <strong className="text-white">{candidates.length}</strong> candidate interactions (
                <span className="text-emerald-400 font-semibold">{eligibleCount} eligible</span>,{' '}
                <span className="text-amber-400 font-semibold">{totalCount - eligibleCount} excluded</span>)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllEligible}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-white/80 transition-all"
                >
                  Select All Eligible
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-white/50 transition-all"
                >
                  Deselect All
                </button>

                <button
                  onClick={handleImportSelected}
                  disabled={selectedIds.size === 0 || importing}
                  className={`px-4 py-1.5 rounded font-bold transition-all flex items-center gap-2 ${
                    selectedIds.size > 0 && !importing
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {importing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>📥 Add {selectedIds.size} to Research Evaluation</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="py-12 text-center text-white/40 text-xs">
              <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin inline-block mr-2" />
              Scanning live AI Chat database...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-xs bg-white/[0.01] rounded-xl border border-white/5">
              No matching AI Chat interactions found for the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((c) => {
                const key = `${c.chatId}_${c.messageId}`;
                const isSelected = selectedIds.has(key);

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-primary-500/10 border-primary-500/50'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          disabled={!c.eligibleForResearch || c.isImported}
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                          className="rounded border-white/20 bg-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                        />

                        <span className="font-mono text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
                          {c.anonymizedStudentId}
                        </span>

                        <span className="text-xs text-white/60 bg-white/5 px-2 py-0.5 rounded">
                          {c.courseName} ({c.courseCode})
                        </span>

                        <span className="text-xs text-white/40">
                          {new Date(c.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Grounding Score Badge */}
                        <span className={`px-2.5 py-0.5 text-xs rounded-full border font-bold ${getTrustBadgeClass(c.trustScore)}`}>
                          Alignment: {c.trustScore}%
                        </span>

                        {/* Research Eligibility Status */}
                        {c.isImported ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            Already Imported
                          </span>
                        ) : c.eligibleForResearch ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Eligible
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/30" title={c.exclusionReason || ''}>
                            Excluded: {c.exclusionReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question & Answer */}
                    <div className="ml-7 space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-white/50">Student Question: </span>
                        <span className="text-white font-medium">{c.question}</span>
                      </div>

                      <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-white/80 max-h-28 overflow-y-auto leading-relaxed">
                        <span className="font-semibold text-primary-400 block mb-1">Generated EduMentor Answer:</span>
                        {c.generatedAnswer}
                      </div>

                      {/* Sources & Citations */}
                      {c.sources.length > 0 && (
                        <div className="flex items-center gap-2 text-white/50 text-[11px] pt-1">
                          <span>📚 Sources ({c.sources.length}):</span>
                          {c.sources.map((s, idx) => (
                            <span key={idx} className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-white/70">
                              {s.documentName} {s.pageNumber ? `(p.${s.pageNumber})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-xs text-white"
              >
                Previous
              </button>
              <span className="text-xs text-white/60">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-xs text-white"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Imported Snapshots Tab */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs">
            <span className="text-white/60">
              Showing <strong className="text-white">{importedSamples.length}</strong> immutable research snapshots imported from live AI Chat.
            </span>
          </div>

          <div className="space-y-3">
            {importedSamples.map((s) => (
              <div key={s._id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between text-white/60">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {s.anonymousId}
                    </span>
                    <span className="text-white/40">Student: {s.anonymizedStudentId}</span>
                    <span className="text-white/50">{s.courseName}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-white/5 text-white/70">
                    Status: <strong>{s.status}</strong>
                  </span>
                </div>

                <div>
                  <span className="text-white/50 font-semibold">Question: </span>
                  <span className="text-white">{s.question}</span>
                </div>

                <div className="p-2.5 rounded bg-black/40 text-white/80 line-clamp-2">
                  {s.generatedAnswer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
