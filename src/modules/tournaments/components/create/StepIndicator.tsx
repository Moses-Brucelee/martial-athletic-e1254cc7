import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8 px-1">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-initial">
          {/* Step circle + label */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`
                w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${i === currentStep
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20"
                  : i < currentStep
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
                }
              `}
            >
              {i < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <span
              className={`text-[10px] sm:text-xs font-semibold tracking-wide uppercase transition-colors ${
                i === currentStep
                  ? "text-primary"
                  : i < currentStep
                  ? "text-accent"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className="flex-1 mx-2 sm:mx-3 mt-[-18px] sm:mt-[-20px]">
              <div className={`h-0.5 w-full rounded-full transition-colors duration-300 ${
                i < currentStep ? "bg-accent" : "bg-border"
              }`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
