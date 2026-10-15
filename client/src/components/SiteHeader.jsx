import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, Sun, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { ROLES } from '../features/auth/roles';
import ThemeToggle from '../features/theme/ThemeToggle';

export default function SiteHeader() {
  const { isAuthenticated, role, user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/cartones', label: 'Comprar cartones' },
    ...(isAuthenticated
      ? [
          { to: '/live', label: 'En vivo' },
          { to: '/mis-compras', label: 'Mis compras' },
        ]
      : []),
    ...(role === ROLES.ADMIN ? [{ to: '/admin', label: 'Administración' }] : []),
  ];

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-white/15 text-sol-gold' : 'hover:bg-white/10'}`;

  return (
    <header className="sticky top-0 z-40 border-b-4 border-sol-gold bg-sol-blue text-white shadow dark:bg-[#0a1628]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2 font-black leading-tight">
          <Sun className="h-7 w-7 shrink-0 text-sol-gold" aria-hidden />
          <span>
            Hogar Sol
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/70">Bingo Benéfico</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          <ThemeToggle className="mx-2" />
          {isAuthenticated ? (
            <button onClick={logout} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-white/10">
              <LogOut className="h-4 w-4" aria-hidden /> Salir
            </button>
          ) : (
            <NavLink to="/login" className="rounded-full bg-sol-gold px-4 py-2 text-sm font-bold text-sol-blue hover:bg-sol-gold-dark">
              Entrar
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            className="rounded-lg p-2"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Principal" className="flex flex-col gap-1 border-t border-white/20 px-4 pb-3 pt-2 md:hidden" onClick={() => setOpen(false)}>
          {isAuthenticated && <p className="px-3 py-1 text-xs text-white/70">Hola, {user?.name}</p>}
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">
              Cerrar sesión
            </button>
          ) : (
            <NavLink to="/login" className={linkClass}>
              Entrar
            </NavLink>
          )}
        </nav>
      )}
    </header>
  );
}
