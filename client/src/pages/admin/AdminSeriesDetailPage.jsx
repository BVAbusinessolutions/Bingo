import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, TriangleAlert, X } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import CardImage from '../../components/bingo/CardImage';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import PageLoader from '../../components/ui/PageLoader';
import { COLUMN_RANGES, LETTERS, isFreeCell } from '../../constants/patterns';
import { errorMessage } from '../../lib/format';

/** Mismas reglas que el servidor: rango por columna, sin repetidos, centro libre. */
function localProblems(grid) {
  const problems = [];
  const seen = new Set();
  grid.forEach((row, r) =>
    row.forEach((n, c) => {
      if (isFreeCell(r, c)) return;
      const [min, max] = COLUMN_RANGES[c];
      if (!Number.isInteger(n)) problems.push(`Falta ${LETTERS[c]}${r + 1}`);
      else if (n < min || n > max) problems.push(`${LETTERS[c]}${r + 1}: ${n} debe estar entre ${min} y ${max}`);
      else if (seen.has(n)) problems.push(`${n} está repetido`);
      else seen.add(n);
    })
  );
  return problems;
}

function CardEditor({ card, onClose, onSaved }) {
  const backdrop = useBackdropClose(onClose);
  const [serial, setSerial] = useState(card.serial);
  const [grid, setGrid] = useState(() => card.grid.map((row) => row.map((n) => (n === null ? '' : String(n)))));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const numeric = useMemo(() => grid.map((row, r) => row.map((v, c) => (isFreeCell(r, c) ? null : v === '' ? null : Number(v)))), [grid]);
  const problems = localProblems(numeric);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.updateSeriesCard(card.id, { serial: serial.trim(), grid: numeric });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4" {...backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Corregir cartón ${card.serial}`}
        className="surface w-full max-w-5xl space-y-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-fg">Corregir cartón</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted">
            <X />
          </button>
        </header>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={`Imagen original del cartón ${card.serial}`} className="w-full rounded-xl border border-line" />
            ) : (
              <p className="text-fg-muted">Sin imagen.</p>
            )}
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="font-bold text-fg">Número de serie</span>
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value.replace(/\D/g, '').slice(0, 8))}
                inputMode="numeric"
                className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-4 text-2xl font-black text-fg"
              />
            </label>
            <div>
              <div className="grid grid-cols-5 gap-1.5 text-center text-xl font-black text-fg" aria-hidden>
                {LETTERS.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-5 gap-1.5 rounded-xl bg-[#0f4c9c] p-2">
                {grid.map((row, r) =>
                  row.map((v, c) =>
                    isFreeCell(r, c) ? (
                      <span
                        key={`${r}-${c}`}
                        className="grid aspect-square place-items-center rounded-lg bg-white text-sm font-black text-sol-red"
                      >
                        LIBRE
                      </span>
                    ) : (
                      <input
                        key={`${r}-${c}`}
                        value={v}
                        inputMode="numeric"
                        aria-label={`${LETTERS[c]} fila ${r + 1}`}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                          setGrid((g) => g.map((rowArr, ri) => rowArr.map((x, ci) => (ri === r && ci === c ? value : x))));
                        }}
                        className="aspect-square w-full rounded-lg bg-white text-center text-2xl font-black tabular-nums text-black outline-none focus:ring-4 focus:ring-sol-gold"
                      />
                    )
                  )
                )}
              </div>
            </div>
            {problems.length > 0 ? (
              <Alert tone="warning" title="Revisa estos datos">
                <ul className="list-disc pl-5">
                  {problems.slice(0, 6).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Alert>
            ) : (
              <Alert tone="success">Los 24 números son válidos.</Alert>
            )}
            {error && <Alert tone="error">{error}</Alert>}
            <Button size="lg" className="w-full" disabled={problems.length > 0 || !serial} loading={busy} onClick={save}>
              Guardar cartón
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSeriesDetailPage() {
  const { id } = useParams();
  const [series, setSeries] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [onlyReview, setOnlyReview] = useState(false);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi
      .seriesOne(id)
      .then(setSeries)
      .catch((err) => setError(errorMessage(err)));
    adminApi
      .seriesCards(id, { page, review: onlyReview ? 'true' : undefined, q: q || undefined })
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, [id, page, onlyReview, q]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const inUse = series?.events?.length > 0;

  return (
    <section className="space-y-5">
      <Link
        to="/admin/series"
        className="inline-flex min-h-11 items-center gap-2 font-bold text-sol-blue hover:underline dark:text-sol-gold"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden /> Todas las series
      </Link>
      {error && <Alert tone="error">{error}</Alert>}
      {!series || !data ? (
        <PageLoader />
      ) : (
        <>
          <header>
            <h1 className="text-3xl font-black text-brand">{series.name}</h1>
            <p className="text-lg text-fg-muted">
              {series.cardCount} cartones · {series.needsReview} por revisar
            </p>
          </header>
          {inUse && <Alert tone="info">Esta serie está en uso por un evento: se puede ver pero no modificar.</Alert>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold text-fg">
              <input
                type="checkbox"
                checked={onlyReview}
                onChange={(e) => {
                  setOnlyReview(e.target.checked);
                  setPage(1);
                }}
                className="h-6 w-6 accent-sol-blue"
              />
              Solo por revisar
            </label>
            <label className="relative sm:ml-auto sm:w-64">
              <span className="sr-only">Buscar número de serie</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input
                value={q}
                inputMode="numeric"
                onChange={(e) => {
                  setQ(e.target.value.replace(/\D/g, '').slice(0, 8));
                  setPage(1);
                }}
                placeholder="Buscar serie #"
                className="min-h-12 w-full rounded-xl border-2 border-line bg-card pl-10 pr-3 text-fg"
              />
            </label>
          </div>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.cards.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => !inUse && setEditing(c)}
                  disabled={inUse}
                  className={`block w-full space-y-1 rounded-2xl p-1 text-left transition ${c.needsReview ? 'ring-4 ring-amber-500' : 'hover:ring-2 hover:ring-sol-gold'} disabled:cursor-default`}
                  aria-label={`Cartón ${c.serial}${c.needsReview ? ', por revisar' : ''}`}
                >
                  <CardImage card={c} />
                  <span className="flex items-center justify-between px-1 font-black text-fg">
                    #{c.serial}
                    {c.needsReview && (
                      <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                        <TriangleAlert className="h-4 w-4" aria-hidden /> Revisar
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {data.cards.length === 0 && <p className="surface p-8 text-center text-fg-muted">No hay cartones con ese filtro.</p>}

          <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="font-bold text-fg">
              {page} / {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Siguiente <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          </nav>
        </>
      )}
      {editing && (
        <CardEditor
          card={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}
