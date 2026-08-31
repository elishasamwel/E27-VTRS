import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ApiService } from '../services/api';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { FirestoreService } from '../services/firestoreService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const email = fbUser.email || '';
        const isAdminUser = email === 'elishasamwel27@gmail.com' || email.toLowerCase().includes('admin');
        const role: UserRole = isAdminUser ? 'ADMIN' : 'PORT_RELEASE';

        const appUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0] || 'Google User',
          email,
          username: email.split('@')[0] || 'google_user',
          role,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };

        try {
          await FirestoreService.setUser(appUser);
        } catch (e) {
          console.warn('[Firebase] User sync warning:', e);
        }

        setUser(appUser);
        localStorage.setItem('e27_user', JSON.stringify(appUser));
        setIsLoading(false);
      } else {
        // Fallback to local cached user
        const savedUser = localStorage.getItem('e27_user') || localStorage.getItem('galco_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error('Failed to parse cached session', e);
          }
        }
        if (!auth.currentUser) {
          signInAnonymously(auth).catch(() => {});
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const { user: authedUser } = await ApiService.login(identifier, pass);
      setUser(authedUser);
      localStorage.setItem('e27_user', JSON.stringify(authedUser));
      try {
        await FirestoreService.setUser(authedUser);
      } catch (e) {
        console.warn('[Firebase] User sync warning:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const email = fbUser.email || '';
      const isAdminUser = email === 'elishasamwel27@gmail.com' || email.toLowerCase().includes('admin');
      const role: UserRole = isAdminUser ? 'ADMIN' : 'PORT_RELEASE';

      const appUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || email.split('@')[0] || 'Google User',
        email,
        username: email.split('@')[0] || 'google_user',
        role,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      await FirestoreService.setUser(appUser);
      setUser(appUser);
      localStorage.setItem('e27_user', JSON.stringify(appUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase logout warning:', e);
    }
    setUser(null);
    localStorage.removeItem('e27_user');
    localStorage.removeItem('galco_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
