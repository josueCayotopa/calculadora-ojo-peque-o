import { z } from 'zod';
import type { ClinicalConfig, Criterio } from './types';

/**
 * Valida config/rules.json al cargar. Si el médico edita el archivo y comete un
 * error (operador inválido, campo inexistente, rango invertido), la app falla
 * de forma explícita en lugar de clasificar con reglas corruptas.
 */

const campoNumerico = z.enum(['longitudAxial', 'acd', 'grosorCristalino', 'grosorEscleral']);
const campoEnum = z.enum(['angulo', 'cuerpoCiliar', 'cristalino']);
const campoBooleano = z.enum([
  'efusionCoroidea',
  'malformaciones',
  'pupilaSinequiada',
  'alteracionesRetinianas.retinitisPigmentaria',
  'alteracionesRetinianas.foveosquisis',
  'alteracionesRetinianas.drusasNervioOptico',
  'alteracionesRetinianas.plieguesPapilomaculares',
  'alteracionesRetinianas.agujeroMacular',
  'alteracionesRetinianas.otra',
  'factoresRiesgo.pseudoexfoliacion',
  'factoresRiesgo.cirugiaFiltrantePrevia',
  'factoresRiesgo.cirugiaCatarataPrevia',
  'factoresRiesgo.cierreAngularAgudoAdelfo',
  'factoresRiesgo.antecedenteFamiliarGlaucoma',
]);

export const VALORES_ENUM: Record<z.infer<typeof campoEnum>, readonly string[]> = {
  angulo: ['abierto', 'estrecho', 'deformado', 'cerrado'],
  cuerpoCiliar: ['normal', 'anteriorizado'],
  cristalino: ['normal', 'coloboma', 'intumescente'],
};

const comunes = {
  etiqueta: z.string().min(1).optional(),
  peso: z.number().positive().optional(),
  nivel: z.enum(['mayor', 'apoyo']).optional(),
};

export const criterioSchema: z.ZodType<Criterio> = z.lazy(() =>
  z.union([
    z.object({ ...comunes, campo: campoNumerico, op: z.enum(['<', '<=', '>', '>=']), valor: z.number() }).strict(),
    z
      .object({
        ...comunes,
        campo: campoNumerico,
        op: z.literal('entre'),
        min: z.number(),
        max: z.number(),
        opMin: z.enum(['>', '>=']),
        opMax: z.enum(['<', '<=']),
      })
      .strict()
      .refine((c) => c.min < c.max, { message: 'En un criterio "entre", min debe ser menor que max' }),
    z
      .object({ ...comunes, campo: campoEnum, op: z.literal('en'), valores: z.array(z.string()).min(1) })
      .strict()
      .refine((c) => c.valores.every((v) => VALORES_ENUM[c.campo].includes(v)), {
        message: 'Valor no permitido para el campo (revise la ortografía: abierto/estrecho/deformado/cerrado, normal/corto, …)',
      }),
    z.object({ ...comunes, campo: campoBooleano, op: z.literal('es'), valor: z.boolean() }).strict(),
    z
      .object({
        ...comunes,
        campo: z.literal('longitudAxial'),
        op: z.literal('bajoDE'),
        nDE: z.number().positive(),
        opComparacion: z.enum(['<', '<=']),
        valorRespaldo: z.number(),
      })
      .strict(),
    z
      .object({ ...comunes, op: z.literal('iguales'), campos: z.tuple([campoEnum, campoEnum]), etiqueta: z.string().min(1) })
      .strict(),
    z
      .object({ ...comunes, op: z.literal('cualquiera'), criterios: z.array(criterioSchema).min(1), etiqueta: z.string().min(1) })
      .strict(),
  ]),
);

const esquemaSchema = z
  .object({
    segmentoAnterior: z.enum(['normal', 'corto']),
    segmentoPosterior: z.enum(['normal', 'corto']),
    escleraGruesa: z.boolean(),
    efusion: z.boolean(),
    cristalino: z.enum(['normal', 'coloboma', 'intumescente']),
    microcornea: z.boolean(),
    cuerpoCiliarAnteriorizado: z.boolean(),
    plieguesRetina: z.boolean(),
    malformacion: z.boolean(),
  })
  .strict();

