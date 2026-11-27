import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
      outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
      ghost: 'text-slate-700 hover:bg-slate-100',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      link: 'text-blue-600 underline-offset-4 hover:underline p-0 h-auto',
    };

    const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-11 px-6 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

