import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Camera, AlertCircle, CalendarIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { profileSchema, validateImageFile, sanitizeError } from "@/lib/validation";

export default function CreateProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [affiliation, setAffiliation] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Real-time validation
  const validation = profileSchema.safeParse({ fullName, gender, age: age || undefined, affiliation, aboutMe });
  const fieldErrors: Record<string, string> = {};
  if (!validation.success) {
    validation.error.issues.forEach((issue) => {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
  }
  const isFormValid = validation.success;

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

  const handleSubmit = async (skip: boolean) => {
    if (!user) return;
    setError("");

    if (!skip && !isFormValid) return;

    setLoading(true);

    try {
      let avatarUrl: string | null = null;

      if (!skip && avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const updates: Record<string, unknown> = {
        profile_completed: true,
      };

      if (!skip) {
        if (fullName) updates.full_name = fullName.trim();
        if (fullName) updates.display_name = fullName.trim();
        if (gender) updates.gender = gender;
        if (age) updates.age = parseInt(age);
        if (dateOfBirth) updates.date_of_birth = format(dateOfBirth, "yyyy-MM-dd");
        if (affiliation) updates.affiliation = affiliation.trim();
        if (aboutMe) updates.about_me = aboutMe.trim();
        if (avatarUrl) updates.avatar_url = avatarUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={logoCompact} alt="Martial Athletic" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-bold text-foreground tracking-tight uppercase">Create Your Profile</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
            {error && (
              <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group"
                >
                  <Avatar className="h-28 w-28 border-2 border-border">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <Camera className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-foreground/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="h-6 w-6 text-background" />
                  </div>
                </button>
                <p className="text-xs text-muted-foreground">Upload Photo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Form fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Name and Surname</Label>
                  <Input
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                    disabled={loading}
                    className="h-11 bg-background"
                    maxLength={100}
                  />
                  {touched.fullName && fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
                  {!touched.fullName && !fullName && <p className="text-xs text-muted-foreground">Required</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Gender</Label>
                  <Select value={gender} onValueChange={(v) => { setGender(v); setTouched((p) => ({ ...p, gender: true })); }} disabled={loading}>
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
                        disabled={loading}
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
                  <Input
                    type="number"
                    placeholder="25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, age: true }))}
                    disabled={loading}
                    className="h-11 bg-background"
                    min={5}
                    max={120}
                  />
                  {touched.age && fieldErrors.age && <p className="text-xs text-destructive">{fieldErrors.age}</p>}
                  {!touched.age && !age && <p className="text-xs text-muted-foreground">Required</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Affiliation</Label>
                  <Input
                    placeholder="Gym / Club name"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    disabled={loading}
                    className="h-11 bg-background"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>

            {/* About Me */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">About Me</Label>
                <span className="text-xs text-muted-foreground">{aboutMe.length}/500</span>
              </div>
              <Textarea
                placeholder="Tell us about yourself, your training background, goals..."
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value.slice(0, 500))}
                disabled={loading}
                className="min-h-[100px] bg-background"
                maxLength={500}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                Skip
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={loading || !isFormValid}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
