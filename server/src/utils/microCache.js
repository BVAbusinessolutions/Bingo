/**
 * Caché en memoria de muy corta duración para lecturas públicas que piden cientos de jugadores a la vez
 * (evento actual, catálogo de cartones). Dentro de la ventana todos reciben el mismo resultado y las
 * peticiones simultáneas comparten una sola consulta. Las escrituras llaman a invalidate() para que el
 * cambio se vea de inmediato; el TTL solo acota el peor caso si alguna escritura no invalida.
 *
 * Es por proceso: con una sola instancia del servidor (Render) basta. Si se escala a varias, cada una
 * guarda su copia y el desfase máximo sigue siendo el TTL.
 */
export function microCache(ttlMs) {
  const entries = new Map(); // key -> { at, value } | { promise }
  let generation = 0; // invalidate() durante una consulta en curso evita guardar su resultado viejo

  async function get(key, load) {
    const hit = entries.get(key);
    if (hit?.promise) return hit.promise;
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    const startedAt = generation;
    const record = {};
    // Solo toca la entrada si sigue siendo la suya: tras invalidate() puede haber otra consulta en curso.
    const own = () => entries.get(key) === record;
    record.promise = load().then(
      (value) => {
        if (own()) {
          if (startedAt === generation) entries.set(key, { at: Date.now(), value });
          else entries.delete(key);
        }
        return value;
      },
      (err) => {
        if (own()) entries.delete(key);
        throw err;
      }
    );
    entries.set(key, record);
    return record.promise;
  }

  function invalidate() {
    generation += 1;
    entries.clear();
  }

  return { get, invalidate };
}

/** Caché compartida de lecturas públicas de eventos y cartones (2 s). */
export const publicReads = microCache(2_000);
