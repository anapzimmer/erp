// src/app/orcamento/page.tsx
"use client"

import { useState, useMemo } from 'react'
import { Home, Ruler, Zap, DollarSign } from 'lucide-react'

// --- Tipos de Dados da Tipologia (COPIADOS DO PROJETOS/PAGE.TSX) ---

// Funções utilitárias (não incluídas, mas necessárias)
const formatarPreco = (valor: number) => {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// O Parser de Fórmulas é a parte mais complexa e crucial
// Exemplo simples que avalia expressões como 'L_TOTAL/2 - 30'
const parseFormula = (formula: string, L_TOTAL: number, H_TOTAL: number, unidade: 'mm' | 'cm' | 'm'): number => {
    
    // Converte a unidade base para mm para consistência (simulação)
    let L = L_TOTAL
    let H = H_TOTAL

    if (unidade === 'cm') { L *= 10; H *= 10 }
    if (unidade === 'm') { L *= 1000; H *= 1000 }

    let expr = formula.toUpperCase()
        .replace(/L_TOTAL/g, String(L))
        .replace(/H_TOTAL/g, String(H))
        .replace(/ /g, '') // Remove espaços
    
    // Tenta avaliar a expressão de forma segura
    try {
        // eslint-disable-next-line no-eval
        const resultado = eval(expr)
        return Math.round(resultado * 100) / 100 // Arredonda para 2 casas decimais (ou sem casas para corte)
    } catch (e) {
        console.error(`Erro ao avaliar fórmula: ${formula}. Expressão: ${expr}`, e)
        return 0
    }
}

// --- Tipos de Itens de Estoque (MOCK para simulação) ---

type ItemEstoque = {
    id: string | number // UUID ou Number
    nome: string
    preco_unitario: number // Preço em BRL/unidade (m, m2 ou peça)
    unidade_medida: 'm' | 'm2' | 'peça'
    tipo: 'vidro' | 'perfil' | 'kit' | 'ferragem'
}

// MOCK: Dados simulados dos bancos de perfis, kits e ferragens
const MOCK_ESTOQUE: ItemEstoque[] = [
    // Perfis (Código e Nome)
    { id: "PF001", nome: "Perfil U Simples", preco_unitario: 15.00, unidade_medida: 'm', tipo: 'perfil' },
    { id: "PF002", nome: "Perfil Lateral Guia", preco_unitario: 22.50, unidade_medida: 'm', tipo: 'perfil' },
    // Vidros (Código e Nome)
    { id: "VD001", nome: "Vidro Temperado 8mm Incolor", preco_unitario: 120.00, unidade_medida: 'm2', tipo: 'vidro' },
    { id: "VD002", nome: "Vidro Laminado 10mm Fumê", preco_unitario: 250.00, unidade_medida: 'm2', tipo: 'vidro' },
    // Kits e Ferragens (ID)
    { id: 1, nome: "Kit Roldana Dupla", preco_unitario: 85.00, unidade_medida: 'peça', tipo: 'kit' },
    { id: "FGA01", nome: "Fecho Concha Simples", preco_unitario: 12.00, unidade_medida: 'peça', tipo: 'ferragem' },
]


// --- TIPOLOGIA COMPLETA (Tipologia de Exemplo do projetos/page.tsx) ---

type RegraVidro = { id: number; nome_vidro: string; vidro_id: string; largura_formula: string; altura_formula: string }
type RegraPerfil = { id: number; nome_perfil: string; perfil_id: string; dimensao_formula: string; multiplicador: number; corte_formula?: string }
type RegraContagem = { id: number; tipo_item: 'kit' | 'ferragem'; nome_item: string; item_id: string | number; multiplicador: number } // Ajustado para ser string | number
type ProjetoTipologia = { nome: string; linha: string; unidade_medida: 'mm' | 'cm' | 'm'; regras_vidro: RegraVidro[]; regras_perfil: RegraPerfil[]; regras_contagem: RegraContagem[] }


// Tipologia de Exemplo (Janela de Correr 4 Folhas)
const tipologiaExemplo: ProjetoTipologia = {
    nome: "Janela de Correr 4 Folhas - Suprema",
    linha: "Suprema",
    unidade_medida: 'mm',
    regras_vidro: [
        { id: 1, nome_vidro: "Folha Fixa (2x)", vidro_id: "VD001", largura_formula: "L_TOTAL / 4", altura_formula: "H_TOTAL - 50" },
        { id: 2, nome_vidro: "Folha Móvel (2x)", vidro_id: "VD001", largura_formula: "L_TOTAL / 4", altura_formula: "H_TOTAL - 70" },
    ],
    regras_perfil: [
        { id: 1, nome_perfil: "Guia Inferior", perfil_id: "PF002", dimensao_formula: "L_TOTAL", multiplicador: 1 },
        { id: 2, nome_perfil: "Travessa Lateral", perfil_id: "PF001", dimensao_formula: "H_TOTAL", multiplicador: 4 },
    ],
    regras_contagem: [
        { id: 1, tipo_item: 'kit', nome_item: "Kit Roldanas p/ 2 Folhas", item_id: 1, multiplicador: 2 }, // 2 kits de roldana para 4 folhas (2 fixas, 2 móveis)
        { id: 2, tipo_item: 'ferragem', nome_item: "Fecho Concha", item_id: "FGA01", multiplicador: 2 } // 2 fechos (um para cada folha móvel)
    ]
}


// --- RESULTADO DO CÁLCULO ---

type ResultadoItem = {
    nome_item: string
    unidade: 'm' | 'm2' | 'peça'
    quantidade: number // Quantidade total (m, m2 ou peça)
    preco_unitario: number
    custo_total: number
    detalhe_formula: string
}

const theme = {
    primary: "#1C415B",
    secondary: "#92D050",
    text: "#1C415B",
    background: "#F9FAFB",
    border: "#E5E7EB",
}

export default function OrcamentoPage() {
    const [L_TOTAL, setL_TOTAL] = useState<number>(2000) // 2000 mm
    const [H_TOTAL, setH_TOTAL] = useState<number>(1500) // 1500 mm
    const [resultados, setResultados] = useState<ResultadoItem[]>([])

    // Função central de cálculo
    const calcularItens = (L: number, H: number, tipologia: ProjetoTipologia): ResultadoItem[] => {
        const itensCalculados: ResultadoItem[] = []
        const unidade = tipologia.unidade_medida

        // 1. CÁLCULO DE VIDROS (em m2)
        tipologia.regras_vidro.forEach(regra => {
            const estoque = MOCK_ESTOQUE.find(i => i.id === regra.vidro_id && i.tipo === 'vidro')
            if (!estoque) return

            const largura_corte = parseFormula(regra.largura_formula, L, H, unidade)
            const altura_corte = parseFormula(regra.altura_formula, L, H, unidade)
            
            // Área em m2 (largura * altura) / 1.000.000 (para mm)
            const area_m2_por_peca = (largura_corte * altura_corte) / (unidade === 'mm' ? 1000000 : unidade === 'cm' ? 10000 : 1)
            
            // Assume-se que a regra.nome_vidro indica o multiplicador na descrição (ex: '2x', '4x')
            // Vamos extrair o multiplicador da descrição:
            const qtd_pecas = Number(regra.nome_vidro.match(/\((\d)x\)/)?.[1] || 1) // (2x) -> 2
            
            const quantidade_total = area_m2_por_peca * qtd_pecas
            
            itensCalculados.push({
                nome_item: regra.nome_vidro,
                unidade: 'm2',
                quantidade: quantidade_total,
                preco_unitario: estoque.preco_unitario,
                custo_total: quantidade_total * estoque.preco_unitario,
                detalhe_formula: `L=${regra.largura_formula} (${largura_corte}), H=${regra.altura_formula} (${altura_corte}). Qtd: ${qtd_pecas}`
            })
        })

        // 2. CÁLCULO DE PERFIS (em metros)
        tipologia.regras_perfil.forEach(regra => {
            const estoque = MOCK_ESTOQUE.find(i => i.id === regra.perfil_id && i.tipo === 'perfil')
            if (!estoque) return

            const dimensao_corte = parseFormula(regra.dimensao_formula, L, H, unidade)
            
            // Quantidade em metros (converte mm para m)
            const dim_metros = dimensao_corte / (unidade === 'mm' ? 1000 : unidade === 'cm' ? 100 : 1)
            
            const quantidade_total = dim_metros * regra.multiplicador
            
            itensCalculados.push({
                nome_item: `${regra.nome_perfil} (${regra.perfil_id})`,
                unidade: 'm',
                quantidade: quantidade_total,
                preco_unitario: estoque.preco_unitario,
                custo_total: quantidade_total * estoque.preco_unitario,
                detalhe_formula: `${regra.dimensao_formula} (${dimensao_corte}) x ${regra.multiplicador} peças`
            })
        })

        // 3. CÁLCULO DE KITS E FERRAGENS (em peças)
        tipologia.regras_contagem.forEach(regra => {
            const estoque = MOCK_ESTOQUE.find(i => i.id === regra.item_id && (i.tipo === 'kit' || i.tipo === 'ferragem'))
            if (!estoque) return

            const quantidade_total = regra.multiplicador
            
            itensCalculados.push({
                nome_item: `${regra.nome_item} (${regra.tipo_item})`,
                unidade: 'peça',
                quantidade: quantidade_total,
                preco_unitario: estoque.preco_unitario,
                custo_total: quantidade_total * estoque.preco_unitario,
                detalhe_formula: `Multiplicador: ${regra.multiplicador} peças`
            })
        })

        return itensCalculados
    }

    // Recalcula sempre que as dimensões mudam
    useMemo(() => {
        setResultados(calcularItens(L_TOTAL, H_TOTAL, tipologiaExemplo))
    }, [L_TOTAL, H_TOTAL])

    const custoTotalProjeto = resultados.reduce((acc, item) => acc + item.custo_total, 0)
    
    // Simula a conversão da unidade para display
    const unidadeDisplay = tipologiaExemplo.unidade_medida.toUpperCase()

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
            
            {/* Barra do Topo */}
            <div className="flex justify-between items-center mb-8 mt-2 px-2">
                <button
                    onClick={() => window.location.href = "/"}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
                    style={{ backgroundColor: theme.secondary, color: theme.primary }}
                >
                    <Home className="w-5 h-5 text-white" />
                    Home
                </button>
            </div>

            <h1 className="text-3xl font-bold mb-2 text-center">Orçamento Rápido</h1>
            <p className="text-center mb-6 text-gray-600">Tipologia: **{tipologiaExemplo.nome}**</p>

            {/* Input de Dimensões */}
            <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-lg mx-auto mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-[#1C415B]" /> Dimensões do Vão ({unidadeDisplay})
                </h2>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Largura Total (L_{unidadeDisplay})</label>
                        <input
                            type="number"
                            value={L_TOTAL}
                            onChange={e => setL_TOTAL(Number(e.target.value))}
                            className="w-full p-3 border rounded-lg focus:ring-2"
                            style={{ borderColor: theme.border, outlineColor: theme.secondary }}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Altura Total (H_{unidadeDisplay})</label>
                        <input
                            type="number"
                            value={H_TOTAL}
                            onChange={e => setH_TOTAL(Number(e.target.value))}
                            className="w-full p-3 border rounded-lg focus:ring-2"
                            style={{ borderColor: theme.border, outlineColor: theme.secondary }}
                        />
                    </div>
                </div>
            </div>
            
            {/* Resumo do Orçamento */}
            <div className="w-full max-w-4xl mx-auto mb-8">
                <div className="bg-[#1C415B] text-white p-4 rounded-2xl shadow-xl flex justify-between items-center">
                    <h3 className="text-2xl font-light flex items-center gap-3">
                        <DollarSign className="w-6 h-6" /> Custo Total (Materiais)
                    </h3>
                    <p className="text-4xl font-extrabold">{formatarPreco(custoTotalProjeto)}</p>
                </div>
            </div>


            {/* Tabela de Resultados */}
            <h2 className="text-2xl font-semibold mb-4 w-full max-w-4xl mx-auto flex items-center gap-2">
                <Zap className="w-6 h-6 text-[#1C415B]" /> Lista de Itens Calculados
            </h2>
            <div className="overflow-x-auto rounded-lg shadow-md w-full max-w-4xl mx-auto">
                <table className="w-full text-left border-collapse">
                    <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
                        <tr>
                            <th className="p-3">Item</th>
                            <th className="p-3">Un.</th>
                            <th className="p-3 text-right">Qtd. Total</th>
                            <th className="p-3 text-right">Preço Un.</th>
                            <th className="p-3 text-right">Custo</th>
                            <th className="p-3">Fórmula Aplicada</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resultados.map((item, index) => (
                            <tr key={index} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border }}>
                                <td className="p-3 font-medium">{item.nome_item}</td>
                                <td className="p-3 uppercase">{item.unidade}</td>
                                <td className="p-3 text-right">{item.quantidade.toFixed(item.unidade === 'peça' ? 0 : 3)}</td>
                                <td className="p-3 text-right">{formatarPreco(item.preco_unitario)}</td>
                                <td className="p-3 text-right font-bold">{formatarPreco(item.custo_total)}</td>
                                <td className="p-3 text-sm text-gray-500">{item.detalhe_formula}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    )
}