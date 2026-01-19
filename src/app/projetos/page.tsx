"use client";

import React, { useState, useEffect, useRef } from 'react';
// Using lucide-react icons
import { Home, Save, Ruler, Image, Feather, PlusCircle, X, Loader2, GripVertical, GlassWater, List } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient' // Assumindo que este import é válido

type Kit = {
    id: number | string
    nome: string
    codigo?: string
    cores?: string
    preco?: number
};

// Estruturas de Vidro e Regras
type Regra = {
    id: string;
    dimensao: 'Largura' | 'Altura';
    condicao: string;
    formula: string;
    descricao: string;
}

type Vidro = { 
    id: string; 
    nome: string; 
    regras: Regra[];
};

type Atributo = {
    id: string;
    chave: string;
    valor: string;
}

// --- DEFINIÇÃO DE CORES DA MARCA ---
const theme = { 
    primary: "#1C415B",     // Dark Blue (Main Actions, Titles, Main Text)
    secondary: "#92D050",   // Lime Green (Highlights, Home Button)
    text: "#1C415B",        // Dark Blue for text
    background: "#FDFDFD",  // Very light background
    border: "#F2F2F2",      // Light border
    cardBg: "#FFFFFF",
};

// Glass Rule Advanced Structure
const initialVidro: Vidro = { // Tipagem adicionada aqui
    id: 'v1', 
    nome: 'Folha de Vidro Principal', 
    regras: [
        { 
            id: 'r1', 
            dimensao: 'Largura', 
            condicao: 'default', 
            formula: 'L_Vao', 
            descricao: 'Medida base (sem folga)'
        },
        { 
            id: 'r2', 
            dimensao: 'Altura', 
            condicao: 'default', 
            formula: 'A_Vao', 
            descricao: 'Medida base (sem folga)'
        },
    ]
};

// A função carregarKits não estava sendo usada no useEffect principal, foi removida para evitar confusão com fetchMateriais.

interface MaterialSelectorProps {
    title: string;
    materialType: 'perfis' | 'kits' | 'ferragens';
    allMaterials: Kit[]; 
    selectedMaterials: Kit[];
    // Tipagem mais específica para handleSelect/handleRemove
    handleSelect: (materialType: 'perfis' | 'kits' | 'ferragens', id: number | string) => void;
    handleRemove: (materialType: 'perfis' | 'kits' | 'ferragens', id: number | string) => void;
    theme: typeof theme;
}

// Componente Auxiliar para Seleção de Materiais SIMPLES (Perfis, Kits e Ferragens)
const MaterialSelector: React.FC<MaterialSelectorProps> = ({ title, materialType, allMaterials, selectedMaterials, handleSelect, handleRemove, theme }) => (
    <div>
        <h3 className="text-lg font-semibold mb-3" style={{ color: theme.secondary }}>{title}</h3>
        <div className="border p-3 rounded-xl min-h-[150px] space-y-2" style={{ borderColor: theme.border }}>
            
            {/* Confirmação visual de quantos itens cadastrados foram carregados */}
            <p className="text-xs font-medium mb-3 p-1 rounded" style={{ color: theme.primary, backgroundColor: allMaterials.length > 0 ? '#E8F5E9' : theme.border }}>
                Catálogo: {allMaterials.length} itens cadastrados
            </p>

            {/* Lista de Itens Selecionados no Projeto */}
            {selectedMaterials.length > 0 ? (
                selectedMaterials.map(item => (
                    // Convertendo item.id para string, pois o key espera string ou number
                    <div key={String(item.id)} className="flex justify-between items-center bg-gray-100 p-2 rounded-lg border-l-4" style={{ borderColor: theme.primary }}>
                        <div className="flex flex-col flex-grow truncate">
                            <span className="truncate font-medium">{item.nome || item.codigo || 'Item Sem Nome'}</span>
                            {/* Adiciona informação extra para ferragens e kits */}
                            <span className="text-xs text-gray-500">
                                {item.codigo} 
                                {item.cores ? ` (${item.cores})` : ''}
                                {item.preco ? ` | Preço: ${item.preco}` : ''}
                            </span>
                        </div>
                        {/* Chamada para handleRemove: ID tipado como number | string */}
                        <button onClick={() => handleRemove(materialType, item.id)} title="Remover" className="p-1 hover:bg-gray-200 rounded transition"><X className="w-4 h-4 text-red-500" /></button>
                    </div>
                ))
            ) : (
                <p className="text-gray-500 text-sm italic">Nenhum {title.toLowerCase()} adicionado ao projeto.</p>
            )}
            
            {/* Dropdown Selector (Mostra itens cadastrados no banco de dados) */}
           <select 
                value="" // Sempre mostra o placeholder
                // Chamada para handleSelect: e.target.value é sempre string, precisa ser tratado na função pai
                onChange={e => handleSelect(materialType, e.target.value)}
                className="mt-2 p-2 rounded border w-full text-sm bg-white"
                style={{ borderColor: theme.border }}
            >
                <option value="" disabled>+ Adicionar {title.split(' ')[0]}...</option>
                {allMaterials.map(item => <option key={String(item.id)} value={item.id}>{item.nome} ({item.codigo})</option>)}
            </select>
                                </div>
    </div>
);

