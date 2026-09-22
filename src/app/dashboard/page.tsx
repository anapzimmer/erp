"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bath,
  Building2,
  CalendarDays,
  DoorOpen,
  FileText,
  Frame,
  Layers3,
  Maximize2,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import styles from "./dashboard.module.css";
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
  const { theme, isLoading: themeLoading } = useTheme();

  const {
    user,
    perfilUsuario,
    nomeEmpresa,
    empresaId,
    loading,
    signOut,
  } = useAuth();

  const [periodo, setPeriodo] = useState<7 | 30>(7);
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
    const nomePerfil =
      perfilUsuario?.nome_completo ||
      perfilUsuario?.nome;

    if (nomePerfil && typeof nomePerfil === "string") {
      return nomePerfil.split(" ")[0];
    }

    if (user?.email) {
      return user.email.split("@")[0];
    }

    return "Usuário";
  }, [perfilUsuario, user]);

  const dataFormatada = useMemo(
    () =>
      dataAgora.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [dataAgora]
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

  const seriePeriodo = useMemo(
    () => resumo.serie30Dias.slice(-periodo),
    [resumo.serie30Dias, periodo]
  );

  const totalPeriodo = useMemo(
    () =>
      seriePeriodo.reduce(
        (acc, item) => acc + item.total,
        0
      ),
    [seriePeriodo]
  );

  const quantidadePeriodo = useMemo(
    () =>
      seriePeriodo.reduce(
        (acc, item) => acc + item.quantidade,
        0
      ),
    [seriePeriodo]
  );

  const maxSerie = useMemo(
    () =>
      Math.max(
        ...seriePeriodo.map((item) => item.total),
        1
      ),
    [seriePeriodo]
  );

  const pontosGrafico = useMemo(() => {
    if (seriePeriodo.length === 0) return "";

    const largura = 100;
    const altura = 38;

    return seriePeriodo
      .map((item, index) => {
        const x =
          (index /
            Math.max(
              seriePeriodo.length - 1,
              1
            )) *
          largura;

        const y =
          altura -
          (item.total / maxSerie) * altura;

        return `${x},${y}`;
      })
      .join(" ");
  }, [maxSerie, seriePeriodo]);

  const areaGrafico = useMemo(() => {
    if (!pontosGrafico) return "";

    return `0,40 ${pontosGrafico} 100,40`;
  }, [pontosGrafico]);

  useEffect(() => {
    const contarRegistros = async (
      table: string,
      filtrarEmpresa = true
    ) => {
      let query = supabase
        .from(table)
        .select("id", {
          head: true,
          count: "exact",
        });

      if (filtrarEmpresa && empresaId) {
        query = query.eq(
          "empresa_id",
          empresaId
        );
      }

      const { count, error } = await query;

      if (
        error &&
        filtrarEmpresa &&
        error.message
          ?.toLowerCase()
          .includes("empresa_id")
      ) {
        const fallback = await supabase
          .from(table)
          .select("id", {
            head: true,
            count: "exact",
          });

        return fallback.count ?? 0;
      }

      if (error) {
        console.warn(
          `Falha ao contar ${table}:`,
          error.message
        );

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
        inicio30Dias.setDate(
          inicio30Dias.getDate() - 29
        );
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
            .gte(
              "created_at",
              inicioMes.toISOString()
            ),

          supabase
            .from("orcamentos")
            .select(
              "id, numero_formatado, cliente_nome, valor_total, created_at"
            )
            .eq("empresa_id", empresaId)
            .order("created_at", {
              ascending: false,
            })
            .limit(5),

          supabase
            .from("orcamentos")
            .select(
              "created_at, valor_total"
            )
            .eq("empresa_id", empresaId)
            .gte(
              "created_at",
              inicio30Dias.toISOString()
            )
            .order("created_at", {
              ascending: true,
            }),
        ]);

        if (faturamentoMesRes.error) {
          console.warn(
            "Falha ao carregar faturamento mensal:",
            faturamentoMesRes.error.message
          );
        }

        if (recentesRes.error) {
          console.warn(
            "Falha ao carregar orçamentos recentes:",
            recentesRes.error.message
          );
        }

        if (historico30DiasRes.error) {
          console.warn(
            "Falha ao carregar histórico:",
            historico30DiasRes.error.message
          );
        }

        const faturamentoMensal = (
          (faturamentoMesRes.data ||
            []) as OrcamentoValorRow[]
        ).reduce(
          (acc, item) =>
            acc +
            (Number(item.valor_total) || 0),
          0
        );

        const serieBase: SerieDia[] =
          Array.from(
            { length: 30 },
            (_, index) => {
              const data = new Date(
                inicio30Dias
              );

              data.setDate(
                inicio30Dias.getDate() +
                  index
              );

              return {
                dia: formatarDataChaveLocal(
                  data
                ),
                total: 0,
                quantidade: 0,
              };
            }
          );

        (
          (historico30DiasRes.data ||
            []) as OrcamentoHistoricoRow[]
        ).forEach((orcamento) => {
          if (!orcamento.created_at) return;

          const dataOrcamento = new Date(
            orcamento.created_at
          );

          const chave =
            formatarDataChaveLocal(
              dataOrcamento
            );

          const item = serieBase.find(
            (dia) => dia.dia === chave
          );

          if (item) {
            item.total +=
              Number(
                orcamento.valor_total
              ) || 0;

            item.quantidade += 1;
          }
        });

        const hoje =
          formatarDataChaveLocal(
            new Date()
          );

        const resumoHoje =
          serieBase.find(
            (item) => item.dia === hoje
          );

        setResumo({
          clientes,
          orcamentos,
          faturamentoMensal,
          faturamentoHoje:
            resumoHoje?.total ?? 0,
          orcamentosHoje:
            resumoHoje?.quantidade ?? 0,
          recentes:
            (recentesRes.data as OrcamentoResumo[]) ||
            [],
          serie30Dias: serieBase,
        });
      } catch (error) {
        console.error(
          "Erro ao carregar resumo do dashboard:",
          error
        );
      } finally {
        setCarregandoResumo(false);
      }
    };

    void carregarResumo();
  }, [user, empresaId]);

  if (loading || themeLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          backgroundColor:
            theme.screenBackgroundColor,
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4"
            style={{
              borderColor: `color-mix(in srgb, ${theme.menuBackgroundColor} 16%, transparent)`,
              borderTopColor:
                theme.menuBackgroundColor,
            }}
          />

          <p
            className="text-sm font-semibold"
            style={{
              color:
                theme.contentTextLightBg,
            }}
          >
            Preparando seu espaço...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

const projetos = [
  {
    titulo: "Box",
    descricao: "Reto, canto e variações",
    href: "/box2fls",
    tipo: "box",
  },
  {
    titulo: "Janelas",
    descricao: "Correr, fixos e maxim-ar",
    href: "/matriz-projetos",
    tipo: "janela",
  },
  {
    titulo: "Portas",
    descricao: "Correr e abrir",
    href: "/matriz-projetos",
    tipo: "porta",
  },
  {
    titulo: "Sacadas",
    descricao: "Fechamentos e sistemas",
    href: "/calculo/fechamentosacada",
    tipo: "sacada",
  },
  {
    titulo: "Fachadas",
    descricao: "Pele de vidro",
    href: "/matriz-projetos",
    tipo: "fachada",
  },
  {
    titulo: "Espelhos",
    descricao: "Espelhos sob medida",
    href: "/calculo/espelhos",
    tipo: "espelho",
  },
  {
    titulo: "Vidros",
    descricao: "Cálculo de vidros",
    href: "/calculo/calculovidro",
    tipo: "vidro",
  },
  {
    titulo: "Especiais",
    descricao: "Projetos personalizados",
    href: "/matriz-projetos",
    tipo: "especial",
  },
];

  return (
    <div className={styles.page}>
      <Header
        nomeEmpresa={nomeEmpresa}
        usuarioEmail={user.email}
        handleSignOut={signOut}
      />

      <main className={styles.main}>
        {/* TOPO */}
        <div className={styles.topline}>
          <span>
            ESPAÇO DE TRABALHO
            <span>/</span>
            Visão geral
          </span>

          <span>
            <CalendarDays size={14} />
            {dataFormatada}
          </span>
        </div>

        {/* SAUDAÇÃO */}
        <section className={styles.hero}>
          <div>
            <span className={styles.heroEyebrow}>
              GLASS CODE
            </span>

            <h1>
              {saudacao}, {nomeUsuario}
              <span>.</span>
            </h1>

            <p>
              O que vamos projetar hoje?
            </p>
          </div>

          <Link
            href="/matriz-projetos"
            className={styles.primary}
          >
            <Plus size={18} />
            Novo orçamento
            <ArrowUpRight size={17} />
          </Link>
        </section>

        {/* NOVO PROJETO */}
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>
                NOVO PROJETO
              </span>

              <h2>
                Escolha uma categoria
              </h2>

              <p>
                Selecione o tipo de projeto
                para começar o cálculo.
              </p>
            </div>

            <Link
              href="/matriz-projetos"
              className={styles.textLink}
            >
              Ver matriz completa
              <ArrowUpRight size={15} />
            </Link>
          </div>

        <div className={styles.projectGrid}>
  {projetos.map((projeto) => (
    <Link
      key={projeto.titulo}
      href={projeto.href}
      className={styles.projectCard}
    >
      <div className={styles.projectVisual}>
        <ProjectDrawing tipo={projeto.tipo} />
      </div>

      <div className={styles.projectInfo}>
        <div>
          <strong>{projeto.titulo}</strong>
          <span>{projeto.descricao}</span>
        </div>

        <ArrowUpRight size={16} />
      </div>
    </Link>
  ))}
</div>
        </section>

        {/* INDICADORES */}
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>
                MOVIMENTO DA EMPRESA
              </span>

              <h2>Visão rápida</h2>
            </div>
          </div>

          <div
            className={styles.metrics}
            aria-busy={carregandoResumo}
          >
            <article className={styles.metric}>
              <span>ORÇAMENTOS HOJE</span>

              <strong>
                {carregandoResumo
                  ? "—"
                  : resumo.orcamentosHoje}
              </strong>

              <small>
                criados hoje
              </small>
            </article>

            <article className={styles.metric}>
              <span>VALOR HOJE</span>

              <strong>
                {carregandoResumo
                  ? "—"
                  : formatarMoeda(
                      resumo.faturamentoHoje
                    )}
              </strong>

              <small>
                valor orçado
              </small>
            </article>

            <article className={styles.metric}>
              <span>ORÇADO NO MÊS</span>

              <strong>
                {carregandoResumo
                  ? "—"
                  : formatarMoeda(
                      resumo.faturamentoMensal
                    )}
              </strong>

              <small>
                no mês atual
              </small>
            </article>

            <article className={styles.metric}>
              <span>CLIENTES</span>

              <strong>
                {carregandoResumo
                  ? "—"
                  : resumo.clientes}
              </strong>

              <small>
                cadastrados
              </small>
            </article>
          </div>
        </section>

        {/* CONTINUAR TRABALHANDO */}
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>
                ÚLTIMOS REGISTROS
              </span>

              <h2>
                Continuar trabalhando
              </h2>

              <p>
                Acesse rapidamente os
                orçamentos mais recentes.
              </p>
            </div>

            <Link
              href="/admin/relatorio.orcamento"
              className={styles.textLink}
            >
              Ver todos
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {carregandoResumo ? (
            <div className={styles.empty}>
              Carregando orçamentos…
            </div>
          ) : resumo.recentes.length ? (
            <div className={styles.records}>
              {resumo.recentes.map(
                (item) => (
                  <Link
                    key={item.id}
                    href="/admin/relatorio.orcamento"
                    className={
                      styles.recordRow
                    }
                  >
                    <div
                      className={
                        styles.recordMain
                      }
                    >
                      <span
                        className={
                          styles.recordIcon
                        }
                      >
                        <FileText
                          size={17}
                        />
                      </span>

                      <div>
                        <strong>
                          {item.numero_formatado ||
                            "Sem número"}
                        </strong>

                        <span>
                          {item.cliente_nome ||
                            "Cliente não informado"}
                        </span>
                      </div>
                    </div>

                    <span
                      className={
                        styles.recordDate
                      }
                    >
                      {formatarRelativo(
                        item.created_at
                      )}
                    </span>

                    <strong
                      className={
                        styles.recordValue
                      }
                    >
                      {formatarMoeda(
                        Number(
                          item.valor_total
                        ) || 0
                      )}
                    </strong>

                    <ArrowRight
                      size={17}
                      className={
                        styles.recordArrow
                      }
                    />
                  </Link>
                )
              )}
            </div>
          ) : (
            <div className={styles.empty}>
              <FileText size={28} />

              <strong>
                Nenhum orçamento
                cadastrado.
              </strong>

              <p>
                Seus trabalhos mais
                recentes aparecerão aqui.
              </p>

              <Link href="/matriz-projetos">
                Criar primeiro orçamento
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>

        {/* DESEMPENHO */}
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>
                DESEMPENHO COMERCIAL
              </span>

              <h2>
                Evolução dos orçamentos
              </h2>

              <p>
                Acompanhe o valor orçado
                ao longo dos dias.
              </p>
            </div>

            <div
              className={styles.period}
              role="group"
              aria-label="Período do gráfico"
            >
              {([7, 30] as const).map(
                (dias) => (
                  <button
                    key={dias}
                    type="button"
                    aria-pressed={
                      periodo === dias
                    }
                    onClick={() =>
                      setPeriodo(dias)
                    }
                  >
                    {dias} dias
                  </button>
                )
              )}
            </div>
          </div>

          <div className={styles.chartSummary}>
            <div>
              <span>
                Total orçado no período
              </span>

              <strong>
                {carregandoResumo
                  ? "—"
                  : formatarMoeda(
                      totalPeriodo
                    )}
              </strong>
            </div>

            <span>
              {quantidadePeriodo} orçamento(s)
              criados
            </span>
          </div>

          <div className={styles.chart}>
            {carregandoResumo ? (
              <div className={styles.empty}>
                Carregando atividade…
              </div>
            ) : seriePeriodo.every(
                (item) => item.total === 0
              ) ? (
              <div className={styles.empty}>
                <BarChart3 size={28} />

                <strong>
                  Nenhum valor orçado
                  neste período.
                </strong>

                <p>
                  Crie um orçamento ou
                  selecione outro período.
                </p>
              </div>
            ) : (
              <>
                <svg
                  viewBox="-1 -4 102 45"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Valor orçado por dia nos últimos ${periodo} dias`}
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
                        stopColor="var(--gc-lime)"
                        stopOpacity=".20"
                      />

                      <stop
                        offset="100%"
                        stopColor="var(--gc-lime)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  {[0, 20, 40].map(
                    (y) => (
                      <line
                        key={y}
                        x1="0"
                        x2="100"
                        y1={y}
                        y2={y}
                        stroke="var(--border)"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  )}

                  <polygon
                    points={areaGrafico}
                    fill="url(#dashboardChartGradient)"
                  />

                  <polyline
                    points={pontosGrafico}
                    fill="none"
                    stroke="var(--gc-lime)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>

                <div
                  className={`${styles.chartDays} ${
                    periodo === 30
                      ? styles.monthDays
                      : ""
                  }`}
                >
                  {seriePeriodo.map(
                    (item) => (
                      <div
                        key={item.dia}
                        tabIndex={0}
                        title={`${item.dia}: ${formatarMoeda(
                          item.total
                        )} · ${
                          item.quantidade
                        } orçamento(s)`}
                      >
                        <span>
                          {new Date(
                            `${item.dia}T12:00:00`
                          ).toLocaleDateString(
                            "pt-BR",
                            periodo === 30
                              ? {
                                  day: "2-digit",
                                  month: "2-digit",
                                }
                              : {
                                  weekday:
                                    "short",
                                }
                          )}
                        </span>

                        <small>
                          {formatarMoeda(
                            item.total
                          )}
                        </small>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          <p className={styles.chartNote}>
            Valores de orçamentos criados no
            período; não representam pagamentos
            recebidos.
          </p>
        </section>

        <footer className={styles.footer}>
          <strong>GLASS CODE</strong>

          <span>
            Gestão com clareza. Projetos com
            precisão.
          </span>
        </footer>
      </main>
    </div>
  );
}

function ProjectDrawing({
  tipo,
}: {
  tipo: string;
}) {
  const vidro = "currentColor";

  return (
    <svg
      viewBox="0 0 260 140"
      aria-hidden="true"
      className={styles.projectDrawing}
    >
      {/* =========================
          BOX 2 FOLHAS
      ========================== */}
{tipo === "box" && (
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="1.05"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* perfis */}
    <rect
      x="43"
      y="20"
      width="174"
      height="7"
      fill="currentColor"
      fillOpacity=".06"
    />
    <rect
      x="43"
      y="113"
      width="174"
      height="5"
      fill="currentColor"
      fillOpacity=".04"
    />

    {/* laterais */}
    <path d="M48 27V113" />
    <path d="M212 27V113" />

    {/* folha esquerda */}
    <rect
      x="49"
      y="28"
      width="80"
      height="84"
      fill={vidro}
      fillOpacity=".035"
    />

    {/* folha direita */}
    <rect
      x="131"
      y="28"
      width="80"
      height="84"
      fill={vidro}
      fillOpacity=".055"
    />

    {/* encontro central */}
    <path d="M130 27V113" />

    {/* puxador barra na folha direita */}
    <rect
      x="197"
      y="61"
      width="4"
      height="29"
      rx=".5"
      fill="currentColor"
      fillOpacity=".07"
      strokeWidth="1.2"
    />

    {/* reflexos discretos */}
    <path
      d="M57 44L69 32M57 55L78 33"
      opacity=".15"
    />

    <path
      d="M139 45L151 33"
      opacity=".10"
    />
  </g>
)}


      {/* =========================
          JANELA 4 FOLHAS
      ========================== */}
    {tipo === "janela" && (
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="1.05"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* perfil superior */}
    <rect
      x="29"
      y="24"
      width="202"
      height="7"
      fill="currentColor"
      fillOpacity=".06"
    />

    {/* perfil inferior */}
    <rect
      x="29"
      y="109"
      width="202"
      height="7"
      fill="currentColor"
      fillOpacity=".04"
    />

    {/* laterais */}
    <path d="M34 31V109" />
    <path d="M226 31V109" />

    {/* folha 1 */}
    <rect
      x="35"
      y="32"
      width="47"
      height="76"
      fill={vidro}
      fillOpacity=".025"
    />

    {/* folha 2 */}
    <rect
      x="83"
      y="32"
      width="47"
      height="76"
      fill={vidro}
      fillOpacity=".045"
    />

    {/* folha 3 */}
    <rect
      x="131"
      y="32"
      width="47"
      height="76"
      fill={vidro}
      fillOpacity=".045"
    />

    {/* folha 4 */}
    <rect
      x="179"
      y="32"
      width="46"
      height="76"
      fill={vidro}
      fillOpacity=".025"
    />

    {/* divisões */}
    <path d="M82 31V109" />
    <path d="M130 31V109" />
    <path d="M178 31V109" />

    {/* puxador esquerdo central */}
    <rect
      x="121"
      y="61"
      width="7"
      height="18"
      fill="currentColor"
      fillOpacity=".08"
    />

    <rect
      x="123"
      y="64"
      width="3"
      height="12"
    />

    {/* puxador direito central */}
    <rect
      x="132"
      y="61"
      width="7"
      height="18"
      fill="currentColor"
      fillOpacity=".08"
    />

    <rect
      x="134"
      y="64"
      width="3"
      height="12"
    />

    {/* reflexos */}
    <path
      d="M42 49L55 35M43 59L63 35"
      opacity=".13"
    />

    <path
      d="M185 49L198 35"
      opacity=".10"
    />
  </g>
)}


      {/* =========================
          PORTA DE CORRER
      ========================== */}
      {tipo === "porta" && (
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="1.05"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* perfil superior */}
    <rect
      x="51"
      y="17"
      width="158"
      height="8"
      fill="currentColor"
      fillOpacity=".07"
    />

    {/* perfil inferior */}
    <rect
      x="51"
      y="114"
      width="158"
      height="6"
      fill="currentColor"
      fillOpacity=".05"
    />

    {/* laterais */}
    <path d="M56 25V114" />
    <path d="M204 25V114" />

    {/* folha esquerda */}
    <rect
      x="57"
      y="26"
      width="72"
      height="87"
      fill={vidro}
      fillOpacity=".03"
    />

    {/* folha direita */}
    <rect
      x="131"
      y="26"
      width="72"
      height="87"
      fill={vidro}
      fillOpacity=".05"
    />

    {/* encontro */}
    <path d="M130 25V114" />

    {/* puxador barra */}
    <rect
      x="185"
      y="55"
      width="5"
      height="34"
      rx=".5"
      fill="currentColor"
      fillOpacity=".06"
      strokeWidth="1.3"
    />

    {/* fechadura lateral */}
    <rect
      x="195"
      y="65"
      width="9"
      height="18"
      rx=".5"
      fill="currentColor"
      fillOpacity=".08"
    />

    <rect
      x="198"
      y="69"
      width="3"
      height="10"
    />

    {/* reflexos */}
    <path
      d="M65 46L81 29M66 58L94 30"
      opacity=".13"
    />

    <path
      d="M140 46L156 29"
      opacity=".10"
    />
  </g>
)}
      {/* =========================
          SACADA
      ========================== */}
      {tipo === "sacada" && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* trilhos */}
          <path d="M24 29H236" />
          <path d="M24 114H236" />

          {/* folhas */}
          {[30, 64, 98, 132, 166, 200].map(
            (x, index) => (
              <rect
                key={x}
                x={x}
                y="34"
                width="30"
                height="75"
                fill={vidro}
                fillOpacity={
                  index % 2 === 0
                    ? ".035"
                    : ".065"
                }
              />
            )
          )}

          {/* encontros */}
          {[64, 98, 132, 166, 200].map(
            (x) => (
              <path
                key={x}
                d={`M${x} 34V109`}
                opacity=".65"
              />
            )
          )}

          {/* reflexos */}
          <path
            d="M36 50L48 38M37 60L54 39"
            opacity=".18"
          />

          <path
            d="M105 51L117 38"
            opacity=".18"
          />

          {/* direção */}
          <path
            d="M151 72H181M175 66L181 72L175 78"
            opacity=".4"
          />

          </g>
      )}

      {/* =========================
          PELE DE VIDRO / FACHADA
      ========================== */}
      {tipo === "fachada" && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* contorno */}
          <rect
            x="46"
            y="18"
            width="168"
            height="101"
          />

          {/* montantes */}
          <path d="M88 18V119" />
          <path d="M130 18V119" />
          <path d="M172 18V119" />

          {/* travessas */}
          <path d="M46 52H214" />
          <path d="M46 85H214" />

          {/* vidro */}
          <rect
            x="50"
            y="22"
            width="34"
            height="26"
            fill={vidro}
            fillOpacity=".035"
          />

          <rect
            x="92"
            y="56"
            width="34"
            height="25"
            fill={vidro}
            fillOpacity=".06"
          />

          <rect
            x="134"
            y="89"
            width="34"
            height="26"
            fill={vidro}
            fillOpacity=".045"
          />

          <rect
            x="176"
            y="22"
            width="34"
            height="26"
            fill={vidro}
            fillOpacity=".065"
          />

          {/* reflexos */}
          <path
            d="M55 39L68 26M97 73L111 59M181 39L194 26"
            opacity=".16"
          />

          {/* pequena base */}
          <path d="M39 122H221" />
        </g>
      )}

      {/* =========================
          ESPELHO
      ========================== */}
      {tipo === "espelho" && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* espelho */}
          <rect
            x="70"
            y="17"
            width="120"
            height="103"
            rx="1.5"
            fill={vidro}
            fillOpacity=".035"
          />

          {/* lapidação interna */}
          <rect
            x="75"
            y="22"
            width="110"
            height="93"
            rx="1"
            opacity=".3"
          />

          {/* reflexos */}
          <path
            d="M83 52L108 27"
            opacity=".23"
          />

          <path
            d="M83 67L122 28"
            opacity=".16"
          />

          <path
            d="M141 108L177 72"
            opacity=".14"
          />

          {/* pontos de fixação discretos */}
          <circle cx="78" cy="25" r="1.7" />
          <circle cx="182" cy="25" r="1.7" />
          <circle cx="78" cy="112" r="1.7" />
          <circle cx="182" cy="112" r="1.7" />
        </g>
      )}

      {/* =========================
          VIDROS
      ========================== */}
      {tipo === "vidro" && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* chapa traseira */}
          <rect
            x="75"
            y="30"
            width="115"
            height="79"
            fill={vidro}
            fillOpacity=".025"
            opacity=".55"
          />

          {/* chapa frontal */}
          <rect
            x="57"
            y="20"
            width="115"
            height="79"
            fill={vidro}
            fillOpacity=".055"
          />

          {/* reflexos */}
          <path
            d="M67 47L88 26"
            opacity=".22"
          />

          <path
            d="M67 61L101 27"
            opacity=".14"
          />

          {/* indicação técnica */}
          <path
            d="M57 14H172"
            strokeDasharray="3 4"
            opacity=".28"
          />

          <path
            d="M50 20V99"
            strokeDasharray="3 4"
            opacity=".28"
          />

          <path d="M57 11V17M172 11V17" opacity=".28" />
          <path d="M47 20H53M47 99H53" opacity=".28" />
        </g>
      )}

      {/* =========================
          PROJETO ESPECIAL
      ========================== */}
      {tipo === "especial" && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* estrutura irregular */}
          <path d="M39 108V43L86 23H137L214 43V108Z" />

          {/* folhas */}
          <path d="M86 23V108" />
          <path d="M137 23V108" />
          <path d="M176 33V108" />

          <path d="M39 113H214" />

          <path
            d="M44 47L82 30V103H44Z"
            fill={vidro}
            fillOpacity=".035"
          />

          <path
            d="M91 28H132V103H91Z"
            fill={vidro}
            fillOpacity=".06"
          />

          <path
            d="M142 31L171 38V103H142Z"
            fill={vidro}
            fillOpacity=".045"
          />

          <path
            d="M181 41L209 47V103H181Z"
            fill={vidro}
            fillOpacity=".025"
          />

          {/* reflexos */}
          <path
            d="M50 57L69 39M97 50L113 32"
            opacity=".18"
          />

          {/* pequeno detalhe técnico */}
          <circle cx="103" cy="99" r="2.2" />
          <circle cx="121" cy="99" r="2.2" />

          <path
            d="M148 69H165M160 64L165 69L160 74"
            opacity=".4"
          />
        </g>
      )}
    </svg>
  );
}