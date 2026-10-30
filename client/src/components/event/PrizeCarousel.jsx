import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AUTOPLAY_MS = 4500;
const SWIPE_PX = 40;

/**
 * Escenario del premio: una sola superficie de vidrio con foco de luz y sombra de piso, y las fotos (recortes
 * con fondo transparente) apiladas con fundido. El marco 4:3 acomoda por igual la foto horizontal y las casi
 * cuadradas, así la moto no "cambia de tamaño" entre fotos. Miniaturas y pausa van debajo, nunca sobre la moto.
 *
 * Pasa sola cada 4,5 s, siempre (decisión de la Asociación: sin botón de pausa). Si la persona elige una foto
 * con flechas, miniaturas, teclado o deslizando, la cuenta vuelve a empezar desde esa foto y luego sigue sola.
 * Solo se detiene mientras no está en pantalla o la pestaña está oculta (no gasta batería).
 * Con "reducir animaciones" sigue pasando, pero sin fundido (cambio instantáneo).
 */
export default function PrizeCarousel({ images, alt, views = [] }) {
  const [failed, setFailed] = useState(() => new Set());
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef(null);
  const swipeRef = useRef(null);
  const slides = images.map((src, i) => ({ src, view: views[i] })).filter((s) => !failed.has(s.src));
  const count = slides.length;
  const current = count ? index % count : 0;

  // Solo avanza mientras el escenario está en pantalla.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  const goTo = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  // Un temporizador por foto: al cambiar de foto (sola o a mano) la cuenta empieza de nuevo.
  // `tabTick` lo rearma al volver a la pestaña (si venció oculta, no cambió de foto ni programó otro).
  const [tabTick, setTabTick] = useState(0);
  useEffect(() => {
    const onVisibility = () => document.visibilityState === 'visible' && setTabTick((t) => t + 1);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (count < 2 || !visible) return undefined;
    const id = setTimeout(() => document.visibilityState === 'visible' && goTo(current + 1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [count, visible, current, goTo, tabTick]);

  if (count === 0) return null;

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(current + (e.key === 'ArrowRight' ? 1 : -1));
    }
  };
  // Deslizar con el dedo o arrastrar con el mouse cambia de foto.
  const onPointerDown = (e) => {
    swipeRef.current = e.clientX;
  };
  const onPointerUp = (e) => {
    if (swipeRef.current === null) return;
    const dx = e.clientX - swipeRef.current;
    swipeRef.current = null;
    if (Math.abs(dx) > SWIPE_PX) goTo(current + (dx < 0 ? 1 : -1));
  };
  const label = (i) => `${alt}${slides[i].view ? `, ${slides[i].view}` : ''}`;
  const arrow =
    // En celular no hay flechas: se desliza o se usan las miniaturas, y la moto aprovecha todo el ancho.
    'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/20 hover:ring-accent/70 active:scale-95 sm:grid';

  return (
    <figure
      ref={rootRef}
      aria-roledescription="carrusel"
      aria-label={alt}
      className="glass relative overflow-hidden rounded-3xl shadow-neon"
    >
      {/* Escenario: foco de luz arriba y sombra de piso bajo las ruedas */}
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeRef.current = null)}
        className="relative aspect-[4/3] touch-pan-y select-none outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-accent/70"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_40%,rgb(255_255_255/0.22),transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[9%] left-1/2 h-[7%] w-[62%] -translate-x-1/2 rounded-[50%] bg-black/35 blur-xl"
          aria-hidden
        />
        {slides.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={label(i)}
            aria-hidden={i !== current}
            width="1600"
            height="1200"
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            onError={() => setFailed((f) => new Set(f).add(s.src))}
            className={`absolute inset-0 h-full w-full object-contain px-[5%] pb-[10%] pt-[6%] sm:px-[11%] drop-shadow-[0_18px_22px_rgb(2_6_23/0.35)] transition-[opacity,transform] duration-700 ease-out ${
              i === current ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'
            }`}
          />
        ))}

        {count > 1 && (
          <>
            <button type="button" onClick={() => goTo(current - 1)} className={`${arrow} left-3`} aria-label="Foto anterior">
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
            <button type="button" onClick={() => goTo(current + 1)} className={`${arrow} right-3`} aria-label="Foto siguiente">
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* Barra inferior propia: miniaturas centradas y contador; nunca tapa la moto. */}
      {count > 1 && (
        <figcaption className="relative flex items-center justify-center border-t border-white/10 px-4 py-3">
          <div className="flex gap-2">
            {slides.map((s, i) => (
              <button
                key={s.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver foto ${i + 1}${s.view ? `: ${s.view}` : ''}`}
                aria-current={i === current}
                className={`grid h-12 w-16 place-items-center overflow-hidden rounded-xl bg-white/5 p-1 ring-2 transition sm:h-14 sm:w-20 ${
                  i === current ? 'ring-accent' : 'opacity-60 ring-white/15 hover:opacity-100 hover:ring-white/40'
                }`}
              >
                <img src={s.src} alt="" aria-hidden draggable={false} loading="lazy" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
          <span className="absolute right-4 text-sm font-semibold tabular-nums text-white/70 max-[380px]:hidden" aria-hidden>
            {current + 1}/{count}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
