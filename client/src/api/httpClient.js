import axios from 'axios';
import { tokenStore } from './tokenStore';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';
const defaults = {
  baseURL,
  withCredentials: true, // envía la cookie HttpOnly del refresh token
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, // el backend lo exige en /auth/refresh (anti-CSRF)
};

export const http = axios.create({ ...defaults, timeout: 15000 });

// Cliente sin interceptores, solo para el refresh (evita bucles infinitos).
const refreshClient = axios.create(defaults);

// ---------- Request: adjunta "Authorization: Bearer <token>" ----------
http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------- Renovación de token con deduplicación ----------
let refreshPromise = null;

export function refreshAccessToken() {
  // Si varias peticiones reciben 401 a la vez, todas esperan el MISMO refresh.
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then(({ data }) => {
        if (!data?.accessToken) throw new Error('NO_SESSION'); // 204: no hay sesión iniciada
        tokenStore.set(data.accessToken);
        return data;
      })
      .catch((err) => {
        tokenStore.clear();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

// ---------- Response: reintenta una vez tras renovar ----------
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const { accessToken } = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return http(original);
      } catch (refreshErr) {
        onSessionExpired();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);
