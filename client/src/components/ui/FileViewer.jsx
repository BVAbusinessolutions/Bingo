import { useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Alert from './Alert';

/**
 * Muestra una factura o comprobante (imagen o PDF) dentro del panel, encima de la página:
 * no abre otra pestaña ni otra ventana. Incluye un botón para descargar el archivo.
 * `load` devuelve el Blob del archivo (las rutas protegidas no se pueden abrir con un enlace directo).
 */
export default function FileViewer({ title, fileName = 'archivo', load, onClose }) {
  const [file, setFile] = useState(null); // { url, isPdf } | 'error'

  useEffect(() => {
    let url;
    let alive = true;
    load()
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (alive) setFile({ url, isPdf: blob.type === 'application/pdf', ext: blob.type === 'application/pdf' ? 'pdf' : blob.type.split('/')[1] || 'png' });
      })
      .catch(() => alive && setFile('error'));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
    // `load` cambia en cada render del padre; el archivo se carga una sola vez al abrir el visor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title={title} icon={FileText} onClose={onClose} size="max-w-3xl">
      {!file && (
        <div className="grid h-64 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-fg-subtle" aria-label="Cargando archivo" />
        </div>
      )}
      {file === 'error' && <Alert tone="error">No se pudo cargar el archivo. Intenta de nuevo.</Alert>}
      {file && file !== 'error' && (
        <div className="space-y-4">
          {file.isPdf ? (
            <iframe title={title} src={file.url} className="h-[65dvh] w-full rounded-xl border border-line bg-white" />
          ) : (
            <img src={file.url} alt={title} className="max-h-[65dvh] w-full rounded-xl border border-line object-contain" />
          )}
          <a
            href={file.url}
            download={`${fileName}.${file.ext}`}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-line px-5 font-bold text-fg transition hover:border-sol-blue active:scale-95 dark:hover:border-sol-gold"
          >
            <Download className="h-5 w-5" aria-hidden /> Descargar
          </a>
        </div>
      )}
    </Modal>
  );
}
