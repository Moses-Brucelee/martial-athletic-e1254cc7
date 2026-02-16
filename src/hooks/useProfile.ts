import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  affiliation: string | null;
  about_me: string | null;
  profile_completed: boolean;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      setProfile(null);
    } else {
      setProfile(data as unknown as Profile);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return { profile, loading, error, refetch: fetchProfile };
}
