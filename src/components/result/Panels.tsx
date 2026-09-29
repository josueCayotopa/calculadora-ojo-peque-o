import { useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { EvaluacionCompleta } from '@/engine/types';
import { clinicalConfig, terminosUsados } from '@/config';
import { cn } from '@/lib/utils';
import { ALERTAS_CRITICAS } from './ClassificationCard';

/*
 * Contenidos de las pestañas del panel derecho del resultado. Sin tarjeta
 * propia: el contenedor (pestañas) ya aporta el marco, y así caben sin desplazar.
 */

const subtitulo = 'text-[11px] font-bold uppercase tracking-wide text-slateGray';

function ListaPasos({ items }: { items: string[] }) {
  return (
    <ol className="space-y-1.5">
      {items.map((p, i) => (
        <li key={p} className="flex gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-10 text-xs font-bold text-primary">
            {i + 1}
          </span>
          <span className="pt-0.5 text-sm font-semibold text-ink">{p}</span>
        </li>
      ))}
    </ol>
  );
}

export function Tratamiento({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  const c = evaluacion.clasificacion;
  const tipo = c.tipo ?? c.masCercanos[0];
  const glosario = terminosUsados([...tipo.preoperatorio, ...tipo.tecnica]);
  return (
    <div className="space-y-3">
      {c.estado !== 'clasificado' && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Solo referencial: tratamiento del tipo más cercano (Tipo {tipo.romano}). La conducta la define el cirujano.
        </p>
      )}
      <div className="space-y-1.5">
        <h3 className={subtitulo}>Preoperatorio</h3>
        {tipo.preoperatorio.length ? <ListaPasos items={tipo.preoperatorio} /> : <p className="text-sm text-slateGray">—</p>}
      </div>
      <div className="space-y-1.5">
        <h3 className={subtitulo}>Técnica quirúrgica</h3>
        <ListaPasos items={tipo.tecnica} />
      </div>
      {tipo.pendiente && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">{tipo.pendiente}</p>}
      {glosario.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded-xl bg-lightBg p-2.5 text-xs">
          {glosario.map((g) => (
            <div key={g.termino} className="contents">
              <dt className="font-bold text-ink">{g.termino}</dt>
              <dd className="text-slateGray">{g.definicion}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

interface AlertaItem {
  titulo: string;
  texto: string;
  grave?: boolean;
}

/** Todas las alertas (las críticas, además, se señalan junto al diagnóstico). */
export function listaAlertas(e: EvaluacionCompleta): AlertaItem[] {
  const c = e.clasificacion;
  const items: AlertaItem[] = c.alertas.map((a) => ({ titulo: a.titulo, texto: a.mensaje, grave: ALERTAS_CRITICAS.has(a.id) }));
  if (e.facomorfico.activa) {
    items.push({
      titulo: 'Posible mecanismo facomórfico',
      texto: `${e.facomorfico.mensaje} (${e.facomorfico.criterios.map((k) => `${k.etiqueta}: ${k.observado}`).join(' · ')})`,
      grave: true,
    });
  }
  if (e.lio.piggyback.activa) {
    items.push({ titulo: 'Posible necesidad de piggyback', texto: `${e.lio.piggyback.motivo} ${e.lio.piggyback.mensaje}` });
  }
  if (c.advertenciasLimite.length) {
    items.push({
      titulo: 'Valores en el límite de un umbral',
      texto: `A ≤ ${clinicalConfig.toleranciaLimiteMm} mm de un umbral; considere repetir la medición: ${c.advertenciasLimite
        .map((a) => `${a.medida} = ${a.observado} (${a.criterios.join('; ')})`)
        .join(' · ')}.`,
    });
  }
  if (c.tambienCumplen.length) {
    items.push({
      titulo: 'También cumple los mayores de otro tipo',
      texto: `${c.tambienCumplen.map((t) => `Tipo ${t.romano}`).join(', ')}. Se asignó el Tipo ${c.tipo?.romano} por el orden ${clinicalConfig.ordenEvaluacion.join(' → ')}.`,
    });
  }
  return items;
}

export function Alertas({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  const items = listaAlertas(evaluacion);
  if (!items.length) return <p className="text-sm text-slateGray">Sin alertas adicionales.</p>;
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li
          key={a.titulo}
          className={cn(
            'flex gap-2 rounded-xl border px-3 py-2 text-xs',
            a.grave ? 'border-red-300 bg-red-50 text-red-950' : 'border-amber-300 bg-amber-50 text-amber-950',
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>{a.titulo}.</strong> {a.texto}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function RecomendacionLio({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  const { lio } = evaluacion;
  return (
    <div className="space-y-2">
      <p className="text-xs text-slateGray">{lio.biometria}</p>
      <ul className="space-y-1.5">
        {lio.formulas.map((f) => (
          <li key={f.nombre}>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 px-3 py-1.5 transition-colors hover:border-primary hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{f.nombre}</span>
                {f.nota && <span className="block text-[11px] leading-tight text-slateGray">{f.nota}</span>}
              </span>
              <ExternalLink className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slateGray">Los enlaces requieren conexión a internet.</p>
    </div>
  );
}

export function ChecklistPreoperatorio({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  // Estado solo visual (no se guarda): ayuda a repasar la lista en consulta o quirófano.
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  return (
    <ul className="space-y-0.5">
      {evaluacion.checklist.map((item) => (
        <li key={item.texto}>
          <label
            className={cn(
              'flex min-h-9 cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-lightBg',
              marcados[item.texto] && 'text-slateGray line-through',
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0"
              checked={Boolean(marcados[item.texto])}
              onChange={(e) => setMarcados((m) => ({ ...m, [item.texto]: e.target.checked }))}
            />
            <span className="text-[13px] leading-snug text-ink">
              {item.texto}
              {item.referencial && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                  referencial
                </span>
              )}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function Referencias({ compacto = false }: { compacto?: boolean }) {
  return (
    <section aria-labelledby="titulo-referencias" className="space-y-1.5">
      <h2 id="titulo-referencias" className={subtitulo}>
        Referencias
      </h2>
      <ol className={cn('list-decimal space-y-1 pl-5 font-light text-slateGray', compacto ? 'text-xs' : 'text-sm')}>
        {clinicalConfig.referencias.map((r) => (
          <li key={r.cita}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                {r.cita}
              </a>
            ) : (
              r.cita
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
