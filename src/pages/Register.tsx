import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { SEO } from "@/components/SEO";
import { z } from "zod";
import { toast } from "sonner";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be under 72 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

const registerSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address"),
    display_name: z
      .string()
      .trim()
      .min(2, "Display name must be at least 2 characters")
      .max(50, "Display name must be under 50 characters"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FieldKey = "email" | "display_name" | "password" | "confirmPassword";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Map a Supabase auth signUp error message to the relevant form field so we
 * can display it inline next to the offending input.
 */
function mapAuthErrorToField(message: string): { field: FieldKey | "form"; message: string } {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return { field: "email", message: "An account with this email already exists. Try signing in." };
  }
  if (m.includes("invalid email")) {
    return { field: "email", message };
  }
  if (m.includes("password")) {
    return { field: "password", message };
  }
  return { field: "form", message };
}

export default function Register() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const safeRedirect = (raw: string | null): string => {
    if (!raw) return "/dashboard";
    try {
      const decoded = decodeURIComponent(raw).trim();
      if (decoded.startsWith("/") && !decoded.startsWith("//") && !/^javascript:/i.test(decoded)) {
        return decoded;
      }
    } catch {
      /* fall through */
    }
    return "/dashboard";
  };
  const redirectTarget = safeRedirect(searchParams.get("redirectTo"));

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<FieldKey | "form", string>>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

  const validation = registerSchema.safeParse({
    email,
    display_name: displayName,
    password,
    confirmPassword,
  });
  const fieldErrors: Partial<Record<FieldKey, string>> = {};
  if (!validation.success) {
    validation.error.issues.forEach((issue) => {
      const key = String(issue.path[0]) as FieldKey;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
  }
  const isFormValid = validation.success;

  // If the user is signed in (incl. immediately after successful signUp), go to dashboard.
  useEffect(() => {
    if (user) navigate(redirectTarget, { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErrors({});

    const result = registerSchema.safeParse({
      email,
      display_name: displayName,
      password,
      confirmPassword,
    });
    if (!result.success) return;

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirectTarget}`,
        data: { display_name: result.data.display_name },
      },
    });
    setLoading(false);

    if (authError) {
      const mapped = mapAuthErrorToField(authError.message);
      setServerErrors({ [mapped.field]: mapped.message });
      return;
    }

    // Supabase returns a user with empty identities array when the email already
    // exists (to prevent email enumeration). Detect this and show a clear error.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setServerErrors({ email: "This email is already registered. Please sign in or reset your password." });
      return;
    }

    // Profile row is created automatically by the `handle_new_user` trigger
    // (tier_slug defaults to 'free', profile_completed to false).
    toast.success("Welcome!", {
      description: `We sent a verification email to ${result.data.email} — verify when you have a moment.`,
      duration: 8000,
    });

    // Auto sign-in via the session returned from signUp; AuthProvider will
    // pick it up and the redirect effect above will navigate to /dashboard.
    navigate(redirectTarget, { replace: true });
  };

  const showError = (key: FieldKey) =>
    serverErrors[key] ?? (touched[key] ? fieldErrors[key] : undefined);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SEO
        title="Create your Martial Athletic account"
        description="Sign up to register for fitness competitions, manage your gym, and track your performances on Martial Athletic."
        path="/register"
      />
      <header className="flex items-center justify-between px-4 sm:px-8 py-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src={logoCompact}
              alt="Martial Athletic"
              className="w-20 h-20 mx-auto mb-4 object-contain"
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              CREATE ACCOUNT
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Join the Martial Athletic community
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
            {serverErrors.form && (
              <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{serverErrors.form}</p>
              </div>
            )}

            {/* Social sign-up */}
            <GoogleSignInButton label="Sign up with Google" redirectTo={redirectTarget} />
            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">or continue with email</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (serverErrors.email) setServerErrors((p) => ({ ...p, email: undefined }));
                  }}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  disabled={loading}
                  className="h-12 bg-background border-border"
                  autoComplete="email"
                />
                {showError("email") ? (
                  <p className="text-xs text-destructive">{showError("email")}</p>
                ) : (
                  !email && <p className="text-xs text-muted-foreground">Required</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-foreground font-medium">
                  Display Name
                </Label>
                <Input
                  id="display_name"
                  type="text"
                  placeholder="How others will see you"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, display_name: true }))}
                  disabled={loading}
                  className="h-12 bg-background border-border"
                  autoComplete="nickname"
                  maxLength={50}
                />
                {showError("display_name") ? (
                  <p className="text-xs text-destructive">{showError("display_name")}</p>
                ) : (
                  !displayName && <p className="text-xs text-muted-foreground">Required (2–50 characters)</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (serverErrors.password) setServerErrors((p) => ({ ...p, password: undefined }));
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    disabled={loading}
                    className="h-12 bg-background border-border pr-11"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {(touched.password || password.length > 0) && (
                  <ul className="space-y-1 mt-2" aria-live="polite">
                    {passwordRules.map((rule) => {
                      const ok = rule.test(password);
                      return (
                        <li
                          key={rule.label}
                          className={`text-xs flex items-center gap-2 ${ok ? "text-accent" : "text-muted-foreground"}`}
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? "bg-accent" : "bg-muted-foreground/40"}`}
                          />
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {serverErrors.password && (
                  <p className="text-xs text-destructive">{serverErrors.password}</p>
                )}
                {!touched.password && !password && (
                  <p className="text-xs text-muted-foreground">
                    Required — must meet all criteria below
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                  disabled={loading}
                  className="h-12 bg-background border-border"
                  autoComplete="new-password"
                />
                {showError("confirmPassword") ? (
                  <p className="text-xs text-destructive">{showError("confirmPassword")}</p>
                ) : (
                  !confirmPassword && <p className="text-xs text-muted-foreground">Required</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full h-12 text-base font-semibold tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

          </div>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
