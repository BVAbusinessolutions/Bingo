import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hs-theme';
const TEXT_SIZE_KEY = 'hs-text-size';
const ThemeContext = createContext(null);

/** Tamaños de letra disponibles; index.html aplica el guardado antes de pintar. */
export const TEXT_SIZES = Object.freeze(['normal', 'large', 'xlarge']);

const readStorage = (key, allowed) => {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : null;
  } catch {
    return null; // modo privado / almacenamiento bloqueado
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sin persistencia: el cambio dura solo esta sesión
  }
};

const readStored = () => readStorage(STORAGE_KEY, ['light', 'dark']);

const systemTheme = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function ThemeProvider({ children }) {
  // null = el usuario no eligió: se sigue la preferencia del sistema.
  const [stored, setStored] = useState(readStored);
  const [system, setSystem] = useState(systemTheme);
  const theme = stored ?? system;
  const [textSize, setTextSizeState] = useState(() => readStorage(TEXT_SIZE_KEY, TEXT_SIZES) ?? 'normal');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b192c' : '#0e4a8e');
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
  }, [textSize]);

  const setTheme = useCallback((next) => {
    setStored(next);
    writeStorage(STORAGE_KEY, next);
  }, []);

  const setTextSize = useCallback((next) => {
    if (!TEXT_SIZES.includes(next)) return;
    setTextSizeState(next);
    writeStorage(TEXT_SIZE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', setTheme, toggleTheme, textSize, setTextSize }),
    [theme, setTheme, toggleTheme, textSize, setTextSize]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
};
