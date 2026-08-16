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
  isIdentityLocked,
} from "@/lib/profileCompletion";
import { IdentityFieldHint, LockedValue } from "@/components/profile/IdentityFieldHint";
import { getSocialIdentity, importSocialAvatar, providerLabel } from "@/lib/socialProfile";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { fetchAllAffiliates, requestAffiliation, fetchUserAffiliationStatuses, type AffiliateGym } from "@/data/affiliates";

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
  const [affiliateGymId, setAffiliateGymId] = useState<string>("");
  const [affiliates, setAffiliates] = useState<AffiliateGym[]>([]);
  const [aboutMe, setAboutMe] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [parentConsent, setParentConsent] = useState(false);

  // Load affiliate gym list once.
  useEffect(() => {
    fetchAllAffiliates().then(setAffiliates).catch(() => {});
  }, []);

  const [affiliationStatuses, setAffiliationStatuses] = useState<Record<string, string>>({});
  const [initialGymId, setInitialGymId] = useState<string>("");

  // Pre-select user's existing affiliate (active or pending) if any.
  useEffect(() => {
    if (!profile?.id) return;
    fetchUserAffiliationStatuses(profile.id).then((map) => {
      setAffiliationStatuses(map);
      const first = Object.keys(map)[0];
      if (first && !affiliateGymId) {
        setAffiliateGymId(first);
        setInitialGymId(first);
      }
    }).catch(() => {});
  }, [profile?.id]);

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

  // Age constraints: min signup 13, max 120
  const MIN_AGE = 13;
  const MAX_AGE = 120;
  let ageError: string | null = null;
  if (computedAge !== null) {
    if (computedAge < MIN_AGE) ageError = `Minimum age to sign up is ${MIN_AGE} years.`;
    else if (computedAge > MAX_AGE) ageError = `Please enter a valid date of birth (max age ${MAX_AGE}).`;
  }
  const requiresParentConsent = computedAge !== null && computedAge >= MIN_AGE && computedAge < 18;
  const consentMissing = requiresParentConsent && !parentConsent;
  const nameInvalid = displayName.trim().length > 0 && displayName.trim().length < 2;

  // Identity fields (DOB, age, gender, legal name) can only be captured once.
  const identityLocked = isIdentityLocked(profile);
  const willLockIdentity = Boolean(dobString && gender);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setAvatarFile(file);
    // Show the raw selection immediately; processed blob is uploaded on save.
    setAvatarPreview(URL.createObjectURL(file));
  };

  /** Entry point for the Save button — confirms identity details once. */
  const handleSave = async () => {
    if (!user) return;
    if (ageError || consentMissing || nameInvalid) {
      setTouched({ fullName: true, dob: true, consent: true });
      setError(ageError ?? (consentMissing ? "Parental consent is required for under-18s." : "Please fix the highlighted fields."));
      return;
    }
    // Ask for confirmation the first time identity details get locked in.
    if (!identityLocked && willLockIdentity) {
      setConfirmOpen(true);
      return;
    }
    await persistProfile();
  };

  const persistProfile = async () => {
    if (!user) return;
    setConfirmOpen(false);
    setError("");
    setLoading(true);

    try {
      // Build a partial update of only the fields the user actually filled.
      const trimmedName = displayName.trim();
      const selectedGym = affiliates.find((g) => g.id === affiliateGymId);
      const trimmedAffiliation = (selectedGym?.name ?? affiliation).trim();
      const trimmedAbout = aboutMe.trim();

      const updates: Record<string, unknown> = {};
      if (trimmedName) {
        updates.display_name = trimmedName;
        // Legal name is locked once set — never overwrite it afterwards.
        if (!identityLocked && !profile?.full_name) updates.full_name = trimmedName;
      }
      if (!identityLocked) {
        if (gender) updates.gender = gender;
        if (dobString) {
          updates.date_of_birth = dobString;
          updates.age = computedAge;
        }
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

      // Request affiliation if user picked a new gym (best-effort).
      if (affiliateGymId && affiliateGymId !== initialGymId) {
        try {
          const res = await requestAffiliation(affiliateGymId);
          if (res?.status === "pending") {
            toast.info("Affiliation request sent. The gym manager will review it.");
          }
        } catch {}
      }

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
    <div className="min-h-dvh bg-background flex flex-col">
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
                      onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                      disabled={loading}
                      className="h-11 bg-background"
                      maxLength={100}
                    />
                    {touched.fullName && nameInvalid && (
                      <p className="text-xs text-destructive">Name must be at least 2 characters.</p>
                    )}
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

                  <div className="space-y-2">
                    <DateOfBirthPicker value={dobString} onChange={setDobString} disabled={loading} error={ageError ?? undefined} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Age</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border border-border bg-muted text-foreground">
                      {computedAge !== null ? computedAge : <span className="text-muted-foreground">Select DOB</span>}
                    </div>
                  </div>

                  {requiresParentConsent && (
                    <div className="sm:col-span-2 flex items-start gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                      <input
                        id="parent-consent"
                        type="checkbox"
                        checked={parentConsent}
                        onChange={(e) => setParentConsent(e.target.checked)}
                        className="mt-1"
                      />
                      <Label htmlFor="parent-consent" className="text-xs text-foreground cursor-pointer">
                        I confirm I have parental/guardian consent to register (required for under-18s).
                      </Label>
                    </div>
                  )}
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-foreground font-medium">Affiliate (Gym / Club)</Label>
                    <Select
                      value={affiliateGymId || "__none__"}
                      onValueChange={(v) => {
                        if (v === "__none__") {
                          setAffiliateGymId("");
                          setAffiliation("");
                        } else {
                          setAffiliateGymId(v);
                          const g = affiliates.find((a) => a.id === v);
                          if (g) setAffiliation(g.name);
                        }
                      }}
                      disabled={loading || affiliates.length === 0}
                    >
                      <SelectTrigger className="h-11 bg-background">
                        <SelectValue placeholder={affiliates.length === 0 ? "No gyms available yet" : "Select an affiliate (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No affiliate</SelectItem>
                        {affiliates.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {affiliateGymId && affiliationStatuses[affiliateGymId] === "pending" && (
                      <p className="text-[11px] text-primary">
                        Pending approval — the gym manager will review your request.
                      </p>
                    )}
                    {affiliateGymId && affiliationStatuses[affiliateGymId] === "active" && (
                      <p className="text-[11px] text-accent">You are an active member of this gym.</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Optional. Select your gym to request affiliation — the gym manager must approve.
                    </p>
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
