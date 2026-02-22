"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Palette, UploadCloud, Save, X, LayoutDashboard, ChevronRight, Settings, UsersRound, Search, ChevronDown, Building2, Square, Package, Wrench, Boxes, Briefcase, BarChart3, Image as ImageIcon, FileText, LogOut, Sun, Moon, CheckCircle, Menu } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "@/context/ThemeContext";
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
  const { theme, refreshTheme } = useTheme();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);

  // Estados de Imagem
  const [logoLight, setLogoLight] = useState<string | null>(theme.logoLightUrl);
  const [logoDark, setLogoDark] = useState<string | null>(theme.logoDarkUrl);

  // ESTADOS DE CORES GERAIS
  const [screenBackgroundColor, setScreenBackgroundColor] = useState(theme.screenBackgroundColor);
  const [menuBackgroundColor, setMenuBackgroundColor] = useState(theme.menuBackgroundColor);
  const [menuTextColor, setMenuTextColor] = useState(theme.menuTextColor);
  const [menuIconColor, setMenuIconColor] = useState(theme.menuIconColor);
  const [menuHoverColor, setMenuHoverColor] = useState(theme.menuHoverColor);
  const [contentTextLightBg, setContentTextLightBg] = useState(theme.contentTextLightBg);
  const [contentTextDarkBg, setContentTextDarkBg] = useState(theme.contentTextDarkBg);
  const [buttonDarkBg, setButtonDarkBg] = useState(theme.buttonDarkBg);
  const [buttonDarkText, setButtonDarkText] = useState(theme.buttonDarkText);
  const [buttonLightBg, setButtonLightBg] = useState(theme.buttonLightBg);
  const [buttonLightText, setButtonLightText] = useState(theme.buttonLightText);
  
  const [modalBackgroundColor, setModalBackgroundColor] = useState(theme.modalBackgroundColor);
  const [modalTextColor, setModalTextColor] = useState(theme.modalTextColor);
  const [modalButtonBackgroundColor, setModalButtonBackgroundColor] = useState(theme.modalButtonBackgroundColor);
  const [modalButtonTextColor, setModalButtonTextColor] = useState(theme.modalButtonTextColor);
  
  const [modalIconSuccessColor, setModalIconSuccessColor] = useState("#059669");
  const [modalIconErrorColor, setModalIconErrorColor] = useState("#DC2626");
  const [modalIconWarningColor, setModalIconWarningColor] = useState("#D97706");

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
      if (!userData.user) { router.push("/login"); return; }
      setUsuarioEmail(userData.user.email || "Usuário");

      const { data: perfil } = await supabase
        .from("perfis_usuarios")
        .select("empresa_id")
        .eq("id", userData.user.id)
        .single();

      if (perfil) {
        setEmpresaId(perfil.empresa_id);

        const { data: brandingData } = await supabase
          .from("configuracoes_branding")
          .select("*")
          .eq("empresa_id", perfil.empresa_id)
          .single();

        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nome")
          .eq("id", perfil.empresa_id)
          .single();

        if (empresaData) setNomeEmpresa(empresaData.nome);

        if (brandingData) {
          setLogoLight(brandingData.logo_light);
          setLogoDark(brandingData.logo_dark);
          setScreenBackgroundColor(brandingData.screen_background_color);
          setMenuBackgroundColor(brandingData.menu_background_color);
          setMenuTextColor(brandingData.menu_text_color);
          setMenuIconColor(brandingData.menu_icon_color);
          setMenuHoverColor(brandingData.menu_hover_color);
          setContentTextLightBg(brandingData.content_text_light_bg);
          setContentTextDarkBg(brandingData.content_text_dark_bg);
          setButtonDarkBg(brandingData.button_dark_bg);
          setButtonDarkText(brandingData.button_dark_text);
          setButtonLightBg(brandingData.button_light_bg);
          setButtonLightText(brandingData.button_light_text);
          setModalBackgroundColor(brandingData.modal_background_color);
          setModalTextColor(brandingData.modal_text_color);
          setModalButtonBackgroundColor(brandingData.modal_button_background_color);
          setModalButtonTextColor(brandingData.modal_button_text_color);
          setModalIconSuccessColor(brandingData.modal_icon_success_color || "#059669");
        }
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
      reader.onloadend = () => setLogo(reader.result as string);
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
          updated_at: new Date().toISOString(),
        }, { onConflict: 'empresa_id' });

      if (error) throw error;
      await refreshTheme(); 
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
      setter(localColor); // Só atualiza o sistema quando você clica fora ou fecha a caixa
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
            className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
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
  // Verifica se a rota atual é a deste item ou de algum sub-item
  const isActive = typeof window !== 'undefined' && (window.location.pathname === item.rota || item.submenu?.some(sub => window.location.pathname === sub.rota));

  return (
    <div key={item.nome} className="group mb-1 px-2">
      <div
        onClick={() => { 
          if (!item.submenu) {
            router.push(item.rota); 
            setShowMobileMenu(false); 
          }
        }}
        className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
        style={{ 
          color: menuTextColor,
          // Se estiver ativo, já começa com a cor de hover
          backgroundColor: isActive ? menuHoverColor : "transparent" 
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = menuHoverColor;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div className="flex items-center gap-3">
          <Icon 
            className="w-5 h-5 transition-colors duration-300" 
            style={{ color: menuIconColor }} 
          />
          <span className="font-medium text-sm">{item.nome}</span>
        </div>
        {item.submenu && (
          <ChevronRight 
            className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'rotate-90' : ''}`}
            style={{ color: menuTextColor, opacity: 0.7 }} 
          />
        )}
      </div>

      {/* Submenu corrigido */}
      {item.submenu && (
        <div className="ml-7 mt-1 flex flex-col gap-1 pl-2 border-l transition-all duration-300" 
             style={{ borderColor: `${menuTextColor}40` }}>
          {item.submenu.map((sub) => {
            const isSubActive = typeof window !== 'undefined' && window.location.pathname === sub.rota;
            return (
              <div
                key={sub.nome}
                onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                className="p-2 text-xs rounded-lg cursor-pointer transition-colors"
                style={{ 
                  color: menuTextColor,
                  backgroundColor: isSubActive ? menuHoverColor : "transparent",
                  opacity: isSubActive ? 1 : 0.8
                }}
              >
                {sub.nome}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

  if (checkingAuth) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: screenBackgroundColor }}>

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: menuBackgroundColor }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50"><X size={24} /></button>
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

      <div className="flex-1 flex flex-col w-full">
       {/* TOPBAR CORRIGIDO E UNIFICADO */}
<header 
  className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm" 
  style={{ backgroundColor: contentTextDarkBg }} // Usa o estado local da página de branding
>
  <div className="flex items-center gap-2 md:gap-4">
    <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
      <Menu size={24} className="text-gray-600" />
    </button>
  </div>

  <div className="flex items-center gap-3">
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-200 hover:opacity-75 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
          <Building2 size={16} />
        </div>
        <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
      </button>

      {/* Menu Dropdown - EXATAMENTE IGUAL AO CÓDIGO FORNECIDO */}
      {showUserMenu && (
        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400">Logado como</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{usuarioEmail}</p>
          </div>

          <button
            onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"
          >
            <Settings size={18} className="text-gray-400" />
            Configurações
          </button>

          <button
            onClick={() => { setShowUserMenu(false); router.push("/configuracoes/branding"); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"
          >
            <Palette size={18} className="text-gray-400" />
            Identidade Visual
          </button>

          <button
            onClick={() => { supabase.auth.signOut(); router.push("/login"); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl"
          >
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
            <p className="text-gray-500 mt-1 font-medium text-sm">Sua marca, suas cores.</p>
          </div>

          <div className="p-4 md:p-8 rounded-3xl shadow-sm bg-white space-y-8">
            <section className="space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2"><ImageIcon className="text-[#39B89F]" /> Logotipos</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                  <label className="flex items-center gap-2 text-sm font-bold mb-4"><Sun size={18} className="text-amber-500" /> Fundos Claros</label>
                  <div className="h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-white overflow-hidden">
                    {logoLight ? <img src={logoLight} className="max-h-24 object-contain" alt="Logo Light" /> : <UploadCloud size={30} />}
                  </div>
                  <input type="file" onChange={(e) => handleFileChange(e, setLogoLight)} className="mt-4 text-xs" />
                </div>
                <div className="border border-gray-100 rounded-2xl p-4" style={{ backgroundColor: menuBackgroundColor }}>
                  <label className="flex items-center gap-2 text-sm font-bold text-white mb-4"><Moon size={18} className="text-sky-300" /> Fundos Escuros</label>
                  <div className="h-32 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center overflow-hidden">
                    {logoDark ? <img src={logoDark} className="max-h-24 object-contain" alt="Logo Dark" /> : <UploadCloud className="text-white/50" size={30} />}
                  </div>
                  <input type="file" onChange={(e) => handleFileChange(e, setLogoDark)} className="mt-4 text-xs text-white/70" />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2"><Palette className="text-[#39B89F]" /> Cores</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold">Estrutura e Menu</h3>
                  <ColorInput label="Fundo Telas" color={screenBackgroundColor} setter={setScreenBackgroundColor} />
                  <ColorInput label="Fundo Menu" color={menuBackgroundColor} setter={setMenuBackgroundColor} />
                  <ColorInput label="Texto Menu" color={menuTextColor} setter={setMenuTextColor} />
                  <ColorInput label="Ícones Menu" color={menuIconColor} setter={setMenuIconColor} />
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold">Botões e Modais</h3>
                  <ColorInput label="Botão Principal" color={buttonDarkBg} setter={setButtonDarkBg} />
                  <ColorInput label="Texto Botão" color={buttonDarkText} setter={setButtonDarkText} />
                  <ColorInput label="Fundo Modal" color={modalBackgroundColor} setter={setModalBackgroundColor} />
                  <ColorInput label="Texto Modal" color={modalTextColor} setter={setModalTextColor} />
                </div>
              </div>
            </section>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
    <button 
      onClick={handleSave} 
      disabled={loading} 
      className="flex items-center gap-2 font-bold px-8 py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50" 
      style={{ 
        backgroundColor: buttonDarkBg, // Cor de fundo que você escolheu
        color: buttonDarkText         // AGORA O TEXTO VAI APARECER NA COR CERTA
      }}
    >
      {/* O ícone também precisa da cor do texto para não ficar invisível */}
      <Save size={18} style={{ color: buttonDarkText }} />
      {loading ? "Salvando..." : "Aplicar Nova Identidade"}
    </button>
  </div>
          </div>
        </main>
      </div>

   {showModal && (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
    <div 
      className="relative rounded-3xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-xs w-full text-center space-y-5 border border-white/20" 
      style={{ backgroundColor: modalBackgroundColor }}
    >
      {/* Ícone discreto sem fundo colorido gigante */}
      <div className="flex justify-center">
        <div className="relative">
          <CheckCircle size={48} strokeWidth={1.5} style={{ color: modalIconSuccessColor }} />
          <div 
            className="absolute inset-0 blur-lg opacity-40" 
            style={{ backgroundColor: modalIconSuccessColor }}
          ></div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold tracking-tight" style={{ color: modalTextColor }}>
          Alterações Salvas
        </h3>
        <p className="text-sm opacity-60 font-medium" style={{ color: modalTextColor }}>
          Sua identidade visual foi atualizada com sucesso.
        </p>
      </div>

      <button 
        onClick={() => setShowModal(false)} 
        className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm" 
        style={{ 
          backgroundColor: modalButtonBackgroundColor, 
          color: modalButtonTextColor 
        }}
      >
        Entendido
      </button>
    </div>
  </div>
)}
    </div>
  );
}