"use client"

import { useEffect, useState, useRef } from "react"
import { formatarPreco } from "@/utils/formatarPreco" // Assumindo que esta função está definida
import { supabase } from "@/lib/supabaseClient"
import { Home, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// =========================================================================
// TIPAGENS (MANTIDAS)
// =========================================================================

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
    larguraCalc: number // em mm arredondado para cálculo de área
    alturaCalc: number // em mm arredondado para cálculo de área
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
    id: string
    nome: string
}

const theme = {
    primary: "#1C415B",
    secondary: "#92D050",
    text: "#1C415B",
    background: "#FFFFFF",
    border: "#F2F2F2",
}

// =========================================================================
// FUNÇÕES DE CÁLCULO E UTILIDADE
// =========================================================================

// Função mockada para simular a do seu utils/formatarPreco
function formatarPrecoMock(valor: number): string {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

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

    // Regras de cálculo (assumindo que o fornecido está correto)
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

// =========================================================================
// COMPONENTE PRINCIPAL (EspelhosPage)
// =========================================================================

export default function EspelhosPage() {
    const [espelhos, setEspelhos] = useState<EspelhoLinha[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("espelhos")
            return saved ? JSON.parse(saved) : []
        }
        return []
    })

    const [showModalNovoOrcamento, setShowModalNovoOrcamento] = useState(false)
    const [showModalEdicao, setShowModalEdicao] = useState(false) 

    const [showModalServicos, setShowModalServicos] = useState(false) // ✅ CORRETO
    const [servicosEditIndex, setServicosEditIndex] = useState<number | null>(null) // ✅ CORRETO

    const [espelhoSelecionadoIndex, setEspelhoSelecionadoIndex] = useState<number | null>(null)

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

    const larguraInputRef = useRef<HTMLInputElement>(null)

      useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("espelhos", JSON.stringify(espelhos))
        }
    }, [espelhos])

    // 🔹 Funções para buscar dados do Supabase
   const carregarVidros = async () => {
  try {
    const { data, error } = await supabase
      .from("vidros")
      .select("*")
      // filtra por "espelho" no nome
      .ilike("nome", "%espelho%")
      .order("nome", { ascending: true })

    if (error) {
      console.error("Erro ao carregar vidros:", error)
      return
    }

    // Garantir preco como number (numeric do Postgres vem como string)
    const vidrosProcessados = (data || []).map((v: any) => ({
      id: v.id,
      nome: v.nome,
      tipo: v.tipo,
      espessura: v.espessura,
      preco: Number(v.preco ?? 0)
    })) as Vidro[]

        setVidros(vidrosProcessados)
    } catch (err) {
        console.error("Erro inesperado ao carregar vidros:", err)
    }
    }

    const carregarClientes = async () => {
    try {
        const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome", { ascending: true })

        if (error) {
        console.error("Erro ao carregar clientes:", error)
        return
        }

        setClientes((data || []) as Cliente[])
    } catch (err) {
        console.error("Erro inesperado ao carregar clientes:", err)
    }
    }

    const carregarServicos = async () => {
    try {
        const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .order("nome", { ascending: true })

        if (error) {
        console.error("Erro ao carregar serviços:", error)
        return
        }

        // garante tipos corretos (preco numeric -> number)
        const servicosProcessados = (data || []).map((s: any) => ({
        id: s.id,
        nome: s.nome,
        unidade: s.unidade as UnidadeMedida,
        preco: Number(s.preco ?? 0)
        })) as Servico[]

        setServicos(servicosProcessados)
    } catch (err) {
        console.error("Erro inesperado ao carregar serviços:", err)
    }
    }


    // Funções de carregamento (mantidas para estrutura, mas usando mocks acima)
    useEffect(() => {
        carregarVidros()
        carregarServicos()
        carregarClientes()
    }, [])


      // Função Limpar Formulário (Novo)
    const limparFormulario = () => {
        setNovoEspelho(prev => ({ 
            ...prev, 
            larguraOriginal: "", 
            alturaOriginal: "", 
            quantidade: 1, 
            acabamento: "Nenhum",
            servicos: [] 
        }))
        setTimeout(() => {
            larguraInputRef.current?.focus()
        }, 0)
    }

    const excluirItem = (index: number) => {
        if (!confirm("Deseja realmente excluir este item?")) return
        setEspelhos(prev => prev.filter((_, i) => i !== index))
    }

    const editarItem = (index: number) => {
        const item = espelhos[index]
        const clienteDefault = espelhos.length > 0 ? espelhos[0].cliente : ""

        // Preenche o formulário novoEspelho com os dados do item a ser editado
        setNovoEspelho({
            larguraOriginal: item.larguraOriginal,
            alturaOriginal: item.alturaOriginal,
            quantidade: item.quantidade,
            acabamento: item.acabamento,
            vidro_id: item.vidro_id,
            cliente: item.cliente || clienteDefault,
            servicos: item.servicos || []
        })
        setEspelhoSelecionadoIndex(index) // Seta o item a ser editado
        setShowModalEdicao(true) // Abre o modal de edição
    }

    const adicionarOuSalvar = () => {
        const larguraNum = parseNumber(novoEspelho.larguraOriginal)
        const alturaNum = parseNumber(novoEspelho.alturaOriginal)
        if (!novoEspelho.vidro_id || isNaN(larguraNum) || isNaN(alturaNum) || novoEspelho.quantidade < 1) {
            alert("Preencha as medidas, a quantidade e selecione um espelho.")
            return
        }

        const larguraCalc = arredondar5cm(larguraNum)
        const alturaCalc = arredondar5cm(alturaNum)
        const vidro = vidros.find(v => v.id === novoEspelho.vidro_id)
        const precoM2 = Number(vidro?.preco ?? 0)
        
        if (precoM2 === 0) {
            alert("Espelho selecionado não tem preço/m² definido.")
            return
        }

        const valorUnitBase = calcularValorUnidade(larguraCalc, alturaCalc, precoM2, novoEspelho.acabamento)

        // Recalcular serviços para garantir que estão corretos antes de adicionar
        const servicosCalculados = novoEspelho.servicos?.map(ss => {
            let valor = 0
            switch (ss.servico.unidade) {
                case "unitário": valor = ss.servico.preco; break
                case "m²":
                    const areaM2 = (larguraNum * alturaNum) / 1000000
                    valor = parseFloat((areaM2 * ss.servico.preco).toFixed(2))
                    break
                case "metro_linear":
                    if (!ss.medidaLinear) ss.medidaLinear = 0
                    valor = parseFloat((ss.medidaLinear * ss.servico.preco).toFixed(2))
                    break
            }
            return { ...ss, valorCalculado: valor }
        }) || []


        const totalServicos = servicosCalculados.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0)
        const valorTotal = parseFloat(((valorUnitBase + totalServicos) * (novoEspelho.quantidade || 1)).toFixed(2))

        const item: EspelhoLinha = {
            ...novoEspelho,
            servicos: servicosCalculados,
            larguraCalc,
            alturaCalc,
            precoUnitarioM2: precoM2,
            valorTotal,
            cliente: espelhos.length > 0 ? espelhos[0].cliente : novoEspelho.cliente // Mantém o cliente do primeiro item
        }

        setEspelhos(prev => [...prev, item])
        limparFormulario() // Limpa apenas medidas e Qtd
    }

    const salvarEdicao = () => {
        if (espelhoSelecionadoIndex === null) return

        const larguraNum = parseNumber(novoEspelho.larguraOriginal)
        const alturaNum = parseNumber(novoEspelho.alturaOriginal)
        if (!novoEspelho.vidro_id || isNaN(larguraNum) || isNaN(alturaNum) || novoEspelho.quantidade < 1) {
            alert("Informe largura, altura e selecione um espelho válido para salvar a edição.")
            return
        }

        const larguraCalc = arredondar5cm(larguraNum)
        const alturaCalc = arredondar5cm(alturaNum)
        const vidro = vidros.find(v => v.id === novoEspelho.vidro_id)
        const precoM2 = Number(vidro?.preco ?? espelhos[espelhoSelecionadoIndex].precoUnitarioM2 ?? 0)
        
        const valorUnitBase = calcularValorUnidade(larguraCalc, alturaCalc, precoM2, novoEspelho.acabamento)

        // Recalcular serviços (necessário se o modal de edição alterou medidas/vidro)
        const servicosCalculados = novoEspelho.servicos?.map(ss => {
            let valor = 0
            switch (ss.servico.unidade) {
                case "unitário": valor = ss.servico.preco; break
                case "m²":
                    const areaM2 = (larguraNum * alturaNum) / 1000000
                    valor = parseFloat((areaM2 * ss.servico.preco).toFixed(2))
                    break
                case "metro_linear":
                    if (!ss.medidaLinear) ss.medidaLinear = 0
                    valor = parseFloat((ss.medidaLinear * ss.servico.preco).toFixed(2))
                    break
            }
            return { ...ss, valorCalculado: valor }
        }) || []

        const totalServicos = servicosCalculados.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0)
        const valorTotal = parseFloat(((valorUnitBase + totalServicos) * (novoEspelho.quantidade || 1)).toFixed(2))

        const itemEditado: EspelhoLinha = {
            ...novoEspelho,
            servicos: servicosCalculados,
            larguraCalc,
            alturaCalc,
            precoUnitarioM2: precoM2,
            valorTotal
        }

        setEspelhos(prev => {
            const newEspelhos = [...prev]
            newEspelhos[espelhoSelecionadoIndex] = itemEditado
            return newEspelhos
        })

        setShowModalEdicao(false)
        setEspelhoSelecionadoIndex(null)
        limparFormulario() // Limpa o formulário após salvar edição
    }


    const abrirModalServicosItem = (index: number) => {
        setServicosEditIndex(index)
        setShowModalServicos(true)
    }

    const salvarServicosItem = (servicosSelecionados: EspelhoServico[]) => {
        if (servicosEditIndex === null) return
        
        setEspelhos(prev => {
            const newEspelhos = [...prev]
            const e = newEspelhos[servicosEditIndex!]
            
            // 1. Atualiza a lista de serviços
            e.servicos = servicosSelecionados
            
            // 2. Recalcula o valor total do item
            const larguraNum = parseNumber(e.larguraOriginal)
            const alturaNum = parseNumber(e.alturaOriginal)
            const precoM2 = Number(e.precoUnitarioM2 ?? 0)
            const valorUnitBase = calcularValorUnidade(e.larguraCalc, e.alturaCalc, precoM2, e.acabamento)

            const totalServicos = e.servicos?.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0) || 0
            e.valorTotal = parseFloat(((valorUnitBase + totalServicos) * (e.quantidade || 1)).toFixed(2))
            
            return newEspelhos
        })
        setShowModalServicos(false)
        setServicosEditIndex(null)
    }

    const totalOrcamento = espelhos.reduce((acc, e) => acc + (e.valorTotal || 0), 0)


    // Função PDF (Mantida com ajustes de formatação)
    const gerarPDF = async () => {
        if (!espelhos.length) {
            alert("Não há itens no orçamento")
            return
        }

        const pdf = new jsPDF("p", "mm", "a4")
        const pageWidth = pdf.internal.pageSize.getWidth()
        const margin = 10
        const usableWidth = pageWidth - (2 * margin)

        // Cabeçalho centralizado
        pdf.setFontSize(16)
        pdf.setTextColor(theme.primary)
        const title = "Orçamento de Espelhos"
        pdf.text(title, margin, 20) 

        // Cliente
        const clienteNome = espelhos[0]?.cliente || "Não informado"
        pdf.setFontSize(12)
        pdf.setTextColor(theme.primary)
        pdf.text(`Cliente: ${clienteNome}`, margin, 30)

        // Data menor
        pdf.setFontSize(10)
        pdf.setTextColor(theme.primary)
        pdf.text(`Data: ${new Date().toLocaleDateString()}`, margin, 36)

        // Logo (Mockado para evitar erro no ambiente de demonstração)
        try {
            // Se você tiver o arquivo /logo.png no public/
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
        } catch {
            // console.warn("Logo não carregada para o PDF.")
        }

        // Tabela
        const body = espelhos.map(e => {
            const vidro = vidros.find(v => v.id === e.vidro_id)
            const servicosTexto = e.servicos?.map(s => s.servico?.nome).filter(Boolean).join(", ") || "-"

            return [
                `${vidro?.nome}${vidro?.tipo ? ` (${vidro.tipo})` : ""}${vidro?.espessura ? ` - ${vidro.espessura}` : ""}`,
                servicosTexto,
                e.quantidade,
                `${e.larguraOriginal} x ${e.alturaOriginal}`, // Usa medidas originais
                e.acabamento,
                formatarPrecoMock(e.valorTotal)
            ]
        })
        
        // Colunas com largura ajustada
        const columnStyles = { 
            0: { cellWidth: usableWidth * 0.25 }, // Vidro
            1: { cellWidth: usableWidth * 0.20 }, // Serviços
            2: { cellWidth: usableWidth * 0.08, halign: 'center' as const }, // Qtd
            3: { cellWidth: usableWidth * 0.15, halign: 'center' as const }, // L x A
            4: { cellWidth: usableWidth * 0.17 }, // Acabamento
            5: { cellWidth: usableWidth * 0.15, halign: 'right' as const }, // Total
        }


        autoTable(pdf, {
            head: [["Espelho", "Serviços", "Qtd", "L x A (mm)", "Acabamento", "Total"]],
            body,
            theme: "grid",
            headStyles: { fillColor: theme.primary, textColor: "#FFF", fontSize: 10 },
            bodyStyles: { fontSize: 9, cellPadding: 2 },
            margin: { left: margin, right: margin },
            columnStyles: columnStyles,
            styles: { cellPadding: 2.5, overflow: 'linebreak' as const, cellWidth: 'wrap' as const },
            startY: 45,
        })


        // Total destacado
        const finalY = (pdf as any).lastAutoTable?.finalY || 30
        pdf.setFontSize(12)
        pdf.setTextColor(theme.primary)
        const totalTexto = `Total do orçamento: ${formatarPrecoMock(totalOrcamento)}`
        
        pdf.text(
            totalTexto,
            pageWidth - margin - pdf.getTextWidth(totalTexto),
            finalY + 13
        )

        pdf.save("orcamento.pdf")
    }
    
    const [clienteBusca, setClienteBusca] = useState("")
    const [mostrarListaClientes, setMostrarListaClientes] = useState(false)
    const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(clienteBusca.toLowerCase())
    )


    return (
        <div className="min-h-screen p-4 sm:p-6 font-sans" style={{ backgroundColor: theme.background, color: theme.text }}>

            {/* Cabeçalho e Botões */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Link href="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold shadow hover:opacity-90 transition"
                        style={{ backgroundColor: theme.secondary, color: theme.primary }}
                    >
                        <Home className="w-5 h-5 text-white" />
                        <span className="hidden md:inline text-theme.primary">Home</span>
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-bold text-center">Cálculo de Espelhos</h1>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button onClick={() => setShowModalNovoOrcamento(true)} className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium shadow-md transition hover:bg-gray-100" style={{ color: theme.primary, border: "1px solid " + theme.primary, backgroundColor: "#FFF" }}>
                        Novo
                    </button>
                    <button onClick={gerarPDF} className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium shadow-md transition hover:bg-gray-100" style={{ color: theme.primary, border: "1px solid " + theme.primary, backgroundColor: "#FFF" }}>
                        Gerar PDF
                    </button>
                </div>
            </div>

            {/* Seleção Cliente e Vidro */}
            <div className="bg-white p-4 rounded-xl shadow-lg mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente pesquisável */}
                    <div className="flex flex-col relative">
                    <label className="font-medium mb-1 text-sm" style={{ color: theme.text }}>
                        Cliente:
                    </label>

                   <input
                        type="text"
                        placeholder="Digite o nome do cliente"
                        value={clienteBusca}
                        disabled={espelhos.length > 0}
                        onChange={(e) => {
                            const valor = e.target.value
                            setClienteBusca(valor)
                            setMostrarListaClientes(true)

                            // limpa cliente selecionado se estiver digitando
                            setNovoEspelho(prev => ({ ...prev, cliente: "" }))
                        }}
                        onFocus={() => setMostrarListaClientes(true)}
                        className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:bg-gray-100"
                        style={{ borderColor: theme.border }}
                    />

                    {mostrarListaClientes && clientesFiltrados.length > 0 && !espelhos.length && (
                        <ul className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-lg max-h-56 overflow-y-auto z-50 mt-1">
                        {clientesFiltrados.map(c => (
                            <li
                            key={c.id}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                            onClick={() => {
                                setNovoEspelho(prev => ({ ...prev, cliente: c.nome }))
                                setClienteBusca(c.nome)
                                setMostrarListaClientes(false)
                            }}
                            >
                            {c.nome}
                            </li>
                        ))}
                        </ul>
                    )}
                    </div>

                
                {/* Espelho */}
                <div className="flex flex-col">
                    <label className="font-medium mb-1 text-sm" style={{ color: theme.text }}>Espelho:</label>
                    <select 
                        value={novoEspelho.vidro_id} 
                        onChange={e => {
                            const id = Number(e.target.value)
                            setNovoEspelho(prev => ({ ...prev, vidro_id: id }))
                            // Preço M2 é mantido no estado do novoEspelho indiretamente via vidro_id
                        }} 
                        className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50" 
                        style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                    >
                        <option value={0}>Selecione</option>
                        {vidros.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""} ({formatarPrecoMock(Number(v.preco))}/m²)
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Medidas, Qtd, Acabamento e Botão Adicionar */}
            <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primary }}>Adicionar Item</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-4 items-end">
                    
                    {/* Largura */}
                    <div className="flex flex-col">
                        <label className="font-medium mb-1 text-xs sm:text-sm" style={{ color: theme.text }}>Largura (mm)</label>
                        <input
                            type="text"
                            maxLength={4} // 🔹 impede mais que 4 dígitos
                            placeholder="Largura (mm)"
                            ref={larguraInputRef}
                            value={novoEspelho.larguraOriginal}
                            onChange={e => setNovoEspelho(prev => ({ ...prev, larguraOriginal: e.target.value }))}
                            className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50"
                            style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                        />
                    </div>

                    {/* Altura */}
                    <div className="flex flex-col">
                        <label className="font-medium mb-1 text-xs sm:text-sm" style={{ color: theme.text }}>Altura (mm)</label>
                        <input
                            type="text"
                            maxLength={4} // 🔹 impede mais que 4 dígitos
                            placeholder="Altura (mm)"
                            value={novoEspelho.alturaOriginal}
                            onChange={e => setNovoEspelho(prev => ({ ...prev, alturaOriginal: e.target.value }))}
                            className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50"
                            style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                        />
                    </div>

                    {/* Qtd */}
                    <div className="flex flex-col">
                        <label className="font-medium mb-1 text-xs sm:text-sm" style={{ color: theme.text }}>Qtd</label>
                        <input
                            type="number"
                            placeholder="1"
                            min="1"
                            value={novoEspelho.quantidade} 
                            onChange={e => setNovoEspelho(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                            className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50"
                            style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                        />
                    </div>
                    
                    {/* Acabamento */}
                    <div className="flex flex-col col-span-2 sm:col-span-1">
                        <label className="font-medium mb-1 text-xs sm:text-sm" style={{ color: theme.text }}>Acabamento</label>
                        <select 
                            value={novoEspelho.acabamento} 
                            onChange={e => setNovoEspelho(prev => ({ ...prev, acabamento: e.target.value }))} 
                            className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50"
                            style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                        >
                            <option value="Nenhum">Nenhum</option>
                            <option value="Redondo Lapidado">Redondo Lapidado</option>
                            <option value="Redondo Bisote">Redondo Bisote</option>
                            <option value="Jogo de Espelhos">Jogo de Espelhos</option>
                            <option value="Orgânico">Orgânico</option>
                            <option value="Molde">Molde</option>
                        </select>
                    </div>
                    
                    {/* Botão Limpar */}
                    <div className="col-span-1 sm:col-span-1">
                        <button 
                            onClick={limparFormulario}
                            className="py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition w-full h-full min-h-[44px]"
                        >
                            Limpar
                        </button>
                    </div>
                    
                    {/* Botão Adicionar */}
                    <div className="col-span-1 sm:col-span-1">
                        <button 
                            onClick={adicionarOuSalvar} 
                            className="py-3 rounded-xl font-bold text-white w-full h-full min-h-[44px] flex items-center justify-center transition hover:brightness-110" 
                            style={{ backgroundColor: theme.primary }}
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <h2 className="text-xl font-bold mb-3" style={{ color: theme.primary }}>Itens do Orçamento ({espelhos.length})</h2>
            <div className="overflow-x-auto shadow rounded-xl bg-white">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
                        <tr>
                            <th className="p-3">Espelho</th>
                            <th className="p-3">Serviços</th>
                            <th className="p-3">Qtd</th>
                            <th className="p-3">L x A (mm)</th>
                            <th className="p-3">Acabamento</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {espelhos.map((e, i) => {
                            const vidro = vidros.find(v => v.id === e.vidro_id)
                            const totalServicos = e.servicos?.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0) || 0
                            
                            return (
                                <tr key={i} className="border-b hover:bg-gray-50" style={{ borderColor: theme.border }}>
                                    <td className="p-3 text-sm">{vidro?.nome}{vidro?.tipo ? ` (${vidro.tipo})` : ""}{vidro?.espessura ? ` - ${vidro.espessura}` : ""}</td>
                                    <td className="p-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs italic text-gray-500">
                                                {e.servicos?.map(s => s.servico?.nome).filter(Boolean).join(", ") || "Nenhum"}
                                            </span>
                                            <button onClick={() => abrirModalServicosItem(i)} className="p-1 rounded text-xs hover:bg-gray-100" title="Adicionar/Editar Serviços">
                                                <Edit size={14} style={{ color: theme.secondary }} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-3 text-sm">{e.quantidade}</td>
                                    <td className="p-3 text-sm">{e.larguraOriginal} x {e.alturaOriginal}</td>
                                    <td className="p-3 text-sm">{e.acabamento}</td>
                                    <td className="p-3 text-sm font-bold text-right">
                                        {formatarPrecoMock(e.valorTotal)}
                                        <span className="block text-xs text-gray-500 font-normal">
                                            ({formatarPrecoMock(e.valorTotal - totalServicos)}) + ({formatarPrecoMock(totalServicos)})
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => editarItem(i)} className="p-2 rounded-full hover:bg-gray-100 transition" title="Editar Item">
                                                <Edit size={18} style={{ color: theme.primary }} />
                                            </button>
                                            <button onClick={() => excluirItem(i)} className="p-2 rounded-full hover:bg-red-50 transition" title="Excluir Item">
                                                <Trash2 size={18} className="text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {!espelhos.length && (
                    <div className="p-8 text-center text-gray-500">Nenhum item adicionado ao orçamento.</div>
                )}
            </div>

            <div className="mt-4 text-right font-bold text-xl p-4 rounded-xl shadow-lg bg-white" style={{ color: theme.primary, border: `1px solid ${theme.secondary}` }}>
                Total Geral: {formatarPrecoMock(totalOrcamento)}
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

            {/* Modal Novo Orçamento */}
            {showModalNovoOrcamento && (
                <ModalNovoOrcamento
                    onConfirm={() => {
                        setNovoEspelho({ larguraOriginal: "", alturaOriginal: "", quantidade: 1, vidro_id: 0, cliente: "", acabamento: "Nenhum", servicos: [] })
                        setEspelhos([])
                        localStorage.removeItem("espelhos")
                        setShowModalNovoOrcamento(false)
                    }}
                    onCancel={() => setShowModalNovoOrcamento(false)}
                    theme={theme}
                />
            )}
            
            {/* Modal de Edição */}
            {showModalEdicao && espelhoSelecionadoIndex !== null && (
                <ModalEdicaoItem
                    item={espelhos[espelhoSelecionadoIndex]}
                    novoEspelho={novoEspelho}
                    setNovoEspelho={setNovoEspelho}
                    vidros={vidros}
                    onClose={() => {
                        setShowModalEdicao(false)
                        setEspelhoSelecionadoIndex(null)
                    }}
                    onSave={salvarEdicao}
                />
            )}
        </div>
    )
}

