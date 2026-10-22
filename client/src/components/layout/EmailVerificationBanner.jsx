import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/endpoints';
import { errorMessage } from '../../lib/format';

/** Aviso persistente mientras el correo no esté confirmado (sin confirmar no se puede comprar). */
export default function EmailVerificationBanner() {
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  if (!isAuthenticated || user?.emailVerified !== false) return null;

  const resend = async () => {
    setState('sending');
    try {
      await authApi.resendVerification();
      setState('sent');
    } catch (err) {
      setError(errorMessage(err));
      setState('error');
    }
  };

  return (
    <div role="status" className="border-b-2 border-sol-gold/60 bg-sol-gold/20 print:hidden">
      <div className="container-page flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 font-semibold text-fg">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-sol-gold" aria-hidden />
          <span>
            Confirma tu correo <b>{user.email}</b> para poder comprar cartones.
            {state === 'sent' && ' Te enviamos un enlace nuevo.'}
            {state === 'error' && ` ${error}`}
          </span>
        </p>
        <button
          type="button"
          onClick={resend}
          disabled={state === 'sending' || state === 'sent'}
          className="min-h-11 shrink-0 rounded-xl bg-sol-blue px-4 font-extrabold text-white hover:bg-sol-blue-light disabled:opacity-60 dark:bg-sol-gold dark:text-sol-blue"
        >
          {state === 'sending' ? 'Enviando…' : state === 'sent' ? 'Enlace enviado' : 'Reenviar enlace'}
        </button>
      </div>
    </div>
  );
}
