import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { FirstLoginChangePage } from './pages/FirstLoginChangePage';
import { InactivityHandler } from './components/auth/InactivityHandler';
import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { FacultyAIAssistantPage } from './pages/FacultyAIAssistantPage';
import { ChatPage } from './pages/ChatPage';
import { ReportsPage } from './pages/ReportsPage';
import { QuizPage } from './pages/QuizPage';
import { CoursesPage } from './pages/CoursesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { GradebookPage } from './pages/GradebookPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AssignmentEvaluatorPage } from './pages/AssignmentEvaluatorPage';
import { AvatarSettingsPage } from './pages/AvatarSettingsPage';
import { MessagesPage } from './pages/MessagesPage';
import { SupportCenterPage } from './pages/SupportCenterPage';
import { MeetingSchedulerPage } from './pages/MeetingSchedulerPage';
import { OfficeHoursPage } from './pages/OfficeHoursPage';
import { StudyPlannerPage } from './pages/StudyPlannerPage';
import { AcademicCalendarPage } from './pages/AcademicCalendarPage';
import { NotesGeneratorPage } from './pages/NotesGeneratorPage';
import { ResearchAssistantPage } from './pages/ResearchAssistantPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { AIEvaluationPage } from './pages/AIEvaluationPage';
import { TAMSurveyPage } from './pages/TAMSurveyPage';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.isFirstLogin) return <Navigate to="/first-login-change" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to={user.role === 'student' ? '/dashboard' : '/admin'} replace />;
  return <>{children}</>;
};

// First login route wrapper
const FirstLoginRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !user.isFirstLogin) return <Navigate to={user.role === 'student' ? '/dashboard' : '/admin'} replace />;
  return <>{children}</>;
};

// Layout wrapper for authenticated pages
const AppPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Layout>{children}</Layout>
);

const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <InactivityHandler />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to={user?.isFirstLogin ? '/first-login-change' : (user?.role === 'student' ? '/dashboard' : '/admin')} replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          <Navigate to="/login" replace />
        } />
        <Route path="/first-login-change" element={
          <FirstLoginRoute>
            <FirstLoginChangePage />
          </FirstLoginRoute>
        } />
        <Route path="/forgot-password" element={
          isAuthenticated ? <Navigate to={user?.isFirstLogin ? '/first-login-change' : (user?.role === 'student' ? '/dashboard' : '/admin')} replace /> : <ForgotPasswordPage />
        } />
        <Route path="/reset-password" element={
          isAuthenticated ? <Navigate to={user?.isFirstLogin ? '/first-login-change' : (user?.role === 'student' ? '/dashboard' : '/admin')} replace /> : <ResetPasswordPage />
        } />

        {/* Student Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['student']}>
            <AppPage><StudentDashboard /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute roles={['student', 'faculty', 'admin']}>
            <AppPage><ChatPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/quiz" element={
          <ProtectedRoute roles={['student', 'faculty', 'admin']}>
            <AppPage><QuizPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/recommendations" element={
          <ProtectedRoute roles={['student', 'faculty', 'admin']}>
            <AppPage><RecommendationsPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/flashcards" element={
          <ProtectedRoute roles={['student', 'faculty', 'admin']}>
            <AppPage><FlashcardsPage /></AppPage>
          </ProtectedRoute>
        } />

        {/* Shared Routes */}
        <Route path="/courses" element={
          <ProtectedRoute>
            <AppPage><CoursesPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppPage><ProfilePage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <AppPage><MessagesPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/support" element={
          <ProtectedRoute>
            <AppPage><SupportCenterPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/meetings" element={
          <ProtectedRoute>
            <AppPage><MeetingSchedulerPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/office-hours" element={
          <ProtectedRoute>
            <AppPage><OfficeHoursPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/study-planner" element={
          <ProtectedRoute roles={['student']}>
            <AppPage><StudyPlannerPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <AppPage><AcademicCalendarPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/notes-generator" element={
          <ProtectedRoute>
            <AppPage><NotesGeneratorPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/research-assistant" element={
          <ProtectedRoute>
            <AppPage><ResearchAssistantPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/announcements" element={
          <ProtectedRoute>
            <AppPage><AnnouncementsPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/assignment-evaluator" element={
          <ProtectedRoute>
            <AppPage><AssignmentEvaluatorPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/avatar-settings" element={
          <ProtectedRoute>
            <AppPage><AvatarSettingsPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/feedback" element={
          <ProtectedRoute>
            <AppPage><FeedbackPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/ai-evaluation" element={
          <ProtectedRoute roles={['admin']}>
            <AppPage><AIEvaluationPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/rate-platform" element={
          <ProtectedRoute>
            <AppPage><TAMSurveyPage /></AppPage>
          </ProtectedRoute>
        } />

        {/* Faculty/Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['faculty', 'admin']}>
            <AppPage><AdminDashboard /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['admin']}>
            <AppPage><AdminUserManagement /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/faculty-ai-assistant" element={
          <ProtectedRoute roles={['faculty', 'admin']}>
            <AppPage><FacultyAIAssistantPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/documents" element={
          <ProtectedRoute roles={['faculty', 'admin']}>
            <AppPage><DocumentsPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute roles={['faculty', 'admin']}>
            <AppPage><AnalyticsPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute roles={['student', 'faculty', 'admin']}>
            <AppPage><ReportsPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/gradebook" element={
          <ProtectedRoute roles={['faculty', 'admin']}>
            <AppPage><GradebookPage /></AppPage>
          </ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path="/" element={
          <Navigate to={isAuthenticated ? (user?.role === 'student' ? '/dashboard' : '/admin') : '/login'} />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
