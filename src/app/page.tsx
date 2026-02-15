//app/page.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, Users, FileText, Image as ImageIcon, BarChart3, Square, Package, Wrench, Boxes, Briefcase, DollarSign, LogOut, ChevronRight, Settings, UsersRound, Bell, Search, ChevronDown, Building2, Menu, X } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import Image from "next/image"

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

export default function Dashboard() {
  const router = useRouter()
  const [totalClientes, setTotalClientes] = useState(0)
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // --- Estados de Branding (Padrões Glass Code) ---
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [logoDark, setLogoDark] = useState<string | null>("/glasscode2.png");
  const [darkPrimary, setDarkPrimary] = useState("#1C415B"); // Sidebar Background
  const [darkSecondary, setDarkSecondary] = useState("#FFFFFF"); // Texto da Sidebar
  const [darkTertiary, setDarkTertiary] = useState("#39B89F"); // Ícones da Sidebar
  const [darkHover, setDarkHover] = useState("#39B89F");
  const [lightPrimary, setLightPrimary] = useState("#F4F7FA"); // Background Geral
  const [lightSecondary, setLightSecondary] = useState("#FFFFFF"); // Background Cards
  const [lightTertiary, setLightTertiary] = useState("#1C415B"); // Títulos

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const fetchData = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          router.push("/login");
          return;
        }
        setUsuarioEmail(authData.user.email || "Usuário");

        // 1. Buscar Perfil
        const { data: perfil, error: perfilError } = await supabase
          .from("perfis_usuarios")
          .select("empresa_id")
          .eq("id", authData.user.id)
          .single();

        if (perfil && perfil.empresa_id) {
          // 2. Buscar Nome da Empresa
          const { data: empresaData } = await supabase
            .from("empresas")
            .select("nome")
            .eq("id", perfil.empresa_id)
            .single();
          
          if (empresaData) {
            setNomeEmpresa(empresaData.nome);
          } else {
            setNomeEmpresa("Empresa não encontrada");
          }

          // 3. Buscar Configurações de Branding
          const { data: brandingData } = await supabase
            .from("configuracoes_branding")
            .select("*")
            .eq("empresa_id", perfil.empresa_id)
            .single();

          if (brandingData) {
            setLogoDark(brandingData.logo_dark || "/glasscode2.png");
            setDarkPrimary(brandingData.dark_primary);
            setDarkSecondary(brandingData.dark_secondary);
            setDarkTertiary(brandingData.dark_tertiary);
            setDarkHover(brandingData.dark_hover);
            setLightPrimary(brandingData.light_primary);
            setLightSecondary(brandingData.light_secondary);
            setLightTertiary(brandingData.light_tertiary);
          }
        } else {
          // 🔥 ESTE É O PONTO: Se cair aqui, a tabela 'perfis'
          // do usuário não tem um 'empresa_id' válido.
          setNomeEmpresa("Perfil sem Empresa");
        }
        
        // 4. Buscar Contagem de Clientes
        const { count } = await supabase.from("clientes").select("*", { count: "exact", head: true });
        setTotalClientes(count ?? 0);

      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setNomeEmpresa("Erro ao carregar");
      } finally {
        // 🔥 IMPORTANTE: Garante que o loading pare mesmo se der erro
        setCheckingAuth(false);
      }
    };
    fetchData();

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone
    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => { router.push(item.rota); setShowMobileMenu(false); }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
          style={{ color: darkSecondary }} 
          onMouseEnter={(e) => {
            // Cor de hover com leve transparência para destaque
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
          <div className="ml-7 flex flex-col gap-1 pl-2" style={{ borderLeft: `1px solid ${darkSecondary}4D` }}>
            {item.submenu.map((sub) => (
              <div key={sub.nome} onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }} className="p-2 text-xs rounded-lg cursor-pointer transition-all"
                style={{ color: darkSecondary }}
                onMouseEnter={(e) => e.currentTarget.style.color = darkTertiary}
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

  // Tela de Loading Refinada
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: darkPrimary, borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  // Cards com cores baseadas no branding
  const stats = [
    { titulo: "Clientes Ativos", valor: totalClientes, icone: UsersRound, color: darkTertiary, bg: `${darkTertiary}10` },
    { titulo: "Orçamentos", valor: "12", icone: FileText, color: "#4FA2D9", bg: "#4FA2D910" },
    { titulo: "Projetos", valor: "5", icone: Briefcase, color: "#92D050", bg: "#92D05010" },
    { titulo: "Faturamento", valor: "R$ 15.2k", icone: DollarSign, color: darkTertiary, bg: `${darkTertiary}10` },
  ]

  return (
    <div className="flex min-h-screen text-gray-900" style={{ backgroundColor: lightPrimary }}>

      {/* SIDEBAR - Conectada ao branding */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: darkPrimary }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50">
          <X size={24} />
        </button>
        <div className="px-3 py-4 mb-4 flex justify-center">
          <Image src={logoDark || "/glasscode2.png"} alt="Logo ERP" width={200} height={56} className="h-12 md:h-14 object-contain" />
        </div>

        <nav className="flex-1 overflow-y-auto space-y-6 pr-2">
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

      {/* Overlay Mobile */}
      {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col w-full">

        {/* Topbar */}
        <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm" style={{ backgroundColor: lightSecondary }}>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu size={24} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-4 bg-gray-100 px-3 py-2 rounded-full w-full md:w-96 border border-gray-200">
              <Search className="text-gray-400" size={18} />
              <input type="search" placeholder="Buscar..." className="w-full text-sm bg-transparent outline-none" />
            </div>
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

              {/* Menu Dropdown User */}
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Logado como</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{usuarioEmail}</p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl">
                    <Settings size={18} className="text-gray-400" /> Configurações
                  </button>
                  <button onClick={handleSignOut} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                    <LogOut size={18} /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Container de Dados */}
        <main className="p-4 md:p-8 flex-1">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
            <div>
              <h1 className="text-2xl md:text-4xl font-black" style={{ color: lightTertiary }}>Dashboard</h1>
              <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Bem-vindo de volta, gerencie sua vidraçaria.</p>
            </div>
          </div>

          {/* Grid de Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icone;
              return (
                <div key={stat.titulo} className="p-6 md:p-7 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4 transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 cursor-pointer" style={{ backgroundColor: lightSecondary }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-500 tracking-tight">{stat.titulo}</span>
                    <div className={`p-3 rounded-2xl`} style={{ backgroundColor: stat.bg }}>
                      <Icon className={`w-6 h-6`} style={{ color: stat.color }} />
                    </div>
                  </div>
                  <span className="text-4xl md:text-5xl font-extrabold tracking-tighter" style={{ color: lightTertiary }}>{stat.valor}</span>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  )
}