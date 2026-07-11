import React from 'react';
import { useOnboardingStore, TourId } from '../../store/onboarding.store';
import { useAuthStore } from '../../store/auth.store';
import { studentDashboardTour } from './tours/studentDashboardTour';
import { facultyDashboardTour } from './tours/facultyDashboardTour';
import { adminDashboardTour } from './tours/adminDashboardTour';
import toast from 'react-hot-toast';

export const OnboardingTrigger: React.FC = () => {
  const { startTour, activeTour } = useOnboardingStore();
  const { user } = useAuthStore();

  const handleStartTour = () => {
    if (!user) return;
    if (activeTour) return;

    let tourId: TourId = 'student-dashboard';
    let steps = studentDashboardTour;

    if (user.role === 'faculty') {
      tourId = 'faculty-dashboard';
      steps = facultyDashboardTour;
    } else if (user.role === 'admin') {
      tourId = 'admin-dashboard';
      steps = adminDashboardTour;
    }

    startTour(tourId, steps);
    toast.success('Tour started! Let\'s show you around.');
  };

  return (
    <button
      onClick={handleStartTour}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all text-xs font-semibold w-full mt-1.5"
    >
      <span>🎯</span>
      <span>Take a Tour</span>
    </button>
  );
};