export const configSchema = z
  .object({
    version: z.string(),
    fechaRevision: z.string(),
    toleranciaLimiteMm: z.number().min(0),
    ordenEvaluacion: z.array(z.string()).min(1),
    cercanosEnZonaGris: z.number().int().min(1),
    tipos: z
      .array(
        z
          .object({
            id: z.string().min(1),
            romano: z.string().min(1),
            sigla: z.string().min(1).optional(),
            nombre: z.string().min(1),
            descripcion: z.string().optional(),
            criterios: z.array(criterioSchema).min(1),
            preoperatorio: z.array(z.string()),
            tecnica: z.array(z.string()),
            pendiente: z.string().optional(),
            esquema: esquemaSchema,
          })
          .strict()
          .refine((t) => t.criterios.some((c) => c.nivel === 'mayor'), {
            message: 'Cada tipo necesita al menos un criterio con "nivel": "mayor"',
          }),
      )
      .min(1),
    alertasClinicas: z.array(
      z
        .object({
          id: z.string(),
          titulo: z.string(),
          mensaje: z.string(),
          criterios: z.array(criterioSchema).min(1),
          exceptoTipos: z.array(z.string()).optional(),
          reemplazaTecnica: z.array(z.string().min(1)).min(1).optional(),
        })
        .strict(),
    ),
    glaucomaMaligno: z
      .object({
        factores: z.array(criterioSchema).min(1),
        umbrales: z.object({ moderadoDesde: z.number().int().min(1), altoDesde: z.number().int().min(1) }).strict(),
      })
      .strict()
      .refine((g) => g.umbrales.moderadoDesde < g.umbrales.altoDesde, {
        message: 'glaucomaMaligno.umbrales: moderadoDesde debe ser menor que altoDesde',
      }),
    alertaFacomorfica: z.object({ criterios: z.array(criterioSchema).min(1), mensaje: z.string() }).strict(),
    lio: z
      .object({
        biometria: z.string(),
        formulas: z.array(z.object({ nombre: z.string(), url: z.string().url(), nota: z.string().optional() }).strict()),
        piggyback: z
          .object({ longitudAxialAnticipadaMm: z.number(), mensaje: z.string() })
          .strict(),
      })
      .strict(),
    checklistPreoperatorio: z.array(
      z
        .object({
          texto: z.string(),
          tipos: z.union([z.literal('todos'), z.array(z.string())]),
          condicion: criterioSchema.optional(),
          siAlerta: z.string().optional(),
          salvoAlerta: z.string().optional(),
        })
        .strict(),
    ),
    glosario: z.array(z.object({ termino: z.string(), definicion: z.string() }).strict()),
    referencias: z.array(z.object({ cita: z.string(), url: z.string().url().optional() }).strict()),
    supuestosPendientes: z.array(z.string()),
  })
  .strict()
  .superRefine((cfg, ctx) => {
    const ids = new Set<string>();
    for (const t of cfg.tipos) {
      if (ids.has(t.id)) ctx.addIssue({ code: 'custom', message: `Id de tipo duplicado: ${t.id}` });
      ids.add(t.id);
    }
    const refs = [
      ...cfg.ordenEvaluacion,
      ...cfg.checklistPreoperatorio.flatMap((i) => (i.tipos === 'todos' ? [] : i.tipos)),
      ...cfg.alertasClinicas.flatMap((a) => a.exceptoTipos ?? []),
    ];
    for (const r of refs) {
      if (!ids.has(r)) ctx.addIssue({ code: 'custom', message: `Referencia a tipo inexistente: ${r}` });
    }
    for (const id of ids) {
      if (!cfg.ordenEvaluacion.includes(id)) {
        ctx.addIssue({ code: 'custom', message: `El tipo ${id} no figura en ordenEvaluacion` });
      }
    }
  });

export function parseConfig(raw: unknown): ClinicalConfig {
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const detalle = result.error.issues.map((i) => `• ${i.path.join('.') || '(raíz)'}: ${i.message}`).join('\n');
    throw new Error(`config/rules.json inválido:\n${detalle}`);
  }
  return result.data as ClinicalConfig;
}
