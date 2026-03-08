//src/app/admin/tabelas/page.tsx
"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { PlusCircle, ChevronRight, Trash2, Percent, Check, Search, AlertTriangle, X, ArrowLeft, Layers3, DollarSign, Edit2, Save, Menu, Building2, ChevronDown, LogOut, Settings, Palette, TableProperties, FileText, BarChart3, Square, Package, Wrench, Boxes, Briefcase, UsersRound, ImageIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
// 🔥 IMPORTANTE: Importar o hook de tema
import { useTheme } from "@/context/ThemeContext"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar";
import ThemeLoader from "@/components/ThemeLoader"

// --- Tipagens ---
type TabelaPreco = { id: string; nome: string } // de number para string
type Vidro = { id: string; nome: string; preco: number; espessura: string; tipo: string; } // de number para string
type ItemTabela = {
  id: string; // de number para string
  grupo_preco_id: string; // de number para string
  vidro_id: string; // de number para string
  preco: number;
  vidros?: { nome: string; espessura: string; tipo: string; }
}

type MenuItem = {
  nome: string
  rota: string
  icone: any
  submenu?: { nome: string; rota: string }[]
}

export default function GestaoPrecosPage() {
  const router = useRouter()
  const pathname = usePathname();
  // 🔥 Consumir o tema do contexto
  const { theme } = useTheme();
  const [empresaIdAtual, setEmpresaIdAtual] = useState<string>("");

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
  const [modalSucessoAberto, setModalSucessoAberto] = useState<{ aberto: boolean, mensagem: string }>({ aberto: false, mensagem: "" });

  const [nomeNovaTabela, setNomeNovaTabela] = useState("")
  const [percentualReajuste, setPercentualReajuste] = useState<string>("5")
  const [termoPesquisa, setTermoPesquisa] = useState("")
  const [novoVidroId, setNovoVidroId] = useState("")
  const [novoPrecoVidro, setNovoPrecoVidro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false)
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState<{ aberto: boolean, item: ItemTabela | null }>({ aberto: false, item: null })
  const [modalAvisoAberto, setModalAvisoAberto] = useState<{ aberto: boolean, mensagem: string }>({ aberto: false, mensagem: "" });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempPreco, setTempPreco] = useState<string>("");
  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);
  const [novoPrecoEdicao, setNovoPrecoEdicao] = useState<string>("");

  const iniciarEdicao = (item: any) => {
    if (!tabelaSelecionada) return; // Segurança extra
    setEditandoItemId(item.id);
    setNovoPrecoEdicao(item.preco.toString());
  };

  const salvarEdicaoPreco = async (id: string) => {
  if (!novoPrecoEdicao || isNaN(parseFloat(novoPrecoEdicao))) return;

  setCarregando(true); // Feedback visual
  const precoNumerico = parseFloat(novoPrecoEdicao);

  const { error } = await supabase
    .from("vidro_precos_grupos")
    .update({ preco: precoNumerico })
    .eq("id", id);

  if (!error) {
    // 1. Atualiza o estado local IMEDIATAMENTE para refletir na tela
    setItensTabela(prev => 
      prev.map(item => item.id === id ? { ...item, preco: precoNumerico } : item)
    );

    // 2. Limpa o estado de edição
    setEditandoItemId(null);
    setNovoPrecoEdicao("");
    
    // 3. Opcional: Recarrega do banco para garantir sincronia total
    if (tabelaSelecionada?.id) {
      await carregarItensTabela(tabelaSelecionada.id);
    }

    setModalSucessoAberto({ aberto: true, mensagem: "Preço atualizado!" });
  } else {
    console.error("Erro ao salvar preço:", error);
    setModalAvisoAberto({ aberto: true, mensagem: "Erro ao atualizar preço no banco." });
  }
  setCarregando(false);
};

  const excluirTabela = async () => {
    if (!modalExclusaoTabelaAberto.tabela || !empresaIdAtual) {
      console.error("Faltando ID da tabela ou da empresa");
      return;
    }

    // 1. Primeiro removemos os itens vinculados a essa tabela (Boa prática para evitar erro de FK)
    await supabase
      .from("vidro_precos_grupos")
      .delete()
      .eq("grupo_preco_id", modalExclusaoTabelaAberto.tabela.id);

    // 2. Agora excluímos a tabela de fato
    const { error } = await supabase
      .from("tabelas")
      .delete()
      .eq("id", modalExclusaoTabelaAberto.tabela.id)
      .eq("empresa_id", empresaIdAtual); // Garante que você é o dono

    if (!error) {
      setTabelas(prev => prev.filter(t => t.id !== modalExclusaoTabelaAberto.tabela?.id));
      setTabelaSelecionada(null);
      setModalExclusaoTabelaAberto({ aberto: false, tabela: null });
      // 🔥 NOVO: Abre o seu modal customizado
      setModalSucessoAberto({ aberto: true, mensagem: "A tabela foi removida com sucesso!" });
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
        // 🔥 SALVE O ID AQUI
        setEmpresaIdAtual(perfil.empresa_id);

        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nome")
          .eq("id", perfil.empresa_id)
          .single();

        if (empresaData) setNomeEmpresa(empresaData.nome);

        // 🔥 PASSE O ID PARA AS FUNÇÕES DE CARREGAMENTO
        await carregarTabelas(perfil.empresa_id);
        await carregarTodosVidros(perfil.empresa_id);
      }
      setCheckingAuth(false);
    };

    fetchData();

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  // --- Funções de Carregamento de Dados ---
  const carregarTabelas = useCallback(async (empresaId: string) => {
    const { data } = await supabase
      .from("tabelas")
      .select("*")
      .eq("empresa_id", empresaId) // 🔥 Agora empresaId é conhecido
      .order("nome", { ascending: true });
    setTabelas(data || []);
  }, []);

  const carregarTodosVidros = useCallback(async (empresaId: string) => {
    // Se o empresaId vier vazio, tentamos pegar do usuário logado
    let idParaFiltrar = empresaId;

    if (!idParaFiltrar) {
      const { data: { user } } = await supabase.auth.getUser();
      idParaFiltrar = user?.user_metadata?.empresa_id;
    }

    if (!idParaFiltrar) return;

    const { data, error } = await supabase
      .from("vidros")
      .select("id, nome, espessura, tipo, preco")
      .eq("empresa_id", idParaFiltrar); // Filtro agora está blindado

    if (error) {
      console.error("Erro ao carregar vidros:", error);
    } else {
      const vidrosFormatados = data?.map(v => ({
        id: v.id,
        nome: `${v.nome} - ${v.espessura}mm - ${v.tipo}`,
        preco: v.preco,
        espessura: v.espessura,
        tipo: v.tipo
      })) || [];
      setVidros(vidrosFormatados);
    }
  }, []);

  const carregarItensTabela = useCallback(async (tabelaId: string) => { // de number para string
    setCarregando(true)
    const { data } = await supabase
      .from("vidro_precos_grupos")
      .select("*, vidros(nome, espessura, tipo)")
      .eq("grupo_preco_id", tabelaId)
      .order("id", { ascending: true }) // mudei de vidros(nome) para id para evitar erro de join

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
    // Log para você ver no console (F12) o que está vindo vazio
    // Verifique se o log mostra o UUID correto da empresa antes do erro
console.log("Enviando empresa_id:", empresaIdAtual);

    if (!nomeNovaTabela.trim()) {
      setModalAvisoAberto({ aberto: true, mensagem: "Dê um nome para a sua tabela de preços." });
      return;
    }

    if (!empresaIdAtual) {
      setModalAvisoAberto({ aberto: true, mensagem: "Erro: Identificação da empresa não encontrada. Tente atualizar a página." });
      return;
    }

    setCarregando(true);
    const { error } = await supabase
      .from("tabelas")
      .insert({
        nome: nomeNovaTabela,
        empresa_id: empresaIdAtual
      });

    if (!error) {
      setNomeNovaTabela("");
      carregarTabelas(empresaIdAtual);
      setModalSucessoAberto({ aberto: true, mensagem: "Tabela criada com sucesso!" });
    } else {
      console.error("Erro ao criar:", error);
      setModalAvisoAberto({ aberto: true, mensagem: "Não foi possível criar a tabela no banco de dados." });
    }
    setCarregando(false);
  };

const adicionarVidroATabela = async () => {
  if (!tabelaSelecionada?.id || !novoVidroId || !novoPrecoVidro) {
    setModalAvisoAberto({ aberto: true, mensagem: "Preencha todos os campos." });
    return;
  }

  setCarregando(true);

const { error } = await supabase
  .from("vidro_precos_grupos")
  .upsert({
    grupo_preco_id: tabelaSelecionada.id,
    vidro_id: novoVidroId,
    preco: parseFloat(novoPrecoVidro),
    empresa_id: empresaIdAtual
  }, { onConflict: 'grupo_preco_id, vidro_id' }); // Especifique as colunas do conflito

  if (error) {
    // Tratando o erro 409 especificamente
    if (error.code === '23505') { 
      setModalAvisoAberto({ 
        aberto: true, 
        mensagem: "Este vidro já está cadastrado nesta tabela. Edite o preço na lista abaixo se desejar alterar." 
      });
    } else {
      setModalAvisoAberto({ aberto: true, mensagem: "Erro ao salvar: " + error.message });
    }
  } else {
    // Sucesso...
    setNovoVidroId("");
    setNovoPrecoVidro("");
    carregarItensTabela(tabelaSelecionada.id);
    setModalSucessoAberto({ aberto: true, mensagem: "Vidro adicionado!" });
  }
  setCarregando(false);
};

  const salvarEdicao = async (itemId: string) => { // de number para string
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
    const Icon = item.icone;

    // Lógica de item ativo baseada no pathname atual
    const isActive = pathname === item.rota || item.submenu?.some(sub => pathname === sub.rota);

    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => {
            router.push(item.rota);
            setShowMobileMenu(false);
          }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
          style={{
            backgroundColor: isActive ? theme.menuHoverColor : "transparent",
            color: theme.menuTextColor,
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.backgroundColor = `${theme.menuTextColor}10`;
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: theme.menuIconColor }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
          {item.submenu && (
            <ChevronRight className="w-4 h-4" style={{ color: theme.menuTextColor, opacity: 0.7 }} />
          )}
        </div>

        {item.submenu && (
          <div className="ml-7 flex flex-col gap-1 pl-2" style={{ borderLeft: `1px solid ${theme.menuTextColor}40` }}>
            {item.submenu.map((sub) => {
              const isSubActive = pathname === sub.rota;
              return (
                <div
                  key={sub.nome}
                  onClick={() => {
                    router.push(sub.rota);
                    setShowMobileMenu(false);
                  }}
                  className="p-2 text-xs rounded-lg cursor-pointer"
                  style={{
                    color: theme.menuTextColor,
                    backgroundColor: isSubActive ? theme.menuHoverColor : "transparent",
                    opacity: isSubActive ? 1 : 0.8
                  }}
                >
                  {sub.nome}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.menuBackgroundColor, borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

   return (
    <div className="flex min-h-screen text-gray-900 overflow-x-hidden" style={{ backgroundColor: theme.screenBackgroundColor }}>

  <Sidebar 
    showMobileMenu={showMobileMenu}
    setShowMobileMenu={setShowMobileMenu}
    nomeEmpresa={nomeEmpresa}
  />

  {showMobileMenu && (
    <div
      className="fixed inset-0 bg-black/50 z-40 md:hidden"
      onClick={() => setShowMobileMenu(false)}
    />
  )}

  <div className="flex-1 flex flex-col w-full min-w-0 overflow-hidden">

    <Header
      setShowMobileMenu={setShowMobileMenu}
      nomeEmpresa={nomeEmpresa}
      usuarioEmail={usuarioEmail}
      handleSignOut={handleSignOut}
    />

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
                    className={`w-full group text-left p-3.5 rounded-xl font-medium flex justify-between items-center transition-all ${tabelaSelecionada?.id === t.id ? 'shadow-inner' : 'hover:bg-gray-50'
                      }`}
                    style={{
                      // Se selecionado, usa a cor do tema com transparência, senão transparente
                      backgroundColor: tabelaSelecionada?.id === t.id ? `${theme.menuBackgroundColor}15` : 'transparent',
                      color: tabelaSelecionada?.id === t.id ? theme.menuBackgroundColor : 'inherit',
                      border: `1px solid ${tabelaSelecionada?.id === t.id ? theme.menuBackgroundColor : '#E5E7EB'}`
                    }}
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
                    <select
                      value={novoVidroId}
                      onChange={e => setNovoVidroId(e.target.value)}
                      className="md:col-span-4 p-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="">Selecione o Vidro</option>
                      {vidrosFiltrados.map(v => (
                        <option key={v.id} value={v.id}>{v.nome}</option>
                      ))}
                    </select>
                    <div className="md:col-span-2 relative">
                      <DollarSign size={16} className="absolute left-3 top-3.5 text-gray-400" />
                      <input type="number" value={novoPrecoVidro} onChange={e => setNovoPrecoVidro(e.target.value)} placeholder="Preço" className="w-full p-2.5 pl-8 rounded-xl border border-gray-200 text-sm" />
                    </div>
                    <button
                      onClick={adicionarVidroATabela}
                      disabled={carregando}
                      className="md:col-span-1 p-2.5 rounded-xl text-sm font-semibold flex items-center justify-center transition hover:opacity-90 disabled:opacity-50"
                      // Troquei menuBackgroundColor por menuIconColor (Turquesa)
                      style={{ backgroundColor: theme.menuIconColor, color: "#FFF" }}
                    >
                      {carregando ? (
                        <div
                          className="w-5 h-5 border-2 rounded-full animate-spin"
                          style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#FFF' }}
                        />
                      ) : (
                        <PlusCircle size={20} />
                      )}
                    </button>
                  </div>

                  <div className="overflow-x-auto mt-6">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-4 px-2 text-xs font-black uppercase tracking-wider opacity-50" style={{ color: theme.modalTextColor }}>Vidro / Especificação</th>
                          <th className="text-center py-4 px-2 text-xs font-black uppercase tracking-wider opacity-50" style={{ color: theme.modalTextColor }}>Preço (R$)</th>
                          <th className="text-right py-4 px-2 text-xs font-black uppercase tracking-wider opacity-50" style={{ color: theme.modalTextColor }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensTabela.map((item) => (
                          <tr key={item.id} className="border-b border-gray-50 group hover:bg-gray-50/50 transition-all">
                            <td className="py-4 px-2">
                              <div className="flex flex-col">
                                {/* Trocamos text-gray-800 pelo style com a cor do tema */}
                                <span
                                  className="font-bold text-sm"
                                  style={{ color: theme.contentTextLightBg }}
                                >
                                  {item.vidros?.nome}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-tight">
                                  {item.vidros?.espessura} | {item.vidros?.tipo}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-2 text-center">
                              {editandoItemId === item.id ? (
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    value={novoPrecoEdicao}
                                    onChange={(e) => setNovoPrecoEdicao(e.target.value)}
                                    className="w-24 p-1.5 border-2 rounded-lg text-xs font-bold outline-none transition-all"
                                    // 🔥 Borda cor tema ao selecionar (focus)
                                    style={{ borderColor: theme.menuIconColor }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => salvarEdicaoPreco(item.id)}
                                    className="hover:scale-110 transition-transform p-1 rounded-md"
                                    style={{ color: theme.menuIconColor }} // Check cor Turquesa
                                  >
                                    <Check size={20} />
                                  </button>
                                </div>
                              ) : (
                                <span className="font-bold text-sm" style={{ color: theme.contentTextLightBg }}>
                                  R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-2 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => iniciarEdicao(item)}
                                  className="p-2 hover:bg-white rounded-lg shadow-sm text-gray-400 hover:text-blue-500 transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setModalExclusaoAberto({ aberto: true, item })}
                                  className="p-2 hover:bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
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

      {/* --- MODAL DE SUCESSO / AVISO (ESTILO DISCRETO & CENTRALIZADO) --- */}
      {(modalSucessoAberto.aberto || modalAvisoAberto.aberto) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/10 animate-scale-in"
            style={{
              backgroundColor: theme.modalBackgroundColor,
              color: theme.modalTextColor
            }}
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-4">

              {/* Ícone */}
              <div className={`w-14 h-14 flex items-center justify-center rounded-2xl ${modalSucessoAberto.aberto ? "bg-green-500/10" : "bg-amber-500/10"
                }`}>
                {modalSucessoAberto.aberto ? (
                  <Check size={26} className="text-green-500" />
                ) : (
                  <AlertTriangle size={26} className="text-amber-500" />
                )}
              </div>

              {/* Título */}
              <h2 className="text-lg font-semibold tracking-tight">
                {modalSucessoAberto.aberto ? "Operação concluída" : "Atenção necessária"}
              </h2>

              {/* Mensagem */}
              <p className="text-sm text-current/80 leading-relaxed">
                {modalSucessoAberto.aberto
                  ? modalSucessoAberto.mensagem
                  : modalAvisoAberto.mensagem}
              </p>

              {/* Botão */}
              <button
                onClick={() => {
                  setModalSucessoAberto({ aberto: false, mensagem: "" });
                  setModalAvisoAberto({ aberto: false, mensagem: "" });
                }}
                className="mt-4 px-5 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: theme.modalButtonBackgroundColor,
                  color: theme.modalButtonTextColor,
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Confirmação (Exclusão/Reajuste) - Centralizado */}
      {(modalReajusteAberto || modalExclusaoTabelaAberto.aberto || modalExclusaoAberto.aberto) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/10 animate-scale-in"
            style={{
              backgroundColor: theme.modalBackgroundColor,
              color: theme.modalTextColor
            }}
          >

            <div className="flex flex-col items-center text-center gap-4">

              {/* Ícone */}
              <div className={`w-14 h-14 flex items-center justify-center rounded-2xl ${modalReajusteAberto ? "bg-amber-500/10" : "bg-red-500/10"
                }`}>
                <AlertTriangle
                  size={26}
                  className={modalReajusteAberto ? "text-amber-500" : "text-red-500"}
                />
              </div>

              {/* Título */}
              <h2 className="text-lg font-semibold tracking-tight">
                Confirmar ação
              </h2>

              {/* Texto */}
              <p className="text-sm text-current/80 leading-relaxed">
                {modalReajusteAberto &&
                  `Aplicar reajuste de ${percentualReajuste}% em ${tabelaSelecionada?.nome}?`}
                {modalExclusaoTabelaAberto.aberto &&
                  `Deseja remover a tabela ${modalExclusaoTabelaAberto.tabela?.nome}?`}
                {modalExclusaoAberto.aberto &&
                  `Remover ${modalExclusaoAberto.item?.vidros?.nome} da lista?`}
              </p>

              {/* Botões */}
              <div className="flex gap-3 w-full mt-2">

                <button
                  onClick={() => {
                    setModalReajusteAberto(false);
                    setModalExclusaoTabelaAberto({ aberto: false, tabela: null });
                    setModalExclusaoAberto({ aberto: false, item: null });
                  }}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-black/5 hover:bg-black/10 transition-all"
                >
                  Cancelar
                </button>


                <button
                  onClick={() => {
                    if (modalReajusteAberto) aplicarReajuste();
                    if (modalExclusaoTabelaAberto.aberto) excluirTabela();
                    if (modalExclusaoAberto.aberto) confirmarExclusao();
                  }}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-95 active:scale-95"
                  style={{
                    backgroundColor:
                      (modalExclusaoTabelaAberto.aberto ||
                        modalExclusaoAberto.aberto)
                        ? "#ef4444"
                        : theme.modalButtonBackgroundColor,
                  }}
                >
                  Confirmar
                </button>


              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}