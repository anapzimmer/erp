"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/context/ThemeContext"
import { supabase } from "@/lib/supabaseClient"
import {
    FileText,
    Search,
    Calendar,
    Clock,
    Trash2,
    ClipboardList,
    Filter
} from "lucide-react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function HistoricoVendas() {
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

    // Funções de Seleção
    const toggleSelecionarTodos = () => {
        if (selecionados.length === orcamentosFiltrados.length) {
            setSelecionados([]);
        } else {
            setSelecionados(orcamentosFiltrados.map(o => o.id));
        }
    };

    const toggleItem = (id: string) => {
        setSelecionados(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };
    const handleDelete = async () => {
        const idsParaDeletar = itemParaExcluir ? [itemParaExcluir.id] : selecionados;

        try {
            const { error } = await supabase
                .from('orcamentos')
                .delete()
                .in('id', idsParaDeletar);

            if (error) throw error;

            // Atualiza a lista localmente sem precisar de novo fetch
            setOrcamentos(prev => prev.filter(o => !idsParaDeletar.includes(o.id)));
            setSelecionados([]);
            setModalAberto(false);
            setItemParaExcluir(null);

            alert("Excluído com sucesso!");
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
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error) setOrcamentos(orcData || []);

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

    const orcamentosFiltrados = orcamentos.filter(orc => {
        const termo = filtro.toLowerCase();

        return (
            // Filtra por Nome do Cliente
            orc.cliente_nome?.toLowerCase().includes(termo) ||
            // Filtra por Nome da Obra (Adicionado)
            orc.obra_referencia?.toLowerCase().includes(termo) ||
            // Filtra por Código do Orçamento
            orc.numero_formatado?.toLowerCase().includes(termo)
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
                                        Histórico de Registros
                                    </h1>
                                </div>
                                <p className="text-gray-400 font-medium text-sm ml-11">
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
                                                        <div className="flex justify-center items-center gap-2">
                                                            <button className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-md rounded-2xl transition-all active:scale-95">
                                                                <FileText size={18} />
                                                            </button>
                                                           <button 
    onClick={() => { setItemParaExcluir(orc); setModalAberto(true); }}
    className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-red-500 ..."
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
        </div>
    )
}