
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import PublisherDashboard from './components/PublisherDashboard';
import Header from './components/Header';
import { usePushNotifications } from './hooks/usePushNotifications';
import ErrorBoundary from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  usePushNotifications(user);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Verificação de Role com fallback de segurança para o proprietário
  const isAdmin = user.role === 'admin' || user.email?.toLowerCase() === 'marcelinhofb2011@gmail.com';

  return (
    <div className={`min-h-screen ${isAdmin ? 'bg-slate-50' : 'bg-gray-50'}`}>
      <Header />
      <main>
        {isAdmin ? (
          <AdminDashboard />
        ) : (
          <PublisherDashboard />
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
