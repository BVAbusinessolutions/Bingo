import { useCallback, useEffect, useState } from 'react';
import { Building2, Check, FileText, ImageOff, Loader2, RefreshCw, Smartphone, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatCRC, formatDate } from '../../lib/format';

const FILTERS = [
  ['PROOF_SUBMITTED', 'Por verificar'],
  ['PENDING', 'Esperando pago'],
  ['APPROVED', 'Aprobadas'],
  ['REJECTED', 'Rechazadas'],
  ['', 'Todas'],
];

/** Carga el comprobante con el token (no hay URL pública) y lo expone como blob local. */
function useProof(id, enabled) {
  const [file, setFile] = useState(null);
  useEffect(() => {
    if (!enabled) return;
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

function ProofThumb({ reservation, onOpen }) {
  const file = useProof(reservation.id, reservation.hasProof);
  if (!reservation.hasProof) {
    return (
      <div className="grid h-16 w-16 place-items-center rounded-lg bg-muted text-fg-subtle" title="Sin archivo adjunto">
        <ImageOff className="h-5 w-5" aria-label="Sin archivo" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => file && !file.error && onOpen(file)}
      aria-label={`Ver comprobante de ${reservation.buyer?.fullName ?? 'la reserva'}`}
      className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-line bg-muted hover:border-sol-gold"
    >
      {!file ? (
        <Loader2 className="h-5 w-5 animate-spin text-fg-subtle" />
      ) : file.error ? (
        <ImageOff className="h-5 w-5 text-fg-subtle" />
      ) : file.isPdf ? (
        <FileText className="h-7 w-7 text-sol-red" />
      ) : (
        <img src={file.url} alt="" className="h-full w-full object-cover" />
      )}
    </button>
  );
}

function ProofViewer({ file, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Comprobante de pago" className="surface max-h-full w-full max-w-2xl overflow-auto p-3" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex justify-end">
          <button onClick={onClose} className="rounded-full p-1 text-fg hover:bg-muted" aria-label="Cerrar">
            <X />
          </button>
        </div>
        {file.isPdf ? (
          <iframe src={file.url} title="Comprobante PDF" className="h-[75vh] w-full rounded-lg bg-white" />
        ) : (
          <img src={file.url} alt="Comprobante de pago" className="mx-auto max-h-[75vh] rounded-lg" />
        )}
      </div>
    </div>
  );
}

export default function AdminPayments() {
  const { revision } = useAdmin();
  const [status, setStatus] = useState('PROOF_SUBMITTED');
  const [items, setItems] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => adminApi.reservations(status).then(setItems), [status]);

  useEffect(() => {
    load();
  }, [load, revision]);

  const decide = async (r, approve) => {
    const msg = approve
      ? `¿Aprobar el pago de ${r.buyer?.fullName}? Se asignarán ${r.serials.length} cartón(es) y se enviará el correo de confirmación.`
      : `¿Rechazar el pago de ${r.buyer?.fullName ?? 'esta reserva'}? Los cartones volverán a estar disponibles.`;
    if (!window.confirm(msg)) return;
    setBusyId(r.id);
    try {
      await adminApi.decide(r.id, approve);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([s, label]) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setItems(null);
            }}
            aria-pressed={status === s}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              status === s ? 'bg-sol-blue text-white dark:bg-sol-gold dark:text-sol-blue' : 'surface text-fg-muted'
            }`}
          >
            {label}
          </button>
        ))}
        <button onClick={load} className="surface ml-auto p-2 text-fg" aria-label="Actualizar">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {!items ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-fg-subtle" />
      ) : items.length === 0 ? (
        <p className="surface p-8 text-center text-fg-muted">No hay solicitudes en este estado.</p>
      ) : (
        <div className="surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="hidden bg-muted text-left text-xs uppercase tracking-wide text-fg-muted md:table-header-group">
              <tr>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Comprador</th>
                <th className="px-4 py-3">Cartones</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((r) => {
                const decidable = ['PENDING', 'PROOF_SUBMITTED'].includes(r.status);
                return (
                  <tr key={r.id} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 p-4 md:table-row md:p-0">
                    <td className="row-span-3 md:px-4 md:py-3">
                      <ProofThumb reservation={r} onOpen={setViewing} />
                    </td>
                    <td className="min-w-0 md:px-4 md:py-3">
                      <p className="truncate font-bold text-fg">{r.buyer?.fullName ?? '— (sin datos aún)'}</p>
                      {r.buyer && (
                        <p className="truncate text-xs text-fg-muted">
                          Céd. {r.buyer.nationalId} · {r.buyer.phone}
                          <br />
                          {r.buyer.email}
                        </p>
                      )}
                    </td>
                    <td className="md:px-4 md:py-3">
                      <p className="font-semibold text-fg">{r.serials.map((s) => `#${s}`).join(', ')}</p>
                      <p className="text-xs text-fg-muted">{formatDate(r.createdAt)}</p>
                    </td>
                    <td className="md:px-4 md:py-3">
                      <p className="text-lg font-black tabular-nums text-fg">{formatCRC(r.total)}</p>
                      <p className="flex items-center gap-1 text-xs text-fg-muted">
                        {r.method === 'TRANSFER' ? <Building2 className="h-3.5 w-3.5" /> : r.method ? <Smartphone className="h-3.5 w-3.5" /> : null}
                        {r.method === 'TRANSFER' ? 'Transferencia' : r.method === 'SINPE' ? 'SINPE' : ''}
                        {r.reference && ` · ref. ${r.reference}`}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={r.status} />
                      </div>
                    </td>
                    <td className="col-span-2 md:px-4 md:py-3">
                      {decidable && (
                        <div className="flex gap-2 md:justify-end">
                          <button
                            disabled={busyId === r.id}
                            onClick={() => decide(r, true)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 md:flex-none"
                          >
                            <Check className="h-5 w-5" /> Aprobar Pago
                          </button>
                          <button
                            disabled={busyId === r.id}
                            onClick={() => decide(r, false)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sol-red px-4 py-3 font-bold text-white hover:bg-sol-red-dark disabled:opacity-50 md:flex-none"
                          >
                            <X className="h-5 w-5" /> Rechazar Pago
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <ProofViewer file={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
