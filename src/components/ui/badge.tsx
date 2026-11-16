import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold', {
  variants: {
    variant: {
      default: 'bg-white/50 text-primary-800 ring-1 ring-white/70',
      solid: 'bg-primary text-white',
      neutral: 'bg-white/50 text-ink ring-1 ring-white/70',
      success: 'bg-green-100 text-green-900',
      warning: 'bg-amber-100 text-amber-900',
      danger: 'bg-red-100 text-red-900',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
