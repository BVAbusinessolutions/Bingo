-- Transmisión de respaldo: si la principal falla varias veces seguidas, el reproductor cambia solo a esta.
-- Se guarda como { provider, videoId } o { provider, url }, validada por el mismo esquema que la principal.
alter table app.events add column stream_backup jsonb;
