import { describe, expect, it } from 'vitest';
import { streamSource } from '../components/player/streamSource';
import { MAIN_LINKS } from '../config/navigation';

describe('barra de navegación', () => {
  it('solo tiene Inicio, Comprar cartones y Contacto (Premios, Resultados y Reglamento van en portada y pie)', () => {
    expect(MAIN_LINKS.map((l) => l.label)).toEqual(['Inicio', 'Comprar cartones', 'Contacto']);
  });
});

describe('fuentes de transmisión', () => {
  it('YouTube y Vimeo usan su reproductor oficial con el id del video', () => {
    expect(streamSource({ provider: 'youtube', videoId: 'jfKfPfyJRdk' })).toEqual({
      kind: 'iframe',
      src: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&playsinline=1',
    });
    expect(streamSource({ provider: 'vimeo', videoId: '76979871' }).src).toMatch(/^https:\/\/player\.vimeo\.com\/video\/76979871/);
  });

  it('Twitch indica el dominio del sitio, como exige su reproductor', () => {
    expect(streamSource({ provider: 'twitch', videoId: 'hogarsol' }, 'bingo.hogarsol.org').src).toContain('parent=bingo.hogarsol.org');
  });

  it('Facebook Live pasa la URL codificada al reproductor oficial y rechaza otros dominios', () => {
    const url = 'https://www.facebook.com/hogarsol/videos/123456789/';
    expect(streamSource({ provider: 'facebook', url }).src).toBe(
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=true&width=1280`
    );
    expect(streamSource({ provider: 'facebook', url: 'https://evil.example/facebook.com/x' })).toBeNull();
    expect(streamSource({ provider: 'facebook', url: 'javascript:alert(1)' })).toBeNull();
  });

  it('Kick usa su reproductor oficial con el nombre del canal', () => {
    expect(streamSource({ provider: 'kick', videoId: 'hogarsol' })).toEqual({
      kind: 'iframe',
      src: 'https://player.kick.com/hogarsol?autoplay=true&muted=true',
    });
    expect(streamSource({ provider: 'kick', videoId: 'a/b' })).toBeNull();
  });

  it('TikTok LIVE no se incrusta: solo da el enlace al directo de tiktok.com', () => {
    const url = 'https://www.tiktok.com/@hogarsol/live';
    expect(streamSource({ provider: 'tiktok', url })).toEqual({ kind: 'external', href: url });
    expect(streamSource({ provider: 'tiktok', url: 'https://evil.example/@hogarsol/live' })).toBeNull();
    expect(streamSource({ provider: 'tiktok', url: 'javascript:alert(1)' })).toBeNull();
  });

  it('HLS y WebRTC usan el reproductor propio solo con https', () => {
    expect(streamSource({ provider: 'hls', url: 'https://stream.example.com/live.m3u8' })).toEqual({ kind: 'lowLatency' });
    expect(streamSource({ provider: 'whep', url: 'http://stream.example.com/whep' })).toBeNull();
  });

  it('ids con caracteres peligrosos, proveedores desconocidos o sin transmisión no generan reproductor', () => {
    expect(streamSource({ provider: 'youtube', videoId: '"><script>' })).toBeNull();
    expect(streamSource({ provider: 'otro', videoId: 'abc123' })).toBeNull();
    expect(streamSource({})).toBeNull();
    expect(streamSource()).toBeNull();
  });
});
