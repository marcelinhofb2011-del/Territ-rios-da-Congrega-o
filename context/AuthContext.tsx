import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../types';
import { apiLogin, apiLogout, apiSignUp, saveFCMToken } from '../services/api';
import { auth, db, messaging } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

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

  // Função para configurar notificações Push
  const setupNotifications = async (userId: string) => {
    try {
      const msg = await messaging();
      if (!msg) return;

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(msg, {
          // Substitua pela sua PUBLIC VAPID KEY do Firebase Console
          vapidKey: 'SUA_CHAVE_VAPID_AQUI' 
        });
        if (token) {
          await saveFCMToken(userId, token);
        }
      }
    } catch (error) {
      console.warn("Não foi possível registrar notificações Push:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        try {
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (!userDoc.exists()) {
             await new Promise(r => setTimeout(r, 1000));
             userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          }

          if (userDoc.exists()) {
            const data = userDoc.data();
            const loggedUser = { 
                ...data, 
                id: userDoc.id,
                name: data.name || data.nome || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário'
            } as User;
            setUser(loggedUser);
            setupNotifications(loggedUser.id);
          } else {
            const fallback: User = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
              email: firebaseUser.email || '',
              role: 'user',
              active: true,
              createdAt: new Date()
            };
            setUser(fallback);
          }
        } catch (error) {
          console.error("Erro crítico ao carregar perfil:", error);
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
        await setupNotifications(userData.id);
    } catch (e) {
        throw e;
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
        await setupNotifications(userData.id);
    } catch (e) {
        throw e;
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