// Componente Principal
const CadastroProjeto = () => {
    const userId = 'user-real-001'; // Substituir depois com Auth
    const [isLoading, setIsLoading] = useState(true);
    // NOVO ESTADO: Mensagem de confirmação de carregamento
    const [loadMessage, setLoadMessage] = useState(''); 

    // --- ESTADOS DO PROJETO ---
    const [nomeProjeto, setNomeProjeto] = useState('');
    const [tipoProjeto, setTipoProjeto] = useState('Perfis'); 
    // Atributos agora tipados como Atributo[]
    const [atributosProjeto, setAtributosProjeto] = useState<Atributo[]>([
        { id: 'a1', chave: 'trilho', valor: 'aparente' }
    ]);
    // Vidros agora tipados como Vidro[]
    const [vidros, setVidros] = useState<Vidro[]>([initialVidro]); 

    // Materiais selecionados para este projeto
    const [perfisSelecionados, setPerfisSelecionados] = useState<Kit[]>([]);
    const [kitsSelecionados, setKitsSelecionados] = useState<Kit[]>([]);
    const [ferragensSelecionadas, setFerragensSelecionadas] = useState<Kit[]>([]);
    
    const [desenhoUrl, setDesenhoUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Todos os materiais disponíveis
    const [todosPerfis, setTodosPerfis] = useState<Kit[]>([]);
    const [todosKits, setTodosKits] = useState<Kit[]>([]);
    const [todosFerragens, setTodosFerragens] = useState<Kit[]>([]);

    const [desenhoFile, setDesenhoFile] = useState<File | null>(null);


    const fetchMateriais = async () => {
    try {
        setIsLoading(true);

        // Assumindo que Perfis, Kits e Ferragens são compatíveis com o tipo Kit para o MaterialSelector
        // Se suas tabelas 'perfis' e 'ferragens' tiverem campos diferentes, você deve criar um mapper.
        
        const { data: perfis, error: errPerfis } = await supabase.from('perfis').select('*');
        if (errPerfis) throw errPerfis;
        setTodosPerfis((perfis as Kit[]) || []); // Cast para Kit[]

        const { data: kits, error: errKits } = await supabase.from('kits').select('*');
        if (errKits) throw errKits;
        setTodosKits((kits as Kit[]) || []); // Cast para Kit[]

        const { data: ferragens, error: errFerragens } = await supabase.from('ferragens').select('*');
        if (errFerragens) throw errFerragens;
        setTodosFerragens((ferragens as Kit[]) || []); // Cast para Kit[]

        setLoadMessage(`Catálogos carregados com ${perfis?.length || 0} perfis, ${kits?.length || 0} kits e ${ferragens?.length || 0} ferragens.`);

        } catch (error) {
            console.error("Erro ao buscar materiais:", error);
            setLoadMessage(`Erro ao carregar catálogos: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Efeito: Busca materiais ao montar o componente
    useEffect(() => {
        fetchMateriais();
        // Limpa a mensagem de sucesso/erro após 5 segundos
        const timer = setTimeout(() => setLoadMessage(''), 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
    return () => {
        if (desenhoUrl) URL.revokeObjectURL(desenhoUrl);
    };
    }, [desenhoUrl]);
    
    // Função para salvar o projeto no banco de dados simulado
    const handleSalvarProjeto = async () => {
        if (!nomeProjeto.trim()) {
            console.error("O nome do projeto é obrigatório.");
            alert("O nome do projeto é obrigatório!"); // Feedback visual para o usuário
            return;
        }

        setIsSaving(true);
        setLoadMessage('');

        const projectData = {
            user_id: userId, 
            nome: nomeProjeto,
            tipo: tipoProjeto, 
            // O Supabase espera dados JSON/JSONB para atributos e vidros (se for este o tipo da coluna)
            atributos: atributosProjeto,
            vidros: vidros,      
            // Salvando apenas IDs - O ID deve ser tratado como number | string, o Supabase geralmente trata o array de IDs.
            materiais_perfis: perfisSelecionados.map(p => p.id), 
            materiais_kits: kitsSelecionados.map(k => k.id),     
            materiais_ferragens: ferragensSelecionadas.map(f => f.id), 
            desenho_url: desenhoUrl,
            created_at: new Date().toISOString(),
        };

        try {
            const projetosTable = supabase.from('projetos'); 
            const { error } = await projetosTable.insert([projectData]);
            
            if (error) {
                throw error;
            }
            
            console.log("Projeto salvo com sucesso!");
            setLoadMessage("Projeto salvo com sucesso!");
            
        } catch (error) {
            console.error("Erro ao salvar o projeto no Supabase:", error);
            setLoadMessage(`Erro ao salvar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        } finally {
            setIsSaving(false);
            // Re-fetch para demonstrar que a lista de projetos pode ter mudado (Opcional, mas útil)
            // fetchMateriais(); 
        }
    };

    
    // --- LÓGICAS DE ATRIBUTO, VIDRO E MATERIAL ---

    // Lógica de Atributo (Chave/Valor)
    const handleAdicionarAtributo = () => {
        const newId = `a${Date.now()}`;
        setAtributosProjeto([...atributosProjeto, { id: newId, chave: '', valor: '' }]);
    };

    // CORREÇÃO: Tipagem do ID como string
    const handleRemoverAtributo = (id: string) => { 
        setAtributosProjeto(atributosProjeto.filter(attr => attr.id !== id));
    };

    const handleAtributoChange = (id: string, field: 'chave' | 'valor', value: string) => {
        setAtributosProjeto(atributosProjeto.map(attr => 
            attr.id === id ? { ...attr, [field]: value } : attr
        ));
    };

    
    // Lógica de Vidro e Regras
    const handleAdicionarVidro = () => {
        const newId = `v${Date.now()}`;
        setVidros([...vidros, { 
            id: newId, 
            nome: `Novo Vidro ${vidros.length + 1}`,
            regras: [
                 { id: `r${Date.now()}L`, dimensao: 'Largura', condicao: 'default', formula: 'L_Vao', descricao: 'Medida base' },
                 { id: `r${Date.now()}A`, dimensao: 'Altura', condicao: 'default', formula: 'A_Vao', descricao: 'Medida base' }
            ]
        }]);
    };

    // CORREÇÃO: Tipagem do ID como string
    const handleRemoverVidro = (id: string) => {
        setVidros(vidros.filter(v => v.id !== id));
    };
    
    const handleAdicionarRegra = (vidroId: string) => {
        setVidros(vidros.map(v => {
            if (v.id === vidroId) {
                return {
                    ...v,
                    regras: [...v.regras, {
                        id: `r${Date.now()}`,
                        dimensao: 'Largura', 
                        condicao: '', 
                        formula: '',
                        descricao: 'Nova Condição'
                    }]
                };
            }
            return v;
        }));
    };

    const handleRemoverRegra = (vidroId: string, regraId: string) => {
        setVidros(vidros.map(v => {
            if (v.id === vidroId) {
                return {
                    ...v,
                    regras: v.regras.filter(r => r.id !== regraId)
                };
            }
            return v;
        }));
    };

    const handleRegraChange = (vidroId: string, regraId: string, field: 'dimensao' | 'condicao' | 'formula' | 'descricao', value: string) => { 
        setVidros(vidros.map(v => {
            if (v.id === vidroId) {
                return {
                    ...v,
                    regras: v.regras.map(r => r.id === regraId ? { ...r, [field]: value } : r)
                };
            }
            return v;
        }));
    };
    
    // Lógicas de Seleção de Material (Unificada para Perfis, Kits e Ferragens)
    // CORREÇÃO: Tipagem do retorno da função
    const getMaterialLists = (type: 'perfis' | 'kits' | 'ferragens'): [Kit[], Kit[], React.Dispatch<React.SetStateAction<Kit[]>>] => {
        if (type === 'perfis') return [todosPerfis, perfisSelecionados, setPerfisSelecionados];
        if (type === 'kits') return [todosKits, kitsSelecionados, setKitsSelecionados];
        if (type === 'ferragens') return [todosFerragens, ferragensSelecionadas, setFerragensSelecionadas]; 
        return [[], [], () => {}];
    };


    const handleMaterialSelect = (materialType: 'perfis' | 'kits' | 'ferragens', newId: number | string) => {
        // newId vindo do <select> é sempre string, mas o tipo Kit.id é number | string.
        // A conversão implícita na comparação `item.id === newId` pode funcionar em JS, mas é melhor garantir a tipagem do ID.

        const [all, selected, setSelected] = getMaterialLists(materialType);
        
        // CORREÇÃO: Garantir que o ID é comparável, transformando newId em string (se for string) e comparando com o item.id (que pode ser string ou number)
        const material = all.find(item => String(item.id) === String(newId));
        
        if (!material) return;
        if (selected.some(item => String(item.id) === String(newId))) return; // já existe

        setSelected([...selected, material]);
    };

    // CORREÇÃO: Tipagem dos parâmetros
    const handleMaterialRemove = (materialType: 'perfis' | 'kits' | 'ferragens', id: number | string) => {
        const [_, selected, setSelected] = getMaterialLists(materialType);
        // CORREÇÃO: Usar String(id) para garantir a comparação correta
        setSelected(selected.filter(item => String(item.id) !== String(id)));
    };


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
                <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.primary }} />
                <p className="mt-2 font-semibold" style={{ color: theme.text }}>Carregando catálogos...</p>
            </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
            
            <div className="max-w-7xl mx-auto">
                
                {/* CABEÇALHO E BARRA SUPERIOR DE AÇÕES */}
                <div className="flex justify-between items-center mb-6 sticky top-0 z-10 p-2 -mx-4 sm:-mx-6" style={{ backgroundColor: theme.background }}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => (window.location.href = "/")}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow hover:opacity-90 transition"
                            style={{ backgroundColor: theme.secondary, color: theme.primary }}
                        >
                            <Home className="w-5 h-5" />
                            <span className="hidden md:inline">Home</span>
                        </button>
                        <h1 className="text-xl sm:text-2xl font-bold">Cadastro de Projeto</h1>
                    </div>
                    
                    {/* Botão Salvar */}
                    <button
                        onClick={handleSalvarProjeto}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white shadow-md"
                        style={{ backgroundColor: theme.primary }}
                        disabled={isSaving || !nomeProjeto.trim()} // Desabilita se estiver salvando ou sem nome
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSaving ? "A Salvar..." : "Salvar Projeto"}
                    </button>
                </div>
                
                {/* INFORMAÇÕES DO USUÁRIO */}
                <div className="text-sm italic text-right mb-4" style={{ color: theme.text }}>
                    ID do Utilizador (Simulado): {userId}
                </div>

                {/* VISUAL CONFIRMATION MESSAGE */}
                {loadMessage && (
                    <div 
                        className={`border-l-4 p-4 mb-4 rounded-xl shadow-md transition-opacity duration-500 ${
                            loadMessage.startsWith('Erro') 
                                ? 'bg-red-100 border-red-500 text-red-700' 
                                : 'bg-green-100 border-green-500 text-green-700'
                        }`} 
                        role="alert"
                    >
                        <p className="font-bold">{loadMessage.startsWith('Erro') ? 'Erro!' : 'Sucesso!'}</p>
                        <p>{loadMessage}</p>
                    </div>
                )}


                {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS, TIPO E ATRIBUTOS */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: theme.primary }}><Image className="w-5 h-5" /> Dados Fundamentais do Projeto</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* COLUNA 1: Nome, Tipo e Desenho */}
                        <div className="space-y-4">
                            {/* NOME E TIPO DE PROJETO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* CAMPO NOME */}
                                <div>
                                    <label className="block font-medium mb-1">Nome do Projeto <span style={{ color: theme.secondary }}>(Obrigatório)</span></label>
                                    <input
                                        type="text"
                                        value={nomeProjeto}
                                        onChange={e => setNomeProjeto(e.target.value)}
                                        className="p-3 rounded-xl border w-full text-base focus:outline-none focus:ring-2"
                                        style={{ borderColor: theme.border, '--tw-ring-color': theme.primary } as React.CSSProperties} // Adicionado as React.CSSProperties
                                        placeholder="Ex: Box Padrão 8mm"
                                    />
                                </div>

                                {/* TIPO DE PROJETO */}
                                <div>
                                    <label className="block font-medium mb-1">Tipo de Construção</label>
                                    <select
                                        value={tipoProjeto}
                                        onChange={e => setTipoProjeto(e.target.value)}
                                        className="p-3 rounded-xl border w-full text-base focus:outline-none focus:ring-2"
                                        style={{ borderColor: theme.border, '--tw-ring-color': theme.primary } as React.CSSProperties}
                                    >
                                        <option value="Perfis">1. Montagem com Perfis</option>
                                        <option value="Kits">2. Uso de Kits Fechados</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1 italic">Define a lógica de materiais.</p>
                                </div>
                            </div>

                            {/* ÁREA DE DESENHO/IMAGEM (URL) */}
                            <div>
                            <label className="block font-medium mb-1">Selecionar Desenho do Computador</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                    setDesenhoFile(e.target.files[0]);
                                    setDesenhoUrl(URL.createObjectURL(e.target.files[0])); // preview
                                }
                                }}
                                className="p-2 rounded border w-full"
                                style={{ borderColor: theme.border }}
                            />

                            {/* BLOCO DE PRÉ-VISUALIZAÇÃO */}
                            {desenhoUrl ? (
                                <img
                                src={desenhoUrl}
                                onError={(e) =>
                                    (e.currentTarget.src =
                                    "https://placehold.co/100x20/A0A0A0/FFFFFF?text=URL+Inválida")
                                }
                                alt="Pré-visualização do Desenho"
                                className="mt-2 max-h-24 object-contain rounded shadow"
                                />
                            ) : (
                                <p className="text-gray-500 text-sm mt-1 italic">
                                Selecione um arquivo para pré-visualizar seu desenho.
                                </p>
                            )}
                            </div>

                        </div>

                        {/* COLUNA 2: ATRIBUTOS VARIÁVEIS */}
                        <div className="bg-gray-50 p-4 rounded-xl border" style={{ borderColor: theme.border }}>
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: theme.primary }}>
                                <List className="w-4 h-4" /> Variáveis de Contexto (Usadas em Regras)
                            </h3>
                            <p className="text-xs text-gray-500 mb-3">Defina Chave/Valor para suas condições (Ex: `trilho: aparente`, `ferragem: inox`).</p>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {atributosProjeto.map((attr, index) => (
                                    <div key={attr.id} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={attr.chave}
                                            onChange={e => handleAtributoChange(attr.id, 'chave', e.target.value)}
                                            className="p-2 rounded border w-1/2 text-sm font-semibold"
                                            placeholder="Chave (Ex: trilho)"
                                            style={{ borderColor: theme.border }}
                                        />
                                        <input
                                            type="text"
                                            value={attr.valor}
                                            onChange={e => handleAtributoChange(attr.id, 'valor', e.target.value)}
                                            className="p-2 rounded border w-1/2 text-sm"
                                            placeholder="Valor (Ex: aparente)"
                                            style={{ borderColor: theme.border }}
                                        />
                                        <button 
                                            onClick={() => handleRemoverAtributo(attr.id)} // ID tipado
                                            className="p-1 text-red-500 hover:bg-red-100 rounded-full transition"
                                            title="Remover Atributo"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleAdicionarAtributo}
                                className="flex items-center gap-1 px-3 py-1 text-xs mt-3 rounded-xl font-medium transition hover:bg-gray-200"
                                style={{ color: theme.primary, border: `1px dashed ${theme.primary}` }}
                            >
                                <PlusCircle className="w-3 h-3" />
                                Adicionar Variável
                            </button>
                        </div>
                    </div>
                </div>

                {/* SEÇÃO 2: REGRAS DE CÁLCULO AVANÇADAS POR VIDRO */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: theme.primary }}><Ruler className="w-5 h-5" /> Regras de Cálculo por Vidro (Folgas e Fórmulas)</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Defina as regras de cálculo (folgas) para cada folha de vidro. 
                        As fórmulas usam `L_Vao` (Largura do Vão) e `A_Vao` (Altura do Vão). As **Condições** devem referenciar as Chaves definidas nas **Variáveis de Contexto** (Ex: `trilho=="aparente"`).
                    </p>
                    
                    <div className="space-y-6">
                        {vidros.map((vidro) => (
                            <div key={vidro.id} className="p-4 border rounded-xl" style={{ borderColor: theme.border }}>
                                
                                {/* CABEÇALHO DO VIDRO */}
                                <div className="flex justify-between items-center mb-4 pb-2 border-b" style={{ borderColor: theme.border }}>
                                    <div className="flex items-center gap-2 font-bold text-lg" style={{ color: theme.primary }}>
                                        <GlassWater className="w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={vidro.nome}
                                            onChange={e => setVidros(vidros.map(v => v.id === vidro.id ? {...v, nome: e.target.value} : v))}
                                            className="font-bold text-lg p-1 rounded border-b focus:outline-none focus:ring-1"
                                            style={{ borderColor: theme.border, color: theme.primary, backgroundColor: 'transparent', width: '250px' }}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleRemoverVidro(vidro.id)} // ID tipado
                                        className="p-1 rounded-full text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                                        title="Remover Vidro"
                                        disabled={vidros.length === 1}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                {/* REGRAS DE CÁLCULO DO VIDRO */}
                                <div className="space-y-3">
                                    {vidro.regras.map((regra) => (
                                        <div key={regra.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-gray-50 p-3 rounded-lg">
                                            
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600">Dimensão</label>
                                                <select 
                                                    value={regra.dimensao}
                                                    onChange={e => handleRegraChange(vidro.id, regra.id, 'dimensao', e.target.value)}
                                                    className="p-2 rounded border w-full text-sm"
                                                    style={{ borderColor: theme.border }}
                                                >
                                                    <option value="Largura">Largura</option>
                                                    <option value="Altura">Altura</option>
                                                </select>
                                            </div>

                                            <div className="col-span-3">
                                                <label className="block text-xs font-medium text-gray-600">Condição (Opcional)</label>
                                                <input
                                                    type="text"
                                                    value={regra.condicao}
                                                    onChange={e => handleRegraChange(vidro.id, regra.id, 'condicao', e.target.value)}
                                                    className="p-2 rounded border w-full text-sm"
                                                    placeholder='Ex: trilho=="aparente" (ou "default")'
                                                    style={{ borderColor: theme.border }}
                                                />
                                            </div>
                                            
                                            <div className="col-span-5">
                                                <label className="block text-xs font-medium text-gray-600">Fórmula de Cálculo (mm)</label>
                                                <input
                                                    type="text"
                                                    value={regra.formula}
                                                    onChange={e => handleRegraChange(vidro.id, regra.id, 'formula', e.target.value)}
                                                    className="p-2 rounded border w-full text-sm font-mono"
                                                    placeholder="Ex: L_Vao - 5.5"
                                                    style={{ borderColor: theme.border }}
                                                />
                                            </div>

                                            <div className="col-span-2 flex justify-end">
                                                <button 
                                                    onClick={() => handleRemoverRegra(vidro.id, regra.id)}
                                                    className="p-2 rounded-full text-red-500 hover:bg-red-100 transition"
                                                    title="Remover Regra"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <button
                                        onClick={() => handleAdicionarRegra(vidro.id)}
                                        className="flex items-center gap-1 px-3 py-1 text-sm rounded-xl font-medium transition hover:bg-gray-100"
                                        style={{ color: theme.primary, border: `1px dashed ${theme.primary}` }}
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Adicionar Regra Condicional
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <button
                            onClick={handleAdicionarVidro}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition hover:brightness-105 shadow-md text-white"
                            style={{ backgroundColor: theme.secondary, color: theme.primary }}
                        >
                            <GripVertical className="w-5 h-5" />
                            Adicionar Nova Folha de Vidro
                        </button>
                    </div>
                </div>

                {/* SEÇÃO 3: MATERIAIS ADICIONAIS (3 COLUNAS) */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: theme.primary }}><Feather className="w-5 h-5" /> Materiais Adicionais</h2>
                    <p className="text-sm text-gray-600 mb-4">Estes materiais são puxados das tabelas Supabase (simulado) e vinculados ao projeto.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* 1. PERFIS DE ALUMÍNIO (Selector Simples) */}
                        <MaterialSelector 
                            title="Perfis de Alumínio" 
                            materialType="perfis"
                            allMaterials={todosPerfis}
                            selectedMaterials={perfisSelecionados}
                            handleSelect={handleMaterialSelect}
                            handleRemove={handleMaterialRemove}
                            theme={theme}
                        />

                        {/* 2. KITS COMPLETOS (Selector Simples) */}
                        <MaterialSelector 
                            title="Kits Completos" 
                            materialType="kits"
                            allMaterials={todosKits}
                            selectedMaterials={kitsSelecionados}
                            handleSelect={handleMaterialSelect}
                            handleRemove={handleMaterialRemove}
                            theme={theme}
                        />

                        {/* 3. FERRAGENS ESPECÍFICAS (Selector Simples) */}
                        <MaterialSelector 
                            title="Ferragens Específicas" 
                            materialType="ferragens"
                            allMaterials={todosFerragens}
                            selectedMaterials={ferragensSelecionadas}
                            handleSelect={handleMaterialSelect}
                            handleRemove={handleMaterialRemove}
                            theme={theme}
                        />

                    </div>
                </div>
                
                {/* Repetição do botão Salvar para fácil acesso ao final do formulário */}
                <div className="flex justify-end pt-4 pb-12">
                    <button
                        onClick={handleSalvarProjeto}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg"
                        style={{ backgroundColor: theme.primary }}
                        disabled={isSaving || !nomeProjeto.trim()}
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSaving ? "A Salvar..." : "Salvar Projeto"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CadastroProjeto;