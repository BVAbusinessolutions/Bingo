import { createHash, randomBytes } from 'node:crypto';
import { one, query } from '../db/index.js';

// Tokens de un solo uso (recuperar contraseña, verificar correo).
// Solo se guarda el hash: si alguien lee la base de datos no puede usar los enlaces.
const hash = (raw) => createHash('sha256').update(raw).digest('hex');

/** Crea un token para el usuario, invalida los anteriores del mismo tipo y devuelve el valor en claro. */
export async function issueToken(userId, purpose, ttlMs) {
  await query('delete from app.one_time_tokens where user_id = $1 and purpose = $2', [userId, purpose]);
  const raw = randomBytes(32).toString('hex');
  await query('insert into app.one_time_tokens (token_hash, user_id, purpose, expires_at) values ($1, $2, $3, $4)', [
    hash(raw),
    userId,
    purpose,
    new Date(Date.now() + ttlMs),
  ]);
  return raw;
}

/** Consume el token (borrado atómico): devuelve el userId si es válido y no venció; en cualquier caso deja de servir. */
export async function consumeToken(raw, purpose) {
  if (typeof raw !== 'string' || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const row = await one('delete from app.one_time_tokens where token_hash = $1 and purpose = $2 returning user_id, expires_at', [
    hash(raw),
    purpose,
  ]);
  return row && new Date(row.expires_at) > new Date() ? row.user_id : null;
}

/** Limpieza periódica de enlaces y sesiones vencidas. */
export async function purgeExpiredTokens() {
  await query('delete from app.one_time_tokens where expires_at < now()');
  await query('delete from app.refresh_tokens where expires_at < now()');
}
