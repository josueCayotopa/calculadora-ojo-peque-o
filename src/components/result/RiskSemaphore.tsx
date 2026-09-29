import { Check, Minus } from 'lucide-react';
import type { NivelRiesgo, ResultadoGlaucomaMaligno } from '@/engine/types';
import { cn } from '@/lib/utils';
import { clinicalConfig } from '@/config';

export const NIVELES: { nivel: NivelRiesgo; label: string; on: string; texto: string }[] = [
  { nivel: 'bajo', label: 'Bajo', on: 'bg-green-600 ring-green-200', texto: 'text-green-900' },
  { nivel: 'moderado', label: 'Moderado', on: 'bg-amber-500 ring-amber-200', texto: 'text-amber-900' },
  { nivel: 'alto', label: 'Alto', on: 'bg-red-700 ring-red-200', texto: 'text-red-900' },
];

/** Semáforo pequeño (3 luces) reutilizable en pestañas y encabezados. */
export function Luces({ nivel, tamano = 'size-4' }: { nivel: NivelRiesgo; tamano?: string }) {
  return (
    <span className="inline-flex gap-1 rounded-full bg-ink p-1" aria-hidden="true">
      {NIVELES.map((n) => (
        <span key={n.nivel} className={cn(tamano, 'rounded-full', n.nivel === nivel ? `${n.on} ring-2` : 'bg-gray-600 opacity-40')} />
      ))}
    </span>
  );
}

/** Riesgo de glaucoma maligno: semáforo con texto (no solo color) y lista de factores. */
export function RiskSemaphore({ riesgo }: { riesgo: ResultadoGlaucomaMaligno }) {
  const { moderadoDesde, altoDesde } = clinicalConfig.glaucomaMaligno.umbrales;
  const actual = NIVELES.find((n) => n.nivel === riesgo.nivel)!;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Luces nivel={riesgo.nivel} tamano="size-6" />
        <div>
          <p className={cn('text-xl font-black leading-none', actual.texto)}>
            <span className="sr-only">Riesgo de glaucoma maligno: </span>
            {actual.label}
          </p>
          <p className="mt-0.5 text-[11px] text-slateGray">
            {riesgo.presentes} de {riesgo.total} factores · moderado ≥ {moderadoDesde}, alto ≥ {altoDesde}
          </p>
        </div>
      </div>
      <ul className="space-y-0.5 text-[13px]">
        {riesgo.factores.map((f) => (
          <li key={f.etiqueta} className={cn('flex items-center gap-2', f.presente ? 'font-semibold text-ink' : 'text-slateGray')}>
            {f.presente ? <Check className="size-4 shrink-0 text-red-800" aria-hidden="true" /> : <Minus className="size-4 shrink-0" aria-hidden="true" />}
            <span>
              {f.etiqueta}
              <span className="sr-only">{f.presente ? ': presente' : ': ausente'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
