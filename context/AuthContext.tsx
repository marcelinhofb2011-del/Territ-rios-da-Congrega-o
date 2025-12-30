import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../types';
import { apiLogin, apiLogout, apiSignUp } from '../services/api';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        try {
          // Busca o perfil
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          // Se não existir (pode ser delay no cadastro), espera um pouco mais
          if (!userDoc.exists()) {
             await new Promise(r => setTimeout(r, 1500));
             userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          }

          if (userDoc.exists()) {
            setUser({ ...userDoc.data(), id: userDoc.id } as User);
          } else {
            // Último recurso: se o doc não existe, mas está logado, 
            // checamos se é o primeiro usuário do banco para atribuir Admin
            const usersSnap = await getDocs(collection(db, 'users'));
            const isFirst = usersSnap.empty;
            
            const fallback: User = {
              id: firebaseUser.uid,
              // Add missing required User properties
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email || '',
              // Fix: Type '"publicador"' is not assignable to type '"user" | "admin"'.
              role: isFirst ? 'admin' : 'user',
              active: true,
              createdAt: new Date()
            };
            setUser(fallback);
          }
        } catch (error) {
          console.error("Erro ao carregar perfil:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
        const userData = await apiLogin(email, pass);
        setUser(userData);
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const signUp = async (name: string, email: string, pass: string) => {
    setLoading(true);
    try {
        const userData = await apiSignUp(name, email, pass);
        setUser(userData);
    } finally {
        setLoading(false);
    }
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