//app/configuracoes/branding/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Palette, UploadCloud, Save, X, LayoutDashboard, ChevronRight, Settings, UsersRound, Bell, Search, ChevronDown, Building2, Square, Package, Wrench, Boxes, Briefcase, BarChart3, Image as ImageIcon, FileText, LogOut, Sun, Moon, CheckCircle, Menu } from "lucide-react";
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
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);

  const [logoLight, setLogoLight] = useState<string | null>("/glasscode2.png");
  const [logoDark, setLogoDark] = useState<string | null>("/glasscode2.png");

  // Estados para o Tema Claro
  const [lightPrimary, setLightPrimary] = useState("#F4F7FA"); // COR DE FUNDO GERAL
  const [lightSecondary, setLightSecondary] = useState("#FFFFFF"); // COR DE FUNDO DOS CARDS
  const [lightTertiary, setLightTertiary] = useState("#1C415B");
  const [lightHover, setLightHover] = useState("#E5E7EB");

  // Estados para o Tema Escuro
  const [darkPrimary, setDarkPrimary] = useState("#1C415B");
  const [darkSecondary, setDarkSecondary] = useState("#FFFFFF");
  const [darkTertiary, setDarkTertiary] = useState("#39B89F");
  const [darkHover, setDarkHover] = useState("#4FD1B8 ");

  const [colorMode, setColorMode] = useState<"hex" | "rgb">("hex");
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

      const { data: brandingData } = await supabase
        .from("configuracoes_branding")
        .select("*")
        .eq("empresa_id", perfil.empresa_id)
        .single();

      // --- ADICIONE ESTA CONSULTA AQUI ---
      const { data: empresaData } = await supabase
        .from("empresas")
        .select("nome")
        .eq("id", perfil.empresa_id)
        .single();

      if (empresaData) {
        setNomeEmpresa(empresaData.nome); // Define o nome da empresa
      }

      if (brandingData) {
        setLogoLight(brandingData.logo_light || "/glasscode2.png");
        setLogoDark(brandingData.logo_dark || "/glasscode2.png");
        setLightPrimary(brandingData.light_primary);
        setLightSecondary(brandingData.light_secondary);
        setLightTertiary(brandingData.light_tertiary);
        setLightHover(brandingData.light_hover);
        setDarkPrimary(brandingData.dark_primary);
        setDarkSecondary(brandingData.dark_secondary);
        setDarkTertiary(brandingData.dark_tertiary);
        setDarkHover(brandingData.dark_hover);
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
          light_primary: lightPrimary,
          light_secondary: lightSecondary,
          light_tertiary: lightTertiary,
          light_hover: lightHover,
          dark_primary: darkPrimary,
          dark_secondary: darkSecondary,
          dark_tertiary: darkTertiary,
          dark_hover: darkHover,
          updated_at: new Date().toISOString()
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
        {/* CORRIGIDO: Input box usa lightSecondary */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2" style={{ backgroundColor: lightSecondary }}>
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
            className="font-mono text-sm w-full outline-none"
            style={{ backgroundColor: 'transparent', color: lightTertiary }}
          />
        </div>
      </div>
    );
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone
    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => { router.push(item.rota); setShowMobileMenu(false); }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
            style={{ backgroundColor: "transparent", color: darkSecondary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${darkHover}33`;
            e.currentTarget.style.color = darkSecondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = darkSecondary;
          }}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: darkTertiary }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
          {item.submenu && <ChevronRight className="w-4 h-4" style={{ color: darkSecondary, opacity: 0.7 }} />}
        </div>
        {item.submenu && (
          <div className="ml-7 flex flex-col gap-1 pl-2" style={{ borderLeft: `1px solid ${darkSecondary}` }}>
            {item.submenu.map((sub) => (
              <div
                key={sub.nome}
                onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                className="p-2 text-xs rounded-lg cursor-pointer"
                style={{ color: darkSecondary }}
                onMouseEnter={(e) => e.currentTarget.style.color = darkSecondary}
                onMouseLeave={(e) => e.currentTarget.style.color = darkSecondary}
              >
                {sub.nome}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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
    // CORRIGIDO: O fundo da tela usa a cor Primária do Tema Claro
    <div className="flex min-h-screen" style={{ backgroundColor: lightPrimary }}>

      {/* SIDEBAR - Responsiva */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: darkPrimary }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50">
          <X size={24} />
        </button>
        <div className="px-3 py-4 mb-4 flex justify-center">
          <Image src={logoDark || "/glasscode2.png"} alt="Logo ERP" width={200} height={56} className="h-12 md:h-14 object-contain" />
        </div>
        <nav className="flex-1 overflow-y-auto space-y-6">
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Principal</p>
            {menuPrincipal.map(renderMenuItem)}
          </div>
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Cadastros</p>
            {menuCadastros.map(renderMenuItem)}
          </div>
        </nav>
      </aside>

      {/* Overlay para fechar menu mobile */}
      {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full">
        <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm" style={{ backgroundColor: lightSecondary }}>
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
          <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-[#1C415B]" style={{ color: lightTertiary }}>Identidade Visual</h1>
              <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Configure logos e cores.</p>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200 self-start md:self-center">
              <button onClick={() => setColorMode("hex")} className={`px-4 py-2 text-xs md:text-sm rounded-full ${colorMode === "hex" ? "bg-white shadow text-[#1C415B] font-bold" : "text-gray-500"}`}>HEX</button>
              <button onClick={() => setColorMode("rgb")} className={`px-4 py-2 text-xs md:text-sm rounded-full ${colorMode === "rgb" ? "bg-white shadow text-[#1C415B] font-bold" : "text-gray-500"}`}>RGB</button>
            </div>
          </div>

          {/* CORRIGIDO: O Card principal usa lightPrimary (Fundo) */}
          <div className="p-4 md:p-8 rounded-3xl shadow-sm border space-y-8" style={{ backgroundColor: lightPrimary, borderColor: `${lightTertiary}20` }}>

            <section className="space-y-6">
              <h2 className="text-lg font-bold text-[#1C415B] flex items-center gap-2" style={{ color: lightTertiary }}>
                <ImageIcon className="text-[#39B89F]" /> Logotipos
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* CORRIGIDO: Card claro usa lightSecondary (Card) */}
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6" style={{ backgroundColor: lightSecondary }}>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-4">
                    <Sun size={18} className="text-amber-500" /> Para Fundos Claros
                  </label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full h-24 md:h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: lightPrimary }}>
                      {logoLight ? <Image src={logoLight} alt="Logo Claro" width={150} height={100} className="max-h-16 md:max-h-24 object-contain" /> : <UploadCloud className="text-gray-400" size={30} />}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setLogoLight)}
                      style={{
                        '--file-hover-bg': lightHover,
                        '--file-hover-text': lightTertiary,
                      } as React.CSSProperties}
                      className="text-xs md:text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-[var(--file-hover-bg)] hover:file:text-[var(--file-hover-text)]
                      transition-all duration-200 "/>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6" style={{ backgroundColor: darkPrimary }}>
                  <label className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                    <Moon size={18} className="text-sky-300" /> Para Fundos Escuros
                  </label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full h-24 md:h-32 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: `${darkPrimary}80` }}>
                      {logoDark ? <Image src={logoDark} alt="Logo Escuro" width={150} height={100} className="max-h-16 md:max-h-24 object-contain" /> : <UploadCloud className="text-white/50" size={30} />}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setLogoDark)}
                      style={{
                        '--file-hover-bg': darkHover,
                        '--file-hover-text': darkTertiary,
                      } as React.CSSProperties}
                      className=" text-xs md:text-sm text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-[var(--file-hover-bg)] hover:file:text-[var(--file-hover-text)]
                      transition-all duration-200 "/>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            <section className="space-y-6">
              <h2 className="text-lg font-bold text-[#1C415B] flex items-center gap-2" style={{ color: lightTertiary }}>
                <Palette className="text-[#39B89F]" /> Definição de Cores
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* CORRIGIDO: Card claro usa lightSecondary (Card) */}
                <div className="border border-gray-100 rounded-2xl p-4 md:p-6" style={{ backgroundColor: lightSecondary }}>
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><Sun size={18} className="text-amber-500" /> Tema Claro</h3>
                  <ColorInput label="Cor Primária (Fundo)" color={lightPrimary} setter={setLightPrimary} />
                  <ColorInput label="Cor Secundária (Cards)" color={lightSecondary} setter={setLightSecondary} />
                  <ColorInput label="Cor Terciária (Texto)" color={lightTertiary} setter={setLightTertiary} />
                  <ColorInput label="Cor de Destaque (Hover)" color={lightHover} setter={setLightHover} />
                </div>

                <div className="border border-gray-100 rounded-2xl p-4 md:p-6 space-y-4" style={{ backgroundColor: darkPrimary }}>
                  <h3 className="font-bold text-white flex items-center gap-2"><Moon size={18} className="text-sky-300" /> Tema Escuro</h3>
                  <div className="space-y-4 bg-black/10 p-4 rounded-2xl">
                    <ColorInput label="Cor Primária (Fundo)" color={darkPrimary} setter={setDarkPrimary} />
                    <ColorInput label="Cor Secundária (Texto/Títulos)" color={darkSecondary} setter={setDarkSecondary} />
                    <ColorInput label="Cor Terciária (Ação)" color={darkTertiary} setter={setDarkTertiary} />
                    <ColorInput label="Cor de Destaque (Hover)" color={darkHover} setter={setDarkHover} />
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 text-white font-bold px-6 py-3 md:px-8 md:py-4 rounded-2xl transition-all disabled:opacity-70 w-full sm:w-auto justify-center shadow-lg" style={{ backgroundColor: lightTertiary, boxShadow: `0 10px 25px ${lightTertiary}40` }}>
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
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-6 text-center animate-fade-in">
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-2xl font-black" style={{ color: lightTertiary }}>Tudo pronto!</h3>
            <p className="text-sm font-medium" style={{ color: `${lightTertiary}80` }}>Sua nova identidade visual foi salva.</p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full text-white font-bold py-3 rounded-xl hover:bg-opacity-90 transition-all"
              style={{ backgroundColor: lightTertiary }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}