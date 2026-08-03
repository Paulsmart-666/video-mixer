import { clsx } from 'clsx';

interface ProgressBarProps {
  progress: number;
  status: string;
}

export function ProgressBar({ progress, status }: ProgressBarProps) {
  const isIndeterminate = status === 'queued';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div
        className={clsx(
          'h-full rounded-full bg-primary transition-all',
          isIndeterminate && 'animate-pulse',
        )}
        style={{ width: `${Math.max(2, progress * 100)}%` }}
      />
    </div>
  );
}
