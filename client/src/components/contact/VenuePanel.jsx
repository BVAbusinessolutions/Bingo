import { CalendarDays, Clock, MapPin, Navigation } from 'lucide-react';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { eventDateLabel, eventPlace, eventTimeLabel } from '../event/EventCountdown';
import { CopyButton } from '../payments/PaymentPieces';
import { SITE } from '../../config/site';
import PanelTitle from './PanelTitle';

/** Fila de dato: ícono en placa, etiqueta pequeña y valor. Mismo ritmo en todas las filas. */
function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sol-blue/10 text-brand ring-1 ring-sol-blue/15 dark:bg-white/5 dark:ring-white/10">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-bold uppercase tracking-[0.14em] text-fg-muted">{label}</dt>
        <dd className="mt-0.5 font-semibold leading-snug text-fg">{children}</dd>
      </div>
    </div>
  );
}

/**
 * Lugar del evento: mapa enmarcado, datos ordenados y accesos directos a Google Maps y Waze.
 * El nombre del salón y la fecha vienen del evento (panel de administración); si no hay, de la configuración.
 */
export default function VenuePanel({ id }) {
  const { event } = useCurrentEvent();
  const place = eventPlace(event) || SITE.eventVenue;
  const coords = SITE.eventVenueCoords;
  const query = encodeURIComponent(coords || SITE.eventVenueMapQuery);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  const waze = coords ? `https://waze.com/ul?ll=${coords}&navigate=yes` : `https://waze.com/ul?q=${query}&navigate=yes`;

  return (
    // Destino de "Cómo llegar" e "Ir al mapa": se centra en pantalla y se resalta al llegar (useHashScroll).
    // h-full + mapa flex-1: en escritorio el panel mide lo mismo que el formulario de al lado.
    <section id={id} aria-labelledby="venue-title" className="surface flex h-full flex-col overflow-hidden rounded-3xl outline-none">
      <header className="p-6 pb-4 sm:p-8 sm:pb-5">
        <PanelTitle icon={MapPin} eyebrow="Lugar del evento" title={place} id="venue-title" />
      </header>

      {/* Mapa enmarcado: filo dorado y sello del lugar. En celular 4:3; en escritorio llena el alto sobrante. */}
      <div className="relative mx-4 aspect-[4/3] overflow-hidden rounded-2xl bg-muted ring-1 ring-sol-gold/40 sm:mx-6 lg:aspect-auto lg:min-h-64 lg:flex-1">
        <iframe
          title={`Mapa: ${place}`}
          src={`https://www.google.com/maps?q=${query}&z=16&output=embed`}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <span className="pointer-events-none absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-navy-950/85 px-3 py-1.5 text-sm font-semibold text-white shadow-lg ring-1 ring-accent/40 backdrop-blur-md">
          <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="truncate">{place}</span>
        </span>
      </div>

      <dl className="space-y-4 px-6 py-5 sm:px-8">
        {event?.startsAt && (
          <InfoRow icon={CalendarDays} label="Fecha del bingo">
            {eventDateLabel(event.startsAt)} · {eventTimeLabel(event.startsAt)}
          </InfoRow>
        )}
        <InfoRow icon={MapPin} label="Dirección">
          <span className="flex items-start justify-between gap-2">
            <span>{SITE.eventVenueMapQuery}</span>
            <CopyButton value={SITE.eventVenueMapQuery} label="Dirección" className="-mt-1 shrink-0" />
          </span>
        </InfoRow>
        <InfoRow icon={Clock} label="Horario de atención">
          {SITE.schedule}
        </InfoRow>
      </dl>

      {/* Acciones del mismo alto (44 px) y ancho: la principal en dorado. */}
      <div className="grid grid-cols-2 gap-3 border-t border-line/70 px-6 py-5 sm:px-8">
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 font-bold text-navy-950 shadow-[0_6px_18px_rgb(251_191_36/0.35)] transition hover:bg-accent-strong active:scale-95"
        >
          <Navigation className="h-4 w-4" aria-hidden /> Cómo llegar
        </a>
        <a
          href={waze}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-line bg-card px-4 font-bold text-fg transition hover:border-sol-blue active:scale-95 dark:hover:border-accent"
        >
          Abrir en Waze
        </a>
      </div>
    </section>
  );
}
