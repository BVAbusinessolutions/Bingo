import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import AuthShell from '../../components/layout/AuthShell';
import { PATHS } from '../../routing/paths';
import { forgotPasswordSchema, validate } from '../../lib/validation';
import { errorMessage } from '../../lib/format';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    const { data, errors } = validate(forgotPasswordSchema, { email });
    setError(errors.email ?? '');
    if (!data) return;
    setLoading(true);
    setServerError('');
    try {
      await authApi.forgotPassword(data.email);
      setSentTo(data.email);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (
    <Link to={PATHS.login} className="font-extrabold text-sol-gold underline">
      Volver a iniciar sesión
    </Link>
  );

  if (sentTo) {
    return (
      <AuthShell title="Revisa tu correo" footer={backToLogin}>
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-16 w-16 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <p className="text-lg text-fg">
            Si <b>{sentTo}</b> tiene una cuenta, te enviamos un enlace para crear una contraseña nueva.
          </p>
          <p className="text-fg-muted">El enlace vence en 30 minutos. Revisa también la carpeta de correo no deseado.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribe tu correo y te enviaremos un enlace para cambiarla."
      footer={backToLogin}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          error={error}
          onChange={(e) => setEmail(e.target.value)}
        />
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Enviar enlace
        </Button>
      </form>
    </AuthShell>
  );
}
