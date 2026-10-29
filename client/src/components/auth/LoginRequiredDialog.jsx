import { useEffect, useId, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { LogIn, Ticket, UserPlus, X } from 'lucide-react';
import Button from '../ui/Button';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { PATHS } from '../../routing/paths';

export const LOGIN_REQUIRED_TEXT = 'Para comprar y reservar tus cartones debes Iniciar sesión o Crear una cuenta gratis';

/**
 * Aviso para invitados que intentan elegir o comprar cartones. Al iniciar sesión vuelven a la página donde
 * estaban (state.from); al crear la cuenta llegan al catálogo.
 */
export default function LoginRequiredDialog({ onClose }) {
  const location = useLocation();
  const titleId = useId();
  const descId = useId();
  const loginRef = useRef(null);
  const backdrop = useBackdropClose(onClose);

  useEffect(() => {
    loginRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-navy-950/70 p-4 backdrop-blur-sm" {...backdrop}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md animate-modal-in overflow-hidden rounded-3xl bg-navy-950 p-6 text-center text-white shadow-neon ring-1 ring-white/10 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/25 blur-3xl" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent text-navy-950 shadow-[0_10px_30px_rgb(251_191_36/0.4)]">
          <Ticket className="h-8 w-8" aria-hidden />
        </span>
        <h2 id={titleId} className="relative mt-4 font-display text-2xl font-bold">
          Inicia sesión para comprar
        </h2>
        <p id={descId} className="relative mt-2 text-lg text-white/85">
          {LOGIN_REQUIRED_TEXT}.
        </p>
        <div className="relative mt-6 grid gap-3 [&>*]:w-full [&>*]:whitespace-nowrap">
          <Button ref={loginRef} to={PATHS.login} state={{ from: location }} variant="gold" size="lg" icon={LogIn}>
            Iniciar sesión
          </Button>
          <Button to={PATHS.register} variant="light" size="lg" icon={UserPlus}>
            Crear cuenta gratis
          </Button>
        </div>
      </section>
    </div>
  );
}
