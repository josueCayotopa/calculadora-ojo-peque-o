import rules from '@/config/rules.json';
import { parseConfig } from '../configSchema';
import type { ClinicalConfig, EyeInput } from '../types';

export const config: ClinicalConfig = parseConfig(rules);

/** Copia profunda de la configuración por defecto, para pruebas que la modifican. */
export function configClon(): ClinicalConfig {
  return structuredClone(config);
}

const SIN_RETINA: EyeInput['alteracionesRetinianas'] = {
  retinitisPigmentaria: false,
  foveosquisis: false,
  drusasNervioOptico: false,
  plieguesPapilomaculares: false,
  agujeroMacular: false,
  otra: false,
};

const SIN_FACTORES: EyeInput['factoresRiesgo'] = {
  pseudoexfoliacion: false,
  cirugiaFiltrantePrevia: false,
  cirugiaCatarataPrevia: false,
  cierreAngularAgudoAdelfo: false,
  antecedenteFamiliarGlaucoma: false,
};

type Overrides = Partial<Omit<EyeInput, 'factoresRiesgo' | 'alteracionesRetinianas'>> & {
  factoresRiesgo?: Partial<EyeInput['factoresRiesgo']>;
  alteracionesRetinianas?: Partial<EyeInput['alteracionesRetinianas']>;
};

type Defaults = Omit<EyeInput, 'ojo' | 'factoresRiesgo' | 'alteracionesRetinianas'> & {
  alteracionesRetinianas?: Partial<EyeInput['alteracionesRetinianas']>;
};

function base(defaults: Defaults) {
  return (o: Overrides = {}): EyeInput => ({
    ojo: 'OD',
    ...defaults,
    ...o,
    alteracionesRetinianas: { ...SIN_RETINA, ...defaults.alteracionesRetinianas, ...o.alteracionesRetinianas },
    factoresRiesgo: { ...SIN_FACTORES, ...o.factoresRiesgo },
  });
}

/** Ojo prototípico de cada tipo según la tabla; los overrides mueven un criterio a la vez. */
export const tipoI = base({
  longitudAxial: 23.0, acd: 2.0, blancoBlanco: 10.6, angulo: 'estrecho', grosorEscleral: 1.0, efusionCoroidea: false,
  cuerpoCiliar: 'normal', cristalino: 'normal', cornea: 'microcornea', malformaciones: false,
  segmentoAnterior: 'corto', segmentoPosterior: 'normal', refraccion: 'emetropia',
});

export const tipoII = base({
  longitudAxial: 18.5, acd: 2.8, blancoBlanco: 10.8, angulo: 'estrecho', grosorEscleral: 1.0, efusionCoroidea: false,
  cuerpoCiliar: 'normal', cristalino: 'normal', cornea: 'microcornea', malformaciones: false,
  segmentoAnterior: 'normal', segmentoPosterior: 'corto', refraccion: 'hipermetropiaAlta',
  alteracionesRetinianas: { plieguesPapilomaculares: true },
});

export const tipoIII = base({
  longitudAxial: 20.0, acd: 1.8, blancoBlanco: 11.2, angulo: 'estrecho', grosorEscleral: 1.1, efusionCoroidea: false,
  cuerpoCiliar: 'normal', cristalino: 'normal', cornea: 'normal', malformaciones: false,
  segmentoAnterior: 'corto', segmentoPosterior: 'corto', refraccion: 'hipermetropiaModerada',
});

export const tipoIV = base({
  longitudAxial: 19.8, acd: 1.9, blancoBlanco: 10.9, angulo: 'deformado', grosorEscleral: 1.1, efusionCoroidea: true,
  cuerpoCiliar: 'normal', cristalino: 'coloboma', cornea: 'normal', malformaciones: true,
  segmentoAnterior: 'corto', segmentoPosterior: 'corto', refraccion: 'hipermetropiaModerada',
  alteracionesRetinianas: { otra: true },
});

export const tipoV = base({
  longitudAxial: 18.0, acd: 1.7, blancoBlanco: 10.5, angulo: 'cerrado', grosorEscleral: 1.8, efusionCoroidea: true,
  cuerpoCiliar: 'anteriorizado', cristalino: 'intumescente', cornea: 'microcornea', malformaciones: false,
  segmentoAnterior: 'corto', segmentoPosterior: 'corto', refraccion: 'hipermetropiaAlta',
});
