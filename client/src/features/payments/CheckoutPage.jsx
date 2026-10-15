import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { reservationsApi } from '../../api/endpoints';
import PaymentModal from './PaymentModal';

/** Permite retomar el pago de una reserva desde "Mis compras" (o tras recargar la página). */
export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    reservationsApi.get(id).then(setReservation).catch(() => setError('No encontramos esta reserva.'));
  }, [id]);

  const close = useCallback(() => navigate('/mis-compras'), [navigate]);

  if (error) return <p className="mt-20 text-center text-fg-muted">{error}</p>;
  if (!reservation) return <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin text-fg-subtle" />;
  return <PaymentModal reservation={reservation} onClose={close} onChange={setReservation} />;
}
