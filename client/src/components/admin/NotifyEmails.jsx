import { useEffect, useId, useState } from 'react';
import { Lock, Mail, Plus, X } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { errorMessage } from '../../lib/format';

const MAX = 15;
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/**
 * Correos que reciben la confirmación de cada compra (nueva compra, compra aprobada, venta en el salón) y los
 * avisos de ¡Bingo!. Se suman a las cuentas con rol ADMIN y a los fijos del servidor (ADMIN_NOTIFY_EMAILS, con candado).
 */
export default function NotifyEmails() {
  const inputId = useId();
  const [emails, setEmails] = useState(null);
  const [fixed, setFixed] = useState([]);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    adminApi
      .notifyEmails()
      .then((d) => {
        setEmails(d.emails);
        setSaved(d.emails);
        setFixed(d.fixed ?? []);
      })
      .catch((err) => setMsg({ tone: 'error', text: errorMessage(err) }));
  }, []);

  const add = (e) => {
    e.preventDefault();
    const value = draft.trim().toLowerCase();
    if (!isEmail(value)) return setMsg({ tone: 'error', text: 'Escribe un correo válido, por ejemplo tesoreria@hogarsol.org.' });
    if (emails.includes(value) || fixed.includes(value)) return setMsg({ tone: 'error', text: 'Ese correo ya está en la lista.' });
    if (emails.length >= MAX) return setMsg({ tone: 'error', text: `Máximo ${MAX} correos.` });
    setEmails((list) => [...list, value]);
    setDraft('');
    setMsg(null);
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const d = await adminApi.updateNotifyEmails(emails);
      setEmails(d.emails);
      setSaved(d.emails);
      setMsg({ tone: 'success', text: 'Listo: estos correos recibirán cada compra y cada ¡Bingo!.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const dirty = emails && JSON.stringify(emails) !== JSON.stringify(saved);

  return (
    <section className="surface grid max-w-4xl gap-4 p-5" aria-labelledby="notify-title">
      <div>
        <h2 id="notify-title" className="flex items-center gap-2 text-lg font-black text-fg">
          <Mail className="h-5 w-5 text-brand" aria-hidden /> Correos de avisos
        </h2>
        <p className="text-fg-muted">
          Reciben la confirmación de cada compra (nueva, aprobada y venta en el salón) y cada ¡Bingo! cantado.
          Todas las cuentas administradoras ya los reciben solas: aquí agrega otros correos (tesorería, junta…).
        </p>
      </div>

      {emails === null ? (
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Correos que reciben los avisos">
          {fixed.map((e) => (
            <li
              key={e}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-muted px-3 text-sm font-bold text-fg-muted"
              title="Configurado en el servidor"
            >
              <Lock className="h-4 w-4" aria-hidden /> {e}
            </li>
          ))}
          {emails.map((e) => (
            <li
              key={e}
              className="inline-flex min-h-10 items-center gap-1 rounded-full bg-sol-blue/10 pl-3 text-sm font-bold text-fg ring-1 ring-sol-blue/30 dark:bg-sol-gold/10 dark:ring-sol-gold/40"
            >
              {e}
              <button
                type="button"
                onClick={() => setEmails((list) => list.filter((x) => x !== e))}
                aria-label={`Quitar ${e}`}
                className="grid h-9 w-9 place-items-center rounded-full text-fg-muted transition hover:bg-sol-red/10 hover:text-sol-red active:scale-90"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
          {fixed.length === 0 && emails.length === 0 && <li className="text-fg-muted">Todavía no hay correos: agrega el primero.</li>}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label htmlFor={inputId} className="min-w-56 flex-1">
          <span className="font-bold text-fg">Agregar correo</span>
          <input
            id={inputId}
            type="email"
            inputMode="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="tesoreria@hogarsol.org"
            className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-4 text-fg outline-none focus:border-sol-blue focus:ring-4 focus:ring-sol-gold/40"
          />
        </label>
        <Button type="submit" variant="outline" icon={Plus} className="rounded-full!" disabled={emails === null}>
          Agregar
        </Button>
      </form>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div>
        <Button onClick={save} loading={busy} disabled={!dirty}>
          {dirty ? 'Guardar correos' : 'Correos guardados'}
        </Button>
      </div>
    </section>
  );
}
