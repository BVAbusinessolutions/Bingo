import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Info, Trophy, X, XCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';

const NotificationsContext = createContext(null);
const TOAST_MS = 9000;

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, prize: Trophy };
const TONES = {
  success: 'border-emerald-500 [&_svg.tone]:text-emerald-600',
  error: 'border-sol-red [&_svg.tone]:text-sol-red',
  info: 'border-sol-blue dark:border-brand [&_svg.tone]:text-sol-blue dark:[&_svg.tone]:text-brand',
  prize: 'border-sol-gold [&_svg.tone]:text-sol-gold',
};

/** Traduce los avisos del servidor (canal /user) a mensajes para la persona. */
const fromServer = {
  'reservation:updated': (r) =>
    r.status === 'APPROVED'
      ? { tone: 'success', title: '¡Pago aprobado!', text: `Tus cartones ${r.serials.map((s) => `#${s}`).join(', ')} ya están listos para jugar.`, link: { to: `/mis-compras/${r.id}`, label: 'Ver compra' } }
      : { tone: 'error', title: 'Pago no verificado', text: 'No pudimos confirmar tu pago y los cartones fueron liberados.', link: { to: `/mis-compras/${r.id}`, label: 'Ver detalle' } },
  'claim:updated': (c) =>
    c.status === 'CONFIRMED'
      ? { tone: 'prize', title: '🏆 ¡Premio confirmado!', text: `Tu bingo con el cartón #${c.serial} fue validado. Te contactaremos para la entrega.` }
      : { tone: 'error', title: 'Reclamo no confirmado', text: `El reclamo del cartón #${c.serial} no pudo validarse.` },
};

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket('/user', { enabled: isAuthenticated });
  const [toasts, setToasts] = useState([]);
  const [revision, setRevision] = useState(0); // sube con cada aviso del servidor -> las páginas recargan
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (toast) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.duration ?? TOAST_MS);
    },
    [dismiss]
  );

  useEffect(() => {
    if (!socket) return undefined;
    const handlers = Object.entries(fromServer).map(([event, toToast]) => {
      const handler = (payload) => {
        notify(toToast(payload));
        setRevision((r) => r + 1);
      };
      socket.on(event, handler);
      return [event, handler];
    });
    return () => handlers.forEach(([event, handler]) => socket.off(event, handler));
  }, [socket, notify]);

  const value = useMemo(() => ({ notify, revision }), [notify, revision]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-60 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end print:hidden">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone] ?? Info;
          return (
            <div
              key={t.id}
              role="status"
              className={`surface pointer-events-auto flex w-full max-w-md items-start gap-3 border-l-8 p-4 ${TONES[t.tone] ?? TONES.info}`}
            >
              <Icon className="tone mt-0.5 h-7 w-7 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black text-fg">{t.title}</p>
                {t.text && <p className="text-fg-muted">{t.text}</p>}
                {t.link && (
                  <Link to={t.link.to} onClick={() => dismiss(t.id)} className="mt-1 inline-block font-extrabold text-sol-blue underline dark:text-sol-gold">
                    {t.link.label}
                  </Link>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>');
  return ctx;
};
