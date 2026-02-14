import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Eye, EyeOff, ArrowLeft, AlertCircle, Lock } from "lucide-react";
import logo from "@/assets/martial-athletic-logo.png";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // Load brute force state from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("ma-login-attempts");
    if (stored) {
      const data = JSON.parse(stored);
      setAttempts(data.attempts || 0);
      if (data.lockedUntil && data.lockedUntil > Date.now()) {
        setLockedUntil(data.lockedUntil);
      }
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.max(0, lockedUntil - Date.now());
      setLockCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        sessionStorage.removeItem("ma-login-attempts");
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && lockedUntil > Date.now();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLocked) {
      setError(`Too many failed attempts. Try again in ${lockCountdown}s.`);
      return;
    }

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (authError) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_DURATION;
        setLockedUntil(lockTime);
        sessionStorage.setItem("ma-login-attempts", JSON.stringify({ attempts: newAttempts, lockedUntil: lockTime }));
        setError(`Account locked for 5 minutes due to too many failed attempts.`);
      } else {
        sessionStorage.setItem("ma-login-attempts", JSON.stringify({ attempts: newAttempts, lockedUntil: null }));
        setError(
          authError.message === "Invalid login credentials"
            ? `Invalid email or password. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`
            : authError.message
        );
      }
      setLoading(false);
      return;
    }

    // Success - clear attempts
    sessionStorage.removeItem("ma-login-attempts");
    setLoading(false);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <ThemeToggle />
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <img src={logo} alt="Martial Athletic" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">LOGIN</h1>
            <p className="text-muted-foreground mt-2 text-sm">Sign in to your account</p>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
                {isLocked ? <Lock className="h-4 w-4 text-destructive mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLocked || loading}
                  className="h-12 bg-background border-border focus:border-primary"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLocked || loading}
                    className="h-12 bg-background border-border focus:border-primary pr-11"
                    autoComplete="current-password"
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
              </div>

              <Button
                type="submit"
                disabled={isLocked || loading}
                className="w-full h-12 text-base font-semibold tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : isLocked ? (
                  `Locked (${lockCountdown}s)`
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Register link */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
