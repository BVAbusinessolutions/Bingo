import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Receipt, Shield, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { PATHS } from '../../routing/paths';
import { BrandBadge } from '../brand/BrandLogo';
import AccessibilityButton from '../accessibility/AccessibilityButton';
import ThemeToggle from '../ui/ThemeToggle';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useExclusiveOverlay } from '../../lib/overlays';
import { useCanPlayLive } from '../../hooks/useCanPlayLive';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const navLinkClass = ({ isActive }) =>
  `relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[0.95rem] font-semibold transition-colors 2xl:px-3 2xl:text-base after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent after:transition-transform after:duration-300 ${
    isActive ? 'text-accent after:scale-x-100' : 'text-white/85 after:scale-x-0 hover:text-white hover:after:scale-x-100'
  }`;

// Navegación principal (misma en escritorio y móvil).
const MAIN_LINKS = [
  { to: PATHS.home, label: 'Inicio', end: true },
  { to: PATHS.catalog, label: 'Comprar cartones' },
  { to: PATHS.results, label: 'Resultados' },
  { to: PATHS.prizes, label: 'Premios' },
  { to: PATHS.rules, label: 'Reglamento' },
  { to: PATHS.contact, label: 'Contacto' },
];

function UserMenu({ user, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useExclusiveOverlay('user-menu', open, close);

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

  const itemCls = 'flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold text-fg hover:bg-muted';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 items-center gap-2 rounded-full bg-white/10 pl-1 pr-3 font-semibold ring-1 ring-white/15 transition hover:bg-white/20"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-black text-navy-950">{initials(user?.name)}</span>
        <span className="hidden max-w-32 truncate 2xl:inline">{user?.name?.split(' ')[0]}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="surface absolute right-0 mt-2 w-64 animate-modal-in p-2" onClick={() => setOpen(false)}>
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
  // Cerrar sesión pide confirmación: un toque accidental en el menú ya no saca a la persona de su cuenta.
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const askLogout = useCallback(() => setConfirmLogout(true), []);
  const cancelLogout = useCallback(() => setConfirmLogout(false), []);
  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  };
  const { pathname } = useLocation();
  const isAdmin = role === ROLES.ADMIN;
  const canPlayLive = useCanPlayLive();
  const links = canPlayLive ? [...MAIN_LINKS, { to: PATHS.live, label: 'Jugar en vivo' }] : MAIN_LINKS;

  const closeMenu = useCallback(() => setOpen(false), []);
  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);
  // Un solo menú abierto a la vez: abrir este cierra el panel de ajustes visuales y el de usuario.
  useExclusiveOverlay('mobile-menu', open, closeMenu);

  // Escape cierra el menú móvil; al pasar a pantalla ancha (barra completa) también se cierra.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeMenu();
    const wide = window.matchMedia('(min-width: 80rem)');
    const onWide = (e) => e.matches && closeMenu();
    document.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [open, closeMenu]);

  const accountLinks = isAuthenticated
    ? [
        { to: PATHS.myPurchases, label: 'Mis compras' },
        { to: PATHS.profile, label: 'Mi perfil' },
        ...(isAdmin ? [{ to: PATHS.admin, label: 'Administración' }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/90 text-white shadow-[0_8px_30px_rgb(2_6_23/0.25)] backdrop-blur-xl print:hidden">
      {/* Filo dorado sutil, en lugar del borde grueso anterior */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent/70 to-transparent" aria-hidden />
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-3">
        <Link to={PATHS.home} className="group flex min-w-0 items-center gap-2 leading-tight sm:gap-3" aria-label="Hogar Sol, inicio">
          {/* max-h-10 + object-contain: el logo cabe completo en la placa sin recortarse ni desbordar la barra. */}
          <BrandBadge
            className="h-11 w-11 overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-105"
            logoClassName="h-full max-h-10 w-auto object-contain"
          />
          <span className="min-w-0 font-display text-base font-bold sm:text-lg">
            Hogar Sol
            <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-accent sm:text-[0.7rem] sm:tracking-[0.2em]">
              Bingo Benéfico
            </span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-0.5 xl:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <AccessibilityButton />
          <div className="hidden items-center gap-2 xl:flex">
            {isAuthenticated ? (
              <UserMenu user={user} isAdmin={isAdmin} onLogout={askLogout} />
            ) : (
              <>
                <Link
                  to={PATHS.login}
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-full px-4 font-semibold text-white/90 ring-1 ring-white/15 transition hover:bg-white/10 hover:text-white hover:ring-accent/60 active:scale-95"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to={PATHS.register}
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-full bg-accent px-4 font-bold text-navy-950 shadow-[0_6px_20px_rgb(251_191_36/0.35)] transition hover:bg-accent-strong active:scale-95"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-white/15 transition hover:bg-white/10 active:scale-95 xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="h-7 w-7" aria-hidden /> : <Menu className="h-7 w-7" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        // Cualquier enlace cierra el menú, también el de la página actual.
        <div
          id="mobile-menu"
          className="max-h-[calc(100dvh-4.5rem)] animate-fade-in overflow-y-auto border-t border-white/10 pb-5 xl:hidden"
          onClick={(e) => e.target.closest('a') && setOpen(false)}
        >
          <div className="container-page space-y-4 pt-4">
            {isAuthenticated && (
              <p className="flex items-center gap-3 font-semibold">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-black text-navy-950">{initials(user?.name)}</span>
                Hola, {user?.name?.split(' ')[0]}
              </p>
            )}
            <nav aria-label="Principal móvil" className="grid gap-1 sm:grid-cols-2">
              {[...links, ...accountLinks].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center rounded-xl px-3 text-lg font-semibold transition ${isActive ? 'bg-white/10 text-accent' : 'text-white/90 hover:bg-white/5'}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={askLogout}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 font-semibold transition hover:bg-white/5"
              >
                <LogOut className="h-5 w-5" aria-hidden /> Cerrar sesión
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to={PATHS.login} className="flex min-h-12 items-center justify-center rounded-xl border border-white/30 font-semibold">
                  Iniciar sesión
                </Link>
                <Link to={PATHS.register} className="flex min-h-12 items-center justify-center rounded-xl bg-accent font-bold text-navy-950">
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmLogout && (
        <ConfirmDialog title="¿Cerrar sesión?" confirmLabel="Cerrar sesión" confirmVariant="danger" loading={loggingOut} onConfirm={doLogout} onCancel={cancelLogout}>
          Tus cartones y compras quedan guardados. Podrás volver a entrar cuando quieras.
        </ConfirmDialog>
      )}
    </header>
  );
}
