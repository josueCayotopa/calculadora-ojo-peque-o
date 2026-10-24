import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs } from '@/components/ui/tabs';
import { Referencias } from '@/components/result/Panels';
import { EyeSchematic } from '@/components/result/EyeSchematic';
import { clinicalConfig } from '@/config';
import { NOMBRE_VALOR, etiquetaCriterio, formatMedida, formatNumero, siNo, tecnicasAlternativas } from '@/engine';
import type { Criterio } from '@/engine/types';

/** Filas de la tabla: qué campo(s) muestra cada fila (mismo orden que la diapositiva). */
type FilaTabla = { titulo: string; campos: string[] };

const FILAS: FilaTabla[] = [
  { titulo: 'Longitud axial (LA)', campos: ['longitudAxial'] },
  { titulo: 'Cámara anterior (CA)', campos: ['acd'] },
  { titulo: 'Ángulo', campos: ['angulo'] },
  { titulo: 'Índice LT/AL', campos: ['indiceLTAL'] },
  { titulo: 'Malformaciones anatómicas', campos: ['malformaciones'] },
  { titulo: 'WTW', campos: ['wtw'] },
];

const SIM: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };

function claveCriterio(c: Criterio): string {
  if (c.op === 'iguales') return 'iguales';
  if (c.op === 'cualquiera') return 'retina';
  return c.campo;
}

/** Texto corto de un criterio para la celda (sin el nombre del campo). */
function celda(c: Criterio): string {
  // La LA de los tipos III y IV conserva la notación «(−2 DE)» de la tabla original.
  return c.etiqueta?.includes('−2 DE') ? `${celdaValor(c)} (−2 DE)` : celdaValor(c);
}

function celdaValor(c: Criterio): string {
  switch (c.op) {
    case 'entre':
      return c.campo === 'indiceLTAL' ? `${c.min.toFixed(2)}–${c.max.toFixed(2)}` : `${formatNumero(c.min)}–${formatNumero(c.max)} mm`;
    case 'en':
      return c.valores.map((v) => NOMBRE_VALOR[v] ?? v).join(' o ');
    case 'es':
      // La precisión entre paréntesis de la etiqueta del criterio (p. ej. «(uveal)» del tipo IV) se muestra junto al Sí.
      if (c.valor && c.etiqueta) {
        const precision = /\((.+)\)\s*$/.exec(c.etiqueta);
        if (precision) return `Sí (${precision[1]})`;
      }
      return siNo(c.campo, c.valor);
    case 'iguales':
      return 'Proporcional';
    case 'cualquiera':
      return c.etiqueta;
    default:
      return `${SIM[c.op]} ${formatMedida(c.campo, c.valor)}`;
  }
}

