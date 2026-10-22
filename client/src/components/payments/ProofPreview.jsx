import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { reservationsApi } from '../../api/endpoints';

/** Muestra el comprobante que subió el propio usuario (imagen en línea o enlace al PDF). */
export default function ProofPreview({ reservationId }) {
  const [file, setFile] = useState(null); // { url, isPdf } | 'error'

  useEffect(() => {
    let url;
    reservationsApi
      .proofBlob(reservationId)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setFile({ url, isPdf: blob.type === 'application/pdf' });
      })
      .catch(() => setFile('error'));
    return () => url && URL.revokeObjectURL(url);
  }, [reservationId]);

  if (!file) return <Loader2 className="h-6 w-6 animate-spin text-fg-subtle" aria-label="Cargando comprobante" />;
  if (file === 'error') return <p className="text-fg-muted">No se pudo cargar el comprobante.</p>;
  if (file.isPdf) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-line px-4 font-bold text-fg hover:border-sol-blue">
        <FileText className="h-5 w-5 text-sol-red" aria-hidden /> Abrir comprobante (PDF)
      </a>
    );
  }
  return <img src={file.url} alt="Comprobante de pago enviado" className="max-h-96 w-full rounded-xl border border-line object-contain" />;
}
