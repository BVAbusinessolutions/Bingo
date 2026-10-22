import { Sun } from 'lucide-react';

/** Marco común para login, registro y recuperación: tarjeta centrada sobre fondo de marca. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-linear-to-b from-sol-blue to-sol-blue-light px-4 py-10 dark:from-page dark:to-sol-blue/40">
      <div className="w-full max-w-md">
        <div className="surface border-t-8 border-sol-gold p-6 sm:p-8">
          <div className="mb-6 text-center">
            <Sun className="mx-auto mb-2 h-12 w-12 text-sol-gold" aria-hidden />
            <h1 className="text-3xl font-black text-brand">{title}</h1>
            {subtitle && <p className="mt-1 text-fg-muted">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-white dark:text-fg-muted">{footer}</div>}
      </div>
    </main>
  );
}
