"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Home, Edit2, Trash2, X, CheckCircle, AlertTriangle,UserPlus, AlertOctagon } from "lucide-react" 
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { text } from "stream/consumers"

// --- TIPAGENS ---

type Vidro = { id: number; nome: string; tipo?: string; espessura?: string; preco: number | string }
type Cliente = { id: number; nome: string }

// 🎯 NOVO: Tipagem para a tabela de preços personalizados
type PrecoPersonalizado = { 
    vidro_id: number; 
    cliente_id: string; 
    preco: number; 
} 

type VidroLinha = { 
    larguraOriginal: string; 
    alturaOriginal: string; 
    larguraCalc: number; 
    alturaCalc: number;  
    quantidade: number; 
    vidro_id: number; 
    valorTotal: number; 
    cliente?: string
}

type NaoEncontradoRaw = { rawLarg: string; rawAlt: string; rawQtd: string; linha: number }
type VidroParaAssociar = { nomePlanilha: string; itens: NaoEncontradoRaw[] }
type NovoVidroInput = Omit<VidroLinha, "larguraCalc" | "alturaCalc" | "valorTotal"> & {
    cliente_id: number;
}

type ToastType = 'success' | 'error' | 'warning';
type Toast = { message: string; type: ToastType };
type ConfirmAction = () => void;
type CancelAction = () => void;
type ConfirmModalState = {
    isOpen: boolean;
    message: string;
    onConfirm: ConfirmAction;
    onCancel: CancelAction;
};


const theme = {
    primary: "#1C415B",
    secondary: "#92D050",
    text: "#1C415B",
    background: "#FDFDFD",
    border: "#F2F2F2",
    cardBg: "#FFFFFF",
}

