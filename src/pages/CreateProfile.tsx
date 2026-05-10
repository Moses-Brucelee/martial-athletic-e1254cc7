import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DateOfBirthPicker } from "@/components/ui/DateOfBirthPicker";
import { Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { sanitizeError } from "@/lib/validation";
import { calculateAge } from "@/utils/calculateAge";
import { ACCEPTED_AVATAR_MIME, processAvatarFile } from "@/lib/avatarUpload";
import {
  PROFILE_FIELD_DEFS,
  REQUIRED_PROFILE_FIELDS,
  isProfileComplete,
  missingProfileFields,
} from "@/lib/profileCompletion";
import { toast } from "sonner";

/**
 * Optional, re-entry safe profile setup screen.
 *
 * - Hydrates from the existing profile so partial users can resume.
 * - Saves whatever the user filled in (no all-or-nothing requirement).
 * - Recomputes `profile_completed` from the merged record on every save.
 * - Avatar uploads are validated, square-cropped, resized to 256×256 and
 *   re-encoded as JPEG (which strips EXIF) via processAvatarFile().
 */
export default function CreateProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [dobString, setDobString] = useState<string | undefined>(undefined);
  const [affiliation, setAffiliation] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Hydrate from existing profile so re-entry is safe.
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? profile.full_name ?? "");
    setGender(profile.gender ?? "");
    setDobString(profile.date_of_birth ?? undefined);
    setAffiliation(profile.affiliation ?? "");
    setAboutMe(profile.about_me ?? "");
    setExistingAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  const dateOfBirth = dobString ? new Date(dobString + "T00:00:00") : undefined;
  const computedAge = dateOfBirth ? calculateAge(dateOfBirth) : null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setAvatarFile(file);
    // Show the raw selection immediately; processed blob is uploaded on save.
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setError("");
    setLoading(true);

    try {
      // Build a partial update of only the fields the user actually filled.
      const trimmedName = displayName.trim();
      const trimmedAffiliation = affiliation.trim();
      const trimmedAbout = aboutMe.trim();

      const updates: Record<string, unknown> = {};
      if (trimmedName) {
        updates.display_name = trimmedName;
        updates.full_name = trimmedName;
      }
      if (gender) updates.gender = gender;
      if (dobString) {
        updates.date_of_birth = dobString;
        updates.age = computedAge;
      }
      if (trimmedAffiliation) updates.affiliation = trimmedAffiliation;
      if (trimmedAbout) updates.about_me = trimmedAbout;

      // Upload avatar (validate + resize + strip EXIF) if a new file picked.
      if (avatarFile) {
        const processed = await processAvatarFile(avatarFile);
        const path = `${user.id}/avatar.${processed.extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, processed.blob, {
            upsert: true,
            contentType: processed.contentType,
            cacheControl: "3600",
          });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        // Cache-bust so the new image shows immediately.
        updates.avatar_url = `${urlData.publicUrl}?v=${Date.now()}`;
      }

      // Recompute profile_completed against the merged shape.
      const merged = { ...(profile ?? {}), ...updates };
      updates.profile_completed = isProfileComplete(merged as never);

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      toast.success(updates.profile_completed ? "Profile complete 🎉" : "Saved");
      setAvatarFile(null);
      await refetch();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(sanitizeError(err) || (err as Error).message || "Could not save your profile.");
    } finally {
      setLoading(false);
    }
  };

  const previewProfile = {
    ...(profile ?? {}),
    display_name: displayName || profile?.display_name,
    gender: gender || profile?.gender,
    date_of_birth: dobString ?? profile?.date_of_birth,
    affiliation: affiliation || profile?.affiliation,
    about_me: aboutMe || profile?.about_me,
    avatar_url: existingAvatarUrl ?? profile?.avatar_url,
  };
  const stillMissing = missingProfileFields(previewProfile as never, REQUIRED_PROFILE_FIELDS);
  const isComplete = stillMissing.length === 0;

  const initials = (displayName || profile?.display_name || "MA")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={logoCompact} alt="Martial Athletic" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-bold text-foreground tracking-tight uppercase">Your Profile</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl space-y-4">
          {/* Completion summary */}
          <div
            className={`flex items-start gap-3 rounded-xl border p-3 ${
              isComplete
                ? "border-accent/30 bg-accent/5"
                : "border-primary/30 bg-primary/5"
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            )}
            <div className="text-xs">
              {isComplete ? (
                <p className="text-foreground font-medium">Your profile is complete.</p>
              ) : (
                <p className="text-foreground">
                  <span className="font-medium">Still missing:</span>{" "}
                  {stillMissing
                    .map((k) => PROFILE_FIELD_DEFS.find((d) => d.key === k)?.label ?? k)
                    .join(", ")}
                </p>
              )}
              <p className="text-muted-foreground mt-1">
                Save anytime — partial updates are fine.
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
            {error && (
              <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {profileLoading && !profile ? (
              <p className="text-sm text-muted-foreground">Loading your profile…</p>
            ) : (
              <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar upload */}
                <div className="flex flex-col items-center gap-3">
                  <label htmlFor="create-avatar-upload" className="relative group cursor-pointer touch-manipulation">
                    <Avatar className="h-28 w-28 border-2 border-border">
                      <AvatarImage src={avatarPreview ?? existingAvatarUrl ?? undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {initials !== "MA" ? initials : <Camera className="h-8 w-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-foreground/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                      <Camera className="h-6 w-6 text-background" />
                    </div>
                    <span className="sr-only">Upload profile photo</span>
                  </label>
                  <label htmlFor="create-avatar-upload" className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    {existingAvatarUrl || avatarPreview ? "Change Photo" : "Upload Photo"}
                  </label>
                  <p className="text-[10px] text-muted-foreground/80 text-center max-w-[10rem]">
                    JPG or PNG, 2 MB max. Cropped to square.
                  </p>
                  <input
                    id="create-avatar-upload"
                    type="file"
                    accept={ACCEPTED_AVATAR_MIME.join(",")}
                    onChange={handleAvatarChange}
                    className="sr-only"
                  />
                </div>

                {/* Form fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Display Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                      className="h-11 bg-background"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Gender</Label>
                    <Select value={gender} onValueChange={setGender} disabled={loading}>
                      <SelectTrigger className="h-11 bg-background">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <DateOfBirthPicker value={dobString} onChange={setDobString} disabled={loading} />

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Age</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border border-border bg-muted text-foreground">
                      {computedAge !== null ? computedAge : <span className="text-muted-foreground">Select DOB</span>}
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-foreground font-medium">Gym / Club</Label>
                    <Input
                      placeholder="Gym or club name"
                      value={affiliation}
                      onChange={(e) => setAffiliation(e.target.value)}
                      disabled={loading}
                      className="h-11 bg-background"
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">About Me</Label>
                <span className="text-xs text-muted-foreground">{aboutMe.length}/500</span>
              </div>
              <Textarea
                placeholder="Tell us about yourself, your training background, goals…"
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value.slice(0, 500))}
                disabled={loading}
                className="min-h-[100px] bg-background"
                maxLength={500}
              />
            </div>

            <div className="flex justify-end gap-3 mt-8 sticky bottom-0 bg-card py-4 -mx-6 px-6 sm:-mx-8 sm:px-8 border-t border-border/50 md:static md:border-0 md:py-0 md:mx-0 md:px-0 md:bg-transparent z-10">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
                className="min-h-[44px]"
              >
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 min-h-[44px]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
