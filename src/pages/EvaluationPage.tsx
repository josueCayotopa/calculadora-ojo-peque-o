import { useState } from 'react';
import { Controller, useForm, useWatch, type Control, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, History, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatFecha } from '@/lib/utils';
import { TablaTipos } from '@/components/TablaTipos';
import { Button } from '@/components/ui/button';
import { CampoCalculado, ChoiceGroup, NumberField, type Opcion } from '@/components/FormFields';
import { RANGOS, eyeInputSchema, parseDecimal, type EyeInputForm } from '@/schemas/eyeInput';
import { indiceLTAL } from '@/engine';
import type { EyeInput, Ojo } from '@/engine/types';
import { resumenResultado, useEvaluaciones } from '@/state/EvaluationContext';
import { borrarHistorial, eliminarDeHistorial, guardarEnHistorial, leerHistorial, type EntradaHistorial } from '@/state/history';

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

const ANGULOS: { value: string; label: string }[] = [
  { value: 'shaffer0', label: 'Shaffer 0' },
  { value: 'shaffer1', label: 'Shaffer 1' },
  { value: 'shaffer2', label: 'Shaffer 2' },
  { value: 'shaffer3', label: 'Shaffer 3' },
  { value: 'shaffer4', label: 'Shaffer 4' },
  { value: 'deformado', label: 'Deformado (Shaffer variable)' },
];

/** Descripción gonioscópica de cada opción (sin asignar tipo: el cirujano elige según su examen). */
const DETALLE_ANGULO: Record<string, string> = {
  shaffer0: 'Indentación: aposicional vs sinequial + extensión en grados.',
  shaffer1: 'MT posterior no visible ≥ 180°; abre con indentación (aposicional).',
  shaffer2: 'MT posterior no visible ≥ 180° (abre con indentación, aposicional) o MT visible con cierre < 180°.',
  shaffer3: 'Todas las estructuras visibles (a veces MT visible; cierre < 180°).',
  shaffer4: 'Todas las estructuras visibles.',
  deformado: 'Shaffer variable + anomalía estructural (inserción alta, remanentes, tejido colobomatoso).',
};

/** Ángulo por gonioscopía: permite marcar una o varias opciones (p. ej. Shaffer 1 y 2). */
function AnguloField({ control }: { control: Control<EyeInputForm, unknown, EyeInput> }) {
  return (
    <Controller
      control={control}
      name="angulo"
      render={({ field, fieldState }) => {
        const marcadas = (Array.isArray(field.value) ? field.value : []) as string[];
        const alternar = (v: string) => field.onChange(marcadas.includes(v) ? marcadas.filter((x) => x !== v) : [...marcadas, v]);
        const detalles = ANGULOS.filter((o) => marcadas.includes(o.value)).map((o) => DETALLE_ANGULO[o.value]);
        return (
          <fieldset className="min-w-0 space-y-1.5" aria-invalid={fieldState.error ? true : undefined}>
            <legend className="mb-1 text-xs font-semibold text-ink">
              Ángulo (gonioscopía) <span className="font-normal text-slateGray">· puede marcar más de uno</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {ANGULOS.map((o) => {
                const activo = marcadas.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className={cn(
                      'flex min-h-9 cursor-pointer items-center rounded-full px-3 text-[13px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                      activo ? 'glass-primary text-white' : 'glass-field text-ink hover:bg-white/70',
                    )}
                  >
                    <input type="checkbox" className="sr-only" checked={activo} onChange={() => alternar(o.value)} onBlur={field.onBlur} />
                    {o.label}
                  </label>
                );
              })}
            </div>
            {detalles.length > 0 && <p className="whitespace-pre-line text-xs leading-snug text-slateGray">{detalles.join('\n')}</p>}
            {fieldState.error && (
              <p role="alert" className="text-xs font-semibold text-red-700">
                {fieldState.error.message ?? 'Seleccione al menos una opción del ángulo'}
              </p>
            )}
          </fieldset>
        );
      }}
    />
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <form onSubmit={onSubmit} noValidate className="glass flex flex-col gap-5 rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black leading-tight tracking-tight text-ink sm:text-3xl">
              Calculadora del <span className="text-primary">ojo pequeño</span>
            </h1>
            <p className="mt-1 text-sm text-slateGray">
              {previa ? 'Editar evaluación.' : 'Ingrese las 6 variables y obtenga el tipo y el plan quirúrgico.'}
            </p>
          </div>
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
          <div className="sm:col-span-2"><AnguloField control={control} /></div>
          <NumberField label="Diámetro corneal (WTW)" unidad="mm" placeholder="Ej. 11.0" hint={rango(RANGOS.wtw)} ayuda="Diámetro corneal horizontal blanco-blanco" registro={register('wtw', num)} error={errors.wtw} />
          <NumberField label="Cristalino (LT)" unidad="mm" placeholder="Ej. 4.5" hint={rango(RANGOS.grosorCristalino)} ayuda="Grosor del cristalino; con la LA se calcula el índice LT/AL" registro={register('grosorCristalino', num)} error={errors.grosorCristalino} />
          <IndiceLTAL control={control} />
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slateGray" title="Solo medidas y fecha, sin datos del paciente, en este navegador.">
            <input type="checkbox" className="size-4" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
            Guardar en historial
          </label>
          <div className="flex gap-2">
            {previa && (
              <Button variant="secondary" onClick={() => navigate(-1)}>
                <X aria-hidden="true" />
                Cancelar
              </Button>
            )}
            <Button type="submit" size="lg">
              <Calculator aria-hidden="true" />
              Obtener diagnóstico
            </Button>
          </div>
        </div>
      </form>

      <TablaTipos />
      <Historial />
    </div>
  );
}

/** Evaluaciones guardadas en este dispositivo (opcional); aparece solo si hay alguna. */
function Historial() {
  const navigate = useNavigate();
  const { evaluar } = useEvaluaciones();
  const [historial, setHistorial] = useState<EntradaHistorial[]>(() => leerHistorial());
  if (historial.length === 0) return null;

  return (
    <section aria-labelledby="titulo-historial" className="glass rounded-3xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-historial" className="flex items-center gap-2 text-sm font-bold text-ink">
          <History className="size-4 text-primary" aria-hidden="true" />
          Historial en este dispositivo
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm('¿Borrar todo el historial guardado en este dispositivo? Esta acción no se puede deshacer.')) {
              borrarHistorial();
              setHistorial([]);
            }
          }}
        >
          <Trash2 aria-hidden="true" />
          Borrar
        </Button>
      </div>
      <ul className="mt-2 divide-y divide-white/60">
        {historial.slice(0, 5).map((h) => (
          <li key={h.id} className="flex items-center gap-1 py-1.5">
            <button
              type="button"
              onClick={() => {
                evaluar(h.entrada);
                navigate(`/resultado/${h.ojo}`);
              }}
              className="flex min-w-0 flex-1 flex-col items-start rounded-lg px-1 text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Badge variant="neutral">{h.ojo}</Badge>
                <span className="truncate">{h.resumen}</span>
              </span>
              <span className="text-[11px] text-slateGray">
                {formatFecha(h.fecha)} · LA {h.entrada.longitudAxial} · CA {h.entrada.acd} mm
              </span>
            </button>
            <Button variant="ghost" size="icon" className="size-9" aria-label={`Eliminar entrada del ${formatFecha(h.fecha)}`} onClick={() => setHistorial(eliminarDeHistorial(h.id))}>
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
