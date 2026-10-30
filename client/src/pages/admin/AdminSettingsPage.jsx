import { useEffect, useState } from 'react';
import { Building2, Landmark, Smartphone } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Field from '../../components/ui/Field';
import PageLoader from '../../components/ui/PageLoader';
import { errorMessage } from '../../lib/format';
import { PAYMENT_DETAIL } from '../../config/site';

// Cada método de cobro en su propio bloque: el cliente ve exactamente estos mismos grupos al pagar.
const SECTIONS = [
  {
    id: 'sinpe',
    title: 'SINPE Móvil',
    Icon: Smartphone,
    fields: [
      ['sinpePhone', 'Teléfono SINPE Móvil', 'ej. 6027-1658', { inputMode: 'tel', autoComplete: 'off' }],
      ['sinpeHolder', 'Titular de la línea SINPE', 'Déjalo vacío si es la misma Asociación (titular de la cuenta bancaria).'],
    ],
  },
  {
    id: 'transfer',
    title: 'Transferencia bancaria / IBAN',
    Icon: Building2,
    fields: [
      ['bank', 'Banco'],
      ['iban', 'Cuenta IBAN en colones', 'Formato: CR00 0000 0000 0000 0000 00'],
      ['holderId', 'Cédula jurídica de la Asociación'],
      ['holder', 'Titular de la cuenta'],
      ['swift', 'BIC / SWIFT (opcional)', 'Solo para transferencias desde el exterior: 8 u 11 caracteres, ej. BNCRCRSJ.'],
    ],
  },
];
const KEYS = SECTIONS.flatMap((s) => s.fields.map(([key]) => key));

/** Datos de cobro que ve el cliente en el paso de pago, separados por método. Antes estaban en el .env del servidor. */
export default function AdminSettingsPage() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    adminApi.payment().then((p) => setForm(Object.fromEntries(KEYS.map((k) => [k, p[k] ?? '']))));
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
        <p className="text-lg text-fg-muted">Lo que el cliente ve para pagar, en una pestaña por método.</p>
      </header>
      <form onSubmit={save} noValidate className="grid max-w-4xl gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {SECTIONS.map(({ id, title, Icon, fields }) => (
            <fieldset key={id} className="surface grid content-start gap-4 p-5">
              <legend className="sr-only">{title}</legend>
              <p aria-hidden className="flex items-center gap-2 text-lg font-black text-fg">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-sol-blue/10 text-sol-blue dark:bg-sol-gold/15 dark:text-sol-gold">
                  <Icon className="h-5 w-5" />
                </span>
                {title}
              </p>
              {fields.map(([key, label, hint, extra]) => (
                <Field
                  key={key}
                  label={label}
                  hint={hint}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  {...extra}
                />
              ))}
              {id === 'sinpe' && (
                <p className="rounded-xl bg-muted p-3 text-sm text-fg-muted">
                  Detalle obligatorio del comprobante: <b className="text-fg">{PAYMENT_DETAIL}</b> (fijo, igual para ambos métodos).
                </p>
              )}
            </fieldset>
          ))}
        </div>
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
