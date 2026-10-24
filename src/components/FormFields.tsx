import { useId, type ReactNode, type Ref } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { Input, NativeSelect } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/*
 * Controles compactos (densidad de "diapositiva"): etiqueta y rango en una sola
 * línea, opciones como botones segmentados. Objetivos táctiles de 36–40 px
 * (WCAG 2.2 exige ≥ 24 px).
 */

function MensajeError({ id, error }: { id: string; error?: FieldError }) {
  if (!error?.message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-semibold leading-tight text-red-800">
      {error.message}
    </p>
  );
}

const etiquetaCls = 'text-xs font-semibold text-ink';

interface NumberFieldProps {
  label: string;
  unidad: string;
  /** Pista corta visible junto a la etiqueta (p. ej. el rango "14–30"). */
  hint?: string;
  /** Explicación adicional: se anuncia al lector de pantalla y aparece como tooltip. */
  ayuda?: string;
  registro: UseFormRegisterReturn;
  error?: FieldError;
  placeholder?: string;
  opcional?: boolean;
}

/** Campo numérico: acepta coma o punto decimal (teclado decimal en tablet). */
export function NumberField({ label, unidad, hint, ayuda, registro, error, placeholder, opcional }: NumberFieldProps) {
  const id = useId();
  const ayudaId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  return (
    <div className="min-w-0 space-y-1" title={ayuda}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={cn(etiquetaCls, 'truncate')}>
          {label}
          {opcional && <span className="font-normal text-slateGray"> (opc.)</span>}
        </label>
        {hint && <span className="shrink-0 text-[11px] text-slateGray">{hint}</span>}
      </div>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(ayuda && ayudaId, error && errorId) || undefined}
          className="min-h-10 py-1.5 pr-11"
          {...registro}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slateGray">
          {unidad}
        </span>
      </div>
      {ayuda && (
        <span id={ayudaId} className="sr-only">
          {ayuda}
        </span>
      )}
      <MensajeError id={errorId} error={error} />
    </div>
  );
}

export interface Opcion<T> {
  value: T;
  label: string;
  descripcion?: string;
}

interface ChoiceGroupProps<T> {
  legend: string;
  ayuda?: string;
  opciones: Opcion<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  onBlur?: () => void;
  name: string;
  error?: FieldError;
  /** Ref de react-hook-form: permite enfocar el grupo cuando falla la validación. */
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

/** Control segmentado (radios nativos: navegable con flechas, anunciado como grupo). */
export function ChoiceGroup<T extends string | boolean | null>({
  legend,
  ayuda,
  opciones,
  value,
  onChange,
  onBlur,
  name,
  error,
  inputRef,
  className,
}: ChoiceGroupProps<T>) {
  const id = useId();
  const errorId = `${id}-error`;
  const ayudaId = `${id}-ayuda`;
  // En móvil no caben en una fila: se reparten de dos en dos (la última, sola, ocupa todo el ancho).
  const largo = opciones.length >= 4 || opciones.reduce((n, o) => n + o.label.length, 0) > 30;
  return (
    <fieldset
      className={cn('min-w-0 space-y-1', className)}
      aria-invalid={error ? true : undefined}
      aria-describedby={cn(ayuda && ayudaId, error && errorId) || undefined}
      title={ayuda}
    >
      <legend className={cn(etiquetaCls, 'mb-1 truncate')}>
        {legend}
        {ayuda && (
          <span id={ayudaId} className="sr-only">
            ({ayuda})
          </span>
        )}
      </legend>
      <div
        className={cn(
          'flex rounded-xl border bg-white p-0.5',
          largo && 'flex-wrap gap-0.5 sm:flex-nowrap sm:gap-0',
          error ? 'border-red-700' : 'border-gray-300',
        )}
      >
        {opciones.map((o, i) => {
          const checked = value === o.value;
          return (
            <label
              key={String(o.value)}
              title={o.descripcion}
              className={cn(
                'relative flex min-h-9 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] px-1.5 text-center text-[13px] font-semibold leading-tight transition-colors',
                largo && 'basis-[calc(50%-0.125rem)] whitespace-normal sm:basis-0 sm:whitespace-nowrap',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                checked ? 'bg-primary text-white shadow-sm' : 'text-ink hover:bg-slateGray-100',
              )}
            >
              <input
                type="radio"
                ref={i === 0 ? inputRef : undefined}
                name={`${name}-${id}`}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(o.value)}
                onBlur={onBlur}
              />
              {o.label}
              {o.descripcion && <span className="sr-only">: {o.descripcion}</span>}
            </label>
          );
        })}
      </div>
      <MensajeError id={errorId} error={error} />
    </fieldset>
  );
}

interface SelectFieldProps {
  label: string;
  ayuda?: string;
  opciones: Opcion<string>[];
  registro: UseFormRegisterReturn;
  error?: FieldError;
}

/** Desplegable nativo con opción vacía «-- Seleccione --» (cómodo en tablet y móvil). */
export function SelectField({ label, ayuda, opciones, registro, error }: SelectFieldProps) {
  const id = useId();
  const ayudaId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  return (
    <div className="min-w-0 space-y-1" title={ayuda}>
      <label htmlFor={id} className={cn(etiquetaCls, 'block truncate')}>
        {label}
      </label>
      <NativeSelect
        id={id}
        defaultValue=""
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(ayuda && ayudaId, error && errorId) || undefined}
        className="min-h-10 py-1.5 text-sm"
        {...registro}
      >
        <option value="" disabled>
          -- Seleccione --
        </option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
      {ayuda && (
        <span id={ayudaId} className="sr-only">
          {ayuda}
        </span>
      )}
      <MensajeError id={errorId} error={error} />
    </div>
  );
}

/** Valor calculado (no editable) con el mismo aspecto que un campo. */
export function CampoCalculado({ label, valor, ayuda }: { label: string; valor: ReactNode; ayuda?: string }) {
  return (
    <div className="min-w-0 space-y-1" title={ayuda}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn(etiquetaCls, 'truncate')}>{label}</span>
        <span className="shrink-0 text-[11px] text-slateGray">calculado</span>
      </div>
      <output aria-live="polite" className="flex min-h-10 items-center rounded-xl border border-gray-200 bg-lightBg px-4 py-1.5 text-base font-semibold text-ink">
        {valor}
      </output>
      {ayuda && <span className="sr-only">{ayuda}</span>}
    </div>
  );
}
