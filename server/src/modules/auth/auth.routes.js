import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, createUser } from '../../db.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import {
  emailActionLimiter,
  loginLimiter,
  registerLimiter,
  requireXhrHeader,
  validateBody,
} from '../../middleware/security.js';
import { sendMail } from '../../utils/mailer.js';
import { consumeToken, issueToken } from '../../utils/oneTimeTokens.js';

const router = Router();
const REFRESH_COOKIE = 'hs_rt';
const refreshMaxAge = env.refreshTtlDays * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true, // JS no puede leerla (protege contra XSS)
  secure: env.isProd, // solo HTTPS en producción
  sameSite: 'strict', // no se envía desde otros sitios (protege contra CSRF)
  path: '/api/auth', // solo viaja a las rutas de auth
};

const RESET_TTL_MS = 30 * 60_000;
const VERIFY_TTL_MS = 24 * 60 * 60_000;

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  emailVerified: u.emailVerified,
});

const findByEmail = (email) => [...db.users.values()].find((u) => u.email === email);
const clientLink = (path, token) => `${env.clientOrigin}${path}?token=${token}`;

function sendVerificationEmail(user) {
  const token = issueToken(db.emailVerifications, user.id, VERIFY_TTL_MS);
  sendMail({
    to: user.email,
    subject: 'Confirma tu correo · Bingo Hogar Sol',
    text: `Hola ${user.name}, confirma tu correo para poder comprar cartones:
${clientLink('/verificar-correo', token)}
El enlace vence en 24 horas.`,
  });
}

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

const emailField = z.string().trim().toLowerCase().email().max(120);
const nameField = z.string().trim().min(3).max(80).regex(/^[\p{L}\p{M}\s'.-]+$/u);
const newPasswordField = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/\d/);

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(8).max(128),
});

// Hash ficticio: compara igual aunque el usuario no exista, para no filtrar qué correos están registrados por timing.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = findByEmail(email);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  res.json(issueTokens(res, user));
});

const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: newPasswordField,
  acceptTerms: z.literal(true),
});

router.post('/register', registerLimiter, validateBody(registerSchema), async (req, res) => {
  if (findByEmail(req.body.email)) return res.status(409).json({ error: 'EMAIL_TAKEN' });
  const { name, email, password } = req.body;
  const user = await createUser({ name, email, password }); // rol siempre CLIENTE: nunca se acepta del cliente
  user.termsAcceptedAt = new Date().toISOString();
  sendVerificationEmail(user);
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

const currentUser = (req, res, next) => {
  req.account = db.users.get(req.user.id);
  return req.account ? next() : res.status(404).json({ error: 'NOT_FOUND' });
};

router.get('/me', authenticate, currentUser, (req, res) => res.json(publicUser(req.account)));

// ---------- Perfil ----------
const profileSchema = z.object({
  name: nameField,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,15}$/)
    .nullable()
    .or(z.literal('').transform(() => null)),
});

router.patch('/me', authenticate, currentUser, validateBody(profileSchema), (req, res) => {
  Object.assign(req.account, req.body); // solo name y phone: zod descarta cualquier otro campo
  res.json(publicUser(req.account));
});

const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: newPasswordField });

router.post(
  '/change-password',
  emailActionLimiter,
  authenticate,
  currentUser,
  validateBody(changePasswordSchema),
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!(await bcrypt.compare(currentPassword, req.account.passwordHash))) {
      return res.status(400).json({ error: 'INVALID_PASSWORD' });
    }
    req.account.passwordHash = await bcrypt.hash(newPassword, 12);
    revokeAllFor(req.account.id); // cierra las otras sesiones; esta recibe tokens nuevos
    res.json(issueTokens(res, req.account));
  }
);

router.post('/logout-all', requireXhrHeader, authenticate, (req, res) => {
  revokeAllFor(req.user.id);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
});

// ---------- Recuperar contraseña ----------
// Siempre responde 204: no revela si el correo está registrado.
router.post('/forgot-password', emailActionLimiter, validateBody(z.object({ email: emailField })), (req, res) => {
  const user = findByEmail(req.body.email);
  if (user) {
    const token = issueToken(db.passwordResets, user.id, RESET_TTL_MS);
    sendMail({
      to: user.email,
      subject: 'Restablece tu contraseña · Bingo Hogar Sol',
      text: `Hola ${user.name}, para crear una contraseña nueva abre este enlace:
${clientLink('/restablecer', token)}
Vence en 30 minutos. Si no lo pediste, ignora este correo.`,
    });
  }
  res.status(204).end();
});

router.post(
  '/reset-password',
  emailActionLimiter,
  validateBody(z.object({ token: z.string().max(128), password: newPasswordField })),
  async (req, res) => {
    const userId = consumeToken(db.passwordResets, req.body.token);
    const user = userId && db.users.get(userId);
    if (!user) return res.status(400).json({ error: 'INVALID_TOKEN' });
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.emailVerified = true; // abrió un enlace enviado a su correo
    revokeAllFor(user.id);
    res.status(204).end();
  }
);

// ---------- Verificación de correo ----------
router.post('/verify-email', validateBody(z.object({ token: z.string().max(128) })), (req, res) => {
  const userId = consumeToken(db.emailVerifications, req.body.token);
  const user = userId && db.users.get(userId);
  if (!user) return res.status(400).json({ error: 'INVALID_TOKEN' });
  user.emailVerified = true;
  res.json(publicUser(user));
});

router.post('/resend-verification', emailActionLimiter, authenticate, currentUser, (req, res) => {
  if (!req.account.emailVerified) sendVerificationEmail(req.account);
  res.status(204).end();
});

export default router;
