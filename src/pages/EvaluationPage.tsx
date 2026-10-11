import { useState, type FormEvent, type ReactNode } from 'react';
import { Controller, useForm, type Control, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChoiceGroup, CheckboxField, NumberField, type Opcion } from '@/components/FormFields';
import { RANGOS, eyeInputSchema, parseDecimal, type EyeInputForm } from '@/schemas/eyeInput';
import type { EyeInput, Ojo } from '@/engine/types';
import { resumenResultado, useEvaluaciones } from '@/state/EvaluationContext';
import { guardarEnHistorial } from '@/state/history';

const VACIO = {
  pupilaSinequiada: false,
  alteracionesRetinianas: {
    retinitisPigmentaria: false,
    foveosquisis: false,
    drusasNervioOptico: false,
    plieguesPapilomaculares: false,
    agujeroMacular: false,
    otra: false,
  },
  factoresRiesgo: {
    pseudoexfoliacion: false,
    cirugiaFiltrantePrevia: false,
    cirugiaCatarataPrevia: false,
    cierreAngularAgudoAdelfo: false,
    antecedenteFamiliarGlaucoma: false,
  },
} as Partial<EyeInputForm>;

const num = { setValueAs: parseDecimal };
const rango = (r: { min: number; max: number }) => `${r.min}–${r.max}`;
const SI_NO: Opcion<boolean>[] = [
  { value: false, label: 'No' },
  { value: true, label: 'Sí' },
];

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

