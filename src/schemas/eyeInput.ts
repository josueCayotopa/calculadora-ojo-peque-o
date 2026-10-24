import { z } from 'zod';
import type { EyeInput } from '@/engine/types';

/** Rangos fisiológicos/instrumentales aceptados por el formulario (no son criterios clínicos). */
export const RANGOS = {
  longitudAxial: { min: 14.0, max: 30.0, unidad: 'mm' },
  acd: { min: 0.5, max: 5.0, unidad: 'mm' },
  grosorCristalino: { min: 2.0, max: 7.0, unidad: 'mm' },
  wtw: { min: 8.0, max: 14.0, unidad: 'mm' },
} as const;

function numero(nombre: string, { min, max, unidad }: { min: number; max: number; unidad: string }) {
  const msgRango = `${nombre}: debe estar entre ${min} y ${max} ${unidad}`;
  return z
    .number({ required_error: `Ingrese ${nombre.toLowerCase()}`, invalid_type_error: `${nombre}: ingrese un número válido` })
    .min(min, msgRango)
    .max(max, msgRango);
}

function obligatorio<U extends string, T extends Readonly<[U, ...U[]]>>(valores: T, mensaje: string) {
  return z.enum(valores, { errorMap: () => ({ message: mensaje }) });
}

const siNo = (mensaje: string) => z.boolean({ required_error: mensaje, invalid_type_error: mensaje });

/**
 * Solo las variables de la tabla de clasificación. Las claves de evaluaciones
 * antiguas (refracción, sinequias, alteraciones…) se descartan al validar.
 */
export const eyeInputSchema = z.object({
  ojo: obligatorio(['OD', 'OI'], 'Seleccione el ojo (OD u OI)'),
  longitudAxial: numero('Longitud axial', RANGOS.longitudAxial),
  acd: numero('Cámara anterior', RANGOS.acd),
  grosorCristalino: numero('Cristalino (LT)', RANGOS.grosorCristalino),
  angulo: obligatorio(['abierto', 'estrecho', 'deformado', 'cerrado'], 'Seleccione el ángulo por gonioscopía'),
  wtw: numero('WTW', RANGOS.wtw),
  malformaciones: siNo('Indique si hay malformaciones anatómicas'),
}) satisfies z.ZodType<EyeInput, z.ZodTypeDef, unknown>;

export type EyeInputForm = z.input<typeof eyeInputSchema>;

/** Convierte texto ingresado (acepta coma decimal) a número; vacío → undefined. */
export function parseDecimal(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim().replace(',', '.');
  if (s === '') return undefined;
  return Number(s);
}
