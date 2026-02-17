"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { PlusCircle, ChevronRight, Trash2, Percent, Check, Search, AlertTriangle, X, ArrowLeft, Layers3, DollarSign, Edit2, Save, Menu, Building2, ChevronDown, LogOut, Settings, Palette, TableProperties, FileText, BarChart3, Square, Package, Wrench, Boxes, Briefcase, UsersRound, ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
// 🔥 IMPORTANTE: Importar o hook de tema
import { useTheme } from "@/context/ThemeContext"
import { LayoutDashboard } from "lucide-react"

// --- Tipagens ---
type TabelaPreco = { id: number; nome: string }
type Vidro = { id: number; nome: string; preco: number; espessura: string; tipo: string; }
type ItemTabela = {
  id: number;
  grupo_preco_id: number;
  vidro_id: number;
  preco: number;
  vidros?: { nome: string; espessura: string; tipo: string; }
}

type MenuItem = {
  nome: string
  rota: string
  icone: any
  submenu?: { nome: string; rota: string }[]
}

// Menus fixos
const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  {
    nome: "Orçamentos",
    rota: "/orcamentos",
    icone: FileText,
    submenu: [
      { nome: "Espelhos", rota: "/espelhos" },
      { nome: "Vidros", rota: "/calculovidro" },
      { nome: "Vidros PDF", rota: "/calculovidroPDF" },
    ]
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
]

