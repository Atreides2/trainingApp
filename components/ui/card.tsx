import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl bg-white border border-gray-200 p-4 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}
