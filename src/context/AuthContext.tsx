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
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('e27_user') || localStorage.getItem('galco_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {
      console.error('Failed to parse cached session', e);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Check cached session first
    const savedUser = localStorage.getItem('e27_user') || localStorage.getItem('galco_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id && parsed.role) {
          setUser(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cached session', e);
      }
    }

    // 2. Listen to Firebase Auth state (only handle real Google users, ignore anonymous token users)
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && !fbUser.isAnonymous) {
        // Real authenticated Google user
        const email = fbUser.email || '';
        const isAdminUser =
          email === 'elishasamwel27@gmail.com' ||
          email.toLowerCase().includes('admin') ||
          email.toLowerCase() === 'admin@galco.co.tz' ||
          email.toLowerCase() === 'admin@e27.co.tz';
        const role: UserRole = isAdminUser ? 'ADMIN' : 'PORT_RELEASE';

        const appUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0] || 'Google User',
          email: email || `${fbUser.uid}@galco.co.tz`,
          username: email ? email.split('@')[0].toLowerCase() : `user_${fbUser.uid.substr(0, 6)}`,
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
        // Ensure anonymous auth for Firestore rules in background without overriding app user session
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
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    try {
      // 1. Primary: Try Server API login
      const { user: authedUser } = await ApiService.login(cleanId, cleanPass);
      setUser(authedUser);
      localStorage.setItem('e27_user', JSON.stringify(authedUser));
      try {
        await FirestoreService.setUser(authedUser);
      } catch (e) {
        console.warn('[Firebase] User sync warning:', e);
      }
    } catch (apiErr: any) {
      // 2. Resilient Fallback: If server is offline/restarting or for built-in accounts
      const isPending = apiErr.message?.toLowerCase().includes('pending') || apiErr.message?.toLowerCase().includes('approval');
      if (isPending) {
        throw apiErr;
      }

      let fallbackUser: User | null = null;
      if ((cleanId === 'admin' || cleanId === 'admin@galco.co.tz' || cleanId === 'admin@e27.co.tz' || cleanId === 'elishasamwel27@gmail.com') && cleanPass === 'admin123') {
        fallbackUser = {
          id: 'usr-admin-1',
          name: 'Elisha Samwel (Administrator)',
          email: 'admin@galco.co.tz',
          username: 'admin',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
      } else if ((cleanId === 'port_officer' || cleanId === 'port' || cleanId === 'port@galco.co.tz' || cleanId === 'port@e27.co.tz') && cleanPass === 'port123') {
        fallbackUser = {
          id: 'usr-port-1',
          name: 'John Mrosso (TPA Port Release)',
          email: 'port@galco.co.tz',
          username: 'port_officer',
          role: 'PORT_RELEASE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
      } else if ((cleanId === 'galco_receiver' || cleanId === 'yard' || cleanId === 'yard@galco.co.tz' || cleanId === 'yard@e27.co.tz') && cleanPass === 'yard123') {
        fallbackUser = {
          id: 'usr-galco-1',
          name: 'Hamis Bakari (E27 Yard Receiving)',
          email: 'yard@galco.co.tz',
          username: 'galco_receiver',
          role: 'GALCO_RECEIVING',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
      }

      if (fallbackUser) {
        setUser(fallbackUser);
        localStorage.setItem('e27_user', JSON.stringify(fallbackUser));
        try {
          await FirestoreService.setUser(fallbackUser);
        } catch (e) {
          console.warn('[Firebase] Fallback user sync warning:', e);
        }
        return;
      }

      throw new Error(apiErr.message || 'Invalid username or password.');
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
      const isAdminUser =
        email === 'elishasamwel27@gmail.com' ||
        email.toLowerCase().includes('admin') ||
        email.toLowerCase() === 'admin@galco.co.tz';
      const role: UserRole = isAdminUser ? 'ADMIN' : 'PORT_RELEASE';

      const appUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || email.split('@')[0] || 'Google User',
        email: email || `${fbUser.uid}@galco.co.tz`,
        username: email ? email.split('@')[0].toLowerCase() : `user_${fbUser.uid.substr(0, 6)}`,
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
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        await fbSignOut(auth);
      }
    } catch (e) {
      console.warn('Firebase logout warning:', e);
    }
    setUser(null);
    localStorage.removeItem('e27_user');
    localStorage.removeItem('galco_user');
    // Maintain anonymous token in background for Firestore
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(() => {});
    }
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
