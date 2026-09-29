import { evaluarCriterio, formatNumero } from './criteria';
import type {
  ClinicalConfig,
  EyeInput,
  ItemChecklistResultado,
  NivelRiesgo,
  ResultadoClasificacion,
  ResultadoFacomorfico,
  ResultadoGlaucomaMaligno,
  ResultadoLio,
} from './types';

/** Riesgo de glaucoma maligno: conteo de factores presentes → semáforo. */
export function riesgoGlaucomaMaligno(input: EyeInput, config: ClinicalConfig): ResultadoGlaucomaMaligno {
  const { factores, umbrales } = config.glaucomaMaligno;
  const evaluados = factores.map((f) => evaluarCriterio(f, input));
  const presentes = evaluados.filter((f) => f.cumple).length;
  const nivel: NivelRiesgo =
    presentes >= umbrales.altoDesde ? 'alto' : presentes >= umbrales.moderadoDesde ? 'moderado' : 'bajo';
  return {
    factores: evaluados.map((f) => ({ etiqueta: f.etiqueta, presente: f.cumple })),
    presentes,
    total: evaluados.length,
    nivel,
  };
}

/** Alerta facomórfica: se activa solo si se cumplen todos los criterios configurados. */
export function alertaFacomorfica(input: EyeInput, config: ClinicalConfig): ResultadoFacomorfico {
  const criterios = config.alertaFacomorfica.criterios.map((c) => evaluarCriterio(c, input));
  return {
    activa: criterios.every((c) => c.cumple),
    criterios,
    mensaje: config.alertaFacomorfica.mensaje,
  };
}

/** Recomendación de LIO. La app NO calcula la potencia. */
export function recomendacionLio(input: EyeInput, config: ClinicalConfig): ResultadoLio {
  const { piggyback } = config.lio;
  const potencia = typeof input.potenciaLio === 'number' && Number.isFinite(input.potenciaLio) ? input.potenciaLio : null;

  let motivo: string | null = null;
  if (potencia !== null && potencia >= piggyback.potenciaDesdeD) {
    motivo = `Potencia calculada de ${formatNumero(potencia)} D (≥ ${formatNumero(piggyback.potenciaDesdeD)} D).`;
  } else if (potencia === null && input.longitudAxial < piggyback.longitudAxialAnticipadaMm) {
    motivo = `LA de ${formatNumero(input.longitudAxial)} mm (< ${formatNumero(
      piggyback.longitudAxialAnticipadaMm,
    )} mm): es probable que la potencia requerida sea alta. Confirme con biometría óptica.`;
  }

  return {
    biometria: config.lio.biometria,
    formulas: config.lio.formulas,
    piggyback: { activa: motivo !== null, motivo, mensaje: piggyback.mensaje },
  };
}

/**
 * Checklist preoperatorio. En zona gris se usa(n) el/los tipo(s) más cercano(s)
 * y los ítems específicos de tipo se marcan como referenciales.
 */
export function checklistPreoperatorio(
  input: EyeInput,
  clasificacion: ResultadoClasificacion,
  config: ClinicalConfig,
): ItemChecklistResultado[] {
  const clasificado = clasificacion.estado === 'clasificado';
  const ids = new Set((clasificado ? [clasificacion.tipo!] : clasificacion.masCercanos).map((t) => t.id));

  const items: ItemChecklistResultado[] = [];
  for (const item of config.checklistPreoperatorio) {
    const general = item.tipos === 'todos';
    const aplicaTipo = item.tipos === 'todos' || item.tipos.some((id) => ids.has(id));
    if (!aplicaTipo) continue;
    if (item.condicion && !evaluarCriterio(item.condicion, input).cumple) continue;
    items.push({ texto: item.texto, referencial: !clasificado && !general });
  }
  return items;
}
