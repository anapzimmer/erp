//app/calculovidro/page.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { CSSProperties } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
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
  precoVidroM2?: number;
  acabamento?: string;
  servico?: string;
  servicos?: string;
  valorServicoUn?: number;
  valorUnitario?: number;
  vidro_id?: string | number;
  totalOriginal?: number;
  totalRateado?: boolean;
  observacaoRateio?: string;
  observacaoPreco?: string;
  observacaoDivisao?: string;
}
interface Vidro { id: number | string; nome: string; espessura?: string | number; preco: number; tipo?: string; cor?: string; }
interface Cliente { id: string | number; nome: string; tabela_id?: string | number | null; grupo_preco_id?: string | number | null; }
interface TabelaPreco { id: string | number; nome: string; }
interface Servico { id: string | number; nome: string; preco: number; unidade?: string | null; }
interface KitCatalogo { id: string | number; nome: string; preco?: number | string | null; preco_por_cor?: number | string | null; }
interface PerfilCatalogo { id: string | number; codigo?: string | null; nome: string; preco?: number | string | null; cores?: string | null; }
interface FerragemCatalogo { id: string | number; codigo?: string | null; nome: string; preco?: number | string | null; cores?: string | null; }
interface PrecoEspecial { vidro_id: string | number; grupo_preco_id?: string | number | null; tabela_id?: string | number | null; preco: number; }
interface ItemNaoEncontrado { nomeExcel: string; nomeExcelNormalizado: string; l: number; a: number; qtd: number; medidaOriginalL?: number; medidaOriginalA?: number; }
interface LinhaImportacaoExcel {
  nomeExcel: string;
  nomeExcelNormalizado: string;
  l: number;
  a: number;
  qtd: number;
  vidroNoBanco: Vidro | null;
  medidaOriginalL?: number;
  medidaOriginalA?: number;
}
interface ModalAvisoAcao {
  id: string;
  label: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}

// FunÃ§Ãµes de apoio
const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const arredondar5cm = (valor: number) => Math.ceil(valor / 50) * 50;
const LIMITE_MEDIDA_ACRESCIMO_MM = 3210;
const LIMITE_MEDIDA_ALERTA_DIVISAO_MM = 3600;
const PERCENTUAL_ACRESCIMO_MEDIDA = 0.07;
const DEBUG_PRECO_VIDRO = true;

const parseValorDigitado = (valor: string) => {
  if (!valor) return 0;

  let normalizado = valor.replace(/\s/g, '').replace(/R\$/gi, '');

  if (normalizado.includes(',') && normalizado.includes('.')) {
    normalizado = normalizado.replace(/\./g, '').replace(',', '.');
  } else if (normalizado.includes(',')) {
    normalizado = normalizado.replace(',', '.');
  }

  return Number(normalizado.replace(/[^\d.-]/g, '')) || 0;
};

const distribuirValorIgual = (valorTotal: number, quantidadeItens: number) => {
  const totalCentavos = Math.round(valorTotal * 100);
  const baseCentavos = Math.floor(totalCentavos / quantidadeItens);
  const restoCentavos = totalCentavos % quantidadeItens;

  return Array.from({ length: quantidadeItens }, (_, index) => {
    const centavosItem = baseCentavos + (index < restoCentavos ? 1 : 0);
    return centavosItem / 100;
  });
};

const aplicarAcrescimoPorMedida = (precoBaseM2: number, larguraMm: number, alturaMm: number) => {
  const excedeuLimite = larguraMm > LIMITE_MEDIDA_ACRESCIMO_MM || alturaMm > LIMITE_MEDIDA_ACRESCIMO_MM;
  return excedeuLimite ? precoBaseM2 * (1 + PERCENTUAL_ACRESCIMO_MEDIDA) : precoBaseM2;
};

