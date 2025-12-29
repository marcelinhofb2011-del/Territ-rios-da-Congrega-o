
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../types';
import { apiLogin, apiLogout, apiSignUp } from '../services/api';

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
    const checkSession = () => {
        const savedUser = localStorage.getItem('territory_current_session');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    };
    checkSession();
  }, []);

  const login = async (email: string, pass: string) => {
    const loggedUser = await apiLogin(email, pass);
    setUser(loggedUser);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };
  
  const signUp = async (name: string, email: string, pass: string) => {
    const newUser = await apiSignUp(name, email, pass);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signUp }}>
      {children}
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
