import { Platform } from 'react-native';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from './api-client';

type AuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  me: api.Me | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithApple: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [me, setMe] = useState<api.Me | null>(null);

  const load = async () => {
    const profile = await api.getMe().catch(() => null);
    setMe(profile);
    return profile;
  };

  useEffect(() => {
    api.isLoggedIn().then(async (value) => {
      // A stored token the server no longer accepts counts as signed out.
      const profile = value ? await load() : null;
      if (value && !profile) await api.logout();
      setIsLoggedIn(Boolean(profile));
      setIsLoading(false);
    });
  }, []);

  const value: AuthContextValue = {
    isLoggedIn,
    isLoading,
    me,
    login: async (email, password) => {
      await api.login(email, password);
      await load();
      setIsLoggedIn(true);
    },
    register: async (name, email, password) => {
      await api.register(name, email, password);
      await load();
      setIsLoggedIn(true);
    },
    loginWithGoogle: async () => {
      const done = await api.loginWithProvider('google');
      if (done) {
        await load();
        setIsLoggedIn(true);
      }
      return done;
    },
    // The iPhone's own sheet; Android uses the web flow, like Google.
    loginWithApple: async () => {
      const done = Platform.OS === 'ios' ? await api.loginWithAppleNative() : await api.loginWithProvider('apple');
      if (done) {
        await load();
        setIsLoggedIn(true);
      }
      return done;
    },
    refreshMe: async () => {
      await load();
    },
    logout: async () => {
      await api.logout();
      setIsLoggedIn(false);
      setMe(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
