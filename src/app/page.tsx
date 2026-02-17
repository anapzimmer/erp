// --- src/app/page.tsx (Página Principal do Dashboard) ---
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/context/ThemeContext"
import { supabase } from "@/lib/supabaseClient"
import { FileText, UsersRound, Briefcase, DollarSign } from "lucide-react"
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function Dashboard() {
  const router = useRouter()

  // 1. 🔥 CHAMAR O HOOK DE TEMA (Consome as cores atuais)
  const { theme } = useTheme();

  const [totalClientes, setTotalClientes] = useState(0)
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  // Estado necessário para controlar o menu mobile nos componentes
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          router.push("/login");
          return;
        }
        setUsuarioEmail(authData.user.email || "Usuário");

        // Buscar Perfil e Nome da Empresa
        const { data: perfil } = await supabase
          .from("perfis_usuarios")
          .select("empresa_id")
          .eq("id", authData.user.id)
          .single();

        if (perfil && perfil.empresa_id) {
          const { data: empresaData } = await supabase
            .from("empresas")
            .select("nome")
            .eq("id", perfil.empresa_id)
            .single();

          if (empresaData) {
            setNomeEmpresa(empresaData.nome);
          }
        }

        // Buscar Contagem de Clientes
        const { count } = await supabase.from("clientes").select("*", { count: "exact", head: true });
        setTotalClientes(count ?? 0);

      } catch (error) {
        console.error("Erro ao buscar dados:", error);
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

  // Tela de Loading Refinada
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        {/* 🔥 USANDO TEMA AQUI NO LOADING */}
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.menuBackgroundColor, borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  // Cards com cores baseadas no tema
  const stats = [
    { titulo: "Clientes Ativos", valor: totalClientes, icone: UsersRound, color: theme.menuIconColor, bg: `${theme.menuIconColor}10` },
    { titulo: "Orçamentos", valor: "12", icone: FileText, color: "#4FA2D9", bg: "#4FA2D910" },
    { titulo: "Projetos", valor: "5", icone: Briefcase, color: "#92D050", bg: "#92D05010" },
    { titulo: "Faturamento", valor: "R$ 15.2k", icone: DollarSign, color: theme.menuIconColor, bg: `${theme.menuIconColor}10` },
  ]

  return (
    // 🔥 USANDO TEMA AQUI (fundo da tela)
    <div className="flex min-h-screen text-gray-900" style={{ backgroundColor: theme.screenBackgroundColor }}>

      {/* 🔥 SIDEBAR COMPONENTIZADA: Ela já consome o tema internamente */}
      <Sidebar 
        showMobileMenu={showMobileMenu} 
        setShowMobileMenu={setShowMobileMenu} 
        nomeEmpresa={nomeEmpresa}
      />

      {/* Overlay Mobile */}
      {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col w-full">

        {/* 🔥 HEADER COMPONENTIZADA */}
        <Header 
            setShowMobileMenu={setShowMobileMenu}
            nomeEmpresa={nomeEmpresa}
            usuarioEmail={usuarioEmail}
            handleSignOut={handleSignOut}
        />

        {/* Container de Dados */}
        <main className="p-4 md:p-8 flex-1">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
            <div>
              {/* 🔥 USANDO TEMA AQUI (Títulos) */}
              <h1 className="text-2xl md:text-4xl font-black" style={{ color: theme.contentTextLightBg }}>Dashboard</h1>
              <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Bem-vindo de volta, gerencie sua vidraçaria.</p>
            </div>
          </div>

          {/* Grid de Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icone;
              return (
                <div
                  key={stat.titulo}
                  className="relative overflow-hidden p-6 md:p-7 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-2 cursor-pointer group"
                  // 🔥 CORREÇÃO: Usar cor do contexto para os cards
                  style={{ backgroundColor: theme.modalBackgroundColor }}
                >
                  {/* Efeito de brilho ao passar o mouse */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${stat.color}05 0%, transparent 100%)` }}
                  />

                  <div className="flex justify-between items-center relative z-10">
                    <span
                      className="text-sm font-semibold tracking-wide uppercase"
                      // 🔥 CORREÇÃO: Usar cor do contexto para título
                      style={{ color: theme.modalTextColor, opacity: 0.7 }}
                    >
                      {stat.titulo}
                    </span>
                    <div className={`p-3 rounded-2xl`} style={{ backgroundColor: stat.bg }}>
                      <Icon className={`w-6 h-6`} style={{ color: stat.color }} />
                    </div>
                  </div>

                  <span
                    className="text-4xl md:text-5xl font-extrabold tracking-tighter relative z-10"
                    // 🔥 CORREÇÃO: Usar cor do contexto para valor
                    style={{ color: theme.modalTextColor }}
                  >
                    {stat.valor}
                  </span>

                  {/* Barra inferior decorativa */}
                  <div className="absolute bottom-0 left-0 h-1 rounded-t-full"
                    style={{ backgroundColor: stat.color, width: '40%' }} />
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  )
}