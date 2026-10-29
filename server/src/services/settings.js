import { one, query } from '../db/index.js';
import { env } from '../config/env.js';

/** Texto que el cliente debe escribir en el detalle del SINPE o la transferencia. */
export const PAYMENT_DETAIL_TEXT = 'Bingo';

let cache = null; // los datos de cobro se leen en cada vista de reserva: se cachean en memoria

/** Datos de cobro vigentes (los del panel; si nunca se editaron, los del .env). */
export async function getPayment() {
  if (!cache) {
    const row = await one("select value from app.settings where key = 'payment'");
    cache = { ...env.payment, ...(row?.value ?? {}) };
  }
  return { ...cache, detail: PAYMENT_DETAIL_TEXT };
}

export async function updatePayment(value, actorId) {
  await query(
    `insert into app.settings (key, value, updated_at, updated_by) values ('payment', $1, now(), $2)
     on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
    [JSON.stringify(value), actorId]
  );
  cache = null;
  return getPayment();
}
