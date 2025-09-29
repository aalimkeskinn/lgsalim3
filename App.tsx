import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import MistakesPage from './components/MistakesPage';
import ExamsPage from './components/ExamsPage';
import Spinner from './components/Spinner';
import VerifyEmail from './components/VerifyEmail';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<string>(() => (window.location.hash || '#dashboard').slice(1));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Simple hash-based routing (#dashboard, #mistakes)
  useEffect(() => {
    const onHash = () => setRoute((window.location.hash || '#dashboard').slice(1));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <Spinner />
        </div>
      );
    }
    
    if (user) {
      if (!user.emailVerified) {
        return <VerifyEmail />;
      }
      if (route === 'mistakes') {
        return (
          <div className="min-h-screen bg-gray-100">
            <MistakesPage user={user} />
          </div>
        );
      }
      if (route === 'exams') {
        return (
          <div className="min-h-screen bg-gray-100">
            <ExamsPage user={user} />
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-gray-100">
          <Dashboard user={user} />
        </div>
      );
    }

    return <Auth />;
  };

  return (
    <div className="min-h-screen">
      {renderContent()}
    </div>
  );
};

export default App;