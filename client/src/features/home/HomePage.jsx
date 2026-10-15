import { Link } from 'react-router-dom';
import { CalendarDays, HeartHandshake, Radio, Sun, Ticket } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { formatCRC, formatDate } from '../../lib/format';

function Countdown({ date }) {
  const t = useCountdown(date);
  const units = [
    ['Días', t.days],
    ['Horas', t.hours],
    ['Min', t.minutes],
    ['Seg', t.seconds],
  ];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {units.map(([label, v]) => (
        <div key={label} className="rounded-xl border-2 border-sol-gold bg-white/10 p-2 text-center sm:p-3">
          <div className="text-2xl font-black tabular-nums text-sol-gold sm:text-4xl">{String(v).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/80 sm:text-xs">{label}</div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { event } = useCurrentEvent();
  const isLive = event?.status === 'LIVE';

  return (
    <div className="min-h-screen">
      <section className="bg-linear-to-br from-sol-blue via-sol-blue-light to-sol-blue dark:from-[#0a1628] dark:via-sol-blue dark:to-[#0a1628] px-4 py-14 text-white sm:py-20">
        <div className="mx-auto max-w-5xl space-y-6 text-center">
          <Sun className="mx-auto h-14 w-14 text-sol-gold" />
          <h1 className="text-3xl font-black sm:text-5xl">Bingo Benéfico Asociación Infantil Hogar Sol</h1>
          <p className="mx-auto max-w-2xl text-white/85">
            Cada cartón ayuda a brindar hogar, alimentación y educación a niños y adultos mayores en situación de
            vulnerabilidad.
          </p>

          {event && (
            <div className="mx-auto max-w-xl space-y-3 rounded-2xl bg-black/20 p-4 ring-1 ring-sol-gold/30">
              <p className="flex items-center justify-center gap-2 font-semibold">
                <CalendarDays className="h-5 w-5 text-sol-gold" /> {event.name}
              </p>
              <p className="text-sm text-white/80">{formatDate(event.startsAt)}</p>
              {isLive ? (
                <p className="flex items-center justify-center gap-2 text-2xl font-black text-sol-gold">
                  <Radio className="h-6 w-6 animate-pulse" /> ¡Estamos en vivo!
                </p>
              ) : (
                <Countdown date={event.startsAt} />
              )}
              {event.description && <p className="text-sm text-white/80">{event.description}</p>}
            </div>
          )}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {event && !isLive && (
              <Link
                to="/cartones"
                className="flex items-center justify-center gap-2 rounded-full bg-sol-gold px-6 py-3 font-black text-sol-blue shadow-lg hover:bg-sol-gold-dark"
              >
                <Ticket className="h-5 w-5" /> Comprar cartones · {formatCRC(event.price)}
              </Link>
            )}
            <Link to="/live" className="rounded-full border-2 border-white px-6 py-3 font-bold hover:bg-white/10">
              Ver transmisión en vivo
            </Link>
          </div>
          {event && !isLive && <p className="text-sm text-white/70">Quedan {event.available} cartones disponibles</p>}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3">
        {[
          ['120+', 'niños apoyados'],
          ['15', 'años de servicio'],
          ['100 %', 'de lo recaudado va a la causa'],
        ].map(([n, label]) => (
          <div key={label} className="rounded-2xl bg-card p-6 text-center shadow-sm">
            <HeartHandshake className="mx-auto mb-2 h-7 w-7 text-sol-red" />
            <div className="text-3xl font-black text-brand">{n}</div>
            <div className="text-fg-muted">{label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
