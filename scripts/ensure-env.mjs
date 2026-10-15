// Crea server/.env con secretos JWT aleatorios si todavía no existe.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const target = new URL('../server/.env', import.meta.url);
if (!existsSync(target)) {
  const example = readFileSync(new URL('../server/.env.example', import.meta.url), 'utf8');
  const secret = () => randomBytes(48).toString('hex');
  writeFileSync(
    target,
    example
      .replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET=${secret()}`)
      .replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${secret()}`)
  );
  console.log('server/.env creado con secretos aleatorios.');
}
