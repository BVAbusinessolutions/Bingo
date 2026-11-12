// Transmisión de respaldo y reportes de cortes de video desde el reproductor de los jugadores.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, DEMO_EVENT_ID, api, auth, login, startApp, stopApp } from './helpers.js';

let admin;

before(async () => {
  await startApp();
  admin = (await login(...ADMIN)).token;
});
after(stopApp);

const patch = (body) => api().patch(`/api/admin/events/${DEMO_EVENT_ID}`).set(auth(admin)).send(body);
const current = async () => (await api().get('/api/events/current')).body;

describe('transmisión de respaldo', () => {
  it('se guarda, se publica a los jugadores y se borra con null', async () => {
    const res = await patch({
      stream: { provider: 'youtube', videoId: 'jfKfPfyJRdk' },
      streamBackup: { provider: 'twitch', videoId: 'https://www.twitch.tv/hogarsol' },
    });
    assert.equal(res.status, 200);
    assert.deepEqual((await current()).streamBackup, { provider: 'twitch', videoId: 'hogarsol' });

    // Editar solo la principal no toca el respaldo.
    assert.equal((await patch({ stream: { provider: 'youtube', videoId: 'abcdefghijk' } })).status, 200);
    assert.deepEqual((await current()).streamBackup, { provider: 'twitch', videoId: 'hogarsol' });

    assert.equal((await patch({ streamBackup: null })).status, 200);
    assert.equal((await current()).streamBackup, null);
  });

  it('TikTok y orígenes fuera de STREAM_ORIGINS no sirven de respaldo', async () => {
    assert.equal((await patch({ streamBackup: { provider: 'tiktok', url: '@hogarsol' } })).status, 400);
    assert.equal((await patch({ streamBackup: { provider: 'hls', url: 'https://malo.example/live.m3u8' } })).status, 400);
  });
});

describe('reportes de cortes de video', () => {
  const report = (tab, body) => api().post(`/api/site/player?tab=${tab}`).set('X-Requested-With', 'XMLHttpRequest').send(body);
  const issues = async () => (await api().get('/api/admin/live-panel').set(auth(admin))).body.streamIssues;

  it('el panel cuenta pestañas distintas por tipo de problema', async () => {
    const before = await issues();
    assert.equal((await report('tab-video-0001', { kind: 'error', provider: 'whep', detail: 'webrtc-failed' })).status, 204);
    assert.equal((await report('tab-video-0001', { kind: 'error', provider: 'whep' })).status, 204); // misma pestaña: una sola
    assert.equal((await report('tab-video-0002', { kind: 'error', provider: 'hls' })).status, 204);
    assert.equal((await report('tab-video-0002', { kind: 'fallback', provider: 'hls' })).status, 204);
    const now = await issues();
    assert.equal(now.error, before.error + 2);
    assert.equal(now.fallback, before.fallback + 1);
  });

  it('rechaza reportes de otros sitios y datos inválidos', async () => {
    assert.equal((await api().post('/api/site/player?tab=tab-video-0003').send({ kind: 'error', provider: 'hls' })).status, 403);
    assert.equal((await report('tab-video-0003', { kind: 'otro', provider: 'hls' })).status, 400);
    assert.equal((await report('<script>', { kind: 'error', provider: 'hls' })).status, 400);
  });
});
