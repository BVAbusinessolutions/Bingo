import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Radio, RefreshCw, Repeat, Volume2 } from 'lucide-react';
import { streamSource } from './streamSource';
import { reportStream } from './streamReport';

// Reconexión automática: espera creciente entre intentos (la red del salón o del celular suele volver sola).
const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000];
// Fallos seguidos antes de pasar solo a la transmisión de respaldo (si la administración configuró una).
const FALLBACK_AFTER = 3;
// WebRTC "desconectado" a veces se recupera solo (cambio de antena); si no vuelve en este tiempo, se reconecta.
const DISCONNECTED_GRACE_MS = 5000;
// Si la pestaña estuvo oculta más que esto, los reproductores incrustados se recargan para volver al punto en vivo.
const RESUME_AFTER_MS = 30_000;
// STUN público: ayuda a WebRTC a atravesar redes con NAT estrictas (no transporta video ni datos del jugador).
const ICE_SERVERS = [{ urls: 'stun:stun.cloudflare.com:3478' }];

/**
 * WebRTC por WHEP (WebRTC-HTTP Egress Protocol): latencia por debajo de 1 segundo.
 * Compatible con Cloudflare Stream, OvenMediaEngine, MediaMTX, Dolby/Millicast, Ant Media, etc.
 * `onFail` se llama si la conexión se cae después de arrancar.
 */
async function startWhep(url, video, onFail) {
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle', iceServers: ICE_SERVERS });
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  const stream = new MediaStream();
  pc.ontrack = (e) => {
    stream.addTrack(e.track);
    video.srcObject = stream;
  };
  let graceTimer;
  pc.onconnectionstatechange = () => {
    clearTimeout(graceTimer);
    if (pc.connectionState === 'failed') onFail('webrtc-failed');
    if (pc.connectionState === 'disconnected') graceTimer = setTimeout(() => onFail('webrtc-disconnected'), DISCONNECTED_GRACE_MS);
  };
  await pc.setLocalDescription(await pc.createOffer());
  // Se espera a reunir los candidatos ICE (máx. 2 s) para enviar una sola oferta completa.
  await new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => pc.iceGatheringState === 'complete' && resolve();
    pc.addEventListener('icegatheringstatechange', done);
    setTimeout(resolve, 2000);
  });
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: pc.localDescription.sdp });
    if (!res.ok) throw new Error(`whep-${res.status}`);
    await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
  } catch (err) {
    pc.close();
    throw err;
  }
  const location = res.headers.get('Location');
  return {
    stop: () => {
      clearTimeout(graceTimer);
      pc.onconnectionstatechange = null;
      pc.close();
      // Avisar al servidor que la sesión terminó (si lo permite); un fallo aquí no importa.
      if (location) fetch(new URL(location, url), { method: 'DELETE' }).catch(() => {});
    },
    // Al volver a la pestaña: WebRTC siempre va en vivo; si la conexión murió mientras estaba oculta, se rehace.
    toLive: () => !['connected', 'connecting', 'new'].includes(pc.connectionState) && onFail('webrtc-resume'),
  };
}

/** Salta al punto en vivo de un video nativo (Safari/iOS) si quedó atrasado más de 3 s. */
const seekNativeToLive = (video) => {
  const { seekable } = video;
  if (!seekable.length) return;
  const edge = seekable.end(seekable.length - 1);
  if (edge - video.currentTime > 3) video.currentTime = Math.max(0, edge - 1);
};

/** LL-HLS: nativo en Safari/iOS; en el resto, hls.js se descarga solo cuando hace falta. */
async function startHls(url, video, onFail) {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    return { stop: () => video.removeAttribute('src'), toLive: () => seekNativeToLive(video) };
  }
  const { default: Hls } = await import('hls.js');
  if (!Hls.isSupported()) throw new Error('hls-unsupported');
  const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2, backBufferLength: 30 });
  let mediaRecovered = false;
  hls.on(Hls.Events.ERROR, (_, data) => {
    if (!data.fatal) return; // hls.js reintenta solo los errores no fatales
    // Un error de decodificación casi siempre se arregla una vez sin reconectar.
    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecovered) {
      mediaRecovered = true;
      hls.recoverMediaError();
      return;
    }
    onFail(data.details); // p. ej. manifestLoadError: la emisión aún no empezó o el encoder se reinició
  });
  hls.on(Hls.Events.FRAG_LOADED, () => {
    mediaRecovered = false;
  });
  hls.loadSource(url);
  hls.attachMedia(video);
  return {
    stop: () => hls.destroy(),
    toLive: () => {
      const edge = hls.liveSyncPosition;
      if (edge && edge - video.currentTime > 3) video.currentTime = edge;
    },
  };
}

