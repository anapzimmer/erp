"use client"

import { useState } from "react"
import { Plus, Trash2, Settings, AlertTriangle } from "lucide-react" 
// Removi Maximize2 e Minimize2 pois não são usados, deixando apenas os imports usados.

// --- TIPOS DE DADOS DO MODELO DE PROJETO (REFINADO) ---

// Tipos para Vidro (não mudam)
type RegraVidro = {
    id: number
    nome_peca: string
    largura_formula: string 
    altura_formula: string  
    multiplicador: number   
}

// Tipo para Materiais (Perfis, Kits, Ferragens)
type TipoMaterial = 'perfil' | 'kit' | 'ferragem'

type RegraMaterial = {
    id: number
    nome_item: string       // Nome do item no projeto (ex: Roldana Superior)
    material_id: number     // ID no seu cadastro (ex: 301)
    tipo_material: TipoMaterial // Define se é calculado por comprimento ou unidade/kit
    condicao: string        // Condição lógica (Ex: L_TOTAL > 1500)
    multiplicador: number   // Quantidade (un) ou vezes que se repete (perfil)
    dimensao_formula?: string // Eixo principal (Ex: H_TOTAL) - Apenas para 'perfil'
    corte_formula?: string  // Tamanho final (Ex: L_TOTAL - 4) - Apenas para 'perfil'
}


type ProjetoTipologia = {
    nome: string
    linha: string
    imagem_url: string
    unidade_medida: 'mm' | 'cm' | 'm'
    regras_vidro: RegraVidro[]
    regras_materiais: RegraMaterial[] // RENOMEADO
}

// --- VALORES INICIAIS (SIMULANDO O EXEMPLO DO BOX CONDICIONAL) ---

const projetoInicial: ProjetoTipologia = {
    nome: "Box Frontal Padrão (Condicional)",
    linha: "Box 8mm",
    imagem_url: "",
    unidade_medida: 'mm',
    regras_vidro: [
        // Exemplo: Vidro fixo e vidro porta (com transpasse e folgas)
    ],
    regras_materiais: [
        { 
            id: 1, 
            nome_item: "Kit Box Padrão (até 1900mm)", 
            material_id: 205, 
            tipo_material: 'kit', 
            condicao: "H_TOTAL <= 1900", // Condição para usar este kit
            multiplicador: 1,
        },
        { 
            id: 2, 
            nome_item: "Kit Box Reforçado (acima de 1900mm)", 
            material_id: 206, 
            tipo_material: 'kit', 
            condicao: "H_TOTAL > 1900", // Condição para usar este kit
            multiplicador: 1,
        },
        { 
            id: 3, 
            nome_item: "Perfil U Adicional", 
            material_id: 105, 
            tipo_material: 'perfil', 
            condicao: "H_TOTAL > 1900", // Condição para incluir o perfil extra
            multiplicador: 1,
            dimensao_formula: "H_TOTAL",
            corte_formula: "H_TOTAL"
        },
    ],
}

const theme = {
    primary: "#1C415B",
    secondary: "#92D050",
    text: "#1C415B",
    background: "#FFFFFF",
    border: "#F2F2F2",
}

// --- COMPONENTE PRINCIPAL (Simplificado, focando em Materiais) ---

