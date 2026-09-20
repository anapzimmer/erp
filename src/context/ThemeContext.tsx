"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { resolveCompanyLogos } from "@/design/companyLogos";

export interface ThemeColors {
  screenBackgroundColor: string;
  menuBackgroundColor: string;
  menuTextColor: string;
  menuIconColor: string;
  menuHoverColor: string;
  contentTextLightBg: string;
  contentTextDarkBg: string;
  buttonDarkBg: string;
  buttonDarkText: string;
  buttonLightBg: string;
  buttonLightText: string;
  modalBackgroundColor: string;
  modalTextColor: string;
  modalButtonBackgroundColor: string;
  modalButtonTextColor: string;
  modalIconSuccessColor: string; // Adicionado
  modalIconErrorColor: string;   // Adicionado
  modalIconWarningColor: string; // Adicionado
  logoUrl?: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
}


export type ThemeMode = "light" | "dark" | "system";
const MODE_KEY = "glasscode:appearance";
const officialColors = {
  screenBackgroundColor: "var(--background)", menuBackgroundColor: "var(--navigation)",
  menuTextColor: "var(--on-navigation)", menuIconColor: "var(--primary)", menuHoverColor: "var(--navigation-hover)",
  contentTextLightBg: "var(--text-primary)", contentTextDarkBg: "var(--surface)",
  buttonDarkBg: "var(--primary)", buttonDarkText: "var(--on-primary)",
  buttonLightBg: "var(--surface)", buttonLightText: "var(--text-primary)",
  modalBackgroundColor: "var(--surface)", modalTextColor: "var(--text-primary)",
  modalButtonBackgroundColor: "var(--primary)", modalButtonTextColor: "var(--on-primary)",
  modalIconSuccessColor: "var(--success)", modalIconErrorColor: "var(--danger)", modalIconWarningColor: "var(--warning)",
};
interface ThemeContextType {
  theme: ThemeColors;
  refreshTheme: () => Promise<void>;
  isLoading: boolean;
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [logos, setLogos] = useState(() => resolveCompanyLogos());
  const [isLoading, setIsLoading] = useState(true);
  const [mode, updateMode] = useState<ThemeMode>("system");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");
  const generation = useRef(0);
  useEffect(() => {
    try { const saved = localStorage.getItem(MODE_KEY); if (saved === "light" || saved === "dark" || saved === "system") updateMode(saved); } catch {}
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = mode === "system" ? (media.matches ? "dark" : "light") : mode;
      document.documentElement.dataset.theme = resolved;
      setResolvedMode(resolved);
    };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);
  const setMode = (next: ThemeMode) => { updateMode(next); try { localStorage.setItem(MODE_KEY, next); } catch {} };
  const refreshTheme = useCallback(async () => {
    const current = ++generation.current;
    let next = resolveCompanyLogos();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from("perfis_usuarios").select("empresa_id").eq("id", session.user.id).maybeSingle();
        if (profile?.empresa_id) {
          const { data, error } = await supabase.from("configuracoes_branding").select("logo_light, logo_dark").eq("empresa_id", profile.empresa_id).limit(1).maybeSingle();
          if (error) throw error;
          next = resolveCompanyLogos(data?.logo_light, data?.logo_dark);
        }
      }
    } catch (error) { console.error("Erro ao carregar logos:", error); }
    finally { if (current === generation.current) { setLogos(next); setIsLoading(false); } }
  }, []);
  useEffect(() => {
    void refreshTheme();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") { ++generation.current; setLogos(resolveCompanyLogos()); }
      if (event === "SIGNED_OUT") setIsLoading(false);
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") setTimeout(() => void refreshTheme(), 0);
    });
    const invalidatePending = () => { ++generation.current; };
    return () => { invalidatePending(); subscription.unsubscribe(); };
  }, [refreshTheme]);
  const theme = useMemo(() => ({ ...officialColors, ...logos, logoUrl: resolvedMode === "dark" ? logos.logoDarkUrl : logos.logoLightUrl }), [logos, resolvedMode]);
  return <ThemeContext.Provider value={{ theme, refreshTheme, isLoading, mode, resolvedMode, setMode }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  return context;
}
