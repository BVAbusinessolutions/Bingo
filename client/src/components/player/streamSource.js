// Qué reproductor usar para cada fuente de transmisión. Solo proveedores conocidos: nunca se inyecta una URL
// arbitraria en el iframe (el servidor ya validó cada fuente; aquí se vuelve a comprobar el formato).
const EMBEDS = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1`,
  twitch: (id, host) => `https://player.twitch.tv/?channel=${id}&parent=${host}&muted=true`,
  kick: (id) => `https://player.kick.com/${id}?autoplay=true&muted=true`,
  vimeo: (id) => `https://player.vimeo.com/video/${id}?autoplay=1&muted=1`,
};
const SAFE_ID = /^[A-Za-z0-9_-]{2,64}$/;
// Facebook Live: el servidor solo acepta URLs de www.facebook.com; se pasan al reproductor oficial como parámetro.
const FACEBOOK_URL = /^https:\/\/www\.facebook\.com\/\S+$/;
// TikTok LIVE no ofrece reproductor para incrustar: el servidor guarda el enlace al directo de la cuenta.
const TIKTOK_LIVE_URL = /^https:\/\/www\.tiktok\.com\/@[A-Za-z0-9_.]{2,24}\/live$/;
// Las URL de LL-HLS / WHEP ya fueron validadas por el servidor contra STREAM_ORIGINS; aquí solo se exige https.
const SAFE_URL = /^https:\/\/\S+$/;

/**
 * { kind: 'iframe', src } para YouTube, Facebook, Twitch, Kick o Vimeo; { kind: 'lowLatency' } para LL-HLS o WHEP
 * (reproductor propio); { kind: 'external', href } para TikTok LIVE; null si no hay transmisión o la fuente no es válida.
 */
export function streamSource({ provider, videoId, url } = {}, host = globalThis.location?.hostname ?? '') {
  if (provider === 'hls' || provider === 'whep') return SAFE_URL.test(url ?? '') ? { kind: 'lowLatency' } : null;
  if (provider === 'tiktok') return TIKTOK_LIVE_URL.test(url ?? '') ? { kind: 'external', href: url } : null;
  if (provider === 'facebook') {
    return FACEBOOK_URL.test(url ?? '')
      ? {
          kind: 'iframe',
          src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=true&width=1280`,
        }
      : null;
  }
  const build = EMBEDS[provider];
  return build && SAFE_ID.test(videoId ?? '') ? { kind: 'iframe', src: build(videoId, host) } : null;
}
