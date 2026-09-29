import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva('flex gap-3 rounded-2xl border p-4 text-sm', {
  variants: {
    variant: {
      info: 'border-slate-200 bg-slateGray-50 text-ink',
      warning: 'border-amber-300 bg-amber-50 text-amber-950',
      danger: 'border-red-300 bg-red-50 text-red-950',
      brand: 'border-primary-200 bg-primary-50 text-primary-900',
    },
  },
  defaultVariants: { variant: 'info' },
});

const ICONOS = { info: Info, warning: AlertTriangle, danger: OctagonAlert, brand: Info } as const;

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
}

export function Alert({ className, variant, title, children, ...props }: AlertProps) {
  const Icon = ICONOS[variant ?? 'info'];
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-bold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
