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
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Built-in demo accounts for quick role switching / testing
export const DEMO_ACCOUNTS = {
  ADMIN: {
    email: 'admin@galco.co.tz',
    username: 'admin',
    pass: 'admin123',
    role: 'ADMIN' as UserRole,
    name: 'Elisha Samwel (System Admin)',
  },
  PORT_RELEASE: {
    email: 'port@galco.co.tz',
    username: 'port_officer',
    pass: 'port123',
    role: 'PORT_RELEASE' as UserRole,
    name: 'John Mrosso (TPA Port Officer)',
  },
  GALCO_RECEIVING: {
    email: 'yard@galco.co.tz',
    username: 'galco_receiver',
    pass: 'yard123',
    role: 'GALCO_RECEIVING' as UserRole,
    name: 'Hamis Bakari (E27 Yard Officer)',
  },
};

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
        localStorage.setItem('galco_user', JSON.stringify(appUser));
        setIsLoading(false);
      } else {
        // Fallback to local cached user or default admin
        const savedUser = localStorage.getItem('galco_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error('Failed to parse cached session', e);
          }
        } else {
          // Default to Admin logged in for instant preview convenience
          const defaultAdmin: User = {
            id: 'usr-admin-1',
            name: 'Elisha Samwel',
            email: 'admin@galco.co.tz',
            username: 'admin',
            role: 'ADMIN',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          };
          setUser(defaultAdmin);
          localStorage.setItem('galco_user', JSON.stringify(defaultAdmin));
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
      localStorage.setItem('galco_user', JSON.stringify(authedUser));
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
      localStorage.setItem('galco_user', JSON.stringify(appUser));
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
    localStorage.removeItem('galco_user');
  };

  const switchDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const demoAcc = DEMO_ACCOUNTS[role];
      const { user: authedUser } = await ApiService.login(demoAcc.email, demoAcc.pass);
      setUser(authedUser);
      localStorage.setItem('galco_user', JSON.stringify(authedUser));
      try {
        await FirestoreService.setUser(authedUser);
      } catch (e) {
        console.warn('[Firebase] User sync warning:', e);
      }
    } catch (e) {
      // Local fallback in case of connection edge case
      const demoAcc = DEMO_ACCOUNTS[role];
      const mockUser: User = {
        id: role === 'ADMIN' ? 'usr-admin-1' : role === 'PORT_RELEASE' ? 'usr-port-1' : 'usr-galco-1',
        name: demoAcc.name,
        email: demoAcc.email,
        username: demoAcc.username,
        role,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      setUser(mockUser);
      localStorage.setItem('galco_user', JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
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
        switchDemoRole,
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
