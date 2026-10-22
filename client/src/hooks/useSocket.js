import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from '../api/tokenStore';
import { refreshAccessToken } from '../api/httpClient';

/**
 * Conexión Socket.io autenticada con el access token (handshake.auth).
 * `enabled: false` no conecta (p. ej. visitante sin sesión).
 */
export function useSocket(namespace = '/draw', { enabled = true } = {}) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const base = (import.meta.env.VITE_SOCKET_URL ?? '').replace(/\/$/, '');
    const s = io(base + namespace, {
      auth: (cb) => cb({ token: tokenStore.get() }), // se re-evalúa en cada reconexión
      transports: ['websocket'],
    });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', async (err) => {
      if (err.message !== 'UNAUTHORIZED') return;
      try {
        await refreshAccessToken();
        s.connect();
      } catch {
        // el interceptor HTTP se encarga de cerrar la sesión
      }
    });
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [namespace, enabled]);

  return { socket, connected };
}
