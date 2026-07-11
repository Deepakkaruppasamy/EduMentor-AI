import React, { useEffect, useState, useRef } from 'react';
import { useOnboardingStore } from '../../store/onboarding.store';

export const OnboardingOverlay: React.FC = () => {
  const { activeTour, activeSteps, currentStep, nextStep, prevStep, skipTour } = useOnboardingStore();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const activeStep = activeSteps[currentStep];

  // Recalculate target positions
  useEffect(() => {
    if (!activeStep) return;

    const updateCoords = () => {
      if (activeStep.targetId === 'dashboard-welcome' || activeStep.targetId === 'admin-dashboard-welcome' || activeStep.placement === 'center') {
        setCoords(null);
        // Center of the screen
        const w = window.innerWidth;
        const h = window.innerHeight;
        setTooltipPos({
          top: (h - 220) / 2,
          left: (w - 340) / 2,
        });
        return;
      }

      const el = document.getElementById(activeStep.targetId);
      if (!el) {
        // Fallback to center if element not found in DOM
        setCoords(null);
        setTooltipPos({
          top: (window.innerHeight - 220) / 2,
          left: (window.innerWidth - 340) / 2,
        });
        return;
      }

      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });

      // Position tooltip relative to targeted element
      const placement = activeStep.placement || 'bottom';
      const gap = 12;
      let tTop = 0;
      let tLeft = 0;

      // Estimate tooltip size as 340x200
      const tw = 340;
      const th = 200;

      if (placement === 'bottom') {
        tTop = rect.bottom + gap;
        tLeft = rect.left + (rect.width - tw) / 2;
      } else if (placement === 'top') {
        tTop = rect.top - th - gap;
        tLeft = rect.left + (rect.width - tw) / 2;
      } else if (placement === 'right') {
        tTop = rect.top + (rect.height - th) / 2;
        tLeft = rect.right + gap;
      } else if (placement === 'left') {
        tTop = rect.top + (rect.height - th) / 2;
        tLeft = rect.left - tw - gap;
      }

      // Constrain inside viewport
      tTop = Math.max(16, Math.min(tTop, window.innerHeight - th - 16));
      tLeft = Math.max(16, Math.min(tLeft, window.innerWidth - tw - 16));

      setTooltipPos({ top: tTop, left: tLeft });

      // Scroll target into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    updateCoords();

    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [activeStep, currentStep]);

  if (!activeTour || !activeStep) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] pointer-events-auto"
      style={{ background: 'rgba(0,0,0,0.65)', transition: 'background 0.3s ease' }}
    >
      {/* Spotlight cutout */}
      {coords && (
        <div
          className="absolute pointer-events-none transition-all duration-300"
          style={{
            top: coords.top - 6,
            left: coords.left - 6,
            width: coords.width + 12,
            height: coords.height + 12,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(10, 11, 15, 0.8), 0 0 15px rgba(79, 99, 255, 0.4)',
            border: '2px solid rgba(79, 99, 255, 0.6)',
          }}
        />
      )}

      {/* Tooltip dialog card */}
      <div
        ref={tooltipRef}
        className="absolute w-[340px] rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          background: 'linear-gradient(135deg, #131520 0%, #0f1119 100%)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* Step indicator & title */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">
              Step {currentStep + 1} of {activeSteps.length}
            </span>
            <button
              onClick={skipTour}
              className="text-[10px] font-semibold text-white/30 hover:text-white/60 transition-colors"
            >
              Skip tour
            </button>
          </div>
          <h4 className="text-sm font-extrabold text-white mt-2 leading-tight">
            {activeStep.title}
          </h4>
          <p className="text-[11px] text-white/50 mt-2 leading-relaxed">
            {activeStep.description}
          </p>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="text-[10px] font-bold text-white/60 hover:text-white bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={skipTour}
              className="text-[10px] font-bold text-white/40 hover:text-white/60 transition-colors px-2 py-1"
            >
              Close
            </button>
          </div>
          <button
            onClick={nextStep}
            className="text-[10px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #4f63ff, #7c3aed)',
              boxShadow: '0 4px 12px rgba(79, 99, 255, 0.3)',
            }}
          >
            {currentStep === activeSteps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
