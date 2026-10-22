import { createHash, randomBytes } from 'node:crypto';

// Tokens de un solo uso (recuperar contraseña, verificar correo).
// Solo se guarda el hash: si alguien lee la base de datos no puede usar los enlaces.
const hash = (raw) => createHash('sha256').update(raw).digest('hex');

/** Crea un token para el usuario, invalida los anteriores del mismo tipo y devuelve el valor en claro. */
export function issueToken(store, userId, ttlMs) {
  for (const [key, t] of store) if (t.userId === userId) store.delete(key);
  const raw = randomBytes(32).toString('hex');
  store.set(hash(raw), { userId, expiresAt: Date.now() + ttlMs });
  return raw;
}

/** Consume el token: devuelve el userId si es válido y no venció; en cualquier caso deja de servir. */
export function consumeToken(store, raw) {
  if (typeof raw !== 'string' || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const key = hash(raw);
  const entry = store.get(key);
  store.delete(key);
  return entry && entry.expiresAt > Date.now() ? entry.userId : null;
}
