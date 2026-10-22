import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import AuthShell from '../../components/layout/AuthShell';
import { PATHS } from '../../routing/paths';
import { safeRedirect } from '../../routing/private-routes';
import { registerSchema, validate } from '../../lib/validation';
import { errorMessage } from '../../lib/format';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', acceptTerms: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const { data, errors } = validate(registerSchema, form);
    setErrors(errors);
    if (!data) return;
    setLoading(true);
    setServerError('');
    try {
      await register(data);
      navigate(safeRedirect(location.state?.from, PATHS.catalog), { replace: true });
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

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Regístrate gratis en menos de un minuto."
      footer={
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to={PATHS.login} state={location.state} className="font-extrabold text-sol-gold underline">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Nombre completo" autoComplete="name" {...bind('name')} />
        <Field label="Correo electrónico" type="email" inputMode="email" autoComplete="email" hint="Te enviaremos un enlace para confirmarlo." {...bind('email')} />
        <Field label="Contraseña" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres, con letras y números." {...bind('password')} />

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-line p-3 hover:border-sol-blue dark:hover:border-sol-gold">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
              aria-invalid={Boolean(errors.acceptTerms)}
              aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
              className="mt-1 h-6 w-6 shrink-0 accent-sol-blue dark:accent-sol-gold"
            />
            <span className="text-fg">
              Acepto los{' '}
              <Link to={PATHS.terms} target="_blank" className="font-bold text-sol-blue underline dark:text-sol-gold">
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link to={PATHS.privacy} target="_blank" className="font-bold text-sol-blue underline dark:text-sol-gold">
                política de privacidad
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <p id="terms-error" className="mt-1 text-sm font-semibold text-sol-red dark:text-red-300">
              {errors.acceptTerms}
            </p>
          )}
        </div>

        {serverError && <Alert tone="error">{serverError}</Alert>}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Crear mi cuenta
        </Button>
      </form>
    </AuthShell>
  );
}
