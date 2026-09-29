import { Link } from 'react-router-dom';
import { FileDown, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { NOMBRE_VALOR, formatNumero } from '@/engine';
import type { EvaluacionCompleta, NivelRiesgo, Ojo } from '@/engine/types';
import { resumenResultado, useEvaluaciones } from '@/state/EvaluationContext';
import { useExportarPdf } from './ResultPage';

/**
 * Control de calidad biométrico habitual (no es un criterio de la clasificación):
 * una diferencia interocular de LA > 0.3 mm sugiere verificar la medición.
 */
const DIF_LA_VERIFICAR_MM = 0.3;

const VARIANTE_RIESGO: Record<NivelRiesgo, 'success' | 'warning' | 'danger'> = {
  bajo: 'success',
  moderado: 'warning',
  alto: 'danger',
};

type Fila = { label: string; valor: (e: EvaluacionCompleta) => React.ReactNode; dif?: (od: EvaluacionCompleta, oi: EvaluacionCompleta) => string };

const mm = (n: number | null | undefined) => (n == null ? '—' : `${formatNumero(n)} mm`);
const delta = (a: number | null | undefined, b: number | null | undefined) =>
  a == null || b == null ? '' : `Δ ${formatNumero(Math.abs(a - b))} mm`;
const lista = (v: string | null | undefined) => (v ? NOMBRE_VALOR[v] ?? v : '—');

const FILAS: Fila[] = [
  { label: 'Diagnóstico', valor: (e) => <strong>{resumenResultado(e)}</strong> },
  {
    label: 'Criterios',
    valor: (e) => {
      const t = e.clasificacion.tipo ?? e.clasificacion.masCercanos[0];
      return `Mayores ${t.mayores.cumplidos}/${t.mayores.total} · apoyo ${Math.round(t.apoyo.porcentaje * 100)} %`;
    },
  },
  { label: 'Alertas clínicas', valor: (e) => (e.clasificacion.alertas.length ? e.clasificacion.alertas.map((a) => a.titulo).join('; ') : '—') },
  { label: 'W-W', valor: (e) => mm(e.entrada.blancoBlanco), dif: (a, b) => delta(a.entrada.blancoBlanco, b.entrada.blancoBlanco) },
  { label: 'Segmento ant. / post.', valor: (e) => `${lista(e.entrada.segmentoAnterior)} / ${lista(e.entrada.segmentoPosterior)}` },
  { label: 'Refracción', valor: (e) => lista(e.entrada.refraccion) },
  {
    label: 'Glaucoma maligno',
    valor: (e) => (
      <Badge variant={VARIANTE_RIESGO[e.glaucomaMaligno.nivel]}>
        {e.glaucomaMaligno.nivel.toUpperCase()} · {e.glaucomaMaligno.presentes}/{e.glaucomaMaligno.total}
      </Badge>
    ),
  },
  { label: 'Alerta facomórfica', valor: (e) => (e.facomorfico.activa ? <Badge variant="danger">Sí</Badge> : 'No') },
  { label: 'Aviso piggyback', valor: (e) => (e.lio.piggyback.activa ? <Badge variant="warning">Sí</Badge> : 'No') },
  { label: 'Longitud axial', valor: (e) => mm(e.entrada.longitudAxial), dif: (a, b) => delta(a.entrada.longitudAxial, b.entrada.longitudAxial) },
  { label: 'CA', valor: (e) => mm(e.entrada.acd), dif: (a, b) => delta(a.entrada.acd, b.entrada.acd) },
  { label: 'Grosor del cristalino', valor: (e) => mm(e.entrada.grosorCristalino), dif: (a, b) => delta(a.entrada.grosorCristalino, b.entrada.grosorCristalino) },
  { label: 'Grosor escleral', valor: (e) => mm(e.entrada.grosorEscleral), dif: (a, b) => delta(a.entrada.grosorEscleral, b.entrada.grosorEscleral) },
  { label: 'Ángulo', valor: (e) => NOMBRE_VALOR[e.entrada.angulo] },
  { label: 'Efusión coroidea', valor: (e) => (e.entrada.efusionCoroidea ? 'Sí' : 'No') },
  { label: 'Cuerpo ciliar', valor: (e) => NOMBRE_VALOR[e.entrada.cuerpoCiliar] },
];

export function ComparePage() {
  const { evaluaciones } = useEvaluaciones();
  const { exportar, exportando, error } = useExportarPdf();
  const od = evaluaciones.OD;
  const oi = evaluaciones.OI;
  const faltantes = (['OD', 'OI'] as Ojo[]).filter((o) => !evaluaciones[o]);

  const asimetriaLA = od && oi && Math.abs(od.entrada.longitudAxial - oi.entrada.longitudAxial) > DIF_LA_VERIFICAR_MM;
  const distinto = od && oi && od.clasificacion.tipo?.id !== oi.clasificacion.tipo?.id;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-ink">Comparar OD / OI</h1>
          {asimetriaLA && (
            <Badge variant="warning" title="Verifique la biometría antes de planificar.">
              ⚠ Asimetría de LA &gt; {DIF_LA_VERIFICAR_MM} mm: verificar biometría
            </Badge>
          )}
          {distinto && <Badge variant="neutral">Diagnóstico distinto en cada ojo</Badge>}
        </div>
        {od && oi && (
          <Button size="sm" onClick={() => exportar([od, oi])} disabled={exportando}>
            <FileDown aria-hidden="true" />
            {exportando ? 'Generando…' : 'Exportar PDF (ambos ojos)'}
          </Button>
        )}
      </div>
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      {faltantes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slateGray">
            {faltantes.length === 2
              ? 'Aún no hay evaluaciones en esta sesión.'
              : `Falta evaluar el ${faltantes[0] === 'OD' ? 'ojo derecho (OD)' : 'ojo izquierdo (OI)'}.`}
          </p>
          <div className="flex gap-2">
            {faltantes.map((o) => (
              <Link key={o} to={`/evaluacion?ojo=${o}`} className={buttonVariants({ size: 'sm' })}>
                <Plus aria-hidden="true" />
                Evaluar {o}
              </Link>
            ))}
          </div>
        </div>
      )}

      {(od || oi) && (
        <section aria-label="Resumen comparativo" className="overflow-x-auto rounded-3xl bg-white px-4 py-2 shadow-sm">
          <table className="w-full min-w-[36rem] text-left text-[13px]">
            <thead>
              <tr className="border-b-2 border-primary text-ink">
                <th scope="col" className="w-48 py-1.5 pr-4 font-bold">Parámetro</th>
                <th scope="col" className="py-1.5 pr-4 font-bold">
                  OD {od && <Link to="/resultado/OD" className="ml-2 font-normal text-primary underline">ver</Link>}
                </th>
                <th scope="col" className="py-1.5 pr-4 font-bold">
                  OI {oi && <Link to="/resultado/OI" className="ml-2 font-normal text-primary underline">ver</Link>}
                </th>
                <th scope="col" className="py-1.5 font-bold text-slateGray">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map((f) => (
                <tr key={f.label} className="border-b border-gray-100 last:border-0">
                  <th scope="row" className="py-1 pr-4 font-semibold text-slateGray">{f.label}</th>
                  <td className="py-1 pr-4">{od ? f.valor(od) : '—'}</td>
                  <td className="py-1 pr-4">{oi ? f.valor(oi) : '—'}</td>
                  <td className="py-1 text-slateGray">{od && oi && f.dif ? f.dif(od, oi) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
