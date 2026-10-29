import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Megaphone, Store, Trophy } from 'lucide-react';
import { drawApi } from '../../api/endpoints';
import Button from '../ui/Button';
import { errorMessage } from '../../lib/format';

const CLAIM_LABELS = {
  PENDING: ['Reclamo por confirmar', 'bg-sol-gold text-sol-blue'],
  CONFIRMED: ['Premio confirmado', 'bg-emerald-600 text-white'],
  REJECTED: ['Reclamo rechazado', 'bg-slate-500 text-white'],
};

/**
 * Verificación automática: el servidor revisa TODOS los cartones vendidos (web y salón) contra las balotas
 * cantadas y lista los que ya tienen bingo, los haya cantado alguien o no. Se refresca con cada balota.
 */
export default function WinningCardsPanel({ eventId, calledCount }) {
  const [cards, setCards] = useState([]);
  const [busy, setBusy] = useState(null); // cardId que se está publicando
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!eventId) return;
    drawApi
      .winningCards(eventId)
      .then(setCards)
      .catch(() => {}); // es un apoyo visual: si falla, el flujo de reclamos sigue igual
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, calledCount]);

  // Cartón del salón verificado en voz alta: el servidor vuelve a validarlo y lo publica en Resultados.
  const publishSalonWinner = async (card) => {
    setBusy(card.cardId);
    setError('');
    try {
      await drawApi.salonWinner(eventId, card.cardId);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="winning-cards-title" aria-live="polite" className="surface space-y-3 p-4">
      <h2 id="winning-cards-title" className="flex items-center gap-2 text-xl font-black text-fg">
        <Trophy className="h-6 w-6 text-sol-gold" aria-hidden /> Cartones con bingo
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-base">{cards.length}</span>
      </h2>
      {error && (
        <p role="alert" className="font-semibold text-sol-red dark:text-red-300">
          {error}
        </p>
      )}
      {cards.length === 0 ? (
        <p className="text-fg-muted">Ningún cartón vendido completa el patrón todavía. Se verifica solo con cada balota.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {cards.map((c) => {
            const [label, cls] = CLAIM_LABELS[c.claimStatus] ?? ['Sin reclamar', 'bg-sol-red text-white'];
            return (
              <li key={c.cardId} className="flex animate-pop items-center gap-3 rounded-xl border-2 border-sol-gold bg-sol-gold/10 p-3">
                <span className="text-2xl font-black tabular-nums text-brand">#{c.serial}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-fg">{c.holder ?? 'Sin nombre'}</span>
                  <span className="flex items-center gap-1 text-sm text-fg-muted">
                    {c.channel === 'MANUAL' ? (
                      <>
                        <Store className="h-4 w-4" aria-hidden /> Vendido en el salón
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="h-4 w-4" aria-hidden /> Compra en línea
                      </>
                    )}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-black ${cls}`}>{label}</span>
                  {c.channel === 'MANUAL' && !c.claimStatus && (
                    <Button size="sm" variant="success" icon={Megaphone} loading={busy === c.cardId} onClick={() => publishSalonWinner(c)}>
                      Confirmar y publicar
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