export default function CadastroProjeto() {
    const [projeto, setProjeto] = useState<ProjetoTipologia>(projetoInicial)
    const [materialIdCounter, setMaterialIdCounter] = useState(4)

    // Handler para Materiais (Perfis, Kits, Ferragens)
    const addRegraMaterial = () => {
        setProjeto(p => ({
            ...p,
            regras_materiais: [
                ...p.regras_materiais,
                { 
                    id: materialIdCounter, 
                    nome_item: "Novo Item Condicional", 
                    material_id: 0, 
                    tipo_material: 'perfil', 
                    condicao: "true", // Padrão: sempre aplicado
                    multiplicador: 1,
                    // Deixamos 'perfil' como padrão e não precisamos de dimensao_formula e corte_formula aqui
                    // já que são opcionais.
                } as RegraMaterial // Assegura que o tipo inicial está correto
            ]
        }))
        setMaterialIdCounter(prev => prev + 1)
    }

    // Função de correção principal
    const updateRegraMaterial = (id: number, field: keyof RegraMaterial, value: any) => {
        setProjeto(p => ({
            ...p,
            regras_materiais: p.regras_materiais.map(r => {
                if (r.id !== id) return r

                // Cria uma cópia da regra com o campo atualizado.
                let updatedRegra = { ...r, [field]: value } as RegraMaterial;

                // 1. Limpeza de Propriedades Opcionais (Fórmulas de Perfil)
                // Se o tipo_material foi alterado para algo que não seja 'perfil'
                if (field === 'tipo_material' && value !== 'perfil') {
                    // Garante que as propriedades específicas de perfil são removidas (definidas como undefined)
                    // para obedecer ao tipo RegraMaterial (que só as permite em 'perfil')
                    delete updatedRegra.dimensao_formula;
                    delete updatedRegra.corte_formula;
                }
                
                // 2. Garante que 'multiplicador' é um número válido >= 1
                if (field === 'multiplicador') {
                    const numValue = Number(value);
                    updatedRegra.multiplicador = (isNaN(numValue) || numValue < 1) ? 1 : numValue;
                }
                
                // 3. Garante que material_id é um número
                if (field === 'material_id') {
                    const numValue = Number(value);
                    updatedRegra.material_id = (isNaN(numValue) || numValue < 0) ? 0 : numValue;
                }

                // 4. Tratamento de valores vazios para fórmulas (se for 'perfil')
                if (r.tipo_material === 'perfil' && (field === 'dimensao_formula' || field === 'corte_formula')) {
                     // Se o valor for uma string vazia, define como undefined para remover a chave
                    if (value === '') {
                        delete updatedRegra[field];
                    }
                }

                return updatedRegra;
            })
        }))
    }

    const removeRegraMaterial = (id: number) => {
        setProjeto(p => ({
            ...p,
            regras_materiais: p.regras_materiais.filter(r => r.id !== id)
        }))
    }

    const handleSalvarProjeto = () => {
        console.log("Projeto a ser salvo:", projeto)
        alert("Projeto salvo/atualizado com sucesso! (Simulação)")
    }
    
    // Simplificamos a renderização, focando na Seção 3 (Materiais)

    return (
        <div className="p-6 bg-gray-100 min-h-screen" style={{ color: theme.text }}>
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Settings className="w-7 h-7" /> Cadastro de Projetos (Tipologias)
            </h1>
            
            {/* ... Seção 1 (Detalhes Básicos) e Seção 2 (Regras Vidros) omitidas para foco ... */}
            
            {/* -------------------- 3. REGRAS DE MATERIAIS (Perfis, Kits, Ferragens) -------------------- */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex justify-between items-center" style={{ borderColor: theme.border }}>
                    <span>3. Regras de Materiais (Perfis, Kits e Ferragens)</span>
                    <button onClick={addRegraMaterial} className="px-3 py-1 text-sm rounded-lg text-white font-semibold flex items-center gap-1 hover:brightness-110 transition" style={{ backgroundColor: theme.secondary }}>
                        <Plus className="w-4 h-4" /> Adicionar Item
                    </button>
                </h2>
                <div className="flex items-start bg-yellow-100/50 p-3 mb-4 rounded-lg border border-yellow-200">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-700">Use `L_TOTAL` e `H_TOTAL` nas **Fórmulas** e **Condições**. Ex: `H_TOTAL &gt; 1900` ou `L_TOTAL * 2`. Deixe a Condição como `true` para itens sempre aplicáveis.</p>
                </div>


                <div className="space-y-4">
                    {projeto.regras_materiais.map(regra => (
                        <div key={regra.id} className="p-4 border rounded-xl flex flex-wrap gap-3 items-center bg-gray-50" style={{ borderColor: theme.border }}>
                            
                            {/* Nome e ID do Material */}
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium mb-1">Item / Descrição:</label>
                                <input type="text" value={regra.nome_item} onChange={(e) => updateRegraMaterial(regra.id, 'nome_item', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                            </div>
                            
                            {/* Tipo de Material */}
                            <div className="w-24">
                                <label className="block text-xs font-medium mb-1">Tipo:</label>
                                <select value={regra.tipo_material} onChange={(e) => updateRegraMaterial(regra.id, 'tipo_material', e.target.value as TipoMaterial)} className="w-full p-2 border rounded-lg text-sm bg-white">
                                    <option value="perfil">Perfil (Barra)</option>
                                    <option value="kit">Kit (Unidade)</option>
                                    <option value="ferragem">Ferragem (Unidade)</option>
                                </select>
                            </div>

                            {/* Condição de Aplicação (NOVO) */}
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-medium mb-1">Condição (Quando Aplicar?):</label>
                                <input
                                    type="text"
                                    placeholder="Ex: H_TOTAL &gt; 1900"
                                    value={regra.condicao}
                                    onChange={(e) => updateRegraMaterial(regra.id, 'condicao', e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm bg-blue-50/50"
                                />
                            </div>
                            
                            {/* Multiplicador */}
                            <div className="w-16">
                                <label className="block text-xs font-medium mb-1">Qtd:</label>
                                {/* O valor agora é passado como Number, o tratamento de NaN e < 1 está no handler */}
                                <input type="number" min={1} value={regra.multiplicador} onChange={(e) => updateRegraMaterial(regra.id, 'multiplicador', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                            </div>
                            
                            {/* Fórmulas de Corte (Apenas para Perfil) */}
                            {regra.tipo_material === 'perfil' && (
                                <>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs font-medium mb-1">Eixo Principal:</label>
                                        <input 
                                            type="text" 
                                            value={regra.dimensao_formula || ''} // Use '' para evitar 'undefined' no input
                                            onChange={(e) => updateRegraMaterial(regra.id, 'dimensao_formula', e.target.value)} 
                                            className="w-full p-2 border rounded-lg text-sm" 
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs font-medium mb-1">Fórmula de Corte:</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: L_TOTAL - 4" 
                                            value={regra.corte_formula || ''} // Use '' para evitar 'undefined' no input
                                            onChange={(e) => updateRegraMaterial(regra.id, 'corte_formula', e.target.value)} 
                                            className="w-full p-2 border rounded-lg text-sm bg-yellow-50/50" 
                                        />
                                    </div>
                                </>
                            )}
                            
                            <button onClick={() => removeRegraMaterial(regra.id)} className="p-2 ml-2 rounded-full hover:bg-red-100 transition" title="Remover Regra">
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* -------------------- BOTÃO SALVAR -------------------- */}
            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSalvarProjeto}
                    className="px-8 py-3 rounded-xl font-bold text-white shadow-md transition hover:brightness-110 text-lg"
                    style={{ backgroundColor: theme.primary }}
                >
                    Salvar Tipologia do Projeto
                </button>
            </div>
        </div>
    )
}