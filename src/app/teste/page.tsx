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
    // Permite vírgulas e pontos, removendo caracteres não-numéricos (exceto ponto/vírgula/sinal)
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

// ---------------------- HOOKS DO SISTEMA ----------------------

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

// ---------------------- MODAIS DE ALERTA/CONFIRMAÇÃO ----------------------

function SystemAlertModal({ message, onClose, theme }: { message: string, onClose: () => void, theme: ThemeType }) {
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


// ---------------------- MODAIS ----------------------

type ModalServicosItemProps = {
    item: EspelhoLinha
    servicosDisponiveis: Servico[]
    onClose: () => void
    onSave: (servicosSelecionados: EspelhoServico[]) => void
}

function ModalServicosItem({ item, servicosDisponiveis, onClose, onSave }: ModalServicosItemProps) {
    const [selecionados, setSelecionados] = useState<EspelhoServico[]>(item.servicos || [])
    const [medidaInputMap, setMedidaInputMap] = useState<Record<number, string>>(() => {
        const initialMap: Record<number, string> = {};
        // Inicializa o mapa com o valor numérico formatado para string com vírgula (se existir)
        (item.servicos || []).forEach(s => {
            if (s.servico.unidade === "metro_linear" && s.medidaLinear !== undefined) {
                // Formata o valor numérico (ex: 0.5) para a string de exibição (ex: "0,5")
                initialMap[s.servico.id] = s.medidaLinear.toString().replace('.', ',');
            }
        });
        return initialMap;
    });

    // 1. Calcula o perímetro em metros para usar como sugestão (2 * (L + A) / 1000)
    const largura = parseNumber(item.larguraOriginal)
    const altura = parseNumber(item.alturaOriginal)
    const quantidade = item.quantidade || 1

    // Perímetro em metros: P = 2 * (L + A) / 1000. Usa 0 se medidas inválidas.
    const defaultLinearMeasure = (isNaN(largura) || isNaN(altura)) ? 0 : parseFloat((2 * (largura + altura) / 1000).toFixed(2));

    // 2. Função centralizada para calcular o valor do serviço
    const calculateServiceValue = (s: Servico, medida?: number) => {
        let valorCalculado = 0;
        // Se a medida for 0 ou NaN, usa 0 no cálculo, permitindo valores fracionários ou zero
        let medidaUsada = medida !== undefined && !isNaN(medida) ? medida : 0; 

        if (s.unidade === "metro_linear") {
            // Se for linear, o valor é Preço * Medida Linear * Quantidade
            valorCalculado = (s.preco * medidaUsada) * quantidade;
        } else if (s.unidade === "m²") {
            // Se for m², o valor é Preço * Área Calculada * Quantidade
            const areaM2 = (item.larguraCalc * item.alturaCalc) / 1000000;
            valorCalculado = (s.preco * areaM2) * quantidade;
        } else { // "unitário"
            // Se for unitário, o valor é Preço * Quantidade
            valorCalculado = s.preco * quantidade;
        }
        return parseFloat(valorCalculado.toFixed(2));
    }

    const toggleServico = (s: Servico) => {
        // ... (lógica de toggle mantida)
        const exists = selecionados.find(sel => sel.servico.id === s.id)
        if (exists) {
            setSelecionados(prev => prev.filter(sel => sel.servico.id !== s.id))
        } else {
            const initialMeasure = s.unidade === "metro_linear" 
                ? (item.servicos?.find(sel => sel.servico.id === s.id)?.medidaLinear ?? defaultLinearMeasure)
                : undefined;
            
            const initialValue = calculateServiceValue(s, initialMeasure);

            setSelecionados(prev => [...prev, {
                servico: s, 
                valorCalculado: initialValue,
                medidaLinear: initialMeasure 
            }])
        }
    }
    
    /// 3. Manipulador de Mudança para o Campo de Medida Linear (CORRIGIDO)
        const handleMedidaChange = (servicoId: number, medidaStr: string) => {
        // 1. Atualiza o estado da string de entrada (MedidaInputMap)
        setMedidaInputMap(prev => ({
            ...prev,
            [servicoId]: medidaStr, // Salva a string exata digitada ("0,", "5", "5,5")
        }));

        // 2. Tenta parsear para o cálculo: Troca vírgula por ponto. Permite string vazia.
        const cleanedStr = medidaStr.replace(',', '.');
        // Se for string vazia, usa 0. Senão, tenta parsear.
        const medidaNum = cleanedStr === '' ? 0 : parseNumber(cleanedStr);
        
        // Usa o valor numérico (medidaNum) para o cálculo
        const medidaParaEstado = isNaN(medidaNum) ? 0 : medidaNum;

        setSelecionados(prev => prev.map(sel => {
            if (sel.servico.id === servicoId) {
                const novoValor = calculateServiceValue(sel.servico, medidaParaEstado);
                return { 
                    ...sel, 
                    medidaLinear: medidaParaEstado, // Salva o valor numérico (ex: 0.5)
                    valorCalculado: novoValor 
                };
            }
            return sel;
        }));
    }

    // Função para obter o valor formatado para o input (COM VÍRGULA) (CORRIGIDO)
    const getMedidaDisplayValue = (currentSelection: EspelhoServico) => {
        // Usa o valor numérico salvo (medidaLinear)
        const valorNumerico = currentSelection.medidaLinear !== undefined 
            ? currentSelection.medidaLinear
            : defaultLinearMeasure;

        // Se for zero, retorna uma string vazia para melhor UX, senão formata com vírgula.
       if (valorNumerico === 0) {
            return ''; // <--- Isso limpa o input quando o valor é 0
        }

        // Converte o número de volta para string, garantindo que use a vírgula para exibição
        // ToFixed(2) ajuda a formatar, mas não é obrigatório aqui
        return valorNumerico.toString().replace('.', ',');
    }


    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
            <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
                <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primary }}>Editar Serviços</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {servicosDisponiveis
                        .filter(s => !normalize(s.nome).includes("espelho"))
                        .map(s => {
                            const isSelected = !!selecionados.find(sel => sel.servico.id === s.id)
                            const currentSelection = selecionados.find(sel => sel.servico.id === s.id)
                            
                            // Determina o valor a ser exibido no input

                            return (
                                <div key={s.id} className="flex flex-col border p-2 rounded-lg" style={{ borderColor: isSelected ? theme.secondary : theme.border }}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`servico-${s.id}`}
                                            checked={isSelected}
                                            onChange={() => toggleServico(s)}
                                            className="rounded text-green-500 focus:ring-green-500"
                                            style={{ color: theme.secondary }}
                                        />
                                        <label htmlFor={`servico-${s.id}`} className="flex-1 cursor-pointer font-medium">
                                            {s.nome} - {formatarPreco(s.preco)}/{s.unidade.replace('_', ' ')}
                                        </label>
                                    </div>

                                    {/* 4. CAMPO DE INPUT PARA MEDIDA LINEAR */}
                                    {isSelected && s.unidade === "metro_linear" && currentSelection && (
                                        <div className="mt-2 pl-6">
                                            <label className="block text-sm mb-1 text-gray-600">Metros Lineares (m):</label>
                                            <input
                                                type="text"
                                                placeholder={`Sugestão: ${defaultLinearMeasure.toFixed(2).replace('.', ',')}`}
                                                value={medidaInputMap[s.id] || ''} // Se não existir, usa string vazia
                                                onChange={(e) => handleMedidaChange(s.id, e.target.value)}
                                                className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                                            />
                                            <div className="text-xs mt-1 text-right" style={{ color: theme.primary }}>
                                                Valor Calculado: {formatarPreco(currentSelection.valorCalculado)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
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
    systemAlert: (message: string) => void
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
        // CORREÇÃO: Os dados no estado 'dados' incluem o novo 'acabamento'
        if (isNaN(parseNumber(dados.larguraOriginal)) || isNaN(parseNumber(dados.alturaOriginal)) || !dados.vidro_id) {
            systemAlert("Preencha as medidas válidas e selecione o vidro.")
            return
        }
        // Ao chamar onSave, o estado 'dados' é o que contém o acabamento atualizado
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
                        // CORREÇÃO: Atualiza o estado 'dados' com o novo acabamento
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
    // ... (Estados e useEffects de carregamento de dados omitidos para brevidade, mas devem ser mantidos)

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
    const [showModalServicos, setShowModalServicos] = useState(false)
    const [servicosEditIndex, setServicosEditIndex] = useState<number | null>(null)
    const [showModalEditar, setShowModalEditar] = useState(false)

    const [inputVidro, setInputVidro] = useState("")
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [precoM2Selecionado, setPrecoM2Selecionado] = useState<number>(0)

    const larguraInputRef = useRef<HTMLInputElement>(null)

    const { alertModal, setAlertModal, confirmModal, systemAlert, systemConfirm } = useSystemAlerts()

    // --- Funções de Carregamento de Dados (AGORA COM SUPABASE) ---
    const carregarDados = async () => {
        // ... (Implementação de carregamento de dados mantida)
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

        const { data: clientesData, error: clientesError } = await supabase.from("clientes").select("*").order("nome", { ascending: true })
        if (clientesError) console.error("Erro ao carregar clientes:", clientesError)
        else setClientes((clientesData as Cliente[]) || [])

        const { data: precosData, error: precosError } = await supabase.from("vidro_precos_clientes").select("*")
        if (precosError) console.error("Erro ao carregar preços por cliente:", precosError)
        else setPrecosClientes((precosData as PrecoCliente[]) || [])

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

    // --- LÓGICA REUTILIZÁVEL E CORRIGIDA PARA ACABAMENTO ---
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
    
    // NOVO: Função centralizada para calcular e salvar/adicionar um item
    const processarESalvarItem = (dadosItem: Omit<EspelhoLinha, "larguraCalc" | "alturaCalc" | "precoUnitarioM2" | "valorTotal">, indexParaEditar: number | null) => {
        const larguraNum = parseNumber(dadosItem.larguraOriginal)
        const alturaNum = parseNumber(dadosItem.alturaOriginal)

        // Validação básica
        if (!dadosItem.vidro_id || isNaN(larguraNum) || isNaN(alturaNum) || !dadosItem.cliente) {
            systemAlert("Informe Largura, Altura, selecione um Vidro e um Cliente.")
            return
        }

        const larguraCalc = arredondar5cm(larguraNum)
        const alturaCalc = arredondar5cm(alturaNum)
        const vidro = vidros.find(v => v.id === dadosItem.vidro_id)
        const clienteSelecionadoObj = clientes.find(c => c.nome === dadosItem.cliente)

        // Busca preço
        const precoCliente = precosClientes.find(
            p => p.cliente_id === clienteSelecionadoObj?.id && p.vidro_id === dadosItem.vidro_id
        )?.preco

        const precoM2 = precoCliente ?? Number(vidro?.preco ?? precoM2Selecionado ?? 0)
        
        // CÁLCULO: Usa o acabamento de 'dadosItem'
        const valorUnit = calcularValorUnidade(larguraCalc, alturaCalc, precoM2, dadosItem.acabamento) 
        const totalServicos = dadosItem.servicos?.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0) || 0
        const valorTotal = parseFloat(((valorUnit + totalServicos) * (dadosItem.quantidade || 1)).toFixed(2))

        const item: EspelhoLinha = {
            ...dadosItem,
            larguraCalc,
            alturaCalc,
            precoUnitarioM2: precoM2,
            valorTotal
        }

        if (indexParaEditar !== null) {
            // Modo Edição
            setEspelhos(prev => {
                const novos = [...prev]
                novos[indexParaEditar] = item
                return novos
            })
            setEditIndex(null) 
        } else {
            // Modo Adição
            setEspelhos(prev => [...prev, item])
            limparFormulario()
            setTimeout(() => larguraInputRef.current?.focus(), 0)
        }
    }

    // Função para adicionar um novo item (usa o estado 'novoEspelho')
    const adicionarItem = () => {
        processarESalvarItem(novoEspelho, null);
    }

    // Função chamada pelo ModalEditarItem para salvar a edição
    const salvarEdicao = (dadosEditados: Omit<EspelhoLinha, "larguraCalc" | "alturaCalc" | "precoUnitarioM2" | "valorTotal">) => {
        if (editIndex !== null) {
            // Usa o 'editIndex' salvo e os 'dadosEditados' recebidos
            processarESalvarItem(dadosEditados, editIndex); 
        }
        setShowModalEditar(false);
    }
    
    // ----------------------------------------------------------------------
    
    const excluirItem = async (index: number) => {
        const isConfirmed = await systemConfirm("Deseja realmente excluir este item?")
        if (isConfirmed) {
            setEspelhos(prev => prev.filter((_, i) => i !== index))
        }
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

            // Recalcula o valor total com os novos serviços
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
        // Prepara o estado 'novoEspelho' apenas para preencher os campos do formulário
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

    // --- Função PDF (Com correção de alinhamento e largura) ---
    const gerarPDF = async () => {
        if (!espelhos.length) {
            systemAlert("Não há itens no orçamento para gerar o PDF.")
            return
        }

        const totalOrcamento = espelhos.reduce((acc, e) => acc + (e.valorTotal || 0), 0)

        const pdf = new jsPDF("p", "mm", "a4")
        const pageWidth = pdf.internal.pageSize.getWidth()
        const margin = 10 
        const usableWidth = pageWidth - (2 * margin) 

        // 🔹 Cabeçalho
        pdf.setFontSize(16)
        pdf.setTextColor(theme.primary)
        pdf.text("Orçamento de Vidros", margin, 20)

        const clienteNome = espelhos[0]?.cliente || "Não informado"
        pdf.setFontSize(12)
        pdf.text(`Cliente: ${clienteNome}`, margin, 30)

        pdf.setFontSize(10)
        pdf.text(`Data: ${new Date().toLocaleDateString()}`, margin, 36)

        // 🔹 Logo (mantido)
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

        // 🔹 Tabela - Preparação dos Dados
        const body = espelhos.map((e) => {
            const vidro = vidros.find((v) => v.id === e.vidro_id)
            
            const servicosTexto = e.servicos && e.servicos.length > 0
                ? e.servicos.map(s => `${s.servico.nome}`).join(", ")
                : "" 
            
            const acabamentoTexto = e.acabamento && e.acabamento !== "Nenhum"
                ? e.acabamento
                : "" 

            return [
                `${vidro?.nome || ""}${vidro?.tipo ? ` (${vidro.tipo})` : ""}${vidro?.espessura ? ` - ${vidro.espessura}` : ""}`,
                e.quantidade,
                e.larguraOriginal || e.larguraCalc,
                e.alturaOriginal || e.alturaCalc,
                acabamentoTexto, 
                servicosTexto, 
                formatarPreco(e.valorTotal),
            ]
        })

        // Distribuição de Largura (Total: 100%)
        const widthMap = {
            vidro: usableWidth * 0.30,      
            qtd: usableWidth * 0.08,        
            medidas: usableWidth * 0.10,    
            acabamento: usableWidth * 0.14, 
            servicos: usableWidth * 0.14,   
            total: usableWidth * 0.14,      
        }

        autoTable(pdf, {
            head: [["Vidro", "Qtd", "L (mm)", "A (mm)", "Acabamento", "Serviços", "Total"]],
            body,
            theme: "grid",
            // CENTRALIZAÇÃO VERTICAL E HORIZONTAL DO CABEÇALHO
            headStyles: { 
                fillColor: theme.primary, 
                textColor: "#FFF", 
                fontSize: 10, 
                valign: 'middle',
                halign: 'center' 
            },
            // CENTRALIZAÇÃO VERTICAL DO CORPO
            bodyStyles: { 
                fontSize: 9.5, 
                textColor: theme.primary, 
                valign: 'middle' 
            }, 
            margin: { left: margin, right: margin },
            styles: { cellPadding: 2.5, overflow: 'linebreak' as any, cellWidth: 'wrap' as any },
            columnStyles: { 
                // CENTRALIZAÇÃO HORIZONTAL DE TODAS AS COLUNAS
                0: { cellWidth: widthMap.vidro, halign: 'center' },          
                1: { cellWidth: widthMap.qtd, halign: 'center' },            
                2: { cellWidth: widthMap.medidas, halign: 'center' },         
                3: { cellWidth: widthMap.medidas, halign: 'center' },         
                4: { cellWidth: widthMap.acabamento, halign: 'center' },     
                5: { cellWidth: widthMap.servicos, halign: 'center' },       
                6: { cellWidth: widthMap.total, halign: 'center' },          
            },
            startY: 45,
        })

        // 🔹 Total final
        const finalY = (pdf as any).lastAutoTable?.finalY || 30
        pdf.setFontSize(12)
        pdf.setTextColor(theme.primary)
        const totalTexto = `Total do orçamento: ${formatarPreco(totalOrcamento)}`
        
        pdf.text(totalTexto, pageWidth - margin - pdf.getTextWidth(totalTexto), finalY + 10)

        // 🔹 Salvar
        pdf.save("orcamento.pdf")
        systemAlert("PDF gerado e baixado com sucesso! 🎉")
    }

    const totalOrcamento = espelhos.reduce((acc, e) => acc + (e.valorTotal || 0), 0)

    const vidroSelecionado = vidros.find(v => v.id === novoEspelho.vidro_id);
    const vidroSelecionadoNome = vidroSelecionado
        ? `${vidroSelecionado.nome}${vidroSelecionado.tipo ? ` (${vidroSelecionado.tipo})` : ""}${vidroSelecionado.espessura ? ` - ${vidroSelecionado.espessura}` : ""}`
        : inputVidro;


    const [inputCliente, setInputCliente] = useState("")
    const [showClienteAutocomplete, setShowClienteAutocomplete] = useState(false)

    // --- RENDER ---
    return (
        <div className="min-h-screen p-4 sm:p-6 font-sans" style={{ backgroundColor: theme.background, color: theme.text }}>

            {/* Modal de Serviço */}
            {showModalServicos && servicosEditIndex !== null && (
                <ModalServicosItem
                    item={espelhos[servicosEditIndex]}
                    servicosDisponiveis={servicos}
                    onClose={() => setShowModalServicos(false)}
                    onSave={salvarServicosItem}
                />
            )}

            {/* Modal de Edição de Item */}
            {showModalEditar && editIndex !== null && (
                <ModalEditarItem
                    item={espelhos[editIndex]}
                    vidros={vidros}
                    onClose={() => setShowModalEditar(false)}
                    onSave={salvarEdicao} // CHAMADA CORRIGIDA: Envia os dados editados diretamente para a função de salvamento
                    systemAlert={systemAlert}
                />
            )}

            {/* Modal de Alerta/Confirmação (mantido) */}
            {alertModal.isOpen && (
                <SystemAlertModal
                    message={alertModal.message}
                    onClose={() => setAlertModal({ isOpen: false, message: "" })}
                    theme={theme}
                />
            )}
            {confirmModal.isOpen && (
                <SystemConfirmModal
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                    theme={theme}
                />
            )}


            {/* JSX PRINCIPAL (mantido) */}
            <div className="flex justify-between items-center mb-4">
                {/* ... (Botão Home e Título) */}
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
                {/* ... (Seleção de Cliente e Vidro) */}
                <div className="relative w-full">
                    <input
                        type="text"
                        value={novoEspelho.cliente || inputCliente}
                        placeholder="Digite o nome do cliente"
                        disabled={espelhos.length > 0}
                        onChange={e => {
                        setInputCliente(e.target.value)
                        setNovoEspelho(prev => ({ ...prev, cliente: "" }))
                        setShowClienteAutocomplete(true)
                        }}
                        onFocus={() => setShowClienteAutocomplete(true)}
                        onBlur={() => setTimeout(() => setShowClienteAutocomplete(false), 150)}
                        className="p-2 rounded-xl border w-full disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                        style={{ borderColor: theme.border }}
                    />

                    {showClienteAutocomplete && (
                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {clientes
                            .filter(c =>
                            normalize(c.nome).includes(normalize(inputCliente))
                            )
                            .slice(0, 10)
                            .map(c => (
                            <li
                                key={c.id}
                                className="p-2 cursor-pointer hover:bg-gray-100"
                                onMouseDown={() => {
                                setNovoEspelho(prev => ({ ...prev, cliente: c.nome }))
                                setInputCliente(c.nome)
                                setShowClienteAutocomplete(false)
                                }}
                            >
                                {c.nome}
                            </li>
                            ))}
                        </ul>
                    )}
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
                        <ul className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                            {vidros
                                .filter(v => matchesVidro(v, inputVidro))
                                .slice(0, 10)
                                .map(v => (
                                    <li
                                        key={v.id}
                                        className="p-2 cursor-pointer hover:bg-gray-100"
                                        onMouseDown={() => {
                                            setInputVidro(`${v.nome}${v.tipo ? ` (${v.tipo})` : ""}${v.espessura ? ` - ${v.espessura}` : ""}`);
                                            setNovoEspelho(prev => ({ ...prev, vidro_id: v.id }));
                                            setPrecoM2Selecionado(v.preco);
                                            setShowAutocomplete(false);
                                        }}
                                    >
                                        {v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""} ({formatarPreco(v.preco)}/m²)
                                    </li>
                                ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* FORMULÁRIO DE ADIÇÃO (mantido) */}
            <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primary }}>Adicionar Item</h2>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                    <input
                        ref={larguraInputRef}
                        type="text"
                        maxLength={4} // 🔹 impede mais que 4 dígitos
                        placeholder="Largura (mm)"
                        value={novoEspelho.larguraOriginal}
                        onChange={e => setNovoEspelho(prev => ({ ...prev, larguraOriginal: e.target.value }))}
                        className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                        style={{ borderColor: theme.border }}
                    />
                    <input
                        type="text"
                        maxLength={4} // 🔹 impede mais que 4 dígitos
                        placeholder="Altura (mm)"
                        value={novoEspelho.alturaOriginal}
                        onChange={e => setNovoEspelho(prev => ({ ...prev, alturaOriginal: e.target.value }))}
                        className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                        style={{ borderColor: theme.border }}
                    />
                    <input
                        type="number"
                        min={1}
                        placeholder="Qtd"
                        value={novoEspelho.quantidade}
                        onChange={e => setNovoEspelho(prev => ({ ...prev, quantidade: Number(e.target.value) || 1 }))}
                        className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                        style={{ borderColor: theme.border }}
                    />
                    <select
                        value={novoEspelho.acabamento}
                        onChange={e => setNovoEspelho(prev => ({ ...prev, acabamento: e.target.value }))}
                        className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                        style={{ borderColor: theme.border }}
                    >
                        <option value="Nenhum">Nenhum</option>
                        <option value="Redondo Lapidado">Redondo Lapidado</option>
                        <option value="Redondo Bisote">Redondo Bisote</option>
                        <option value="Molde">Molde</option>
                    </select>
                    <button
                        onClick={limparFormulario}
                        className="py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
                    >
                        Limpar
                    </button>
                    <button
                        onClick={adicionarItem} // CHAMADA CORRIGIDA: Usa a nova função de adição
                        className="py-3 rounded-xl font-semibold text-white transition hover:brightness-110"
                        style={{ backgroundColor: theme.primary }}
                    >
                        Adicionar
                    </button>
                </div>
            </div>

            {/* TABELA DE ITENS (mantido) */}
            <h2 className="text-xl font-bold mb-3" style={{ color: theme.primary }}>Itens do Orçamento ({espelhos.length})</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
                        <tr>
                            <th className="p-3">Vidro/Acab.</th>
                            <th className="p-3">Med. Original (mm)</th>
                            <th className="p-3">Qtd</th>
                            <th className="p-3">Serviços</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {espelhos.map((e, index) => {
                            const vidro = vidros.find(v => v.id === e.vidro_id)
                            const totalServicos = e.servicos?.reduce((acc, s) => acc + (s.valorCalculado ?? 0), 0) || 0

                            return (
                                <tr key={index} className="border-b" style={{ borderColor: theme.border }}>
                                    <td className="p-3 text-sm">
                                        <span className="font-semibold block">{vidro?.nome}</span>
                                        <span className="text-xs italic" style={{ color: theme.secondary }}>
                                            {e.acabamento !== "Nenhum" ? e.acabamento : "Corte Reto"}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm">{e.larguraOriginal}x{e.alturaOriginal}</td>
                                    <td className="p-3 text-sm">{e.quantidade}</td>
                                    <td className="p-3 text-sm">
                                        {e.servicos?.length ? (
                                            <ul className="text-xs list-disc list-inside">
                                                {e.servicos.map(s => (
                                                    <li key={s.servico.id}>{s.servico.nome}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-gray-500 italic text-xs">Nenhum</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm font-bold text-right">
                                        {formatarPreco(e.valorTotal)}
                                        <span className="block text-xs text-gray-500 font-normal">
                                            ({formatarPreco(e.valorTotal - totalServicos)}) + ({formatarPreco(totalServicos)})
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => abrirModalEdicao(index)} title="Editar Item" className="p-2 rounded-full hover:bg-gray-100 transition">
                                                <Edit2 className="w-5 h-5" style={{ color: theme.primary }} />
                                            </button>
                                            <button onClick={() => abrirModalServicosItem(index)} title="Editar Serviços" className="p-2 rounded-full hover:bg-gray-100 transition">
                                                <CheckCircle className="w-5 h-5" style={{ color: theme.secondary }} />
                                            </button>
                                            <button onClick={() => excluirItem(index)} title="Excluir Item" className="p-2 rounded-full hover:bg-red-50 transition">
                                                <Trash2 className="w-5 h-5 text-red-500" />
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

            {/* TOTAL FINAL (mantido) */}
            <div className="text-right p-4 rounded-xl shadow-lg mt-4 font-bold bg-white" style={{ color: theme.primary, border: `1px solid ${theme.secondary}` }}>
                <span className="text-lg">Total Geral: {formatarPreco(totalOrcamento)}</span>
            </div>
        </div>
    )
}
