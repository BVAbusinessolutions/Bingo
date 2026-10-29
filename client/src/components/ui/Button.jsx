import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-sol-blue text-white hover:bg-sol-blue-light dark:bg-sol-gold dark:text-sol-blue dark:hover:bg-sol-gold-dark',
  gold: 'bg-sol-gold text-sol-blue shadow-md hover:bg-sol-gold-dark',
  danger: 'bg-sol-red text-white hover:bg-sol-red-dark',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  outline: 'border-2 border-line bg-card text-fg hover:border-sol-blue dark:hover:border-sol-gold',
  ghost: 'text-fg hover:bg-muted',
  light: 'border-2 border-white/80 text-white hover:bg-white/10',
};

// Microinteracción: se eleva un poco al pasar el mouse y se hunde al pulsar (respeta "reducir animaciones").
const LIFT = 'not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-lg';
const LIFTS = { primary: LIFT, gold: LIFT, danger: LIFT, success: LIFT, outline: LIFT, ghost: '', light: LIFT };

const SIZES = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

/**
 * Botón accesible con área táctil mínima de 44 px.
 * Con `to` se renderiza como enlace interno; con `href`, como enlace externo.
 * Un enlace con `disabled` (o `loading`) no navega: queda como texto inactivo, igual que un botón deshabilitado.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, to, href, className = '', children, disabled, ...props },
  ref
) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl font-extrabold transition duration-200 ease-out ${VARIANTS[variant]} ${SIZES[size]}`;
  const interactive = `${LIFTS[variant]} not-disabled:active:translate-y-0 not-disabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55`;
  const cls = `${base} ${interactive} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      {children}
    </>
  );

  if ((to || href) && (disabled || loading)) {
    return (
      <span ref={ref} role="link" aria-disabled="true" className={`${base} cursor-not-allowed opacity-55 ${className}`} {...props}>
        {content}
      </span>
    );
  }
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={cls} target="_blank" rel="noopener noreferrer" {...props}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});

export default Button;
