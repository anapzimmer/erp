"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Palette, UploadCloud, Save, X, LayoutDashboard, ChevronRight, Settings, UsersRound, Search, ChevronDown, Building2, Square, Package, Wrench, Boxes, Briefcase, BarChart3, Image as ImageIcon, FileText, LogOut, Sun, Moon, CheckCircle, Menu } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

// --- Tipagens e Menus ---
type MenuItem = {
  nome: string
  rota: string
  icone: any
  submenu?: { nome: string; rota: string }[]
}

const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  {
    nome: "Orçamentos",
    rota: "/orcamentos",
    icone: FileText,
    submenu: [
      { nome: "Espelhos", rota: "/espelhos" },
      { nome: "Vidros", rota: "/calculovidro" },
      { nome: "Vidros PDF", rota: "/calculovidroPDF" },
    ]
  },
  { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart3 },
]

const menuCadastros: MenuItem[] = [
  { nome: "Clientes", rota: "/clientes", icone: UsersRound },
  { nome: "Vidros", rota: "/vidros", icone: Square },
  { nome: "Perfis", rota: "/perfis", icone: Package },
  { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/kits", icone: Boxes },
  { nome: "Serviços", rota: "/servicos", icone: Briefcase },
]

export default function ConfiguracoesBrandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

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
        .single();

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    if (!empresaId) return;
    setLoading(true);
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
          updated_at: new Date().toISOString(),
        }, { onConflict: 'empresa_id' });

      if (error) throw error;
      setShowModal(true);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar as configurações.");
    } finally {
      setLoading(false);
    }
  };

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

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => { router.push(item.rota); setShowMobileMenu(false); }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out"
          style={{ color: menuTextColor, backgroundColor: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = menuHoverColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: menuIconColor }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
          {item.submenu && <ChevronRight className="w-4 h-4" style={{ color: menuTextColor, opacity: 0.7 }} />}
        </div>
        {item.submenu && (
          <div className="ml-7 flex flex-col gap-1 pl-2" style={{ borderLeft: `1px solid ${menuTextColor}40` }}>
            {item.submenu.map((sub) => (
              <div
                key={sub.nome}
                onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                className="p-2 text-xs rounded-lg cursor-pointer hover:bg-black/10"
                style={{ color: menuTextColor }}
              >
                {sub.nome}
              </div>
            ))}
          </div>
        )}
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

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: menuBackgroundColor }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50">
          <X size={24} />
        </button>
        <div className="px-3 py-4 mb-4 flex justify-center">
          <Image src={logoDark || "/glasscode2.png"} alt="Logo ERP" width={200} height={56} className="h-12 md:h-14 object-contain" />
        </div>
        <nav className="flex-1 overflow-y-auto space-y-6">
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: menuIconColor }}>Principal</p>
            {menuPrincipal.map(renderMenuItem)}
          </div>
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: menuIconColor }}>Cadastros</p>
            {menuCadastros.map(renderMenuItem)}
          </div>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col w-full">
        <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm bg-white">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu size={24} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-4 bg-gray-100 px-3 py-2 rounded-full w-full md:w-96 border border-gray-200 focus-within:ring-2 focus-within:ring-[#39B89F]/30">
              <Search className="text-gray-400" size={18} />
              <input type="search" placeholder="Buscar..." className="w-full text-sm bg-transparent outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-200 hover:opacity-75 transition-all">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                  <Building2 size={16} />
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Logado como</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{usuarioEmail}</p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl">
                    <Settings size={18} className="text-gray-400" />
                    Configurações
                  </button>
                  <button onClick={handleSignOut} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                    <LogOut size={18} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

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

            {/* SEÇÃO CORES */}
            <section className="space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <Palette className="text-[#39B89F]" /> Definição de Cores
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Estrutura */}
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6 bg-gray-50 space-y-4">
                  <h3 className="font-bold text-gray-700">Estrutura</h3>
                  <ColorInput label="Fundo das telas" color={screenBackgroundColor} setter={setScreenBackgroundColor} />
                  <ColorInput label="Fundo do menu (sidebar)" color={menuBackgroundColor} setter={setMenuBackgroundColor} />
                </div>

                {/* Menu */}
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6 bg-gray-50 space-y-4">
                  <h3 className="font-bold text-gray-700">Menu Lateral</h3>
                  <ColorInput label="Texto do menu" color={menuTextColor} setter={setMenuTextColor} />
                  <ColorInput label="Ícones do menu" color={menuIconColor} setter={setMenuIconColor} />
                  <ColorInput label="Cor ao passar o mouse (hover)" color={menuHoverColor} setter={setMenuHoverColor} />
                </div>

                {/* Textos */}
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6 bg-gray-50 space-y-4">
                  <h3 className="font-bold text-gray-700">Textos Principais</h3>
                  <ColorInput label="Texto sobre fundo claro" color={contentTextLightBg} setter={setContentTextLightBg} />
                  <ColorInput label="Texto sobre fundo escuro" color={contentTextDarkBg} setter={setContentTextDarkBg} />
                </div>

                {/* Botões */}
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6 bg-gray-50 space-y-4">
                  <h3 className="font-bold text-gray-700">Botões</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorInput label="Fundo Botão Escuro" color={buttonDarkBg} setter={setButtonDarkBg} />
                    <ColorInput label="Texto Botão Escuro" color={buttonDarkText} setter={setButtonDarkText} />
                    <ColorInput label="Fundo Botão Claro" color={buttonLightBg} setter={setButtonLightBg} />
                    <ColorInput label="Texto Botão Claro" color={buttonLightText} setter={setButtonLightText} />
                  </div>
                </div>

                {/* 🔥 CARD NOVO: Modal de Confirmação */}
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6 bg-gray-50 space-y-4 md:col-span-2">
                  <h3 className="font-bold text-gray-700">Modal de Feedback</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorInput label="Fundo do Modal" color={modalBackgroundColor} setter={setModalBackgroundColor} />
                    <ColorInput label="Texto do Modal" color={modalTextColor} setter={setModalTextColor} />
                    <ColorInput label="Fundo Botão Modal" color={modalButtonBackgroundColor} setter={setModalButtonBackgroundColor} />
                    <ColorInput label="Texto Botão Modal" color={modalButtonTextColor} setter={setModalButtonTextColor} />
                    <ColorInput label="Ícone Sucesso" color={modalIconSuccessColor} setter={setModalIconSuccessColor} />
                    <ColorInput label="Ícone Erro" color={modalIconErrorColor} setter={setModalIconErrorColor} />
                    <ColorInput label="Ícone Aviso" color={modalIconWarningColor} setter={setModalIconWarningColor} />
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl transition-all disabled:opacity-70 w-full sm:w-auto justify-center shadow-lg" style={{ backgroundColor: buttonDarkBg }}>
                <Save size={18} />
                {loading ? "Salvando..." : "Aplicar Nova Identidade"}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* 🔥 ATUALIZADO: Fundo do Modal */}
          <div className="rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-6 text-center" style={{ backgroundColor: modalBackgroundColor }}>

            {/* Ícone Sucesso */}
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${modalIconSuccessColor}15` }}>
              <CheckCircle size={32} style={{ color: modalIconSuccessColor }} />
            </div>

            {/* 🔥 ATUALIZADO: Cor do Texto */}
            <h3 className="text-2xl font-black" style={{ color: modalTextColor }}>Tudo pronto!</h3>
            <p className="text-sm font-medium" style={{ color: `${modalTextColor}CC` }}>Sua nova identidade visual foi salva.</p>

            {/* 🔥 ATUALIZADO: Botão do Modal */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full font-bold py-3 rounded-xl hover:bg-opacity-90 transition-all"
              style={{ backgroundColor: modalButtonBackgroundColor, color: modalButtonTextColor }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}