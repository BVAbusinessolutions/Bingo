import { useCallback, useEffect, useState } from 'react';
import { Ban, BadgeCheck, Lock, Search, ShieldCheck, Timer, UserPlus } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Field from '../../components/ui/Field';
import PageLoader from '../../components/ui/PageLoader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { errorMessage, formatDate } from '../../lib/format';
import SanctionDialog from '../../components/admin/SanctionDialog';

function CreateUserForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.createUser(form);
      setForm({ name: '', email: '', password: '', role: 'ADMIN' });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, 'Revisa los datos: contraseña de 8+ caracteres con letras y números.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="surface grid gap-4 border-t-8 border-sol-gold p-5 sm:grid-cols-2">
      <h2 className="flex items-center gap-2 text-xl font-black text-fg sm:col-span-2">
        <UserPlus className="h-6 w-6 text-brand" aria-hidden /> Crear cuenta
      </h2>
      <Field label="Nombre completo" value={form.name} onChange={set('name')} autoComplete="off" />
      <Field label="Correo" type="email" value={form.email} onChange={set('email')} autoComplete="off" />
      <Field
        label="Contraseña inicial"
        type="password"
        value={form.password}
        onChange={set('password')}
        autoComplete="new-password"
        hint="Pídele que la cambie en «Mi perfil» al entrar."
      />
      <label className="block">
        <span className="font-bold text-fg">Rol</span>
        <select
          value={form.role}
          onChange={set('role')}
          className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-fg"
        >
          <option value="ADMIN">Administrador</option>
          <option value="CLIENTE">Cliente</option>
        </select>
      </label>
      {error && (
        <Alert tone="error" className="sm:col-span-2">
          {error}
        </Alert>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" loading={busy}>
          Crear cuenta
        </Button>
      </div>
    </form>
  );
}

const STATUS_FILTERS = [
  ['', 'Todos los estados'],
  ['ACTIVE', 'Activas'],
  ['SUSPENDED', 'Suspendidas'],
  ['BANNED', 'Baneadas'],
  ['DISABLED', 'Desactivadas'],
];

const isSanctioned = (u) => u.status === 'SUSPENDED' || u.status === 'BANNED';

