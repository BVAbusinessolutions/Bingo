import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, X } from 'lucide-react';
import { useBackdropClose } from '../../hooks/useBackdropClose';

/**
 * Ventana emergente prominente cuando alguien canta ¡Bingo! (aviso en tiempo real del servidor).
 * No se cierra sola: la administración debe verla. Si llegan varios reclamos, se listan todos.
 */
export default function BingoAlert({ claims, onClose }) {
  const titleId = useId();
  const reviewRef = useRef(null);
  const backdrop = useBackdropClose(onClose);

  useEffect(() => {
    reviewRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-navy-950/70 p-4 backdrop-blur-sm" {...backdrop}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg animate-modal-in overflow-hidden rounded-3xl border-4 border-sol-gold bg-navy-950 p-6 text-white shadow-neon sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-accent/30 blur-3xl" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar alerta"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <h2 id={titleId} className="relative flex items-center gap-3 font-display text-3xl font-black text-sol-gold">
          <Trophy className="h-10 w-10 shrink-0 motion-safe:animate-bounce" aria-hidden /> ¡BINGO CANTADO!
        </h2>
        <ul className="relative mt-5 space-y-3">
          {claims.map((c) => (
            <li key={c.id} className="rounded-2xl bg-white/5 p-4 text-lg ring-1 ring-white/10">
              <p>
                <span className="text-white/70">Usuario:</span>{' '}
                <b>{[c.player?.name, c.player?.email].filter(Boolean).join(' · ') || 'Sin nombre'}</b>
              </p>
              <p>
                <span className="text-white/70">Cartón N.°:</span> <b className="text-sol-gold">{c.serial}</b>
              </p>
              <p>
                <span className="text-white/70">Modalidad:</span> <b>{c.patternLabel ?? '—'}</b>
              </p>
            </li>
          ))}
        </ul>
        <p className="relative mt-4 text-white/80">El sistema ya verificó el cartón contra las bolas cantadas. Confirma el premio.</p>
        <Link
          ref={reviewRef}
          to={claims.length === 1 ? `ganadores#reclamo-${claims[0].id}` : 'ganadores'}
          onClick={onClose}
          className="relative mt-5 flex min-h-12 items-center justify-center rounded-xl bg-sol-gold px-5 font-black text-sol-blue transition hover:bg-sol-gold-dark"
        >
          Verificar y confirmar
        </Link>
      </section>
    </div>
  );
}
