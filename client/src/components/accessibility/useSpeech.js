import { useCallback, useEffect, useState } from 'react';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

// Chrome corta las frases muy largas: se lee por trozos de hasta ~220 caracteres, cortando en signos de puntuación.
const MAX_CHUNK = 220;

export function splitForSpeech(text) {
  // Cada línea (título, elemento de lista) es su propia frase; dentro de la línea se corta en la puntuación.
  const sentences = text
    .split(/\n+/)
    .flatMap((line) => line.replace(/\s+/g, ' ').match(/[^.!?:;]+[.!?:;]*/g) ?? []);
  const chunks = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length <= MAX_CHUNK) {
      chunks.push(s);
      continue;
    }
    let rest = s;
    while (rest.length > MAX_CHUNK) {
      const cut = rest.lastIndexOf(' ', MAX_CHUNK);
      const at = cut > 40 ? cut : MAX_CHUNK;
      chunks.push(rest.slice(0, at));
      rest = rest.slice(at).trim();
    }
    if (rest) chunks.push(rest);
  }
  return chunks;
}

/** Voz en español, preferentemente de Costa Rica o Latinoamérica. */
function spanishVoice() {
  const voices = synth?.getVoices() ?? [];
  return (
    voices.find((v) => v.lang === 'es-CR') ??
    voices.find((v) => /^es-(419|MX|US|CO)/.test(v.lang)) ??
    voices.find((v) => v.lang?.startsWith('es'))
  );
}

/** Lectura en voz alta del contenido principal de la página (Web Speech API del navegador, sin servicios externos). */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    synth?.cancel();
    setSpeaking(false);
  }, []);

  const readPage = useCallback(() => {
    if (!synth) return;
    synth.cancel();
    const main = document.getElementById('contenido') ?? document.querySelector('main') ?? document.body;
    const chunks = splitForSpeech(main.innerText ?? '');
    if (!chunks.length) return;
    const voice = spanishVoice();
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = voice?.lang ?? 'es-CR';
      if (voice) u.voice = voice;
      u.rate = 0.95;
      if (i === chunks.length - 1) u.onend = () => setSpeaking(false);
      // "interrupted"/"canceled" llegan al cancelar una lectura anterior: no deben apagar la nueva.
      u.onerror = (e) => !['interrupted', 'canceled'].includes(e.error) && setSpeaking(false);
      synth.speak(u);
    });
    setSpeaking(true);
  }, []);

  useEffect(() => () => synth?.cancel(), []);

  return { supported: Boolean(synth), speaking, readPage, stop };
}
