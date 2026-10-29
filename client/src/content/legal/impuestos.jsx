// Retención de impuestos sobre premios. El porcentaje y la base legal aplicables los confirma la
// asesoría contable con la Dirección General de Tributación antes del evento (ver docs/LEGAL-REVISION.md).
import { PATHS } from '../../routing/paths';
import { ContactEmail } from '../../components/layout/LegalLayout';
import { SITE } from '../../config/site';

const SECTIONS = [
  {
    title: 'Marco legal',
    body: (
      <p>
        Los premios de sorteos pueden estar sujetos a obligaciones tributarias según la Ley del Impuesto sobre la Renta N.° 7092, su
        reglamento y las resoluciones de la Dirección General de Tributación del Ministerio de Hacienda. La condición benéfica de la{' '}
        {SITE.name} no exime por sí sola a la persona ganadora de esas obligaciones.
      </p>
    ),
  },
  {
    title: 'Cuándo se retiene',
    body: (
      <ul>
        <li>
          Si la normativa obliga a retener un impuesto sobre el premio, la Asociación actúa como agente retenedor y lo hace al momento de
          la entrega.
        </li>
        <li>
          En premios en especie, como la motocicleta, la base es el valor del bien según la factura de compra de la Asociación. Si
          corresponde retener, el monto se paga antes de la entrega y no se descuenta del bien.
        </li>
        <li>Si el premio está exento o no corresponde retención, se indica por escrito a la persona ganadora.</li>
      </ul>
    ),
  },
  {
    title: 'Qué recibe la persona ganadora',
    body: (
      <ul>
        <li>
          <strong>Antes de la entrega:</strong> el monto, el porcentaje y la base legal de la retención, si la hay.
        </li>
        <li>
          <strong>En la entrega:</strong> el comprobante de la retención y el acta de entrega firmada.
        </li>
        <li>
          <strong>Después:</strong> la Asociación declara los premios entregados y las retenciones ante el Ministerio de Hacienda cuando la
          normativa lo exige.
        </li>
      </ul>
    ),
  },
  {
    title: 'Otros costos del premio mayor',
    body: (
      <p>
        Los gastos de traspaso e inscripción en el Registro Nacional, el derecho de circulación (marchamo) y el seguro obligatorio de la
        motocicleta corren por cuenta de la persona ganadora, salvo que el anuncio del premio indique que los cubre la Asociación.
      </p>
    ),
  },
  {
    title: 'Consultas',
    body: (
      <p>
        Para dudas sobre la retención de un premio escríbenos a <ContactEmail />.
      </p>
    ),
  },
];

const DOC = {
  id: 'taxes',
  path: PATHS.taxes,
  title: 'Retención de impuestos sobre premios',
  intro: 'Cuándo se retiene un impuesto sobre un premio, cómo se calcula y qué comprobantes recibe la persona ganadora.',
  sections: SECTIONS,
};

export default DOC;
