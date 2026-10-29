import { useEffect, useId, useState } from 'react';
import { Ban, ShieldCheck, Timer } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { errorMessage } from '../../lib/format';

const COPY = {
  SUSPEND: {
    icon: Timer,
    title: 'Suspender cuenta',
    text: 'No podrá entrar ni comprar hasta que venza la suspensión. Se cierran sus sesiones y se liberan sus cartones apartados sin pagar.',
    confirm: 'Suspender',
    variant: 'danger',
  },
  BAN: {
    icon: Ban,
    title: 'Banear cuenta',
    text: 'Bloqueo permanente por fraude o incumplimiento grave del reglamento. Se cierran sus sesiones y se liberan sus cartones apartados sin pagar.',
    confirm: 'Banear',
    variant: 'danger',
  },
  LIFT: {
    icon: ShieldCheck,
    title: 'Levantar sanción',
    text: 'La cuenta vuelve a quedar activa de inmediato.',
    confirm: 'Levantar sanción',
    variant: 'success',
  },
};

const DAY_OPTIONS = [1, 3, 7, 15, 30, 90];

/** Suspensión temporal, baneo o levantamiento de sanción. El motivo queda en la cuenta y en la bitácora. */
export default function SanctionDialog({ user, type, onCancel, onDone }) {
  const { icon: Icon, title, text, confirm, variant } = COPY[type];
  const titleId = useId();
  const reasonId = useId();
  const backdrop = useBackdropClose(onCancel);
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsReason = type !== 'LIFT';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = async (e) => {
    e.preventDefault();
    if (needsReason && reason.trim().length < 5) return setError('Escribe el motivo (al menos 5 caracteres).');
    setBusy(true);
    setError('');
    try {
      const body = type === 'SUSPEND' ? { type, days, reason: reason.trim() } : type === 'BAN' ? { type, reason: reason.trim() } : { type };
      await adminApi.sanctionUser(user.id, body);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" {...backdrop}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        noValidate
        className="surface w-full max-w-md animate-pop space-y-4 p-6"
      >
        <h2 id={titleId} className="flex items-center gap-2 text-2xl font-black text-fg">
          <Icon className="h-7 w-7 text-sol-red" aria-hidden /> {title}
        </h2>
        <p className="text-fg-muted">
          <b className="text-fg">{user.name}</b> ({user.email}). {text}
        </p>

        {type === 'SUSPEND' && (
          <fieldset>
            <legend className="mb-1.5 font-bold text-fg">Duración</legend>
            <div className="grid grid-cols-3 gap-2">
              {DAY_OPTIONS.map((d) => (
                <label
                  key={d}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 font-bold transition has-focus-visible:ring-4 has-focus-visible:ring-sol-gold ${
                    days === d ? 'border-sol-blue bg-sol-blue text-white dark:border-sol-gold dark:bg-sol-gold dark:text-sol-blue' : 'border-line text-fg'
                  }`}
                >
                  <input type="radio" name="days" value={d} checked={days === d} onChange={() => setDays(d)} className="sr-only" />
                  {d} {d === 1 ? 'día' : 'días'}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {needsReason && (
          <div>
            <label htmlFor={reasonId} className="block font-bold text-fg">
              Motivo (queda en la bitácora)
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="ej. Comprobante de pago alterado en la compra #…"
              className="mt-1.5 w-full rounded-xl border-2 border-line bg-card p-3 text-fg"
            />
          </div>
        )}

        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel}>
            Volver
          </Button>
          <Button type="submit" variant={variant} loading={busy}>
            {confirm}
          </Button>
        </div>
      </form>
    </div>
  );
}
