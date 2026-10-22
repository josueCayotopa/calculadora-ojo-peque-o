import { etiquetaCriterio, evaluarCriterio, formatNumero } from './criteria';
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

/** Técnica que las sinequias anteriores añaden al tratamiento, sea cual sea el tipo. */
export const TECNICA_SINEQUIAS = { menor180: 'Goniosinequiálisis', mayor180: 'Válvula de Ahmed' } as const;

/** Técnica de un tipo con la añadida por las sinequias (si las hay). */
export function conSinequias(tecnica: string[], input: Pick<EyeInput, 'sinequias'>): string[] {
  const s = input.sinequias;
  return s === 'menor180' || s === 'mayor180' ? [...tecnica, TECNICA_SINEQUIAS[s]] : tecnica;
}

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

  let motivo: string | null = null;
  if (input.longitudAxial < piggyback.longitudAxialAnticipadaMm) {
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

export interface TecnicaAlternativa {
  /** Id de la alerta clínica que la activa. */
  id: string;
  titulo: string;
  /** Condiciones de la excepción, en texto («LA > 22.5 mm · CA < 2.5 mm · …»). */
  condicion: string;
  tecnica: string[];
}

/** Técnicas de excepción (alertas con `reemplazaTecnica`) que pueden aplicarse a un tipo. */
export function tecnicasAlternativas(tipoId: string, config: ClinicalConfig): TecnicaAlternativa[] {
  return config.alertasClinicas
    .filter((a) => a.reemplazaTecnica && !a.exceptoTipos?.includes(tipoId))
    .map((a) => ({
      id: a.id,
      titulo: a.titulo,
      condicion: a.criterios.map((c) => etiquetaCriterio(c)).join(' · '),
      tecnica: a.reemplazaTecnica!,
    }));
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

  const alertas = new Set(clasificacion.alertas.map((a) => a.id));
  const items: ItemChecklistResultado[] = [];
  for (const item of config.checklistPreoperatorio) {
    const general = item.tipos === 'todos';
    const aplicaTipo = item.tipos === 'todos' || item.tipos.some((id) => ids.has(id));
    if (!aplicaTipo) continue;
    if (item.condicion && !evaluarCriterio(item.condicion, input).cumple) continue;
    if (item.siAlerta && !alertas.has(item.siAlerta)) continue;
    if (item.salvoAlerta && alertas.has(item.salvoAlerta)) continue;
    items.push({ texto: item.texto, referencial: !clasificado && !general });
  }
  return items;
}
