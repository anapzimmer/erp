//app/admin/relatorio.orcamento/page.tsx
"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "@/context/ThemeContext"
import { supabase } from "@/lib/supabaseClient"
import { Search, Calendar, PencilLine, Trash2, X, ClipboardList, Filter, CalendarDays, CalendarRange, CalendarClock } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import { CalculoVidroPDF } from "@/app/relatorios/calculovidros/CalculoVidroPDF"
import { RelatorioObraPDF } from "@/app/relatorios/calculovidros/RelatorioObraPDF"
import { TemperaPDF } from "@/app/relatorios/calculovidros/TemperaPDF"
import { EspelhosPDF } from "@/app/relatorios/espelhos/EspelhosPDF"
import { SacadaFrontalPDF } from "@/app/relatorios/sacadafrontal/SacadaFrontalPDF"
import { PeleDeVidroPDF } from "@/app/relatorios/peledevidro/PeleDeVidroPDF"
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

export default function RelatorioOrçamento() {
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
                mensagem: "Nenhum orçamento foi selecionado para exclusão.",
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

    useEffect(() => {
        const periodo = searchParams.get("periodo");
        const filtroInicial = searchParams.get("filtro") || "";

        if (filtroInicial) {
            setFiltro(filtroInicial);
        }

        if (periodo === "30d") {
            const fim = new Date();
            const inicio = new Date();
            inicio.setDate(fim.getDate() - 29);

            setDataInicio(inicio.toISOString().slice(0, 10));
            setDataFim(fim.toISOString().slice(0, 10));
        }

        if (periodo === "7d") {
            const fim = new Date();
            const inicio = new Date();
            inicio.setDate(fim.getDate() - 6);

            setDataInicio(inicio.toISOString().slice(0, 10));
            setDataFim(fim.toISOString().slice(0, 10));
        }
    }, [searchParams]);

    // 2. Atualize o seu filtro
    const orcamentosFiltrados = orcamentos.filter(orc => {
        const termo = filtro.toLowerCase();
        const dataOrc = new Date(orc.created_at).setHours(0, 0, 0, 0);

        const dentroDoPeriodo = (!dataInicio || dataOrc >= new Date(dataInicio).getTime()) &&
            (!dataFim || dataOrc <= new Date(dataFim).getTime());

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

                <main className="p-4 md:p-8 flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">

                        {/* CABEÇALHO DE AÇÕES */}
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.menuIconColor}15`, color: theme.menuIconColor }}>
                                        <ClipboardList size={24} />
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: theme.contentTextLightBg }}>
                                        Histórico de Orçamentos
                                    </h1>
                                </div>
                                <p className="text-gray-400 text-sm ml-11">
                                    Gerenciamento de orçamentos e prazos de validade.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="relative w-full sm:w-80 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1e3a5a] transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por cliente ou código..."
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none text-sm transition-all focus:ring-4 focus:ring-black/5 shadow-sm"
                                        value={filtro}
                                        onChange={(e) => setFiltro(e.target.value)}
                                    />
                                </div>

                                <button className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:bg-gray-50 transition-all shadow-sm">
                                    <Filter size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            {[
                                {
                                    label: "Orçado Hoje",
                                    valor: totais.diario,
                                    icon: CalendarDays,
                                    color: "#6091b0" // Laranja
                                },
                                {
                                    label: "Orçado Semanal",
                                    valor: totais.semanal,
                                    icon: CalendarRange,
                                    color: "#dc5d46" // Seu tema (ex: verde ou azul)
                                },
                                {
                                    label: "Orçado Mensal",
                                    valor: totais.mensal,
                                    icon: CalendarClock,
                                    color: "#011427" // Verde (sugere sucesso/fechamento)
                                },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                                    <div
                                        className="p-4 rounded-2xl"
                                        style={{ backgroundColor: `${item.color}15` }}
                                    >
                                        <item.icon size={24} style={{ color: item.color }} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{item.label}</span>
                                        <span className="text-xl font-black text-slate-800">
                                            {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* TABELA ESTILO CARD */}
                        <div className="bg-white rounded-4xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                            {selecionados.length > 0 && (
                                <div className="px-6 pt-6">
                                    <button
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
                                        className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold hover:bg-red-100 transition-all animate-in fade-in slide-in-from-top-2"
                                    >
                                        <Trash2 size={18} />
                                        Excluir ({selecionados.length})
                                    </button>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-black text-left">N° Orçamento</th>
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400  text-left">Cliente & Projeto</th>
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400  text-left">Criado</th>
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400  text-right">Valor Obra</th>
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loadingDados ? (
                                            <tr><td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.contentTextLightBg }}></div>
                                                    <span className="text-sm font-medium text-gray-400">Sincronizando dados...</span>
                                                </div>
                                            </td></tr>
                                        ) : orcamentosFiltrados.map((orc) => {
                                            const dias = calcularDiasRestantes(orc.excluir_em);
                                            const isUrgent = dias <= 15;

                                            return (
                                                <tr key={orc.id} className="hover:bg-[#f8fafc] transition-all group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-mono text-[13px] font-black tracking-wider py-1 px-3 rounded-lg w-fit"
                                                                style={{ backgroundColor: `${theme.contentTextLightBg}10`, color: theme.contentTextLightBg }}>
                                                                {orc.numero_formatado}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-bold ml-1 uppercase">ID: #{orc.id.toString().slice(0, 5)}</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#1e3a5a] text-xs shadow-inner">
                                                                {orc.cliente_nome.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-[#1e3a5a] tracking-tight">
                                                                    {orc.cliente_nome}
                                                                </span>
                                                                <span className="text-[11px] text-gray-400 font-medium italic">
                                                                    {orc.obra_referencia || "Projeto Geral"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                                <Calendar size={14} className="opacity-40" />
                                                                <span>{new Date(orc.created_at).toLocaleDateString('pt-BR')}</span>
                                                            </div>
                                                            <div
                                                                className="flex items-center gap-2 text-[10px] px-2.5 py-1 rounded-full w-fit border tracking-wider shadow-sm"
                                                                style={{
                                                                    backgroundColor: isUrgent ? '#FFF1F2' : `${theme.menuIconColor}10`,
                                                                    color: isUrgent ? '#E11D48' : theme.menuIconColor,
                                                                    borderColor: isUrgent ? '#FECDD3' : `${theme.menuIconColor}20`
                                                                }}
                                                            >
                                                                <div className={`w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-red-500 animate-pulse' : ''}`} style={{ backgroundColor: isUrgent ? undefined : theme.menuIconColor }} />
                                                                {dias === 0 ? "EXPIRA HOJE!" : `FALTAM ${dias} DIAS`}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex flex-col ">
                                                            <span className="text-base font-black text-[#1e3a5a]">
                                                                {Number(orc.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-medium">Investimento Total</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-8 py-6">
                                                        <div className="flex justify-center items-center gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    setOrcamentoParaVisualizar(orc);
                                                                    setTipoPreviewCalculoprojeto("comercial");
                                                                    setShowPDFModal(true);
                                                                }}

                                                                className="p-3 bg-white border border-gray-100 text-gray-400 transition-all active:scale-95 rounded-2xl group/view"
                                                                style={{
                                                                    '--hover-bg': `${theme.menuIconColor}10`, // 10% de opacidade do seu verde
                                                                    '--hover-text': theme.menuIconColor,
                                                                    '--hover-border': `${theme.menuIconColor}30`
                                                                } as CSSProperties}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                                                                    e.currentTarget.style.color = 'var(--hover-text)';
                                                                    e.currentTarget.style.borderColor = 'var(--hover-border)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'white';
                                                                    e.currentTarget.style.color = '#9ca3af'; // gray-400
                                                                    e.currentTarget.style.borderColor = '#f3f4f6'; // gray-100
                                                                }}
                                                                title="Visualização Rápida"
                                                            >
                                                                <Search size={18} />
                                                            </button>

                                                            {/* EDITAR - USA O AZUL menuHoverColor (#2A5C7E) NO HOVER */}
                                                            <button
                                                                onClick={() => {
                                                                    const numero = String(orc.numero_formatado || "");
                                                                    const ehSacada = /^SAC/i.test(numero);
                                                                    const ehEspelho = /^OR(?!C)/i.test(numero);
                                                                    const itensObj = (orc.itens && !Array.isArray(orc.itens)) ? orc.itens : undefined;
                                                                    const tipoItem = typeof itensObj?.tipo === "string" ? itensObj.tipo : "";
                                                                    const ehFechamentoSacada = tipoItem === "fechamento_sacada";
                                                                    const ehPeleVidro = tipoItem === "pele_de_vidro";
                                                                    const ehCalculoprojeto = tipoItem === "calculoprojeto";
                                                                    const returnTo = encodeURIComponent("/admin/relatorio.orcamento");
                                                                    const rotaEdicao = ehFechamentoSacada
                                                                        ? `/calculo/fechamentosacada?edit=${orc.id}&returnTo=${returnTo}`
                                                                        : ehSacada
                                                                        ? `/calculo/sacadafrontal?edit=${orc.id}&returnTo=${returnTo}`
                                                                        : ehEspelho
                                                                            ? `/calculo/espelhos?edit=${orc.id}&returnTo=${returnTo}`
                                                                            : ehPeleVidro
                                                                                ? `/calculo/peledevidro?edit=${orc.id}&returnTo=${returnTo}`
                                                                                : ehCalculoprojeto
                                                                                    ? `/calculoprojeto?edit=${orc.id}&returnTo=${returnTo}`
                                                                                    : `/calculo/calculovidro?edit=${orc.id}&returnTo=${returnTo}`;
                                                                    router.push(rotaEdicao);
                                                                }}
                                                                className="p-3 bg-white border border-gray-100 text-gray-400 transition-all active:scale-95 rounded-2xl group/edit"
                                                                style={{
                                                                    '--hover-bg': `${theme.menuHoverColor}10`, // 10% de opacidade do seu azul
                                                                    '--hover-text': theme.menuHoverColor,
                                                                    '--hover-border': `${theme.menuHoverColor}30`
                                                                } as CSSProperties}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                                                                    e.currentTarget.style.color = 'var(--hover-text)';
                                                                    e.currentTarget.style.borderColor = 'var(--hover-border)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'white';
                                                                    e.currentTarget.style.color = '#9ca3af';
                                                                    e.currentTarget.style.borderColor = '#f3f4f6';
                                                                }}
                                                                title="Editar Orçamento"
                                                            >
                                                                <PencilLine size={18} />
                                                            </button>

                                                            {/* EXCLUIR - VERMELHO PADRÃO DE ALERTA NO HOVER */}
                                                            <button
                                                                onClick={() => {
                                                                    setItemParaExcluir(orc);
                                                                    setModalConfirmacao({
                                                                        titulo: "Confirmar exclusão",
                                                                        mensagem: `Você está prestes a excluir o orçamento ${orc.numero_formatado}.\nEsta ação não pode ser desfeita.`,
                                                                        confirmar: () => handleDelete([orc.id]),
                                                                        labelConfirmar: "Excluir",
                                                                        labelCancelar: "Cancelar",
                                                                    });
                                                                }}
                                                                className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all active:scale-95 rounded-2xl"
                                                                title="Excluir Registro"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    {orcamentosFiltrados.length} registros encontrados
                                </span>
                            </div>
                        </div>
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
            {/* TOAST DISCRETO - PADRÃO ERP */}
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
                                        // Sacada Frontal
                                        if (ehSacadaVisualizar) {
                                            const sacadaData = itensRaw as Record<string, unknown>;
                                            const largVao = Number(sacadaData.larguraVaoMm) || 0;
                                            const altVao = Number(sacadaData.alturaVaoMm) || 0;
                                            const qtdVaos = Number(sacadaData.quantidadeVaos) || 0;
                                            const divVao = Number(sacadaData.divisoesPorVao) || 1;
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