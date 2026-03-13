"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Palette, UploadCloud, Save, Image as ImageIcon, Sun, Moon } from "lucide-react";
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
        setCheckingAuth(false);
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
      setCheckingAuth(false);
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
        <label className="text-xs font-semibold text-gray-500">{label}</label>
        <div className="flex items-center gap-2 border border-gray-100 rounded-xl p-2 bg-white">
          <input
            type="color"
            value={validHex}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-10 h-10 rounded-lg cursor-pointer border-0"
          />
          <input
            type="text"
            value={localColor}
            onChange={handleChange}
            onBlur={handleBlur}
            className="font-mono text-sm w-full outline-none text-gray-800"
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
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-black" style={{ color: contentTextLightBg }}>Identidade Visual</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Configure logos e cores do sistema.</p>
          </div>

          {/* 🔥 Borda removida aqui (border-gray-100 adicionada para suavidade) */}
          <div className="p-4 md:p-8 rounded-3xl shadow-sm bg-white space-y-8">

            {/* SEÇÃO LOGOS */}
            <section className="space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <ImageIcon className="text-[#39B89F]" /> Logotipos
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6 bg-gray-50">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-4">
                    <Sun size={18} className="text-amber-500" /> Para Fundos Claros
                  </label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full h-24 md:h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-white">
                      {logoLight ? <Image src={logoLight} alt="Logo Claro" width={150} height={100} className="max-h-16 md:max-h-24 object-contain" /> : <UploadCloud className="text-gray-400" size={30} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoLight)} className="text-xs md:text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all duration-200 " />
                  </div>
                </div>

                <div className="border border-gray-100 rounded-2xl p-4 md:p-6" style={{ backgroundColor: menuBackgroundColor }}>
                  <label className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                    <Moon size={18} className="text-sky-300" /> Para Fundos Escuros
                  </label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full h-24 md:h-32 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: `${menuBackgroundColor}80` }}>
                      {logoDark ? <Image src={logoDark} alt="Logo Escuro" width={150} height={100} className="max-h-16 md:max-h-24 object-contain" /> : <UploadCloud className="text-white/50" size={30} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoDark)} className=" text-xs md:text-sm text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all duration-200 " />
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* SEÇÃO CORES MINIMALISTA */}
            <section className="space-y-12">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <Palette className="text-gray-400" size={20} />
                <h2 className="text-lg font-semibold text-gray-800">Cores do Sistema</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">

                {/* Ambiente */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ambiente</h3>
                  <div className="space-y-4">
                    <ColorInput label="Fundo Geral" color={screenBackgroundColor} setter={setScreenBackgroundColor} />
                    <ColorInput label="Texto Principal" color={contentTextLightBg} setter={setContentTextLightBg} />
                    <ColorInput label="Texto Secundário" color={contentTextDarkBg} setter={setContentTextDarkBg} />
                  </div>
                </div>

                {/* Navegação */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Barra Lateral</h3>
                  <div className="space-y-4">
                    <ColorInput label="Fundo Sidebar" color={menuBackgroundColor} setter={setMenuBackgroundColor} />
                    <ColorInput label="Texto" color={menuTextColor} setter={setMenuTextColor} />
                    <ColorInput label="Ícones" color={menuIconColor} setter={setMenuIconColor} />
                    <ColorInput label="Hover / Ativo" color={menuHoverColor} setter={setMenuHoverColor} />
                  </div>
                </div>

                {/* Ações */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Botões Principais</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Primário</p>
                      <div className="flex gap-2">
                        <ColorInput label="Fundo" color={buttonDarkBg} setter={setButtonDarkBg} />
                        <ColorInput label="Letra" color={buttonDarkText} setter={setButtonDarkText} />
                      </div>
                    </div>
                    <div className="col-span-2 space-y-2 pt-2">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Secundário</p>
                      <div className="flex gap-2">
                        <ColorInput label="Fundo" color={buttonLightBg} setter={setButtonLightBg} />
                        <ColorInput label="Letra" color={buttonLightText} setter={setButtonLightText} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback (Ocupa a largura toda) */}
                <div className="md:col-span-2 lg:col-span-3 pt-8 border-t border-gray-50">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-8">Modais e Mensagens</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
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

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 font-bold px-8 py-4 rounded-2xl transition-all disabled:opacity-70 w-full sm:w-auto justify-center shadow-lg hover:scale-[1.02] active:scale-95"
                style={{
                  backgroundColor: buttonDarkBg,
                  color: buttonDarkText // 👈 Correção: Agora o texto segue o estado
                }}
              >
                <Save size={18} />
                {loading ? "Salvando..." : "Aplicar Nova Identidade"}
              </button>
            </div>
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