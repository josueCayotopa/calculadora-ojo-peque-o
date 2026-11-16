import { clinicalConfig } from '@/config';
import { NOMBRE_VALOR, formatMedida, formatNumero } from '@/engine';
import type { Criterio } from '@/engine/types';
import { cn } from '@/lib/utils';

const FILAS = [
  { campo: 'longitudAxial', label: 'Longitud axial' },
  { campo: 'acd', label: 'Cámara anterior' },
  { campo: 'angulo', label: 'Ángulo' },
  { campo: 'wtw', label: 'Blanco a blanco (WTW)' },
  { campo: 'indiceLTAL', label: 'Índice LT/AL' },
  { campo: 'malformaciones', label: 'Malformaciones' },
] as const;

/** Texto de las celdas tal como figura en la tabla de clasificación (el ángulo se describe por gonioscopía con Shaffer). */
const TEXTO_TABLA: Record<string, string> = {
  'I-angulo': 'Shaffer 1–2\nMT posterior no visible ≥ 180°\nAbre con indentación (aposicional)',
  'II-angulo': 'Shaffer 3–4\nTodas las estructuras visibles',
  'III-angulo': 'Shaffer 2 (a veces 3)\nMT visible; cierre < 180°',
  'IV-angulo': 'Shaffer variable\n+ anomalía estructural (inserción alta, remanentes, tejido colobomatoso)',
  'V-angulo': 'Shaffer 0\nIndentación: aposicional vs sinequial\n+ extensión en grados',
  'III-longitudAxial': '< 20–21 mm (−2 DE)',
  'IV-longitudAxial': '< 21 mm (−2 DE)',
  'III-acd': '2.0–2.5 mm (proporcional)',
  'IV-acd': '≤ o > 2.5 mm',
  'IV-malformaciones': 'Sí (colobomas, disgenesias)',
};

const SIMBOLO = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' } as const;

/** Valor del criterio tal como aparece en la tabla de clasificación (sin el nombre de la variable). */
function valor(c: Criterio): string {
  switch (c.op) {
    case 'entre':
      return `${c.campo === 'indiceLTAL' ? c.min.toFixed(2) : formatNumero(c.min)}–${formatMedida(c.campo, c.max)}`;
    case 'en':
      return c.valores.map((v) => NOMBRE_VALOR[v] ?? v).join(' o ');
    case 'es':
      return c.valor ? 'Sí' : 'No';
    case 'iguales':
    case 'cualquiera':
      return c.etiqueta;
    default:
      return `${SIMBOLO[c.op]} ${formatMedida(c.campo, c.valor)}`;
  }
}

/**
 * Valores de cada variable por tipo (tabla de clasificación). Los criterios mayores (obligatorios)
 * van resaltados; los menores cuentan para el mínimo «4 de 6». Se genera desde la configuración.
 */
export function TablaTipos() {
  const { tipos, minimoCriterios } = clinicalConfig;
  return (
    <section aria-labelledby="titulo-tabla-tipos" className="glass rounded-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="titulo-tabla-tipos" className="text-sm font-bold text-ink">
          Valores de la tabla por tipo
        </h2>
        <p className="text-[11px] text-slateGray">
          <span className="rounded-full bg-primary-10 px-1.5 font-bold text-primary-900">Mayor</span> obligatorio ·{' '}
          Menor: suma al mínimo de {minimoCriterios ?? 'todos los'} criterios (4 de 6)
        </p>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-xs">
          <caption className="sr-only">Valores de cada variable para los cinco tipos de ojo pequeño</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-semibold text-slateGray">
                Variable
              </th>
              {tipos.map((t) => (
                <th key={t.id} scope="col" className="px-2 py-1 text-center font-black text-primary" title={t.nombre}>
                  Tipo {t.romano}
                  {t.sigla && <span className="block text-[10px] font-semibold text-slateGray">{t.sigla}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FILAS.map((f) => (
              <tr key={f.campo}>
                <th scope="row" className="border-t border-white/60 px-2 py-1 text-left font-semibold text-ink">
                  {f.label}
                </th>
                {tipos.map((t) => {
                  const c = t.criterios.find((k) => 'campo' in k && k.campo === f.campo);
                  const mayor = c?.nivel === 'mayor';
                  return (
                    <td
                      key={t.id}
                      className={cn(
                        'whitespace-pre-line border-t border-white/60 px-2 py-1 text-center',
                        mayor ? 'bg-primary-10 font-semibold text-primary-900' : c ? 'text-ink' : 'italic text-slateGray',
                      )}
                    >
                      {TEXTO_TABLA[`${t.id}-${f.campo}`] ?? (c ? valor(c) : 'Variable')}
                      <span className="sr-only">{c ? (mayor ? ' (criterio mayor)' : ' (criterio menor)') : ''}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
