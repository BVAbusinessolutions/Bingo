// Tareas periódicas del servidor. Cada una tolera fallos (se registran y se reintentan en el próximo ciclo).
import { query } from './db/index.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { releaseExpiredReservations } from './modules/reservations/reservations.service.js';
import { purgeExpiredTokens } from './services/oneTimeTokens.js';

/**
 * Política de retención: los comprobantes de compras que no se concretaron (rechazadas, vencidas,
 * canceladas o reembolsadas) se borran tras PROOF_RETENTION_DAYS. Se conserva el n.º de comprobante.
 */
export async function purgeOldProofs() {
  const rows = await query(
    `delete from app.files f
      where f.kind = 'PROOF'
        and exists (select 1 from app.reservations r
                     where r.proof_file_id = f.id
                       and r.status in ('REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED')
                       and coalesce(r.decided_at, r.expires_at) < now() - make_interval(days => $1))
      returning f.id`,
    [env.proofRetentionDays]
  );
  if (rows.length) logger.info('jobs.proofs_purged', { count: rows.length });
}

const every = (ms, name, fn) => {
  const run = () => fn().catch((err) => logger.error(`jobs.${name}_failed`, { message: err.message }));
  return setInterval(run, ms).unref();
};

export function startJobs() {
  return [
    every(30_000, 'release_expired', releaseExpiredReservations),
    every(60 * 60_000, 'purge_tokens', purgeExpiredTokens),
    every(6 * 60 * 60_000, 'purge_proofs', purgeOldProofs),
  ];
}
