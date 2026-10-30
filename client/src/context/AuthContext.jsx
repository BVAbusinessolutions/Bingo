import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { refreshAccessToken, setSessionExpiredHandler } from '../api/httpClient';
import { tokenStore } from '../api/tokenStore';
import { ROLES } from '../constants/roles';
import { PATHS } from '../routing/paths';
import { errorMessage, isSanctionError } from '../lib/format';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | guest
  const [sanction, setSanction] = useState(''); // aviso de suspensión/baneo con el motivo del admin
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
      .catch((err) => {
        if (isSanctionError(err)) setSanction(errorMessage(err));
        reset();
      });
  }, [reset]);

  useEffect(() => {
    setSessionExpiredHandler((err) => {
      reset();
      if (isSanctionError(err)) {
        // Sancionada con la sesión abierta: aviso claro con el motivo, nunca un cierre de sesión mudo.
        setSanction(errorMessage(err));
        navigate(PATHS.home, { replace: true });
      } else {
        navigate('/login', { replace: true, state: { expired: true } });
      }
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

  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } finally {
      reset();
      navigate('/login', { replace: true });
    }
  }, [navigate, reset]);

  /** Reemplaza los datos del usuario tras editar el perfil o verificar el correo. */
  const updateUser = useCallback((next) => setUser((prev) => (prev ? { ...prev, ...next } : prev)), []);

  const changePassword = useCallback(async (payload) => startSession(await authApi.changePassword(payload)), [startSession]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? ROLES.INVITADO,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      register,
      logout,
      logoutAll,
      updateUser,
      changePassword,
    }),
    [user, status, login, register, logout, logoutAll, updateUser, changePassword]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {sanction && (
        <ConfirmDialog
          title="Cuenta sancionada"
          cancelLabel="Entendido"
          confirmLabel="Contactar a soporte"
          onCancel={() => setSanction('')}
          onConfirm={() => {
            setSanction('');
            navigate(PATHS.contact);
          }}
        >
          {sanction}
        </ConfirmDialog>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
