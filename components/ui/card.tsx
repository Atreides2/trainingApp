import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl bg-white border border-gray-200/80 p-4 shadow-sm shadow-ink/5', className)}
      {...props}
    >
      {children}
    </div>
  );
}
