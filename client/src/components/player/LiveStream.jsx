import { useEffect, useRef, useState } from 'react';
import { Radio, RefreshCw, Volume2 } from 'lucide-react';
import { streamSource } from './streamSource';

/**
 * WebRTC por WHEP (WebRTC-HTTP Egress Protocol): latencia por debajo de 1 segundo.
 * Compatible con Cloudflare Stream, OvenMediaEngine, MediaMTX, Dolby/Millicast, Ant Media, etc.
 */
async function startWhep(url, video) {
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  const stream = new MediaStream();
  pc.ontrack = (e) => {
    stream.addTrack(e.track);
    video.srcObject = stream;
  };
  await pc.setLocalDescription(await pc.createOffer());
  // Se espera a reunir los candidatos ICE (máx. 2 s) para enviar una sola oferta completa.
  await new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => pc.iceGatheringState === 'complete' && resolve();
    pc.addEventListener('icegatheringstatechange', done);
    setTimeout(resolve, 2000);
  });
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: pc.localDescription.sdp });
  if (!res.ok) throw new Error(`WHEP ${res.status}`);
  await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
  const location = res.headers.get('Location');
  return () => {
    pc.close();
    // Avisar al servidor que la sesión terminó (si lo permite); un fallo aquí no importa.
    if (location) fetch(new URL(location, url), { method: 'DELETE' }).catch(() => {});
  };
}

/** LL-HLS: nativo en Safari/iOS; en el resto, hls.js se descarga solo cuando hace falta. */
async function startHls(url, video) {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    return () => video.removeAttribute('src');
  }
  const { default: Hls } = await import('hls.js');
  if (!Hls.isSupported()) throw new Error('HLS no soportado');
  const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2, backBufferLength: 30 });
  hls.loadSource(url);
  hls.attachMedia(video);
  return () => hls.destroy();
}

/** Reproductor propio para LL-HLS y WebRTC: arranca en silencio (los navegadores bloquean el autoplay con sonido). */
function LowLatencyPlayer({ provider, url, title }) {
  const videoRef = useRef(null);
  const [state, setState] = useState('loading'); // loading | playing | error
  const [muted, setMuted] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let cleanup = () => {};
    let alive = true;
    (provider === 'whep' ? startWhep : startHls)(url, video)
      .then((stop) => {
        if (!alive) return stop();
        cleanup = stop;
        return video.play().catch(() => {}); // si el navegador lo bloquea, quedan los controles nativos
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
      cleanup();
    };
  }, [provider, url, attempt]);

  if (state === 'error') {
    return (
      <div className="absolute inset-0 grid place-items-center gap-3 px-4 text-center text-slate-300">
        <div className="space-y-3">
          <p>No pudimos conectar con la transmisión.</p>
          <button
            type="button"
            onClick={() => {
              setState('loading');
              setAttempt((n) => n + 1);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sol-gold px-4 font-black text-sol-blue"
          >
            <RefreshCw className="h-5 w-5" aria-hidden /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        title={title}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        playsInline
        autoPlay
        muted={muted}
        controls
        onPlaying={() => setState('playing')}
        onError={() => setState('error')}
      />
      {state === 'loading' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-slate-300">Conectando con la transmisión…</div>
      )}
      {muted && state === 'playing' && (
        <button
          type="button"
          onClick={() => setMuted(false)}
          className="absolute left-3 top-3 inline-flex min-h-11 animate-pop items-center gap-2 rounded-xl bg-sol-gold px-3 font-black text-sol-blue shadow-lg"
        >
          <Volume2 className="h-5 w-5" aria-hidden /> Activar sonido
        </button>
      )}
    </>
  );
}

export default function LiveStream({ provider = 'youtube', videoId, url, title = 'Sorteo en vivo' }) {
  const source = streamSource({ provider, videoId, url });
  const lowLatency = source?.kind === 'lowLatency';
  const src = source?.kind === 'iframe' ? source.src : null;

  return (
    <section aria-label={`Transmisión: ${title}`} className="overflow-hidden rounded-2xl bg-black shadow-xl ring-4 ring-sol-red">
      <div className="flex items-center gap-2 bg-sol-red px-3 py-2 text-sm font-bold text-white">
        <Radio className="h-4 w-4 animate-pulse text-sol-gold" aria-hidden /> EN VIVO · {title}
        {lowLatency && <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-xs">Baja latencia</span>}
      </div>
      <div className="relative aspect-video">
        {lowLatency ? (
          <LowLatencyPlayer key={`${provider}:${url}`} provider={provider} url={url} title={title} />
        ) : src ? (
          // key: si la administración cambia la fuente en pleno sorteo, el reproductor se reinicia limpio.
          <iframe
            key={src}
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
