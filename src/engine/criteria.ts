import type {
  CampoBooleano,
  CampoEnum,
  CampoNumerico,
  Criterio,
  CriterioEvaluado,
  EyeInput,
  OpComparacion,
} from './types';

/** Tolerancia numérica para comparar distancias al umbral (evita artefactos de coma flotante). */
const EPS = 1e-9;

export const NOMBRE_CAMPO: Record<CampoNumerico | CampoEnum | CampoBooleano, string> = {
  longitudAxial: 'LA',
  acd: 'CA',
  grosorCristalino: 'Cristalino (LT)',
  wtw: 'WTW',
  indiceLTAL: 'Índice LT/AL',
  angulo: 'Ángulo',
  malformaciones: 'Malformaciones anatómicas',
};

export const NOMBRE_VALOR: Record<string, string> = {
  abierto: 'abierto',
  estrecho: 'estrecho/ocluible',
  deformado: 'deformado',
  cerrado: 'cerrado/ocluible',
  normal: 'normal',
  corto: 'corto',
  anteriorizado: 'anteriorizado',
  intumescente: 'intumescente',
  coloboma: 'coloboma',
  microcornea: 'microcórnea',
};

/** Texto del «Sí» con su precisión clínica, como en la tabla de clasificación. */
export const TEXTO_SI: Partial<Record<CampoBooleano, string>> = {
  malformaciones: 'Sí (colobomas y disgenesias)',
};

export const siNo = (campo: CampoBooleano, v: boolean): string => (v ? (TEXTO_SI[campo] ?? 'Sí') : 'No');

const SIMBOLO: Record<OpComparacion, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };

/** 2 → "2.0", 22.25 → "22.25", 1.40 → "1.4": al menos un decimal, como en la clasificación original. */
export function formatNumero(n: number): string {
  const s = Number(n.toFixed(2)).toString();
  return s.includes('.') ? s : n.toFixed(1);
}

/** Valor con su unidad: "22.5 mm"; el índice LT/AL es adimensional y va con decimales fijos ("0.20"). */
export function formatMedida(campo: CampoNumerico, n: number, decimalesIndice = 2): string {
  return campo === 'indiceLTAL' ? n.toFixed(decimalesIndice) : `${formatNumero(n)} mm`;
}

/** Umbral sin unidad (el límite inferior de un rango): "2.0", "0.18". */
function formatUmbral(campo: CampoNumerico, n: number): string {
  return campo === 'indiceLTAL' ? n.toFixed(2) : formatNumero(n);
}

/**
 * Índice LT/AL = grosor del cristalino / longitud axial; null si falta alguno.
 * Se redondea a 6 decimales para que 4.4 / 22 cuente como 0.20 exacto en los límites.
 */
export function indiceLTAL(input: Pick<EyeInput, 'grosorCristalino' | 'longitudAxial'>): number | null {
  const lt = input.grosorCristalino;
  const la = input.longitudAxial;
  return typeof lt === 'number' && Number.isFinite(lt) && Number.isFinite(la) && la > 0 ? Math.round((lt / la) * 1e6) / 1e6 : null;
}

/** Distancia a un umbral por debajo de la cual el valor se marca "en el límite". */
export interface Tolerancia {
  mm: number;
  indice: number;
}

const SIN_TOLERANCIA: Tolerancia = { mm: 0, indice: 0 };
const tolerancia = (t: Tolerancia, campo: CampoNumerico) => (campo === 'indiceLTAL' ? t.indice : t.mm);

function comparar(x: number, op: OpComparacion, v: number): boolean {
  switch (op) {
    case '<':
      return x < v;
    case '<=':
      return x <= v;
    case '>':
      return x > v;
    case '>=':
      return x >= v;
  }
}

