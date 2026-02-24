import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Camera, AlertCircle, CheckCircle, CalendarIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { profileSchema, validateImageFile, sanitizeError, calculateAge } from "@/lib/validation";

export default function ViewProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError, refetch } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [affiliation, setAffiliation] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const computedAge = dateOfBirth ? calculateAge(dateOfBirth) : null;

  // Real-time validation
  const validation = profileSchema.safeParse({ fullName, gender, affiliation, aboutMe });
  const fieldErrors: Record<string, string> = {};
  if (!validation.success) {
    validation.error.issues.forEach((issue) => {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
  }
  const isFormValid = validation.success;

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setGender(profile.gender || "");
      setDateOfBirth(profile.date_of_birth ? parseISO(profile.date_of_birth) : undefined);
      setAffiliation(profile.affiliation || "");
      setAboutMe(profile.about_me || "");
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imgError = validateImageFile(file);
    if (imgError) {
      setError(imgError);
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSave = async () => {
    if (!user || !isFormValid) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      let avatarUrl: string | null = profile?.avatar_url || null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          display_name: fullName.trim() || profile?.display_name,
          gender: gender || null,
          age: computedAge,
          date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
          affiliation: affiliation.trim() || null,
          about_me: aboutMe.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setAvatarFile(null);
      await refetch();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(sanitizeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-destructive">Failed to load profile. Please try again.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const initials = (fullName || profile?.display_name || "MA")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader
        title="Profile"
        subscriptionTier={profile?.subscription_tier}
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
            {error && (
              <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-accent/10 border border-accent/20">
                <CheckCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-sm text-accent">Profile updated successfully!</p>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="relative group">
                  <Avatar className="h-28 w-28 border-2 border-border">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-lg font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-foreground/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="h-6 w-6 text-background" />
                  </div>
                </button>
                <p className="text-xs text-muted-foreground">Change Photo</p>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Name and Surname</Label>
                  <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} onBlur={() => setTouched((p) => ({ ...p, fullName: true }))} disabled={saving} className="h-11 bg-background" maxLength={100} />
                  {touched.fullName && fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
                  {!touched.fullName && !fullName && <p className="text-xs text-muted-foreground">Required</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Gender</Label>
                  <Select value={gender} onValueChange={(v) => { setGender(v); setTouched((p) => ({ ...p, gender: true })); }} disabled={saving}>
                    <SelectTrigger className="h-11 bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  {touched.gender && fieldErrors.gender && <p className="text-xs text-destructive">{fieldErrors.gender}</p>}
                  {!touched.gender && !gender && <p className="text-xs text-muted-foreground">Required</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("h-11 w-full justify-start text-left font-normal bg-background", !dateOfBirth && "text-muted-foreground")}
                        disabled={saving}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateOfBirth}
                        onSelect={setDateOfBirth}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Age</Label>
                  <div className="h-11 flex items-center px-3 rounded-md border border-border bg-muted text-foreground">
                    {computedAge !== null ? computedAge : <span className="text-muted-foreground">Select DOB</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Affiliation</Label>
                  <Input placeholder="Gym / Club name" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} disabled={saving} className="h-11 bg-background" maxLength={100} />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">About Me</Label>
                <span className="text-xs text-muted-foreground">{aboutMe.length}/500</span>
              </div>
              <Textarea placeholder="Tell us about yourself..." value={aboutMe} onChange={(e) => setAboutMe(e.target.value.slice(0, 500))} disabled={saving} className="min-h-[100px] bg-background" maxLength={500} />
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Menu</Button>
              <Button onClick={handleSave} disabled={saving || !isFormValid} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8">
                {saving ? <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
