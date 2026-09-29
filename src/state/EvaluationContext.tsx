import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { clinicalConfig } from '@/config';
import { evaluarOjo } from '@/engine';
import type { EvaluacionCompleta, EyeInput, Ojo } from '@/engine/types';

/**
 * Estado de la sesión actual: solo en memoria. Al cerrar o recargar la pestaña
 * se pierde, salvo que el usuario haya optado por guardar en el historial local.
 */
interface EvaluationState {
  evaluaciones: Partial<Record<Ojo, EvaluacionCompleta>>;
  evaluar: (input: EyeInput) => EvaluacionCompleta;
  limpiar: () => void;
}

const Ctx = createContext<EvaluationState | null>(null);

export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [evaluaciones, setEvaluaciones] = useState<EvaluationState['evaluaciones']>({});

  const evaluar = useCallback((input: EyeInput) => {
    const r = evaluarOjo(input, clinicalConfig);
    setEvaluaciones((prev) => ({ ...prev, [input.ojo]: r }));
    return r;
  }, []);

  const limpiar = useCallback(() => setEvaluaciones({}), []);

  const value = useMemo(() => ({ evaluaciones, evaluar, limpiar }), [evaluaciones, evaluar, limpiar]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEvaluaciones() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEvaluaciones debe usarse dentro de <EvaluationProvider>');
  return ctx;
}

/** Texto corto del resultado, reutilizado en historial, comparación y PDF. */
export function resumenResultado(e: EvaluacionCompleta): string {
  const c = e.clasificacion;
  if (c.estado === 'clasificado' && c.tipo) return `Tipo ${c.tipo.romano} · ${nombreTipo(c.tipo)}`;
  const cercanos = c.masCercanos.map((t) => `Tipo ${t.romano}`).join(' / ');
  return `No clasificable · más cercanos: ${cercanos}`;
}

/** "Microftalmo simple (MS)" o "Nanoftalmos" si el tipo no tiene sigla. */
export function nombreTipo(t: { nombre: string; sigla?: string }): string {
  return t.sigla ? `${t.nombre} (${t.sigla})` : t.nombre;
}
