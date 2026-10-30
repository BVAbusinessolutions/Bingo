// Cartones de prueba para el juego en vivo. SOLO desarrollo: se niega a correr con NODE_ENV=production.
//
//   npm run demo:cartones                 asigna 3 cartones aprobados a cliente@hogarsol.org
//   npm run demo:cartones -- --vivo       además pone el evento demo EN VIVO (para "Jugar en vivo")
//   npm run demo:cartones -- --reiniciar  quita los cartones de prueba, las balotas y los reclamos,
//                                         y devuelve el evento a "programado" (0 vendidos)
//
// Las balotas se cantan desde Administración > Sorteo (así llegan en tiempo real por el socket).
// Detén el servidor antes de correrlo si usas la base embebida (PGlite admite un solo proceso).
import { connect, close, one, query, tx } from '../src/db/index.js';
import { DEMO_EVENT_ID } from '../src/db/seed.js';

const DEMO_EMAIL = 'cliente@hogarsol.org';
const DEMO_REFS = ['DEMO-PRUEBA', 'DEMO0001']; // DEMO0001 = compras de prueba del seed
const CARDS = 3;
const args = new Set(process.argv.slice(2));

if (process.env.NODE_ENV === 'production') {
  console.error('✖ Este script es solo para desarrollo.');
  process.exit(1);
}

async function reset() {
  await tx(async (q) => {
    const demo = await q('select id from app.reservations where event_id = $1 and payment_reference = any($2::text[]) and decided_by is null', [
      DEMO_EVENT_ID,
      DEMO_REFS,
    ]);
    const ids = demo.map((r) => r.id);
    await q('delete from app.claims where event_id = $1', [DEMO_EVENT_ID]);
    await q('delete from app.draws where event_id = $1', [DEMO_EVENT_ID]);
    if (ids.length) {
      await q("update app.cards set status = 'AVAILABLE', owner_id = null, reservation_id = null where reservation_id = any($1::uuid[])", [ids]);
      await q('delete from app.reservation_cards where reservation_id = any($1::uuid[])', [ids]);
      await q('delete from app.reservations where id = any($1::uuid[])', [ids]);
    }
    await q("update app.events set status = 'SCHEDULED' where id = $1", [DEMO_EVENT_ID]);
  });
  console.log('✔ Evento demo reiniciado: 0 vendidos, sin balotas ni reclamos, estado "programado".');
}

async function assign() {
  const user = await one('select id, name, email from app.users where email = $1', [DEMO_EMAIL]);
  if (!user) throw new Error(`No existe la cuenta ${DEMO_EMAIL} (se crea con SEED_DEMO en una base vacía).`);
  const owned = await query("select serial from app.cards where event_id = $1 and owner_id = $2 and status = 'SOLD' order by serial", [DEMO_EVENT_ID, user.id]);
  if (owned.length >= CARDS) {
    console.log(`• ${DEMO_EMAIL} ya tiene ${owned.length} cartones: ${owned.map((c) => `#${c.serial}`).join(', ')}`);
    return;
  }
  const serials = await tx(async (q) => {
    const [event] = await q('select price from app.events where id = $1', [DEMO_EVENT_ID]);
    if (!event) throw new Error(`No existe el evento demo ${DEMO_EVENT_ID}.`);
    const free = await q("select id, serial from app.cards where event_id = $1 and status = 'AVAILABLE' order by serial limit $2 for update", [
      DEMO_EVENT_ID,
      CARDS - owned.length,
    ]);
    // Sin decided_by: no es dinero recibido y no suma a la recaudación (igual que el seed).
    const [r] = await q(
      `insert into app.reservations (event_id, user_id, status, total, buyer_full_name, buyer_national_id, buyer_phone, buyer_email,
                                     payment_method, payment_reference, expires_at, decided_at, proof_uploaded_at)
       values ($1, $2, 'APPROVED', $3, $4, '1-1111-1111', '8888-0000', $5, 'SINPE', 'DEMO-PRUEBA', now(), now(), now()) returning id`,
      [DEMO_EVENT_ID, user.id, free.length * event.price, user.name, user.email]
    );
    await q("update app.cards set status = 'SOLD', owner_id = $1, reservation_id = $2 where id = any($3::uuid[])", [user.id, r.id, free.map((c) => c.id)]);
    await q('insert into app.reservation_cards (reservation_id, card_id) select $1, unnest($2::uuid[])', [r.id, free.map((c) => c.id)]);
    return free.map((c) => c.serial);
  });
  console.log(`✔ Cartones de prueba para ${DEMO_EMAIL} (contraseña Cliente123!): ${serials.map((s) => `#${s}`).join(', ')}`);
}

try {
  await connect();
  if (args.has('--reiniciar')) {
    await reset();
  } else {
    await assign();
    if (args.has('--vivo')) {
      await query("update app.events set status = 'LIVE' where id = $1", [DEMO_EVENT_ID]);
      console.log('✔ Evento demo EN VIVO: canta balotas en Administración > Sorteo (admin@hogarsol.org).');
    }
  }
} catch (err) {
  console.error('✖', err.message);
  process.exitCode = 1;
} finally {
  await close();
}
