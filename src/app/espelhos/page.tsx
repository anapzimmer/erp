"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Home } from "lucide-react"
import Link from "next/link"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type UnidadeMedida = "m²" | "unitário" | "metro_linear"

type Servico = {
  id: number
  nome: string
  unidade: UnidadeMedida
  preco: number
}

type EspelhoServico = {
  servico: Servico
  valorCalculado: number
  medidaLinear?: number // só usado se for metro linear
}

type EspelhoLinha = {
  larguraOriginal: string
  alturaOriginal: string
  larguraCalc: number
  alturaCalc: number
  quantidade: number
  acabamento: string
  vidro_id: number
  precoUnitarioM2: number
  valorTotal: number
  servicos?: EspelhoServico[]
  cliente?: string
}

type Vidro = {
  id: number
  nome: string
  tipo: string
  espessura?: string
  preco: number | string
}

type Cliente = {
  id: number
  nome: string
}

const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#FFFFFF",
  border: "#F2F2F2",
}

export default function EspelhosPage() {
  const [espelhos, setEspelhos] = useState<EspelhoLinha[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("espelhos")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  const [showModalNovoOrcamento, setShowModalNovoOrcamento] = useState(false)

  const [espelhoSelecionadoIndex, setEspelhoSelecionadoIndex] = useState<number | null>(null)

  const espelhoAtual = espelhoSelecionadoIndex !== null ? espelhos[espelhoSelecionadoIndex] : null

  const [novoEspelho, setNovoEspelho] = useState<Omit<EspelhoLinha, "larguraCalc" | "alturaCalc" | "precoUnitarioM2" | "valorTotal">>({
    larguraOriginal: "",
    alturaOriginal: "",
    quantidade: 1,
    acabamento: "Nenhum",
    vidro_id: 0,
    cliente: "",
    servicos: []
  })

  const [vidros, setVidros] = useState<Vidro[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [precoM2Selecionado, setPrecoM2Selecionado] = useState<number>(0)

  const larguraInputRef = useRef<HTMLInputElement>(null)


  // Modal serviços por item
  const [showModalServicos, setShowModalServicos] = useState(false)
  const [servicosEditIndex, setServicosEditIndex] = useState<number | null>(null)

  const carregarVidros = async () => {
    const { data, error } = await supabase
      .from("vidros")
      .select("*")
      .ilike("nome", "%espelho%")
      .order("nome")
    if (error) console.error(error)
    else setVidros(data as Vidro[])
  }

  const carregarServicos = async () => {
    const { data, error } = await supabase
      .from("servicos")
      .select("*")
      .order("nome")
    if (error) console.error(error)
    else setServicos(data as Servico[])
  }

  const carregarClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome")
      .order("nome")
    if (error) console.error(error)
    else setClientes(data as Cliente[])
  }

  useEffect(() => {
    carregarVidros()
    carregarServicos()
    carregarClientes()
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("espelhos", JSON.stringify(espelhos))
    }
  }, [espelhos])

  const arredondar5cm = (valorMM: number) => Math.ceil(valorMM / 50) * 50

  const parseNumber = (s: string) => {
    if (!s) return NaN
    const cleaned = s.replace(",", ".").replace(/[^\d.-]/g, "")
    return parseFloat(cleaned)
  }

  const calcularValorUnidade = (larguraCalcMM: number, alturaCalcMM: number, precoM2: number, acabamento: string) => {
    let l = larguraCalcMM
    let a = alturaCalcMM
    let valorMultiplicador = 1

    switch (acabamento) {
      case "Redondo Lapidado": l += 100; a += 100; valorMultiplicador = 1.10; break
      case "Redondo Bisote": l += 100; a += 100; valorMultiplicador = 1.30; break
      case "Jogo de Espelhos": valorMultiplicador = 1.10; break
      case "Orgânico":
      case "Molde": l += 100; a += 100; valorMultiplicador = 1.30; break
    }

    const areaM2 = (l * a) / 1000000
    return parseFloat((areaM2 * precoM2 * valorMultiplicador).toFixed(2))
  }

const adicionarOuSalvar = () => {
  const larguraNum = parseNumber(novoEspelho.larguraOriginal)
  const alturaNum = parseNumber(novoEspelho.alturaOriginal)
  if (!novoEspelho.vidro_id || isNaN(larguraNum) || isNaN(alturaNum)) {
    alert("Informe largura, altura e selecione um vidro")
    return
  }

  const larguraCalc = arredondar5cm(larguraNum)
  const alturaCalc = arredondar5cm(alturaNum)
  const vidro = vidros.find(v => v.id === novoEspelho.vidro_id)
  const precoM2 = Number(vidro?.preco ?? precoM2Selecionado ?? 0)
  const valorUnit = calcularValorUnidade(larguraCalc, alturaCalc, precoM2, novoEspelho.acabamento)

  const totalServicos = novoEspelho.servicos?.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0) || 0
  const valorTotal = parseFloat(((valorUnit + totalServicos) * (novoEspelho.quantidade || 1)).toFixed(2))

  const item: EspelhoLinha = {
    ...novoEspelho,
    larguraCalc,
    alturaCalc,
    precoUnitarioM2: precoM2,
    valorTotal
  }

  setEspelhos(prev => [...prev, item])

  // Zera apenas as medidas e quantidade, mantendo o vidro selecionado
  setNovoEspelho(prev => ({ 
    ...prev, 
    larguraOriginal: "", 
    alturaOriginal: "", 
    quantidade: 1, 
    acabamento: "", 
    servicos: [] 
  }))

  // Foca de volta na largura para digitação rápida
  setTimeout(() => {
    larguraInputRef.current?.focus()
  }, 0)
}


  const totalOrcamento = espelhos.reduce((acc, e) => acc + (e.valorTotal || 0), 0)

 const novoOrcamento = () => {
  setShowModalNovoOrcamento(true)
}


  const abrirModalServicosItem = (index: number) => {
    setServicosEditIndex(index)
    setShowModalServicos(true)
  }

  const salvarServicosItem = (servicosSelecionados: EspelhoServico[]) => {
    if (servicosEditIndex === null) return
    setEspelhos(prev => {
      const newEspelhos = [...prev]
      newEspelhos[servicosEditIndex!] = { ...newEspelhos[servicosEditIndex!], servicos: servicosSelecionados }
      // recalcular valor total do item
      const e = newEspelhos[servicosEditIndex!]
      const valorUnit = calcularValorUnidade(e.larguraCalc, e.alturaCalc, e.precoUnitarioM2, e.acabamento)
      const totalServicos = e.servicos?.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0) || 0
      e.valorTotal = parseFloat(((valorUnit + totalServicos) * (e.quantidade || 1)).toFixed(2))
      return newEspelhos
    })
    setShowModalServicos(false)
    setServicosEditIndex(null)
  }

  const gerarPDF = async () => {
  if (!espelhos.length) {
    alert("Não há itens no orçamento")
    return
  }

  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 20

  // Cabeçalho centralizado
  pdf.setFontSize(16)
  pdf.setTextColor(theme.primary)
  const title = "Orçamento de Espelhos"
  pdf.text(title, margin, 20) // usa a margem esquerda como referência

  // Cliente
  const clienteNome = espelhos[0]?.cliente || "Não informado"
  pdf.setFontSize(12)
  pdf.setTextColor(theme.primary)
  pdf.text(`Cliente: ${clienteNome}`, margin, 30)

  // Data menor
  pdf.setFontSize(10)
  pdf.setTextColor(theme.primary)
  pdf.text(`Data: ${new Date().toLocaleDateString()}`, margin, 36)

  // Logo (sincrono)
  // Logo (mantendo proporção correta)
const imgData = await fetch("/logo.png")
  .then(res => res.blob())
  .then(blob => new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  }))

