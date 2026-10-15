import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, ShieldCheck, User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { DEMO_ACCOUNTS, ROLES } from './roles';
import Field from '../../components/Field';
import { loginSchema, validate } from '../../lib/validation';
import { errorMessage } from '../../lib/format';

// El ayudante demo solo existe en desarrollo, o si se activa explícitamente para una demo pública.
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_LOGIN === 'true';

function DemoCredentials({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border-2 border-dashed border-sol-gold/70 bg-sol-gold/10 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="demo-accounts"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-sol-gold px-3 py-2.5 font-bold text-sol-blue hover:bg-sol-gold-dark"
      >
        <KeyRound className="h-4 w-4" aria-hidden /> Cargar Credenciales Demo
      </button>
      {open && (
        <div id="demo-accounts" className="mt-2 grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => {
            const Icon = acc.role === ROLES.ADMIN ? ShieldCheck : User;
            return (
              <button
                key={acc.role}
                type="button"
                onClick={() => onPick(acc)}
                aria-label={`Autocompletar credenciales de ${acc.label}`}
                className="surface flex flex-col items-center gap-0.5 p-2.5 text-center text-sm hover:ring-2 hover:ring-sol-gold"
              >
                <Icon className="h-5 w-5 text-brand" aria-hidden />
                <span className="font-bold text-fg">{acc.label}</span>
                <span className="break-all text-[11px] text-fg-muted">{acc.email}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-center text-[11px] text-fg-muted">Solo para pruebas. No disponible en producción.</p>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    const { data, errors } = validate(loginSchema, form);
    setErrors(errors);
    if (!data) return;
    setLoading(true);
    setServerError('');
    try {
      const user = await login(data);
      const fallback = user.role === ROLES.ADMIN ? '/admin' : '/live';
      navigate(location.state?.from?.pathname ?? fallback, { replace: true });
    } catch (err) {
      setServerError(errorMessage(err, 'Correo o contraseña incorrectos.'));
    } finally {
      setLoading(false);
    }
  };

  const pickDemo = ({ email, password }) => {
    setForm({ email, password });
    setErrors({});
    setServerError('');
    submitRef.current?.focus(); // el usuario solo tiene que pulsar "Entrar" (o Enter)
  };

  const bind = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  return (
    <main className="grid min-h-[calc(100vh-64px)] place-items-center bg-linear-to-b from-sol-blue to-sol-blue-light p-4 dark:from-page dark:to-sol-blue/40">
      <form onSubmit={onSubmit} noValidate className="surface w-full max-w-sm space-y-4 border-t-8 border-sol-gold p-6">
        <h1 className="text-center text-2xl font-black text-brand">Iniciar sesión</h1>
        {location.state?.expired && (
          <p role="status" className="rounded-lg bg-sol-gold/15 p-2 text-sm text-fg">Tu sesión expiró. Vuelve a entrar.</p>
        )}
        {location.state?.from && !location.state?.expired && (
          <p role="status" className="rounded-lg bg-muted p-2 text-sm text-fg-muted">Inicia sesión para continuar.</p>
        )}

        {SHOW_DEMO && <DemoCredentials onPick={pickDemo} />}

        <Field label="Correo electrónico" type="email" autoComplete="email" {...bind('email')} />
        <Field label="Contraseña" type="password" autoComplete="current-password" {...bind('password')} />
        {serverError && <p role="alert" className="text-sm text-sol-red">{serverError}</p>}
        <button
          ref={submitRef}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sol-blue py-3 font-bold text-white hover:bg-sol-blue-light disabled:opacity-60 dark:bg-sol-gold dark:text-sol-blue dark:hover:bg-sol-gold-dark"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
        </button>
        <p className="text-center text-sm text-fg-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" state={location.state} className="font-semibold text-sol-red hover:underline dark:text-sol-gold">
            Regístrate
          </Link>
        </p>
      </form>
    </main>
  );
}
