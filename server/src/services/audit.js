import { query } from '../db/index.js';
import { logger } from '../utils/logger.js';

/**
 * Registra una acción administrativa o de seguridad (append-only).
 * Nunca guardar contraseñas, tokens ni datos completos de pago en `details`.
 * Un fallo al auditar se registra en el log pero no rompe la acción principal.
 */
export async function audit({ actorId = null, action, targetType = null, targetId = null, details = {}, ip = null }, q = null) {
  const sql = 'insert into app.audit_log (actor_id, action, target_type, target_id, details, ip) values ($1, $2, $3, $4, $5, $6)';
  const params = [actorId, action, targetType, targetId == null ? null : String(targetId), JSON.stringify(details), ip];
  try {
    if (q) await q(sql, params);
    else await query(sql, params);
  } catch (err) {
    logger.error('audit.write_failed', { action, message: err.message });
    if (q) throw err; // dentro de una transacción, que se revierta todo
  }
}

/** Datos del actor a partir de la petición autenticada. */
export const actorFrom = (req) => ({ actorId: req.user?.id ?? null, ip: req.ip ?? null });