/**
 * Reproductor propio para LL-HLS y WebRTC: arranca en silencio (los navegadores bloquean el autoplay con sonido).
 * Si la transmisión se corta se reconecta solo; tras FALLBACK_AFTER fallos seguidos llama a `onGiveUp` (si existe).
 */
function LowLatencyPlayer({ provider, url, title, onGiveUp }) {
  const videoRef = useRef(null);
  const sessionRef = useRef(null);
  const failRef = useRef(() => {});
  const failuresRef = useRef(0);
  const [state, setState] = useState('loading'); // loading | playing | reconnecting
  const [muted, setMuted] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let done = false; // este intento terminó (falló o se desmontó)
    let retryTimer;
    const fail = (detail) => {
      if (done) return;
      done = true;
      sessionRef.current?.stop();
      sessionRef.current = null;
      const n = ++failuresRef.current;
      reportStream(n === 1 ? 'error' : 'reconnect', provider, detail);
      if (n >= FALLBACK_AFTER && onGiveUp) return onGiveUp();
      setState('reconnecting');
      retryTimer = setTimeout(() => setAttempt((a) => a + 1), RETRY_DELAYS_MS[Math.min(n - 1, RETRY_DELAYS_MS.length - 1)]);
    };
    failRef.current = fail;
    (provider === 'whep' ? startWhep : startHls)(url, video, fail)
      .then((session) => {
        if (done) return session.stop();
        sessionRef.current = session;
        return video.play().catch(() => {}); // si el navegador lo bloquea, quedan los controles nativos
      })
      .catch((err) => fail(err?.message));
    return () => {
      done = true;
      clearTimeout(retryTimer);
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [provider, url, attempt, onGiveUp]);

  // Al volver a la pestaña: saltar al punto en vivo (el sorteo no espera). Al volver la red: reintentar ya.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      sessionRef.current?.toLive();
      videoRef.current?.play().catch(() => {});
    };
    const onOnline = () => failuresRef.current > 0 && setAttempt((a) => a + 1);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const onPlaying = () => {
    if (failuresRef.current > 0) reportStream('recovered', provider);
    failuresRef.current = 0;
    setState('playing');
  };

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
        onPlaying={onPlaying}
        onError={() => failRef.current('media-error')}
      />
      {state === 'loading' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-slate-300">Conectando con la transmisión…</div>
      )}
      {state === 'reconnecting' && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 px-4 text-center text-slate-200" role="status">
          <div className="space-y-3">
            <p>Se cortó la transmisión. Reconectando…</p>
            <p className="text-sm text-slate-400">Tus cartones y las bolas cantadas siguen al día.</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sol-gold px-4 font-black text-sol-blue"
            >
              <RefreshCw className="h-5 w-5" aria-hidden /> Reintentar ahora
            </button>
          </div>
        </div>
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

/**
 * Cuenta las veces que la pestaña vuelve tras estar oculta más de RESUME_AFTER_MS. Sirve de `key` para recargar los
 * reproductores incrustados (YouTube, Facebook…), que al volver suelen quedar atrasados respecto al sorteo.
 */
function useResumeCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let hiddenAt = null;
    const onChange = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RESUME_AFTER_MS) setCount((c) => c + 1);
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return count;
}

const sourceKey = (s) => (s ? `${s.provider}:${s.videoId ?? s.url}` : '');

/** `badge` y `emptyText` cambian los textos cuando el reproductor se usa fuera del sorteo (portada, vista previa del panel). */
/**
 * [ref, cerca]: `cerca` pasa a true (y se queda así) cuando el elemento llega a ~300 px de la pantalla.
 * Con `enabled` en false, o sin IntersectionObserver, es true desde el inicio.
 */
