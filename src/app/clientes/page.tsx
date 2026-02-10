"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Users, Phone, MapPin, Map, Home, X, Trash2, Edit2, PlusCircle } from "lucide-react"

// --- TIPAGENS ---
type Cliente = {
  id: number
  nome: string
  telefone?: string | null
  cidade?: string | null
  rota: string
  grupo_preco_id?: number | null
}

type GrupoPreco = {
  id: number
  nome: string
}

// --- TEMA ---
const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#F9FAFB",
  border: "#E5E7EB",
  hover: "#F3F4F6",
}

// --- UTILS (Idealmente mover para um arquivo separado) ---
const padronizarNome = (texto: string) => {
  if (!texto) return ""
  return texto.toLowerCase().trim()
    .replace(/\s+/g, " ")
    .replace(/(^\w)|(\s+\w)/g, letra => letra.toUpperCase())
}

const formatarRota = (v: string) => {
  if (!v) return ""
  const limpo = v.trim()
  // Se for apenas números, assume que é uma rota numérica/mm
  if (/^\d+$/.test(limpo)) return `${limpo}MM`
  return padronizarNome(limpo)
}

function formatarTelefoneRaw(valor: string) {
  const nums = valor.replace(/\D/g, "")
  if (!nums) return ""
  const pattern = nums.length <= 10 ? /^(\d{0,2})(\d{0,4})(\d{0,4}).*/ : /^(\d{0,2})(\d{0,5})(\d{0,4}).*/
  return nums.replace(pattern, (_, g1, g2, g3) => {
    let s = ""; if (g1) s += "(" + g1 + ")"; if (g2) s += " " + g2; if (g3) s += "-" + g3; return s
  }).replace(/-$/, "")
}

function telefoneConsiderarVazio(t?: string | null) {
  if (!t) return true
  const nums = t.replace(/\D/g, "")
  return nums.length === 0 || /^0+$/.test(nums)
}

