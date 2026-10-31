import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, CLIENTE, DEMO_EVENT_ID, api, auth, login, startApp, stopApp } from './helpers.js';
import { PATTERNS, PATTERN_IDS, missingFor } from '../src/domain/bingo.js';

let admin;
let client;
before(async () => {
  await startApp();
  admin = (await login(...ADMIN)).token;
  client = await login(...CLIENTE);
});
after(stopApp);

const draw = (path) => `/api/events/${DEMO_EVENT_ID}/draw${path}`;
const call = (number) => api().post(draw('/call')).set(auth(admin)).send({ number });
const claim = (cardId) => api().post(`/api/events/${DEMO_EVENT_ID}/claims`).set(auth(client.token)).send({ cardId });
const cell = (grid, cells) => cells.map(([r, c]) => grid[r][c]).filter(Boolean);

describe('modalidades de juego', () => {
  it('cada modalidad tiene casillas únicas y la cantidad correcta (el centro libre cuenta solo)', () => {
    const sizes = { LINE: 5, TWO_LINES: 10, FOUR_CORNERS: 4, X: 9, PLUS: 9, T: 9, L: 9, FRAME: 16, INNER_SQUARE: 9, FULL: 25 };
    assert.deepEqual(PATTERN_IDS, Object.keys(sizes));
    for (const id of PATTERN_IDS) {
      for (const group of PATTERNS[id]) {
        assert.equal(new Set(group.map(([r, c]) => `${r}-${c}`)).size, group.length, `${id} sin repetidas`);
      }
      assert.equal(PATTERNS[id][0].length, sizes[id], id);
    }
  });

  it('"faltan" no cuenta dos veces la casilla compartida de la T', () => {
    const grid = [
      [1, 16, 31, 46, 61],
      [2, 17, 32, 47, 62],
      [3, 18, null, 48, 63],
      [4, 19, 34, 49, 64],
      [5, 20, 35, 50, 65],
    ];
    assert.equal(missingFor(grid, new Set(), 'T'), 8); // 5 de la fila + 4 de la columna N - centro libre
    assert.equal(missingFor(grid, new Set([1, 16, 31, 46, 61, 32, 34, 35]), 'T'), 0);
  });
});

