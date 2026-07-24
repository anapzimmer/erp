"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  UsersRound,
  WalletCards,
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

type SerieDia = {
  dia: string;
  total: number;
  quantidade: number;
};

type DashboardResumo = {
  clientes: number;
  orcamentos: number;
  faturamentoMensal: number;
  faturamentoHoje: number;
  orcamentosHoje: number;
  recentes: OrcamentoResumo[];
  serie30Dias: SerieDia[];
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
  faturamentoMensal: 0,
  faturamentoHoje: 0,
  orcamentosHoje: 0,
  recentes: [],
  serie30Dias: [],
};

const formatarDataChaveLocal = (data: Date) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

export default function Dashboard() {
  const { theme } = useTheme();
  const {
    user,
    perfilUsuario,
    nomeEmpresa,
    empresaId,
    loading,
    signOut,
  } = useAuth();

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

  const dataFormatada = useMemo(
    () =>
      dataAgora.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [dataAgora],
  );

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

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

  const serie7Dias = useMemo(
    () => resumo.serie30Dias.slice(-7),
    [resumo.serie30Dias],
  );

  const total7Dias = useMemo(
    () => serie7Dias.reduce((acc, item) => acc + item.total, 0),
    [serie7Dias],
  );

  const quantidade7Dias = useMemo(
    () => serie7Dias.reduce((acc, item) => acc + item.quantidade, 0),
    [serie7Dias],
  );

  const maxSerie7Dias = useMemo(
    () => Math.max(...serie7Dias.map((item) => item.total), 1),
    [serie7Dias],
  );

  const pontosGrafico = useMemo(() => {
    if (serie7Dias.length === 0) return "";

    const largura = 100;
    const altura = 38;

    return serie7Dias
      .map((item, index) => {
        const x =
          (index / Math.max(serie7Dias.length - 1, 1)) * largura;
        const y = altura - (item.total / maxSerie7Dias) * altura;

        return `${x},${y}`;
      })
      .join(" ");
  }, [maxSerie7Dias, serie7Dias]);

  const areaGrafico = useMemo(() => {
    if (!pontosGrafico) return "";

    return `0,40 ${pontosGrafico} 100,40`;
  }, [pontosGrafico]);

  useEffect(() => {
    const contarRegistros = async (
      table: string,
      filtrarEmpresa = true,
    ) => {
      let query = supabase
        .from(table)
        .select("id", { head: true, count: "exact" });

      if (filtrarEmpresa && empresaId) {
        query = query.eq("empresa_id", empresaId);
      }

      const { count, error } = await query;

      if (
        error &&
        filtrarEmpresa &&
        error.message?.toLowerCase().includes("empresa_id")
      ) {
        const fallback = await supabase
          .from(table)
          .select("id", { head: true, count: "exact" });

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

        const inicio30Dias = new Date();
        inicio30Dias.setDate(inicio30Dias.getDate() - 29);
        inicio30Dias.setHours(0, 0, 0, 0);

        const [
          clientes,
          orcamentos,
          faturamentoMesRes,
          recentesRes,
          historico30DiasRes,
        ] = await Promise.all([
          contarRegistros("clientes"),
          contarRegistros("orcamentos"),
          supabase
            .from("orcamentos")
            .select("valor_total")
            .eq("empresa_id", empresaId)
            .gte("created_at", inicioMes.toISOString()),
          supabase
            .from("orcamentos")
            .select(
              "id, numero_formatado, cliente_nome, valor_total, created_at",
            )
            .eq("empresa_id", empresaId)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("orcamentos")
            .select("created_at, valor_total")
            .eq("empresa_id", empresaId)
            .gte("created_at", inicio30Dias.toISOString())
            .order("created_at", { ascending: true }),
        ]);

        if (faturamentoMesRes.error) {
          console.warn(
            "Falha ao carregar faturamento mensal:",
            faturamentoMesRes.error.message,
          );
        }

        if (recentesRes.error) {
          console.warn(
            "Falha ao carregar orçamentos recentes:",
            recentesRes.error.message,
          );
        }

        if (historico30DiasRes.error) {
          console.warn(
            "Falha ao carregar histórico:",
            historico30DiasRes.error.message,
          );
        }

        const faturamentoMensal = (
          (faturamentoMesRes.data || []) as OrcamentoValorRow[]
        ).reduce(
          (acc, item) => acc + (Number(item.valor_total) || 0),
          0,
        );

        const serieBase: SerieDia[] = Array.from(
          { length: 30 },
          (_, index) => {
            const data = new Date(inicio30Dias);
            data.setDate(inicio30Dias.getDate() + index);

            return {
              dia: formatarDataChaveLocal(data),
              total: 0,
              quantidade: 0,
            };
          },
        );

        (
          (historico30DiasRes.data || []) as OrcamentoHistoricoRow[]
        ).forEach((orcamento) => {
          if (!orcamento.created_at) return;

          const dataOrcamento = new Date(orcamento.created_at);
          const chave = formatarDataChaveLocal(dataOrcamento);
          const item = serieBase.find((dia) => dia.dia === chave);

          if (item) {
            item.total += Number(orcamento.valor_total) || 0;
            item.quantidade += 1;
          }
        });

        const hoje = formatarDataChaveLocal(new Date());
        const resumoHoje = serieBase.find((item) => item.dia === hoje);

        setResumo({
          clientes,
          orcamentos,
          faturamentoMensal,
          faturamentoHoje: resumoHoje?.total ?? 0,
          orcamentosHoje: resumoHoje?.quantidade ?? 0,
          recentes: (recentesRes.data as OrcamentoResumo[]) || [],
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

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: theme.screenBackgroundColor }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4"
            style={{
              borderColor: `${theme.menuBackgroundColor}28`,
              borderTopColor: theme.menuBackgroundColor,
            }}
          />
          <p
            className="text-sm font-semibold"
            style={{ color: theme.contentTextLightBg }}
          >
            Carregando painel...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const cardsResumo = [
    {
      titulo: "Clientes",
      valor: String(resumo.clientes),
      descricao: "Base cadastrada",
      icon: UsersRound,
      cor: theme.menuBackgroundColor,
      fundo: `${theme.menuBackgroundColor}12`,
    },
    {
      titulo: "Orçamentos",
      valor: String(resumo.orcamentos),
      descricao: `${resumo.orcamentosHoje} criado(s) hoje`,
      icon: FileText,
      cor: "#0F766E",
      fundo: "#0F766E12",
    },
    {
      titulo: "Faturamento do mês",
      valor: formatarMoeda(resumo.faturamentoMensal),
      descricao: `${formatarMoeda(resumo.faturamentoHoje)} hoje`,
      icon: CircleDollarSign,
      cor: "#B45309",
      fundo: "#B4530912",
    },
    {
      titulo: "Últimos 7 dias",
      valor: formatarMoeda(total7Dias),
      descricao: `${quantidade7Dias} orçamento(s)`,
      icon: TrendingUp,
      cor: "#6D28D9",
      fundo: "#6D28D912",
    },
  ];

  const acoesRapidas = [
    {
      titulo: "Novo orçamento",
      descricao: "Criar um novo cálculo",
      href: "/matriz-projetos",
      icon: Plus,
    },
    {
      titulo: "Cadastrar cliente",
      descricao: "Adicionar à sua base",
      href: "/cadastros/clientes",
      icon: UserPlus,
    },
    {
      titulo: "Ver relatórios",
      descricao: "Acompanhar resultados",
      href: "/admin/relatorio.orcamento?periodo=30d",
      icon: BarChart3,
    },
  ];

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: theme.screenBackgroundColor }}
    >
      <Header
        nomeEmpresa={nomeEmpresa}
        usuarioEmail={user.email}
        handleSignOut={signOut}
      />

      <main className="w-full p-4 md:p-6 xl:p-8 2xl:p-10">
        <section
          className="relative overflow-hidden rounded-3xl border px-5 py-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)] md:px-7 md:py-6"
          style={{
            background: `linear-gradient(125deg, #ffffff 0%, #fbfdff 58%, ${theme.menuBackgroundColor}0D 100%)`,
            borderColor: `${theme.menuBackgroundColor}18`,
          }}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl"
            style={{ backgroundColor: `${theme.menuBackgroundColor}12` }}
          />

          <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-center">
            <div className="max-w-2xl">
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{
                  color: theme.menuBackgroundColor,
                  borderColor: `${theme.menuBackgroundColor}25`,
                  backgroundColor: `${theme.menuBackgroundColor}08`,
                }}
              >
                <LayoutDashboard size={14} />
                VISÃO GERAL
              </div>

              <h1
                className="text-3xl font-semibold tracking-tight md:text-4xl"
                style={{ color: theme.contentTextLightBg }}
              >
                {saudacao}, {nomeUsuario}.
              </h1>

              <p
                className="mt-3 max-w-xl text-sm leading-6 md:text-base"
                style={{ color: `${theme.contentTextLightBg}B8` }}
              >
                Acompanhe os principais números da{" "}
                <strong style={{ color: theme.contentTextLightBg }}>
                  {nomeEmpresa}
                </strong>{" "}
                e acesse rapidamente as funções mais utilizadas.
              </p>

              <div
                className="mt-5 flex items-center gap-2 text-xs font-semibold capitalize"
                style={{ color: `${theme.contentTextLightBg}90` }}
              >
                <CalendarDays size={15} />
                {dataFormatada}
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 xl:w-auto">
              {acoesRapidas.map((acao) => {
                const Icon = acao.icon;

                return (
                  <Link
                    key={acao.titulo}
                    href={acao.href}
                    className="group min-w-0 rounded-2xl border bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg xl:min-w-[180px]"
                    style={{
                      borderColor: `${theme.menuBackgroundColor}18`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="rounded-xl p-2"
                        style={{
                          color: theme.menuBackgroundColor,
                          backgroundColor: `${theme.menuBackgroundColor}10`,
                        }}
                      >
                        <Icon size={18} />
                      </div>

                      <ArrowUpRight
                        size={16}
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        style={{ color: `${theme.contentTextLightBg}70` }}
                      />
                    </div>

                    <p
                      className="mt-4 text-sm font-medium"
                      style={{ color: theme.contentTextLightBg }}
                    >
                      {acao.titulo}
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{ color: `${theme.contentTextLightBg}88` }}
                    >
                      {acao.descricao}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {cardsResumo.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.titulo}
                className="group rounded-3xl border bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-28px_rgba(15,23,42,0.30)]"
                style={{
                  borderColor: `${theme.contentTextLightBg}12`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-medium uppercase tracking-[0.12em]"
                      style={{ color: `${theme.contentTextLightBg}78` }}
                    >
                      {card.titulo}
                    </p>

                    {carregandoResumo ? (
                      <div
                        className="mt-3 h-8 w-28 animate-pulse rounded-lg"
                        style={{ backgroundColor: `${card.cor}12` }}
                      />
                    ) : (
                      <p
                        className="mt-2 truncate text-2xl font-semibold tracking-tight"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        {card.valor}
                      </p>
                    )}

                    <p
                      className="mt-2 text-xs font-semibold"
                      style={{ color: card.cor }}
                    >
                      {carregandoResumo
                        ? "Atualizando informações..."
                        : card.descricao}
                    </p>
                  </div>

                  <div
                    className="rounded-2xl p-3 transition-transform duration-300 group-hover:scale-105"
                    style={{
                      color: card.cor,
                      backgroundColor: card.fundo,
                    }}
                  >
                    <Icon size={21} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_0.8fr]">
          <article
            className="rounded-3xl border bg-white p-5 md:p-6"
            style={{ borderColor: `${theme.contentTextLightBg}12` }}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.12em]"
                  style={{ color: `${theme.contentTextLightBg}70` }}
                >
                  DESEMPENHO
                </p>
                <h2
                  className="mt-1 text-xl font-semibold tracking-tight"
                  style={{ color: theme.contentTextLightBg }}
                >
                  Faturamento dos últimos 7 dias
                </h2>
              </div>

              <div className="sm:text-right">
                <p
                  className="text-2xl font-semibold"
                  style={{ color: theme.contentTextLightBg }}
                >
                  {carregandoResumo ? "—" : formatarMoeda(total7Dias)}
                </p>
                <p
                  className="mt-1 text-xs font-semibold"
                  style={{ color: theme.menuBackgroundColor }}
                >
                  {quantidade7Dias} orçamento(s) no período
                </p>
              </div>
            </div>

            <div
              className="mt-6 overflow-hidden rounded-2xl border p-4"
              style={{
                borderColor: `${theme.menuBackgroundColor}14`,
                background: `linear-gradient(180deg, ${theme.menuBackgroundColor}08 0%, #ffffff 100%)`,
              }}
            >
              {carregandoResumo ? (
                <div
                  className="h-48 animate-pulse rounded-xl"
                  style={{ backgroundColor: `${theme.menuBackgroundColor}0D` }}
                />
              ) : serie7Dias.every((item) => item.total === 0) ? (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <BarChart3
                    size={34}
                    style={{ color: `${theme.menuBackgroundColor}60` }}
                  />
                  <p
                    className="mt-3 text-sm font-medium"
                    style={{ color: theme.contentTextLightBg }}
                  >
                    Nenhum faturamento registrado
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: `${theme.contentTextLightBg}80` }}
                  >
                    Os valores dos próximos orçamentos aparecerão aqui.
                  </p>
                </div>
              ) : (
                <>
                  <svg
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                    className="h-44 w-full overflow-visible"
                    aria-label="Gráfico de faturamento dos últimos sete dias"
                  >
                    <defs>
                      <linearGradient
                        id="dashboardChartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={theme.menuBackgroundColor}
                          stopOpacity="0.22"
                        />
                        <stop
                          offset="100%"
                          stopColor={theme.menuBackgroundColor}
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {[10, 20, 30].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke={`${theme.contentTextLightBg}12`}
                        strokeWidth="0.4"
                      />
                    ))}

                    <polygon
                      points={areaGrafico}
                      fill="url(#dashboardChartGradient)"
                    />

                    <polyline
                      points={pontosGrafico}
                      fill="none"
                      stroke={theme.menuBackgroundColor}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  <div className="mt-3 grid grid-cols-7 gap-1">
                    {serie7Dias.map((item) => (
                      <div key={item.dia} className="text-center">
                        <p
                          className="text-[10px] font-medium uppercase"
                          style={{ color: `${theme.contentTextLightBg}70` }}
                        >
                          {new Date(`${item.dia}T12:00:00`).toLocaleDateString(
                            "pt-BR",
                            { weekday: "short" },
                          )}
                        </p>
                        <p
                          className="mt-1 hidden text-[10px] sm:block"
                          style={{ color: `${theme.contentTextLightBg}65` }}
                        >
                          {new Date(`${item.dia}T12:00:00`).toLocaleDateString(
                            "pt-BR",
                            { day: "2-digit" },
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </article>

          <article
            className="rounded-3xl border bg-white p-5 md:p-6"
            style={{ borderColor: `${theme.contentTextLightBg}12` }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.12em]"
                  style={{ color: `${theme.contentTextLightBg}70` }}
                >
                  RESUMO DE HOJE
                </p>
                <h2
                  className="mt-1 text-xl font-semibold tracking-tight"
                  style={{ color: theme.contentTextLightBg }}
                >
                  Movimento diário
                </h2>
              </div>

              <div
                className="rounded-2xl p-3"
                style={{
                  color: theme.menuBackgroundColor,
                  backgroundColor: `${theme.menuBackgroundColor}10`,
                }}
              >
                <WalletCards size={21} />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${theme.contentTextLightBg}12` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-xl p-2"
                      style={{
                        color: "#0F766E",
                        backgroundColor: "#0F766E10",
                      }}
                    >
                      <ClipboardList size={18} />
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: `${theme.contentTextLightBg}80` }}
                      >
                        Orçamentos criados
                      </p>
                      <p
                        className="mt-1 text-lg font-semibold"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        {carregandoResumo ? "—" : resumo.orcamentosHoje}
                      </p>
                    </div>
                  </div>

                  <CheckCircle2 size={19} style={{ color: "#0F766E" }} />
                </div>
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${theme.contentTextLightBg}12` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-xl p-2"
                      style={{
                        color: "#B45309",
                        backgroundColor: "#B4530910",
                      }}
                    >
                      <CircleDollarSign size={18} />
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: `${theme.contentTextLightBg}80` }}
                      >
                        Valor movimentado
                      </p>
                      <p
                        className="mt-1 text-lg font-semibold"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        {carregandoResumo
                          ? "—"
                          : formatarMoeda(resumo.faturamentoHoje)}
                      </p>
                    </div>
                  </div>

                  <TrendingUp size={19} style={{ color: "#B45309" }} />
                </div>
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{
                  borderColor: `${theme.menuBackgroundColor}18`,
                  backgroundColor: `${theme.menuBackgroundColor}07`,
                }}
              >
                <div className="flex items-center gap-3">
                  <Sparkles
                    size={18}
                    style={{ color: theme.menuBackgroundColor }}
                  />
                  <div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: theme.contentTextLightBg }}
                    >
                      Sistema operando normalmente
                    </p>
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: `${theme.contentTextLightBg}78` }}
                    >
                      Dados sincronizados com a unidade ativa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_0.8fr]">
          <article
            className="rounded-3xl border bg-white p-5 md:p-6"
            style={{ borderColor: `${theme.contentTextLightBg}12` }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.12em]"
                  style={{ color: `${theme.contentTextLightBg}70` }}
                >
                  ÚLTIMOS REGISTROS
                </p>
                <h2
                  className="mt-1 text-xl font-semibold tracking-tight"
                  style={{ color: theme.contentTextLightBg }}
                >
                  Orçamentos recentes
                </h2>
              </div>

              <Link
                href="/admin/relatorio.orcamento?periodo=30d"
                className="group flex items-center gap-1 text-xs font-medium"
                style={{ color: theme.menuBackgroundColor }}
              >
                Ver todos
                <ChevronRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="mt-5 divide-y">
              {carregandoResumo ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 py-4"
                    style={{ borderColor: `${theme.contentTextLightBg}0D` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 animate-pulse rounded-xl"
                        style={{
                          backgroundColor: `${theme.menuBackgroundColor}0D`,
                        }}
                      />
                      <div>
                        <div
                          className="h-4 w-36 animate-pulse rounded"
                          style={{
                            backgroundColor: `${theme.contentTextLightBg}10`,
                          }}
                        />
                        <div
                          className="mt-2 h-3 w-24 animate-pulse rounded"
                          style={{
                            backgroundColor: `${theme.contentTextLightBg}0B`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : resumo.recentes.length > 0 ? (
                resumo.recentes.map((item, index) => (
                  <div
                    key={item.id}
                    className="group flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                    style={{ borderColor: `${theme.contentTextLightBg}0D` }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          color: theme.menuBackgroundColor,
                          backgroundColor:
                            index === 0
                              ? `${theme.menuBackgroundColor}14`
                              : `${theme.menuBackgroundColor}09`,
                        }}
                      >
                        <FileText size={18} />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-medium"
                          style={{ color: theme.contentTextLightBg }}
                        >
                          {item.numero_formatado
                            ? `Orçamento ${item.numero_formatado}`
                            : "Orçamento sem número"}
                        </p>
                        <p
                          className="mt-1 truncate text-xs"
                          style={{ color: `${theme.contentTextLightBg}78` }}
                        >
                          {item.cliente_nome || "Cliente não informado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <div className="sm:text-right">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: theme.contentTextLightBg }}
                        >
                          {formatarMoeda(Number(item.valor_total) || 0)}
                        </p>
                        <p
                          className="mt-1 text-[11px]"
                          style={{ color: `${theme.contentTextLightBg}70` }}
                        >
                          {formatarRelativo(item.created_at)}
                        </p>
                      </div>

                      <ArrowRight
                        size={16}
                        className="opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                        style={{ color: theme.menuBackgroundColor }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <FileText
                    size={34}
                    style={{ color: `${theme.menuBackgroundColor}55` }}
                  />
                  <p
                    className="mt-3 text-sm font-medium"
                    style={{ color: theme.contentTextLightBg }}
                  >
                    Nenhum orçamento encontrado
                  </p>
                  <p
                    className="mt-1 max-w-sm text-xs"
                    style={{ color: `${theme.contentTextLightBg}75` }}
                  >
                    Crie um novo orçamento para começar a acompanhar as
                    movimentações.
                  </p>
                  <Link
                    href="/orcamentos"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-white"
                    style={{ backgroundColor: theme.menuBackgroundColor }}
                  >
                    <Plus size={15} />
                    Novo orçamento
                  </Link>
                </div>
              )}
            </div>
          </article>

          <aside
            className="rounded-3xl border bg-white p-5 md:p-6"
            style={{ borderColor: `${theme.contentTextLightBg}12` }}
          >
            <p
              className="text-[11px] font-medium uppercase tracking-[0.12em]"
              style={{ color: `${theme.contentTextLightBg}70` }}
            >
              AMBIENTE
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              style={{ color: theme.contentTextLightBg }}
            >
              Informações da conta
            </h2>

            <div className="mt-5 space-y-3">
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${theme.contentTextLightBg}12` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-xl p-2"
                    style={{
                      color: theme.menuBackgroundColor,
                      backgroundColor: `${theme.menuBackgroundColor}0D`,
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-medium uppercase tracking-wide"
                      style={{ color: `${theme.contentTextLightBg}65` }}
                    >
                      Unidade ativa
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-medium"
                      style={{ color: theme.contentTextLightBg }}
                    >
                      {nomeEmpresa}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${theme.contentTextLightBg}12` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-xl p-2"
                    style={{
                      color: "#6D28D9",
                      backgroundColor: "#6D28D90D",
                    }}
                  >
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <p
                      className="text-[11px] font-medium uppercase tracking-wide"
                      style={{ color: `${theme.contentTextLightBg}65` }}
                    >
                      Última atualização
                    </p>
                    <p
                      className="mt-1 text-sm font-medium"
                      style={{ color: theme.contentTextLightBg }}
                    >
                      {new Date().toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${theme.contentTextLightBg}12` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-xl p-2"
                    style={{
                      color: "#0F766E",
                      backgroundColor: "#0F766E0D",
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p
                      className="text-[11px] font-medium uppercase tracking-wide"
                      style={{ color: `${theme.contentTextLightBg}65` }}
                    >
                      Status
                    </p>
                    <p
                      className="mt-1 text-sm font-medium"
                      style={{ color: theme.contentTextLightBg }}
                    >
                      Operando normalmente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}