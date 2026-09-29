import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clinicalConfig } from '@/config';
import { ErrorBoundary } from './ErrorBoundary';

export const AVISO_LEGAL = 'Herramienta de apoyo clínico. La decisión final corresponde al cirujano.';

const LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/evaluacion', label: 'Nueva evaluación' },
  { to: '/comparar', label: 'Comparar OD/OI' },
  { to: '/acerca', label: 'Acerca de' },
  { to: '/evidencia', label: 'Evidencia' },
];

export function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Al cambiar de página: volver arriba y mover el foco al contenido (lectores de pantalla).
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    // Desde lg (tablet horizontal / escritorio) la app ocupa exactamente la pantalla, como una diapositiva:
    // solo el área de contenido puede desplazarse, y cada página está diseñada para no necesitarlo.
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-primary focus:shadow"
      >
        Saltar al contenido
      </a>

      <header className="shrink-0 border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-primary">
            <img src="/isotipo.png" alt="" width={32} height={34} className="size-8" />
            <span className="leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-primary">Clínica La Luz</span>
              <span className="block text-sm font-extrabold tracking-tight text-ink sm:text-base">Clasificación del Ojo Pequeño</span>
            </span>
          </NavLink>
          <nav aria-label="Principal" className="w-full sm:w-auto">
            <ul className="flex flex-wrap gap-0.5">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition-colors',
                        isActive ? 'bg-primary-10 text-primary' : 'text-slateGray hover:bg-slateGray-100 hover:text-ink',
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="bg-primary text-white" role="note" aria-label="Aviso legal">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 px-4 py-1 text-xs sm:px-6">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" />
              {AVISO_LEGAL}
            </p>
            <p className="text-white/85">
              Reglas v{clinicalConfig.version} ({clinicalConfig.fechaRevision}) · Sin datos en servidores
            </p>
          </div>
        </div>
      </header>

      <main
        id="contenido"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 outline-none sm:px-6 lg:min-h-0 lg:overflow-y-auto"
      >
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
