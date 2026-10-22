import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import AuthShell from '../../components/layout/AuthShell';
import { PATHS } from '../../routing/paths';
import { errorMessage } from '../../lib/format';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { isAuthenticated, updateUser } = useAuth();
  const [state, setState] = useState(token ? 'loading' : 'error'); // loading | ok | error
  const [error, setError] = useState(token ? '' : 'El enlace está incompleto.');
  const sent = useRef(false); // el token es de un solo uso: evita el doble envío de StrictMode

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    authApi
      .verifyEmail(token)
      .then((user) => {
        updateUser({ emailVerified: user.emailVerified });
        setState('ok');
      })
      .catch((err) => {
        setError(errorMessage(err));
        setState('error');
      });
  }, [token, updateUser]);

  if (state === 'loading') {
    return (
      <AuthShell title="Confirmando tu correo…">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-sol-blue dark:text-sol-gold" aria-label="Cargando" />
      </AuthShell>
    );
  }

  if (state === 'ok') {
    return (
      <AuthShell title="¡Correo confirmado!">
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <p className="text-lg text-fg">Ya puedes comprar tus cartones.</p>
          <Button to={isAuthenticated ? PATHS.catalog : PATHS.login} variant="gold" size="lg" className="w-full">
            {isAuthenticated ? 'Elegir mis cartones' : 'Iniciar sesión'}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="No pudimos confirmar tu correo">
      <div className="space-y-5 text-center">
        <XCircle className="mx-auto h-16 w-16 text-sol-red" aria-hidden />
        <p className="text-lg text-fg">{error}</p>
        <p className="text-fg-muted">
          {isAuthenticated ? 'Usa el botón “Reenviar enlace” del aviso amarillo de arriba.' : 'Inicia sesión y pide un enlace nuevo desde el aviso amarillo.'}
        </p>
        {!isAuthenticated && (
          <Button to={PATHS.login} size="lg" className="w-full">
            Iniciar sesión
          </Button>
        )}
      </div>
    </AuthShell>
  );
}
