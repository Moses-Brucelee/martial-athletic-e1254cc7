import { useMemo } from "react";
import { useCompetitionTemplates } from "@/modules/tournaments/hooks-engine";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookTemplate } from "lucide-react";
import type { CompetitionTemplate } from "@/domain/competition";

export interface TemplateData {
  competition_type?: string;
  age_category_type?: string;
  min_age?: number | null;
  max_age?: number | null;
  divisions?: { name: string; sort_order: number }[];
  workouts?: {
    name: string | null;
    workout_number: number;
    workout_type: string;
    scoring_type: string;
    time_cap_seconds: number | null;
    measurement_type: string;
  }[];
}

interface TemplateSelectorProps {
  onSelect: (template: CompetitionTemplate, data: TemplateData) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const { data: templates = [], isLoading } = useCompetitionTemplates();

  if (isLoading || templates.length === 0) return null;

  const handleSelect = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    if (t) {
      onSelect(t, t.template_data as TemplateData);
    }
  };

  return (
    <div className="space-y-1.5 mb-4">
      <Label className="text-foreground font-medium flex items-center gap-1.5">
        <BookTemplate className="h-4 w-4 text-primary" />
        Use Template (optional)
      </Label>
      <Select onValueChange={handleSelect}>
        <SelectTrigger className="h-10 bg-background">
          <SelectValue placeholder="Start from a template…" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
              {t.description && <span className="text-muted-foreground ml-1 text-xs">— {t.description}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
