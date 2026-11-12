import { useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { errorMessage } from '../../lib/format';
import StreamFields, { streamValue } from './StreamFields';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const formOf = (stream, fallbackProvider) => ({
  provider: stream?.provider ?? fallbackProvider,
  videoId: stream?.videoId ?? stream?.url ?? '',
});

export default function StreamSettings({ event, onSaved, onCancel }) {
  const [form, setForm] = useState(formOf(event.stream, 'youtube'));
  const [backup, setBackup] = useState(formOf(event.streamBackup, 'youtube'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.videoId.trim()) return setError('Pega el enlace o el ID de la transmisión.');
    setBusy(true);
    setError('');
    try {
      // Respaldo vacío = sin respaldo (se borra si había uno).
      const updated = await adminApi.updateEvent(event.id, { stream: streamValue(form), streamBackup: streamValue(backup) });
      await onSaved(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-fg-muted">
        Inicia la emisión desde YouTube, Facebook o tu plataforma de video. Luego pega aquí el enlace para que los jugadores puedan verla
        dentro del bingo. Guardar el enlace no inicia el sorteo ni cierra las ventas.
      </p>
      <StreamFields form={form} onChange={setForm} />
      <fieldset className="space-y-3 rounded-xl border-2 border-dashed border-line p-3">
        <legend className="px-1 text-sm font-bold text-fg">Respaldo (opcional)</legend>
        <p className="text-sm text-fg-muted">
          Una segunda emisión del mismo sorteo, por ejemplo en YouTube. Si la principal (HLS o WebRTC) falla 3 veces seguidas, el
          reproductor cambia solo a esta; los jugadores también pueden cambiar a mano. Déjalo vacío si no tienes respaldo.
        </p>
        <StreamFields form={backup} onChange={setBackup} label="Transmisión de respaldo" allowTiktok={false} />
      </fieldset>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          Guardar transmisión
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
