import { NOMBRE_CAMPO, evaluarCriterio } from './criteria';
import { conSinequias } from './modules';
import type {
  AdvertenciaLimite,
  AlertaActiva,
  ClinicalConfig,
  Conteo,
  CriterioEvaluado,
  EyeInput,
  ResultadoClasificacion,
  TipoEvaluado,
} from './types';

/**
 * Motor de clasificación del ojo pequeño (tipos I–V).
 *
 * Función pura: mismas entradas → misma salida, sin efectos secundarios. Las
 * reglas vienen de la configuración (config/rules.json); aquí no hay umbrales.
 *
 * Algoritmo:
 * 1. Se evalúan todos los criterios de todos los tipos.
 * 2. Se recorren los tipos en `ordenEvaluacion` (V → IV → III → II → I, porque
 *    los rangos se superponen) y se asigna el PRIMERO que cumple todos sus
 *    criterios MAYORES.
 * 3. Los criterios de APOYO no deciden el tipo: dan el % de concordancia.
 * 4. Si ningún tipo cumple sus mayores → "zona gris": se muestran los N tipos
 *    más cercanos y sus criterios mayores en conflicto. Nunca se fuerza.
 */
export function clasificar(input: EyeInput, config: ClinicalConfig): ResultadoClasificacion {
  const tol = { mm: config.toleranciaLimiteMm, indice: config.toleranciaLimiteIndice };
  const orden = new Map(config.ordenEvaluacion.map((id, i) => [id, i]));

  const evaluados = config.tipos.map((tipo): TipoEvaluado => {
    const criterios = tipo.criterios.map((c) => evaluarCriterio(c, input, tol));
    const mayores = contar(criterios.filter((c) => c.nivel === 'mayor'));
    const apoyoCrit = criterios.filter((c) => c.nivel === 'apoyo');
    const evaluables = apoyoCrit.filter((c) => !c.sinDato);
    const pesoTotal = evaluables.reduce((s, c) => s + c.peso, 0);
    const pesoCumplido = evaluables.reduce((s, c) => s + (c.cumple ? c.peso : 0), 0);
    return {
      id: tipo.id,
      romano: tipo.romano,
      sigla: tipo.sigla,
      nombre: tipo.nombre,
      criterios,
      mayores,
      apoyo: { ...contar(apoyoCrit), porcentaje: pesoTotal > 0 ? pesoCumplido / pesoTotal : 0 },
      cumpleMayores: mayores.total > 0 && mayores.cumplidos === mayores.total,
      preoperatorio: tipo.preoperatorio,
      tecnica: conSinequias(tipo.tecnica, input),
      tecnicaPorExcepcion: null,
      pendiente: tipo.pendiente ?? null,
      esquema: tipo.esquema,
    };
  });

  const porOrden = [...evaluados].sort((a, b) => (orden.get(a.id) ?? 99) - (orden.get(b.id) ?? 99));
  const conMayores = porOrden.filter((t) => t.cumpleMayores);
  const tipo = conMayores[0] ?? null;

  const fraccionMayores = (t: TipoEvaluado) => (t.mayores.total ? t.mayores.cumplidos / t.mayores.total : 0);
  const ranking = [...evaluados].sort(
    (a, b) =>
      Number(b.cumpleMayores) - Number(a.cumpleMayores) ||
      fraccionMayores(b) - fraccionMayores(a) ||
      b.apoyo.porcentaje - a.apoyo.porcentaje ||
      (orden.get(a.id) ?? 99) - (orden.get(b.id) ?? 99),
  );

  const masCercanos = tipo ? [tipo] : ranking.slice(0, config.cercanosEnZonaGris);
  const conflictos = tipo
    ? []
    : masCercanos.flatMap((t) => t.criterios.filter((c) => c.nivel === 'mayor' && !c.cumple).map((c) => ({ ...c, tipo: t.romano })));

  const alertas: AlertaActiva[] = config.alertasClinicas
    .filter((a) => !(tipo && a.exceptoTipos?.includes(tipo.id)))
    .filter((a) => a.criterios.every((c) => evaluarCriterio(c, input).cumple))
    .map(({ id, titulo, mensaje, reemplazaTecnica }) => ({ id, titulo, mensaje, ...(reemplazaTecnica && { reemplazaTecnica }) }));

  // Excepciones: una alerta activa puede sustituir la técnica del tipo asignado.
  const excepcion = tipo && alertas.find((a) => a.reemplazaTecnica);
  if (tipo && excepcion) {
    tipo.tecnica = conSinequias(excepcion.reemplazaTecnica!, input);
    tipo.tecnicaPorExcepcion = excepcion.titulo;
  }

  return {
    estado: tipo ? 'clasificado' : 'zona_gris',
    tipo,
    tambienCumplen: conMayores.slice(1),
    masCercanos,
    ranking,
    conflictos,
    advertenciasLimite: agruparPorMedida(evaluados.flatMap((t) => t.criterios.filter((c) => c.enLimite))),
    alertas,
  };
}

function contar(criterios: CriterioEvaluado[]): Conteo {
  return {
    cumplidos: criterios.filter((c) => c.cumple).length,
    total: criterios.length,
    sinDato: criterios.filter((c) => c.sinDato).length,
  };
}

/** Una advertencia por medida, con todos los umbrales cercanos (evita repetir "CA" por cada tipo). */
function agruparPorMedida(criterios: CriterioEvaluado[]): AdvertenciaLimite[] {
  const porCampo = new Map<string, AdvertenciaLimite>();
  for (const c of criterios) {
    if (!c.campo) continue;
    const a = porCampo.get(c.campo) ?? {
      campo: c.campo,
      medida: NOMBRE_CAMPO[c.campo as keyof typeof NOMBRE_CAMPO] ?? c.campo,
      observado: c.observado,
      criterios: [],
    };
    if (!a.criterios.includes(c.etiqueta)) a.criterios.push(c.etiqueta);
    porCampo.set(c.campo, a);
  }
  return [...porCampo.values()];
}
