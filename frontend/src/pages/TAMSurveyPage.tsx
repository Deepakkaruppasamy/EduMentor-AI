import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { aiEvaluationService } from '../services/ai-evaluation.service';
import toast from 'react-hot-toast';

const DIMENSIONS = [
  { key: 'perceivedUsefulness',  label: 'Perceived Usefulness',    icon: '💡', desc: 'The AI tools help me learn more effectively' },
  { key: 'perceivedEaseOfUse',   label: 'Ease of Use',             icon: '🎯', desc: 'The platform is easy to navigate and use' },
  { key: 'attitudeTowardUse',    label: 'Attitude Toward Use',     icon: '😊', desc: 'I enjoy using this AI-powered platform' },
  { key: 'behavioralIntention',  label: 'Behavioral Intention',    icon: '🔮', desc: 'I intend to continue using this platform' },
  { key: 'selfEfficacy',         label: 'Self-Efficacy',           icon: '💪', desc: 'I feel confident using AI tools on this platform' },
  { key: 'systemAccessibility',  label: 'System Accessibility',    icon: '♿', desc: 'The platform is accessible and available when needed' },
  { key: 'overallSatisfaction',  label: 'Overall Satisfaction',    icon: '⭐', desc: 'I am satisfied with the overall experience' },
] as const;

type DimensionKey = typeof DIMENSIONS[number]['key'];
const STAR_LABELS = ['', 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

const StarRating: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-all hover:scale-110 text-2xl cursor-pointer"
          style={{ filter: (hover || value) >= star ? 'none' : 'grayscale(1) opacity(0.2)' }}
        >
          ⭐
        </button>
      ))}
      {(hover || value) > 0 && (
        <span className="text-xs text-yellow-400 ml-2 font-medium">{STAR_LABELS[hover || value]}</span>
      )}
    </div>
  );
};

export const TAMSurveyPage: React.FC = () => {
  const [ratings, setRatings] = useState<Record<DimensionKey, number>>({
    perceivedUsefulness: 0, perceivedEaseOfUse: 0, attitudeTowardUse: 0,
    behavioralIntention: 0, selfEfficacy: 0, systemAccessibility: 0, overallSatisfaction: 0,
  });
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const incomplete = DIMENSIONS.find(d => !ratings[d.key]);
    if (incomplete) { toast.error(`Please rate: ${incomplete.label}`); return; }
    setSubmitting(true);
    try {
      await aiEvaluationService.submitTAM({ ...ratings, comments });
      setSubmitted(true);
      toast.success('Thank you for your valuable feedback! 🎉');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setSubmitted(true);
        toast('You already submitted your survey — thank you!', { icon: 'ℹ️' });
      } else {
        toast.error('Failed to submit survey. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="text-7xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Your TAM survey response has been recorded. Your feedback helps us improve EduMentor AI for everyone.
          </p>
          <div className="mt-6 rounded-2xl p-4 text-left" style={{ background: 'rgba(79,99,255,0.05)', border: '1px solid rgba(79,99,255,0.15)' }}>
            <h4 className="text-xs font-bold text-primary-400 mb-2">Your ratings were submitted ✓</h4>
            <div className="space-y-1">
              {DIMENSIONS.map(d => (
                <div key={d.key} className="flex items-center justify-between text-xs">
                  <span className="text-white/50">{d.icon} {d.label}</span>
                  <span className="text-yellow-400">{'⭐'.repeat(ratings[d.key] || 5)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pb-2">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="text-2xl font-bold text-white">Platform Experience Survey</h1>
          <p className="text-sm text-white/40 max-w-lg mx-auto leading-relaxed">
            Help us evaluate EduMentor AI using the Technology Acceptance Model (TAM). Your honest responses help improve the platform.
          </p>
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mt-2" style={{ background: 'rgba(79,99,255,0.1)', border: '1px solid rgba(79,99,255,0.2)', color: '#7c8fff' }}>
            🔒 Anonymous & Confidential · Takes ~2 minutes
          </div>
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          {DIMENSIONS.map((dim, i) => (
            <motion.div
              key={dim.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-5"
              style={{
                background: ratings[dim.key] ? 'rgba(79,99,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: ratings[dim.key] ? '1px solid rgba(79,99,255,0.2)' : '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.2s',
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl mt-0.5">{dim.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-white">{dim.label}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{dim.desc}</p>
                </div>
                {ratings[dim.key] > 0 && (
                  <span className="ml-auto text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: 'rgba(72,187,120,0.1)', color: '#48bb78' }}>✓ Rated</span>
                )}
              </div>
              <StarRating
                value={ratings[dim.key]}
                onChange={v => setRatings(prev => ({ ...prev, [dim.key]: v }))}
              />
            </motion.div>
          ))}
        </div>

        {/* Comments */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <label className="block text-xs font-bold text-white/40 uppercase mb-3">💬 Additional Comments (Optional)</label>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Share any specific suggestions, issues, or praise about the platform…"
            rows={4}
            className="input-field text-xs resize-none"
          />
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(Object.values(ratings).filter(v => v > 0).length / 7) * 100}%`,
                background: 'linear-gradient(90deg, #4f63ff, #9f7aea)',
              }}
            />
          </div>
          <span className="text-xs text-white/30">{Object.values(ratings).filter(v => v > 0).length}/7 rated</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || Object.values(ratings).some(v => v === 0)}
          className="btn-primary w-full py-4 text-sm font-bold disabled:opacity-40 rounded-2xl"
        >
          {submitting ? '⏳ Submitting…' : '📤 Submit My Survey'}
        </button>
      </div>
    </div>
  );
};
