// Estados del catálogo público (coinciden con GET /events/:id/cards/catalog).
export const CARD_STATUS = Object.freeze({
  AVAILABLE: {
    label: 'Disponible',
    emoji: '🟩',
    hint: 'Toca para seleccionarlo',
    tile: 'bg-emerald-50 text-emerald-900 border-emerald-400 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100 dark:border-emerald-500/70 dark:hover:bg-emerald-900/60',
    dot: 'bg-emerald-500',
  },
  RESERVED: {
    label: 'Reservado',
    emoji: '🟧',
    hint: 'Apartado mientras otra persona paga',
    tile: 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-500/60',
    dot: 'bg-orange-500',
  },
  VERIFYING: {
    label: 'En verificación',
    emoji: '🟧',
    hint: 'Pago enviado, en revisión por la Asociación',
    tile: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-500/60',
    dot: 'bg-amber-500',
  },
  SOLD: {
    label: 'Vendido',
    emoji: '🟥',
    hint: 'No disponible',
    tile: 'bg-red-50 text-red-300 border-red-200 line-through dark:bg-red-950/30 dark:text-red-400/60 dark:border-red-900',
    dot: 'bg-sol-red',
  },
});

export const formatSerial = (serial) => `#${serial}`;
