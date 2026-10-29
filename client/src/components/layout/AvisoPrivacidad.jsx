import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import Button from '../ui/Button';
import { readConsent, saveConsent, SETTINGS_EVENT } from '../../lib/preferenciasPrivacidad';
import { ANALYTICS_PROVIDER, disableAnalytics, loadAnalytics, trackPageView } from '../../lib/estadisticas';
import { PATHS } from '../../routing/paths';

/**
 * Aviso de cookies como ventana central con el fondo atenuado: aparece al llegar al sitio hasta que la
 * persona decide, y se reabre con "Configurar cookies" (pie de página y Centro Legal).
 * La analítica solo se carga con consentimiento; las páginas vistas se registran en cada cambio de ruta.
 */
export default function AvisoPrivacidad() {
  const [consent, setConsent] = useState(readConsent);
  const [open, setOpen] = useState(() => readConsent() === null);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(() => readConsent()?.analytics ?? false);
  const { pathname } = useLocation();
  const titleId = useId();
  const analyticsId = useId();
  const firstButtonRef = useRef(null);

  // Al abrirse, el foco va a la primera opción (teclado y lectores de pantalla llegan directo a decidir).
  useEffect(() => {
    if (open) firstButtonRef.current?.focus();
  }, [open, custom]);

  useEffect(() => {
    if (consent?.analytics) loadAnalytics();
    else disableAnalytics();
  }, [consent]);

  useEffect(() => {
    // Espera a que la página nueva ponga su título antes de registrar la visita.
    const t = setTimeout(() => consent?.analytics && trackPageView(pathname), 300);
    return () => clearTimeout(t);
  }, [pathname, consent]);

  useEffect(() => {
    const reopen = () => {
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener(SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(SETTINGS_EVENT, reopen);
  }, []);

  const decide = (value) => {
    setConsent(saveConsent(value));
    setAnalytics(value);
    setOpen(false);
    setCustom(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-70 grid animate-fade-in place-items-center overflow-y-auto bg-navy-950/70 p-4 backdrop-blur-sm print:hidden">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface w-full max-w-lg animate-modal-in space-y-4 p-6 sm:p-8"
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent-strong ring-1 ring-accent/30" aria-hidden>
          <Cookie className="h-7 w-7" />
        </span>
        <h2 id={titleId} className="font-display text-2xl font-bold text-fg">
          Tu privacidad
        </h2>
        <p className="text-fg-muted">
          Usamos una cookie necesaria para mantener tu sesión
          {ANALYTICS_PROVIDER ? ' y, solo si aceptas, cookies de analítica para mejorar el sitio' : ''}. No usamos publicidad.{' '}
          <Link to={PATHS.cookies} className="font-bold text-sol-blue underline dark:text-sol-gold">
            Más información
          </Link>
        </p>

        {custom && (
          <div className="space-y-2 rounded-xl bg-muted p-3">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1 h-5 w-5 accent-sol-blue" />
              <span>
                <b className="text-fg">Necesarias</b>
                <span className="block text-sm text-fg-muted">Sesión y preferencias de accesibilidad. Siempre activas.</span>
              </span>
            </label>
            <label htmlFor={analyticsId} className="flex cursor-pointer items-start gap-3">
              <input
                id={analyticsId}
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                disabled={!ANALYTICS_PROVIDER}
                className="mt-1 h-5 w-5 accent-sol-blue"
              />
              <span>
                <b className="text-fg">Analítica</b>
                <span className="block text-sm text-fg-muted">
                  {ANALYTICS_PROVIDER ? 'Estadísticas anónimas de uso del sitio.' : 'No hay analítica activa en este momento.'}
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {custom ? (
            <Button ref={firstButtonRef} variant="primary" onClick={() => decide(analytics)} className="sm:col-span-2">
              Guardar mi elección
            </Button>
          ) : (
            <>
              <Button ref={firstButtonRef} variant="gold" onClick={() => decide(true)}>
                Aceptar todas
              </Button>
              <Button variant="outline" onClick={() => decide(false)}>
                Solo necesarias
              </Button>
              <button
                type="button"
                onClick={() => setCustom(true)}
                className="min-h-11 font-bold text-fg-muted underline-offset-4 hover:text-fg hover:underline sm:col-span-2"
              >
                Configurar
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
