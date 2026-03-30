import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  className?: string;
  colorClass?: string;
  label?: string;
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  colorClass = "bg-brand-500",
  label,
  animated = false,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      className={cn("w-full bg-gray-200 rounded-full h-2.5 overflow-hidden", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          colorClass,
          animated && "animate-pulse",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
