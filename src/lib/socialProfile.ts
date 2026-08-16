/**
 * Helpers for enriching a profile from a social (OAuth) identity.
 *
 * Google returns only: full name, given/family name, avatar picture and email.
 * Date of birth and gender are never provided, so the app still asks for those
 * once during profile setup.
 */

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface SocialIdentityInfo {
  provider: string | null;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/** Reads normalized profile hints from the signed-in user's OAuth metadata. */
export function getSocialIdentity(user: User | null | undefined): SocialIdentityInfo {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const identities = user?.identities ?? [];
  const social = identities.find((i) => i.provider !== "email");

  const fullName = str(meta.full_name) ?? str(meta.name);
  return {
    provider: social?.provider ?? null,
    fullName,
    displayName: str(meta.display_name) ?? str(meta.preferred_username) ?? fullName,
    avatarUrl: str(meta.avatar_url) ?? str(meta.picture),
    email: str(meta.email) ?? user?.email ?? null,
  };
}

export function providerLabel(provider: string | null): string | null {
  if (!provider) return null;
  if (provider === "google") return "Google";
  if (provider === "apple") return "Apple";
  if (provider === "azure" || provider === "microsoft") return "Microsoft";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Copies a remote provider avatar into our own `avatars` bucket so it keeps
 * working after the provider URL expires. Returns the public URL, or null if
 * anything fails (best-effort — never blocks profile setup).
 */
export async function importSocialAvatar(userId: string, remoteUrl: string): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/") || blob.size > 5 * 1024 * 1024) return null;

    const extension = blob.type === "image/png" ? "png" : "jpg";
    const path = `${userId}/avatar.${extension}`;
    const { error } = await supabase.storage.from("avatars").upload(path, blob, {
      upsert: true,
      contentType: blob.type,
      cacheControl: "3600",
    });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  } catch {
    return null;
  }
}
