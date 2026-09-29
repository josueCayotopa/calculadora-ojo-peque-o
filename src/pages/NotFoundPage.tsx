import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <h1 className="text-2xl font-black text-ink">Página no encontrada</h1>
      <Link to="/" className={buttonVariants()}>
        Volver al inicio
      </Link>
    </div>
  );
}
