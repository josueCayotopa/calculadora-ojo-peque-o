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
    ['justo dentro de los límites mayores', tipoI({ longitudAxial: 22.51, acd: 2.49, wtw: 10.99 })],
  ])('%s → I', (_, input) => {
    const r = clasificar(input, config);
    expect(r.estado).toBe('clasificado');
    expect(r.tipo?.id).toBe('I');
    expect(r.tipo?.mayores).toMatchObject({ cumplidos: 6, total: 6 });
  });

  it('sin LT no se calcula el índice LT/AL → zona gris', () => {
    const r = clasificar(tipoI({ grosorCristalino: null }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos).toContainEqual(expect.objectContaining({ tipo: 'I', etiqueta: 'Índice LT/AL < 0.22', sinDato: true }));
  });
});

describe('Tipo II — Microftalmos posterior relativo (MPR)', () => {
  it.each([
    ['caso típico', tipoII()],
    ['LA muy corta, CA amplia', tipoII({ longitudAxial: 16.0, acd: 3.2, grosorCristalino: 3.0 })],
    ['CA justo por encima de 2.5', tipoII({ acd: 2.51 })],
    ['sin alteraciones retinianas (ya no son criterio)', tipoII({ alteracionesRetinianas: { plieguesPapilomaculares: false } })],
  ])('%s → II', (_, input) => {
    expect(diagnostico(input)).toBe('II');
  });

  it('LA ≥ 20 no es MPR (criterio mayor)', () => {
    const r = clasificar(tipoII({ longitudAxial: 20.0 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos).toContainEqual(expect.objectContaining({ tipo: 'II', etiqueta: 'LA < 20.0 mm' }));
  });

  it('exige ángulo abierto y WTW > 11 mm', () => {
    expect(diagnostico(tipoII({ angulo: 'estrecho' }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ wtw: 10.5 }))).toBe('zona_gris');
  });
});

describe('Tipo III — Microftalmo simple (MS)', () => {
  it.each([
    ['caso típico', tipoIII()],
    ['LA = 20 mm exactos (límite inferior)', tipoIII({ longitudAxial: 20.0 })],
    ['justo dentro de los límites', tipoIII({ longitudAxial: 20.99, acd: 2.0 })],
    ['CA = 2.5 mm exactos', tipoIII({ acd: 2.5 })],
    ['con ángulo abierto', tipoIII({ angulo: 'abierto' })],
  ])('%s → III', (_, input) => {
    expect(diagnostico(input)).toBe('III');
  });

  it('índice LT/AL 0.18–0.20 incluye ambos extremos', () => {
    expect(diagnostico(tipoIII({ longitudAxial: 20.0, grosorCristalino: 3.6 }))).toBe('III');
    expect(diagnostico(tipoIII({ longitudAxial: 20.0, grosorCristalino: 4.0 }))).toBe('III');
    expect(diagnostico(tipoIII({ longitudAxial: 20.0, grosorCristalino: 3.5 }))).toBe('zona_gris');
    expect(diagnostico(tipoIII({ longitudAxial: 20.0, grosorCristalino: 4.1 }))).toBe('zona_gris');
  });
});

describe('Tipo IV — Microftalmo complejo (MC)', () => {
  it.each([
    ['caso típico', tipoIV()],
    ['CA amplia (la CA es variable)', tipoIV({ acd: 2.8 })],
    ['cristalino grueso (el índice LT/AL es variable)', tipoIV({ grosorCristalino: 5.5 })],
    ['malformación con ángulo deformado sobre un ojo con perfil de MS', tipoIII({ malformaciones: true, angulo: 'deformado' })],
  ])('%s → IV', (_, input) => {
    expect(diagnostico(input)).toBe('IV');
  });

  it('malformación sin ángulo deformado → zona gris (el ángulo es criterio mayor)', () => {
    expect(diagnostico(tipoIII({ malformaciones: true }))).toBe('zona_gris');
  });

  it('malformación con LA ≥ 21 mm → zona gris', () => {
    expect(diagnostico(tipoIV({ longitudAxial: 23.0 }))).toBe('zona_gris');
  });
});

describe('Tipo V — Nanoftalmos', () => {
  it.each([
    ['caso típico', tipoV()],
    ['ojo muy corto', tipoV({ longitudAxial: 15.0 })],
    ['LA justo por debajo de 20 mm', tipoV({ longitudAxial: 19.99 })],
  ])('%s → V', (_, input) => {
    expect(diagnostico(input)).toBe('V');
  });

  it('índice LT/AL = 0.22 no cumple > 0.22', () => {
    expect(diagnostico(tipoV({ grosorCristalino: 3.96 }))).toBe('zona_gris');
    expect(diagnostico(tipoV({ grosorCristalino: 3.97 }))).toBe('V');
  });
});

describe('Orden de evaluación V → IV → III → II → I', () => {
  it('un nanoftalmos (LA < 20) no se superpone con el MS (LA ≥ 20)', () => {
    const r = clasificar(tipoV(), config);
    expect(r.tipo?.id).toBe('V');
    expect(r.tambienCumplen.map((t) => t.id)).not.toContain('III');
  });

  it('nanoftalmos con malformación → zona gris: V exige sin malformaciones y IV ángulo deformado', () => {
    expect(diagnostico(tipoV({ malformaciones: true }))).toBe('zona_gris');
  });

  it('el orden es configurable', () => {
    const cfg = configClon();
    // Se fuerza una superposición: V admite malformaciones e IV admite ángulo cerrado.
    const v = cfg.tipos.find((t) => t.id === 'V')!;
    v.criterios = v.criterios.filter((c) => !('campo' in c && c.campo === 'malformaciones'));
    const anguloIV = cfg.tipos.find((t) => t.id === 'IV')!.criterios.find((c) => 'campo' in c && c.campo === 'angulo');
    if (anguloIV && anguloIV.op === 'en') anguloIV.valores = ['deformado', 'cerrado'];
    expect(diagnostico(tipoV({ malformaciones: true }), cfg)).toBe('V');
    cfg.ordenEvaluacion = ['IV', 'V', 'III', 'II', 'I'];
    expect(diagnostico(tipoV({ malformaciones: true }), cfg)).toBe('IV');
  });
});

describe('Límites exactos', () => {
  it('LA 19.99 / 20: nanoftalmos solo por debajo de 20', () => {
    expect(diagnostico(tipoV({ longitudAxial: 19.99 }))).toBe('V');
    expect(diagnostico(tipoV({ longitudAxial: 20.0 }))).not.toBe('V');
  });

  it('LA 19.99: no cumple LA ≥ 20 del MS', () => {
    const r = clasificar(tipoIII({ longitudAxial: 19.99 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos.map((c) => c.etiqueta)).toContain('LA ≥ 20.0 mm');
  });

  it('LA 21.0: no cumple LA < 21 del MS', () => {
    expect(diagnostico(tipoIII({ longitudAxial: 20.99 }))).toBe('III');
    const r = clasificar(tipoIII({ longitudAxial: 21.0 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos.map((c) => c.etiqueta)).toContain('LA < 21.0 mm');
  });

  it('LA 22.5: no cumple LA > 22.5 del MAR', () => {
    expect(diagnostico(tipoI({ longitudAxial: 22.51 }))).toBe('I');
    expect(diagnostico(tipoI({ longitudAxial: 22.5 }))).toBe('zona_gris');
    expect(cercanos(tipoI({ longitudAxial: 22.5 }))).toContain('I');
  });

  it('CA 2.0–2.5 del MS incluye ambos extremos', () => {
    expect(diagnostico(tipoIII({ acd: 2.0 }))).toBe('III');
    expect(diagnostico(tipoIII({ acd: 2.5 }))).toBe('III');
    expect(diagnostico(tipoIII({ acd: 1.99 }))).toBe('zona_gris');
    expect(diagnostico(tipoIII({ acd: 2.51 }))).not.toBe('III');
  });

  it('CA 2.5: no es MAR (< 2.5) ni MPR (> 2.5)', () => {
    expect(diagnostico(tipoI({ acd: 2.5 }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ acd: 2.5 }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ acd: 2.51 }))).toBe('II');
  });

  it('WTW 11.0: no es < 11.0 (MAR) ni > 11.0 (MPR)', () => {
    expect(diagnostico(tipoI({ wtw: 11.0 }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ wtw: 11.0 }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ wtw: 11.01 }))).toBe('II');
  });

  it('índice LT/AL 0.22: no cumple < 0.22 del MAR', () => {
    expect(diagnostico(tipoI({ grosorCristalino: 5.05 }))).toBe('I');
    expect(diagnostico(tipoI({ grosorCristalino: 5.06 }))).toBe('zona_gris');
  });

  it('índice LT/AL exactamente 0.20 (3.7 / 18.5) no cumple < 0.20 del MPR pese a la coma flotante', () => {
    expect(diagnostico(tipoII({ grosorCristalino: 3.7 }))).toBe('zona_gris');
  });
});

describe('LA < media − 2 DE', () => {
  it('con media y DE de referencia se usa el umbral calculado', () => {
    // 23.5 − 2 × 1.0 = 21.5 → LA 21.2 cumple aunque sea ≥ 21
    const input = tipoIII({ longitudAxial: 21.2, laMediaReferencia: 23.5, laDEReferencia: 1.0 });
    const r = clasificar(input, config);
    expect(r.tipo?.id).toBe('III');
    expect(r.tipo?.criterios[1].etiqueta).toBe('LA < media − 2 DE (21.5 mm)');
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
  it('LA intermedia (21–22.5) con CA estrecha: sin tipo, 2 más cercanos', () => {
    const r = clasificar(tipoIII({ longitudAxial: 21.6, acd: 2.1 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.tipo).toBeNull();
    expect(r.masCercanos).toHaveLength(2);
    expect(r.conflictos.length).toBeGreaterThan(0);
    expect(r.conflictos.every((c) => c.nivel === 'mayor' && !c.cumple)).toBe(true);
  });

  it('ojo sin características de ojo pequeño → zona gris', () => {
    const r = clasificar(tipoI({ longitudAxial: 23.5, acd: 3.1 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.ranking).toHaveLength(5);
  });

  it('cada conflicto indica a qué tipo pertenece', () => {
    const r = clasificar(tipoI({ longitudAxial: 22.5 }), config);
    expect(r.conflictos).toContainEqual(expect.objectContaining({ tipo: 'I', etiqueta: 'LA > 22.5 mm' }));
  });
});

describe('Alertas clínicas', () => {
  // LA 24 mm para que LT 5.2 mm mantenga el índice LT/AL < 0.22 del Tipo I.
  const excepcion = (o: Partial<EyeInput> = {}) => tipoI({ longitudAxial: 24.0, acd: 1.9, grosorCristalino: 5.2, ...o });

  it('excepción: LA > 22.5, CA < 2.0 y LT > 5 → vitrectomía central por PP + rexis con Utrata + facochop', () => {
    const r = clasificar(excepcion(), config);
    expect(r.tipo?.id).toBe('I');
    expect(r.alertas.map((a) => a.id)).toContain('excepcion-vitrectomia');
    expect(r.tipo?.tecnica).toEqual(['Vitrectomía central por PP', 'Rexis con Utrata', 'Facochop']);
    expect(r.tipo?.tecnicaPorExcepcion).toBe('Excepción: vitrectomía central por PP');
  });

  it('sin la excepción, el Tipo I conserva rexis con cistótomo + Stop and Chop', () => {
    const r = clasificar(tipoI(), config);
    expect(r.tipo?.tecnica).toEqual(['Rexis con cistótomo', 'Stop and Chop']);
    expect(r.tipo?.tecnicaPorExcepcion).toBeNull();
  });

  it.each([
    ['con CA = 2.0 mm', excepcion({ acd: 2.0 })],
    ['LT = 5 mm', excepcion({ grosorCristalino: 5.0 })],
    ['sin dato de LT', excepcion({ grosorCristalino: null })],
  ])('la excepción no se activa %s', (_, input) => {
    expect(clasificar(input, config).alertas.map((a) => a.id)).not.toContain('excepcion-vitrectomia');
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

  it('convertir el WTW del Tipo I en criterio de apoyo clasifica un MAR sin microcórnea', () => {
    const input = tipoI({ wtw: 11.5 });
    expect(diagnostico(input)).toBe('zona_gris');
    const cfg = configClon();
    cfg.tipos[0].criterios[5] = { nivel: 'apoyo', campo: 'wtw', op: '<', valor: 11.0 };
    expect(diagnostico(input, cfg)).toBe('I');
  });

  it('cambiar el operador de CA del MAR a ≤ 2.5 incluye 2.5 exactos', () => {
    const cfg = configClon();
    cfg.tipos[0].criterios[1] = { nivel: 'mayor', campo: 'acd', op: '<=', valor: 2.5 };
    expect(diagnostico(tipoI({ acd: 2.5 }), cfg)).toBe('I');
  });
});

describe('Advertencias de valor en el límite', () => {
  it('una sola advertencia por medida', () => {
    const r = clasificar(tipoII({ acd: 2.52 }), config);
    const ca = r.advertenciasLimite.filter((a) => a.campo === 'acd');
    expect(ca).toHaveLength(1);
    expect(ca[0].criterios).toEqual(expect.arrayContaining(['CA > 2.5 mm', 'CA < 2.5 mm']));
  });

  it('el índice LT/AL usa su propia tolerancia', () => {
    // 4.0 / 18 = 0.222: a menos de 0.005 de 0.22
    const r = clasificar(tipoV({ grosorCristalino: 4.0 }), config);
    expect(r.advertenciasLimite).toContainEqual(expect.objectContaining({ campo: 'indiceLTAL', observado: '0.222' }));
  });

  it('valores lejos de todos los umbrales no advierten', () => {
    expect(clasificar(tipoV({ longitudAxial: 17.0, acd: 1.5 }), config).advertenciasLimite).toEqual([]);
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

describe('Sinequias', () => {
  it.each([
    ['mayor180', 'Válvula de Ahmed'],
    ['menor180', 'Goniosinequiálisis'],
  ] as const)('%s añade «%s» a la técnica de todos los tipos', (sinequias, tecnica) => {
    for (const input of [tipoI(), tipoII(), tipoIII(), tipoIV(), tipoV()]) {
      const r = clasificar({ ...input, sinequias }, config);
      expect(r.tipo?.tecnica.at(-1)).toBe(tecnica);
      expect(r.ranking.every((t) => t.tecnica.at(-1) === tecnica)).toBe(true);
    }
  });

  it('sin sinequias no cambia la técnica', () => {
    const base = clasificar(tipoII(), config).tipo?.tecnica;
    expect(clasificar({ ...tipoII(), sinequias: 'no' }, config).tipo?.tecnica).toEqual(base);
  });
});
