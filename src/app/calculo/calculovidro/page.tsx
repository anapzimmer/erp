//app/calculovidro/page.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { CSSProperties } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Wrench, X, Printer, Trash2, Plus, Calculator, Sparkles, ClipboardList, Edit2 } from "lucide-react"
import * as XLSX from 'xlsx';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { CalculoVidroPDF } from '@/app/relatorios/calculovidros/CalculoVidroPDF';
import { useSearchParams } from "next/navigation"

interface ItemOrcamento {
  id: string | number;
  descricao: string;
  tipo?: string;
  medidaReal: string;
  medidaCalc: string;
  qtd: number;
  total: number;
  acabamento?: string;
  servico?: string;
  servicos?: string;
  valorServicoUn?: number;
  vidro_id?: string | number;
}
interface Vidro { id: number | string; nome: string; espessura?: string | number; preco: number; tipo?: string; cor?: string; }
interface Cliente { id: string | number; nome: string; tabela_id?: string | number | null; grupo_preco_id?: string | number | null; }
interface Servico { id: string | number; nome: string; preco: number; unidade?: string | null; }
interface PrecoEspecial { vidro_id: string | number; grupo_preco_id?: string | number | null; tabela_id?: string | number | null; preco: number; }
interface ItemNaoEncontrado { nomeExcel: string; l: number; a: number; qtd: number; }

// Funções de apoio
const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const arredondar5cm = (valor: number) => Math.ceil(valor / 50) * 50;
const LIMITE_MEDIDA_ACRESCIMO_MM = 3210;
const PERCENTUAL_ACRESCIMO_MEDIDA = 0.07;

const aplicarAcrescimoPorMedida = (precoBaseM2: number, larguraMm: number, alturaMm: number) => {
  const excedeuLimite = larguraMm > LIMITE_MEDIDA_ACRESCIMO_MM || alturaMm > LIMITE_MEDIDA_ACRESCIMO_MM;
  return excedeuLimite ? precoBaseM2 * (1 + PERCENTUAL_ACRESCIMO_MEDIDA) : precoBaseM2;
};

