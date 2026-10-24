/**
 * Tipos del dominio clínico. Este módulo no depende de React ni del navegador.
 */

export type Ojo = 'OD' | 'OI';
export type Angulo = 'abierto' | 'estrecho' | 'deformado' | 'cerrado';
export type Cristalino = 'normal' | 'coloboma' | 'intumescente';
/** Solo se usa en el esquema (dibujo) del tipo. */
export type Segmento = 'normal' | 'corto';

/**
 * Datos de un ojo tal como los ingresa el oftalmólogo: solo las variables de la
 * tabla de clasificación (LA, CA, ángulo, LT para el índice LT/AL, malformaciones
 * y WTW). Longitudes en mm.
 */
export interface EyeInput {
  ojo: Ojo;
  longitudAxial: number;
  acd: number;
  /** Grosor del cristalino (LT). Obligatorio en el formulario; opcional en el tipo para evaluaciones antiguas. */
  grosorCristalino?: number | null;
  /** Diámetro corneal horizontal blanco-blanco (WTW). */
  wtw: number;
  angulo: Angulo;
  malformaciones: boolean;
}

// ---------------------------------------------------------------------------
// Criterios (definidos como datos en config/rules.json)
// ---------------------------------------------------------------------------

/** `indiceLTAL` no se ingresa: se calcula como LT / LA (adimensional). */
export type CampoNumerico = 'longitudAxial' | 'acd' | 'grosorCristalino' | 'wtw' | 'indiceLTAL';
export type CampoEnum = 'angulo';
export type CampoBooleano = 'malformaciones';

export type OpComparacion = '<' | '<=' | '>' | '>=';

/** "mayor": obligatorio para asignar el tipo. "apoyo": suma al porcentaje de concordancia. */
export type NivelCriterio = 'mayor' | 'apoyo';

interface Base {
  etiqueta?: string;
  peso?: number;
  nivel?: NivelCriterio;
}

export interface CriterioNumerico extends Base {
  campo: CampoNumerico;
  op: OpComparacion;
  valor: number;
}

export interface CriterioRango extends Base {
  campo: CampoNumerico;
  op: 'entre';
  min: number;
  max: number;
  /** '>' excluye el límite inferior, '>=' lo incluye. */
  opMin: '>' | '>=';
  /** '<' excluye el límite superior, '<=' lo incluye. */
  opMax: '<' | '<=';
}

export interface CriterioEnum extends Base {
  campo: CampoEnum;
  op: 'en';
  valores: string[];
}

export interface CriterioBooleano extends Base {
  campo: CampoBooleano;
  op: 'es';
  valor: boolean;
}

/** Dos campos de lista con el mismo valor. */
export interface CriterioIguales extends Base {
  op: 'iguales';
  campos: [CampoEnum, CampoEnum];
  etiqueta: string;
}

export interface CriterioCualquiera extends Base {
  op: 'cualquiera';
  criterios: Criterio[];
  etiqueta: string;
}

export type Criterio =
  | CriterioNumerico
  | CriterioRango
  | CriterioEnum
  | CriterioBooleano
  | CriterioIguales
  | CriterioCualquiera;

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

/** Parámetros del esquema del ojo (dibujo) de cada tipo. */
export interface EsquemaOjo {
  segmentoAnterior: Segmento;
  segmentoPosterior: Segmento;
  escleraGruesa: boolean;
  efusion: boolean;
  cristalino: Cristalino;
  microcornea: boolean;
  cuerpoCiliarAnteriorizado: boolean;
  plieguesRetina: boolean;
  malformacion: boolean;
}

export interface TipoClinico {
  id: string;
  romano: string;
  sigla?: string;
  nombre: string;
  descripcion?: string;
  criterios: Criterio[];
  preoperatorio: string[];
  tecnica: string[];
  /** Partes del tratamiento aún no definidas por el autor de la clasificación. */
  pendiente?: string;
  esquema: EsquemaOjo;
}

export interface ItemChecklist {
  texto: string;
  /** Ids de tipos a los que aplica, o "todos". */
  tipos: string[] | 'todos';
  condicion?: Criterio;
  /** Solo si esta alerta clínica está activa. */
  siAlerta?: string;
  /** Se omite si esta alerta clínica está activa. */
  salvoAlerta?: string;
}

export interface AlertaClinica {
  id: string;
  titulo: string;
  mensaje: string;
  /** Se activa si se cumplen todos estos criterios… */
  criterios: Criterio[];
  /** …y el resultado no es uno de estos tipos. */
  exceptoTipos?: string[];
  /** Técnica que sustituye a la del tipo asignado cuando la alerta está activa. */
  reemplazaTecnica?: string[];
}

export interface Referencia {
  cita: string;
  url?: string;
}

