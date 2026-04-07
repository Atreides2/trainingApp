import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-11 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-10 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}
