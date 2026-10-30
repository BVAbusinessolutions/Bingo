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

function audio() {
  if (!isSoundOn()) return null;
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

/** "Toc" breve al marcar (agudo) o desmarcar (grave) una casilla. */
export function playMark(marked = true) {
  const ac = audio();
  if (!ac) return;
  tone(ac, marked ? 880 : 520, ac.currentTime, 0.09, { type: 'triangle', gain: 0.1 });
}

/** Fanfarria corta de victoria: arpegio mayor ascendente. */
export function playWin() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, t + i * 0.11, 0.28, { type: 'triangle', gain: 0.14 }));
  tone(ac, 1046.5, t + 0.48, 0.6, { type: 'sine', gain: 0.1 });
}
