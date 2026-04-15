"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  FileText,
  UsersRound,
  Briefcase,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  ClipboardList,
  Building2,
  Clock3,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

type OrcamentoResumo = {
  id: string;
  numero_formatado: string | null;
  cliente_nome: string | null;
  valor_total: number | string | null;
  created_at: string | null;
};

type ProjetoResumo = {
  id: string;
  nome: string | null;
  categoria: string | null;
  desenho: string | null;
  criado_em: string | null;
};

type DashboardResumo = {
  clientes: number;
  orcamentos: number;
  projetos: number;
  faturamentoMensal: number;
  recentes: OrcamentoResumo[];
  modelosRecentes: ProjetoResumo[];
  serie30Dias: { dia: string; total: number }[];
};

type OrcamentoValorRow = {
  valor_total: number | string | null;
};

type OrcamentoHistoricoRow = {
  created_at: string | null;
  valor_total: number | string | null;
};

const resumoInicial: DashboardResumo = {
  clientes: 0,
  orcamentos: 0,
  projetos: 0,
  faturamentoMensal: 0,
  recentes: [],
  modelosRecentes: [],
  serie30Dias: [],
};

export default function Dashboard() {
  const { theme } = useTheme();
  const { user, perfilUsuario, nomeEmpresa, empresaId, loading, signOut } = useAuth();
  const [resumo, setResumo] = useState<DashboardResumo>(resumoInicial);
  const [carregandoResumo, setCarregandoResumo] = useState(false);

  const dataAgora = useMemo(() => new Date(), []);
  const saudacao = useMemo(() => {
    const hora = dataAgora.getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  }, [dataAgora]);

  const nomeUsuario = useMemo(() => {
    const nomePerfil = perfilUsuario?.nome_completo || perfilUsuario?.nome;
    if (nomePerfil && typeof nomePerfil === "string") {
      return nomePerfil.split(" ")[0];
    }

    if (user?.email) {
      return user.email.split("@")[0];
    }

    return "Usuário";
  }, [perfilUsuario, user?.email]);

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatarRelativo = (isoDate?: string | null) => {
    if (!isoDate) return "agora";
    const agora = new Date().getTime();
    const momento = new Date(isoDate).getTime();
    const diffMs = Math.max(0, agora - momento);
    const minutos = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (minutos < 1) return "agora";
    if (minutos < 60) return `há ${minutos}min`;
    if (horas < 24) return `há ${horas}h`;
    return `há ${dias}d`;
  };

  const serie7Dias = useMemo(() => resumo.serie30Dias.slice(-7), [resumo.serie30Dias]);
  const maxSerie7Dias = useMemo(() => {
    const max = Math.max(...serie7Dias.map((item) => item.total), 1);
    return max;
  }, [serie7Dias]);

  const pontosGrafico = useMemo(() => {
    if (serie7Dias.length === 0) return "";
    const largura = 100;
    const altura = 40;

    return serie7Dias
      .map((item, index) => {
        const x = (index / Math.max(serie7Dias.length - 1, 1)) * largura;
        const y = altura - (item.total / maxSerie7Dias) * altura;
        return `${x},${y}`;
      })
      .join(" ");
  }, [maxSerie7Dias, serie7Dias]);

  useEffect(() => {
    const contarRegistros = async (table: string, filtrarEmpresa = true) => {
      let query = supabase.from(table).select("id", { head: true, count: "exact" });

      if (filtrarEmpresa && empresaId) {
        query = query.eq("empresa_id", empresaId);
      }

      const { count, error } = await query;

      // Em tabelas sem empresa_id, tenta novamente sem filtro para evitar quebra do dashboard.
      if (error && filtrarEmpresa && error.message?.toLowerCase().includes("empresa_id")) {
        const fallback = await supabase.from(table).select("id", { head: true, count: "exact" });
        return fallback.count ?? 0;
      }

      if (error) {
        console.warn(`Falha ao contar ${table}:`, error.message);
        return 0;
      }

      return count ?? 0;
    };

    const carregarResumo = async () => {
      if (!user || !empresaId) return;

      try {
        setCarregandoResumo(true);

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const [clientes, orcamentos, projetos, faturamentoMesRes, recentesRes, modelosRes] = await Promise.all([
          contarRegistros("clientes"),
          contarRegistros("orcamentos"),
          contarRegistros("projetos"),
          supabase
            .from("orcamentos")
            .select("valor_total")
            .eq("empresa_id", empresaId)
            .gte("created_at", inicioMes.toISOString()),
          supabase
            .from("orcamentos")
            .select("id, numero_formatado, cliente_nome, valor_total, created_at")
            .eq("empresa_id", empresaId)
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("projetos")
            .select("id, nome, categoria, desenho, criado_em")
            .eq("empresa_id", empresaId)
            .order("criado_em", { ascending: false })
            .limit(5),
        ]);

        const inicio30Dias = new Date();
        inicio30Dias.setDate(inicio30Dias.getDate() - 29);
        inicio30Dias.setHours(0, 0, 0, 0);

        const historico30DiasRes = await supabase
          .from("orcamentos")
          .select("created_at, valor_total")
          .eq("empresa_id", empresaId)
          .gte("created_at", inicio30Dias.toISOString())
          .order("created_at", { ascending: true });

        const faturamentoMensal = ((faturamentoMesRes.data || []) as OrcamentoValorRow[]).reduce((acc, item) => {
          return acc + (Number(item.valor_total) || 0);
        }, 0);

        const serieBase = Array.from({ length: 30 }, (_, index) => {
          const data = new Date(inicio30Dias);
          data.setDate(inicio30Dias.getDate() + index);
          const chave = data.toISOString().slice(0, 10);
          return { dia: chave, total: 0 };
        });

        ((historico30DiasRes.data || []) as OrcamentoHistoricoRow[]).forEach((orc) => {
          if (!orc.created_at) return;
          const chave = new Date(orc.created_at).toISOString().slice(0, 10);
          const item = serieBase.find((x) => x.dia === chave);
          if (item) {
            item.total += Number(orc.valor_total) || 0;
          }
        });

        setResumo({
          clientes,
          orcamentos,
          projetos,
          faturamentoMensal,
          recentes: (recentesRes.data as OrcamentoResumo[]) || [],
          modelosRecentes: (modelosRes.data as ProjetoResumo[]) || [],
          serie30Dias: serieBase,
        });
      } catch (error) {
        console.error("Erro ao carregar resumo do dashboard:", error);
      } finally {
        setCarregandoResumo(false);
      }
    };

    carregarResumo();
  }, [user, empresaId]);

  // 1. Tela de Carregamento Única e Elegante
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" 
             style={{ borderTopColor: 'transparent', borderRightColor: theme.menuBackgroundColor, borderBottomColor: theme.menuBackgroundColor, borderLeftColor: theme.menuBackgroundColor }}>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    {
      titulo: "Clientes Ativos",
      valor: String(resumo.clientes),
      variacao: carregandoResumo ? "Atualizando..." : "Base de clientes",
      icone: UsersRound,
      color: theme.menuBackgroundColor,
      bg: `${theme.menuBackgroundColor}14`,
    },
    {
      titulo: "Orçamentos",
      valor: String(resumo.orcamentos),
      variacao: carregandoResumo ? "Atualizando..." : "Registros totais",
      icone: FileText,
      color: "#0F766E",
      bg: "#0F766E18",
    },
    {
      titulo: "Modelos",
      valor: String(resumo.projetos),
      variacao: "Modelos de projeto",
      icone: Briefcase,
      color: "#3F3F46",
      bg: "#3F3F4615",
    },
    {
      titulo: "Faturamento",
      valor: formatarMoeda(resumo.faturamentoMensal),
      variacao: "Acumulado do mês",
      icone: DollarSign,
      color: "#B45309",
      bg: "#B4530918",
    },
  ];

  const quickActions = [
    { label: "Novo orçamento", href: "/orcamentos", icon: ClipboardList },
    { label: "Cadastrar cliente", href: "/cadastros/clientes", icon: UsersRound },
    { label: "Gerenciar projetos", href: "/projetos", icon: Briefcase },
  ];

  const updates = [
    {
      label: "Último acesso",
      value: new Date().toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      icon: Clock3,
    },
    { label: "Unidade ativa", value: nomeEmpresa, icon: Building2 },
    { label: "Status do ambiente", value: "Operando normalmente", icon: Sparkles },
  ];

  
  return (
      <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: theme.screenBackgroundColor }}>
        <div className="flex flex-col w-full min-w-0">
        <Header 
            nomeEmpresa={nomeEmpresa}
            usuarioEmail={user.email} 
            handleSignOut={signOut}
          />
        
        <main className="p-4 md:p-8 xl:p-10 flex-1 min-w-0">
          <div className="dashboard-reveal relative overflow-hidden rounded-4xl md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 border shadow-[0_22px_45px_-35px_rgba(15,23,42,0.32)]"
            style={{
              background: `linear-gradient(120deg, #ffffff 0%, #f8fafc 62%, ${theme.menuBackgroundColor}08 100%)`,
              borderColor: `${theme.menuBackgroundColor}1A`,
              animationDelay: "50ms",
            }}
          >
            <div
              className="absolute -top-20 -right-20 h-52 w-52 rounded-full blur-3xl"
              style={{ backgroundColor: `${theme.menuBackgroundColor}12` }}
            />
            <div
              className="absolute -bottom-24 -left-14 h-48 w-48 rounded-full blur-3xl"
              style={{ backgroundColor: `${theme.menuHoverColor}14` }}
            />

            <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs md:text-sm uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: `${theme.contentTextLightBg}AA` }}>
                  {saudacao}, {nomeUsuario}
                </p>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight" style={{ color: theme.contentTextLightBg }}>
                  Painel principal
                  <br className="hidden md:block" />
                  da operação
                </h1>
                <p className="text-sm md:text-base mt-4 max-w-xl" style={{ color: `${theme.contentTextLightBg}CC` }}>
                  Visão objetiva da <span className="font-bold" style={{ color: theme.contentTextLightBg }}>{nomeEmpresa}</span> com indicadores do dia, movimentações e atalhos úteis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
                {quickActions.map((action, index) => {
                  const ActionIcon = action.icon;
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="dashboard-reveal dashboard-float group rounded-2xl px-4 py-3 border bg-white transition-all duration-300 hover:-translate-y-0.5"
                      style={{
                        borderColor: `${theme.menuBackgroundColor}22`,
                        boxShadow: "0 8px 18px -14px rgba(15, 23, 42, 0.45)",
                        animationDelay: `${120 + index * 80}ms`,
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ color: `${theme.contentTextLightBg}CC` }}>
                        <ActionIcon size={16} style={{ color: theme.menuBackgroundColor }} />
                        <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: `${theme.contentTextLightBg}AA` }} />
                      </div>
                      <p className="mt-2 text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>{action.label}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4 mt-8">
            {stats.map((stat, index) => {
              const Icon = stat.icone;
              return (
                <div
                  key={stat.titulo}
                  className="dashboard-reveal group relative overflow-hidden p-4 xl:p-5 rounded-3xl border shadow-sm transition-all duration-300 hover:-translate-y-1"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: `${theme.contentTextLightBg}14`,
                    animationDelay: `${220 + index * 90}ms`,
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${stat.color}10 0%, transparent 100%)` }}
                  />

                  <div className="flex justify-between items-start mb-4 relative z-10 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-65" style={{ color: theme.modalTextColor }}>
                        {stat.titulo}
                      </span>
                      {carregandoResumo ? (
                        <div className="h-8 w-24 rounded-xl animate-pulse mt-1" style={{ backgroundColor: `${theme.menuIconColor}20` }} />
                      ) : (
                        <span className="text-2xl md:text-[1.85rem] font-black tracking-tight leading-tight" style={{ color: theme.modalTextColor }}>
                          {stat.valor}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold" style={{ color: stat.color }}>
                        {stat.variacao}
                      </span>
                    </div>
                    
                    <div className="p-2.5 rounded-2xl transition-transform duration-300 group-hover:scale-105" style={{ backgroundColor: stat.bg }}>
                      <Icon size={22} style={{ color: stat.color }} />
                    </div>
                  </div>

                  <div className="relative h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out w-1/2 group-hover:w-full"
                      style={{ backgroundColor: stat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-5">
            <section
              className="dashboard-reveal xl:col-span-2 rounded-3xl border p-6"
              style={{
                backgroundColor: theme.modalBackgroundColor,
                borderColor: `${theme.menuIconColor}22`,
                animationDelay: "520ms",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black tracking-tight" style={{ color: theme.contentTextLightBg }}>
                  Atividade recente
                </h2>
                <Link
                  href="/admin/relatorio.orcamento?periodo=30d"
                  className="text-xs font-bold uppercase tracking-[0.16em]"
                  style={{ color: theme.menuBackgroundColor }}
                >
                  Ver tudo
                </Link>
              </div>

              <div className="mb-5 rounded-2xl border p-4" style={{ borderColor: `${theme.menuIconColor}20` }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-[0.16em] font-bold opacity-70" style={{ color: theme.contentTextLightBg }}>
                    Evolução 7 dias
                  </p>
                  <p className="text-xs font-semibold" style={{ color: theme.menuBackgroundColor }}>
                    {formatarMoeda(serie7Dias.reduce((acc, item) => acc + item.total, 0))}
                  </p>
                </div>

                {carregandoResumo ? (
                  <div className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: `${theme.menuIconColor}18` }} />
                ) : serie7Dias.every((item) => item.total === 0) ? (
                  <div className="h-14 rounded-xl flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: `${theme.menuIconColor}12`, color: theme.contentTextLightBg }}>
                    Sem faturamento registrado nos últimos 7 dias
                  </div>
                ) : (
                  <svg viewBox="0 0 100 40" className="w-full h-14">
                    <polyline
                      fill="none"
                      stroke={theme.menuBackgroundColor}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={pontosGrafico}
                    />
                  </svg>
                )}
              </div>

              <div className="space-y-3">
                {(carregandoResumo
                  ? [
                      { id: "sk1", numero_formatado: "", cliente_nome: "", created_at: null, valor_total: 0 },
                      { id: "sk2", numero_formatado: "", cliente_nome: "", created_at: null, valor_total: 0 },
                      { id: "sk3", numero_formatado: "", cliente_nome: "", created_at: null, valor_total: 0 },
                    ]
                  : resumo.recentes.length > 0
                  ? resumo.recentes
                  : [
                      {
                        id: "placeholder",
                        numero_formatado: "Sem movimentações",
                        cliente_nome: "Crie ou atualize um orçamento para ver aqui",
                        created_at: null,
                        valor_total: null,
                      },
                    ]
                ).map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl px-4 py-3 border"
                    style={{
                      borderColor: `${theme.menuIconColor}20`,
                      backgroundColor: index === 0 ? `${theme.menuIconColor}12` : "transparent",
                    }}
                  >
                    <div>
                      {carregandoResumo ? (
                        <>
                          <div className="h-4 w-40 rounded-md animate-pulse" style={{ backgroundColor: `${theme.menuIconColor}20` }} />
                          <div className="h-3 w-28 rounded-md animate-pulse mt-2" style={{ backgroundColor: `${theme.menuIconColor}15` }} />
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>
                            {item.numero_formatado ? `Orçamento ${item.numero_formatado}` : "Movimentação"}
                          </p>
                          <p className="text-xs mt-1 opacity-80" style={{ color: theme.contentTextLightBg }}>
                            {item.cliente_nome || "Sem cliente informado"}
                          </p>
                        </>
                      )}
                    </div>
                    <span className="text-xs opacity-70" style={{ color: theme.contentTextLightBg }}>
                      {carregandoResumo ? "..." : formatarRelativo(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <section
                className="dashboard-reveal rounded-3xl border p-6"
                style={{
                  backgroundColor: theme.modalBackgroundColor,
                  borderColor: `${theme.menuIconColor}22`,
                  animationDelay: "620ms",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black tracking-tight" style={{ color: theme.contentTextLightBg }}>
                    Modelos de projeto
                  </h2>
                  <Link href="/projetos" className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: theme.menuBackgroundColor }}>
                    Gerenciar
                  </Link>
                </div>

                <div className="space-y-2">
                  {(carregandoResumo
                    ? [
                        { id: "m1", nome: "", categoria: "", criado_em: null, desenho: null },
                        { id: "m2", nome: "", categoria: "", criado_em: null, desenho: null },
                        { id: "m3", nome: "", categoria: "", criado_em: null, desenho: null },
                      ]
                    : resumo.modelosRecentes.length > 0
                    ? resumo.modelosRecentes
                    : [
                        { id: "vazio", nome: "Sem modelos cadastrados", categoria: "Crie seu primeiro modelo em Projetos", criado_em: null, desenho: null },
                      ]
                  ).map((modelo, index) => (
                    <Link
                      key={modelo.id}
                      href="/projetos"
                      className="block rounded-2xl border px-4 py-3 transition-all hover:-translate-y-0.5"
                      style={{
                        borderColor: `${theme.menuIconColor}20`,
                        backgroundColor: index === 0 ? `${theme.menuIconColor}12` : "transparent",
                      }}
                    >
                      {carregandoResumo ? (
                        <>
                          <div className="h-4 w-32 rounded-md animate-pulse" style={{ backgroundColor: `${theme.menuIconColor}20` }} />
                          <div className="h-3 w-24 rounded-md animate-pulse mt-2" style={{ backgroundColor: `${theme.menuIconColor}15` }} />
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>
                            {modelo.nome || "Modelo sem nome"}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-75" style={{ color: theme.contentTextLightBg }}>
                              {modelo.categoria || "Sem categoria"}
                            </p>
                            <span className="text-[11px] opacity-65" style={{ color: theme.contentTextLightBg }}>
                              {formatarRelativo(modelo.criado_em)}
                            </span>
                          </div>
                        </>
                      )}
                    </Link>
                  ))}
                </div>
              </section>

              <section
                className="dashboard-reveal rounded-3xl border p-6"
                style={{
                  backgroundColor: theme.modalBackgroundColor,
                  borderColor: `${theme.menuIconColor}22`,
                  animationDelay: "680ms",
                }}
              >
                <h2 className="text-xl font-black tracking-tight mb-5" style={{ color: theme.contentTextLightBg }}>
                  Ambiente
                </h2>

                <div className="space-y-3">
                  {updates.map((update) => {
                    const UpdateIcon = update.icon;
                    return (
                      <div key={update.label} className="rounded-2xl border p-3" style={{ borderColor: `${theme.menuIconColor}20` }}>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] font-bold opacity-60" style={{ color: theme.contentTextLightBg }}>
                          <UpdateIcon size={14} />
                          {update.label}
                        </div>
                        <p className="mt-2 text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>
                          {update.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}