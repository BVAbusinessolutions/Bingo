import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import Field from '../../components/Field';
import { registerSchema, validate } from '../../lib/validation';
import { errorMessage } from '../../lib/format';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      navigate(location.state?.from?.pathname ?? '/cartones', { replace: true });
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
    <main className="grid min-h-[calc(100vh-64px)] place-items-center bg-linear-to-b from-sol-blue to-sol-blue-light p-4 dark:from-page dark:to-sol-blue/40">
      <form onSubmit={onSubmit} noValidate className="surface w-full max-w-sm space-y-4 border-t-8 border-sol-gold p-6">
        <h1 className="text-center text-2xl font-black text-brand">Crear cuenta</h1>
        <Field label="Nombre completo" autoComplete="name" {...bind('name')} />
        <Field label="Correo electrónico" type="email" autoComplete="email" {...bind('email')} />
        <Field label="Contraseña" type="password" autoComplete="new-password" {...bind('password')} />
        <p className="-mt-2 text-xs text-fg-muted">Mínimo 8 caracteres, con letras y números.</p>
        {serverError && <p className="text-sm text-sol-red">{serverError}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sol-blue py-3 font-bold text-white hover:bg-sol-blue-light dark:bg-sol-gold dark:text-sol-blue disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Registrarme
        </button>
        <p className="text-center text-sm text-fg-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-sol-red hover:underline dark:text-sol-gold">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
