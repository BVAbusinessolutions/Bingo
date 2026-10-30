-- Kick (reproductor oficial por nombre de canal, en stream_video_id) y TikTok LIVE (sin reproductor incrustable:
-- se guarda el enlace https://www.tiktok.com/@cuenta/live en stream_url y la web lo abre en TikTok).
alter table app.events drop constraint events_stream_provider_check;
alter table app.events drop constraint events_stream_source_check;
alter table app.events add constraint events_stream_provider_check
  check (stream_provider in ('youtube', 'twitch', 'kick', 'vimeo', 'facebook', 'tiktok', 'hls', 'whep'));
alter table app.events add constraint events_stream_source_check check (
  (stream_provider is null and stream_video_id is null and stream_url is null)
  or (stream_provider in ('youtube', 'twitch', 'kick', 'vimeo') and stream_video_id is not null and stream_url is null)
  or (stream_provider in ('facebook', 'tiktok', 'hls', 'whep') and stream_url is not null and stream_video_id is null)
);
