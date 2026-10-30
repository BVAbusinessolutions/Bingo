// Juego en vivo de punta a punta con sockets reales: transmisión, bolas, ¡Bingo!, alerta al admin y resultados.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as connectSocket } from 'socket.io-client';
import { ADMIN, CLIENTE, DEMO_EVENT_ID, api, auth, login, startApp, stopApp } from './helpers.js';
import { registerAdminSocket, registerUserSocket } from '../src/realtime.js';
import { registerDrawSocket } from '../src/modules/draw/draw.js';

let server;
let ioServer;
let base;
let admin;
let player;
const sockets = [];

before(async () => {
  const app = await startApp();
  server = http.createServer(app);
  ioServer = new Server(server);
  registerDrawSocket(ioServer);
  registerAdminSocket(ioServer);
  registerUserSocket(ioServer);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
  admin = (await login(...ADMIN)).token;
  player = (await login(...CLIENTE)).token;
});

after(async () => {
  sockets.forEach((s) => s.disconnect());
  ioServer.close();
  await new Promise((resolve) => server.close(resolve));
  await stopApp();
});

const open = (namespace, token) =>
  new Promise((resolve, reject) => {
    const s = connectSocket(`${base}${namespace}`, { auth: { token }, transports: ['websocket'], forceNew: true });
    sockets.push(s);
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });

/** Espera el próximo mensaje `event` que cumpla `match` (falla a los 3 s). */
const next = (socket, event, match = () => true) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`sin "${event}" a tiempo`)), 3000);
    const handler = (payload) => {
      if (!match(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });

const patchEvent = (body) => api().patch(`/api/admin/events/${DEMO_EVENT_ID}`).set(auth(admin)).send(body);
const call = (number) => api().post(`/api/events/${DEMO_EVENT_ID}/draw/call`).set(auth(admin)).send({ number });
const claim = (cardId) => api().post(`/api/events/${DEMO_EVENT_ID}/claims`).set(auth(player)).send({ cardId });

describe('juego en vivo con transmisión', () => {
  let draw;
  let cards;

  it('los sockets exigen sesión', async () => {
    await assert.rejects(open('/draw', 'token-falso'));
    await assert.rejects(open('/admin', player), 'un cliente no entra al canal de administración');
  });

  it('no se puede cantar ¡Bingo! antes de que el sorteo esté en vivo', async () => {
    cards = (await api().get(`/api/events/${DEMO_EVENT_ID}/cards/mine`).set(auth(player))).body.cards;
    assert.ok(cards.length >= 2, 'la cuenta demo tiene cartones');
    assert.equal((await claim(cards[0].id)).body.error, 'EVENT_NOT_LIVE');
  });

  it('el jugador recibe el estado con la transmisión al unirse', async () => {
    await patchEvent({ status: 'LIVE', stream: { provider: 'youtube', videoId: 'https://youtu.be/jfKfPfyJRdk' } });
    draw = await open('/draw', player);
    const state = next(draw, 'draw:state');
    draw.emit('event:join', DEMO_EVENT_ID);
    const { event, called } = await state;
    assert.equal(event.status, 'LIVE');
    assert.deepEqual(event.stream, { provider: 'youtube', videoId: 'jfKfPfyJRdk' });
    assert.deepEqual(called, []);
  });

  it('si la administración cambia la fuente, el jugador la recibe al instante (sin recargar)', async () => {
    const facebook = { provider: 'facebook', url: 'https://www.facebook.com/hogarsol/videos/123456789/' };
    const update = next(draw, 'draw:state', (s) => s.event?.stream?.provider === 'facebook');
    assert.equal((await patchEvent({ stream: facebook })).status, 200);
    assert.deepEqual((await update).event.stream, facebook);

    const hls = { provider: 'hls', url: 'https://stream.example.com/live/bingo.m3u8' };
    const update2 = next(draw, 'draw:state', (s) => s.event?.stream?.provider === 'hls');
    assert.equal((await patchEvent({ stream: hls })).status, 200);
    assert.deepEqual((await update2).event.stream, hls);
  });

  it('cada bola cantada llega en tiempo real y no se puede repetir ni salir de 1 a 75', async () => {
    const [first] = cards[0].grid.flat().filter(Boolean);
    const update = next(draw, 'draw:state', (s) => s.called.includes(first));
    assert.equal((await call(first)).status, 200);
    assert.deepEqual((await update).called, [first]);
    assert.equal((await call(first)).status, 409, 'bola repetida');
    assert.equal((await call(76)).status, 400, 'fuera de rango');
  });

  it('¡Bingo! con el cartón incompleto se rechaza; completo avisa al admin con la modalidad', async () => {
    const [winner] = cards;
    assert.equal((await claim(winner.id)).body.error, 'NOT_A_WINNER');

    const adminSocket = await open('/admin', admin);
    const userSocket = await open('/user', player);
    for (const n of winner.grid.flat().filter(Boolean)) await call(n).expect((r) => assert.ok([200, 409].includes(r.status)));

    const alert = next(adminSocket, 'claim:new');
    const res = await claim(winner.id);
    assert.equal(res.status, 201);
    const payload = await alert;
    assert.equal(payload.serial, winner.serial);
    assert.equal(payload.patternLabel, 'Cartón lleno');
    assert.equal(payload.player.email, CLIENTE[0]);

    // La administración confirma y el jugador recibe la decisión por su canal privado.
    const decision = next(userSocket, 'claim:updated', (c) => c.id === res.body.id);
    await api().post(`/api/admin/claims/${res.body.id}/decision`).set(auth(admin)).send({ approve: true });
    assert.equal((await decision).status, 'CONFIRMED');

    const results = (await api().get('/api/events/results')).body;
    const live = results.find((e) => e.id === DEMO_EVENT_ID);
    assert.ok(live.winners.some((w) => w.serial === winner.serial));
  });

  it('deshacer la última bola también se difunde', async () => {
    const before = (await api().get(`/api/events/${DEMO_EVENT_ID}/draw`).set(auth(player))).body.called.length;
    const update = next(draw, 'draw:state', (s) => s.called.length === before - 1);
    assert.equal((await api().post(`/api/events/${DEMO_EVENT_ID}/draw/undo`).set(auth(admin))).status, 200);
    await update;
  });
});
