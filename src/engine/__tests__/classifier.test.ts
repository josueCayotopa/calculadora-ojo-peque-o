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
    expect(r.tipo?.mayores).toMatchObject({ cumplidos: 4, total: 4 });
    expect(r.tipo?.totales).toMatchObject({ cumplidos: 6, total: 6 });
  });

  it('sin LT el índice LT/AL queda sin dato (criterio menor) y el tipo se asigna con 5 de 6', () => {
    const r = clasificar(tipoI({ grosorCristalino: null }), config);
    expect(r.estado).toBe('clasificado');
    expect(r.tipo?.totales).toMatchObject({ cumplidos: 5, total: 6, sinDato: 1 });
  });

  it('regla 4 de 6: con los mayores cumplidos, basta 1 criterio menor; con 0 → zona gris', () => {
    expect(diagnostico(tipoI({ wtw: 11.5 }))).toBe('I'); // 5 de 6
    expect(diagnostico(tipoI({ wtw: 11.5, grosorCristalino: 5.5 }))).toBe('I'); // 4 de 6
    const sin = clasificar(tipoI({ wtw: 11.5, grosorCristalino: null }), config); // 4 de 6 (LT sin dato)
    expect(sin.estado).toBe('clasificado');
  });

  it('un criterio mayor incumplido impide el tipo aunque se cumplan 5 de 6', () => {
    const r = clasificar(tipoI({ acd: 2.6 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos).toContainEqual(expect.objectContaining({ tipo: 'I', etiqueta: 'CA < 2.5 mm' }));
  });
});

