import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, ZoomIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { authApi } from '../../api/endpoints';
import { errorMessage } from '../../lib/format';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import UserAvatar from '../ui/UserAvatar';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT = 10 * 1024 * 1024; // el original puede ser grande: se reduce antes de subirlo
const OUT = 320; // px del cuadrado final
const VIEW = 224; // px del recorte en pantalla

/**
 * Foto de perfil: elegir (JPG, PNG o WebP), encuadrar con zoom y arrastre, y guardar.
 * El recorte se dibuja en un canvas y se sube como WebP de 320 px: pesa poco y pierde los metadatos (GPS, cámara).
 */
export default function AvatarEditor() {
  const { user, updateUser } = useAuth();
  const { notify } = useNotifications();
  const inputRef = useRef(null);
  const drag = useRef(null);
  const [img, setImg] = useState(null); // { el, url, w, h }
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => img && URL.revokeObjectURL(img.url), [img]);

  // Escala para que el lado corto cubra el recorte; el desplazamiento nunca deja huecos.
  const base = img ? VIEW / Math.min(img.w, img.h) : 1;
  const scale = base * zoom;
  const clamp = (o, z = zoom) => {
    if (!img) return o;
    const s = base * z;
    const mx = Math.max(0, (img.w * s - VIEW) / 2);
    const my = Math.max(0, (img.h * s - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!TYPES.includes(file.type)) return setError('Usa una foto JPG, PNG o WebP.');
    if (file.size > MAX_INPUT) return setError('La foto pesa más de 10 MB. Elige una más liviana.');
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      setImg({ el, url, w: el.naturalWidth, h: el.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      setError('No pudimos abrir esa imagen.');
    };
    el.src = url;
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onPointerMove = (e) => drag.current && setOffset(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }));
  const onPointerUp = () => (drag.current = null);
  const onKeyDown = (e) => {
    const step = 8;
    const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (!moves[e.key]) return;
    e.preventDefault();
    setOffset((o) => clamp({ x: o.x + moves[e.key][0], y: o.y + moves[e.key][1] }));
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = OUT;
      const ctx = canvas.getContext('2d');
      const k = OUT / VIEW;
      const w = img.w * scale * k;
      const h = img.h * scale * k;
      ctx.drawImage(img.el, (OUT - w) / 2 + offset.x * k, (OUT - h) / 2 + offset.y * k, w, h);
      const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/webp', 0.85));
      if (!blob) throw new Error('No pudimos preparar la foto.');
      updateUser(await authApi.uploadAvatar(blob));
      setImg(null);
      notify({ tone: 'success', title: 'Foto de perfil actualizada', duration: 4000 });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      updateUser(await authApi.removeAvatar());
      notify({ tone: 'success', title: 'Foto quitada', duration: 4000 });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <input ref={inputRef} type="file" accept={TYPES.join(',')} className="sr-only" onChange={pick} tabIndex={-1} aria-hidden />

      {img ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div
            role="img"
            aria-label="Vista previa del recorte. Arrastra o usa las flechas para encuadrar."
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-full bg-muted ring-4 ring-sol-gold/60 active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
          >
            <img
              src={img.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: img.w * scale,
                height: img.h * scale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          </div>
          <div className="w-full max-w-xs space-y-4">
            <label className="block space-y-1">
              <span className="flex items-center gap-2 font-bold text-fg">
                <ZoomIn className="h-5 w-5 text-brand" aria-hidden /> Acercar
              </span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => {
                  const z = Number(e.target.value);
                  setZoom(z);
                  setOffset((o) => clamp(o, z));
                }}
                className="w-full accent-sol-gold"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button className="h-11 min-h-11! rounded-full!" loading={busy} onClick={save}>
                Guardar foto
              </Button>
              <Button variant="outline" className="h-11 min-h-11! rounded-full!" disabled={busy} onClick={() => setImg(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <UserAvatar user={user} className="h-24 w-24 text-3xl ring-4 ring-sol-gold/40" />
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-fg-muted">JPG, PNG o WebP. Podrás encuadrarla antes de guardarla.</p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button icon={Camera} className="h-11 min-h-11! rounded-full!" onClick={() => inputRef.current?.click()}>
                {user?.avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {user?.avatarUrl && (
                <Button variant="outline" icon={Trash2} className="h-11 min-h-11! rounded-full!" loading={busy} onClick={remove}>
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
