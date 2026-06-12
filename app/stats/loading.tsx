import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-72" />
      <Skeleton className="h-44" />
      <Skeleton className="h-56" />
    </div>
  );
}
