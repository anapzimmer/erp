//app/configuracoes/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Brush, Database, Settings, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useTheme } from "@/context/ThemeContext"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { MODO_CORTE_BARRA_STORAGE_KEY, type ModoCorteBarra } from "@/utils/barras"

export default function ConfiguracoesPage() {
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

  const preferenciasSistema = [
    {
      titulo: "Padrões de cálculo",
      descricao: "Espaço para definir regras gerais de arredondamento, tolerâncias, medidas mínimas e padrões por categoria.",
    },
    {
      titulo: "Impressão e PDF",
      descricao: "Área para centralizar preferências de relatórios, relação da obra, otimização e exibição de valores.",
    },
    {
      titulo: "Comportamento do sistema",
      descricao: "Preferências futuras para numeração, salvamento, edição, atalhos e confirmações do ERP.",
    },
  ];

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

        <main className="p-4 md:p-8 flex-1">
          <div
            className="mb-6 rounded-[24px] border p-6 md:p-8 shadow-sm"
            style={{
              backgroundColor: theme.contentTextDarkBg,
              borderColor: `${theme.contentTextLightBg}14`,
            }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${theme.menuIconColor}14`,
                    borderColor: `${theme.menuIconColor}2E`,
                    color: theme.menuIconColor,
                  }}
                >
                  <Settings size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: `${theme.contentTextLightBg}8A` }}>
                    Administração
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold md:text-3xl" style={{ color: theme.contentTextLightBg }}>
                    Configurações
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Centralize aqui as preferências gerais que mudam o comportamento do sistema. Tabelas e identidade visual ficam no menu da empresa.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[430px]">
                {[
                  { label: "Tabelas", icon: Database },
                  { label: "Visual", icon: Brush },
                  { label: "Segurança", icon: ShieldCheck },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: `${theme.screenBackgroundColor}B8`,
                      borderColor: `${theme.contentTextLightBg}12`,
                    }}
                  >
                    <Icon size={16} style={{ color: theme.menuIconColor }} />
                    <p className="mt-2 text-xs font-medium" style={{ color: theme.contentTextLightBg }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="rounded-[24px] border p-5 md:p-6 shadow-sm"
            style={{
              backgroundColor: theme.contentTextDarkBg,
              borderColor: `${theme.contentTextLightBg}14`,
            }}
          >
            <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between" style={{ borderColor: `${theme.contentTextLightBg}12` }}>
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${theme.menuIconColor}12`,
                    borderColor: `${theme.menuIconColor}26`,
                    color: theme.menuIconColor,
                  }}
                >
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: theme.contentTextLightBg }}>
                    Preferências do Sistema
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Esta área fica preparada para os padrões globais do ERP. Por enquanto, deixei os grupos organizados para recebermos cada ajuste sem misturar com cadastros.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full border px-3 py-1 text-[11px] font-medium text-slate-500">
                Em planejamento
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {preferenciasSistema.map((item) => (
                <div
                  key={item.titulo}
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: `${theme.screenBackgroundColor}B8`,
                    borderColor: `${theme.contentTextLightBg}12`,
                  }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>
                    {item.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.descricao}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-5 rounded-2xl border p-4 md:p-5"
              style={{
                backgroundColor: `${theme.screenBackgroundColor}B8`,
                borderColor: `${theme.contentTextLightBg}12`,
              }}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>
                    Corte de barras longas
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                    Escolha como o sistema deve tratar medidas maiores que o tamanho da barra. A regra vale para os novos cálculos e recálculos dos projetos.
                  </p>
                </div>
                <span className="w-fit rounded-full border px-3 py-1 text-[11px] font-medium text-slate-500">
                  Preferência ativa
                </span>
              </div>

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
                      onClick={() => alterarModoCorteBarra(opcao.modo)}
                      className="rounded-2xl border p-4 text-left transition"
                      style={{
                        backgroundColor: ativo ? `${theme.menuIconColor}10` : theme.contentTextDarkBg,
                        borderColor: ativo ? `${theme.menuIconColor}70` : `${theme.contentTextLightBg}14`,
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
                            borderColor: ativo ? theme.menuIconColor : `${theme.contentTextLightBg}40`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{opcao.descricao}</p>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Nas deslizantes, os trilhos continuam respeitando barras de 7000 mm antes de aplicar esta regra.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
