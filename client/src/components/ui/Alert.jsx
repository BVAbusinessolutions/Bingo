import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const TONES = {
  info: ['border-sol-blue/30 bg-sol-blue/8 text-fg dark:border-sol-blue-light/50', Info, 'text-sol-blue dark:text-brand'],
  success: ['border-emerald-500/40 bg-emerald-500/10 text-fg', CheckCircle2, 'text-emerald-600 dark:text-emerald-400'],
  warning: ['border-sol-gold/60 bg-sol-gold/15 text-fg', AlertTriangle, 'text-amber-600 dark:text-sol-gold'],
  error: ['border-sol-red/40 bg-sol-red/10 text-fg', XCircle, 'text-sol-red dark:text-red-300'],
};

/** Mensaje en línea con icono. `error` se anuncia de inmediato a lectores de pantalla. */
export default function Alert({ tone = 'info', title, children, action, className = '' }) {
  const [cls, Icon, iconCls] = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex flex-col gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:items-center ${cls} ${className}`}
    >
      <div className="flex flex-1 items-start gap-3">
        <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${iconCls}`} aria-hidden />
        <div className="min-w-0">
          {title && <p className="font-extrabold">{title}</p>}
          {children && <div className="text-fg-muted">{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
