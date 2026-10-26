import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// RATE_LIMIT_SCALE multiplica todos los límites (1 en producción; las pruebas automáticas lo amplían).
const scale = Math.max(1, Number(process.env.RATE_LIMIT_SCALE ?? 1));

const limiter = (windowMs, limit, message, extra = {}) =>
  rateLimit({ windowMs, limit: limit * scale, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: message }, ...extra });

// Fuerza bruta en login: 5 intentos FALLIDOS / 15 min por IP (los inicios correctos no cuentan).
// Además hay bloqueo por cuenta (ver auth.routes.js).
export const loginLimiter = limiter(15 * 60_000, 5, 'TOO_MANY_LOGIN_ATTEMPTS', { skipSuccessfulRequests: true });
// Creación masiva de cuentas: 10 registros / hora por IP
export const registerLimiter = limiter(60 * 60_000, 10, 'TOO_MANY_REQUESTS');
// Acaparamiento de cartones: 10 reservas / 10 min por IP
export const reservationLimiter = limiter(10 * 60_000, 10, 'TOO_MANY_RESERVATIONS');
// Correos de recuperación / verificación y cambios de contraseña: 10 por 15 min por IP
export const emailActionLimiter = limiter(15 * 60_000, 10, 'TOO_MANY_REQUESTS');
// Reclamos de bingo: 10 por minuto por IP
export const claimLimiter = limiter(60_000, 10, 'TOO_MANY_REQUESTS');
// Importación de ZIP de cartones (operación pesada): 5 por hora
export const zipUploadLimiter = limiter(60 * 60_000, 5, 'TOO_MANY_REQUESTS');
export const apiLimiter = limiter(60_000, 300, 'TOO_MANY_REQUESTS');

const validationError = (res, error) => res.status(400).json({ error: 'VALIDATION_ERROR', details: z.flattenError(error).fieldErrors });

/** Valida body con un schema zod; reemplaza req.body por los datos ya limpios. */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) return validationError(res, result.error);
  req.body = result.data;
  next();
};

/** Valida la query string; los datos limpios quedan en req.validQuery (en Express 5 req.query es de solo lectura). */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query ?? {});
  if (!result.success) return validationError(res, result.error);
  req.validQuery = result.data;
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
