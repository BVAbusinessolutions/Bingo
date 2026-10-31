import { Router } from 'express';
import { query } from '../../db/index.js';
import { requireXhrHeader } from '../../middleware/security.js';
import { heartbeat, leave, pushMetrics } from '../../services/presence.js';

const router = Router();

// Día de Costa Rica = UTC-6 todo el año (sin horario de verano); no depende de los datos de zona horaria.
// Una visita por sesión del navegador. Solo se guarda un contador diario: ni IP, ni cookies, ni quién visitó.
// X-Requested-With evita que otro sitio la sume con un simple <img> o formulario.
router.post('/hello', requireXhrHeader, async (req, res) => {
  await query(
    `insert into app.site_visits (day, visits) values ((now() at time zone 'UTC' - interval '6 hours')::date, 1)
     on conflict (day) do update set visits = app.site_visits.visits + 1`
  );
  pushMetrics(); // el panel de administración ve la visita al instante
  res.status(204).end();
});

// Identificador aleatorio de la pestaña (lo genera el navegador; no es la sesión ni identifica a nadie).
const TAB_ID = /^[A-Za-z0-9-]{8,40}$/;

const tabId = (req, res, next) => (TAB_ID.test(String(req.query.tab ?? '')) ? next() : res.status(400).json({ error: 'INVALID_TAB' }));

/** Latido de presencia: "personas en el sitio ahora". Con X-Requested-With: otro sitio no puede inflar la cifra. */
router.post('/ping', requireXhrHeader, tabId, (req, res) => {
  heartbeat(String(req.query.tab));
  res.status(204).end();
});

/** La pestaña se cierra (navigator.sendBeacon no envía cabeceras propias): solo puede quitar, nunca sumar. */
router.post('/ping/bye', tabId, (req, res) => {
  leave(String(req.query.tab));
  res.status(204).end();
});

export default router;
