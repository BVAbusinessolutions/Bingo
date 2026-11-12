import { useEffect, useState } from 'react';
import { tokenStore } from '../api/tokenStore';
import { refreshAccessToken } from '../api/httpClient';

// socket.io-client (~45 kB) se descarga solo cuando hay sesión: la portada de un visitante no lo necesita.
let ioModule;
const loadIo = () => (ioModule ??= import('socket.io-client').then((m) => m.io));

/** Abre la conexión y la renueva sola cuando vence el token. */
function connectSocket(io, namespace, setConnected) {
  const base = (import.meta.env.VITE_SOCKET_URL ?? '').replace(/\/$/, '');
  const s = io(base + namespace, {
    auth: (cb) => cb({ token: tokenStore.get() }), // se re-evalúa en cada reconexión
    transports: ['websocket'],
  });
  s.on('connect', () => setConnected(true));
  s.on('disconnect', async (reason) => {
    setConnected(false);
    // El servidor corta la conexión cuando vence el token: se renueva y se vuelve a conectar.
    // Si la sesión fue revocada, el refresh falla y el interceptor HTTP cierra la sesión.
    if (reason !== 'io server disconnect') return;
    try {
      await refreshAccessToken();
      s.connect();
    } catch {
      // sesión cerrada: no se reconecta
    }
  });
  s.on('connect_error', async (err) => {
    if (err.message !== 'UNAUTHORIZED') return;
    try {
      await refreshAccessToken();
      s.connect();
    } catch {
      // el interceptor HTTP se encarga de cerrar la sesión
    }
  });
  return s;
}

/**
 * Conexión Socket.io autenticada con el access token (handshake.auth).
 * `enabled: false` no conecta (p. ej. visitante sin sesión).
 */
export function useSocket(namespace = '/draw', { enabled = true } = {}) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let s = null;
    let alive = true;
    let retry = null;
    const start = () =>
      loadIo()
        .then((io) => {
          if (!alive) return;
          s = connectSocket(io, namespace, setConnected);
          setSocket(s);
        })
        .catch(() => {
          // Descarga fallida (p. ej. señal móvil débil en pleno sorteo): se reintenta sola cada 3 s.
          ioModule = undefined;
          if (alive) retry = setTimeout(start, 3_000);
        });
    start();
    return () => {
      alive = false;
      clearTimeout(retry);
      s?.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [namespace, enabled]);

  return { socket, connected };
}