export default function RelatorioOrçamento() {
  const { theme } = useTheme();
  const { nomeEmpresa, user, empresaId, loading: checkingAuth } = useAuth()
  const carregadoRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams(); // Adicione esta linha
  const editId = searchParams.get("edit"); // Captura o ID da URL (?edit=...)

  // Estados do Layout (EXATAMENTE COMO VOCÊ ENVIOU)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [sidebarExpandido, setSidebarExpandido] = useState(true)
  const [isMounted, setIsMounted] = useState(false);
  const draftRestauradoRef = useRef(false);

  // Estados de Dados do Supabase
  const [listaClientes, setListaClientes] = useState<Cliente[]>([])
  const [listaVidros, setListaVidros] = useState<Vidro[]>([])
  const [listaServicos, setListaServicos] = useState<Servico[]>([])
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoEspecial[]>([]);

  // Estados do Orçamento
  const [clienteId, setClienteId] = useState("")
  const [obra, setObra] = useState("")
  const [largura, setLargura] = useState("")
  const [altura, setAltura] = useState("")
  const [quantidade, setQuantidade] = useState(1)
  const [vidroSelecionado, setVidroSelecionado] = useState<Vidro | null>(null)
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null)
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [quantidadeServico, setQuantidadeServico] = useState(1);

  // Edição de Modal
  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<string | number | null>(null);
  const [mostrarModalLimpar, setMostrarModalLimpar] = useState(false);
  const larguraRef = useRef<HTMLInputElement>(null);
  const alturaRef = useRef<HTMLInputElement>(null);
  const qtdRef = useRef<HTMLInputElement>(null);
  const [mostrarModalAviso, setMostrarModalAviso] = useState(false);

  //excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itensNaoEncontrados, setItensNaoEncontrados] = useState<ItemNaoEncontrado[]>([]);
  const [mostrarModalAssociacao, setMostrarModalAssociacao] = useState(false);
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [ultimoNumeroGerado, setUltimoNumeroGerado] = useState("");

  const draftKey = `orcamento_vidros_draft_${empresaId || "sem_empresa"}_${editId || "novo"}`;

  // Estados para seleção em massa
  const [selecionados, setSelecionados] = useState<Array<string | number>>([]);

  // Função para marcar/desmarcar todos
  const toggleTodos = () => {
    if (selecionados.length === itens.length) {
      setSelecionados([]);
    } else {
      setSelecionados(itens.map(i => i.id));
    }
  };

  // Função para alternar um item individual
  const toggleItem = (id: string | number) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const buscarOrcamentoParaEdicao = useCallback(async (id: string) => {
    try {
      console.log("Buscando orçamento ID:", id);
      const { data: orcamento, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (orcamento) {
        // 1. Vincula o cliente
        const clienteEncontrado = listaClientes.find(c => c.nome === orcamento.cliente_nome);
        if (clienteEncontrado) setClienteId(String(clienteEncontrado.id));

        // 2. Preenche os campos básicos
        setObra(orcamento.obra_referencia || "");
        setUltimoNumeroGerado(orcamento.numero_formatado || "");

        // 3. Carrega os itens
        if (orcamento.itens && Array.isArray(orcamento.itens)) {
          setItens(orcamento.itens);
        }

        // REMOVIDO: O router.push('/admin/relatorio.orcamento'); 
        // Não queremos sair da página, queremos editar nela.
      }
    } catch (err) {
      console.error("Erro ao carregar orçamento para edição:", err);
    }
  }, [listaClientes]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  
useEffect(() => {
  if (editId && isMounted && listaClientes.length > 0 && !carregadoRef.current) {
    buscarOrcamentoParaEdicao(editId);
    carregadoRef.current = true;
  }
}, [editId, isMounted, listaClientes.length, buscarOrcamentoParaEdicao]);

  useEffect(() => {
    if (!isMounted || !empresaId || draftRestauradoRef.current) return;

    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) {
        draftRestauradoRef.current = true;
        return;
      }

      const draft = JSON.parse(raw);
      setClienteId(draft.clienteId || "");
      setObra(draft.obra || "");
      setLargura(draft.largura || "");
      setAltura(draft.altura || "");
      setQuantidade(Number(draft.quantidade) > 0 ? Number(draft.quantidade) : 1);
      setQuantidadeServico(Number(draft.quantidadeServico) > 0 ? Number(draft.quantidadeServico) : 1);

      if (Array.isArray(draft.itens)) {
        setItens(draft.itens);
      }

      if (draft.vidroIdSelecionado && listaVidros.length > 0) {
        const vidro = listaVidros.find((v: Vidro) => String(v.id) === String(draft.vidroIdSelecionado));
        if (vidro) setVidroSelecionado(vidro);
      }

      if (draft.servicoIdSelecionado && listaServicos.length > 0) {
        const servico = listaServicos.find((s) => String(s.id) === String(draft.servicoIdSelecionado));
        if (servico) setServicoSelecionado(servico);
      }
    } catch (error) {
      console.error("Erro ao restaurar rascunho de vidros:", error);
    } finally {
      draftRestauradoRef.current = true;
    }
  }, [isMounted, empresaId, draftKey, listaVidros, listaServicos]);

  useEffect(() => {
    if (!isMounted || !empresaId) return;

    const temDadosNaoSalvos =
      itens.length > 0 ||
      !!clienteId ||
      !!obra ||
      !!largura ||
      !!altura;

    if (!temDadosNaoSalvos) {
      sessionStorage.removeItem(draftKey);
      return;
    }

    const payload = {
      clienteId,
      obra,
      largura,
      altura,
      quantidade,
      quantidadeServico,
      vidroIdSelecionado: vidroSelecionado?.id || null,
      servicoIdSelecionado: servicoSelecionado?.id || null,
      itens,
      updatedAt: Date.now(),
    };

    sessionStorage.setItem(draftKey, JSON.stringify(payload));
  }, [
    isMounted,
    empresaId,
    draftKey,
    clienteId,
    obra,
    largura,
    altura,
    quantidade,
    quantidadeServico,
    vidroSelecionado,
    servicoSelecionado,
    itens,
  ]);

  useEffect(() => {
    const temDadosNaoSalvos =
      itens.length > 0 ||
      !!clienteId ||
      !!obra ||
      !!largura ||
      !!altura;

    if (!temDadosNaoSalvos) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [itens.length, clienteId, obra, largura, altura]);

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

    const precoBaseM2 = precoEspecial ? Number(precoEspecial.preco) : Number(vidroSelecionado.preco);
    const precoVidroM2 = aplicarAcrescimoPorMedida(precoBaseM2, l, a);

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
      tipo: vidroSelecionado.tipo || "", // Garante que o tipo vá para o PDF
      medidaReal: `${l} x ${a} mm`,
      medidaCalc: `${lCalc} x ${aCalc} mm`,
      qtd: quantidade,
      acabamento: "", // Se você tiver um estado de acabamento, coloque aqui
      servicos: detalheServico, // Passa o detalhe do serviço (Furos, CNC, etc)

      servico: detalheServico, // Mantém por compatibilidade com sua tabela na tela
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

  // Função para troca em massa com recálculo total
  const trocarMaterialSelecionados = (novoVidroId: string) => {
    if (!novoVidroId) return;

    const novoVidro = listaVidros.find((v: Vidro) => String(v.id) === String(novoVidroId));
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
        const precoBaseM2 = precoEspecial ? Number(precoEspecial.preco) : Number(novoVidro.preco);
        const [lReal, aReal] = item.medidaReal.split('x').map((v: string) => parseInt(v.replace(/\D/g, '')) || 0);
        const precoVidroM2 = aplicarAcrescimoPorMedida(precoBaseM2, lReal, aReal);
        const [lCalc, aCalc] = item.medidaCalc.replace(" mm", "").split('x').map(Number);

        // 3. Refazer o cálculo de área
        const areaM2 = (lCalc / 1000) * (aCalc / 1000);
        const areaCobrada = areaM2 < 0.25 ? 0.25 : areaM2;

        // 4. Calcular novos valores
        const novoValorVidroTotal = areaCobrada * precoVidroM2;
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

  const handleEditarItem = (item: ItemOrcamento) => {
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

  const handleSalvarOrcamento = async () => {
    if (itens.length === 0) {
      alert("Adicione pelo menos um item.");
      return;
    }

    try {
      let numeroFinal = "";

      // 1. Gerar ou recuperar número
      if (editId) {
        const { data: orcAtual } = await supabase.from('orcamentos').select('numero_formatado').eq('id', editId).single();
        numeroFinal = orcAtual?.numero_formatado || "OR-EDIT";
      } else {
        const dataAtual = new Date();
        const prefixoData = `ORC${dataAtual.getFullYear().toString().slice(-2)}${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}`;
        const { data: ultimos } = await supabase
          .from('orcamentos')
          .select('numero_formatado')
          .like('numero_formatado', `${prefixoData}%`)
          .order('numero_formatado', { ascending: false })
          .limit(1);

        let seq = 1;
        if (ultimos && ultimos.length > 0) {
          seq = parseInt(ultimos[0].numero_formatado.slice(-2)) + 1;
        }
        numeroFinal = `${prefixoData}${seq.toString().padStart(2, '0')}`;
      }

      // 2. Cálculos Totais
      const pesoTotal = itens.reduce((acc, item) => {
        return acc + (calcularPesoItem(item) || 0);
      }, 0);
      const vTotal = itens.reduce((acc, i) => acc + i.total, 0);
      const mTotal = itens.reduce((acc, item) => {
        const partes = item.medidaCalc.split('x').map((v: string) => parseInt(v.replace(/\D/g, '')));
        return acc + ((partes[0] / 1000) * (partes[1] / 1000) * item.qtd);
      }, 0);

      // No seu handleSalvarOrcamento:
      const dadosParaSalvar = {
        numero_formatado: numeroFinal,
        cliente_nome: listaClientes.find(c => String(c.id) === String(clienteId))?.nome || "Consumidor",
        obra_referencia: obra || "Geral",
        itens: itens, // Supabase entende array como JSONB automaticamente
        valor_total: Number(vTotal), // Garante que é número
        empresa_id: empresaId,
        metragem_total: Number(mTotal) || 0, // Garante que é número
        peso_total: Number(pesoTotal) || 0,  // <--- FORÇANDO O NÚMERO AQUI
        theme_color: theme.menuIconColor || '#1e3a5a'
      };

      let error;
      if (editId) {
        const { error: err } = await supabase.from('orcamentos').update(dadosParaSalvar).eq('id', editId);
        error = err;
      } else {
        const { error: err } = await supabase.from('orcamentos').insert([dadosParaSalvar]);
        error = err;
      }

      if (error) throw error;

      if (editId) {
        sessionStorage.removeItem(draftKey);
        router.push('/admin/relatorio.orcamento');
        return;
      }

      setUltimoNumeroGerado(numeroFinal);
      sessionStorage.removeItem(draftKey);
      setMostrarModalSucesso(true);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro completo:", error);
      alert("Erro ao salvar no banco: " + message);
    }
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
      const dataData = evt.target?.result;

      // Usamos readAsArrayBuffer para evitar o "risco no meio" (deprecated)
      const wb = XLSX.read(dataData, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // sheet_to_json tenta detectar o cabeçalho automaticamente
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const pendentesParaAssociar: ItemNaoEncontrado[] = [];
      const novosItensProcessados: ItemOrcamento[] = [];

      data.forEach((linha) => {
        // MAPEAMENTO INTELIGENTE (Ajustado para o seu arquivo)
        const nomeExcel = String(extrairValor(linha, ["vidro", "descrição", "descriçao", "material", "cor", "item"]) || "").trim();

        // Captura de medidas - seu arquivo usa "Largura" e "Altura"
        const l = parseFloat(String(extrairValor(linha, ["largura", "larg", "l"]) || 0));
        const a = parseFloat(String(extrairValor(linha, ["altura", "alt", "a"]) || 0));

        // CAPTURA DA QUANTIDADE (Aqui estava o erro: seu arquivo usa "Qtde.")
        const rawQtd = extrairValor(linha, ["qtde.", "qtde", "quantidade", "qtd"]);
        const qtdRaw = String(rawQtd ?? "");
        const qtd = qtdRaw && !isNaN(parseInt(qtdRaw, 10)) ? parseInt(qtdRaw, 10) : 1;

        if (!nomeExcel || !l || !a) return;

        const vidroNoBanco = listaVidros.find(v =>
          v.nome.toLowerCase().trim() === nomeExcel.toString().toLowerCase().trim()
        );

        if (vidroNoBanco) {
          novosItensProcessados.push(gerarObjetoItem(vidroNoBanco, l, a, qtd));
        } else {
          pendentesParaAssociar.push({ nomeExcel, l, a, qtd });
        }
      });

      if (novosItensProcessados.length > 0) {
        setItens(prev => [...prev, ...novosItensProcessados]);
      }

      if (pendentesParaAssociar.length > 0) {
        setItensNaoEncontrados(pendentesParaAssociar);
        setMostrarModalAssociacao(true);
      }

      // Reset do input para permitir importar o mesmo arquivo de novo
      if (e.target) e.target.value = "";
    };

    reader.readAsArrayBuffer(file); // Correção do "risco no meio"
  };


  const extrairValor = (linha: Record<string, unknown>, variacoes: string[]) => {
    // Pega todas as chaves da linha (ex: "Vidro", "Qtde.")
    const chaves = Object.keys(linha);

    const chaveEncontrada = chaves.find(chave => {
      // Remove espaços e pontos para comparar (ex: "Qtde." vira "qtde")
      const chaveLimpa = chave.toLowerCase().replace(/[.\s]/g, '').trim();
      return variacoes.some(v => v.toLowerCase().replace(/[.\s]/g, '').trim() === chaveLimpa);
    });

    return chaveEncontrada ? linha[chaveEncontrada] : null;
  };

  // Função auxiliar para criar o item com seus cálculos (Arredondamento 5cm)
  const gerarObjetoItem = (vidro: Vidro, l: number, a: number, qtd: number): ItemOrcamento => {
    // Medida de Cálculo (Arredondada 5cm) -> Ex: 408 vira 450
    const lCalc = arredondar5cm(l);
    const aCalc = arredondar5cm(a);

    // Medida Real (Física) -> Ex: 408
    const lReal = l;
    const aReal = a;

    const areaCobradaM2 = (lCalc / 1000) * (aCalc / 1000);
    const precoBaseM2 = Number(vidro.preco);
    const precoM2 = aplicarAcrescimoPorMedida(precoBaseM2, lReal, aReal);

    return {
      id: Math.random(),
      descricao: `${vidro.nome} ${vidro.espessura}`,
      // Guardamos as duas separadas para não haver confusão
      medidaReal: `${lReal} x ${aReal}`,
      medidaCalc: `${lCalc} x ${aCalc}`,
      qtd: Number(qtd),
      total: areaCobradaM2 * precoM2 * Number(qtd)
    };
  };

  const calcularPesoItem = (item: ItemOrcamento) => {
    // Extrai a espessura da descrição (ex: "4+4" = 8)
    const numeros = item.descricao.match(/\d+/g);
    const espessura = numeros ? numeros.reduce((acc: number, curr: string) => acc + parseInt(curr), 0) : 0;

    // Pega a medida física (408x500)
    const partes = item.medidaReal.split('x').map((v: string) => parseInt(v));
    const largReal = partes[0];
    const altReal = partes[1];

    // Cálculo: Área Real * 2.5 * Espessura * Qtd
    const areaRealM2 = (largReal / 1000) * (altReal / 1000);
    const pesoFinal = areaRealM2 * 2.5 * espessura * item.qtd;

    return pesoFinal;
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login"); // Força o redirecionamento
      router.refresh();      // Garante que o estado do Next.js seja limpo
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };


  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>

      {/* SIDEBAR - PADRÃO ORIGINAL */}
      <div className={`${sidebarExpandido ? "w-64" : "w-20"} transition-all duration-300 hidden md:flex flex-col border-r border-gray-100 shrink-0 sticky top-0 h-screen`} style={{ backgroundColor: theme.menuBackgroundColor }}>
        <Sidebar showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} nomeEmpresa={nomeEmpresa} expandido={sidebarExpandido} setExpandido={setSidebarExpandido} />
      </div>

      <div className="flex-1 flex flex-col w-full min-w-0">

        <Header
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user?.email || ""}
          handleSignOut={handleLogout}
          setShowMobileMenu={() => { }}
        >
          {/* Conteúdo dinâmico que aparece ao lado da logo no Header */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col border-l border-gray-200 pl-6">
              <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Orçamento</h1>
              <span className="text-xs text-gray-800 font-bold"># {ultimoNumeroGerado || "NOVO"}</span>
            </div>

            {/* ÁREA DE AÇÕES DISCRETAS */}
            {itens.length > 0 && (
              <div className="ml-6 flex items-center gap-3 animate-fade-in">
                {/* Seletor de Troca em Massa */}
                {selecionados.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm">

                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {selecionados.length} itens
                    </span>

                    <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                      <Edit2 size={13} style={{ color: theme.menuIconColor }} />

                      <select
                        onChange={(e) => trocarMaterialSelecionados(e.target.value)}
                        // Removido o bg-transparent para dar um leve destaque ao select se necessário, 
                        // mas mantido o visual limpo com font-medium
                        className="bg-transparent border-none text-[12px] uppercase outline-none cursor-pointer font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        <option value="" className="text-gray-400">Trocar material...</option>
                        {listaVidros.map(v => (
                          <option key={v.id} value={v.id} className="text-slate-700">
                            {v.nome} {v.espessura ? `| ${v.espessura}mm` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => setSelecionados([])}
                      className="ml-1 p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Botão Salvar (Mantido como você gosta) */}
                <button
                  onClick={handleSalvarOrcamento}
                  className="flex items-center gap-2 px-5 py-2 bg-[#1e3a5a] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#2a527d] transition-all active:scale-95 shadow-lg shadow-[#1e3a5a]/20"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Salvar Orçamento
                </button>
              </div>
            )}


            {/* --- BOTÃO PDF CORRIGIDO --- */}
            <PDFDownloadLink
              document={
                <CalculoVidroPDF
                  // GARANTA QUE O MAP REPASSE OS CAMPOS NOVOS:
                  itens={itens.map((item) => ({
                    ...item,
                    // Caso seu objeto original use nomes diferentes, ajuste aqui:
                    tipo: item.tipo || "",
                    acabamento: item.acabamento || "",
                    servicos: item.servicos || ""
                  }))}
                  nomeEmpresa={nomeEmpresa}
                  logoUrl={"logoLightUrl" in theme ? theme.logoLightUrl || undefined : undefined}
                  themeColor={theme.contentTextLightBg}
                  nomeCliente={listaClientes.find((c) => String(c.id) === String(clienteId))?.nome || "Não selecionado"}
                  nomeObra={obra}

                  // Cálculo do Peso Total seguindo a lógica do seu rodapé
                  pesoTotal={itens.reduce((acc: number, item) => acc + calcularPesoItem(item), 0)}

                  // Cálculo da Metragem Total (M² de Cobrança) - Alinhado com o rodapé
                  metragemTotal={itens.reduce((acc: number, item) => {
                    const [l, a] = item.medidaCalc.split('x').map((v: string) => parseInt(v));
                    return acc + ((l / 1000) * (a / 1000) * item.qtd);
                  }, 0)}

                  // Adicionado: Valor Total do Pedido (importante para o PDF bater com a tela)
                  valorTotal={itens.reduce((acc: number, i) => acc + i.total, 0)}

                  // Adicionado: Total de Peças
                  totalPecas={itens.reduce((acc: number, i) => acc + Number(i.qtd), 0)}
                />
              }
              fileName={`Orçamento ${listaClientes.find((c) => String(c.id) === String(clienteId))?.nome || 'Geral'
                } - N° ${Date.now().toString().slice(-6)}.pdf`}
            >
              {({ loading }) => (
                <button
                  className="flex items-center gap-2 p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all ml-2"
                  title="Gerar PDF"
                  disabled={loading || itens.length === 0} // Desabilita se estiver carregando ou sem itens
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <Printer size={20} />
                  )}
                </button>
              )}
            </PDFDownloadLink>
          </div>
        </Header>

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

                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="p-2 bg-[#1e3a5a]/5 rounded-xl text-[#1e3a5a]">
                    <Calculator size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-300 uppercase tracking-[0.2em] leading-none">
                      Especificações
                    </span>
                    <h3 className="text-sm font-bold text-[#1e3a5a]">
                      Dimensões
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Largura</label>
                    <input
                      ref={larguraRef}
                      type="text"
                      placeholder="0"
                      value={largura}
                      onChange={(e) => {
                        const valorNumerico = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setLargura(valorNumerico);
                      }}
                      onKeyDown={handleKeyDown}
                       className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm transition-all 
                     focus:border-(--menu-icon-color) focus:ring-2 focus:ring-(--menu-icon-color)/10"
                       style={{ '--menu-icon-color': theme.menuIconColor } as CSSProperties}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Altura</label>
                    <input
                      ref={alturaRef}
                      type="text"
                      placeholder="0"
                      value={altura}
                      onChange={(e) => {
                        const valorNumerico = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setAltura(valorNumerico);
                      }}
                      onKeyDown={handleKeyDown}
                       className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm transition-all 
                     focus:border-(--focus-color) focus:ring-2 focus:ring-(--focus-color)/10"
                       style={{ '--focus-color': theme.menuIconColor } as CSSProperties}
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
                     focus:border-(--focus-color) focus:ring-2 focus:ring-(--focus-color)/10"
                       style={{ '--focus-color': theme.menuIconColor } as CSSProperties}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Material</label>
                  <select
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm text-gray-700"
                    value={vidroSelecionado?.id}
                    onChange={(e) => setVidroSelecionado(listaVidros.find((v: Vidro) => String(v.id) === String(e.target.value)) || null)}
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
                {/* TÍTULO DA SEÇÃO: ACABAMENTOS */}
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="p-2 bg-[#1e3a5a]/5 rounded-xl text-[#1e3a5a]">
                    {/* Ajustado: removido 'weight' e adicionado 'strokeWidth' para o Lucide */}
                    <Wrench size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-300 uppercase tracking-[0.2em] leading-none">
                      Personalização
                    </span>
                    <h3 className="text-sm font-bold text-[#1e3a5a]">
                      Acabamentos e Serviços
                    </h3>
                  </div>
                </div>
                <div className="space-y-2 max-h-28.75 overflow-y-auto pr-2 custom-scrollbar">
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
                    <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Resumo do Orçamento</h3>
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
                {/* RODAPÉ TÉCNICO E LOGÍSTICO */}
                <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between px-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-8">

                    {/* 1. Qtd Total EM EVIDÊNCIA (Destaque colorido) */}
                    <div className="bg-[#1e3a5a]/5 px-5 py-2 rounded-2xl border border-[#1e3a5a]/10 flex flex-col">
                      <span className="text-[9px] font-black text-[#1e3a5a]/60 uppercase tracking-widest">Total de Peças</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#1e3a5a]">
                          {itens.reduce((acc: number, i) => acc + Number(i.qtd), 0).toString().padStart(2, '0')}
                        </span>
                        <span className="text-xs font-bold text-[#1e3a5a]">un</span>
                      </div>
                    </div>

                    <div className="h-8 w-px bg-gray-100" />

                    {/* 2. Metragem de Cobrança: Sem destaque colorido */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">M² de Cobrança</span>
                      <span className="text-lg font-medium text-gray-500">
                        {itens.reduce((acc: number, item) => {
                          const [l, a] = item.medidaCalc.split('x').map((v: string) => parseInt(v));
                          return acc + ((l / 1000) * (a / 1000) * item.qtd);
                        }, 0).toFixed(3)} m²
                      </span>
                    </div>

                    <div className="h-8 w-px bg-gray-100" />

                    {/* 3. Peso da Carga: Sem destaque colorido */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Peso Logístico</span>
                      <span className="text-lg font-medium text-gray-500">
                        {itens.reduce((acc: number, item) => acc + calcularPesoItem(item), 0)
                          .toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                      </span>
                    </div>
                  </div>

                  {/* 4. Valor Total do Pedido */}
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-1">Total do Orçamento</p>
                    <p className="text-3xl font-light text-[#1e3a5a] tracking-tighter">
                      {formatarMoeda(itens.reduce((acc: number, i) => acc + i.total, 0))}
                    </p>
                  </div>
                </div>              </div>
            </div>
          </div>
        </main>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {itemParaExcluir && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
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
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
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
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
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
          <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-[#1e3a5a]/40 backdrop-blur-sm animate-fade-in">
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
                        {v.nome} {v.espessura ? ` ${v.espessura} - ${v.tipo}` : ''}
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

        {/* MODAL DISCRETO E AUTOMÁTICO - POSIÇÃO SUPERIOR */}
        {mostrarModalSucesso && (
          <div className="fixed top-6 right-6 z-100 animate-in slide-in-from-top-5 fade-in duration-500">
            <div
              className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl p-4 w-72 flex items-center gap-4 ring-1 ring-black/5"
              style={{ borderRight: `4px solid ${theme.menuIconColor}` }}
            >

              {/* Ícone com a cor do tema */}
              <div
                className="p-2 rounded-xl shrink-0"
                style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.menuIconColor }}
              >
                <Sparkles size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-800 tracking-tight">Salvo com sucesso!</h3>
                  <button
                    onClick={() => setMostrarModalSucesso(false)}
                    className="text-gray-300 hover:text-gray-500 transition-colors ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                  Ref: <span className="font-bold" style={{ color: theme.menuIconColor }}>{ultimoNumeroGerado}</span>
                </p>

                <button
                  onClick={() => {
                    setMostrarModalSucesso(false);
                    // Caminho corrigido:
                    router.push('/admin/relatorio.orcamento');
                  }}
                  className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider mt-2 flex items-center gap-1 transition-colors"
                >
                  <ClipboardList size={12} />
                  Ver Histórico
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}