const logo = new Image()
logo.src = imgData

await new Promise((resolve) => {
  logo.onload = resolve
})

// Define altura fixa e calcula largura proporcional
const logoHeight = 13
const aspectRatio = logo.width / logo.height
const logoWidth = logoHeight * aspectRatio

pdf.addImage(
  imgData,
  "PNG",
  pageWidth - margin - logoWidth,
  10,
  logoWidth,
  logoHeight
)

  // Tabela
  const body = espelhos.map(e => {
    const vidro = vidros.find(v => v.id === e.vidro_id)
    return [
      `${vidro?.nome}${vidro?.tipo ? ` - ${vidro.tipo}` : ""}${vidro?.espessura ? ` (${vidro.espessura})` : ""}`,
      e.servicos?.map(s => s.servico?.nome).filter(Boolean).join(", ") || "-",
      e.quantidade,
      `${e.larguraCalc} x ${e.alturaCalc}`,
      e.acabamento,
      formatarPreco(e.valorTotal)
    ]
  })

autoTable(pdf, {
  head: [["Vidro", "Serviços", "Qtd", "L x A", "Acabamento", "Total"]],
  body,
  theme: "grid",
  headStyles: { fillColor: "#1C415B", textColor: "#FFF", fontSize: 11 },
  bodyStyles: { fontSize: 12 },
  alternateRowStyles: { fillColor: "#fff" },
  margin: { left: margin, right: margin },
  styles: { cellPadding: 3 },
  startY: 45,
})


  // Total destacado
