import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, Ticket, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { eventsApi, reservationsApi } from '../../api/endpoints';
import CardSelector from '../../components/cards/CardSelector';
import CardImage from '../../components/bingo/CardImage';
import CheckoutSteps from '../../components/checkout/CheckoutSteps';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import LoginRequiredDialog, { LOGIN_REQUIRED_TEXT } from '../../components/auth/LoginRequiredDialog';
import { PATHS, toPath } from '../../routing/paths';
import { errorMessage, formatCRC, formatDate } from '../../lib/format';
import { usePageMeta } from '../../hooks/usePageMeta';

const MAX = 20;
const POLL_MS = 15_000;
const SELECTION_KEY = 'hs-selected-cards'; // conserva la selección al recargar o volver del pago

const loadSelection = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SELECTION_KEY)) ?? [];
  } catch {
    return [];
  }
};

export default function CatalogPage() {
  usePageMeta({
    title: 'Comprar cartones',
    description: 'Elige tus cartones del Bingo Benéfico Hogar Sol y paga por SINPE Móvil o transferencia. Juega en el salón o en línea.',
  });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { event, loading, error: eventError, reload } = useCurrentEvent();

  const [cards, setCards] = useState(null);
  const [clockOffset, setClockOffset] = useState(0); // hora servidor - hora local
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState(loadSelection);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [askLogin, setAskLogin] = useState(false); // invitado que intentó elegir o comprar

  const loadCatalog = useCallback(async () => {
    if (!event) return;
    const data = await eventsApi.catalog(event.id);
    setClockOffset(new Date(data.serverTime).getTime() - Date.now());
    setCards(data.cards);
    // Quita de la selección lo que otra persona apartó mientras tanto.
    const free = new Set(data.cards.filter((c) => c.status === 'AVAILABLE').map((c) => c.serial));
    setSelected((sel) => (sel.every((s) => free.has(s)) ? sel : sel.filter((s) => free.has(s))));
  }, [event]);

  // Catálogo actualizado por polling (los estados cambian cuando otros reservan/pagan).
  useEffect(() => {
    loadCatalog().catch(() => setError('No se pudo cargar el catálogo.'));
    const id = setInterval(() => loadCatalog().catch(() => {}), POLL_MS);
    return () => clearInterval(id);
  }, [loadCatalog]);

  // Reloj compartido para todas las cuentas regresivas del catálogo.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SELECTION_KEY, JSON.stringify(selected));
    } catch {
      // sin almacenamiento: la selección no sobrevive al login, nada grave
    }
  }, [selected]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedCards = useMemo(
    () => (cards ?? []).filter((c) => selectedSet.has(c.serial)).map((c) => ({ ...c, id: c.serial })),
    [cards, selectedSet]
  );

  // Elegir y comprar exige sesión: el invitado ve el catálogo, pero al tocar un cartón se le pide entrar.
  const toggle = useCallback(
    (serial) => {
      if (!isAuthenticated) {
        setAskLogin(true);
        return;
      }
      setSelected((sel) => (sel.includes(serial) ? sel.filter((s) => s !== serial) : sel.length < MAX ? [...sel, serial] : sel));
    },
    [isAuthenticated]
  );
  const closeLogin = useCallback(() => setAskLogin(false), []);

  const reserve = async () => {
    if (!isAuthenticated) {
      setAskLogin(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await reservationsApi.create({ eventId: event.id, serials: selected });
      setSelected([]);
      navigate(toPath(PATHS.checkout, { id: r.id }));
    } catch (err) {
      setError(errorMessage(err));
      loadCatalog();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin text-sol-blue dark:text-sol-gold" />;
  if (eventError && !event) {
    return (
      <div role="alert" className="surface mx-auto mt-20 max-w-md space-y-3 p-6 text-center">
        <p className="text-fg-muted">No pudimos conectar con el servidor para cargar los cartones. Reintentamos solos en unos segundos.</p>
        <Button variant="outline" size="sm" onClick={() => reload()}>
          Reintentar ahora
        </Button>
      </div>
    );
  }
  // En juego: la venta en línea se cierra a propósito (el servidor rechaza reservas con el bingo empezado).
  if (event?.status === 'LIVE') {
    return (
      <div className="surface mx-auto mt-20 max-w-md space-y-3 p-6 text-center">
        <p className="font-display text-2xl font-bold text-brand">{event.name}</p>
        <p className="text-fg-muted">
          ¡El bingo ya está en juego! La venta en línea cerró al cantarse la primera bola. Si ya tienes cartones, entra a jugar.
        </p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button className="h-11 min-h-11! rounded-full!" onClick={() => navigate(isAuthenticated ? PATHS.live : PATHS.login)}>
            Jugar en vivo
          </Button>
          <Button variant="outline" className="h-11 min-h-11! rounded-full!" onClick={() => navigate(PATHS.results)}>
            Ver resultados
          </Button>
        </div>
      </div>
    );
  }
  if (!event || event.status !== 'SCHEDULED') {
    return <p className="mx-auto mt-20 max-w-md px-4 text-center text-fg-muted">No hay bingos con venta abierta en este momento.</p>;
  }

  const total = selected.length * event.price;

  return (
    <main className="container-page space-y-5 pb-32 pt-6">
      <CheckoutSteps current={1} />
      <div>
        <h1 className="text-3xl font-black text-brand sm:text-4xl">Elige tus cartones</h1>
        <p className="text-lg text-fg-muted">
          {event.name} · {formatDate(event.startsAt)} · <b className="text-fg">{formatCRC(event.price)}</b> por cartón
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!isAuthenticated && (
        <Alert
          tone="info"
          title="Necesitas una cuenta para comprar"
          action={
            <Button size="sm" icon={LogIn} onClick={() => setAskLogin(true)}>
              Entrar
            </Button>
          }
        >
          {LOGIN_REQUIRED_TEXT}.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {cards ? (
          <CardSelector cards={cards} selected={selectedSet} now={now + clockOffset} onToggle={toggle} maxSelectable={MAX} />
        ) : (
          <div className="surface grid h-64 place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-fg-subtle" />
          </div>
        )}

        {/* Vista previa de los cartones elegidos con el diseño tradicional */}
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start" aria-label="Cartones seleccionados">
          <h2 className="font-bold text-fg">Tu selección ({selected.length})</h2>
          {selectedCards.length === 0 ? (
            <p className="surface p-6 text-center text-sm text-fg-muted">
              Toca un cartón <span aria-hidden>🟩</span> disponible para verlo aquí.
            </p>
          ) : (
            <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
              {selectedCards.map((card) => (
                <div key={card.serial} className="relative">
                  <CardImage card={card} />
                  <button
                    onClick={() => toggle(card.serial)}
                    aria-label={`Quitar cartón #${card.serial}`}
                    className="absolute -right-1.5 -top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-sol-blue text-white shadow ring-2 ring-white dark:ring-page"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Barra fija de compra (cómoda en móvil) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-sol-gold bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-bold text-fg-muted">
              {selected.length} cartón(es){selected.length >= MAX && ' · máximo alcanzado'}
            </p>
            <p className="text-2xl font-black text-sol-red dark:text-sol-gold">{formatCRC(total)}</p>
          </div>
          <button
            onClick={reserve}
            disabled={busy || (isAuthenticated && selected.length === 0)}
            className="flex items-center gap-2 rounded-xl bg-sol-gold px-5 py-3.5 font-black text-sol-blue shadow-lg hover:bg-sol-gold-dark disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Ticket className="h-5 w-5" />}
            {isAuthenticated ? 'Continuar al pago' : 'Iniciar sesión para comprar'}
          </button>
        </div>
      </div>
      {askLogin && <LoginRequiredDialog onClose={closeLogin} />}
    </main>
  );
}
