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
import eventRoutes, { cardImagesRouter, currentEvent } from './modules/events/events.routes.js';
import reservationRoutes from './modules/reservations/reservations.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import claimRoutes from './modules/claims/claims.routes.js';
import contactRoutes from './modules/contact/contact.routes.js';
import metricsRoutes from './modules/metrics/metrics.routes.js';
import { drawRouter } from './modules/draw/draw.js';

const STREAM_FRAMES = [
  'https://www.youtube-nocookie.com',
  'https://player.twitch.tv',
  'https://player.kick.com',
  'https://player.vimeo.com',
  'https://www.facebook.com',
];
// Mapa del lugar en Contacto (Google Maps embebido, sin clave de API).
const MAP_FRAMES = ['https://www.google.com'];

// Dominios que cada analítica sin costo necesita (solo se agregan si ANALYTICS_PROVIDER lo indica).
const ANALYTICS_CSP = {
  ga4: {
    script: ['https://www.googletagmanager.com'],
    connect: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'],
    img: ['https://*.google-analytics.com', 'https://www.googletagmanager.com'],
  },
  cloudflare: { script: ['https://static.cloudflareinsights.com'], connect: ['https://cloudflareinsights.com'], img: [] },
};
const NO_ANALYTICS = { script: [], connect: [], img: [] };

// Páginas públicas indexables (sitemap.xml). Las privadas y el panel quedan fuera y se excluyen en robots.txt.
const PUBLIC_PAGES = [
  '/',
  '/cartones',
  '/premios',
  '/resultados',
  '/reglamento',
  '/terminos',
  '/privacidad',
  '/contingencias',
  '/propiedad-intelectual',
  '/edad-y-tutoria',
  '/impuestos',
  '/pagos-sinpe',
  '/cookies',
  '/contacto',
];

/** URL pública del sitio para SEO (canonical, Open Graph, sitemap); solo un origen válido, nunca HTML. */
const siteOrigin = () => (/^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(env.clientOrigin) ? env.clientOrigin : '');

const robotsTxt = (origin) =>
  [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /mis-compras',
    'Disallow: /perfil',
    'Disallow: /reservas/',
    'Disallow: /live',
    ...(origin ? [`Sitemap: ${origin}/sitemap.xml`] : []),
  ].join('\n') + '\n';

const sitemapXml = (origin) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PUBLIC_PAGES.map(
      (p) => `  <url><loc>${origin}${p}</loc><changefreq>${p === '/resultados' ? 'daily' : 'weekly'}</changefreq></url>`
    ),
    '</urlset>',
  ].join('\n') + '\n';

/**
 * Datos estructurados (schema.org/Event) del evento vigente, tal como lo definió el panel: fecha, lugar y
 * precio no quedan fijos en el HTML. Se recalculan como máximo cada minuto. Nunca rompe la página: ante un
 * error devuelve un objeto vacío.
 */
let jsonLdCache = { at: 0, value: '{}' };
async function eventJsonLd(origin) {
  if (Date.now() - jsonLdCache.at < 60_000) return jsonLdCache.value;
  let value = '{}';
  try {
    const e = await currentEvent();
    if (e) {
      const place = [e.venue, e.venue_area].filter(Boolean).join(', ');
      value = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: e.name,
        description: e.description || 'Bingo benéfico a favor de la niñez atendida por la Asociación Infantil Hogar Sol.',
        startDate: new Date(e.starts_at).toISOString(),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: place ? 'https://schema.org/MixedEventAttendanceMode' : 'https://schema.org/OnlineEventAttendanceMode',
        image: [`${origin}/og-image.png`],
        location: [
          ...(place ? [{ '@type': 'Place', name: e.venue || place, address: { '@type': 'PostalAddress', streetAddress: place, addressCountry: 'CR' } }] : []),
          { '@type': 'VirtualLocation', url: `${origin}/live` },
        ],
        offers: { '@type': 'Offer', url: `${origin}/cartones`, price: e.price, priceCurrency: 'CRC', availability: 'https://schema.org/InStock' },
        organizer: { '@type': 'NGO', name: 'Asociación Infantil Hogar Sol', url: `${origin}/` },
      }).replace(/</g, '\\u003c'); // nunca puede cerrar la etiqueta <script>
    }
  } catch (err) {
    logger.warn('seo.jsonld_failed', { message: err.message });
  }
  jsonLdCache = { at: Date.now(), value };
  return value;
}

// Ningún permiso sensible del navegador hace falta (pantalla completa sí, para la transmisión).
const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';

/**
 * Hash de los <script> en línea de index.html para permitirlos en la CSP sin 'unsafe-inline'.
 * El navegador calcula el hash con los saltos de línea normalizados a LF (estándar HTML): si index.html se
 * compiló en Windows (CRLF), hashear los bytes tal cual bloqueaba el script de tema y accesibilidad.
 */
export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    ([, body]) => `'sha256-${createHash('sha256').update(body.replace(/\r\n?/g, '\n')).digest('base64')}'`
  );
}

function clientCsp(indexHtml) {
  const wsOrigin = env.clientOrigin.replace(/^http/, 'ws');
  const analytics = ANALYTICS_CSP[env.analyticsProvider] ?? NO_ANALYTICS;
  return {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", ...inlineScriptHashes(indexHtml), ...analytics.script],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // estilos en línea de React; sin riesgo de ejecución
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', ...analytics.img],
      connectSrc: ["'self'", wsOrigin, ...env.streamOrigins, ...analytics.connect],
      // LL-HLS (hls.js usa blob:) y WebRTC; el video nativo de Safari carga directo del origen del stream.
      mediaSrc: ["'self'", 'blob:', ...env.streamOrigins],
      workerSrc: ["'self'", 'blob:'],
      frameSrc: [...STREAM_FRAMES, ...MAP_FRAMES],
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

  // HTTPS estricto (opcional): el healthcheck interno del hosting llega por http y no se redirige.
  if (env.forceHttps) {
    app.use((req, res, next) =>
      req.secure || req.path === '/api/health' ? next() : res.redirect(308, `https://${req.hostname}${req.originalUrl}`)
    );
  }
  app.use((req, res, next) => {
    res.set('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  });

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
  app.use('/api/contact', contactRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api', (req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

  // Producción: la web compilada se sirve desde el mismo origen (cookies SameSite=Strict y sin CORS).
  const indexFile = path.join(env.clientDist, 'index.html');
  if (env.serveClient && fs.existsSync(indexFile)) {
    const indexHtml = fs.readFileSync(indexFile, 'utf8').replaceAll('__SITE_ORIGIN__', siteOrigin());
    const pageHeaders = helmet({
      contentSecurityPolicy: clientCsp(indexHtml),
      hsts: false,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // YouTube exige el origen para el video embebido
    });
    app.get('/robots.txt', (req, res) => res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(robotsTxt(siteOrigin())));
    app.get('/sitemap.xml', (req, res) =>
      siteOrigin()
        ? res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(sitemapXml(siteOrigin()))
        : res.status(404).end()
    );
    app.use(pageHeaders, express.static(env.clientDist, { index: false, maxAge: '1y', immutable: true }));
    app.get('/{*splat}', pageHeaders, async (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.type('html').send(indexHtml.replace('__EVENT_JSONLD__', await eventJsonLd(siteOrigin())));
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