describe('Tipo II — Microftalmos posterior relativo (MPR)', () => {
  it.each([
    ['caso típico', tipoII()],
    ['LA muy corta, CA amplia', tipoII({ longitudAxial: 16.0, acd: 3.2, grosorCristalino: 3.0 })],
    ['CA justo por encima de 2.5', tipoII({ acd: 2.51 })],
  ])('%s → II', (_, input) => {
    expect(diagnostico(input)).toBe('II');
  });

  it('LA ≥ 20 no es MPR (criterio mayor)', () => {
    const r = clasificar(tipoII({ longitudAxial: 20.0 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos).toContainEqual(expect.objectContaining({ tipo: 'II', etiqueta: 'LA < 20.0 mm' }));
  });

  it('exige ángulo abierto y WTW > 11 mm', () => {
    expect(diagnostico(tipoII({ angulo: ['shaffer1'] }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ wtw: 10.5 }))).toBe('II'); // WTW es menor: 5 de 6
  });
});

describe('Tipo III — Microftalmo simple (MS)', () => {
  it.each([
    ['caso típico', tipoIII()],
    ['LA = 20 mm exactos (límite inferior)', tipoIII({ longitudAxial: 20.0 })],
    ['justo dentro de los límites', tipoIII({ longitudAxial: 20.99, acd: 2.0 })],
    ['CA = 2.5 mm exactos', tipoIII({ acd: 2.5 })],
    ['con Shaffer 3 (a veces 3)', tipoIII({ angulo: ['shaffer3'] })],
  ])('%s → III', (_, input) => {
    expect(diagnostico(input)).toBe('III');
  });

  it('índice LT/AL 0.18–0.20 incluye ambos extremos', () => {
    expect(diagnostico(tipoIII({ longitudAxial: 20.0, grosorCristalino: 3.6 }))).toBe('III');
    expect(diagnostico(tipoIII({ longitudAxial: 20.0, grosorCristalino: 4.0 }))).toBe('III');
    // fuera del rango el índice LT/AL (criterio menor) no impide el tipo
    const fuera = clasificar(tipoIII({ longitudAxial: 20.0, grosorCristalino: 3.5 }), config);
    expect(fuera.tipo?.id).toBe('III');
    expect(fuera.tipo?.totales.cumplidos).toBe(5);
  });
});

describe('Ángulo por grado Shaffer', () => {
  it.each([
    ['Shaffer 0 → V', tipoV({ angulo: ['shaffer0'] }), 'V'],
    ['Shaffer 1 → I', tipoI({ angulo: ['shaffer1'] }), 'I'],
    ['Shaffer 2 → I (1–2)', tipoI({ angulo: ['shaffer2'] }), 'I'],
    ['Shaffer 2 → III', tipoIII({ angulo: ['shaffer2'] }), 'III'],
    ['Shaffer 3 → II (3–4)', tipoII({ angulo: ['shaffer3'] }), 'II'],
    ['Shaffer 4 → II', tipoII({ angulo: ['shaffer4'] }), 'II'],
    ['Shaffer 3 → III (a veces 3)', tipoIII({ angulo: ['shaffer3'] }), 'III'],
  ])('%s', (_, input, esperado) => {
    expect(diagnostico(input)).toBe(esperado);
  });

  it('Shaffer 4 no cumple el MS ni el MAR; Shaffer 0 no cumple el MPR', () => {
    expect(diagnostico(tipoIII({ angulo: ['shaffer4'] }))).toBe('zona_gris');
    expect(diagnostico(tipoII({ angulo: ['shaffer0'] }))).toBe('zona_gris');
  });
});

describe('Ángulo con varias opciones', () => {
  it.each([
    ['Shaffer 1 + 2 → I', tipoI({ angulo: ['shaffer1', 'shaffer2'] }), 'I'],
    ['Shaffer 3 + 4 → II', tipoII({ angulo: ['shaffer3', 'shaffer4'] }), 'II'],
    ['Shaffer 2 + 3 → III', tipoIII({ angulo: ['shaffer2', 'shaffer3'] }), 'III'],
    ['Shaffer 2 + deformado → IV (basta marcar deformado)', tipoIV({ angulo: ['shaffer2', 'deformado'] }), 'IV'],
  ])('%s', (_, input, esperado) => {
    expect(diagnostico(input)).toBe(esperado);
  });

  it('todas las opciones marcadas deben caber en el tipo', () => {
    expect(diagnostico(tipoI({ angulo: ['shaffer1', 'shaffer3'] }))).toBe('zona_gris');
    expect(diagnostico(tipoIII({ angulo: ['shaffer1', 'shaffer2'] }))).toBe('zona_gris');
    expect(diagnostico(tipoV({ angulo: ['shaffer0', 'shaffer1'] }))).toBe('zona_gris');
  });

  it('sin ninguna opción marcada el ángulo queda sin dato', () => {
    const r = clasificar(tipoI({ angulo: [] }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos).toContainEqual(expect.objectContaining({ tipo: 'I', sinDato: true }));
  });
});

describe('Tipo IV — Microftalmo complejo (MC)', () => {
  it.each([
    ['caso típico', tipoIV()],
    ['CA amplia (la CA es variable)', tipoIV({ acd: 2.8 })],
    ['cristalino grueso (el índice LT/AL es variable)', tipoIV({ grosorCristalino: 5.5 })],
    ['malformación con ángulo deformado sobre un ojo con perfil de MS', tipoIII({ malformaciones: true, angulo: ['deformado'] })],
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
    expect(clasificar(tipoV({ grosorCristalino: 3.96 }), config).tipo?.totales.cumplidos).toBe(5);
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
    if (anguloIV && anguloIV.op === 'en') anguloIV.valores = ['deformado', 'shaffer0'];
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
    expect(r.conflictos.map((c) => c.etiqueta)).toContain('20 ≤ LA < 21 mm (−2 DE)');
  });

  it('LA 21.0: no cumple LA < 21 del MS', () => {
    expect(diagnostico(tipoIII({ longitudAxial: 20.99 }))).toBe('III');
    const r = clasificar(tipoIII({ longitudAxial: 21.0 }), config);
    expect(r.estado).toBe('zona_gris');
    expect(r.conflictos.map((c) => c.etiqueta)).toContain('20 ≤ LA < 21 mm (−2 DE)');
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
    expect(clasificar(tipoI({ wtw: 11.0 }), config).tipo?.totales.cumplidos).toBe(5);
    expect(clasificar(tipoII({ wtw: 11.0 }), config).tipo?.totales.cumplidos).toBe(5);
    expect(diagnostico(tipoII({ wtw: 11.01 }))).toBe('II');
  });

  it('índice LT/AL 0.22: no cumple < 0.22 del MAR', () => {
    expect(diagnostico(tipoI({ grosorCristalino: 5.05 }))).toBe('I');
    expect(clasificar(tipoI({ grosorCristalino: 5.06 }), config).tipo?.totales.cumplidos).toBe(5);
  });

  it('índice LT/AL exactamente 0.20 (3.7 / 18.5) no cumple < 0.20 del MPR pese a la coma flotante', () => {
    expect(clasificar(tipoII({ grosorCristalino: 3.7 }), config).tipo?.totales.cumplidos).toBe(5);
  });
});

describe('LA −2 DE (< 21 mm)', () => {
  it('LA = 21 mm exactos no cumple < 21 (tipos III y IV)', () => {
    expect(diagnostico(tipoIII({ longitudAxial: 21.0 }))).toBe('zona_gris');
    expect(diagnostico(tipoIV({ longitudAxial: 21.0 }))).toBe('zona_gris');
  });

  it('la etiqueta conserva la notación de la tabla', () => {
    expect(clasificar(tipoIII(), config).tipo?.criterios[0].etiqueta).toBe('20 ≤ LA < 21 mm (−2 DE)');
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
  // LA 23 mm y LT 5.2 mm → LT/AL ≈ 0.226 (> 0.22), con CA 1.9 mm.
  const excepcion = (o: Partial<EyeInput> = {}) => tipoI({ longitudAxial: 23.0, acd: 1.9, grosorCristalino: 5.2, ...o });

  it('excepción VAPP: LA > 22.5, CA < 2.0 y LT/AL > 0.22 → alerta (el Tipo I se asigna con 5 de 6)', () => {
    const r = clasificar(excepcion(), config);
    expect(r.tipo?.id).toBe('I');
    expect(r.alertas.map((a) => a.id)).toContain('excepcion-vapp');
  });

  it('la excepción no reemplaza la técnica del Tipo I', () => {
    const r = clasificar(tipoI(), config);
    expect(r.tipo?.tecnica).toEqual(['Rexis con cistótomo', 'Stop and Chop', 'IP quirúrgica', 'Goniosinequiálisis si el cierre es sinequial']);
    expect(r.tipo?.tecnicaPorExcepcion).toBeNull();
    expect(r.alertas.map((a) => a.id)).not.toContain('excepcion-vapp');
  });

  it.each([
    ['con CA = 2.0 mm', excepcion({ acd: 2.0 })],
    ['con LT/AL = 0.22', excepcion({ longitudAxial: 25.0, grosorCristalino: 5.5 })],
    ['con LA = 22.5 mm', excepcion({ longitudAxial: 22.5, grosorCristalino: 5.2 })],
    ['sin dato de LT', excepcion({ grosorCristalino: null })],
  ])('la excepción no se activa %s', (_, input) => {
    expect(clasificar(input, config).alertas.map((a) => a.id)).not.toContain('excepcion-vapp');
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

  it('subir el mínimo a 6 de 6 exige todos los criterios (un MAR sin microcórnea pasa a zona gris)', () => {
    const input = tipoI({ wtw: 11.5 });
    expect(diagnostico(input)).toBe('I');
    const cfg = configClon();
    cfg.minimoCriterios = 6;
    expect(diagnostico(input, cfg)).toBe('zona_gris');
  });

  it('convertir el WTW del Tipo I en criterio mayor lo hace obligatorio', () => {
    const input = tipoI({ wtw: 11.5 });
    const cfg = configClon();
    cfg.tipos[0].criterios[5] = { nivel: 'mayor', campo: 'wtw', op: '<', valor: 11.0 };
    expect(diagnostico(input, cfg)).toBe('zona_gris');
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

describe('Tratamiento', () => {
  it('cada tipo recibe exactamente la técnica de su configuración', () => {
    for (const input of [tipoI(), tipoII(), tipoIII(), tipoIV(), tipoV()]) {
      const r = clasificar(input, config);
      expect(r.tipo?.tecnica).toEqual(config.tipos.find((t) => t.id === r.tipo?.id)?.tecnica);
    }
  });
});
