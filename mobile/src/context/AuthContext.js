import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearTokens, getAccessToken, setTokens } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const me = await api.me.get();
      setUser(me);
      return me;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // On app load, try to refresh profile if token exists (in memory, this won't persist across restarts unless we add AsyncStorage, but matches current App.js behavior)
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const login = useCallback(async (username, password) => {
    const data = await api.auth.login(username, password);
    setTokens(data.access, data.refresh);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const register = useCallback(async (payload) => {
    return await api.auth.register(payload);
  }, []);

  const verifyEmail = useCallback(async (email, code) => {
    return await api.auth.verifyEmail(email, code);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      register,
      verifyEmail,
      refreshProfile,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, logout, register, verifyEmail, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useCanWrite() {
  const { user } = useAuth();
  return user && ['ADMIN', 'STAFF'].includes(user.role) && user.is_email_verified;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' && user.is_email_verified;
}
