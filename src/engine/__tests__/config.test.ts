import { describe, expect, it } from 'vitest';
import rules from '@/config/rules.json';
import { evidencia } from '@/config/evidencia';
import { parseConfig } from '../configSchema';
import { etiquetaCriterio } from '../criteria';

const clon = () => structuredClone(rules) as any;

describe('Validación de config/rules.json', () => {
  it('la configuración incluida es válida', () => {
    expect(() => parseConfig(rules)).not.toThrow();
  });

  it('rechaza un operador inexistente', () => {
    const r = clon();
    r.tipos[0].criterios[0].op = '=<';
    expect(() => parseConfig(r)).toThrow(/rules\.json inválido/);
  });

  it('rechaza un valor de ángulo mal escrito', () => {
    const r = clon();
    r.tipos[0].criterios[3].valores = ['estrecha'];
    expect(() => parseConfig(r)).toThrow();
  });

  it('rechaza un nivel de criterio desconocido', () => {
    const r = clon();
    r.tipos[0].criterios[0].nivel = 'obligatorio';
    expect(() => parseConfig(r)).toThrow();
  });

  it('exige al menos un criterio mayor por tipo', () => {
    const r = clon();
    r.tipos[3].criterios[0].nivel = 'apoyo';
    expect(() => parseConfig(r)).toThrow(/criterio con "nivel": "mayor"/);
  });

  it('exige que todos los tipos estén en ordenEvaluacion', () => {
    const r = clon();
    r.ordenEvaluacion = ['V', 'IV', 'III', 'I'];
    expect(() => parseConfig(r)).toThrow(/II no figura/);
  });

  it('rechaza referencias a tipos inexistentes', () => {
    const r = clon();
    r.checklistPreoperatorio[0].tipos = ['VI'];
    expect(() => parseConfig(r)).toThrow(/VI/);
  });

  it('rechaza umbrales de semáforo incoherentes', () => {
    const r = clon();
    r.glaucomaMaligno.umbrales = { moderadoDesde: 4, altoDesde: 2 };
    expect(() => parseConfig(r)).toThrow();
  });

  it('rechaza ids de tipo duplicados', () => {
    const r = clon();
    r.tipos[1].id = 'I';
    expect(() => parseConfig(r)).toThrow(/duplicado/);
  });
});

describe('Etiquetas generadas desde el criterio', () => {
  it.each([
    [{ campo: 'acd', op: '<', valor: 2.2 }, 'CA < 2.2 mm'],
    [{ campo: 'longitudAxial', op: '<=', valor: 20.5 }, 'LA ≤ 20.5 mm'],
    [{ campo: 'blancoBlanco', op: '<', valor: 11 }, 'W-W < 11.0 mm'],
    [{ campo: 'acd', op: 'entre', min: 2, max: 2.2, opMin: '>=', opMax: '<=' }, '2.0 ≤ CA ≤ 2.2 mm'],
    [{ campo: 'angulo', op: 'en', valores: ['cerrado'] }, 'Ángulo cerrado/ocluido'],
    [{ campo: 'segmentoPosterior', op: 'en', valores: ['corto'] }, 'Segmento posterior corto'],
    [{ campo: 'efusionCoroidea', op: 'es', valor: false }, 'Sin efusión coroidea'],
    [{ campo: 'longitudAxial', op: 'bajoDE', nDE: 2, opComparacion: '<', valorRespaldo: 21 }, 'LA < media − 2 DE (o < 21.0 mm)'],
  ] as const)('%j → %s', (c, esperado) => {
    expect(etiquetaCriterio(c as any)).toBe(esperado);
  });
});

describe('Evidencia', () => {
  it('cada comparación cita fuentes existentes', () => {
    const ids = new Set(evidencia.fuentes.map((f) => f.id));
    for (const c of evidencia.comparaciones) {
      for (const f of c.fuentes) expect(ids.has(f), `${c.tema} → ${f}`).toBe(true);
    }
  });
});
