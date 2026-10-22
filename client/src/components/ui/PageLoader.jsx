import { Loader2 } from 'lucide-react';

export default function PageLoader({ fullScreen = false }) {
  return (
    <div className={`grid place-items-center ${fullScreen ? 'min-h-screen' : 'min-h-[60vh]'}`}>
      <Loader2 className="h-8 w-8 animate-spin text-sol-red" aria-label="Cargando" />
    </div>
  );
}