export interface ClinicalConfig {
  version: string;
  fechaRevision: string;
  /** Distancia (mm) a un umbral por debajo de la cual se advierte "valor en el límite". */
  toleranciaLimiteMm: number;
  /** Lo mismo para el índice LT/AL (adimensional). */
  toleranciaLimiteIndice: number;
  /** Orden de evaluación: se asigna el primer tipo que cumple todos sus criterios mayores. */
  ordenEvaluacion: string[];
  /** Cuántos tipos cercanos mostrar en zona gris. */
  cercanosEnZonaGris: number;
  tipos: TipoClinico[];
  alertasClinicas: AlertaClinica[];
  glaucomaMaligno: {
    factores: Criterio[];
    umbrales: { moderadoDesde: number; altoDesde: number };
  };
  alertaFacomorfica: { criterios: Criterio[]; mensaje: string };
  lio: {
    biometria: string;
    formulas: { nombre: string; url: string; nota?: string }[];
    piggyback: { longitudAxialAnticipadaMm: number; mensaje: string };
  };
  checklistPreoperatorio: ItemChecklist[];
  glosario: { termino: string; definicion: string }[];
  referencias: Referencia[];
  supuestosPendientes: string[];
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

export interface CriterioEvaluado {
  etiqueta: string;
  /** Campo evaluado (ausente en criterios compuestos). */
  campo?: string;
  nivel: NivelCriterio;
  cumple: boolean;
  /** No se ingresó el dato necesario (campo opcional vacío). Cuenta como no cumplido. */
  sinDato: boolean;
  /** Valor observado, formateado para mostrar. */
  observado: string;
  peso: number;
  /** true si el valor numérico está a ≤ toleranciaLimiteMm (o toleranciaLimiteIndice) del umbral. */
  enLimite: boolean;
}

export interface Conteo {
  cumplidos: number;
  total: number;
  sinDato: number;
}

export interface TipoEvaluado {
  id: string;
  romano: string;
  sigla?: string;
  nombre: string;
  criterios: CriterioEvaluado[];
  mayores: Conteo;
  apoyo: Conteo & {
    /** Fracción ponderada de criterios de apoyo cumplidos sobre los evaluables (con dato), 0–1. */
    porcentaje: number;
  };
  /** true si cumple todos sus criterios mayores. */
  cumpleMayores: boolean;
  preoperatorio: string[];
  tecnica: string[];
  /** Título de la alerta que reemplazó la técnica del tipo (excepción), o null. */
  tecnicaPorExcepcion: string | null;
  pendiente: string | null;
  esquema: EsquemaOjo;
}

export type EstadoClasificacion = 'clasificado' | 'zona_gris';

export interface AdvertenciaLimite {
  campo: string;
  medida: string;
  observado: string;
  criterios: string[];
}

export interface AlertaActiva {
  id: string;
  titulo: string;
  mensaje: string;
  reemplazaTecnica?: string[];
}

export interface ResultadoClasificacion {
  estado: EstadoClasificacion;
  /** Tipo asignado (diagnóstico); solo cuando estado === 'clasificado'. */
  tipo: TipoEvaluado | null;
  /** Otros tipos que también cumplen todos sus criterios mayores pero quedaron detrás en el orden. */
  tambienCumplen: TipoEvaluado[];
  /** Tipo(s) más cercano(s): el asignado, o los N más cercanos en zona gris. */
  masCercanos: TipoEvaluado[];
  /** Todos los tipos ordenados por cercanía. */
  ranking: TipoEvaluado[];
  /** Criterios mayores no cumplidos de los tipos más cercanos (zona gris). */
  conflictos: (CriterioEvaluado & { tipo: string })[];
  advertenciasLimite: AdvertenciaLimite[];
  alertas: AlertaActiva[];
}

export type NivelRiesgo = 'bajo' | 'moderado' | 'alto';

export interface ResultadoGlaucomaMaligno {
  factores: { etiqueta: string; presente: boolean }[];
  presentes: number;
  total: number;
  nivel: NivelRiesgo;
}

export interface ResultadoFacomorfico {
  activa: boolean;
  criterios: CriterioEvaluado[];
  mensaje: string;
}

export interface ResultadoLio {
  biometria: string;
  formulas: { nombre: string; url: string; nota?: string }[];
  piggyback: { activa: boolean; motivo: string | null; mensaje: string };
}

export interface ItemChecklistResultado {
  texto: string;
  /** true si proviene del tipo más cercano en zona gris (solo referencial). */
  referencial: boolean;
}

export interface EvaluacionCompleta {
  entrada: EyeInput;
  clasificacion: ResultadoClasificacion;
  glaucomaMaligno: ResultadoGlaucomaMaligno;
  facomorfico: ResultadoFacomorfico;
  lio: ResultadoLio;
  checklist: ItemChecklistResultado[];
  configVersion: string;
}
