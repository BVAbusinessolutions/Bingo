import { useState } from 'react';
import BingoCard from './BingoCard';

const EMPTY = new Set();

/**
 * Muestra la imagen original del cartón (PNG importado) si existe; si no, o si falla, el cartón digital.
 * Se usa en el catálogo, el detalle de compra y la impresión.
 */
export default function CardImage({ card, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!card.imageUrl || failed) {
    return (
      <div className={className}>
        <BingoCard card={card} called={EMPTY} manualMarks={EMPTY} showStatus={false} />
      </div>
    );
  }
  return (
    <img
      src={card.imageUrl}
      alt={`Cartón número ${card.serial}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-full rounded-2xl bg-white shadow-lg ${className}`}
    />
  );
}
