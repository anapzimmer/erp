"use client";
import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from "react";
import { supabase } from "@/lib/supabaseClient";

// 1. 🔥 Estrutura do tema
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
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
}

// 2. 🔥 Valores padrão
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

const ThemeContext = createContext<{
  theme: ThemeColors;
  setTheme: Dispatch<SetStateAction<ThemeColors>>;
  refreshTheme: () => void
}>({
  theme: defaultTheme,
  setTheme: () => { },
  refreshTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeColors>(defaultTheme);

  const fetchTheme = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfil } = await supabase
      .from("perfis_usuarios")
      .select("empresa_id")
      .eq("id", user.id)
      .single();

    if (!perfil) return;

    const { data: brandingData } = await supabase
      .from("configuracoes_branding")
      .select("*")
      .eq("empresa_id", perfil.empresa_id)
      .single();

    if (brandingData) {
      // 3. 🔥 Mapeamento correto dos dados do banco para o tema
      setTheme({
        screenBackgroundColor: brandingData.screen_background_color || defaultTheme.screenBackgroundColor,
        menuBackgroundColor: brandingData.menu_background_color || defaultTheme.menuBackgroundColor,
        menuTextColor: brandingData.menu_text_color || defaultTheme.menuTextColor,
        menuIconColor: brandingData.menu_icon_color || defaultTheme.menuIconColor,
        menuHoverColor: brandingData.menu_hover_color || defaultTheme.menuHoverColor,
        contentTextLightBg: brandingData.content_text_light_bg || defaultTheme.contentTextLightBg,
        contentTextDarkBg: brandingData.content_text_dark_bg || defaultTheme.contentTextDarkBg,
        buttonDarkBg: brandingData.button_dark_bg || defaultTheme.buttonDarkBg,
        buttonDarkText: brandingData.button_dark_text || defaultTheme.buttonDarkText,
        buttonLightBg: brandingData.button_light_bg || defaultTheme.buttonLightBg,
        buttonLightText: brandingData.button_light_text || defaultTheme.buttonLightText,
        modalBackgroundColor: brandingData.modal_background_color || defaultTheme.modalBackgroundColor,
        modalTextColor: brandingData.modal_text_color || defaultTheme.modalTextColor,
        modalButtonBackgroundColor: brandingData.modal_button_background_color || defaultTheme.modalButtonBackgroundColor,
        modalButtonTextColor: brandingData.modal_button_text_color || defaultTheme.modalButtonTextColor,
        modalIconSuccessColor: brandingData.modal_icon_success_color || defaultTheme.modalIconSuccessColor,
        modalIconErrorColor: brandingData.modal_icon_error_color || defaultTheme.modalIconErrorColor,
        modalIconWarningColor: brandingData.modal_icon_warning_color || defaultTheme.modalIconWarningColor,
        // 🔥 Campos de logo corrigidos
        logoLightUrl: brandingData.logo_light || defaultTheme.logoLightUrl,
        logoDarkUrl: brandingData.logo_dark || defaultTheme.logoDarkUrl,
      });
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, refreshTheme: fetchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);