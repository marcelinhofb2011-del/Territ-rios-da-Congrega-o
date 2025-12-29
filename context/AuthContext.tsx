
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../types';
import { apiLogin, apiLogout, apiSignUp } from '../services/api';
import { supabase, getUserProfile } from '../supabase/client';
import { Session } from '@supabase/supabase-js';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await handleAuthStateChange(session);
        setLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        await handleAuthStateChange(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuthStateChange = async (session: Session | null) => {
     if (session?.user) {
        let profile = await getUserProfile(session.user.id);
        
        if (!profile) {
            const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const role = (count === 0 || session.user.email?.toLowerCase() === 'admin@example.com') ? 'admin' : 'publicador';
            
            await supabase.from('users').insert({
                auth_id: session.user.id,
                name: session.user.user_metadata?.name || 'Usuário',
                email: session.user.email?.toLowerCase(),
                role
            });
            
            profile = await getUserProfile(session.user.id);
        }

        if (profile) {
            setUser({ id: session.user.id, ...profile });
        } else {
            setUser(null);
        }
    } else {
        setUser(null);
    }
  }
  

  const login = async (email: string, pass: string) => {
    await apiLogin(email, pass);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn("Sign out API failed, forcing local logout", err);
    } finally {
      setUser(null);
      // Forçar limpeza de qualquer dado residual no storage
      localStorage.clear();
      sessionStorage.clear();
    }
  };
  
  const signUp = async (name: string, email: string, pass: string) => {
    const response = await apiSignUp(name, email, pass);
    // Fix: apiSignUp returns the 'data' portion of the Supabase response directly
    if (response && response.session) {
      // Força a atualização do estado, logando o usuário
      await handleAuthStateChange(response.session);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signUp }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