function UserRow({ u, isSelf, onAction, onSanction }) {
  return (
    <li className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-lg font-black text-fg">
          {u.name}
          {u.role === 'ADMIN' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sol-blue px-2 py-0.5 text-sm text-white dark:bg-sol-gold dark:text-sol-blue">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Admin
            </span>
          )}
          {u.status === 'DISABLED' && <span className="rounded-full bg-sol-red px-2 py-0.5 text-sm text-white">Desactivada</span>}
          {u.status === 'SUSPENDED' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-sm text-white">
              <Timer className="h-4 w-4" aria-hidden /> Suspendida
            </span>
          )}
          {u.status === 'BANNED' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-sm text-white">
              <Ban className="h-4 w-4" aria-hidden /> Baneada
            </span>
          )}
          {u.lockedUntil && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-sm text-white">
              <Lock className="h-4 w-4" aria-hidden /> Bloqueada
            </span>
          )}
        </p>
        <p className="flex flex-wrap items-center gap-1 break-all text-fg-muted">
          {u.email} {u.emailVerified && <BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="Correo confirmado" />}
          {u.phone && ` · ${u.phone}`}
        </p>
        <p className="text-sm text-fg-muted">
          Desde {formatDate(u.createdAt)} · {u.purchases} compra(s) aprobada(s)
        </p>
        {isSanctioned(u) && (
          <p className="mt-1 rounded-lg bg-sol-red/10 px-2 py-1 text-sm text-fg">
            <b>Motivo:</b> {u.sanctionReason}
            {u.suspendedUntil && <> · hasta el {formatDate(u.suspendedUntil)}</>}
          </p>
        )}
      </div>
      {!isSelf && (
        <div className="flex flex-wrap gap-2">
          {u.lockedUntil && (
            <Button size="sm" variant="outline" onClick={() => onAction(u, { unlock: true }, 'Desbloquear la cuenta')}>
              Desbloquear
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAction(
                u,
                { role: u.role === 'ADMIN' ? 'CLIENTE' : 'ADMIN' },
                u.role === 'ADMIN' ? 'Quitar rol de administrador' : 'Hacer administrador'
              )
            }
          >
            {u.role === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'}
          </Button>
          {isSanctioned(u) ? (
            <Button size="sm" variant="success" onClick={() => onSanction(u, 'LIFT')}>
              Levantar sanción
            </Button>
          ) : (
            u.status === 'ACTIVE' &&
            u.role !== 'ADMIN' && (
              <>
                <Button size="sm" variant="outline" icon={Timer} onClick={() => onSanction(u, 'SUSPEND')}>
                  Suspender
                </Button>
                <Button size="sm" variant="danger" icon={Ban} onClick={() => onSanction(u, 'BAN')}>
                  Banear
                </Button>
              </>
            )
          )}
          <Button
            size="sm"
            variant={u.status === 'ACTIVE' ? 'outline' : 'success'}
            onClick={() =>
              onAction(
                u,
                { status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
                u.status === 'ACTIVE' ? 'Desactivar la cuenta' : 'Reactivar la cuenta'
              )
            }
          >
            {u.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
          </Button>
        </div>
      )}
    </li>
  );
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(null); // { u, body, label }
  const [sanction, setSanction] = useState(null); // { u, type }
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi
      .users({ q: q || undefined, role: role || undefined, status: status || undefined, page })
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, [q, role, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 250); // espera a que termine de escribir
    return () => clearTimeout(t);
  }, [load]);

  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.updateUser(pending.u.id, pending.body);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-black text-brand">Usuarios</h1>
        <p className="text-lg text-fg-muted">
          Busca cuentas (también por cédula), crea administradores y suspende o banea cuentas sospechosas de fraude.
        </p>
      </header>

      <CreateUserForm onCreated={load} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar usuario</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Nombre, correo, teléfono o cédula"
            className="min-h-12 w-full rounded-xl border-2 border-line bg-card pl-10 pr-3 text-fg"
          />
        </label>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="min-h-12 rounded-xl border-2 border-line bg-card px-3 font-bold text-fg"
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          <option value="ADMIN">Administradores</option>
          <option value="CLIENTE">Clientes</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="min-h-12 rounded-xl border-2 border-line bg-card px-3 font-bold text-fg"
          aria-label="Filtrar por estado"
        >
          {STATUS_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!data ? (
        <PageLoader />
      ) : (
        <>
          <p className="text-fg-muted">{data.total} cuenta(s)</p>
          <ul className="grid gap-3">
            {data.users.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                isSelf={u.id === user?.id}
                onAction={(target, body, label) => setPending({ u: target, body, label })}
                onSanction={(target, type) => setSanction({ u: target, type })}
              />
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="font-bold text-fg">
                {page} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}

      {sanction && (
        <SanctionDialog
          user={sanction.u}
          type={sanction.type}
          onCancel={() => setSanction(null)}
          onDone={() => {
            setSanction(null);
            load();
          }}
        />
      )}

      {pending && (
        <ConfirmDialog
          title={`¿${pending.label}?`}
          confirmLabel="Sí, aplicar"
          confirmVariant={pending.body.status === 'DISABLED' ? 'danger' : 'primary'}
          loading={busy}
          onConfirm={apply}
          onCancel={() => setPending(null)}
        >
          {pending.u.name} ({pending.u.email}).{' '}
          {pending.body.status === 'DISABLED' || pending.body.role ? 'Se cerrarán sus sesiones abiertas de inmediato.' : ''}
        </ConfirmDialog>
      )}
    </section>
  );
}
