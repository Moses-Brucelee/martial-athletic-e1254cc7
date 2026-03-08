import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1 flex-1">
          {i > 0 && (
            <div className={`h-px flex-1 transition-colors ${i <= currentStep ? "bg-accent" : "bg-border"}`} />
          )}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              i === currentStep
                ? "bg-primary text-primary-foreground"
                : i < currentStep
                ? "bg-accent/20 text-accent"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentStep ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded-full bg-current/10">
                {i + 1}
              </span>
            )}
            <span className="hidden sm:inline">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
