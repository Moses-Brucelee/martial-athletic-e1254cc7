import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "dark",
});

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getTimeBasedTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("ma-theme") as Theme) || "system";
  });

  const resolveTheme = useCallback((): "light" | "dark" => {
    if (theme === "system") return getSystemTheme();
    return theme;
  }, [theme]);

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(resolveTheme);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("ma-theme", newTheme);
  };

  useEffect(() => {
    const resolved = resolveTheme();
    setResolvedTheme(resolved);

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  }, [theme, resolveTheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Time-based auto-switch when not system mode
  useEffect(() => {
    if (theme === "system") return;
    // Check every minute for time-based switching
    const interval = setInterval(() => {
      const timeBased = getTimeBasedTheme();
      if (timeBased !== resolvedTheme) {
        setResolvedTheme(timeBased);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(timeBased);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [theme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
