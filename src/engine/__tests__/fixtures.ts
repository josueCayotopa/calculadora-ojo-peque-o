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

type Defaults = Omit<EyeInput, 'ojo' | 'pupilaSinequiada' | 'factoresRiesgo' | 'alteracionesRetinianas'> & {
  alteracionesRetinianas?: Partial<EyeInput['alteracionesRetinianas']>;
};

function base(defaults: Defaults) {
  return (o: Overrides = {}): EyeInput => ({
    ojo: 'OD',
    pupilaSinequiada: false,
    ...defaults,
    ...o,
    alteracionesRetinianas: { ...SIN_RETINA, ...defaults.alteracionesRetinianas, ...o.alteracionesRetinianas },
    factoresRiesgo: { ...SIN_FACTORES, ...o.factoresRiesgo },
  });
}

/** Ojo prototípico de cada tipo según la tabla; los overrides mueven un criterio a la vez. */
export const tipoI = base({
  longitudAxial: 23.0, acd: 2.0, angulo: 'estrecho', grosorCristalino: 4.6, malformaciones: false, wtw: 10.5,
});

export const tipoII = base({
  longitudAxial: 18.5, acd: 2.8, angulo: 'abierto', grosorCristalino: 3.5, malformaciones: false, wtw: 11.5,
  alteracionesRetinianas: { plieguesPapilomaculares: true },
});

export const tipoIII = base({
  longitudAxial: 20.5, acd: 2.2, angulo: 'estrecho', grosorCristalino: 3.9, malformaciones: false, wtw: 10.5,
});

export const tipoIV = base({
  longitudAxial: 19.8, acd: 2.2, angulo: 'deformado', grosorCristalino: 4.0, cristalino: 'coloboma', malformaciones: true, wtw: 10.5,
  alteracionesRetinianas: { otra: true },
});

export const tipoV = base({
  longitudAxial: 18.0, acd: 1.7, angulo: 'cerrado', grosorCristalino: 4.5, malformaciones: false, wtw: 10.0,
  alteracionesAsociadas: { leves: false, colobomas: false, intumescencia: true },
});
