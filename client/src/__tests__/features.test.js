import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { splitForSpeech } from '../components/accessibility/useSpeech';
import { errorMessage } from '../lib/format';
import { AGE_NOTE, MOTORCYCLE_REQUIREMENT, PAYMENT_DETAIL, SITE } from '../config/site';
import { eventDateLabel, eventPlace, eventTimeLabel } from '../components/event/EventCountdown';
import { LEGAL_DOCS } from '../config/legal';
import { MAIN_PRIZE } from '../config/prizes';

describe('lectura en voz alta', () => {
  it('divide el texto en frases cortas sin perder contenido', () => {
    const text = 'Hola. ¿Cómo estás?   Bien!\nNueva línea sin punto';
    expect(splitForSpeech(text)).toEqual(['Hola.', '¿Cómo estás?', 'Bien!', 'Nueva línea sin punto']);
  });

  it('corta las frases muy largas en trozos de máximo 220 caracteres por espacios', () => {
    const long = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
    const chunks = splitForSpeech(long);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 220)).toBe(true);
    expect(chunks.join(' ')).toBe(long);
  });
});

describe('mensajes de error de sanciones', () => {
  it('incluye la fecha de fin de una suspensión', () => {
    const msg = errorMessage({ response: { data: { error: 'ACCOUNT_SUSPENDED', until: '2026-11-20T18:00:00.000Z' } } });
    expect(msg).toMatch(/suspendida hasta el/);
    expect(msg).toMatch(/2026/);
  });

  it('usa el texto de respaldo para errores desconocidos', () => {
    expect(errorMessage({ response: { data: { error: 'OTRO' } } }, 'Respaldo')).toBe('Respaldo');
  });
});

describe('datos del evento (vienen del panel, no del código)', () => {
  const event = { startsAt: '2026-11-15T19:00:00.000Z', venue: 'Salón de Eventos de Tinamaste', venueArea: 'Higuito' };

  it('muestra fecha y hora de Costa Rica', () => {
    expect(eventDateLabel(event.startsAt)).toMatch(/^Domingo, 15 de noviembre de 2026$/);
    expect(eventTimeLabel(event.startsAt)).toMatch(/^1:00\s?p\.\s?m\.$/);
  });

  it('arma el lugar solo con lo configurado', () => {
    expect(eventPlace(event)).toBe('Salón de Eventos de Tinamaste, Higuito');
    expect(eventPlace({ venue: '', venueArea: '' })).toBe('');
    expect(eventPlace(null)).toBe('');
  });

  it('el premio mayor es la motocicleta', () => {
    expect(MAIN_PRIZE.title).toBe('Motocicleta');
  });
});

describe('textos legales', () => {
  const pagesDir = path.resolve(__dirname, '../content/legal');
  const legalFiles = ['terminos', 'privacidad', 'reglamento', 'contingencias', 'propiedadIntelectual', 'edad', 'impuestos', 'pagosSinpe', 'navegador'];
  const sources = legalFiles.map((f) => fs.readFileSync(path.join(pagesDir, `${f}.jsx`), 'utf8'));

  it('no usan el eslogan prohibido', () => {
    for (const src of sources) expect(src.toLowerCase()).not.toMatch(/pura\s+vida/);
  });

  it('el pie y el índice enlazan los nueve documentos, con la pestaña "Privacidad" sin nombres de leyes', () => {
    expect(LEGAL_DOCS).toHaveLength(9);
    expect(LEGAL_DOCS.find((d) => d.id === 'privacy').short).toBe('Privacidad');
    for (const d of LEGAL_DOCS) expect(d.short).not.toMatch(/Ley/);
  });

  it('el reglamento incluye el requisito de la motocicleta, la nota de edad y la cédula o DIMEX', () => {
    const rules = sources[legalFiles.indexOf('reglamento')];
    expect(rules).toMatch(/MOTORCYCLE_REQUIREMENT/);
    expect(rules).toMatch(/AGE_NOTE/);
    expect(rules).toMatch(/DIMEX/);
  });

  it('usa los textos exactos aprobados por la Asociación', () => {
    expect(MOTORCYCLE_REQUIREMENT).toBe(
      'Para el retiro de la motocicleta se requiere presentar cédula física al día y licencia de conducir vigente de la persona ganadora mayor de edad o de su representante legal, según la legislación de Costa Rica.'
    );
    expect(AGE_NOTE).toMatch(/^Las cuentas las registran personas mayores de 18 años/);
    expect(AGE_NOTE).toMatch(/se debe ser mayor de edad o contar con un tutor legal que represente/);
    // La versión anterior ("no es exclusivo para mayores de edad") contradecía la regla de cuentas solo para adultos.
    for (const src of sources) expect(src).not.toMatch(/no es exclusivo para mayores/);
  });

  it('no menciona una cédula jurídica "pendiente"', () => {
    for (const src of sources) expect(src).not.toMatch(/pendiente de publicar/);
    expect(SITE.legalId).not.toMatch(/pendiente/);
  });

  it('el procedimiento SINPE pide la palabra Bingo y la política de edad cita al tutor legal', () => {
    expect(sources[legalFiles.indexOf('pagosSinpe')]).toMatch(/PAYMENT_DETAIL/);
    expect(sources[legalFiles.indexOf('edad')]).toMatch(/ADULT_PRIZES_NOTE/);
  });

  it('la política de privacidad cita la Ley 8968', () => {
    expect(sources[legalFiles.indexOf('privacidad')]).toMatch(/Ley N\.° 8968/);
  });
});

describe('compra solo con sesión y pagos', () => {
  const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

  it('el aviso para invitados usa el texto aprobado y el catálogo lo muestra antes de elegir o comprar', () => {
    expect(read('components/auth/LoginRequiredDialog.jsx')).toMatch(
      'Para comprar y reservar tus cartones debes Iniciar sesión o Crear una cuenta gratis'
    );
    const catalog = read('pages/public/CatalogPage.jsx');
    expect(catalog).toMatch(/if \(!isAuthenticated\) \{\s*setAskLogin\(true\);\s*return;/);
    expect(catalog).toMatch(/<LoginRequiredDialog/);
  });

  it('el detalle obligatorio del SINPE es "Bingo"', () => {
    expect(PAYMENT_DETAIL).toBe('Bingo');
  });
});