export default function GestaoPrecosPage() {
  const router = useRouter()
  // 🔥 Consumir o tema do contexto
  const { theme } = useTheme();

  // --- Estados de Auth e UI ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [modalExclusaoTabelaAberto, setModalExclusaoTabelaAberto] = useState<{ aberto: boolean, tabela: TabelaPreco | null }>({ aberto: false, tabela: null });

  // --- Estados da Lógica de Negócio ---
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([])
  const [vidros, setVidros] = useState<Vidro[]>([])
  const [tabelaSelecionada, setTabelaSelecionada] = useState<TabelaPreco | null>(null)
  const [itensTabela, setItensTabela] = useState<ItemTabela[]>([])

  const [nomeNovaTabela, setNomeNovaTabela] = useState("")
  const [percentualReajuste, setPercentualReajuste] = useState<string>("5")
  const [termoPesquisa, setTermoPesquisa] = useState("")
  const [novoVidroId, setNovoVidroId] = useState("")
  const [novoPrecoVidro, setNovoPrecoVidro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false)
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState<{ aberto: boolean, item: ItemTabela | null }>({ aberto: false, item: null })
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [tempPreco, setTempPreco] = useState<string>("");

  const excluirTabela = async () => {
    if (!modalExclusaoTabelaAberto.tabela) return;

    const { error } = await supabase
      .from("tabelas")
      .delete()
      .eq("id", modalExclusaoTabelaAberto.tabela.id);

    if (!error) {
      carregarTabelas();
      setTabelaSelecionada(null); // Limpa a seleção se a tabela for excluída
      setModalExclusaoTabelaAberto({ aberto: false, tabela: null });
    } else {
      alert("Erro ao excluir tabela. Verifique se ela não possui itens vinculados.");
    }
  };

  // --- Efeitos de Inicialização e Auth ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const fetchData = async () => {
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

      if (perfil) {
        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nome")
          .eq("id", perfil.empresa_id)
          .single();

        if (empresaData) setNomeEmpresa(empresaData.nome);
        // Branding já carregado pelo Contexto
      }

      await carregarTabelas();
      await carregarTodosVidros();
      setCheckingAuth(false);
    };
    fetchData();

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  // --- Funções de Carregamento de Dados ---
  const carregarTabelas = useCallback(async () => {
    const { data } = await supabase.from("tabelas").select("*").order("nome", { ascending: true })
    setTabelas(data || [])
  }, [])

  const carregarTodosVidros = useCallback(async () => {
    const { data, error } = await supabase.from("vidros").select("id, nome, espessura, tipo, preco")
    if (error) console.error("Erro ao carregar vidros:", error)
    else {
      const vidrosFormatados = data?.map(v => ({
        id: v.id,
        nome: `${v.nome} - ${v.espessura}mm - ${v.tipo}`,
        preco: v.preco,
        espessura: v.espessura,
        tipo: v.tipo
      })) || [];
      setVidros(vidrosFormatados);
    }
  }, [])

  const carregarItensTabela = useCallback(async (tabelaId: number) => {
    setCarregando(true)
    const { data } = await supabase
      .from("vidro_precos_grupos")
      .select("*, vidros(nome, espessura, tipo)")
      .eq("grupo_preco_id", tabelaId)
      .order("vidros(nome)", { ascending: true })

    if (data) setItensTabela(data)
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (tabelaSelecionada) {
      carregarItensTabela(tabelaSelecionada.id)
    } else {
      setItensTabela([])
    }
  }, [tabelaSelecionada, carregarItensTabela])

  // --- Ações ---
  const criarTabela = async () => {
    if (!nomeNovaTabela.trim()) return
    const { error } = await supabase.from("tabelas").insert({ nome: nomeNovaTabela })
    if (!error) {
      setNomeNovaTabela("")
      carregarTabelas()
    }
  }

  const adicionarVidroATabela = async () => {
    if (!tabelaSelecionada || !novoVidroId || !novoPrecoVidro) return
    const { error } = await supabase.from("vidro_precos_grupos").insert({
      grupo_preco_id: tabelaSelecionada.id,
      vidro_id: parseInt(novoVidroId),
      preco: parseFloat(novoPrecoVidro)
    })
    if (!error) {
      setNovoVidroId("")
      setNovoPrecoVidro("")
      setTermoPesquisa("")
      carregarItensTabela(tabelaSelecionada.id)
    } else alert("Erro ao adicionar vidro.")
  }

  const iniciarEdicao = (item: ItemTabela) => {
    setEditingItemId(item.id);
    setTempPreco(item.preco.toString());
  };

  const salvarEdicao = async (itemId: number) => {
    const { error } = await supabase
      .from("vidro_precos_grupos")
      .update({ preco: parseFloat(tempPreco) })
      .eq("id", itemId);

    if (!error) {
      setEditingItemId(null);
      carregarItensTabela(tabelaSelecionada!.id);
    } else alert("Erro ao atualizar preço.");
  };

  const confirmarExclusao = async () => {
    if (!modalExclusaoAberto.item) return;
    const { error } = await supabase
      .from("vidro_precos_grupos")
      .delete()
      .eq("id", modalExclusaoAberto.item.id);
    if (!error) {
      carregarItensTabela(tabelaSelecionada!.id);
      setModalExclusaoAberto({ aberto: false, item: null });
    }
  };

  const vidrosFiltrados = useMemo(() => {
    if (!termoPesquisa.trim()) return vidros;
    const palavrasPesquisa = termoPesquisa.toLowerCase().trim().split(/\s+/);
    return vidros.filter(v => {
      const nomeVidro = v.nome.toLowerCase();
      return palavrasPesquisa.every(palavra => nomeVidro.includes(palavra));
    });
  }, [vidros, termoPesquisa])

  const aplicarReajuste = async () => {
    if (!tabelaSelecionada || !percentualReajuste) return
    const perc = parseFloat(percentualReajuste)
    const fator = 1 + (perc / 100)
    setCarregando(true)
    const { error } = await supabase.rpc('reajustar_precos_tabela', {
      p_tabela_id: tabelaSelecionada.id,
      p_fator: fator
    })
    if (error) alert("Erro: " + error.message)
    else carregarItensTabela(tabelaSelecionada.id)
    setCarregando(false)
    setModalReajusteAberto(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- Renderização do Menu (Padronizado) ---
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone
    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => { router.push(item.rota); setShowMobileMenu(false); }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
          style={{ color: theme.menuTextColor, backgroundColor: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = theme.menuIconColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.menuTextColor;
          }}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: theme.menuIconColor }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
          {item.submenu && <ChevronRight className="w-4 h-4" style={{ color: theme.menuTextColor, opacity: 0.7 }} />}
        </div>
        {item.submenu && (
          <div className="ml-7 flex flex-col gap-1 pl-2" style={{ borderLeft: `1px solid ${theme.menuTextColor}4D` }}>
            {item.submenu.map((sub) => (
              <div key={sub.nome} onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                className="p-2 text-xs rounded-lg cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
                style={{ color: theme.menuTextColor }}
              >
                {sub.nome}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.menuBackgroundColor, borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-gray-900" style={{ backgroundColor: theme.screenBackgroundColor }}>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: theme.menuBackgroundColor }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50">
          <X size={24} />
        </button>
        <div className="px-3 py-4 mb-4 flex justify-center">
          <Image src={theme.logoDarkUrl || "/glasscode2.png"} alt="Logo ERP" width={200} height={56} className="h-12 md:h-14 object-contain" />
        </div>

        <nav className="flex-1 overflow-y-auto space-y-6 pr-2">
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.menuIconColor }}>Principal</p>
            {menuPrincipal.map(renderMenuItem)}
          </div>
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.menuIconColor }}>Cadastros</p>
            {menuCadastros.map(renderMenuItem)}
          </div>
        </nav>
      </aside>

      {/* Overlay */}
      {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full">

        {/* TOPBAR */}
        <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg }}>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu size={24} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-4 bg-gray-100 px-3 py-2 rounded-full w-full md:w-96 border border-gray-200">
              <Search className="text-gray-400" size={18} />
              <input type="search" placeholder="Buscar..." className="w-full text-sm bg-transparent outline-none" />
            </div>
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
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Logado como</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{usuarioEmail}</p>
                  </div>

                  <button
                    onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"
                  >
                    <Settings size={18} className="text-gray-400" />
                    Configurações
                  </button>

                  <button
                    onClick={() => { setShowUserMenu(false); router.push("/configuracoes/branding"); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"
                  >
                    <Palette size={18} className="text-gray-400" />
                    Identidade Visual
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <LogOut size={18} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTEÚDO ESPECÍFICO */}
        <main className="p-4 md:p-8 flex-1">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="p-2 rounded-xl bg-white border border-gray-100 hover:bg-gray-50">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl md:text-4xl font-black" style={{ color: theme.contentTextLightBg }}>Gestão de Preços</h1>
              <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Gerencie tabelas e reajustes de preços dos vidros.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* COLUNA ESQUERDA - GRUPOS */}
           <div className="md:col-span-1 p-6 rounded-3xl border border-gray-100 shadow-sm h-fit" style={{ backgroundColor: theme.contentTextDarkBg }}>
  <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.contentTextLightBg }}>
    <Layers3 size={20} style={{ color: theme.menuIconColor }} /> Grupos de Preço
  </h2>
  
  {/* 🔥 INPUT E BOTÃO DE ADICIONAR INTEGRADOS */}
  <div className="relative mb-5 group/add">
    <input 
      type="text" 
      value={nomeNovaTabela} 
      onChange={e => setNomeNovaTabela(e.target.value)} 
      placeholder="Nova tabela..." 
      // 🔥 Aumentei o padding direito (pr-16) para o texto não ficar embaixo do botão
      className="w-full p-2.5 pr-16 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
    />
    <button 
      onClick={criarTabela} 
      // 🔥 REMOVI 'opacity-0' E 'group-hover/add:opacity-100' PARA FICAR VISÍVEL SEMPRE
      className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-300 flex-shrink-0" 
      style={{ backgroundColor: theme.menuBackgroundColor, color: "#FFF" }}
    >
      <PlusCircle size={20} />
    </button>
  </div>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {tabelas.map(t => (
                  <div
                    key={t.id}
                    className={`w-full group text-left p-3.5 rounded-xl font-medium flex justify-between items-center transition-all ${tabelaSelecionada?.id === t.id ? 'bg-blue-50 text-blue-800 shadow-inner' : 'hover:bg-gray-50'}`}
                    style={{ border: `1px solid ${tabelaSelecionada?.id === t.id ? '#BFDBFE' : '#E5E7EB'}` }}
                  >
                    <div className="flex-1 cursor-pointer truncate" onClick={() => setTabelaSelecionada(t)}>
                      <span className="truncate">{t.nome}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {tabelaSelecionada?.id === t.id && <Check size={18} className="text-blue-600" />}

                      <button
                        // 🔥 Chamando a função correta de exclusão
                        onClick={() => setModalExclusaoTabelaAberto({ aberto: true, tabela: t })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUNA DIREITA - ITENS */}
            <div className="md:col-span-3 p-6 rounded-3xl border border-gray-100 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg }}>
              {tabelaSelecionada ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tabela Selecionada</p>
                      <h2 className="text-3xl font-extrabold" style={{ color: theme.contentTextLightBg }}>{tabelaSelecionada.nome}</h2>
                    </div>
                    <div className="flex gap-2 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <div className="relative">
                        <Percent size={16} className="absolute left-3 top-3.5 text-gray-400" />
                        <input type="number" value={percentualReajuste} onChange={e => setPercentualReajuste(e.target.value)} placeholder="%" className="w-24 p-2.5 pl-9 border border-gray-200 rounded-xl text-sm font-bold" />
                      </div>
                      <button onClick={() => setModalReajusteAberto(true)} disabled={carregando} className="px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold text-sm transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: theme.menuIconColor, color: "#FFF" }}>
                        {carregando ? "Processando..." : "Reajustar %"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="md:col-span-5 relative">
                      <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input type="text" value={termoPesquisa} onChange={e => setTermoPesquisa(e.target.value)} placeholder="Pesquisar vidro..." className="w-full p-2.5 pl-10 rounded-xl border border-gray-200 text-sm" />
                    </div>
                    <select value={novoVidroId} onChange={e => setNovoVidroId(e.target.value)} className="md:col-span-4 p-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                      <option value="">Selecione o Vidro</option>
                      {vidrosFiltrados.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                    </select>
                    <div className="md:col-span-2 relative">
                      <DollarSign size={16} className="absolute left-3 top-3.5 text-gray-400" />
                      <input type="number" value={novoPrecoVidro} onChange={e => setNovoPrecoVidro(e.target.value)} placeholder="Preço" className="w-full p-2.5 pl-8 rounded-xl border border-gray-200 text-sm" />
                    </div>
                    <button onClick={adicionarVidroATabela} className="md:col-span-1 p-2.5 rounded-xl text-sm font-semibold flex items-center justify-center transition hover:opacity-90" style={{ backgroundColor: theme.menuBackgroundColor, color: "#FFF" }}>
                      <PlusCircle size={20} />
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="p-4 text-left font-semibold">Vidro / Especificação</th>
                          <th className="p-4 text-right font-semibold">Preço (R$)</th>
                          <th className="p-4 text-center font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itensTabela.map(item => (
                          <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="p-4 font-medium" style={{ color: theme.menuBackgroundColor }}>
                              <div className="font-bold">{item.vidros?.nome}</div>
                              <div className="text-xs text-gray-500 font-normal">{item.vidros?.espessura}mm | {item.vidros?.tipo}</div>
                            </td>
                            <td className="p-4 text-right">
                              {editingItemId === item.id ? (
                                <input type="number" value={tempPreco} onChange={e => setTempPreco(e.target.value)} className="w-28 p-1.5 border rounded-lg text-right font-mono text-sm" />
                              ) : (
                                <span className="font-mono text-sm font-semibold" style={{ color: theme.menuBackgroundColor }}>
                                  {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-2">
                                {editingItemId === item.id ? (
                                  <button onClick={() => salvarEdicao(item.id)} className="p-2.5 rounded-xl text-green-600 hover:bg-green-50" title="Salvar">
                                    <Save size={18} />
                                  </button>
                                ) : (
                                  <button onClick={() => iniciarEdicao(item)} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: theme.menuBackgroundColor }} title="Editar">
                                    <Edit2 size={18} />
                                  </button>
                                )}
                                <button onClick={() => setModalExclusaoAberto({ aberto: true, item })} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50" title="Excluir">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {itensTabela.length === 0 && <tr><td colSpan={3} className="text-center py-10 text-gray-500">Nenhum vidro adicionado.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <TableProperties size={50} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-semibold">Nenhuma tabela selecionada</p>
                  <p className="text-sm">Selecione um grupo de preço ao lado para gerenciar.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* --- MODAIS (Usando cores do tema) --- */}
      {modalReajusteAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold flex items-center gap-3"><AlertTriangle className="text-amber-500" size={24} /> Confirmar Reajuste</h3>
              <button onClick={() => setModalReajusteAberto(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <p className="text-gray-600 mb-8 bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm">
              Tem certeza que deseja aplicar <span className="font-bold">{parseFloat(percentualReajuste)}%</span> de reajuste nos preços da tabela <span className="font-semibold">{tabelaSelecionada?.nome}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalReajusteAberto(false)} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={aplicarReajuste} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: theme.menuBackgroundColor }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {modalExclusaoTabelaAberto.aberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /> Remover Tabela</h3>
              <button onClick={() => setModalExclusaoTabelaAberto({ aberto: false, tabela: null })} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <p className="text-gray-600 mb-8 bg-red-50 p-4 rounded-xl border border-red-100 text-sm">
              Tem certeza que deseja remover a tabela <span className="font-bold">{modalExclusaoTabelaAberto.tabela?.nome}</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalExclusaoTabelaAberto({ aberto: false, tabela: null })} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={excluirTabela} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Sim, remover</button>
            </div>
          </div>
        </div>
      )}

      {modalExclusaoAberto.aberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /> Remover Item</h3>
              <button onClick={() => setModalExclusaoAberto({ aberto: false, item: null })} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <p className="text-gray-600 mb-8 bg-red-50 p-4 rounded-xl border border-red-100 text-sm">
              Remover <span className="font-bold">{modalExclusaoAberto.item?.vidros?.nome}</span> da tabela <span className="font-semibold">{tabelaSelecionada?.nome}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalExclusaoAberto({ aberto: false, item: null })} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={confirmarExclusao} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Sim, remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}