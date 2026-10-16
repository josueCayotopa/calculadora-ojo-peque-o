import { useState } from 'react';
import { CircleHelp, OctagonAlert } from 'lucide-react';
import type { EvaluacionCompleta, TipoEvaluado } from '@/engine/types';
import { Badge } from '@/components/ui/badge';
import { nombreTipo } from '@/state/EvaluationContext';
import { cn } from '@/lib/utils';
import { BarraPorcentaje, CriteriaList } from './CriteriaList';
import { EyeSchematic, describirEsquema } from './EyeSchematic';
import { TratamientoIndicado } from './Panels';

/** Alertas que no deben quedar escondidas en una pestaña: se muestran junto al diagnóstico. */
export const ALERTAS_CRITICAS = new Set(['rasgos-nanoftalmos', 'excepcion-vitrectomia']);

/** Bloque principal: número romano grande, como en la diapositiva del algoritmo. */
export function DiagnosticoHero({ evaluacion, onVerAlertas }: { evaluacion: EvaluacionCompleta; onVerAlertas?: () => void }) {
  const c = evaluacion.clasificacion;
  const tipo = c.estado === 'clasificado' ? c.tipo : null;
  const criticas = c.alertas.filter((a) => ALERTAS_CRITICAS.has(a.id));
  return (
    <section aria-labelledby="titulo-clasificacion" className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className={tipo ? 'bg-primary px-5 py-4 text-white' : 'bg-amber-100 px-5 py-4 text-amber-950'}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide opacity-90">{tipo ? 'Diagnóstico' : 'Resultado'}</p>
          <Badge className={tipo ? 'bg-white/20 text-white' : 'bg-white text-amber-950'}>
            {evaluacion.entrada.ojo === 'OD' ? 'OD · derecho' : 'OI · izquierdo'}
          </Badge>
        </div>
        {tipo ? (
          <h2 id="titulo-clasificacion" className="mt-1 flex items-center gap-4">
            <span className="text-7xl font-black leading-none" aria-label={`Tipo ${tipo.romano}`}>
              {tipo.romano}
            </span>
            <span className="text-lg font-bold leading-tight">{nombreTipo(tipo)}</span>
          </h2>
        ) : (
          <h2 id="titulo-clasificacion" className="mt-1 flex items-center gap-2 text-2xl font-black leading-tight">
            <CircleHelp className="size-7 shrink-0" aria-hidden="true" />
            No clasificable / zona gris
          </h2>
        )}
        <p className="mt-2 text-xs opacity-90">
          {tipo
            ? `Cumple ${tipo.mayores.cumplidos}/${tipo.mayores.total} criterios mayores · apoyo ${Math.round(tipo.apoyo.porcentaje * 100)} %`
            : `Ningún tipo cumple sus criterios mayores. Más cercanos: ${c.masCercanos.map((t) => `Tipo ${t.romano}`).join(' y ')}. No se fuerza un diagnóstico.`}
        </p>
      </div>
      {criticas.map((a) => (
        <div key={a.id} role="alert" className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-950">
          <OctagonAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="flex-1">
            <strong>{a.titulo}.</strong>{' '}
            {onVerAlertas ? (
              <button type="button" onClick={onVerAlertas} className="font-semibold underline underline-offset-2 hover:no-underline">
                Ver detalle
              </button>
            ) : (
              a.mensaje
            )}
          </p>
        </div>
      ))}
    </section>
  );
}

