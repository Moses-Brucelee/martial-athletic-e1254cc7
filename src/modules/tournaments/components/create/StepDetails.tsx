import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { MapPin, Building2, Calendar, FileText } from "lucide-react";

interface StepDetailsProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  venue: string;
  setVenue: (v: string) => void;
  hostGym: string;
  setHostGym: (v: string) => void;
  startDate: Date | undefined;
  setStartDate: (v: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (v: Date | undefined) => void;
  regDeadline: Date | undefined;
  setRegDeadline: (v: Date | undefined) => void;
  disabled?: boolean;
}

export function StepDetails({
  name, setName,
  description, setDescription,
  venue, setVenue,
  hostGym, setHostGym,
  startDate, setStartDate,
  endDate, setEndDate,
  regDeadline, setRegDeadline,
  disabled,
}: StepDetailsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {/* Name & Description */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">General Info</h3>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">Competition Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer Throwdown 2026"
            className="h-11 bg-background"
            disabled={disabled}
            maxLength={100}
          />
          {!name && <p className="text-xs text-muted-foreground">Required — give your event a memorable name</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the competition — format, rules, prizes…"
            className="bg-background min-h-[80px]"
            disabled={disabled}
            maxLength={500}
          />
        </div>
      </div>

      {/* Venue & Host */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Location</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Venue</Label>
            <Input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. City Arena, Main Hall"
              className="h-11 bg-background"
              disabled={disabled}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-medium flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Host Gym
            </Label>
            <Input
              value={hostGym}
              onChange={(e) => setHostGym(e.target.value)}
              placeholder="e.g. CrossFit Downtown"
              className="h-11 bg-background"
              disabled={disabled}
              maxLength={100}
            />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Schedule</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Start Date & Time *</Label>
            <DateTimePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Select start"
              disabled={disabled}
              minDate={today}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-medium">End Date & Time *</Label>
            <DateTimePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="Select end"
              disabled={disabled}
              minDate={startDate || today}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-foreground font-medium">Registration Deadline *</Label>
            <DateTimePicker
              value={regDeadline}
              onChange={setRegDeadline}
              placeholder="Last day to register"
              disabled={disabled}
              minDate={today}
            />
            <p className="text-xs text-muted-foreground">Athletes won't be able to register after this date</p>
          </div>
        </div>
      </div>
    </div>
  );
}
