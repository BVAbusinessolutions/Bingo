import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Mail, Phone, Trophy, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import BingoCard from '../../components/bingo/BingoCard';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { PATTERNS } from '../../constants/patterns';
import { errorMessage, formatDate } from '../../lib/format';

const EMPTY = new Set();
const CLAIM_LABELS = { PENDING: 'PROOF_SUBMITTED', CONFIRMED: 'APPROVED', REJECTED: 'REJECTED' }; // reutiliza colores de StatusBadge

function ClaimCard({ claim, pattern, onDecide }) {
  const called = useMemo(() => new Set(claim.calledAtClaim), [claim.calledAtClaim]);
  return (
    <article className="surface grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-2">
        <BingoCard card={{ id: claim.id, serial: claim.serial, grid: claim.grid }} called={called} manualMarks={EMPTY} pattern={pattern} />
        <p className="text-fg-muted">
          Marcado con las {claim.calledCount} balotas cantadas al momento del reclamo ({formatDate(claim.createdAt)}).
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xl font-black text-fg">#{claim.serial}</p>
          <span className="[&>span]:text-sm">
            <StatusBadge status={CLAIM_LABELS[claim.status]} />
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-black text-fg">{claim.player?.name}</p>
          {claim.player?.email && (
            <a href={`mailto:${claim.player.email}`} className="flex items-center gap-2 break-all text-fg-muted underline">
              <Mail className="h-4 w-4 shrink-0" aria-hidden /> {claim.player.email}
            </a>
          )}
          {claim.player?.phone && (
            <a href={`tel:${claim.player.phone.replace(/[\s-]/g, '')}`} className="flex items-center gap-2 text-fg-muted underline">
              <Phone className="h-4 w-4 shrink-0" aria-hidden /> {claim.player.phone}
            </a>
          )}
        </div>
        <p className="rounded-xl bg-emerald-500/10 p-3 font-bold text-fg">✔ El sistema verificó que el patrón está completo.</p>
        {claim.status === 'PENDING' ? (
          <div className="grid gap-2">
            <Button variant="success" size="lg" icon={Check} onClick={() => onDecide(claim, true)}>
              Confirmar premio
            </Button>
            <Button variant="danger" icon={X} onClick={() => onDecide(claim, false)}>
              Rechazar reclamo
            </Button>
          </div>
        ) : (
          claim.decidedAt && <p className="text-fg-muted">Decidido el {formatDate(claim.decidedAt)}.</p>
        )}
      </div>
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
