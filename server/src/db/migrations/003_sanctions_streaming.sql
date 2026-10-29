-- Sanciones a cuentas, detección de una misma persona con varias cuentas y transmisión de baja latencia.

-- ---------------------------------------------------------------- sanciones
-- SUSPENDED: suspensión temporal hasta suspended_until (vence sola). BANNED: baneo permanente.
-- DISABLED se mantiene para desactivaciones administrativas sin carácter de sanción.
alter table app.users drop constraint users_status_check;
alter table app.users add constraint users_status_check check (status in ('ACTIVE', 'DISABLED', 'SUSPENDED', 'BANNED'));
alter table app.users add column suspended_until timestamptz;
alter table app.users add column sanction_reason text check (char_length(sanction_reason) <= 300);
alter table app.users add constraint users_suspension_check check (status <> 'SUSPENDED' or suspended_until is not null);
create index users_status_idx on app.users (status) where status <> 'ACTIVE';

-- ---------------------------------------------------------------- misma cédula en varias cuentas
-- Cédula normalizada (sin espacios ni guiones, en mayúsculas): "1-0234-0567" = "102340567".
create index reservations_national_id_norm_idx
  on app.reservations ((upper(regexp_replace(buyer_national_id, '[^0-9A-Za-z]', '', 'g'))))
  where buyer_national_id is not null;

-- ---------------------------------------------------------------- transmisión
-- Además de YouTube/Twitch/Vimeo (por id de video), ahora LL-HLS y WebRTC (WHEP) por URL https.
-- El servidor solo acepta URLs de los orígenes de STREAM_ORIGINS (también se agregan a la CSP).
alter table app.events drop constraint events_stream_provider_check;
alter table app.events drop constraint events_check;
alter table app.events add column stream_url text check (char_length(stream_url) <= 500 and stream_url ~ '^https://[^[:space:]]{4,}$');
alter table app.events add constraint events_stream_provider_check
  check (stream_provider in ('youtube', 'twitch', 'vimeo', 'hls', 'whep'));
alter table app.events add constraint events_stream_source_check check (
  (stream_provider is null and stream_video_id is null and stream_url is null)
  or (stream_provider in ('youtube', 'twitch', 'vimeo') and stream_video_id is not null and stream_url is null)
  or (stream_provider in ('hls', 'whep') and stream_url is not null and stream_video_id is null)
);
