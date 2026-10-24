import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Building2, Check, Mail, MailWarning, Phone, Smartphone, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import { ProofPanel } from '../../components/admin/AdminProof';
import { CopyButton } from '../../components/payments/PaymentPieces';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { errorMessage, formatCRC, formatDate } from '../../lib/format';

function InfoRow({ label, value, copy, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <dt className="text-sm font-bold text-fg-muted">{label}</dt>
        <dd className="break-words text-lg font-black text-fg">{children ?? value ?? '—'}</dd>
      </div>
      {copy && value && <CopyButton value={value} label={label} />}
    </div>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`surface p-5 ${className}`}>
      <h2 className="mb-1 text-xl font-black text-fg">{title}</h2>
      {children}
    </section>
  );
}

/** Lista de verificación: el botón "Aprobar" solo se habilita cuando todo coincide. */
function VerificationChecklist({ r, checks, setChecks }) {
  const items = [
    ['amount', <>El monto recibido es <b className="text-fg">{formatCRC(r.total)}</b></>],
    ['reference', <>El n.º de comprobante <b className="text-fg">{r.reference}</b> coincide con la foto y con el banco</>],
    ['detail', <>El detalle de la transferencia dice <b className="rounded bg-sol-gold px-1.5 text-sol-blue">{r.payment?.detail ?? 'BINGO'}</b></>],
    ['received', <>El dinero aparece en la cuenta de la Asociación</>],
  ];
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Verificación del pago</legend>
      {items.map(([key, label]) => (
        <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${checks[key] ? 'border-emerald-500 bg-emerald-500/10' : 'border-line hover:border-sol-blue'}`}>
          <input
            type="checkbox"
            checked={Boolean(checks[key])}
            onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
            className="mt-1 h-6 w-6 shrink-0 accent-emerald-600"
          />
          <span className="text-fg-muted">{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function AdminPurchaseDetailPage() {
  const { id } = useParams();
  const { revision, reloadCounters } = useAdmin();
  const [r, setReservation] = useState(null);
  const [error, setError] = useState('');
  const [checks, setChecks] = useState({});
  const [confirming, setConfirming] = useState(null); // 'approve' | 'reject'
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      adminApi
        .reservation(id)
        .then(setReservation)
        .catch(() => setError('No encontramos esta compra.')),
    [id]
  );

  useEffect(() => {
    load();
  }, [load, revision]);

  const decide = async () => {
    setBusy(true);
    try {
      await adminApi.decide(r.id, confirming === 'approve');
      setConfirming(null);
      await load();
      reloadCounters();
    } catch (err) {
      setConfirming(null);
      setError(errorMessage(err));
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!r && error) return <Alert tone="error" title={error} action={<Button to="/admin/compras">Volver a compras</Button>} />;
  if (!r) return <PageLoader />;

  const reviewable = r.status === 'PROOF_SUBMITTED';
  const allChecked = ['amount', 'reference', 'detail', 'received'].every((k) => checks[k]);
  const MethodIcon = r.method === 'TRANSFER' ? Building2 : Smartphone;

  return (
    <section className="space-y-5">
      <Link to="/admin/compras" className="inline-flex min-h-11 items-center gap-2 font-bold text-sol-blue hover:underline dark:text-sol-gold">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Todas las compras
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-brand">{r.buyer?.fullName ?? 'Compra sin datos'}</h1>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-lg text-fg-muted">
            {r.eventName} · reservada el {formatDate(r.createdAt)}
          </p>
        </div>
        <p className="text-4xl font-black tabular-nums text-sol-red dark:text-sol-gold">{formatCRC(r.total)}</p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}
      {r.status === 'PENDING' && <Alert tone="info" title="El cliente aún no envía el comprobante">La reserva vence el {formatDate(r.expiresAt)}.</Alert>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card title="Comprobante enviado">
            <p className="mb-3 text-fg-muted">{r.proofUploadedAt ? `Recibido el ${formatDate(r.proofUploadedAt)}` : 'Pendiente'}</p>
            <ProofPanel reservationId={r.id} hasProof={r.hasProof} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Pago">
            <dl className="divide-y divide-line">
              <InfoRow label="Número de comprobante" value={r.reference} copy />
              <InfoRow label="Método">
                {r.method ? (
                  <span className="inline-flex items-center gap-2">
                    <MethodIcon className="h-5 w-5 text-brand" aria-hidden /> {r.method === 'TRANSFER' ? 'Transferencia bancaria' : 'SINPE Móvil'}
                  </span>
                ) : (
                  '—'
                )}
              </InfoRow>
              <InfoRow label="Monto esperado" value={formatCRC(r.total)} />
              <InfoRow label="Detalle requerido" value={r.payment?.detail ?? 'BINGO'} />
            </dl>
          </Card>

          <Card title="Datos del formulario">
            <dl className="divide-y divide-line">
              <InfoRow label="Nombre completo" value={r.buyer?.fullName} />
              <InfoRow label="Cédula / identificación" value={r.buyer?.nationalId} copy />
              <InfoRow label="Teléfono" value={r.buyer?.phone}>
                {r.buyer?.phone && (
                  <a href={`tel:${r.buyer.phone.replace(/[\s-]/g, '')}`} className="inline-flex items-center gap-2 underline">
                    <Phone className="h-5 w-5" aria-hidden /> {r.buyer.phone}
                  </a>
                )}
              </InfoRow>
              <InfoRow label="Correo" value={r.buyer?.email}>
                {r.buyer?.email && (
                  <a href={`mailto:${r.buyer.email}`} className="inline-flex items-center gap-2 break-all underline">
                    <Mail className="h-5 w-5 shrink-0" aria-hidden /> {r.buyer.email}
                  </a>
                )}
              </InfoRow>
            </dl>
          </Card>

          <Card title="Cuenta que hizo la compra">
            <dl className="divide-y divide-line">
              <InfoRow label="Usuario" value={r.account?.name} />
              <InfoRow label="Correo de la cuenta">
                {r.account && (
                  <span className="inline-flex flex-wrap items-center gap-2 break-all">
                    {r.account.email}
                    {r.account.emailVerified ? (
                      <BadgeCheck className="h-5 w-5 text-emerald-600" aria-label="Correo confirmado" />
                    ) : (
                      <MailWarning className="h-5 w-5 text-amber-500" aria-label="Correo sin confirmar" />
                    )}
                  </span>
                )}
              </InfoRow>
            </dl>
          </Card>

          <Card title={`Cartones (${r.serials.length})`}>
            <p className="mt-2 flex flex-wrap gap-2">
              {r.serials.map((s) => (
                <span key={s} className="rounded-lg bg-sol-red px-3 py-1 text-lg font-black text-white">
                  #{s}
                </span>
              ))}
            </p>
          </Card>
        </div>
      </div>

      {reviewable && (
        <section className="surface space-y-4 border-t-8 border-sol-gold p-5 sm:p-6" aria-labelledby="verify-title">
          <h2 id="verify-title" className="text-2xl font-black text-fg">
            Verifica antes de aprobar
          </h2>
          <VerificationChecklist r={r} checks={checks} setChecks={setChecks} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="success" icon={Check} disabled={!allChecked} onClick={() => setConfirming('approve')} className="flex-1">
              Aprobar compra
            </Button>
            <Button size="lg" variant="danger" icon={X} onClick={() => setConfirming('reject')} className="flex-1">
              Rechazar
            </Button>
          </div>
          {!allChecked && <p className="text-fg-muted">Marca las 4 casillas para habilitar la aprobación.</p>}
        </section>
      )}

      {r.decidedAt && (
        <Alert tone={r.status === 'APPROVED' ? 'success' : 'error'} title={r.status === 'APPROVED' ? 'Compra aprobada' : 'Compra rechazada'}>
          Decidida el {formatDate(r.decidedAt)}. {r.status === 'APPROVED' ? 'El cliente recibió un correo con el enlace para ver sus cartones.' : 'Los cartones volvieron a estar disponibles.'}
        </Alert>
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming === 'approve' ? '¿Aprobar esta compra?' : '¿Rechazar esta compra?'}
          confirmLabel={confirming === 'approve' ? 'Sí, aprobar' : 'Sí, rechazar'}
          confirmVariant={confirming === 'approve' ? 'success' : 'danger'}
          loading={busy}
          onConfirm={decide}
          onCancel={() => setConfirming(null)}
        >
          {confirming === 'approve'
            ? `Se asignarán ${r.serials.length} cartón(es) a ${r.buyer?.fullName} y le enviaremos un correo con el enlace para verlos.`
            : 'Los cartones volverán a estar disponibles y el cliente recibirá un correo avisando que el pago no se pudo verificar.'}
        </ConfirmDialog>
      )}
    </section>
  );
}
