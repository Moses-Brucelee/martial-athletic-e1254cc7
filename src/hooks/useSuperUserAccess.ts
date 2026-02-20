import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { checkIsSuperUser } from "@/data/superAdmin";

export function useSuperUserAccess() {
  const { user } = useAuth();
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsSuperUser(false);
      setLoading(false);
      return;
    }

    checkIsSuperUser(user.id)
      .then(setIsSuperUser)
      .catch(() => setIsSuperUser(false))
      .finally(() => setLoading(false));
  }, [user]);

  return { isSuperUser, loading };
}
