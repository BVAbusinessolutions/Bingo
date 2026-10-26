// Arranca la app completa contra un Postgres embebido en memoria (PGlite) con los datos de demostración.
import zlib from 'node:zlib';
import request from 'supertest';
import { connect, migrate, close, query, one } from '../src/db/index.js';
import { seedDemoData, DEMO_EVENT_ID } from '../src/db/seed.js';
import { createApp } from '../src/app.js';
import { outbox } from '../src/utils/mailer.js';

export { DEMO_EVENT_ID, outbox, query, one };

let app;

export async function startApp() {
  if (app) return app;
  await connect();
  await migrate();
  await seedDemoData();
  app = createApp();
  return app;
}

export const stopApp = () => close();

export const api = () => request(app);

/** Inicia sesión y devuelve { token, cookie }. */
export async function login(email, password) {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken, cookie: res.headers['set-cookie'], user: res.body.user };
}

export const ADMIN = ['admin@hogarsol.org', 'Admin123!'];
export const CLIENTE = ['cliente@hogarsol.org', 'Cliente123!'];
export const JUGADOR = ['jugador@hogarsol.org', 'Jugador123!'];

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** Último enlace con token enviado por correo a una ruta (/verificar-correo, /restablecer). */
export const lastMailToken = (path) => {
  for (let i = outbox.length - 1; i >= 0; i--) {
    const match = outbox[i].text.match(new RegExp(`${path}[?]token=([a-f0-9]{64})`));
    if (match) return match[1];
  }
  return null;
};

let counter = 0;
/** Crea un cliente nuevo ya verificado y devuelve su sesión. */
export async function newVerifiedClient() {
  counter += 1;
  const email = `prueba${Date.now()}${counter}@example.com`;
  const res = await api().post('/api/auth/register').send({ name: 'Persona Prueba', email, password: 'Clave12345', acceptTerms: true });
  await query('update app.users set email_verified = true where email = $1', [email]);
  return { token: res.body.accessToken, email, id: res.body.user.id };
}

/** PNG mínimo válido (1x1) para comprobantes e imágenes de prueba. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/** Construye un ZIP sin compresión (método "stored") a partir de [{ name, data }]. */
export function buildZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name);
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}
