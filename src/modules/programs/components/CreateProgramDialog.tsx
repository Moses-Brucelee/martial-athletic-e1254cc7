import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PROGRAM_CATEGORIES, PROGRAM_LEVELS } from "../types";
import { useCreateProgram } from "../hooks";
import { sanitizeError } from "@/lib/validation";

/** Minimal, progressive form — only what a program shell genuinely needs. */
export function CreateProgramDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("strength");
  const [level, setLevel] = useState("all");
  const [weeks, setWeeks] = useState("4");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const navigate = useNavigate();
  const createProgram = useCreateProgram();

  const submit = async () => {
    if (title.trim().length < 2) {
      toast.error("Give the program a title");
      return;
    }
    try {
      const program = await createProgram.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        level,
        weeks_count: Math.max(1, Math.min(52, parseInt(weeks) || 4)),
        days_per_week: Math.max(1, Math.min(7, parseInt(daysPerWeek) || 3)),
      });
      toast.success("Program created");
      setOpen(false);
      navigate(`/programs/${program.id}`);
    } catch (e) {
      toast.error(sanitizeError(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="uppercase text-xs font-semibold">
          <Plus className="h-4 w-4 mr-1.5" /> New program
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wide">Create program</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-title">Title</Label>
            <Input
              id="p-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pull-up Strength Cycle"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description (optional)</Label>
            <Textarea
              id="p-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_LEVELS.map((l) => (
                    <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-weeks">Weeks</Label>
              <Input id="p-weeks" type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-days">Days / week</Label>
              <Input id="p-days" type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} />
            </div>
          </div>
          <Button className="w-full uppercase text-xs font-semibold" onClick={submit} disabled={createProgram.isPending}>
            {createProgram.isPending ? "Creating…" : "Create program"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
