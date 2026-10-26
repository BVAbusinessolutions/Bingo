import { useState } from 'react';
import { Printer } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import CardImage from '../../components/bingo/CardImage';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Field from '../../components/ui/Field';
import { errorMessage } from '../../lib/format';

/** Impresión en lote para venta física: rango de series (máx. 200 por vez), 2 cartones por hoja. */
export default function AdminPrintPage() {
  const { eventId, event } = useAdmin();
  const [range, setRange] = useState({ from: '', to: '' });
  const [cards, setCards] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await adminApi.printCards(eventId, range.from, range.to);
      setCards(data.cards);
    } catch (err) {
      setError(errorMessage(err, 'Revisa el rango (solo números).'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="print:hidden">
        <h1 className="text-3xl font-black text-brand">Imprimir en lote</h1>
        <p className="text-lg text-fg-muted">Elige un rango de números de serie de «{event?.name}». Hasta 200 cartones por vez.</p>
      </header>
      <form onSubmit={load} className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-end print:hidden">
        <Field
          label="Desde la serie"
          inputMode="numeric"
          value={range.from}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value.replace(/\D/g, '') }))}
        />
        <Field
          label="Hasta la serie"
          inputMode="numeric"
          value={range.to}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value.replace(/\D/g, '') }))}
        />
        <Button type="submit" loading={busy} disabled={!range.from || !range.to}>
          Ver cartones
        </Button>
      </form>
      {error && <Alert tone="error">{error}</Alert>}
      {cards && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-lg font-bold text-fg">{cards.length} cartón(es) listos para imprimir</p>
            <Button variant="gold" icon={Printer} disabled={!cards.length} onClick={() => window.print()}>
              Imprimir o guardar PDF
            </Button>
          </div>
          <div className="print-cards grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <CardImage key={c.serial} card={c} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
