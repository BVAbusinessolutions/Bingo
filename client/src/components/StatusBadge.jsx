const STYLES = {
  PENDING: ['bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', 'Pendiente de pago'],
  PROOF_SUBMITTED: ['bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', 'En verificación'],
  APPROVED: ['bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300', 'Aprobada'],
  REJECTED: ['bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300', 'Rechazada'],
  EXPIRED: ['bg-muted text-fg-muted', 'Vencida'],
  CANCELLED: ['bg-muted text-fg-muted', 'Cancelada'],
  VERIFYING: ['bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', 'En verificación'],
  AVAILABLE: ['bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300', 'Disponible'],
  RESERVED: ['bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300', 'Reservado'],
  SOLD: ['bg-sol-red/10 text-sol-red dark:bg-sol-red/25 dark:text-red-300', 'Vendido'],
  SCHEDULED: ['bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300', 'Programado'],
  LIVE: ['bg-red-600 text-white', 'En vivo'],
  FINISHED: ['bg-muted text-fg-muted', 'Finalizado'],
};

export default function StatusBadge({ status }) {
  const [cls, label] = STYLES[status] ?? ['bg-muted text-fg-muted', status];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}
