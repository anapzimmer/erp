//ThemeContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback
} from "react";
import { supabase } from "@/lib/supabaseClient";

// Tipagem rigorosa para evitar erros de propriedade inexistente
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

const defaultTheme: ThemeColors = {
  screenBackgroundColor: "#F4F7FA",
  menuBackgroundColor: "#1C415B",
  menuTextColor: "#FFFFFF",
  menuIconColor: "#39B89F",
  menuHoverColor: "#2A5C7E",
  contentTextLightBg: "#1C415B",
  contentTextDarkBg: "#FFFFFF",
  buttonDarkBg: "#1C415B",
  buttonDarkText: "#FFFFFF",
  buttonLightBg: "#FFFFFF",
  buttonLightText: "#1C415B",
  modalBackgroundColor: "#FFFFFF",
  modalTextColor: "#1C415B",
  modalButtonBackgroundColor: "#1C415B",
  modalButtonTextColor: "#FFFFFF",
  modalIconSuccessColor: "#059669",
  modalIconErrorColor: "#DC2626",
  modalIconWarningColor: "#D97706",
  logoLightUrl: "/glasscode.png",
  logoDarkUrl: "/glasscode2.png",
};

interface ThemeContextType {
  theme: ThemeColors;
  refreshTheme: () => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeColors>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTheme = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setTheme(defaultTheme); // Se não há sessão, volta ao padrão
        return;
      }

      // BUSCA O PERFIL COM EMPRESA_ID ESPECÍFICO DO USUÁRIO LOGADO
      const { data: perfil, error: perfilError } = await supabase
        .from("perfis_usuarios") // Certifique-se que o nome é este no banco
        .select("*") // Usar * evita o erro 400 se 'nome_completo' não existir
        .eq("id", session.user.id)
        .single();

      if (perfilError || !perfil?.empresa_id) {
        console.error("Vínculo de empresa não encontrado:", perfilError);
        setTheme(defaultTheme);
        return;
      }

      const { data: branding, error: brandingError } = await supabase
        .from("configuracoes_branding")
        .select("*")
        .eq("empresa_id", perfil.empresa_id) // 👈 O segredo está aqui
        .single();

      if (brandingError && brandingError.code !== 'PGRST116') throw brandingError;

      if (branding) {
        setTheme({
          screenBackgroundColor: branding.screen_background_color || defaultTheme.screenBackgroundColor,
          menuBackgroundColor: branding.menu_background_color || defaultTheme.menuBackgroundColor,
          menuTextColor: branding.menu_text_color || defaultTheme.menuTextColor,
          menuIconColor: branding.menu_icon_color || defaultTheme.menuIconColor,
          menuHoverColor: branding.menu_hover_color || defaultTheme.menuHoverColor,
          contentTextLightBg: branding.content_text_light_bg || defaultTheme.contentTextLightBg,
          contentTextDarkBg: branding.content_text_dark_bg || defaultTheme.contentTextDarkBg,
          buttonDarkBg: branding.button_dark_bg || defaultTheme.buttonDarkBg,
          buttonDarkText: branding.button_dark_text || defaultTheme.buttonDarkText,
          buttonLightBg: branding.button_light_bg || defaultTheme.buttonLightBg,
          buttonLightText: branding.button_light_text || defaultTheme.buttonLightText,
          modalBackgroundColor: branding.modal_background_color || defaultTheme.modalBackgroundColor,
          modalTextColor: branding.modal_text_color || defaultTheme.modalTextColor,
          modalButtonBackgroundColor: branding.modal_button_background_color || defaultTheme.modalButtonBackgroundColor,
          modalButtonTextColor: branding.modal_button_text_color || defaultTheme.modalButtonTextColor,
          modalIconSuccessColor: branding.modal_icon_success_color || defaultTheme.modalIconSuccessColor,
          modalIconErrorColor: branding.modal_icon_error_color || defaultTheme.modalIconErrorColor,
          modalIconWarningColor: branding.modal_icon_warning_color || defaultTheme.modalIconWarningColor,
          logoUrl: branding.logo_dark || defaultTheme.logoDarkUrl,
          logoLightUrl: branding.logo_light || defaultTheme.logoLightUrl,
          logoDarkUrl: branding.logo_dark || defaultTheme.logoDarkUrl,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar branding:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // Sincronização de CSS Variables
  useEffect(() => {
    const root = document.documentElement;
    const styles: Record<string, string> = {
      "--gc-screen-bg": theme.screenBackgroundColor,
      "--gc-menu-bg": theme.menuBackgroundColor,
      "--gc-menu-text": theme.menuTextColor,
      "--gc-menu-icon": theme.menuIconColor,
      "--gc-menu-hover": theme.menuHoverColor,
      "--gc-text-light": theme.contentTextLightBg,
      "--gc-text-dark": theme.contentTextDarkBg,
      "--gc-btn-dark-bg": theme.buttonDarkBg,
      "--gc-btn-dark-text": theme.buttonDarkText,
      "--gc-modal-bg": theme.modalBackgroundColor,
      "--gc-modal-text": theme.modalTextColor,
      "--gc-modal-btn-bg": theme.modalButtonBackgroundColor,
      "--gc-modal-btn-text": theme.modalButtonTextColor,
      "--gc-success": theme.modalIconSuccessColor,
      "--gc-error": theme.modalIconErrorColor,
      "--gc-warning": theme.modalIconWarningColor,
    };

    Object.entries(styles).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, refreshTheme: fetchTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  return context;
};