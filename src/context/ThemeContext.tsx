// src/context/ThemeContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from "react";

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
  modalIconSuccessColor: string;
  modalIconErrorColor: string;
  modalIconWarningColor: string;

  logoUrl?: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
}

export type ThemeMode = "light" | "dark" | "system";

const MODE_KEY = "glasscode:appearance";

const officialColors = {
  screenBackgroundColor: "var(--background)",
  menuBackgroundColor: "var(--navigation)",
  menuTextColor: "var(--on-navigation)",
  menuIconColor: "var(--primary)",
  menuHoverColor: "var(--navigation-hover)",
  contentTextLightBg: "var(--text-primary)",
  contentTextDarkBg: "var(--surface)",

  buttonDarkBg: "var(--primary)",
  buttonDarkText: "var(--on-primary)",
  buttonLightBg: "var(--surface)",
  buttonLightText: "var(--text-primary)",

  modalBackgroundColor: "var(--surface)",
  modalTextColor: "var(--text-primary)",
  modalButtonBackgroundColor: "var(--primary)",
  modalButtonTextColor: "var(--on-primary)",

  modalIconSuccessColor: "var(--success)",
  modalIconErrorColor: "var(--danger)",
  modalIconWarningColor: "var(--warning)",
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
type CompanyLogos = {
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
};

const emptyLogos: CompanyLogos = {
  logoLightUrl: null,
  logoDarkUrl: null,
};

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  /*
   * IMPORTANTE:
   *
   * Não iniciamos mais com resolveCompanyLogos().
   *
   * Isso impedia o sistema de saber se aquela logo era realmente
   * da empresa ou apenas o fallback Glass Code.
   *
   * Enquanto descobrimos a empresa, nenhuma logo é exibida.
   */
  const [logos, setLogos] = useState<CompanyLogos>(emptyLogos);
  
  const [isLoading, setIsLoading] = useState(true);

  const [mode, updateMode] = useState<ThemeMode>("system");

  const [resolvedMode, setResolvedMode] =
    useState<"light" | "dark">("light");

  const generation = useRef(0);

  /*
   * ---------------------------------------------------------
   * CARREGA PREFERÊNCIA LIGHT / DARK / SYSTEM
   * ---------------------------------------------------------
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);

      if (
        saved === "light" ||
        saved === "dark" ||
        saved === "system"
      ) {
        updateMode(saved);
      }
    } catch {
      // localStorage indisponível
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * RESOLVE LIGHT / DARK
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const apply = () => {
      const resolved =
        mode === "system"
          ? media.matches
            ? "dark"
            : "light"
          : mode;

      document.documentElement.dataset.theme = resolved;

      setResolvedMode(resolved);
    };

    apply();

    media.addEventListener("change", apply);

    return () => {
      media.removeEventListener("change", apply);
    };
  }, [mode]);

  /*
   * ---------------------------------------------------------
   * ALTERAÇÃO MANUAL DO TEMA
   * ---------------------------------------------------------
   */
  const setMode = (next: ThemeMode) => {
    updateMode(next);

    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // ignora
    }
  };

  /*
   * ---------------------------------------------------------
   * CARREGAMENTO DO BRANDING
   * ---------------------------------------------------------
   */
  const refreshTheme = useCallback(async () => {
    const current = ++generation.current;

    try {
      /*
       * Primeiro descobrimos se existe sessão.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      /*
       * -----------------------------------------------------
       * SEM LOGIN
       * -----------------------------------------------------
       *
       * Aqui SIM podemos usar a identidade Glass Code.
       *
       * Ex.:
       * /glasscode
       * /login
       * página comercial
       */
      if (!session) {
        const defaultLogos = resolveCompanyLogos();

        if (current === generation.current) {
          setLogos(defaultLogos);
        }

        return;
      }

      /*
       * -----------------------------------------------------
       * USUÁRIO LOGADO
       * -----------------------------------------------------
       *
       * Não colocamos Glass Code como fallback temporário.
       */
      const { data: profile, error: profileError } =
        await supabase
          .from("perfis_usuarios")
          .select("empresa_id")
          .eq("id", session.user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      /*
       * Se o usuário ainda não possui empresa vinculada,
       * não mostramos uma logo incorreta.
       */
      if (!profile?.empresa_id) {
        if (current === generation.current) {
          setLogos(emptyLogos);
        }

        return;
      }

      /*
       * Busca o branding da empresa.
       */
      const { data, error } = await supabase
        .from("configuracoes_branding")
        .select("logo_light, logo_dark")
        .eq("empresa_id", profile.empresa_id)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      /*
       * Resolve as logos cadastradas.
       */
      const companyLogos = resolveCompanyLogos(
        data?.logo_light,
        data?.logo_dark
      );

      if (current === generation.current) {
        setLogos(companyLogos);
      }
    } catch (error) {
      console.error(
        "Erro ao carregar logos da empresa:",
        error
      );

      /*
       * Em uma área autenticada é melhor ficar sem logo
       * momentaneamente do que mostrar a empresa errada.
       */
      if (current === generation.current) {
        setLogos(emptyLogos);
      }
    } finally {
      if (current === generation.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * PRIMEIRO CARREGAMENTO
   * ---------------------------------------------------------
   */
  useEffect(() => {
    void refreshTheme();

    /*
     * Mudanças na autenticação.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      /*
       * Cancela qualquer carregamento anterior.
       */
      ++generation.current;

      if (event === "SIGNED_OUT") {
        /*
         * Fora do ERP volta para Glass Code.
         */
        setLogos(resolveCompanyLogos());
        setIsLoading(false);
        return;
      }

      if (
  event === "SIGNED_IN" ||
  event === "USER_UPDATED"
) {
  /*
   * Mantém a logo atual enquanto confirma o branding.
   * Não apaga nem pisca a identidade da empresa.
   */
  setTimeout(() => {
    void refreshTheme();
  }, 0);
}
    });

    return () => {
      ++generation.current;
      subscription.unsubscribe();
    };
  }, [refreshTheme]);

  /*
   * ---------------------------------------------------------
   * MONTA O TEMA FINAL
   * ---------------------------------------------------------
   */
  const theme = useMemo<ThemeColors>(() => {
    const logoUrl =
      resolvedMode === "dark"
        ? logos.logoDarkUrl
        : logos.logoLightUrl;

    return {
      ...officialColors,
      ...logos,
      logoUrl,
    };
  }, [logos, resolvedMode]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        refreshTheme,
        isLoading,
        mode,
        resolvedMode,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme deve ser usado dentro de um ThemeProvider"
    );
  }

  return context;
}