-- Facebook Live como fuente de transmisión: se guarda la URL pública del video (www.facebook.com) en stream_url.
-- El reproductor oficial de Facebook la recibe como parámetro; nunca se inyecta otra URL en el iframe.
alter table app.events drop constraint events_stream_provider_check;
alter table app.events drop constraint events_stream_source_check;
alter table app.events add constraint events_stream_provider_check
  check (stream_provider in ('youtube', 'twitch', 'vimeo', 'facebook', 'hls', 'whep'));
alter table app.events add constraint events_stream_source_check check (
  (stream_provider is null and stream_video_id is null and stream_url is null)
  or (stream_provider in ('youtube', 'twitch', 'vimeo') and stream_video_id is not null and stream_url is null)
  or (stream_provider in ('facebook', 'hls', 'whep') and stream_url is not null and stream_video_id is null)
);
