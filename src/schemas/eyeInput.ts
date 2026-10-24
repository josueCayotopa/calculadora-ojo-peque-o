import { z } from 'zod';
import type { EyeInput } from '@/engine/types';

/** Rangos fisiológicos/instrumentales aceptados por el formulario (no son criterios clínicos). */
export const RANGOS = {
  longitudAxial: { min: 14.0, max: 30.0, unidad: 'mm' },
  laMediaReferencia: { min: 18.0, max: 28.0, unidad: 'mm' },
  laDEReferencia: { min: 0.1, max: 3.0, unidad: 'mm' },
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
const opcional = <T extends z.ZodTypeAny>(s: T) => s.nullable().optional();

export const eyeInputSchema = z
  .object({
    ojo: obligatorio(['OD', 'OI'], 'Seleccione el ojo (OD u OI)'),
    longitudAxial: numero('Longitud axial', RANGOS.longitudAxial),
    laMediaReferencia: opcional(numero('LA media de referencia', RANGOS.laMediaReferencia)),
    laDEReferencia: opcional(numero('DE de referencia', RANGOS.laDEReferencia)),
    acd: numero('Cámara anterior', RANGOS.acd),
    grosorCristalino: numero('Cristalino (LT)', RANGOS.grosorCristalino),
    angulo: obligatorio(['abierto', 'estrecho', 'deformado', 'cerrado'], 'Seleccione el ángulo por gonioscopía'),
    wtw: numero('WTW', RANGOS.wtw),
    cristalino: z.enum(['normal', 'coloboma', 'intumescente']).optional(),
    malformaciones: siNo('Indique si hay malformaciones anatómicas'),
    refraccion: z.enum(['hipermetropiaLeve', 'hipermetropiaAlta', 'hipermetropiaModerada']).optional(),
    sinequias: z.enum(['no', 'menor180', 'mayor180']).optional(),
    pupilaSinequiada: z.boolean().default(false),
    alteracionesRetinianas: z.object({
      retinitisPigmentaria: z.boolean().default(false),
      foveosquisis: z.boolean().default(false),
      drusasNervioOptico: z.boolean().default(false),
      plieguesPapilomaculares: z.boolean().default(false),
      agujeroMacular: z.boolean().default(false),
      otra: z.boolean().default(false),
    }),
    alteracionesAsociadas: z
      .object({
        leves: z.boolean().default(false),
        colobomas: z.boolean().default(false),
        intumescencia: z.boolean().default(false),
      })
      .default({}),
    factoresRiesgo: z.object({
      pseudoexfoliacion: z.boolean().default(false),
      cirugiaFiltrantePrevia: z.boolean().default(false),
      cirugiaCatarataPrevia: z.boolean().default(false),
      cierreAngularAgudoAdelfo: z.boolean().default(false),
      antecedenteFamiliarGlaucoma: z.boolean().default(false),
    }),
  })
  .superRefine((d, ctx) => {
    const media = d.laMediaReferencia != null;
    const de = d.laDEReferencia != null;
    if (media !== de) {
      ctx.addIssue({
        code: 'custom',
        path: [media ? 'laDEReferencia' : 'laMediaReferencia'],
        message: 'Ingrese la media y la DE de referencia juntas (o deje ambas vacías para usar LA < 21 mm)',
      });
    }
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
