import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { PATHS } from '../../routing/paths';

/**
 * Franja discreta sobre el sitio público cuando quien navega es administrador: el sitio se ve exactamente
 * como lo ve un cliente y desde aquí se vuelve al panel con un toque.
 */
export default function AdminReturnBar() {
  const { role } = useAuth();
  if (role !== ROLES.ADMIN) return null;
  return (
    <div className="border-b border-white/10 bg-navy-950 text-white print:hidden">
      <div className="container-page flex min-h-9 flex-wrap items-center justify-between gap-x-3 py-1 text-sm">
        <p className="flex items-center gap-1.5 text-white/75">
          <Shield className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          Vista pública del sitio
        </p>
        <Link to={PATHS.admin} className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 font-bold text-accent hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver al panel
        </Link>
      </div>
    </div>
  );
}
