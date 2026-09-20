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
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"

interface Acabamento {
    id: number;
    empresa_id: string;
    nome: string;
    tipo_calculo: "unitário" | "metro_linear" | "porcentagem" | "m2";
    preco: number;
    tipo_visual: string; // Isso aceita a string composta (ex: 'lapidado-organico')
    sobra_largura: number;
    sobra_altura: number;
    preco_jato?: number;
    preco_adesivo?: number;
    porcentagem_aumento?: number;
    // --- ADICIONADO PARA TIPAR CORRETAMENTE ---
    bordasSelecionadas?: string[];
    formatoSelecionado?: string;
}

// --- ESTRUTURA VISUAL PARA O CADASTRO ---
const opcoesVisual = [
    { value: 'padrao', label: 'Reta', className: 'rounded-none border-2 border-border-strong' },
    { value: 'lapidado', label: 'Lapidado', className: 'rounded-sm border-4 border-border-strong' },
    { value: 'bisote', label: 'Bisotê', className: 'rounded-sm border-[8px] border-double border-border-strong' },
    { value: 'molde', label: 'Molde', className: 'rounded-[20px_5px_20px_5px] border-2 border-border-strong' },
    { value: 'organico', label: 'Orgânico', className: 'rounded-[50px_30px_70px_30px] border-2 border-border-strong' },
    { value: 'redondo', label: 'Redondo', className: 'rounded-full border-2 border-border-strong' },
    // LEDS
    { value: 'led', label: 'LED', className: 'rounded border-4 border-border-strong relative after:absolute after:inset-2 after:border-2 after:border-dashed after:border-border-strong after:rounded' },
    { value: 'redondo_led', label: 'Redondo LED', className: 'rounded-full border-4 border-border-strong relative after:absolute after:inset-3 after:border-2 after:border-dashed after:border-border-strong after:rounded-full' },
    // OVAL
    { value: 'semi_oval', label: 'Semi Oval', className: 'rounded-t-full border-4 border-border-strong' },
    { value: 'capsula_vertical', label: 'Oval Vertical', className: 'rounded-full border-4 border-border-strong', size: 'w-10 h-16' },
];

