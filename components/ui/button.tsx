import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-display uppercase tracking-wide rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        {
          'bg-accent active:bg-accent-dark text-white shadow-sm shadow-accent/30': variant === 'primary',
          'bg-ink active:bg-ink-soft text-white': variant === 'secondary',
          'active:bg-gray-100 text-gray-500 active:text-ink': variant === 'ghost',
          'bg-red-50 active:bg-red-100 text-red-600': variant === 'danger',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2.5 text-sm': size === 'md',
          'px-6 py-3.5 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