// --- COMPONENTE ---
export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [grupos, setGrupos] = useState<GrupoPreco[]>([])
  
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente, "id">>({
    nome: "", telefone: "", cidade: "", rota: "", grupo_preco_id: null
  })
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [filtroRota, setFiltroRota] = useState("")
  const [filtroCidade, setFiltroCidade] = useState("")

  const [modalAviso, setModalAviso] = useState<{
    titulo: string
    mensagem: string
    confirmar?: () => void
  } | null>(null)

  const carregarDados = async () => {
    setCarregando(true)
    
    const [{ data: dataClientes, error: errorClientes }, { data: dataGrupos, error: errorGrupos }] = await Promise.all([
        supabase.from("clientes").select("*").order("nome", { ascending: true }),
        supabase.from("tabelas").select("*").order("nome", { ascending: true })
    ])
    
    if (errorClientes) console.error("Erro ao carregar clientes:", errorClientes)
    else setClientes((dataClientes as Cliente[]) || [])

    if (errorGrupos) console.error("Erro ao carregar grupos:", errorGrupos)
    else setGrupos((dataGrupos as GrupoPreco[]) || [])
    
    setCarregando(false)
  }
  
  useEffect(() => { carregarDados() }, [])

  function handleTelefoneChange(v: string) { setNovoCliente(prev => ({ ...prev, telefone: formatarTelefoneRaw(v) })) }
  
  function montarPayload() {
    const payload: any = {
      nome: padronizarNome(novoCliente.nome),
      rota: formatarRota(novoCliente.rota),
      grupo_preco_id: novoCliente.grupo_preco_id
    }
    if (!telefoneConsiderarVazio(novoCliente.telefone)) payload.telefone = novoCliente.telefone!.trim()
    if (novoCliente.cidade?.trim()) payload.cidade = padronizarNome(novoCliente.cidade)
    
    return payload
  }

  const salvarCliente = async () => {
    if (!novoCliente.nome?.trim() || !novoCliente.rota?.trim()) { 
      setModalAviso({ titulo: "Atenção", mensagem: "Nome e Rota são obrigatórios." })
      return 
    }

    const payload = montarPayload()
    setCarregando(true)
    
    try {
      if (editando) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("clientes").insert([payload])
        if (error) throw error
      }
      await carregarDados()
      setNovoCliente({ nome: "", telefone: "", cidade: "", rota: "", grupo_preco_id: null })
      setEditando(null)
      setMostrarModal(false)
    } catch (e: any) {
      setModalAviso({ titulo: "Erro", mensagem: "Erro ao processar: " + e.message })
    } finally {
      setCarregando(false)
    }
  }

  const deletarCliente = (id: number) => {
    setModalAviso({
      titulo: "Confirmar Exclusão",
      mensagem: "Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.",
      confirmar: async () => {
        const { error } = await supabase.from("clientes").delete().eq("id", id)
        if (error) {
          setModalAviso({ titulo: "Erro", mensagem: "Erro ao excluir cliente." })
        } else {
          setClientes(prev => prev.filter(c => c.id !== id))
          setModalAviso(null)
        }
      }
    })
  }

  const abrirModalParaEdicao = (cliente: Cliente) => {
    setEditando(cliente)
    setNovoCliente(cliente)
    setMostrarModal(true)
  }

  const abrirModalParaNovo = () => {
    setEditando(null)
    setNovoCliente({ nome: "", telefone: "", cidade: "", rota: "", grupo_preco_id: null })
    setMostrarModal(true)
  }

  const clientesFiltrados = clientes.filter(c =>
    (filtroRota ? c.rota === filtroRota : true) &&
    (filtroCidade ? (c.cidade ?? "") === filtroCidade : true)
  )

  const rotasUnicas = Array.from(new Set(clientes.map(c => c.rota).filter(Boolean))).sort()
  const cidadesUnicas = Array.from(new Set(clientes.map(c => c.cidade || "").filter(Boolean))).sort()

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
      <div className="mb-6 flex justify-start">
        <button onClick={() => window.location.href = "/"} className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          <Home className="w-5 h-5" /> Home
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard de Clientes</h1>

      {/* CARDS INDICADORES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { titulo: "Total", valor: clientes.length, icone: Users },
          { titulo: "Com Telefone", valor: clientes.filter(c => !telefoneConsiderarVazio(c.telefone)).length, icone: Phone },
          { titulo: "Com Cidade", valor: clientes.filter(c => c.cidade?.trim()).length, icone: MapPin },
          { titulo: "Rotas Distintas", valor: rotasUnicas.length, icone: Map }
        ].map(card => (
          <div key={card.titulo} className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center justify-center">
            <card.icone className="w-7 h-7 mb-2" style={{ color: theme.secondary }} />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.titulo}</h3>
            <p className="text-2xl font-bold" style={{ color: theme.primary }}>{card.valor}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center mb-6">
        <button onClick={abrirModalParaNovo} className="flex items-center gap-2 px-6 py-2 rounded-2xl font-bold shadow hover:scale-105 transition-transform" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          <PlusCircle size={20} /> Novo Cliente
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <select value={filtroRota} onChange={e => setFiltroRota(e.target.value)} className="p-2 rounded border bg-white" style={{ borderColor: theme.border }}>
          <option value="">Todas as rotas</option>
          {rotasUnicas.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} className="p-2 rounded border bg-white" style={{ borderColor: theme.border }}>
          <option value="">Todas as cidades</option>
          {cidadesUnicas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => {setFiltroRota(""); setFiltroCidade("")}} className="px-3 py-2 rounded font-medium" style={{ backgroundColor: theme.primary, color: "#FFF" }}>
          Limpar Filtros
        </button>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto bg-white rounded-3xl shadow-xl border border-gray-100">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Rota</th>
              <th className="p-3">Grupo</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(cliente => (
              <tr key={cliente.id} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border }}>
                <td className="p-3 font-medium">{cliente.nome}</td>
                <td className="p-3">{cliente.cidade ?? "-"}</td>
                <td className="p-3">{cliente.rota}</td>
                <td className="p-3 text-sm">
                    {grupos.find(g => g.id === cliente.grupo_preco_id)?.nome || "Padrão"}
                </td>
                <td className="p-3">
                  <div className="flex justify-center gap-2">
                    <button 
                        onClick={() => abrirModalParaEdicao(cliente)} 
                        className="p-2 rounded-full hover:bg-blue-100 transition"
                        title="Editar"
                        style={{ color: theme.primary }}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                        onClick={() => deletarCliente(cliente.id)} 
                        className="p-2 rounded-full hover:bg-red-100 transition"
                        title="Deletar"
                        style={{ color: "#DC2626" }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900">{editando ? "Editar Cliente" : "Cadastrar Cliente"}</h2>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nome do Cliente *</label>
                <input type="text" placeholder="Ex: João Silva" value={novoCliente.nome} onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-200" />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Telefone</label>
                <input type="text" placeholder="(00) 00000-0000" value={novoCliente.telefone ?? ""} onChange={e => handleTelefoneChange(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-200" />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Cidade</label>
                <input type="text" placeholder="Ex: Cidade" value={novoCliente.cidade ?? ""} onChange={e => setNovoCliente({ ...novoCliente, cidade: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-200" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Rota *</label>
                <input type="text" placeholder="Ex: Rota A" value={novoCliente.rota} onChange={e => setNovoCliente({ ...novoCliente, rota: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-200" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Grupo de Preço</label>
                <select 
                  value={novoCliente.grupo_preco_id || ""}
                  onChange={e => setNovoCliente({ ...novoCliente, grupo_preco_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-200 bg-white"
                >
                  <option value="">Grupo Padrão</option>
                  {grupos.map(g => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button onClick={() => setMostrarModal(false)} className="px-6 py-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">Cancelar</button>
              <button onClick={salvarCliente} disabled={carregando} className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: theme.primary }}>
                {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO / CONFIRMAÇÃO */}
      {modalAviso && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-gray-100">
            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-3">
              <Trash2 className="text-red-500" /> {modalAviso.titulo}
            </h2>
            <p className="text-gray-600 mb-8 text-sm">{modalAviso.mensagem}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalAviso(null)} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200">Cancelar</button>
              {modalAviso.confirmar && (
                <button onClick={modalAviso.confirmar} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">
                  Sim, excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}