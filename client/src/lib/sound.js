// Efectos de sonido del juego, sintetizados con Web Audio (sin archivos que descargar).
// El navegador solo permite sonar tras un gesto de la persona: el contexto se crea en el primer uso.
const MUTE_KEY = 'hs-sound';
let ctx = null;

export function isSoundOn() {
  try {
    return localStorage.getItem(MUTE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(MUTE_KEY, on ? 'on' : 'off');
  } catch {
    // sin almacenamiento: la preferencia dura solo esta visita
  }
}

function audio(force = false) {
  if (!force && !isSoundOn()) return null;
  const Ctx = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctx) return null;
  ctx ??= new Ctx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Un tono corto con ataque y caída suaves (sin chasquidos). */
function tone(ac, freq, start, duration, { type = 'sine', gain = 0.12 } = {}) {
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/**
 * "Toc" breve al marcar (agudo) o desmarcar (grave) una casilla.
 * Con el grano de maíz suena un doble "tic" seco, como un grano que rebota sobre el cartón.
 */
export function playMark(marked = true, marker = 'chip') {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  if (marked && marker === 'corn') {
    tone(ac, 1500, t, 0.035, { type: 'square', gain: 0.05 });
    tone(ac, 1150, t + 0.07, 0.04, { type: 'square', gain: 0.035 });
    return;
  }
  tone(ac, marked ? 880 : 520, t, 0.09, { type: 'triangle', gain: 0.1 });
}

/** Aviso positivo: un cartón acaba de completar el patrón y el botón ¡Bingo! se habilitó. */
export function playReady() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 784, t, 0.14, { type: 'sine', gain: 0.12 });
  tone(ac, 1175, t + 0.12, 0.22, { type: 'sine', gain: 0.12 });
}

/** Fanfarria corta de victoria: arpegio mayor ascendente. */
export function playWin() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, t + i * 0.11, 0.28, { type: 'triangle', gain: 0.14 }));
  tone(ac, 1046.5, t + 0.48, 0.6, { type: 'sine', gain: 0.1 });
}

/**
 * Alerta para administración cuando alguien canta ¡Bingo!: tres timbres insistentes.
 * Suena aunque el jugador haya silenciado los efectos en este navegador (es un aviso operativo).
 */
export function playAdminAlert() {
  const ac = audio(true);
  if (!ac) return;
  const t = ac.currentTime;
  [0, 0.32, 0.64].forEach((d) => {
    tone(ac, 880, t + d, 0.16, { type: 'square', gain: 0.08 });
    tone(ac, 1320, t + d + 0.14, 0.16, { type: 'square', gain: 0.08 });
  });
}
