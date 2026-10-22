import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEMO_ACCOUNTS, ROLES } from '../../constants/roles';
import { homeFor, safeRedirect } from '../../routing/private-routes';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import AuthShell from '../../components/layout/AuthShell';
import { PATHS } from '../../routing/paths';
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
                <span className="break-all text-sm text-fg-muted">{acc.email}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-center text-sm text-fg-muted">Solo para pruebas. No disponible en producción.</p>
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
      const fallback = homeFor(user.role);
      navigate(safeRedirect(location.state?.from, fallback), { replace: true });
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
    <AuthShell
      title="Iniciar sesión"
      subtitle="Entra para comprar cartones y jugar en vivo."
      footer={
        <p>
          ¿No tienes cuenta?{' '}
          <Link to={PATHS.register} state={location.state} className="font-extrabold text-sol-gold underline">
            Crea una gratis
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {location.state?.expired && <Alert tone="warning">Tu sesión expiró. Vuelve a entrar.</Alert>}
        {location.state?.passwordReset && <Alert tone="success">Tu contraseña se cambió. Ya puedes entrar.</Alert>}
        {location.state?.from && !location.state?.expired && <Alert>Inicia sesión para continuar.</Alert>}

        {SHOW_DEMO && <DemoCredentials onPick={pickDemo} />}

        <Field label="Correo electrónico" type="email" autoComplete="email" inputMode="email" {...bind('email')} />
        <Field label="Contraseña" type="password" autoComplete="current-password" {...bind('password')} />
        <div className="text-right">
          <Link to={PATHS.forgotPassword} className="inline-flex min-h-10 items-center font-bold text-sol-blue underline dark:text-sol-gold">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <Button ref={submitRef} type="submit" size="lg" loading={loading} className="w-full">
          Entrar
        </Button>
      </form>
    </AuthShell>
  );
}
