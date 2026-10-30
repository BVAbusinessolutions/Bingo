import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { one, query, tx } from '../../db/index.js';
import { env } from '../../config/env.js';
import { authenticate, isUsableAccount, JWT_AUDIENCE, JWT_ISSUER } from '../../middleware/auth.js';
import { emailActionLimiter, loginLimiter, registerLimiter, requireXhrHeader, validateBody } from '../../middleware/security.js';
import { sendMail } from '../../utils/mailer.js';
import { consumeToken, issueToken } from '../../services/oneTimeTokens.js';
import { audit } from '../../services/audit.js';
import { getFile, hasValidSignature, saveFile, sendFile } from '../../services/files.js';
import { disconnectUser } from '../../realtime.js';
import { emailField, nameField, newPasswordField, phoneField } from './auth.schemas.js';

const router = Router();
const REFRESH_COOKIE = 'hs_rt';
const refreshMaxAge = env.refreshTtlDays * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60_000;
const VERIFY_TTL_MS = 24 * 60 * 60_000;
const BCRYPT_COST = 12;

const cookieOptions = {
  httpOnly: true, // JS no puede leerla (protege contra XSS)
  secure: env.isProd, // solo HTTPS en producción
  sameSite: 'strict', // no se envía desde otros sitios (protege contra CSRF)
  path: '/api/auth', // solo viaja a las rutas de auth
};

const USER_COLUMNS =
  'id, name, email, phone, role, status, suspended_until, sanction_reason, email_verified, password_hash, failed_logins, locked_until, avatar_file_id';

/** Lo único que se devuelve de un usuario: nunca el hash ni contadores internos. */
export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  emailVerified: u.email_verified,
  // El id del archivo cambia con cada foto: la URL sirve de llave de caché y no se puede adivinar.
  avatarUrl: u.avatar_file_id ? `/api/auth/avatars/${u.avatar_file_id}` : null,
});

/** Sanción vigente (no DISABLED, que es administrativa): el motivo que dio el admin viaja al usuario. */
const isSanctioned = (u) => !isUsableAccount(u) && ['SUSPENDED', 'BANNED'].includes(u.status);
const sanctionError = (u) => ({
  error: u.status === 'BANNED' ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
  ...(u.status === 'SUSPENDED' && { until: new Date(u.suspended_until).toISOString() }),
  reason: u.sanction_reason ?? null,
});

const findByEmail = (email) => one(`select ${USER_COLUMNS} from app.users where email = $1`, [email]);
const findById = (id) => one(`select ${USER_COLUMNS} from app.users where id = $1`, [id]);
const clientLink = (path, token) => `${env.clientOrigin}${path}?token=${token}`;

async function issueTokens(res, user) {
  const accessToken = jwt.sign({ role: user.role }, env.accessSecret, {
    subject: user.id,
    expiresIn: env.accessTtl,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256',
  });
  const jti = randomUUID();
  await query('insert into app.refresh_tokens (jti, user_id, expires_at) values ($1, $2, $3)', [
    jti,
    user.id,
    new Date(Date.now() + refreshMaxAge),
  ]);
  const refreshToken = jwt.sign({}, env.refreshSecret, {
    subject: user.id,
    jwtid: jti,
    expiresIn: `${env.refreshTtlDays}d`,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256',
  });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: refreshMaxAge });
  return { accessToken, user: publicUser(user) };
}

/** Cierra todas las sesiones: borra refresh tokens y desconecta sus sockets. */
export async function revokeAllFor(userId) {
  await query('delete from app.refresh_tokens where user_id = $1', [userId]);
  disconnectUser(userId);
}

async function sendVerificationEmail(user) {
  const token = await issueToken(user.id, 'VERIFY_EMAIL', VERIFY_TTL_MS);
  sendMail({
    to: user.email,
    subject: 'Confirma tu correo · Bingo Hogar Sol',
    text: `Hola ${user.name}, confirma tu correo para poder comprar cartones. El enlace vence en 24 horas.`,
    action: { label: 'Confirmar mi correo', url: clientLink('/verificar-correo', token) },
  });
}

// ---------- Login ----------
const loginSchema = z.object({ email: emailField, password: z.string().min(8).max(128) });

