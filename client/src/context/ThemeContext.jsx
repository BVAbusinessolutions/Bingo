import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hs-theme';
const TEXT_SIZE_KEY = 'hs-text-size';
const CONTRAST_KEY = 'hs-contrast';
const MOTION_KEY = 'hs-motion';
const CVD_KEY = 'hs-cvd';
const FONT_KEY = 'hs-font';
const ThemeContext = createContext(null);

/** Tamaños de letra disponibles; index.html aplica el guardado antes de pintar. */
export const TEXT_SIZES = Object.freeze(['normal', 'large', 'xlarge']);
/** Filtros de visión del color (daltonismo): cambian la paleta de balotas y fichas (tokens.css). */
export const CVD_MODES = Object.freeze(['none', 'protan', 'deutan', 'tritan']);

const DYSLEXIA_FONT_URL = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800&display=swap';
/** Descarga la fuente para dislexia solo la primera vez que alguien la activa. */
function loadDyslexiaFont() {
  if (document.getElementById('font-dyslexia')) return;
  const link = Object.assign(document.createElement('link'), { id: 'font-dyslexia', rel: 'stylesheet', href: DYSLEXIA_FONT_URL });
  document.head.append(link);
}

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
  const [highContrast, setHighContrastState] = useState(() => readStorage(CONTRAST_KEY, ['high']) === 'high');
  const [reduceMotion, setReduceMotionState] = useState(() => readStorage(MOTION_KEY, ['reduce']) === 'reduce');
  const [cvd, setCvdState] = useState(() => readStorage(CVD_KEY, CVD_MODES) ?? 'none');
  const [dyslexiaFont, setDyslexiaFontState] = useState(() => readStorage(FONT_KEY, ['dyslexia']) === 'dyslexia');

  useEffect(() => {
    const root = document.documentElement;
    if (cvd === 'none') delete root.dataset.cvd;
    else root.dataset.cvd = cvd;
    if (dyslexiaFont) {
      loadDyslexiaFont();
      root.dataset.font = 'dyslexia';
    } else delete root.dataset.font;
  }, [cvd, dyslexiaFont]);

  const setCvd = useCallback((next) => {
    if (!CVD_MODES.includes(next)) return;
    setCvdState(next);
    writeStorage(CVD_KEY, next);
  }, []);

  const setDyslexiaFont = useCallback((on) => {
    setDyslexiaFontState(on);
    writeStorage(FONT_KEY, on ? 'dyslexia' : 'normal');
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // La barra superior es azul marino en ambos modos; el color del navegador la acompaña.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0a1128');
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
  }, [textSize]);

  // index.html aplica ambos antes de pintar; aquí se mantienen al cambiar.
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) root.dataset.contrast = 'high';
    else delete root.dataset.contrast;
    if (reduceMotion) root.dataset.motion = 'reduce';
    else delete root.dataset.motion;
  }, [highContrast, reduceMotion]);

  const setTheme = useCallback((next) => {
    setStored(next);
    writeStorage(STORAGE_KEY, next);
  }, []);

  const setTextSize = useCallback((next) => {
    if (!TEXT_SIZES.includes(next)) return;
    setTextSizeState(next);
    writeStorage(TEXT_SIZE_KEY, next);
  }, []);

  const setHighContrast = useCallback((on) => {
    setHighContrastState(on);
    writeStorage(CONTRAST_KEY, on ? 'high' : 'normal');
  }, []);

  const setReduceMotion = useCallback((on) => {
    setReduceMotionState(on);
    writeStorage(MOTION_KEY, on ? 'reduce' : 'normal');
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
      textSize,
      setTextSize,
      highContrast,
      setHighContrast,
      reduceMotion,
      setReduceMotion,
      cvd,
      setCvd,
      dyslexiaFont,
      setDyslexiaFont,
    }),
    [theme, setTheme, toggleTheme, textSize, setTextSize, highContrast, setHighContrast, reduceMotion, setReduceMotion, cvd, setCvd, dyslexiaFont, setDyslexiaFont]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
};
