import { describe, expect, it } from 'vitest';
import { clasificar } from '../classifier';
import type { EyeInput } from '../types';
import { config, configClon, tipoI, tipoII, tipoIII, tipoIV, tipoV } from './fixtures';

function diagnostico(input: EyeInput, cfg = config) {
  const r = clasificar(input, cfg);
  return r.estado === 'clasificado' ? r.tipo!.id : 'zona_gris';
}

function cercanos(input: EyeInput, cfg = config) {
  return clasificar(input, cfg).masCercanos.map((t) => t.id);
}

describe('Tipo I — Microftalmo anterior relativo (MAR)', () => {
  it.each([
    ['caso típico', tipoI()],
    ['LA larga, CA muy baja', tipoI({ longitudAxial: 24.5, acd: 1.7 })],
    ['justo dentro de los límites mayores', tipoI({ longitudAxial: 22.21, acd: 2.19 })],
    ['sin datos opcionales de segmentos', tipoI({ segmentoAnterior: null, segmentoPosterior: null })],
  ])('%s → I', (_, input) => {
    const r = clasificar(input, config);
    expect(r.estado).toBe('clasificado');
    expect(r.tipo?.id).toBe('I');
    expect(r.tipo?.mayores).toMatchObject({ cumplidos: 2, total: 2 });
  });

  it('caso típico: 100 % de criterios de apoyo', () => {
    expect(clasificar(tipoI(), config).tipo?.apoyo.porcentaje).toBe(1);
  });
});

