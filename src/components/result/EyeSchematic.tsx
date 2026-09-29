import { useId } from 'react';
import type { EsquemaOjo } from '@/engine/types';

/**
 * Corte sagital esquemático del ojo de cada tipo (inspirado en la Figura 1 de
 * Hoffman 2015 / Tabla 15-1): segmento anterior o posterior corto, esclera
 * engrosada, efusión, cristalino, microcórnea… El contorno punteado es un ojo
 * normal de referencia. Es ilustrativo, no está a escala.
 */

const GRIS = '#5f6263';
const GRANATE = '#b0191a';
const CY = 100;

export function describirEsquema(e: EsquemaOjo): string[] {
  const rasgos: string[] = [];
  if (e.segmentoAnterior === 'corto') rasgos.push('Segmento anterior corto (cámara anterior estrecha)');
  if (e.segmentoPosterior === 'corto') rasgos.push('Segmento posterior corto');
  if (e.microcornea) rasgos.push('Microcórnea');
  if (e.escleraGruesa) rasgos.push('Esclera engrosada');
  if (e.efusion) rasgos.push('Efusión coroidea/uveal');
  if (e.cuerpoCiliarAnteriorizado) rasgos.push('Cuerpo ciliar anteriorizado');
  if (e.cristalino === 'intumescente') rasgos.push('Cristalino intumescente (grande)');
  if (e.cristalino === 'coloboma') rasgos.push('Coloboma de cristalino');
  if (e.plieguesRetina) rasgos.push('Pliegues retinianos papilomaculares');
  if (e.malformacion) rasgos.push('Malformación (coloboma/disgenesia)');
  if (rasgos.length === 0) rasgos.push('Proporciones normales');
  return rasgos;
}

