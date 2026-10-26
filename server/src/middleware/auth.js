import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { one } from '../db/index.js';

export const JWT_ISSUER = 'hogar-sol';
export const JWT_AUDIENCE = 'hogar-sol-api';

export function verifyAccessToken(token) {
  return jwt.verify(token, env.accessSecret, { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
}

/** Usuario activo con su rol actual (de la BD, no del token): desactivar o cambiar rol aplica al instante. */
export const loadActiveUser = (id) => one("select id, role from app.users where id = $1 and status = 'ACTIVE'", [id]);

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
