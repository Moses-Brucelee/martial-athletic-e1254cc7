import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// Log Supabase client initialization for production verification
console.info("[Martial Athletic] Supabase client initialized", {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  authProvider: "supabase-js (real)",
  mock: false,
});

supabase.auth.getSession().then(({ data }) => {
  console.info("[Martial Athletic] Auth session check:", {
    hasSession: !!data.session,
    userId: data.session?.user?.id ?? "none",
  });
});

createRoot(document.getElementById("root")!).render(<App />);
