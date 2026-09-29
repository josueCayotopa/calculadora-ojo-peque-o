import { describe, expect, it } from 'vitest';
import { evaluarOjo } from '../index';
import { alertaFacomorfica, checklistPreoperatorio, recomendacionLio, riesgoGlaucomaMaligno } from '../modules';
import { clasificar } from '../classifier';
import type { EyeInput } from '../types';
import { config, tipoI, tipoII, tipoIII, tipoV } from './fixtures';

describe('Riesgo de glaucoma maligno', () => {
  it('MAR típico: 2 factores (CA, ángulo) → moderado', () => {
    const r = riesgoGlaucomaMaligno(tipoI(), config);
    expect(r.presentes).toBe(2);
    expect(r.nivel).toBe('moderado');
    expect(r.total).toBe(9);
  });

  it('1 factor → bajo', () => {
    expect(riesgoGlaucomaMaligno(tipoI({ angulo: 'abierto' }), config).nivel).toBe('bajo');
  });

  it('4 factores → alto (umbral exacto)', () => {
    const r = riesgoGlaucomaMaligno(tipoI({ factoresRiesgo: { pseudoexfoliacion: true, cirugiaFiltrantePrevia: true } }), config);
    expect(r.presentes).toBe(4);
    expect(r.nivel).toBe('alto');
  });

  it('nanoftalmos → alto', () => {
    expect(riesgoGlaucomaMaligno(tipoV(), config).nivel).toBe('alto');
  });

  it('cirugía filtrante y de catarata previa cuentan como un solo factor', () => {
    const una = riesgoGlaucomaMaligno(tipoI({ factoresRiesgo: { cirugiaFiltrantePrevia: true } }), config).presentes;
    const ambas = riesgoGlaucomaMaligno(
      tipoI({ factoresRiesgo: { cirugiaFiltrantePrevia: true, cirugiaCatarataPrevia: true } }),
      config,
    ).presentes;
    expect(ambas).toBe(una);
  });
});

describe('Alerta facomórfica', () => {
  it('CA < 2.5 con cristalino > 4.5 mm → alerta', () => {
    expect(alertaFacomorfica(tipoIII({ acd: 2.4, grosorCristalino: 4.6 }), config).activa).toBe(true);
  });
  it('CA < 2.5 con cristalino intumescente (sin grosor medido) → alerta', () => {
    expect(alertaFacomorfica(tipoV({ grosorCristalino: null }), config).activa).toBe(true);
  });
  it('CA = 2.5 exactos → sin alerta', () => {
    expect(alertaFacomorfica(tipoIII({ acd: 2.5, grosorCristalino: 5.0 }), config).activa).toBe(false);
  });
  it('cristalino = 4.5 exactos y normal → sin alerta', () => {
    expect(alertaFacomorfica(tipoIII({ grosorCristalino: 4.5 }), config).activa).toBe(false);
  });
});

describe('Recomendación de LIO / piggyback', () => {
  it('lista Kane primero y siempre recomienda biometría óptica', () => {
    const r = recomendacionLio(tipoI(), config);
    expect(r.formulas[0].nombre).toBe('Kane');
    expect(r.biometria).toMatch(/biometría óptica/i);
  });
  it('potencia ≥ 30 D → piggyback', () => {
    expect(recomendacionLio(tipoI({ potenciaLio: 30 }), config).piggyback.activa).toBe(true);
    expect(recomendacionLio(tipoI({ potenciaLio: 29.5 }), config).piggyback.activa).toBe(false);
  });
  it('sin potencia y LA < 20.5 mm → aviso anticipado', () => {
    expect(recomendacionLio(tipoV(), config).piggyback.activa).toBe(true);
  });
});

describe('Checklist preoperatorio', () => {
  const textos = (input: EyeInput) => checklistPreoperatorio(input, clasificar(input, config), config).map((i) => i.texto);

  it('I: manitol y CCC con cistótomo, sin vitrectomía', () => {
    const t = textos(tipoI());
    expect(t.some((x) => x.startsWith('Manitol'))).toBe(true);
    expect(t.some((x) => x.includes('cistótomo'))).toBe(true);
    expect(t.some((x) => /vitrector|vitrectomía 23G/.test(x))).toBe(false);
  });

  it('II: sin manitol (preoperatorio pendiente) y sin trocar', () => {
    const t = textos(tipoII());
    expect(t.some((x) => x.startsWith('Manitol'))).toBe(false);
    expect(t.some((x) => x.startsWith('Sin trocar'))).toBe(true);
  });

  it('V: vitrectomía 23G e IHZV', () => {
    const t = textos(tipoV());
    expect(t.some((x) => x.includes('23G'))).toBe(true);
    expect(t.some((x) => x.includes('IHZV'))).toBe(true);
  });

  it('ángulo estrecho → valorar iridotomía previa', () => {
    expect(textos(tipoI()).some((x) => x.includes('iridotomía'))).toBe(true);
    expect(textos(tipoV()).some((x) => x.includes('iridotomía'))).toBe(false);
  });

  it('en zona gris los ítems específicos son referenciales', () => {
    const input = tipoI({ longitudAxial: 22.2 });
    const items = checklistPreoperatorio(input, clasificar(input, config), config);
    expect(items.find((i) => i.texto.startsWith('Manitol'))?.referencial).toBe(true);
    expect(items.find((i) => i.texto.startsWith('Midriasis'))?.referencial).toBe(false);
  });
});

describe('evaluarOjo', () => {
  it('agrega todos los módulos', () => {
    const r = evaluarOjo(tipoV(), config);
    expect(r.clasificacion.tipo?.romano).toBe('V');
    expect(r.glaucomaMaligno.nivel).toBe('alto');
    expect(r.checklist.length).toBeGreaterThan(0);
    expect(r.configVersion).toBe(config.version);
  });
});
