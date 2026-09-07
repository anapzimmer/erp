"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { ArrowRight, ArrowUpRight, BarChart3, Building2, CalendarDays, CircleDollarSign, FileText, Plus, UserPlus, UsersRound, TrendingUp, Printer, Layers3 } from "lucide-react";
import styles from './dashboard.module.css';
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
    const nomePerfil = perfilUsuario?.nome_completo || perfilUsuario?.nome;

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
    () => resumo.serie30Dias.slice(-periodo),
    [resumo.serie30Dias, periodo],
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
      titulo: "Orçado neste mês",
      valor: formatarMoeda(resumo.faturamentoMensal),
      descricao: `${formatarMoeda(resumo.faturamentoHoje)} hoje`,
      icon: CircleDollarSign,
      cor: "#B45309",
      fundo: "#B4530912",
    },
    {
      titulo: `Orçado em ${periodo} dias`,
      valor: formatarMoeda(total7Dias),
      descricao: `${quantidade7Dias} orçamento(s)`,
      icon: TrendingUp,
      cor: "#6D28D9",
      fundo: "#6D28D912",
    },
  ];

  const acoesRapidas = [
    { titulo: 'Matriz de projetos', descricao: 'Escolha a tipologia e comece a calcular', href: '/matriz-projetos', icon: Layers3 },
    { titulo: 'Cadastrar cliente', descricao: 'Organize os contatos da sua vidraçaria', href: '/cadastros/clientes', icon: UserPlus },
    { titulo: 'Central de impressão', descricao: 'Prepare os documentos dos projetos', href: '/central-impressao', icon: Printer },
    { titulo: 'Relatórios de orçamentos', descricao: 'Consulte valores e registros', href: '/admin/relatorio.orcamento', icon: BarChart3 },
  ];

  return (
    <div className={styles.page}>
      <Header nomeEmpresa={nomeEmpresa} usuarioEmail={user.email} handleSignOut={signOut}/>
      <main className={styles.main}>
        <div className={styles.topline}><span>ESPAÇO DE TRABALHO <span>/</span> Visão geral</span><span><CalendarDays size={14}/>{dataFormatada}</span></div>
        <section className={styles.welcome}>
          <div><h1>{saudacao}, {nomeUsuario}<span>.</span></h1><p>Seus clientes, orçamentos e projetos em um só lugar.</p></div>
          <Link href="/matriz-projetos" className={styles.primary}><Plus size={18}/> Novo orçamento <ArrowUpRight size={17}/></Link>
        </section>
        <section className={styles.metrics} aria-label="Indicadores da empresa" aria-busy={carregandoResumo}>
          {cardsResumo.map((card, index) => { const Icon=card.icon; return <article key={card.titulo} className={`${styles.metric} ${index === 2 ? styles.featured : ''}`}><div className={styles.metricTitle}><span>{card.titulo}</span><Icon size={18}/></div><strong>{carregandoResumo ? '—' : card.valor}</strong><p>{carregandoResumo ? 'Carregando dados…' : card.descricao}</p></article>; })}
        </section>
        <section className={styles.projectGallery} aria-label="Projetos ilustrados">
          {[
            { name: 'Janelas', detail: 'Escolha a tipologia', href: '/matriz-projetos', kind: 'window' },
            { name: 'Box de banheiro', detail: 'Calcule vidros e materiais', href: '/box2fls', kind: 'box' },
            { name: 'Fechamento de sacada', detail: 'Planeje seu fechamento', href: '/calculo/fechamentosacada', kind: 'balcony' },
          ].map(project => <Link key={project.kind} href={project.href} className={styles.projectCard}>
            <svg viewBox="0 0 240 130" aria-hidden="true" className={styles.projectDrawing}>
              <g fill="none" stroke="currentColor" strokeWidth="1.3">
                <path className={styles.projectMeasure} d="M35 20H205M35 15V25M205 15V25"/>
                {project.kind === 'window' && <><rect x="35" y="35" width="170" height="80" rx="1"/><rect x="122" y="39" width="79" height="72" fill="currentColor" fillOpacity=".05"/><g className={styles.windowLeaf}><rect x="39" y="39" width="79" height="72" fill="currentColor" fillOpacity=".12"/><path d="M46 69V84M55 62L73 46M63 72L87 49"/></g><path d="M32 119H208"/></>}
                {project.kind === 'box' && <><path d="M65 30H182V115H65ZM61 119H188"/><rect x="126" y="34" width="52" height="77" fill="currentColor" fillOpacity=".05"/><g className={styles.boxLeaf}><rect x="69" y="34" width="53" height="77" fill="currentColor" fillOpacity=".12"/><path d="M76 66V81M80 51L92 40M88 58L103 43"/></g><path d="M171 46H156V56M151 61L149 67M157 61V68M163 61L165 67" opacity=".4"/></>}
                {project.kind === 'balcony' && <><path d="M31 33H209M31 115H209M36 33V115M204 33V115"/><rect x="40" y="38" width="39" height="72" fill="currentColor" fillOpacity=".05"/><g className={styles.balconyLeaves}><rect x="81" y="38" width="39" height="72" fill="currentColor" fillOpacity=".08"/><rect x="122" y="38" width="39" height="72" fill="currentColor" fillOpacity=".12"/><rect x="163" y="38" width="37" height="72" fill="currentColor" fillOpacity=".16"/><path d="M192 69V81"/></g><path d="M47 55L59 43M132 56L145 43" opacity=".4"/></>}
              </g>
            </svg>
            <div className={styles.projectCaption}><div><strong>{project.name}</strong><span>{project.detail}</span></div><ArrowUpRight size={18}/></div>
          </Link>)}
        </section>
        <div className={styles.columns}>
          <div className={styles.content}>
            <section className={styles.panel}>
              <div className={styles.panelHeading}><div><span className={styles.eyebrow}>ÚLTIMOS REGISTROS</span><h2>Orçamentos recentes</h2></div><Link href="/admin/relatorio.orcamento" className={styles.textLink}>Ver todos <ArrowUpRight size={15}/></Link></div>
              {carregandoResumo ? <div className={styles.empty}>Carregando orçamentos…</div> : resumo.recentes.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Orçamento / cliente</th><th>Criado</th><th>Valor</th></tr></thead><tbody>{resumo.recentes.map(item => <tr key={item.id}><td><div className={styles.record}><span className={styles.recordIcon}><FileText size={17}/></span><div><strong>{item.numero_formatado || 'Sem número'}</strong><span>{item.cliente_nome || 'Cliente não informado'}</span></div></div></td><td>{formatarRelativo(item.created_at)}</td><td>{formatarMoeda(Number(item.valor_total)||0)}</td></tr>)}</tbody></table></div> : <div className={styles.empty}><FileText size={26}/><strong>Nenhum orçamento cadastrado.</strong><p>Seus registros mais recentes ficarão disponíveis aqui.</p><Link href="/matriz-projetos">Começar agora <ArrowRight size={14}/></Link></div>}
            </section>
            <section className={styles.panel}>
              <div className={styles.panelHeading}><div><span className={styles.eyebrow}>ATIVIDADE COMERCIAL</span><h2>Evolução dos orçamentos</h2></div><div className={styles.period} role="group" aria-label="Período do gráfico">{([7,30] as const).map(dias => <button key={dias} type="button" aria-pressed={periodo === dias} onClick={() => setPeriodo(dias)}>{dias} dias</button>)}</div></div>
              <div className={styles.chartSummary}><strong>{carregandoResumo ? '—' : formatarMoeda(total7Dias)}</strong><span>{quantidade7Dias} orçamento(s) no período</span></div>
              <div className={styles.chart}>
                {carregandoResumo ? <div className={styles.empty}>Carregando atividade…</div> : serie7Dias.every(item => item.total === 0) ? <div className={styles.empty}><BarChart3 size={28}/><strong>Nenhum valor orçado neste período.</strong><p>Selecione outro período ou crie um orçamento.</p><Link href="/matriz-projetos">Criar orçamento <ArrowRight size={14}/></Link></div> : <>
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={`Valor orçado por dia nos últimos ${periodo} dias`}><defs><linearGradient id="dashboardChartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#39b89f" stopOpacity=".25"/><stop offset="100%" stopColor="#39b89f" stopOpacity="0"/></linearGradient></defs>{[0,10,20,30,40].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#dce9e4" strokeWidth=".3" strokeDasharray="1 1"/>)}<polygon points={areaGrafico} fill="url(#dashboardChartGradient)"/><polyline points={pontosGrafico} fill="none" stroke="#329d86" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/></svg>
                  <div className={`${styles.chartDays} ${periodo === 30 ? styles.monthDays : ""}`}>{serie7Dias.map(item => <div key={item.dia} tabIndex={0} title={`${item.dia}: ${formatarMoeda(item.total)} · ${item.quantidade} orçamento(s)`}><span>{new Date(`${item.dia}T12:00:00`).toLocaleDateString('pt-BR',periodo === 30 ? {day:'2-digit',month:'2-digit'} : {weekday:'short'})}</span><small>{formatarMoeda(item.total)}</small></div>)}</div>
                </>}
              </div>
              <p className={styles.chartNote}>Valores de orçamentos criados no período; não representam pagamentos recebidos.</p>
            </section>
          </div>
          <aside className={styles.aside}>
            <section className={styles.today}><span className={styles.eyebrow}>MOVIMENTO DO DIA</span><h2>Resumo de hoje</h2><p>Orçamentos criados pela sua empresa hoje.</p><div className={styles.todayNumbers}><div><strong>{carregandoResumo ? '—' : resumo.orcamentosHoje}</strong><span>orçamentos criados</span></div><div><strong>{carregandoResumo ? '—' : formatarMoeda(resumo.faturamentoHoje)}</strong><span>valor orçado hoje</span></div></div><Link href="/admin/relatorio.orcamento">Consultar orçamentos <ArrowRight size={16}/></Link></section>
            <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>FERRAMENTAS</span><h2>Acesso rápido</h2></div></div><nav aria-label="Ações rápidas" className={styles.actions}>{acoesRapidas.map(acao => {const Icon=acao.icon;return <Link key={acao.href} href={acao.href}><span className={styles.actionIcon}><Icon size={19}/></span><span><strong>{acao.titulo}</strong><small>{acao.descricao}</small></span><ArrowUpRight size={15}/></Link>})}</nav></section>
            <div className={styles.company}><Building2 size={19}/><div><span>SUA VIDRAÇARIA</span><strong>{nomeEmpresa}</strong></div></div>
          </aside>
        </div>
        <footer className={styles.footer}>GLASSCODE <span>Gestão com clareza. Projetos com precisão.</span></footer>
      </main>
    </div>
  );
}