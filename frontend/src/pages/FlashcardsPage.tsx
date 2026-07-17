import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { courseService } from '../services/course.service';
import { flashcardService, FlashcardDeck, Flashcard } from '../services/flashcard.service';
import { Course } from '../types';
import { formatDate } from '../utils/uuid';
import toast from 'react-hot-toast';

export const FlashcardsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [topic, setTopic] = useState('');
  const [cardCount, setCardCount] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      courseService.getAll(),
      flashcardService.getMy(),
    ]).then(([c, d]) => {
      setCourses(c);
      setDecks(d);
      if (c.length > 0) setSelectedCourseId(c[0]._id);
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setIsLoadingHistory(false));
  }, []);

  const activeCard: Flashcard | undefined = currentDeck?.cards[currentCardIndex];

  const handleRateCard = async (score: number) => {
    if (!currentDeck || !activeCard) return;
    const cardId = activeCard._id;
    if (!cardId) return;

    try {
      const updatedDeck = await flashcardService.review(currentDeck._id, cardId, score);
      // Update local decks state
      setDecks(prev => prev.map(d => d._id === updatedDeck._id ? updatedDeck : d));
      setCurrentDeck(updatedDeck);
      toast.success('Review logged!');
      
      // Auto advance to next card after logging rating
      handleNextCard();
    } catch (err) {
      toast.error('Failed to log review');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentDeck) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNextCard();
      } else if (e.code === 'ArrowLeft') {
        handlePrevCard();
      } else if (isFlipped && ['1', '2', '3', '4', '5'].includes(e.key)) {
        handleRateCard(Number(e.key));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDeck, currentCardIndex, isFlipped, activeCard]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    const generateToast = toast.loading('Extracting concepts and generating cards...');
    try {
      const deck = await flashcardService.generate({
        courseId: selectedCourseId,
        topic: topic.trim(),
        count: cardCount,
      });
      setDecks(prev => [deck, ...prev]);
      setCurrentDeck(deck);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setTopic('');
      toast.success('Flashcard deck generated successfully!', { id: generateToast });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate flashcards', { id: generateToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectDeck = async (deckId: string) => {
    const loadingToast = toast.loading('Loading study deck...');
    try {
      const fullDeck = await flashcardService.getById(deckId);
      setCurrentDeck(fullDeck);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      toast.dismiss(loadingToast);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to load deck');
    }
  };

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this deck?')) return;
    try {
      await flashcardService.delete(deckId);
      setDecks(prev => prev.filter(d => d._id !== deckId));
      if (currentDeck?._id === deckId) {
        setCurrentDeck(null);
      }
      toast.success('Deck deleted');
    } catch (err) {
      toast.error('Failed to delete deck');
    }
  };

  const handleNextCard = () => {
    if (!currentDeck) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex(prev => (prev + 1) % currentDeck.cards.length);
    }, 150);
  };

  const handlePrevCard = () => {
    if (!currentDeck) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex(prev => (prev - 1 + currentDeck.cards.length) % currentDeck.cards.length);
    }, 150);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🎴 Flashcard Study Decks</h1>
        <p className="mt-1 text-sm text-white/40">Active recall study tools generated dynamically from your syllabus</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Play Space / Generation Area */}
        <div className="lg:col-span-2 space-y-6">
          {currentDeck ? (
            <div className="space-y-6">
              {/* Deck Info Bar */}
              <div className="glass-card p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-primary-400">{currentDeck.course?.code}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{currentDeck.title}</h3>
                </div>
                <button
                  onClick={() => setCurrentDeck(null)}
                  className="btn-secondary px-3 py-1.5 text-xs rounded-lg"
                >
                  Create New Deck
                </button>
              </div>

              {/* Flashcard Area */}
              {activeCard && (
                <div className="flex flex-col items-center justify-center">
                  <div
                    className="w-full max-w-xl h-80 relative cursor-pointer perspective-1000"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <motion.div
                      className="w-full h-full rounded-2xl border transition-all duration-500 transform-style-3d relative"
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderColor: isFlipped ? 'rgba(124,111,194,0.3)' : 'rgba(79,93,200,0.22)',
                        boxShadow: isFlipped 
                          ? '0 15px 35px rgba(124,111,194,0.15)' 
                          : '0 15px 35px rgba(79,93,200,0.10)'
                      }}
                    >
                      {/* FRONT OF CARD */}
                      <div className="absolute inset-0 flex flex-col justify-between p-8 backface-hidden">
                        <div className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-wider">
                          <span>Concept Query (Front)</span>
                          {activeCard.interval !== undefined && activeCard.interval > 0 && (
                            <span className="text-[9px] text-[#8b94e0] font-semibold bg-[#4f5dc8]/10 px-2 py-0.5 rounded-full border border-[#4f5dc8]/20">
                              Interval: {activeCard.interval}d
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-center">
                          <p className="text-lg font-medium text-white leading-relaxed">{activeCard.front}</p>
                        </div>
                        <div className="text-[10px] text-white/30 text-center">💡 Click card or press Space to reveal answer</div>
                      </div>

                      {/* BACK OF CARD */}
                      <div 
                        className="absolute inset-0 flex flex-col justify-between p-8 backface-hidden transform-rotateY-180"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                          <span>Recall Explanation (Back)</span>
                          {activeCard.nextReview && (
                            <span className="text-[9px] text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                              Next: {new Date(activeCard.nextReview).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-center overflow-y-auto max-h-[180px] px-2">
                          <p className="text-base text-white/90 leading-relaxed font-light">{activeCard.back}</p>
                        </div>
                        <div className="text-[10px] text-white/30 text-center">💡 Rate recall or click card to flip back</div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Rating or Navigation Buttons */}
                  {isFlipped ? (
                    <div className="flex flex-col items-center gap-3 mt-6 w-full max-w-xl">
                      <div className="text-[11px] text-white/40 uppercase tracking-wider">Rate recall to schedule next review:</div>
                      <div className="flex items-center gap-2 flex-wrap justify-center w-full">
                        {[
                          { val: 1, label: 'Forgot 😩', color: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' },
                          { val: 2, label: 'Hard 🤨', color: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
                          { val: 3, label: 'Good 🙂', color: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
                          { val: 4, label: 'Easy 😄', color: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
                          { val: 5, label: 'Perfect 🧠', color: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', text: '#9b96d4' },
                        ].map((btn) => (
                          <button
                            key={btn.val}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRateCard(btn.val);
                            }}
                            className="px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-200 hover:scale-105"
                            style={{
                              backgroundColor: btn.color,
                              border: `1px solid ${btn.border}`,
                              color: btn.text,
                            }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6 mt-6">
                      <button onClick={handlePrevCard} className="btn-secondary rounded-full p-3 text-lg">
                        ⬅️
                      </button>
                      <span className="text-sm font-semibold text-white/60">
                        {currentCardIndex + 1} / {currentDeck.cards.length}
                      </span>
                      <button onClick={handleNextCard} className="btn-secondary rounded-full p-3 text-lg">
                        ➡️
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Deck Generator Form
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-base font-bold text-white">Generate Study Flashcards</h2>
              <p className="text-xs text-white/50">Describe the academic topic and EduMentor AI will compile a study deck utilizing context from uploaded documents.</p>

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2">Select Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="input-field cursor-pointer bg-[#111318]"
                  >
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2">Topic or Lecture Theme</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g., Matrix factorization, Singular Value Decomposition (SVD), Database Joins"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2">Number of Cards: {cardCount}</label>
                  <input
                    type="range"
                    min={5}
                    max={15}
                    value={cardCount}
                    onChange={e => setCardCount(Number(e.target.value))}
                    className="w-full accent-primary-500 cursor-pointer"
                  />
                </div>

                <button type="submit" disabled={isGenerating} className="btn-primary w-full mt-2">
                  {isGenerating ? '🤖 Architecting Flashcards...' : '⚡ Generate Flashcard Deck'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Saved Study Decks Sidebar */}
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-white/80">🕐 Your Decks</h2>
          {isLoadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
            </div>
          ) : decks.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-8">No flashcard decks generated yet</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {decks.map(deck => (
                <div
                  key={deck._id}
                  onClick={() => handleSelectDeck(deck._id)}
                  className={`rounded-xl p-3 cursor-pointer transition-all duration-200 group flex items-start justify-between gap-2
                    ${currentDeck?._id === deck._id 
                      ? 'bg-primary-500/10 border border-primary-500/30' 
                      : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'
                    }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-white/30">{deck.course?.code}</span>
                    <p className="truncate text-xs font-semibold text-white mt-0.5">{deck.topic}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{deck.cards?.length} cards · {formatDate(deck.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDeck(deck._id, e)}
                    className="text-white/20 hover:text-red-400 p-1 rounded transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
