import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ChatPage } from './pages/ChatPage';
import { QuizPage } from './pages/QuizPage';
import { CoursesPage } from './pages/CoursesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { GradebookPage } from './pages/GradebookPage';
import { ProfilePage } from './pages/ProfilePage';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
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
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to={user?.role === 'student' ? '/dashboard' : '/admin'} /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to={user?.role === 'student' ? '/dashboard' : '/admin'} /> : <RegisterPage />
        } />

        {/* Student Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['student']}>
            <AppPage><StudentDashboard /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute roles={['student']}>
            <AppPage><ChatPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/quiz" element={
          <ProtectedRoute roles={['student', 'faculty', 'admin']}>
            <AppPage><QuizPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/recommendations" element={
          <ProtectedRoute roles={['student']}>
            <AppPage><RecommendationsPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/flashcards" element={
          <ProtectedRoute roles={['student']}>
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

        {/* Faculty/Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['faculty', 'admin']}>
            <AppPage><AdminDashboard /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/documents" element={
          <ProtectedRoute roles={['faculty', 'admin']}>
            <AppPage><DocumentsPage /></AppPage>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute roles={['faculty', 'admin']}>
            <AppPage><AdminDashboard /></AppPage>
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
