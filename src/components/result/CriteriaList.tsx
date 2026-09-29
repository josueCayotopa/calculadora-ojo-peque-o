import { Check, CircleHelp, TriangleAlert, X } from 'lucide-react';
import type { CriterioEvaluado } from '@/engine/types';
import { cn } from '@/lib/utils';

function Icono({ c }: { c: CriterioEvaluado }) {
  if (c.sinDato) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slateGray-100 text-slateGray">
        <CircleHelp className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Sin dato</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full',
        c.cumple ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
      )}
    >
      {c.cumple ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
      <span className="sr-only">{c.cumple ? 'Cumple' : 'No cumple'}</span>
    </span>
  );
}

/** Criterios ✓/✗ agrupados: primero los mayores (deciden el tipo), luego los de apoyo. */
export function CriteriaList({ criterios }: { criterios: CriterioEvaluado[] }) {
  const grupos = [
    { titulo: 'Criterios mayores (obligatorios)', items: criterios.filter((c) => c.nivel === 'mayor') },
    { titulo: 'Criterios de apoyo', items: criterios.filter((c) => c.nivel === 'apoyo') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-2">
      {grupos.map((g) => (
        <div key={g.titulo}>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slateGray">{g.titulo}</p>
          <ul
            className={cn(
              'divide-y divide-gray-100 rounded-2xl border',
              g.items[0].nivel === 'mayor' ? 'border-primary-200 bg-primary-50/40' : 'border-gray-100',
            )}
          >
            {g.items.map((c) => (
              <li key={c.etiqueta} className="flex items-center gap-2.5 px-3 py-1">
                <Icono c={c} />
                <span className={cn('flex-1 text-[13px] leading-tight text-ink', c.nivel === 'mayor' ? 'font-semibold' : 'font-medium')}>{c.etiqueta}</span>
                <span className="flex items-center gap-1.5 text-right text-xs text-slateGray">
                  {c.enLimite && (
                    <TriangleAlert className="size-4 text-amber-700" aria-label="Valor en el límite del umbral" role="img" />
                  )}
                  <span>
                    <span className="sr-only">Valor observado: </span>
                    {c.observado}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function BarraPorcentaje({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const pct = Math.round(valor * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-slateGray-100"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={etiqueta}
      >
        <div
          className={cn('h-full rounded-full', pct === 100 ? 'bg-green-700' : pct >= 67 ? 'bg-amber-600' : 'bg-slateGray')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-bold text-ink">{pct} %</span>
    </div>
  );
}
