import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const campoBase =
  'flex min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary aria-[invalid=true]:border-red-700';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(campoBase, 'placeholder:text-slateGray/70', className)} {...props} />
  ),
);
Input.displayName = 'Input';

/** Select nativo con estilo shadcn: accesible por defecto y cómodo en tablet. */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(campoBase, 'appearance-none pr-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slateGray"
        aria-hidden="true"
      />
    </div>
  ),
);
NativeSelect.displayName = 'NativeSelect';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-semibold text-ink', className)} {...props} />;
}