describe('rondas en Bingo Master', () => {
  let card;
  before(async () => {
    [card] = (await api().get(`/api/events/${DEMO_EVENT_ID}/cards/mine`).set(auth(client.token))).body.cards;
  });

  it('solo la administración elige la modalidad; llega a los jugadores en el estado del sorteo', async () => {
    assert.equal((await api().put(draw('/pattern')).set(auth(client.token)).send({ pattern: 'PLUS' })).status, 403);
    assert.equal((await api().put(draw('/pattern')).set(auth(admin)).send({ pattern: 'INVENTADA' })).status, 400);
    const res = await api().put(draw('/pattern')).set(auth(admin)).send({ pattern: 'PLUS' });
    assert.equal(res.status, 200);
    assert.equal(res.body.event.pattern, 'PLUS');
    assert.equal(res.body.event.round, 1);
    const state = (await api().get(draw('')).set(auth(client.token))).body;
    assert.equal(state.event.pattern, 'PLUS');
  });

  it('la ronda 1 se gana con la Cruz y, ya empezada, su modalidad no se puede cambiar', async () => {
    const plus = cell(card.grid, PATTERNS.PLUS[0]);
    for (const n of plus.slice(0, -1)) assert.equal((await call(n)).status, 200);
    assert.equal((await api().put(draw('/pattern')).set(auth(admin)).send({ pattern: 'FULL' })).body.error, 'ROUND_STARTED');
    assert.equal((await claim(card.id)).body.error, 'NOT_A_WINNER');
    await call(plus.at(-1));
    const won = await claim(card.id);
    assert.equal(won.status, 201);
    assert.equal(won.body.round, 1);
    assert.equal(won.body.pattern, 'PLUS');
  });

  it('una ronda nueva vacía el tablero, cambia la modalidad y el mismo cartón puede volver a ganar', async () => {
    const next = await api().post(draw('/round')).set(auth(admin)).send({ pattern: 'FOUR_CORNERS' });
    assert.equal(next.status, 201);
    assert.deepEqual(next.body.called, []);
    assert.equal(next.body.event.round, 2);
    assert.equal(next.body.event.pattern, 'FOUR_CORNERS');
    // Sin bolas en la ronda 2 no se abre otra: primero se juega esta.
    assert.equal((await api().post(draw('/round')).set(auth(admin)).send({ pattern: 'X' })).body.error, 'ROUND_NOT_STARTED');

    // Una bola que ya salió en la ronda 1 puede volver a salir en la 2.
    const corners = cell(card.grid, PATTERNS.FOUR_CORNERS[0]);
    for (const n of corners) assert.equal((await call(n)).status, 200);
    const again = await claim(card.id);
    assert.equal(again.status, 201, 'el reclamo de la ronda 1 no bloquea la ronda 2');
    assert.equal(again.body.round, 2);
    assert.equal(again.body.pattern, 'FOUR_CORNERS');
    // Deshacer solo afecta la ronda actual.
    const undo = await api().post(draw('/undo')).set(auth(admin));
    assert.deepEqual(undo.body.called, corners.slice(0, -1));
  });

  it('el historial muestra cada ronda con su modalidad, bolas y si es la actual', async () => {
    const rounds = (await api().get(draw('/rounds')).set(auth(admin))).body;
    assert.deepEqual(
      rounds.map(({ round, pattern, current }) => ({ round, pattern, current })),
      [
        { round: 1, pattern: 'PLUS', current: false },
        { round: 2, pattern: 'FOUR_CORNERS', current: true },
      ]
    );
    assert.equal(rounds[0].called, cell(card.grid, PATTERNS.PLUS[0]).length);
    assert.equal((await api().get(draw('/rounds')).set(auth(client.token))).status, 403);
  });
});

describe('visitas y presencia reales', () => {
  const ping = (tab) => api().post(`/api/site/ping?tab=${tab}`).set('X-Requested-With', 'XMLHttpRequest');
  const live = async () => (await api().get('/api/admin/live-panel').set(auth(admin))).body;

  it('cuenta pestañas abiertas, las quita al cerrarse y no acepta latidos de otros sitios', async () => {
    const before = (await live()).online;
    assert.equal((await ping('tab-aaaa-1111')).status, 204);
    assert.equal((await ping('tab-aaaa-1111')).status, 204); // la misma pestaña no suma dos veces
    assert.equal((await ping('tab-bbbb-2222')).status, 204);
    assert.equal((await live()).online, before + 2);
    assert.equal((await api().post('/api/site/ping?tab=tab-cccc-3333')).status, 403, 'sin X-Requested-With');
    assert.equal((await ping('<script>')).status, 400);
    assert.equal((await api().post('/api/site/ping/bye?tab=tab-aaaa-1111')).status, 204);
    assert.equal((await live()).online, before + 1);
  });

  it('las visitas del día y la serie de 14 días salen de la base, sin datos inventados', async () => {
    const before = await live();
    await api().post('/api/site/hello').set('X-Requested-With', 'XMLHttpRequest');
    assert.equal((await live()).visitsToday, before.visitsToday + 1);
    const stats = (await api().get(`/api/admin/events/${DEMO_EVENT_ID}/stats`).set(auth(admin))).body;
    assert.equal(stats.visitsByDay.length, 14);
    assert.equal(stats.visitsByDay.at(-1).visits, stats.visitsToday);
    assert.equal(stats.visitsByDay.reduce((sum, d) => sum + d.visits, 0), stats.visitsTotal);
    assert.equal(typeof stats.online, 'number');
    assert.equal(typeof stats.playersLive, 'number');
  });
});
