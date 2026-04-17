//src/app/admin/tabelas/page.tsx
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { PlusCircle, Trash2, Percent, Check, Search, ArrowLeft, Layers3, DollarSign, Edit2, TableProperties } from "lucide-react"
import { useRouter } from "next/navigation"
// 🔥 IMPORTANTE: Importar o hook de tema
import { useTheme } from "@/context/ThemeContext"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar";
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal";

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

export default function GestaoPrecosPage() {
  const router = useRouter()
  // 🔥 Consumir o tema do contexto
  const { theme } = useTheme();
  const [empresaIdAtual, setEmpresaIdAtual] = useState<string>("");

  // --- Estados de Auth e UI ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

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
  const [modalAvisoAberto, setModalAvisoAberto] = useState<{ aberto: boolean, mensagem: string }>({ aberto: false, mensagem: "" });
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    titulo: string;
    mensagem: string;
    confirmar?: () => void;
    tipo?: "sucesso" | "erro" | "aviso";
    labelConfirmar?: string;
    labelCancelar?: string;
  } | null>(null);
  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);
  const [novoPrecoEdicao, setNovoPrecoEdicao] = useState<string>("");

  const iniciarEdicao = (item: ItemTabela) => {
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

    setModalSucessoAberto({ aberto: true, mensagem: "Preço atualizado com sucesso." });
  } else {
    console.error("Erro ao salvar preço:", error);
    setModalAvisoAberto({ aberto: true, mensagem: "Erro ao atualizar preço no banco." });
  }
  setCarregando(false);
};

  const excluirTabela = async (tabela: TabelaPreco) => {
    if (!empresaIdAtual) {
      console.error("Faltando ID da tabela ou da empresa");
      return;
    }

    // 1. Primeiro removemos os itens vinculados a essa tabela (Boa prática para evitar erro de FK)
    await supabase
      .from("vidro_precos_grupos")
      .delete()
      .eq("grupo_preco_id", tabela.id);

    // 2. Agora excluímos a tabela de fato
    const { error } = await supabase
      .from("tabelas")
      .delete()
      .eq("id", tabela.id)
      .eq("empresa_id", empresaIdAtual); // Garante que você é o dono

    if (!error) {
      setTabelas(prev => prev.filter(t => t.id !== tabela.id));
      setTabelaSelecionada(null);
      setModalConfirmacao(null);
      // 🔥 NOVO: Abre o seu modal customizado
      setModalSucessoAberto({ aberto: true, mensagem: "Tabela removida com sucesso." });
    }
  };

  // --- Efeitos de Inicialização e Auth ---
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
      } catch (error) {
        console.error("Erro ao iniciar tabela de precos:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setModalAvisoAberto({ aberto: true, mensagem: "Informe um nome para a tabela de preços." });
      return;
    }

    if (!empresaIdAtual) {
      setModalAvisoAberto({ aberto: true, mensagem: "Não foi possível identificar a empresa. Atualize a página e tente novamente." });
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
      setModalSucessoAberto({ aberto: true, mensagem: "Tabela criada com sucesso." });
    } else {
      console.error("Erro ao criar:", error);
      setModalAvisoAberto({ aberto: true, mensagem: "Não foi possível criar a tabela no banco de dados." });
    }
    setCarregando(false);
  };

