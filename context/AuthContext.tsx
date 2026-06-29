
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../types';
import { apiLogin, apiLogout, apiSignUp, apiResetPassword, getOrCreateUserProfile, apiLoginWithGoogle, parseDate } from '../services/api';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener");
    let unsubscribeProfileSnapshot: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged fired", firebaseUser ? "User exists" : "No user");
      
      if (unsubscribeProfileSnapshot) {
        unsubscribeProfileSnapshot();
        unsubscribeProfileSnapshot = null;
      }

      if (firebaseUser) {
        setLoading(true);
        // Timeout de 15 segundos para evitar travamento infinito
        const timeoutId = setTimeout(() => {
          setLoading(false);
          console.warn("AuthContext: Carregamento do perfil excedeu o tempo limite.");
        }, 15000);

        try {
          console.log("AuthContext: Fetching user profile for", firebaseUser.uid);
          const loggedUser = await getOrCreateUserProfile(firebaseUser);
          console.log("AuthContext: User profile fetched", loggedUser);
          setUser(loggedUser);
          clearTimeout(timeoutId);
          setLoading(false);

          // Escuta alterações em tempo real do perfil do usuário no Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeProfileSnapshot = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              console.log("AuthContext: User profile updated in real-time", data);
              setUser((prevUser) => {
                if (!prevUser) return { ...data, id: snapshot.id } as User;
                return {
                  ...prevUser,
                  ...data,
                  id: snapshot.id,
                  createdAt: parseDate(data.createdAt) || prevUser.createdAt
                } as User;
              });
            }
          }, (err) => {
            console.error("Erro no listener em tempo real do perfil do usuário:", err);
          });

        } catch (error) {
          console.error("Erro crítico ao carregar perfil:", error);
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } else {
        console.log("AuthContext: Setting loading to false (no user)");
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfileSnapshot) {
        unsubscribeProfileSnapshot();
      }
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
        const userData = await apiLogin(email, pass);
        setUser(userData);
    } catch (e) {
        throw e;
    } finally {
        setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
        const userData = await apiLoginWithGoogle();
        setUser(userData);
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
    } catch (e) {
        throw e;
    } finally {
        setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
        await apiResetPassword(email);
    } catch (e) {
        throw e;
    } finally {
        setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, signUp, resetPassword }}>
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
