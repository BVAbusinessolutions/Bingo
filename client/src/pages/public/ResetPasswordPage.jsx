import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import AuthShell from '../../components/layout/AuthShell';
import { PATHS } from '../../routing/paths';
import { resetPasswordSchema, validate } from '../../lib/validation';
import { errorMessage } from '../../lib/format';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const { data, errors } = validate(resetPasswordSchema, form);
    setErrors(errors);
    if (!data) return;
    setLoading(true);
    setServerError('');
    try {
      await authApi.resetPassword(token, data.password);
      navigate(PATHS.login, { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const bind = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  const requestNew = (
    <Link to={PATHS.forgotPassword} className="font-extrabold text-sol-gold underline">
      Solicitar un enlace nuevo
    </Link>
  );

  if (!token) {
    return (
      <AuthShell title="Enlace incompleto" footer={requestNew}>
        <Alert tone="error">Abre el enlace completo que te enviamos por correo.</Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nueva contraseña" subtitle="Elige una contraseña que no uses en otros sitios." footer={requestNew}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Contraseña nueva" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres, con letras y números." {...bind('password')} />
        <Field label="Repite la contraseña" type="password" autoComplete="new-password" {...bind('confirmPassword')} />
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Guardar contraseña
        </Button>
      </form>
    </AuthShell>
  );
}
