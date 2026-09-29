import { clasificar } from './classifier';
import { alertaFacomorfica, checklistPreoperatorio, recomendacionLio, riesgoGlaucomaMaligno } from './modules';
import type { ClinicalConfig, EvaluacionCompleta, EyeInput } from './types';

/** Punto de entrada único del motor: evalúa un ojo con todos los módulos. */
export function evaluarOjo(input: EyeInput, config: ClinicalConfig): EvaluacionCompleta {
  const clasificacion = clasificar(input, config);
  return {
    entrada: input,
    clasificacion,
    glaucomaMaligno: riesgoGlaucomaMaligno(input, config),
    facomorfico: alertaFacomorfica(input, config),
    lio: recomendacionLio(input, config),
    checklist: checklistPreoperatorio(input, clasificacion, config),
    configVersion: config.version,
  };
}

export { clasificar } from './classifier';
export { alertaFacomorfica, checklistPreoperatorio, recomendacionLio, riesgoGlaucomaMaligno } from './modules';
export { evaluarCriterio, etiquetaCriterio, formatNumero, NOMBRE_CAMPO, NOMBRE_VALOR } from './criteria';
export { parseConfig, configSchema } from './configSchema';
export type * from './types';