describe('Tipo II — Microftalmos posterior relativo (MPR)', () => {
  it.each([
    ['caso típico', tipoII()],
    ['LA muy corta, CA amplia', tipoII({ longitudAxial: 16.0, acd: 3.2 })],
    ['CA justo por encima de 2.2', tipoII({ acd: 2.21 })],
  ])('%s → II', (_, input) => {
    expect(diagnostico(input)).toBe('II');
  });

  it('alteraciones retinianas cuentan como criterio de apoyo', () => {
    const con = clasificar(tipoII(), config).tipo!;
    const sin = clasificar(tipoII({ alteracionesRetinianas: { plieguesPapilomaculares: false } }), config).tipo!;
    expect(sin.id).toBe('II');
    expect(sin.apoyo.porcentaje).toBeLessThan(con.apoyo.porcentaje);
  });

  it('sin el dato de segmento posterior no se puede asignar (criterio mayor sin dato)', () => {
    const r = clasificar(tipoII({ segmentoPosterior: null }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos.some((c) => c.sinDato && c.tipo === 'II')).toBe(true);
  });
});

describe('Tipo III — Microftalmo simple (MS)', () => {
  it.each([
    ['caso típico', tipoIII()],
    ['LA muy corta', tipoIII({ longitudAxial: 18.0, acd: 1.6 })],
    ['justo dentro de los límites', tipoIII({ longitudAxial: 20.99, acd: 1.99 })],
    ['con ángulo abierto', tipoIII({ angulo: 'abierto' })],
  ])('%s → III', (_, input) => {
    expect(diagnostico(input)).toBe('III');
  });
});

describe('Tipo IV — Microftalmo complejo (MC)', () => {
  it.each([
    ['caso típico', tipoIV()],
    ['malformación con LA normal (el único criterio mayor)', tipoIV({ longitudAxial: 23.0, acd: 2.8 })],
    ['malformación sobre un ojo con perfil de MS', tipoIII({ malformaciones: true })],
  ])('%s → IV', (_, input) => {
    expect(diagnostico(input)).toBe('IV');
  });
});

describe('Tipo V — Nanoftalmos', () => {
  it.each([
    ['caso típico', tipoV()],
    ['ojo muy corto con esclera muy gruesa', tipoV({ longitudAxial: 15.0, grosorEscleral: 2.4 })],
    ['LA = 20.5 mm exactos (≤ 20.5)', tipoV({ longitudAxial: 20.5 })],
  ])('%s → V', (_, input) => {
    const r = clasificar(input, config);
    expect(r.tipo?.id).toBe('V');
  });
});

describe('Orden de evaluación V → IV → III → II → I', () => {
  it('un nanoftalmos también cumple los mayores del MS, pero gana V', () => {
    const r = clasificar(tipoV(), config);
    expect(r.tipo?.id).toBe('V');
    expect(r.tambienCumplen.map((t) => t.id)).toContain('III');
  });

  it('nanoftalmos con malformación → V (se evalúa antes que IV)', () => {
    const r = clasificar(tipoV({ malformaciones: true }), config);
    expect(r.tipo?.id).toBe('V');
    expect(r.tambienCumplen.map((t) => t.id)).toContain('IV');
  });

  it('el orden es configurable', () => {
    const cfg = configClon();
    cfg.ordenEvaluacion = ['III', 'V', 'IV', 'II', 'I'];
    expect(diagnostico(tipoV(), cfg)).toBe('III');
  });
});

describe('Límites exactos', () => {
  it('LA 20.5 / 20.51: nanoftalmos solo hasta 20.5 inclusive', () => {
    expect(diagnostico(tipoV({ longitudAxial: 20.5 }))).toBe('V');
    expect(diagnostico(tipoV({ longitudAxial: 20.51 }))).not.toBe('V');
  });

  it('LA 21.0: no cumple LA < 21 del MS', () => {
    expect(diagnostico(tipoIII({ longitudAxial: 20.99 }))).toBe('III');
    const r = clasificar(tipoIII({ longitudAxial: 21.0 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos.map((c) => c.etiqueta)).toContain('LA < 21.0 mm');
  });

  it('LA 22.2: no cumple LA > 22.2 del MAR', () => {
    expect(diagnostico(tipoI({ longitudAxial: 22.21 }))).toBe('I');
    expect(diagnostico(tipoI({ longitudAxial: 22.2 }))).toBe('zona_gris');
    expect(cercanos(tipoI({ longitudAxial: 22.2 }))[0]).toBe('I');
  });

  it('CA 2.0: no cumple CA < 2.0 del MS', () => {
    expect(diagnostico(tipoIII({ acd: 1.99 }))).toBe('III');
    expect(diagnostico(tipoIII({ acd: 2.0 }))).toBe('zona_gris');
  });

  it('CA 2.2: no es MAR (< 2.2) ni MPR (> 2.2)', () => {
    expect(diagnostico(tipoI({ acd: 2.2 }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ acd: 2.2 }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ acd: 2.21 }))).toBe('II');
  });

  it('esclera 1.4: no cumple > 1.4 del nanoftalmos', () => {
    expect(diagnostico(tipoV({ grosorEscleral: 1.41 }))).toBe('V');
    expect(diagnostico(tipoV({ grosorEscleral: 1.4 }))).not.toBe('V');
  });

  it('W-W 11: es criterio de apoyo del MAR; no cambia el tipo, sí el %', () => {
    const conMicro = clasificar(tipoI({ blancoBlanco: 10.99, cornea: 'normal' }), config).tipo!;
    const sinMicro = clasificar(tipoI({ blancoBlanco: 11.0, cornea: 'normal' }), config).tipo!;
    expect(conMicro.id).toBe('I');
    expect(sinMicro.id).toBe('I');
    expect(sinMicro.criterios.find((c) => c.etiqueta.startsWith('Microcórnea'))?.cumple).toBe(false);
    expect(sinMicro.apoyo.porcentaje).toBeLessThan(conMicro.apoyo.porcentaje);
  });
});

describe('LA < media − 2 DE', () => {
  it('con media y DE de referencia se usa el umbral calculado', () => {
    // 23.5 − 2 × 1.0 = 21.5 → LA 21.2 cumple aunque sea ≥ 21
    const input = tipoIII({ longitudAxial: 21.2, laMediaReferencia: 23.5, laDEReferencia: 1.0 });
    const r = clasificar(input, config);
    expect(r.tipo?.id).toBe('III');
    expect(r.tipo?.criterios[0].etiqueta).toBe('LA < media − 2 DE (21.5 mm)');
  });

  it('sin referencia se usa LA < 21 mm', () => {
    expect(diagnostico(tipoIII({ longitudAxial: 21.2 }))).toBe('zona_gris');
  });

  it('una referencia más exigente excluye un ojo que cumpliría < 21', () => {
    // 23.0 − 2 × 1.2 = 20.6 → LA 20.8 no cumple
    expect(diagnostico(tipoIII({ longitudAxial: 20.8, laMediaReferencia: 23.0, laDEReferencia: 1.2 }))).toBe('zona_gris');
  });

  it('DE inválida (0) se ignora y se usa el respaldo', () => {
    expect(diagnostico(tipoIII({ laMediaReferencia: 23.5, laDEReferencia: 0 }))).toBe('III');
  });
});

describe('Zona gris — nunca se fuerza un resultado', () => {
  it('LA intermedia (21–22.2) con CA estrecha: sin tipo, 2 más cercanos', () => {
    const r = clasificar(tipoIII({ longitudAxial: 21.6, acd: 2.1 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.tipo).toBeNull();
    expect(r.masCercanos).toHaveLength(2);
    expect(r.conflictos.length).toBeGreaterThan(0);
    expect(r.conflictos.every((c) => c.nivel === 'mayor' && !c.cumple)).toBe(true);
  });

  it('ojo sin características de ojo pequeño → zona gris', () => {
    const r = clasificar(tipoI({ longitudAxial: 23.5, acd: 3.1, segmentoAnterior: 'normal' }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.ranking).toHaveLength(5);
  });

  it('cada conflicto indica a qué tipo pertenece', () => {
    const r = clasificar(tipoI({ longitudAxial: 22.2 }), config);
    expect(r.conflictos[0]).toMatchObject({ tipo: 'I', etiqueta: 'LA > 22.2 mm' });
  });
});

describe('Alertas clínicas', () => {
  it('nanoftalmos sin efusión → Tipo III + alerta de rasgos de nanoftalmos', () => {
    const r = clasificar(tipoV({ efusionCoroidea: false }), config);
    expect(r.tipo?.id).toBe('III');
    expect(r.alertas.map((a) => a.id)).toContain('rasgos-nanoftalmos');
  });

  it('la alerta no aparece si el diagnóstico ya es V', () => {
    expect(clasificar(tipoV(), config).alertas.map((a) => a.id)).not.toContain('rasgos-nanoftalmos');
  });

  it('efusión preexistente genera alerta', () => {
    expect(clasificar(tipoIV(), config).alertas.map((a) => a.id)).toContain('efusion-preexistente');
  });
});

describe('Configurabilidad', () => {
  it('cambiar la LA del MAR a > 20.5 (Hoffman 2015) reclasifica un ojo de 21.5 mm', () => {
    const input = tipoI({ longitudAxial: 21.5 });
    expect(diagnostico(input)).toBe('zona_gris');
    const cfg = configClon();
    cfg.tipos[0].criterios[0] = { nivel: 'mayor', campo: 'longitudAxial', op: '>', valor: 20.5 };
    expect(diagnostico(input, cfg)).toBe('I');
  });

  it('convertir la efusión del Tipo V en criterio de apoyo clasifica el nanoftalmos sin efusión', () => {
    const cfg = configClon();
    const v = cfg.tipos.find((t) => t.id === 'V')!;
    v.criterios[2] = { nivel: 'apoyo', campo: 'efusionCoroidea', op: 'es', valor: true };
    expect(diagnostico(tipoV({ efusionCoroidea: false }), cfg)).toBe('V');
  });

  it('cambiar el operador de CA del MAR a ≤ 2.2 incluye 2.2 exactos', () => {
    const cfg = configClon();
    cfg.tipos[0].criterios[1] = { nivel: 'mayor', campo: 'acd', op: '<=', valor: 2.2 };
    expect(diagnostico(tipoI({ acd: 2.2 }), cfg)).toBe('I');
  });
});

describe('Advertencias de valor en el límite', () => {
  it('una sola advertencia por medida', () => {
    const r = clasificar(tipoII({ acd: 2.22 }), config);
    const ca = r.advertenciasLimite.filter((a) => a.campo === 'acd');
    expect(ca).toHaveLength(1);
    expect(ca[0].criterios).toEqual(expect.arrayContaining(['CA > 2.2 mm', 'CA < 2.2 mm']));
  });

  it('valores lejos de todos los umbrales no advierten', () => {
    expect(clasificar(tipoV({ longitudAxial: 17.0, acd: 1.5, grosorEscleral: 2.0 }), config).advertenciasLimite).toEqual([]);
  });
});

describe('Pureza', () => {
  it('no modifica la entrada ni la configuración', () => {
    const input = tipoII();
    const antes = JSON.stringify([input, config]);
    clasificar(input, config);
    expect(JSON.stringify([input, config])).toBe(antes);
  });
});
