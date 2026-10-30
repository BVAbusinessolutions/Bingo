import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Contrast, PersonStanding, Moon, RotateCcw, Sparkles, Sun, Type, Volume2, VolumeX, X } from 'lucide-react';
import { TEXT_SIZES, useTheme } from '../../context/ThemeContext';
import { useSpeech } from './useSpeech';
import { A11Y_TOGGLE_EVENT, announceAccessibilityState } from './a11yEvents';
import { useExclusiveOverlay } from '../../lib/overlays';
import { useBackdropClose } from '../../hooks/useBackdropClose';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mantiene el foco del teclado dentro del panel mientras está abierto (requisito de un diálogo modal). */
function trapFocus(e, container) {
  const items = container ? [...container.querySelectorAll(FOCUSABLE)] : [];
  if (!items.length) return;
  const first = items[0];
  const last = items.at(-1);
  if (e.shiftKey && (document.activeElement === first || document.activeElement === container)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

const SIZE_LABELS = {
  normal: ['A', 'Letra normal', 'text-base'],
  large: ['A+', 'Letra grande', 'text-lg'],
  xlarge: ['A++', 'Letra muy grande', 'text-xl'],
};

/** Interruptor accesible (role="switch"): se lee como "Alto contraste, activado". */
function Switch({ checked, onChange, label, description, icon: Icon }) {
  const descId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={descId}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-line p-3 text-left transition hover:border-sol-blue dark:hover:border-sol-gold"
    >
      <Icon className="h-6 w-6 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-fg">{label}</span>
        <span id={descId} className="block text-sm text-fg-muted">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-sol-blue dark:bg-sol-gold' : 'bg-fg-subtle/50'}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-5.5' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}

/**
 * Panel flotante de vidrio con los ajustes visuales y de lectura. Se abre debajo de la barra de navegación
 * (nunca la tapa) desde el botón de la barra
 * (AccessibilityButton): reúne tamaño de letra, modo día/noche, alto contraste, reducir animaciones
 * y lectura en voz alta. Las preferencias se guardan en el navegador y se aplican antes de pintar.
 */
export default function AccessibilityMenu() {
  const theme = useTheme();
  const speech = useSpeech();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(72); // borde inferior de la barra de navegación, en px
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const dismiss = useCallback(() => setOpen(false), []); // sin mover el foco (otro menú lo tomó)
  const backdrop = useBackdropClose(dismiss);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus?.(); // el foco vuelve al botón que abrió el panel
  }, []);

  // El botón de la barra abre y cierra. El panel se coloca justo debajo de la barra visible (la del sitio
  // o la de la transmisión en vivo), así nunca la tapa.
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const onToggle = () => {
      if (openRef.current) return close();
      openerRef.current = document.activeElement;
      const header = document.querySelector('header');
      setTop(Math.max(0, Math.round(header?.getBoundingClientRect().bottom ?? 72)));
      setOpen(true);
    };
    window.addEventListener(A11Y_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(A11Y_TOGGLE_EVENT, onToggle);
  }, [close]);

  // Con llaves: dispatchEvent devuelve true y React lo tomaría como función de limpieza (y la app se caería).
  useEffect(() => {
    announceAccessibilityState(open);
  }, [open]);
  // Si se abre el menú móvil o el de usuario, este panel se cierra (nunca dos menús encimados).
  useExclusiveOverlay('a11y', open, dismiss);

  // Al cambiar de página se cierra el panel y se detiene la lectura de la página anterior.
  const stopSpeech = speech.stop;
  useEffect(() => {
    setOpen(false);
    stopSpeech();
  }, [pathname, stopSpeech]);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') trapFocus(e, panelRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const reset = () => {
    theme.setTextSize('normal');
    theme.setHighContrast(false);
    theme.setReduceMotion(false);
    speech.stop();
  };

  if (!open) return null;

  return (
    // Empieza debajo de la barra: la navegación queda visible y el panel no la cubre.
    <div
      className="fixed inset-x-0 bottom-0 z-45 flex animate-fade-in items-start justify-end bg-navy-950/25 p-3 sm:p-4 print:hidden"
      style={{ top }}
      {...backdrop}
    >
      <section
        ref={panelRef}
        id="panel-accesibilidad"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="glass-panel flex max-h-full w-full max-w-sm animate-modal-in flex-col gap-5 overflow-y-auto rounded-3xl p-5 shadow-[0_24px_60px_rgb(2_6_23/0.35)] outline-none"
      >
        <header className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="flex items-center gap-2 text-xl font-black text-fg">
            <PersonStanding className="h-6 w-6 text-brand" aria-hidden /> Ajustes visuales
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar menú de accesibilidad"
            className="grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-muted"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        </header>

        <fieldset>
          <legend className="mb-2 flex items-center gap-2 font-extrabold text-fg">
            <Type className="h-5 w-5 text-brand" aria-hidden /> Tamaño de letra
          </legend>
          <div role="radiogroup" aria-label="Tamaño de letra" className="grid grid-cols-3 gap-2">
            {TEXT_SIZES.map((size) => {
              const [short, label, cls] = SIZE_LABELS[size];
              const active = theme.textSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={label}
                  onClick={() => theme.setTextSize(size)}
                  className={`min-h-12 rounded-xl border-2 font-black transition ${cls} ${
                    active
                      ? 'border-sol-blue bg-sol-blue text-white dark:border-sol-gold dark:bg-sol-gold dark:text-sol-blue'
                      : 'border-line text-fg hover:border-sol-blue'
                  }`}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-extrabold text-fg">Modo de color</legend>
          <div role="radiogroup" aria-label="Modo de color" className="grid grid-cols-2 gap-2">
            {[
              ['light', 'Día', Sun],
              ['dark', 'Noche', Moon],
            ].map(([value, label, Icon]) => {
              const active = theme.theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => theme.setTheme(value)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 font-extrabold transition ${
                    active
                      ? 'border-sol-blue bg-sol-blue text-white dark:border-sol-gold dark:bg-sol-gold dark:text-sol-blue'
                      : 'border-line text-fg hover:border-sol-blue'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden /> {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <Switch
            icon={Contrast}
            label="Alto contraste"
            description="Texto y bordes más marcados."
            checked={theme.highContrast}
            onChange={theme.setHighContrast}
          />
          <Switch
            icon={Sparkles}
            label="Reducir animaciones"
            description="Quita movimientos y transiciones."
            checked={theme.reduceMotion}
            onChange={theme.setReduceMotion}
          />
        </div>

        {speech.supported && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={speech.speaking ? speech.stop : speech.readPage}
              aria-pressed={speech.speaking}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sol-gold px-4 font-black text-sol-blue transition hover:bg-sol-gold-dark"
            >
              {speech.speaking ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
              {speech.speaking ? 'Detener lectura' : 'Leer esta página en voz alta'}
            </button>
            <p className="text-sm text-fg-muted">
              El sitio también funciona con lectores de pantalla como NVDA, JAWS, VoiceOver y TalkBack.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={reset}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-bold text-fg-muted hover:bg-muted hover:text-fg"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Restablecer ajustes
        </button>
      </section>
    </div>
  );
}
