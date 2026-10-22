import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/** Conmutador Día / Noche. Accesible: botón con aria-pressed y etiqueta que describe la acción. */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      title={isDark ? 'Modo día' : 'Modo noche'}
      className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border-2 border-sol-gold/70 bg-white/15 transition ${className}`}
    >
      <span
        className={`absolute top-0.5 grid h-7 w-7 place-items-center rounded-full shadow transition-all duration-300 ${
          isDark ? 'left-7.5 bg-sol-blue text-sol-gold' : 'left-0.5 bg-sol-gold text-sol-blue'
        }`}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}
