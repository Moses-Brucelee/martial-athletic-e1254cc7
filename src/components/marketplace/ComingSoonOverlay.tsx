import type { ReactNode } from "react";

/**
 * Marketplace sections that are not open yet. Flip a key to `true` to launch it —
 * the section underneath is untouched and becomes interactive again.
 */
export const MARKETPLACE_LAUNCHED = {
  programs: false,
  apparel: false,
  equipment: false,
} as const;

export type MarketplaceKey = keyof typeof MARKETPLACE_LAUNCHED;

export function ComingSoonOverlay({
  launched,
  children,
  note = "Not open yet. We'll switch this on soon.",
}: {
  launched: boolean;
  children: ReactNode;
  note?: string;
}) {
  if (launched) return <>{children}</>;
  return (
    <div className="relative">
      <div aria-hidden="true" {...({ inert: "" } as Record<string, string>)} className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="border-l-4 border-primary bg-card/95 px-5 py-3 shadow-lg max-w-sm">
          <p className="font-heading text-lg font-bold uppercase tracking-wider text-primary">Coming soon</p>
          <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
        </div>
      </div>
    </div>
  );
}
