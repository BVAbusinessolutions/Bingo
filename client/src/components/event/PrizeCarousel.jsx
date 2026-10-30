import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Galería del premio en un marco de vidrio con filo dorado. Usa scroll-snap nativo: el deslizamiento con el
 * dedo funciona sin código extra y las flechas/puntos solo mueven el scroll. Las fotos que no cargan se
 * quitan; si no queda ninguna, el marco desaparece (nunca una imagen rota).
 */
export default function PrizeCarousel({ images, alt }) {
  const trackRef = useRef(null);
  const [failed, setFailed] = useState(() => new Set());
  const [index, setIndex] = useState(0);
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

  if (count === 0) return null;

  const goTo = (i) => {
    const track = trackRef.current;
    const next = (i + count) % count;
    track?.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + (e.key === 'ArrowRight' ? 1 : -1));
    }
  };
  const arrow =
    'absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-md transition hover:border-accent/70 hover:bg-white/25 active:scale-95';

  return (
    <figure
      aria-roledescription="carrusel"
      aria-label={alt}
      className="relative overflow-hidden rounded-2xl border border-sol-gold/50 bg-[radial-gradient(ellipse_at_50%_60%,rgb(251_191_36/0.25),transparent_70%)] shadow-[0_0_0_1px_rgb(251_191_36/0.25),inset_0_1px_0_rgb(255_255_255/0.25),0_20px_45px_rgb(2_6_23/0.35)] backdrop-blur-[16px]"
    >
      <div
        ref={trackRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((src, i) => (
          <div
            key={src}
            role="group"
            aria-roledescription="foto"
            aria-label={`${i + 1} de ${count}`}
            className="w-full shrink-0 snap-center p-2"
          >
            <img
              src={src}
              alt={i === 0 ? alt : `${alt}, otra vista`}
              width="1400"
              height="1000"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              onError={() => setFailed((f) => new Set(f).add(src))}
              className="aspect-[16/10] w-full select-none object-contain drop-shadow-[0_14px_18px_rgb(2_6_23/0.35)]"
            />
          </div>
        ))}
      </div>

      {/* Brillo diagonal sutil sobre el vidrio */}
      <span className="pointer-events-none absolute inset-1.5 rounded-xl bg-linear-to-tr from-transparent via-white/0 to-white/15" aria-hidden />

      {count > 1 && (
        <>
          <button type="button" onClick={() => goTo(index - 1)} className={`${arrow} left-2`} aria-label="Foto anterior">
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <button type="button" onClick={() => goTo(index + 1)} className={`${arrow} right-2`} aria-label="Foto siguiente">
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
          <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">
            {slides.map((src, i) => (
              // Área táctil de 44 px con el punto visible pequeño en el centro.
              <button
                key={src}
                type="button"
                onClick={() => goTo(i)}
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
        </>
      )}
    </figure>
  );
}
