//app/admin/relatorio.orcamento/page.tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "@/context/ThemeContext"
import { supabase } from "@/lib/supabaseClient"
import {
    Search,
    Calendar,
    PencilLine,
    Trash2,
    X,
    ClipboardList,
    Filter,
    CalendarDays,
    CalendarRange,
    CalendarClock,
    Eye,
    UserRound,
    Building2,
    Clock3,
    FileText,
    RefreshCcw,
} from "lucide-react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import { CalculoVidroPDF } from "@/app/relatorios/calculovidros/CalculoVidroPDF"
import { RelatorioObraPDF } from "@/app/relatorios/calculovidros/RelatorioObraPDF"
import { TemperaPDF } from "@/app/relatorios/calculovidros/TemperaPDF"
import { EspelhosPDF } from "@/app/relatorios/espelhos/EspelhosPDF"
import { SacadaFrontalPDF } from "@/app/relatorios/sacadafrontal/SacadaFrontalPDF"
import { PeleDeVidroPDF } from "@/app/relatorios/peledevidro/PeleDeVidroPDF"
import { ProjetoIndividualPDF, type ProjetoIndividualDados } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF"
import { CentralImpressaoPDF, type CentralImpressaoItem, type CentralOtimizacaoPerfil } from "@/app/relatorios/centralimpressao/CentralImpressaoPDF"
import { calcularSacadaFrontal } from "@/utils/sacada-frontal-calc"
import { PDFViewer } from '@react-pdf/renderer';

type OrcamentoItem = {
    id: string | number;
    descricao: string;
    tipo?: string;
    acabamento?: string;
    servicos?: string;
    medidaReal: string;
    medidaCalc: string;
    qtd: number;
    total: number;
    planoCorte?: Array<{
        numero: number;
        cortes: number[];
        usadoMm: number;
        sobraMm: number;
    }>;
};
type Orcamento = {
    id: string;
    numero_formatado?: string | null;
    cliente_nome: string;
    obra_referencia?: string | null;
    created_at: string;
    excluir_em: string;
    valor_total?: number | string | null;
    peso_total?: number | string | null;
    metragem_total?: number | string | null;
    total_pecas?: number | string | null;
    itens?: OrcamentoItem[] | Record<string, unknown>;
};

type OrcamentoCalculoprojetoPersistido = {
    tipo?: string;
    comercial?: {
        itens?: OrcamentoItem[];
        metragemTotal?: number | string | null;
        totalPecas?: number | string | null;
    };
    tecnico?: {
        relatorioObra?: Array<Record<string, unknown>>;
        otimizacaoGlobal?: Array<Record<string, unknown>>;
    };
    tempera?: {
        itens?: Array<{
            id: string | number;
            descricao: string;
            desenhoUrl?: string;
            corVidro?: string;
            vao?: string;
            qtd?: number;
        }>;
    };
};

type OrcamentoProjetosPersistido = {
    tipo?: string;
    cliente?: string;
    obra?: string;
    projetos?: Array<CentralImpressaoItem & {
        largura?: number;
        altura?: number;
        corPerfil?: string;
    }>;
    projetosOtimizados?: Array<CentralImpressaoItem & {
        largura?: number;
        altura?: number;
        corPerfil?: string;
    }>;
    otimizacaoPerfis?: CentralOtimizacaoPerfil[];
};

type PerfilCadastro = {
    codigo?: string | null;
    nome?: string | null;
    preco_unitario?: number | string | null;
    barra_padrao_mm?: number | string | null;
    unidade?: string | null;
    kgmt?: number | string | null;
    preco?: number | string | null;
};

type AcessorioCadastro = {
    codigo?: string | null;
    nome?: string | null;
    preco?: number | string | null;
    pacote?: number | string | null;
    unidade?: string | null;
};

type PelePerfilItem = {
    nome?: string;
    codigo?: string;
    unidade?: string;
    kgmt?: number | string;
    metroLinear?: number;
    barras?: number;
    kgTotal?: number;
    precoBarra?: number;
    valorTotal?: number;
};

type PeleAcessorioItem = {
    nome?: string;
    codigo?: string;
    unidade?: string;
    quantidade?: number;
    precoUnitario?: number;
    valorTotal?: number;
};

type PelePerfisProp = Parameters<typeof PeleDeVidroPDF>[0]["perfis"];
type PeleAcessoriosProp = Parameters<typeof PeleDeVidroPDF>[0]["acessorios"];
type SacadaPerfisProp = Parameters<typeof SacadaFrontalPDF>[0]["perfis"];
type SacadaAcessoriosProp = Parameters<typeof SacadaFrontalPDF>[0]["acessorios"];
type RelatorioObraProp = Parameters<typeof RelatorioObraPDF>[0]["relatorioObra"];
type OtimizacaoGlobalProp = Parameters<typeof RelatorioObraPDF>[0]["otimizacaoGlobal"];

