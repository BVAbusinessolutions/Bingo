import { Bike, HeartHandshake, ShieldCheck, Ticket } from 'lucide-react';

/**
 * Premio mayor e incentivos que se muestran en la portada, Premios y Resultados.
 * Para anunciar otro premio, agregarlo aquí con su ícono y descripción. `main: true` = premio mayor.
 */
export const PRIZES = Object.freeze([
  {
    id: 'moto',
    icon: Bike, // la sección del premio mayor usa las fotografías, no el ícono
    title: 'Motocicleta',
    text: 'El gran premio del Bingo Benéfico Hogar Sol.',
    main: true,
    // VITE_PRIZE_IMAGE (una sola foto) reemplaza la galería por defecto.
    images: import.meta.env.VITE_PRIZE_IMAGE
      ? [import.meta.env.VITE_PRIZE_IMAGE]
      : ['/img/premio-motocicleta.webp', '/img/premio-motocicleta-2.webp', '/img/premio-motocicleta-3.webp'],
    imageAlt: 'Motocicleta, premio mayor del Bingo Benéfico Hogar Sol',
    // Qué muestra cada foto (texto alternativo y miniaturas), en el mismo orden que `images`.
    views: import.meta.env.VITE_PRIZE_IMAGE ? [] : ['vista lateral', 'vista frontal desde la derecha', 'vista frontal desde la izquierda'],
  },
  { id: 'carton', icon: Ticket, title: 'Un cartón ya participa', text: 'Juega en el salón del evento o desde tu casa, con las mismas bolas y las mismas reglas.' },
  {
    id: 'verificacion',
    icon: ShieldCheck,
    title: 'Ganadores verificados',
    text: 'El sistema revisa cada cartón contra las bolas cantadas y publica los ganadores al confirmarlos.',
  },
  { id: 'causa', icon: HeartHandshake, title: 'Ganas y ayudas', text: 'Lo recaudado apoya hogar, alimentación y educación para la niñez de Hogar Sol.' },
]);

export const MAIN_PRIZE = PRIZES.find((p) => p.main);
