import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSubmitted(true);
        toast({
          title: "Success",
          description: "Check your email for a password reset link.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 sm:px-8 py-4">
          <button
            onClick={() => navigate("/login")}
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
              <img src={logoCompact} alt="Martial Athletic" className="w-20 h-20 mx-auto mb-4 object-contain" />
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">CHECK YOUR EMAIL</h1>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
              <div className="flex flex-col items-center text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-primary" />
                <p className="text-foreground font-medium">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to reset your password. The link will expire in 24 hours.
                </p>
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setEmail("");
                    }}
                    className="text-primary underline hover:no-underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>

              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                className="w-full h-12 text-base font-semibold tracking-wide mt-6"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4">
        <button
          onClick={() => navigate("/login")}
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
            <img src={logoCompact} alt="Martial Athletic" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">FORGOT PASSWORD</h1>
            <p className="text-muted-foreground mt-2 text-sm">Enter your email to receive a reset link</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 bg-background border-border focus:border-primary pl-10"
                    autoComplete="email"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-semibold tracking-wide"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                Back to Login
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
