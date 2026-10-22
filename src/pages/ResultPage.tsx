import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Columns2, FileDown, Pencil, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Tabs } from '@/components/ui/tabs';
import { DiagnosticoHero, PanelCriterios, PanelEsquema } from '@/components/result/ClassificationCard';
import { RiskSemaphore } from '@/components/result/RiskSemaphore';
import { cn } from '@/lib/utils';
import { Alertas, ChecklistPreoperatorio, RecomendacionLio, Tratamiento, listaAlertas } from '@/components/result/Panels';
import { useEvaluaciones } from '@/state/EvaluationContext';
import type { EvaluacionCompleta, NivelRiesgo, Ojo } from '@/engine/types';

const PUNTO_RIESGO: Record<NivelRiesgo, string> = { bajo: 'bg-green-600', moderado: 'bg-amber-500', alto: 'bg-red-700' };

export function useExportarPdf() {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function exportar(evaluaciones: EvaluacionCompleta[]) {
    setExportando(true);
    setError(null);
    try {
      const { exportarPdf } = await import('@/pdf/exportPdf');
      await exportarPdf(evaluaciones);
    } catch (e) {
      console.error(e);
      setError('No se pudo generar el PDF. Intente nuevamente.');
    } finally {
      setExportando(false);
    }
  }
  return { exportar, exportando, error };
}

/**
 * Resultado en formato "diapositiva": tres columnas que caben en una pantalla.
 * Izquierda: diagnóstico + esquema. Centro: el porqué (criterios ✓/✗).
 * Derecha: pestañas con tratamiento, alertas, riesgo, checklist, LIO y tipos.
 */
export function ResultPage() {
  const { ojo } = useParams<{ ojo: Ojo }>();
  const navigate = useNavigate();
  const { evaluaciones, limpiar } = useEvaluaciones();
  const { exportar, exportando, error } = useExportarPdf();
  const [pestana, setPestana] = useState('tratamiento');
  const evaluacion = ojo === 'OD' || ojo === 'OI' ? evaluaciones[ojo] : undefined;

  if (!evaluacion || !ojo) {
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-10 text-center">
        <h1 className="text-2xl font-black text-ink">No hay resultado para mostrar</h1>
        <p className="text-slateGray">Los resultados solo se conservan mientras la pestaña está abierta. Inicie una nueva evaluación.</p>
        <Link to="/evaluacion" className={buttonVariants({ size: 'lg' })}>
          Nueva evaluación
        </Link>
      </div>
    );
  }

  const otro: Ojo = ojo === 'OD' ? 'OI' : 'OD';
  const nAlertas = listaAlertas(evaluacion).length;

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-black tracking-tight text-ink">Resultado · {ojo}</h1>
        <div className="no-print flex flex-wrap gap-2">
          <Button size="sm" onClick={() => exportar([evaluacion])} disabled={exportando}>
            <FileDown aria-hidden="true" />
            {exportando ? 'Generando…' : 'Exportar PDF'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(evaluaciones[otro] ? '/comparar' : `/evaluacion?ojo=${otro}`)}>
            <Columns2 aria-hidden="true" />
            {evaluaciones[otro] ? 'Comparar OD/OI' : `Evaluar ${otro} y comparar`}
          </Button>
          <Link to={`/evaluacion?ojo=${ojo}&editar=1`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <Pencil aria-hidden="true" />
            Editar datos
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              limpiar();
              navigate('/evaluacion');
            }}
          >
            <Plus aria-hidden="true" />
            Nueva evaluación
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[15rem_minmax(0,1fr)_23rem] xl:grid-cols-[18rem_minmax(0,1fr)_26rem]">
        <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
          <DiagnosticoHero evaluacion={evaluacion} onVerAlertas={() => setPestana('alertas')} />
          <PanelEsquema evaluacion={evaluacion} />
        </div>

        <PanelCriterios evaluacion={evaluacion} />

        <section aria-label="Tratamiento y módulos complementarios" className="flex min-h-0 flex-col rounded-3xl bg-white px-4 pb-4 pt-2 shadow-sm">
          <Tabs
            label="Detalle del resultado"
            activo={pestana}
            onCambiar={setPestana}
            className="min-h-0 flex-1"
            panelClassName="overflow-y-auto pr-1"
            tabs={[
              { id: 'tratamiento', label: 'Tratamiento', contenido: <Tratamiento evaluacion={evaluacion} /> },
              {
                id: 'alertas',
                label: (
                  <>
                    Alertas
                    {nAlertas > 0 && (
                      <span className="rounded-full bg-red-700 px-1.5 text-[10px] leading-4 text-white">{nAlertas}</span>
                    )}
                  </>
                ),
                contenido: <Alertas evaluacion={evaluacion} />,
              },
              {
                id: 'riesgo',
                label: (
                  <>
                    Riesgo
                    <span
                      className={cn('size-2.5 rounded-full', PUNTO_RIESGO[evaluacion.glaucomaMaligno.nivel])}
                      aria-label={`nivel ${evaluacion.glaucomaMaligno.nivel}`}
                      role="img"
                    />
                  </>
                ),
                contenido: <RiskSemaphore riesgo={evaluacion.glaucomaMaligno} />,
              },
              { id: 'checklist', label: 'Checklist', contenido: <ChecklistPreoperatorio evaluacion={evaluacion} /> },
              { id: 'lio', label: 'LIO', contenido: <RecomendacionLio evaluacion={evaluacion} /> },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
