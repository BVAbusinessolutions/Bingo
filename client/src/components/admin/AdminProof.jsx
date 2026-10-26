import { useEffect, useState } from 'react';
import { FileText, ImageOff, Loader2, X, ZoomIn } from 'lucide-react';
import { adminApi } from '../../api/endpoints';

/** Carga el comprobante con el token (no hay URL pública) y lo expone como blob local. */
export function useAdminProof(id, enabled) {
  const [file, setFile] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let url;
    let alive = true;
    adminApi
      .proofBlob(id)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (alive) setFile({ url, isPdf: blob.type === 'application/pdf' });
      })
      .catch(() => alive && setFile({ error: true }));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, enabled]);
  return file;
}

export function ProofViewer({ file, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comprobante de pago"
        className="surface max-h-full w-full max-w-3xl overflow-auto p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex justify-end">
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-muted" aria-label="Cerrar">
            <X />
          </button>
        </div>
        {file.isPdf ? (
          <iframe src={file.url} title="Comprobante PDF" className="h-[80vh] w-full rounded-lg bg-white" />
        ) : (
          <img src={file.url} alt="Comprobante de pago" className="mx-auto max-h-[80vh] rounded-lg" />
        )}
      </div>
    </div>
  );
}

/** Vista grande del comprobante dentro del detalle de compra; clic para ampliar. */
export function ProofPanel({ reservationId, hasProof }) {
  const file = useAdminProof(reservationId, hasProof);
  const [open, setOpen] = useState(false);

  if (!hasProof) {
    return (
      <div className="grid min-h-60 place-items-center rounded-2xl bg-muted p-6 text-center text-fg-muted">
        <span>
          <ImageOff className="mx-auto mb-2 h-10 w-10" aria-hidden /> El cliente todavía no envió comprobante.
        </span>
      </div>
    );
  }
  if (!file) return <Loader2 className="mx-auto my-16 h-10 w-10 animate-spin text-fg-subtle" aria-label="Cargando comprobante" />;
  if (file.error) return <p className="rounded-2xl bg-muted p-6 text-center text-fg-muted">No se pudo cargar el comprobante.</p>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-2xl border-2 border-line bg-muted hover:border-sol-gold"
        aria-label="Ampliar comprobante"
      >
        {file.isPdf ? (
          <span className="grid min-h-60 place-items-center gap-2 p-6 font-bold text-fg">
            <FileText className="h-14 w-14 text-sol-red" aria-hidden /> Abrir comprobante PDF
          </span>
        ) : (
          <img src={file.url} alt="Comprobante de pago enviado por el cliente" className="max-h-[32rem] w-full object-contain" />
        )}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-sm font-bold text-white">
          <ZoomIn className="h-4 w-4" aria-hidden /> Ampliar
        </span>
      </button>
      {open && <ProofViewer file={file} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Miniatura para la lista de compras. */
export function ProofThumb({ reservationId, hasProof }) {
  const file = useAdminProof(reservationId, hasProof);
  const box = 'grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-line bg-muted';
  if (!hasProof) {
    return (
      <span className={`${box} text-fg-subtle`} title="Sin comprobante">
        <ImageOff className="h-5 w-5" aria-label="Sin comprobante" />
      </span>
    );
  }
  return (
    <span className={box}>
      {!file ? (
        <Loader2 className="h-5 w-5 animate-spin text-fg-subtle" />
      ) : file.error ? (
        <ImageOff className="h-5 w-5 text-fg-subtle" />
      ) : file.isPdf ? (
        <FileText className="h-7 w-7 text-sol-red" aria-label="PDF" />
      ) : (
        <img src={file.url} alt="" className="h-full w-full object-cover" />
      )}
    </span>
  );
}
