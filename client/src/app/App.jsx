import Providers from './providers';
import AppRouter from '../routing/AppRouter';

export default function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
