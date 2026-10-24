import { describe, expect, it } from 'vitest';
import { eyeInputSchema, parseDecimal } from '../eyeInput';

const valido = {
  ojo: 'OD',
  longitudAxial: 21.5,
  acd: 2.3,
  grosorCristalino: 4.2,
  angulo: 'estrecho',
  wtw: 10.5,
  cristalino: 'normal',
  malformaciones: false,
  refraccion: 'hipermetropiaModerada',
  alteracionesRetinianas: {},
  factoresRiesgo: {},
};

describe('eyeInputSchema', () => {
  it('acepta un ojo válido y aplica valores por defecto', () => {
    const r = eyeInputSchema.parse(valido);
    expect(r.alteracionesRetinianas.foveosquisis).toBe(false);
    expect(r.factoresRiesgo.pseudoexfoliacion).toBe(false);
  });

  it.each([
    ['longitudAxial', 13.9],
    ['longitudAxial', 30.1],
    ['acd', 0.4],
    ['acd', 5.1],
  ])('rechaza %s = %s (fuera de rango)', (campo, valor) => {
    expect(eyeInputSchema.safeParse({ ...valido, [campo]: valor }).success).toBe(false);
  });

  it.each([
    ['longitudAxial', 14.0],
    ['longitudAxial', 30.0],
    ['acd', 0.5],
    ['acd', 5.0],
  ])('acepta %s = %s (límite del rango)', (campo, valor) => {
    expect(eyeInputSchema.safeParse({ ...valido, [campo]: valor }).success).toBe(true);
  });

  it('exige ángulo, malformaciones y WTW', () => {
    for (const campo of ['angulo', 'malformaciones', 'wtw']) {
      const { [campo]: _, ...sin } = valido as Record<string, unknown>;
      expect(eyeInputSchema.safeParse(sin).success, campo).toBe(false);
    }
  });

  it('la refracción es opcional', () => {
    const { refraccion: _, ...sin } = valido;
    expect(eyeInputSchema.safeParse(sin).success).toBe(true);
  });

  it.each([7.9, 14.1])('rechaza WTW = %s (fuera de rango)', (v) => {
    expect(eyeInputSchema.safeParse({ ...valido, wtw: v }).success).toBe(false);
  });

  it('acepta el ángulo "deformado"', () => {
    expect(eyeInputSchema.safeParse({ ...valido, angulo: 'deformado' }).success).toBe(true);
  });

  it('media y DE de referencia deben ingresarse juntas', () => {
    expect(eyeInputSchema.safeParse({ ...valido, laMediaReferencia: 23.5 }).success).toBe(false);
    expect(eyeInputSchema.safeParse({ ...valido, laMediaReferencia: 23.5, laDEReferencia: 1 }).success).toBe(true);
  });

  it('exige el cristalino (LT) y lo valida en rango', () => {
    expect(eyeInputSchema.safeParse({ ...valido, grosorCristalino: null }).success).toBe(false);
    expect(eyeInputSchema.safeParse({ ...valido, grosorCristalino: 1.9 }).success).toBe(false);
    expect(eyeInputSchema.safeParse({ ...valido, grosorCristalino: 7.1 }).success).toBe(false);
  });

  it('rechaza NaN con un mensaje legible', () => {
    const r = eyeInputSchema.safeParse({ ...valido, acd: Number.NaN });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/número válido/);
  });
});

describe('parseDecimal', () => {
  it.each([
    ['2,2', 2.2],
    ['22.25', 22.25],
    [' 1,4 ', 1.4],
    ['', undefined],
  ])('%j → %s', (entrada, esperado) => {
    expect(parseDecimal(entrada)).toBe(esperado);
  });
});