const finalY = (pdf as any).lastAutoTable?.finalY || 30
pdf.setFontSize(12)
pdf.setTextColor(theme.primary)
pdf.text(
  `Total do orçamento: ${formatarPreco(
    espelhos.reduce((acc, e) => acc + e.valorTotal, 0)
  )}`,
  pageWidth - margin - pdf.getTextWidth(
    `Total do orçamento: ${formatarPreco(
      espelhos.reduce((acc, e) => acc + e.valorTotal, 0)
    )}`
  ),
  finalY + 13
)

  pdf.save("orcamento.pdf")
}

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
      <div className="flex justify-between items-center mb-4">
       <button
          onClick={() => (window.location.href = "/")}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold shadow hover:opacity-90 transition"
          style={{ backgroundColor: theme.secondary, color: theme.primary }}
        >
          <Home className="w-5 h-5 text-white" />
          <span className="hidden md:inline">Home</span>
        </button>
        <h1 className="text-2xl font-bold flex-1 text-center">Cálculo de Espelhos</h1>
        <div className="flex gap-2">
          <button onClick={novoOrcamento} className="flex items-center gap-2 px-4 py-2 rounded font-medium" style={{ color: "#1C415B", border: "1px solid #1C415B", backgroundColor: "#FFF" }}>
            Novo
          </button>
          <button onClick={gerarPDF} className="flex items-center gap-2 px-4 py-2 rounded font-medium" style={{ color: "#1C415B", border: "1px solid #1C415B", backgroundColor: "#FFF" }}>
  Gerar PDF
