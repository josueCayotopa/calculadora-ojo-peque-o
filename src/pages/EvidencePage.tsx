import { useState } from 'react';
import { BookOpen, ExternalLink, Library } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { evidencia, type Comparacion, type Concordancia } from '@/config/evidencia';
import { cn } from '@/lib/utils';

const ESTADOS: Record<Concordancia, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral'; punto: string }> = {
  concuerda: { label: 'Concuerda', variant: 'success', punto: 'bg-green-600' },
  parcial: { label: 'Parcial', variant: 'warning', punto: 'bg-amber-500' },
  difiere: { label: 'Difiere', variant: 'danger', punto: 'bg-red-700' },
  sin_evidencia: { label: 'Sin evidencia', variant: 'neutral', punto: 'bg-gray-400' },
};

const fuentePorId = new Map(evidencia.fuentes.map((f, i) => [f.id, { ...f, n: i + 1 }]));
const RESUMEN = 'resumen';
const FUENTES = 'fuentes';

function Fuentes({ ids }: { ids: string[] }) {
  const lista = ids.length ? ids.map((id) => fuentePorId.get(id)!).filter(Boolean) : evidencia.fuentes.map((f, i) => ({ ...f, n: i + 1 }));
  return (
    <ol className="space-y-1.5 text-xs">
      {lista.map((f) => (
        <li key={f.id} className="flex gap-2">
          <span className="w-6 shrink-0 font-bold text-primary">[{f.n}]</span>
          <span>
            {f.cita} <span className="text-slateGray">({f.tipo})</span>{' '}
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
              Abrir <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Detalle({ c }: { c: Comparacion }) {
  const e = ESTADOS[c.concordancia];
  return (
    <article aria-labelledby="ev-titulo" className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ev-titulo" className="text-lg font-bold text-ink">
          {c.tema}
        </h2>
        <Badge variant={e.variant}>{e.label}</Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-2xl bg-primary-50 p-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-primary-800">Tabla del Dr. Silva</h3>
          <p className="mt-1 text-sm font-semibold text-ink">{c.silva}</p>
        </div>
        <div className="rounded-2xl bg-lightBg p-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slateGray">Literatura</h3>
          <p className="mt-1 text-sm text-ink">
            {c.literatura} {c.fuentes.map((id) => `[${fuentePorId.get(id)?.n}]`).join('')}
          </p>
        </div>
      </div>
      {c.comentario && (
        <div className={cn('rounded-2xl border p-3 text-sm', c.concordancia === 'difiere' ? 'border-red-200 bg-red-50' : 'border-gray-200')}>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slateGray">Implicancia</h3>
          <p className="mt-1 text-ink">{c.comentario}</p>
        </div>
      )}
      {c.fuentes.length > 0 && (
        <div>
          <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slateGray">Fuentes citadas</h3>
          <Fuentes ids={c.fuentes} />
        </div>
      )}
    </article>
  );
}

function Resumen({ onIr }: { onIr: (tema: string) => void }) {
  const cuenta = (k: Concordancia) => evidencia.comparaciones.filter((c) => c.concordancia === k).length;
  const difieren = evidencia.comparaciones.filter((c) => c.concordancia === 'difiere');
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Resumen de la validación</h2>
        <ul className="grid grid-cols-4 gap-2 text-center">
          {(Object.keys(ESTADOS) as Concordancia[]).map((k) => (
            <li key={k} className="rounded-2xl bg-lightBg p-2">
              <p className="text-2xl font-black text-ink">{cuenta(k)}</p>
              <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slateGray">
                <span className={cn('size-2 rounded-full', ESTADOS[k].punto)} aria-hidden="true" />
                {ESTADOS[k].label}
              </p>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
          <h3 className="text-sm font-bold text-red-950">Puntos que requieren decisión del Dr. Silva</h3>
          <ul className="mt-1 space-y-0.5">
            {difieren.map((c) => (
              <li key={c.tema}>
                <button type="button" onClick={() => onIr(c.tema)} className="text-left text-sm font-semibold text-red-900 underline-offset-2 hover:underline">
                  {c.tema} →
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slateGray">Metodología</h3>
        <p className="text-xs text-slateGray">{evidencia.metodologia}</p>
      </div>
    </div>
  );
}

/** Validación con la literatura en formato maestro–detalle: lista a la izquierda, tema a la derecha, sin desplazar la página. */
export function EvidencePage() {
  const [filtro, setFiltro] = useState<Concordancia | 'todas'>('todas');
  const [sel, setSel] = useState<string>(RESUMEN);
  const lista = evidencia.comparaciones.filter((c) => filtro === 'todas' || c.concordancia === filtro);
  const actual = evidencia.comparaciones.find((c) => c.tema === sel);

  return (
    <div className="flex flex-col gap-2 lg:h-full">
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-black tracking-tight text-ink">Validación con la literatura</h1>
        <p className="text-xs text-slateGray">Revisado el {evidencia.fechaRevision} · para revisión del equipo médico</p>
      </div>

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <nav aria-label="Temas revisados" className="flex flex-col gap-2 rounded-3xl bg-white p-3 shadow-sm lg:min-h-0">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            Mostrar
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as Concordancia | 'todas')}
              className="min-h-9 flex-1 rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="todas">Todos los temas ({evidencia.comparaciones.length})</option>
              {(Object.keys(ESTADOS) as Concordancia[]).map((k) => (
                <option key={k} value={k}>
                  {ESTADOS[k].label} ({evidencia.comparaciones.filter((c) => c.concordancia === k).length})
                </option>
              ))}
            </select>
          </label>
          <ul className="space-y-0.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {lista.map((c) => (
              <li key={c.tema}>
                <button
                  type="button"
                  aria-current={sel === c.tema ? 'true' : undefined}
                  onClick={() => setSel(c.tema)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-0.5 text-left text-xs leading-tight',
                    sel === c.tema ? 'bg-primary-50 font-bold text-primary-900' : 'font-medium text-ink hover:bg-lightBg',
                  )}
                >
                  <span className={cn('size-2 shrink-0 rounded-full', ESTADOS[c.concordancia].punto)} role="img" aria-label={ESTADOS[c.concordancia].label} />
                  {c.tema}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm lg:min-h-0">
          <div role="group" aria-label="Vistas generales" className="flex shrink-0 flex-wrap gap-1">
            {[
              { id: RESUMEN, label: 'Resumen y metodología', Icon: BookOpen },
              { id: FUENTES, label: `Fuentes (${evidencia.fuentes.length})`, Icon: Library },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={sel === id}
                onClick={() => setSel(id)}
                className={cn(
                  'flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  sel === id ? 'bg-primary text-white' : 'bg-slateGray-100 text-ink hover:bg-gray-200',
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
            {actual && <span className="self-center text-xs text-slateGray">· Tema seleccionado en la lista</span>}
          </div>
          <div aria-live="polite" className="min-h-0 flex-1 lg:overflow-y-auto">
          {actual ? (
            <Detalle c={actual} />
          ) : sel === FUENTES ? (
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-ink">Fuentes consultadas</h2>
              <Fuentes ids={[]} />
            </div>
          ) : (
            <Resumen onIr={setSel} />
          )}
          </div>
        </section>
      </div>
    </div>
  );
}