const adicionarVidroATabela = async () => {
  if (!tabelaSelecionada?.id || !novoVidroId || !novoPrecoVidro) {
    setModalAvisoAberto({ aberto: true, mensagem: "Preencha todos os campos obrigatórios." });
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
    setModalSucessoAberto({ aberto: true, mensagem: "Vidro adicionado com sucesso." });
  }
  setCarregando(false);
};

  const confirmarExclusao = async (item: ItemTabela) => {
    const { error } = await supabase
      .from("vidro_precos_grupos")
      .delete()
      .eq("id", item.id);
    if (!error) {
      carregarItensTabela(tabelaSelecionada!.id);
      setModalConfirmacao(null);
      setModalSucessoAberto({ aberto: true, mensagem: "Vidro removido com sucesso." });
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
    if (isNaN(perc)) {
      setModalAvisoAberto({ aberto: true, mensagem: "Informe um percentual válido para reajuste." })
      return
    }

    const fator = 1 + (perc / 100)
    setCarregando(true)

    try {
      const { data: itensAtuais, error: erroBusca } = await supabase
        .from("vidro_precos_grupos")
        .select("id, preco")
        .eq("grupo_preco_id", tabelaSelecionada.id)

      if (erroBusca) throw erroBusca

      const atualizacoes = (itensAtuais || []).map((item) => {
        const precoAtual = Number(item.preco) || 0
        const novoPreco = Number((precoAtual * fator).toFixed(2))

        return supabase
          .from("vidro_precos_grupos")
          .update({ preco: novoPreco })
          .eq("id", item.id)
      })

      const resultados = await Promise.all(atualizacoes)
      const erroAtualizacao = resultados.find((resultado) => resultado.error)
      if (erroAtualizacao?.error) throw erroAtualizacao.error

      await carregarItensTabela(tabelaSelecionada.id)
      setModalSucessoAberto({ aberto: true, mensagem: "Reajuste aplicado com sucesso." })
    } catch (error: any) {
      setModalAvisoAberto({ aberto: true, mensagem: "Erro ao aplicar reajuste: " + (error?.message || "Erro desconhecido") })
    } finally {
      setCarregando(false)
      setModalConfirmacao(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: theme.menuBackgroundColor, borderBottomColor: theme.menuBackgroundColor, borderLeftColor: theme.menuBackgroundColor }}></div>
      </div>
    );
  }

   return (
    <div className="flex min-h-screen text-gray-900 overflow-x-hidden" style={{ backgroundColor: theme.screenBackgroundColor }}>

  <Sidebar 
    showMobileMenu={showMobileMenu}
    setShowMobileMenu={setShowMobileMenu}
    nomeEmpresa={nomeEmpresa}
    expandido={sidebarExpandido}
    setExpandido={setSidebarExpandido}
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
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-300 shrink-0"
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
                        onClick={() => setModalConfirmacao({
                          titulo: "Confirmar exclusão",
                          mensagem: `Deseja excluir a tabela \"${t.nome}\"? Esta ação não pode ser desfeita.`,
                          confirmar: () => excluirTabela(t),
                          labelConfirmar: "Excluir",
                          labelCancelar: "Cancelar",
                        })}
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
                      <button
                        onClick={() => setModalConfirmacao({
                          titulo: "Confirmar reajuste",
                          mensagem: `Deseja aplicar reajuste de ${percentualReajuste}% na tabela \"${tabelaSelecionada?.nome}\"?`,
                          confirmar: aplicarReajuste,
                          labelConfirmar: "Aplicar",
                          labelCancelar: "Cancelar",
                        })}
                        disabled={carregando}
                        className="px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: theme.menuIconColor, color: "#FFF" }}
                      >
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
                                  onClick={() => setModalConfirmacao({
                                    titulo: "Confirmar exclusão",
                                    mensagem: `Deseja excluir ${item.vidros?.nome} desta tabela?`,
                                    confirmar: () => confirmarExclusao(item),
                                    labelConfirmar: "Excluir",
                                    labelCancelar: "Cancelar",
                                  })}
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

      <CadastrosAvisoModal
        aviso={modalSucessoAberto.aberto
          ? {
            titulo: "Operação concluída",
            mensagem: modalSucessoAberto.mensagem,
            tipo: "sucesso",
          }
          : modalAvisoAberto.aberto
            ? {
              titulo: "Atenção",
              mensagem: modalAvisoAberto.mensagem,
              tipo: "aviso",
            }
            : null}
        onClose={() => {
          setModalSucessoAberto({ aberto: false, mensagem: "" });
          setModalAvisoAberto({ aberto: false, mensagem: "" });
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

      <CadastrosAvisoModal
        aviso={modalConfirmacao}
        onClose={() => setModalConfirmacao(null)}
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

    </div>
  )
}