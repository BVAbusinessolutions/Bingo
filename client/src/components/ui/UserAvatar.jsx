import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/** La API devuelve rutas "/api/…": se resuelven contra VITE_API_URL cuando el backend vive en otro dominio. */
const resolve = (url) => (url?.startsWith('/api/') ? `${API_BASE}${url.slice(4)}` : url);

/** Avatar circular: la foto de perfil o, si no hay (o no carga), las iniciales sobre dorado. */
export default function UserAvatar({ user, src, className = 'h-9 w-9 text-base' }) {
  const url = src ?? resolve(user?.avatarUrl);
  const [failed, setFailed] = useState(null);
  const showPhoto = url && failed !== url;
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-black text-navy-950 ${className}`} aria-hidden>
      {showPhoto ? <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(url)} /> : initials(user?.name)}
    </span>
  );
}
