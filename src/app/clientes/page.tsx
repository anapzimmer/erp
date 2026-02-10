"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { Users, Phone, MapPin, Map, AlertCircle, Home } from "lucide-react"

type Cliente = {
  id: number
  nome: string
  telefone?: string | null
  cidade?: string | null
  rota: string
  grupo_preco_id?: number | null // --- NOVO ---
}

// --- NOVO: Tipo para o grupo ---
type GrupoPreco = {
  id: number
  nome: string
}

const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#F9FAFB",
  border: "#E5E7EB",
  cardBg: "#FFFFFF",
  hover: "#F3F4F6",
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [grupos, setGrupos] = useState<GrupoPreco[]>([]) // --- NOVO ---
  
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente, "id">>({
    nome: "", telefone: "", cidade: "", rota: "", grupo_preco_id: null // --- NOVO ---
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

  const padronizarNome = (texto: string) => {
    if (!texto) return ""
    return texto.toLowerCase().trim()
      .replace(/\s+/g, " ")
      .replace(/(^\w)|(\s+\w)/g, letra => letra.toUpperCase())
  }

  const formatarRota = (v: string) => {
    if (!v) return ""
    const limpo = v.trim()
    if (/^\d+$/.test(limpo)) return `${limpo}MM`
    return padronizarNome(limpo)
  }

  // --- LÓGICA DE NEGÓCIO ---
  const carregarDados = async () => {
    setCarregando(true)
    
    // Carregar Clientes
    const { data: dataClientes, error: errorClientes } = await supabase
      .from("clientes")
      .select("*")
      .order("nome", { ascending: true })
    
    // --- NOVO: Carregar Grupos de Preço ---
    const { data: dataGrupos, error: errorGrupos } = await supabase
      .from("tabelas")
      .select("*")
      .order("nome", { ascending: true })

    if (errorClientes) console.error("Erro ao carregar clientes:", errorClientes)
    else setClientes((dataClientes as Cliente[]) || [])

    if (errorGrupos) console.error("Erro ao carregar grupos:", errorGrupos)
    else setGrupos((dataGrupos as GrupoPreco[]) || [])
    
    setCarregando(false)
  }
  
  useEffect(() => { carregarDados() }, [])

  function formatarTelefoneRaw(valor: string) {
    const nums = valor.replace(/\D/g, "")
    if (!nums) return ""
    const pattern = nums.length <= 10 ? /^(\d{0,2})(\d{0,4})(\d{0,4}).*/ : /^(\d{0,2})(\d{0,5})(\d{0,4}).*/
    return nums.replace(pattern, (_, g1, g2, g3) => {
      let s = ""; if (g1) s += "(" + g1 + ")"; if (g2) s += " " + g2; if (g3) s += "-" + g3; return s
    }).replace(/-$/, "")
  }

  function handleTelefoneChange(v: string) { setNovoCliente(prev => ({ ...prev, telefone: formatarTelefoneRaw(v) })) }
  
  function telefoneConsiderarVazio(t?: string | null) {
    if (!t) return true
    const nums = t.replace(/\D/g, "")
    return nums.length === 0 || /^0+$/.test(nums)
  }

  function montarPayload() {
    const rotaFinal = formatarRota(novoCliente.rota)
    const nomeFinal = padronizarNome(novoCliente.nome)
    
    const payload: any = {
      nome: nomeFinal,
      rota: rotaFinal,
      grupo_preco_id: novoCliente.grupo_preco_id // --- NOVO ---
    }
    if (!telefoneConsiderarVazio(novoCliente.telefone)) payload.telefone = novoCliente.telefone!.trim()
    if (novoCliente.cidade?.trim()) payload.cidade = padronizarNome(novoCliente.cidade)
    
    return payload
  }

  const salvarCliente = async () => {
    if (!novoCliente.nome?.trim()) { 
      setModalAviso({ titulo: "Atenção", mensagem: "O nome do cliente é obrigatório." })
      return 
    }
    if (!novoCliente.rota?.trim()) { 
      setModalAviso({ titulo: "Atenção", mensagem: "A rota é obrigatória." })
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
      await carregarDados() // --- Atualizado para carregar grupos também ---
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
      mensagem: "Tem certeza que deseja excluir este cliente?",
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

  const editarCliente = (cliente: Cliente) => {
    setEditando(cliente)
    setNovoCliente({
      nome: cliente.nome,
      telefone: cliente.telefone ?? "",
      cidade: cliente.cidade ?? "",
      rota: cliente.rota ?? "",
      grupo_preco_id: cliente.grupo_preco_id // --- NOVO ---
    })
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
          <Home className="w-5 h-5 text-white" /> Home
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
        <button onClick={() => { setEditando(null); setNovoCliente({ nome: "", telefone: "", cidade: "", rota: "", grupo_preco_id: null }); setMostrarModal(true); }} className="px-6 py-2 rounded-2xl font-bold shadow" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          Novo Cliente
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <select value={filtroRota} onChange={e => setFiltroRota(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }}>
          <option value="">Todas as rotas</option>
          {rotasUnicas.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }}>
          <option value="">Todas as cidades</option>
          {cidadesUnicas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => {setFiltroRota(""); setFiltroCidade("")}} className="px-3 py-2 rounded font-medium" style={{ backgroundColor: theme.primary, color: "#FFF" }}>
          Mostrar todos
        </button>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto bg-white rounded-3xl shadow-xl border border-gray-100">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Grupo</th> {/* --- NOVO --- */}
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(cliente => (
              <tr key={cliente.id} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border }}>
                <td className="p-3">{cliente.nome}</td>
                <td className="p-3">{cliente.cidade ?? "-"}</td>
                {/* --- NOVO: Exibir nome do grupo --- */}
                <td className="p-3 text-sm">
                    {grupos.find(g => g.id === cliente.grupo_preco_id)?.nome || "Padrão"}
                </td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => editarCliente(cliente)} className="p-1 rounded hover:bg-[#E5E7EB]">
                    <Image src="/icons/editar.png" alt="Editar" width={20} height={20} />
                  </button>
                  <button onClick={() => deletarCliente(cliente.id)} className="p-1 rounded hover:bg-[#E5E7EB]">
                    <Image src="/icons/delete.png" alt="Deletar" width={20} height={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CADASTRO */}
      {mostrarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-center" style={{ color: theme.primary }}>{editando ? "Editar Cliente" : "Novo Cliente"}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={novoCliente.nome} onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#92D050]" />
              <input type="text" placeholder="Telefone" value={novoCliente.telefone ?? ""} onChange={e => handleTelefoneChange(e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#92D050]"/>
              <input type="text" placeholder="Cidade" value={novoCliente.cidade ?? ""} onChange={e => setNovoCliente({ ...novoCliente, cidade: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#92D050]" />
              <input type="text" placeholder="Rota *" value={novoCliente.rota} onChange={e => setNovoCliente({ ...novoCliente, rota: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#92D050]" />
              
              {/* --- NOVO: Select de Grupo de Preço --- */}
              <select 
                value={novoCliente.grupo_preco_id || ""}
                onChange={e => setNovoCliente({ ...novoCliente, grupo_preco_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#92D050] bg-white"
              >
                <option value="">Grupo Padrão</option>
                {grupos.map(g => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>

              <div className="flex justify-between gap-3 mt-4">
                <button onClick={() => setMostrarModal(false)} className="flex-1 py-3 rounded-xl font-semibold text-gray-400 border border-gray-200 hover:opacity-90 transition">Cancelar</button>
                <button onClick={salvarCliente} disabled={carregando} className="flex-1 py-3 rounded-xl font-semibold text-white shadow-md" style={{ backgroundColor: theme.secondary, color: theme.primary}}>
                  {carregando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO / CONFIRMAÇÃO */}
      {modalAviso && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100">
            <div className="flex justify-center mb-3">
              <AlertCircle size={48} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-center" style={{ color: theme.primary }}>{modalAviso.titulo}</h3>
            <p className="text-sm text-gray-600 text-center mb-6">{modalAviso.mensagem}</p>
            <div className="flex gap-3">
              <button onClick={() => setModalAviso(null)} className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-500 font-semibold hover:opacity-90 transition">Fechar</button>
              {modalAviso.confirmar && (
                <button onClick={modalAviso.confirmar} className="flex-1 py-2 rounded-xl font-semibold shadow-md hover:opacity-90 transition" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}