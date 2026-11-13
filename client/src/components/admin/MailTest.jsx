import { useId, useState } from 'react';
import { MailCheck, Send } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { errorMessage } from '../../lib/format';

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Qué hacer según la respuesta del servidor de correo (códigos de nodemailer y SMTP). */
function explain(result) {
  if (result.ok) {
    return {
      tone: 'success',
      text: `El servidor de correo aceptó el envío desde ${result.from}. Revisa la bandeja de entrada y también spam o «Correo no deseado». Si llegó a spam, márcalo como «No es spam».`,
    };
  }
  if (result.reason === 'SMTP_NOT_CONFIGURED') {
    return { tone: 'error', text: 'El servidor no tiene SMTP configurado (SMTP_HOST en Render): los correos no se están enviando.' };
  }
  if (result.reason === 'EAUTH') {
    return {
      tone: 'error',
      text: 'El servidor de correo rechazó el usuario o la contraseña. En Gmail, SMTP_PASS debe ser una «contraseña de aplicación» de 16 letras, no la contraseña normal.',
    };
  }
  return { tone: 'error', text: `El servidor de correo respondió: ${result.message || result.reason}` };
}

/** Envía un correo de prueba a cualquier dirección (Hotmail, Outlook, Yahoo, ICE…) y muestra el resultado real. */
export default function MailTest() {
  const inputId = useId();
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const send = async (e) => {
    e.preventDefault();
    const value = to.trim().toLowerCase();
    if (!isEmail(value)) return setMsg({ tone: 'error', text: 'Escribe un correo válido.' });
    setBusy(true);
    setMsg(null);
    try {
      setMsg(explain(await adminApi.mailTest(value)));
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="surface grid max-w-4xl gap-4 p-5" aria-labelledby="mail-test-title">
      <div>
        <h2 id="mail-test-title" className="flex items-center gap-2 text-lg font-black text-fg">
          <MailCheck className="h-5 w-5 text-brand" aria-hidden /> Probar el envío de correos
        </h2>
        <p className="text-fg-muted">
          Envía un correo de prueba a una cuenta de Hotmail, Outlook, Yahoo o cualquier otra para confirmar que llega. Si falla, aquí
          aparece el motivo exacto.
        </p>
      </div>
      <form onSubmit={send} className="flex flex-wrap items-end gap-2">
        <label htmlFor={inputId} className="min-w-56 flex-1">
          <span className="font-bold text-fg">Enviar prueba a</span>
          <input
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="alguien@hotmail.com"
            className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-4 text-fg outline-none focus:border-sol-blue focus:ring-4 focus:ring-sol-gold/40"
          />
        </label>
        <Button type="submit" icon={Send} loading={busy}>
          Enviar prueba
        </Button>
      </form>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
    </section>
  );
}
