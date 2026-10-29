import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { one } from '../db/index.js';

export const JWT_ISSUER = 'hogar-sol';
export const JWT_AUDIENCE = 'hogar-sol-api';

export function verifyAccessToken(token) {
  return jwt.verify(token, env.accessSecret, { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
}

/** SQL: la cuenta se puede usar (activa, o con una suspensión temporal que ya venció). */
export const USABLE_ACCOUNT_SQL = "(status = 'ACTIVE' or (status = 'SUSPENDED' and suspended_until <= now()))";

/** Lo mismo que USABLE_ACCOUNT_SQL, para una fila ya leída de app.users. */
export const isUsableAccount = (u) =>
  u.status === 'ACTIVE' || (u.status === 'SUSPENDED' && u.suspended_until != null && new Date(u.suspended_until) <= new Date());

/** Usuario activo con su rol actual (de la BD, no del token): desactivar, sancionar o cambiar rol aplica al instante. */
export const loadActiveUser = (id) => one(`select id, role from app.users where id = $1 and ${USABLE_ACCOUNT_SQL}`, [id]);

/** Exige "Authorization: Bearer <token>" válido de un usuario activo. */
export async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'UNAUTHORIZED' });
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  try {
    const user = await loadActiveUser(payload.sub);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/** Autoriza por rol: authorize('ADMIN') */
export const authorize =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'FORBIDDEN' });