const normalizarTextoComparacao = (valor: unknown) => {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

const tokenizarTextoComparacao = (valor: unknown) => {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
};

const normalizarNumeroPlanilha = (valor: unknown) => {
  if (typeof valor === "number") return valor;
  if (valor == null) return 0;

  const textoOriginal = String(valor).trim();
  if (!textoOriginal) return 0;

  let texto = textoOriginal.replace(/\s/g, "");

  if (texto.includes(",") && texto.includes(".")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  }

  const numero = Number(texto.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numero) ? numero : 0;
};

const formatarEspessuraExibicao = (espessura: unknown) => {
  const texto = String(espessura || "").trim();
  if (!texto) return "";
  return /mm$/i.test(texto) ? texto : `${texto}mm`;
};

const montarRotuloVidro = (vidro: Vidro) => {
  const partes = [
    String(vidro.nome || "").trim(),
    formatarEspessuraExibicao(vidro.espessura),
    String(vidro.tipo || "").trim(),
  ].filter(Boolean);

  return partes.join(" | ");
};

const obterChaveVidroSemCor = (vidro?: Vidro | null) => {
  if (!vidro) return "";

  return [
    normalizarTextoComparacao(vidro.nome),
    normalizarTextoComparacao(formatarEspessuraExibicao(vidro.espessura)),
    normalizarTextoComparacao(vidro.tipo),
  ].join("|");
};

const identificarTipoAdicionalPorDescricao = (descricao: string): "kit" | "perfil" | "ferragem" | null => {
  const texto = String(descricao || "").trim().toLowerCase();
  if (texto.startsWith("kit:")) return "kit";
  if (texto.startsWith("perfil:")) return "perfil";
  if (texto.startsWith("ferragem:")) return "ferragem";
  return null;
};

const removerPrefixoTipoAdicional = (descricao: string) => {
  return String(descricao || "").replace(/^\s*(kit|perfil|ferragem)\s*:\s*/i, "").trim();
};

const montarObservacaoVaoOriginal = (larguraOriginal?: number, alturaOriginal?: number) => {
  if (!larguraOriginal || !alturaOriginal) return undefined;
  return `Vao original medida ${larguraOriginal} x ${alturaOriginal} mm`;
};

const anexarObservacao = (observacaoBase?: string, observacaoExtra?: string) => {
  if (!observacaoExtra) return observacaoBase;
  if (!observacaoBase) return observacaoExtra;
  return `${observacaoBase} | ${observacaoExtra}`;
};

export default function RelatorioOrcamento() {
  const { theme } = useTheme();
  const { nomeEmpresa, user, empresaId, loading: checkingAuth } = useAuth()
  const carregadoRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams(); // Adicione esta linha
  const editId = searchParams.get("edit"); // Captura o ID da URL (?edit=...)

  // Estados do Layout (EXATAMENTE COMO VOCÃŠ ENVIOU)
  const [isMounted, setIsMounted] = useState(false);
  const draftRestauradoRef = useRef(false);

  // Estados de Dados do Supabase
  const [listaClientes, setListaClientes] = useState<Cliente[]>([])
  const [listaTabelas, setListaTabelas] = useState<TabelaPreco[]>([])
  const [listaVidros, setListaVidros] = useState<Vidro[]>([])
  const [listaServicos, setListaServicos] = useState<Servico[]>([])
  const [listaKits, setListaKits] = useState<KitCatalogo[]>([])
  const [listaPerfis, setListaPerfis] = useState<PerfilCatalogo[]>([])
  const [listaFerragens, setListaFerragens] = useState<FerragemCatalogo[]>([])
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoEspecial[]>([]);

  // Estados do OrÃ§amento
  const [clienteId, setClienteId] = useState("")
  const [obra, setObra] = useState("")
  const [largura, setLargura] = useState("")
  const [altura, setAltura] = useState("")
  const [quantidade, setQuantidade] = useState(1)
  const [vidroSelecionado, setVidroSelecionado] = useState<Vidro | null>(null)
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null)
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [quantidadeServico, setQuantidadeServico] = useState(1);
  const [tipoAdicionalSelecionado, setTipoAdicionalSelecionado] = useState<"kit" | "perfil" | "ferragem">("kit")
  const [adicionalSelecionadoId, setAdicionalSelecionadoId] = useState("")
  const [quantidadeAdicional, setQuantidadeAdicional] = useState(1)
  const [valorUnitarioAdicional, setValorUnitarioAdicional] = useState("")
  const [filtroCorAdicional, setFiltroCorAdicional] = useState("")
  const [buscaAdicional, setBuscaAdicional] = useState("")

  // EdiÃ§Ã£o de Modal
  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<string | number | null>(null);
  const [mostrarModalLimpar, setMostrarModalLimpar] = useState(false);
  const larguraRef = useRef<HTMLInputElement>(null);
  const alturaRef = useRef<HTMLInputElement>(null);
  const qtdRef = useRef<HTMLInputElement>(null);
  const [mostrarModalAviso, setMostrarModalAviso] = useState(false);
  const [modalAvisoTitulo, setModalAvisoTitulo] = useState("AtenÃ§Ã£o");
  const [modalAvisoMensagem, setModalAvisoMensagem] = useState(
    "Para adicionar o item, vocÃª precisa preencher largura, altura e selecionar o material."
  );
  const [modalAvisoAcoes, setModalAvisoAcoes] = useState<ModalAvisoAcao[] | null>(null);
  const importacaoPendenteRef = useRef<LinhaImportacaoExcel[] | null>(null);

  //excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itensNaoEncontrados, setItensNaoEncontrados] = useState<ItemNaoEncontrado[]>([]);
  const [mostrarModalAssociacao, setMostrarModalAssociacao] = useState(false);
  const [filtroVidroAssociacao, setFiltroVidroAssociacao] = useState("");
  const [indiceVidroAssociacaoAtivo, setIndiceVidroAssociacaoAtivo] = useState(0);
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [ultimoNumeroGerado, setUltimoNumeroGerado] = useState("");
  const linhasItensRef = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [tipoEdicaoRapidaAdicional, setTipoEdicaoRapidaAdicional] = useState<"kit" | "perfil" | "ferragem">("kit");
  const [adicionalEdicaoRapidaId, setAdicionalEdicaoRapidaId] = useState("");
  const [qtdEdicaoRapidaAdicional, setQtdEdicaoRapidaAdicional] = useState("1");
  const [valorEdicaoRapidaAdicional, setValorEdicaoRapidaAdicional] = useState("");

  const draftKey = `orcamento_vidros_draft_${empresaId || "sem_empresa"}_${editId || "novo"}`;

  // Estados para seleÃ§Ã£o em massa
  const [selecionados, setSelecionados] = useState<Array<string | number>>([]);
  const [valorRateioLote, setValorRateioLote] = useState("");

  // FunÃ§Ã£o para marcar/desmarcar todos
  const toggleTodos = () => {
    if (selecionados.length === itens.length) {
      setSelecionados([]);
    } else {
      setSelecionados(itens.map(i => i.id));
    }
  };

  // FunÃ§Ã£o para alternar um item individual
  const toggleItem = (id: string | number) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const idsAlvoRateio = selecionados.length > 0 ? selecionados : itens.map(item => item.id);
  const descricaoAlvoRateio = selecionados.length > 0
    ? `${selecionados.length} cÃ¡lculo(s) selecionado(s)`
    : `todos os ${itens.length} cÃ¡lculo(s)`;

  const nomeAtualAssociacao = itensNaoEncontrados[0]?.nomeExcel || "";
  const nomeAtualAssociacaoNormalizado = normalizarTextoComparacao(nomeAtualAssociacao);
  const termoFiltroAssociacao = normalizarTextoComparacao(filtroVidroAssociacao);
  const pontuarCorrespondenciaVidro = (v: Vidro) => {
    const nomeVidro = String(v.nome || "");
    const etiqueta = `${v.nome || ""} ${v.espessura || ""} ${v.tipo || ""}`;

    const nomeVidroNormalizado = normalizarTextoComparacao(nomeVidro);
    const etiquetaNormalizada = normalizarTextoComparacao(etiqueta);
    const tokensExcel = tokenizarTextoComparacao(nomeAtualAssociacao);
    const tokensVidro = new Set(tokenizarTextoComparacao(etiqueta));

    let score = 0;

    if (nomeAtualAssociacaoNormalizado) {
      if (nomeVidroNormalizado === nomeAtualAssociacaoNormalizado) score += 200;
      if (nomeVidroNormalizado.startsWith(nomeAtualAssociacaoNormalizado)) score += 120;
      if (nomeAtualAssociacaoNormalizado.startsWith(nomeVidroNormalizado)) score += 90;
      if (nomeVidroNormalizado.includes(nomeAtualAssociacaoNormalizado)) score += 80;
      if (etiquetaNormalizada.includes(nomeAtualAssociacaoNormalizado)) score += 30;
    }

    if (termoFiltroAssociacao) {
      if (etiquetaNormalizada.includes(termoFiltroAssociacao)) score += 40;
      if (nomeVidroNormalizado.startsWith(termoFiltroAssociacao)) score += 20;
    }

    const tokensEmComum = tokensExcel.filter((token) => tokensVidro.has(token)).length;
    score += tokensEmComum * 25;

    return score;
  };

  const vidrosFiltradosAssociacao = listaVidros
    .filter((v) => {
      if (!termoFiltroAssociacao) return true;
      const etiqueta = `${v.nome || ""} ${v.espessura || ""} ${v.tipo || ""}`;
      return normalizarTextoComparacao(etiqueta).includes(termoFiltroAssociacao);
    })
    .map((v) => ({ vidro: v, score: pontuarCorrespondenciaVidro(v) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.vidro.nome || "").localeCompare(String(b.vidro.nome || ""), "pt-BR");
    })
    .map((item) => item.vidro);

  useEffect(() => {
    if (!mostrarModalAssociacao || itensNaoEncontrados.length === 0) return;
    setFiltroVidroAssociacao(itensNaoEncontrados[0].nomeExcel || "");
    setIndiceVidroAssociacaoAtivo(0);
  }, [mostrarModalAssociacao, itensNaoEncontrados]);

  useEffect(() => {
    if (vidrosFiltradosAssociacao.length === 0) {
      setIndiceVidroAssociacaoAtivo(0);
      return;
    }

    setIndiceVidroAssociacaoAtivo((prev) => Math.min(prev, vidrosFiltradosAssociacao.length - 1));
  }, [vidrosFiltradosAssociacao]);

  const obterRotuloVidroAssociacao = (v: Vidro) => {
    return montarRotuloVidro(v) || "Sem descricao";
  };

  const obterGrupoPrecoIdCliente = () => {
    const clienteObjeto = listaClientes.find(c => String(c.id) === String(clienteId));
    // Prioriza o campo atualmente usado no cadastro de clientes.
    return clienteObjeto?.grupo_preco_id || clienteObjeto?.tabela_id || null;
  };

  const obterNomeTabelaDoCliente = (grupoIdDoCliente: string | number | null) => {
    if (!grupoIdDoCliente) return "Tabela padrao";
    const tabela = listaTabelas.find((t) => String(t.id) === String(grupoIdDoCliente));
    return tabela?.nome || "Tabela do cliente";
  };

  const obterContextoPrecoVidroPorCliente = (vidro: Vidro, larguraMm: number, alturaMm: number) => {
    const grupoIdDoCliente = obterGrupoPrecoIdCliente();
    const clienteObjeto = listaClientes.find(c => String(c.id) === String(clienteId));

    const precoEspecial = precosEspeciais.find(p =>
      String(p.vidro_id) === String(vidro.id) &&
      String(p.grupo_preco_id || p.tabela_id) === String(grupoIdDoCliente)
    );

    const precoBaseM2 = precoEspecial ? Number(precoEspecial.preco) : Number(vidro.preco);
    const excedeuLimiteMedida = larguraMm > LIMITE_MEDIDA_ACRESCIMO_MM || alturaMm > LIMITE_MEDIDA_ACRESCIMO_MM;
    const precoM2 = aplicarAcrescimoPorMedida(precoBaseM2, larguraMm, alturaMm);

    const observacoesPreco: string[] = [];
    if (precoEspecial) {
      observacoesPreco.push(`Preco especial aplicado: ${obterNomeTabelaDoCliente(grupoIdDoCliente)}`);
    }
    if (excedeuLimiteMedida) {
      observacoesPreco.push(`Acrescimo de ${Math.round(PERCENTUAL_ACRESCIMO_MEDIDA * 100)}% por medida acima de ${LIMITE_MEDIDA_ACRESCIMO_MM}mm`);
    }

    const observacaoPreco = observacoesPreco.length > 0 ? observacoesPreco.join(" | ") : undefined;

    if (DEBUG_PRECO_VIDRO) {
      console.groupCollapsed("[DEBUG PRECO VIDRO] obterContextoPrecoVidroPorCliente");
      console.log("clienteId", clienteId);
      console.log("clienteNome", clienteObjeto?.nome || "-");
      console.log("grupoPrecoId", grupoIdDoCliente);
      console.log("vidroId", vidro.id);
      console.log("vidroNome", montarRotuloVidro(vidro));
      console.log("medidasMm", { larguraMm, alturaMm });
      console.log("precoEspecial", precoEspecial ? Number(precoEspecial.preco) : null);
      console.log("precoBaseM2", precoBaseM2);
      console.log("excedeuLimiteMedida", excedeuLimiteMedida);
      console.log("percentualAcrescimo", PERCENTUAL_ACRESCIMO_MEDIDA);
      console.log("precoM2Final", precoM2);
      console.log("observacaoPreco", observacaoPreco || "-");
      console.groupEnd();
    }

    return { precoM2, observacaoPreco };
  };

  const associarVidroNaoEncontrado = (vidro: Vidro) => {
    if (itensNaoEncontrados.length === 0) return;

    const nomeAtualNoExcel = itensNaoEncontrados[0].nomeExcelNormalizado;
    const correspondentes = itensNaoEncontrados.filter(i => i.nomeExcelNormalizado === nomeAtualNoExcel);
    const novosItens = correspondentes.map(c => {
      const novoItem = gerarObjetoItem(vidro, c.l, c.a, c.qtd);
      const observacaoVaoOriginal = montarObservacaoVaoOriginal(c.medidaOriginalL, c.medidaOriginalA);
      if (observacaoVaoOriginal) {
        novoItem.observacaoPreco = anexarObservacao(novoItem.observacaoPreco, observacaoVaoOriginal);
      }
      return novoItem;
    });

    setItens(prev => [...prev, ...novosItens]);

    const restantes = itensNaoEncontrados.filter(i => i.nomeExcelNormalizado !== nomeAtualNoExcel);
    setItensNaoEncontrados(restantes);
    setFiltroVidroAssociacao(restantes[0]?.nomeExcel || "");

    if (restantes.length === 0) {
      setMostrarModalAssociacao(false);
      setFiltroVidroAssociacao("");
    }
  };

  const itensAdicionaisDisponiveis = tipoAdicionalSelecionado === "kit"
    ? listaKits
    : tipoAdicionalSelecionado === "perfil"
      ? listaPerfis
      : listaFerragens;

  const normalizarTextoFiltroAdicional = (valor: string) =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const extrairListaCores = (valor: unknown) =>
    String(valor || "")
      .split(/[;,/|]+/)
      .map((parte) => normalizarTextoFiltroAdicional(parte))
      .filter(Boolean);

  const termoCorAdicional = normalizarTextoFiltroAdicional(filtroCorAdicional);
  const termoBuscaAdicional = normalizarTextoFiltroAdicional(buscaAdicional);

  const adicionaisFiltrados = itensAdicionaisDisponiveis.filter((item) => {
    const itemComCor = item as { cores?: string | null; codigo?: string | null; nome?: string | null };

    if ((tipoAdicionalSelecionado === "perfil" || tipoAdicionalSelecionado === "ferragem") && termoCorAdicional) {
      const cores = extrairListaCores(itemComCor.cores);
      const nomeNormalizado = normalizarTextoFiltroAdicional(itemComCor.nome || "");
      const corCompativel =
        cores.some((cor) => cor.includes(termoCorAdicional) || termoCorAdicional.includes(cor)) ||
        nomeNormalizado.includes(termoCorAdicional);

      if (!corCompativel) return false;
    }

    if (!termoBuscaAdicional) return true;

    const codigoNormalizado = normalizarTextoFiltroAdicional(itemComCor.codigo || "");
    const nomeNormalizado = normalizarTextoFiltroAdicional(itemComCor.nome || "");
    const buscaComposta = `${codigoNormalizado} ${nomeNormalizado}`.trim();

    return buscaComposta.includes(termoBuscaAdicional);
  });

  const obterPrecoPadraoAdicional = (item: KitCatalogo | PerfilCatalogo | FerragemCatalogo) => {
    const precoPrincipal = normalizarNumeroPlanilha((item as { preco?: unknown }).preco);
    if (precoPrincipal > 0) return precoPrincipal;

    const precoAlternativo = normalizarNumeroPlanilha((item as { preco_por_cor?: unknown }).preco_por_cor);
    return precoAlternativo > 0 ? precoAlternativo : 0;
  };

  const adicionarAdicional = () => {
    const itemSelecionado = itensAdicionaisDisponiveis.find((item) => String(item.id) === String(adicionalSelecionadoId));
    const quantidadeValida = Number(quantidadeAdicional);
    const valorUnitario = parseValorDigitado(valorUnitarioAdicional);

    if (!itemSelecionado) {
      setModalAvisoTitulo("AtenÃ§Ã£o");
      setModalAvisoMensagem("Selecione um kit, perfil ou ferragem para adicionar.");
      setMostrarModalAviso(true);
      return;
    }

    if (!quantidadeValida || quantidadeValida <= 0) {
      setModalAvisoTitulo("Quantidade invÃ¡lida");
      setModalAvisoMensagem("Informe uma quantidade maior que zero para o adicional.");
      setMostrarModalAviso(true);
      return;
    }

    if (valorUnitario < 0) {
      setModalAvisoTitulo("Valor invÃ¡lido");
      setModalAvisoMensagem("O valor unitÃ¡rio nÃ£o pode ser negativo.");
      setMostrarModalAviso(true);
      return;
    }

    const tipoLabel = tipoAdicionalSelecionado === "kit"
      ? "Kit"
      : tipoAdicionalSelecionado === "perfil"
        ? "Perfil"
        : "Ferragem";
    const codigo = "codigo" in itemSelecionado ? String(itemSelecionado.codigo || "").trim() : "";
    const descricaoBase = `${codigo ? `${codigo} - ` : ""}${itemSelecionado.nome}`.trim();

    const novoItem: ItemOrcamento = {
      id: Date.now() + Math.random(),
      descricao: `${tipoLabel}: ${descricaoBase}`,
      tipo: "adicional",
      medidaReal: "0 x 0 mm",
      medidaCalc: "0 x 0 mm",
      qtd: quantidadeValida,
      total: valorUnitario * quantidadeValida,
      servico: "Item adicional",
      servicos: "Item adicional",
      valorServicoUn: valorUnitario,
      acabamento: tipoLabel,
    };

    const itemAtual = editandoId != null ? itens.find((i) => i.id === editandoId) : undefined;
    const atualizandoAdicional = Boolean(itemAtual && itemAtual.tipo === "adicional");

    if (atualizandoAdicional && editandoId != null) {
      setItens((prev) => prev.map((i) => (i.id === editandoId ? { ...novoItem, id: editandoId } : i)));
      setEditandoId(null);
    } else {
      setItens((prev) => [...prev, novoItem]);
    }

    setAdicionalSelecionadoId("");
    setQuantidadeAdicional(1);
    setValorUnitarioAdicional("");
    setFiltroCorAdicional("");
    setBuscaAdicional("");
  };

  useEffect(() => {
    const itemSelecionado = itensAdicionaisDisponiveis.find((item) => String(item.id) === String(adicionalSelecionadoId));
    if (!itemSelecionado) {
      setValorUnitarioAdicional("");
      return;
    }

    const preco = obterPrecoPadraoAdicional(itemSelecionado);
    setValorUnitarioAdicional(preco > 0 ? preco.toFixed(2).replace(".", ",") : "");
  }, [adicionalSelecionadoId, tipoAdicionalSelecionado, itensAdicionaisDisponiveis]);

  const aplicarRateioValorSelecionados = () => {
    if (itens.length === 0) {
      setModalAvisoTitulo("AtenÃ§Ã£o");
      setModalAvisoMensagem("Adicione pelo menos um cÃ¡lculo antes de aplicar o rateio.");
      setMostrarModalAviso(true);
      return;
    }

    const valorTotalRateio = parseValorDigitado(valorRateioLote);

    if (!valorTotalRateio || valorTotalRateio <= 0) {
      setModalAvisoTitulo("Valor invÃ¡lido");
      setModalAvisoMensagem("Informe um valor total vÃ¡lido para distribuir entre os cÃ¡lculos selecionados.");
      setMostrarModalAviso(true);
      return;
    }

    const itensSelecionados = itens.filter(item => idsAlvoRateio.includes(item.id));
    const valoresRateados = distribuirValorIgual(valorTotalRateio, itensSelecionados.length);
    const valoresPorId = new Map(
      itensSelecionados.map((item, index) => [item.id, valoresRateados[index]])
    );

    setItens(prev => prev.map(item => {
      if (!valoresPorId.has(item.id)) return item;

      return {
        ...item,
        total: valoresPorId.get(item.id) || 0,
        totalOriginal: item.totalOriginal ?? item.total,
        totalRateado: true,
        observacaoRateio: `Rateio manual de ${formatarMoeda(valorTotalRateio)} entre ${descricaoAlvoRateio}`
      };
    }));

    setValorRateioLote("");
    setSelecionados([]);
  };

  const removerRateioSelecionados = () => {
    const haRateioSelecionado = itens.some(item => idsAlvoRateio.includes(item.id) && item.totalRateado && typeof item.totalOriginal === 'number');

    if (!haRateioSelecionado) {
      setModalAvisoTitulo("Nada para restaurar");
      setModalAvisoMensagem("Os itens alvo nÃ£o possuem rateio manual para desfazer.");
      setMostrarModalAviso(true);
      return;
    }

    setItens(prev => prev.map(item => {
      if (!idsAlvoRateio.includes(item.id) || !item.totalRateado || typeof item.totalOriginal !== 'number') {
        return item;
      }

      return {
        ...item,
        total: item.totalOriginal,
        totalOriginal: undefined,
        totalRateado: false,
        observacaoRateio: undefined
      };
    }));

    setValorRateioLote("");
    setSelecionados([]);
  };

  const limparFormularioOrcamento = () => {
    setClienteId("");
    setObra("");
    setLargura("");
    setAltura("");
    setQuantidade(1);
    setQuantidadeServico(1);
    setItens([]);
    setSelecionados([]);
    setValorRateioLote("");
    setServicoSelecionado(null);
    setEditandoId(null);
    setItemParaExcluir(null);
    setMostrarModalLimpar(false);
    setMostrarModalAssociacao(false);
    setItensNaoEncontrados([]);
    setUltimoNumeroGerado("");
    sessionStorage.removeItem(draftKey);

    if (listaVidros.length > 0) {
      setVidroSelecionado(listaVidros[0]);
    } else {
      setVidroSelecionado(null);
    }

    setTimeout(() => larguraRef.current?.focus(), 50);
  };

  const handleNovoOrcamento = () => {
    if (editId) {
      sessionStorage.removeItem(draftKey);
      router.push('/calculo/calculovidro');
      return;
    }

    limparFormularioOrcamento();
  };

  const buscarOrcamentoParaEdicao = useCallback(async (id: string) => {
    try {
      console.log("Buscando OrÃ§amento ID:", id);
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

        // 2. Preenche os campos bÃ¡sicos
        setObra(orcamento.obra_referencia || "");
        setUltimoNumeroGerado(orcamento.numero_formatado || "");

        // 3. Carrega os itens
        if (orcamento.itens && Array.isArray(orcamento.itens)) {
          setItens(orcamento.itens);
        }

        // REMOVIDO: O router.push('/admin/relatorio.orcamento'); 
        // NÃ£o queremos sair da pÃ¡gina, queremos editar nela.
      }
    } catch (err) {
      console.error("Erro ao carregar OrÃ§amento para ediÃ§Ã£o:", err);
    }
  }, [listaClientes]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

 useEffect(() => {
    async function carregarDados() {
      if (checkingAuth || !empresaId) return;

      try {
        const [resC, resT, resV, resS, resP, resK, resPerfis, resFerragens] = await Promise.all([
          supabase.from('clientes').select('*').eq('empresa_id', empresaId).order('nome'),
          supabase.from('tabelas').select('id, nome').eq('empresa_id', empresaId).order('nome'),
          supabase.from('vidros').select('*').eq('empresa_id', empresaId).order('nome'),
          supabase.from('servicos').select('*').eq('empresa_id', empresaId).order('nome'),
          // Busca a tabela de vÃ­nculos de preÃ§os especiais
          supabase.from('vidro_precos_grupos').select('*').eq('empresa_id', empresaId),
          supabase.from('kits').select('id, nome, preco, preco_por_cor').eq('empresa_id', empresaId).order('nome'),
          supabase.from('perfis').select('id, codigo, nome, preco, cores').eq('empresa_id', empresaId).order('nome'),
          supabase.from('ferragens').select('id, codigo, nome, preco, cores').eq('empresa_id', empresaId).order('nome')
        ]);

        if (resC.data) setListaClientes(resC.data);
        if (resT.data) setListaTabelas(resT.data);
        if (resV.data) {
          setListaVidros(resV.data);
          if (resV.data.length > 0) setVidroSelecionado(resV.data[0]);
        }
        if (resS.data) setListaServicos(resS.data);
        if (resP.data) setPrecosEspeciais(resP.data); // Salva os preÃ§os especiais aqui
        if (resK.data) setListaKits(resK.data);
        if (resPerfis.data) setListaPerfis(resPerfis.data);
        if (resFerragens.data) setListaFerragens(resFerragens.data);

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
    if (editandoId == null) return;

    const linha = linhasItensRef.current[String(editandoId)];
    if (linha) {
      linha.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [editandoId]);

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

  useEffect(() => {
    if (editandoId == null) return;
    if (String(valorEdicaoRapidaAdicional || "").trim()) return;

    const itemAtual = itens.find((item) => item.id === editandoId);
    const ehAdicional = Boolean(itemAtual && (itemAtual.tipo === "adicional" || identificarTipoAdicionalPorDescricao(itemAtual.descricao)));
    if (!ehAdicional) return;

    const listaAdicionais = tipoEdicaoRapidaAdicional === "kit"
      ? listaKits
      : tipoEdicaoRapidaAdicional === "perfil"
        ? listaPerfis
        : listaFerragens;

    const itemSelecionado = listaAdicionais.find((item) => String(item.id) === String(adicionalEdicaoRapidaId));
    if (!itemSelecionado) return;

    const preco = obterPrecoPadraoAdicional(itemSelecionado);
    if (preco > 0) {
      setValorEdicaoRapidaAdicional(preco.toFixed(2).replace(".", ","));
    }
  }, [
    editandoId,
    itens,
    valorEdicaoRapidaAdicional,
    tipoEdicaoRapidaAdicional,
    listaKits,
    listaPerfis,
    listaFerragens,
    adicionalEdicaoRapidaId,
  ]);

  const fecharModalAviso = () => {
    setMostrarModalAviso(false);
    setModalAvisoAcoes(null);
  };

  const abrirModalAvisoComAcoes = (titulo: string, mensagem: string, acoes: ModalAvisoAcao[]) => {
    setModalAvisoTitulo(titulo);
    setModalAvisoMensagem(mensagem);
    setModalAvisoAcoes(acoes);
    setMostrarModalAviso(true);
  };

  const dividirDimensaoEmPartes = (medida: number, limite: number) => {
    if (medida <= limite) return [medida];

    const quantidadePartes = Math.ceil(medida / limite);
    const tamanhoBase = Math.floor(medida / quantidadePartes);
    const resto = medida - (tamanhoBase * quantidadePartes);

    return Array.from({ length: quantidadePartes }, (_, index) =>
      tamanhoBase + (index < resto ? 1 : 0)
    );
  };

  const expandirLinhaImportacao = (linha: LinhaImportacaoExcel, dividirPeca: boolean): LinhaImportacaoExcel[] => {
    const excedeLimite = linha.l > LIMITE_MEDIDA_ALERTA_DIVISAO_MM || linha.a > LIMITE_MEDIDA_ALERTA_DIVISAO_MM;
    if (!dividirPeca || !excedeLimite) return [linha];

    const partesLargura = dividirDimensaoEmPartes(linha.l, LIMITE_MEDIDA_ALERTA_DIVISAO_MM);
    const partesAltura = dividirDimensaoEmPartes(linha.a, LIMITE_MEDIDA_ALERTA_DIVISAO_MM);

    return partesLargura.flatMap((larguraParte) =>
      partesAltura.map((alturaParte) => ({
        ...linha,
        l: larguraParte,
        a: alturaParte,
        medidaOriginalL: linha.medidaOriginalL || linha.l,
        medidaOriginalA: linha.medidaOriginalA || linha.a,
      }))
    );
  };

  const aplicarImportacaoLinhas = (linhasBase: LinhaImportacaoExcel[], dividirPeca: boolean) => {
    const pendentesParaAssociar: ItemNaoEncontrado[] = [];
    const novosItensProcessados: ItemOrcamento[] = [];
    const linhasConsolidadas = new Map<string, LinhaImportacaoExcel>();

    linhasBase.forEach((linha) => {
      const linhasExpandidas = expandirLinhaImportacao(linha, dividirPeca);

      linhasExpandidas.forEach((linhaExpandida) => {
        const chaveConsolidacao = [
          linhaExpandida.nomeExcelNormalizado,
          linhaExpandida.l,
          linhaExpandida.a,
          linhaExpandida.vidroNoBanco ? String(linhaExpandida.vidroNoBanco.id) : "sem-vidro",
          linhaExpandida.medidaOriginalL || "sem-origem-l",
          linhaExpandida.medidaOriginalA || "sem-origem-a",
        ].join("|");

        const existente = linhasConsolidadas.get(chaveConsolidacao);
        if (existente) {
          existente.qtd += linhaExpandida.qtd;
          return;
        }

        linhasConsolidadas.set(chaveConsolidacao, { ...linhaExpandida });
      });
    });

    linhasConsolidadas.forEach((linhaConsolidada) => {
      if (linhaConsolidada.vidroNoBanco) {
        const novoItem = gerarObjetoItem(
          linhaConsolidada.vidroNoBanco,
          linhaConsolidada.l,
          linhaConsolidada.a,
          linhaConsolidada.qtd
        );

        if (
          linhaConsolidada.medidaOriginalL &&
          linhaConsolidada.medidaOriginalA &&
          (linhaConsolidada.medidaOriginalL !== linhaConsolidada.l || linhaConsolidada.medidaOriginalA !== linhaConsolidada.a)
        ) {
          const observacaoVaoOriginal = montarObservacaoVaoOriginal(linhaConsolidada.medidaOriginalL, linhaConsolidada.medidaOriginalA);
          novoItem.observacaoPreco = anexarObservacao(novoItem.observacaoPreco, observacaoVaoOriginal);
        }

        novosItensProcessados.push(novoItem);
        return;
      }

      pendentesParaAssociar.push({
        nomeExcel: linhaConsolidada.nomeExcel,
        nomeExcelNormalizado: linhaConsolidada.nomeExcelNormalizado,
        l: linhaConsolidada.l,
        a: linhaConsolidada.a,
        qtd: linhaConsolidada.qtd,
        medidaOriginalL: linhaConsolidada.medidaOriginalL,
        medidaOriginalA: linhaConsolidada.medidaOriginalA,
      });
    });

    if (novosItensProcessados.length > 0) {
      setItens((prev) => [...prev, ...novosItensProcessados]);
    }

    if (pendentesParaAssociar.length > 0) {
      setItensNaoEncontrados(pendentesParaAssociar);
      setMostrarModalAssociacao(true);
    }
  };

  const processarImportacaoPendente = (dividirPeca: boolean) => {
    const linhasPendentes = importacaoPendenteRef.current;
    if (!linhasPendentes) return;

    aplicarImportacaoLinhas(linhasPendentes, dividirPeca);
    importacaoPendenteRef.current = null;
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1e3a5a]"></div>
      </div>
    );
  }

  const adicionarItemInterno = (ignorarAlertaDivisao = false) => {
    const l = parseFloat(largura);
    const a = parseFloat(altura);

    if (!l || !a || !vidroSelecionado) {
      setModalAvisoTitulo("AtenÃ§Ã£o");
      setModalAvisoMensagem("Para adicionar o item, vocÃª precisa preencher largura, altura e selecionar o material.");
      setMostrarModalAviso(true);
      return;
    }

    const excedeuLimiteDivisao = l > LIMITE_MEDIDA_ALERTA_DIVISAO_MM || a > LIMITE_MEDIDA_ALERTA_DIVISAO_MM;
    if (excedeuLimiteDivisao && !ignorarAlertaDivisao) {
      abrirModalAvisoComAcoes(
        "PeÃ§a acima de 3600mm",
        `A peÃ§a excede ${LIMITE_MEDIDA_ALERTA_DIVISAO_MM}mm. Deseja manter sem dividir ou ajustar antes de continuar?`,
        [
          {
            id: "cancelar",
            label: "Ajustar peÃ§a",
            variant: "secondary",
          },
          {
            id: "manter",
            label: "Manter sem dividir",
            onClick: () => adicionarItemInterno(true),
          },
        ]
      );
      return;
    }

    const contextoPreco = obterContextoPrecoVidroPorCliente(vidroSelecionado, l, a);
    const precoVidroM2 = contextoPreco.precoM2;

    const lCalc = arredondar5cm(l);
    const aCalc = arredondar5cm(a);
    const areaM2 = (lCalc / 1000) * (aCalc / 1000);
    const areaCobrada = areaM2 < 0.25 ? 0.25 : areaM2;

    const valorTotalVidro = areaCobrada * precoVidroM2;

    if (DEBUG_PRECO_VIDRO) {
      console.groupCollapsed("[DEBUG PRECO VIDRO] adicionarItem");
      console.log("vidroSelecionado", {
        id: vidroSelecionado.id,
        nome: montarRotuloVidro(vidroSelecionado),
        precoCadastro: Number(vidroSelecionado.preco),
      });
      console.log("medidaRealMm", { largura: l, altura: a });
      console.log("medidaCalculoMm", { largura: lCalc, altura: aCalc });
      console.log("areaM2", areaM2);
      console.log("areaCobrada", areaCobrada);
      console.log("precoVidroM2Aplicado", precoVidroM2);
      console.log("valorTotalVidro", valorTotalVidro);
      console.log("observacaoPreco", contextoPreco.observacaoPreco || "-");
      console.groupEnd();
    }

    let valorServicoTotal = 0;
    let detalheServico = "";

    if (servicoSelecionado) {
      const precoUnitarioServico = Number(servicoSelecionado.preco);
      const unidade = servicoSelecionado.unidade?.toLowerCase();

      if (unidade === 'mÂ²') {
        valorServicoTotal = areaCobrada * precoUnitarioServico;
        detalheServico = `${servicoSelecionado.nome} (mÂ²)`;
      }
      else if (unidade === 'ml' || unidade === 'm') {
        // Se for ml, usamos a quantidadeServico que o usuÃ¡rio digitou ou o perÃ­metro
        // Como vocÃª pediu para "pedir", usaremos a quantidadeServico
        valorServicoTotal = quantidadeServico * precoUnitarioServico;
        detalheServico = `${servicoSelecionado.nome} (${quantidadeServico}ml)`;
      }
      else {
        // UNITÃRIO / CNC
        valorServicoTotal = precoUnitarioServico * quantidadeServico;
        detalheServico = `${servicoSelecionado.nome} (${quantidadeServico}un)`;
      }
    }
    const totalPorPeca = valorTotalVidro + valorServicoTotal;

    const novoItem = {
      id: editandoId || Date.now(),
      descricao: `${vidroSelecionado.nome} ${vidroSelecionado.espessura || ''} ${vidroSelecionado.tipo || ''}`.trim(),
      tipo: vidroSelecionado.tipo || "", // Garante que o tipo vÃ¡ para o PDF
      vidro_id: vidroSelecionado.id,
      medidaReal: `${l} x ${a} mm`,
      medidaCalc: `${lCalc} x ${aCalc} mm`,
      qtd: quantidade,
      precoVidroM2,
      valorUnitario: totalPorPeca,
      acabamento: "", // Se vocÃª tiver um estado de acabamento, coloque aqui
      servicos: detalheServico, // Passa o detalhe do serviÃ§o (Furos, CNC, etc)

      servico: detalheServico, // MantÃ©m por compatibilidade com sua tabela na tela
      valorServicoUn: valorServicoTotal,
      total: totalPorPeca * quantidade,
      totalOriginal: undefined,
      totalRateado: false,
      observacaoRateio: undefined,
      observacaoPreco: contextoPreco.observacaoPreco
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

  const adicionarItem = () => {
    adicionarItemInterno(false);
  };

  // FunÃ§Ã£o para troca em massa com recÃ¡lculo total
  const trocarMaterialSelecionados = (novoVidroId: string) => {
    if (!novoVidroId) return;

    const novoVidro = listaVidros.find((v: Vidro) => String(v.id) === String(novoVidroId));
    if (!novoVidro) return;

    // Pegamos o grupo do cliente para garantir o preÃ§o especial na troca
    setItens(prev => prev.map(item => {
      if (selecionados.includes(item.id)) {
        const [lReal, aReal] = item.medidaReal.split('x').map((v: string) => parseInt(v.replace(/\D/g, '')) || 0);
        const contextoPreco = obterContextoPrecoVidroPorCliente(novoVidro, lReal, aReal);
        const vidroAtual = listaVidros.find((v) => String(v.id) === String(item.vidro_id));
        const mesmaFamiliaSemCor = Boolean(
          vidroAtual &&
          obterChaveVidroSemCor(vidroAtual) &&
          obterChaveVidroSemCor(vidroAtual) === obterChaveVidroSemCor(novoVidro)
        );
        const manterPrecoAtual = mesmaFamiliaSemCor && typeof item.precoVidroM2 === 'number' && item.precoVidroM2 > 0;
        const precoVidroM2 = manterPrecoAtual ? Number(item.precoVidroM2) : contextoPreco.precoM2;
        const [lCalc, aCalc] = item.medidaCalc.replace(" mm", "").split('x').map(Number);

        // 3. Refazer o cÃ¡lculo de Ã¡rea
        const areaM2 = (lCalc / 1000) * (aCalc / 1000);
        const areaCobrada = areaM2 < 0.25 ? 0.25 : areaM2;

        // 4. Calcular novos valores
        const novoValorVidroTotal = areaCobrada * precoVidroM2;
        const novoTotalUnitario = novoValorVidroTotal + (item.valorServicoUn || 0);

        if (DEBUG_PRECO_VIDRO) {
          console.groupCollapsed("[DEBUG PRECO VIDRO] trocarMaterialSelecionados");
          console.log("itemId", item.id);
          console.log("vidroAtual", {
            id: vidroAtual?.id || item.vidro_id || null,
            nome: vidroAtual ? montarRotuloVidro(vidroAtual) : item.descricao,
            precoM2ItemAntes: item.precoVidroM2,
          });
          console.log("novoVidro", {
            id: novoVidro.id,
            nome: montarRotuloVidro(novoVidro),
            precoCadastro: Number(novoVidro.preco),
          });
          console.log("mesmaFamiliaSemCor", mesmaFamiliaSemCor);
          console.log("manterPrecoAtual", manterPrecoAtual);
          console.log("precoM2CalculadoContexto", contextoPreco.precoM2);
          console.log("precoM2AplicadoFinal", precoVidroM2);
          console.log("observacaoPrecoFinal", manterPrecoAtual ? item.observacaoPreco || "-" : contextoPreco.observacaoPreco || "-");
          console.groupEnd();
        }

        return {
          ...item,
          descricao: `${novoVidro.nome} ${novoVidro.espessura || ''} ${novoVidro.tipo || ''}`.trim(),
          vidro_id: novoVidro.id,
          precoVidroM2,
          total: novoTotalUnitario * item.qtd,
          totalOriginal: undefined,
          totalRateado: false,
          observacaoRateio: undefined,
          observacaoPreco: manterPrecoAtual ? item.observacaoPreco : contextoPreco.observacaoPreco
        };
      }
      return item;
    }));

    setSelecionados([]); // Limpa seleÃ§Ã£o apÃ³s a troca
  };

  const handleEditarItem = (item: ItemOrcamento) => {
    const tipoAdicional = identificarTipoAdicionalPorDescricao(item.descricao)
      || (String(item.acabamento || "").trim().toLowerCase() === "kit"
        ? "kit"
        : String(item.acabamento || "").trim().toLowerCase() === "perfil"
          ? "perfil"
          : String(item.acabamento || "").trim().toLowerCase() === "ferragem"
            ? "ferragem"
            : null);
    const ehAdicional = item.tipo === "adicional" || tipoAdicional !== null;

    if (ehAdicional) {
      setEditandoId(item.id);

      if (tipoAdicional) {
        setTipoAdicionalSelecionado(tipoAdicional);
        setTipoEdicaoRapidaAdicional(tipoAdicional);

        const descricaoBase = removerPrefixoTipoAdicional(item.descricao).toLowerCase();
        const listaAlvo = tipoAdicional === "kit"
          ? listaKits
          : tipoAdicional === "perfil"
            ? listaPerfis
            : listaFerragens;

        const adicionalEncontrado = listaAlvo.find((adicional) => {
          const codigo = "codigo" in adicional ? String(adicional.codigo || "").trim() : "";
          const nome = String(adicional.nome || "").trim();
          const comCodigo = `${codigo ? `${codigo} - ` : ""}${nome}`.trim().toLowerCase();

          return comCodigo === descricaoBase || nome.toLowerCase() === descricaoBase;
        });

        setAdicionalSelecionadoId(adicionalEncontrado ? String(adicionalEncontrado.id) : "");
        setAdicionalEdicaoRapidaId(adicionalEncontrado ? String(adicionalEncontrado.id) : "");
      }

      setQuantidadeAdicional(Math.max(1, Number(item.qtd) || 1));
      setQtdEdicaoRapidaAdicional(String(Math.max(1, Number(item.qtd) || 1)));

      const valorUnitario = Number(item.valorServicoUn ?? (item.qtd ? item.total / item.qtd : 0));
      setValorUnitarioAdicional(valorUnitario > 0 ? valorUnitario.toFixed(2).replace(".", ",") : "");
      setValorEdicaoRapidaAdicional(valorUnitario > 0 ? valorUnitario.toFixed(2).replace(".", ",") : "");

      // Limpa o formulÃ¡rio de vidro para evitar ediÃ§Ã£o no bloco errado.
      setLargura("");
      setAltura("");
      setQuantidade(1);
      setServicoSelecionado(null);

      return;
    }

    setEditandoId(item.id); // Salva o ID para sabermos que Ã© uma ediÃ§Ã£o

    const [l, a] = item.medidaCalc.split('x');
    setLargura(l.replace(/\D/g, '')); // Pega sÃ³ os nÃºmeros
    setAltura(a.replace(/\D/g, ''));
    setQuantidade(item.qtd);

    const vidro = listaVidros.find(v => String(v.id) === String(item.vidro_id))
      || listaVidros.find(v => item.descricao.includes(v.nome));
    if (vidro) setVidroSelecionado(vidro);

    const servico = listaServicos.find(s => s.nome === item.servico);
    setServicoSelecionado(servico || null);

  };

  const itemEmEdicao = editandoId != null ? itens.find((item) => item.id === editandoId) || null : null;
  const editandoAdicional = Boolean(itemEmEdicao && (itemEmEdicao.tipo === "adicional" || identificarTipoAdicionalPorDescricao(itemEmEdicao.descricao)));
  const editandoVidro = Boolean(editandoId) && !editandoAdicional;
  const listaEdicaoRapidaAdicional = tipoEdicaoRapidaAdicional === "kit"
    ? listaKits
    : tipoEdicaoRapidaAdicional === "perfil"
      ? listaPerfis
      : listaFerragens;

  const tipoLabelEdicaoRapida = tipoEdicaoRapidaAdicional === "kit"
    ? "Kit"
    : tipoEdicaoRapidaAdicional === "perfil"
      ? "Perfil"
      : "Ferragem";

  const salvarEdicaoRapidaAdicional = () => {
    if (editandoId == null) return;

    const qtd = Math.max(1, Number(qtdEdicaoRapidaAdicional) || 1);
    const valorUnitario = parseValorDigitado(valorEdicaoRapidaAdicional);

    if (valorUnitario < 0) {
      setModalAvisoTitulo("Valor invÃ¡lido");
      setModalAvisoMensagem("O valor unitÃ¡rio nÃ£o pode ser negativo.");
      setMostrarModalAviso(true);
      return;
    }

    const itemSelecionado = listaEdicaoRapidaAdicional.find((item) => String(item.id) === String(adicionalEdicaoRapidaId));
    if (!itemSelecionado) {
      setModalAvisoTitulo("AtenÃ§Ã£o");
      setModalAvisoMensagem("Selecione o kit, perfil ou ferragem para concluir a ediÃ§Ã£o.");
      setMostrarModalAviso(true);
      return;
    }

    const codigo = "codigo" in itemSelecionado ? String(itemSelecionado.codigo || "").trim() : "";
    const descricaoBase = `${codigo ? `${codigo} - ` : ""}${itemSelecionado.nome}`.trim();

    setItens((prev) => prev.map((item) => {
      if (item.id !== editandoId) return item;
      return {
        ...item,
        descricao: `${tipoLabelEdicaoRapida}: ${descricaoBase}`,
        acabamento: tipoLabelEdicaoRapida,
        servico: "Item adicional",
        servicos: "Item adicional",
        qtd,
        valorServicoUn: valorUnitario,
        total: valorUnitario * qtd,
        totalOriginal: undefined,
        totalRateado: false,
        observacaoRateio: undefined,
      };
    }));

    setEditandoId(null);
    setTipoEdicaoRapidaAdicional("kit");
    setAdicionalEdicaoRapidaId("");
    setQtdEdicaoRapidaAdicional("1");
    setValorEdicaoRapidaAdicional("");
  };

  const handleSalvarOrcamento = async () => {
    if (itens.length === 0) {
      setModalAvisoTitulo("AtenÃ§Ã£o");
      setModalAvisoMensagem("Adicione pelo menos um item antes de salvar o OrÃ§amento.");
      setMostrarModalAviso(true);
      return;
    }

    try {
      let numeroFinal = "";

      // 1. Gerar ou recuperar nÃºmero
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

      // 2. CÃ¡lculos Totais
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
        valor_total: Number(vTotal), // Garante que Ã© nÃºmero
        empresa_id: empresaId,
        metragem_total: Number(mTotal) || 0, // Garante que Ã© nÃºmero
        peso_total: Number(pesoTotal) || 0,  // <--- FORÃ‡ANDO O NÃšMERO AQUI
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
      setModalAvisoTitulo("Erro ao salvar");
      setModalAvisoMensagem("NÃ£o foi possÃ­vel salvar o OrÃ§amento. " + message);
      setMostrarModalAviso(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // LÃ³gica de "pulo" de campo
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

    if (!clienteId) {
      setModalAvisoTitulo("Selecione o cliente");
      setModalAvisoMensagem("Selecione um cliente antes de importar para aplicar a tabela de preÃ§o correta.");
      setMostrarModalAviso(true);
      if (e.target) e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataData = evt.target?.result;

      // Usamos readAsArrayBuffer para evitar o "risco no meio" (deprecated)
      const wb = XLSX.read(dataData, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // sheet_to_json tenta detectar o cabeÃ§alho automaticamente
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const linhasImportacao: LinhaImportacaoExcel[] = [];
      let quantidadePecasAcimaLimiteDivisao = 0;

      data.forEach((linha) => {
        // MAPEAMENTO INTELIGENTE (Ajustado para o seu arquivo)
        const nomeExcel = String(extrairValor(linha, ["vidro", "descriÃ§Ã£o", "descriÃ§ao", "material", "cor", "item"]) || "").trim();
        const nomeExcelNormalizado = normalizarTextoComparacao(nomeExcel);

        // Captura de medidas - aceita largura/altura em colunas separadas ou medida unica (ex: 802x602)
        const { l, a } = extrairMedidasDaLinha(linha);

        // CAPTURA DA QUANTIDADE (Aqui estava o erro: seu arquivo usa "Qtde.")
        const rawQtd = extrairValor(linha, ["qtde.", "qtde", "quantidade", "qtd"]);
        const qtdNumero = normalizarNumeroPlanilha(rawQtd);
        const qtd = qtdNumero > 0 ? Math.round(qtdNumero) : 1;

        if (!nomeExcelNormalizado || l <= 0 || a <= 0) return;

        if (l > LIMITE_MEDIDA_ALERTA_DIVISAO_MM || a > LIMITE_MEDIDA_ALERTA_DIVISAO_MM) {
          quantidadePecasAcimaLimiteDivisao += qtd;
        }

        const vidroNoBanco = listaVidros.find(v =>
          normalizarTextoComparacao(v.nome) === nomeExcelNormalizado
        );

        linhasImportacao.push({
          nomeExcel,
          nomeExcelNormalizado,
          l,
          a,
          qtd,
          vidroNoBanco: vidroNoBanco || null,
        });
      });

      if (quantidadePecasAcimaLimiteDivisao > 0) {
        importacaoPendenteRef.current = linhasImportacao;

        abrirModalAvisoComAcoes(
          "ImportaÃ§Ã£o com peÃ§as acima de 3600mm",
          `A importaÃ§Ã£o possui ${quantidadePecasAcimaLimiteDivisao} peÃ§a(s) acima de ${LIMITE_MEDIDA_ALERTA_DIVISAO_MM}mm. Como deseja continuar?`,
          [
            {
              id: "cancelar",
              label: "Cancelar",
              variant: "secondary",
              onClick: () => {
                importacaoPendenteRef.current = null;
              },
            },
            {
              id: "manter",
              label: "Importar sem dividir",
              variant: "secondary",
              onClick: () => {
                processarImportacaoPendente(false);
              },
            },
            {
              id: "dividir",
              label: "Dividir e importar",
              onClick: () => {
                processarImportacaoPendente(true);
              },
            },
          ]
        );

        if (e.target) e.target.value = "";
        return;
      }

      aplicarImportacaoLinhas(linhasImportacao, false);

      // Reset do input para permitir importar o mesmo arquivo de novo
      if (e.target) e.target.value = "";
    };

    reader.readAsArrayBuffer(file); // CorreÃ§Ã£o do "risco no meio"
  };


  const extrairValor = (linha: Record<string, unknown>, variacoes: string[]) => {
    // Pega todas as chaves da linha (ex: "Vidro", "Qtde.")
    const chaves = Object.keys(linha);

    const chaveEncontrada = chaves.find(chave => {
      const chaveLimpa = normalizarTextoComparacao(chave);
      return variacoes.some(v => {
        const variacaoLimpa = normalizarTextoComparacao(v);

        if (chaveLimpa === variacaoLimpa) return true;

        // Evita colisao de abreviacoes curtas (ex: "a" casar com "largura").
        if (variacaoLimpa.length <= 2) return false;

        return chaveLimpa.includes(variacaoLimpa);
      });
    });

    return chaveEncontrada ? linha[chaveEncontrada] : null;
  };

  const extrairMedidasDaLinha = (linha: Record<string, unknown>) => {
    const largura = normalizarNumeroPlanilha(extrairValor(linha, ["largura", "larg"]));
    const altura = normalizarNumeroPlanilha(extrairValor(linha, ["altura", "alt"]));

    if (largura > 0 && altura > 0) {
      return { l: largura, a: altura };
    }

    const medidaBruta = extrairValor(linha, ["medida", "medidas", "dimensao", "dimensÃ£o", "tamanho"]);
    const textoMedida = String(medidaBruta || "").trim();

    // Exemplos aceitos: 802x602, 802 x 602, 802*602
    const match = textoMedida.match(/([\d.,]+)\s*[xX*]\s*([\d.,]+)/);
    if (match) {
      const lMedida = normalizarNumeroPlanilha(match[1]);
      const aMedida = normalizarNumeroPlanilha(match[2]);
      return { l: lMedida, a: aMedida };
    }

    return { l: largura, a: altura };
  };

  // FunÃ§Ã£o auxiliar para criar o item com seus cÃ¡lculos (Arredondamento 5cm)
  const gerarObjetoItem = (vidro: Vidro, l: number, a: number, qtd: number): ItemOrcamento => {
    // Medida de CÃ¡lculo (Arredondada 5cm) -> Ex: 408 vira 450
    const lCalc = arredondar5cm(l);
    const aCalc = arredondar5cm(a);

    // Medida Real (FÃ­sica) -> Ex: 408
    const lReal = l;
    const aReal = a;

    const areaM2 = (lCalc / 1000) * (aCalc / 1000);
    const areaCobradaM2 = areaM2 < 0.25 ? 0.25 : areaM2;
    const contextoPreco = obterContextoPrecoVidroPorCliente(vidro, lReal, aReal);
    const precoM2 = contextoPreco.precoM2;
    const valorUnitario = areaCobradaM2 * precoM2;

    return {
      id: Math.random(),
      descricao: `${vidro.nome} ${vidro.espessura || ''} ${vidro.tipo || ''}`.trim(),
      tipo: vidro.tipo || "",
      vidro_id: vidro.id,
      // Guardamos as duas separadas para nÃ£o haver confusÃ£o
      medidaReal: `${lReal} x ${aReal} mm`,
      medidaCalc: `${lCalc} x ${aCalc} mm`,
      qtd: Number(qtd),
      precoVidroM2: precoM2,
      valorUnitario,
      total: areaCobradaM2 * precoM2 * Number(qtd),
      totalOriginal: undefined,
      totalRateado: false,
      observacaoRateio: undefined,
      observacaoPreco: contextoPreco.observacaoPreco
    };
  };

  const calcularPesoItem = (item: ItemOrcamento) => {
    // Extrai a espessura da descriÃ§Ã£o (ex: "4+4" = 8)
    const numeros = item.descricao.match(/\d+/g);
    const espessura = numeros ? numeros.reduce((acc: number, curr: string) => acc + parseInt(curr), 0) : 0;

    // Pega a medida fÃ­sica (408x500)
    const partes = item.medidaReal.split('x').map((v: string) => parseInt(v));
    const largReal = partes[0];
    const altReal = partes[1];

    // CÃ¡lculo: Ãrea Real * 2.5 * Espessura * Qtd
    const areaRealM2 = (largReal / 1000) * (altReal / 1000);
    const pesoFinal = areaRealM2 * 2.5 * espessura * item.qtd;

    return pesoFinal;
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login"); // ForÃ§a o redirecionamento
      router.refresh();      // Garante que o estado do Next.js seja limpo
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };


  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>

      <div className="flex-1 flex flex-col w-full min-w-0">

        <Header
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user?.email || ""}
          handleSignOut={handleLogout}
        >
          {/* ConteÃºdo dinÃ¢mico que aparece ao lado da logo no Header */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col border-l border-gray-200 pl-6">
              <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">OrÃ§amento</h1>
              <span className="text-xs text-gray-800 font-bold"># {ultimoNumeroGerado || "NOVO"}</span>
            </div>

            {/* ÃREA DE AÃ‡Ã•ES DISCRETAS */}
            <div className="ml-6 flex items-center gap-2 animate-fade-in">
              <button
                onClick={handleNovoOrcamento}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700"
              >
                <Plus size={14} />
                Novo OrÃ§amento
              </button>

              {itens.length > 0 && (
                <button
                  onClick={handleSalvarOrcamento}
                  className="flex items-center gap-2 rounded-full border border-[#1e3a5a]/15 bg-[#1e3a5a]/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#1e3a5a] transition-all hover:border-[#1e3a5a]/30 hover:bg-[#1e3a5a]/10"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[#1e3a5a]/55" />
                  Salvar OrÃ§amento
                </button>
              )}
            </div>


            {/* --- BOTÃƒO PDF CORRIGIDO --- */}
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
                  nomeCliente={listaClientes.find((c) => String(c.id) === String(clienteId))?.nome || "NÃ£o selecionado"}
                  nomeObra={obra}

                  // CÃ¡lculo do Peso Total seguindo a lÃ³gica do seu rodapÃ©
                  pesoTotal={itens.reduce((acc: number, item) => acc + calcularPesoItem(item), 0)}

                  // CÃ¡lculo da Metragem Total (MÂ² de CobranÃ§a) - Alinhado com o rodapÃ©
                  metragemTotal={itens.reduce((acc: number, item) => {
                    const [l, a] = item.medidaCalc.split('x').map((v: string) => parseInt(v));
                    return acc + ((l / 1000) * (a / 1000) * item.qtd);
                  }, 0)}

                  // Adicionado: Valor Total do Pedido (importante para o PDF bater com a tela)
                  valorTotal={itens.reduce((acc: number, i) => acc + i.total, 0)}

                  // Adicionado: Total de PeÃ§as
                  totalPecas={itens.reduce((acc: number, i) => acc + Number(i.qtd), 0)}
                />
              }
              fileName={`OrÃ§amento ${listaClientes.find((c) => String(c.id) === String(clienteId))?.nome || 'Geral'
                } - NÂ° ${Date.now().toString().slice(-6)}.pdf`}
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
          {/* IDENTIFICAÃ‡ÃƒO: CLIENTE E OBRA */}
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
              <input type="text" placeholder="IdentificaÃ§Ã£o da obra" className="flex-1 p-2 outline-none text-sm" value={obra} onChange={(e) => setObra(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 lg:self-start">

              {/* CARD DIMENSÃ•ES (MANTIDO) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 relative overflow-hidden">

                {/* AVISO DE EDIÃ‡ÃƒO SOFISTICADO */}
                {editandoId && (
                  <div className="absolute top-0 left-0 w-full bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Edit2 size={14} className="text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        {editandoAdicional ? "Editando adicional" : "Modo EdiÃ§Ã£o Ativo"}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setEditandoId(null);
                        setLargura("");
                        setAltura("");
                        setQuantidade(1);
                        setAdicionalSelecionadoId("");
                        setQuantidadeAdicional(1);
                        setValorUnitarioAdicional("");
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
                      EspecificaÃ§Ãµes
                    </span>
                    <h3 className="text-sm font-bold text-[#1e3a5a]">
                      DimensÃµes
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
                        {montarRotuloVidro(v)}
                      </option>
                    ))}
                  </select>
                  {isMounted && vidroSelecionado && clienteId && (() => {
                    // 1. Localizamos o grupo do cliente
                    const clienteAtual = listaClientes.find(c => String(c.id) === String(clienteId));
                    const grupoId = clienteAtual?.grupo_preco_id || clienteAtual?.tabela_id;
                    const larguraNumero = Number(largura) || 0;
                    const alturaNumero = Number(altura) || 0;

                    // 2. Procuramos o preÃ§o especial
                    const especial = precosEspeciais.find(p =>
                      String(p.vidro_id) === String(vidroSelecionado.id) &&
                      String(p.grupo_preco_id || p.tabela_id) === String(grupoId)
                    );

                    const precoBase = especial ? Number(especial.preco) : Number(vidroSelecionado.preco);
                    const excedeuLimiteMedida = larguraNumero > LIMITE_MEDIDA_ACRESCIMO_MM || alturaNumero > LIMITE_MEDIDA_ACRESCIMO_MM;
                    const precoComAcrescimo = excedeuLimiteMedida
                      ? aplicarAcrescimoPorMedida(precoBase, larguraNumero, alturaNumero)
                      : null;

                    return (
                      <div className="mt-1 space-y-1">
                        <p className={`text-[10px] font-bold uppercase tracking-tighter ${especial ? 'text-gray-600' : 'text-gray-400'}`}>
                          {especial
                            ? `â­ PreÃ§o Diferenciado: ${formatarMoeda(precoBase)} /mÂ²`
                            : `PreÃ§o padrÃ£o: ${formatarMoeda(precoBase)} /mÂ²`}
                        </p>
                        {precoComAcrescimo !== null && (
                          <p className="text-[10px] font-bold uppercase tracking-tighter text-amber-600">
                            {`Com acrÃ©scimo de ${Math.round(PERCENTUAL_ACRESCIMO_MEDIDA * 100)}% por medida: ${formatarMoeda(precoComAcrescimo)} /mÂ²`}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                {/* TÃTULO DA SEÃ‡ÃƒO: ACABAMENTOS */}
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="p-2 bg-[#1e3a5a]/5 rounded-xl text-[#1e3a5a]">
                    {/* Ajustado: removido 'weight' e adicionado 'strokeWidth' para o Lucide */}
                    <Wrench size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-300 uppercase tracking-[0.2em] leading-none">
                      PersonalizaÃ§Ã£o
                    </span>
                    <h3 className="text-sm font-bold text-[#1e3a5a]">
                      Acabamentos e ServiÃ§os
                    </h3>
                  </div>
                </div>
                <div className="space-y-2 max-h-28.75 overflow-y-auto pr-2 custom-scrollbar">
                  {/* OpÃ§Ã£o PadrÃ£o (Nenhum) */}
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

                  {/* Lista de outros serviÃ§os */}
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

                {/* O campo aparece se houver serviÃ§o e a unidade NÃƒO for mÂ² */}
                {servicoSelecionado && servicoSelecionado.unidade?.toLowerCase().trim() !== 'mÂ²' && (
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

                <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus size={14} className="text-[#1e3a5a]" />
                    <span className="text-[10px] font-bold text-[#1e3a5a] uppercase tracking-wider">
                      Adicionar kit, perfil ou ferragem
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={tipoAdicionalSelecionado}
                      onChange={(e) => {
                        setTipoAdicionalSelecionado(e.target.value as "kit" | "perfil" | "ferragem");
                        setAdicionalSelecionadoId("");
                      }}
                      className="w-full p-2.5 bg-white rounded-xl border border-gray-100 outline-none text-sm text-gray-700"
                    >
                      <option value="kit">Kits</option>
                      <option value="perfil">Perfis</option>
                      <option value="ferragem">Ferragens</option>
                    </select>

                    <input
                      type="text"
                      value={filtroCorAdicional}
                      onChange={(e) => setFiltroCorAdicional(e.target.value)}
                      className="w-full p-2.5 bg-white rounded-xl border border-gray-100 outline-none text-sm"
                      placeholder="Cor (perfil/ferragem)"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={buscaAdicional}
                      onChange={(e) => setBuscaAdicional(e.target.value)}
                      className="w-full p-2.5 bg-white rounded-xl border border-gray-100 outline-none text-sm"
                      placeholder="Buscar por cÃ³digo ou nome"
                    />

                    <select
                      value={adicionalSelecionadoId}
                      onChange={(e) => setAdicionalSelecionadoId(e.target.value)}
                      className="w-full p-2.5 bg-white rounded-xl border border-gray-100 outline-none text-sm text-gray-700"
                    >
                      <option value="">Selecione para adicionar...</option>
                      {adicionaisFiltrados.map((item) => {
                        const codigo = "codigo" in item ? String(item.codigo || "").trim() : "";
                        const corItem = "cores" in item ? String(item.cores || "").trim() : "";
                        const precoItem = obterPrecoPadraoAdicional(item);
                        return (
                          <option key={item.id} value={item.id}>
                            {`${codigo ? `${codigo} - ` : ""}${item.nome}${corItem ? ` (${corItem})` : ""}${precoItem > 0 ? ` | ${formatarMoeda(precoItem)}` : ""}`}
                          </option>
                        );
                      })}
                      {adicionaisFiltrados.length === 0 && (
                        <option value="" disabled>
                          Nenhum item encontrado com os filtros
                        </option>
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={quantidadeAdicional}
                      onChange={(e) => setQuantidadeAdicional(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full p-2.5 bg-white rounded-xl border border-gray-100 outline-none text-sm"
                      placeholder="Qtd"
                    />
                    <input
                      type="text"
                      value={valorUnitarioAdicional}
                      onChange={(e) => setValorUnitarioAdicional(e.target.value)}
                      className="w-full p-2.5 bg-white rounded-xl border border-gray-100 outline-none text-sm"
                      placeholder="Valor unitÃ¡rio"
                    />
                  </div>

                  <button
                    onClick={adicionarAdicional}
                    className="w-full py-2.5 bg-white text-[#1e3a5a] border border-[#1e3a5a]/30 rounded-xl font-bold hover:bg-[#1e3a5a]/5 hover:border-[#1e3a5a] transition-all flex items-center justify-center gap-2"
                  >
                    {editandoAdicional ? <Sparkles size={16} /> : <Plus size={16} />}
                    <span>{editandoAdicional ? "Atualizar adicional" : "Adicionar adicional"}</span>
                  </button>
                </div>

                <div className="flex justify-center w-full pt-4">
                  <button
                    onClick={adicionarItem}
                    className="w-1/2 py-2.5 bg-white text-[#1e3a5a] border border-[#1e3a5a]/30 rounded-xl font-bold hover:bg-[#1e3a5a]/5 hover:border-[#1e3a5a] transition-all flex items-center justify-center gap-2"
                  >
                    {editandoVidro ? <Sparkles size={18} /> : <Plus size={18} />}
                    <span>{editandoVidro ? "Atualizar Item" : "Adicionar Item"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-[#1e3a5a]" />
                    <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Resumo do OrÃ§amento</h3>
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
                          <th className="px-6 py-4">DescriÃ§Ã£o / Acabamento</th>
                          <th className="px-6 py-4 text-center">Medidas</th>
                          <th className="px-6 py-4 text-center">Qtd</th>
                          <th className="px-6 py-4 text-right">UnitÃ¡rio</th>
                          <th className="px-6 py-4 text-right">Total</th>
                          <th className="px-6 py-4 text-center">AÃ§Ãµes</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-50">
                        {itens.map((item) => (
                          <tr
                            key={item.id}
                            ref={(el) => {
                              linhasItensRef.current[String(item.id)] = el;
                            }}
                            className={`hover:bg-gray-50/50 transition-colors group ${selecionados.includes(item.id) ? 'bg-blue-50/30' : ''} ${editandoId === item.id ? 'bg-amber-50/70 outline outline-2 outline-amber-200' : ''}`}
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

                            {/* 2. DESCRIÃ‡ÃƒO (Faltava este no seu snippet) */}
                            <td className="px-6 py-4">
                              {/* Nome do Vidro e Espessura */}
                              <div className="text-gray-700 leading-tight">
                                {item.descricao}
                              </div>

                              {/* Tipo do Vidro (SubtÃ­tulo discreto) */}
                              {item.tipo && (
                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">
                                  {item.tipo}
                                </div>
                              )}

                              {item.totalRateado && item.observacaoRateio && (
                                <div className="mt-1 text-[10px] font-bold uppercase tracking-tight text-sky-600">
                                  {item.observacaoRateio}
                                </div>
                              )}

                              {item.observacaoPreco && (
                                <div className="mt-1 text-[10px] font-bold uppercase tracking-tight text-emerald-600">
                                  {item.observacaoPreco}
                                </div>
                              )}

                              {item.observacaoDivisao && (
                                <div className="mt-1 text-[10px] font-bold uppercase tracking-tight text-indigo-600">
                                  {item.observacaoDivisao}
                                </div>
                              )}

                              {editandoId === item.id && (
                                <div className="mt-1 inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-amber-700">
                                  Em edicao
                                </div>
                              )}

                              {/* ServiÃ§o / Acabamento */}
                              {item.servico && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Sparkles size={10} className="text-amber-500" />
                                  <span className="text-[10px] text-gray-400 uppercase font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">
                                    {item.servico}
                                  </span>
                                </div>
                              )}

                              {editandoId === item.id && (item.tipo === "adicional" || identificarTipoAdicionalPorDescricao(item.descricao)) && (
                                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5">
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <select
                                      value={tipoEdicaoRapidaAdicional}
                                      onChange={(e) => {
                                        setTipoEdicaoRapidaAdicional(e.target.value as "kit" | "perfil" | "ferragem");
                                        setAdicionalEdicaoRapidaId("");
                                      }}
                                      className="w-full p-2 bg-white rounded-lg border border-amber-200 outline-none text-xs"
                                    >
                                      <option value="kit">Kit</option>
                                      <option value="perfil">Perfil</option>
                                      <option value="ferragem">Ferragem</option>
                                    </select>
                                    <select
                                      value={adicionalEdicaoRapidaId}
                                      onChange={(e) => {
                                        const novoId = e.target.value;
                                        setAdicionalEdicaoRapidaId(novoId);
                                        const itemSelecionado = listaEdicaoRapidaAdicional.find((itemCatalogo) => String(itemCatalogo.id) === String(novoId));
                                        if (itemSelecionado) {
                                          const preco = obterPrecoPadraoAdicional(itemSelecionado);
                                          if (preco > 0) {
                                            setValorEdicaoRapidaAdicional(preco.toFixed(2).replace(".", ","));
                                          }
                                        }
                                      }}
                                      className="w-full p-2 bg-white rounded-lg border border-amber-200 outline-none text-xs"
                                    >
                                      <option value="">Selecione o item...</option>
                                      {listaEdicaoRapidaAdicional.map((itemCatalogo) => {
                                        const codigo = "codigo" in itemCatalogo ? String(itemCatalogo.codigo || "").trim() : "";
                                        return (
                                          <option key={itemCatalogo.id} value={itemCatalogo.id}>
                                            {`${codigo ? `${codigo} - ` : ""}${itemCatalogo.nome}`}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      value={qtdEdicaoRapidaAdicional}
                                      onChange={(e) => setQtdEdicaoRapidaAdicional(e.target.value)}
                                      className="w-full p-2 bg-white rounded-lg border border-amber-200 outline-none text-xs"
                                      placeholder="Qtd"
                                    />
                                    <input
                                      type="text"
                                      value={valorEdicaoRapidaAdicional}
                                      onChange={(e) => setValorEdicaoRapidaAdicional(e.target.value)}
                                      className="w-full p-2 bg-white rounded-lg border border-amber-200 outline-none text-xs"
                                      placeholder="Valor unitÃ¡rio"
                                    />
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      onClick={salvarEdicaoRapidaAdicional}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-[11px] font-bold hover:bg-amber-200 transition-colors"
                                    >
                                      Salvar aqui
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditandoId(null);
                                        setTipoEdicaoRapidaAdicional("kit");
                                        setAdicionalEdicaoRapidaId("");
                                        setQtdEdicaoRapidaAdicional("1");
                                        setValorEdicaoRapidaAdicional("");
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-white text-gray-600 text-[11px] font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
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

                            {/* 5. UNITÃRIO */}
                            <td className="px-6 py-4 text-right font-medium text-gray-500">
                              {formatarMoeda(item.total / item.qtd)}
                            </td>

                            {/* 6. SUBTOTAL */}
                            <td className="px-6 py-4 text-right font-bold text-[#1e3a5a]">
                              {formatarMoeda(item.total)}
                            </td>

                            {/* 7. AÃ‡Ã•ES */}
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
                      <p className="text-sm font-medium">Nenhum item adicionado ao OrÃ§amento</p>
                    </div>
                  )}
                </div>
                {/* RODAPÃ‰ TÃ‰CNICO E LOGÃSTICO */}
                <div className="p-6 bg-white border-t border-gray-100 flex items-end justify-between gap-8 px-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-8">

                    {/* 1. Qtd Total EM EVIDÃŠNCIA (Destaque colorido) */}
                    <div className="bg-[#1e3a5a]/5 px-5 py-2 rounded-2xl border border-[#1e3a5a]/10 flex flex-col">
                      <span className="text-[9px] font-black text-[#1e3a5a]/60 uppercase tracking-widest">Total de PeÃ§as</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#1e3a5a]">
                          {itens.reduce((acc: number, i) => acc + Number(i.qtd), 0).toString().padStart(2, '0')}
                        </span>
                        <span className="text-xs font-bold text-[#1e3a5a]">un</span>
                      </div>
                    </div>

                    <div className="h-8 w-px bg-gray-100" />

                    {/* 2. Metragem de CobranÃ§a: Sem destaque colorido */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">MÂ² de CobranÃ§a</span>
                      <span className="text-lg font-medium text-gray-500">
                        {itens.reduce((acc: number, item) => {
                          const [l, a] = item.medidaCalc.split('x').map((v: string) => parseInt(v));
                          return acc + ((l / 1000) * (a / 1000) * item.qtd);
                        }, 0).toFixed(3)} mÂ²
                      </span>
                    </div>

                    <div className="h-8 w-px bg-gray-100" />

                    {/* 3. Peso da Carga: Sem destaque colorido */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Peso LogÃ­stico</span>
                      <span className="text-lg font-medium text-gray-500">
                        {itens.reduce((acc: number, item) => acc + calcularPesoItem(item), 0)
                          .toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                      </span>
                    </div>
                  </div>

                  {/* 4. Valor Total do Pedido */}
                  <div className="min-w-[320px] text-right">
                    <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-1">Total do OrÃ§amento</p>
                    <p className="text-3xl font-light text-[#1e3a5a] tracking-tighter">
                      {formatarMoeda(itens.reduce((acc: number, i) => acc + i.total, 0))}
                    </p>
                  </div>
                </div>

                {itens.length > 0 && (
                  <div className="border-t border-gray-100 bg-[#fafbfd] px-10 py-5">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Resumo do OrÃ§amento</p>
                          <h4 className="mt-1 text-sm font-bold text-[#1e3a5a]">Troca de vidro e rateio</h4>
                          <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <span>{selecionados.length > 0 ? `${selecionados.length} selecionados` : `${itens.length} itens`}</span>
                            {selecionados.length > 0 && (
                              <button
                                onClick={() => setSelecionados([])}
                                className="rounded-full p-1 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
                                title="Limpar seleÃ§Ã£o"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <Edit2 size={13} style={{ color: theme.menuIconColor }} />
                            <select
                              onChange={(e) => trocarMaterialSelecionados(e.target.value)}
                              className="bg-transparent border-none text-[12px] uppercase outline-none cursor-pointer font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                            >
                              <option value="" className="text-gray-400">Trocar vidro...</option>
                              {listaVidros.map(v => (
                                <option key={v.id} value={v.id} className="text-slate-700">
                                  {montarRotuloVidro(v)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-sm">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder={selecionados.length > 0 ? "Valor rateio seleÃ§Ã£o" : "Valor rateio geral"}
                              value={valorRateioLote}
                              onChange={(e) => setValorRateioLote(e.target.value)}
                              className="w-36 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 outline-none focus:border-[#1e3a5a]"
                            />
                            <button
                              onClick={aplicarRateioValorSelecionados}
                              className="rounded-full bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-700"
                            >
                              {selecionados.length > 0 ? "Ratear seleÃ§Ã£o" : "Ratear todos"}
                            </button>
                            <button
                              onClick={removerRateioSelecionados}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                            >
                              {selecionados.length > 0 ? "Restaurar seleÃ§Ã£o" : "Restaurar todos"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* MODAL DE CONFIRMAÃ‡ÃƒO DE EXCLUSÃƒO */}
        {itemParaExcluir && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-scale-up">
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={28} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Remover Item?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Tem certeza que deseja remover este item do pedido? Esta aÃ§Ã£o nÃ£o pode ser desfeita.
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
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList size={28} className="text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Esvaziar OrÃ§amento?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Isso irÃ¡ remover **todos os {itens.length} itens** da sua lista atual. Essa aÃ§Ã£o nÃ£o pode ser desfeita.
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
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator size={28} className="text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{modalAvisoTitulo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {modalAvisoMensagem}
                </p>
              </div>

              <div className="p-4 bg-gray-50">
                {modalAvisoAcoes && modalAvisoAcoes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {modalAvisoAcoes.map((acao) => (
                      <button
                        key={acao.id}
                        onClick={() => {
                          const callback = acao.onClick;
                          fecharModalAviso();
                          callback?.();
                        }}
                        className={`w-full py-4 text-sm font-black rounded-2xl transition-all active:scale-95 shadow-sm ${
                          acao.variant === "secondary"
                            ? "text-gray-600 bg-white border border-gray-200 hover:bg-gray-100"
                            : "text-[#1e3a5a] bg-white border border-[#1e3a5a]/30 hover:bg-[#1e3a5a]/5"
                        }`}
                      >
                        {acao.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={fecharModalAviso}
                    className="w-full py-4 text-sm font-black text-[#1e3a5a] bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {mostrarModalAssociacao && itensNaoEncontrados.length > 0 && (
          <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-[#1e3a5a]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-white/20">

              {/* CabeÃ§alho */}
              <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                  <ClipboardList size={24} className="text-[#1e3a5a]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1e3a5a] uppercase tracking-tighter leading-tight">
                    Associar Material
                  </h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                    Item nÃ£o reconhecido no sistema
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
                  <input
                    type="text"
                    value={filtroVidroAssociacao}
                    onChange={(e) => setFiltroVidroAssociacao(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setIndiceVidroAssociacaoAtivo((prev) => Math.min(prev + 1, Math.max(vidrosFiltradosAssociacao.length - 1, 0)));
                        return;
                      }

                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setIndiceVidroAssociacaoAtivo((prev) => Math.max(prev - 1, 0));
                        return;
                      }

                      if (e.key === "Enter") {
                        e.preventDefault();
                        const vidroSelecionado = vidrosFiltradosAssociacao[indiceVidroAssociacaoAtivo];
                        if (vidroSelecionado) associarVidroNaoEncontrado(vidroSelecionado);
                      }
                    }}
                    placeholder="Digite nome, espessura ou tipo para filtrar"
                    className="w-full p-3 bg-white rounded-2xl border border-gray-200 outline-none text-sm text-gray-700 focus:ring-2 focus:ring-[#1e3a5a]/20 transition-all"
                  />
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                    Lista filtrada ({vidrosFiltradosAssociacao.length}) - use setas e Enter
                  </p>
                  <div className="w-full max-h-56 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50/70 p-1.5 space-y-1">
                    {vidrosFiltradosAssociacao.map((v, index) => {
                      const ativo = index === indiceVidroAssociacaoAtivo;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onMouseEnter={() => setIndiceVidroAssociacaoAtivo(index)}
                          onClick={() => associarVidroNaoEncontrado(v)}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all"
                          style={{
                            backgroundColor: ativo ? "#e2e8f0" : "transparent",
                            color: "#334155"
                          }}
                        >
                          {obterRotuloVidroAssociacao(v)}
                        </button>
                      );
                    })}
                  </div>
                  {vidrosFiltradosAssociacao.length === 0 && (
                    <p className="text-[11px] text-amber-600">
                      Nenhum vidro encontrado com esse filtro.
                    </p>
                  )}
                </div>

                {/* BotÃ£o Pular (Agora na cor do tema) */}
                <button
                  onClick={() => {
                    const nomeAtual = itensNaoEncontrados[0].nomeExcelNormalizado;
                    const restantes = itensNaoEncontrados.filter(i => i.nomeExcelNormalizado !== nomeAtual);
                    setItensNaoEncontrados(restantes);
                    setFiltroVidroAssociacao(restantes[0]?.nomeExcel || "");
                    if (restantes.length === 0) {
                      setMostrarModalAssociacao(false);
                      setFiltroVidroAssociacao("");
                    }
                  }}
                  className="w-full py-4 text-[10px] font-black text-[#1e3a5a]/60 hover:text-[#1e3a5a] hover:bg-gray-50 rounded-2xl transition-all uppercase  border border-transparent hover:border-gray-100"
                >
                  Descartar este material
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DISCRETO E AUTOMÃTICO - POSIÃ‡ÃƒO SUPERIOR */}
        {mostrarModalSucesso && (
          <div className="fixed top-6 right-6 z-100 animate-in slide-in-from-top-5 fade-in duration-500">
            <div
              className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl p-4 w-72 flex items-center gap-4 ring-1 ring-black/5"
              style={{ borderRight: `4px solid ${theme.menuIconColor}` }}
            >

              {/* Ãcone com a cor do tema */}
              <div
                className="p-2 rounded-xl shrink-0"
                style={{ color: theme.menuIconColor }}
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
                  Ver HistÃ³rico
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
