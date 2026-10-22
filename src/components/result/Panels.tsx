import { useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { EvaluacionCompleta } from '@/engine/types';
import { conSinequias, tecnicasAlternativas } from '@/engine';
import { clinicalConfig, terminosUsados } from '@/config';
import { cn } from '@/lib/utils';
import { ALERTAS_CRITICAS } from './ClassificationCard';

/*
 * Contenidos de las pestañas del panel derecho del resultado. Sin tarjeta
 * propia: el contenedor (pestañas) ya aporta el marco, y así caben sin desplazar.
 */

const subtitulo = 'text-[11px] font-bold uppercase tracking-wide text-slateGray';

/** Una técnica dentro de la tarjeta de un tipo con excepción; se enmarca la que corresponde al resultado. */
function BloqueTecnica({ titulo, detalle, items, indicada }: { titulo: string; detalle?: string; items: string[]; indicada: boolean }) {
  return (
    <div className={cn('rounded-xl border px-2.5 py-1.5', indicada ? 'border-2 border-primary bg-primary-50' : 'border-gray-200')}>
      <div className="mb-0.5 flex items-start justify-between gap-2">
        <p className={cn('text-xs leading-tight', indicada ? 'font-bold text-primary' : 'font-semibold text-slateGray')}>
          {titulo}
          {detalle && <span className="block font-normal text-slateGray">{detalle}</span>}
        </p>
        {indicada && (
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Indicada</span>
        )}
      </div>
      <ListaPasos items={items} destacado={indicada} />
    </div>
  );
}

function ListaPasos({ items, destacado }: { items: string[]; destacado: boolean }) {
  return (
    <ul className="space-y-0.5">
      {items.map((p) => (
        <li key={p} className="flex gap-2">
          <span
            className={cn('mt-[7px] size-1.5 shrink-0 rounded-full', destacado ? 'bg-primary' : 'bg-gray-400')}
            aria-hidden="true"
          />
          <span className={cn('text-sm', destacado ? 'font-semibold text-ink' : 'text-slateGray')}>{p}</span>
        </li>
      ))}
    </ul>
  );
}

/** Tratamiento del tipo resultante (o del más cercano en zona gris), para verlo sin cambiar de pestaña. */
export function TratamientoIndicado({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  const c = evaluacion.clasificacion;
  const t = c.tipo ?? c.masCercanos[0];
  return (
    <div className="rounded-2xl border-2 border-primary bg-primary-50 px-3 py-2">
      <h3 className="mb-1 text-sm font-black text-primary">
        Tratamiento · Tipo {t.romano}
        {c.estado !== 'clasificado' && <span className="ml-1 font-semibold text-amber-900">(referencial)</span>}
      </h3>
      <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        <div>
          <p className={subtitulo}>Preoperatorio</p>
          {t.preoperatorio.length ? <ListaPasos items={t.preoperatorio} destacado /> : <p className="text-sm text-amber-900">Por definir</p>}
        </div>
        <div>
          <p className={subtitulo}>
            Técnica{t.tecnicaPorExcepcion && <span className="normal-case tracking-normal"> · {t.tecnicaPorExcepcion}</span>}
          </p>
          <ListaPasos items={t.tecnica} destacado />
        </div>
      </div>
      {t.pendiente && <p className="mt-1 text-xs font-semibold text-amber-900">{t.pendiente}</p>}
    </div>
  );
}

/**
 * Tratamiento de los cinco tipos (como la tabla del autor), con el tipo
 * resultante enmarcado. En zona gris se enmarca el más cercano (referencial).
 */
export function Tratamiento({ evaluacion }: { evaluacion: EvaluacionCompleta }) {
  const c = evaluacion.clasificacion;
  const tipo = c.tipo ?? c.masCercanos[0];
  const tipos = clinicalConfig.tipos;
  const entrada = evaluacion.entrada;
  const glosario = terminosUsados(
    tipos.flatMap((t) => [...t.preoperatorio, ...t.tecnica, ...tecnicasAlternativas(t.id, clinicalConfig).flatMap((a) => a.tecnica)]),
  );
  return (
    <div className="space-y-2">
      {c.estado !== 'clasificado' && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Solo referencial: se enmarca el tipo más cercano (Tipo {tipo.romano}). La conducta la define el cirujano.
        </p>
      )}
      <ul className="space-y-2">
        {tipos.map((t) => {
          const resultado = t.id === tipo.id;
          const alternativas = tecnicasAlternativas(t.id, clinicalConfig);
          // Con varias técnicas, se enmarca solo la técnica indicada, no toda la tarjeta.
          const conAlternativas = alternativas.length > 0;
          const excepcionActiva = resultado ? c.alertas.find((a) => alternativas.some((x) => x.id === a.id)) : undefined;
          return (
            <li
              key={t.id}
              aria-current={resultado ? 'true' : undefined}
              className={cn(
                'rounded-2xl border px-3 py-2',
                resultado && !conAlternativas && 'border-2 border-primary bg-primary-50 shadow-sm',
                resultado && conAlternativas && 'border-primary',
                !resultado && 'border-gray-200',
              )}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className={cn('text-sm leading-tight', resultado ? 'font-black text-primary' : 'font-bold text-slateGray')}>
                  Tipo {t.romano} · <span className={resultado ? 'text-ink' : undefined}>{t.nombre}</span>
                </h3>
                {resultado && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {c.estado === 'clasificado' ? 'Resultado' : 'Más cercano'}
                  </span>
                )}
              </div>
              {conAlternativas ? (
                <div className="space-y-1.5">
                  <ListaPasos items={t.preoperatorio} destacado={resultado} />
                  <BloqueTecnica titulo="Técnica habitual" items={conSinequias(t.tecnica, entrada)} indicada={resultado && !excepcionActiva} />
                  {alternativas.map((a) => (
                    <BloqueTecnica
                      key={a.id}
                      titulo={a.titulo}
                      detalle={a.condicion}
                      items={conSinequias(a.tecnica, entrada)}
                      indicada={excepcionActiva?.id === a.id}
                    />
                  ))}
                </div>
              ) : (
                <ListaPasos items={[...t.preoperatorio, ...conSinequias(t.tecnica, entrada)]} destacado={resultado} />
              )}
              {resultado && t.pendiente && <p className="mt-1 text-xs font-semibold text-amber-900">{t.pendiente}</p>}
            </li>
          );
        })}
      </ul>
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
