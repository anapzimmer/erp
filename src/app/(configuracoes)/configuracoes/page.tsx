//app/configuracoes/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, SlidersHorizontal } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useTheme } from "@/context/ThemeContext"
import ArmazenamentoOrcamentos from "@/components/ArmazenamentoOrcamentos"
import ConfiguracaoModal from "@/components/ConfiguracaoModal"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { MODO_CORTE_BARRA_STORAGE_KEY, type ModoCorteBarra } from "@/utils/barras"

export default function ConfiguracoesPage() {
  const [calculoAberto, setCalculoAberto] = useState(false);
  const router = useRouter()
  const { theme } = useTheme();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);
  const [modoCorteBarra, setModoCorteBarra] = useState<ModoCorteBarra>(() => {
    if (typeof window === "undefined") return "dividir";

    const modoSalvo = window.localStorage.getItem(MODO_CORTE_BARRA_STORAGE_KEY);
    return modoSalvo === "complemento" ? "complemento" : "dividir";
  });

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

  const alterarModoCorteBarra = (modo: ModoCorteBarra) => {
    setModoCorteBarra(modo);
    try {
      window.localStorage.setItem(MODO_CORTE_BARRA_STORAGE_KEY, modo);
    } catch (error) {
      console.warn("Nao foi possivel salvar a preferencia de corte de barras:", error);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-secondary">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: theme.menuBackgroundColor, borderBottomColor: theme.menuBackgroundColor, borderLeftColor: theme.menuBackgroundColor }}></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-text-primary" style={{ backgroundColor: theme.screenBackgroundColor }}>

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

        <main className="p-4 md:p-8 flex-1">
          <div className="mb-7"><h1 className="text-2xl font-medium">Configurações</h1><p className="mt-2 text-sm text-text-secondary">Escolha uma opção para ajustar as preferências do sistema.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <button type="button" onClick={() => setCalculoAberto(true)} className="rounded-2xl border border-border bg-surface p-6 text-left transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
              <SlidersHorizontal size={24} className="mb-5 text-text-secondary"/><span className="block text-base font-medium">Preferências de cálculo</span><span className="mt-2 block text-sm text-text-secondary">Defina como dividir medidas maiores que uma barra.</span><span className="mt-5 flex items-center justify-between text-xs text-text-secondary">{modoCorteBarra === "dividir" ? "Dividir ao meio" : "Barra inteira + complemento"}<ArrowUpRight size={16}/></span>
            </button>
            <ArmazenamentoOrcamentos />
          </div>
          <ConfiguracaoModal aberto={calculoAberto} fechar={() => setCalculoAberto(false)} titulo="Preferências de cálculo">
            <h3 className="text-sm font-medium">Corte de barras longas</h3><p className="mt-2 text-sm text-text-secondary">A escolha é salva automaticamente neste dispositivo e vale para novos cálculos e recálculos.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  {
                    modo: "dividir" as ModoCorteBarra,
                    titulo: "Dividir ao meio",
                    descricao: "Ex.: vão de 7000 mm em barra de 6000 mm vira 3500 + 3500.",
                  },
                  {
                    modo: "complemento" as ModoCorteBarra,
                    titulo: "Barra inteira + complemento",
                    descricao: "Ex.: vão de 7000 mm em barra de 6000 mm vira 6000 + 1000.",
                  },
                ].map((opcao) => {
                  const ativo = modoCorteBarra === opcao.modo;

                  return (
                    <button
                      key={opcao.modo}
                      type="button"
                      aria-pressed={ativo} onClick={() => alterarModoCorteBarra(opcao.modo)}
                      className="rounded-2xl border p-4 text-left transition"
                      style={{
                        backgroundColor: ativo ? `color-mix(in srgb, ${theme.menuIconColor} 6%, transparent)` : theme.contentTextDarkBg,
                        borderColor: ativo ? `color-mix(in srgb, ${theme.menuIconColor} 44%, transparent)` : `color-mix(in srgb, ${theme.contentTextLightBg} 8%, transparent)`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>
                          {opcao.titulo}
                        </span>
                        <span
                          className="h-3 w-3 rounded-full border"
                          style={{
                            backgroundColor: ativo ? theme.menuIconColor : "transparent",
                            borderColor: ativo ? theme.menuIconColor : `color-mix(in srgb, ${theme.contentTextLightBg} 25%, transparent)`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{opcao.descricao}</p>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs leading-5 text-text-secondary">
                Nas deslizantes, os trilhos continuam respeitando barras de 7000 mm antes de aplicar esta regra.
              </p>
          </ConfiguracaoModal>
        </main>    </div>
    </div>
  )
}
