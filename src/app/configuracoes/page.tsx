//app/configuracoes/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TableProperties, Brush } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useTheme } from "@/context/ThemeContext"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { theme } = useTheme();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
      } catch (error) {
        console.error("Erro ao carregar configuracoes:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    fetchData();
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
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={usuarioEmail}
          handleSignOut={handleSignOut}
        />

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
                  <div className="p-5 rounded-3xl border shrink-0" style={{ backgroundColor: `${theme.menuIconColor}1A`, borderColor: `${theme.menuIconColor}33` }}>
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
                  <div className="p-5 rounded-3xl border shrink-0" style={{ backgroundColor: `${theme.menuIconColor}1A`, borderColor: `${theme.menuIconColor}33` }}>
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