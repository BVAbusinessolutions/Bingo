import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Field from '../../components/ui/Field';
import PageLoader from '../../components/ui/PageLoader';
import { errorMessage } from '../../lib/format';

const FIELDS = [
  ['holder', 'Titular de la cuenta'],
  ['holderId', 'Cédula jurídica'],
  ['sinpePhone', 'Teléfono SINPE Móvil'],
  ['bank', 'Banco'],
  ['iban', 'Cuenta IBAN', 'Formato: CR00 0000 0000 0000 0000 00'],
];

/** Datos de cobro que ve el cliente en el paso de pago. Antes estaban en el .env del servidor. */
export default function AdminSettingsPage() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    adminApi
      .payment()
      .then((p) => setForm({ holder: p.holder, holderId: p.holderId, sinpePhone: p.sinpePhone, bank: p.bank, iban: p.iban }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.updatePayment(form);
      setMsg({ tone: 'success', text: 'Datos de cobro guardados. Los clientes ya ven los nuevos datos.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <PageLoader />;

  return (
    <section className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-black text-brand">
          <Landmark className="h-8 w-8" aria-hidden /> Datos de cobro
        </h1>
        <p className="text-lg text-fg-muted">Lo que el cliente ve para pagar por SINPE Móvil o transferencia.</p>
      </header>
      <form onSubmit={save} noValidate className="surface grid max-w-2xl gap-4 p-5">
        {FIELDS.map(([key, label, hint]) => (
          <Field
            key={key}
            label={label}
            hint={hint}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        ))}
        <Alert tone="warning">
          Revisa con cuidado: un número equivocado hace que los pagos lleguen a otra cuenta. El cambio queda en la bitácora.
        </Alert>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <div>
          <Button type="submit" loading={busy}>
            Guardar datos de cobro
          </Button>
        </div>
      </form>
    </section>
  );
}
