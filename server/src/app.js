import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { one } from './db/index.js';
import { apiLimiter } from './middleware/security.js';
import { logger, requestLogger } from './utils/logger.js';
import authRoutes from './modules/auth/auth.routes.js';
import eventRoutes, { cardImagesRouter } from './modules/events/events.routes.js';
import reservationRoutes from './modules/reservations/reservations.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import claimRoutes from './modules/claims/claims.routes.js';
import { drawRouter } from './modules/draw/draw.js';

const STREAM_FRAMES = ['https://www.youtube-nocookie.com', 'https://player.twitch.tv', 'https://player.vimeo.com'];

/** Hash de los <script> en línea de index.html para permitirlos en la CSP sin 'unsafe-inline'. */
function inlineScriptHashes(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    ([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`
  );
}

function clientCsp(indexHtml) {
  const wsOrigin = env.clientOrigin.replace(/^http/, 'ws');
  return {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", ...inlineScriptHashes(indexHtml)],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // estilos en línea de React; sin riesgo de ejecución
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", wsOrigin],
      frameSrc: STREAM_FRAMES,
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: env.isProd ? [] : null,
    },
  };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy); // IP real detrás del proxy del hosting (rate limit y bitácora)

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }, // la API solo devuelve datos
      hsts: env.isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    })
  );
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // Healthcheck real: responde 200 solo si la base de datos contesta.
  app.get('/api/health', async (req, res) => {
    try {
      await one('select 1 as ok');
      res.json({ status: 'ok', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded' });
    }
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/card-images', cardImagesRouter);
  app.use('/api/events', eventRoutes);
  app.use('/api/events/:eventId', drawRouter);
  app.use('/api/events/:eventId/claims', claimRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', (req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

  // Producción: la web compilada se sirve desde el mismo origen (cookies SameSite=Strict y sin CORS).
  const indexFile = path.join(env.clientDist, 'index.html');
  if (env.serveClient && fs.existsSync(indexFile)) {
    const indexHtml = fs.readFileSync(indexFile, 'utf8');
    const pageHeaders = helmet({
      contentSecurityPolicy: clientCsp(indexHtml),
      hsts: false,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // YouTube exige el origen para el video embebido
    });
    app.use(pageHeaders, express.static(env.clientDist, { index: false, maxAge: '1y', immutable: true }));
    app.get('/{*splat}', pageHeaders, (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.type('html').send(indexHtml);
    });
  } else if (env.serveClient) {
    logger.warn('client.dist_missing', { path: env.clientDist, hint: 'Ejecuta npm run build en la raíz' });
  }

  app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  app.use((err, req, res, _next) => {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'FILE_TOO_LARGE' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'INVALID_JSON' });
    logger.error('http.unhandled_error', { path: req.path, message: err.message, stack: env.isProd ? undefined : err.stack });
    res.status(500).json({ error: 'INTERNAL_ERROR' }); // nunca exponer detalles internos al cliente
  });
  return app;
}
