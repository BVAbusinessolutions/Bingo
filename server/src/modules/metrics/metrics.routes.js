import { Router } from 'express';
import { query } from '../../db/index.js';
import { requireXhrHeader } from '../../middleware/security.js';

const router = Router();

// Día de Costa Rica = UTC-6 todo el año (sin horario de verano); no depende de los datos de zona horaria.
// Una visita por sesión del navegador. Solo se guarda un contador diario: ni IP, ni cookies, ni quién visitó.
// X-Requested-With evita que otro sitio la sume con un simple <img> o formulario.
router.post('/visit', requireXhrHeader, async (req, res) => {
  await query(
    `insert into app.site_visits (day, visits) values ((now() at time zone 'UTC' - interval '6 hours')::date, 1)
     on conflict (day) do update set visits = app.site_visits.visits + 1`
  );
  res.status(204).end();
});

export default router;
