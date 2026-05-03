import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { z } from "zod";
import { toast } from "sonner";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be under 72 characters")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetState = "validating" | "ready" | "expired";

function isExpiredOrInvalidError(err: { message?: string; status?: number; code?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  if (msg.includes("token_expired") || msg.includes("invalid_token") || msg.includes("expired") || msg.includes("invalid")) {
    return true;
  }
  if (err.status === 401 || err.status === 410) return true;
  return false;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [state, setState] = useState<ResetState>("validating");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validation = resetSchema.safeParse({ password, confirmPassword });
  const fieldErrors: Record<string, string> = {};
  if (!validation.success) {
    validation.error.issues.forEach((issue) => {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
  }
  const isFormValid = validation.success;

  useEffect(() => {
    let recoveryDetected = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryDetected = true;
        setState("ready");
      }
    });

    // Wait briefly for the recovery event. If it never fires, the user
    // landed here without a valid email link — bounce to /forgot-password.
    const timer = setTimeout(() => {
      if (!recoveryDetected) {
        toast.error("Reset links must be opened from your email.");
        navigate("/forgot-password", { replace: true });
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = resetSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: result.data.password,
    });

    if (updateError) {
      if (isExpiredOrInvalidError(updateError as any)) {
        setState("expired");
      } else {
        setError(updateError.message);
      }
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    toast.success("Password updated. Please sign in with your new password.");
    navigate("/login", { replace: true });
  };

  if (state === "validating") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Validating reset link…</p>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 sm:px-8 py-4">
          <button onClick={() => navigate("/login")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Login</span>
          </button>
          <ThemeToggle />
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <img src={logoCompact} alt="Martial Athletic" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg space-y-4">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Link Expired</h1>
              <p className="text-sm text-muted-foreground">This reset link has expired or has already been used. Request a new one.</p>
              <Button onClick={() => navigate("/forgot-password")} className="w-full">Request New Link</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4">
        <button onClick={() => navigate("/login")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Login</span>
        </button>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoCompact} alt="Martial Athletic" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">RESET PASSWORD</h1>
            <p className="text-muted-foreground mt-2 text-sm">Enter your new password below</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
            {error && (
              <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    disabled={loading}
                    className="h-12 bg-background border-border focus:border-primary pr-11"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.password && fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
                {!touched.password && !password && <p className="text-xs text-muted-foreground">Required — must include upper, lower, number & special character</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                    disabled={loading}
                    className="h-12 bg-background border-border focus:border-primary pr-11"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.confirmPassword && fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
                {!touched.confirmPassword && !confirmPassword && <p className="text-xs text-muted-foreground">Required</p>}
              </div>

              <Button type="submit" disabled={loading || !isFormValid} className="w-full h-12 text-base font-semibold tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
