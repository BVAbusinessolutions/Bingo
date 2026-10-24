import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reservationsApi } from '../../api/endpoints';
import CheckoutSteps from '../../components/checkout/CheckoutSteps';
import PaymentForm from '../../components/payments/PaymentForm';
import PaymentResult from '../../components/payments/PaymentResult';
import PageHeader from '../../components/ui/PageHeader';
import PageLoader from '../../components/ui/PageLoader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { PATHS } from '../../routing/paths';

/** Pasos 2 y 3 de la compra: datos y pago de una reserva, y luego su confirmación. */
export default function CheckoutPage() {
  const { id } = useParams();
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    reservationsApi
      .get(id)
      .then(setReservation)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <main className="container-page py-10">
        <Alert tone="error" title="No encontramos esta compra" action={<Button to={PATHS.myPurchases}>Ver mis compras</Button>} />
      </main>
    );
  }
  if (!reservation) return <PageLoader />;

  const paying = reservation.status === 'PENDING';

  return (
    <main className="container-page space-y-5 py-6">
      <CheckoutSteps current={paying ? 2 : 3} />
      {paying && (
        <PageHeader title="Tus datos y pago" description="Completa los 3 pasos antes de que se acabe el tiempo. Tus cartones están apartados solo para ti." />
      )}
      {paying ? <PaymentForm reservation={reservation} onChange={setReservation} /> : <PaymentResult reservation={reservation} />}
    </main>
  );
}
