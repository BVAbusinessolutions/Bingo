import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, createUser } from '../../db.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { loginLimiter, registerLimiter, requireXhrHeader, validateBody } from '../../middleware/security.js';

const router = Router();
const REFRESH_COOKIE = 'hs_rt';
const refreshMaxAge = env.refreshTtlDays * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true, // JS no puede leerla (protege contra XSS)
  secure: env.isProd, // solo HTTPS en producción
  sameSite: 'strict', // no se envía desde otros sitios (protege contra CSRF)
  path: '/api/auth', // solo viaja a las rutas de auth
};

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function issueTokens(res, user) {
  const accessToken = jwt.sign({ role: user.role }, env.accessSecret, {
    subject: user.id,
    expiresIn: env.accessTtl,
    issuer: 'hogar-sol',
    algorithm: 'HS256',
  });
  const jti = randomUUID();
  db.refreshTokens.set(jti, { userId: user.id, expiresAt: Date.now() + refreshMaxAge });
  const refreshToken = jwt.sign({}, env.refreshSecret, {
    subject: user.id,
    jwtid: jti,
    expiresIn: `${env.refreshTtlDays}d`,
    issuer: 'hogar-sol',
    algorithm: 'HS256',
  });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: refreshMaxAge });
  return { accessToken, user: publicUser(user) };
}

const revokeAllFor = (userId) => {
  for (const [jti, t] of db.refreshTokens) if (t.userId === userId) db.refreshTokens.delete(jti);
};

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(128),
});

// Hash ficticio: compara igual aunque el usuario no exista, para no filtrar qué correos están registrados por timing.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = [...db.users.values()].find((u) => u.email === email);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  res.json(issueTokens(res, user));
});

const registerSchema = z.object({
  name: z.string().trim().min(3).max(80).regex(/^[\p{L}\p{M}\s'.-]+$/u),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/)
    .regex(/\d/),
});

router.post('/register', registerLimiter, validateBody(registerSchema), async (req, res) => {
  if ([...db.users.values()].some((u) => u.email === req.body.email)) {
    return res.status(409).json({ error: 'EMAIL_TAKEN' });
  }
  const user = await createUser(req.body); // rol siempre USER: nunca se acepta del cliente
  res.status(201).json(issueTokens(res, user));
});

// Rotación de refresh tokens: cada uso invalida el anterior. Si se reutiliza uno ya usado
// (señal de robo), se revocan todas las sesiones del usuario.
router.post('/refresh', requireXhrHeader, (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) return res.status(204).end(); // visitante sin sesión: no es un error
  try {
    const payload = jwt.verify(token, env.refreshSecret, { algorithms: ['HS256'], issuer: 'hogar-sol' });
    const stored = db.refreshTokens.get(payload.jti);
    if (!stored) {
      revokeAllFor(payload.sub);
      throw new Error('REUSED');
    }
    db.refreshTokens.delete(payload.jti);
    const user = db.users.get(payload.sub);
    if (!user) throw new Error('NO_USER');
    res.json(issueTokens(res, user));
  } catch {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.status(401).json({ error: 'INVALID_SESSION' });
  }
});

router.post('/logout', requireXhrHeader, (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    const payload = jwt.decode(token);
    if (payload?.jti) db.refreshTokens.delete(payload.jti);
  }
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
});

router.get('/me', authenticate, (req, res) => {
  const user = db.users.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(publicUser(user));
});

export default router;
