import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isProd = process.env.NODE_ENV === 'production';

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
};

const WEAK_SECRETS = new Set(['cambia-esto', 'cambia-esto-tambien', 'secret', 'changeme']);

/** Los secretos JWT deben ser largos, distintos entre sí y no ser los valores de ejemplo. */
function jwtSecrets() {
  const access = required('JWT_ACCESS_SECRET');
  const refresh = required('JWT_REFRESH_SECRET');
  const problems = [];
  for (const [name, value] of [
    ['JWT_ACCESS_SECRET', access],
    ['JWT_REFRESH_SECRET', refresh],
  ]) {
    if (value.length < 32) problems.push(`${name} debe tener al menos 32 caracteres`);
    if (WEAK_SECRETS.has(value)) problems.push(`${name} todavía tiene el valor de ejemplo`);
  }
  if (access === refresh) problems.push('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos');
  if (problems.length) {
    throw new Error(
      `Secretos JWT inseguros:\n- ${problems.join('\n- ')}\nGenera cada uno con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  return { access, refresh };
}

/** "1" (un proxy delante), "false", o una lista de IP/subredes de confianza. Ver docs de Express "trust proxy". */
function trustProxy(value) {
  if (value === undefined || value === '') return isProd ? 1 : false;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

const readCaCert = (file) => (file ? fs.readFileSync(path.resolve(serverRoot, file), 'utf8') : '');

/** Lista de orígenes https separados por coma ("https://a.com, https://b.com"); descarta lo que no sea un origen https. */
const httpsOrigins = (value = '') =>
  value
    .split(',')
    .map((v) => v.trim().replace(/\/+$/, ''))
    .filter((v) => /^https:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(v));

const ANALYTICS_PROVIDERS = new Set(['ga4', 'cloudflare']);

const secrets = jwtSecrets();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  trustProxy: trustProxy(process.env.TRUST_PROXY),
  // Redirige http -> https (308). Solo si el proxy envía X-Forwarded-Proto y TRUST_PROXY está bien configurado.
  forceHttps: process.env.FORCE_HTTPS === 'true',
  // Orígenes permitidos para la transmisión LL-HLS / WebRTC (WHEP); se agregan a la CSP.
  streamOrigins: httpsOrigins(process.env.STREAM_ORIGINS),
  // Analítica sin costo (ga4 | cloudflare): habilita sus dominios en la CSP. El cliente usa VITE_ANALYTICS_*.
  analyticsProvider: ANALYTICS_PROVIDERS.has(process.env.ANALYTICS_PROVIDER) ? process.env.ANALYTICS_PROVIDER : '',
  // En producción el mismo servidor entrega la web compilada (client/dist) con cabeceras de seguridad.
  serveClient: process.env.SERVE_CLIENT === 'true' || (isProd && process.env.SERVE_CLIENT !== 'false'),
  clientDist: path.resolve(serverRoot, process.env.CLIENT_DIST ?? '../client/dist'),
  accessSecret: secrets.access,
  refreshSecret: secrets.refresh,
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  reservationTtlMin: Number(process.env.RESERVATION_TTL_MIN ?? 15),
  // Comprobantes de compras rechazadas, vencidas o canceladas se borran después de N días.
  proofRetentionDays: Number(process.env.PROOF_RETENTION_DAYS ?? 90),
  // Bloqueo por cuenta tras N intentos fallidos (además del límite por IP).
  maxFailedLogins: Number(process.env.MAX_FAILED_LOGINS ?? 5),
  lockMinutes: Number(process.env.LOCK_MINUTES ?? 15),
  db: {
    url: process.env.DATABASE_URL ?? '',
    // Supabase exige TLS. Con DATABASE_CA_CERT (certificado descargado del panel) además se verifica el servidor.
    ssl: process.env.DATABASE_SSL ?? 'require',
    caCert: readCaCert(process.env.DATABASE_CA_CERT),
    poolMax: Number(process.env.DATABASE_POOL_MAX ?? 10),
    pgliteDir: process.env.PGLITE_DIR ?? path.join(serverRoot, '.data', 'pglite'),
  },
  seedDemoData: !isProd && process.env.SEED_DEMO !== 'false',
  seedDemoPurchases: !isProd && process.env.SEED_DEMO_PURCHASES === 'true',
  // Correos a los que llega el aviso de cada compra nueva (separados por coma)
  adminNotifyEmails: (process.env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean),
  // SMTP: sin SMTP_HOST los correos solo se muestran en consola
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', // true para el puerto 465
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM || 'Bingo Hogar Sol <no-responder@hogarsol.org>',
  },
  // Datos de cobro iniciales; luego se editan desde el panel (tabla app.settings).
  payment: {
    holder: process.env.PAYMENT_HOLDER || 'Asociación Infantil Hogar Sol',
    sinpePhone: process.env.PAYMENT_SINPE_PHONE || '6027-1658',
    iban: process.env.PAYMENT_IBAN || 'CR00 0000 0000 0000 0000 00',
    bank: process.env.PAYMENT_BANK || 'Banco Nacional de Costa Rica',
    holderId: process.env.PAYMENT_HOLDER_ID || '3-002-000000',
    sinpeHolder: process.env.PAYMENT_SINPE_HOLDER || '',
    swift: process.env.PAYMENT_SWIFT || '',
  },
};
