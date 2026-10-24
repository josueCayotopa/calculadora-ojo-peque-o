import rules from '@/config/rules.json';
import { parseConfig } from '../configSchema';
import type { ClinicalConfig, EyeInput } from '../types';

export const config: ClinicalConfig = parseConfig(rules);

/** Copia profunda de la configuración por defecto, para pruebas que la modifican. */
export function configClon(): ClinicalConfig {
  return structuredClone(config);
}

function base(defaults: Omit<EyeInput, 'ojo'>) {
  return (o: Partial<EyeInput> = {}): EyeInput => ({ ojo: 'OD', ...defaults, ...o });
}

/** Ojo prototípico de cada tipo según la tabla; los overrides mueven un criterio a la vez. */
export const tipoI = base({
  longitudAxial: 23.0, acd: 2.0, angulo: 'estrecho', grosorCristalino: 4.6, malformaciones: false, wtw: 10.5,
});

export const tipoII = base({
  longitudAxial: 18.5, acd: 2.8, angulo: 'abierto', grosorCristalino: 3.5, malformaciones: false, wtw: 11.5,
});

export const tipoIII = base({
  longitudAxial: 20.5, acd: 2.2, angulo: 'estrecho', grosorCristalino: 3.9, malformaciones: false, wtw: 10.5,
});

export const tipoIV = base({
  longitudAxial: 19.8, acd: 2.2, angulo: 'deformado', grosorCristalino: 4.0, malformaciones: true, wtw: 10.5,
});

export const tipoV = base({
  longitudAxial: 18.0, acd: 1.7, angulo: 'cerrado', grosorCristalino: 4.5, malformaciones: false, wtw: 10.0,
});
