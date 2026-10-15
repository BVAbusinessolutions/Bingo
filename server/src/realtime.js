import { verifyAccessToken } from './middleware/auth.js';

let adminNs = null;

/** Namespace /admin: solo administradores. Recibe avisos de nuevos comprobantes y cambios de reservas. */
export function registerAdminSocket(io) {
  adminNs = io.of('/admin');
  adminNs.use((socket, next) => {
    try {
      const user = verifyAccessToken(socket.handshake.auth?.token);
      if (user.role !== 'ADMIN') return next(new Error('FORBIDDEN'));
      socket.user = user;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });
}

export const notifyAdmins = (event, payload) => adminNs?.emit(event, payload);