// Hash ficticio: compara igual aunque el usuario no exista, para no filtrar qué correos están registrados por timing.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_COST);

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await findByEmail(email);
  const locked = user?.locked_until && new Date(user.locked_until) > new Date();
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  // Cuenta bloqueada: mismo mensaje que el límite por IP (no confirma que la cuenta exista).
  if (locked) return res.status(429).json({ error: 'TOO_MANY_LOGIN_ATTEMPTS' });

  // Sanción vigente: solo se informa a quien ya demostró conocer la contraseña.
  if (user && ok && isSanctioned(user)) return res.status(403).json(sanctionError(user));

  if (!user || !ok || !isUsableAccount(user)) {
    if (user && !ok) {
      const [row] = await query(
        `update app.users
            set failed_logins = case when failed_logins + 1 >= $2 then 0 else failed_logins + 1 end,
                locked_until  = case when failed_logins + 1 >= $2 then now() + make_interval(mins => $3) else locked_until end
          where id = $1 returning locked_until`,
        [user.id, env.maxFailedLogins, env.lockMinutes]
      );
      if (row.locked_until && new Date(row.locked_until) > new Date()) {
        await audit({ actorId: user.id, action: 'auth.account_locked', targetType: 'user', targetId: user.id, ip: req.ip });
      }
    }
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  if (user.failed_logins > 0 || user.locked_until) {
    await query('update app.users set failed_logins = 0, locked_until = null where id = $1', [user.id]);
  }
  if (user.status === 'SUSPENDED') {
    // La suspensión ya venció: la cuenta vuelve a quedar activa.
    await query("update app.users set status = 'ACTIVE', suspended_until = null, updated_at = now() where id = $1 and status = 'SUSPENDED'", [
      user.id,
    ]);
  }
  if (user.role === 'ADMIN')
    await audit({ actorId: user.id, action: 'auth.admin_login', targetType: 'user', targetId: user.id, ip: req.ip });
  res.json(await issueTokens(res, user));
});

// ---------- Registro ----------
const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: newPasswordField,
  acceptTerms: z.literal(true),
});

router.post('/register', registerLimiter, validateBody(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  // El rol siempre es CLIENTE: nunca se acepta del cliente.
  const user = await one(
    `insert into app.users (name, email, password_hash, terms_accepted_at) values ($1, $2, $3, now())
     on conflict (email) do nothing returning ${USER_COLUMNS}`,
    [name, email, await bcrypt.hash(password, BCRYPT_COST)]
  );
  if (!user) return res.status(409).json({ error: 'EMAIL_TAKEN' });
  await sendVerificationEmail(user);
  res.status(201).json(await issueTokens(res, user));
});

// ---------- Refresh con rotación ----------
// Cada uso invalida el anterior. Si se reutiliza uno ya usado (señal de robo), se revocan todas las sesiones.
router.post('/refresh', requireXhrHeader, async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) return res.status(204).end(); // visitante sin sesión: no es un error
  let payload;
  try {
    payload = jwt.verify(token, env.refreshSecret, { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
  } catch {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    return res.status(401).json({ error: 'INVALID_SESSION' });
  }
  // Sesión abierta de una cuenta sancionada: la firma ya probó quién es, así que se le explica el motivo
  // (sus sesiones se revocaron al sancionar; sin esto vería un cierre de sesión sin explicación).
  const owner = await findById(payload.sub);
  if (owner && isSanctioned(owner)) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    return res.status(403).json(sanctionError(owner));
  }
  const stored = await one('delete from app.refresh_tokens where jti = $1 and expires_at > now() returning user_id', [payload.jti]);
  if (!stored || stored.user_id !== payload.sub) {
    await revokeAllFor(payload.sub);
    await audit({ actorId: payload.sub, action: 'auth.refresh_reuse_detected', targetType: 'user', targetId: payload.sub, ip: req.ip });
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    return res.status(401).json({ error: 'INVALID_SESSION' });
  }
  const user = await findById(payload.sub);
  if (!user || !isUsableAccount(user)) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    return res.status(401).json({ error: 'INVALID_SESSION' });
  }
  res.json(await issueTokens(res, user));
});

router.post('/logout', requireXhrHeader, async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, env.refreshSecret, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        ignoreExpiration: true,
      });
      await query('delete from app.refresh_tokens where jti = $1', [payload.jti]);
    } catch {
      // token inválido: no hay nada que revocar
    }
  }
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
});

// ---------- Perfil ----------
const currentUser = async (req, res, next) => {
  req.account = await findById(req.user.id);
  return req.account ? next() : res.status(404).json({ error: 'NOT_FOUND' });
};

router.get('/me', authenticate, currentUser, (req, res) => res.json(publicUser(req.account)));

const profileSchema = z.object({ name: nameField, phone: phoneField.nullable().or(z.literal('').transform(() => null)) });

router.patch('/me', authenticate, validateBody(profileSchema), async (req, res) => {
  // Solo name y phone: zod descarta cualquier otro campo (rol, correo, etc.).
  const user = await one(`update app.users set name = $2, phone = $3, updated_at = now() where id = $1 returning ${USER_COLUMNS}`, [
    req.user.id,
    req.body.name,
    req.body.phone,
  ]);
  res.json(publicUser(user));
});

const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: newPasswordField });

router.post('/change-password', emailActionLimiter, authenticate, currentUser, validateBody(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!(await bcrypt.compare(currentPassword, req.account.password_hash))) {
    return res.status(400).json({ error: 'INVALID_PASSWORD' });
  }
  await query('update app.users set password_hash = $2, updated_at = now() where id = $1', [
    req.account.id,
    await bcrypt.hash(newPassword, BCRYPT_COST),
  ]);
  await revokeAllFor(req.account.id); // cierra las otras sesiones; esta recibe tokens nuevos
  await audit({ actorId: req.account.id, action: 'auth.password_changed', targetType: 'user', targetId: req.account.id, ip: req.ip });
  res.json(await issueTokens(res, req.account));
});

