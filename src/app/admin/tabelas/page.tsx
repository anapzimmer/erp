"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { PlusCircle, Trash2, Zap, Percent, Check, GlassWater, Search, AlertTriangle, X } from "lucide-react"

// Tipos baseados na estrutura do banco
type TabelaPreco = { id: number; nome: string }
type Vidro = { id: number; nome: string; preco: number; espessura: string; tipo: string; }
type ItemTabela = {
  id: number;
  grupo_preco_id: number;
  vidro_id: number;
  preco: number;
  vidros?: { nome: string; espessura: string; tipo: string; }
}

const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#F9FAFB",
  border: "#E5E7EB",
}

export default function GestaoPrecosPage() {
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

  // --- ESTADOS DOS MODAIS ---
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false)
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState<{aberto: boolean, item: ItemTabela | null}>({aberto: false, item: null})

  // 1. Carregar Grupos/Tabelas
  const carregarTabelas = useCallback(async () => {
    const { data } = await supabase.from("tabelas").select("*").order("nome", { ascending: true })
    setTabelas(data || [])
  }, [])

  // 2. Carregar Lista de Vidros e formatar
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

  useEffect(() => {
    carregarTabelas()
    carregarTodosVidros()
  }, [carregarTabelas, carregarTodosVidros])

  // 3. Carregar itens da tabela selecionada
  useEffect(() => {
    if (tabelaSelecionada) {
      carregarItensTabela(tabelaSelecionada.id)
    } else {
      setItensTabela([])
    }
  }, [tabelaSelecionada])

  const carregarItensTabela = async (tabelaId: number) => {
    setCarregando(true)
    const { data } = await supabase
      .from("vidro_precos_grupos")
      .select("*, vidros(nome, espessura, tipo)")
      .eq("grupo_preco_id", tabelaId)
    
    if (data) setItensTabela(data)
    setCarregando(false)
  }

  // AÇÕES
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
    } else {
      alert("Erro ao adicionar vidro.") // Pode substituir por um modal de erro depois
    }
  }

  // --- LOGICA DE EXCLUSÃO COM MODAL ---
  const confirmarExclusao = async () => {
    if (!modalExclusaoAberto.item) return;

    const { error } = await supabase
      .from("vidro_precos_grupos")
      .delete()
      .eq("id", modalExclusaoAberto.item.id);

    if (!error) {
      carregarItensTabela(tabelaSelecionada!.id);
      setModalExclusaoAberto({aberto: false, item: null});
    }
  };

  // --- FILTRO DE PESQUISA INTELIGENTE ---
  const vidrosFiltrados = useMemo(() => {
    if (!termoPesquisa.trim()) return vidros;
    const palavrasPesquisa = termoPesquisa.toLowerCase().trim().split(/\s+/);
    return vidros.filter(v => {
      const nomeVidro = v.nome.toLowerCase();
      return palavrasPesquisa.every(palavra => nomeVidro.includes(palavra));
    });
  }, [vidros, termoPesquisa])

  // --- LÓGICA DE REAJUSTE COM MODAL ---
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

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
        {/* 🔹 ADICIONE ESTE BOTÃO AQUI 🔹 */}
      <div className="mb-6">
        <button
          onClick={() => window.location.href = "/"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: theme.primary, color: "#FFF" }}
        >
          <X size={18} /> {/* Ou use um ícone de Home se preferir */}
         Home
        </button>
      </div>
      {/* 🔹 FIM DO BOTÃO 🔹 */}
      <h1 className="text-3xl font-bold mb-8 text-center">Gestão de Tabelas e Preços</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Painel 1: Lista de Tabelas */}
        <div className="md:col-span-1 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 h-fit">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap size={20} style={{ color: theme.secondary }} /> Tabelas
          </h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={nomeNovaTabela}
              onChange={e => setNomeNovaTabela(e.target.value)}
              placeholder="Nome do grupo"
              className="flex-1 p-2 border rounded-xl text-sm"
            />
            <button onClick={criarTabela} className="p-2 rounded-xl" style={{ backgroundColor: theme.primary, color: "#FFF" }}>
              <PlusCircle size={20} />
            </button>
          </div>

          <div className="space-y-2">
            {tabelas.map(t => (
              <button 
                key={t.id}
                onClick={() => setTabelaSelecionada(t)}
                className={`w-full text-left p-3 rounded-xl font-semibold flex justify-between items-center ${tabelaSelecionada?.id === t.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                style={{ border: `1px solid ${tabelaSelecionada?.id === t.id ? theme.primary : theme.border}`}}
              >
                {t.nome}
                {tabelaSelecionada?.id === t.id && <Check size={16} className="text-blue-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Painel 2: Itens da Tabela Selecionada */}
        <div className="md:col-span-3 bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          {tabelaSelecionada ? (
            <>
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <h2 className="text-2xl font-bold">Tabela: {tabelaSelecionada.nome}</h2>
                
                {/* Área de Reajuste */}
                <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border">
                  <input
                    type="number"
                    value={percentualReajuste}
                    onChange={e => setPercentualReajuste(e.target.value)}
                    placeholder="%"
                    className="w-20 p-2 border rounded-lg text-sm"
                  />
                  <button onClick={() => setModalReajusteAberto(true)} disabled={carregando} className="px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
                    <Percent size={16} /> {carregando ? "..." : "Reajustar"}
                  </button>
                </div>
              </div>

              {/* Adicionar Vidro à Tabela com Pesquisa */}
              <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-xl border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text"
                        value={termoPesquisa}
                        onChange={e => setTermoPesquisa(e.target.value)}
                        placeholder="Pesquisar vidro (ex: 08 incolor)..."
                        className="w-full p-2 pl-10 rounded-lg border text-sm"
                    />
                </div>
                <select value={novoVidroId} onChange={e => setNovoVidroId(e.target.value)} className="p-2 rounded-lg border text-sm flex-1">
                  <option value="">Selecione o Vidro</option>
                  {vidrosFiltrados.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
                <input type="number" value={novoPrecoVidro} onChange={e => setNovoPrecoVidro(e.target.value)} placeholder="Preço" className="w-24 p-2 rounded-lg border text-sm" />
                <button onClick={adicionarVidroATabela} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme.primary, color: "#FFF" }}>
                  Adicionar
                </button>
              </div>

              {/* Tabela de Preços */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-600 border-b">
                    <tr>
                      <th className="p-3 text-left">Vidro</th>
                      <th className="p-3 text-right">Preço</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensTabela.map(item => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                            {item.vidros?.nome} - {item.vidros?.espessura}mm - {item.vidros?.tipo}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                            R$ {item.preco.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => setModalExclusaoAberto({aberto: true, item})}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Excluir item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <GlassWater size={48} className="mx-auto mb-4" />
              Selecione uma tabela na lateral para gerenciar os preços.
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DE REAJUSTE --- */}
      {modalReajusteAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="text-amber-500" /> Confirmar Reajuste
              </h3>
              <button onClick={() => setModalReajusteAberto(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja {parseFloat(percentualReajuste) >= 0 ? "aumentar" : "diminuir"} em <strong>{Math.abs(parseFloat(percentualReajuste))}%</strong> os preços da tabela <strong>{tabelaSelecionada?.nome}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalReajusteAberto(false)} className="px-4 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={aplicarReajuste} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: theme.primary }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE EXCLUSÃO --- */}
      {modalExclusaoAberto.aberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="text-red-500" /> Confirmar Exclusão
              </h3>
              <button onClick={() => setModalExclusaoAberto({aberto: false, item: null})}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja remover o item <strong>{modalExclusaoAberto.item?.vidros?.nome}</strong> da tabela? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalExclusaoAberto({aberto: false, item: null})} className="px-4 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={confirmarExclusao} className="px-4 py-2 rounded-lg text-sm text-white bg-red-600 hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}