export default function AcabamentosPage() {
    const router = useRouter()

    // --- ESTADOS UI/BRANDING ---
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [sidebarExpandido, setSidebarExpandido] = useState(true);
    const [empresaIdUsuario, setEmpresaIdUsuario] = useState<string | null>(null);
    const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
    const [mostrarModalExclusao, setMostrarModalExclusao] = useState(false);
    const [acabamentoParaExcluir, setAcabamentoParaExcluir] = useState<Acabamento | null>(null);

    const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
    const theme = { primary: "var(--text-primary)", secondary: "var(--surface)", tertiary: "var(--primary)", hover: "var(--navigation-hover)", bgLight: "var(--background)" };

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
        preco_jato: 0,
        preco_adesivo: 0,
        empresa_id: '',
        // --- INICIALIZADO CORRETAMENTE ---
        bordasSelecionadas: [] as string[],
        formatoSelecionado: ""
    });

    const [editando, setEditando] = useState<Acabamento | null>(null)
    const [carregando, setCarregando] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false)
    const [filtroNome, setFiltroNome] = useState("")
    const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)

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
                        .select("logo_light, logo_dark")
                        .eq("empresa_id", perfil.empresa_id)
                        .single();

                    if (branding) {

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
        if (!empresaIdUsuario || !novoAcabamento.nome.trim() || !novoAcabamento.formatoSelecionado || !novoAcabamento.bordasSelecionadas.length) {
            setModalAviso({ titulo: "Confira o acabamento", mensagem: "Informe nome, borda e formato antes de salvar." });
            return;
        }
        const valores = [novoAcabamento.preco, novoAcabamento.sobra_largura, novoAcabamento.sobra_altura, novoAcabamento.preco_jato, novoAcabamento.preco_adesivo];
        if (valores.some(valor => !Number.isFinite(Number(valor)) || Number(valor) < 0)) {
            setModalAviso({ titulo: "Confira os valores", mensagem: "Preços, porcentagem e sobras devem ser números maiores ou iguais a zero." });
            return;
        }
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
                    novoAcabamento.tipo_calculo === "porcentagem" ? 0
                        : Number(novoAcabamento.preco) || 0,

                // Se for porcentagem, o valor digitado vai para porcentagem_aumento
                porcentagem_aumento:
                    novoAcabamento.tipo_calculo === "porcentagem" ? Number(novoAcabamento.preco) || 0
                        : 0,

                sobra_largura: Number(novoAcabamento.sobra_largura) || 0,
                sobra_altura: Number(novoAcabamento.sobra_altura) || 0,
                preco_jato: Number(novoAcabamento.preco_jato) || 0,
                preco_adesivo: Number(novoAcabamento.preco_adesivo) || 0,

                tipo_visual: `${bordaPrincipal}-${novoAcabamento.formatoSelecionado || "padrao"}`,
            };

            if (ehEdicao) {
                const { error } = await supabase
                    .from('acabamentos')
                    .update(dadosParaBanco)
                    .eq('id', novoAcabamento.id).eq('empresa_id', empresaIdUsuario);
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

            }

            setMostrarModal(false);
            setEditando(null);
            await carregarDados(empresaIdUsuario!);

        } catch (error) {
            console.error("Erro ao salvar:", error);
            setModalAviso({ titulo: "Erro", mensagem: "Não foi possível salvar as alterações." });
        } finally {
            setCarregando(false);
        }
    };

    const deletarAcabamento = async (id: number) => {
        // A lógica de confirmação agora está no Modal JSX abaixo
        await supabase.from("acabamentos").delete().eq("id", id);
        setAcabamentos(prev => prev.filter(s => s.id !== id));
    };

    if (checkingAuth) return <div className="flex h-screen items-center justify-center bg-surface-secondary"><div className="w-8 h-8 border-4 animate-spin rounded-full" style={{ borderTopColor: 'transparent', borderRightColor: theme.primary, borderBottomColor: theme.primary, borderLeftColor: theme.primary }}></div></div>;

    const acabamentosFiltrados = acabamentos.filter(s =>
        s.nome.toLowerCase().includes(filtroNome.toLowerCase())
    );

    return (
        <div className="cadastros-layout flex min-h-screen" style={{ backgroundColor: theme.bgLight }}>
            <Sidebar
                showMobileMenu={showMobileMenu}
                setShowMobileMenu={setShowMobileMenu}
                nomeEmpresa={nomeEmpresa}
                expandido={sidebarExpandido}
                setExpandido={setSidebarExpandido}
            />


            <div className="flex-1 flex flex-col w-full min-w-0">
                <Header
                    setShowMobileMenu={setShowMobileMenu}
                    nomeEmpresa={nomeEmpresa}
                    usuarioEmail={usuarioEmail || ""}
                    handleSignOut={handleLogout}
                />

                <main className="cad-main-panel flex-1 min-w-0 p-4 md:p-8 xl:p-10">
                    <section className="mb-10 rounded-[24px] border border-border bg-surface p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `color-mix(in srgb, ${theme.tertiary} 8%, transparent)`, color: theme.tertiary }}>
                                    <Palette size={23} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: theme.primary }}>Catálogo de acabamentos</h1>
                                    <p className="mt-1 text-sm font-normal text-text-secondary">Gerencie acabamentos, modelos e preços.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8 grid gap-3 md:grid-cols-4">
                        {[
                            { label: "Total", value: acabamentos.length, icon: Layers },
                            { label: "Metro linear", value: acabamentos.filter(s => s.tipo_calculo === "metro_linear").length, icon: Package },
                            { label: "M²", value: acabamentos.filter(s => s.tipo_calculo === "m2").length, icon: Square },
                            { label: "Porcentagem", value: acabamentos.filter(s => s.tipo_calculo === "porcentagem").length, icon: Palette },
                        ].map(item => (
                            <div key={item.label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${theme.tertiary} 7%, transparent)`, color: theme.tertiary }}>
                                        <item.icon size={18} />
                                    </span>
                                    <div>
                                        <p className="text-xs font-normal text-text-secondary">{item.label}</p>
                                        <p className="text-xl font-semibold" style={{ color: theme.primary }}>{item.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>

                    <section className="mb-8 rounded-2xl border border-border bg-surface p-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="relative w-full md:max-w-xl">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                                <input type="text" placeholder="Buscar por nome..." value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="w-full rounded-xl border border-border bg-surface-secondary/50 py-2.5 pl-10 pr-3 text-sm text-text-secondary outline-none transition focus:bg-surface focus:ring-2" style={{ "--tw-ring-color": `color-mix(in srgb, ${theme.tertiary} 15%, transparent)` } as any} />
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
                                        preco_jato: 0,
                                        preco_adesivo: 0,
                                        bordasSelecionadas: [],
                                        formatoSelecionado: ""
                                    });
                                    setMostrarModal(true);
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition hover:brightness-105 active:scale-[0.98]"
                                style={{ backgroundColor: theme.tertiary, color: theme.primary }}
                            >
                                <PlusCircle size={17} /> Novo acabamento
                            </button>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-[22px] border border-border bg-surface shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-normal text-text-primary">Acabamentos cadastrados</h2>
                                <p className="mt-0.5 text-xs text-text-secondary">Exibindo {acabamentosFiltrados.length} de {acabamentos.length} acabamentos</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                            <thead className="border-b border-border bg-surface-secondary/80 text-xs text-text-secondary">
                                <tr>
                                    <th className="px-4 py-3.5 font-normal">Acabamento</th>
                                    <th className="px-4 py-3.5 font-normal">Tipo cálculo</th>
                                    <th className="px-4 py-3.5 font-normal">Preço/valor</th>
                                    <th className="px-4 py-3.5 font-normal">Modelo visual</th>
                                    <th className="px-4 py-3.5 text-center font-normal">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {acabamentosFiltrados.map(s => {
                                    let opcaoVisual = opcoesVisual.find(o => o.value === s.tipo_visual);

                                    // 2. Se não achar, tenta achar apenas a borda (ex: 'semi_oval')
                                    if (!opcaoVisual) {
                                        opcaoVisual = opcoesVisual.find(o => o.value === s.tipo_visual.split('-')[0]);
                                    }

                                    // 3. Define o label a ser exibido
                                    const labelVisual = opcaoVisual ? opcaoVisual.label : s.tipo_visual;

                                    return (
                                        <tr key={s.id} className="transition-colors hover:bg-surface-secondary/80">
                                            <td className="px-4 py-3.5 text-text-primary">
                                                {s.nome}
                                                {(s.sobra_largura > 0 || s.sobra_altura > 0) && (
                                                    <span className="block text-xs text-text-secondary">+{s.sobra_largura}cm x +{s.sobra_altura}cm</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5"><span className="rounded-full border px-2.5 py-1 text-[11px] font-normal" style={{ color: theme.tertiary, borderColor: `color-mix(in srgb, ${theme.tertiary} 20%, transparent)`, backgroundColor: `color-mix(in srgb, ${theme.tertiary} 6%, transparent)` }}>{s.tipo_calculo}</span></td>
                                            <td className="px-4 py-3.5 text-text-primary">
                                                {s.tipo_calculo === 'porcentagem' ? `${s.porcentagem_aumento ?? 0}%`
                                                    : s.tipo_calculo === 'm2' ? `${formatarPreco(s.preco)} / m²` // <--- Adicionado
                                                        : formatarPreco(s.preco)}
                                            </td>

                                            {/* --- AQUI É ONDE EXIBIMOS O NOME DO MODELO --- */}
                                            <td className="px-4 py-3.5 text-text-secondary">{labelVisual}</td>

                                            <td className="px-4 py-3.5">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditando(s);
                                                            setNovoAcabamento({
                                                                ...s,
                                                                preco: s.tipo_calculo === 'porcentagem' ? (s.porcentagem_aumento ?? 0)
                                                                    : (s.preco ?? 0),
                                                                preco_jato: s.preco_jato ?? 0,
                                                                preco_adesivo: s.preco_adesivo ?? 0,

                                                                bordasSelecionadas: s.bordasSelecionadas ?? [s.tipo_visual?.split('-')[0] || 'lapidado'],
                                                                formatoSelecionado: s.tipo_visual?.split('-')[1] || ""
                                                            });

                                                            setMostrarModal(true);
                                                        }}
                                                        className="rounded-xl p-2.5 transition hover:bg-surface-secondary"
                                                        style={{ color: theme.primary }}
                                                    >
                                                        <Edit2 size={17} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAcabamentoParaExcluir(s);
                                                            setMostrarModalExclusao(true);
                                                        }}
                                                        className="rounded-xl p-2.5 text-danger transition hover:bg-danger-soft hover:text-danger"
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </section>
                </main>
            </div>

            {/* MODAL */}
            {mostrarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-navigation/30 px-4 py-6 backdrop-blur-[2px]">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_24px_70px_var(--shadow)]">

                        {/* HEADER FIXO */}
                        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                            <div>
                              <h2 className="text-lg font-semibold text-text-primary">
                                {editando ? "Editar" : "Novo"} Acabamento
                              </h2>
                              <div className="mt-2 h-0.5 w-8 rounded-full bg-border" />
                            </div>
                            <button onClick={() => setMostrarModal(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-secondary transition hover:bg-surface-secondary hover:text-text-secondary" title="Fechar">
                                <X size={16} />
                            </button>
                        </div>

                        {/* CONTEÚDO COM SCROLL */}
                        <div className="flex-1 overflow-y-auto px-5 py-5">
                            <div className="space-y-6">
                                <input
                                    type="text"
                                    placeholder="Nome do Acabamento (ex: Orgânico)"
                                    value={novoAcabamento.nome}
                                    onChange={e => setNovoAcabamento({ ...novoAcabamento, nome: e.target.value })}
                                    className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": theme.tertiary } as any}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        value={novoAcabamento.tipo_calculo}
                                        onChange={e => setNovoAcabamento({ ...novoAcabamento, tipo_calculo: e.target.value as Acabamento["tipo_calculo"] })}
                                        className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:ring-2"
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
                                        className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:ring-2"
                                        style={{ "--tw-ring-color": theme.tertiary } as any}
                                    />
                                </div>

                                <p className="text-xs leading-5 text-text-secondary">
                                    Em Espelhos, m² usa a área com sobras e arredondamento para cima de 5 em 5 cm por peça.
                                    Metro linear usa 2 × (largura + altura) de cada peça, sem sobras, inclusive em formatos curvos.
                                    Unitário cobra cada peça do jogo. Porcentagem incide somente sobre o valor do vidro.
                                    Jato e adesivo são somados por m² quando preenchidos, em qualquer formato; zero não cobra adicional.
                                </p>
                                {/* Margem de Cálculo */}
                                <div>
                                    <label className="mb-2 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">
                                        Margem de Cálculo para Área (em cm)
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="number" placeholder="Sobra Largura (cm)" value={novoAcabamento.sobra_largura === 0 ? "" : novoAcabamento.sobra_largura} onChange={e => setNovoAcabamento({ ...novoAcabamento, sobra_largura: parseFloat(e.target.value) || 0 })} className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:ring-2" style={{ "--tw-ring-color": theme.tertiary } as any} />
                                        <input type="number" placeholder="Sobra Altura (cm)" value={novoAcabamento.sobra_altura === 0 ? "" : novoAcabamento.sobra_altura} onChange={e => setNovoAcabamento({ ...novoAcabamento, sobra_altura: parseFloat(e.target.value) || 0 })} className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:ring-2" style={{ "--tw-ring-color": theme.tertiary } as any} />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">
                                        Preços adicionais de jato e adesivo (R$/m²)
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="number"
                                            placeholder="Preço Jato (R$/m²)"
                                            value={novoAcabamento.preco_jato === 0 ? "" : novoAcabamento.preco_jato}
                                            onChange={e => setNovoAcabamento({ ...novoAcabamento, preco_jato: parseFloat(e.target.value) || 0 })}
                                            className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:ring-2"
                                            style={{ "--tw-ring-color": theme.tertiary } as any}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Preço Adesivo (R$/m²)"
                                            value={novoAcabamento.preco_adesivo === 0 ? "" : novoAcabamento.preco_adesivo}
                                            onChange={e => setNovoAcabamento({ ...novoAcabamento, preco_adesivo: parseFloat(e.target.value) || 0 })}
                                            className="rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none focus:ring-2"
                                            style={{ "--tw-ring-color": theme.tertiary } as any}
                                        />
                                    </div>
                                </div>

                                {/* 1. SELEÇÃO DE BORDA (MODIFICADO PARA MÚLTIPLA SELEÇÃO) */}
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase ml-1 mb-3 block">
                                        Tipos de Borda a Cadastrar
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Se já tem lapidado, remove, senão adiciona
                                                const bordas = novoAcabamento.bordasSelecionadas || [];
                                                const novasBordas = bordas.includes('lapidado') ? bordas.filter(b => b !== 'lapidado')
                                                    : [...bordas, 'lapidado'];
                                                setNovoAcabamento({ ...novoAcabamento, bordasSelecionadas: novasBordas } as any);
                                            }}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all 
                                ${novoAcabamento.bordasSelecionadas?.includes('lapidado') ? 'border-info bg-info-soft' : 'border-border hover:border-border'}`}
                                        >
                                            <div className="w-6 h-6 border-4 border-border-strong rounded-sm"></div>
                                            <span className="text-sm font-semibold">Lapidado</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const bordas = novoAcabamento.bordasSelecionadas || [];
                                                const novasBordas = bordas.includes('bisote') ? bordas.filter(b => b !== 'bisote')
                                                    : [...bordas, 'bisote'];
                                                setNovoAcabamento({ ...novoAcabamento, bordasSelecionadas: novasBordas } as any);
                                            }}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all 
                                ${novoAcabamento.bordasSelecionadas?.includes('bisote') ? 'border-info bg-info-soft' : 'border-border hover:border-border'}`}
                                        >
                                            <div className="w-6 h-6 border-[6px] border-double border-border-strong rounded-sm"></div>
                                            <span className="text-sm font-semibold">Bisotê</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. FORMATO DO ESPELHO */}
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase ml-1 mb-3 block">
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
    ${novoAcabamento.formatoSelecionado === 'jogo'
                                                    ? 'border-info bg-info-soft'
                                                    : 'border-border hover:border-border bg-surface-secondary'}`}
                                        >
                                            {/* --- O DESENHO DO JOGO PERMANECE AQUI --- */}
                                            <div className="grid grid-cols-3 gap-1 p-2 bg-surface rounded-lg">
                                                {[...Array(9)].map((_, i) => (
                                                    <div key={i} className={`w-5 h-5 bg-border rounded-sm border border-border-strong`}></div>
                                                ))}
                                            </div>
                                            <span className="text-xs font-semibold text-text-primary">Jogo de Espelhos</span>
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
                                ${novoAcabamento.formatoSelecionado === opt.value ? 'border-info bg-info-soft'
                                                                : 'border-border hover:border-border bg-surface-secondary'}`}
                                                    >
                                                        <div className={`${opt.size ?? 'w-12 h-12'} bg-surface ${opt.className}`}></div>
                                                        <span className="text-xs font-semibold text-text-primary text-center leading-tight">{opt.label}</span>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER FIXO */}
                        <div className="p-5 border-t border-border bg-surface flex gap-3">
                            <button
                                onClick={() => setMostrarModal(false)}
                                className="flex-1 py-2.5 text-sm font-semibold text-text-secondary bg-surface border border-border rounded-xl hover:bg-surface-secondary hover:border-border-strong transition"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-navigation/30 px-4 py-6 backdrop-blur-[2px]">
                    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_24px_70px_var(--shadow)]">

                        {/* Título e ícone menor */}
                        <div className="flex items-start gap-3 px-5 py-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-danger-soft">
                                <Trash2 className="h-5 w-5 text-danger" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-text-primary">
                                    Excluir Acabamento
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-text-secondary">
                                    Tem certeza que deseja excluir o acabamento <span className="font-medium text-text-primary">{acabamentoParaExcluir.nome}</span>x
                                </p>
                            </div>
                        </div>

                        {/* FOOTER DO MODAL (BOTOES MENORES) */}
                        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                            <button
                                onClick={() => {
                                    setAcabamentoParaExcluir(null);
                                    setMostrarModalExclusao(false);
                                }}
                                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={() => {
                                    deletarAcabamento(acabamentoParaExcluir.id);
                                    setAcabamentoParaExcluir(null);
                                    setMostrarModalExclusao(false);
                                }}
                                className="rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-on-danger transition hover:bg-danger"
                            >
                                {carregando ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Excluir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CadastrosAvisoModal
                aviso={modalAviso}
                onClose={() => setModalAviso(null)}
                colors={{
                    bg: "#FFFFFF",
                    text: theme.primary,
                    primaryButtonBg: theme.primary,
                    primaryButtonText: theme.secondary,
                }}
            />
        </div>
    )
}

