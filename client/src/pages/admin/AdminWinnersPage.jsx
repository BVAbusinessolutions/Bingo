import { useCallback, useEffect, useId, useState } from 'react';
import { Check, Gift, Mail, Phone, Trophy, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import WinnerVerification from '../../components/admin/WinnerVerification';
import SalonWinners from '../../components/admin/SalonWinners';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { PATTERNS } from '../../constants/patterns';
import { errorMessage, formatDate } from '../../lib/format';

const CLAIM_LABELS = { PENDING: 'PROOF_SUBMITTED', CONFIRMED: 'APPROVED', REJECTED: 'REJECTED' }; // reutiliza colores de StatusBadge

/** Premio que se le entrega a este ganador ("Motocicleta", "₡50 000"…): se guarda y sale en Resultados. */
function PrizeEditor({ claim, onSaved }) {
  const inputId = useId();
  const [value, setValue] = useState(claim.prize ?? '');
  const [state, setState] = useState('idle'); // idle | saving | saved
  const [error, setError] = useState('');
  const dirty = value.trim() !== (claim.prize ?? '');

  const save = async (e) => {
    e.preventDefault();
    setState('saving');
    setError('');
    try {
      await adminApi.setClaimPrize(claim.id, value.trim() || null);
      setState('saved');
      onSaved();
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setError(errorMessage(err, 'El premio debe tener entre 2 y 120 caracteres.'));
      setState('idle');
    }
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-2 rounded-2xl bg-sol-gold/10 p-3 ring-1 ring-sol-gold/40">
      <label htmlFor={inputId} className="min-w-48 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-extrabold text-fg">
          <Gift className="h-4 w-4 text-sol-gold-dark" aria-hidden /> Premio entregado
        </span>
        <input
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={120}
          placeholder="Ej. Motocicleta, ₡50 000, canasta"
          className="mt-1 min-h-11 w-full rounded-xl border-2 border-line bg-card px-3 text-fg outline-none focus:border-sol-blue focus:ring-4 focus:ring-sol-gold/30"
        />
      </label>
      <Button
        type="submit"
        size="sm"
        loading={state === 'saving'}
        disabled={!dirty && state !== 'saved'}
        icon={Check}
        className="rounded-full!"
      >
        {state === 'saved' ? '¡Guardado!' : 'Guardar premio'}
      </Button>
      {error && <p className="w-full text-sm font-semibold text-sol-red dark:text-red-300">{error}</p>}
    </form>
  );
}

function ClaimCard({ claim, pattern, onDecide, onChanged }) {
  const claimPattern = claim.pattern ?? pattern; // la modalidad de su ronda, no la actual del evento
  return (
    <article id={`reclamo-${claim.id}`} className="surface scroll-mt-24 space-y-5 p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-2xl font-black text-fg">
            Cartón #{claim.serial}
            {claim.channel === 'SALON' && <span className="rounded-full bg-navy-950 px-2 py-0.5 text-sm text-accent">Salón</span>}
            <span className="[&>span]:text-sm">
              <StatusBadge status={CLAIM_LABELS[claim.status]} />
            </span>
          </p>
          <p className="text-lg font-bold text-fg">{claim.player?.name ?? 'Sin nombre'}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-fg-muted">
            {claim.player?.email && (
              <a href={`mailto:${claim.player.email}`} className="inline-flex items-center gap-1.5 break-all underline">
                <Mail className="h-4 w-4 shrink-0" aria-hidden /> {claim.player.email}
              </a>
            )}
            {claim.player?.phone && (
              <a href={`tel:${claim.player.phone.replace(/[\s-]/g, '')}`} className="inline-flex items-center gap-1.5 underline">
                <Phone className="h-4 w-4 shrink-0" aria-hidden /> {claim.player.phone}
              </a>
            )}
            <span>Reclamó el {formatDate(claim.createdAt)}</span>
          </p>
        </div>
        {claim.status === 'PENDING' ? (
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <Button variant="success" icon={Check} onClick={() => onDecide(claim, true)} className="rounded-full!">
              Confirmar premio
            </Button>
            <Button variant="danger" icon={X} onClick={() => onDecide(claim, false)} className="rounded-full!">
              Rechazar
            </Button>
          </div>
        ) : (
          claim.decidedAt && <p className="text-fg-muted">Decidido el {formatDate(claim.decidedAt)}.</p>
        )}
      </header>
      {claim.status !== 'REJECTED' && <PrizeEditor key={claim.prize ?? ''} claim={claim} onSaved={onChanged} />}
      <WinnerVerification claim={claim} pattern={claimPattern} />
    </article>
  );
}

export default function AdminWinnersPage() {
  const { eventId, event, revision, reloadCounters } = useAdmin();
  const [claims, setClaims] = useState(null);
  const [confirming, setConfirming] = useState(null); // { claim, approve }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!eventId) return;
    adminApi.claims(eventId).then(setClaims);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, revision]);

  const decide = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.decideClaim(confirming.claim.id, confirming.approve);
      load();
      reloadCounters();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const pending = claims?.filter((c) => c.status === 'PENDING') ?? [];
  const decided = claims?.filter((c) => c.status !== 'PENDING') ?? [];
  const pattern = event?.pattern ?? 'FULL';

  return (
    <section className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-black text-brand">
          <Trophy className="h-8 w-8 text-sol-gold" aria-hidden /> Ganadores
        </h1>
        <p className="text-lg text-fg-muted">
          {event?.name} · se juega {PATTERNS[pattern]?.label}. Confirma cada premio antes de anunciarlo.
        </p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <SalonWinners event={event} revision={revision} />

      <h2 className="flex items-center gap-2 pt-2 text-xl font-black text-fg">
        <Trophy className="h-6 w-6 text-sol-gold" aria-hidden /> Ganadores en línea
      </h2>
      {!claims ? (
        <PageLoader />
      ) : claims.length === 0 ? (
        <p className="surface p-8 text-center text-lg text-fg-muted">Todavía nadie ha reclamado bingo en línea en este evento.</p>
      ) : (
        <>
          {pending.length > 0 && <h2 className="text-2xl font-black text-fg">Por confirmar ({pending.length})</h2>}
          {pending.map((c) => (
            <ClaimCard
              key={c.id}
              claim={c}
              pattern={pattern}
              onChanged={load}
              onDecide={(claim, approve) => setConfirming({ claim, approve })}
            />
          ))}
          {decided.length > 0 && <h2 className="pt-2 text-2xl font-black text-fg">Revisados ({decided.length})</h2>}
          {decided.map((c) => (
            <ClaimCard key={c.id} claim={c} pattern={pattern} onChanged={load} />
          ))}
        </>
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.approve ? '¿Confirmar el premio?' : '¿Rechazar el reclamo?'}
          confirmLabel={confirming.approve ? 'Sí, confirmar' : 'Sí, rechazar'}
          confirmVariant={confirming.approve ? 'success' : 'danger'}
          loading={busy}
          onConfirm={decide}
          onCancel={() => setConfirming(null)}
        >
          {confirming.approve
            ? `${confirming.claim.player?.name} aparecerá como ganador con el cartón #${confirming.claim.serial} y recibirá un correo.`
            : 'El jugador recibirá un aviso de que su reclamo no se confirmó.'}
        </ConfirmDialog>
      )}
    </section>
  );
}
