import { useCallback, useEffect, useState } from 'react';
import { Check, Mail, Phone, Trophy, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import WinnerVerification from '../../components/admin/WinnerVerification';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { PATTERNS } from '../../constants/patterns';
import { errorMessage, formatDate } from '../../lib/format';

const CLAIM_LABELS = { PENDING: 'PROOF_SUBMITTED', CONFIRMED: 'APPROVED', REJECTED: 'REJECTED' }; // reutiliza colores de StatusBadge

function ClaimCard({ claim, pattern, onDecide }) {
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
      {!claims ? (
        <PageLoader />
      ) : claims.length === 0 ? (
        <p className="surface p-10 text-center text-lg text-fg-muted">Todavía nadie ha reclamado bingo en este evento.</p>
      ) : (
        <>
          {pending.length > 0 && <h2 className="text-2xl font-black text-fg">Por confirmar ({pending.length})</h2>}
          {pending.map((c) => (
            <ClaimCard key={c.id} claim={c} pattern={pattern} onDecide={(claim, approve) => setConfirming({ claim, approve })} />
          ))}
          {decided.length > 0 && <h2 className="pt-2 text-2xl font-black text-fg">Revisados ({decided.length})</h2>}
          {decided.map((c) => (
            <ClaimCard key={c.id} claim={c} pattern={pattern} />
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