function useNearViewport(enabled) {
  const ref = useRef(null);
  const [near, setNear] = useState(() => !enabled || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (near || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near];
}

export default function LiveStream({
  provider = 'youtube',
  videoId,
  url,
  backup = null,
  title = 'Sorteo en vivo',
  badge = 'EN VIVO',
  emptyText = 'La transmisión aún no ha comenzado.',
  deferUntilVisible = false,
}) {
  const [frameRef, nearViewport] = useNearViewport(deferUntilVisible);
  const primary = { provider, videoId, url };
  // Respaldo solo si se puede reproducir aquí mismo (TikTok abre otra app: no sirve para cambiar solo).
  const backupUsable = backup && streamSource(backup)?.kind && streamSource(backup).kind !== 'external' ? backup : null;
  // Se guarda para qué principal se eligió el respaldo: si la administración cambia el enlace, se vuelve a la nueva principal.
  const [backupFor, setBackupFor] = useState(null);
  const onBackup = backupUsable && backupFor === sourceKey(primary);
  const active = onBackup ? backupUsable : primary;
  const resumeCount = useResumeCount();

  const source = streamSource(active);
  const lowLatency = source?.kind === 'lowLatency';
  const src = source?.kind === 'iframe' ? source.src : null;
  const primaryKey = sourceKey(primary);
  const onGiveUp = useCallback(() => {
    reportStream('fallback', provider);
    setBackupFor(primaryKey);
  }, [provider, primaryKey]);

  return (
    <section aria-label={`Transmisión: ${title}`} className="overflow-hidden rounded-2xl bg-black shadow-xl ring-4 ring-sol-red">
      <div className="flex flex-wrap items-center gap-2 bg-sol-red px-3 py-2 text-sm font-bold text-white">
        <Radio className="h-4 w-4 animate-pulse text-sol-gold" aria-hidden /> {badge} · {title}
        <span className="ml-auto flex items-center gap-2">
          {lowLatency && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">Baja latencia</span>}
          {backupUsable && (
            <button
              type="button"
              onClick={() => setBackupFor(onBackup ? null : primaryKey)}
              className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white/15 px-2.5 text-xs hover:bg-white/25"
            >
              <Repeat className="h-3.5 w-3.5" aria-hidden /> {onBackup ? 'Volver a la principal' : 'Ver transmisión alternativa'}
            </button>
          )}
        </span>
      </div>
      <div ref={frameRef} className="relative aspect-video">
        {!nearViewport ? (
          // Fachada: el reproductor (y hls.js, ~590 kB) se carga solo cuando el video está por verse.
          <div className="absolute inset-0 grid place-items-center text-slate-400">
            <Radio className="h-10 w-10 text-sol-gold" aria-hidden />
            <span className="sr-only">El video se carga al llegar a esta parte de la página.</span>
          </div>
        ) : lowLatency ? (
          <LowLatencyPlayer
            key={sourceKey(active)}
            provider={active.provider}
            url={active.url}
            title={title}
            onGiveUp={onBackup ? undefined : backupUsable ? onGiveUp : undefined}
          />
        ) : source?.kind === 'external' ? (
          // TikTok LIVE no se puede incrustar: el directo se abre en TikTok y el cartón sigue aquí, en tiempo real.
          <div className="absolute inset-0 grid place-items-center bg-linear-to-br from-slate-900 to-black px-4 text-center text-white">
            <div className="max-w-sm space-y-4">
              <p className="text-lg font-bold">La transmisión de este sorteo es en TikTok LIVE.</p>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sol-gold px-5 font-black text-sol-blue shadow-lg transition hover:brightness-110"
              >
                <ExternalLink className="h-5 w-5" aria-hidden /> Ver en TikTok
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
              <p className="text-sm text-slate-300">Tus cartones y las bolas cantadas siguen actualizándose en esta página.</p>
            </div>
          </div>
        ) : src ? (
          // key: si la administración cambia la fuente en pleno sorteo, o la pestaña vuelve tras un rato oculta,
          // el reproductor se reinicia limpio y en el punto en vivo.
          <iframe
            key={`${src}#${resumeCount}`}
            src={src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center px-4 text-center text-slate-400">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}
