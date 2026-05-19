import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/src/components/ui/sonner';
import { useQuizStore } from '@/src/store/useQuizStore';

// Lazy load pages for better performance
import LandingPage from '@/src/pages/LandingPage';
import LoginPage from '@/src/pages/LoginPage';
import RegisterPage from '@/src/pages/RegisterPage';
import Dashboard from '@/src/pages/Dashboard';
import QuizBuilder from '@/src/pages/QuizBuilder';
import QuizPlayer from '@/src/pages/QuizPlayer';
import QuizResult from '@/src/pages/QuizResult';
import MonitoringDashboard from '@/src/pages/MonitoringDashboard';
import QuizReports from '@/src/pages/QuizReports';
import Settings from '@/src/pages/Settings';
import History from '@/src/pages/History';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user } = useQuizStore();
  
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background font-sans antialiased text-foreground selection:bg-primary/20">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/forms/create" element={
            <ProtectedRoute roles={['CREATOR', 'ADMIN']}>
              <QuizBuilder />
            </ProtectedRoute>
          } />
          
          <Route path="/forms/:id/edit" element={
            <ProtectedRoute roles={['CREATOR', 'ADMIN']}>
              <QuizBuilder />
            </ProtectedRoute>
          } />

          <Route path="/forms/:id/monitor" element={
            <ProtectedRoute roles={['CREATOR', 'ADMIN']}>
              <MonitoringDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/forms/:id/reports" element={
            <ProtectedRoute roles={['CREATOR', 'ADMIN']}>
              <QuizReports />
            </ProtectedRoute>
          } />
          
          <Route path="/quiz/:id" element={<QuizPlayer />} />
          <Route path="/quiz/:id/join" element={<QuizPlayer />} />
          <Route path="/quiz/:id/result" element={<QuizResult />} />
          <Route path="/quiz/:id/result/:attemptId" element={<QuizResult />} />

          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/history" element={
            <ProtectedRoute roles={['STUDENT', 'ADMIN']}>
              <History />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" closeButton richColors />
      </div>
    </Router>
  );
}
