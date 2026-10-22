import rateLimit from 'express-rate-limit';

const limiter = (windowMs, limit, message, extra = {}) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: message }, ...extra });

// Fuerza bruta en login: 5 intentos FALLIDOS / 15 min por IP (los inicios correctos no cuentan)
export const loginLimiter = limiter(15 * 60_000, 5, 'TOO_MANY_LOGIN_ATTEMPTS', { skipSuccessfulRequests: true });
// Creación masiva de cuentas: 10 registros / hora por IP
export const registerLimiter = limiter(60 * 60_000, 10, 'TOO_MANY_REQUESTS');
// Acaparamiento de cartones: 10 reservas / 10 min por IP
export const reservationLimiter = limiter(10 * 60_000, 10, 'TOO_MANY_RESERVATIONS');
// Correos de recuperación / verificación y cambios de contraseña: 10 por 15 min por IP
export const emailActionLimiter = limiter(15 * 60_000, 10, 'TOO_MANY_REQUESTS');
// Reclamos de bingo: 10 por minuto por IP
export const claimLimiter = limiter(60_000, 10, 'TOO_MANY_REQUESTS');
export const apiLimiter = limiter(60_000, 300, 'TOO_MANY_REQUESTS');

/** Valida body con un schema zod; reemplaza req.body por los datos ya limpios. */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: result.error.flatten().fieldErrors });
  }
  req.body = result.data;
  next();
};

/**
 * Anti-CSRF para rutas que usan la cookie (refresh/logout): un formulario de otro sitio no puede
 * poner cabeceras personalizadas sin pasar por CORS. Se suma a SameSite=Strict.
 */
export function requireXhrHeader(req, res, next) {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') return res.status(403).json({ error: 'CSRF' });
  next();
}
