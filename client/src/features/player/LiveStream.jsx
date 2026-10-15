import { Radio } from 'lucide-react';

// Solo proveedores conocidos: nunca se inyecta una URL arbitraria en el iframe.
const PROVIDERS = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1`,
  twitch: (id) => `https://player.twitch.tv/?channel=${id}&parent=${window.location.hostname}&muted=true`,
  vimeo: (id) => `https://player.vimeo.com/video/${id}?autoplay=1&muted=1`,
};
const SAFE_ID = /^[A-Za-z0-9_-]{2,64}$/;

export default function LiveStream({ provider = 'youtube', videoId, title = 'Sorteo en vivo' }) {
  const build = PROVIDERS[provider];
  const src = build && SAFE_ID.test(videoId ?? '') ? build(videoId) : null;

  return (
    <section className="overflow-hidden rounded-2xl bg-black shadow-xl ring-4 ring-sol-red">
      <div className="flex items-center gap-2 bg-sol-red px-3 py-2 text-sm font-bold text-white">
        <Radio className="h-4 w-4 animate-pulse text-sol-gold" /> EN VIVO · {title}
      </div>
      <div className="relative aspect-video">
        {src ? (
          <iframe
            src={src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center px-4 text-center text-slate-400">
            La transmisión aún no ha comenzado.
          </div>
        )}
      </div>
    </section>
  );
}
