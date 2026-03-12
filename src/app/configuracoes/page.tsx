//app/configuracoes/page.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Menu, ChevronDown, Building2, Settings, Palette, LogOut, TableProperties, Brush, Search } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useTheme } from "@/context/ThemeContext"
import Sidebar from "@/components/Sidebar"

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { theme } = useTheme();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);
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
        .maybeSingle();

      if (perfil) {
        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nome")
          .eq("id", perfil.empresa_id)
          .single();

        if (empresaData) {
          setNomeEmpresa(empresaData.nome);
        }
      }
      setCheckingAuth(false);
    };
    fetchData();

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: theme.menuBackgroundColor, borderBottomColor: theme.menuBackgroundColor, borderLeftColor: theme.menuBackgroundColor }}></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-gray-900" style={{ backgroundColor: theme.screenBackgroundColor }}>

      {/* SIDEBAR PADRONIZADA */}
      <Sidebar 
        showMobileMenu={showMobileMenu} 
        setShowMobileMenu={setShowMobileMenu} 
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido}
        setExpandido={setSidebarExpandido}
      />

      {/* Overlay */}
      {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full">

        {/* TOPBAR ORIGINAL */}
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

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Logado como</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{usuarioEmail}</p>
                  </div>

                  <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl">
                    <Settings size={18} className="text-gray-400" />
                    Configurações
                  </button>

                  <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes/branding"); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl">
                    <Palette size={18} className="text-gray-400" />
                    Identidade Visual
                  </button>

                  <button onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                    <LogOut size={18} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTEÚDO ORIGINAL */}
        <main className="p-4 md:p-8 flex-1">
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-black" style={{ color: theme.contentTextLightBg }}>Configurações</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Gerencie as regras, tabelas de preços e usuários do sistema.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* CARD 1 - TABELAS DE PREÇO ORIGINAL */}
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

            {/* CARD 2 - IDENTIDADE VISUAL ORIGINAL */}
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