// =========================================================================
// Modal Novo Orçamento (Novo componente)
// =========================================================================

type ModalNovoOrcamentoProps = {
    onConfirm: () => void
    onCancel: () => void
    theme: typeof theme
}

function ModalNovoOrcamento({ onConfirm, onCancel, theme }: ModalNovoOrcamentoProps) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
            <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
                <h2 className="text-xl font-semibold mb-4 text-center" style={{ color: theme.primary }}>Novo Orçamento</h2>
                <p className="mb-4 text-center">Tem certeza que deseja iniciar um novo orçamento? Todos os dados atuais serão perdidos.</p>
                <div className="flex justify-between gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl font-semibold text-white transition hover:brightness-110" 
                        style={{ backgroundColor: theme.secondary }}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    )
}


// =========================================================================
// Modal Serviços Item (Ajustado)
// =========================================================================

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

            // Valores iniciais para o novo serviço selecionado
            switch (s.unidade) {
                case "unitário": valorCalculado = s.preco; break
                case "m²": valorCalculado = 0; break // Será calculado no save
                case "metro_linear": medidaLinear = 0; valorCalculado = 0; break // Será calculado no save
            }

            setSelecionados(prev => [...prev, { servico: s, valorCalculado, medidaLinear }])
        }
    }

    const handleSalvar = () => {
        const larguraNum = parseNumber(item.larguraOriginal)
        const alturaNum = parseNumber(item.alturaOriginal)

        // Calcula os valores finais
        const calculados = selecionados.map(ss => {
            let valor = 0
            switch (ss.servico.unidade) {
                case "unitário": valor = ss.servico.preco; break
                case "m²":
                    if (isNaN(larguraNum) || isNaN(alturaNum)) {
                        alert("Medidas inválidas para calcular serviço por m².")
                        return { ...ss, valorCalculado: 0 }
                    }
                    const areaM2 = (larguraNum * alturaNum) / 1000000
                    valor = parseFloat((areaM2 * ss.servico.preco).toFixed(2))
                    break
                case "metro_linear":
                    if (ss.medidaLinear === undefined || isNaN(ss.medidaLinear)) {
                         alert(`Medida linear para o serviço "${ss.servico.nome}" é obrigatória.`)
                         return { ...ss, valorCalculado: 0 }
                    }
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
                <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primary }}>Serviços do Item</h2>
                <p className="text-sm mb-4 text-gray-600">Espelho: {item.larguraOriginal}x{item.alturaOriginal} - Qtd: {item.quantidade}</p>
                
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {servicos.map(s => {
                        const sel = selecionados.find(ss => ss.servico.id === s.id)
                        return (
                            <div key={s.id} className="flex items-center justify-between border p-3 rounded-xl bg-gray-50">
                                <label className="flex-1 font-medium">{s.nome} <span className="text-xs italic text-gray-500">({s.unidade})</span></label>
                                
                                {s.unidade === "metro_linear" && sel && (
                                    <input 
                                        type="number" 
                                        placeholder="Medida (m)" 
                                        value={sel.medidaLinear ?? ""} 
                                        onChange={e => {
                                            const val = Number(e.target.value)
                                            setSelecionados(prev => prev.map(ss => ss.servico.id === s.id ? { ...ss, medidaLinear: isNaN(val) ? 0 : val } : ss))
                                        }} 
                                        className="w-24 border rounded-xl p-2 mr-4 text-sm" 
                                    />
                                )}

                                <input 
                                    type="checkbox" 
                                    checked={!!sel} 
                                    onChange={() => toggleServico(s)}
                                    className="w-5 h-5 accent-current" 
                                    style={{ color: theme.secondary }}
                                />
                            </div>
                        )
                    })}
                </div>
                <div className="flex justify-between gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition">Cancelar</button>
                    <button onClick={handleSalvar} className="flex-1 py-3 rounded-xl font-semibold text-white transition hover:brightness-110" style={{ backgroundColor: theme.secondary }}>Salvar</button>
                </div>
            </div>
        </div>
    )
}


