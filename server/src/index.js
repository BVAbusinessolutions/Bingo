import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { seed } from './db.js';
import { apiLimiter } from './middleware/security.js';
import authRoutes from './modules/auth/auth.routes.js';
import eventRoutes from './modules/events/events.routes.js';
import reservationRoutes from './modules/reservations/reservations.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { releaseExpiredReservations } from './modules/reservations/reservations.service.js';
import { drawRouter, registerDrawSocket } from './modules/draw/draw.js';
import { registerAdminSocket } from './realtime.js';

await seed();

const app = express();
app.set('trust proxy', 1); // necesario para que el rate limit vea la IP real detrás de un proxy
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events/:eventId', drawRouter);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'FILE_TOO_LARGE' });
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR' }); // nunca exponer stack traces al cliente
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientOrigin, credentials: true } });
registerDrawSocket(io);
registerAdminSocket(io);

setInterval(releaseExpiredReservations, 30_000);

server.listen(env.port, () => console.log(`API lista en http://localhost:${env.port}`));
