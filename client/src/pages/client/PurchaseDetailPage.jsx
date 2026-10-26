import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, CreditCard, Printer, Radio, XCircle } from 'lucide-react';
import { reservationsApi } from '../../api/endpoints';
import { useNotifications } from '../../context/NotificationsContext';
import CardImage from '../../components/bingo/CardImage';
import ProofPreview from '../../components/payments/ProofPreview';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { formatCRC, formatDate } from '../../lib/format';
import { PATHS, toPath } from '../../routing/paths';
import { SITE } from '../../config/site';

const METHODS = { SINPE: 'SINPE Móvil', TRANSFER: 'Transferencia bancaria' };
const CLOSED = { REJECTED: 'Pago rechazado', EXPIRED: 'Reserva vencida', CANCELLED: 'Reserva cancelada' };

/** Pasos de la compra: reservado → comprobante enviado → aprobado (o el motivo de cierre). */
function Progress({ status }) {
  const reached = { PENDING: 1, PROOF_SUBMITTED: 2, APPROVED: 3 }[status] ?? 1;
  const steps = ['Cartones reservados', 'Comprobante enviado', 'Pago aprobado'];
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((label, i) => {
        const done = !CLOSED[status] && i < reached;
        return (
          <li
            key={label}
            className={`flex items-center gap-2 rounded-2xl p-3 font-bold ${done ? 'bg-emerald-500/10 text-fg' : 'bg-muted text-fg-muted'}`}
          >
            {done ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            ) : (
              <Circle className="h-6 w-6 shrink-0" aria-hidden />
            )}
            {label}
          </li>
        );
      })}
      {CLOSED[status] && (
        <li className="flex items-center gap-2 rounded-2xl bg-sol-red/10 p-3 font-bold text-sol-red sm:col-span-3 dark:text-red-300">
          <XCircle className="h-6 w-6 shrink-0" aria-hidden /> {CLOSED[status]}
        </li>
      )}
    </ol>
  );
}

function InfoItem({ label, children }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <dt className="text-sm font-bold text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-lg font-black text-fg">{children}</dd>
    </div>
  );
}

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const { revision } = useNotifications();
  const [r, setReservation] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    reservationsApi
      .get(id)
      .then(setReservation)
      .catch(() => setError(true));
  }, [id, revision]);

  if (error) {
    return (
      <main className="container-page py-10">
        <Alert tone="error" title="No encontramos esta compra" action={<Button to={PATHS.myPurchases}>Ver mis compras</Button>} />
      </main>
    );
  }
  if (!r) return <PageLoader />;

  const approved = r.status === 'APPROVED';

  return (
    <main className="container-page py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to={PATHS.myPurchases}
          className="inline-flex min-h-11 items-center gap-2 font-bold text-sol-blue hover:underline dark:text-sol-gold print:hidden"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden /> Mis compras
        </Link>

        {/* Encabezado solo para la hoja impresa */}
        <div className="hidden text-center print:block">
          <p className="text-2xl font-black">{SITE.name} · Bingo Benéfico</p>
          <p>
            {r.eventName} · {r.buyer?.fullName ?? ''}
          </p>
        </div>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-brand">{r.eventName}</h1>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-lg text-fg-muted">Compra del {formatDate(r.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {r.status === 'PENDING' && (
              <Button to={toPath(PATHS.checkout, { id: r.id })} variant="gold" icon={CreditCard} size="lg">
                Completar pago
              </Button>
            )}
            {approved && (
              <>
                <Button onClick={() => window.print()} variant="outline" icon={Printer} size="lg">
                  Imprimir o guardar PDF
                </Button>
                <Button to={PATHS.live} variant="danger" icon={Radio} size="lg">
                  Jugar en vivo
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="print:hidden">
          <Progress status={r.status} />
        </div>

        {r.status === 'PROOF_SUBMITTED' && (
          <Alert tone="info" title="Estamos verificando tu pago" className="print:hidden">
            Te avisaremos aquí y por correo en cuanto se apruebe.
          </Alert>
        )}

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <InfoItem label="Total">{formatCRC(r.total)}</InfoItem>
          <InfoItem label="Cartones">{r.serials.length}</InfoItem>
          <InfoItem label="Método de pago">{METHODS[r.method] ?? '—'}</InfoItem>
          <InfoItem label="Referencia">{r.reference ?? '—'}</InfoItem>
        </dl>

        {r.hasProof && (
          <section className="surface space-y-3 p-5 print:hidden">
            <h2 className="text-xl font-black text-fg">Comprobante enviado</h2>
            <ProofPreview reservationId={r.id} />
          </section>
        )}

        <section aria-labelledby="cards-title" className="space-y-3">
          <h2 id="cards-title" className="text-2xl font-black text-fg print:hidden">
            Tus cartones
          </h2>
          {!approved && <p className="text-fg-muted print:hidden">Podrás imprimirlos cuando el pago esté aprobado.</p>}
          <div className="print-cards grid gap-4 sm:grid-cols-2">
            {r.cards.map((card) => (
              <CardImage key={card.id} card={card} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