function TablaClasificacion() {
  const cfg = clinicalConfig;
  const td = "px-2 py-0.5 align-top xl:py-1";
  return (
    <div className="relative h-full overflow-auto">
      <table className="w-full min-w-[56rem] border-collapse text-left text-xs">
        <caption className="sr-only">Criterios, tratamiento y esquema por tipo. Resaltado: criterio mayor.</caption>
        <thead>
          <tr className="border-b-2 border-primary align-bottom">
            <th scope="col" className="w-36 px-2 pb-0.5 text-[11px] font-bold text-slateGray">
              Característica
              <span className="mt-1 block font-normal">
                <span className="rounded bg-primary-10 px-1 font-bold text-primary-900">Resaltado</span> = mayor
              </span>
            </th>
            {cfg.tipos.map((t) => (
              <th key={t.id} scope="col" className="px-2 pb-0.5">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black leading-none text-primary">{t.romano}</span>
                  <span className="text-xs font-bold leading-tight text-ink">
                    {t.nombre}
                    {t.sigla && <span className="text-slateGray"> ({t.sigla})</span>}
                  </span>
                </div>
                <div className="w-20 xl:w-28">
                  <EyeSchematic esquema={t.esquema} titulo={`Tipo ${t.romano}`} compacto />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FILAS.map((f) => (
            <tr key={f.titulo} className="border-b border-gray-100">
              <th scope="row" className={`${td} font-semibold text-slateGray`}>
                {f.titulo}
              </th>
              {cfg.tipos.map((t) => {
                const crit = t.criterios.filter((c) => f.campos.includes(claveCriterio(c)));
                return (
                  <td key={t.id} className={td}>
                    {crit.length === 0
                      ? <span className="text-slateGray">Variable</span>
                      : crit.map((c) => (
                          <span
                            key={etiquetaCriterio(c)}
                            className={c.nivel === 'mayor' ? 'mr-1 inline-block rounded bg-primary-10 px-1 font-bold text-primary-900' : 'mr-1 inline-block'}
                          >
                            {celda(c)}
                          </span>
                        ))}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-b border-gray-100 bg-lightBg">
            <th scope="row" className={`${td} font-bold text-ink`}>
              Preoperatorio
            </th>
            {cfg.tipos.map((t) => (
              <td key={t.id} className={`${td} font-semibold`}>
                {t.preoperatorio.join(' · ') || <span className="text-amber-800">Por definir</span>}
              </td>
            ))}
          </tr>
          <tr className="bg-lightBg">
            <th scope="row" className={`${td} font-bold text-ink`}>
              Técnica
            </th>
            {cfg.tipos.map((t) => (
              <td key={t.id} className={`${td} font-semibold`}>
                {t.tecnica.join(' + ')}
                {tecnicasAlternativas(t.id, cfg).map((a) => (
                  <span key={a.id} className="mt-1 block font-normal text-slateGray">
                    <span className="font-semibold text-ink">{a.titulo}</span> ({a.condicion}): {a.tecnica.join(' + ')}
                  </span>
                ))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ComoDecide() {
  const cfg = clinicalConfig;
  return (
    <div className="grid gap-3 text-sm text-ink md:grid-cols-3">
      {[
        {
          n: 1,
          t: 'Criterios mayores y de apoyo',
          d: 'Cada criterio es mayor (obligatorio) o de apoyo (suma al % de concordancia, no decide el tipo).',
        },
        {
          n: 2,
          t: `Orden ${cfg.ordenEvaluacion.join(' → ')}`,
          d: 'Los rangos se superponen (un nanoftalmos también tiene LA < 21 mm). El diagnóstico es el primer tipo que cumple todos sus criterios mayores.',
        },
        {
          n: 3,
          t: 'Zona gris',
          d: `Si ningún tipo cumple sus mayores: «No clasificable», con los ${cfg.cercanosEnZonaGris} tipos más cercanos y los criterios en conflicto. Nunca se fuerza un diagnóstico.`,
        },
      ].map((p) => (
        <div key={p.n} className="rounded-2xl bg-lightBg p-4">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{p.n}</span>
          <h3 className="mt-2 font-bold">{p.t}</h3>
          <p className="mt-1 text-slateGray">{p.d}</p>
        </div>
      ))}
      <p className="text-xs text-slateGray md:col-span-3">
        Las reglas se leen de <code className="rounded bg-slateGray-100 px-1">config/rules.json</code> (v{cfg.version},{' '}
        {cfg.fechaRevision}); esta página se genera a partir de ellas. Vea también la{' '}
        <Link to="/evidencia" className="font-semibold text-primary underline">
          validación con la literatura
        </Link>
        .
      </p>
    </div>
  );
}

function Glosario() {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
      {clinicalConfig.glosario.map((g) => (
        <div key={g.termino} className="flex gap-2 border-b border-gray-100 pb-1.5">
          <dt className="w-32 shrink-0 font-bold text-ink">{g.termino}</dt>
          <dd className="text-slateGray">{g.definicion}</dd>
        </div>
      ))}
    </dl>
  );
}

function Modulos() {
  const cfg = clinicalConfig;
  return (
    <div className="grid gap-3 text-sm md:grid-cols-2">
      <div className="rounded-2xl bg-lightBg p-4">
        <h3 className="font-bold text-ink">Riesgo de glaucoma maligno</h3>
        <p className="text-xs text-slateGray">
          Bajo 0–{cfg.glaucomaMaligno.umbrales.moderadoDesde - 1} · Moderado {cfg.glaucomaMaligno.umbrales.moderadoDesde}–
          {cfg.glaucomaMaligno.umbrales.altoDesde - 1} · Alto ≥ {cfg.glaucomaMaligno.umbrales.altoDesde} factores
        </p>
        <ul className="mt-2 list-disc columns-2 pl-5 text-xs">
          {cfg.glaucomaMaligno.factores.map((f) => (
            <li key={etiquetaCriterio(f)}>{etiquetaCriterio(f)}</li>
          ))}
        </ul>
      </div>
      <div className="space-y-2 rounded-2xl bg-lightBg p-4 text-xs">
        <p>
          <strong>Alerta facomórfica:</strong> {cfg.alertaFacomorfica.criterios.map((c) => etiquetaCriterio(c)).join(' y ')}.
        </p>
        <p>
          <strong>LIO:</strong> {cfg.lio.formulas.map((f) => f.nombre).join(', ')}. Aviso de piggyback con LA &lt; {cfg.lio.piggyback.longitudAxialAnticipadaMm} mm.
        </p>
        <p>
          <strong>Alertas clínicas:</strong> {cfg.alertasClinicas.map((a) => a.titulo).join('; ')}.
        </p>
        <p>
          <strong>Valores en el límite:</strong> aviso a ≤ {cfg.toleranciaLimiteMm} mm (o ≤ {cfg.toleranciaLimiteIndice} en el índice LT/AL) de un umbral.
        </p>
      </div>
    </div>
  );
}

function Pendientes() {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink">
      {clinicalConfig.supuestosPendientes.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

/** "Acerca de" como diapositiva: la tabla completa en una pantalla y el resto en pestañas. */
export function AboutPage() {
  const [pestana, setPestana] = useState('tabla');
  return (
    <div className="flex flex-col gap-2 lg:h-full">
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-black tracking-tight text-ink">Algoritmo del manejo de cirugía de catarata en ojo pequeño</h1>
        <p className="text-xs text-slateGray">Dr. Fermín Silva Cayatopa · Clínica La Luz</p>
      </div>
      <section aria-label="Clasificación" className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white px-4 pb-4 pt-1 shadow-sm">
        <Tabs
          label="Secciones de la clasificación"
          activo={pestana}
          onCambiar={setPestana}
          className="min-h-0 flex-1"
          panelClassName="overflow-y-auto"
          tabs={[
            { id: 'tabla', label: 'Tabla de clasificación', contenido: <TablaClasificacion /> },
            { id: 'como', label: 'Cómo decide', contenido: <ComoDecide /> },
            { id: 'glosario', label: 'Glosario', contenido: <Glosario /> },
            { id: 'modulos', label: 'Otros módulos', contenido: <Modulos /> },
            {
              id: 'pendientes',
              label: (
                <>
                  Pendientes
                  <span className="rounded-full bg-amber-500 px-1.5 text-[10px] leading-4 text-white">
                    {clinicalConfig.supuestosPendientes.length}
                  </span>
                </>
              ),
              contenido: <Pendientes />,
            },
            { id: 'referencias', label: 'Referencias', contenido: <Referencias /> },
          ]}
        />
      </section>
    </div>
  );
}
