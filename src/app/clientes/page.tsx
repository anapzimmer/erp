"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { Users, Phone, MapPin, Map } from "lucide-react" // ícones para os cards
import { Home } from "lucide-react"


type Cliente = {
  id: number
  nome: string
  telefone?: string | null
  cidade?: string | null
  rota: string
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
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente, "id">>({
    nome: "",
    telefone: "",
    cidade: "",
    rota: "",
  })
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  const [filtroRota, setFiltroRota] = useState("")
  const [filtroCidade, setFiltroCidade] = useState("")

  // --- CARREGAMENTO ---
  const carregarClientes = async () => {
    const { data, error } = await supabase.from("clientes").select("*").order("nome", { ascending: true })
    if (error) console.error("Erro ao carregar clientes:", error)
    else setClientes((data as Cliente[]) || [])
  }
  useEffect(() => { carregarClientes() }, [])

  function formatarTelefoneRaw(valor: string) {
    const nums = valor.replace(/\D/g, "")
    if (!nums) return ""
    if (nums.length <= 10) {
      return nums.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, g1, g2, g3) => {
        let s = ""; if (g1) s += "(" + g1 + ")"; if (g2) s += " " + g2; if (g3) s += "-" + g3; return s
      }).replace(/-$/,"")
    } else {
      return nums.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, g1, g2, g3) => {
        let s = ""; if (g1) s += "(" + g1 + ")"; if (g2) s += " " + g2; if (g3) s += "-" + g3; return s
      }).replace(/-$/,"")
    }
  }
  function handleTelefoneChange(v: string) { setNovoCliente(prev => ({ ...prev, telefone: formatarTelefoneRaw(v) })) }
  function telefoneConsiderarVazio(t?: string | null) {
    if (!t) return true
    const nums = t.replace(/\D/g, "")
    if (nums.length === 0) return true
    if (/^0+$/.test(nums)) return true
    return false
  }
  function montarPayload() {
    const payload: any = { nome: novoCliente.nome?.trim(), rota: novoCliente.rota?.trim() }
    if (!telefoneConsiderarVazio(novoCliente.telefone)) payload.telefone = novoCliente.telefone!.trim()
    if (novoCliente.cidade && novoCliente.cidade.trim() !== "") payload.cidade = novoCliente.cidade.trim()
    return payload
  }

  const salvarCliente = async () => {
    if (!novoCliente.nome || novoCliente.nome.trim() === "") { alert("Nome é obrigatório."); return }
    if (!novoCliente.rota || novoCliente.rota.trim() === "") { alert("Rota é obrigatória."); return }

    try {
      let query = supabase.from("clientes").select("id").ilike("nome", novoCliente.nome.trim())
      if (editando) query = query.neq("id", editando.id)
      const { data: dup } = await query.limit(1)
      if (dup && dup.length > 0) { alert("Já existe um cliente com esse nome."); return }
    } catch (e) { console.error("Erro checar duplicado:", e) }

    const payload = montarPayload()
    setCarregando(true)
    if (editando) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editando.id)
      setCarregando(false)
      if (error) { alert("Erro ao atualizar cliente: " + error.message); return }
      else await carregarClientes()
    } else {
      const { data, error } = await supabase.from("clientes").insert([payload]).select().single()
      setCarregando(false)
      if (error) { alert("Erro ao salvar cliente: " + error.message); return }
      else if (data) setClientes(prev => [...prev, data as Cliente])
    }

    setNovoCliente({ nome: "", telefone: "", cidade: "", rota: "" })
    setEditando(null)
    setMostrarModal(false)
  }

  const editarCliente = (cliente: Cliente) => {
    setEditando(cliente)
    setNovoCliente({
      nome: cliente.nome ?? "",
      telefone: cliente.telefone ?? "",
      cidade: cliente.cidade ?? "",
      rota: cliente.rota ?? "",
    })
    setMostrarModal(true)
  }

  const deletarCliente = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir?")) return
    const { error } = await supabase.from("clientes").delete().eq("id", id)
    if (error) alert("Erro ao excluir cliente: " + error.message)
    else setClientes(prev => prev.filter(c => c.id !== id))
  }

  const clientesFiltrados = clientes.filter(c =>
    (filtroRota ? c.rota === filtroRota : true) &&
    (filtroCidade ? (c.cidade ?? "") === filtroCidade : true)
  )
  const rotasUnicas = Array.from(new Set(clientes.map(c => c.rota).filter(Boolean))).sort()
  const cidadesUnicas = Array.from(new Set(clientes.map(c => c.cidade || "").filter(Boolean))).sort()
  function mostrarTodos() { setFiltroRota(""); setFiltroCidade("") }
  function abrirModalNovo() { setEditando(null); setNovoCliente({ nome: "", telefone: "(00) 0000-0000", cidade: "", rota: "" }); setMostrarModal(true) }

  const totalClientes = clientes.length
  const comTelefone = clientes.filter(c => !telefoneConsiderarVazio(c.telefone)).length
  const comCidade = clientes.filter(c => c.cidade && c.cidade.trim() !== "").length
  const rotasDistintas = rotasUnicas.length

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
   <div className="mb-6 flex justify-start">
  <button
    onClick={() => window.location.href = "/"}
    className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
    style={{ backgroundColor: theme.secondary, color: theme.primary }}
  >
    <Home className="w-5 h-5 text-white" />
    Home
  </button>
