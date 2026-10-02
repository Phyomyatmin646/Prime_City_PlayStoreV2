import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAccessToken, clearTokens, setOnSessionExpired } from '../api/client';
import { logout as apiLogout } from '../api/auth';
import { fetchProfile } from '../api/profile';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setOnSessionExpired(() => setUser(null));
    return () => setOnSessionExpired(null);
  }, []);

  useEffect(() => {
    getAccessToken()
      .then(async (token) => {
        if (token) {
          try {
            const profile = await fetchProfile();
            setUser(profile);
          } catch (err) {
            if (!err.sessionExpired) {
              setUser((current) => current || { id: 'session' });
            }
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback((sessionUser) => {
    setUser(sessionUser);
  }, []);

  const signOut = useCallback(async () => {
    const email = user?.email;
    await apiLogout(email);
    setUser(null);
    await clearTokens();
  }, [user]);

  const isAuthenticated = !!user;

  const value = useMemo(
    () => ({
      user,
      setUser,
      signIn,
      signOut,
      isAuthenticated,
      isLoading,
    }),
    [user, signIn, signOut, isAuthenticated, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;
