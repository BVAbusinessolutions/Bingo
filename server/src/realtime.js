import { loadActiveUser, verifyAccessToken } from './middleware/auth.js';
import { logger } from './utils/logger.js';

const namespaces = {};
const userRoom = (id) => `user:${id}`;

/**
 * Autentica el socket con el access token y un usuario activo en la BD.
 * Al vencer el token se desconecta; el cliente renueva el token y se vuelve a conectar.
 */
const authenticateSocket = (requiredRole) => async (socket, next) => {
  try {
    const payload = verifyAccessToken(socket.handshake.auth?.token);
    const user = await loadActiveUser(payload.sub);
    if (!user) return next(new Error('UNAUTHORIZED'));
    if (requiredRole && user.role !== requiredRole) return next(new Error('FORBIDDEN'));
    socket.user = { id: user.id, role: user.role };
    const msLeft = payload.exp * 1000 - Date.now();
    socket.data.expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(msLeft, 0));
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
};

function setup(io, name, requiredRole, onConnection) {
  const ns = io.of(name);
  ns.use(authenticateSocket(requiredRole));
  ns.on('connection', (socket) => {
    socket.join(userRoom(socket.user.id));
    socket.on('disconnect', () => clearTimeout(socket.data.expiryTimer));
    onConnection?.(socket);
  });
  namespaces[name] = ns;
  return ns;
}

/** Namespace /admin: solo administradores. Avisos de compras, reservas y reclamos de bingo. */
export const registerAdminSocket = (io) => setup(io, '/admin', 'ADMIN');

/** Namespace /user: cada usuario solo escucha su propia sala (pagos aprobados/rechazados, reclamos). */
export const registerUserSocket = (io) => setup(io, '/user');

/** Namespace /draw: usuarios autenticados escuchan el sorteo (lo registra modules/draw). */
export const registerAuthenticatedNamespace = (io, name, onConnection) => setup(io, name, null, onConnection);

export const notifyAdmins = (event, payload) => namespaces['/admin']?.emit(event, payload);
export const notifyUser = (userId, event, payload) => userId && namespaces['/user']?.to(userRoom(userId)).emit(event, payload);

/** Corta todas las conexiones en tiempo real de un usuario (cerrar sesiones, cambio de contraseña, cuenta desactivada). */
export function disconnectUser(userId) {
  for (const ns of Object.values(namespaces)) ns.in(userRoom(userId)).disconnectSockets(true);
  logger.info('realtime.user_disconnected', { user: userId });
}