</div>

      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard de Clientes</h1>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { titulo: "Total", valor: totalClientes, icone: Users },
          { titulo: "Com Telefone", valor: comTelefone, icone: Phone },
          { titulo: "Com Cidade", valor: comCidade, icone: MapPin },
          { titulo: "Rotas Distintas", valor: rotasDistintas, icone: Map }
        ].map(card => (
          <div key={card.titulo} className="bg-white p-4 rounded-2xl shadow flex flex-col items-center justify-center">
            <card.icone className="w-6 h-6 mb-2 text-[#92D050]" />
            <h3 className="text-gray-500">{card.titulo}</h3>
            <p className="text-2xl font-bold text-[#1C415B]">{card.valor}</p>
          </div>
        ))}
      </div>

      {/* Botão Novo Cliente */}
      <div className="flex justify-center mb-6">
        <button onClick={abrirModalNovo} className="px-6 py-2 rounded-2xl font-bold shadow" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <select value={filtroRota} onChange={e => setFiltroRota(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }}>
          <option value="">Todas as rotas</option>
          {rotasUnicas.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }}>
          <option value="">Todas as cidades</option>
          {cidadesUnicas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={mostrarTodos} className="px-3 py-2 rounded font-medium" style={{ backgroundColor: theme.primary, color: "#FFF" }}>
          Mostrar todos
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Rota</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(cliente => (
              <tr key={cliente.id} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border }}>
                <td className="p-3">{cliente.nome}</td>
                <td className="p-3">{cliente.telefone ?? "-"}</td>
                <td className="p-3">{cliente.cidade ?? "-"}</td>
                <td className="p-3">{cliente.rota}</td>
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

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
          <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
            <h2 className="text-xl font-semibold mb-4">{editando ? "Editar Cliente" : "Novo Cliente"}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={novoCliente.nome} onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Telefone (opcional)" value={novoCliente.telefone ?? ""} onChange={e => handleTelefoneChange(e.target.value)} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Cidade (opcional)" value={novoCliente.cidade ?? ""} onChange={e => setNovoCliente({ ...novoCliente, cidade: e.target.value })} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Rota *" value={novoCliente.rota} onChange={e => setNovoCliente({ ...novoCliente, rota: e.target.value })} className="w-full p-2 rounded-lg border" />
              <div className="flex justify-between gap-3 mt-4">
                <button onClick={() => setMostrarModal(false)} className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90 transition">
                  Cancelar
                </button>
                <button onClick={salvarCliente} disabled={carregando} className="flex-1 py-2 rounded-2xl font-semibold" style={{ backgroundColor: theme.secondary, color: "#FFF" }}>
                  {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