export default function RelatorioOrcamento() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { theme } = useTheme()

    // Estados de Layout
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [expandido, setExpandido] = useState(true)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [usuarioEmail, setUsuarioEmail] = useState("")
    const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...")
    const [empresaIdAtual, setEmpresaIdAtual] = useState<string | null>(null)
    const [logoEmpresaPdf, setLogoEmpresaPdf] = useState<string | null>(null)

    // Estados de Dados
    const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
    const [filtro, setFiltro] = useState("")
    const [loadingDados, setLoadingDados] = useState(true)
    const [perfisDb, setPerfisDb] = useState<PerfilCadastro[]>([]);
    const [acessoriosDb, setAcessoriosDb] = useState<AcessorioCadastro[]>([]);
    useEffect(() => {
        if (!empresaIdAtual) return;
        const buscarCadastros = async () => {
            const { data: perfisData } = await supabase.from("perfis").select("*").eq("empresa_id", empresaIdAtual);
            setPerfisDb((perfisData as PerfilCadastro[] | null) || []);
            const { data: acessoriosData } = await supabase.from("ferragens").select("*").eq("empresa_id", empresaIdAtual);
            setAcessoriosDb((acessoriosData as AcessorioCadastro[] | null) || []);
        };
        buscarCadastros();
    }, [empresaIdAtual]);

    // Estados para Seleção e Modal
    const [selecionados, setSelecionados] = useState<string[]>([]);
    const [, setItemParaExcluir] = useState<Orcamento | null>(null);
    const [modalConfirmacao, setModalConfirmacao] = useState<{
        titulo: string;
        mensagem: string;
        confirmar?: () => void;
        tipo?: "sucesso" | "erro" | "aviso";
        labelConfirmar?: string;
        labelCancelar?: string;
    } | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [orcamentoParaVisualizar, setOrcamentoParaVisualizar] = useState<Orcamento | null>(null);
    const [tipoPreviewCalculoprojeto, setTipoPreviewCalculoprojeto] = useState<"comercial" | "tecnico" | "tempera">("comercial");

    useEffect(() => {
        setTipoPreviewCalculoprojeto("comercial");
    }, [orcamentoParaVisualizar?.id]);

    // Histórico de Totais
    const agora = new Date();
    const inicioSemana = new Date(agora);
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(agora.getDate() - agora.getDay());
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const totais = orcamentos.reduce((acc, orc) => {
        const dataOrc = new Date(orc.created_at);
        if (Number.isNaN(dataOrc.getTime())) return acc;
        const valor = Number(orc.valor_total) || 0;

        // Diário (hoje)
        if (dataOrc.toDateString() === agora.toDateString()) acc.diario += valor;
        // Semanal
        if (dataOrc >= inicioSemana) acc.semanal += valor;
        // Mensal
        if (dataOrc >= inicioMes) acc.mensal += valor;

        return acc;
    }, { diario: 0, semanal: 0, mensal: 0 });

    const handleDelete = async (idsParaDeletar: string[]) => {
        if (idsParaDeletar.length === 0) {
            setModalConfirmacao({
                titulo: "Atenção",
                mensagem: "Nenhum Orçamento foi selecionado para exclusão.",
                tipo: "aviso",
            });
            return;
        }

        try {
            if (!empresaIdAtual) {
                setModalConfirmacao({
                    titulo: "Atenção",
                    mensagem: "Empresa não identificada para exclusão.",
                    tipo: "aviso",
                });
                return;
            }

            const { error } = await supabase
                .from('orcamentos')
                .delete()
                .eq('empresa_id', empresaIdAtual)
                .in('id', idsParaDeletar);

            if (error) throw error;

            setOrcamentos(prev => prev.filter(o => !idsParaDeletar.includes(o.id)));
            setSelecionados([]);
            setModalConfirmacao(null);
            setItemParaExcluir(null);
            setOrcamentoParaVisualizar((atual) => (atual && idsParaDeletar.includes(atual.id) ? null : atual));
            setShowPDFModal((aberto) => {
                if (!aberto) return aberto;
                return orcamentoParaVisualizar ? !idsParaDeletar.includes(orcamentoParaVisualizar.id) : aberto;
            });

            // AVISO DISCRETO:
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000); // Some após 3 segundos

        } catch (error) {
            console.error("Erro ao deletar:", error);
            const mensagemErro = error instanceof Error ? error.message : "Tente novamente.";
            setModalConfirmacao({
                titulo: "Erro ao excluir",
                mensagem: `Não foi possível excluir o(s) registro(s). ${mensagemErro}`,
                tipo: "erro",
            });
        }
    };

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

                if (perfil?.empresa_id) {
                    setEmpresaIdAtual(perfil.empresa_id);

                    const { data: empresaData } = await supabase
                        .from("empresas")
                        .select("nome")
                        .eq("id", perfil.empresa_id)
                        .single();
                    if (empresaData) setNomeEmpresa(empresaData.nome);

                    const { data: brandingData } = await supabase
                        .from("configuracoes_branding")
                        .select("logo_light")
                        .eq("empresa_id", perfil.empresa_id)
                        .limit(1)
                        .maybeSingle();

                    setLogoEmpresaPdf(brandingData?.logo_light || null);
                }

                const { data: orcData, error } = await supabase
                    .from('orcamentos')
                    .select(`*`)
                    .eq('empresa_id', perfil?.empresa_id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error("Detalhes do erro Supabase:", error); // Isso vai revelar o problema real
                    throw error;
                }

                if (orcData) {
                    setOrcamentos(orcData);
                }

            } catch (error) {
                console.error("Erro ao carregar histórico:", error);
            } finally {
                setCheckingAuth(false);
                setLoadingDados(false);
            }
        };
        fetchData();
    }, [router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    // 1. Adicione estes novos estados
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");

    const parseDataInputLocal = (valor: string) => {
        const [anoStr, mesStr, diaStr] = valor.split("-");
        const ano = Number(anoStr);
        const mes = Number(mesStr);
        const dia = Number(diaStr);
        if (!ano || !mes || !dia) return null;
        const data = new Date(ano, mes - 1, dia);
        return Number.isNaN(data.getTime()) ? null : data;
    };

    const aplicarPeriodoRapido = useCallback((dias: number) => {
        const formatarData = (data: Date) => {
            const ano = data.getFullYear();
            const mes = String(data.getMonth() + 1).padStart(2, "0");
            const dia = String(data.getDate()).padStart(2, "0");
            return `${ano}-${mes}-${dia}`;
        };

        const fim = new Date();
        fim.setHours(0, 0, 0, 0);
        const inicio = new Date(fim);
        inicio.setDate(fim.getDate() - (dias - 1));

        setDataInicio(formatarData(inicio));
        setDataFim(formatarData(fim));
    }, []);

    useEffect(() => {
        const periodo = searchParams.get("periodo");
        const filtroInicial = searchParams.get("filtro") || "";

        if (filtroInicial) {
            setFiltro(filtroInicial);
        }

        if (periodo === "30d") {
            aplicarPeriodoRapido(30);
        }

        if (periodo === "7d") {
            aplicarPeriodoRapido(7);
        }
    }, [aplicarPeriodoRapido, searchParams]);

    // 2. Atualize o seu filtro
    const inicioPeriodo = dataInicio ? parseDataInputLocal(dataInicio) : null;
    const fimPeriodo = dataFim ? parseDataInputLocal(dataFim) : null;

    const inicioPeriodoTs = inicioPeriodo ? inicioPeriodo.getTime() : null;
    const fimPeriodoTs = fimPeriodo
        ? new Date(fimPeriodo.getFullYear(), fimPeriodo.getMonth(), fimPeriodo.getDate(), 23, 59, 59, 999).getTime()
        : null;

    const periodoInicioFinal = inicioPeriodoTs != null && fimPeriodoTs != null
        ? Math.min(inicioPeriodoTs, fimPeriodoTs)
        : inicioPeriodoTs;

    const periodoFimFinal = inicioPeriodoTs != null && fimPeriodoTs != null
        ? Math.max(inicioPeriodoTs, fimPeriodoTs)
        : fimPeriodoTs;

    const orcamentosFiltrados = orcamentos.filter(orc => {
        const termo = filtro.toLowerCase();
        const dataOrcTs = new Date(orc.created_at).getTime();
        if (Number.isNaN(dataOrcTs)) return false;

        const dentroDoPeriodo = (periodoInicioFinal == null || dataOrcTs >= periodoInicioFinal) &&
            (periodoFimFinal == null || dataOrcTs <= periodoFimFinal);

        return (
            dentroDoPeriodo &&
            (orc.cliente_nome?.toLowerCase().includes(termo) ||
                orc.obra_referencia?.toLowerCase().includes(termo) ||
                orc.numero_formatado?.toLowerCase().includes(termo))
        );
    });

    const calcularDiasRestantes = (dataExcluir: string) => {
        if (!dataExcluir) return 0;
        const hoje = new Date();
        const expira = new Date(dataExcluir);
        if (Number.isNaN(expira.getTime())) return 0;
        const diffTime = expira.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const valorTotalOrcamentos = orcamentos.reduce(
        (total, orcamento) => total + (Number(orcamento.valor_total) || 0),
        0
    );

    const limparFiltros = () => {
        setFiltro("");
        setDataInicio("");
        setDataFim("");
    };

    const handleEditarOrcamento = (orc: Orcamento) => {
        const numero = String(orc.numero_formatado || "");
        const ehSacada = /^SAC/i.test(numero);
        const ehEspelho = /^OR(?!C)/i.test(numero);
        const itensObj = orc.itens && !Array.isArray(orc.itens) ? orc.itens : undefined;
        const tipoItem = typeof itensObj?.tipo === "string" ? itensObj.tipo : "";
        const returnTo = encodeURIComponent("/admin/relatorio.orcamento");

        const rotasPorTipo: Record<string, string> = {
            fechamento_sacada: `/calculo/fechamentosacada?edit=${orc.id}&returnTo=${returnTo}`,
            pele_de_vidro: `/calculo/peledevidro?edit=${orc.id}&returnTo=${returnTo}`,
            pfv1f_kit: `/pfv1f-kit?edit=${orc.id}&returnTo=${returnTo}`,
            pfv1f_barra: `/pfv1f-barra?edit=${orc.id}&returnTo=${returnTo}`,
            pfv2f_kit: `/pfv2f-kit?edit=${orc.id}&returnTo=${returnTo}`,
            pfv2f_barra: `/pfv2f-barra?edit=${orc.id}&returnTo=${returnTo}`,
            pc2f_kit: `/pc2f-kit?edit=${orc.id}&returnTo=${returnTo}`,
            pc2f_barra: `/pc2f-barra?edit=${orc.id}&returnTo=${returnTo}`,
            pc2fcb: `/pc2fcb?edit=${orc.id}&returnTo=${returnTo}`,
            pc2fcb_kit: `/pc2fcb-kit?edit=${orc.id}&returnTo=${returnTo}`,
            pc4fcb: `/pc4fcb?edit=${orc.id}&returnTo=${returnTo}`,
            pc4fcb_kit: `/pc4fcb-kit?edit=${orc.id}&returnTo=${returnTo}`,
            pc4f_kit: `/pc4f-kit?edit=${orc.id}&returnTo=${returnTo}`,
            pc4f_barra: `/pc4f-barra?edit=${orc.id}&returnTo=${returnTo}`,
            jc2f_kit: `/jc2f-kit?edit=${orc.id}&returnTo=${returnTo}`,
            jc2f_barra: `/jc2f-barra?edit=${orc.id}&returnTo=${returnTo}`,
            jc2fcs: `/jc2fcs?edit=${orc.id}&returnTo=${returnTo}`,
            jc2fcs_kit: `/jc2fcs-kit?edit=${orc.id}&returnTo=${returnTo}`,
            jc4f_kit: `/jc4f-kit?edit=${orc.id}&returnTo=${returnTo}`,
            jc4f_barra: `/jc4f-barra?edit=${orc.id}&returnTo=${returnTo}`,
            jc4fcs: `/jc4fcs?edit=${orc.id}&returnTo=${returnTo}`,
            jc4fcs_kit: `/jc4fcs-kit?edit=${orc.id}&returnTo=${returnTo}`,
            pg_1f: `/pg?edit=${orc.id}&returnTo=${returnTo}`,
            pg_2f: `/pg2f?edit=${orc.id}&returnTo=${returnTo}`,
            pgf: `/pgf?edit=${orc.id}&returnTo=${returnTo}`,
            max: `/max?edit=${orc.id}&returnTo=${returnTo}`,
            fixos: `/fixos?edit=${orc.id}&returnTo=${returnTo}`,
            pma2f: `/pma2f?edit=${orc.id}&returnTo=${returnTo}`,
            pma3f: `/pma3f?edit=${orc.id}&returnTo=${returnTo}`,
            pma4f: `/pma4f?edit=${orc.id}&returnTo=${returnTo}`,
            pma5f: `/pma5f?edit=${orc.id}&returnTo=${returnTo}`,
            pma6f: `/pma6f?edit=${orc.id}&returnTo=${returnTo}`,
            pma2f4m: `/pma2f4m?edit=${orc.id}&returnTo=${returnTo}`,
            box2fls: `/box2fls?edit=${orc.id}&returnTo=${returnTo}`,
            boxcanto3f: `/boxcanto3f?edit=${orc.id}&returnTo=${returnTo}`,
            boxcanto: `/boxcanto?edit=${orc.id}&returnTo=${returnTo}`,
            deslizante2f: `/deslizante2f?edit=${orc.id}&returnTo=${returnTo}`,
            deslizante3f: `/deslizante3f?edit=${orc.id}&returnTo=${returnTo}`,
            deslizante4f: `/deslizante4f?edit=${orc.id}&returnTo=${returnTo}`,
            deslizante5f: `/deslizante5f?edit=${orc.id}&returnTo=${returnTo}`,
            deslizante6f: `/deslizante6f?edit=${orc.id}&returnTo=${returnTo}`,
            orcamento_projetos: `/central-impressao?edit=${orc.id}`,
        };

        let rotaEdicao = rotasPorTipo[tipoItem];

        if (!rotaEdicao) {
            if (ehSacada) {
                rotaEdicao = `/calculo/sacadafrontal?edit=${orc.id}&returnTo=${returnTo}`;
            } else if (ehEspelho) {
                rotaEdicao = `/calculo/espelhos?edit=${orc.id}&returnTo=${returnTo}`;
            } else {
                rotaEdicao = `/calculo/calculovidro?edit=${orc.id}&returnTo=${returnTo}`;
            }
        }

        router.push(rotaEdicao);
    };

    if (checkingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: theme.menuIconColor, borderBottomColor: theme.menuIconColor, borderLeftColor: theme.menuIconColor }}></div>
            </div>
        );
    }

    const itensRaw = orcamentoParaVisualizar?.itens;
    const itensPersistidos = (!Array.isArray(itensRaw) && itensRaw && typeof itensRaw === "object")
        ? itensRaw as OrcamentoCalculoprojetoPersistido
        : null;
    const ehOrcamentoCalculoprojeto = itensPersistidos?.tipo === "calculoprojeto";
    const itens: OrcamentoItem[] = Array.isArray(itensRaw)
        ? itensRaw
        : Array.isArray(itensPersistidos?.comercial?.itens)
            ? itensPersistidos.comercial.itens
            : [];
    const metragemTotalVisualizacao = ehOrcamentoCalculoprojeto
        ? Number(itensPersistidos?.comercial?.metragemTotal) || 0
        : Number(orcamentoParaVisualizar?.metragem_total) || 0;
    const totalPecasVisualizacao = ehOrcamentoCalculoprojeto
        ? Number(itensPersistidos?.comercial?.totalPecas) || itens.reduce((acc, item) => acc + Number(item.qtd || 0), 0)
        : Number(orcamentoParaVisualizar?.total_pecas) || itens.reduce((acc, item) => acc + Number(item.qtd || 0), 0);
    const relatorioTecnicoVisualizacao = Array.isArray(itensPersistidos?.tecnico?.relatorioObra)
        ? itensPersistidos.tecnico.relatorioObra
        : [];
    const otimizacaoTecnicaVisualizacao = Array.isArray(itensPersistidos?.tecnico?.otimizacaoGlobal)
        ? itensPersistidos.tecnico.otimizacaoGlobal
        : [];
    const itensTemperaVisualizacao = Array.isArray(itensPersistidos?.tempera?.itens)
        ? itensPersistidos.tempera.itens
        : [];
    const ehSacadaVisualizar = /^SAC/i.test(String(orcamentoParaVisualizar?.numero_formatado || ""));

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>

            <Sidebar
                showMobileMenu={showMobileMenu}
                setShowMobileMenu={setShowMobileMenu}
                nomeEmpresa={nomeEmpresa}
                expandido={expandido}
                setExpandido={setExpandido}
            />

            {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>}

            <div className="flex-1 flex flex-col w-full">
                <Header
                    setShowMobileMenu={setShowMobileMenu}
                    nomeEmpresa={nomeEmpresa}
                    usuarioEmail={usuarioEmail}
                    handleSignOut={handleSignOut}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-7 xl:p-9">
                    <div className="mx-auto max-w-[1600px] space-y-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div
                                    className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"
                                    style={{ color: theme.menuIconColor }}
                                >
                                    <ClipboardList size={15} />
                                    Orçamentos
                                </div>
                                <h1
                                    className="text-2xl font-black tracking-tight md:text-3xl"
                                    style={{ color: theme.contentTextLightBg }}
                                >
                                    Histórico de Orçamentos
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Consulte, filtre e gerencie os orçamentos cadastrados.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => router.push("/calculo/calculovidro")}
                                className="inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-theme.primaryColor shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                style={{ backgroundColor: theme.menuIconColor }}
                            >
                                <FileText size={17} />
                                Novo orçamento
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: "Valor total", valor: valorTotalOrcamentos, icon: ClipboardList, color: theme.menuIconColor },
                                { label: "Orçado hoje", valor: totais.diario, icon: CalendarDays, color: "#0f8b8d" },
                                { label: "Orçado na semana", valor: totais.semanal, icon: CalendarRange, color: "#587ca5" },
                                { label: "Orçado no mês", valor: totais.mensal, icon: CalendarClock, color: "#7c6bb3" },
                            ].map((item) => {
                                const Icone = item.icon;
                                return (
                                    <div
                                        key={item.label}
                                        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_25px_-20px_rgba(15,23,42,0.45)]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                                                style={{ backgroundColor: `${item.color}12`, color: item.color }}
                                            >
                                                <Icone size={22} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                                                <p
                                                    className="mt-1 truncate text-xl font-black"
                                                    style={{ color: theme.contentTextLightBg }}
                                                >
                                                    {item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_-25px_rgba(15,23,42,0.55)] md:p-5">
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,1fr)_auto_auto_auto]">
                                <div className="relative">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={filtro}
                                        onChange={(event) => setFiltro(event.target.value)}
                                        placeholder="Pesquisar por número, cliente ou obra..."
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <button type="button" onClick={() => aplicarPeriodoRapido(1)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                                    Hoje
                                </button>
                                <button type="button" onClick={() => aplicarPeriodoRapido(7)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                                    7 dias
                                </button>
                                <button
                                    type="button"
                                    onClick={() => aplicarPeriodoRapido(30)}
                                    className="h-11 rounded-xl border px-4 text-sm font-bold transition"
                                    style={{ borderColor: `${theme.menuIconColor}55`, backgroundColor: `${theme.menuIconColor}0D`, color: theme.menuIconColor }}
                                >
                                    30 dias
                                </button>
                            </div>

                            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                                <div className="relative flex-1">
                                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Data inicial</span>
                                    <input
                                        type="date"
                                        value={dataInicio}
                                        onChange={(event) => setDataInicio(event.target.value)}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Data final</span>
                                    <input
                                        type="date"
                                        value={dataFim}
                                        onChange={(event) => setDataFim(event.target.value)}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                                {(filtro || dataInicio || dataFim) && (
                                    <button
                                        type="button"
                                        onClick={limparFiltros}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                    >
                                        <RefreshCcw size={16} />
                                        Limpar filtros
                                    </button>
                                )}
                            </div>
                        </section>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black" style={{ color: theme.contentTextLightBg }}>Orçamentos encontrados</h2>
                                    <span
                                        className="rounded-full px-2.5 py-1 text-xs font-bold"
                                        style={{ backgroundColor: `${theme.menuIconColor}12`, color: theme.menuIconColor }}
                                    >
                                        {orcamentosFiltrados.length}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">Os registros mais recentes aparecem primeiro.</p>
                            </div>

                            {selecionados.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setItemParaExcluir(null);
                                        setModalConfirmacao({
                                            titulo: "Confirmar exclusão",
                                            mensagem: `Você está prestes a excluir ${selecionados.length} registros selecionados.\nEsta ação não pode ser desfeita.`,
                                            confirmar: () => handleDelete([...selecionados]),
                                            labelConfirmar: "Excluir",
                                            labelCancelar: "Cancelar",
                                        });
                                    }}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                                >
                                    <Trash2 size={17} />
                                    Excluir selecionados ({selecionados.length})
                                </button>
                            )}
                        </div>

                        {loadingDados ? (
                            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-transparent" style={{ borderTopColor: theme.menuIconColor }} />
                                    <span className="text-sm font-medium text-slate-400">Sincronizando dados...</span>
                                </div>
                            </div>
                        ) : orcamentosFiltrados.length === 0 ? (
                            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
                                <div className="flex max-w-sm flex-col items-center text-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Filter size={22} /></div>
                                    <h3 className="mt-4 font-bold text-slate-700">Nenhum orçamento encontrado</h3>
                                    <p className="mt-1 text-sm text-slate-400">Limpe a pesquisa ou altere o período para visualizar outros registros.</p>
                                    <button type="button" onClick={limparFiltros} className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Limpar filtros</button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                {orcamentosFiltrados.map((orc) => {
                                    const dias = calcularDiasRestantes(orc.excluir_em);
                                    const expiraHoje = dias === 0;
                                    const urgente = dias > 0 && dias <= 15;
                                    const selecionado = selecionados.includes(orc.id);
                                    const valorFormatado = (Number(orc.valor_total) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

                                    return (
                                        <article
                                            key={orc.id}
                                            className={`group relative overflow-hidden rounded-2xl border bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${selecionado ? "border-emerald-300 ring-4 ring-emerald-50" : "border-slate-200/90 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.7)]"}`}
                                        >
                                            <div
                                                className="absolute left-0 top-0 h-full w-1"
                                                style={{ backgroundColor: expiraHoje ? "#ef4444" : urgente ? "#f59e0b" : theme.menuIconColor }}
                                            />

                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selecionado}
                                                        onChange={() => setSelecionados((atuais) => atuais.includes(orc.id) ? atuais.filter((id) => id !== orc.id) : [...atuais, orc.id])}
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                                                        aria-label={`Selecionar orçamento ${orc.numero_formatado}`}
                                                    />
                                                    <div>
                                                        <p className="font-mono text-sm font-black tracking-tight" style={{ color: theme.contentTextLightBg }}>{orc.numero_formatado || "Sem número"}</p>
                                                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">ID #{String(orc.id).slice(0, 6)}</p>
                                                    </div>
                                                </div>
                                                <span
                                                    className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                                                    style={{
                                                        backgroundColor: expiraHoje ? "#fef2f2" : urgente ? "#fffbeb" : `${theme.menuIconColor}12`,
                                                        color: expiraHoje ? "#dc2626" : urgente ? "#d97706" : theme.menuIconColor,
                                                    }}
                                                >
                                                    {expiraHoje ? "Expira hoje" : urgente ? "Atenção" : "Ativo"}
                                                </span>
                                            </div>

                                            <div className="mt-5">
                                                <div className="flex items-center gap-2">
                                                    <UserRound size={16} className="shrink-0 text-slate-400" />
                                                    <h3 className="truncate text-sm font-black" style={{ color: theme.contentTextLightBg }}>{orc.cliente_nome || "Cliente não informado"}</h3>
                                                </div>
                                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                    <Building2 size={15} className="shrink-0 text-slate-400" />
                                                    <span className="truncate">{orc.obra_referencia || "Projeto geral"}</span>
                                                </div>
                                            </div>

                                            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50/80 p-3">
                                                <div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Calendar size={13} />Criado em</div>
                                                    <p className="mt-1 text-xs font-bold text-slate-600">{new Date(orc.created_at).toLocaleDateString("pt-BR")}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor</p>
                                                    <p className="mt-1 text-sm " style={{ color: theme.primaryColor }}>{valorFormatado}</p>
                                                </div>
                                            </div>

                                            <div className={`mt-4 flex items-center gap-2 text-xs font-bold ${expiraHoje ? "text-red-600" : urgente ? "text-amber-600" : "text-slate-500"}`}>
                                                <Clock3 size={15} />
                                                {expiraHoje ? "Este orçamento expira hoje" : `Expira em ${dias} ${dias === 1 ? "dia" : "dias"}`}
                                            </div>

                                            <div className="mt-5 flex items-center border-t border-slate-100 pt-4">
                                                <div className="flex flex-1 items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOrcamentoParaVisualizar(orc);
                                                            setTipoPreviewCalculoprojeto("comercial");
                                                            setShowPDFModal(true);
                                                        }}
                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                                        title="Visualizar orçamento"
                                                    >
                                                        <Eye size={15} />Visualizar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditarOrcamento(orc)}
                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                                        title="Editar orçamento"
                                                    >
                                                        <PencilLine size={15} />Editar
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setItemParaExcluir(orc);
                                                        setModalConfirmacao({
                                                            titulo: "Confirmar exclusão",
                                                            mensagem: `Você está prestes a excluir o Orçamento ${orc.numero_formatado}.\nEsta ação não pode ser desfeita.`,
                                                            confirmar: () => handleDelete([orc.id]),
                                                            labelConfirmar: "Excluir",
                                                            labelCancelar: "Cancelar",
                                                        });
                                                    }}
                                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                                    title="Excluir orçamento"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        {!loadingDados && orcamentosFiltrados.length > 0 && (
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                                <span className="text-xs font-semibold text-slate-400">Exibindo {orcamentosFiltrados.length} de {orcamentos.length} orçamentos</span>
                                {(filtro || dataInicio || dataFim) && (
                                    <button type="button" onClick={limparFiltros} className="text-xs font-bold" style={{ color: theme.menuIconColor }}>Mostrar todos</button>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <CadastrosAvisoModal
                aviso={modalConfirmacao}
                onClose={() => {
                    setModalConfirmacao(null);
                    setItemParaExcluir(null);
                }}
                colors={{
                    bg: theme.modalBackgroundColor,
                    text: theme.modalTextColor,
                    primaryButtonBg: theme.modalButtonBackgroundColor,
                    primaryButtonText: theme.modalButtonTextColor,
                    success: theme.modalIconSuccessColor,
                    error: theme.modalIconErrorColor,
                    warning: theme.modalIconWarningColor,
                }}
            />
            {/* TOAST DISCRETO - PADR?O ERP */}
            {showToast && (
                <div className="fixed bottom-8 right-8 z-110 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div
                        className="flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border border-white/10"
                        style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                    >
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner"
                            style={{ backgroundColor: `${theme.menuIconColor}20`, color: theme.menuIconColor }}
                        >
                            <Trash2 size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] tracking-tight uppercase">Sucesso</span>
                            <span className="text-[11px] opacity-70 font-medium">Excluído com sucesso!</span>
                        </div>
                    </div>
                </div>
            )}
            {showPDFModal && (
                <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up">
                        <div className="p-4 border-b bg-gray-50">
                            <div className="flex justify-between items-center gap-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                                    Visualização: {(/^OR(?!C)/i.test(orcamentoParaVisualizar?.numero_formatado || "")) ? "OR-" : "ORC-"}{orcamentoParaVisualizar?.numero_formatado?.replace(/^(OR|ORC)-/, '')}
                                </h3>
                                <button
                                    onClick={() => setShowPDFModal(false)}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {ehOrcamentoCalculoprojeto && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {[
                                        { id: "comercial", label: "Orçamento" },
                                        { id: "tecnico", label: "Relatório Técnico" },
                                        { id: "tempera", label: "Tempera" },
                                    ].map((aba) => (
                                        <button
                                            key={aba.id}
                                            type="button"
                                            onClick={() => setTipoPreviewCalculoprojeto(aba.id as "comercial" | "tecnico" | "tempera")}
                                            className="px-3 py-2 rounded-2xl text-xs font-black border transition-all"
                                            style={tipoPreviewCalculoprojeto === aba.id
                                                ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                                                : { backgroundColor: "#fff", color: "#64748b", borderColor: "#e5e7eb" }}
                                        >
                                            {aba.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 w-full h-full bg-gray-200">
                            <div className="flex-1 w-full h-full bg-gray-200">
                                <PDFViewer style={{ width: "100%", height: "100%" }}>
                                    {/* PDF da Pele de Vidro */}
                                    {(() => {
                                        const itensRaw = (orcamentoParaVisualizar?.itens && !Array.isArray(orcamentoParaVisualizar.itens))
                                            ? orcamentoParaVisualizar.itens as Record<string, unknown>
                                            : {};
                                        if (ehOrcamentoCalculoprojeto) {
                                            if (tipoPreviewCalculoprojeto === "tecnico") {
                                                return (
                                                    <RelatorioObraPDF
                                                        nomeEmpresa={nomeEmpresa}
                                                        logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                        nomeCliente={orcamentoParaVisualizar?.cliente_nome || ""}
                                                        nomeObra={orcamentoParaVisualizar?.obra_referencia || undefined}
                                                        themeColor={theme.contentTextLightBg}
                                                        relatorioObra={relatorioTecnicoVisualizacao as RelatorioObraProp}
                                                        otimizacaoGlobal={otimizacaoTecnicaVisualizacao as OtimizacaoGlobalProp}
                                                    />
                                                );
                                            }

                                            if (tipoPreviewCalculoprojeto === "tempera") {
                                                return (
                                                    <TemperaPDF
                                                        nomeEmpresa={nomeEmpresa}
                                                        logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                        nomeCliente={orcamentoParaVisualizar?.cliente_nome || ""}
                                                        nomeObra={orcamentoParaVisualizar?.obra_referencia || undefined}
                                                        themeColor={theme.contentTextLightBg}
                                                        itens={itensTemperaVisualizacao}
                                                    />
                                                );
                                            }
                                        }

                                        // Detecta se é pele de vidro
                                        const tipo = typeof itensRaw.tipo === "string" ? itensRaw.tipo : "";
                                        if (tipo === "orcamento_projetos") {
                                            const dadosProjetos = itensRaw as OrcamentoProjetosPersistido;
                                            const projetosOrigem = Array.isArray(dadosProjetos.projetosOtimizados) && dadosProjetos.projetosOtimizados.length > 0
                                                ? dadosProjetos.projetosOtimizados
                                                : dadosProjetos.projetos;
                                            const projetosPdf: CentralImpressaoItem[] = Array.isArray(projetosOrigem)
                                                ? projetosOrigem.map((item, index) => ({
                                                    id: String(item.id || index),
                                                    numero: String(item.numero || orcamentoParaVisualizar?.numero_formatado || ""),
                                                    projeto: item.projeto === "PFV1F - KIT"
                                                        ? "Porta de correr atrás do Vão - 1 folha"
                                                        : item.projeto === "PFV2F - KIT"
                                                            ? "Porta de correr atrás do vão - 2 folhas"
                                                            : item.projeto === "PC2F - KIT"
                                                                ? "Porta de correr 2 folhas"
                                                            : item.projeto === "PC4F - KIT"
                                                                ? "Porta de correr 4 folhas"
                                                            : item.projeto === "JC4F - KIT"
                                                                ? "Janela de correr 4 folhas"
                                                                : item.projeto === "JC2F - KIT"
                                                                    ? "Janela de correr 2 folhas"
                                                            : String(item.projeto || "Projeto"),
                                                    cliente: orcamentoParaVisualizar?.cliente_nome || String(dadosProjetos.cliente || item.cliente || ""),
                                                    medidas: item.medidas || `${Number(item.largura || 0)} x ${Number(item.altura || 0)} mm`,
                                                    largura: Number(item.largura || 0),
                                                    altura: Number(item.altura || 0),
                                                    quantidade: Number(item.quantidade || 0),
                                                    modo: String(item.modo || "Kit"),
                                                    desenhoUrl: String(item.desenhoUrl || ""),
                                                    vidro: item.vidro,
                                                    vidroBandeira: item.vidroBandeira,
                                                    corKit: item.corPerfil || item.corKit,
                                                    alturaAteTubo: item.alturaAteTubo,
                                                    tuboPerfil: item.tuboPerfil,
                                                    trilho: item.trilho,
                                                    puxador: item.puxador,
                                                    tamanhoPuxador: item.tamanhoPuxador,
                                                    trinco: item.trinco,
                                                    observacao: item.observacao,
                                                    pecasDivisao: item.pecasDivisao,
                                                    medidasDetalhadas: item.medidasDetalhadas,
                                                    vidrosAvulsos: item.vidrosAvulsos,
                                                    valorTotal: Number(item.valorTotal || 0),
                                                    materiais: item.materiais,
                                                }))
                                                : [];
                                            const otimizacaoPerfis = Array.isArray(dadosProjetos.otimizacaoPerfis)
                                                ? dadosProjetos.otimizacaoPerfis as CentralOtimizacaoPerfil[]
                                                : [];

                                            return (
                                                <CentralImpressaoPDF
                                                    itens={projetosPdf}
                                                    nomeEmpresa={nomeEmpresa}
                                                    logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                    numeroOrcamento={orcamentoParaVisualizar?.numero_formatado || undefined}
                                                    cliente={orcamentoParaVisualizar?.cliente_nome || String(dadosProjetos.cliente || "")}
                                                    obra={orcamentoParaVisualizar?.obra_referencia || String(dadosProjetos.obra || "")}
                                                    otimizacaoPerfis={otimizacaoPerfis}
                                                />
                                            );
                                        }

                                        if (tipo === "pfv1f_kit" || tipo === "pfv1f_barra" || tipo === "pfv2f_kit" || tipo === "pfv2f_barra" || tipo === "pc2f_kit" || tipo === "pc2f_barra" || tipo === "pc2fcb" || tipo === "pc2fcb_kit" || tipo === "pc4fcb" || tipo === "pc4fcb_kit" || tipo === "pc4f_kit" || tipo === "pc4f_barra" || tipo === "jc4f_kit" || tipo === "jc4f_barra" || tipo === "jc4fcs" || tipo === "jc4fcs_kit" || tipo === "jc2f_kit" || tipo === "jc2f_barra" || tipo === "jc2fcs" || tipo === "jc2fcs_kit" || tipo === "pg_1f" || tipo === "pg_2f" || tipo === "pgf" || tipo === "max" || tipo === "fixos" || tipo === "pma2f" || tipo === "pma3f" || tipo === "pma4f" || tipo === "pma5f" || tipo === "pma6f" || tipo === "pma2f4m" || tipo === "box2fls" || tipo === "boxcanto3f" || tipo === "boxcanto" || tipo === "deslizante2f" || tipo === "deslizante3f" || tipo === "deslizante4f" || tipo === "deslizante5f" || tipo === "deslizante6f") {
                                            const dadosPdf = itensRaw.dados && typeof itensRaw.dados === "object"
                                                ? itensRaw.dados as Partial<ProjetoIndividualDados>
                                                : {};
                                            const materiaisPdf = Array.isArray(itensRaw.materiais)
                                                ? itensRaw.materiais as ProjetoIndividualDados["materiais"]
                                                : [];

                                            return (
                                                <ProjetoIndividualPDF
                                                    logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                    dados={{
                                                        projeto: String(dadosPdf.projeto || (tipo === "max" ? "MAX" : tipo === "pgf" ? "Porta de giro com fixo lateral" : tipo === "jc4fcs" || tipo === "jc4fcs_kit" ? "Janela de correr 4 folhas com sacada inferior" : tipo === "jc2fcs" || tipo === "jc2fcs_kit" ? "Janela de correr 2 folhas com sacada inferior" : tipo === "pc4fcb" || tipo === "pc4fcb_kit" ? "Porta de correr 4 folhas com bandeira" : tipo === "pc2fcb" || tipo === "pc2fcb_kit" ? "Porta de correr 2 folhas com bandeira" : tipo === "deslizante6f" ? "Deslizante 6 folhas" : tipo === "deslizante5f" ? "Deslizante 5 folhas" : tipo === "deslizante4f" ? "Deslizante 4 folhas" : tipo === "deslizante3f" ? "Deslizante 3 folhas" : tipo === "deslizante2f" ? "Deslizante 2 folhas" : tipo === "boxcanto3f" ? "Box de canto 3 folhas" : tipo === "boxcanto" ? "Box de canto" : tipo === "box2fls" ? "Box 2 folhas" : tipo === "pma2f4m" ? "PMA2F4M" : tipo === "pma6f" ? "PMA6F" : tipo === "pma5f" ? "PMA5F" : tipo === "pma4f" ? "PMA4F" : tipo === "pma3f" ? "PMA3F" : tipo === "pma2f" ? "PMA2F" : tipo === "fixos" ? "Fixos" : tipo === "pg_2f" ? "PG - 2 folhas" : tipo === "pg_1f" ? "PG - 1 folha" : tipo === "jc4f_barra" ? "JC4F - BARRA" : tipo === "pc4f_barra" ? "PC4F - BARRA" : tipo === "jc2f_barra" ? "JC2F - BARRA" : tipo === "pc2f_barra" ? "PC2F - BARRA" : tipo === "pfv2f_barra" ? "PFV2F - BARRA" : tipo === "pfv1f_barra" ? "PFV1F - BARRA" : tipo === "jc2f_kit" ? "JC2F - KIT" : tipo === "jc4f_kit" ? "JC4F - KIT" : tipo === "pc4f_kit" ? "PC4F - KIT" : tipo === "pc2f_kit" ? "PC2F - KIT" : tipo === "pfv2f_kit" ? "PFV2F - KIT" : "PFV1F - KIT")),
                                                        numero: orcamentoParaVisualizar?.numero_formatado || String(dadosPdf.numero || ""),
                                                        data: String(dadosPdf.data || new Date(orcamentoParaVisualizar?.created_at || Date.now()).toLocaleDateString("pt-BR")),
                                                        cliente: orcamentoParaVisualizar?.cliente_nome || String(dadosPdf.cliente || ""),
                                                        largura: Number(dadosPdf.largura || 0),
                                                        altura: Number(dadosPdf.altura || 0),
                                                        alturaAteTubo: Number(dadosPdf.alturaAteTubo || 0),
                                                        quantidade: Number(dadosPdf.quantidade || 0),
                                                        trilho: String(dadosPdf.trilho || ""),
                                                        vidro: String(dadosPdf.vidro || ""),
                                                        vidroBandeira: String(dadosPdf.vidroBandeira || ""),
                                                        corKit: String(dadosPdf.corKit || ""),
                                                        tuboPerfil: String(dadosPdf.tuboPerfil || ""),
                                                        puxador: String(dadosPdf.puxador || ""),
                                                        tamanhoPuxador: String(dadosPdf.tamanhoPuxador || ""),
                                                        trinco: String(dadosPdf.trinco || ""),
                                                        pecasDivisao: Number(dadosPdf.pecasDivisao || 1),
                                                        observacao: String(dadosPdf.observacao || ""),
                                                        materiais: materiaisPdf,
                                                    }}
                                                />
                                            );
                                        }

                                        if (tipo === "pele_de_vidro") {
                                            // Mapeamento dos perfis
                                            const perfisOriginais = Array.isArray(itensRaw.perfis) ? itensRaw.perfis as PelePerfilItem[] : [];
                                            const perfisCorrigidos: PelePerfisProp = perfisOriginais.map((p) => {
                                                const cadastro = perfisDb.find((db) => db.codigo === p.codigo || db.nome === p.nome);
                                                let unidade = cadastro?.unidade ?? p.unidade ?? "6MT";
                                                const nome = (cadastro?.nome || p.nome || "").toLowerCase();
                                                if (nome.includes("cantoneira") || nome.includes("cunha")) unidade = "3MT";
                                                return {
                                                    ...p,
                                                    nome: cadastro?.nome || p.nome || "",
                                                    codigo: cadastro?.codigo || p.codigo || "",
                                                    kgmt: cadastro?.kgmt ?? p.kgmt ?? "-",
                                                    precoBarra: Number(cadastro?.preco ?? p.precoBarra ?? 0),
                                                    unidade,
                                                    metroLinear: Number(p.metroLinear || 0),
                                                    barras: Number(p.barras || 0),
                                                    kgTotal: Number(p.kgTotal || 0),
                                                    valorTotal: Number(p.valorTotal || 0),
                                                };
                                            });
                                            // Mapeamento dos acessórios
                                            const acessoriosOriginais = Array.isArray(itensRaw.acessorios) ? itensRaw.acessorios as PeleAcessorioItem[] : [];
                                            const acessoriosCorrigidos: PeleAcessoriosProp = acessoriosOriginais.map((a) => {
                                                const cadastro = acessoriosDb.find((db) => db.nome === a.nome);
                                                const precoUnitario = Number(cadastro?.preco ?? a.precoUnitario ?? 0);
                                                const quantidade = Number(a.quantidade || 0);
                                                return {
                                                    ...a,
                                                    codigo: cadastro?.codigo || a.codigo || "-",
                                                    unidade: cadastro?.unidade || a.unidade || "UN",
                                                    precoUnitario,
                                                    quantidade,
                                                    valorTotal: precoUnitario * quantidade,
                                                    nome: a.nome || "",
                                                };
                                            });
                                            return (
                                                <PeleDeVidroPDF
                                                    nomeEmpresa={nomeEmpresa}
                                                    logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                    themeColor={theme.contentTextLightBg}
                                                    textColor={theme.contentTextLightBg}
                                                    nomeCliente={orcamentoParaVisualizar?.cliente_nome || ""}
                                                    nomeObra={orcamentoParaVisualizar?.obra_referencia || "Geral"}
                                                    numeroOrcamento={orcamentoParaVisualizar?.numero_formatado || undefined}
                                                    larguraVaoMm={Number(itensRaw.larguraVaoMm) || 0}
                                                    alturaVaoMm={Number(itensRaw.alturaVaoMm) || 0}
                                                    quadrosHorizontal={Number(itensRaw.quadrosHorizontal) || 0}
                                                    quadrosVertical={Number(itensRaw.quadrosVertical) || 0}
                                                    quantidadeLajes={Number(itensRaw.quantidadeLajes) || 0}
                                                    quantidadeFachadas={Number(itensRaw.quantidadeFachadas) || 0}
                                                    quadrosFixos={Number(itensRaw.quadrosFixos) || 0}
                                                    quadrosMoveis={Number(itensRaw.quadrosMoveis) || 0}
                                                    vidroDescricao={String(itensRaw.vidroDescricao || "")}
                                                    areaVidro={Number(orcamentoParaVisualizar?.metragem_total) || 0}
                                                    totalVidro={(() => {
                                                        const total = Number(orcamentoParaVisualizar?.valor_total) || 0;
                                                        const totalPerfis = perfisCorrigidos.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0);
                                                        const totalAcessorios = acessoriosCorrigidos.reduce((acc, a) => acc + (Number(a.valorTotal) || 0), 0);
                                                        return Math.max(0, total - totalPerfis - totalAcessorios);
                                                    })()}
                                                    perfis={perfisCorrigidos}
                                                    acessorios={acessoriosCorrigidos}
                                                    totalPerfis={perfisCorrigidos.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0)}
                                                    totalAcessorios={acessoriosCorrigidos.reduce((acc, a) => acc + (Number(a.valorTotal) || 0), 0)}
                                                    totalGeral={Number(orcamentoParaVisualizar?.valor_total) || 0}
                                                />
                                            );
                                        }
                                        // Fechamento de sacada
                                        if (tipo === "fechamento_sacada") {
                                            const sacadaData = itensRaw as Record<string, unknown>;
                                            const largVao = Number(sacadaData.larguraVaoMm) || 0;
                                            const altVao = Number(sacadaData.alturaVaoMm) || 0;
                                            const altInferior = Number(sacadaData.alturaInferiorMm) || 0;
                                            const altSuperior = Number(sacadaData.alturaSuperiorMm) || 0;
                                            const qtdVaos = Number(sacadaData.quantidadeVaos) || 0;
                                            const divInferior = Number(sacadaData.divisoesInferiorPorVao) || Number(sacadaData.divisoesPorVao) || 1;
                                            const divSuperior = Number(sacadaData.divisoesSuperiorPorVao) || Number(sacadaData.divisoesPorVao) || 1;
                                            const divGeral = Math.max(divInferior, divSuperior, Number(sacadaData.divisoesPorVao) || 1);

                                            const resultadoInferior = calcularSacadaFrontal({
                                                larguraVaoMm: largVao,
                                                alturaVaoMm: altInferior || altVao,
                                                quantidadeVaos: qtdVaos,
                                                quantidadeDivisoesLargura: divInferior,
                                            });
                                            const resultadoSuperior = calcularSacadaFrontal({
                                                larguraVaoMm: largVao,
                                                alturaVaoMm: altSuperior || altVao,
                                                quantidadeVaos: qtdVaos,
                                                quantidadeDivisoesLargura: divSuperior,
                                            });

                                            const larguraVidroInferior = Number(sacadaData.larguraVidroInferiorMm) || resultadoInferior.larguraVidroMm;
                                            const alturaVidroInferior = Number(sacadaData.alturaVidroInferiorMm) || resultadoInferior.alturaVidroMm;
                                            const larguraVidroSuperior = Number(sacadaData.larguraVidroSuperiorMm) || resultadoSuperior.larguraVidroMm;
                                            const alturaVidroSuperior = Number(sacadaData.alturaVidroSuperiorMm) || resultadoSuperior.alturaVidroMm;

                                            const perfisRaw = Array.isArray(sacadaData.perfis) ? sacadaData.perfis as Array<Record<string, unknown>> : [];
                                            const acessRaw = Array.isArray(sacadaData.acessorios) ? sacadaData.acessorios as Array<Record<string, unknown>> : [];
                                            const acessGuardaRaw = Array.isArray(sacadaData.acessoriosGuardaCorpo)
                                                ? sacadaData.acessoriosGuardaCorpo as Array<Record<string, unknown>>
                                                : [];
                                            const acessFechamentoRaw = Array.isArray(sacadaData.acessoriosFechamentoSacadaSuperior)
                                                ? sacadaData.acessoriosFechamentoSacadaSuperior as Array<Record<string, unknown>>
                                                : [];

                                            const perfisArr: SacadaPerfisProp = perfisRaw.map((p) => ({
                                                nome: String(p.nome || ""),
                                                codigo: String(p.codigo || ""),
                                                corEncontrada: String(p.corEncontrada || ""),
                                                comprimentoTotal: Number(p.comprimentoTotal) || 0,
                                                quantidadeBarras: Number(p.quantidadeBarras) || 0,
                                                precoBarra: Number(p.precoBarra) || 0,
                                                valorTotal: Number(p.valorTotal) || 0,
                                            }));
                                            const mapearAcessorios = (lista: Array<Record<string, unknown>>): SacadaAcessoriosProp => lista.map((a) => ({
                                                nome: String(a.nome || ""),
                                                codigo: String(a.codigo || ""),
                                                corEncontrada: String(a.corEncontrada || ""),
                                                quantidade: Number(a.quantidade) || 0,
                                                quantidadePacote: Number(a.quantidadePacote) || undefined,
                                                pacote: Number(a.pacote) || undefined,
                                                precoUnitario: Number(a.precoUnitario) || 0,
                                                valorTotal: Number(a.valorTotal) || 0,
                                            }));
                                            const acessArr = mapearAcessorios(acessRaw);
                                            const acessGuarda = mapearAcessorios(acessGuardaRaw);
                                            const acessFechamento = mapearAcessorios(acessFechamentoRaw);

                                            const totalPerfis = perfisArr.reduce((s, p) => s + (Number(p.valorTotal) || 0), 0);
                                            const totalAcessorios = acessArr.reduce((s, a) => s + (Number(a.valorTotal) || 0), 0);
                                            const totalGeral = Number(orcamentoParaVisualizar?.valor_total) || 0;
                                            const totalVidro = Math.max(0, totalGeral - totalPerfis - totalAcessorios);
                                            const areaTotal = Number(orcamentoParaVisualizar?.metragem_total) || Number(sacadaData.areaTotal) || (resultadoInferior.areaTotalVidro + resultadoSuperior.areaTotalVidro);

                                            return (
                                                <SacadaFrontalPDF
                                                    nomeEmpresa={nomeEmpresa}
                                                    logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                    themeColor={theme.contentTextLightBg}
                                                    tituloDocumento="Fechamento de sacada AL"
                                                    nomeCliente={orcamentoParaVisualizar?.cliente_nome || ""}
                                                    nomeObra={orcamentoParaVisualizar?.obra_referencia || "Geral"}
                                                    larguraVaoMm={largVao}
                                                    alturaVaoMm={altVao}
                                                    quantidadeVaos={qtdVaos}
                                                    divisoesPorVao={divGeral}
                                                    corPerfil={String(sacadaData.corPerfil || "Não selecionada")}
                                                    vidroDescricao={String(sacadaData.vidroDescricao || "")}
                                                    medidaVidro={String(sacadaData.medidaVidro || `Inf: ${larguraVidroInferior} x ${alturaVidroInferior} mm | Sup: ${larguraVidroSuperior} x ${alturaVidroSuperior} mm`)}
                                                    areaTotal={areaTotal}
                                                    totalVidro={totalVidro}
                                                    perfis={perfisArr}
                                                    acessorios={acessArr}
                                                    acessoriosGuardaCorpo={acessGuarda}
                                                    acessoriosFechamentoSacada={acessFechamento}
                                                    totalPerfis={totalPerfis}
                                                    totalAcessorios={totalAcessorios}
                                                    totalGeral={totalGeral}
                                                    alturaInferiorMm={altInferior}
                                                    alturaSuperiorMm={altSuperior}
                                                    divisoesInferiorPorVao={divInferior}
                                                    divisoesSuperiorPorVao={divSuperior}
                                                    larguraVidroInferiorMm={larguraVidroInferior}
                                                    alturaVidroInferiorMm={alturaVidroInferior}
                                                    larguraVidroSuperiorMm={larguraVidroSuperior}
                                                    alturaVidroSuperiorMm={alturaVidroSuperior}
                                                    larguraVidroMm={larguraVidroInferior}
                                                    alturaVidroMm={alturaVidroInferior}
                                                    numeroOrcamento={orcamentoParaVisualizar?.numero_formatado || undefined}
                                                />
                                            );
                                        }
                                        // Sacada Frontal / Mão Amiga
                                        if (tipo === "sacada_frontal" || tipo === "mao_amiga" || ehSacadaVisualizar) {
                                            const sacadaData = itensRaw as Record<string, unknown>;
                                            const ehMaoAmigaPreview = tipo === "mao_amiga";
                                            const largVao = Number(sacadaData.larguraVaoMm) || 0;
                                            const altVao = Number(sacadaData.alturaVaoMm) || 0;
                                            const qtdVaos = Number(sacadaData.quantidadeVaos) || 0;
                                            const divVao = Number(sacadaData.quantidadeFolhas) || Number(sacadaData.divisoesPorVao) || 1;
                                            const sacResult = calcularSacadaFrontal({
                                                larguraVaoMm: largVao,
                                                alturaVaoMm: altVao,
                                                quantidadeVaos: qtdVaos,
                                                quantidadeDivisoesLargura: divVao,
                                            });
                                            const perfisRaw = Array.isArray(sacadaData.perfis) ? sacadaData.perfis as Array<Record<string, unknown>> : [];
                                            const acessRaw = Array.isArray(sacadaData.acessorios) ? sacadaData.acessorios as Array<Record<string, unknown>> : [];
                                            const perfisArr: SacadaPerfisProp = perfisRaw.map((p) => ({
                                                nome: String(p.nome || ""),
                                                codigo: String(p.codigo || ""),
                                                corEncontrada: String(p.corEncontrada || ""),
                                                comprimentoTotal: Number(p.comprimentoTotal) || 0,
                                                quantidadeBarras: Number(p.quantidadeBarras) || 0,
                                                precoBarra: Number(p.precoBarra) || 0,
                                                valorTotal: Number(p.valorTotal) || 0,
                                            }));
                                            const acessArr: SacadaAcessoriosProp = acessRaw.map((a) => ({
                                                nome: String(a.nome || ""),
                                                codigo: String(a.codigo || ""),
                                                corEncontrada: String(a.corEncontrada || ""),
                                                quantidade: Number(a.quantidade) || 0,
                                                quantidadePacote: Number(a.quantidadePacote) || undefined,
                                                pacote: Number(a.pacote) || undefined,
                                                precoUnitario: Number(a.precoUnitario) || 0,
                                                valorTotal: Number(a.valorTotal) || 0,
                                            }));
                                            const totalPerfis = perfisArr.reduce((s, p) => s + (Number(p.valorTotal) || 0), 0);
                                            const totalAcessorios = acessArr.reduce((s, a) => s + (Number(a.valorTotal) || 0), 0);
                                            const totalGeral = Number(orcamentoParaVisualizar?.valor_total) || 0;
                                            const totalVidro = Math.max(0, totalGeral - totalPerfis - totalAcessorios);
                                            return (
                                                <SacadaFrontalPDF
                                                    tituloDocumento={ehMaoAmigaPreview ? "Orçamento Mão Amiga" : undefined}
                                                    nomeEmpresa={nomeEmpresa}
                                                    logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                    themeColor={theme.contentTextLightBg}
                                                    nomeCliente={orcamentoParaVisualizar?.cliente_nome || ""}
                                                    nomeObra={orcamentoParaVisualizar?.obra_referencia || "Geral"}
                                                    larguraVaoMm={largVao}
                                                    alturaVaoMm={altVao}
                                                    quantidadeVaos={qtdVaos}
                                                    divisoesPorVao={divVao}
                                                    corPerfil={String(sacadaData.corPerfil || "Não selecionada")}
                                                    vidroDescricao={String(sacadaData.vidroDescricao || "")}
                                                    medidaVidro={`${sacResult.larguraVidroMm} x ${sacResult.alturaVidroMm} mm`}
                                                    areaTotal={sacResult.areaTotalVidro}
                                                    totalVidro={totalVidro}
                                                    perfis={perfisArr}
                                                    acessorios={acessArr}
                                                    totalPerfis={totalPerfis}
                                                    totalAcessorios={totalAcessorios}
                                                    totalGeral={totalGeral}
                                                    larguraVidroMm={sacResult.larguraVidroMm}
                                                    alturaVidroMm={sacResult.alturaVidroMm}
                                                    numeroOrcamento={orcamentoParaVisualizar?.numero_formatado || undefined}
                                                />
                                            );
                                        }
                                        // Espelhos
                                        if (/^OR(?!C)/i.test(orcamentoParaVisualizar?.numero_formatado || "")) {
                                            return (
                                                <EspelhosPDF
                                                    itens={itens}
                                                    nomeEmpresa={nomeEmpresa}
                                                    themeColor={theme.contentTextLightBg}
                                                    textColor={theme.contentTextLightBg}
                                                    nomeCliente={orcamentoParaVisualizar?.cliente_nome}
                                                    nomeObra={orcamentoParaVisualizar?.obra_referencia || undefined}
                                                    valorTotal={Number(orcamentoParaVisualizar?.valor_total) || 0}
                                                    logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                    numeroOrcamento={orcamentoParaVisualizar?.numero_formatado ?? undefined}
                                                />
                                            );
                                        }
                                        // Vidros
                                        return (
                                            <CalculoVidroPDF
                                                itens={itens}
                                                nomeEmpresa={nomeEmpresa}
                                                themeColor={theme.contentTextLightBg}
                                                textColor={theme.contentTextLightBg}
                                                nomeCliente={orcamentoParaVisualizar?.cliente_nome}
                                                nomeObra={orcamentoParaVisualizar?.obra_referencia || undefined}
                                                pesoTotal={Number(orcamentoParaVisualizar?.peso_total) || 0}
                                                metragemTotal={metragemTotalVisualizacao}
                                                totalPecas={totalPecasVisualizacao}
                                                valorTotal={Number(orcamentoParaVisualizar?.valor_total) || 0}
                                                logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
                                                numeroOrcamento={orcamentoParaVisualizar?.numero_formatado ?? undefined}
                                            />
                                        );
                                    })()}
                                </PDFViewer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
