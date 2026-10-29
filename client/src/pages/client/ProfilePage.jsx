import { useState } from 'react';
import { BadgeCheck, KeyRound, LogOut, MailWarning, Palette, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { authApi } from '../../api/endpoints';
import PageHeader from '../../components/ui/PageHeader';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ThemeToggle from '../../components/ui/ThemeToggle';
import TextSizeControl from '../../components/ui/TextSizeControl';
import { changePasswordSchema, profileSchema, validate } from '../../lib/validation';
import { errorMessage } from '../../lib/format';

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sol-blue/10 text-sol-blue dark:bg-sol-gold/15 dark:text-sol-gold">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-black text-fg">{title}</h2>
          {description && <p className="text-fg-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Formulario con estado { values, errors, serverError, loading } y envío validado con zod. */
function useForm(initial, schema, submit) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const { data, errors } = validate(schema, values);
    setErrors(errors);
    if (!data) return;
    setLoading(true);
    setServerError('');
    try {
      await submit(data, setValues);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const bind = (name) => ({
    value: values[name],
    error: errors[name],
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });

  return { onSubmit, bind, serverError, loading };
}

function PersonalDataForm() {
  const { user, updateUser } = useAuth();
  const { notify } = useNotifications();
  const form = useForm({ name: user.name, phone: user.phone ?? '' }, profileSchema, async (data) => {
    updateUser(await authApi.updateProfile(data));
    notify({ tone: 'success', title: 'Datos guardados', duration: 4000 });
  });

  return (
    <form onSubmit={form.onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre completo" autoComplete="name" {...form.bind('name')} />
      <Field
        label="Teléfono (opcional)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        hint="Para avisarte si ganas."
        {...form.bind('phone')}
      />
      <div className="sm:col-span-2">
        <p className="font-bold text-fg">Correo electrónico</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl bg-muted px-4 py-3 text-fg">
          <span className="break-all">{user.email}</span>
          {user.emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
              <BadgeCheck className="h-4 w-4" aria-hidden /> Confirmado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
              <MailWarning className="h-4 w-4" aria-hidden /> Sin confirmar
            </span>
          )}
        </p>
      </div>
      {form.serverError && (
        <Alert tone="error" className="sm:col-span-2">
          {form.serverError}
        </Alert>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" loading={form.loading}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const { notify } = useNotifications();
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const form = useForm(empty, changePasswordSchema, async ({ currentPassword, newPassword }, setValues) => {
    await changePassword({ currentPassword, newPassword });
    setValues(empty);
    notify({ tone: 'success', title: 'Contraseña actualizada', text: 'Cerramos tu sesión en los demás dispositivos.', duration: 6000 });
  });

  return (
    <form onSubmit={form.onSubmit} noValidate className="grid gap-4 sm:grid-cols-3">
      <Field label="Contraseña actual" type="password" autoComplete="current-password" {...form.bind('currentPassword')} />
      <Field
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        hint="8+ caracteres, letras y números."
        {...form.bind('newPassword')}
      />
      <Field label="Repite la nueva" type="password" autoComplete="new-password" {...form.bind('confirmPassword')} />
      {form.serverError && (
        <Alert tone="error" className="sm:col-span-3">
          {form.serverError}
        </Alert>
      )}
      <div className="sm:col-span-3">
        <Button type="submit" loading={form.loading}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { logoutAll } = useAuth();
  const [closing, setClosing] = useState(false);

  const closeAll = async () => {
    setClosing(true);
    await logoutAll();
  };

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Tu cuenta" title="Mi perfil" description="Actualiza tus datos, tu contraseña y cómo ves el sitio." />

        <Section icon={UserRound} title="Datos personales">
          <PersonalDataForm />
        </Section>

        <Section icon={KeyRound} title="Contraseña" description="Al cambiarla se cierran tus sesiones en otros dispositivos.">
          <ChangePasswordForm />
        </Section>

        <Section icon={Palette} title="Preferencias de lectura" description="Se guardan en este dispositivo.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-sol-blue p-4 text-white dark:bg-navy-950">
              <span className="font-bold">Tamaño de letra</span>
              <TextSizeControl />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-sol-blue p-4 text-white dark:bg-navy-950">
              <span className="font-bold">Modo día / noche</span>
              <ThemeToggle />
            </div>
          </div>
        </Section>

        <Section icon={LogOut} title="Sesiones" description="¿Usaste tu cuenta en un equipo prestado o perdiste tu teléfono?">
          <Button variant="danger" icon={LogOut} loading={closing} onClick={closeAll}>
            Cerrar sesión en todos los dispositivos
          </Button>
        </Section>
      </div>
    </main>
  );
}
