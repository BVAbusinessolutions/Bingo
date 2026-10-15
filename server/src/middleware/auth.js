import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function verifyAccessToken(token) {
  return jwt.verify(token, env.accessSecret, { algorithms: ['HS256'], issuer: 'hogar-sol' });
}

/** Exige "Authorization: Bearer <token>" válido. */
export function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

/** Autoriza por rol: authorize('ADMIN') */
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'FORBIDDEN' });
