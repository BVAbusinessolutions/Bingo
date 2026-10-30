import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const AUTOPLAY_MS = 4500;

const prefersReducedMotion = () =>
  document.documentElement.dataset.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Galería del premio en un marco de vidrio con filo dorado. Usa scroll-snap nativo: el deslizamiento con el
 * dedo funciona sin código extra y las flechas/puntos solo mueven el scroll. Las fotos que no cargan se
 * quitan; si no queda ninguna, el marco desaparece (nunca una imagen rota).
 *
 * Avance automático cada 4,5 s. Se detiene en cuanto la persona toma el control (flechas, puntos, teclado o
 * deslizar) y se pausa con el mouse encima, con el foco dentro, fuera de pantalla o con la pestaña oculta.
 * Con "reducir animaciones" no avanza solo. El botón de pausa cumple WCAG 2.2.2.
 */
export default function PrizeCarousel({ images, alt }) {
  const trackRef = useRef(null);
  const [failed, setFailed] = useState(() => new Set());
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(prefersReducedMotion); // la persona lo detuvo (o reduce el movimiento)
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef(null);
  const slides = images.filter((src) => !failed.has(src));
  const count = slides.length;

  // El punto activo sigue al scroll (dedo, rueda, teclado o flechas).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const onScroll = () => setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [count]);

  // Solo avanza mientras el carrusel está en pantalla.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  const goTo = useCallback(
    (i) => {
      const track = trackRef.current;
      if (!track || count === 0) return;
      const next = (i + count) % count;
      track.scrollTo({ left: next * track.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },
    [count]
  );

  // Un temporizador por foto: si la persona desliza a mano, la cuenta empieza de nuevo desde esa foto.
  useEffect(() => {
    if (count < 2 || stopped || hovered || !visible) return undefined;
    const id = setTimeout(() => document.visibilityState === 'visible' && goTo(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [count, stopped, hovered, visible, index, goTo]);

  if (count === 0) return null;

  // Cualquier control manual detiene el avance automático: la persona decide qué foto ver.
  const manualGoTo = (i) => {
    setStopped(true);
    goTo(i);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      manualGoTo(index + (e.key === 'ArrowRight' ? 1 : -1));
    }
  };
  const arrow =
    'absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-md transition hover:border-accent/70 hover:bg-white/25 active:scale-95';

  return (
    <figure
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHovered(false)}
      aria-roledescription="carrusel"
      aria-label={alt}
      className="relative overflow-hidden rounded-2xl border border-sol-gold/50 bg-[radial-gradient(ellipse_at_50%_60%,rgb(251_191_36/0.25),transparent_70%)] shadow-[0_0_0_1px_rgb(251_191_36/0.25),inset_0_1px_0_rgb(255_255_255/0.25),0_20px_45px_rgb(2_6_23/0.35)] backdrop-blur-[16px]"
    >
      {/* Foto + flechas: las flechas se centran sobre la foto, no sobre la fila de puntos. */}
      <div className="relative">
        <div
          ref={trackRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={() => setStopped(true)}
          onWheel={(e) => Math.abs(e.deltaX) > Math.abs(e.deltaY) && setStopped(true)}
          aria-live={stopped ? 'polite' : 'off'}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((src, i) => (
            <div
              key={src}
              role="group"
              aria-roledescription="foto"
              aria-label={`${i + 1} de ${count}`}
              aria-hidden={i !== index}
              className={`w-full shrink-0 snap-center p-2 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-40'}`}
            >
              <img
                src={src}
                alt={i === 0 ? alt : `${alt}, otra vista`}
                width="1600"
                height="900"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                onError={() => setFailed((f) => new Set(f).add(src))}
                className="aspect-video w-full select-none object-contain drop-shadow-[0_14px_18px_rgb(2_6_23/0.35)]"
              />
            </div>
          ))}
        </div>

        {/* Brillo diagonal sutil sobre el vidrio */}
        <span className="pointer-events-none absolute inset-1.5 rounded-xl bg-linear-to-tr from-transparent via-white/0 to-white/15" aria-hidden />

        {count > 1 && (
          <>
            <button type="button" onClick={() => manualGoTo(index - 1)} className={`${arrow} left-2`} aria-label="Foto anterior">
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
            <button type="button" onClick={() => manualGoTo(index + 1)} className={`${arrow} right-2`} aria-label="Foto siguiente">
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* Puntos debajo de la foto (en su propia fila): nunca tapan la moto. */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => setStopped((v) => !v)}
            aria-label={stopped ? 'Reanudar el pase automático de fotos' : 'Pausar el pase automático de fotos'}
            className="group/pause mr-1 grid h-11 w-11 place-items-center"
          >
            {/* Fondo propio: se distingue igual sobre la tarjeta clara (Día) y la oscura (Noche). */}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-950/60 text-white ring-1 ring-white/30 transition group-hover/pause:bg-navy-950/80">
              {stopped ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
            </span>
          </button>
          {slides.map((src, i) => (
            // Área táctil de 44 px con el punto visible pequeño en el centro.
            <button
              key={src}
              type="button"
              onClick={() => manualGoTo(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === index}
              className="grid h-11 w-8 place-items-center"
            >
              <span
                className={`block h-2.5 rounded-full ring-1 ring-white/50 transition-all duration-300 ${
                  i === index ? 'w-6 bg-accent' : 'w-2.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