// =========================================================================
// MODAL DE EDIÇÃO (Ajustado)
// =========================================================================

type ModalEdicaoItemProps = {
    item: EspelhoLinha
    novoEspelho: Omit<EspelhoLinha, "larguraCalc" | "alturaCalc" | "precoUnitarioM2" | "valorTotal">
    setNovoEspelho: React.Dispatch<React.SetStateAction<Omit<EspelhoLinha, "larguraCalc" | "alturaCalc" | "precoUnitarioM2" | "valorTotal">>>
    vidros: Vidro[]
    onClose: () => void
    onSave: () => void
}

function ModalEdicaoItem({ item, novoEspelho, setNovoEspelho, vidros, onClose, onSave }: ModalEdicaoItemProps) {
    const vidroSelecionado = vidros.find(v => v.id === novoEspelho.vidro_id)

    const handleVidroChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value)
        setNovoEspelho(prev => ({ ...prev, vidro_id: id }))
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
            <div className="p-6 rounded-2xl shadow-lg w-full max-w-lg bg-white" style={{ color: theme.text }}>
                <h2 className="text-xl font-semibold mb-4 text-center" style={{ color: theme.primary }}>Editar Item</h2>
                
                <div className="space-y-4">
                    {/* Vidro */}
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">Espelho:</label>
                        <select 
                            value={novoEspelho.vidro_id} 
                            onChange={handleVidroChange} 
                            className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50" 
                            style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                        >
                            <option value={0}>Selecione</option>
                            {vidros.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""} ({formatarPrecoMock(Number(v.preco))}/m²)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Medidas e Qtd */}
                    <div className="flex gap-4">
                        <div className="flex-1 flex flex-col">
                            <label className="font-medium mb-1">Largura (mm):</label>
                            <input
                                type="text"
                                value={novoEspelho.larguraOriginal}
                                onChange={e => setNovoEspelho(prev => ({ ...prev, larguraOriginal: e.target.value }))}
                                className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50"
                                style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="font-medium mb-1">Altura (mm):</label>
                            <input
                                type="text"
                                value={novoEspelho.alturaOriginal}
                                onChange={e => setNovoEspelho(prev => ({ ...prev, alturaOriginal: e.target.value }))}
                                className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50"
                                style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                            />
                        </div>
                        <div className="w-20 flex flex-col">
                            <label className="font-medium mb-1">Qtd:</label>
                            <input
                                type="number"
                                min="1"
                                value={novoEspelho.quantidade}
                                onChange={e => setNovoEspelho(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                                className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50"
                                style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                            />
                        </div>
                    </div>
                    
                    {/* Acabamento */}
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">Acabamento:</label>
                        <select 
                            value={novoEspelho.acabamento} 
                            onChange={e => setNovoEspelho(prev => ({ ...prev, acabamento: e.target.value }))} 
                            className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-opacity-50"
                            style={{ borderColor: theme.border, boxShadow: theme.secondary }}
                        >
                            <option value="Nenhum">Nenhum</option>
                            <option value="Redondo Lapidado">Redondo Lapidado</option>
                            <option value="Redondo Bisote">Redondo Bisote</option>
                            <option value="Jogo de Espelhos">Jogo de Espelhos</option>
                            <option value="Orgânico">Orgânico</option>
                            <option value="Molde">Molde</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex justify-between gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        className="flex-1 py-3 rounded-xl font-semibold text-white transition hover:brightness-110" 
                        style={{ backgroundColor: theme.secondary }}
                    >
                        Salvar Edição
                    </button>
                </div>
            </div>
        </div>
    )
}