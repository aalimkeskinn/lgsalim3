import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from './types';
import AuthSupabase from './components/AuthSupabase';
import DashboardSupabase from './components/DashboardSupabase';
import Spinner from './components/Spinner';

const AppSupabase: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<string>(() => (window.location.hash || '#dashboard').slice(1));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          emailVerified: session.user.email_confirmed_at != null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          emailVerified: session.user.email_confirmed_at != null,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      return (
        <div className="min-h-screen bg-gray-100">
          <DashboardSupabase user={user} />
        </div>
      );
    }

    return <AuthSupabase />;
  };

  return <div className="min-h-screen">{renderContent()}</div>;
};

export default AppSupabase;
