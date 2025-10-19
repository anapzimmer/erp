"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { Home, Edit2, Trash2, AlertTriangle, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"


// --- TIPOS ---
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
    medidaLinear?: number
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

// Tipos alinhados com os arquivos de referência
type Vidro = {
    id: number
    nome: string
    tipo: string
    espessura?: string
    preco: number
}

type Cliente = {
    id: number
    nome: string
}

type PrecoCliente = {
    cliente_id: number
    vidro_id: number
    preco: number
}

// --- DEPENDÊNCIAS E CONFIGURAÇÕES ---

const theme = {
    primary: "#1C415B",
    secondary: "#92D050",
    text: "#1C415B",
    background: "#FFFFFF",
    border: "#F2F2F2",
}

type ThemeType = typeof theme;

const formatarPreco = (valor: number | string): string => {
    const num = typeof valor === "string" ? parseFloat(valor) : valor
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}


// ---------------------- UTILITIES ----------------------

const normalize = (s?: string) =>
    (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()

const matchesVidro = (v: Vidro, query: string) => {
    if (!query) return true
    const terms = normalize(query).split(" ").filter(Boolean)
    const nome = normalize(v.nome)
    const tipo = normalize(v.tipo ?? "")
    const esp = normalize(v.espessura ?? "")
    const completo = `${nome} ${tipo} ${esp}`.trim()
    return terms.every(t => nome.includes(t) || tipo.includes(t) || esp.includes(t) || completo.includes(t))
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

    switch (acabamento) {
        case "Redondo Lapidado": l += 100; a += 100; valorMultiplicador = 1.10; break
        case "Redondo Bisote": l += 100; a += 100; valorMultiplicador = 1.30; break
        case "Molde": l += 100; a += 100; valorMultiplicador = 1.30; break
    }

    const areaM2 = (l * a) / 1000000
    return parseFloat((areaM2 * precoM2 * valorMultiplicador).toFixed(2))
}

// ---------------------- HOOKS DO SISTEMA (NOVOS) ----------------------

type ConfirmModalState = {
    isOpen: boolean
    message: string
    onConfirm: () => void
    onCancel: () => void
}

const useSystemAlerts = () => {
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean, message: string }>({ isOpen: false, message: "" })
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        isOpen: false,
        message: "",
        onConfirm: () => { },
        onCancel: () => { },
    })

    const systemAlert = useCallback((message: string) => {
        setAlertModal({ isOpen: true, message })
    }, [])

    const systemConfirm = useCallback((message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmModal({
                isOpen: true,
                message,
                onConfirm: () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    resolve(true)
                },
                onCancel: () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    resolve(false)
                }
            })
        })
    }, [])

    return { alertModal, setAlertModal, confirmModal, systemAlert, systemConfirm }
}

// ---------------------- MODAIS DE ALERTA/CONFIRMAÇÃO (NOVOS) ----------------------

function SystemAlertModal({ message, onClose, theme }: { message: string, onClose: () => void, theme: ThemeType }) {
// Note que 'ThemeType' substitui 'typeof theme' para evitar o erro de referência cíclica.
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[9999] px-4">
            <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full border" style={{ borderColor: theme.primary }}>
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6" style={{ color: theme.primary }} />
                    <h3 className="text-lg font-bold" style={{ color: theme.primary }}>Aviso do Sistema</h3>
                </div>
                <p className="mb-6 text-gray-700">{message}</p>
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg font-semibold text-white transition hover:brightness-110" style={{ backgroundColor: theme.primary }}>
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    )
}

function SystemConfirmModal({ message, onConfirm, onCancel, theme }: { message: string, onConfirm: () => void, onCancel: () => void, theme: ThemeType }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[9999] px-4">
            <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full border" style={{ borderColor: theme.primary }}>
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6" style={{ color: theme.primary }} />
                    <h3 className="text-lg font-bold" style={{ color: theme.primary }}>Confirmação Necessária</h3>
                </div>
                <p className="mb-6 text-gray-700">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg font-semibold border transition hover:bg-gray-100" style={{ borderColor: theme.primary, color: theme.primary, backgroundColor: "#FFF" }}>
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-lg font-semibold text-white transition hover:brightness-110" style={{ backgroundColor: theme.secondary }}>
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    )
}


