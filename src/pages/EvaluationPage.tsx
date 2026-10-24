import { useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Control, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChoiceGroup, CheckboxField, NumberField, type Opcion } from '@/components/FormFields';
import { RANGOS, eyeInputSchema, parseDecimal, type EyeInputForm } from '@/schemas/eyeInput';
import { indiceLTAL } from '@/engine';
import type { EyeInput, Ojo, Refraccion, Sinequias } from '@/engine/types';
import { resumenResultado, useEvaluaciones } from '@/state/EvaluationContext';
import { guardarEnHistorial } from '@/state/history';

/**
 * Campos que ya no se piden en el formulario. Se fijan siempre a su valor neutro
 * (también al editar una evaluación antigua) para que no influyan sin verse.
 */
const SIN_EXTRAS = {
  laMediaReferencia: null,
  laDEReferencia: null,
  pupilaSinequiada: false,
  factoresRiesgo: {
    pseudoexfoliacion: false,
    cirugiaFiltrantePrevia: false,
    cirugiaCatarataPrevia: false,
    cierreAngularAgudoAdelfo: false,
    antecedenteFamiliarGlaucoma: false,
  },
} satisfies Partial<EyeInputForm>;

const VACIO = {
  ...SIN_EXTRAS,
  alteracionesRetinianas: {
    retinitisPigmentaria: false,
    foveosquisis: false,
    drusasNervioOptico: false,
    plieguesPapilomaculares: false,
    agujeroMacular: false,
    otra: false,
  },
  alteracionesAsociadas: { leves: false, colobomas: false, intumescencia: false },
} as Partial<EyeInputForm>;

const num = { setValueAs: parseDecimal };

/** Las evaluaciones antiguas guardaban otras opciones de refracción (emétrope…): se dejan en blanco al editar. */
const REFRACCIONES: readonly Refraccion[] = ['hipermetropiaLeve', 'hipermetropiaAlta', 'hipermetropiaModerada'];
const refraccionVigente = (r: string | undefined): Refraccion | undefined => REFRACCIONES.find((x) => x === r);

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
    <p className="mt-1 text-xs text-slateGray" aria-live="polite">
      Índice LT/AL (calculado): <strong className="text-ink">{indice === null ? '—' : indice.toFixed(3)}</strong>
    </p>
  );
}

/** Una fila de la lista de variables. */
function Fila({ children }: { children: ReactNode }) {
  return <li className="py-3 first:pt-0 last:pb-0">{children}</li>;
}

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
    defaultValues: previa ? { ...VACIO, ...previa, grosorCristalino: previa.grosorCristalino ?? undefined, refraccion: refraccionVigente(previa.refraccion), ...SIN_EXTRAS } : { ...VACIO, ojo: ojoInicial },
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

      <ol className="divide-y divide-gray-100 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <Fila>
          <Choice<Ojo>
            control={control}
            name="ojo"
            legend="Ojo"
            opciones={[
              { value: 'OD', label: 'OD', descripcion: 'Ojo derecho' },
              { value: 'OI', label: 'OI', descripcion: 'Ojo izquierdo' },
            ]}
          />
        </Fila>
        <Fila>
          <NumberField label="Longitud axial" unidad="mm" hint={rango(RANGOS.longitudAxial)} registro={register('longitudAxial', num)} error={errors.longitudAxial} />
        </Fila>
        <Fila>
          <NumberField label="Cámara anterior" unidad="mm" hint={rango(RANGOS.acd)} ayuda="Profundidad de cámara anterior, desde el endotelio" registro={register('acd', num)} error={errors.acd} />
        </Fila>
        <Fila>
          <Choice
            control={control}
            name="angulo"
            legend="Ángulo"
            ayuda="Gonioscopía"
            opciones={[
              { value: 'abierto', label: 'Abierto' },
              { value: 'estrecho', label: 'Estrecho/ocluible' },
              { value: 'deformado', label: 'Deformado' },
              { value: 'cerrado', label: 'Cerrado/ocluible' },
            ]}
          />
        </Fila>
        <Fila>
          <Choice<Sinequias>
            control={control}
            name="sinequias"
            legend="Sinequias (opc.)"
            ayuda="Goniosinequias. > 180°: se añade válvula de Ahmed; < 180°: goniosinequiálisis"
            opciones={[
              { value: 'no', label: 'No' },
              { value: 'menor180', label: '< 180°' },
              { value: 'mayor180', label: '> 180°' },
            ]}
          />
        </Fila>
        <Fila>
          <NumberField label="Cristalino (LT)" unidad="mm" hint={rango(RANGOS.grosorCristalino)} ayuda="Grosor del cristalino; con la LA se calcula el índice LT/AL" registro={register('grosorCristalino', num)} error={errors.grosorCristalino} />
          <IndiceLTAL control={control} />
        </Fila>
        <Fila>
          <Choice<boolean>
            control={control}
            name="malformaciones"
            legend="Malformaciones anatómicas"
            opciones={[
              { value: false, label: 'No' },
              { value: true, label: 'Sí (colobomas y disgenesias)' },
            ]}
          />
        </Fila>
        <Fila>
          <NumberField label="WTW" unidad="mm" hint={rango(RANGOS.wtw)} ayuda="Diámetro corneal horizontal blanco-blanco" registro={register('wtw', num)} error={errors.wtw} />
        </Fila>
        <Fila>
          <Choice<Refraccion>
            control={control}
            name="refraccion"
            legend="Refracción (opc.)"
            ayuda="Opcional: puede dejarse en blanco"
            opciones={[
              { value: 'hipermetropiaLeve', label: 'Hipermetropía leve' },
              { value: 'hipermetropiaAlta', label: 'Hipermetropía alta' },
              { value: 'hipermetropiaModerada', label: 'Hipermetropía moderada' },
            ]}
          />
        </Fila>
        <Fila>
          <fieldset>
            <legend className="mb-1 text-xs font-semibold text-ink">
              Alteraciones asociadas <span className="font-normal text-slateGray">(opc. · sin marcar = No)</span>
            </legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              <CheckboxField label="Leves" registro={register('alteracionesAsociadas.leves')} />
              <CheckboxField label="Retinitis pigmentaria" registro={register('alteracionesRetinianas.retinitisPigmentaria')} />
              <CheckboxField label="Foveosquisis" registro={register('alteracionesRetinianas.foveosquisis')} />
              <CheckboxField label="Drusas del NO" registro={register('alteracionesRetinianas.drusasNervioOptico')} />
              <CheckboxField label="Pliegues papilomaculares" registro={register('alteracionesRetinianas.plieguesPapilomaculares')} />
              <CheckboxField label="Agujero macular" registro={register('alteracionesRetinianas.agujeroMacular')} />
              <CheckboxField label="Colobomas" registro={register('alteracionesAsociadas.colobomas')} />
              <CheckboxField label="Otra alteración retiniana" registro={register('alteracionesRetinianas.otra')} />
              <CheckboxField label="Intumescencia" registro={register('alteracionesAsociadas.intumescencia')} />
            </div>
          </fieldset>
        </Fila>
      </ol>

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
