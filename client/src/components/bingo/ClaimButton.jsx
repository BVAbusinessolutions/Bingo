import { CheckCircle2, Hourglass, PartyPopper, XCircle } from 'lucide-react';
import Button from '../ui/Button';

const STATES = {
  PENDING: ['bg-sol-gold/20 text-fg', Hourglass, 'Reclamo enviado. La Asociación está verificando tu cartón.'],
  CONFIRMED: ['bg-emerald-500/15 text-fg', CheckCircle2, '¡Premio confirmado! Te contactaremos para la entrega.'],
};

/**
 * Botón "¡Bingo!" bajo un cartón ganador, o el estado de su reclamo.
 * Un reclamo rechazado permite volver a intentar (el servidor vuelve a validar).
 */
export default function ClaimButton({ claim, canClaim, loading, error, onClaim }) {
  const state = STATES[claim?.status];
  if (state) {
    const [cls, Icon, text] = state;
    return (
      <p role="status" className={`flex items-center gap-2 rounded-2xl p-3 font-bold ${cls}`}>
        <Icon className="h-6 w-6 shrink-0" aria-hidden /> {text}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {claim?.status === 'REJECTED' && (
        <p className="flex items-center gap-2 rounded-2xl bg-sol-red/10 p-3 font-bold text-fg">
          <XCircle className="h-6 w-6 shrink-0 text-sol-red" aria-hidden /> El reclamo anterior no se confirmó.
        </p>
      )}
      <Button variant="gold" size="lg" icon={PartyPopper} loading={loading} disabled={!canClaim} onClick={onClaim} className="w-full text-xl">
        ¡Bingo! Reclamar premio
      </Button>
      {!canClaim && <p className="text-center text-sm text-fg-muted">Podrás reclamar cuando el sorteo esté en vivo.</p>}
      {error && (
        <p role="alert" className="text-center font-semibold text-sol-red dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