</button>
        </div>
      </div>

      {/* Cliente */}
      <div className="mb-4 flex gap-2 items-center">
        <label>Cliente:</label>
        <select value={novoEspelho.cliente || ""} onChange={e => setNovoEspelho(prev => ({ ...prev, cliente: e.target.value }))} disabled={espelhos.length > 0} className="p-2 rounded border" style={{ borderColor: theme.border }}>
          <option value="">Selecione</option>
          {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
        </select>
      </div>

      {/* Espelho */}
      <div className="mb-4 flex gap-2 items-center">
        <label>Espelho:</label>
        <select value={novoEspelho.vidro_id} onChange={e => {
          const id = Number(e.target.value)
          const vidroSelecionado = vidros.find(v => v.id === id)
          setNovoEspelho(prev => ({ ...prev, vidro_id: id }))
          setPrecoM2Selecionado(Number(vidroSelecionado?.preco ?? 0))
        }} className="p-2 rounded border" style={{ borderColor: theme.border }}>
          <option value={0}>Selecione</option>
          {vidros.map(v => <option key={v.id} value={v.id}>{v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""}</option>)}
        </select>
      </div>

      {/* Medidas */}
      <div className="mb-4 flex gap-2 items-center">
      <input
        type="text"
        placeholder="Largura (mm)"
        ref={larguraInputRef} // <- aqui
        value={novoEspelho.larguraOriginal || espelhoAtual?.larguraOriginal || ""}
        onChange={e => setNovoEspelho(prev => ({ ...prev, larguraOriginal: e.target.value }))}
      />

      <input
        type="text"
        placeholder="Altura (mm)"
        value={novoEspelho.alturaOriginal || espelhoAtual?.alturaOriginal || ""}
        onChange={e => setNovoEspelho(prev => ({ ...prev, alturaOriginal: e.target.value }))}
      />
        <select value={novoEspelho.acabamento} onChange={e => setNovoEspelho(prev => ({ ...prev, acabamento: e.target.value }))} className="p-2 rounded border">
          <option value="Nenhum">Nenhum</option>
          <option value="Redondo Lapidado">Redondo Lapidado</option>
          <option value="Redondo Bisote">Redondo Bisote</option>
          <option value="Jogo de Espelhos">Jogo de Espelhos</option>
          <option value="Orgânico">Orgânico</option>
          <option value="Molde">Molde</option>
        </select>
        <button onClick={adicionarOuSalvar} className="px-4 py-2 rounded font-bold text-white" style={{ backgroundColor: theme.secondary }}>Adicionar</button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto shadow rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-2">Espelho</th>
              <th className="p-2">Serviços</th>
              <th className="p-2">Qtd</th>
              <th className="p-2">L x A</th>
              <th className="p-2">Acabamento</th>
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {espelhos.map((e, i) => {
              const vidro = vidros.find(v => v.id === e.vidro_id)
              return (
                <tr key={i} className="border-b hover:bg-gray-50" style={{ borderColor: theme.border }}>
                  <td className="p-2">{vidro?.nome}{vidro?.tipo ? ` - ${vidro.tipo}` : ""}{vidro?.espessura ? ` (${vidro.espessura})` : ""}</td>
                  <td className="p-2">
                    {e.servicos?.map(s => s.servico?.nome).filter(Boolean).join(", ") || "-"}
                    <button onClick={() => abrirModalServicosItem(i)} className="ml-2 px-2 py-1 text-xs rounded border hover:bg-gray-100">
                      Adicionar/Editar
                    </button>
                  </td>
                  <td className="p-2">{e.quantidade}</td>
                  <td className="p-2">{e.larguraCalc} x {e.alturaCalc}</td>
                  <td className="p-2">{e.acabamento}</td>
                  <td className="p-2">{formatarPreco(e.valorTotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right font-bold text-lg">
        Total do orçamento: {formatarPreco(totalOrcamento)}
      </div>

      {/* Modal Serviços */}
      {showModalServicos && servicosEditIndex !== null && (
        <ModalServicosItem
          servicos={servicos}
          item={espelhos[servicosEditIndex]}
          onClose={() => setShowModalServicos(false)}
          onSave={salvarServicosItem}
        />
      )}

      {showModalNovoOrcamento && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
    <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
      <h2 className="text-xl font-semibold mb-4 text-center" style={{ color: theme.primary }}>Novo Orçamento</h2>
      <p className="mb-4 text-center">Tem certeza que deseja iniciar um novo orçamento? Todos os dados atuais serão perdidos.</p>
      <div className="flex justify-between gap-3">
        <button
          onClick={() => setShowModalNovoOrcamento(false)}
          className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            setNovoEspelho({ larguraOriginal: "", alturaOriginal: "", quantidade: 1, vidro_id: 0, cliente: "", acabamento: "", servicos: [] })
            setEspelhos([])
            localStorage.removeItem("espelhos")
            setShowModalNovoOrcamento(false)
          }}
          className="flex-1 py-2 rounded-2xl font-semibold" 
          style={{ backgroundColor: theme.secondary, color: "#FFF" }}
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}

type ModalServicosItemProps = {
  item: EspelhoLinha
  servicos: Servico[]
  onClose: () => void
  onSave: (servicosSelecionados: EspelhoServico[]) => void
}

function ModalServicosItem({ item, servicos, onClose, onSave }: ModalServicosItemProps) {
  const [selecionados, setSelecionados] = useState<EspelhoServico[]>(item.servicos ?? [])

  const toggleServico = (s: Servico) => {
    const exists = selecionados.find(ss => ss.servico.id === s.id)
    if (exists) {
      setSelecionados(prev => prev.filter(ss => ss.servico.id !== s.id))
    } else {
      let valorCalculado = 0
      let medidaLinear = undefined

      switch (s.unidade) {
        case "unitário": valorCalculado = s.preco; break
        case "m²": valorCalculado = 0; break // será calculado no salvar do item
        case "metro_linear": medidaLinear = 0; valorCalculado = 0; break
      }

      setSelecionados(prev => [...prev, { servico: s, valorCalculado, medidaLinear }])
    }
  }

  const handleSalvar = () => {
    // calcular valores
    const calculados = selecionados.map(ss => {
      let valor = 0
      switch (ss.servico.unidade) {
        case "unitário": valor = ss.servico.preco; break
        case "m²":
          const areaM2 = (parseFloat(item.larguraOriginal) * parseFloat(item.alturaOriginal)) / 1000000
          valor = parseFloat((areaM2 * ss.servico.preco).toFixed(2))
          break
        case "metro_linear":
          if (!ss.medidaLinear) ss.medidaLinear = 0
          valor = parseFloat((ss.medidaLinear * ss.servico.preco).toFixed(2))
          break
      }
      return { ...ss, valorCalculado: valor }
    })
    onSave(calculados)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
      <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
        <h2 className="text-xl font-semibold mb-4">Serviços do Item</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {servicos.map(s => {
            const sel = selecionados.find(ss => ss.servico.id === s.id)
            return (
              <div key={s.id} className="flex items-center justify-between border p-2 rounded">
                <label className="flex-1">{s.nome} ({s.unidade})</label>
                {s.unidade === "metro_linear" && sel && (
                  <input type="number" placeholder="Medida (mm)" value={sel.medidaLinear ?? ""} onChange={e => {
                    const val = Number(e.target.value)
                    setSelecionados(prev => prev.map(ss => ss.servico.id === s.id ? { ...ss, medidaLinear: val } : ss))
                  }} className="w-20 border rounded p-1" />
                )}
                <input type="checkbox" checked={!!sel} onChange={() => toggleServico(s)} />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90">Cancelar</button>
          <button onClick={handleSalvar} className="flex-1 py-2 rounded-2xl font-semibold" style={{ backgroundColor: theme.secondary, color: "#FFF" }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
