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
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden print:hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`absolute -top-4 block h-3 w-2 animate-confetti will-change-transform ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay, '--fall': p.fall, '--drift': p.drift, '--spin': p.spin }}
        />
      ))}
      <div className="absolute inset-0 grid place-items-center p-6">
        <p className="flex animate-pop bg-navy-950/85 ring-1 ring-accent/40 backdrop-blur-md items-center gap-3 rounded-3xl px-8 py-5 text-center font-display text-3xl font-black text-sol-gold shadow-neon">
          <PartyPopper className="h-9 w-9" /> ¡BINGO! · #{serial}
        </p>
      </div>
    </div>,
    document.body
  );
}