router.post('/logout-all', requireXhrHeader, authenticate, async (req, res) => {
  await revokeAllFor(req.user.id);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
});

// ---------- Recuperar contraseña ----------
// Siempre responde 204: no revela si el correo está registrado.
router.post('/forgot-password', emailActionLimiter, validateBody(z.object({ email: emailField })), async (req, res) => {
  const user = await findByEmail(req.body.email);
  if (user && isUsableAccount(user)) {
    const token = await issueToken(user.id, 'RESET_PASSWORD', RESET_TTL_MS);
    sendMail({
      to: user.email,
      subject: 'Restablece tu contraseña · Bingo Hogar Sol',
      text: `Hola ${user.name}, para crear una contraseña nueva usa el botón de abajo. Vence en 30 minutos. Si no lo pediste, ignora este correo.`,
      action: { label: 'Crear contraseña nueva', url: clientLink('/restablecer', token) },
    });
  }
  res.status(204).end();
});

router.post(
  '/reset-password',
  emailActionLimiter,
  validateBody(z.object({ token: z.string().max(128), password: newPasswordField })),
  async (req, res) => {
    const userId = await consumeToken(req.body.token, 'RESET_PASSWORD');
    if (!userId) return res.status(400).json({ error: 'INVALID_TOKEN' });
    // Abrió un enlace enviado a su correo: queda verificado y se desbloquea.
    await query(
      'update app.users set password_hash = $2, email_verified = true, failed_logins = 0, locked_until = null, updated_at = now() where id = $1',
      [userId, await bcrypt.hash(req.body.password, BCRYPT_COST)]
    );
    await revokeAllFor(userId);
    await audit({ actorId: userId, action: 'auth.password_reset', targetType: 'user', targetId: userId, ip: req.ip });
    res.status(204).end();
  }
);

// ---------- Verificación de correo ----------
router.post('/verify-email', validateBody(z.object({ token: z.string().max(128) })), async (req, res) => {
  const userId = await consumeToken(req.body.token, 'VERIFY_EMAIL');
  if (!userId) return res.status(400).json({ error: 'INVALID_TOKEN' });
  const user = await one(`update app.users set email_verified = true, updated_at = now() where id = $1 returning ${USER_COLUMNS}`, [
    userId,
  ]);
  res.json(publicUser(user));
});

router.post('/resend-verification', emailActionLimiter, authenticate, currentUser, async (req, res) => {
  if (!req.account.email_verified) await sendVerificationEmail(req.account);
  res.status(204).end();
});


// ---------- Foto de perfil ----------
// El navegador la recorta a un cuadrado y la re-codifica (quita metadatos como la ubicación GPS).
const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (req, file, cb) => cb(null, AVATAR_TYPES.has(file.mimetype)),
});

router.put('/me/avatar', requireXhrHeader, authenticate, avatarUpload.single('avatar'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'AVATAR_REQUIRED' });
  if (!hasValidSignature(file.mimetype, file.buffer)) return res.status(400).json({ error: 'INVALID_FILE' });
  const user = await tx(async (q) => {
    const fileId = await saveFile(q, { kind: 'AVATAR', mime: file.mimetype, data: file.buffer });
    const [old] = await q('select avatar_file_id from app.users where id = $1 for update', [req.user.id]);
    const [u] = await q(`update app.users set avatar_file_id = $2, updated_at = now() where id = $1 returning ${USER_COLUMNS}`, [req.user.id, fileId]);
    if (old?.avatar_file_id) await q("delete from app.files where id = $1 and kind = 'AVATAR'", [old.avatar_file_id]);
    return u;
  });
  res.json(publicUser(user));
});

router.delete('/me/avatar', requireXhrHeader, authenticate, async (req, res) => {
  const user = await tx(async (q) => {
    const [old] = await q('select avatar_file_id from app.users where id = $1 for update', [req.user.id]);
    const [u] = await q(`update app.users set avatar_file_id = null, updated_at = now() where id = $1 returning ${USER_COLUMNS}`, [req.user.id]);
    if (old?.avatar_file_id) await q("delete from app.files where id = $1 and kind = 'AVATAR'", [old.avatar_file_id]);
    return u;
  });
  res.json(publicUser(user));
});

// Pública (la usa un <img>), pero solo sirve archivos AVATAR: nunca comprobantes de pago.
router.get('/avatars/:fileId', async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.fileId).success) return res.status(404).json({ error: 'NOT_FOUND' });
  const row = await one("select id from app.files where id = $1 and kind = 'AVATAR'", [req.params.fileId]);
  sendFile(res, row && (await getFile(row.id)), { cache: true });
});

export default router;
