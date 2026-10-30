import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PATHS } from '../../routing/paths';
import { BrandBadge } from '../brand/BrandLogo';
import AccessibilityButton from '../accessibility/AccessibilityButton';
import ThemeToggle from '../ui/ThemeToggle';
import ConfirmDialog from '../ui/ConfirmDialog';
import UserAvatar from '../ui/UserAvatar';

/**
 * Cabecera exclusiva del panel de administración: sin la navegación pública ni accesos de cliente.
 * Solo identifica la zona, permite ver el sitio público y cerrar sesión.
 */
export default function AdminTopBar() {
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/95 text-white shadow-[0_8px_30px_rgb(2_6_23/0.25)] backdrop-blur-xl print:hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent/70 to-transparent" aria-hidden />
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link to={PATHS.admin} className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="Panel de administración, inicio">
          <BrandBadge className="h-10 w-10 rounded-xl p-1" logoClassName="block h-8 max-h-8 w-8 object-contain" />
          <span className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-widest text-accent">
              <Shield className="h-3.5 w-3.5" aria-hidden /> Administración
            </span>
            <span className="truncate font-display text-base font-bold sm:text-lg">Hogar Sol</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            to={PATHS.home}
            className="inline-flex h-11 items-center gap-2 rounded-full px-3 font-semibold text-white/90 ring-1 ring-white/15 transition hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">Ver sitio público</span>
            <span className="sr-only sm:hidden">Ver sitio público</span>
          </Link>
          <ThemeToggle />
          <AccessibilityButton />
          <span className="hidden items-center gap-2 pl-1 lg:flex" title={user?.email}>
            <UserAvatar user={user} />
            <span className="max-w-32 truncate font-semibold">{user?.name?.split(' ')[0]}</span>
          </span>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Cerrar sesión"
            className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-white/15 transition hover:bg-white/10 active:scale-95"
          >
            <LogOut className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {confirmLogout && (
        <ConfirmDialog title="¿Cerrar sesión?" confirmLabel="Cerrar sesión" confirmVariant="danger" loading={loggingOut} onConfirm={doLogout} onCancel={cancelLogout}>
          Saldrás del panel de administración. Las compras y el sorteo siguen su curso.
        </ConfirmDialog>
      )}
    </header>
  );
}
