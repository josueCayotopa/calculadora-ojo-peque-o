import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, History, ShieldAlert, Trash2, WifiOff } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EyeSchematic } from '@/components/result/EyeSchematic';
import { AVISO_LEGAL } from '@/components/Layout';
import { clinicalConfig } from '@/config';
import { resumenResultado, useEvaluaciones } from '@/state/EvaluationContext';
import { borrarHistorial, eliminarDeHistorial, leerHistorial, type EntradaHistorial } from '@/state/history';
import { formatFecha } from '@/lib/utils';

/** Inicio en una sola pantalla: presentación + los 5 tipos a la izquierda, sesión e historial a la derecha. */
export function HomePage() {
  const navigate = useNavigate();
  const { evaluaciones, evaluar, limpiar } = useEvaluaciones();
  const [historial, setHistorial] = useState<EntradaHistorial[]>(() => leerHistorial());
  const enCurso = Object.values(evaluaciones);

  function abrir(e: EntradaHistorial) {
    evaluar(e.entrada);
    navigate(`/resultado/${e.ojo}`);
  }

  function borrarTodo() {
    if (window.confirm('¿Borrar todo el historial guardado en este dispositivo? Esta acción no se puede deshacer.')) {
      borrarHistorial();
      setHistorial([]);
    }
  }

  return (
    <div className="grid gap-3 lg:h-full lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3 lg:min-h-0">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="space-y-3 p-6">
            <Badge>Clasificación con finalidad quirúrgica</Badge>
            <h1 className="text-3xl font-black leading-none tracking-tight text-ink xl:text-4xl">
              Calculadora de Clasificación Clínica  del <span className="text-primary">Ojo Pequeño</span> Para definir plan quirurgico.  
            </h1>
            <p className="max-w-2xl text-sm text-slateGray">
              Algoritmo del manejo de cirugía de catarata en ojo pequeño del Dr. Fermín Silva Cayatopa (Clínica La Luz),
              sustentado en Hoffman RS et al. (J Cataract Refract Surg 2015) y Yosar JC et al. (Clin Ophthalmol 2021). Da el
              diagnóstico, explica qué criterios se cumplen y sugiere el tratamiento.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="lg"
                onClick={() => {
                  limpiar();
                  navigate('/evaluacion');
                }}
              >
                Nueva evaluación
                <ArrowRight aria-hidden="true" />
              </Button>
              <Link to="/acerca" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Tabla de clasificación
              </Link>
              <Link to="/evidencia" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
                Validación con la literatura
              </Link>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-primary-100 bg-primary-50 px-6 py-3 text-primary-900" role="note">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p className="text-xs">
              <strong className="block text-sm">{AVISO_LEGAL}</strong>
              Apoyo a la decisión, no un diagnóstico definitivo. No se envían datos a ningún servidor; funciona sin conexión.
            </p>
          </div>
        </section>

        <section aria-labelledby="titulo-tipos" className="rounded-3xl bg-white p-4 shadow-sm lg:min-h-0 lg:flex-1">
          <h2 id="titulo-tipos" className="mb-2 text-sm font-bold text-ink">
            Los 5 tipos
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {clinicalConfig.tipos.map((t) => (
              <li key={t.id} className="rounded-2xl bg-lightBg p-2 text-center">
                <p className="text-2xl font-black leading-none text-primary">{t.romano}</p>
                <p className="mt-0.5 text-[11px] font-semibold leading-tight text-ink">
                  {t.nombre}
                  {t.sigla && <span className="text-slateGray"> ({t.sigla})</span>}
                </p>
                <EyeSchematic esquema={t.esquema} titulo={`Tipo ${t.romano}`} compacto />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-3 lg:min-h-0">
        {enCurso.length > 0 && (
          <section aria-labelledby="titulo-en-curso" className="rounded-3xl bg-white p-4 shadow-sm">
            <h2 id="titulo-en-curso" className="text-sm font-bold text-ink">
              Evaluación en curso
            </h2>
            <ul className="mt-2 space-y-1.5">
              {enCurso.map((e) => (
                <li key={e.entrada.ojo}>
                  <Link
                    to={`/resultado/${e.entrada.ojo}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:border-primary hover:bg-primary-50"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Badge variant="solid">{e.entrada.ojo}</Badge>
                      <span className="font-semibold text-ink">{resumenResultado(e)}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="titulo-historial" className="flex flex-col rounded-3xl bg-white p-4 shadow-sm lg:min-h-0 lg:flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="titulo-historial" className="flex items-center gap-2 text-sm font-bold text-ink">
                <History className="size-4 text-primary" aria-hidden="true" />
                Historial en este dispositivo
              </h2>
              <p className="text-xs text-slateGray">Opcional. Solo medidas y fecha, sin datos del paciente.</p>
            </div>
            {historial.length > 0 && (
              <Button variant="outline" size="sm" onClick={borrarTodo}>
                <Trash2 aria-hidden="true" />
                Borrar
              </Button>
            )}
          </div>
          {historial.length === 0 ? (
            <p className="mt-3 text-sm text-slateGray">
              No hay evaluaciones guardadas. Marque «Guardar en historial» al completar el formulario.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {historial.map((h) => (
                <li key={h.id} className="flex items-center gap-1 py-1.5">
                  <button
                    type="button"
                    onClick={() => abrir(h)}
                    className="flex min-w-0 flex-1 flex-col items-start rounded-lg px-1 text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Badge variant="neutral">{h.ojo}</Badge>
                      <span className="truncate">{h.resumen}</span>
                    </span>
                    <span className="text-[11px] text-slateGray">
                      {formatFecha(h.fecha)} · LA {h.entrada.longitudAxial} · CA {h.entrada.acd} mm
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={`Eliminar entrada del ${formatFecha(h.fecha)}`}
                    onClick={() => setHistorial(eliminarDeHistorial(h.id))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-slateGray">
            <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
            Instalable (PWA): funciona sin conexión en quirófano o consultorio.
          </p>
        </section>
      </div>
    </div>
  );
}
