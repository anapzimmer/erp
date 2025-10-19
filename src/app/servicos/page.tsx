"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Wrench, Layers, Home } from "lucide-react"

export type UnidadeMedida = "m²" | "unitário" | "metro_linear"

type Servico = {
  id: number
  nome: string
  unidade: UnidadeMedida
  preco: number
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

// Função de cálculo automática
export const calcularPrecoServico = (servico: Servico, quantidade: number, area?: number) => {
  switch (servico.unidade) {
    case "m²": return servico.preco * (area ?? 0)
    case "metro_linear": return servico.preco * quantidade
    case "unitário": return servico.preco * quantidade
    default: return 0
  }
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [novoServico, setNovoServico] = useState<Omit<Servico, "id">>({
    nome: "",
    unidade: "m²",
    preco: 0,
  })
  const [editando, setEditando] = useState<Servico | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  const [filtroNome, setFiltroNome] = useState("")
  const [filtroUnidade, setFiltroUnidade] = useState("")

  const carregarServicos = async () => {
    const { data, error } = await supabase.from("servicos").select("*").order("nome", { ascending: true })
    if (error) console.error("Erro ao carregar serviços:", error)
    else setServicos((data as Servico[]) || [])
  }

  useEffect(() => { carregarServicos() }, [])

  const salvarServico = async () => {
    if (!novoServico.nome?.trim()) { alert("Nome é obrigatório."); return }
    if (!novoServico.unidade) { alert("Unidade é obrigatória."); return }

    let query = supabase.from("servicos").select("id").ilike("nome", novoServico.nome.trim())
    if (editando) query = query.neq("id", editando.id)
    const { data: dup } = await query.limit(1)
    if (dup && dup.length > 0) { alert("Já existe um serviço com este nome."); return }

    setCarregando(true)
    const servicoParaSalvar = { ...novoServico, preco: Number(novoServico.preco) }

    if (editando) {
      const { error } = await supabase.from("servicos").update(servicoParaSalvar).eq("id", editando.id)
      setCarregando(false)
      if (error) { alert("Erro ao atualizar serviço: " + error.message); return }
      else await carregarServicos()
    } else {
      const { data, error } = await supabase.from("servicos").insert([servicoParaSalvar]).select().single()
      setCarregando(false)
      if (error) { alert("Erro ao salvar serviço: " + error.message); return }
      else if (data) setServicos(prev => [...prev, data as Servico])
    }

    setNovoServico({ nome: "", unidade: "m²", preco: 0 })
    setEditando(null)
    setMostrarModal(false)
  }

  const editarServico = (servico: Servico) => {
    setEditando(servico)
    setNovoServico({ nome: servico.nome, unidade: servico.unidade, preco: servico.preco })
    setMostrarModal(true)
  }

  const deletarServico = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return
    const { error } = await supabase.from("servicos").delete().eq("id", id)
    if (error) alert("Erro ao excluir serviço: " + error.message)
    else setServicos(prev => prev.filter(s => s.id !== id))
  }

  const servicosFiltrados = servicos.filter(s =>
    s.nome.toLowerCase().includes(filtroNome.toLowerCase()) &&
    s.unidade.toLowerCase().includes(filtroUnidade.toLowerCase())
  )

  function abrirModalNovo() {
    setEditando(null)
    setNovoServico({ nome: "", unidade: "m²", preco: 0 })
    setMostrarModal(true)
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
      {/* Botão Home */}
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

      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard de Serviços</h1>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { titulo: "Total", valor: servicos.length, icone: Wrench },
          { titulo: "Unidades Distintas", valor: Array.from(new Set(servicos.map(s => s.unidade))).length, icone: Layers }
        ].map(card => (
          <div key={card.titulo} className="bg-white p-4 rounded-2xl shadow flex flex-col items-center justify-center">
            <card.icone className="w-6 h-6 mb-2 text-[#92D050]" />
            <h3 className="text-gray-500">{card.titulo}</h3>
            <p className="text-2xl font-bold text-[#1C415B]">{card.valor}</p>
          </div>
        ))}
      </div>

      {/* Botão Novo */}
      <div className="flex justify-center mb-6">
        <button onClick={abrirModalNovo} className="px-6 py-2 rounded-2xl font-bold shadow" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          Novo Serviço
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Unidade</th>
              <th className="p-3">Preço</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servicosFiltrados.map(servico => (
              <tr key={servico.id} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border }}>
                <td className="p-3">{servico.nome}</td>
                <td className="p-3">{servico.unidade}</td>
                <td className="p-3">{formatarPreco(servico.preco)}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => editarServico(servico)} className="p-1 rounded hover:bg-[#E5E7EB]">
                    <Image src="/icons/editar.png" alt="Editar" width={20} height={20} />
                  </button>
                  <button onClick={() => deletarServico(servico.id)} className="p-1 rounded hover:bg-[#E5E7EB]">
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
            <h2 className="text-xl font-semibold mb-4">{editando ? "Editar Serviço" : "Novo Serviço"}</h2>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Nome *" 
                value={novoServico.nome} 
                onChange={e => setNovoServico({ ...novoServico, nome: e.target.value })}
                className="w-full p-2 rounded-lg border"
              />

              <select 
                value={novoServico.unidade} 
                onChange={e => setNovoServico({ ...novoServico, unidade: e.target.value as UnidadeMedida })}
                className="w-full p-2 rounded-lg border"
              >
                <option value="m²">m²</option>
                <option value="unitário">Unitário</option>
                <option value="metro_linear">Metro linear</option>
              </select>

              <input 
                type="number" 
                placeholder="Preço" 
                value={novoServico.preco} 
                onChange={e => setNovoServico({ ...novoServico, preco: Number(e.target.value) })}
                className="w-full p-2 rounded-lg border"
              />

              <div className="flex justify-between gap-3 mt-4">
                <button 
                  onClick={() => setMostrarModal(false)} 
                  className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={salvarServico} 
                  disabled={carregando} 
                  className="flex-1 py-2 rounded-2xl font-semibold" 
                  style={{ backgroundColor: theme.secondary, color: "#FFF" }}
                >
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
