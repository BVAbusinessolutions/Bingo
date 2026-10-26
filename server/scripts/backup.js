// Respaldo completo de la base de datos a un archivo JSON comprimido: npm run backup
// Complementa los respaldos automáticos de Supabase. Guárdalo fuera del servidor (contiene datos personales).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { connect, query, close } from '../src/db/index.js';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../backups');

try {
  await connect();
  const tables = await query(
    "select table_name from information_schema.tables where table_schema = 'app' and table_type = 'BASE TABLE' order by table_name"
  );
  const dump = { createdAt: new Date().toISOString(), schema: 'app', tables: {} };
  for (const { table_name: name } of tables) {
    // El nombre viene del catálogo del propio Postgres (no de un usuario) y se cita como identificador.
    const rows = await query(`select * from app."${name.replace(/"/g, '""')}"`);
    dump.tables[name] = rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Uint8Array ? { base64: Buffer.from(v).toString('base64') } : v]))
    );
    console.log(`  ${name}: ${rows.length} filas`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `bingo-${dump.createdAt.replace(/[:.]/g, '-')}.json.gz`);
  fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(dump)), { mode: 0o600 });
  console.log(`✔ Respaldo creado: ${file}`);
} catch (err) {
  console.error('✖ No se pudo crear el respaldo:', err.message);
  process.exitCode = 1;
} finally {
  await close();
}
