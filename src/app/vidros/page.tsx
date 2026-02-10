"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Home, Box, Star, Tag, DollarSign, Upload, Download, Edit2, Trash2, PlusCircle, X, GlassWater } from "lucide-react"

type Vidro = {
  id: number
  nome: string
  espessura: string
  tipo: string
  preco: number
}

type PrecoGrupo = {
  id: number
  vidro_id: number
  grupo_preco_id: number 
  preco: number
  grupo_nome?: string
}

type Grupo = {
  id: number
  nome: string
}

const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#F9FAFB",
  border: "#F2F2F2",
  cardBg: "#FFFFFF",
}

// 🔵 CORREÇÃO: Função aplicada apenas ao salvar, não ao digitar
const formatarParaBanco = (texto: string) => {
  if (!texto) return ""
  return texto.trim().charAt(0).toUpperCase() + texto.trim().slice(1)
}

const padronizarEspessura = (valor: string) => {
  if (!valor) return ""
  const limpo = valor.replace(/\s/g, "").toLowerCase()
  const partes = limpo.split("+").map(p =>
    p.replace(/\D/g, "").padStart(2, "0")
  )
  const partesValidas = partes.filter(p => p !== "00")
  if (partesValidas.length === 0) return ""
  return partesValidas.join("+") + "mm"
}