export function PanelEsquema({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  const c = evaluacion.clasificacion;
  const t = c.tipo ?? c.masCercanos[0];
  return (
    <section aria-labelledby="titulo-esquema" className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 id="titulo-esquema" className="text-sm font-bold text-ink">
        Esquema {c.tipo ? 'del tipo' : 'del más cercano'} · {t.romano}
      </h2>
      <EyeSchematic esquema={t.esquema} titulo={`Tipo ${t.romano}`} compacto />
      <ul className="flex flex-wrap gap-1">
        {describirEsquema(t.esquema).map((r) => (
          <li key={r} className="rounded-full bg-lightBg px-2 py-0.5 text-[11px] font-medium text-ink">
            {r}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetalleTipo({ t }: { t: TipoEvaluado }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs text-slateGray">
          Mayores <strong className="text-ink">{t.mayores.cumplidos}/{t.mayores.total}</strong> · Apoyo{' '}
          <strong className="text-ink">
            {t.apoyo.cumplidos}/{t.apoyo.total}
          </strong>
          {t.apoyo.sinDato > 0 && ` (${t.apoyo.sinDato} sin dato)`}
        </span>
        <div className="flex-1">
          <BarraPorcentaje valor={t.apoyo.porcentaje} etiqueta={`Concordancia de apoyo con el Tipo ${t.romano}`} />
        </div>
      </div>
      <CriteriaList criterios={t.criterios} />
    </div>
  );
}

/** Panel central: el porqué del resultado (criterios ✓/✗). En zona gris, pestañas por tipo cercano. */
export function PanelCriterios({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  const c = evaluacion.clasificacion;
  const [sel, setSel] = useState(0);
  const [vista, setVista] = useState<'criterios' | 'tipos'>('criterios');
  const tipo = c.tipo;
  const actual = c.masCercanos[Math.min(sel, c.masCercanos.length - 1)];

  return (
    <section aria-labelledby="titulo-criterios" className="flex min-h-0 flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-criterios" className="text-sm font-bold text-ink">
          {vista === 'tipos' ? 'Concordancia con los 5 tipos' : tipo ? `¿Por qué Tipo ${tipo.romano}?` : 'Tipos más cercanos'}
        </h2>
        <div className="flex flex-wrap gap-1">
          {!tipo && vista === 'criterios' && (
            <div role="group" aria-label="Tipo a mostrar" className="flex gap-1">
              {c.masCercanos.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={i === sel}
                  onClick={() => setSel(i)}
                  className={cn(
                    'min-h-8 rounded-lg px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    i === sel ? 'bg-primary text-white' : 'bg-slateGray-100 text-ink hover:bg-gray-200',
                  )}
                >
                  Tipo {t.romano}
                  {t.sigla ? ` · ${t.sigla}` : ''}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            aria-pressed={vista === 'tipos'}
            onClick={() => setVista(vista === 'tipos' ? 'criterios' : 'tipos')}
            className="min-h-8 rounded-lg border border-gray-300 px-2.5 text-xs font-bold text-ink hover:bg-slateGray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-pressed:border-primary aria-pressed:bg-primary-50 aria-pressed:text-primary-900"
          >
            {vista === 'tipos' ? '← Criterios' : 'Comparar los 5 tipos'}
          </button>
        </div>
      </div>

      {vista === 'tipos' ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <RankingTipos evaluacion={evaluacion} />
        </div>
      ) : (
        <>
          {!tipo && (
            <ul className="flex flex-wrap gap-1" aria-label="Criterios mayores en conflicto">
              {c.conflictos
                .filter((k) => k.tipo === actual.romano)
                .map((k) => (
                  <li key={k.etiqueta}>
                    <Badge variant="danger" className="text-[11px]">
                      ✗ {k.etiqueta} ({k.sinDato ? 'sin dato' : k.observado})
                    </Badge>
                  </li>
                ))}
            </ul>
          )}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <DetalleTipo t={actual} />
            <TratamientoIndicado evaluacion={evaluacion} />
          </div>
        </>
      )}
    </section>
  );
}

export function RankingTipos({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  return (
    <ol className="space-y-2.5">
      {evaluacion.clasificacion.ranking.map((t) => (
        <li key={t.id} className="space-y-0.5">
          <p className="text-xs font-semibold text-ink">
            Tipo {t.romano} · {nombreTipo(t)}{' '}
            <span className="font-normal text-slateGray">
              (mayores {t.mayores.cumplidos}/{t.mayores.total}
              {t.cumpleMayores ? ' ✓' : ''})
            </span>
          </p>
          <BarraPorcentaje valor={t.apoyo.porcentaje} etiqueta={`Concordancia de apoyo con el Tipo ${t.romano}`} />
        </li>
      ))}
    </ol>
  );
}
