import React, { useState, useEffect } from 'react';
import { Course } from '../../types';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Loader } from '../common/Loader';

interface OralExamScreenProps {
  courses: Course[];
  onBack: () => void;
}

export const OralExamScreen: React.FC<OralExamScreenProps> = ({ courses, onBack }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<'setup' | 'question' | 'evaluating' | 'completed'>('setup');

  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [scores, setScores] = useState<number[]>([]);
  const [feedbacks, setFeedbacks] = useState<string[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop reading voice prompts when navigating away
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Voice synthesis is unsupported by this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to pick a premium natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang.startsWith('en-US'));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is unsupported by this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognition.onerror = () => {
      toast.error('Speech recognition error. Please adjust your microphone.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !topic) {
      toast.error('Please select a course and enter a topic.');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate a practice short quiz (which contains question prompts)
      const { data } = await api.post('/quiz/generate', {
        courseId: selectedCourse,
        topic,
        questionType: 'short',
        count: 3,
      });

      const qTexts = data.quiz.questions.map((q: any) => q.question);
      setQuestions(qTexts);
      setCurrentIdx(0);
      setScores([]);
      setFeedbacks([]);
      setStudentAnswers([]);
      setTranscript('');
      setStatus('question');

      // Speak the first question aloud
      setTimeout(() => {
        speakText(`Question 1: ${qTexts[0]}`);
      }, 500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate oral exam');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEvaluateAnswer = async () => {
    if (!transcript) {
      toast.error('Please record your verbal answer first.');
      return;
    }

    setStatus('evaluating');
    try {
      const { data } = await api.post('/quiz/evaluate-oral', {
        question: questions[currentIdx],
        answer: transcript,
      });

      const evalResult = data.result;
      setScores(prev => [...prev, evalResult.score]);
      setFeedbacks(prev => [...prev, evalResult.feedback]);
      setStudentAnswers(prev => [...prev, transcript]);

      // Speak feedback
      speakText(evalResult.feedback);

      // Move to next question or complete
      setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx(prev => prev + 1);
          setTranscript('');
          setStatus('question');
          // Speak the next question
          speakText(`Question ${currentIdx + 2}: ${questions[currentIdx + 1]}`);
        } else {
          setStatus('completed');
          const finalScore = Math.round(scores.reduce((a, b) => a + b, evalResult.score) / questions.length);
          speakText(`Oral examination completed. Your average score is ${finalScore} percent.`);
        }
      }, 4000);
    } catch (err) {
      toast.error('Evaluation failed. Please submit again.');
      setStatus('question');
    }
  };

  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="max-w-2xl mx-auto glass-card p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center text-xl">
            🎙️
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Speech-to-Speech Oral Examination</h2>
            <p className="text-[10px] text-white/40">Hands-free verbal assessments powered by Groq & Web Speech API</p>
          </div>
        </div>
        <button onClick={onBack} className="btn-secondary py-1 px-3 text-xs">
          ← Back to Practices
        </button>
      </div>

      {status === 'setup' && (
        <form onSubmit={handleStartExam} className="space-y-4 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Choose Subject</label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="input-field text-white"
              required
            >
              <option value="" className="bg-[#1a1d27]">Select course...</option>
              {courses.map(course => (
                <option key={course._id} value={course._id} className="bg-[#1a1d27]">
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Topic Focus</label>
            <input
              type="text"
              required
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Concurrency control, Dijkstra algorithm, TCP Handshake..."
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="btn-primary w-full py-2.5"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ingesting Course RAG & Generating Oral Prompt...
              </span>
            ) : (
              '🚀 Begin Oral Examination'
            )}
          </button>
        </form>
      )}

      {(status === 'question' || status === 'evaluating') && (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-primary-400">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <h3 className="text-base font-bold text-white px-4 leading-normal">
              {questions[currentIdx]}
            </h3>
          </div>

          {/* Voice Prompt visualizer */}
          <div className="flex flex-col items-center space-y-3">
            {isListening ? (
              <div className="flex items-center gap-1 h-8">
                {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-red-500 rounded-full animate-pulse"
                    style={{
                      height: `${h * 6}px`,
                      animationDelay: `${i * 0.12}s`,
                      animationDuration: '0.6s',
                    }}
                  />
                ))}
              </div>
            ) : isSpeaking ? (
              <div className="flex items-center gap-1 h-8">
                {[1, 2, 3, 2, 1].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-primary-500 rounded-full animate-pulse"
                    style={{
                      height: `${h * 5}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.8s',
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-8 flex items-center justify-center text-xs text-white/30">
                Microphone idle
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => speakText(questions[currentIdx])}
                className="btn-secondary px-4 py-2 text-xs rounded-xl flex items-center gap-1.5"
              >
                🔊 Replay Question
              </button>
              <button
                type="button"
                onClick={startListening}
                className="btn-primary bg-gradient-to-r from-red-500 to-rose-600 border border-red-500/20 px-5 py-2 text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-500/10"
              >
                🎙️ {isListening ? 'Listening...' : 'Record Spoken Answer'}
              </button>
            </div>
          </div>

          {transcript && (
            <div className="w-full text-left space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40 block">Your Spoken Answer</span>
              <p className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl text-xs text-white/70 italic leading-relaxed">
                "{transcript}"
              </p>
            </div>
          )}

          {transcript && status === 'question' && (
            <button
              onClick={handleEvaluateAnswer}
              className="btn-primary w-full py-2"
            >
              📊 Submit Verbal Answer to AI
            </button>
          )}

          {status === 'evaluating' && (
            <Loader small message="Evaluating spoken syntax correctness and grading..." />
          )}
        </div>
      )}

      {status === 'completed' && (
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <span className="text-5xl">🏆</span>
            <div>
              <h3 className="text-base font-bold text-white">Oral Exam Complete!</h3>
              <p className="text-xs text-white/40 mt-1">Excellent performance during the verbal assessment.</p>
            </div>
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl max-w-xs w-full text-center">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block">Average Score</span>
              <span className="text-4xl font-black text-primary-400 block mt-1">{averageScore}%</span>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-white/5">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Review Sheet</h4>
            {questions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-2">
                <div className="flex justify-between text-xs">
                  <strong className="text-white/80 font-medium">Q{idx + 1}: {q}</strong>
                  <span className="font-bold text-primary-400">{scores[idx]}%</span>
                </div>
                <p className="text-[11px] text-white/40 italic">"Your Answer: {studentAnswers[idx]}"</p>
                <p className="text-[11px] text-green-400 font-light">💡 AI Feedback: {feedbacks[idx]}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStatus('setup')}
              className="btn-primary w-full py-2.5 text-xs font-semibold"
            >
              🔄 Take Another Oral Exam
            </button>
            <button
              onClick={onBack}
              className="btn-secondary w-full py-2.5 text-xs font-semibold"
            >
              ✕ Exit Oral Practice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
