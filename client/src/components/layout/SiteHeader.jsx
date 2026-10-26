import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Receipt, Shield, Sun, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { PATHS } from '../../routing/paths';
import ThemeToggle from '../ui/ThemeToggle';
import TextSizeControl from '../ui/TextSizeControl';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const navLinkClass = ({ isActive }) =>
  `rounded-xl px-3 py-2 font-bold transition ${isActive ? 'bg-white/15 text-sol-gold' : 'text-white/90 hover:bg-white/10 hover:text-white'}`;

function useMainLinks(isAuthenticated) {
  return [
    { to: PATHS.catalog, label: 'Comprar cartones' },
    { to: PATHS.results, label: 'Resultados' },
    ...(isAuthenticated ? [{ to: PATHS.live, label: 'Jugar en vivo' }] : []),
  ];
}

function UserMenu({ user, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemCls = 'flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold text-fg hover:bg-muted';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 font-bold hover:bg-white/20"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-sol-gold font-black text-sol-blue">{initials(user?.name)}</span>
        <span className="hidden max-w-32 truncate lg:inline">{user?.name?.split(' ')[0]}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="surface absolute right-0 mt-2 w-64 p-2" onClick={() => setOpen(false)}>
          <p className="truncate px-3 pb-2 pt-1 text-sm text-fg-muted">{user?.email}</p>
          <Link role="menuitem" to={PATHS.profile} className={itemCls}>
            <UserRound className="h-5 w-5 text-brand" aria-hidden /> Mi perfil
          </Link>
          <Link role="menuitem" to={PATHS.myPurchases} className={itemCls}>
            <Receipt className="h-5 w-5 text-brand" aria-hidden /> Mis compras
          </Link>
          {isAdmin && (
            <Link role="menuitem" to={PATHS.admin} className={itemCls}>
              <Shield className="h-5 w-5 text-brand" aria-hidden /> Administración
            </Link>
          )}
          <hr className="my-1 border-line" />
          <button role="menuitem" type="button" onClick={onLogout} className={`${itemCls} w-full text-sol-red dark:text-red-300`}>
            <LogOut className="h-5 w-5" aria-hidden /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader() {
  const { isAuthenticated, role, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const links = useMainLinks(isAuthenticated);
  const isAdmin = role === ROLES.ADMIN;

  useEffect(() => setOpen(false), [pathname]);

  const mobileLinks = [
    ...links,
    ...(isAuthenticated
      ? [
          { to: PATHS.myPurchases, label: 'Mis compras' },
          { to: PATHS.profile, label: 'Mi perfil' },
          ...(isAdmin ? [{ to: PATHS.admin, label: 'Administración' }] : []),
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b-4 border-sol-gold bg-sol-blue text-white shadow-md dark:bg-[#0a1628] print:hidden">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link to={PATHS.home} className="flex items-center gap-2.5 font-black leading-tight" aria-label="Hogar Sol, inicio">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-sol-gold/15 ring-2 ring-sol-gold/60">
            <Sun className="h-7 w-7 text-sol-gold" aria-hidden />
          </span>
          <span className="text-lg">
            Hogar Sol
            <span className="block text-xs font-bold uppercase tracking-widest text-sol-gold">Bingo Benéfico</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLinkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <TextSizeControl />
          <ThemeToggle />
          {isAuthenticated ? (
            <UserMenu user={user} isAdmin={isAdmin} onLogout={logout} />
          ) : (
            <>
              <Link to={PATHS.login} className="rounded-xl px-3 py-2 font-bold hover:bg-white/10">
                Entrar
              </Link>
              <Link
                to={PATHS.register}
                className="rounded-xl bg-sol-gold px-4 py-2.5 font-black text-sol-blue shadow hover:bg-sol-gold-dark"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        <button
          className="grid h-12 w-12 place-items-center rounded-xl hover:bg-white/10 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-white/15 bg-sol-blue pb-5 dark:bg-[#0a1628] lg:hidden">
          <div className="container-page space-y-4 pt-4">
            {isAuthenticated && (
              <p className="flex items-center gap-3 font-bold">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-sol-gold font-black text-sol-blue">
                  {initials(user?.name)}
                </span>
                Hola, {user?.name?.split(' ')[0]}
              </p>
            )}
            <nav aria-label="Principal móvil" className="grid gap-1">
              {mobileLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) => `${navLinkClass({ isActive })} flex min-h-12 items-center text-lg`}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 p-3">
              <span className="font-bold">Tamaño de letra</span>
              <TextSizeControl />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-3">
              <span className="font-bold">Modo día / noche</span>
              <ThemeToggle />
            </div>
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-white/40 font-bold"
              >
                <LogOut className="h-5 w-5" aria-hidden /> Cerrar sesión
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to={PATHS.login} className="flex min-h-12 items-center justify-center rounded-xl border-2 border-white/60 font-bold">
                  Entrar
                </Link>
                <Link
                  to={PATHS.register}
                  className="flex min-h-12 items-center justify-center rounded-xl bg-sol-gold font-black text-sol-blue"
                >
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
