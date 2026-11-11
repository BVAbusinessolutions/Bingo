import { useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { errorMessage } from '../../lib/format';
import StreamFields, { streamValue } from './StreamFields';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

export default function StreamSettings({ event, onSaved, onCancel }) {
  const [form, setForm] = useState({
    provider: event.stream?.provider ?? 'youtube',
    videoId: event.stream?.videoId ?? event.stream?.url ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.videoId.trim()) return setError('Pega el enlace o el ID de la transmisión.');
    setBusy(true);
    setError('');
    try {
      const updated = await adminApi.updateEvent(event.id, { stream: streamValue(form) });
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
