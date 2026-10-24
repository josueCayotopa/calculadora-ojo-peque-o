import { useState } from 'react';
import { Controller, useForm, useWatch, type Control, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, ClipboardList, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampoCalculado, ChoiceGroup, NumberField, SelectField, type Opcion } from '@/components/FormFields';
import { RANGOS, eyeInputSchema, parseDecimal, type EyeInputForm } from '@/schemas/eyeInput';
import { indiceLTAL } from '@/engine';
import type { EyeInput, Ojo } from '@/engine/types';
import { resumenResultado, useEvaluaciones } from '@/state/EvaluationContext';
import { guardarEnHistorial } from '@/state/history';

const num = { setValueAs: parseDecimal };

const rango = (r: { min: number; max: number }) => `${r.min}–${r.max}`;

type ChoiceProps<T extends string | boolean | null> = {
  control: Control<EyeInputForm, unknown, EyeInput>;
  name: Path<EyeInputForm>;
  legend: string;
  opciones: Opcion<T>[];
  ayuda?: string;
  className?: string;
};

function Choice<T extends string | boolean | null>({ control, name, ...rest }: ChoiceProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <ChoiceGroup<T>
          {...rest}
          name={field.name}
          value={(field.value ?? null) as T}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          error={fieldState.error}
        />
      )}
    />
  );
}

/** Índice LT/AL calculado en vivo a partir de LT y LA (no se ingresa). */
function IndiceLTAL({ control }: { control: Control<EyeInputForm, unknown, EyeInput> }) {
  const [lt, la] = useWatch({ control, name: ['grosorCristalino', 'longitudAxial'] });
  const valido = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const indice = valido(lt) && valido(la) ? indiceLTAL({ grosorCristalino: lt, longitudAxial: la }) : null;
  return (
    <CampoCalculado
      label="Índice LT/AL"
      ayuda="Grosor del cristalino ÷ longitud axial"
      valor={indice === null ? <span className="font-normal text-slateGray/70">LT ÷ LA</span> : indice.toFixed(3)}
    />
  );
}

const ANGULOS: Opcion<string>[] = [
  { value: 'abierto', label: 'Abierto' },
  { value: 'estrecho', label: 'Estrecho/ocluible' },
  { value: 'deformado', label: 'Deformado' },
  { value: 'cerrado', label: 'Cerrado/ocluible' },
];

export function EvaluationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { evaluaciones, evaluar } = useEvaluaciones();

  const ojoParam = params.get('ojo');
  const ojoInicial: Ojo | undefined = ojoParam === 'OD' || ojoParam === 'OI' ? ojoParam : undefined;
  const previa = ojoInicial && params.get('editar') ? evaluaciones[ojoInicial]?.entrada : undefined;
  const [guardar, setGuardar] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EyeInputForm, unknown, EyeInput>({
    resolver: zodResolver(eyeInputSchema),
    defaultValues: previa ? { ...previa, grosorCristalino: previa.grosorCristalino ?? undefined } : { ojo: ojoInicial },
    mode: 'onTouched',
    shouldFocusError: true,
  });

  const onSubmit = handleSubmit((data) => {
    const r = evaluar(data);
    if (guardar) guardarEnHistorial({ ojo: data.ojo, entrada: data, resumen: resumenResultado(r) });
    navigate(`/resultado/${data.ojo}`);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink">{previa ? 'Editar evaluación' : 'Nueva evaluación'}</h1>
          <p className="hidden text-xs text-slateGray xl:block">Complete las variables. Los datos no salen de este dispositivo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slateGray" title="Solo medidas y fecha, sin datos del paciente, en este navegador.">
            <input type="checkbox" className="size-4" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
            Guardar en historial
          </label>
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button type="submit">
            <Calculator aria-hidden="true" />
            Obtener diagnóstico
          </Button>
        </div>
      </div>

      {/* Una sola tarjeta en cuadrícula de 2 columnas (1 en móvil): cabe en una pantalla de laptop o tablet. */}
      <section aria-labelledby="titulo-variables" className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 pb-3">
          <h2 id="titulo-variables" className="flex items-center gap-2 text-lg font-black text-primary">
            <ClipboardList className="size-5" aria-hidden="true" />
            Variables biométricas
          </h2>
          <Choice<Ojo>
            control={control}
            name="ojo"
            legend="Ojo"
            className="w-40"
            opciones={[
              { value: 'OD', label: 'OD', descripcion: 'Ojo derecho' },
              { value: 'OI', label: 'OI', descripcion: 'Ojo izquierdo' },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <NumberField label="Longitud axial (LA)" unidad="mm" placeholder="Ej. 22.5" hint={rango(RANGOS.longitudAxial)} registro={register('longitudAxial', num)} error={errors.longitudAxial} />
          <NumberField label="Cámara anterior (CA)" unidad="mm" placeholder="Ej. 2.5" hint={rango(RANGOS.acd)} ayuda="Profundidad de cámara anterior, desde el endotelio" registro={register('acd', num)} error={errors.acd} />
          <NumberField label="Diámetro corneal (WTW)" unidad="mm" placeholder="Ej. 11.0" hint={rango(RANGOS.wtw)} ayuda="Diámetro corneal horizontal blanco-blanco" registro={register('wtw', num)} error={errors.wtw} />
          <NumberField label="Cristalino (LT)" unidad="mm" placeholder="Ej. 4.5" hint={rango(RANGOS.grosorCristalino)} ayuda="Grosor del cristalino; con la LA se calcula el índice LT/AL" registro={register('grosorCristalino', num)} error={errors.grosorCristalino} />
          <IndiceLTAL control={control} />
          <SelectField label="Ángulo" ayuda="Gonioscopía" opciones={ANGULOS} registro={register('angulo')} error={errors.angulo} />
          <Choice<boolean>
            control={control}
            name="malformaciones"
            legend="Malformaciones anatómicas"
            className="sm:col-span-2"
            opciones={[
              { value: false, label: 'No' },
              { value: true, label: 'Sí (colobomas y disgenesias)' },
            ]}
          />
        </div>
      </section>

      {/* En móvil el formulario es largo: el botón de enviar queda siempre a mano al final de la pantalla. */}
      <div className="sticky bottom-0 -mx-4 border-t border-gray-100 bg-white/95 px-4 py-2 backdrop-blur sm:hidden">
        <Button type="submit" className="w-full">
          <Calculator aria-hidden="true" />
          Obtener diagnóstico
        </Button>
      </div>
    </form>
  );
}
