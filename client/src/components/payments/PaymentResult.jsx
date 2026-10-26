import { CheckCircle2, Hourglass, Mail, Ticket, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import { formatCRC } from '../../lib/format';
import { PATHS, toPath } from '../../routing/paths';

const RESULT = {
  PROOF_SUBMITTED: {
    Icon: Hourglass,
    color: 'text-amber-500',
    title: '¡Compra enviada!',
    text: 'Recibimos tus datos y tu comprobante. La Asociación verificará el pago y te enviaremos un correo con el enlace para ver tus cartones.',
  },
  APPROVED: {
    Icon: CheckCircle2,
    color: 'text-emerald-500',
    title: '¡Pago confirmado!',
    text: 'Tus cartones ya están asignados a tu cuenta.',
  },
  EXPIRED: {
    Icon: XCircle,
    color: 'text-fg-subtle',
    title: 'Se acabó el tiempo',
    text: 'La reserva venció y los cartones volvieron a estar disponibles. Puedes elegirlos de nuevo.',
  },
  CANCELLED: { Icon: XCircle, color: 'text-fg-subtle', title: 'Compra cancelada', text: 'Los cartones volvieron a estar disponibles.' },
  REJECTED: {
    Icon: XCircle,
    color: 'text-sol-red',
    title: 'Pago rechazado',
    text: 'No pudimos verificar el pago. Contáctanos si crees que es un error.',
  },
};

/** Paso 3 de la compra: resultado y siguientes acciones. */
export default function PaymentResult({ reservation }) {
  const result = RESULT[reservation.status] ?? RESULT.PROOF_SUBMITTED;
  const sent = reservation.status === 'PROOF_SUBMITTED';

  return (
    <section className="surface mx-auto max-w-2xl space-y-5 p-6 text-center sm:p-10">
      <result.Icon className={`mx-auto h-20 w-20 ${result.color}`} aria-hidden />
      <h2 className="text-3xl font-black text-fg">{result.title}</h2>
      <p className="text-lg text-fg-muted">{result.text}</p>

      {sent && (
        <div className="grid gap-3 text-left sm:grid-cols-3">
          {[
            ['Cartones', reservation.serials.map((s) => `#${s}`).join(', ')],
            ['Total', formatCRC(reservation.total)],
            ['N.º de comprobante', reservation.reference ?? '—'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-muted p-4">
              <p className="text-sm font-bold text-fg-muted">{k}</p>
              <p className="break-words text-lg font-black text-fg">{v}</p>
            </div>
          ))}
        </div>
      )}
      {sent && (
        <p className="flex items-center justify-center gap-2 font-bold text-fg">
          <Mail className="h-5 w-5 text-brand" aria-hidden /> Revisa tu correo: también te avisaremos aquí en la página.
        </p>
      )}

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button to={toPath(PATHS.purchaseDetail, { id: reservation.id })} size="lg">
          Ver mi compra
        </Button>
        {!sent && reservation.status !== 'APPROVED' && (
          <Button to={PATHS.catalog} variant="gold" size="lg" icon={Ticket}>
            Elegir cartones
          </Button>
        )}
      </div>
    </section>
  );
}
