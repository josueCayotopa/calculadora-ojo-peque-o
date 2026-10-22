import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: ReactNode;
  contenido: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activo: string;
  onCambiar: (id: string) => void;
  label: string;
  className?: string;
  /** Clases del panel (p. ej. para que haga scroll interno). */
  panelClassName?: string;
}

/**
 * Pestañas accesibles (patrón WAI-ARIA: flechas, Inicio/Fin). Sustituyen el
 * apilado vertical de secciones para que cada pantalla quepa sin desplazarse.
 */
export function Tabs({ tabs, activo, onCambiar, label, className, panelClassName }: TabsProps) {
  const base = useId().replace(/:/g, '');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const actual = tabs.find((t) => t.id === activo) ?? tabs[0];

  function onKeyDown(e: KeyboardEvent, i: number) {
    const destino =
      e.key === 'ArrowRight' ? (i + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : null;
    if (destino === null) return;
    e.preventDefault();
    onCambiar(tabs[destino].id);
    refs.current[destino]?.focus();
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div role="tablist" aria-label={label} className="relative flex shrink-0 overflow-x-auto overflow-y-hidden border-b border-gray-200">
        {tabs.map((t, i) => {
          const sel = t.id === actual.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={sel}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={sel ? 0 : -1}
              onClick={() => onCambiar(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                '-mb-px inline-flex min-h-10 items-center gap-1 whitespace-nowrap border-b-2 px-1.5 text-xs font-semibold transition-colors xl:gap-1.5 xl:px-2 xl:text-[13px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                sel ? 'border-primary text-primary' : 'border-transparent text-slateGray hover:text-ink',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${actual.id}`}
        aria-labelledby={`${base}-tab-${actual.id}`}
        tabIndex={0}
        className={cn('relative min-h-0 flex-1 pt-3 focus-visible:outline-none', panelClassName)}
      >
        {actual.contenido}
      </div>
    </div>
  );
}