// ---------------------- MODAIS EXISTENTES ----------------------

type ModalServicosItemProps = {
    item: EspelhoLinha
    servicosDisponiveis: Servico[]
    onClose: () => void
    onSave: (servicosSelecionados: EspelhoServico[]) => void
}

function ModalServicosItem({ item, servicosDisponiveis, onClose, onSave }: ModalServicosItemProps) {
    const [selecionados, setSelecionados] = useState<EspelhoServico[]>(item.servicos || [])

    const toggleServico = (s: Servico) => {
        const exists = selecionados.find(sel => sel.servico.id === s.id)
        if (exists) {
            setSelecionados(prev => prev.filter(sel => sel.servico.id !== s.id))
        } else {
            setSelecionados(prev => [...prev, { servico: s, valorCalculado: s.preco }])
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
            <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
                <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primary }}>Editar Serviços</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {servicosDisponiveis
                        .filter(s => !normalize(s.nome).includes("espelho"))
                        .map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`servico-${s.id}`}
                                    checked={!!selecionados.find(sel => sel.servico.id === s.id)}
                                    onChange={() => toggleServico(s)}
                                    className="rounded text-green-500 focus:ring-green-500"
                                    style={{ color: theme.secondary }}
                                />
                                <label htmlFor={`servico-${s.id}`} className="flex-1 cursor-pointer">
                                    {s.nome} - {formatarPreco(s.preco)}
                                </label>
                            </div>
                        ))}
                </div>
                <div className="flex justify-between gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90">Cancelar</button>
                    <button onClick={() => onSave(selecionados)} className="flex-1 py-2 rounded-2xl font-semibold text-white transition hover:brightness-110" style={{ backgroundColor: theme.secondary }}>Salvar</button>
                </div>
            </div>
        </div>
    )
}

type ModalEditarItemProps = {
    item: EspelhoLinha
    vidros: Vidro[]
    onClose: () => void
    onSave: (dados: Omit<EspelhoLinha, "larguraCalc" | "alturaCalc" | "precoUnitarioM2" | "valorTotal">) => void
    systemAlert: (message: string) => void // Adicionado
}