export function EyeSchematic({ esquema, titulo, compacto = false }: { esquema: EsquemaOjo; titulo: string; compacto?: boolean }) {
  const flecha = `flecha-${useId().replace(/:/g, '')}`;
  const x0 = 70; // plano del limbo
  const postCorto = esquema.segmentoPosterior === 'corto';
  const antCorto = esquema.segmentoAnterior === 'corto';

  // Globo: el segmento posterior define la longitud.
  const rx = postCorto ? 92 : 122;
  const ry = postCorto ? 76 : 88;
  const cx = x0 + rx - 6;
  const esclera = esquema.escleraGruesa ? 11 : 4;

  // Córnea y cámara anterior.
  const hc = esquema.microcornea ? 30 : 38; // semialtura de la córnea
  const abombamiento = antCorto ? 16 : 26;
  const vertice = x0 - abombamiento;

  // Cristalino.
  const lx = x0 + (antCorto ? 14 : 20) + (esquema.cristalino === 'intumescente' ? 6 : 0);
  const lrx = esquema.cristalino === 'intumescente' ? 17 : 12;
  const lry = esquema.cristalino === 'intumescente' ? 34 : 28;

  // Iris: se inclina hacia delante cuando la cámara es estrecha.
  const irisX = x0 + (antCorto ? 6 : 3);

  const ciliarX = x0 + (esquema.cuerpoCiliarAnteriorizado ? 8 : 18);
  const polo = cx + rx; // polo posterior

  return (
    <figure className="space-y-2">
      <svg
        viewBox="0 0 330 216"
        role="img"
        aria-label={`Esquema del ${titulo}: ${describirEsquema(esquema).join(', ')}.`}
        className="h-auto w-full max-w-md"
      >
        {/* Ojo normal de referencia */}
        <ellipse cx={x0 + 122 - 6} cy={CY} rx={122} ry={88} fill="none" stroke={GRIS} strokeWidth={1} strokeDasharray="4 4" opacity={0.45} />

        {/* Globo: esclera y coroides */}
        <ellipse cx={cx} cy={CY} rx={rx} ry={ry} fill="#fff" stroke={esquema.escleraGruesa ? GRANATE : GRIS} strokeWidth={esclera} />
        <ellipse cx={cx} cy={CY} rx={rx - esclera / 2 - 2} ry={ry - esclera / 2 - 2} fill="none" stroke="#c9a28c" strokeWidth={2} />

        {/* Efusión coroidea: domos en la periferia */}
        {esquema.efusion && (
          <g fill={GRANATE} opacity={0.35}>
            <path d={`M ${cx - rx * 0.35} ${CY - ry + esclera + 2} Q ${cx} ${CY - ry + esclera + 26} ${cx + rx * 0.45} ${CY - ry * 0.8 + esclera}`} />
            <path d={`M ${cx - rx * 0.35} ${CY + ry - esclera - 2} Q ${cx} ${CY + ry - esclera - 26} ${cx + rx * 0.45} ${CY + ry * 0.8 - esclera}`} />
          </g>
        )}

        {/* Pliegues retinianos en el polo posterior */}
        {esquema.plieguesRetina && (
          <path
            d={`M ${polo - 14} ${CY - 18} q -6 6 0 12 q 6 6 0 12 q -6 6 0 12`}
            fill="none"
            stroke={GRANATE}
            strokeWidth={2}
          />
        )}

        {/* Córnea y cámara anterior */}
        <path
          d={`M ${x0} ${CY - hc} Q ${vertice - 6} ${CY} ${x0} ${CY + hc}`}
          fill="#e8f1f8"
          stroke={esquema.microcornea ? GRANATE : GRIS}
          strokeWidth={2.5}
        />

        {/* Cuerpo ciliar */}
        <g fill="#8a5a44">
          <path d={`M ${ciliarX - 6} ${CY - ry * 0.62} l 10 -6 l 2 12 z`} />
          <path d={`M ${ciliarX - 6} ${CY + ry * 0.62} l 10 6 l 2 -12 z`} />
        </g>

        {/* Iris */}
        <g stroke="#6b4a3a" strokeWidth={3} strokeLinecap="round">
          <line x1={x0 + 1} y1={CY - hc + 2} x2={irisX} y2={CY - 12} />
          <line x1={x0 + 1} y1={CY + hc - 2} x2={irisX} y2={CY + 12} />
        </g>

        {/* Cristalino */}
        <ellipse
          cx={lx}
          cy={CY}
          rx={lrx}
          ry={lry}
          fill={esquema.cristalino === 'intumescente' ? '#f6dfb6' : '#f3ead2'}
          stroke={esquema.cristalino === 'normal' ? GRIS : GRANATE}
          strokeWidth={2}
        />
        {esquema.cristalino === 'coloboma' && (
          <path d={`M ${lx - 7} ${CY + lry - 1} L ${lx} ${CY + lry - 12} L ${lx + 7} ${CY + lry - 1} Z`} fill="#fff" stroke={GRANATE} strokeWidth={1.5} />
        )}

        {/* Malformación: coloboma coriorretiniano inferior */}
        {esquema.malformacion && (
          <path d={`M ${cx + 10} ${CY + ry - 1} a 14 6 0 0 1 28 0`} fill="#fff" stroke={GRANATE} strokeWidth={2} strokeDasharray="3 2" />
        )}

        {/* Longitud axial */}
        <g stroke={GRIS} strokeWidth={1} fontSize={10} fill={GRIS}>
          <line x1={vertice} y1={206} x2={polo} y2={206} markerStart={`url(#${flecha})`} markerEnd={`url(#${flecha})`} />
          <text x={(vertice + polo) / 2} y={202} textAnchor="middle" stroke="none">
            LA
          </text>
        </g>
        <defs>
          <marker id={flecha} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={GRIS} />
          </marker>
        </defs>
      </svg>
      <figcaption className={compacto ? 'sr-only' : 'text-xs text-slateGray'}>
        Esquema ilustrativo, no a escala. Línea punteada: ojo normal de referencia. En granate: rasgos característicos.
      </figcaption>
    </figure>
  );
}
