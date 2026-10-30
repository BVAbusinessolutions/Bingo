import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Conmutador Día / Noche. Accesible: botón con aria-pressed y etiqueta que describe la acción.
 * Mide 44 px de alto, igual que los demás botones de la barra de navegación.
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      title={isDark ? 'Modo día' : 'Modo noche'}
      className={`relative inline-flex h-11 w-[5.25rem] shrink-0 items-center rounded-full bg-white/10 p-1 ring-1 ring-white/35 backdrop-blur-md transition hover:bg-white/20 hover:ring-accent/70 active:scale-95 ${className}`}
    >
      {/* translate (GPU) en lugar de left: animación fluida sin recalcular el diseño. */}
      <span
        className={`grid h-9 w-9 place-items-center rounded-full shadow-md transition-transform duration-300 ease-out will-change-transform ${
          isDark ? 'translate-x-9 bg-sol-blue text-sol-gold' : 'translate-x-0 bg-sol-gold text-sol-blue'
        }`}
      >
        {isDark ? <Moon className="h-5 w-5" aria-hidden /> : <Sun className="h-5 w-5" aria-hidden />}
      </span>
    </button>
  );
}
