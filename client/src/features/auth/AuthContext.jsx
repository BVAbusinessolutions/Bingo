import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import { refreshAccessToken, setSessionExpiredHandler } from '../../api/httpClient';
import { tokenStore } from '../../api/tokenStore';
import { ROLES } from './roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | guest
  const navigate = useNavigate();

  const reset = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('guest');
  }, []);

  // Al cargar la app se intenta recuperar la sesión usando la cookie HttpOnly.
  useEffect(() => {
    refreshAccessToken()
      .then(({ user }) => {
        setUser(user);
        setStatus('authenticated');
      })
      .catch(reset);
  }, [reset]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      reset();
      navigate('/login', { replace: true, state: { expired: true } });
    });
  }, [navigate, reset]);

  const startSession = useCallback(({ accessToken, user }) => {
    tokenStore.set(accessToken);
    setUser(user);
    setStatus('authenticated');
    return user;
  }, []);

  const login = useCallback(async (credentials) => startSession(await authApi.login(credentials)), [startSession]);
  const register = useCallback(async (payload) => startSession(await authApi.register(payload)), [startSession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      reset();
      navigate('/');
    }
  }, [navigate, reset]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? ROLES.INVITADO,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      register,
      logout,
    }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
