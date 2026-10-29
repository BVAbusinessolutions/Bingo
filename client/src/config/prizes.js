import { Bike, HeartHandshake, ShieldCheck, Ticket } from 'lucide-react';

/**
 * Premio mayor e incentivos que se muestran en la portada, Premios y Resultados.
 * Para anunciar otro premio, agregarlo aquí con su ícono y descripción. `main: true` = premio mayor.
 */
export const PRIZES = Object.freeze([
  {
    id: 'moto',
    icon: Bike, // solo para la cinta de premios; la tarjeta del premio mayor usa la fotografía
    title: 'Motocicleta',
    text: 'El gran premio del Bingo Benéfico Hogar Sol.',
    main: true,
    image: import.meta.env.VITE_PRIZE_IMAGE || '/img/premio-motocicleta.webp',
    imageAlt: 'Motocicleta, premio mayor del Bingo Benéfico Hogar Sol',
  },
  { id: 'carton', icon: Ticket, title: 'Un cartón ya participa', text: 'Juega en el salón del evento o desde tu casa, con las mismas balotas y las mismas reglas.' },
  {
    id: 'verificacion',
    icon: ShieldCheck,
    title: 'Ganadores verificados',
    text: 'El sistema revisa cada cartón contra las balotas cantadas y publica los ganadores al confirmarlos.',
  },
  { id: 'causa', icon: HeartHandshake, title: 'Ganas y ayudas', text: 'Lo recaudado apoya hogar, alimentación y educación para la niñez de Hogar Sol.' },
]);

export const MAIN_PRIZE = PRIZES.find((p) => p.main);
