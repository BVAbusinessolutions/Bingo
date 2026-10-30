import { useEffect, useId, useRef } from 'react';
import Button from './Button';
import { useBackdropClose } from '../../hooks/useBackdropClose';

/**
 * Diálogo de confirmación accesible (reemplaza window.confirm), en vidrio translúcido:
 * fondo difuminado, panel con filo dorado, ícono opcional y acciones de 44 px en píldora.
 */
export default function ConfirmDialog({
  title,
  children,
  icon: Icon,
  cancelLabel = 'Volver',
  confirmLabel,
  confirmVariant = 'primary',
  loading,
  onConfirm,
  onCancel,
  wide = false, // contenido con más opciones (p. ej. elegir la modalidad de una ronda)
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef(null);
  const backdrop = useBackdropClose(onCancel);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-navy-950/45 p-4 backdrop-blur-sm" {...backdrop}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`glass-panel relative max-h-[calc(100dvh-2rem)] w-full ${wide ? 'max-w-3xl' : 'max-w-md'} animate-modal-in space-y-4 overflow-y-auto overflow-x-hidden rounded-3xl p-6 shadow-[0_0_0_1px_rgb(251_191_36/0.35),0_30px_70px_rgb(2_6_23/0.45)] sm:p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-sol-gold/25 blur-3xl" aria-hidden />
        <div className="relative flex items-start gap-3">
          {Icon && (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sol-gold/20 text-sol-gold-dark ring-1 ring-sol-gold/40 dark:text-accent">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
          )}
          <h2 id={titleId} className="pt-1.5 font-display text-2xl font-bold leading-tight text-fg">
            {title}
          </h2>
        </div>
        <div id={descId} className="relative text-base leading-relaxed text-fg-muted sm:text-lg">
          {children}
        </div>
        <div className="relative flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="outline" className="h-11 min-h-11! rounded-full!" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} className="h-11 min-h-11! rounded-full!" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
