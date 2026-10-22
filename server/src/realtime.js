import { verifyAccessToken } from './middleware/auth.js';

let adminNs = null;
let userNs = null;

const authenticateSocket = (requiredRole) => (socket, next) => {
  try {
    const user = verifyAccessToken(socket.handshake.auth?.token);
    if (requiredRole && user.role !== requiredRole) return next(new Error('FORBIDDEN'));
    socket.user = user;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
};

/** Namespace /admin: solo administradores. Recibe avisos de nuevos comprobantes, reservas y reclamos de bingo. */
export function registerAdminSocket(io) {
  adminNs = io.of('/admin');
  adminNs.use(authenticateSocket('ADMIN'));
}

/** Namespace /user: cada usuario solo escucha su propia sala (pagos aprobados/rechazados, reclamos). */
export function registerUserSocket(io) {
  userNs = io.of('/user');
  userNs.use(authenticateSocket());
  userNs.on('connection', (socket) => socket.join(`user:${socket.user.sub}`));
}

export const notifyAdmins = (event, payload) => adminNs?.emit(event, payload);
export const notifyUser = (userId, event, payload) => userNs?.to(`user:${userId}`).emit(event, payload);
