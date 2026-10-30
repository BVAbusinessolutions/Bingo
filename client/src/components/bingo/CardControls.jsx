import { useId } from 'react';
import { Grid2x2, Hand, LayoutGrid, Printer, RectangleVertical, Sparkles, Square, Volume2, VolumeX, Wand2 } from 'lucide-react';
import { CARD_VIEWS } from '../../constants/cardViews';
import { MARKERS } from '../../constants/markers';
import { Marker } from './BingoCard';

const VIEW_ICONS = { auto: Wand2, large: Square, single: RectangleVertical, grid: Grid2x2, mini: LayoutGrid };

/** Grupo de opciones excluyentes (radio) con aspecto de control segmentado; etiqueta visible encima. */
function Segmented({ label, value, options, onChange, hint }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id} className="min-w-0 space-y-1.5">
      <p id={id} className="flex items-baseline gap-2 text-xs font-extrabold uppercase tracking-wider text-fg-muted">
        {label}
        {hint && <span className="font-semibold normal-case tracking-normal text-fg-subtle">{hint}</span>}
      </p>
      <div className="flex flex-wrap gap-1 rounded-2xl bg-muted p-1">
        {options.map(({ value: v, label: text, Icon, title }) => {
          const active = v === value;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              title={title}
              onClick={() => onChange(v)}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-extrabold transition duration-200 active:scale-95 ${
                active
                  ? 'bg-sol-blue text-white shadow-md dark:bg-sol-gold dark:text-sol-blue'
                  : 'text-fg-muted hover:bg-card hover:text-fg'
              }`}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Controles de "Mis cartones": marcado manual/automático, vista (según cuántos cartones haya), estilo de la ficha
 * (con muestra real de cada ficha), sonido e impresión. Todo con texto visible: nada de botones de solo ícono.
 */
export default function CardControls({ autoMark, onAutoMark, view, effectiveView, onView, marker, onMarker, soundOn, onSound, canPrint }) {
  const markerLabel = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2" role="group" aria-label="Controles de los cartones">
      <Segmented
        label="Marcado"
        value={autoMark ? 'auto' : 'manual'}
        onChange={(v) => onAutoMark(v === 'auto')}
        options={[
          { value: 'manual', label: 'Yo marco', Icon: Hand },
          { value: 'auto', label: 'Automático', Icon: Sparkles },
        ]}
      />
      <div className="min-w-0 space-y-1.5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-fg-muted" id={markerLabel}>
          Ficha
        </p>
        <div role="radiogroup" aria-labelledby={markerLabel} className="flex flex-wrap gap-2">
          {Object.entries(MARKERS).map(([value, label]) => {
            const active = value === marker;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={label}
                title={label}
                onClick={() => onMarker(value)}
                className={`@container relative grid h-12 w-12 place-items-center rounded-xl bg-white text-lg font-black text-black shadow-sm ring-2 transition duration-200 active:scale-90 ${
                  active ? 'scale-105 ring-sol-blue dark:ring-sol-gold' : 'ring-line hover:ring-sol-blue/50'
                }`}
              >
                {/* Muestra real de la ficha (se reanima al elegirla) sobre un número de ejemplo */}
                <Marker key={active ? `${value}-on` : value} type={value} valid />
                <span className={`relative ${value === 'chip' ? 'text-white' : ''}`}>7</span>
                {active && (
                  <span
                    className="absolute -bottom-1 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-sol-blue dark:bg-sol-gold"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sm:col-span-2">
        <Segmented
          label="Vista"
          hint={view === 'auto' ? `(${CARD_VIEWS[effectiveView]})` : undefined}
          value={view}
          onChange={onView}
          options={Object.entries(CARD_VIEWS).map(([value, label]) => ({
            value,
            label: value === 'single' ? 'Una' : label,
            Icon: VIEW_ICONS[value],
            title: value === 'auto' ? 'Se ajusta a cuántos cartones tienes' : label,
          }))}
        />
      </div>

      <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
        <button
          type="button"
          onClick={onSound}
          aria-pressed={soundOn}
          className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm sm:flex-none font-extrabold ring-1 transition active:scale-95 ${
            soundOn
              ? 'bg-sol-blue text-white ring-sol-blue dark:bg-sol-gold dark:text-sol-blue dark:ring-sol-gold'
              : 'bg-card text-fg ring-line hover:ring-sol-blue'
          }`}
        >
          {soundOn ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
          {soundOn ? 'Sonido' : 'Sin sonido'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!canPrint}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-card sm:flex-none px-4 text-sm font-extrabold text-fg ring-1 ring-line transition hover:ring-sol-blue active:scale-95 disabled:opacity-50"
        >
          <Printer className="h-5 w-5" aria-hidden /> Imprimir
        </button>
      </div>
    </div>
  );
}
