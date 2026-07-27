"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brush, Image as ImageIcon, MonitorCog, Moon, Palette, Save, Sun, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import Toast from "@/components/Toast"
import Header from "@/components/Header";

export default function ConfiguracoesBrandingPage() {
  const router = useRouter();
  const { refreshTheme } = useTheme();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  // Estados de Imagem
  const [logoLight, setLogoLight] = useState<string | null>("/glasscode.png");
  const [logoDark, setLogoDark] = useState<string | null>("/glasscode2.png");

  // ESTADOS DE CORES GERAIS
  const [screenBackgroundColor, setScreenBackgroundColor] = useState("#F4F7FA");
  const [menuBackgroundColor, setMenuBackgroundColor] = useState("#1C415B");
  const [menuTextColor, setMenuTextColor] = useState("#FFFFFF");
  const [menuIconColor, setMenuIconColor] = useState("#39B89F");
  const [menuHoverColor, setMenuHoverColor] = useState("#2A5C7E");
  const [contentTextLightBg, setContentTextLightBg] = useState("#1C415B");
  const [contentTextDarkBg, setContentTextDarkBg] = useState("#FFFFFF");
  const [buttonDarkBg, setButtonDarkBg] = useState("#1C415B");
  const [buttonDarkText, setButtonDarkText] = useState("#FFFFFF");
  const [buttonLightBg, setButtonLightBg] = useState("#FFFFFF");
  const [buttonLightText, setButtonLightText] = useState("#1C415B");
  const [modalIconErrorColor, setModalIconErrorColor] = useState("#DC2626");
  const [modalIconWarningColor, setModalIconWarningColor] = useState("#D97706");

  // ESTADOS DO MODAL
  const [modalBackgroundColor, setModalBackgroundColor] = useState("#FFFFFF");
  const [modalTextColor, setModalTextColor] = useState("#1C415B");
  const [modalButtonBackgroundColor, setModalButtonBackgroundColor] = useState("#1C415B");
  const [modalButtonTextColor, setModalButtonTextColor] = useState("#FFFFFF");
  const [modalIconSuccessColor, setModalIconSuccessColor] = useState("#059669");

  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          router.push("/login");
          return;
        }
        setUsuarioEmail(userData.user.email || "Usuário");

        const { data: perfil, error: perfilError } = await supabase
          .from("perfis_usuarios")
          .select("empresa_id")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (perfilError || !perfil) {
          console.error("Erro ao buscar perfil:", perfilError);
          return;
        }

        setEmpresaId(perfil.empresa_id);

        // Buscar branding atual
        const { data: brandingData } = await supabase
          .from("configuracoes_branding")
          .select("*")
          .eq("empresa_id", perfil.empresa_id)
          .single();

        // Buscar Nome da Empresa
        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nome")
          .eq("id", perfil.empresa_id)
          .single();

        if (empresaData) {
          setNomeEmpresa(empresaData.nome);
        }

        if (brandingData) {
          setLogoLight(brandingData.logo_light || "/glasscode.png");
          setLogoDark(brandingData.logo_dark || "/glasscode2.png");

          // SETTERS ATUALIZADOS
          setScreenBackgroundColor(brandingData.screen_background_color || "#F4F7FA");
          setMenuBackgroundColor(brandingData.menu_background_color || "#1C415B");
          setMenuTextColor(brandingData.menu_text_color || "#FFFFFF");
          setMenuIconColor(brandingData.menu_icon_color || "#39B89F");
          setMenuHoverColor(brandingData.menu_hover_color || "#2A5C7E");
          setContentTextLightBg(brandingData.content_text_light_bg || "#1C415B");
          setContentTextDarkBg(brandingData.content_text_dark_bg || "#FFFFFF");
          setButtonDarkBg(brandingData.button_dark_bg || "#1C415B");
          setButtonDarkText(brandingData.button_dark_text || "#FFFFFF");
          setButtonLightBg(brandingData.button_light_bg || "#FFFFFF");
          setButtonLightText(brandingData.button_light_text || "#1C415B");

          // SETTERS DO MODAL
          setModalBackgroundColor(brandingData.modal_background_color || "#FFFFFF");
          setModalTextColor(brandingData.modal_text_color || "#1C415B");
          setModalButtonBackgroundColor(brandingData.modal_button_background_color || "#1C415B");
          setModalButtonTextColor(brandingData.modal_button_text_color || "#FFFFFF");
          setModalIconSuccessColor(brandingData.modal_icon_success_color || "#059669");
          setModalIconErrorColor(brandingData.modal_icon_error_color || "#DC2626");
          setModalIconWarningColor(brandingData.modal_icon_warning_color || "#D97706");
        }
      } catch (error) {
        console.error("Erro ao carregar configuracoes de branding:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    fetchData();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setLogo: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

const handleSave = async () => {
  if (!empresaId) return

  setLoading(true)

  try {

    const { error } = await supabase
      .from("configuracoes_branding")
      .upsert({
        empresa_id: empresaId,
        logo_light: logoLight,
        logo_dark: logoDark,
        screen_background_color: screenBackgroundColor,
        menu_background_color: menuBackgroundColor,
        menu_text_color: menuTextColor,
        menu_icon_color: menuIconColor,
        menu_hover_color: menuHoverColor,
        content_text_light_bg: contentTextLightBg,
        content_text_dark_bg: contentTextDarkBg,
        button_dark_bg: buttonDarkBg,
        button_dark_text: buttonDarkText,
        button_light_bg: buttonLightBg,
        button_light_text: buttonLightText,
        modal_background_color: modalBackgroundColor,
        modal_text_color: modalTextColor,
        modal_button_background_color: modalButtonBackgroundColor,
        modal_button_text_color: modalButtonTextColor,
        modal_icon_success_color: modalIconSuccessColor,
        modal_icon_error_color: modalIconErrorColor,
        modal_icon_warning_color: modalIconWarningColor,
        updated_at: new Date().toISOString()
      }, { onConflict: "empresa_id" })

    if (error) throw error

    setShowToast(true)

    setTimeout(async () => {
      await refreshTheme()
    }, 1000)

  } catch (err) {

    console.error(err)

  } finally {

    setLoading(false)

  }
}

  const ColorInput = ({ label, color, setter }: { label: string; color: string; setter: (c: string) => void }) => {
    const [localColor, setLocalColor] = useState(color);

    useEffect(() => {
      setLocalColor(color);
    }, [color]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalColor(e.target.value);
    };

    const handleBlur = () => {
      setter(localColor);
    };

    const validHex = /^#[0-9A-Fa-f]{6}$/.test(localColor) ? localColor : "#000000";

    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-500">{label}</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
          <input
            type="color"
            value={validHex}
            onChange={handleChange}
            onBlur={handleBlur}
            className="h-9 w-9 cursor-pointer rounded-lg border-0"
          />
          <input
            type="text"
            value={localColor}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full bg-transparent font-mono text-sm text-slate-700 outline-none"
            style={{ backgroundColor: 'transparent' }}
          />
        </div>
      </div>
    );
  };


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#1C415B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: screenBackgroundColor }}>

      {/* SIDEBAR DE PREVIEW - Agora seguindo o padrão do Contexto */}
      {/* Overlay para Mobile */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-60 md:hidden transition-opacity"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido}
        setExpandido={setSidebarExpandido}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col w-full">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={usuarioEmail}
          handleSignOut={handleSignOut}
          logoUrl={logoLight}
        />

        <main className="p-4 md:p-8 flex-1">
          <div
            className="mb-6 rounded-[24px] border p-6 md:p-8 shadow-sm"
            style={{ backgroundColor: contentTextDarkBg, borderColor: `${contentTextLightBg}14` }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                  style={{ backgroundColor: `${menuIconColor}14`, borderColor: `${menuIconColor}2E`, color: menuIconColor }}
                >
                  <Palette size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: `${contentTextLightBg}8A` }}>
                    Configurações
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold md:text-3xl" style={{ color: contentTextLightBg }}>
                    Identidade Visual
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Ajuste logos, cores do menu, botões, textos e modais usados em todo o sistema.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition-all disabled:opacity-70 sm:w-auto"
                style={{ backgroundColor: buttonDarkBg, color: buttonDarkText, boxShadow: `0 12px 28px ${buttonDarkBg}24` }}
              >
                <Save size={17} />
                {loading ? "Salvando..." : "Salvar identidade"}
              </button>
            </div>
          </div>

          <div
            className="space-y-5 rounded-[24px] border p-5 md:p-6 shadow-sm"
            style={{ backgroundColor: contentTextDarkBg, borderColor: `${contentTextLightBg}14` }}
          >

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <ImageIcon size={19} style={{ color: menuIconColor }} />
                <h2 className="text-lg font-semibold text-slate-800">Logotipos</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                  <label className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Sun size={18} className="text-amber-500" /> Para Fundos Claros
                  </label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
                      {logoLight ? <Image src={logoLight} alt="Logo Claro" width={150} height={100} className="max-h-16 md:max-h-24 object-contain" /> : <UploadCloud className="text-gray-400" size={30} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoLight)} className="text-xs text-slate-500 file:mr-3 file:rounded-xl file:border file:border-slate-200 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50" />
                  </div>
                </div>

                <div className="rounded-2xl border p-4 md:p-5" style={{ backgroundColor: menuBackgroundColor, borderColor: `${menuTextColor}1F` }}>
                  <label className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
                    <Moon size={18} className="text-sky-300" /> Para Fundos Escuros
                  </label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/25" style={{ backgroundColor: `${menuBackgroundColor}80` }}>
                      {logoDark ? <Image src={logoDark} alt="Logo Escuro" width={150} height={100} className="max-h-16 md:max-h-24 object-contain" /> : <UploadCloud className="text-white/50" size={30} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoDark)} className="text-xs text-white/70 file:mr-3 file:rounded-xl file:border file:border-white/15 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-white/20" />
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-slate-100" />

            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <MonitorCog size={19} className="text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-800">Cores do Sistema</h2>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ambiente</h3>
                  <div className="space-y-4">
                    <ColorInput label="Fundo Geral" color={screenBackgroundColor} setter={setScreenBackgroundColor} />
                    <ColorInput label="Texto Principal" color={contentTextLightBg} setter={setContentTextLightBg} />
                    <ColorInput label="Texto Secundário" color={contentTextDarkBg} setter={setContentTextDarkBg} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Barra Lateral</h3>
                  <div className="space-y-4">
                    <ColorInput label="Fundo Sidebar" color={menuBackgroundColor} setter={setMenuBackgroundColor} />
                    <ColorInput label="Texto" color={menuTextColor} setter={setMenuTextColor} />
                    <ColorInput label="Ícones" color={menuIconColor} setter={setMenuIconColor} />
                    <ColorInput label="Hover / Ativo" color={menuHoverColor} setter={setMenuHoverColor} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Botões Principais</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <p className="text-[10px] font-medium uppercase text-slate-400">Primário</p>
                      <div className="flex gap-2">
                        <ColorInput label="Fundo" color={buttonDarkBg} setter={setButtonDarkBg} />
                        <ColorInput label="Letra" color={buttonDarkText} setter={setButtonDarkText} />
                      </div>
                    </div>
                    <div className="col-span-2 space-y-2 pt-2">
                      <p className="text-[10px] font-medium uppercase text-slate-400">Secundário</p>
                      <div className="flex gap-2">
                        <ColorInput label="Fundo" color={buttonLightBg} setter={setButtonLightBg} />
                        <ColorInput label="Letra" color={buttonLightText} setter={setButtonLightText} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:col-span-2 xl:col-span-3">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Modais e Mensagens</h3>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
                    <ColorInput label="Fundo" color={modalBackgroundColor} setter={setModalBackgroundColor} />
                    <ColorInput label="Texto" color={modalTextColor} setter={setModalTextColor} />
                    <ColorInput label="Botão" color={modalButtonBackgroundColor} setter={setModalButtonBackgroundColor} />
                    <ColorInput label="Letra Botão" color={modalButtonTextColor} setter={setModalButtonTextColor} />
                    <ColorInput label="Sucesso" color={modalIconSuccessColor} setter={setModalIconSuccessColor} />
                    <ColorInput label="Erro" color={modalIconErrorColor} setter={setModalIconErrorColor} />
                    <ColorInput label="Aviso" color={modalIconWarningColor} setter={setModalIconWarningColor} />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <Toast
        show={showToast}
        message="Identidade visual atualizada com sucesso"
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
