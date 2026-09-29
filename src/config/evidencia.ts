import data from './evidencia.json';

export type Concordancia = 'concuerda' | 'parcial' | 'difiere' | 'sin_evidencia';

export interface Comparacion {
  tema: string;
  silva: string;
  literatura: string;
  concordancia: Concordancia;
  comentario?: string;
  fuentes: string[];
}

export interface Fuente {
  id: string;
  cita: string;
  tipo: string;
  url: string;
}

export interface Evidencia {
  fechaRevision: string;
  metodologia: string;
  comparaciones: Comparacion[];
  fuentes: Fuente[];
}

/** Revisión de la literatura que sustenta (o cuestiona) cada criterio. Contenido informativo, no afecta al motor. */
export const evidencia = data as Evidencia;
