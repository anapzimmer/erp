//app/admin/tabelas/page.tsx
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { PlusCircle, Trash2, Zap, Percent, Check, GlassWater, Search, AlertTriangle, X, ArrowLeft, Layers3, DollarSign, Edit2, Save } from "lucide-react"
import { useRouter } from "next/navigation"

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
  background: "#F3F4F6",
  border: "#E5E7EB",
  white: "#FFFFFF"
}

export default function GestaoPrecosPage() {
  const router = useRouter()
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

  // --- ESTADOS DE EDIÇÃO E MODAIS ---
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false)
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState<{aberto: boolean, item: ItemTabela | null}>({aberto: false, item: null})
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [tempPreco, setTempPreco] = useState<string>("");

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

  // 3. Carregar itens da tabela selecionada
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
    carregarTabelas()
    carregarTodosVidros()
  }, [carregarTabelas, carregarTodosVidros])

  useEffect(() => {
    if (tabelaSelecionada) {
      carregarItensTabela(tabelaSelecionada.id)
    } else {
      setItensTabela([])
    }
  }, [tabelaSelecionada, carregarItensTabela])

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
    } else alert("Erro ao adicionar vidro.")
  }

  // --- LÓGICA DE EDIÇÃO DIRETA ---
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
      setModalExclusaoAberto({aberto: false, item: null});
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

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold hover:bg-white transition text-sm" style={{ color: theme.primary }}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-center flex-1">Gestão de Preços</h1>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Layers3 size={20} style={{ color: theme.secondary }} /> Grupos de Preço
          </h2>
          <div className="flex gap-2 mb-5">
            <input type="text" value={nomeNovaTabela} onChange={e => setNomeNovaTabela(e.target.value)} placeholder="Novo grupo..." className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
            <button onClick={criarTabela} className="p-2.5 rounded-xl transition hover:opacity-90" style={{ backgroundColor: theme.primary, color: "#FFF" }}>
              <PlusCircle size={20} />
            </button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {tabelas.map(t => (
              <button key={t.id} onClick={() => setTabelaSelecionada(t)} className={`w-full text-left p-3.5 rounded-xl font-medium flex justify-between items-center transition-all ${tabelaSelecionada?.id === t.id ? 'bg-blue-50 text-blue-800 shadow-inner' : 'hover:bg-gray-50'}`} style={{ border: `1px solid ${tabelaSelecionada?.id === t.id ? '#BFDBFE' : theme.border}`}}>
                <span className="truncate">{t.nome}</span>
                {tabelaSelecionada?.id === t.id && <Check size={18} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          {tabelaSelecionada ? (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tabela Selecionada</p>
                  <h2 className="text-3xl font-extrabold" style={{ color: theme.primary }}>{tabelaSelecionada.nome}</h2>
                </div>
                <div className="flex gap-2 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="relative">
                      <Percent size={16} className="absolute left-3 top-3.5 text-gray-400" />
                      <input type="number" value={percentualReajuste} onChange={e => setPercentualReajuste(e.target.value)} placeholder="%" className="w-24 p-2.5 pl-9 border border-gray-200 rounded-xl text-sm font-bold" />
                  </div>
                  <button onClick={() => setModalReajusteAberto(true)} disabled={carregando} className="px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold text-sm transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
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
                <button onClick={adicionarVidroATabela} className="md:col-span-1 p-2.5 rounded-xl text-sm font-semibold flex items-center justify-center transition hover:opacity-90" style={{ backgroundColor: theme.primary, color: "#FFF" }}>
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
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-4 font-medium text-gray-900">
                            <div className="font-bold">{item.vidros?.nome}</div>
                            <div className="text-xs text-gray-500">{item.vidros?.espessura}mm | {item.vidros?.tipo}</div>
                        </td>
                        <td className="p-4 text-right">
                          {editingItemId === item.id ? (
                            <input type="number" value={tempPreco} onChange={e => setTempPreco(e.target.value)} className="w-28 p-1.5 border rounded-lg text-right font-mono" />
                          ) : (
                            <span className="font-mono text-base font-semibold" style={{color: theme.primary}}>
                              {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            {editingItemId === item.id ? (
                              <button onClick={() => salvarEdicao(item.id)} className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl" title="Salvar">
                                <Save size={18} />
                              </button>
                            ) : (
                              <button onClick={() => iniciarEdicao(item)} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl" title="Editar">
                                <Edit2 size={18} />
                              </button>
                            )}
                            <button onClick={() => setModalExclusaoAberto({aberto: true, item})} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl" title="Excluir">
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
              <GlassWater size={50} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold">Nenhuma tabela selecionada</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAIS (Limpados e Unificados) --- */}
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
              <button onClick={aplicarReajuste} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: theme.primary }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {modalExclusaoAberto.aberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /> Remover Item</h3>
              <button onClick={() => setModalExclusaoAberto({aberto: false, item: null})} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <p className="text-gray-600 mb-8 bg-red-50 p-4 rounded-xl border border-red-100 text-sm">
              Remover <span className="font-bold">{modalExclusaoAberto.item?.vidros?.nome}</span> da tabela <span className="font-semibold">{tabelaSelecionada?.nome}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalExclusaoAberto({aberto: false, item: null})} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={confirmarExclusao} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Sim, remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}