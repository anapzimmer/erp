"use client"

import { useState, useRef, useEffect } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
import Sidebar from "@/components/Sidebar"
import {
  Building2, ChevronDown, Wrench, X, Trash2, Plus,
  Calculator, Sparkles, ClipboardList, Edit2 // <--- Adicione este cara aqui
} from "lucide-react"
import * as XLSX from 'xlsx';

// Funções de apoio
const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const arredondar5cm = (valor: number) => Math.ceil(valor / 50) * 50;

export default function PaginaBase() {
  const { theme } = useTheme()
  const { nomeEmpresa, user, empresaId, loading: checkingAuth } = useAuth()

  // Estados do Layout (EXATAMENTE COMO VOCÊ ENVIOU)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarExpandido, setSidebarExpandido] = useState(true)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Estados de Dados do Supabase
  const [listaClientes, setListaClientes] = useState<any[]>([])
  const [listaVidros, setListaVidros] = useState<any[]>([])
  const [listaServicos, setListaServicos] = useState<any[]>([])
  const [precosEspeciais, setPrecosEspeciais] = useState<any[]>([]);

  // Estados do Orçamento
  const [clienteId, setClienteId] = useState("")
  const [obra, setObra] = useState("")
  const [largura, setLargura] = useState("")
  const [altura, setAltura] = useState("")
  const [quantidade, setQuantidade] = useState(1)
  const [vidroSelecionado, setVidroSelecionado] = useState<any>(null)
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])

  // Edição de Modal
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<number | null>(null);
  const [mostrarModalLimpar, setMostrarModalLimpar] = useState(false);
  const larguraRef = useRef<HTMLInputElement>(null);
  const alturaRef = useRef<HTMLInputElement>(null);
  const qtdRef = useRef<HTMLInputElement>(null);
  const [quantidadeServico, setQuantidadeServico] = useState(1);
  const [mostrarModalAviso, setMostrarModalAviso] = useState(false);

  //excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itensNaoEncontrados, setItensNaoEncontrados] = useState<any[]>([]);
  const [mostrarModalAssociacao, setMostrarModalAssociacao] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Estados para seleção em massa
  const [selecionados, setSelecionados] = useState<number[]>([]);

  // Função para marcar/desmarcar todos
  const toggleTodos = () => {
    if (selecionados.length === itens.length) {
      setSelecionados([]);
    } else {
      setSelecionados(itens.map(i => i.id));
    }
  };

  // Função para alternar um item individual
  const toggleItem = (id: number) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Função para troca em massa com recálculo total
  const trocarMaterialSelecionados = (novoVidroId: string) => {
    if (!novoVidroId) return;

    const novoVidro = listaVidros.find(v => String(v.id) === String(novoVidroId));
    if (!novoVidro) return;

    // Pegamos o grupo do cliente para garantir o preço especial na troca
    const clienteObjeto = listaClientes.find(c => String(c.id) === String(clienteId));
    const grupoIdDoCliente = clienteObjeto?.tabela_id || clienteObjeto?.grupo_preco_id;

    setItens(prev => prev.map(item => {
      if (selecionados.includes(item.id)) {
        // 1. Identificar o preço (Especial ou Padrão) para o NOVO vidro
        const precoEspecial = precosEspeciais.find(p =>
          String(p.vidro_id) === String(novoVidro.id) &&
          String(p.grupo_preco_id || p.tabela_id) === String(grupoIdDoCliente)
        );
        const precoVidroM2 = precoEspecial ? Number(precoEspecial.preco) : Number(novoVidro.preco);

        // 2. Extrair medidas do item atual (usando a medida de cálculo salva no item)
        // Exemplo de item.medidaCalc: "1000x1500 mm"
        const [lCalc, aCalc] = item.medidaCalc.replace(" mm", "").split('x').map(Number);

        // 3. Refazer o cálculo de área
        const areaM2 = (lCalc / 1000) * (aCalc / 1000);
        const areaCobrada = areaM2 < 0.25 ? 0.25 : areaM2;

        // 4. Calcular novos valores
        const novoValorVidroTotal = areaCobrada * precoVidroM2;
        const totalAntigoPorPeca = item.total / item.qtd;
        const novoTotalUnitario = novoValorVidroTotal + (item.valorServicoUn || 0);

        return {
          ...item,
          descricao: `${novoVidro.nome} ${novoVidro.espessura || ''}`,
          vidro_id: novoVidro.id,
          total: novoTotalUnitario * item.qtd
        };
      }
      return item;
    }));

    setSelecionados([]); // Limpa seleção após a troca
  };

  const router = { push: (url: string) => console.log(url) }
  const handleLogout = () => console.log("logout")

  const handleEditarItem = (item: any) => {
    setEditandoId(item.id); // Salva o ID para sabermos que é uma edição

    const [l, a] = item.medidaCalc.split('x');
    setLargura(l.replace(/\D/g, '')); // Pega só os números
    setAltura(a.replace(/\D/g, ''));
    setQuantidade(item.qtd);

    const vidro = listaVidros.find(v => item.descricao.includes(v.nome));
    if (vidro) setVidroSelecionado(vidro);

    const servico = listaServicos.find(s => s.nome === item.servico);
    setServicoSelecionado(servico || null);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    async function carregarDados() {
      if (checkingAuth || !empresaId) return;

      try {
        const [resC, resV, resS, resP] = await Promise.all([
          supabase.from('clientes').select('*').eq('empresa_id', empresaId).order('nome'),
          supabase.from('vidros').select('*').eq('empresa_id', empresaId).order('nome'),
          supabase.from('servicos').select('*').eq('empresa_id', empresaId).order('nome'),
          // Busca a tabela de vínculos de preços especiais
          supabase.from('vidro_precos_grupos').select('*').eq('empresa_id', empresaId)
        ]);

        if (resC.data) setListaClientes(resC.data);
        if (resV.data) {
          setListaVidros(resV.data);
          if (resV.data.length > 0) setVidroSelecionado(resV.data[0]);
        }
        if (resS.data) setListaServicos(resS.data);
        if (resP.data) setPrecosEspeciais(resP.data); // Salva os preços especiais aqui

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    }
    carregarDados();
  }, [empresaId, checkingAuth]);

  // 3. Adicione esta trava de segurança antes do return principal
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1e3a5a]"></div>
      </div>
    );
  }
  const adicionarItem = () => {
    const l = parseFloat(largura);
    const a = parseFloat(altura);

    if (!l || !a || !vidroSelecionado) {
      setMostrarModalAviso(true);
      return;
    }

    const clienteObjeto = listaClientes.find(c => String(c.id) === String(clienteId));
    const grupoIdDoCliente = clienteObjeto?.tabela_id || clienteObjeto?.grupo_preco_id;

    const precoEspecial = precosEspeciais.find(p =>
      String(p.vidro_id) === String(vidroSelecionado.id) &&
      String(p.grupo_preco_id || p.tabela_id) === String(grupoIdDoCliente)
    );

    const precoVidroM2 = precoEspecial ? Number(precoEspecial.preco) : Number(vidroSelecionado.preco);

    const lCalc = arredondar5cm(l);
    const aCalc = arredondar5cm(a);
    const areaM2 = (lCalc / 1000) * (aCalc / 1000);
    const areaCobrada = areaM2 < 0.25 ? 0.25 : areaM2;

    const valorTotalVidro = areaCobrada * precoVidroM2;

    let valorServicoTotal = 0;
    let detalheServico = "";

    if (servicoSelecionado) {
      const precoUnitarioServico = Number(servicoSelecionado.preco);
      const unidade = servicoSelecionado.unidade?.toLowerCase();

      if (unidade === 'm²') {
        valorServicoTotal = areaCobrada * precoUnitarioServico;
        detalheServico = `${servicoSelecionado.nome} (m²)`;
      }
      else if (unidade === 'ml' || unidade === 'm') {
        // Se for ml, usamos a quantidadeServico que o usuário digitou ou o perímetro
        // Como você pediu para "pedir", usaremos a quantidadeServico
        valorServicoTotal = quantidadeServico * precoUnitarioServico;
        detalheServico = `${servicoSelecionado.nome} (${quantidadeServico}ml)`;
      }
      else {
        // UNITÁRIO / CNC
        valorServicoTotal = precoUnitarioServico * quantidadeServico;
        detalheServico = `${servicoSelecionado.nome} (${quantidadeServico}un)`;
      }
    }

    const totalPorPeca = valorTotalVidro + valorServicoTotal;
    const novoItem = {
      id: editandoId || Date.now(),
      descricao: `${vidroSelecionado.nome} ${vidroSelecionado.espessura || ''}`,
      tipo: vidroSelecionado.tipo,
      medidaReal: `${l}x${a} mm`,
      medidaCalc: `${lCalc}x${aCalc} mm`,
      qtd: quantidade,
      servico: detalheServico,
      valorServicoUn: valorServicoTotal,
      total: totalPorPeca * quantidade
    };

    if (editandoId) {
      setItens(itens.map(i => i.id === editandoId ? novoItem : i));
      setEditandoId(null);
    } else {
      setItens([...itens, novoItem]);
    }

    setLargura("");
    setAltura("");
    setQuantidade(1);
    setQuantidadeServico(1); // Reseta o CNC
    setTimeout(() => larguraRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Lógica de "pulo" de campo
      if (document.activeElement === larguraRef.current) {
        alturaRef.current?.focus();
      } else if (document.activeElement === alturaRef.current) {
        qtdRef.current?.focus();
      } else {
        adicionarItem();
        setTimeout(() => larguraRef.current?.focus(), 50);
      }
    }
  };

  const processarArquivoExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(ws);

      const pendentesParaAssociar: any[] = [];
      const novosItensProcessados: any[] = [];

      data.forEach((linha) => {
        // Inteligência de Colunas
        const nomeExcel = extrairValor(linha, ["vidro", "descrição", "descriçao", "material", "cor", "item"]);
        const l = parseFloat(extrairValor(linha, ["largura", "larg", "l", "lar"]) || 0);
        const a = parseFloat(extrairValor(linha, ["altura", "alt", "a"]) || 0);
        const qtd = parseInt(extrairValor(linha, ["quantidade", "qntde", "qnt", "qtd", "q"]) || 1);

        if (!nomeExcel || !l || !a) return; // Pula linhas vazias

        // Busca exata no banco
        const vidroNoBanco = listaVidros.find(v =>
          v.nome.toLowerCase().trim() === nomeExcel.toString().toLowerCase().trim()
        );

        const dadosBase = { nomeExcel, l, a, qtd };

        if (vidroNoBanco) {
          // Se achou, já calcula e adiciona
          novosItensProcessados.push(gerarObjetoItem(vidroNoBanco, l, a, qtd));
        } else {
          // Se não achou, vai para a "fila de espera" do modal
          pendentesParaAssociar.push(dadosBase);
        }
      });

      if (novosItensProcessados.length > 0) {
        setItens(prev => [...prev, ...novosItensProcessados]);
      }

      if (pendentesParaAssociar.length > 0) {
        setItensNaoEncontrados(pendentesParaAssociar);
        setMostrarModalAssociacao(true);
      }

      if (e.target) e.target.value = "";
    };

    reader.readAsBinaryString(file);
  };

  // Função auxiliar para criar o item com seus cálculos (Arredondamento 5cm)
  const gerarObjetoItem = (vidro: any, l: number, a: number, qtd: number) => {
    const lCalc = arredondar5cm(l);
    const aCalc = arredondar5cm(a);
    const areaM2 = (lCalc / 1000) * (aCalc / 1000);
    const areaCobrada = areaM2 < 0.25 ? 0.25 : areaM2;

    const clienteAtual = listaClientes.find(c => String(c.id) === String(clienteId));
    const grupoId = clienteAtual?.tabela_id || clienteAtual?.grupo_preco_id;

    const especial = precosEspeciais.find(p =>
      String(p.vidro_id) === String(vidro.id) && String(p.grupo_preco_id) === String(grupoId)
    );
    const precoM2 = especial ? Number(especial.preco) : Number(vidro.preco);

    const novoId = window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now() + Math.random();

    return {
      id: novoId, // ID temporário
      descricao: `${vidro.nome} ${vidro.espessura || ''}`,
      tipo: vidro.tipo,
      medidaReal: `${l}x${a} mm`,
      medidaCalc: `${lCalc}x${aCalc} mm`,
      qtd: qtd,
      total: (areaCobrada * precoM2) * qtd
    };
  };

  const extrairValor = (linha: any, variações: string[]) => {
    const chaveEncontrada = Object.keys(linha).find(chave =>
      variações.some(v => chave.toLowerCase().trim() === v.toLowerCase())
    );
    return chaveEncontrada ? linha[chaveEncontrada] : null;
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>

      {/* SIDEBAR - PADRÃO ORIGINAL */}
      <div className={`${sidebarExpandido ? "w-64" : "w-20"} transition-all duration-300 hidden md:flex flex-col border-r border-gray-100 flex-shrink-0 sticky top-0 h-screen`} style={{ backgroundColor: theme.menuBackgroundColor }}>
        <Sidebar showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} nomeEmpresa={nomeEmpresa} expandido={sidebarExpandido} setExpandido={setSidebarExpandido} />
      </div>

      <div className="flex-1 flex flex-col w-full min-w-0">

        {/* HEADER - PADRÃO ORIGINAL RESTAURADO */}
        <header className="border-b border-gray-100 py-4 px-6 flex items-center justify-between sticky top-0 z-30 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none">Orçamento</h1>
              <span className="text-xs text-gray-300 font-medium"># {Date.now().toString().slice(-6)}</span>
            </div>

            {/* ÁREA DE AÇÕES DISCRETAS */}
            {itens.length > 0 && (
              <div className="ml-6 flex items-center gap-3 animate-fade-in">
                {/* Seletor de Troca em Massa (Só aparece se houver selecionados) */}
                {selecionados.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full shadow-sm animate-fade-in">
                    <span className="text-[10px] text-gray-400 uppercase tracking-tighter">
                      {selecionados.length} Selecionado(s):
                    </span>

                    <div className="flex items-center gap-1 border-l pl-2 border-gray-200">
                      {/* Ícone com a cor padrão do sistema */}
                      <Edit2 size={12} style={{ color: theme.menuIconColor }} />

                      <select
                        onChange={(e) => trocarMaterialSelecionados(e.target.value)}
                        className="bg-transparent border-none text-[10px] uppercase outline-none focus:ring-0 cursor-pointer"
                        style={{ color: theme.menuIconColor }} // Cor do texto igual ao ícone
                      >
                        <option value="" className="text-gray-400">Trocar para...</option>
                        {listaVidros.map(v => (
                          <option key={v.id} value={v.id} className="text-gray-700">
                            {v.nome} {v.espessura ? `- ${v.espessura}` : ''} {v.tipo ? `(${v.tipo})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => setSelecionados([])}
                      className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Botão Salvar (Sempre visível se houver itens) */}
                <button
                  onClick={() => console.log("Salvando...")}
                  className="flex items-center gap-2 px-4 py-1.5 bg-[#1e3a5a] text-white rounded-full text-[10px] font-bold uppercase tracking-tighter hover:bg-[#2a527d] transition-all active:scale-95 shadow-md"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Salvar Alterações
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 hover:opacity-75 transition-all">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Building2 size={16} className="text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-1xl shadow-xl border border-gray-100 p-2 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">Logado como</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl">
                  <Wrench size={16} /> Configurações
                </button>
                <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                  <X size={16} /> Sair
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          {/* IDENTIFICAÇÃO: CLIENTE E OBRA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase">Cliente:</span>
              <select className="flex-1 p-2 outline-none text-sm bg-transparent" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Selecione o cliente</option>
                {listaClientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 px-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Obra:</span>
              <input type="text" placeholder="Identificação da obra" className="flex-1 p-2 outline-none text-sm" value={obra} onChange={(e) => setObra(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">

              {/* CARD DIMENSÕES (MANTIDO) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 relative overflow-hidden">

                {/* AVISO DE EDIÇÃO SOFISTICADO */}
                {editandoId && (
                  <div className="absolute top-0 left-0 w-full bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Edit2 size={14} className="text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Modo Edição Ativo</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditandoId(null);
                        setLargura(""); setAltura("");
                      }}
                      className="text-amber-700 hover:text-amber-900"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${editandoId ? 'mt-6' : ''}`} style={{ color: theme.menuBackgroundColor }}>
                  <Calculator size={20} /> Dimensões
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Largura</label>
                    <input
                      ref={larguraRef}
                      type="text"
                      placeholder="0"
                      value={largura}
                      onChange={(e) => setLargura(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm transition-all 
               focus:border-[var(--menu-icon-color)] focus:ring-2 focus:ring-[var(--menu-icon-color)]/10"
                      style={{ '--menu-icon-color': theme.menuIconColor } as any}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Altura</label>
                    <input
                      ref={alturaRef}
                      type="text"
                      placeholder="0"
                      value={altura}
                      onChange={(e) => setAltura(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm transition-all 
               focus:border-[var(--focus-color)] focus:ring-2 focus:ring-[var(--focus-color)]/10"
                      style={{ '--focus-color': theme.menuIconColor } as any}
                    />
                  </div>
                  {/* CAMPO QUANTIDADE */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Qtd</label>
                    <input
                      ref={qtdRef}
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      onKeyDown={handleKeyDown}
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm transition-all 
               focus:border-[var(--focus-color)] focus:ring-2 focus:ring-[var(--focus-color)]/10"
                      style={{ '--focus-color': theme.menuIconColor } as any}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Material</label>
                  <select
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm text-gray-700"
                    value={vidroSelecionado?.id}
                    onChange={(e) => setVidroSelecionado(listaVidros.find(v => v.id === e.target.value))}
                  >
                    <option value="">Selecione o material...</option>
                    {listaVidros.map(v => (
                      <option key={v.id} value={v.id}>
                        {/* Aqui montamos a exibição: Nome/Cor + Espessura + Tipo */}
                        {v.nome} {v.cor ? `- ${v.cor}` : ''} {v.espessura ? `(${v.espessura})` : ''} {v.tipo ? `| ${v.tipo}` : ''}
                      </option>
                    ))}
                  </select>
                  {isMounted && vidroSelecionado && clienteId && (() => {
                    // 1. Localizamos o grupo do cliente
                    const clienteAtual = listaClientes.find(c => String(c.id) === String(clienteId));
                    const grupoId = clienteAtual?.tabela_id || clienteAtual?.grupo_preco_id;

                    // 2. Procuramos o preço especial
                    const especial = precosEspeciais.find(p =>
                      String(p.vidro_id) === String(vidroSelecionado.id) &&
                      String(p.grupo_preco_id) === String(grupoId)
                    );

                    return (
                      <p className={`text-[10px] font-bold mt-1 uppercase tracking-tighter ${especial ? 'text-gray-600' : 'text-gray-400'}`}>
                        {especial
                          ? `⭐ Preço Diferenciado: ${formatarMoeda(Number(especial.preco))} /m²`
                          : `Preço padrão: ${formatarMoeda(Number(vidroSelecionado.preco))} /m²`}
                      </p>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkles style={{ color: !servicoSelecionado ? theme.menuIconColor : '#6b7280' }} size={18} className="text-amber-500" />
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">Acabamentos</h3>
                </div>

                <div className="space-y-2 max-h-[115px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Opção Padrão (Nenhum) */}
                  <div
                    onClick={() => setServicoSelecionado(null)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${!servicoSelecionado ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                      }`}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: !servicoSelecionado ? theme.menuIconColor : '#6b7280' }}
                    >
                      Nenhum
                    </span>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: !servicoSelecionado ? theme.menuIconColor : '#d1d5db' }}
                    >
                      {!servicoSelecionado && (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: theme.menuIconColor }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Lista de outros serviços */}
                  {listaServicos.map((s) => {
                    const isSelected = servicoSelecionado?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setServicoSelecionado(s)}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                          }`}
                      >
                        <span
                          className="text-sm font-medium"
                          style={{ color: isSelected ? theme.menuIconColor : '#6b7280' }}
                        >
                          {s.nome}
                        </span>
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: isSelected ? theme.menuIconColor : '#d1d5db' }}
                        >
                          {isSelected && (
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: theme.menuIconColor }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* O campo aparece se houver serviço e a unidade NÃO for m² */}
                {servicoSelecionado && servicoSelecionado.unidade?.toLowerCase().trim() !== 'm²' && (
                  <div className="mt-4 p-4 bg-[#1e3a5a]/5 rounded-2xl border border-[#1e3a5a]/10 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench size={14} className="text-[#1e3a5a]" />
                      <label className="text-[10px] font-bold text-[#1e3a5a] uppercase tracking-wider">
                        {servicoSelecionado.unidade?.toLowerCase().includes('ml')
                          ? "Metragem (ML)"
                          : "Quantidade (Furos / Recortes / CNC)"}
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={quantidadeServico}
                        onChange={(e) => setQuantidadeServico(parseFloat(e.target.value) || 0)}
                        className="w-full p-3 bg-white rounded-xl border border-gray-100 outline-none text-sm font-bold text-[#1e3a5a] focus:ring-2 focus:ring-[#1e3a5a]/10"
                        placeholder="Quanto?"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">
                        {servicoSelecionado.unidade}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex justify-center w-full pt-4">
                  <button
                    onClick={() => {
                      if (editandoId) {
                        // Remove o antigo e adiciona o novo com os dados atualizados
                        setItens(prev => prev.filter(i => i.id !== editandoId));
                        setEditandoId(null);
                      }
                      adicionarItem();
                    }}
                    className="w-1/2 py-2.5 bg-white text-[#1e3a5a] border border-[#1e3a5a]/30 rounded-xl font-bold hover:bg-[#1e3a5a]/5 hover:border-[#1e3a5a] transition-all flex items-center justify-center gap-2"
                  >
                    {editandoId ? <Sparkles size={18} /> : <Plus size={18} />}
                    <span>{editandoId ? "Atualizar Item" : "Adicionar Item"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-[#1e3a5a]" />
                    <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Resumo do Pedido</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Input de arquivo escondido */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={processarArquivoExcel}
                      className="hidden"
                      accept=".xlsx, .xls, .csv"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-[10px] font-bold text-gray-300 hover:text-[#1C415B] transition-colors uppercase tracking-tighter"
                    >
                      <Plus size={14} /> Importar Excel
                    </button>

                    {itens.length > 0 && (
                      <button
                        onClick={() => setMostrarModalLimpar(true)}
                        className="text-[10px] font-bold text-gray-300 hover:text-red-500 transition-colors uppercase tracking-tighter"
                      >
                        Limpar Tudo
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  {itens.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-[#f8fafc] text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-4 w-10">
                            <input
                              type="checkbox"
                              checked={selecionados.length === itens.length && itens.length > 0}
                              onChange={toggleTodos}
                              className="rounded border-gray-300 text-[#1e3a5a] focus:ring-[#1e3a5a]"
                            />
                          </th>
                          <th className="px-6 py-4">Descrição / Acabamento</th>
                          <th className="px-6 py-4 text-center">Medidas</th>
                          <th className="px-6 py-4 text-center">Qtd</th>
                          <th className="px-6 py-4 text-right">Unitário</th>
                          <th className="px-6 py-4 text-right">Total</th>
                          <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-50">
                        {itens.map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-gray-50/50 transition-colors group ${selecionados.includes(item.id) ? 'bg-blue-50/30' : ''}`}
                          >
                            {/* 1. CHECKBOX */}
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selecionados.includes(item.id)}
                                onChange={() => toggleItem(item.id)}
                                className="rounded border-gray-300 text-[#1e3a5a] focus:ring-[#1e3a5a]"
                              />
                            </td>

                            {/* 2. DESCRIÇÃO (Faltava este no seu snippet) */}
                            <td className="px-6 py-4">
                              {/* Nome do Vidro e Espessura */}
                              <div className="text-gray-700 leading-tight">
                                {item.descricao}
                              </div>

                              {/* Tipo do Vidro (Subtítulo discreto) */}
                              {item.tipo && (
                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">
                                  {item.tipo}
                                </div>
                              )}

                              {/* Serviço / Acabamento */}
                              {item.servico && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Sparkles size={10} className="text-amber-500" />
                                  <span className="text-[10px] text-gray-400 uppercase font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">
                                    {item.servico}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* 3. MEDIDAS */}
                            <td className="px-6 py-4 text-center">
                              <div className=" text-gray-700">{item.medidaReal}</div>
                            </td>

                            {/* 4. QTD */}
                            <td className="px-6 py-4 text-center">
                              <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-500">
                                {item.qtd}
                              </span>
                            </td>

                            {/* 5. UNITÁRIO */}
                            <td className="px-6 py-4 text-right font-medium text-gray-500">
                              {formatarMoeda(item.total / item.qtd)}
                            </td>

                            {/* 6. SUBTOTAL */}
                            <td className="px-6 py-4 text-right font-bold text-[#1e3a5a]">
                              {formatarMoeda(item.total)}
                            </td>

                            {/* 7. AÇÕES */}
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditarItem(item)}
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setItemParaExcluir(item.id)}
                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Calculator size={40} className="opacity-20" />
                      </div>
                      <p className="text-sm font-medium">Nenhum item adicionado ao orçamento</p>
                    </div>
                  )}
                </div>

                {/* Rodapé Ultra Discreto */}
                <div className="p-5 bg-white border-t border-gray-50 flex items-center justify-between px-8">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        Itens:
                      </span>
                      <span className="text-sm font-bold text-gray-500">
                        {itens.length.toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* Divisor sutil */}
                    <div className="h-4 w-[1px] bg-gray-100" />

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        Subtotal:
                      </span>
                      <span className="text-sm font-medium text-gray-400">
                        {formatarMoeda(itens.reduce((acc, i) => acc + i.total, 0))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#1e3a5a]/40 uppercase tracking-[0.3em]">
                      Total Geral
                    </span>
                    <span className="text-xl font-light text-[#1e3a5a] tracking-tight">
                      {formatarMoeda(itens.reduce((acc, i) => acc + i.total, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {itemParaExcluir && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-scale-up">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={28} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Remover Item?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Tem certeza que deseja remover este item do pedido? Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex border-t border-gray-50">
                <button
                  onClick={() => setItemParaExcluir(null)}
                  className="flex-1 px-6 py-4 text-sm font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    setItens(itens.filter(i => i.id !== itemParaExcluir));
                    setItemParaExcluir(null);
                  }}
                  className="flex-1 px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50 border-l border-gray-50 transition-colors"
                >
                  EXCLUIR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Adicione este Modal no final do componente (perto do outro modal) */}
        {mostrarModalLimpar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-scale-up">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList size={28} className="text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Esvaziar orçamento?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Isso irá remover **todos os {itens.length} itens** da sua lista atual. Essa ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex border-t border-gray-50">
                <button
                  onClick={() => setMostrarModalLimpar(false)}
                  className="flex-1 px-6 py-4 text-sm font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    setItens([]);
                    setMostrarModalLimpar(false);
                  }}
                  className="flex-1 px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50 border-l border-gray-50 transition-colors"
                >
                  LIMPAR TUDO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE AVISO: CAMPOS VAZIOS */}
        {mostrarModalAviso && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xs overflow-hidden animate-scale-up">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator size={28} className="text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Quase lá!</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Para adicionar o item, você precisa preencher a **Largura**, **Altura** e selecionar o **Material**.
                </p>
              </div>

              <div className="p-4 bg-gray-50">
                <button
                  onClick={() => setMostrarModalAviso(false)}
                  className="w-full py-4 text-sm font-black text-[#1e3a5a] bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarModalAssociacao && itensNaoEncontrados.length > 0 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#1e3a5a]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-white/20">

              {/* Cabeçalho */}
              <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1e3a5a]/10 rounded-2xl flex items-center justify-center">
                  <ClipboardList size={24} className="text-[#1e3a5a]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1e3a5a] uppercase tracking-tighter leading-tight">
                    Associar Material
                  </h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                    Item não reconhecido no sistema
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Nome vindo do Excel */}
                <div className="space-y-2">
                  <label className="text-[12px] text-gray-300  tracking-widest">
                    Nome na Planilha:
                  </label>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 font-mono text-sm">
                    {itensNaoEncontrados[0].nomeExcel}
                  </div>
                </div>

                {/* Seletor de Material do Sistema */}
                <div className="space-y-2">
                  <label className="text-[12px] text-[#1e3a5a]  tracking-widest">
                    Corresponder para:
                  </label>
                  <select
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none text-sm  text-gray-700 focus:ring-2 focus:ring-[#1e3a5a]/20 transition-all cursor-pointer"
                    onChange={(e) => {
                      const vidroSelecionado = listaVidros.find(v => String(v.id) === e.target.value);
                      if (!vidroSelecionado) return;

                      const nomeAtualNoExcel = itensNaoEncontrados[0].nomeExcel;
                      const correspondentes = itensNaoEncontrados.filter(i => i.nomeExcel === nomeAtualNoExcel);

                      const novosItens = correspondentes.map(c => gerarObjetoItem(vidroSelecionado, c.l, c.a, c.qtd));

                      setItens(prev => [...prev, ...novosItens]);

                      const restantes = itensNaoEncontrados.filter(i => i.nomeExcel !== nomeAtualNoExcel);
                      setItensNaoEncontrados(restantes);

                      if (restantes.length === 0) setMostrarModalAssociacao(false);
                      e.target.value = ""; // Reseta o select para a próxima associação
                    }}
                  >
                    <option value="">Selecione o material do banco...</option>
                    {listaVidros.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.nome} {v.espessura ? `- ${v.espessura}mm` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botão Pular (Agora na cor do tema) */}
                <button
                  onClick={() => {
                    const nomeAtual = itensNaoEncontrados[0].nomeExcel;
                    const restantes = itensNaoEncontrados.filter(i => i.nomeExcel !== nomeAtual);
                    setItensNaoEncontrados(restantes);
                    if (restantes.length === 0) setMostrarModalAssociacao(false);
                  }}
                  className="w-full py-4 text-[10px] font-black text-[#1e3a5a]/60 hover:text-[#1e3a5a] hover:bg-gray-50 rounded-2xl transition-all uppercase  border border-transparent hover:border-gray-100"
                >
                  Descartar este material
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}