export default function VidrosPage() {
  const [vidros, setVidros] = useState<Vidro[]>([])
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const [idParaDeletar, setIdParaDeletar] = useState<number | null>(null)

  const [novoVidro, setNovoVidro] = useState<Omit<Vidro, "id">>({ nome: "", espessura: "", tipo: "", preco: 0 })
  const [editando, setEditando] = useState<Vidro | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  const [precosGruposModal, setPrecosGruposModal] = useState<PrecoGrupo[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])

  const pedirConfirmacaoDeletar = (id: number) => {
    setIdParaDeletar(id)
    setMostrarConfirmacao(true)
  }

  const confirmarDeletar = async () => {
    if (idParaDeletar !== null) {
      await deletarVidro(idParaDeletar)
      setIdParaDeletar(null)
      setMostrarConfirmacao(false)
    }
  }

  const mostrarAlerta = (mensagem: string) => {
    const alerta = document.createElement("div")
    alerta.textContent = mensagem
    alerta.style.position = "fixed"
    alerta.style.top = "20px"
    alerta.style.right = "20px"
    alerta.style.backgroundColor = theme.secondary
    alerta.style.color = theme.primary
    alerta.style.padding = "12px 20px"
    alerta.style.borderRadius = "12px"
    alerta.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
    alerta.style.zIndex = "9999"
    alerta.style.fontWeight = "bold"
    alerta.style.transition = "opacity 0.3s"
    alerta.style.opacity = "1"

    document.body.appendChild(alerta)

    setTimeout(() => {
      alerta.style.opacity = "0"
      setTimeout(() => alerta.remove(), 300)
    }, 3000)
  }

  const exportarCSV = () => {
    if (vidros.length === 0) {
      alert("Não há vidros para exportar!");
      return;
    }
    const header = ["Nome", "Espessura", "Tipo", "Preço"];
    const rows = vidros.map(v => [
      `"${v.nome.replace(/"/g, '""')}"`,
      `"${v.espessura.replace(/"/g, '""')}"`,
      `"${v.tipo.replace(/"/g, '""')}"`,
      v.preco.toFixed(2)
    ]);
    const csvContent = [header, ...rows].map(e => e.join(";")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "vidros.csv");
    link.click();
  };

  const importarCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCarregando(true);
    const text = await file.text();
    const linhas = text.split("\n").slice(1);
    const novosVidros: Omit<Vidro, "id">[] = linhas
      .map(linha => {
        const [nomeRaw, espRaw, tipoRaw, precoRaw] = linha.split(";").map(c => c?.trim());
        if (!nomeRaw) return null;
        // Na importação mantemos a padronização mais forte
        const nome = formatarParaBanco(nomeRaw.replace(/"/g, "").trim());
        const tipo = formatarParaBanco(tipoRaw?.replace(/"/g, "").trim() || "");
        const espessura = padronizarEspessura(espRaw?.replace(/"/g, "").trim() || "");
        const preco = Number(precoRaw?.replace(",", ".").trim()) || 0;
        return { nome, espessura, tipo, preco };
      })
      .filter(Boolean) as Omit<Vidro, "id">[];
    let novosInseridos = 0;
    let atualizados = 0;
    for (const v of novosVidros) {
      const { data: existente, error: erroBusca } = await supabase
        .from("vidros")
        .select("id, preco")
        .eq("nome", v.nome)
        .eq("espessura", v.espessura)
        .eq("tipo", v.tipo)
        .maybeSingle();
      if (erroBusca) continue;
      if (!existente) {
        const { error: erroInsert } = await supabase.from("vidros").insert(v);
        if (!erroInsert) novosInseridos++;
      } else if (existente.preco !== v.preco) {
        const { error: erroUpdate } = await supabase
          .from("vidros")
          .update({ preco: v.preco })
          .eq("id", existente.id);
        if (!erroUpdate) atualizados++;
      }
    }
    await carregarVidros();
    setCarregando(false);
    mostrarAlerta(`Importação concluída!\n${novosInseridos} novos itens adicionados e ${atualizados} preços atualizados.`);
    event.target.value = "";
  };

  const [filtroNome, setFiltroNome] = useState("")
  const [filtroEspessura, setFiltroEspessura] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")

  const carregarVidros = async () => {
    const { data, error } = await supabase.from("vidros").select("*").order("nome", { ascending: true })
    if (error) console.error("Erro ao carregar vidros:", error)
    else
      setVidros(
        (data as Vidro[]).map(v => ({
          ...v,
          preco: Number((v.preco ?? 0).toString().replace(",", ".")) || 0
        })) || []
      )
  }

  const carregarGrupos = async () => {
    const { data, error } = await supabase.from("tabelas").select("id, nome").order("nome", { ascending: true })
    if (error) console.error("Erro ao carregar grupos:", error)
    else setGrupos(data || [])
  }

  useEffect(() => {
    carregarVidros()
    carregarGrupos()
  }, [])

  const calcularPrecoMedio = () => {
    if (vidros.length === 0) return "R$ 0,00"
    const total = vidros.reduce((acc, v) => acc + v.preco, 0)
    return formatarPreco(total / vidros.length)
  }

  const getMaisProcurados = () => vidros.slice(0, 1).map(v => v.nome).join(", ") || "-"
  const contarPrecoEspecial = () => precosGruposModal.filter(p => !isNaN(p.preco) && p.preco > 0).length

  const abrirModalNovoVidro = () => {
    setEditando(null)
    setNovoVidro({ nome: "", espessura: "", tipo: "", preco: 0 })
    setPrecosGruposModal([])
    setMostrarModal(true)
  }

  const editarVidro = async (vidro: Vidro) => {
    setEditando(vidro)
    setNovoVidro({ ...vidro })
    const { data } = await supabase
      .from("vidro_precos_grupos")
      .select("*, grupo:tabelas(nome)")
      .eq("vidro_id", vidro.id)
    const precosFormatados = (data || []).map((p: any) => ({
      id: p.id,
      vidro_id: p.vidro_id,
      grupo_preco_id: p.grupo_preco_id,
      preco: Number(p.preco) || 0,
      grupo_nome: p.grupo?.nome || ""
    }))
    setPrecosGruposModal(precosFormatados)
    setMostrarModal(true)
  }

  const salvarVidro = async () => {
    if (!novoVidro.nome.trim()) { mostrarAlerta("Nome é obrigatório."); return }
    if (!novoVidro.espessura.trim()) { mostrarAlerta("Espessura é obrigatória."); return }
    if (!novoVidro.tipo.trim()) { mostrarAlerta("Tipo é obrigatória."); return }
    setCarregando(true)
    let vidroId = editando?.id
    const vidroPadronizado = {
      ...novoVidro,
      // 🔵 CORREÇÃO: Aplicando a padronização apenas aqui ao salvar
      nome: formatarParaBanco(novoVidro.nome),
      tipo: formatarParaBanco(novoVidro.tipo),
      espessura: padronizarEspessura(novoVidro.espessura)
    }
    if (editando) {
      await supabase
        .from("vidros")
        .update(vidroPadronizado)
        .eq("id", editando.id)
    } else {
      const { data, error } = await supabase
        .from("vidros")
        .insert([vidroPadronizado])
        .select()
        .single()
      if (error) { setCarregando(false); mostrarAlerta("Erro ao salvar: " + error.message); return }
      vidroId = data.id
    }
    const { data: precosOriginais } = await supabase
      .from("vidro_precos_grupos")
      .select("id")
      .eq("vidro_id", vidroId)
    const idsOriginais = precosOriginais?.map(p => p.id) || []
    const idsAtuais = precosGruposModal.filter(p => p.id).map(p => p.id)
    const idsParaExcluir = idsOriginais.filter(id => !idsAtuais.includes(id))
    if (idsParaExcluir.length > 0) {
      await supabase
        .from("vidro_precos_grupos")
        .delete()
        .in("id", idsParaExcluir)
    }
    for (const p of precosGruposModal) {
      if (!p.grupo_preco_id || isNaN(p.preco)) continue
      if (p.id && p.id !== 0) {
        await supabase.from("vidro_precos_grupos").update({ preco: p.preco }).eq("id", p.id)
      } else {
        await supabase.from("vidro_precos_grupos").insert([{
          vidro_id: vidroId,
          grupo_preco_id: p.grupo_preco_id,
          preco: p.preco
        }])
      }
    }
    setNovoVidro({ nome: "", espessura: "", tipo: "", preco: 0 })
    setEditando(null)
    setPrecosGruposModal([])
    setMostrarModal(false)
    setCarregando(false)
    carregarVidros()
    mostrarAlerta("Vidro salvo com sucesso!")
  }

  const deletarVidro = async (id: number) => {
    await supabase.from("vidro_precos_grupos").delete().eq("vidro_id", id)
    const { error } = await supabase.from("vidros").delete().eq("id", id)
    if (error) {
      alert("Erro ao excluir: " + error.message)
    } else {
      setVidros(prev => prev.filter(v => v.id !== id))
      mostrarAlerta("Vidro excluído com sucesso!")
    }
  }

  const vidrosFiltrados = vidros.filter(
    v =>
      v.nome.toLowerCase().includes(filtroNome.toLowerCase()) &&
      v.espessura.toLowerCase().includes(filtroEspessura.toLowerCase()) &&
      v.tipo.toLowerCase().includes(filtroTipo.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>

      {/* BARRA DO TOPO */}
      <div className="flex justify-between items-center mb-6 mt-2 px-2">
        <button
          onClick={() => window.location.href = "/"}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: theme.secondary, color: theme.primary }}
        >
          <Home className="w-5 h-5 text-white" />
          Home
        </button>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="p-2 rounded-full shadow-sm hover:bg-gray-100 transition" title="Exportar CSV">
            <Download className="w-5 h-5 text-gray-600" />
          </button>
          <label htmlFor="importarCSV" className="p-2 rounded-full shadow-sm cursor-pointer hover:bg-gray-100 transition" title="Importar CSV">
            <Upload className="w-5 h-5 text-gray-600" />
          </label>
          <input type="file" id="importarCSV" accept=".csv" className="hidden" onChange={importarCSV} />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard de Vidros</h1>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 mb-5">
        {[
          { titulo: "Total de Vidros", valor: vidros.length, icone: Box },
          { titulo: "Mais Procurado", valor: getMaisProcurados(), icone: Star },
          { titulo: "Preço Médio", valor: calcularPrecoMedio(), icone: DollarSign },
          { titulo: "Grupos Especiais", valor: contarPrecoEspecial(), icone: Tag }
        ].map(card => (
          <div key={card.titulo} className="bg-white p-4 rounded-2xl shadow flex flex-col items-center justify-center">
            <card.icone className="w-6 h-6 mb-2 text-[#1C415B]" />
            <h3 className="text-gray-500">{card.titulo}</h3>
            <p className="text-2xl font-bold text-[#1C415B]">{card.valor}</p>
          </div>
        ))}
      </div>

      {/* Novo Vidro */}
      <div className="flex justify-center gap-2 mb-4">
        <button onClick={abrirModalNovoVidro} className="px-6 py-2 rounded-2xl font-bold shadow print:hidden" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          Novo Vidro
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap justify-center gap-2 mb-4 print:hidden">
        <input type="text" placeholder="Filtrar por nome" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por espessura" value={filtroEspessura} onChange={e => setFiltroEspessura(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por tipo" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Espessura</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Preço</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vidrosFiltrados.map(v => (
              <tr key={v.id} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}>
                <td className="p-3">{v.nome}</td>
                <td className="p-3">{v.espessura}</td>
                <td className="p-3">{v.tipo}</td>
                <td className="p-3">{formatarPreco(v.preco)}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => editarVidro(v)} className="p-2 rounded hover:bg-gray-100">
                    <Edit2 size={18} className="text-gray-600" />
                  </button>
                  <button onClick={() => pedirConfirmacaoDeletar(v.id)} className="p-2 rounded hover:bg-gray-100">
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal NOVO/EDITAR - Layout Alternativo */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden">
            
            {/* Header do Modal */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editando ? "Editar Vidro" : "Cadastrar Novo Vidro"}</h2>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Vidro *</label>
                <input type="text" placeholder="Ex: Vidro Temperado" value={novoVidro.nome} onChange={e => setNovoVidro({ ...novoVidro, nome: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-gray-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Espessura (mm) *</label>
                  <input type="text" placeholder="Ex: 8mm" value={novoVidro.espessura} onChange={e => setNovoVidro({ ...novoVidro, espessura: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <input type="text" placeholder="Ex: Liso" value={novoVidro.tipo} onChange={e => setNovoVidro({ ...novoVidro, tipo: e.target.value })} className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Base (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={novoVidro.preco} onChange={e => setNovoVidro({ ...novoVidro, preco: Number(e.target.value) })} className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-gray-400" />
              </div>

              {/* Preços por Grupo */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-800 text-sm">Preços por Tabela</h3>
                  <button onClick={() => setPrecosGruposModal([...precosGruposModal, { id: 0, vidro_id: editando?.id || 0, grupo_preco_id: 0, preco: 0, grupo_nome: "" }])} className="text-xs font-semibold flex items-center gap-1 text-blue-600 hover:text-blue-700">
                    <PlusCircle size={14} /> Adicionar Preço Especial
                  </button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {precosGruposModal.map((p, index) => (
                    <div key={index} className="flex gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 items-center">
                      <input
                        type="text"
                        list="listaGrupos"
                        value={p.grupo_nome}
                        onChange={e => {
                          const novos = [...precosGruposModal]
                          novos[index].grupo_nome = e.target.value
                          const grupo = grupos.find(g => g.nome === e.target.value)
                          if (grupo) novos[index].grupo_preco_id = grupo.id
                          setPrecosGruposModal(novos)
                        }}
                        className="p-2 rounded border border-gray-200 text-xs flex-1"
                        placeholder="Selecione a tabela"
                      />
                      <datalist id="listaGrupos">
                        {grupos.map(g => (
                          <option key={g.id} value={g.nome} />
                        ))}
                      </datalist>

                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ 0,00"
                        value={p.preco}
                        onChange={e => {
                          const novos = [...precosGruposModal]
                          novos[index].preco = Number(e.target.value)
                          setPrecosGruposModal(novos)
                        }}
                        className="p-2 rounded border border-gray-200 text-xs w-24"
                      />
                      <button onClick={() => setPrecosGruposModal(precosGruposModal.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setMostrarModal(false)} className="px-5 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-100 text-gray-700">Cancelar</button>
              <button onClick={salvarVidro} disabled={carregando} className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: theme.primary }}>
                {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CONFIRMAÇÃO */}
      {mostrarConfirmacao && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-gray-100">
            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-3">
              <Trash2 className="text-red-500" /> Confirmar Exclusão
            </h2>
            <p className="text-gray-600 mb-8 text-sm">Tem certeza que deseja excluir este vidro? Esta ação removerá também todos os preços especiais associados a ele.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setMostrarConfirmacao(false)} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button onClick={confirmarDeletar} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Sim, excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}