const ToastNotification = ({ message, type, onClose }: { message: string, type: ToastType, onClose: () => void }) => {
    // ... (código do ToastNotification)
    const style = {
        success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500', icon: CheckCircle },
        error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500', icon: X },
        warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500', icon: AlertTriangle },
    }[type];

    const Icon = style.icon;

    useEffect(() => {
        const timer = setTimeout(onClose, 800);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-lg shadow-xl flex items-center space-x-3 border-l-4 ${style.bg} ${style.text} ${style.border}`}>
            <Icon className="w-6 h-6 flex-shrink-0" />
            <p className="font-medium text-sm">{message}</p>
            <button onClick={onClose} className={`ml-4 ${style.text} hover:opacity-75`}>
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const ConfirmModal = ({ state, onClose }: { state: ConfirmModalState, onClose: () => void }) => {
    if (!state.isOpen) return null;

    const handleConfirm = () => {
        state.onConfirm();
        onClose();
    };

    const handleCancel = () => {
        state.onCancel();
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[100]">
            <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full" style={{ borderColor: theme.border }}>
                <div className="flex items-center space-x-3 border-b pb-3 mb-4" style={{ borderColor: theme.border }}>
                    <AlertOctagon className="w-6 h-6 flex-shrink-0 text-yellow-600" />
                    <h2 className="text-lg font-bold" style={{ color: theme.primary }}>Confirmação Necessária</h2>
                </div>
                
                <p className="mb-6">{state.message}</p>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={handleCancel}
                        className="px-4 py-2 rounded font-medium border text-gray-700 hover:bg-gray-100"
                        style={{ borderColor: theme.border }}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded font-bold text-white hover:opacity-90 transition" 
                        style={{ backgroundColor: theme.primary }}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function VidrosPage() {
    const [vidros, setVidros] = useState<Vidro[]>([])
    const [clientes, setClientes] = useState<Cliente[]>([])
    
    // 🎯 NOVO ESTADO: Preços personalizados do Supabase (para cache local)
    const [precosPersonalizados, setPrecosPersonalizados] = useState<PrecoPersonalizado[]>([]);

    const [modalClienteAberto, setModalClienteAberto] = useState(false);
  

    const [novoVidro, setNovoVidro] = useState<NovoVidroInput>({
        larguraOriginal: "",
        alturaOriginal: "",
        quantidade: 1,
        vidro_id: 0,
        cliente: "",
        cliente_id: 0, 
    })
    
    const [vidrosLista, setVidrosLista] = useState<VidroLinha[]>([])
  
    const [toastMessage, setToastMessage] = useState<Toast | null>(null);
    const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>({
        isOpen: false,
        message: "",
        onConfirm: () => {},
        onCancel: () => {},
    });
    const [itensSelecionados, setItensSelecionados] = useState<number[]>([]); 
    const [trocaModal, setTrocaModal] = useState<{
        isOpen: boolean;
        novoVidroId: number;
    }>({ isOpen: false, novoVidroId: 0 });

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToastMessage({ message, type });
    }, []);

    const [naoEncontradosModal, setNaoEncontradosModal] = useState<{
        grupos: VidroParaAssociar[];
        itensValidos: VidroLinha[];
        cliente: string; 
    } | null>(null)
    const [vidroSelecionadoModal, setVidroSelecionadoModal] = useState<number>(0)
    const [grupoAtualIndex, setGrupoAtualIndex] = useState(0)

    const [editIndex, setEditIndex] = useState<number | null>(null)
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [inputVidro, setInputVidro] = useState("")
    const larguraInputRef = useRef<HTMLInputElement>(null)
    const alturaInputRef = useRef<HTMLInputElement>(null);
    const qtdInputRef = useRef<HTMLInputElement>(null);

    // ---------------------------------------------------------------------------------------------------------
    // FUNÇÕES DE UTILIDADE E CÁLCULO
    // ---------------------------------------------------------------------------------------------------------
    
    const customConfirm = (message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmModalState({
                isOpen: true,
                message: message,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
        });
    };
    
    const parseNumber = (s: string) => { 
        if (!s) return NaN; 
        const cleaned = s.replace(/[^0-9.,]/g, "").replace(",", ".")
        return parseFloat(cleaned)
    }
    const arredondar5cm = (valorMM: number) => Math.ceil(valorMM / 50) * 50
    const calcularValorUnidade = (larguraCalcMM: number, alturaCalcMM: number, precoM2: number) => {
        const areaM2 = (larguraCalcMM * alturaCalcMM) / 1000000
        return parseFloat((areaM2 * precoM2).toFixed(2))
    }

    // 🎯 CORRIGIDO: Agora consulta o cache local de preços personalizados
    const getVidroPriceForClient = useCallback((vidroId: number, clienteId: number): number => {
        const clienteUUID = clientes.find(c => c.id === clienteId)?.id.toString();

        // 1. Tenta encontrar o preço na tabela de preços personalizados (cache local)
        if (clienteUUID) {
            const precoPersonalizado = precosPersonalizados.find(p => 
                p.vidro_id === vidroId && p.cliente_id === clienteUUID
            );
            
            if (precoPersonalizado) {
                return Number(precoPersonalizado.preco);
            }
        }
        
        // 2. Se não encontrar, usa o preço padrão do cadastro de vidros
        const vidro = vidros.find(v => v.id === vidroId);
        return Number(vidro?.preco ?? 0);
    }, [vidros, precosPersonalizados, clientes]);


    const normalize = (s?: string) => (s ?? "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase()
    
    const matchesVidro = (v: Vidro, termo: string) => {
        // ... (Mantida a lógica de match)
        const normalizeMatch = (s?: string) =>
        (s ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[^a-z0-9\+]/g, " ")   
            .replace(/\s+/g, " ")           
            .trim();

        const planilha = normalizeMatch(termo);
        const nomeVidro = normalizeMatch(v.nome);

        const palavras = planilha.split(" ").filter(p => p !== "");
        return palavras.every(p => nomeVidro.includes(p));
    };

    const encontrarVidroMelhorado = (nomeVidroRaw: string): Vidro | undefined => {
        // ... (Mantida a lógica de encontrar vidro)
        const nVid = normalize(nomeVidroRaw)

        let vidro = vidros.find(v => {
            const nome = normalize(v.nome)
            const tipo = normalize(v.tipo ?? "")
            const esp = normalize(v.espessura ?? "")
            return nVid.includes(nome) && nVid.includes(tipo) && nVid.includes(esp)
        })
        if (vidro) return vidro

        vidro = vidros.find(v => {
            const nome = normalize(v.nome)
            const esp = normalize(v.espessura ?? "")
            return nVid.includes(nome) && nVid.includes(esp)
        })
        if (vidro) return vidro

        return vidros.find(v => matchesVidro(v, nVid))
    }

    const carregarVidros = async () => {
        const { data, error } = await supabase.from("vidros").select("*").order("nome")
        if (error) console.error("Erro ao carregar vidros:", error)
        else setVidros(data as Vidro[])
    }

    const carregarClientes = async () => {
        const { data, error } = await supabase.from("clientes").select("id, nome").order("nome")
        if (error) console.error("Erro ao carregar clientes:", error)
        else setClientes(data as Cliente[])
    }
    
    // 🎯 NOVO: Busca todos os preços personalizados e armazena em cache
    const carregarPrecosPersonalizados = async () => {
        const { data, error } = await supabase
            .from("vidro_precos_com_cliente")
            .select("vidro_id, cliente_id, preco")
            .limit(1000); // Limite para evitar buscar tudo

        if (error) {
            console.error("Erro ao carregar preços personalizados:", error);
        } else {
            setPrecosPersonalizados(data.map(item => ({
                vidro_id: item.vidro_id,
                cliente_id: item.cliente_id.toString(), // Garante que é string (UUID)
                preco: Number(item.preco),
            })) as PrecoPersonalizado[]);
        }
    }

    useEffect(() => {
        carregarVidros();
        carregarClientes();
        
        // 🎯 CHAMA A NOVA FUNÇÃO DE CARREGAMENTO
        carregarPrecosPersonalizados();
    }, []);

    useEffect(() => {
        localStorage.setItem("vidrosLista", JSON.stringify(vidrosLista))
    }, [vidrosLista])


    // ---------------------------------------------------------------------------------------------------------
    // LÓGICA DE IMPORTAÇÃO DE EXCEL (Mantida, mas usando getVidroPriceForClient atualizado)
    // ---------------------------------------------------------------------------------------------------------
    
    const importarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (código para ler o arquivo Excel e encontrar colunas mantido)

        const file = e.target.files?.[0]
        if (!file) return
        
        const headerCandidates = {
            largura: ["largura","larg","lar","lg","l","largo","width","w"],
            altura: ["altura","alt","alt.","alto","al","h","ht"],
            quantidade: ["quantidade","qtd","qty","quant","q"],
            vidro: ["vidro","cor","tipo","glass","nome","descricao","descrição","produto","material","referencia"]
        }

        const findColIndex = (headers: string[], candidates: string[]) => {
            for (let i = 0; i < headers.length; i++) {
                let raw = headers[i] ?? ""
                raw = raw.toString().replace(/^\uFEFF/, "")
                const h = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
                if (!h) continue

                const words = h.split(/[\s\-_\/\\:;.,()]+/).filter(Boolean)

                for (const c of candidates) {
                    const cNorm = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                    if (h.includes(cNorm)) return i
                    if (words.includes(cNorm)) return i
                    if (cNorm.length <= 3 && (h === cNorm || h.startsWith(cNorm) || h.endsWith(cNorm))) return i
                }
            }
            return -1
        }
        
        if (novoVidro.cliente_id === 0) {
            showToast("Selecione um cliente antes de importar a planilha.", 'warning')
            e.target.value = ""
            return
        }

        try {
            let workbook: XLSX.WorkBook
            if (file.name.toLowerCase().endsWith(".csv")) {
                const text = await file.text()
                workbook = XLSX.read(text, { type: "string" })
            } else {
                const data = await file.arrayBuffer()
                workbook = XLSX.read(data, { type: "array" })
            }

            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            if (!sheet) throw new Error("Planilha vazia")

            const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

            if (!rows || rows.length < 2) {
                showToast("Planilha vazia ou sem dados.", 'warning')
                e.target.value = ""
                return
            }

            const rawHeaders = rows[0].map((h: any) => (h ?? "").toString().replace(/^\uFEFF/, ""))

            let idxLargura = findColIndex(rawHeaders, headerCandidates.largura)
            let idxAltura = findColIndex(rawHeaders, headerCandidates.altura)
            const idxQtd = findColIndex(rawHeaders, headerCandidates.quantidade)
            let idxVidro = findColIndex(rawHeaders, headerCandidates.vidro)

            // ... (Heurística de fallback de colunas omitida)

            const faltantes: string[] = []
            if (idxLargura === -1) faltantes.push("Largura")
            if (idxAltura === -1) faltantes.push("Altura")
            if (idxVidro === -1) faltantes.push("Vidro")
            if (faltantes.length) {
                showToast(`Não foi possível identificar colunas: ${faltantes.join(", ")}. Verifique o cabeçalho.`, 'error')
                e.target.value = ""
                return
            }

            const novosItens: VidroLinha[] = []
            const agrupamentoNaoEncontrado: { [nome: string]: NaoEncontradoRaw[] } = {}

            for (let r = 1; r < rows.length; r++) {
                const row = rows[r]
                if (!row || row.length === 0) continue

                const rawLarg = (row[idxLargura] ?? "").toString()
                const rawAlt = (row[idxAltura] ?? "").toString()
                const rawQtd = idxQtd !== -1 ? (row[idxQtd] ?? "").toString() : ""
                const rawVid = (row[idxVidro] ?? "").toString()
                
                if (!rawLarg && !rawAlt && !rawVid) continue

                const largura = parseNumber(rawLarg || "")
                const altura = parseNumber(rawAlt || "")
                const quantidade = (rawQtd ? parseNumber(rawQtd.toString()) : 1) || 1
                const nomeVidro = rawVid.trim()
                const nomeVidroNormalizado = nomeVidro.toLowerCase()

                const vidroEhComum =
                       nomeVidroNormalizado.includes("comum") ||
                        nomeVidroNormalizado.includes("cortado") ||
                        nomeVidroNormalizado.includes("lam") ||
                        nomeVidroNormalizado.includes("laminado") ||
                        nomeVidroNormalizado.includes("temp") ||
                        nomeVidroNormalizado.includes("temperado")

                const vidro = vidroEhComum
                    ? undefined
                    : encontrarVidroMelhorado(nomeVidro)

                if (!vidro) {
                    const rawItem: NaoEncontradoRaw = { rawLarg, rawAlt, rawQtd, linha: r + 1 }
                    if (!agrupamentoNaoEncontrado[nomeVidro]) {
                        agrupamentoNaoEncontrado[nomeVidro] = []
                    }
                    agrupamentoNaoEncontrado[nomeVidro].push(rawItem)
                    continue
                }

                const larguraCalc = arredondar5cm(largura)
                const alturaCalc = arredondar5cm(altura)
                // 🎯 AQUI: Usa a função de preço por cliente (agora lendo do cache)
                const precoM2 = getVidroPriceForClient(vidro.id, novoVidro.cliente_id) 
                
                if (precoM2 === 0) continue // Ignora se o preço for zero/não encontrado

                const valorTotal = calcularValorUnidade(larguraCalc, alturaCalc, precoM2) * quantidade

                novosItens.push({
                    larguraOriginal: rawLarg.toString(),
                    alturaOriginal: rawAlt.toString(),
                    larguraCalc,
                    alturaCalc,
                    quantidade,
                    vidro_id: vidro.id,
                    valorTotal,
                    cliente: novoVidro.cliente, // Usa o cliente atual do estado
                })
            }

            const gruposParaAssociar: VidroParaAssociar[] = Object.keys(agrupamentoNaoEncontrado).map(nomePlanilha => ({
                nomePlanilha,
                itens: agrupamentoNaoEncontrado[nomePlanilha],
            }))

            if (!novosItens.length && gruposParaAssociar.length === 0) {
                showToast("Nenhum item válido encontrado na planilha.", 'warning')
                e.target.value = ""
                return
            }
            
            if (gruposParaAssociar.length > 0) {
                if(novosItens.length > 0) {
                    setVidrosLista(prev => [...prev, ...novosItens])
                    showToast(`${novosItens.length} itens válidos adicionados. Iniciando associação manual...`, 'success')
                }
                
                setNaoEncontradosModal({ grupos: gruposParaAssociar, itensValidos: [], cliente: novoVidro.cliente || "" })
                setGrupoAtualIndex(0)
                setVidroSelecionadoModal(0)
            } else {
                setVidrosLista(prev => [...prev, ...novosItens])
                showToast(`Importação concluída: ${novosItens.length} itens adicionados. 🎉`, 'success')
            }

        } catch (err) {
            console.error("Erro importarExcel:", err)
            showToast("Erro ao importar planilha. Verifique o console.", 'error')
        } finally {
            e.target.value = ""
        }
    }
    
    // Função para tratar o grupo atual do modal (associação ou ignorar)
    const handleAssociation = (vidroId: number | null) => {
        // ... (código do handleAssociation mantido, usando getVidroPriceForClient atualizado)
        if (!naoEncontradosModal) return

        const grupo = naoEncontradosModal.grupos[grupoAtualIndex]
        let novosItensAssociados: VidroLinha[] = []

        if (vidroId !== null && vidroId !== 0) {
            
            const clienteIdParaCalculo = novoVidro.cliente_id === 0 && vidrosLista.length === 0 ? 
                                         clientes.find(c => c.nome === naoEncontradosModal.cliente)?.id || 0 : 
                                         novoVidro.cliente_id;
                                         
            if (clienteIdParaCalculo === 0) {
                showToast("Erro: Cliente não identificado para calcular o preço.", 'error');
                return;
            }

            const vidro = vidros.find(v => v.id === vidroId)
            
            if (vidro) {
                novosItensAssociados = grupo.itens.map(item => {
                    const largura = parseNumber(item.rawLarg || "")
                    const altura = parseNumber(item.rawAlt || "")
                    const quantidade = (item.rawQtd ? parseNumber(item.rawQtd.toString()) : 1) || 1

                    const larguraCalc = arredondar5cm(largura)
                    const alturaCalc = arredondar5cm(altura)
                    
                    // 🎯 AQUI: Usa a função de preço por cliente (agora lendo do cache)
                    const precoM2 = getVidroPriceForClient(vidro.id, clienteIdParaCalculo) 
                    
                    if (precoM2 === 0) return null // Pula itens sem preço válido

                    const valorTotal = calcularValorUnidade(larguraCalc, alturaCalc, precoM2) * quantidade

                    return {
                        larguraOriginal: item.rawLarg.toString(),
                        alturaOriginal: item.rawAlt.toString(),
                        larguraCalc,
                        alturaCalc,
                        quantidade,
                        vidro_id: vidro.id,
                        valorTotal,
                        cliente: naoEncontradosModal.cliente,
                    }
                }).filter(item => item !== null) as VidroLinha[]
                
                setNaoEncontradosModal(prev => prev ? ({ ...prev, itensValidos: [...prev.itensValidos, ...novosItensAssociados] }) : null)
            }
        }

        if (grupoAtualIndex < naoEncontradosModal.grupos.length - 1) {
            setGrupoAtualIndex(prev => prev + 1)
            setVidroSelecionadoModal(0)
        } else {
            const itensFinais = [...naoEncontradosModal.itensValidos, ...novosItensAssociados]
            setVidrosLista(prev => [...prev, ...itensFinais])
            showToast(`Associação manual concluída. ${itensFinais.length} itens adicionados.`, 'success')
            setNaoEncontradosModal(null)
            setGrupoAtualIndex(0)
        }
    }
    
    // ---------------------------------------------------------------------------------------------------------
    // LÓGICA DE CADASTRO, EDIÇÃO, EXCLUSÃO E LIMPEZA (Mantida, mas usando getVidroPriceForClient atualizado)
    // ---------------------------------------------------------------------------------------------------------

    const adicionarOuSalvar = () => {
        // ... (código do adicionarOuSalvar mantido)
        const larguraNum = parseNumber(novoVidro.larguraOriginal)
        const alturaNum = parseNumber(novoVidro.alturaOriginal)
        
        if (!novoVidro.vidro_id || isNaN(larguraNum) || isNaN(alturaNum) || larguraNum <= 0 || alturaNum <= 0) {
            showToast("Informe largura, altura e selecione um vidro.", 'warning')
            return
        }
        if (novoVidro.cliente_id === 0) {
            showToast("Selecione um cliente para prosseguir com o orçamento.", 'warning')
            return
        }
        
        const larguraCalc = arredondar5cm(larguraNum)
        const alturaCalc = arredondar5cm(alturaNum)
        
        // 🎯 AQUI: Usa a função de preço por cliente (agora lendo do cache)
        const precoM2 = getVidroPriceForClient(novoVidro.vidro_id, novoVidro.cliente_id)
        
        if (precoM2 === 0) {
            showToast("Preço do vidro não encontrado ou é zero.", 'error')
            return
        }

        const valorTotal = calcularValorUnidade(larguraCalc, alturaCalc, precoM2) * (novoVidro.quantidade || 1)
        const { cliente_id, ...itemBase } = novoVidro; // Remove cliente_id para corresponder a VidroLinha
        const item: VidroLinha = { ...itemBase, larguraCalc, alturaCalc, valorTotal } 

        if (editIndex !== null) {
            setVidrosLista(prev => { const novos = [...prev]; novos[editIndex] = item; return novos })
            setEditIndex(null)
            showToast("Item atualizado com sucesso!", 'success')
        } else {
            setVidrosLista(prev => [...prev, item])
            showToast("Item adicionado com sucesso!", 'success')
        }

        setNovoVidro(prev => ({ 
            ...prev, 
            larguraOriginal: "", 
            alturaOriginal: "", 
            quantidade: 1 
        }))
        
        setTimeout(() => larguraInputRef.current?.focus(), 0)
    }

    const excluirItem = async (index: number) => { 
        const confirmou = await customConfirm("Deseja realmente excluir este item do orçamento?");
        if (confirmou) { 
            setVidrosLista(prev => prev.filter((_, i) => i !== index))
            showToast("Item excluído.", 'warning')
        }
    }

    const limparTudo = async () => {
        const confirmou = await customConfirm("Tem certeza que deseja limpar o orçamento e começar um novo?");
         if (confirmou) {
            setVidrosLista([]);
            localStorage.removeItem("vidrosLista");

            setNovoVidro({
            larguraOriginal: "",
            alturaOriginal: "",
            quantidade: 1,
            vidro_id: 0,
            cliente: "",
            cliente_id: 0,
            });

            setInputVidro("");
            setNaoEncontradosModal(null);

            showToast("Novo orçamento iniciado.", "success");
  }
};
    
    const totalOrcamento = vidrosLista.reduce((acc, e) => acc + (e.valorTotal || 0), 0)

    // Lógica para Troca em Massa
    const handleTrocarEmMassa = () => {
        // ... (código do handleTrocarEmMassa mantido)
        if (!trocaModal.novoVidroId) {
            showToast("Selecione um vidro para a substituição.", 'warning');
            return;
        }
        if (novoVidro.cliente_id === 0) {
             showToast("Erro: ID do Cliente não encontrado. Não é possível recalcular o preço.", 'error');
            return;
        }

        const novoVidroSelecionado = vidros.find(v => v.id === trocaModal.novoVidroId);
        if (!novoVidroSelecionado) {
            showToast("Vidro de destino inválido.", 'error');
            return;
        }

        // 🎯 AQUI: Usa a função de preço por cliente (agora lendo do cache)
        const precoM2 = getVidroPriceForClient(trocaModal.novoVidroId, novoVidro.cliente_id);
        if (precoM2 === 0) {
            showToast("Preço do novo vidro não encontrado ou é zero para este cliente.", 'error');
            return;
        }
        
        let itensTrocados = 0;

        const novaLista = vidrosLista.map((item, index) => {
            if (itensSelecionados.includes(index)) {
                itensTrocados++;
                
                // Recalcula o valor com o novo preço
                const valorTotal = calcularValorUnidade(item.larguraCalc, item.alturaCalc, precoM2) * item.quantidade;

                return {
                    ...item,
                    vidro_id: novoVidroSelecionado.id,
                    valorTotal: valorTotal,
                };
            }
            return item;
        });

        setVidrosLista(novaLista);
        setItensSelecionados([]);
        setTrocaModal({ isOpen: false, novoVidroId: 0 });
        showToast(`Sucesso! ${itensTrocados} itens foram trocados para o vidro ${novoVidroSelecionado.nome}.`, 'success');
    };

    const toggleItemSelection = (index: number) => {
        setItensSelecionados(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const toggleSelectAll = () => {
        if (itensSelecionados.length === vidrosLista.length) {
            setItensSelecionados([]);
        } else {
            setItensSelecionados(vidrosLista.map((_, i) => i));
        }
    };

       // --- FUNÇÃO GERAR PDF ---
    const gerarPDF = async () => {
    if (!vidrosLista.length) { 
        showToast("Não há itens no orçamento para gerar o PDF.", 'warning'); 
        return;
    }

    showToast("Gerando PDF...", 'success');

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const usableWidth = pageWidth - 2 * margin;

        // --- CABEÇALHO ---
    pdf.setFontSize(16);
    pdf.setTextColor(theme.primary);
    pdf.text("Orçamento de Vidros", margin, 20);

    const clienteNome = vidrosLista[0]?.cliente || novoVidro.cliente || "Não informado";
    const dataHoje = new Date().toLocaleDateString("pt-BR");

    // 👉 DATA PRIMEIRO
    pdf.setFontSize(10);
    pdf.setTextColor(theme.primary);
    pdf.text(`Data: ${dataHoje}`, margin, 30);

    // 👉 CLIENTE EMBAIXO
    pdf.setFontSize(10);
    pdf.setTextColor(theme.primary);
    pdf.text(`Cliente: ${clienteNome}`, margin, 38);

    // --- LOGO ---
    try {
        const imgData = await fetch("/logo.png")
            .then(r => r.blob())
            .then(blob => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }));

        // Adiciona direto
        const logoHeight = 13;
        const img = new Image();
        img.src = imgData;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
        });
        const aspectRatio = img.width / img.height;
        const logoWidth = logoHeight * aspectRatio;
        pdf.addImage(imgData, "PNG", pageWidth - margin - logoWidth, 10, logoWidth, logoHeight);
    } catch (error) {
        console.warn("Não foi possível carregar a logo para o PDF.");
    }

    const head = [[
        "DESCRIÇÃO / VIDRO", 
        "QTD", 
        "LARG\n(mm)", 
        "ALT\n(mm)", 
        "m²\nTOTAL", 
        "VALOR\nm²", 
        "TOTAL"
    ]];

    // --- DADOS DA TABELA ---
    const body = vidrosLista.map(e => {
    const vidro = vidros.find(v => v.id === e.vidro_id);
    const precoM2 = getVidroPriceForClient(e.vidro_id, novoVidro.cliente_id);
    const m2Individual = 
    (e.larguraCalc * e.alturaCalc) / 1000000;

    const m2TotalItem = m2Individual * e.quantidade;

    return [
        `${vidro?.nome}${vidro?.tipo ? ` (${vidro.tipo})` : ''}${vidro?.espessura ? ` - ${vidro.espessura}` : ''}`,
        e.quantidade,                                 // Coluna 1: Qtd
        e.larguraOriginal,                            // Coluna 2: Largura
        e.alturaOriginal,                             // Coluna 3: Altura
        m2TotalItem.toFixed(2),                       // Coluna 4: m² Total
        formatarPreco(precoM2),                       // Coluna 5: Valor m²
        formatarPreco(e.valorTotal)                   // Coluna 6: Total do item
    ];
});

    const widthMap = {
        vidro: usableWidth * 0.35,
        quant: usableWidth * 0.10,
        larg: usableWidth * 0.10,
        alt: usableWidth * 0.10,
        precoM2: usableWidth * 0.15,
        total: usableWidth * 0.20
    };

        
 autoTable(pdf, {
    head: head,
    body: body,
    theme: "plain",
    startY: 55,
    pageBreak: "auto", 
    rowPageBreak: "avoid", 
      styles: {
        overflow: "linebreak"
    },
    headStyles: { 
        fillColor: theme.primary, 
        textColor: 255, 
        fontSize: 8, 
        halign: 'center',     
        valign: 'middle',      
        cellPadding: { top: 2, bottom: 2, left: 1, right: 1 } 
    },
  bodyStyles: { 
        fontSize: 8, 
        textColor: [50, 50, 50],
        valign: 'middle'
    },
    columnStyles: {
        0: { cellWidth: 55, halign: 'left' },   // Descrição (mais larga)
        1: { cellWidth: 10, halign: 'center' }, // Qtd
        2: { cellWidth: 20, halign: 'center' }, // Largura
        3: { cellWidth: 20, halign: 'center' }, // Altura
        4: { cellWidth: 20, halign: 'center' }, // m² Total
        5: { cellWidth: 25, halign: 'center' },  // Valor m²
        6: { cellWidth: 25, halign: 'center' },  // Total
    },
    margin: { left: margin, right: margin, bottom: 30 }
});

// 🔹 TOTALIZADORES FINAIS
const finalY = (pdf as any).lastAutoTable?.finalY || 30;

// 1. Cálculos (Caso ainda não tenha feito acima)
const totalM2Geral = vidrosLista.reduce((acc, item) => 
    acc + (Number(item.larguraOriginal) * Number(item.alturaOriginal) / 1000000) * item.quantidade, 0
);
const totalPecas = vidrosLista.reduce((acc, item) => acc + item.quantidade, 0);

pdf.setFontSize(10);
pdf.setFont("helvetica", "bold");
pdf.setTextColor(80, 80, 80); // Cinza escuro para leitura clara
const infoTecnica = `Peças: ${totalPecas}  |  Área Total: ${totalM2Geral.toFixed(2)}m²`;
pdf.text(infoTecnica, margin, finalY + 25); // Posicionado à esquerda na mesma linha do Total

// 3. BOTÃO DO TOTAL GERAL (Quadrado com contorno verde)
const larguraBotao = 65;
const alturaBotao = 12;
const posX = pageWidth - margin - larguraBotao;
const posY = finalY + 18;

// Contorno Verde
pdf.setDrawColor(120, 190, 70); 
pdf.setLineWidth(0.3);
pdf.roundedRect(posX, posY, larguraBotao, alturaBotao, 3, 3, 'S'); 

// Texto do Valor
pdf.setFontSize(12);
pdf.setTextColor(theme.primary); // Azul escuro
const totalTexto = `Total Geral: ${formatarPreco(totalOrcamento)}`;
pdf.text(totalTexto, posX + (larguraBotao / 2), posY + 8, { align: 'center' })
// 🔹 SALVAR
pdf.save("orcamento.pdf");
showToast("PDF gerado e baixado com sucesso! 🎉");   
}

    const currentGrupo = naoEncontradosModal?.grupos[grupoAtualIndex]
    const [inputCliente, setInputCliente] = useState("")
    const [showClienteAutocomplete, setShowClienteAutocomplete] = useState(false)
    const [cursorCliente, setCursorCliente] = useState(-1);
    const [cursorVidro, setCursorVidro] = useState(-1);

    const handleKeyDownCliente = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Filtra a lista de clientes baseada no que foi digitado
    const clientesFiltrados = clientes.filter(c => 
        c.nome.toLowerCase().includes(inputCliente.toLowerCase())
    );

    if (!showClienteAutocomplete || clientesFiltrados.length === 0) return;

    if (e.key === "ArrowDown") {
        e.preventDefault(); // Impede o cursor de ir para o fim do texto
        setCursorCliente(prev => (prev < clientesFiltrados.length - 1 ? prev + 1 : prev));
    } 
    else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursorCliente(prev => (prev > 0 ? prev - 1 : 0));
    } 
    else if (e.key === "Enter") {
        e.preventDefault();
        if (cursorCliente >= 0 && cursorCliente < clientesFiltrados.length) {
            const clienteSel = clientesFiltrados[cursorCliente];
            // Lógica para selecionar o cliente
            setNovoVidro(prev => ({ ...prev, cliente: clienteSel.nome, cliente_id: clienteSel.id }));
            setInputCliente(clienteSel.nome);
            setShowClienteAutocomplete(false);
            setCursorCliente(-1);
        }
    } 
    else if (e.key === "Escape") {
        setShowClienteAutocomplete(false);
        setCursorCliente(-1);
    }
};
    
return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
        
        {toastMessage && (
            <ToastNotification 
                message={toastMessage.message} 
                type={toastMessage.type} 
                onClose={() => setToastMessage(null)} 
            />
        )}
        
        <ConfirmModal 
            state={confirmModalState} 
            onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))} 
        />
        
        {/* Modal de Associação Manual (Importação Excel) */}
        {naoEncontradosModal && currentGrupo && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-2xl max-w-lg w-full">
                    <h2 className="text-xl font-bold mb-4" style={{ color: theme.primary }}>Associação Manual de Vidros</h2>
                    <p className="mb-4">
                        O termo **"{currentGrupo.nomePlanilha}"** da planilha não foi reconhecido.
                        <br/>
                        Associe-o a um vidro cadastrado ({grupoAtualIndex + 1} de {naoEncontradosModal.grupos.length}).
                    </p>
                    
                    <div className="mb-4 p-3 border rounded">
                        <h3 className="font-semibold mb-2">Itens para Associar ({currentGrupo.itens.length}):</h3>
                        <ul className="list-disc list-inside text-sm max-h-20 overflow-y-auto">
                            {currentGrupo.itens.slice(0, 5).map((item, i) => (
                                <li key={i}>Linha {item.linha}: {item.rawLarg} x {item.rawAlt} (Qtd: {item.rawQtd || 1})</li>
                            ))}
                            {currentGrupo.itens.length > 5 && <li>E mais {currentGrupo.itens.length - 5} itens...</li>}
                        </ul>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block font-medium mb-1">Vidro Cadastrado:</label>
                        <select 
                            value={vidroSelecionadoModal}
                            onChange={e => setVidroSelecionadoModal(Number(e.target.value))}
                            className="p-2 rounded border w-full focus:outline-none focus:ring-2"
                        >
                            <option value={0}>Ignorar / Selecione o Vidro...</option>
                            {vidros.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => handleAssociation(null)} // Ignora
                            className="px-4 py-2 rounded font-medium border text-gray-700 hover:bg-gray-100"
                        >
                            Ignorar
                        </button>
                        <button 
                            onClick={() => handleAssociation(vidroSelecionadoModal)}
                            disabled={vidroSelecionadoModal === 0}
                            className="px-4 py-2 rounded font-bold text-white disabled:opacity-50 transition" 
                            style={{ backgroundColor: theme.primary }}
                        >
                            Associar e Próximo
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Modal de Troca em Massa */}
        {trocaModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full" style={{ borderColor: theme.border }}>
                    <div className="flex justify-between items-center border-b pb-2 mb-4" style={{ borderColor: theme.border }}>
                        <h2 className="text-xl font-bold" style={{ color: theme.primary }}>Troca em Massa</h2>
                        <button onClick={() => setTrocaModal({ isOpen: false, novoVidroId: 0 })} className="text-gray-500 hover:text-gray-700">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <p className="mb-4">
                        Você selecionou <strong className="font-bold">{itensSelecionados.length}</strong> item(s).
                    </p>

                    <div className="mb-4 relative">
                        <label className="block font-medium mb-1">Novo Vidro de Destino:</label>
                        <select 
                            value={trocaModal.novoVidroId}
                            onChange={e => setTrocaModal(prev => ({ ...prev, novoVidroId: Number(e.target.value) }))}
                            className="p-2 rounded border w-full focus:outline-none focus:ring-2"
                            style={{ borderColor: theme.border }} 
                        >
                            <option value={0}>Selecione o Vidro...</option>
                            {vidros.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-6">
                        <button 
                            onClick={() => setTrocaModal({ isOpen: false, novoVidroId: 0 })}
                            className="px-4 py-2 rounded font-medium border"
                            style={{ borderColor: theme.primary, color: theme.primary, backgroundColor: "#FFF" }}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleTrocarEmMassa}
                            disabled={trocaModal.novoVidroId === 0}
                            className="px-4 py-2 rounded font-bold text-white disabled:opacity-50 transition" 
                            style={{ backgroundColor: theme.primary, color: theme.secondary }}
                        >
                            Aplicar Troca
                        </button>
                    </div>
                </div>
            </div>
        )}
  
        <div className="flex justify-between items-center mb-4">
           {/* Botão Home e Título */}
           <div className="flex items-center gap-3 w-full sm:w-auto">
             <button
                onClick={() => (window.location.href = "/")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold shadow hover:opacity-90 transition"
                style={{ backgroundColor: theme.secondary, color: theme.primary }}
            >
                <Home className="w-5 h-5 text-white" />
                <span className="hidden md:inline text-theme.primary">Home</span>
            </button>
            {/* O título foi movido para o centro visual, mantendo o padrão do componente anterior */}
            <h1 className="text-xl sm:text-2xl font-bold text-center">Cálculo de Vidros</h1>
        </div>
        
        {/* Botões de Ação à direita */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
                onClick={limparTudo}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium shadow-md transition hover:bg-gray-100"
                style={{ color: theme.primary, border: "1px solid " + theme.primary, backgroundColor: "#FFF" }}
            >
                Novo
            </button>
            <button 
                onClick={gerarPDF} 
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium shadow-md transition hover:bg-gray-100" 
                style={{ color: theme.primary, border: "1px solid " + theme.primary, backgroundColor: "#FFF" }}
            >
                Gerar PDF
            </button>
            <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                id="inputExcel"
                onChange={importarExcel}
                onClick={e => (e.currentTarget.value = "")}
            />
            <label
                htmlFor="inputExcel"
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium shadow-md cursor-pointer transition hover:bg-gray-100 hidden md:flex items-center" // Adicionado hidden/md:flex para responsividade
                style={{ color: theme.primary, border: `1px solid ${theme.primary}`, backgroundColor: "#FFF" }}
            >
                Importar Excel
            </label>
        </div>
    </div>

   {/* SELEÇÃO DE CLIENTE (Padrão: bg-white, rounded-xl, shadow-lg) */}
<div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-1/3">
        <label className="font-medium min-w-[70px]">Cliente:</label>
        <div className="relative w-full flex gap-2">
            <input
                type="text"
                placeholder="Digite o nome do cliente"
                value={novoVidro.cliente || inputCliente}
                disabled={vidrosLista.length > 0}
                onChange={e => {
                    if (vidrosLista.length > 0) {
                        showToast("Cliente travado: Limpe o orçamento antes de trocar.", "warning")
                        return
                    }
                    setInputCliente(e.target.value)
                    setCursorVidro(-1);
                    setNovoVidro(prev => ({ ...prev, cliente: "", cliente_id: 0 }))
                    setShowClienteAutocomplete(true)
                }}
                onFocus={() => setShowClienteAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowClienteAutocomplete(false), 150)}
                className="p-3 rounded-xl border w-full disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                style={{ borderColor: theme.border }}
             onKeyDown={e => {
            const filtrados = clientes.filter(c => normalize(c.nome).includes(normalize(inputCliente))).slice(0, 10);
            
            if (e.key === 'ArrowDown') {
                e.preventDefault(); // Impede o cursor de texto de pular
                setCursorCliente(prev => {
                    const next = prev < filtrados.length - 1 ? prev + 1 : prev;
                    if (filtrados[next]) setInputCliente(filtrados[next].nome); // Atualiza o texto ao descer
                    return next;
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursorCliente(prev => {
                    const next = prev > 0 ? prev - 1 : prev;
                    if (filtrados[next]) setInputCliente(filtrados[next].nome); // Atualiza o texto ao subir
                    return next;
                });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selecionado = cursorCliente >= 0 ? filtrados[cursorCliente] : filtrados[0];
                if (selecionado) {
                    setNovoVidro(prev => ({ ...prev, cliente: selecionado.nome, cliente_id: selecionado.id }));
                    setInputCliente(selecionado.nome);
                    setShowClienteAutocomplete(false);
                    setCursorCliente(-1);
                    setTimeout(() => document.querySelector<HTMLInputElement>('input[placeholder="Digite para buscar vidro"]')?.focus(), 10);
                }
            }
        }}
            />
            <button 
            onClick={() => window.location.href = "/clientes"} 
            className="p-4 rounded-lg text-white shadow-sm flex-shrink-0 hover:opacity-90 transition-opacity" 
            style={{ backgroundColor: theme.primary }}
            title="Ir para Cadastro de Clientes"
            >
            <UserPlus size={18} />
            </button>
                
            {showClienteAutocomplete && (
                <ul className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-40 overflow-y-auto scrollbar-erp">
                    {clientes
                        .filter(c =>
                            normalize(c.nome).includes(normalize(inputCliente))
                        )
                        .slice(0, 10)
                        .map((c, i) => (
                            <li
                                key={c.id}
                                className={`p-2 cursor-pointer ${i === cursorCliente ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                                onMouseDown={() => {
                                    setNovoVidro(prev => ({
                                        ...prev,
                                        cliente: c.nome,
                                        cliente_id: c.id,
                                    }))
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
    </div>
    <p className="text-sm italic text-gray-500 w-full sm:w-2/3">
        {vidrosLista.length > 0 && "Cliente travado. Limpe para trocar."}
    </p>
</div>

    {/* CADASTRO DE ITEM (VIDRO, MEDIDAS, QTD) (Padrão: bg-white, rounded-xl, shadow-lg) */}
    <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primary }}>Adicionar Item</h2>
        
        {/* Campo de Busca de Vidro (Adaptado para o padrão de autocomplete) */}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center relative">
            <label className="font-medium min-w-[70px]">Vidro:</label>
            <div className="flex-1 relative w-full">
                <input
                    type="text"
                    value={
                        novoVidro.vidro_id
                            ? (() => {
                                  const v = vidros.find(v => v.id === novoVidro.vidro_id);
                                  const preco = v ? getVidroPriceForClient(v.id, novoVidro.cliente_id) : 0;
                                  return v 
                                      ? `${v.nome}${v.tipo ? ` (${v.tipo})` : ""}${v.espessura ? ` - ${v.espessura}` : ""} (R$ ${formatarPreco(preco)}/m²)` 
                                      : inputVidro;
                              })()
                            : inputVidro
                    }
                    onChange={e => { 
                        setInputVidro(e.target.value); 
                        setNovoVidro(prev => ({ ...prev, vidro_id: 0 })); 
                        setShowAutocomplete(true) 
                    }}
                    placeholder="Digite para buscar vidro"
                    className="p-3 rounded-xl border w-full focus:outline-none focus:ring-2 focus:ring-[#92D050]" 
                    style={{ borderColor: theme.border }}
                    onFocus={() => setShowAutocomplete(true)}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                  onKeyDown={e => {
                    const filtrados = vidros.filter(v => matchesVidro(v, inputVidro));
                    
                    if (e.key === 'ArrowDown') {
                        setCursorVidro(prev => (prev < filtrados.length - 1 ? prev + 1 : prev));
                    } else if (e.key === 'ArrowUp') {
                        setCursorVidro(prev => (prev > 0 ? prev - 1 : prev));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        const selecionado = cursorVidro >= 0 ? filtrados[cursorVidro] : filtrados[0];
                        if (selecionado) {
                            setNovoVidro(prev => ({ ...prev, vidro_id: selecionado.id }));
                            setInputVidro(selecionado.nome);
                            setShowAutocomplete(false);
                            setTimeout(() => larguraInputRef.current?.focus(), 10);
                        }
                    }
                }}
                />
                {showAutocomplete && (
                 <ul className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto mt-1 scrollbar-erp">
                    {vidros.filter(v => matchesVidro(v, inputVidro)).map((v, i) => (
                        <li
                            key={v.id}
                            ref={(el) => {
                                if (i === cursorVidro && el) {
                                    el.scrollIntoView({
                                        block: 'nearest',
                                        behavior: 'auto'
                                    });
                                }
                            }}
                            className={`p-2 cursor-pointer ${
                                i === cursorVidro 
                                    ? 'bg-[#1C415B] text-white'
                                    : 'hover:bg-gray-100 text-gray-900'
                            }`}
                            onMouseDown={() => { 
                                setNovoVidro(prev => ({ ...prev, vidro_id: v.id })); 
                                const vSelected = vidros.find(vid => vid.id === v.id);
                                const preco = vSelected ? getVidroPriceForClient(vSelected.id, novoVidro.cliente_id) : 0;
                                setInputVidro(vSelected 
                                    ? `${vSelected.nome}${vSelected.tipo ? ` (${vSelected.tipo})` : ""}${vSelected.espessura ? ` - ${vSelected.espessura}` : ""} (R$ ${formatarPreco(preco)}/m²)` 
                                    : "");
                                setShowAutocomplete(false) 
                            }}
                        >
                            {v.nome}{v.tipo ? ` (${v.tipo})` : ""}{v.espessura ? ` - ${v.espessura}` : ""} 
                            <span className="text-xs opacity-80">
                                (R$ {formatarPreco(getVidroPriceForClient(v.id, novoVidro.cliente_id))}/m²)
                            </span>
                        </li>
                    ))}
                </ul>
                                )}
                            </div>
                        </div>

        {/* Largura / Altura / Quantidade / Ação (Padrão: grid responsivo) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <input
                ref={larguraInputRef}
                type="text"
                maxLength={4} // 🔹 impede mais que 4 dígitos
                placeholder="Largura (mm)"
                value={novoVidro.larguraOriginal}
                onChange={e => setNovoVidro(prev => ({ ...prev, larguraOriginal: e.target.value }))}
                className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                style={{ borderColor: theme.border }}
                onKeyDown={e => e.key === 'Enter' && alturaInputRef.current?.focus()}
            />
            <input
            type="text"
            placeholder="Altura (mm)"
            maxLength={4}
            value={novoVidro.alturaOriginal}
            onChange={e => setNovoVidro(prev => ({ ...prev, alturaOriginal: e.target.value }))}
            onKeyDown={e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.querySelector<HTMLInputElement>('input[placeholder="Qtd"]')?.focus();
                }
            }}
            className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#92D050]"
            style={{ borderColor: theme.border }}
        />
            <input
                type="number"
                placeholder="Qtd"
                value={novoVidro.quantidade}
                min={1}
                onChange={e => setNovoVidro(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarOuSalvar();
                    }
                }}
                className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#92D050]"
                style={{ borderColor: theme.border }}
            />
                <button
                    onClick={adicionarOuSalvar}
                    disabled={novoVidro.cliente_id === 0 || novoVidro.vidro_id === 0}
                    className="py-3 rounded-xl font-semibold text-white transition hover:brightness-110 disabled:opacity-50" 
                    style={{ backgroundColor: theme.primary }}
                >
                    {editIndex !== null ? "Salvar Edição" : "Adicionar"}
                </button>
        </div>
    </div>
    
    {/* BARRA DE AÇÃO EM MASSA (Padrão: similar ao formulário, com cores de destaque) */}
    {vidrosLista.length > 0 && (
        <div className="mb-4 p-4 rounded-xl shadow-md flex flex-wrap gap-4 items-center" style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.border}` }}>
            <span className="font-semibold text-sm" style={{ color: theme.primary }}>{itensSelecionados.length} item(s) selecionado(s)</span>
            
            <button
                onClick={() => setTrocaModal(prev => ({ ...prev, isOpen: true }))}
                disabled={itensSelecionados.length === 0}
                className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50 transition hover:brightness-110"
                style={{ backgroundColor: theme.secondary, color: theme.primary }}
            >
                Trocar Vidros Selecionados
            </button>
            <button
                onClick={() => setItensSelecionados([])}
                disabled={itensSelecionados.length === 0}
                className="px-4 py-2 rounded-xl font-medium border text-gray-700 disabled:opacity-50 transition hover:bg-gray-100"
                style={{ borderColor: theme.border }}
            >
                Limpar Seleção
            </button>
        </div>
    )}

    {/* TABELA DE ORÇAMENTO (Padrão: bg-white, rounded-xl, shadow-lg, cabeçalho primário) */}
    <h2 className="text-xl font-bold mb-3" style={{ color: theme.primary }}>Itens do Orçamento ({vidrosLista.length})</h2>
    <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
            <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
                <tr>
                    <th className="p-3 w-12 rounded-tl-xl">
                        <input 
                            type="checkbox" 
                            checked={itensSelecionados.length === vidrosLista.length && vidrosLista.length > 0}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 text-white rounded focus:ring-transparent" 
                            style={{ color: theme.secondary, accentColor: theme.secondary, backgroundColor: theme.primary }}
                        />
                    </th>
                    <th className="p-3">Vidro</th>
                    <th className="p-3">Qtd</th>
                    <th className="p-3">Largura (mm)</th>
                    <th className="p-3">Altura (mm)</th>
                    <th className="p-3 text-center">M² Total</th> 
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center rounded-tr-xl">Ações</th>
                </tr>
            </thead>
            <tbody>
                {vidrosLista.map((item, i) => {
                    const vidro = vidros.find(v => v.id === item.vidro_id)
                    const isSelected = itensSelecionados.includes(i);
                    return (
                        <tr key={item.larguraOriginal + item.alturaOriginal + item.vidro_id + i} className={`border-b hover:bg-gray-50 ${isSelected ? 'bg-yellow-50/50' : ''}`} style={{ borderColor: theme.border }}>
                            <td className="p-3 w-12">
                                <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleItemSelection(i)}
                                    className="h-4 w-4 rounded" 
                                    style={{ color: theme.primary, accentColor: theme.secondary }}
                                />
                            </td>
                            <td className="p-3">
                                <span className="font-semibold block">{vidro?.nome}</span>
                                <span className="text-xs italic text-gray-500">
                                    {vidro?.tipo ? ` (${vidro.tipo})` : ""}{vidro?.espessura ? ` - ${vidro.espessura}` : ""}
                                </span>
                            </td>
                            <td className="p-3">{item.quantidade}</td>
                            <td className="p-3">{item.larguraOriginal}</td>
                            <td className="p-3">{item.alturaOriginal}</td>
                            <td className="p-3 text-center">
                                {((Number(item.larguraOriginal) * Number(item.alturaOriginal) / 1000000) * item.quantidade).toFixed(2)}m²
                            </td>
                            <td className="p-3 font-bold text-right">{formatarPreco(item.valorTotal)}</td>
                            <td className="p-3 text-center">
                                <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={() => { 
                                            setEditIndex(i); 
                                            setNovoVidro(prev => ({
                                                ...prev,
                                                vidro_id: item.vidro_id,
                                                cliente: item.cliente || prev.cliente, 
                                                cliente_id: prev.cliente_id || clientes.find(c => c.nome === item.cliente)?.id || 0,
                                                quantidade: item.quantidade,
                                                larguraOriginal: item.larguraOriginal,
                                                alturaOriginal: item.alturaOriginal,
                                            })); 
                                            const v = vidros.find(v => v.id === item.vidro_id);
                                            const preco = v ? getVidroPriceForClient(v.id, novoVidro.cliente_id) : 0;
                                            setInputVidro(v 
                                                ? `${v.nome}${v.tipo ? ` (${v.tipo})` : ""}${v.espessura ? ` - ${v.espessura}` : ""} (R$ ${formatarPreco(preco)}/m²)` 
                                                : "");
                                            setTimeout(() => larguraInputRef.current?.focus(), 0) 
                                        }}
                                        className="p-2 rounded-full hover:bg-gray-100 transition"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-5 h-5" style={{ color: theme.primary }} />
                                    </button>
                                    <button
                                        onClick={() => excluirItem(i)}
                                        className="p-2 rounded-full hover:bg-red-50 transition" 
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-5 h-5 text-red-500" /> 
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
        {!vidrosLista.length && (
            <div className="p-8 text-center text-gray-500">Nenhum item adicionado ao orçamento.</div>
        )}
    </div>

    {/* TOTAL FINAL (Padrão: Caixa de destaque) */}
    <div className="text-right p-4 rounded-xl shadow-lg mt-4 font-bold bg-white" style={{ color: theme.primary, border: `1px solid ${theme.secondary}` }}>
        <span className="text-xl">Total Geral: {formatarPreco(totalOrcamento)}</span>
    </div>

</div>
); 
}