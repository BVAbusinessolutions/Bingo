-- "En vivo" ahora lo decide la administración (antes la primera bola, aunque fuera de prueba, ponía el evento en vivo).
-- Los eventos que quedaron en vivo antes de su hora vuelven a programados: regresa la cuenta regresiva y la venta.
update app.events set status = 'SCHEDULED', updated_at = now() where status = 'LIVE' and starts_at > now();
