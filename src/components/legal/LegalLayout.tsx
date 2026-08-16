import { ReactNode } from "react";
import { Link } from "react-router-dom";
import logoWide from "@/assets/martial-athletic-logo-wide.png";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  action?: ReactNode;
  children: ReactNode;
}

export function LegalLayout({ title, lastUpdated, action, children }: LegalLayoutProps) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center">
            <img src={logoWide} alt="Martial Athletic" className="h-8 object-contain" />
          </Link>
          {action}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground uppercase">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-8">{children}</div>

        <div className="mt-12 pt-6 border-t border-border flex gap-5 text-xs uppercase tracking-wider text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link to="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
