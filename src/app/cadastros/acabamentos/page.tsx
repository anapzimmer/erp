"use client"
import React, { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import {
    LayoutDashboard, FileText, Image as ImageIcon, BarChart3, Wrench,
    Boxes, Briefcase, UsersRound, Layers, Package, Trash2, Edit2,
    PlusCircle, X, Building2, ChevronDown, Menu, Search, Loader2, Square, Palette
} from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import ThemeLoader from "@/components/ThemeLoader"

// --- TIPAGENS ---
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

interface Acabamento {
    id: number;
    empresa_id: string;
    nome: string;
    tipo_calculo: "unitário" | "metro_linear" | "porcentagem" | "m2";
    preco: number;
    tipo_visual: string; // Isso aceita a string composta (ex: 'lapidado-organico')
    sobra_largura: number;
    sobra_altura: number;
    porcentagem_aumento?: number;
    // --- ADICIONADO PARA TIPAR CORRETAMENTE ---
    bordasSelecionadas?: string[];
    formatoSelecionado?: string;
}

// --- CONSTANTES DE MENU ---
const menuPrincipal: MenuItem[] = [
    { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
    {
        nome: "Orçamentos", rota: "/orcamentos", icone: FileText,
        submenu: [{ nome: "Espelhos", rota: "/espelhos" }, { nome: "Vidros", rota: "/calculovidro" }, { nome: "Vidros PDF", rota: "/calculovidroPDF" }]
    },
    { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
    { nome: "Relatórios", rota: "/relatorios", icone: BarChart3 },
]

const menuCadastros: MenuItem[] = [
    { nome: "Clientes", rota: "/clientes", icone: UsersRound },
    { nome: "Vidros", rota: "/vidros", icone: Square },
    { nome: "Perfis", rota: "/perfis", icone: Package },
    { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
    { nome: "Kits", rota: "/kits", icone: Boxes },
    { nome: "Serviços", rota: "/servicos", icone: Briefcase },
    { nome: "Acabamentos", rota: "/acabamentos", icone: Palette },
]

// --- ESTRUTURA VISUAL PARA O CADASTRO ---
const opcoesVisual = [
    { value: 'padrao', label: 'Reta', className: 'rounded-none border-2 border-gray-400' },
    { value: 'lapidado', label: 'Lapidado', className: 'rounded-sm border-4 border-gray-400' },
    { value: 'bisote', label: 'Bisotê', className: 'rounded-sm border-[8px] border-double border-gray-400' },
    { value: 'molde', label: 'Molde', className: 'rounded-[20px_5px_20px_5px] border-2 border-gray-400' },
    { value: 'organico', label: 'Orgânico', className: 'rounded-[50px_30px_70px_30px] border-2 border-gray-400' },
    { value: 'redondo', label: 'Redondo', className: 'rounded-full border-2 border-gray-400' },
    // LEDS
    { value: 'led', label: 'LED', className: 'rounded border-4 border-gray-400 relative after:absolute after:inset-2 after:border-2 after:border-dashed after:border-gray-500 after:rounded' },
    { value: 'redondo_led', label: 'Redondo LED', className: 'rounded-full border-4 border-gray-400 relative after:absolute after:inset-3 after:border-2 after:border-dashed after:border-gray-500 after:rounded-full' },
    // OVAL
    { value: 'semi_oval', label: 'Semi Oval', className: 'rounded-t-full border-4 border-gray-400' },
    { value: 'capsula_vertical', label: 'Oval Vertical', className: 'rounded-full border-4 border-gray-400', size: 'w-10 h-16' },
];

export default function AcabamentosPage() {
    const router = useRouter()

    // --- ESTADOS UI/BRANDING ---
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [empresaIdUsuario, setEmpresaIdUsuario] = useState<string | null>(null);
    const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
    const [mostrarModalExclusao, setMostrarModalExclusao] = useState(false);
    const [acabamentoParaExcluir, setAcabamentoParaExcluir] = useState<Acabamento | null>(null);

    const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
    const [logoUrl, setLogoUrl] = useState("/glasscode2.png");
    const [theme, setTheme] = useState({
        primary: "#1C415B",
        secondary: "#FFFFFF",
        tertiary: "#39B89F",
        hover: "#39B89F",
        bgLight: "#F4F7FA"
    });

    // --- ESTADOS LÓGICA ---
    const [acabamentos, setAcabamentos] = useState<Acabamento[]>([])

    // --- CORRIGIDO: Inicialização do estado com tipos corretos ---
    const [novoAcabamento, setNovoAcabamento] = useState({
        id: 0,
        nome: '',
        tipo_calculo: 'metro_linear' as Acabamento["tipo_calculo"],
        preco: 0,
        tipo_visual: 'lapidado', // Corrigido
        sobra_largura: 0,
        sobra_altura: 0,
        empresa_id: '',
        // --- INICIALIZADO CORRETAMENTE ---
        bordasSelecionadas: [] as string[],
        formatoSelecionado: ""
    });

    const [editando, setEditando] = useState<Acabamento | null>(null)
    const [carregando, setCarregando] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false)
    const [filtroNome, setFiltroNome] = useState("")

    // --- EFEITOS ---
    useEffect(() => {
        const init = async () => {
            try {
                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) {
                    router.push("/login");
                    return;
                }
                setUsuarioEmail(userData.user.email ?? null);

                const { data: perfil, error: perfilError } = await supabase
                    .from("perfis_usuarios")
                    .select("empresa_id")
                    .eq("id", userData.user.id)
                    .maybeSingle();

                if (perfilError || !perfil?.empresa_id) {
                    console.error("Erro ao buscar empresa do usuário:", perfilError);
                } else {
                    setEmpresaIdUsuario(perfil.empresa_id);

                    const { data: emp } = await supabase
                        .from("empresas")
                        .select("nome")
                        .eq("id", perfil.empresa_id)
                        .single();

                    if (emp) setNomeEmpresa(emp.nome);

                    const { data: branding } = await supabase
                        .from("configuracoes_branding")
                        .select("*")
                        .eq("empresa_id", perfil.empresa_id)
                        .single();

                    if (branding) {
                        setLogoUrl(branding.logo_dark || "/glasscode2.png");
                        setTheme({
                            primary: branding.menu_background_color || "#1C415B",
                            secondary: "#FFFFFF",
                            tertiary: branding.menu_icon_color || "#39B89F",
                            hover: branding.menu_hover_color || "#39B89F",
                            bgLight: branding.screen_background_color || "#F4F7FA"
                        });
                    }
                    await carregarDados(perfil.empresa_id);
                }
            } catch (error) {
                console.error("Erro fatal na inicialização:", error);
            } finally {
                setCheckingAuth(false);
            }
        };
        init();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const carregarDados = async (empresaId: string) => {
        setCarregando(true);
        const { data } = await supabase
            .from("acabamentos")
            .select("*")
            .eq("empresa_id", empresaId)
            .order("nome", { ascending: true });

        if (data) setAcabamentos(data);
        setCarregando(false);
    };

    const salvarAcabamento = async () => {
        setCarregando(true);
        try {
            const ehEdicao = editando && novoAcabamento.id > 0;

            // ... (lógica de formatação do nome) ...
            const bordas = novoAcabamento.bordasSelecionadas || [];
            const bordaPrincipal = bordas.length > 0 ? bordas[0] : 'lapidado';
            const bordaFormatada = bordaPrincipal === 'bisote' ? 'Bisotê' : 'Lapidado';
            const nomeLimpo = novoAcabamento.nome.split(' (')[0];
            const nomeFinal = `${nomeLimpo} (${bordaFormatada})`;

            // --- CORREÇÃO: Mapeamento de Porcentagem ---
            const dadosParaBanco = {
                empresa_id: empresaIdUsuario,
                nome: nomeFinal,
                tipo_calculo: novoAcabamento.tipo_calculo,

                // Se for porcentagem, preço é 0, senão é o valor digitado
                preco:
                    novoAcabamento.tipo_calculo === "porcentagem"
                        ? 0
                        : Number(novoAcabamento.preco) || 0,

                // Se for porcentagem, o valor digitado vai para porcentagem_aumento
                porcentagem_aumento:
                    novoAcabamento.tipo_calculo === "porcentagem"
                        ? Number(novoAcabamento.preco) || 0
                        : 0,

                sobra_largura: Number(novoAcabamento.sobra_largura) || 0,
                sobra_altura: Number(novoAcabamento.sobra_altura) || 0,

                tipo_visual: `${bordaPrincipal}-${novoAcabamento.formatoSelecionado || "padrao"}`,
            };

            if (ehEdicao) {
                const { error } = await supabase
                    .from('acabamentos')
                    .update(dadosParaBanco)
                    .eq('id', novoAcabamento.id);
                if (error) throw error;
            } else {
                // Lógica de inserção para nova borda (se houver múltiplas)
                const promessas = bordas.map(borda => {
                    const tipoVisualIndividual = `${borda}-${novoAcabamento.formatoSelecionado || 'padrao'}`
                    const bordaIndFormatada = borda === 'bisote' ? 'Bisotê' : 'Lapidado'

                    return supabase.from('acabamentos').insert({
                        ...dadosParaBanco,
                        nome: `${nomeLimpo} (${bordaIndFormatada})`,
                        tipo_visual: tipoVisualIndividual
                    })
                })
                const resultados = await Promise.all(promessas)

                resultados.forEach(r => {
                    if (r.error) {
                        console.error("Erro no insert:", r.error)
                        throw r.error
                    }
                })
                await Promise.all(promessas);
            }

            setMostrarModal(false);
            setEditando(null);
            await carregarDados(empresaIdUsuario!);

        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Não foi possível salvar as alterações.");
        } finally {
            setCarregando(false);
        }
    };

    const deletarAcabamento = async (id: number) => {
        // A lógica de confirmação agora está no Modal JSX abaixo
        await supabase.from("acabamentos").delete().eq("id", id);
        setAcabamentos(prev => prev.filter(s => s.id !== id));
    };

    if (checkingAuth) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 animate-spin rounded-full" style={{ borderColor: theme.primary, borderTopColor: 'transparent' }}></div></div>;

    const renderMenuItem = (item: MenuItem) => {
        const Icon = item.icone;
        const temSubmenu = !!item.submenu;
        return (
            <div key={item.nome} className="mb-1">
                <div onClick={() => { if (!temSubmenu) { router.push(item.rota); setShowMobileMenu(false); } }}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:translate-x-1"
                    style={{ color: theme.secondary }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.hover}33`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" style={{ color: theme.tertiary }} />
                        <span className="font-medium text-sm">{item.nome}</span>
                    </div>
                </div>
                {temSubmenu && (
                    <div className="ml-8 mt-1 space-y-1">
                        {item.submenu!.map((sub) => (
                            <div key={sub.nome} onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                                className="text-sm p-2 rounded-lg cursor-pointer hover:translate-x-1 transition-all"
                                style={{ color: theme.secondary }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.hover}33`}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >{sub.nome}</div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: theme.bgLight }}>
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: theme.primary }}>
                <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50"> <X size={24} /> </button>
                <div className="px-3 py-4 mb-4 flex justify-center">
                    <Image src={logoUrl} alt="Logo" width={200} height={56} className="h-12 md:h-14 object-contain" loading="eager" />
                </div>
                <nav className="flex-1 overflow-y-auto space-y-6 pr-2">
                    <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.tertiary }}>Principal</p> {menuPrincipal.map(renderMenuItem)} </div>
                    <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.tertiary }}>Cadastros</p> {menuCadastros.map(renderMenuItem)} </div>
                </nav>
            </aside>


            <div className="flex-1 flex flex-col w-full min-w-0">
                <header
                    className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm no-print"
                    style={{ backgroundColor: theme.secondary }}
                >
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                        >
                            <Menu size={24} className="text-gray-600" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-200 hover:opacity-75 transition-all"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                                    <Building2 size={16} />
                                </div>
                                <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in duration-200">
                                    <div className="px-3 py-2 border-b border-gray-100">
                                        <p className="text-xs text-gray-400 font-medium">Logado como</p>
                                        <p className="text-sm font-semibold text-gray-900 truncate">{usuarioEmail}</p>
                                    </div>
                                    <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                                        <Wrench size={18} className="text-gray-400" /> Configurações
                                    </button>
                                    <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                        <X size={18} className="text-red-500" /> Sair
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-8 flex-1">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-2xl" style={{ backgroundColor: `${theme.tertiary}15`, color: theme.tertiary }}>
                                <Palette size={32} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: theme.primary }}>Acabamentos</h1>
                                <p className="text-gray-500 text-sm font-medium">Gerencie opções de acabamento e serviços adicionais.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                            <Layers className="w-7 h-7 mb-2" style={{ color: theme.tertiary }} />
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</h3>
                            <p className="text-2xl font-bold" style={{ color: theme.primary }}>{acabamentos.length}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" placeholder="Pesquisar acabamento..." value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2" style={{ "--tw-ring-color": theme.tertiary } as any} />
                        </div>
                        <button
                            onClick={() => {
                                setEditando(null);
                                setNovoAcabamento({
                                    id: 0,
                                    nome: "",
                                    tipo_calculo: "metro_linear",
                                    preco: 0,
                                    tipo_visual: "lapidado",
                                    empresa_id: empresaIdUsuario || "",
                                    sobra_largura: 0,
                                    sobra_altura: 0,
                                    // --- VALORES INICIAIS CORRIGIDOS ---
                                    bordasSelecionadas: [],
                                    formatoSelecionado: ""
                                });
                                setMostrarModal(true);
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-xs tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                            style={{ backgroundColor: theme.tertiary, color: theme.primary }}
                        >
                            <PlusCircle size={18} /> Novo Acabamento
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead style={{ backgroundColor: theme.primary, color: theme.secondary }}>
                                <tr>
                                    <th className="p-4 uppercase tracking-widest text-xs">Acabamento</th>
                                    <th className="p-4 uppercase tracking-widest text-xs">Tipo Cálculo</th>
                                    <th className="p-4 uppercase tracking-widest text-xs">Preço/Valor</th>
                                    <th className="p-4 uppercase tracking-widest text-xs">Modelo Visual</th>
                                    <th className="p-4 uppercase tracking-widest text-xs text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {acabamentos.filter(s => s.nome.toLowerCase().includes(filtroNome.toLowerCase())).map(s => {
                                    let opcaoVisual = opcoesVisual.find(o => o.value === s.tipo_visual);

                                    // 2. Se não achar, tenta achar apenas a borda (ex: 'semi_oval')
                                    if (!opcaoVisual) {
                                        opcaoVisual = opcoesVisual.find(o => o.value === s.tipo_visual.split('-')[0]);
                                    }

                                    // 3. Define o label a ser exibido
                                    const labelVisual = opcaoVisual ? opcaoVisual.label : s.tipo_visual;

                                    return (
                                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-500 font-medium">
                                                {s.nome}
                                                {(s.sobra_largura > 0 || s.sobra_altura > 0) && (
                                                    <span className="block text-xs text-gray-400">+{s.sobra_largura}cm x +{s.sobra_altura}cm</span>
                                                )}
                                            </td>
                                            <td className="p-4"><span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border" style={{ color: theme.tertiary, borderColor: `${theme.tertiary}44`, backgroundColor: `${theme.tertiary}11` }}>{s.tipo_calculo}</span></td>
                                            <td className="p-4 text-gray-500 font-medium" style={{ color: theme.primary }}>
                                                {s.tipo_calculo === 'porcentagem'
                                                    ? `${s.porcentagem_aumento ?? 0}%`
                                                    : s.tipo_calculo === 'm2'
                                                        ? `${formatarPreco(s.preco)} / m²` // <--- Adicionado
                                                        : formatarPreco(s.preco)}
                                            </td>

                                            {/* --- AQUI É ONDE EXIBIMOS O NOME DO MODELO --- */}
                                            <td className="p-4 text-gray-500 font-medium">{labelVisual}</td>

                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditando(s);
                                                            setNovoAcabamento({
                                                                ...s,
                                                                preco: s.tipo_calculo === 'porcentagem'
                                                                    ? (s.porcentagem_aumento ?? 0)
                                                                    : (s.preco ?? 0),

                                                                bordasSelecionadas: s.bordasSelecionadas ?? [s.tipo_visual?.split('-')[0] || 'lapidado'],
                                                                formatoSelecionado: s.tipo_visual?.split('-')[1] || ""
                                                            });

                                                            setMostrarModal(true);
                                                        }}
                                                        className="p-2.5 rounded-xl hover:bg-gray-100"
                                                        style={{ color: theme.primary }}
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAcabamentoParaExcluir(s);
                                                            setMostrarModalExclusao(true);
                                                        }}
                                                        className="p-2.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
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
                </main>
            </div>

            {/* MODAL */}
            {mostrarModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">

                        {/* HEADER FIXO */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-2xl font-black" style={{ color: theme.primary }}>
                                {editando ? "Editar" : "Novo"} Acabamento
                            </h2>
                            <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* CONTEÚDO COM SCROLL */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="space-y-6">
                                <input
                                    type="text"
                                    placeholder="Nome do Acabamento (ex: Orgânico)"
                                    value={novoAcabamento.nome}
                                    onChange={e => setNovoAcabamento({ ...novoAcabamento, nome: e.target.value })}
                                    className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": theme.tertiary } as any}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        value={novoAcabamento.tipo_calculo}
                                        onChange={e => setNovoAcabamento({ ...novoAcabamento, tipo_calculo: e.target.value as Acabamento["tipo_calculo"] })}
                                        className="p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 bg-white"
                                        style={{ "--tw-ring-color": theme.tertiary } as any}
                                    >
                                        <option value="metro_linear">Metro Linear (R$/m)</option>
                                        <option value="m2">Metro Quadrado (R$/m²)</option>
                                        <option value="unitário">Unitário (R$/un)</option>
                                        <option value="porcentagem">Porcentagem (%)</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder={novoAcabamento.tipo_calculo === 'porcentagem' ? "Porcentagem (ex: 20)" : "Preço (ex: 15.50)"}
                                        value={novoAcabamento.preco === 0 ? "" : novoAcabamento.preco}
                                        onChange={e => setNovoAcabamento({ ...novoAcabamento, preco: parseFloat(e.target.value) || 0 })}
                                        className="p-4 rounded-xl border border-gray-200 outline-none focus:ring-2"
                                        style={{ "--tw-ring-color": theme.tertiary } as any}
                                    />
                                </div>

                                {/* Margem de Cálculo */}
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-2 block">
                                        Margem de Cálculo para Área (em cm)
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="number" placeholder="Sobra Largura (cm)" value={novoAcabamento.sobra_largura === 0 ? "" : novoAcabamento.sobra_largura} onChange={e => setNovoAcabamento({ ...novoAcabamento, sobra_largura: parseFloat(e.target.value) || 0 })} className="p-4 rounded-xl border border-gray-200 outline-none focus:ring-2" style={{ "--tw-ring-color": theme.tertiary } as any} />
                                        <input type="number" placeholder="Sobra Altura (cm)" value={novoAcabamento.sobra_altura === 0 ? "" : novoAcabamento.sobra_altura} onChange={e => setNovoAcabamento({ ...novoAcabamento, sobra_altura: parseFloat(e.target.value) || 0 })} className="p-4 rounded-xl border border-gray-200 outline-none focus:ring-2" style={{ "--tw-ring-color": theme.tertiary } as any} />
                                    </div>
                                </div>

                                {/* 1. SELEÇÃO DE BORDA (MODIFICADO PARA MÚLTIPLA SELEÇÃO) */}
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-3 block">
                                        Tipos de Borda a Cadastrar
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Se já tem lapidado, remove, senão adiciona
                                                const bordas = novoAcabamento.bordasSelecionadas || [];
                                                const novasBordas = bordas.includes('lapidado')
                                                    ? bordas.filter(b => b !== 'lapidado')
                                                    : [...bordas, 'lapidado'];
                                                setNovoAcabamento({ ...novoAcabamento, bordasSelecionadas: novasBordas } as any);
                                            }}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all 
                                ${novoAcabamento.bordasSelecionadas?.includes('lapidado') ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                                        >
                                            <div className="w-6 h-6 border-4 border-gray-300 rounded-sm"></div>
                                            <span className="text-sm font-semibold">Lapidado</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const bordas = novoAcabamento.bordasSelecionadas || [];
                                                const novasBordas = bordas.includes('bisote')
                                                    ? bordas.filter(b => b !== 'bisote')
                                                    : [...bordas, 'bisote'];
                                                setNovoAcabamento({ ...novoAcabamento, bordasSelecionadas: novasBordas } as any);
                                            }}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all 
                                ${novoAcabamento.bordasSelecionadas?.includes('bisote') ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                                        >
                                            <div className="w-6 h-6 border-[6px] border-double border-gray-300 rounded-sm"></div>
                                            <span className="text-sm font-semibold">Bisotê</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. FORMATO DO ESPELHO */}
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-3 block">
                                        Formato do Espelho
                                    </label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {/* BOTÃO JOGO DE ESPELHOS */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // CORREÇÃO: Define ambos para manter o desenho e habilitar o salvar
                                                setNovoAcabamento({
                                                    ...novoAcabamento,
                                                    tipo_visual: `lapidado-jogo`, // Mantém para exibir corretamente
                                                    formatoSelecionado: `jogo`     // Preenche para a validação do botão salvar
                                                })
                                            }}
                                            className={`col-span-2 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all 
    ${novoAcabamento.formatoSelecionado === 'jogo' // VERIFICAÇÃO: usa 'jogo'
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}
                                        >
                                            {/* --- O DESENHO DO JOGO PERMANECE AQUI --- */}
                                            <div className="grid grid-cols-3 gap-1 p-2 bg-white rounded-lg">
                                                {[...Array(9)].map((_, i) => (
                                                    <div key={i} className={`w-5 h-5 bg-gray-200 rounded-sm border border-gray-300`}></div>
                                                ))}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700">Jogo de Espelhos</span>
                                        </button>

                                        {/* DEMAIS FORMATOS */}
                                        {opcoesVisual
                                            .filter(opt => opt.value !== 'padrao' && opt.value !== 'lapidado' && opt.value !== 'bisote' && opt.value !== 'jogo')
                                            .map((opt) => {
                                                const isSelected = novoAcabamento.tipo_visual?.endsWith(`-${opt.value}`);

                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => {
                                                            // Define apenas o formato, o tipo de borda será decidido na hora de salvar
                                                            setNovoAcabamento({ ...novoAcabamento, formatoSelecionado: opt.value as any })
                                                        }}
                                                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all 
                                ${novoAcabamento.formatoSelecionado === opt.value
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}
                                                    >
                                                        <div className={`${opt.size ?? 'w-12 h-12'} bg-white ${opt.className}`}></div>
                                                        <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{opt.label}</span>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER FIXO */}
                        <div className="p-5 border-t border-gray-100 bg-white flex gap-3">
                            <button
                                onClick={() => setMostrarModal(false)}
                                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={salvarAcabamento}
                                disabled={carregando || !novoAcabamento.formatoSelecionado || !novoAcabamento.bordasSelecionadas?.length}
                                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: theme.tertiary, color: theme.primary }}
                            >
                                {carregando ? <Loader2 className="animate-spin" size={16} /> : `Salvar ${novoAcabamento.bordasSelecionadas?.length || 0} Itens`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {mostrarModalExclusao && acabamentoParaExcluir && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-gray-100 flex flex-col overflow-hidden">

                        {/* Título e ícone menor */}
                        <div className="p-6 pb-4 flex flex-col items-center text-center">
                            <div className="p-3 rounded-full bg-red-100 mb-3">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                Excluir Acabamento
                            </h3>
                            <p className="text-gray-500 text-sm">
                                Tem certeza que deseja excluir o acabamento <strong className="text-gray-700">{acabamentoParaExcluir.nome}</strong>?
                            </p>
                        </div>

                        {/* FOOTER DO MODAL (BOTOES MENORES) */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
                            <button
                                onClick={() => {
                                    setAcabamentoParaExcluir(null);
                                    setMostrarModalExclusao(false);
                                }}
                                className="flex-1 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={() => {
                                    deletarAcabamento(acabamentoParaExcluir.id);
                                    setAcabamentoParaExcluir(null);
                                    setMostrarModalExclusao(false);
                                }}
                                className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                            >
                                {carregando ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Excluir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}