
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import PublisherDashboard from './components/PublisherDashboard';
import Header from './components/Header';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

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

  // Verificação de Role
  const isAdmin = user.role === 'admin';

  return (
    <div className={`min-h-screen ${isAdmin ? 'bg-gradient-to-br from-indigo-50 via-violet-100 to-purple-100' : 'bg-gray-50'}`}>
      <Header />
      <main className="p-4 sm:p-6 md:p-8">
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
