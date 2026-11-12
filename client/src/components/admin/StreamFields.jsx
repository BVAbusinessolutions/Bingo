import Field from '../ui/Field';

const selectCls = 'mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-fg';

// Facebook, TikTok, LL-HLS y WebRTC (WHEP) se configuran con una URL; el resto con el id del video o el canal.
const URL_PROVIDERS = new Set(['facebook', 'tiktok', 'hls', 'whep']);
const STREAM_HINTS = {
  youtube: [
    'ID o URL del video',
    'ej. https://www.youtube.com/live/jfKfPfyJRdk',
    'Sirve el enlace completo o solo el ID (latencia de 3 a 10 s con "latencia ultrabaja").',
  ],
  facebook: [
    'URL del video de Facebook Live',
    'https://www.facebook.com/hogarsol/videos/…',
    'En Facebook: video en vivo → Compartir → Copiar enlace. Debe ser público.',
  ],
  twitch: ['Canal de Twitch', 'ej. hogarsol o https://www.twitch.tv/hogarsol', 'Latencia de 2 a 5 s.'],
  kick: ['Canal de Kick', 'ej. hogarsol o https://kick.com/hogarsol', 'Latencia de 2 a 5 s.'],
  tiktok: [
    'Cuenta de TikTok',
    'ej. @hogarsol',
    'TikTok no permite incrustar sus directos: el jugador verá un botón "Ver en TikTok" y jugará sus cartones aquí.',
  ],
  vimeo: ['ID del video', 'ej. 76979871', 'Latencia de 5 a 15 s.'],
  hls: ['URL .m3u8 (LL-HLS)', 'https://…/live/bingo.m3u8', 'Latencia de 2 a 4 s. El dominio debe estar en STREAM_ORIGINS del servidor.'],
  whep: ['URL WHEP (WebRTC)', 'https://…/whep/bingo', 'Latencia menor a 1 s. El dominio debe estar en STREAM_ORIGINS del servidor.'],
};
export const streamValue = ({ provider, videoId }) => {
  const v = videoId.trim();
  if (!v) return null;
  return URL_PROVIDERS.has(provider) ? { provider, url: v } : { provider, videoId: v };
};

/** `label` y `allowTiktok` cambian el selector para la transmisión de respaldo (TikTok no se puede incrustar). */
export default function StreamFields({ form, onChange, label = 'Transmisión', allowTiktok = true }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_1fr]">
      <label className="block">
        <span className="font-bold text-fg">{label}</span>
        <select value={form.provider} onChange={(e) => onChange({ ...form, provider: e.target.value })} className={selectCls}>
          <option value="youtube">YouTube Live</option>
          <option value="facebook">Facebook Live</option>
          <option value="hls">Enlace HLS / reproductor propio (.m3u8)</option>
          <option value="whep">WebRTC (ultra baja latencia)</option>
          <option value="twitch">Twitch</option>
          <option value="kick">Kick</option>
          {allowTiktok && <option value="tiktok">TikTok LIVE (enlace)</option>}
          <option value="vimeo">Vimeo</option>
        </select>
      </label>
      <Field
        label={STREAM_HINTS[form.provider][0]}
        value={form.videoId}
        onChange={(e) => onChange({ ...form, videoId: e.target.value })}
        placeholder={STREAM_HINTS[form.provider][1]}
        hint={STREAM_HINTS[form.provider][2]}
        inputMode={URL_PROVIDERS.has(form.provider) ? 'url' : undefined}
      />
    </div>
  );
}
