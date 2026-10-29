import { PATHS } from '../routing/paths';

/** Documentos del Centro Legal: pestañas, pie de página y sitemap. `short` es la etiqueta de la pestaña. */
export const LEGAL_DOCS = Object.freeze([
  { id: 'terms', to: PATHS.terms, short: 'Términos', label: 'Términos, aviso legal e información corporativa' },
  { id: 'privacy', to: PATHS.privacy, short: 'Privacidad', label: 'Privacidad y protección de datos' },
  { id: 'rules', to: PATHS.rules, short: 'Reglamento', label: 'Reglamento del juego, pagos y premios' },
  { id: 'contingencies', to: PATHS.contingencies, short: 'Devoluciones', label: 'Devoluciones, contingencias y antifraude' },
  { id: 'intellectualProperty', to: PATHS.intellectualProperty, short: 'Imagen', label: 'Derecho de imagen y propiedad intelectual' },
  { id: 'age', to: PATHS.age, short: 'Edad y tutoría legal', label: 'Restricción de edad y tutoría legal' },
  { id: 'taxes', to: PATHS.taxes, short: 'Retención de impuestos', label: 'Retención de impuestos sobre premios' },
  { id: 'sinpe', to: PATHS.sinpe, short: 'Pagos SINPE', label: 'Procedimiento de pago por SINPE Móvil y transferencia' },
  { id: 'cookies', to: PATHS.cookies, short: 'Cookies', label: 'Política de cookies' },
]);
