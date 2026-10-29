import { useEffect, useId, useRef } from 'react';
import Button from './Button';
import { useBackdropClose } from '../../hooks/useBackdropClose';

/** Diálogo de confirmación accesible (reemplaza window.confirm). */
export default function ConfirmDialog({ title, children, confirmLabel, confirmVariant = 'primary', loading, onConfirm, onCancel }) {
  const titleId = useId();
  const cancelRef = useRef(null);
  const backdrop = useBackdropClose(onCancel);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" {...backdrop}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface w-full max-w-md space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-2xl font-black text-fg">
          {title}
        </h2>
        <div className="text-lg text-fg-muted">{children}</div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="outline" onClick={onCancel}>
            Volver
          </Button>
          <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
