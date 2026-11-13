import http from 'node:http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { close, connect, migrate, query } from './db/index.js';
import { seedDemoData } from './db/seed.js';
import { createApp } from './app.js';
import { registerAdminSocket, registerUserSocket } from './realtime.js';
import { registerDrawSocket } from './modules/draw/draw.js';
import { failInterruptedImports } from './modules/series/series.service.js';
import { closeRecognizer } from './modules/series/cardRecognizer.js';
import { releaseExpiredReservations } from './modules/reservations/reservations.service.js';
import { startJobs } from './jobs.js';
import { logger } from './utils/logger.js';
import { verifyMailTransport } from './utils/mailer.js';

await connect();
await migrate();
await seedDemoData();
// El admin superior (SUPER_ADMIN_EMAIL) siempre queda como administrador activo, si su cuenta ya existe y está confirmada.
if (env.superAdminEmail) {
  await query(
    `update app.users set role = 'ADMIN', status = 'ACTIVE', suspended_until = null, sanction_reason = null, updated_at = now()
      where email = $1 and email_verified and (role <> 'ADMIN' or status <> 'ACTIVE')`,
    [env.superAdminEmail]
  );
}
await failInterruptedImports();
await releaseExpiredReservations();

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientOrigin, credentials: true }, maxHttpBufferSize: 10_000 });
registerDrawSocket(io);
registerAdminSocket(io);
registerUserSocket(io);
startJobs();
verifyMailTransport(); // sin await: solo deja en los registros si el SMTP acepta la conexión (no frena el arranque)

server.listen(env.port, () => logger.info('server.listening', { url: `http://localhost:${env.port}`, production: env.isProd }));

// Apagado ordenado (el hosting envía SIGTERM al desplegar una versión nueva).
const shutdown = (signal) => {
  logger.info('server.shutdown', { signal });
  io.close();
  server.close(async () => {
    await closeRecognizer();
    await close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
