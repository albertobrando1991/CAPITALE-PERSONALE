interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md";
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = "md",
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  const heightClass = size === "sm" ? "h-2" : "h-3";

  return (
    <div className="w-full" data-testid="progress-bar">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-muted rounded-full ${heightClass} overflow-hidden`}>
        <div
          className={`bg-primary ${heightClass} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