function ModalEditarItem({ item, vidros, onClose, onSave, systemAlert }: ModalEditarItemProps) {
    const [dados, setDados] = useState<Omit<EspelhoLinha, "larguraCalc" | "alturaCalc" | "precoUnitarioM2" | "valorTotal">>({
        larguraOriginal: item.larguraOriginal,
        alturaOriginal: item.alturaOriginal,
        quantidade: item.quantidade,
        acabamento: item.acabamento,
        vidro_id: item.vidro_id,
        cliente: item.cliente ?? "",
        servicos: item.servicos ?? []
    })

    const handleSalvar = () => {
        if (isNaN(parseNumber(dados.larguraOriginal)) || isNaN(parseNumber(dados.alturaOriginal)) || !dados.vidro_id) {
            systemAlert("Preencha as medidas válidas e selecione o vidro.") // ALTERADO AQUI
            return
        }
        onSave(dados)
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
            <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
                <h2 className="text-xl font-semibold mb-6" style={{ color: theme.primary }}>Editar Item</h2>
                <div className="space-y-4">
                    <label className="block">Largura (mm):</label>
                    <input
                        type="text"
                        placeholder="Largura (mm)"
                        value={dados.larguraOriginal}
                        onChange={e => setDados(prev => ({ ...prev, larguraOriginal: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    />
                    <label className="block">Altura (mm):</label>
                    <input
                        type="text"
                        placeholder="Altura (mm)"
                        value={dados.alturaOriginal}
                        onChange={e => setDados(prev => ({ ...prev, alturaOriginal: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    />
                    <label className="block">Quantidade:</label>
                    <input
                        type="number"
                        min={1}
                        placeholder="Quantidade"
                        value={dados.quantidade}
                        onChange={e => setDados(prev => ({ ...prev, quantidade: Number(e.target.value) || 1 }))}
                        className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    />
                    <label className="block">Vidro:</label>
                    <select
                        value={dados.vidro_id}
                        onChange={e => setDados(prev => ({ ...prev, vidro_id: Number(e.target.value) }))}
                        className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    >
                        <option value={0}>Selecione o vidro</option>
                        {vidros.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""}
                            </option>
                        ))}
                    </select>
                    <label className="block">Acabamento:</label>
                    <select
                        value={dados.acabamento}
                        onChange={e => setDados(prev => ({ ...prev, acabamento: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    >
                        <option value="Nenhum">Nenhum</option>
                        <option value="Redondo Lapidado">Redondo Lapidado</option>
                        <option value="Redondo Bisote">Redondo Bisote</option>
                        <option value="Molde">Molde</option>
                    </select>
                </div>
                <div className="flex justify-between gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-semibold bg-gray-300 hover:opacity-90">Cancelar</button>
                    <button onClick={handleSalvar} className="flex-1 py-3 rounded-2xl font-semibold text-white transition hover:brightness-110" style={{ backgroundColor: theme.secondary }}>Salvar</button>
                </div>
            </div>
        </div>
    )
}


// ---------------------- MAIN APP ----------------------

export default function App() {
    const [vidros, setVidros] = useState<Vidro[]>([])
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [servicos, setServicos] = useState<Servico[]>([])
    const [precosClientes, setPrecosClientes] = useState<PrecoCliente[]>([])

    const [espelhos, setEspelhos] = useState<EspelhoLinha[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("orcamento_vidros")
            return saved ? JSON.parse(saved) : []
        }
        return []
    })

    const [novoEspelho, setNovoEspelho] = useState<Omit<EspelhoLinha, "larguraCalc" | "alturaCalc" | "precoUnitarioM2" | "valorTotal">>({
        larguraOriginal: "",
        alturaOriginal: "",
        quantidade: 1,
        acabamento: "Nenhum",
        vidro_id: 0,
        cliente: "",
        servicos: []
    })

    const [editIndex, setEditIndex] = useState<number | null>(null)
    const [showModalNovoOrcamento, setShowModalNovoOrcamento] = useState(false)
    const [showModalServicos, setShowModalServicos] = useState(false)
    const [servicosEditIndex, setServicosEditIndex] = useState<number | null>(null)
    const [showModalEditar, setShowModalEditar] = useState(false)

    const [inputVidro, setInputVidro] = useState("")
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [precoM2Selecionado, setPrecoM2Selecionado] = useState<number>(0)

    const larguraInputRef = useRef<HTMLInputElement>(null)

    // --- HOOK DO SISTEMA ---
    const { alertModal, setAlertModal, confirmModal, systemAlert, systemConfirm } = useSystemAlerts()

    // --- Funções de Carregamento de Dados (AGORA COM SUPABASE) ---
    const carregarDados = async () => {
        // 1. Carregar Vidros
        const { data: vidrosData, error: vidrosError } = await supabase.from("vidros").select("*").order("nome", { ascending: true })
        if (vidrosError) {
            console.error("Erro ao carregar vidros:", vidrosError)
        } else {
            const vidrosProcessados = (vidrosData as Vidro[])
                .filter(v => !normalize(v.nome).includes("espelho"))
                .map(v => ({
                    ...v,
                    preco: Number((v.preco ?? 0).toString().replace(",", ".")) || 0
                }))
            setVidros(vidrosProcessados || [])
        }

        // 2. Carregar Clientes
        const { data: clientesData, error: clientesError } = await supabase.from("clientes").select("*").order("nome", { ascending: true })
        if (clientesError) console.error("Erro ao carregar clientes:", clientesError)
        else setClientes((clientesData as Cliente[]) || [])

        // 3. Carregar Preços por Cliente
        const { data: precosData, error: precosError } = await supabase.from("vidro_precos_clientes").select("*")
        if (precosError) console.error("Erro ao carregar preços por cliente:", precosError)
        else setPrecosClientes((precosData as PrecoCliente[]) || [])

        // 4. Carregar Serviços (AGORA COM SUPABASE)
        const { data: servicosData, error: servicosError } = await supabase.from("servicos").select("*").order("nome", { ascending: true })

        if (servicosError) console.error("Erro ao carregar serviços:", servicosError)
        else setServicos((servicosData as Servico[]) || [])
    }

    useEffect(() => {
        carregarDados()
    }, [])

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("orcamento_vidros", JSON.stringify(espelhos))
        }
    }, [espelhos])

    // --- Funções de Ação (com lógica de preço ajustada) ---

    const excluirItem = async (index: number) => {
        const isConfirmed = await systemConfirm("Deseja realmente excluir este item?")
        if (isConfirmed) {
            setEspelhos(prev => prev.filter((_, i) => i !== index))
        }
    }

    const limparFormulario = () => {
        setNovoEspelho(prev => ({
            ...prev,
            larguraOriginal: "",
            alturaOriginal: "",
            quantidade: 1,
            acabamento: "Nenhum",
            servicos: []
        }))
    }

    const adicionarOuSalvar = () => {
        const larguraNum = parseNumber(novoEspelho.larguraOriginal)
        const alturaNum = parseNumber(novoEspelho.alturaOriginal)

        if (!novoEspelho.vidro_id || isNaN(larguraNum) || isNaN(alturaNum) || !novoEspelho.cliente) {
            systemAlert("Informe Largura, Altura, selecione um Vidro e um Cliente.")
            return
        }

        const larguraCalc = arredondar5cm(larguraNum)
        const alturaCalc = arredondar5cm(alturaNum)
        const vidro = vidros.find(v => v.id === novoEspelho.vidro_id)
        const clienteSelecionadoObj = clientes.find(c => c.nome === novoEspelho.cliente)

        // Busca preço especial (LÓGICA AJUSTADA)
        const precoCliente = precosClientes.find(
            p => p.cliente_id === clienteSelecionadoObj?.id && p.vidro_id === novoEspelho.vidro_id
        )?.preco

        const precoM2 = precoCliente ?? Number(vidro?.preco ?? precoM2Selecionado ?? 0)
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

        if (editIndex !== null) {
            setEspelhos(prev => {
                const novos = [...prev]
                novos[editIndex] = item
                return novos
            })
            setEditIndex(null)
        } else {
            setEspelhos(prev => [...prev, item])
        }

        limparFormulario()
        setTimeout(() => larguraInputRef.current?.focus(), 0)
    }

    const novoOrcamento = async () => {
        const isConfirmed = await systemConfirm("Deseja iniciar um novo orçamento? Todos os itens atuais serão perdidos.")
        if (isConfirmed) {
            setEspelhos([]);
            limparFormulario();
            setInputVidro("");
            setNovoEspelho(prev => ({ ...prev, cliente: "" }));
        }
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
            
            e.servicos = servicosSelecionados

            const valorUnit = calcularValorUnidade(e.larguraCalc, e.alturaCalc, e.precoUnitarioM2, e.acabamento)
            const totalServicos = e.servicos?.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0) || 0
            e.valorTotal = parseFloat(((valorUnit + totalServicos) * (e.quantidade || 1)).toFixed(2))

            return newEspelhos
        })
        setShowModalServicos(false)
        setServicosEditIndex(null)
    }

    const abrirModalEdicao = (index: number) => {
        setEditIndex(index)
        const item = espelhos[index]
        setNovoEspelho({
            larguraOriginal: item.larguraOriginal,
            alturaOriginal: item.alturaOriginal,
            quantidade: item.quantidade,
            acabamento: item.acabamento,
            vidro_id: item.vidro_id,
            cliente: item.cliente ?? "",
            servicos: item.servicos ?? []
        })
        const vidro = vidros.find(v => v.id === item.vidro_id);
        if (vidro) {
            setInputVidro(`${vidro.nome}${vidro.tipo ? ` (${vidro.tipo})` : ""}${vidro.espessura ? ` - ${vidro.espessura}` : ""}`);
        }
        setShowModalEditar(true);
    }

    // --- Função PDF (sem alterações) ---
    const gerarPDF = async () => {
        if (!espelhos.length) {
            systemAlert("Não há itens no orçamento para gerar o PDF.")
            return
        }

        const totalOrcamento = espelhos.reduce((acc, e) => acc + (e.valorTotal || 0), 0)

        const pdf = new jsPDF("p", "mm", "a4")
        const pageWidth = pdf.internal.pageSize.getWidth()
        const margin = 20

        // 🔹 Cabeçalho
        pdf.setFontSize(16)
        pdf.setTextColor(theme.primary)
        pdf.text("Orçamento de Vidros", margin, 20)

        const clienteNome = espelhos[0]?.cliente || "Não informado"
        pdf.setFontSize(12)
        pdf.text(`Cliente: ${clienteNome}`, margin, 30)

        pdf.setFontSize(10)
        pdf.text(`Data: ${new Date().toLocaleDateString()}`, margin, 36)

        // 🔹 Logo no canto superior direito
        try {
            const imgData = await fetch("/logo.png")
                .then((r) => r.blob())
                .then(
                    (blob) =>
                        new Promise<string>((resolve) => {
                            const reader = new FileReader()
                            reader.onload = () => resolve(reader.result as string)
                            reader.readAsDataURL(blob)
                        })
                )

            const logo = new Image()
            logo.src = imgData
            await new Promise((res) => (logo.onload = res))

            const logoHeight = 13
            const aspectRatio = logo.width / logo.height
            const logoWidth = logoHeight * aspectRatio

            pdf.addImage(imgData, "PNG", pageWidth - margin - logoWidth, 10, logoWidth, logoHeight)
        } catch {
            console.warn("Logo não carregada para o PDF.")
        }

        // 🔹 Tabela
        const body = espelhos.map((e) => {
            const vidro = vidros.find((v) => v.id === e.vidro_id)
            return [
                `${vidro?.nome || ""}${vidro?.tipo ? ` (${vidro.tipo})` : ""}${vidro?.espessura ? ` - ${vidro.espessura}` : ""}`,
                e.quantidade,
                e.larguraOriginal || e.larguraCalc,
                e.alturaOriginal || e.alturaCalc,
                formatarPreco(e.valorTotal),
            ]
        })

        autoTable(pdf, {
            head: [["Vidro", "Qtd", "Largura (mm)", "Altura (mm)", "Total"]],
            body,
            theme: "grid",
            headStyles: { fillColor: theme.primary, textColor: "#FFF", fontSize: 11 },
            bodyStyles: { fontSize: 11, textColor: theme.primary },
            margin: { left: margin, right: margin },
            styles: { cellPadding: 3 },
            startY: 45,
        })

        // 🔹 Total final
        const finalY = (pdf as any).lastAutoTable?.finalY || 30
        pdf.setFontSize(12)
        pdf.setTextColor(theme.primary)
        const totalTexto = `Total do orçamento: ${formatarPreco(totalOrcamento)}`
        pdf.text(totalTexto, pageWidth - margin - pdf.getTextWidth(totalTexto), finalY + 13)

        // 🔹 Salvar
        pdf.save("orcamento.pdf")
        systemAlert("PDF gerado e baixado com sucesso!")
    }

    const totalOrcamento = espelhos.reduce((acc, e) => acc + (e.valorTotal || 0), 0)

    const vidroSelecionado = vidros.find(v => v.id === novoEspelho.vidro_id);
    const vidroSelecionadoNome = vidroSelecionado
        ? `${vidroSelecionado.nome}${vidroSelecionado.tipo ? ` (${vidroSelecionado.tipo})` : ""}${vidroSelecionado.espessura ? ` - ${vidroSelecionado.espessura}` : ""}`
        : inputVidro;

    // --- RENDER ---
    return (
        <div className="min-h-screen p-4 sm:p-6 font-sans" style={{ backgroundColor: theme.background, color: theme.text }}>

            {/* Modal de Serviço (EXISTENTE) */}
            {showModalServicos && servicosEditIndex !== null && (
                <ModalServicosItem
                    item={espelhos[servicosEditIndex]}
                    servicosDisponiveis={servicos}
                    onClose={() => setShowModalServicos(false)}
                    onSave={salvarServicosItem}
                />
            )}

            {/* Modal de Edição de Item (EXISTENTE) */}
            {showModalEditar && editIndex !== null && (
                <ModalEditarItem
                    item={espelhos[editIndex]}
                    vidros={vidros}
                    onClose={() => setShowModalEditar(false)}
                    onSave={(dados) => {
                        // Lógica de recalculo e salvamento
                        setNovoEspelho(dados)
                        adicionarOuSalvar()
                        setShowModalEditar(false)
                    }}
                    systemAlert={systemAlert} // PASSANDO O NOVO HANDLER DE ALERTA CORRETAMENTE
                />
            )}

            {/* Modal de Alerta do Sistema (NOVO) */}
            {alertModal.isOpen && (
                <SystemAlertModal
                    message={alertModal.message}
                    onClose={() => setAlertModal({ isOpen: false, message: "" })}
                    theme={theme}
                />
            )}

            {/* Modal de Confirmação do Sistema (NOVO) */}
            {confirmModal.isOpen && (
                <SystemConfirmModal
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                    theme={theme}
                />
            )}


            {/* JSX PRINCIPAL (SEM ALTERAÇÕES VISUAIS) */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => (window.location.href = "/")}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold shadow hover:opacity-90 transition"
                        style={{ backgroundColor: theme.secondary, color: theme.primary }}
                    >
                        <Home className="w-5 h-5 text-white" />
                        <span className="hidden md:inline text-theme.primary">Home</span>
                    </button>
                    <h1 className="text-xl sm:text-2xl font-bold text-center">Cálculo de Vidros</h1>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button onClick={novoOrcamento} className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium shadow-md transition hover:bg-gray-100" style={{ color: theme.primary, border: "1px solid " + theme.primary, backgroundColor: "#FFF" }}>
                        Novo
                    </button>
                    <button onClick={gerarPDF} className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium shadow-md transition hover:bg-gray-100" style={{ color: theme.primary, border: "1px solid " + theme.primary, backgroundColor: "#FFF" }}>
                        Gerar PDF
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-1/3">
                    <label className="font-medium min-w-[70px]">Cliente:</label>
                    <select
                        value={novoEspelho.cliente || ""}
                        onChange={e => setNovoEspelho(prev => ({ ...prev, cliente: e.target.value }))}
                        disabled={espelhos.length > 0}
                        className="p-2 rounded-xl border w-full disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                        style={{ borderColor: theme.border }}
                    >
                        <option value="">Selecione</option>
                        {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-2/3 relative">
                    <label className="font-medium min-w-[70px]">Vidro:</label>
                    <input
                        type="text"
                        value={vidroSelecionadoNome}
                        onChange={e => {
                            setInputVidro(e.target.value);
                            setNovoEspelho(prev => ({ ...prev, vidro_id: 0 }));
                            setShowAutocomplete(true);
                        }}
                        placeholder="Digite para buscar vidro"
                        className="p-2 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                        style={{ borderColor: theme.border }}
                        onFocus={() => setShowAutocomplete(true)}
                        onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                    />
                    {showAutocomplete && (
                        <ul className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-xl mt-1 max-h-48 overflow-y-auto z-50 shadow-xl">
                            {vidros
                                .filter(v => matchesVidro(v, inputVidro))
                                .map(v => (
                                    <li
                                        key={v.id}
                                        className="p-3 hover:bg-gray-100 cursor-pointer text-sm transition"
                                        onMouseDown={() => {
                                            setNovoEspelho(prev => ({ ...prev, vidro_id: v.id }));
                                            setInputVidro(`${v.nome}${v.tipo ? ` (${v.tipo})` : ""}${v.espessura ? ` - ${v.espessura}` : ""}`);
                                            setShowAutocomplete(false);
                                            setPrecoM2Selecionado(Number(v.preco ?? 0));
                                        }}
                                    >
                                        {v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""}
                                    </li>
                                ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl shadow-inner border border-gray-200">
                <h3 className="text-lg font-semibold mb-3" style={{ color: theme.primary }}>Adicionar Item</h3>
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        placeholder="Largura (mm)"
                        ref={larguraInputRef}
                        value={novoEspelho.larguraOriginal}
                        onChange={(e) => setNovoEspelho((prev) => ({ ...prev, larguraOriginal: e.target.value, }))}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    />
                    <input
                        type="text"
                        placeholder="Altura (mm)"
                        value={novoEspelho.alturaOriginal}
                        onChange={(e) => setNovoEspelho((prev) => ({ ...prev, alturaOriginal: e.target.value, }))}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    />
                    <input
                        type="number"
                        placeholder="Qtd"
                        min={1}
                        value={novoEspelho.quantidade}
                        onChange={(e) => setNovoEspelho({ ...novoEspelho, quantidade: Number(e.target.value) || 1 })}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    />
                    <select
                        value={novoEspelho.acabamento}
                        onChange={(e) => setNovoEspelho((prev) => ({ ...prev, acabamento: e.target.value }))}
                        className="p-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                    >
                        <option value="Nenhum">Nenhum</option>
                        <option value="Redondo Lapidado">Redondo Lapidado</option>
                        <option value="Redondo Bisote">Redondo Bisote</option>
                        <option value="Molde">Molde</option>
                    </select>
                    <button
                        onClick={adicionarOuSalvar}
                        className="px-6 py-2 rounded-xl font-bold text-white shadow-md transition hover:brightness-110"
                        style={{ backgroundColor: editIndex !== null ? theme.primary : theme.secondary }}
                    >
                        {editIndex !== null ? "Salvar Edição" : "Adicionar"}
                    </button>
                    {editIndex !== null && (
                        <button
                            onClick={() => { setEditIndex(null); limparFormulario(); setInputVidro("") }}
                            className="px-4 py-2 rounded-xl font-bold text-gray-700 bg-white border border-gray-300 shadow-md transition hover:bg-gray-100"
                        >
                            Cancelar Edição
                        </button>
                    )}
                </div>
            </div>


            {/* TABELA DE ITENS (JÁ INCLUÍDA NA ETAPA 1) */}
            <div className="overflow-x-auto shadow rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
                        <tr>
                            <th className="p-3">Vidro</th>
                            <th className="p-3">Acabamento</th>
                            <th className="p-3">Qtd</th>
                            <th className="p-3">Lar/Alt (mm)</th>
                            <th className="p-3">Valor (m²)</th>
                            <th className="p-3">Serviços</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {espelhos.map((item, i) => {
                            const vidro = vidros.find(v => v.id === item.vidro_id)
                            return (
                                <tr key={i} className="border-b hover:bg-gray-50" style={{ borderColor: theme.border }}>
                                    <td className="p-3 text-sm font-medium">{vidro?.nome}{vidro?.tipo ? ` (${vidro.tipo})` : ""}{vidro?.espessura ? ` - ${vidro.espessura}` : ""}</td>
                                    <td className="p-3 text-sm">{item.acabamento}</td>
                                    <td className="p-3 text-sm">{item.quantidade}</td>
                                    <td className="p-3 text-sm">{item.larguraOriginal} x {item.alturaOriginal}</td>
                                    <td className="p-3 text-sm">{formatarPreco(item.precoUnitarioM2)}</td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => abrirModalServicosItem(i)} className="text-blue-500 hover:underline text-sm">
                                            {item.servicos && item.servicos.length > 0 ? `${item.servicos.length} Adic.` : "Adicionar"}
                                        </button>
                                    </td>
                                    <td className="p-3 font-semibold">{formatarPreco(item.valorTotal)}</td>
                                    <td className="p-3 flex gap-2">
                                        <button onClick={() => abrirModalEdicao(i)} className="p-1 rounded hover:bg-gray-100" title="Editar">
                                            <Edit2 className="w-4 h-4 text-blue-500" />
                                        </button>
                                        <button onClick={() => excluirItem(i)} className="p-1 rounded hover:bg-gray-100" title="Excluir">
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold border-t-2" style={{ borderColor: theme.primary }}>
                            <td className="p-3"></td>
                            <td className="p-3"></td>
                            <td className="p-3"></td>
                            <td className="p-3"></td>
                            <td className="p-3 text-right" colSpan={2} style={{ color: theme.primary }}>Total do Orçamento:</td>
                            <td className="p-3" style={{ color: theme.primary }}>{formatarPreco(totalOrcamento)}</td>
                            <td className="p-3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>


        </div>
    )
}