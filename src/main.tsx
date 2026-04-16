import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

if (import.meta.env.DEV) {
  console.info("[Martial Athletic] Supabase client initialized", {
    url: import.meta.env.VITE_SUPABASE_URL,
    hasAnonKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });

  supabase.auth.getSession().then(({ data }) => {
    console.info("[Martial Athletic] Auth session check:", {
      hasSession: !!data.session,
      userId: data.session?.user?.id ?? "none",
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
