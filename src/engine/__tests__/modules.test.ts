import { describe, expect, it } from 'vitest';
import { evaluarOjo } from '../index';
import { alertaFacomorfica, checklistPreoperatorio, recomendacionLio, riesgoGlaucomaMaligno } from '../modules';
import { clasificar } from '../classifier';
import type { EyeInput } from '../types';
import { config, tipoI, tipoII, tipoIII, tipoIV, tipoV } from './fixtures';

describe('Riesgo de glaucoma maligno', () => {
  it('MAR típico: 2 factores (CA, ángulo) → moderado', () => {
    const r = riesgoGlaucomaMaligno(tipoI(), config);
    expect(r.presentes).toBe(2);
    expect(r.nivel).toBe('moderado');
    expect(r.total).toBe(3);
  });

  it('1 factor → bajo', () => {
    expect(riesgoGlaucomaMaligno(tipoI({ angulo: ['shaffer4'] }), config).nivel).toBe('bajo');
  });

  it('nanoftalmos: LA, CA y ángulo → alto', () => {
    const r = riesgoGlaucomaMaligno(tipoV(), config);
    expect(r.presentes).toBe(3);
    expect(r.nivel).toBe('alto');
  });
});

describe('Alerta facomórfica', () => {
  it('CA < 2.5 con cristalino > 4.5 mm → alerta', () => {
    expect(alertaFacomorfica(tipoIII({ acd: 2.4, grosorCristalino: 4.6 }), config).activa).toBe(true);
  });
  it('sin grosor del cristalino medido → sin alerta', () => {
    expect(alertaFacomorfica(tipoV({ grosorCristalino: null }), config).activa).toBe(false);
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
  it('LA < 20.5 mm → aviso de piggyback', () => {
    expect(recomendacionLio(tipoV(), config).piggyback.activa).toBe(true);
    expect(recomendacionLio(tipoI({ longitudAxial: 20.5 }), config).piggyback.activa).toBe(false);
  });
});

describe('Checklist preoperatorio', () => {
  const textos = (input: EyeInput) => checklistPreoperatorio(input, clasificar(input, config), config).map((i) => i.texto);

  it('I: manitol, rexis con cistótomo, IP quirúrgica y sin vitrectomía', () => {
    const t = textos(tipoI());
    expect(t.some((x) => x.startsWith('Manitol'))).toBe(true);
    expect(t.some((x) => x.includes('cistótomo'))).toBe(true);
    expect(t.some((x) => x.includes('IP quirúrgica'))).toBe(true);
    expect(t.some((x) => /VAPP|trocar/.test(x))).toBe(false);
  });

  it('II: manitol y Utrata, sin trocar ni vitrectomía', () => {
    const t = textos(tipoII());
    expect(t.some((x) => x.startsWith('Manitol'))).toBe(true);
    expect(t.some((x) => x.includes('Utrata'))).toBe(true);
    expect(t.some((x) => /VAPP|trocar/.test(x))).toBe(false);
  });

  it('III: un solo trocar y viscoelástico pesado', () => {
    const t = textos(tipoIII());
    expect(t.some((x) => x.includes('Un solo trocar'))).toBe(true);
    expect(t.some((x) => x.includes('pesado'))).toBe(true);
  });

  it('IV: VAPP en seco e IP quirúrgica', () => {
    const t = textos(tipoIV());
    expect(t.some((x) => x.includes('VAPP en seco 5–10 s'))).toBe(true);
    expect(t.some((x) => x.includes('IP quirúrgica'))).toBe(true);
  });

  it('V: VAPP, goniosinequiálisis e IZHV', () => {
    const t = textos(tipoV());
    expect(t.some((x) => x.startsWith('VAPP'))).toBe(true);
    expect(t.some((x) => x.includes('Goniosinequiálisis'))).toBe(true);
    expect(t.some((x) => x.includes('IZHV'))).toBe(true);
  });

  it('en zona gris los ítems específicos son referenciales', () => {
    const input = tipoI({ longitudAxial: 22.2 });
    const items = checklistPreoperatorio(input, clasificar(input, config), config);
    expect(items.find((i) => i.texto.startsWith('Rexis con cistótomo'))?.referencial).toBe(true);
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
