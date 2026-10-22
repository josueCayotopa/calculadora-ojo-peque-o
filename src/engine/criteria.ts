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
  grosorEscleral: 'Esclera polo posterior',
  angulo: 'Ángulo',
  cuerpoCiliar: 'Cuerpo ciliar',
  cristalino: 'Cristalino',
  refraccion: 'Refracción',
  efusionCoroidea: 'Efusión coroidea',
  malformaciones: 'Malformaciones anatómicas',
  pupilaSinequiada: 'Pupila sinequiada',
  'alteracionesRetinianas.retinitisPigmentaria': 'Retinitis pigmentaria',
  'alteracionesRetinianas.foveosquisis': 'Foveosquisis',
  'alteracionesRetinianas.drusasNervioOptico': 'Drusas del nervio óptico',
  'alteracionesRetinianas.plieguesPapilomaculares': 'Pliegues papilomaculares',
  'alteracionesRetinianas.agujeroMacular': 'Agujero macular',
  'alteracionesRetinianas.otra': 'Otra alteración retiniana',
  'alteracionesAsociadas.leves': 'Alteraciones leves',
  'alteracionesAsociadas.colobomas': 'Colobomas',
  'alteracionesAsociadas.intumescencia': 'Intumescencia',
  'factoresRiesgo.pseudoexfoliacion': 'Pseudoexfoliación',
  'factoresRiesgo.cirugiaFiltrantePrevia': 'Cirugía filtrante previa',
  'factoresRiesgo.cirugiaCatarataPrevia': 'Cirugía de catarata previa',
  'factoresRiesgo.cierreAngularAgudoAdelfo': 'Cierre angular agudo en el ojo adelfo',
  'factoresRiesgo.antecedenteFamiliarGlaucoma': 'Antecedente familiar de glaucoma',
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
  hipermetropiaLeve: 'hipermetropía leve',
  hipermetropiaAlta: 'hipermetropía alta',
  hipermetropiaModerada: 'hipermetropía moderada',
  menor180: '< 180°',
  mayor180: '> 180°',
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
  const v = input[campo];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function leerEnum(input: EyeInput, campo: CampoEnum): string | null {
  const v = input[campo] as string | null | undefined;
  return typeof v === 'string' && v !== '' ? v : null;
}

function leerBooleano(input: EyeInput, campo: CampoBooleano): boolean {
  const [grupo, clave] = campo.split('.') as [string, string | undefined];
  if (clave) {
    const obj = (input as unknown as Record<string, Record<string, boolean> | undefined>)[grupo];
    return Boolean(obj?.[clave]);
  }
  return Boolean(input[campo as 'efusionCoroidea' | 'malformaciones' | 'pupilaSinequiada']);
}

/** Umbral de LA "media − n·DE" si el usuario ingresó referencia válida; si no, null. */
export function umbralDE(input: EyeInput, nDE: number): number | null {
  const m = input.laMediaReferencia;
  const de = input.laDEReferencia;
  if (typeof m === 'number' && Number.isFinite(m) && typeof de === 'number' && Number.isFinite(de) && de > 0) {
    return m - nDE * de;
  }
  return null;
}

/**
 * Etiqueta legible generada a partir del criterio, para que nunca quede desfasada
 * del umbral. Con `input`, los criterios dependientes del paciente (media − DE)
 * muestran el umbral efectivo.
 */
export function etiquetaCriterio(c: Criterio, input?: EyeInput): string {
  if (c.etiqueta) return c.etiqueta;
  switch (c.op) {
    case 'entre':
      return `${formatNumero(c.min)} ${c.opMin === '>=' ? '≤' : '<'} ${NOMBRE_CAMPO[c.campo]} ${
        c.opMax === '<=' ? '≤' : '<'
      } ${formatNumero(c.max)} mm`;
    case 'en':
      return `${NOMBRE_CAMPO[c.campo]} ${c.valores.map((v) => NOMBRE_VALOR[v] ?? v).join(' o ')}`;
    case 'es':
      return c.valor ? NOMBRE_CAMPO[c.campo] : `Sin ${NOMBRE_CAMPO[c.campo].charAt(0).toLowerCase()}${NOMBRE_CAMPO[c.campo].slice(1)}`;
    case 'bajoDE': {
      const s = SIMBOLO[c.opComparacion];
      const u = input ? umbralDE(input, c.nDE) : null;
      if (u !== null) return `LA ${s} media − ${c.nDE} DE (${formatNumero(u)} mm)`;
      if (input) return `LA ${s} ${formatNumero(c.valorRespaldo)} mm`;
      return `LA ${s} media − ${c.nDE} DE (o ${s} ${formatNumero(c.valorRespaldo)} mm)`;
    }
    case 'iguales':
    case 'cualquiera':
      return c.etiqueta;
    default:
      return `${NOMBRE_CAMPO[c.campo]} ${SIMBOLO[c.op]} ${formatNumero(c.valor)} mm`;
  }
}

export function evaluarCriterio(c: Criterio, input: EyeInput, toleranciaLimite = 0): CriterioEvaluado {
  const etiqueta = etiquetaCriterio(c, input);
  const base = { etiqueta, peso: c.peso ?? 1, nivel: c.nivel ?? 'apoyo', enLimite: false, sinDato: false } as const;
  const sinDato = (campo?: string): CriterioEvaluado => ({ ...base, campo, cumple: false, sinDato: true, observado: 'sin dato' });

  switch (c.op) {
    case 'cualquiera': {
      const hijos = c.criterios.map((h) => evaluarCriterio(h, input, toleranciaLimite));
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
    case 'bajoDE': {
      const x = leerNumero(input, 'longitudAxial');
      if (x === null) return sinDato(c.campo);
      const umbral = umbralDE(input, c.nDE) ?? c.valorRespaldo;
      return {
        ...base,
        campo: c.campo,
        cumple: comparar(x, c.opComparacion, umbral),
        observado: `${formatNumero(x)} mm`,
        enLimite: Math.abs(x - umbral) <= toleranciaLimite + EPS,
      };
    }
    case 'entre': {
      const x = leerNumero(input, c.campo);
      if (x === null) return sinDato(c.campo);
      const dist = Math.min(Math.abs(x - c.min), Math.abs(x - c.max));
      return {
        ...base,
        campo: c.campo,
        cumple: comparar(x, c.opMin, c.min) && comparar(x, c.opMax, c.max),
        observado: `${formatNumero(x)} mm`,
        enLimite: dist <= toleranciaLimite + EPS,
      };
    }
    default: {
      const x = leerNumero(input, c.campo);
      if (x === null) return sinDato(c.campo);
      return {
        ...base,
        campo: c.campo,
        cumple: comparar(x, c.op, c.valor),
        observado: `${formatNumero(x)} mm`,
        enLimite: Math.abs(x - c.valor) <= toleranciaLimite + EPS,
      };
    }
  }
}
