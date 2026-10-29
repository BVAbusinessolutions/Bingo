// Política de edad y tutoría legal. Debe confirmarla la asesoría legal (ver docs/LEGAL-REVISION.md):
// compatibilidad con el Código de la Niñez y la Adolescencia (Ley N.° 7739) y con el permiso del bingo.
import { PATHS } from '../../routing/paths';
import { ContactEmail } from '../../components/layout/LegalLayout';
import { ADULT_PRIZES_NOTE, AGE_NOTE, MOTORCYCLE_REQUIREMENT } from '../../config/site';

const SECTIONS = [
  {
    title: 'Resumen',
    body: (
      <p>
        <strong>{AGE_NOTE}</strong>
      </p>
    ),
  },
  {
    title: 'Cuentas: solo personas adultas',
    body: (
      <ul>
        <li>
          Las cuentas de la plataforma las registran y administran exclusivamente personas <strong>mayores de 18 años</strong>, con cédula de
          identidad costarricense o DIMEX vigente.
        </li>
        <li>Al crear la cuenta, la persona declara ser mayor de edad. Una cuenta abierta con datos falsos se cierra y sus premios se anulan.</li>
        <li>La persona titular responde por la cuenta, por los pagos y por el uso que se haga de sus cartones.</li>
      </ul>
    ),
  },
  {
    title: 'Participación de personas menores de edad',
    body: (
      <ul>
        <li>
          Una persona menor de edad puede jugar con cartones vinculados a la cuenta de su <strong>madre, padre o tutor legal</strong>, en el
          salón o en línea, siempre acompañada o supervisada por esa persona adulta.
        </li>
        <li>La compra, el pago y el reclamo de un bingo los hace siempre la persona adulta titular de la cuenta.</li>
        <li>
          No pedimos ni guardamos datos de la persona menor. Si para entregar un premio hiciera falta alguno, se solicita a su representante
          legal, con su consentimiento y conforme a la Ley N.° 8968.
        </li>
      </ul>
    ),
  },
  {
    title: 'Premios que exigen mayoría de edad o representación legal',
    body: (
      <>
        <p>
          <strong>{ADULT_PRIZES_NOTE}</strong>
        </p>
        <ul>
          <li>
            Los <strong>premios mayores</strong> (entre ellos la motocicleta) solo se entregan a una persona mayor de edad: la titular de la
            cuenta o, si el cartón ganador lo jugó una persona menor, su representante legal.
          </li>
          <li>
            El representante legal acredita el vínculo con documentos oficiales: constancia de nacimiento del Registro Civil o resolución
            judicial o administrativa (PANI) que otorgue la tutela, además de su propia cédula o DIMEX vigente.
          </li>
          <li>{MOTORCYCLE_REQUIREMENT}</li>
          <li>Los premios menores entregados en el salón también se reciben por medio de la persona adulta responsable.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Si no se puede acreditar la representación',
    body: (
      <p>
        La Asociación custodia el premio mientras se presentan los documentos, dentro de los plazos del Reglamento. Si vencen sin
        acreditarse la mayoría de edad o la representación legal, se aplica la regla de premios no reclamados de la política de
        devoluciones y contingencias.
      </p>
    ),
  },
  {
    title: 'Consultas',
    body: (
      <p>
        Escríbenos a <ContactEmail /> antes del evento si tienes dudas sobre la participación de una persona menor de edad.
      </p>
    ),
  },
];

const DOC = {
  id: 'age',
  path: PATHS.age,
  title: 'Restricción de edad y tutoría legal',
  intro: 'Quién puede abrir una cuenta, cómo participan las personas menores de edad y qué premios exigen mayoría de edad o un tutor legal.',
  sections: SECTIONS,
};

export default DOC;