/** Sección numerada del formulario (equivale a un "paso", pero todas visibles a la vez). */
function Seccion({ n, titulo, extra, children }: { n: number; titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`sec-${n}`} className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`sec-${n}`} className="flex items-center gap-2 text-sm font-bold text-ink">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-white" aria-hidden="true">
            {n}
          </span>
          {titulo}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
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
    getValues,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<EyeInputForm, unknown, EyeInput>({
    resolver: zodResolver(eyeInputSchema),
    defaultValues: previa ?? { ...VACIO, ojo: ojoInicial },
    mode: 'onTouched',
    shouldFocusError: true,
  });

  const calcular = handleSubmit((data) => {
    const r = evaluar(data);
    if (guardar) guardarEnHistorial({ ojo: data.ojo, entrada: data, resumen: resumenResultado(r) });
    navigate(`/resultado/${data.ojo}`);
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // "Media y DE juntas" es una regla de todo el formulario: se avisa aunque haya otros errores.
    const [media, de] = getValues(['laMediaReferencia', 'laDEReferencia']);
    if ((media == null) !== (de == null)) {
      setError(media == null ? 'laMediaReferencia' : 'laDEReferencia', {
        message: 'Ingrese media y DE juntas (o ninguna)',
      });
    }
    void calcular();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink">{previa ? 'Editar evaluación' : 'Nueva evaluación'}</h1>
          <p className="hidden text-xs text-slateGray xl:block">Complete las 4 secciones. Los datos no salen de este dispositivo.</p>
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

      <div className="grid gap-3 lg:grid-cols-2">
        <Seccion n={1} titulo="Biometría">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            <Choice<Ojo>
              control={control}
              name="ojo"
              legend="Ojo"
              opciones={[
                { value: 'OD', label: 'OD', descripcion: 'Ojo derecho' },
                { value: 'OI', label: 'OI', descripcion: 'Ojo izquierdo' },
              ]}
            />
            <NumberField label="LA" unidad="mm" hint={rango(RANGOS.longitudAxial)} ayuda="Longitud axial" placeholder="20,5" registro={register('longitudAxial', num)} error={errors.longitudAxial} />
            <NumberField label="CA" unidad="mm" hint={rango(RANGOS.acd)} ayuda="Profundidad de cámara anterior, desde el endotelio" placeholder="2,1" registro={register('acd', num)} error={errors.acd} />
            <NumberField
              label="LA media ref."
              unidad="mm"
              opcional
              ayuda="LA media de referencia (edad/población) para el criterio «< media − 2 DE». Si se deja vacía se usa LA < 21 mm."
              placeholder="23,5"
              registro={register('laMediaReferencia', num)}
              error={errors.laMediaReferencia}
            />
            <NumberField label="DE ref." unidad="mm" opcional ayuda="Desviación estándar de referencia de la LA" placeholder="1,0" registro={register('laDEReferencia', num)} error={errors.laDEReferencia} />
            <NumberField label="Cristalino" unidad="mm" opcional ayuda="Grosor del cristalino; solo para la alerta facomórfica" placeholder="4,8" registro={register('grosorCristalino', num)} error={errors.grosorCristalino} />
          </div>
        </Seccion>

        <Seccion n={2} titulo="Gonioscopía y UBM">
          <Choice
            control={control}
            name="angulo"
            legend="Ángulo (gonioscopía)"
            opciones={[
              { value: 'abierto', label: 'Abierto' },
              { value: 'estrecho', label: 'Estrecho/ocluible' },
              { value: 'deformado', label: 'Deformado' },
              { value: 'cerrado', label: 'Cerrado/ocluido' },
            ]}
          />
          <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[1fr_1fr_1.4fr]">
            <NumberField label="Esclera" unidad="mm" hint={rango(RANGOS.grosorEscleral)} ayuda="Grosor escleral por ecografía / UBM" placeholder="1,1" registro={register('grosorEscleral', num)} error={errors.grosorEscleral} />
            <Choice<boolean> control={control} name="efusionCoroidea" legend="Efusión coroidea" opciones={SI_NO} />
            <Choice
              control={control}
              name="cuerpoCiliar"
              legend="Cuerpo ciliar (UBM)"
              opciones={[
                { value: 'normal', label: 'Normal' },
                { value: 'anteriorizado', label: 'Anteriorizado' },
              ]}
            />
          </div>
        </Seccion>

        <Seccion n={3} titulo="Hallazgos">
          <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[1.5fr_1fr]">
            <Choice
              control={control}
              name="cristalino"
              legend="Cristalino"
              opciones={[
                { value: 'normal', label: 'Normal' },
                { value: 'coloboma', label: 'Coloboma' },
                { value: 'intumescente', label: 'Intumescente' },
              ]}
            />
            <Choice<boolean> control={control} name="malformaciones" legend="Malformaciones" ayuda="colobomas, disgenesias" opciones={SI_NO} />
          </div>
          <CheckboxField label="Pupila sinequiada" registro={register('pupilaSinequiada')} />
        </Seccion>

        <Seccion n={4} titulo="Retina y factores de riesgo">
          <fieldset>
            <legend className="mb-1 text-xs font-semibold text-ink">
              Alteraciones retinianas <span className="font-normal text-slateGray">(opc.)</span>
            </legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              <CheckboxField label="Retinitis pigmentaria" registro={register('alteracionesRetinianas.retinitisPigmentaria')} />
              <CheckboxField label="Foveosquisis" registro={register('alteracionesRetinianas.foveosquisis')} />
              <CheckboxField label="Drusas del NO" registro={register('alteracionesRetinianas.drusasNervioOptico')} />
              <CheckboxField label="Pliegues papilomaculares" registro={register('alteracionesRetinianas.plieguesPapilomaculares')} />
              <CheckboxField label="Agujero macular" registro={register('alteracionesRetinianas.agujeroMacular')} />
              <CheckboxField label="Otra" registro={register('alteracionesRetinianas.otra')} />
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-xs font-semibold text-ink">
              Otros factores de riesgo de glaucoma maligno <span className="font-normal text-slateGray">(opc.)</span>
            </legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              <CheckboxField label="Pseudoexfoliación" registro={register('factoresRiesgo.pseudoexfoliacion')} />
              <CheckboxField label="Cirugía filtrante" registro={register('factoresRiesgo.cirugiaFiltrantePrevia')} />
              <CheckboxField label="Catarata previa" registro={register('factoresRiesgo.cirugiaCatarataPrevia')} />
              <CheckboxField label="Cierre angular agudo adelfo" registro={register('factoresRiesgo.cierreAngularAgudoAdelfo')} />
              <CheckboxField label="Glaucoma familiar" registro={register('factoresRiesgo.antecedenteFamiliarGlaucoma')} />
            </div>
          </fieldset>
        </Seccion>
      </div>
    </form>
  );
}
