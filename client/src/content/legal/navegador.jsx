import { PATHS } from '../../routing/paths';
import { ContactEmail } from '../../components/layout/LegalLayout';
import Button from '../../components/ui/Button';
import { openCookieSettings } from '../../lib/preferenciasPrivacidad';
import { ANALYTICS_PROVIDER } from '../../lib/estadisticas';

const ANALYTICS_DETAIL = {
  ga4: 'Google Analytics 4 (cookies _ga y _ga_*, hasta 2 años). Google recibe tu dirección IP de forma abreviada y datos de navegación anónimos.',
  cloudflare: 'Cloudflare Web Analytics: no usa cookies ni identifica a las personas; solo cuenta visitas de forma agregada.',
};

const SECTIONS = [
  {
    title: 'Qué son las cookies',
    body: (
      <p>
        Son pequeños archivos que un sitio guarda en tu navegador. También usamos el “almacenamiento local” del navegador, que funciona
        parecido. Aquí te contamos cuáles usamos y para qué.
      </p>
    ),
  },
  {
    title: 'Necesarias (siempre activas)',
    body: (
      <ul>
        <li>
          <strong>hs_rt</strong> (cookie, 7 días): mantiene tu sesión iniciada de forma segura. Es <em>HttpOnly</em>: el código de la página
          no puede leerla.
        </li>
        <li>
          <strong>hs-theme, hs-text-size, hs-contrast, hs-motion</strong> (almacenamiento local): tus preferencias de modo día/noche, tamaño
          de letra, contraste y animaciones.
        </li>
        <li>
          <strong>hs-consent</strong> (almacenamiento local): recuerda lo que elegiste en el aviso de cookies.
        </li>
      </ul>
    ),
  },
  {
    title: 'Analítica (opcional)',
    body: (
      <>
        <p>
          Solo si las aceptas, usamos una herramienta de analítica gratuita para saber cuántas personas visitan el sitio y qué secciones se
          usan, y así mejorarlo. No usamos cookies de publicidad ni vendemos esta información.
        </p>
        <p>{ANALYTICS_DETAIL[ANALYTICS_PROVIDER] ?? 'Por ahora no hay ninguna herramienta de analítica activa en el sitio.'}</p>
      </>
    ),
  },
  {
    title: 'Cómo cambiar tu decisión',
    body: (
      <>
        <p>Puedes cambiar tu elección cuando quieras. También puedes borrar las cookies desde la configuración de tu navegador.</p>
        <Button variant="outline" onClick={openCookieSettings}>
          Configurar cookies
        </Button>
        <p>
          Dudas: <ContactEmail />.
        </p>
      </>
    ),
  },
];

const DOC = {
  id: 'cookies',
  path: PATHS.cookies,
  title: 'Política de cookies',
  intro: "Qué cookies y datos guardamos en tu navegador, para qué sirven y cómo cambiar tu decisión.",
  sections: SECTIONS,
};

export default DOC;