function leerNumero(input: EyeInput, campo: CampoNumerico): number | null {
  if (campo === 'indiceLTAL') return indiceLTAL(input);
  const v = input[campo];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function leerEnum(input: EyeInput, campo: CampoEnum): string | null {
  const v = input[campo] as string | null | undefined;
  return typeof v === 'string' && v !== '' ? v : null;
}

function leerBooleano(input: EyeInput, campo: CampoBooleano): boolean {
  return Boolean(input[campo]);
}

/** Etiqueta legible generada a partir del criterio, para que nunca quede desfasada del umbral. */
export function etiquetaCriterio(c: Criterio): string {
  if (c.etiqueta) return c.etiqueta;
  switch (c.op) {
    case 'entre':
      return `${formatUmbral(c.campo, c.min)} ${c.opMin === '>=' ? '≤' : '<'} ${NOMBRE_CAMPO[c.campo]} ${
        c.opMax === '<=' ? '≤' : '<'
      } ${formatMedida(c.campo, c.max)}`;
    case 'en':
      return `${NOMBRE_CAMPO[c.campo]} ${c.valores.map((v) => NOMBRE_VALOR[v] ?? v).join(' o ')}`;
    case 'es':
      return c.valor ? NOMBRE_CAMPO[c.campo] : `Sin ${NOMBRE_CAMPO[c.campo].charAt(0).toLowerCase()}${NOMBRE_CAMPO[c.campo].slice(1)}`;
    case 'iguales':
    case 'cualquiera':
      return c.etiqueta;
    default:
      return `${NOMBRE_CAMPO[c.campo]} ${SIMBOLO[c.op]} ${formatMedida(c.campo, c.valor)}`;
  }
}

export function evaluarCriterio(c: Criterio, input: EyeInput, tol: Tolerancia = SIN_TOLERANCIA): CriterioEvaluado {
  const etiqueta = etiquetaCriterio(c);
  const base = { etiqueta, peso: c.peso ?? 1, nivel: c.nivel ?? 'apoyo', enLimite: false, sinDato: false } as const;
  const sinDato = (campo?: string): CriterioEvaluado => ({ ...base, campo, cumple: false, sinDato: true, observado: 'sin dato' });

  switch (c.op) {
    case 'cualquiera': {
      const hijos = c.criterios.map((h) => evaluarCriterio(h, input, tol));
      const presentes = hijos.filter((h) => h.cumple);
      return {
        ...base,
        cumple: presentes.length > 0,
        sinDato: presentes.length === 0 && hijos.some((h) => h.sinDato),
        observado: presentes.length ? presentes.map((h) => h.etiqueta).join(', ') : 'ninguno',
        enLimite: hijos.some((h) => h.enLimite),
      };
    }
    case 'iguales': {
      const [a, b] = c.campos.map((k) => leerEnum(input, k));
      if (a === null || b === null) return sinDato();
      return {
        ...base,
        cumple: a === b,
        observado: `${NOMBRE_VALOR[a] ?? a} / ${NOMBRE_VALOR[b] ?? b}`,
      };
    }
    case 'en': {
      const v = leerEnum(input, c.campo);
      if (v === null) return sinDato(c.campo);
      return { ...base, campo: c.campo, cumple: c.valores.includes(v), observado: NOMBRE_VALOR[v] ?? v };
    }
    case 'es': {
      const v = leerBooleano(input, c.campo);
      return { ...base, campo: c.campo, cumple: v === c.valor, observado: v ? 'sí' : 'no' };
    }
    case 'entre': {
      const x = leerNumero(input, c.campo);
      if (x === null) return sinDato(c.campo);
      const dist = Math.min(Math.abs(x - c.min), Math.abs(x - c.max));
      return {
        ...base,
        campo: c.campo,
        cumple: comparar(x, c.opMin, c.min) && comparar(x, c.opMax, c.max),
        observado: formatMedida(c.campo, x, 3),
        enLimite: dist <= tolerancia(tol, c.campo) + EPS,
      };
    }
    default: {
      const x = leerNumero(input, c.campo);
      if (x === null) return sinDato(c.campo);
      return {
        ...base,
        campo: c.campo,
        cumple: comparar(x, c.op, c.valor),
        observado: formatMedida(c.campo, x, 3),
        enLimite: Math.abs(x - c.valor) <= tolerancia(tol, c.campo) + EPS,
      };
    }
  }
}
