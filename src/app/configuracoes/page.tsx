//app/configuracoes/page.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, FileText, BarChart3, Square, Package, Wrench, Boxes, Briefcase, LogOut, ChevronRight, Settings, UsersRound, Search, ChevronDown, Building2, TableProperties, Menu, X, Palette, Brush, ImageIcon } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import Image from "next/image"
// 🔥 IMPORTANTE: Importar o hook de tema
import { useTheme } from "@/context/ThemeContext"

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
    ],
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

export default function ConfiguracoesPage() {
  const router = useRouter()
  // 🔥 Consumir o tema do contexto
  const { theme } = useTheme();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const fetchData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push("/login");
        return;
      }
      setUsuarioEmail(authData.user.email || "Usuário");

      const { data: perfil } = await supabase
        .from("perfis_usuarios")
        .select("empresa_id")
        .eq("id", authData.user.id)
        .single();

      if (perfil) {
        // --- BUSCAR NOME DA EMPRESA ---
        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nome")
          .eq("id", perfil.empresa_id)
          .single();

        if (empresaData) {
          setNomeEmpresa(empresaData.nome);
        }
        // Branding já é carregado pelo ThemeContext
      }
      setCheckingAuth(false);
    };
    fetchData();

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

 const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    // 🔥 Defina a lógica de ativo aqui se não estiver usando um componente Sidebar separado
    const isActive = false; 

    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => { router.push(item.rota); setShowMobileMenu(false); }}
          // 🔥 CLASSES DE ESTILO APLICADAS IGUAL AO DESIGN ORIGINAL
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
          style={{
            // Fundo apenas se estiver ativo, removendo fundo no hover (conforme solicitado anteriormente)
            backgroundColor: isActive ? `${theme.menuHoverColor}33` : "transparent",
            color: theme.menuTextColor,
          }}
          // 🔥 Eventos de hover removidos para tirar o background color
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: theme.menuIconColor }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
          {item.submenu && (
            <ChevronRight className="w-4 h-4" style={{ color: theme.menuTextColor, opacity: 0.7 }} />
          )}
        </div>
        
        {item.submenu && (
          // 🔥 Borda do submenu
          <div className="ml-7 flex flex-col gap-1 pl-2" style={{ borderLeft: `1px solid ${theme.menuTextColor}4D` }}>
            {item.submenu.map((sub) => (
              <div key={sub.nome} onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                className="p-2 text-xs rounded-lg cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
                style={{ color: theme.menuTextColor }}
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
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.menuBackgroundColor, borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-gray-900" style={{ backgroundColor: theme.screenBackgroundColor }}>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: theme.menuBackgroundColor }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50">
          <X size={24} />
        </button>
        <div className="px-3 py-4 mb-4 flex justify-center">
          <Image src={theme.logoDarkUrl || "/glasscode2.png"} alt="Logo ERP" width={200} height={56} className="h-12 md:h-14 object-contain" />
        </div>

        <nav className="flex-1 overflow-y-auto space-y-6 pr-2">
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.menuIconColor }}>Principal</p>
            {menuPrincipal.map(renderMenuItem)}
          </div>
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.menuIconColor }}>Cadastros</p>
            {menuCadastros.map(renderMenuItem)}
          </div>
        </nav>
      </aside>

      {/* Overlay */}
      {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full">

        {/* TOPBAR */}
        <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg }}>
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

              {/* Menu Dropdown */}
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
                    onClick={handleSignOut}
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

        {/* CONTEÚDO ESPECÍFICO */}
        <main className="p-4 md:p-8 flex-1">
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-black" style={{ color: theme.contentTextLightBg }}>Configurações</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Gerencie as regras, tabelas de preços e usuários do sistema.</p>
          </div>

          {/* --- GRID DE CARDS --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* CARD 1 - TABELAS DE PREÇO */}
            <div className="p-6 md:p-8 rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}1A` }}>
              <div>
                <div className="flex items-center gap-6 mb-6">
                  <div className="p-5 rounded-3xl border flex-shrink-0" style={{ backgroundColor: `${theme.menuIconColor}1A`, borderColor: `${theme.menuIconColor}33` }}>
                    <TableProperties className="w-10 h-10" style={{ color: theme.menuIconColor }} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold" style={{ color: theme.contentTextLightBg }}>Tabelas de Preço</h2>
                    <p className="text-sm text-gray-500">Gerencie tabelas de vidro, ferragens e perfis.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push("/admin/tabelas")}
                className="text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg w-full justify-center"
                style={{ backgroundColor: theme.menuBackgroundColor, boxShadow: `0 10px 25px ${theme.menuBackgroundColor}40` }}
              >
                Acessar Tabelas
              </button>
            </div>

            {/* CARD 2 - IDENTIDADE VISUAL */}
            <div className="p-6 md:p-8 rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}1A` }}>
              <div>
                <div className="flex items-center gap-6 mb-6">
                  <div className="p-5 rounded-3xl border flex-shrink-0" style={{ backgroundColor: `${theme.menuIconColor}1A`, borderColor: `${theme.menuIconColor}33` }}>
                    <Brush className="w-10 h-10" style={{ color: theme.menuIconColor }} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold" style={{ color: theme.contentTextLightBg }}>Identidade Visual</h2>
                    <p className="text-sm text-gray-500">Personalize cores, logo e aparência do sistema.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push("/configuracoes/branding")}
                className="text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg w-full justify-center"
                style={{ backgroundColor: theme.menuBackgroundColor, boxShadow: `0 10px 25px ${theme.menuBackgroundColor}40` }}
              >
                Configurar Identidade
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}