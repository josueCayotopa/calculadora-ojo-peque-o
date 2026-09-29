import type { EyeInput, Ojo } from '@/engine/types';
import { eyeInputSchema } from '@/schemas/eyeInput';

/**
 * Historial opcional, solo en este dispositivo (localStorage). No contiene datos
 * de identificación del paciente: solo las medidas ingresadas y la fecha.
 * Se guardan las entradas, no los resultados: al abrir una entrada se
 * re-evalúa con las reglas vigentes.
 */

const KEY = 'ojo-pequeno:historial:v2';
const MAX_ENTRADAS = 50;

export interface EntradaHistorial {
  id: string;
  fecha: string;
  ojo: Ojo;
  entrada: EyeInput;
  /** Resumen legible en el momento de guardar (p. ej. "Tipo 2 · MAR con ángulo estrecho"). */
  resumen: string;
}

export function leerHistorial(): EntradaHistorial[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    // Descarta entradas con un formato antiguo o corrupto: el motor recibe solo datos válidos.
    return data.filter((e) => e && typeof e.id === 'string' && eyeInputSchema.safeParse(e.entrada).success);
  } catch {
    return [];
  }
}

export function guardarEnHistorial(e: Omit<EntradaHistorial, 'id' | 'fecha'>): EntradaHistorial[] {
  const nueva: EntradaHistorial = {
    ...e,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
    fecha: new Date().toISOString(),
  };
  const lista = [nueva, ...leerHistorial()].slice(0, MAX_ENTRADAS);
  try {
    localStorage.setItem(KEY, JSON.stringify(lista));
  } catch {
    // Almacenamiento no disponible (modo privado, cuota): el historial es opcional.
  }
  return lista;
}

export function eliminarDeHistorial(id: string): EntradaHistorial[] {
  const lista = leerHistorial().filter((e) => e.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(lista));
  } catch {
    /* ignorar */
  }
  return lista;
}

export function borrarHistorial(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}
