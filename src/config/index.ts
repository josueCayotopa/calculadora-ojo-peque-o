import rules from './rules.json';
import { parseConfig } from '@/engine/configSchema';

/** Configuración clínica validada. Si rules.json es inválido, la app no arranca. */
export const clinicalConfig = parseConfig(rules);

/** Términos del glosario que aparecen en los textos dados (para explicar abreviaturas junto al tratamiento). */
export function terminosUsados(textos: string[]) {
  const t = textos.join(' ');
  return clinicalConfig.glosario.filter((g) => !g.termino.includes('/') && t.includes(g.termino));
}
