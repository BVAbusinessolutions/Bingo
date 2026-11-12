/**
 * Prueba de carga del sorteo en vivo: abre N conexiones de Socket.io a /draw como si fueran jugadores, se une
 * al evento y mide cuánto tarda cada una en recibir el estado. Solo escucha: no canta bolas ni cambia datos,
 * así que se puede correr contra el entorno de Render antes del evento.
 *
 *   LOAD_URL=https://tu-dominio LOAD_EMAIL=... LOAD_PASSWORD=... npm run load-test --prefix server
 *
 * Variables: LOAD_PLAYERS (500), LOAD_RAMP_MS (tiempo para abrir todas, 20000), LOAD_HOLD_MS (cuánto se quedan
 * conectadas, 120000), LOAD_EVENT (id del evento; por defecto el actual). Usa una cuenta de prueba: todas las
 * conexiones comparten su sesión. Mientras corre, canta bolas desde Bingo Master para medir la difusión.
 */
import { io } from 'socket.io-client';

const BASE = (process.env.LOAD_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const PLAYERS = Number(process.env.LOAD_PLAYERS ?? 500);
const RAMP_MS = Number(process.env.LOAD_RAMP_MS ?? 20_000);
const HOLD_MS = Number(process.env.LOAD_HOLD_MS ?? 120_000);

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.LOAD_EMAIL, password: process.env.LOAD_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${res.status}: ${await res.text()}`);
  return (await res.json()).accessToken;
}

async function currentEventId() {
  if (process.env.LOAD_EVENT) return process.env.LOAD_EVENT;
  const res = await fetch(`${BASE}/api/events/current`);
  if (!res.ok) throw new Error(`no hay evento actual (${res.status})`);
  return (await res.json()).id;
}

const stats = { connected: 0, joinMs: [], connectErrors: 0, disconnects: 0, states: 0, lastBalls: new Map() };

function openPlayer(token, eventId) {
  const started = Date.now();
  const socket = io(`${BASE}/draw`, { auth: { token }, transports: ['websocket'], reconnection: true });
  let joined = false;
  socket.on('connect', () => {
    stats.connected++;
    socket.emit('event:join', eventId);
  });
  socket.on('draw:state', (state) => {
    stats.states++;
    if (!joined) {
      joined = true;
      stats.joinMs.push(Date.now() - started);
    }
    const last = state.called?.at(-1);
    if (last) stats.lastBalls.set(last, (stats.lastBalls.get(last) ?? 0) + 1);
  });
  socket.on('connect_error', () => stats.connectErrors++);
  socket.on('disconnect', () => {
    stats.connected--;
    stats.disconnects++;
  });
  return socket;
}

const report = (label) =>
  console.log(
    `${label} conectados=${stats.connected}/${PLAYERS} unidos=${stats.joinMs.length} ` +
      `p50=${percentile(stats.joinMs, 50)}ms p95=${percentile(stats.joinMs, 95)}ms p99=${percentile(stats.joinMs, 99)}ms ` +
      `errores=${stats.connectErrors} desconexiones=${stats.disconnects} estados=${stats.states}`
  );

const token = await login();
const eventId = await currentEventId();
console.log(`Abriendo ${PLAYERS} jugadores contra ${BASE} (evento ${eventId}) en ${RAMP_MS / 1000}s…`);

const sockets = [];
for (let i = 0; i < PLAYERS; i++) {
  sockets.push(openPlayer(token, eventId));
  await new Promise((r) => setTimeout(r, RAMP_MS / PLAYERS));
}
report('[rampa lista]');
const ticker = setInterval(() => report('[en curso]'), 10_000);
await new Promise((r) => setTimeout(r, HOLD_MS));
clearInterval(ticker);
report('[final]');
if (stats.lastBalls.size) {
  console.log('Jugadores que recibieron cada bola cantada durante la prueba:');
  for (const [ball, n] of stats.lastBalls) console.log(`  bola ${ball}: ${n}`);
}
// Criterio de aprobación: todas unidas, p95 por debajo de 2 s y sin desconexiones inesperadas.
const ok = stats.joinMs.length === PLAYERS && percentile(stats.joinMs, 95) < 2000 && stats.disconnects === 0;
for (const s of sockets) s.close();
console.log(ok ? 'RESULTADO: OK' : 'RESULTADO: REVISAR (ver cifras arriba)');
process.exit(ok ? 0 : 1);
