// Contingencias y operación presencial + en línea. Los plazos y criterios marcados en
// docs/LEGAL-REVISION.md deben confirmarlos la Junta Directiva y la asesoría legal.
import { PATHS } from '../../routing/paths';
import { ContactEmail } from '../../components/layout/LegalLayout';
import { SITE } from '../../config/site';

const SECTIONS = [
  {
    title: 'Empates y bingos simultáneos (salón y plataforma)',
    body: (
      <>
        <p>
          El juego es uno solo: en el salón del evento y en la plataforma se juega con las mismas bolas. Por eso se aplican estas reglas
          sin importar el canal:
        </p>
        <ul>
          <li>
            Hay empate cuando dos o más cartones completan el patrón con <strong>la misma bola</strong> (la última que les faltaba). El
            sistema registra la bola con la que cada cartón completó el patrón; ese registro decide, no el orden en que se cantó.
          </li>
          <li>
            Cuando se canta bingo (en el salón o en línea), se detiene el sorteo y no se extraen más bolas hasta verificarlo. Un bingo que
            se reclame después de cantada la siguiente bola sigue siendo válido, pero la Asociación verificará con el registro en qué
            bola se completó.
          </li>
          <li>
            <strong>Premios divisibles</strong> (dinero, órdenes de compra): se reparten en partes iguales entre los cartones empatados.
          </li>
          <li>
            <strong>Premios indivisibles</strong> (como la motocicleta): se desempata extrayendo una bola por cada cartón empatado; gana el
            número más alto. Se repite con quienes vuelvan a empatar. Para quien juega en línea, la bola la extrae un representante de la
            Asociación en su nombre, frente a la cámara y a la vista del público.
          </li>
          <li>Cada persona participa en el desempate con cada uno de sus cartones empatados.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Fallas técnicas durante el sorteo',
    body: (
      <ul>
        <li>Si la transmisión se corta, el sorteo continúa en el salón y las bolas se siguen registrando en el sistema.</li>
        <li>Los cartones en línea se marcan con el registro oficial al reconectarse; ningún bingo se pierde por una desconexión.</li>
        <li>
          Si una falla impide jugar en línea por más de 15 minutos, la Asociación puede pausar el sorteo y lo informará en el salón, en la
          transmisión y por correo.
        </li>
      </ul>
    ),
  },
  {
    title: 'Custodia de premios y cartones no reclamados',
    body: (
      <>
        <ul>
          <li>
            Los premios se custodian a nombre de la persona ganadora durante el plazo para reclamar: <strong>30 días naturales</strong>{' '}
            desde el evento, o <strong>90 días naturales</strong> en el caso de la motocicleta.
          </li>
          <li>La Asociación intentará contactar a la persona ganadora por correo y teléfono al menos tres veces dentro de ese plazo.</li>
          <li>
            Vencido el plazo sin reclamo, el premio caduca y pasa a formar parte de los recursos de la Asociación para sus programas de
            atención a la niñez, conforme a sus estatutos. Quedará constancia en un acta.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Derecho de retracto, cancelaciones y devoluciones',
    body: (
      <>
        <h3>Retracto</h3>
        <p>
          Cuando corresponda el derecho de retracto que reconoce la Ley N.° 7472 y su reglamento para compras a distancia, podrás ejercerlo
          dentro del plazo legal escribiendo a <ContactEmail />, siempre que la solicitud llegue <strong>antes de que empiece el sorteo</strong>
          . Una vez iniciado el sorteo el cartón ya participó y, por la naturaleza del servicio, no puede devolverse.
        </p>
        <h3>Pagos erróneos</h3>
        <p>
          Si pagaste de más, pagaste dos veces o enviaste dinero por error, escríbenos con el comprobante. Verificado el depósito, se te
          devolverá la diferencia a la misma cuenta de origen dentro de <strong>10 días hábiles</strong>.
        </p>
        <h3>Cancelación o reprogramación por fuerza mayor</h3>
        <p>
          Si el evento se cancela o reprograma por fuerza mayor o caso fortuito (desastres naturales, emergencias sanitarias, órdenes de
          autoridad, fallas graves de servicios públicos, etc.):
        </p>
        <ul>
          <li>Se avisará en esta plataforma y por correo a todas las personas con compras.</li>
          <li>
            Si se reprograma, tus cartones pasan automáticamente a la nueva fecha. Si no puedes asistir, puedes pedir la devolución dentro de
            los 15 días naturales siguientes al aviso.
          </li>
          <li>Si se cancela, se devuelve el 100 % de lo pagado a la cuenta de origen dentro de 30 días naturales.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Anulación por reversión de pagos o irregularidades',
    body: (
      <>
        <p>La Asociación audita los pagos antes y después del evento. Una compra y cualquier premio asociado se anulan cuando:</p>
        <ul>
          <li>El pago se revierte, se rechaza o el banco lo reclama como no autorizado.</li>
          <li>El comprobante es falso, alterado o corresponde a otra compra.</li>
          <li>El dinero nunca se acreditó en la cuenta de la Asociación.</li>
          <li>La compra se hizo con la identidad o el medio de pago de otra persona sin su autorización.</li>
        </ul>
        <p>
          El procedimiento es: (1) se suspende la entrega del premio, (2) se revisan el registro bancario y la bitácora del sistema, (3) se
          notifica a la persona por correo para que presente su descargo en un plazo de 5 días hábiles y (4) la Asociación resuelve por
          escrito. Si se anula un premio, se adjudica según las reglas de empate o pasa a los recursos de la Asociación.
        </p>
      </>
    ),
  },
  {
    title: 'Auditoría del sorteo',
    body: (
      <ul>
        <li>Cada bola, venta, aprobación de pago, reclamo y premio queda registrado en una bitácora inalterable con fecha, hora y responsable.</li>
        <li>El sorteo se transmite en vivo y se graba.</li>
        <li>Al finalizar se levanta un acta con las bolas cantadas, los cartones ganadores y los premios.</li>
        <li>Cualquier participante puede solicitar por escrito una copia del acta de su evento.</li>
      </ul>
    ),
  },
  {
    title: 'Cláusulas contra el fraude',
    body: (
      <>
        <p>Se consideran faltas graves:</p>
        <ul>
          <li>Manipular, alterar o intentar vulnerar el código, la base de datos o la transmisión de la plataforma.</li>
          <li>Usar bots, scripts, extensiones u otros medios automatizados para reservar, comprar o reclamar cartones.</li>
          <li>Crear varias cuentas, suplantar identidades o usar cuentas de terceros.</li>
          <li>Ataques de denegación de servicio o cualquier intento de interrumpir el evento.</li>
          <li>Presentar comprobantes falsos o reclamar bingos con cartones adulterados.</li>
        </ul>
        <p>Las sanciones, que se aplican según la gravedad y quedan registradas con su motivo, son:</p>
        <ol>
          <li>Suspensión temporal de la cuenta.</li>
          <li>Cancelación definitiva de la cuenta (baneo) y prohibición de participar en eventos futuros.</li>
          <li>Anulación de compras y premios relacionados, sin derecho a devolución cuando haya mala fe comprobada.</li>
          <li>Denuncia ante el Organismo de Investigación Judicial (OIJ) por los delitos informáticos tipificados en el Código Penal.</li>
        </ol>
      </>
    ),
  },
  {
    title: 'Contacto',
    body: (
      <p>
        Para cualquier reclamo o solicitud relacionada con esta política escribe a <ContactEmail /> o llama al {SITE.contactPhone}.
      </p>
    ),
  },
];

const DOC = {
  id: 'contingencies',
  path: PATHS.contingencies,
  title: 'Contingencias, devoluciones y antifraude',
  intro: "Qué pasa ante empates entre el salón y la plataforma, fallas técnicas, premios no reclamados, cancelaciones, devoluciones e intentos de fraude.",
  sections: SECTIONS,
};

export default DOC;
