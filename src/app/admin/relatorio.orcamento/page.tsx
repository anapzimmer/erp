//app/admin/relatorio.orcamento/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/context/ThemeContext"
import { supabase } from "@/lib/supabaseClient"
import { FileText, Search, Calendar, PencilLine, Trash2, X, ClipboardList, Filter, CalendarDays, CalendarRange, CalendarClock } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { CalculoVidroPDF } from "@/app/relatorios/calculovidros/CalculoVidroPDF"
import ThemeLoader from "@/components/ThemeLoader"

export default function RelatorioOrçamento() {
    const router = useRouter()
    const { theme } = useTheme()

    // Estados de Layout
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [usuarioEmail, setUsuarioEmail] = useState("")
    const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...")

    // Estados de Dados
    const [orcamentos, setOrcamentos] = useState<any[]>([])
    const [filtro, setFiltro] = useState("")
    const [loadingDados, setLoadingDados] = useState(true)

    // Estados para Seleção e Modal
    const [selecionados, setSelecionados] = useState<string[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [itemParaExcluir, setItemParaExcluir] = useState<any>(null);
    const [showToast, setShowToast] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [orcamentoParaVisualizar, setOrcamentoParaVisualizar] = useState<any>(null);

    //Histórico de Totais
    const hoje = new Date();
    const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const totais = orcamentos.reduce((acc, orc) => {
        const dataOrc = new Date(orc.created_at);
        const valor = Number(orc.valor_total) || 0;

        // Diário (hoje)
        if (dataOrc.toDateString() === new Date().toDateString()) acc.diario += valor;
        // Semanal
        if (dataOrc >= inicioSemana) acc.semanal += valor;
        // Mensal
        if (dataOrc >= inicioMes) acc.mensal += valor;

        return acc;
    }, { diario: 0, semanal: 0, mensal: 0 });

    const handleDelete = async () => {
        const idsParaDeletar = itemParaExcluir ? [itemParaExcluir.id] : selecionados;

        try {
            const { error } = await supabase
                .from('orcamentos')
                .delete()
                .in('id', idsParaDeletar);

            if (error) throw error;

            setOrcamentos(prev => prev.filter(o => !idsParaDeletar.includes(o.id)));
            setSelecionados([]);
            setModalAberto(false);
            setItemParaExcluir(null);

            // AVISO DISCRETO:
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000); // Some após 3 segundos

        } catch (error) {
            console.error("Erro ao deletar:", error);
            alert("Erro ao excluir registro.");
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
                    .single();

                if (perfil?.empresa_id) {
                    const { data: empresaData } = await supabase
                        .from("empresas")
                        .select("nome")
                        .eq("id", perfil.empresa_id)
                        .single();
                    if (empresaData) setNomeEmpresa(empresaData.nome);
                }
                const { data: orcData, error } = await supabase
                    .from('orcamentos')
                    .select(`*`)
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
        const hoje = new Date();
        const expira = new Date(dataExcluir);
        const diffTime = expira.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    if (checkingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.menuIconColor, borderTopColor: 'transparent' }}></div>
            </div>
        );
    }



    return (
        <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>

            <Sidebar
                showMobileMenu={showMobileMenu}
                setShowMobileMenu={setShowMobileMenu}
                nomeEmpresa={nomeEmpresa}
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
                                        <span className="text-[10px] uppercase font-black text-gray-400 tracking-[0.1em]">{item.label}</span>
                                        <span className="text-xl font-black text-slate-800">
                                            {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* TABELA ESTILO CARD */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    {selecionados.length > 0 && (
                                        <button
                                            onClick={() => setModalAberto(true)}
                                            className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold hover:bg-red-100 transition-all animate-in fade-in slide-in-from-top-2"
                                        >
                                            <Trash2 size={18} />
                                            Excluir ({selecionados.length})
                                        </button>
                                    )}
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400  text-leftfont-black text-left">N° Orçamento</th>
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400  text-left">Cliente & Projeto</th>
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400  text-left">Criado</th>
                                            <th className="px-8 py-5 text-[10px] uppercase tracking-[0.15em] text-gray-400  text-right">Valor Obra</th>
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
                                                                    setShowPDFModal(true);
                                                                }}

                                                                className="p-3 bg-white border border-gray-100 text-gray-400 transition-all active:scale-95 rounded-2xl group/view"
                                                                style={{
                                                                    '--hover-bg': `${theme.menuIconColor}10`, // 10% de opacidade do seu verde
                                                                    '--hover-text': theme.menuIconColor,
                                                                    '--hover-border': `${theme.menuIconColor}30`
                                                                } as any}
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
                                                                    console.log("Editando ID:", orc.id);
                                                                    router.push(`/calculovidro?edit=${orc.id}`);
                                                                }}
                                                                className="p-3 bg-white border border-gray-100 text-gray-400 transition-all active:scale-95 rounded-2xl group/edit"
                                                                style={{
                                                                    '--hover-bg': `${theme.menuHoverColor}10`, // 10% de opacidade do seu azul
                                                                    '--hover-text': theme.menuHoverColor,
                                                                    '--hover-border': `${theme.menuHoverColor}30`
                                                                } as any}
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
                                                                onClick={() => { setItemParaExcluir(orc); setModalAberto(true); }}
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
            {/* MODAL DE CONFIRMAÇÃO */}
            {modalAberto && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 mx-auto">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-center text-slate-800 mb-2">Tem certeza?</h3>
                        <p className="text-gray-500 text-center text-sm mb-8">
                            {itemParaExcluir
                                ? `Você está prestes a excluir o orçamento ${itemParaExcluir.numero_formatado}.`
                                : `Você está prestes a excluir ${selecionados.length} registros selecionados.`}
                            <br />Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setModalAberto(false); setItemParaExcluir(null); }}
                                className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3 px-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* TOAST DISCRETO - PADRÃO ERP */}
            {showToast && (
                <div className="fixed bottom-8 right-8 z-[110] animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                                Visualização: {orcamentoParaVisualizar?.numero_formatado}
                            </h3>
                            <button
                                onClick={() => setShowPDFModal(false)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 w-full h-full bg-gray-200">
                            <PDFViewer width="100%" height="100%" className="border-none">
                                <CalculoVidroPDF
                                    itens={orcamentoParaVisualizar?.itens || []}
                                    nomeEmpresa={nomeEmpresa}
                                    themeColor={theme.contentTextLightBg}
                                    nomeCliente={orcamentoParaVisualizar?.cliente_nome}
                                    nomeObra={orcamentoParaVisualizar?.obra_referencia}
                                    pesoTotal={Number(orcamentoParaVisualizar?.peso_total) || 0}
                                    logoUrl={theme.logoLightUrl || undefined}
                                    metragemTotal={orcamentoParaVisualizar?.metragem_total || 0}
                                    valorTotal={Number(orcamentoParaVisualizar?.valor_total) || 0}
                                    totalPecas={orcamentoParaVisualizar?.total_pecas || 0}
                                />
                            </PDFViewer>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}