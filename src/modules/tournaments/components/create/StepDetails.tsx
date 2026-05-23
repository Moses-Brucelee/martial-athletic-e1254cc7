import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Building2, Calendar, FileText, Users, Globe, Lock } from "lucide-react";
import { fetchAllAffiliates, type AffiliateGym } from "@/data/affiliates";

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
  maxTeams: number | null;
  setMaxTeams: (v: number | null) => void;
  waitlistEnabled: boolean;
  setWaitlistEnabled: (v: boolean) => void;
  visibility: "public" | "private";
  setVisibility: (v: "public" | "private") => void;
  affiliateGymId: string | null;
  setAffiliateGymId: (v: string | null) => void;
  ownedGym: AffiliateGym | null;
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
  maxTeams, setMaxTeams,
  waitlistEnabled, setWaitlistEnabled,
  visibility, setVisibility,
  affiliateGymId, setAffiliateGymId,
  ownedGym,
  disabled,
}: StepDetailsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allGyms, setAllGyms] = useState<AffiliateGym[]>([]);
  useEffect(() => {
    fetchAllAffiliates().then(setAllGyms).catch(() => setAllGyms([]));
  }, []);

  // Auto-select the owned gym when switching to private if none chosen
  useEffect(() => {
    if (visibility === "private" && !affiliateGymId && ownedGym) {
      setAffiliateGymId(ownedGym.id);
    }
  }, [visibility, affiliateGymId, ownedGym, setAffiliateGymId]);

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

      {/* Visibility toggle bar */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Visibility</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setVisibility("public")}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 py-3 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${
              visibility === "public"
                ? "bg-accent text-accent-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-4 w-4" /> Public
          </button>
          <button
            type="button"
            onClick={() => setVisibility("private")}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 py-3 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${
              visibility === "private"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="h-4 w-4" /> Private
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {visibility === "public"
            ? "Anyone can find and view this competition."
            : "Only members of the selected affiliate can view this competition from their dashboard."}
        </p>

        {visibility === "private" && (
          <div className="space-y-2 pt-1">
            <Label className="text-foreground font-medium text-sm">Affiliate</Label>
            <Select
              value={affiliateGymId ?? ""}
              onValueChange={(v) => setAffiliateGymId(v || null)}
              disabled={disabled}
            >
              <SelectTrigger className="h-11 bg-background">
                <SelectValue placeholder="Select an affiliate gym…" />
              </SelectTrigger>
              <SelectContent>
                {allGyms.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}{ownedGym?.id === g.id ? " (your gym)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!affiliateGymId && (
              <p className="text-xs text-destructive">An affiliate is required for private competitions.</p>
            )}
          </div>
        )}
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
              maxDate={startDate}
            />
            <p className="text-xs text-muted-foreground">
              {startDate ? "Must be before competition start date" : "Athletes won't be able to register after this date"}
            </p>
          </div>
        </div>
      </div>

      {/* Capacity */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Capacity</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground font-medium text-sm">Max Teams / Athletes</Label>
            <Input
              type="number"
              min={1}
              value={maxTeams ?? ""}
              onChange={(e) => setMaxTeams(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Unlimited"
              className="h-11 bg-background"
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Waitlist</p>
              <p className="text-xs text-muted-foreground">Auto-promote when spots open</p>
            </div>
            <Switch
              checked={waitlistEnabled}
              onCheckedChange={setWaitlistEnabled}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
