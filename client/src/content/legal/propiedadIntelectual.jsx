// Propiedad intelectual, derecho de imagen y marketing. Revisar con asesoría legal (docs/LEGAL-REVISION.md).
import { PATHS } from '../../routing/paths';
import { ContactEmail } from '../../components/layout/LegalLayout';
import { SITE } from '../../config/site';

const SECTIONS = [
  {
    title: 'Titularidad',
    body: (
      <>
        <p>
          El nombre, el logotipo y los signos distintivos de la <strong>{SITE.name}</strong>, así como el diseño de los cartones, los textos,
          las imágenes, el diseño gráfico del sitio y el software de la plataforma (incluidos sus algoritmos de verificación de bingos,
          asignación de cartones y detección de fraude) son propiedad de la Asociación o se usan con autorización de sus titulares.
        </p>
        <p>
          Están protegidos por la Ley de Derechos de Autor y Derechos Conexos N.° 6683, la Ley de Marcas y Otros Signos Distintivos N.° 7978
          y los tratados internacionales vigentes en Costa Rica.
        </p>
      </>
    ),
  },
  {
    title: 'Usos permitidos y prohibidos',
    body: (
      <>
        <p>Puedes ver el sitio, imprimir tus propios cartones y compartir enlaces a la plataforma. No está permitido, sin autorización escrita:</p>
        <ul>
          <li>Copiar, modificar, distribuir o vender el contenido, el diseño de los cartones o el software.</li>
          <li>Usar el nombre o el logotipo de la Asociación para promocionar productos, rifas o eventos propios.</li>
          <li>Hacer ingeniería inversa, extraer datos de forma automatizada o crear copias del sitio.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Derecho de imagen en el evento',
    body: (
      <>
        <p>
          El evento presencial se graba y se transmite en vivo. Al ingresar al salón o participar en la transmisión, aceptas que tu imagen y
          tu voz puedan aparecer en ella, de forma incidental, con fines de transparencia del sorteo.
        </p>
        <p>
          Conforme al artículo 47 del Código Civil, cualquier otro uso de tu imagen (fotografías o videos en los que aparezcas de forma
          destacada, publicidad de futuros eventos) requiere tu <strong>consentimiento expreso</strong>, que te pediremos por escrito.
        </p>
      </>
    ),
  },
  {
    title: 'Ganadores y testimonios',
    body: (
      <ul>
        <li>
          Con fines de transparencia benéfica, en Resultados se publican el número de cartón ganador, el primer nombre y la inicial del
          apellido. Esto no requiere un consentimiento adicional.
        </li>
        <li>
          La fotografía de la entrega del premio, tu nombre completo o un testimonio solo se publican si firmas una autorización. Puedes
          negarte sin que eso afecte la entrega de tu premio.
        </li>
        <li>Puedes retirar esa autorización en cualquier momento escribiendo a <ContactEmail />; retiraremos el material de nuestros canales.</li>
      </ul>
    ),
  },
  {
    title: 'Reportar un uso indebido',
    body: (
      <p>
        Si ves rifas, perfiles o sitios que usan el nombre de la Asociación sin autorización, o crees que un contenido de este sitio infringe
        tus derechos, escríbenos a <ContactEmail />.
      </p>
    ),
  },
];

const DOC = {
  id: 'intellectualProperty',
  path: PATHS.intellectualProperty,
  title: 'Propiedad intelectual, imagen y marketing',
  intro: "Quién es dueño de la marca, los diseños y el software, y cómo usamos las imágenes del evento y de los ganadores.",
  sections: SECTIONS,
};

export default DOC;
