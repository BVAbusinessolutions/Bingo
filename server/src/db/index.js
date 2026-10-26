// Acceso a datos. Producción: Postgres de Supabase (DATABASE_URL). Desarrollo/pruebas sin DATABASE_URL:
// PGlite, un Postgres real embebido que guarda los datos en server/.data (o en memoria con PGLITE_DIR=memory).
// Ambos exponen la misma interfaz: query(sql, params) y tx(async (q) => ...).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(here, 'migrations');

let driver = null;

async function createPgDriver() {
  const { default: pg } = await import('pg');
  // bigint (COUNT, identity) como número: los valores de esta app caben de sobra en un Number.
  pg.types.setTypeParser(20, (v) => Number(v));
  const ssl = env.db.ssl === 'disable' ? false : { rejectUnauthorized: Boolean(env.db.caCert), ca: env.db.caCert || undefined };
  const pool = new pg.Pool({ connectionString: env.db.url, ssl, max: env.db.poolMax, idleTimeoutMillis: 30_000 });
  pool.on('error', (err) => logger.error('db.pool_error', { message: err.message }));
  return {
    name: 'postgres',
    query: (text, params) => pool.query(text, params),
    exec: (text) => pool.query(text),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        // Sin parámetros pg usa el protocolo simple, que admite varias sentencias (migraciones).
        const result = await fn(
          (text, params) => client.query(text, params),
          (text) => client.query(text)
        );
        await client.query('commit');
        return result;
      } catch (err) {
        await client.query('rollback').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function createPgliteDriver() {
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = env.db.pgliteDir === 'memory' ? undefined : env.db.pgliteDir;
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  // Serializa transacciones: PGlite tiene una sola conexión.
  let chain = Promise.resolve();
  const run = (fn) => {
    const next = chain.then(fn, fn);
    chain = next.catch(() => {});
    return next;
  };
  return {
    name: 'pglite',
    query: (text, params) => db.query(text, params),
    exec: (text) => db.exec(text),
    tx: (fn) =>
      run(() =>
        db.transaction((t) =>
          fn(
            (text, params) => t.query(text, params),
            (text) => t.exec(text)
          )
        )
      ),
    close: () => db.close(),
  };
}

export async function connect() {
  if (driver) return driver;
  if (env.db.url) driver = await createPgDriver();
  else if (env.isProd) throw new Error('Falta DATABASE_URL: en producción se requiere la base de datos de Supabase');
  else driver = await createPgliteDriver();
  logger.info('db.connected', { driver: driver.name });
  return driver;
}

const ensure = () => {
  if (!driver) throw new Error('La base de datos no está conectada: llama a connect() al iniciar');
  return driver;
};

/** Consulta parametrizada. Devuelve las filas. */
export const query = async (text, params = []) => (await ensure().query(text, params)).rows;

/** Devuelve la primera fila o null. */
export const one = async (text, params = []) => (await query(text, params))[0] ?? null;

/**
 * Transacción: fn recibe q(text, params) -> filas. Si fn lanza, se revierte todo.
 */
export const tx = (fn) => ensure().tx((raw) => fn(async (text, params = []) => (await raw(text, params)).rows));

export const close = async () => {
  await driver?.close();
  driver = null;
};

/** Aplica en orden las migraciones .sql que aún no se aplicaron. */
export async function migrate() {
  const d = ensure();
  await d.exec(
    'create schema if not exists app; create table if not exists app.schema_migrations (version text primary key, applied_at timestamptz not null default now());'
  );
  const applied = new Set((await query('select version from app.schema_migrations')).map((r) => r.version));
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await d.tx(async (q, exec) => {
      await exec(sql);
      await q('insert into app.schema_migrations (version) values ($1)', [file]);
    });
    logger.info('db.migration_applied', { file });
  }
}
