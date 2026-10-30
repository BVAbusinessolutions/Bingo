import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PartyPopper } from 'lucide-react';

const COLORS = ['#fbbf24', '#f59e0b', '#d32f2f', '#1d63b8', '#ffffff', '#fde68a'];
const PIECES = 90;
const DURATION_MS = 3800;

/**
 * Celebración de victoria: confeti CSS (solo transform/opacity, 60 FPS) y mensaje central.
 * Con "reducir animaciones" el confeti queda quieto y solo se ve el mensaje.
 * No bloquea la pantalla: pointer-events none, y se retira sola.
 */
export default function Celebration({ serial, onDone }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        color: COLORS[i % COLORS.length],
        delay: `${Math.random() * 0.6}s`,
        fall: `${2.2 + Math.random() * 1.4}s`,
        drift: `${(Math.random() - 0.5) * 30}vw`,
        spin: `${360 + Math.random() * 720}deg`,
        round: i % 3 === 0,
      })),
    []
  );

  useEffect(() => {
    const id = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden print:hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className={`absolute -top-4 block h-3 w-2 animate-confetti will-change-transform ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay, '--fall': p.fall, '--drift': p.drift, '--spin': p.spin }}
        />
      ))}
      <div className="absolute inset-0 grid place-items-center p-6">
        <div role="status" className="animate-pop rounded-3xl bg-navy-950/85 px-8 py-5 text-center shadow-neon ring-1 ring-accent/40 backdrop-blur-md">
          <p className="flex items-center justify-center gap-3 font-display text-3xl font-black text-sol-gold">
            <PartyPopper className="h-9 w-9" aria-hidden /> ¡BINGO! · #{serial}
          </p>
          <p className="mt-2 flex items-center justify-center gap-2 text-lg font-semibold text-white">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden /> Comprobando Bingo con la organización...
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
