import { useState } from 'react';
import { CheckCircle2, Hourglass, Lock, PartyPopper, XCircle } from 'lucide-react';
import Button from '../ui/Button';

const STATES = {
  PENDING: ['bg-sol-gold/20 text-fg', Hourglass, 'Reclamo enviado. La Asociación está verificando tu cartón.'],
  CONFIRMED: ['bg-emerald-500/15 text-fg', CheckCircle2, '¡Premio confirmado! Te contactaremos para la entrega.'],
};

/**
 * Botón "¡Bingo!" bajo cada cartón, o el estado de su reclamo.
 * Queda bloqueado mientras el cartón no complete el patrón con las bolas cantadas (`missing` > 0);
 * aun habilitado, el servidor vuelve a validar el cartón contra el registro oficial antes de aceptar.
 * Un reclamo rechazado permite volver a intentar.
 */
// compact: vista Mini (cartones pequeños): mismos estados, botones más bajos.
export default function ClaimButton({ claim, canClaim, missing = 0, uncalled = 0, loading, error, onClaim, compact = false }) {
  const [hint, setHint] = useState(false);
  const state = STATES[claim?.status];
  if (state) {
    const [cls, Icon, text] = state;
    return (
      <p role="status" className={`flex items-center gap-2 rounded-2xl font-bold ${compact ? 'p-2 text-sm' : 'p-3'} ${cls}`}>
        <Icon className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} shrink-0`} aria-hidden /> {text}
      </p>
    );
  }

  const locked = missing > 0;
  return (
    <div className="space-y-2">
      {claim?.status === 'REJECTED' && (
        <p className="flex items-center gap-2 rounded-2xl bg-sol-red/10 p-3 font-bold text-fg">
          <XCircle className="h-6 w-6 shrink-0 text-sol-red" aria-hidden /> El reclamo anterior no se confirmó.
        </p>
      )}
      {locked ? (
        // Bloqueado pero pulsable (aria-disabled): al tocarlo explica por qué todavía no se puede cantar.
        <Button
          variant="outline"
          size={compact ? 'sm' : undefined}
          icon={Lock}
          aria-disabled="true"
          onClick={() => setHint(true)}
          className="w-full cursor-not-allowed rounded-full opacity-70"
        >
          ¡Bingo! · {missing === 1 ? 'te falta 1' : `faltan ${missing}`}
        </Button>
      ) : (
        <Button
          variant="gold"
          size={compact ? undefined : 'lg'}
          icon={PartyPopper}
          loading={loading}
          disabled={!canClaim}
          onClick={onClaim}
          className={`w-full rounded-full ${compact ? 'text-base' : 'text-xl'} ${canClaim ? 'motion-safe:animate-ready' : ''}`}
        >
          ¡Bingo! Reclamar premio
        </Button>
      )}
      {locked && hint && (
        <p role="alert" className="rounded-2xl bg-sol-red/10 p-3 text-center text-sm font-semibold text-fg">
          Aún no completas el patrón con bolas cantadas oficialmente.
          {uncalled > 0 && ` Tienes ${uncalled === 1 ? '1 número marcado' : `${uncalled} números marcados`} que todavía no ha salido.`}
        </p>
      )}
      {!locked && !canClaim && <p className="text-center text-sm text-fg-muted">Podrás reclamar cuando el sorteo esté en vivo.</p>}
      {error && (
        <p role="alert" className="text-center font-semibold text-sol-red dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
