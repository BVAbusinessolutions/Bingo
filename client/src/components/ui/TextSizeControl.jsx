import { TEXT_SIZES, useTheme } from '../../context/ThemeContext';

const LABELS = {
  normal: ['A', 'Letra normal', 'text-sm'],
  large: ['A+', 'Letra grande', 'text-base'],
  xlarge: ['A++', 'Letra muy grande', 'text-lg'],
};

/** Selector de tamaño de letra (pensado para personas mayores o con baja visión). */
export default function TextSizeControl({ className = '' }) {
  const { textSize, setTextSize } = useTheme();
  return (
    <div
      role="group"
      aria-label="Tamaño de letra"
      className={`inline-flex rounded-full border-2 border-sol-gold/70 bg-white/10 p-0.5 ${className}`}
    >
      {TEXT_SIZES.map((size) => {
        const [short, label, cls] = LABELS[size];
        const active = textSize === size;
        return (
          <button
            key={size}
            type="button"
            onClick={() => setTextSize(size)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={`grid h-8 min-w-9 place-items-center rounded-full px-1.5 font-black leading-none transition ${cls} ${
              active ? 'bg-sol-gold text-sol-blue' : 'text-current hover:bg-white/15'
            }`}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
