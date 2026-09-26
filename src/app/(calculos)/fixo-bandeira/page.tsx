"use client";
import PerfisExtrasProjeto from "@/components/PerfisExtrasProjeto";
import { DRAWING_COLORS } from "@/design/drawing";
import { useClienteOrcamento } from "@/context/OrcamentoContext";
import ClienteQuickCreateButton from "@/components/ClienteQuickCreateButton";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { gerarNumeroOrcamentoPadrao } from "@/utils/orcamentoNumero";
import { ordemMaterialRelacao } from "@/utils/ordemMateriais";
import { localizarVidroPorDescricao } from "@/utils/vidros";
import { escolherItemPorCor } from "@/utils/catalogo-cor";
import { normalizarPrecoCatalogo } from "@/utils/precos";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Copy,
  DollarSign,
  FileText,
  FolderOpen,
  Grid2X2,
  HelpCircle,
  Layers,
  Layers3,
  MoveHorizontal,
  MoveVertical,
  Palette,
  Printer,
  RailSymbol,
  Save,
  Search,
  Settings,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { ProjetoIndividualPDF, type ProjetoIndividualDados, type ProjetoIndividualMaterial } from "../../relatorios/projetoindividual/ProjetoIndividualPDF";
import { LoteRapidoProjetos, useLoteRapidoProjetos } from "@/components/LoteRapidoProjetos";
import { mesclarMateriaisAutomaticos } from "@/utils/materiaisAutomaticos";

type ClienteCadastro = {
  id: string;
  nome: string;
  rota?: string | null;
  grupo_preco_id?: string | null;
};

type TabelaPrecoCadastro = {
  id: string;
  nome: string;
};

type VidroCadastro = {
  id: string;
  nome: string;
  espessura?: string | number | null;
  tipo?: string | null;
  preco?: number | null;
};

type PrecoVidroGrupo = {
  vidro_id: string;
  grupo_preco_id: string | null;
  preco: number;
};

type PerfilCadastro = {
  id: string;
  codigo: string;
  nome: string;
  cores?: string | null;
  categoria?: string | null;
  preco?: number | null;
  empresa_id: string;
  nome_completo?: string | null;
};

type ItemCatalogo = {
  id: string;
  tipo: "perfil" | "ferragem";
  descricao: string;
  preco: number;
};

type FixoBandeiraOrcamentoPersistido = {
  tipo?: string;
  modo?: string;
  dados?: Partial<FixoBandeiraDados>;
  materiais?: ProjetoIndividualMaterial[];
};

type CentralImpressaoProjetoItem = {
  id: string;
  numero?: string;
  projeto?: string;
  cliente?: string;
  obra?: string;
  medidas?: string;
  largura?: number;
  altura?: number;
  quantidade?: number;
  modo?: string;
  desenhoUrl?: string;
  vidro?: string;
  corKit?: string;
  corPerfil?: string;
  alturaAteTubo?: number;
  vidroBandeira?: string;
  tuboPerfil?: string;
  tuboUso?: string;
  trilho?: string;
  puxador?: string;
  tamanhoPuxador?: string;
  trinco?: string;
  pecasDivisao?: number;
  valorTotal?: number;
  materiais?: ProjetoIndividualMaterial[];
  origemRota?: string;
  loteId?: string;
  loteSeq?: number;
  loteTotal?: number;
  loteObservacao?: string;
};

type FixoBandeiraDados = Omit<ProjetoIndividualDados, "materiais"> & {
  pecasDivisao: number;
  alturaAteTubo: number;
  vidroBandeira: string;
  tuboPerfil: string;
  tuboUso: string;
};

const formatarVidroCadastro = (vidro: VidroCadastro) => {
  const partes = [vidro.nome];
  const espessura = vidro.espessura ? String(vidro.espessura).replace(/\s*mm$/i, "") : "";
  if (espessura) partes.push(`${espessura}mm`);
  const tipo = vidro.tipo?.trim();
  if (tipo) partes.push(tipo);
  return partes.join(" ");
};

const arredondar5cm = (valor: number) => Math.ceil(Number(valor || 0) / 50) * 50;

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const numero = (valor: number, casas = 2) =>
  Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const parseNumeroPtBr = (valor: string) => Number(valor.replace(/\./g, "").replace(",", ".") || 0);

const ehUnidadeM2 = (unidade?: string) => normalizarTexto(unidade).includes("m2");

const formatarQtdMaterial = (qtd: number, unidade?: string) =>
  ehUnidadeM2(unidade) ? numero(qtd) : String(Number(qtd || 0));

const parseQtdMaterial = (valor: string, unidade?: string) =>
  ehUnidadeM2(unidade) ? parseNumeroPtBr(valor) : Number(valor || 0);

const limitarNumero4Digitos = (valor: string) => {
  const somenteDigitos = valor.replace(/\D/g, "").slice(0, 4);
  return Number(somenteDigitos || 0);
};

const hojePtBr = () => new Date().toLocaleDateString("pt-BR");

const criarMaterial = (parcial?: Partial<ProjetoIndividualMaterial>): ProjetoIndividualMaterial => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()),
  qtd: parcial?.qtd ?? 1,
  unidade: parcial?.unidade ?? "und",
  descricao: parcial?.descricao ?? "Novo item",
  valorUnitario: parcial?.valorUnitario ?? 0,
  codigoPerfil: parcial?.codigoPerfil,
  comprimentoBarra: parcial?.comprimentoBarra,
  cortes: parcial?.cortes,
  perfilExtra: parcial?.perfilExtra,
});

const corKitOpcoes = ["Escolher", "Preto", "Branco", "Fosco"];
const divisaoPecasOpcoes = ["1", "2", "3", "4", "5", "6"];
const tuboUsoOpcoes = ["Somente largura", "Largura + altura da bandeira"];

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();


const ordemMaterialDescricao = (descricaoOriginal?: string, unidadeOriginal?: string) => ordemMaterialRelacao({
  descricao: descricaoOriginal,
  unidade: unidadeOriginal,
});
const PROJETO_INDIVIDUAL_DRAFT_KEY = "glasscode:fixo-bandeira:rascunho";
const PROJETO_INDIVIDUAL_CONFIG_KEY = "glasscode:fixo-bandeira:config";
const CENTRAL_IMPRESSAO_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_IMPRESSAO_CLIENTE_KEY = "glasscode:central-impressao:cliente";

const formatarDescricaoTubo = (perfil: Pick<PerfilCadastro, "codigo" | "nome" | "nome_completo" | "cores">) => {
  const codigo = String(perfil.codigo || "").trim().toUpperCase();
  const nome = String(perfil.nome_completo || perfil.nome || "").trim().toLocaleUpperCase("pt-BR");
  const cor = String(perfil.cores || "").trim().toLocaleUpperCase("pt-BR");
  return `${codigo}${nome ? ` - ${nome}` : ""}${cor ? ` | ${cor}` : ""}`;
};

const limitarDivisaoPecas = (valor: number) => Math.min(6, Math.max(1, Number(valor || 1)));

const desenhoFixoBandeiraPorPecas = (pecas: number) => {
  const folhas = limitarDivisaoPecas(pecas);
  return `/desenhos/fixo-${folhas}folhascombandeira.png`;
};

const dividirCortePorBarra = (comprimentoMm: number, comprimentoBarra = 6000) => {
  const comprimento = Math.ceil(Number(comprimentoMm || 0));
  const barra = Math.max(1, Math.ceil(Number(comprimentoBarra || 6000)));

  if (comprimento <= 0) return [];
  if (comprimento <= barra) return [comprimento];

  const partes = Math.ceil(comprimento / barra);
  const base = Math.floor(comprimento / partes);
  const sobra = comprimento - base * partes;

  return Array.from({ length: partes }, (_, index) => base + (index < sobra ? 1 : 0));
};

const prepararCortesPorBarra = (cortes: number[], comprimentoBarra = 6000) =>
  cortes.flatMap((corte) => dividirCortePorBarra(corte, comprimentoBarra));

const calcularBarrasPorCortes = (cortesOriginais: number[], comprimentoBarra = 6000) => {
  const cortes = prepararCortesPorBarra(cortesOriginais, comprimentoBarra)
    .filter((corte) => corte > 0)
    .sort((a, b) => b - a);

  const barras: number[] = [];

  cortes.forEach((corte) => {
    const barraIndex = barras.findIndex((usado) => usado + corte <= comprimentoBarra);

    if (barraIndex >= 0) {
      barras[barraIndex] += corte;
    } else {
      barras.push(corte);
    }
  });

  return barras.length;
};


export default function FixoBandeiraPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const centralItemId = searchParams.get("centralItem");
  const centralLoteId = searchParams.get("loteId");
  const returnTo = searchParams.get("returnTo") || "/admin/relatorio.orcamento";
  const { empresaId, nomeEmpresa } = useAuth();
  const { theme } = useTheme();
  const logoUsuario = theme.logoLightUrl || theme.logoUrl || theme.logoDarkUrl || null;
  const [clientes, setClientes] = useState<ClienteCadastro[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [listaClientesAberta, setListaClientesAberta] = useState(false);
  const [clienteAtivoIndex, setClienteAtivoIndex] = useState(0);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const [vidros, setVidros] = useState<VidroCadastro[]>([]);
  const [carregandoVidros, setCarregandoVidros] = useState(false);
  const [listaVidrosAberta, setListaVidrosAberta] = useState(false);
  const [vidroAtivoIndex, setVidroAtivoIndex] = useState(0);
  const vidroInputRef = useRef<HTMLInputElement>(null);
  const [listaVidrosBandeiraAberta, setListaVidrosBandeiraAberta] = useState(false);
  const [vidroBandeiraAtivoIndex, setVidroBandeiraAtivoIndex] = useState(0);
  const vidroBandeiraInputRef = useRef<HTMLInputElement>(null);
  const [precosVidroGrupos, setPrecosVidroGrupos] = useState<PrecoVidroGrupo[]>([]);
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPrecoCadastro[]>([]);
  const [perfis, setPerfis] = useState<PerfilCadastro[]>([]);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [buscaAjuda, setBuscaAjuda] = useState("");
  const [preferencias, setPreferencias] = useState({
    corPadrão: "Escolher",
    quantidadePadrão: 1,
    lembrarRascunho: true,
    avisarCamposZerados: true,
    mostrarValoresPdf: true,
    mostrarMateriaisPdf: true,
  });
  const [mensagemSistema, setMensagemSistema] = useState<{
    tipo: "sucesso" | "erro" | "aviso";
    titulo: string;
    mensagem: string;
    aoFechar?: () => void;
  } | null>(null);
  const [dados, setDados] = useState<FixoBandeiraDados>({
    projeto: "Fixo com bandeira",
    numero: "005412",
    data: hojePtBr(),
    cliente: "",

    obra: "",
    largura: 0,
    altura: 0,
    quantidade: 1,
    trilho: "",
    vidro: "Escolher",
    corKit: "Escolher",
    puxador: "",
    tamanhoPuxador: "",
    trinco: "",
    observacao: "Imagem ilustrativa do projeto",
    pecasDivisao: 1,
    alturaAteTubo: 0,
    vidroBandeira: "Escolher",
    tuboPerfil: "Escolher",
    tuboUso: "Somente largura",
  });
  const orcamentoAtivo = useClienteOrcamento({ cliente: dados.cliente, onCliente: cliente => setDados(atual => ({ ...atual, cliente })) });

  const [materiais, setMateriais] = useState<ProjetoIndividualMaterial[]>([]);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(PROJETO_INDIVIDUAL_CONFIG_KEY);
      if (!salvo) return;
      const config = JSON.parse(salvo) as Partial<typeof preferencias>;
      setPreferencias((atual) => ({ ...atual, ...config }));
    } catch (erro) {
      console.warn("Não foi possível restaurar as configuracoes do projeto:", erro);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROJETO_INDIVIDUAL_CONFIG_KEY, JSON.stringify(preferencias));
    } catch (erro) {
      console.warn("Não foi possível salvar as configuracoes do projeto:", erro);
    }
  }, [preferencias]);

  useEffect(() => {
    if (!preferencias.lembrarRascunho || editId || centralItemId) {
      setRascunhoRestaurado(true);
      return;
    }

    try {
      const salvo = window.localStorage.getItem(PROJETO_INDIVIDUAL_DRAFT_KEY);

      if (salvo) {
        const rascunho = JSON.parse(salvo) as {
          dados?: Partial<FixoBandeiraDados>;
          materiais?: ProjetoIndividualMaterial[];
        };

        if (rascunho.dados) {
          setDados((atual) => ({ ...atual, ...rascunho.dados }));
        }

        if (Array.isArray(rascunho.materiais)) {
          setMateriais(rascunho.materiais);
        }
      }
    } catch (erro) {
      console.warn("Não foi possível restaurar o rascunho do projeto individual:", erro);
    } finally {
      setRascunhoRestaurado(true);
    }
  }, [centralItemId, editId, preferencias.lembrarRascunho]);

  useEffect(() => {
    if (!preferencias.lembrarRascunho || !rascunhoRestaurado || editId || centralItemId) return;

    try {
      window.localStorage.setItem(
        PROJETO_INDIVIDUAL_DRAFT_KEY,
        JSON.stringify({ dados, materiais })
      );
    } catch (erro) {
      console.warn("Não foi possível salvar o rascunho do projeto individual:", erro);
    }
  }, [centralItemId, dados, editId, materiais, preferencias.lembrarRascunho, rascunhoRestaurado]);

  useEffect(() => {
    if (!centralItemId) return;

    try {
      const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = salvo ? JSON.parse(salvo) as CentralImpressaoProjetoItem[] : [];
      const item = lista.find((projeto) => projeto.id === centralItemId);

      if (!item) {
        setMensagemSistema({
          tipo: "aviso",
          titulo: "Projeto não encontrado",
          mensagem: "Não foi possível localizar este projeto na central de impressão.",
          aoFechar: () => router.push(returnTo),
        });
        return;
      }

      setDados((atual) => ({
        ...atual,
        projeto: "Fixo com bandeira",
        numero: item.numero || atual.numero,
        cliente: item.cliente || atual.cliente,
        obra: item.obra || "",
        largura: Number(item.largura || 0),
        altura: Number(item.altura || 0),
        quantidade: Number(item.quantidade || 1),
        trilho: "",
        vidro: item.vidro || "Escolher",
        corKit: item.corPerfil || item.corKit || "Escolher",
        alturaAteTubo: Number(item.alturaAteTubo || 0),
        vidroBandeira: item.vidroBandeira || "Escolher",
        tuboPerfil: item.tuboPerfil || "Escolher",
        tuboUso: item.tuboUso || "Somente largura",
        puxador: "",
        tamanhoPuxador: String(limitarDivisaoPecas(Number(item.pecasDivisao || item.tamanhoPuxador || 1))),
        trinco: "",
        pecasDivisao: limitarDivisaoPecas(Number(item.pecasDivisao || item.tamanhoPuxador || 1)),
      }));

      setMateriais(Array.isArray(item.materiais) ? item.materiais : []);
    } catch (erro) {
      console.warn("Não foi possível carregar o projeto da central de impressão:", erro);
      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao carregar",
        mensagem: "Não foi possível carregar este projeto para edição.",
        aoFechar: () => router.push(returnTo),
      });
    }
  }, [centralItemId, returnTo, router]);

  const projetoPdf: ProjetoIndividualDados = useMemo(() => ({ ...dados, materiais }), [dados, materiais]);
  const totalMateriais = useMemo(
    () => materiais.reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0),
    [materiais]
  );
  const totalVidros = Number(dados.quantidade || 0) * Number(dados.pecasDivisao || 1) * 2;
  const valorVidros = useMemo(
    () => materiais
      .filter((item) => !item.perfilExtra && item.descricao.toLowerCase().includes("vidro"))
      .reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0),
    [materiais]
  );
  const valorPerfis = useMemo(
    () => materiais
      .filter((item) => {
        const descricao = item.descricao.toLowerCase();
        const unidade = item.unidade.toLowerCase();
        return unidade.includes("barra") || descricao.includes("Barra") || descricao.includes("perfil") || descricao.includes("tubo") || descricao.includes("cantoneira") || descricao.includes("vt");
      })
      .reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0),
    [materiais]
  );
  const valorFerragens = Math.max(0, totalMateriais - valorVidros - valorPerfis);
  const topicosAjuda = useMemo(() => [
    {
      titulo: "Como preencher as medidas",
      categoria: "Medidas",
      texto: "Informe largura e altura total do vão em milímetros. A altura até o tubo é a altura da parte inferior; o sistema calcula a bandeira pela diferença entre altura total e altura até o tubo.",
    },
    {
      titulo: "Como funciona a divisão das folhas",
      categoria: "Projeto",
      texto: "No campo Projeto escolha de 1 a 6 folhas. A largura do vidro inferior e a largura do vidro da bandeira são divididas pela mesma quantidade de folhas.",
    },
    {
      titulo: "Cálculo do vidro inferior",
      categoria: "Vidros",
      texto: "O vidro inferior usa largura do vão menos 25 mm e altura até o tubo menos 25 mm. Depois divide a largura pela quantidade de folhas escolhida.",
    },
    {
      titulo: "Cálculo do vidro da bandeira",
      categoria: "Vidros",
      texto: "A bandeira usa largura do vão menos 25 mm e altura da bandeira menos 25 mm. A largura também é dividida pela quantidade de folhas.",
    },
    {
      titulo: "Arredondamento do vidro",
      categoria: "Vidros",
      texto: "A cobrança do vidro continua arredondando as medidas para cima de 5 em 5 cm, mas a descrição mostra a medida real calculada da peça.",
    },
    {
      titulo: "Cor do material",
      categoria: "Materiais",
      texto: "A cor do material filtra perfis e tubos cadastrados. Se não aparecer tubo, confira se ele está cadastrado com a cor selecionada.",
    },
    {
      titulo: "Escolha do tubo",
      categoria: "Materiais",
      texto: "A lista de tubo traz perfis cadastrados como tubo retangular ou tubo quadrado. O tubo pode calcular somente na largura ou na largura mais altura da bandeira.",
    },
    {
      titulo: "Perfis automáticos",
      categoria: "Materiais",
      texto: "Para vidro 10 mm o sistema usa VT10. Para 8 mm ou 6 mm usa VT66. A parte inferior e a bandeira podem usar espessuras diferentes.",
    },
    {
      titulo: "PDF+ e central de impressão",
      categoria: "Impressão",
      texto: "O botão PDF+ envia o projeto para a central de impressão. Se estiver editando pela central, salvar atualiza o mesmo item e volta para a central.",
    },
    {
      titulo: "Salvar orçamento",
      categoria: "Salvamento",
      texto: "O botão Salvar grava o orçamento no sistema e gera a numeração automática quando for um orçamento novo.",
    },
    {
      titulo: "Rascunho automático",
      categoria: "Configurações",
      texto: "Quando ativado, o sistema guarda a digitação desta página no navegador para não perder o cálculo se atualizar a tela.",
    },
    {
      titulo: "Itens manuais",
      categoria: "Materiais",
      texto: "Use Adicionar item para complementar a relação de materiais. Os itens automáticos são recalculados quando medidas, vidros, cor ou tubo mudam.",
    },
  ], []);
  const topicosAjudaFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaAjuda);
    if (!termo) return topicosAjuda;
    return topicosAjuda.filter((topico) =>
      normalizarTexto(`${topico.titulo} ${topico.categoria} ${topico.texto}`).includes(termo)
    );
  }, [buscaAjuda, topicosAjuda]);
  const materiaisOrdenados = useMemo(
    () => materiais
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const ordemA = ordemMaterialDescricao(a.item.descricao, a.item.unidade);
        const ordemB = ordemMaterialDescricao(b.item.descricao, b.item.unidade);
        return ordemA === ordemB ? a.index - b.index : ordemA - ordemB;
      })
      .map(({ item }) => item),
    [materiais]
  );
  const clientesFiltrados = useMemo(() => {
    const termo = dados.cliente.trim().toLowerCase();
    if (!termo || dados.cliente === "Cliente Exemplo") return clientes.slice(0, 8);
    return clientes.filter((cliente) => cliente.nome.toLowerCase().includes(termo)).slice(0, 8);
  }, [clientes, dados.cliente]);
  const vidrosFiltrados = useMemo(() => {
    const termo = dados.vidro.trim().toLowerCase();
    if (!termo) return vidros.slice(0, 8);
    return vidros.filter((vidro) => formatarVidroCadastro(vidro).toLowerCase().includes(termo)).slice(0, 8);
  }, [dados.vidro, vidros]);
  const vidrosBandeiraFiltrados = useMemo(() => {
    const termo = dados.vidroBandeira.trim().toLowerCase();
    if (!termo || dados.vidroBandeira === "Escolher") return vidros.slice(0, 8);
    return vidros.filter((vidro) => formatarVidroCadastro(vidro).toLowerCase().includes(termo)).slice(0, 8);
  }, [dados.vidroBandeira, vidros]);
  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.nome === dados.cliente) || null,
    [clientes, dados.cliente]
  );
  const tabelaPrecoSelecionada = useMemo(
    () => tabelasPreco.find((tabela) => String(tabela.id) === String(clienteSelecionado?.grupo_preco_id || "")) || null,
    [clienteSelecionado?.grupo_preco_id, tabelasPreco]
  );
  const vidroSelecionado = useMemo(
    () => localizarVidroPorDescricao(vidros, dados.vidro, formatarVidroCadastro),
    [dados.vidro, vidros]
  );
  const vidroBandeiraSelecionado = useMemo(
    () => localizarVidroPorDescricao(vidros, dados.vidroBandeira, formatarVidroCadastro),
    [dados.vidroBandeira, vidros]
  );
  const precoVidroM2 = useMemo(() => {
    if (!vidroSelecionado) return 0;

    const precoGrupo = clienteSelecionado?.grupo_preco_id ? precosVidroGrupos.find(
        (preco) =>
          String(preco.vidro_id) === String(vidroSelecionado.id) &&
          String(preco.grupo_preco_id) === String(clienteSelecionado.grupo_preco_id)
      )
      : null;

    return normalizarPrecoCatalogo(precoGrupo?.preco ?? vidroSelecionado.preco ?? 0);
  }, [clienteSelecionado, precosVidroGrupos, vidroSelecionado]);
  const precoVidroBandeiraM2 = useMemo(() => {
    if (!vidroBandeiraSelecionado) return 0;

    const precoGrupo = clienteSelecionado?.grupo_preco_id ? precosVidroGrupos.find(
        (preco) =>
          String(preco.vidro_id) === String(vidroBandeiraSelecionado.id) &&
          String(preco.grupo_preco_id) === String(clienteSelecionado.grupo_preco_id)
      )
      : null;

    return normalizarPrecoCatalogo(precoGrupo?.preco ?? vidroBandeiraSelecionado.preco ?? 0);
  }, [clienteSelecionado, precosVidroGrupos, vidroBandeiraSelecionado]);
  const calculoVidro = useMemo(() => {
    const pecas = limitarDivisaoPecas(Number(dados.pecasDivisao || 1));
    const largura = Math.max(0, Number(dados.largura || 0));
    const alturaTotal = Math.max(0, Number(dados.altura || 0));
    const alturaInferiorBase = Math.min(alturaTotal, Math.max(0, Number(dados.alturaAteTubo || 0)));
    const alturaBandeiraBase = Math.max(0, alturaTotal - alturaInferiorBase);
    const larguraInferiorTotal = Math.max(0, largura - 25);
    const alturaInferiorMedida = Math.max(0, alturaInferiorBase - 25);
    const larguraInferiorMedida = pecas > 0 ? larguraInferiorTotal / pecas : larguraInferiorTotal;
    const larguraBandeiraTotal = Math.max(0, largura - 25);
    const larguraBandeiraMedida = pecas > 0 ? larguraBandeiraTotal / pecas : larguraBandeiraTotal;
    const alturaBandeiraMedida = Math.max(0, alturaBandeiraBase - 25);
    const larguraInferiorCalculo = arredondar5cm(larguraInferiorMedida);
    const alturaInferiorCalculo = arredondar5cm(alturaInferiorMedida);
    const larguraBandeiraCalculo = arredondar5cm(larguraBandeiraMedida);
    const alturaBandeiraCalculo = arredondar5cm(alturaBandeiraMedida);
    const areaInferior = (larguraInferiorCalculo * alturaInferiorCalculo) / 1_000_000 * pecas;
    const areaBandeira = (larguraBandeiraCalculo * alturaBandeiraCalculo) / 1_000_000 * pecas;
    const areaTotalCobrada = (areaInferior + areaBandeira) * Number(dados.quantidade || 0);

    return {
      larguraCalculo: larguraInferiorCalculo,
      alturaCalculo: alturaInferiorCalculo,
      larguraMedida: Math.round(larguraInferiorMedida),
      alturaMedida: Math.round(alturaInferiorMedida),
      larguraBandeiraCalculo,
      alturaBandeiraCalculo,
      larguraBandeiraMedida: Math.round(larguraBandeiraMedida),
      alturaBandeiraMedida: Math.round(alturaBandeiraMedida),
      areaInferior: Number((areaInferior * Number(dados.quantidade || 0)).toFixed(3)),
      areaBandeira: Number((areaBandeira * Number(dados.quantidade || 0)).toFixed(3)),
      areaTotalCobrada: Number(areaTotalCobrada.toFixed(3)),
    };
  }, [dados.altura, dados.alturaAteTubo, dados.largura, dados.pecasDivisao, dados.quantidade]);

  const selecionarItemCatalogo = (idMaterial: string, item: ItemCatalogo) => {
    setMateriais((lista) =>
      lista.map((material) =>
        material.id === idMaterial ? {
            ...material,
            descricao: item.descricao,
            unidade: item.tipo === "perfil" ? "barra" : "und",
            valorUnitario: item.preco,
          codigoPerfil: item.tipo === "perfil" ? item.descricao.split(" - ")[0]?.trim() || material.codigoPerfil : material.codigoPerfil,
          personalizadoCatalogo: Boolean(material.origemCalculo),
          }
          : material
      )
    );
  };

  const atualizarCampo = <K extends keyof FixoBandeiraDados>(
    campo: K,
    valor: FixoBandeiraDados[K]
  ) => setDados((atual) => ({ ...atual, [campo]: valor }));

  const atualizarMaterial = <K extends keyof ProjetoIndividualMaterial>(
    id: string,
    campo: K,
    valor: ProjetoIndividualMaterial[K]
  ) => {
    setMateriais((lista) => lista.map((item) => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const duplicarMaterial = (item: ProjetoIndividualMaterial) => {
    setMateriais((lista) => [...lista, criarMaterial({ ...item })]);
  };

  const removerMaterial = (id: string) => {
    setMateriais((lista) => lista.filter((item) => item.id !== id));
  };

  const selecionarCliente = (cliente: ClienteCadastro) => {
    atualizarCampo("cliente", cliente.nome);
    setListaClientesAberta(false);
    setClienteAtivoIndex?.(0);
  };

  const selecionarVidro = (vidro: VidroCadastro) => {
    atualizarCampo("vidro", formatarVidroCadastro(vidro));
    setListaVidrosAberta(false);
    setVidroAtivoIndex?.(0);
  };

  const selecionarVidroBandeira = (vidro: VidroCadastro) => {
    atualizarCampo("vidroBandeira", formatarVidroCadastro(vidro));
    setListaVidrosBandeiraAberta(false);
    setVidroBandeiraAtivoIndex?.(0);
  };

  const obterEspessuraVidro = (texto: string) => {
    const match = texto.match(/(\d{1,2})\s*mm/i);
    return match ? Number(match[1]) : 0;
  };

  const ehSufixoCorCatalogo = (sufixo: string) => /^[a-z]{1,8}$/.test(sufixo);

  const codigoCatalogoCompativel = useCallback((codigoCatalogo: string, codigoBase: string) => {
    if (codigoCatalogo === codigoBase) return true;
    if (!codigoCatalogo.startsWith(codigoBase)) return false;
    const sufixo = codigoCatalogo.slice(codigoBase.length);
    return ehSufixoCorCatalogo(sufixo);
  }, []);

  const perfilCorrespondeCor = useCallback((perfil: PerfilCadastro) => {
    const corSelecionada = normalizarTexto(dados.corKit);
    if (!corSelecionada || corSelecionada === "escolher") return false;
    return normalizarTexto(perfil.cores).includes(corSelecionada);
  }, [dados.corKit]);

  const buscarPerfilPorCodigo = useCallback((codigo: string) => {
    const codigoNormalizado = normalizarTexto(codigo);

    const candidatos = perfis.filter((perfil) => {
      const codigoOk = codigoCatalogoCompativel(normalizarTexto(perfil.codigo), codigoNormalizado);
      return codigoOk;
    });

    return escolherItemPorCor(candidatos, dados.corKit, (perfil) => perfil.cores);
  }, [codigoCatalogoCompativel, perfilCorrespondeCor, perfis]);


  const criarPerfilBarra = useCallback((codigo: string, cortesProjeto: number[]) => {
    const quantidadeProjeto = Number(dados.quantidade || 0);
    const perfil = buscarPerfilPorCodigo(codigo);
    const cortesUnitarios = prepararCortesPorBarra(cortesProjeto, 6000)
      .map((corte) => Number(corte || 0))
      .filter((corte) => corte > 0);
    const cortes = Array.from({ length: quantidadeProjeto }, () => cortesUnitarios).flat();

    if (!perfil || cortes.length <= 0) return null;

    return criarMaterial({
      qtd: calcularBarrasPorCortes(cortes, 6000),
      unidade: "barra",
      descricao: `${perfil.codigo} - ${perfil.nome_completo || perfil.nome}${perfil.cores ? ` | ${perfil.cores}` : ""}`.toUpperCase(),
      valorUnitario: Number(perfil.preco || 0),
      codigoPerfil: perfil.codigo,
      comprimentoBarra: 6000,
      cortes,
    });
  }, [buscarPerfilPorCodigo, dados.quantidade]);

  const criarPerfilBarraPorCadastro = useCallback((perfil: PerfilCadastro, cortesProjeto: number[]) => {
    const quantidadeProjeto = Number(dados.quantidade || 0);
    const cortesUnitarios = prepararCortesPorBarra(cortesProjeto, 6000)
      .map((corte) => Number(corte || 0))
      .filter((corte) => corte > 0);
    const cortes = Array.from({ length: quantidadeProjeto }, () => cortesUnitarios).flat();

    if (!perfil || cortes.length <= 0) return null;

    return criarMaterial({
      qtd: calcularBarrasPorCortes(cortes, 6000),
      unidade: "barra",
      descricao: formatarDescricaoTubo(perfil),
      valorUnitario: Number(perfil.preco || 0),
      codigoPerfil: perfil.codigo,
      comprimentoBarra: 6000,
      cortes,
    });
  }, [dados.quantidade]);

  const tuboOpcoes = useMemo(() => {
    const opcoes = perfis
      .filter((perfil) => {
        const texto = normalizarTexto(`${perfil.codigo} ${perfil.nome} ${perfil.nome_completo || ""} ${perfil.categoria || ""}`);
        return perfilCorrespondeCor(perfil) && (texto.includes("tubo retangular") || texto.includes("tubo quadrado"));
      })
      .map(formatarDescricaoTubo);

    return ["Escolher", ...Array.from(new Set(opcoes))];
  }, [dados.corKit, perfis]);

  const perfilTuboSelecionado = useMemo(() => {
    if (!dados.tuboPerfil || dados.tuboPerfil === "Escolher") return null;
    const codigoSelecionado = dados.tuboPerfil.split("-")[0]?.trim();
    if (!codigoSelecionado) return null;
    return buscarPerfilPorCodigo(codigoSelecionado);
  }, [buscarPerfilPorCodigo, dados.tuboPerfil]);

  const perfisAutomaticos = useMemo(() => {
    const espessura = obterEspessuraVidro(dados.vidro);
    const espessuraBandeira = obterEspessuraVidro(dados.vidroBandeira);
    const largura = Math.max(0, Number(dados.largura || 0));
    const alturaInferior = Math.max(0, Number(dados.alturaAteTubo || 0));
    const alturaBandeira = Math.max(0, Number(dados.altura || 0) - alturaInferior);

    if (dados.corKit === "Escolher" || largura <= 0 || Number(dados.altura || 0) <= 0) return [];

    const codigoInferior = espessura === 10 ? "VT10" : [8, 6].includes(espessura) ? "VT66" : "";
    const codigoBandeira = espessuraBandeira === 10 ? "VT10" : [8, 6].includes(espessuraBandeira) ? "VT66" : "";
    const cortesInferior = [largura, largura, alturaInferior, alturaInferior];
    const cortesBandeira = [largura, largura, alturaBandeira, alturaBandeira];
    const cortesTubo = dados.tuboUso === "Largura + altura da bandeira" ? [largura, alturaBandeira] : [largura];

    const itens = [
      codigoInferior ? criarPerfilBarra(codigoInferior, cortesInferior) : null,
      codigoBandeira ? criarPerfilBarra(codigoBandeira, cortesBandeira) : null,
      perfilTuboSelecionado ? criarPerfilBarraPorCadastro(perfilTuboSelecionado, cortesTubo) : null,
    ].filter((item): item is ProjetoIndividualMaterial => Boolean(item));

    const agrupados = new Map<string, ProjetoIndividualMaterial>();
    itens.forEach((item) => {
      const chave = normalizarTexto(item.codigoPerfil || item.descricao);
      const atual = agrupados.get(chave);
      if (!atual) {
        agrupados.set(chave, item);
        return;
      }
      const cortes = [...(atual.cortes || []), ...(item.cortes || [])];
      agrupados.set(chave, {
        ...atual,
        cortes,
        qtd: calcularBarrasPorCortes(cortes, Number(atual.comprimentoBarra || 6000)),
      });
    });

    return Array.from(agrupados.values());
  }, [criarPerfilBarra, criarPerfilBarraPorCadastro, dados.altura, dados.alturaAteTubo, dados.corKit, dados.largura, dados.tuboUso, dados.vidro, dados.vidroBandeira, perfilTuboSelecionado]);

  useEffect(() => {
    let ativo = true;

    const carregarCadastros = async () => {
      if (!empresaId) return;

      setCarregandoClientes(true);
      setCarregandoVidros(true);
      const [
        { data: clientesData, error: clientesError },
        { data: tabelasData, error: tabelasError },
        { data: vidrosData, error: vidrosError },
        { data: precosVidroData, error: precosVidroError },
        { data: perfisData, error: perfisError },
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, rota, grupo_preco_id")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),

        supabase
          .from("tabelas")
          .select("id, nome")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),

        supabase
          .from("vidros")
          .select("id, nome, espessura, tipo, preco")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),

        supabase
          .from("vidro_precos_grupos")
          .select("vidro_id, grupo_preco_id, preco")
          .eq("empresa_id", empresaId),


        supabase
          .from("perfis")
          .select("id, codigo, nome, cores, categoria, preco, empresa_id, nome_completo")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),
      ]);



      if (!ativo) return;

      if (clientesError) {
        console.error("Erro ao carregar clientes:", clientesError);
        setClientes([]);
      } else {
        const lista = (clientesData || []) as ClienteCadastro[];
        setClientes(lista);
        if (lista.length > 0) {
          setDados((atual) => ({
            ...atual,
            cliente: atual.cliente === "Cliente Exemplo" || atual.cliente === "Selecionar Cliente " ? lista[0].nome : atual.cliente,
          }));
        }
      }
      if (tabelasError) {
        console.error("Erro ao carregar tabelas:", tabelasError);
        setTabelasPreco([]);
      } else {
        setTabelasPreco((tabelasData || []) as TabelaPrecoCadastro[]);
      }

      if (vidrosError) {
        console.error("Erro ao carregar vidros:", vidrosError);
        setVidros([]);
      } else {
        const lista = (vidrosData || []) as VidroCadastro[];
        setVidros(lista);
        if (lista.length > 0) {
          setDados((atual) => ({
            ...atual,
            vidro: atual.vidro === "Fume 10mm" ? formatarVidroCadastro(lista[0]) : atual.vidro,
            vidroBandeira: atual.vidroBandeira === "Fume 10mm" ? formatarVidroCadastro(lista[0]) : atual.vidroBandeira,
          }));
        }
      }

      if (precosVidroError) {
        console.error("Erro ao carregar preços por tabela:", precosVidroError);
        setPrecosVidroGrupos([]);
      } else {
        setPrecosVidroGrupos((precosVidroData || []) as PrecoVidroGrupo[]);
      }

      if (perfisError) {
        console.error("Erro ao carregar perfis:", perfisError);
        setPerfis([]);
      } else {
        const listaPerfis = (perfisData || []) as PerfilCadastro[];
        setPerfis(listaPerfis);
      }

      setCarregandoClientes(false);
      setCarregandoVidros(false);
    };

    carregarCadastros();

    return () => {
      ativo = false;
    };
  }, [empresaId]);

  useEffect(() => {
    setClienteAtivoIndex?.(0);
  }, [dados.cliente]);

  useEffect(() => {
    if (listaClientesAberta) {
      window.setTimeout(() => clienteInputRef.current?.focus(), 0);
    }
  }, [listaClientesAberta]);

  useEffect(() => {
    setVidroAtivoIndex?.(0);
  }, [dados.vidro]);

  useEffect(() => {
    if (listaVidrosAberta) {
      window.setTimeout(() => {
        vidroInputRef.current?.focus();
        vidroInputRef.current?.select();
      }, 0);
    }
  }, [listaVidrosAberta]);

  useEffect(() => {
    setVidroBandeiraAtivoIndex?.(0);
  }, [dados.vidroBandeira]);

  useEffect(() => {
    if (listaVidrosBandeiraAberta) {
      window.setTimeout(() => {
        vidroBandeiraInputRef.current?.focus();
        vidroBandeiraInputRef.current?.select();
      }, 0);
    }
  }, [listaVidrosBandeiraAberta]);



  useEffect(() => {
    const vidroNome = dados.vidro && dados.vidro !== "Escolher" ? dados.vidro.replace(/^vidro\s+/i, "").trim()
      : "";
    const vidroBandeiraNome = dados.vidroBandeira && dados.vidroBandeira !== "Escolher" ? dados.vidroBandeira.replace(/^vidro\s+/i, "").trim()
      : "";

    const medidaVidro = `${calculoVidro.larguraMedida}x${calculoVidro.alturaMedida}`;
    const medidaVidroBandeira = `${calculoVidro.larguraBandeiraMedida}x${calculoVidro.alturaBandeiraMedida}`;
    const descricaoVidro = `VIDRO INFERIOR ${medidaVidro} ${vidroNome.toUpperCase()}`;
    const descricaoVidroBandeira = `VIDRO BANDEIRA ${medidaVidroBandeira} ${vidroBandeiraNome.toUpperCase()}`;

    const vidroInferior = vidroNome && calculoVidro.areaInferior > 0 ? criarMaterial({
        qtd: calculoVidro.areaInferior,
        unidade: "m2",
        descricao: descricaoVidro,
        medida: `${calculoVidro.larguraMedida} x ${calculoVidro.alturaMedida} mm`,
        vidroDescricao: `VIDRO INFERIOR ${vidroNome.toUpperCase()}`,
        valorUnitario: precoVidroM2,
      })
      : null;

    const vidroBandeira = vidroBandeiraNome && calculoVidro.areaBandeira > 0 ? criarMaterial({
        qtd: calculoVidro.areaBandeira,
        unidade: "m2",
        descricao: descricaoVidroBandeira,
        medida: `${calculoVidro.larguraBandeiraMedida} x ${calculoVidro.alturaBandeiraMedida} mm`,
        vidroDescricao: `VIDRO BANDEIRA ${vidroBandeiraNome.toUpperCase()}`,
        valorUnitario: precoVidroBandeiraM2,
      })
      : null;

    setMateriais((lista) => {
      const semVidrosAutomaticos = lista.filter((item) => item.perfilExtra || (!normalizarTexto(item.descricao).includes("vidro inferior") && !normalizarTexto(item.descricao).includes("vidro bandeira")));
      return [vidroInferior, vidroBandeira, ...semVidrosAutomaticos].filter((item): item is ProjetoIndividualMaterial => Boolean(item));
    });
  }, [calculoVidro.alturaBandeiraMedida, calculoVidro.alturaMedida, calculoVidro.areaBandeira, calculoVidro.areaInferior, calculoVidro.larguraBandeiraMedida, calculoVidro.larguraMedida, dados.vidro, dados.vidroBandeira, precoVidroBandeiraM2, precoVidroM2]);

  useEffect(() => {
    setMateriais((lista) => {
      return mesclarMateriaisAutomaticos(lista, perfisAutomaticos);
    });
  }, [perfisAutomaticos]);

  const novoProjeto = () => {
    if (editId) {
      router.push("/fixo-bandeira");
      return;
    }

    window.localStorage.removeItem(PROJETO_INDIVIDUAL_DRAFT_KEY);

    setDados((atual) => ({
      ...atual,
      cliente: "",

      obra: "",
      largura: 0,
      altura: 0,
      quantidade: preferencias.quantidadePadrão,
      trilho: "",
      vidro: "Escolher",
      vidroBandeira: "Escolher",
      corKit: preferencias.corPadrão,
      alturaAteTubo: 0,
      tuboPerfil: "Escolher",
      tuboUso: "Somente largura",
      puxador: "",
      tamanhoPuxador: "",
      trinco: "",
      pecasDivisao: 1,
    }));

    setMateriais([]);
  };

  const montarItemCentral = (
    id?: string,
    dadosProjeto: FixoBandeiraDados = dados,
    materiaisProjeto: ProjetoIndividualMaterial[] = materiais,
    lote?: { id: string; seq: number; total: number; observacao?: string }
  ): CentralImpressaoProjetoItem => {
    const folhas = limitarDivisaoPecas(Number(dadosProjeto.pecasDivisao || 1));
    const desenhoUrl = desenhoFixoBandeiraPorPecas(folhas);
    const totalProjeto = materiaisProjeto.reduce(
      (soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0),
      0
    );

    return {
      id: id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      numero: dadosProjeto.numero || "novo",
      projeto: "Fixo com bandeira",
      cliente: dadosProjeto.cliente || "",
      obra: dadosProjeto.obra?.trim() || "",
      medidas: `${Number(dadosProjeto.largura || 0)} x ${Number(dadosProjeto.altura || 0)} mm`,
      largura: Number(dadosProjeto.largura || 0),
      altura: Number(dadosProjeto.altura || 0),
      quantidade: Number(dadosProjeto.quantidade || 0),
      modo: "Barra",
      desenhoUrl,
      vidro: dadosProjeto.vidro || "",
      corKit: dadosProjeto.corKit || "",
      corPerfil: dadosProjeto.corKit || "",
      alturaAteTubo: Number(dadosProjeto.alturaAteTubo || 0),
      vidroBandeira: dadosProjeto.vidroBandeira || "",
      tuboPerfil: dadosProjeto.tuboPerfil || "",
      tuboUso: dadosProjeto.tuboUso || "",
      trilho: "",
      puxador: "",
      tamanhoPuxador: String(folhas),
      trinco: "",
      pecasDivisao: folhas,
      valorTotal: Number(totalProjeto || 0),
      materiais: materiaisProjeto,
      origemRota: "/fixo-bandeira",
      loteId: lote?.id,
      loteSeq: lote?.seq,
      loteTotal: lote?.total,
      loteObservacao: lote?.observacao,
    };
  };

  const enviarParaCentralImpressao = () => {
    const itemCentral = montarItemCentral(centralItemId || undefined);

    try {
      const atual = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = atual ? JSON.parse(atual) as CentralImpressaoProjetoItem[] : [];
      const proximaLista = centralItemId && lista.some((item) => item.id === centralItemId) ? lista.map((item) => item.id === centralItemId ? itemCentral : item)
        : [...lista, itemCentral];

      window.localStorage.setItem(CENTRAL_IMPRESSAO_KEY, JSON.stringify(proximaLista));
      if (dados.cliente) {
        window.localStorage.setItem(CENTRAL_IMPRESSAO_CLIENTE_KEY, dados.cliente);
      }
    } catch (erro) {
      console.warn("Não foi possível enviar o projeto para a central de impressão:", erro);
    }

    router.push(centralItemId ? returnTo : "/central-impressao");
  };

  const gerarNumeroOrcamento = async () => {
    return gerarNumeroOrcamentoPadrao(supabase);
  };

  const carregarOrcamentoParaEdicao = useCallback(async () => {
    if (!editId) return;

    const { data: orcamento, error } = await supabase
      .from("orcamentos")
      .select("*")
      .eq("id", editId)
      .single();

    if (error) {
      console.error("Erro ao carregar Orçamento Fixo Bandeira:", error);
      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao carregar",
        mensagem: `Não foi possível carregar o Orçamento: ${error.message}`,
      });
      return;
    }

    const itens = orcamento?.itens as FixoBandeiraOrcamentoPersistido | null;
    if (itens?.tipo !== "fixo-bandeira") {
      setMensagemSistema({
        tipo: "aviso",
        titulo: "Orçamento incompatível",
        mensagem: "Este Orçamento não pertence ao Fixo com bandeira.",
        aoFechar: () => router.push(returnTo),
      });
      return;
    }

    setDados((atual) => ({
      ...atual,
      ...(itens.dados || {}),
      numero: orcamento.numero_formatado || atual.numero,
      cliente: orcamento.cliente_nome || itens.dados?.cliente || atual.cliente,
      obra: itens.dados?.obra || "",
      projeto: "Fixo com bandeira",
    }));
    setMateriais(Array.isArray(itens.materiais) ? itens.materiais : []);
  }, [editId, returnTo, router]);

  useEffect(() => {
    carregarOrcamentoParaEdicao();
  }, [carregarOrcamentoParaEdicao]);
  const loteRapido = useLoteRapidoProjetos({
    centralLoteId,
    centralItemId,
    returnTo,
    dados,
    materiais,
    setDados,
    setMensagemSistema,
    montarItemCentral,
    onNavigate: router.push,
  });

  const salvarOrcamento = async () => {
    if (orcamentoAtivo) { enviarParaCentralImpressao(); return; }
    if (centralItemId) {
      try {
        setSalvandoOrcamento(true);
        const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
        const lista = salvo ? JSON.parse(salvo) as CentralImpressaoProjetoItem[] : [];
        const itemAtualizado = montarItemCentral(centralItemId);
        const proximaLista = lista.some((item) => item.id === centralItemId) ? lista.map((item) => item.id === centralItemId ? itemAtualizado : item)
          : [...lista, itemAtualizado];

        window.localStorage.setItem(CENTRAL_IMPRESSAO_KEY, JSON.stringify(proximaLista));
        if (dados.cliente) {
          window.localStorage.setItem(CENTRAL_IMPRESSAO_CLIENTE_KEY, dados.cliente);
        }
        window.localStorage.removeItem(PROJETO_INDIVIDUAL_DRAFT_KEY);
        router.push(returnTo);
      } catch (erro) {
        console.warn("Não foi possível atualizar o projeto na central de impressão:", erro);
        setMensagemSistema({
          tipo: "erro",
          titulo: "Erro ao salvar",
          mensagem: "Não foi possível atualizar este projeto na central de impressão.",
        });
      } finally {
        setSalvandoOrcamento(false);
      }
      return;
    }

    if (!empresaId) {
      setMensagemSistema({
        tipo: "erro",
        titulo: "Empresa não encontrada",
        mensagem: "Empresa não encontrada para salvar o Orçamento.",
      });
      return;
    }

    if (!dados.cliente.trim()) {
      setMensagemSistema({
        tipo: "aviso",
        titulo: "Cliente obrigatório",
        mensagem: "Selecione ou informe o cliente antes de salvar.",
      });
      return;
    }

    try {
      setSalvandoOrcamento(true);

      const numeroFinal = editId ? dados.numero : await gerarNumeroOrcamento();
      const dadosAtualizados = {
        ...dados,
        numero: numeroFinal,
        data: dados.data || hojePtBr(),
        projeto: "Fixo com bandeira",
      };
      const itensPersistidos: FixoBandeiraOrcamentoPersistido & {
        resumo: {
          areaTotal: number;
          totalVidros: number;
          valorVidros: number;
          valorPerfis: number;
          valorFerragens: number;
          valorTotal: number;
        };
      } = {
        tipo: "fixo-bandeira",
        modo: "Barra",
        dados: dadosAtualizados,
        materiais,
        resumo: {
          areaTotal: calculoVidro.areaTotalCobrada,
          totalVidros,
          valorVidros,
          valorPerfis,
          valorFerragens,
          valorTotal: totalMateriais,
        },
      };

      const payload = {
        numero_formatado: numeroFinal,
        cliente_nome: dadosAtualizados.cliente || "Consumidor",
        obra_referencia: dadosAtualizados.obra?.trim() || null,
        itens: itensPersistidos,
        valor_total: Number(totalMateriais || 0),
        metragem_total: Number(calculoVidro.areaTotalCobrada || 0),
        peso_total: 0,
        empresa_id: empresaId,
        theme_color: DRAWING_COLORS.ink,
      };

      const { error } = editId ? await supabase.from("orcamentos").update(payload).eq("id", editId)
        : await supabase.from("orcamentos").insert([payload]);

      if (error) throw error;

      setDados(dadosAtualizados);
      window.localStorage.removeItem(PROJETO_INDIVIDUAL_DRAFT_KEY);
      setMensagemSistema({
        tipo: "sucesso",
        titulo: editId ? "Orçamento atualizado" : "Orçamento salvo",
        mensagem: `Orçamento ${numeroFinal} salvo com sucesso.`,
        aoFechar: () => router.push(returnTo),
      });
    } catch (erro) {
      const erroSupabase = erro as { message?: string; details?: string; hint?: string; code?: string };
      const mensagem = erroSupabase?.message || (erro instanceof Error ? erro.message : "Erro desconhecido");
      const detalhes = [erroSupabase?.details, erroSupabase?.hint, erroSupabase?.code].filter(Boolean).join(" | ");
      console.error("Erro ao salvar Orçamento Fixo Bandeira:", erro);
      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao salvar",
        mensagem: `Não foi possível salvar o Orçamento. ${mensagem}${detalhes ? ` (${detalhes})` : ""}`,
      });
    } finally {
      setSalvandoOrcamento(false);
    }
  };

  const itensCatalogo = useMemo<ItemCatalogo[]>(() => {
    const itensPerfis = perfis.map((perfil) => ({
      id: `perfil-${perfil.id}`,
      tipo: "perfil" as const,
      descricao: `${perfil.codigo} - ${perfil.nome_completo || perfil.nome} ${perfil.cores ? `| ${perfil.cores}` : ""
        }`.toUpperCase(),
      preco: Number(perfil.preco || 0),
    }));


    return itensPerfis;
  }, [perfis]);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background text-text-primary">
      <div className="flex min-h-screen w-full">
        <div className="flex min-h-screen w-full flex-col bg-transparent">
          <header className="relative z-40 mx-4 mt-4 grid shrink-0 grid-cols-1 items-center gap-4 rounded-2xl border border-border bg-surface/90 px-5 py-4 shadow-[0_18px_50px_var(--shadow)] backdrop-blur sm:mx-6 sm:px-6 xl:grid-cols-[minmax(180px,0.65fr)_minmax(0,1fr)_auto]">
            <div className="flex items-center">
              <div className="flex h-13.5 w-full max-w-55 items-center">
                {logoUsuario ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={theme.logoUrl || logoUsuario}
                    alt="Logo da empresa"
                    className="max-h-13.5 w-auto max-w-55 object-contain"
                  />
                ) : (
                  <div className="text-[22px] font-semibold leading-none text-text-primary">
                    Logo da empresa
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-start gap-2 xl:justify-end">
              <label className="text-xs font-medium uppercase tracking-wide text-text-secondary">Projeto</label>
              <input
                value={dados.projeto}
                tabIndex={-1}
                onChange={(e) => atualizarCampo("projeto", e.target.value)}
                className="w-full max-w-90 border-0 bg-transparent p-0 text-[18px] font-semibold uppercase leading-tight text-text-primary outline-none"
              />
            </div>

                        <div className="sm:justify-self-end sm:border-l sm:border-border/80 sm:pl-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_150px]">
                <div className="flex min-h-[54px] items-center gap-3 border-t border-border/80 py-2 sm:border-t-0 sm:px-3">
                  <FileText size={26} strokeWidth={1.6} className="shrink-0 text-text-secondary" />
                  <div className="min-w-0">
                    <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Nº Orçamento</label>
                    <input
                      value={dados.numero}
                      tabIndex={-1}
                      onChange={(e) => atualizarCampo("numero", e.target.value)}
                      className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-text-primary outline-none"
                    />
                  </div>
                </div>
                <div className="flex min-h-[54px] items-center gap-3 border-t border-border/80 py-2 sm:border-t-0 sm:px-3">
                  <Calendar size={26} strokeWidth={1.6} className="shrink-0 text-text-secondary" />
                  <div className="min-w-0">
                    <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Data</label>
                    <input
                      value={dados.data}
                      tabIndex={-1}
                      onChange={(e) => atualizarCampo("data", e.target.value)}
                      className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-text-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            </div></header>

          <section className="relative z-[80] mx-4 mt-3 rounded-2xl border border-border bg-surface/90 p-4 shadow-[0_18px_45px_var(--shadow)] backdrop-blur sm:mx-6">
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
            <div className="relative min-h-[66px] rounded-xl border border-border/80 bg-surface-secondary/80 px-3 py-2 sm:bg-surface sm:px-4">
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Cliente</label>
                <ClienteQuickCreateButton
                  empresaId={empresaId}
                  onClientCreated={(clienteNovo) => {
                    setClientes((lista) => {
                      const semDuplicado = lista.filter((item) => String(item.id) !== String(clienteNovo.id));
                      return [...semDuplicado, clienteNovo].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
                    });
                    atualizarCampo("cliente", clienteNovo.nome);
                    setListaClientesAberta(false);
                    setClienteAtivoIndex?.(0);
                  }}
                  onError={(mensagem) => setMensagemSistema({ tipo: "erro", titulo: "Erro ao cadastrar", mensagem })}
                />
              </div>
              <div className="relative">
                <UserRound size={20} strokeWidth={1.6} className="absolute left-0 top-1/2 -translate-y-1/2 text-text-secondary" />
                {listaClientesAberta ? (
                  <input
                    ref={clienteInputRef}
                    value={dados.cliente}
                    tabIndex={-1}
                    onChange={(e) => {
                      atualizarCampo("cliente", e.target.value);
                      setClienteAtivoIndex?.(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setClienteAtivoIndex?.((atual) => Math.min(atual + 1, Math.max(clientesFiltrados.length - 1, 0)));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setClienteAtivoIndex?.((atual) => Math.max(atual - 1, 0));
                      } else if (e.key === "Enter" && clientesFiltrados[clienteAtivoIndex]) {
                        e.preventDefault();
                        selecionarCliente(clientesFiltrados[clienteAtivoIndex]);
                      } else if (e.key === "Escape") {
                        setListaClientesAberta(false);
                      }
                    }}
                    onBlur={() => window.setTimeout(() => setListaClientesAberta(false), 250)}
                    disabled={carregandoClientes}
                    className="w-full border-0 bg-transparent py-1 pl-7 pr-1 text-[15px] font-semibold text-text-primary outline-none placeholder:text-text-secondary disabled:text-text-secondary"
                    placeholder={carregandoClientes ? "Carregando..." : "Digite ou pesquise o cliente"}
                  />
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setListaClientesAberta(true)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "Enter") {
                        e.preventDefault();
                        setListaClientesAberta(true);
                      }
                    }}
                    className="block w-full truncate bg-transparent py-1 pl-7 pr-1 text-left text-[15px] font-semibold text-text-primary"
                  >
                    {dados.cliente || "Digite ou pesquise o cliente"}
                  </button>
                )}
                {listaClientesAberta && (
                  <div className="absolute left-0 top-full z-[120] mt-2 max-h-[280px] w-full overflow-auto rounded-lg border border-border-strong/20 bg-surface py-1 text-sm shadow-xl shadow-slate-900/10">
                    {carregandoClientes ? (
                      <div className="px-3 py-2 font-medium text-text-secondary">Carregando clientes...</div>
                    ) : clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((cliente, index) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            selecionarCliente(cliente);
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            selecionarCliente(cliente);
                          }}
                          onMouseEnter={() => setClienteAtivoIndex?.(index)}
                          onClick={() => selecionarCliente(cliente)}
                          className={`block w-full px-3 py-2 text-left font-semibold text-text-primary ${index === clienteAtivoIndex ? "bg-primary/10" : "bg-transparent hover:bg-navigation/10"}`}
                        >
                          {cliente.nome}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 font-medium text-text-secondary">Nenhum cliente encontrado</div>
                    )}
                  </div>
                )}
              </div>
              {clienteSelecionado && (
                <div className="mt-2 flex flex-wrap gap-2 pl-7 text-[11px]">
                  <span className="rounded-full bg-surface-secondary px-2 py-1 font-medium text-text-secondary">
                    Rota: {clienteSelecionado.rota?.trim() || "Não informada"}
                  </span>
                  <span className="rounded-full bg-surface-secondary px-2 py-1 font-medium text-text-secondary">
                    Tabela: {tabelaPrecoSelecionada?.nome || "Padrão"}
                  </span>
                </div>
              )}
            </div>
              <label className="block min-h-[66px] rounded-xl border border-border/80 bg-surface-secondary/80 px-3 py-2 sm:bg-surface sm:px-4">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-text-secondary">Nome da obra (opcional)</span>
                <input
                  value={dados.obra || ""}
                  onChange={(e) => atualizarCampo("obra", e.target.value)}
                  placeholder="Informe o nome da obra"
                  className="w-full border-0 bg-transparent py-1 text-[15px] text-text-primary outline-none placeholder:text-text-secondary"
                />
              </label>
            </div>
          </section>

          <div className="flex min-h-0 flex-1 flex-col">
            <aside className="mx-4 mt-3 w-auto shrink-0 rounded-2xl border border-border bg-surface/85 shadow-sm backdrop-blur sm:mx-6">
              <nav className="flex flex-row gap-2 overflow-x-auto px-3 py-2 sm:px-4">
                {[
                  { label: "Orçamento", icon: ClipboardList, ativo: true },
                  { label: "Imprimir", icon: Printer },
                  { label: "Projetos", icon: FolderOpen },
                  { label: "PDF +", icon: FileText },
                  { label: "Salvar", icon: Save },
                  { label: "Configurações", icon: Settings },
                  { label: "Ajuda", icon: HelpCircle },
                ].map(({ label, icon: Icon, ativo }) => {
                  const itemClass = `flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${ativo ? "border-border-strong/15 bg-navigation/5 text-text-primary" : "border-transparent text-text-secondary hover:border-border hover:bg-surface-secondary"
                    }`;

                  if (label === "Imprimir") {
                    return (
                      <PDFDownloadLink
                        key={label}
                        tabIndex={-1}
                        document={<ProjetoIndividualPDF nomeEmpresa={nomeEmpresa} dados={projetoPdf} logoUrl={logoUsuario} />}
                        fileName={`fixo_bandeira_${dados.numero || "novo"}.pdf`}
                        className={itemClass}
                      >
                        {() => (
                          <>
                            <Icon size={18} />
                            <span>{label}</span>
                          </>
                        )}
                      </PDFDownloadLink>
                    );
                  }

                  return (
                    <button
                      key={label}
                      tabIndex={-1}
                      onClick={() => {
                        if (label === "Projetos") {
                          router.push("/matriz-projetos");
                        }
                        if (label === "PDF +") {
                          enviarParaCentralImpressao();
                        }
                        if (label === "Salvar") {
                          salvarOrcamento();
                        }
                        if (label === "Configurações") {
                          setConfigAberta(true);
                        }
                        if (label === "Ajuda") {
                          setAjudaAberta(true);
                        }
                      }}
                      disabled={label === "Salvar" && salvandoOrcamento}
                      className={itemClass}
                      type="button"
                    >
                      <Icon size={18} />
                      <span>{label === "Salvar" && salvandoOrcamento ? "Salvando..." : label}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(330px,400px)_minmax(0,1fr)]">
                  <section className="rounded-2xl border border-border bg-surface/95 p-5 shadow-[0_18px_45px_var(--shadow)]">
                    <SectionTitle>Desenho ilustrativo</SectionTitle>
                    <div className="mt-4 flex min-h-80 items-center justify-center rounded-2xl border border-border bg-linear-to-br from-surface via-surface-secondary to-surface-secondary p-4 sm:min-h-105 xl:min-h-107.5">
                      <ProjetoDrawing desenhoUrl={desenhoFixoBandeiraPorPecas(dados.pecasDivisao)} />
                    </div>
                  </section>

                  <div className="space-y-4">
                    <section className="rounded-2xl border border-border bg-surface/95 p-5 shadow-[0_18px_45px_var(--shadow)]">
                      <SectionTitle>Dados do projeto</SectionTitle>
                      <div className="mt-4 grid gap-3 overflow-visible md:grid-cols-3">
                        <DataInput
                          icon={<MoveHorizontal size={24} strokeWidth={1.6} />}
                          label="Largura"
                          value={dados.largura}
                          suffix="mm"
                          onChange={(v) => atualizarCampo("largura", v)}
                        />

                        <DataInput
                          icon={<MoveVertical size={24} strokeWidth={1.6} />}
                          label="Altura"
                          value={dados.altura}
                          suffix="mm"
                          onChange={(v) => atualizarCampo("altura", v)}
                        />

                        <DataInput
                          icon={<RailSymbol size={24} strokeWidth={1.6} />}
                          label="Altura até o tubo"
                          value={dados.alturaAteTubo}
                          suffix="mm"
                          onChange={(v) => atualizarCampo("alturaAteTubo", v)}
                        />

                        <DataInput
                          icon={<Copy size={24} strokeWidth={1.6} />}
                          label="Quantidade"
                          value={dados.quantidade}
                          onChange={(v) => atualizarCampo("quantidade", v)}
                        />
                        <label className="relative flex min-h-18 items-center gap-5 border-b border-border px-4 py-3 transition-colors focus-within:rounded-lg focus-within:bg-info-soft focus-within:ring-1 focus-within:ring-info/25">
                          <span className="flex w-9 shrink-0 justify-start text-text-primary/80">
                            <Layers size={24} strokeWidth={1.6} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Vidro parte de baixo</span>
                            {listaVidrosAberta ? (
                              <input
                                ref={vidroInputRef}
                                value={dados.vidro}
                                onChange={(e) => {
                                  atualizarCampo("vidro", e.target.value);
                                  setVidroAtivoIndex?.(0);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setVidroAtivoIndex?.((atual) => Math.min(atual + 1, Math.max(vidrosFiltrados.length - 1, 0)));
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setVidroAtivoIndex?.((atual) => Math.max(atual - 1, 0));
                                  } else if (e.key === "Enter" && vidrosFiltrados[vidroAtivoIndex]) {
                                    e.preventDefault();
                                    selecionarVidro(vidrosFiltrados[vidroAtivoIndex]);
                                  } else if (e.key === "Escape") {
                                    setListaVidrosAberta(false);
                                  }
                                }}
                                onBlur={() => window.setTimeout(() => setListaVidrosAberta(false), 250)}
                                disabled={carregandoVidros}
                                className="mt-0.5 w-full bg-transparent text-[15px] font-semibold leading-tight text-text-primary outline-none placeholder:text-text-secondary disabled:text-text-secondary"
                                placeholder={carregandoVidros ? "Carregando..." : "Digite o vidro"}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setListaVidrosAberta(true)}
                                onFocus={() => setListaVidrosAberta(true)}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowDown" || e.key === "Enter") {
                                    e.preventDefault();
                                    setListaVidrosAberta(true);
                                  }
                                }}
                                className="mt-0.5 block w-full truncate rounded-md bg-transparent p-0 text-left text-[15px] font-semibold leading-tight text-text-primary outline-none focus-visible:bg-surface/70"
                              >
                                {dados.vidro || "Digite o vidro"}
                              </button>
                            )}
                          </span>
                          {listaVidrosAberta && (
                            <div className="absolute left-21 top-16 z-30 max-h-62.5 w-80 overflow-auto rounded-lg border border-border-strong/20 bg-surface py-1 text-sm shadow-xl shadow-slate-900/10">
                              {carregandoVidros ? (
                                <div className="px-3 py-2 font-medium text-text-secondary">Carregando vidros...</div>
                              ) : vidrosFiltrados.length > 0 ? (
                                vidrosFiltrados.map((vidro, index) => (
                                  <button
                                    key={vidro.id}
                                    type="button"
                                    tabIndex={-1}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selecionarVidro(vidro);
                                    }}
                                    onMouseEnter={() => setVidroAtivoIndex?.(index)}
                                    className={`block w-full px-3 py-2 text-left font-semibold text-text-primary ${index === vidroAtivoIndex ? "bg-primary/10"
                                        : "bg-transparent hover:bg-navigation/10"
                                      }`}
                                  >
                                    {formatarVidroCadastro(vidro)}
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 font-medium text-text-secondary">Nenhum vidro encontrado</div>
                              )}
                            </div>
                          )}
                        </label>
                        <label className="relative flex min-h-18 items-center gap-5 border-b border-border px-4 py-3 transition-colors focus-within:rounded-lg focus-within:bg-info-soft focus-within:ring-1 focus-within:ring-info/25">
                          <span className="flex w-9 shrink-0 justify-start text-text-primary/80">
                            <Layers size={24} strokeWidth={1.6} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Vidro bandeira</span>
                            {listaVidrosBandeiraAberta ? (
                              <input
                                ref={vidroBandeiraInputRef}
                                value={dados.vidroBandeira}
                                onChange={(e) => {
                                  atualizarCampo("vidroBandeira", e.target.value);
                                  setVidroBandeiraAtivoIndex?.(0);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setVidroBandeiraAtivoIndex?.((atual) => Math.min(atual + 1, Math.max(vidrosBandeiraFiltrados.length - 1, 0)));
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setVidroBandeiraAtivoIndex?.((atual) => Math.max(atual - 1, 0));
                                  } else if (e.key === "Enter" && vidrosBandeiraFiltrados[vidroBandeiraAtivoIndex]) {
                                    e.preventDefault();
                                    selecionarVidroBandeira(vidrosBandeiraFiltrados[vidroBandeiraAtivoIndex]);
                                  } else if (e.key === "Escape") {
                                    setListaVidrosBandeiraAberta(false);
                                  }
                                }}
                                onBlur={() => window.setTimeout(() => setListaVidrosBandeiraAberta(false), 250)}
                                disabled={carregandoVidros}
                                className="mt-0.5 w-full bg-transparent text-[15px] font-semibold leading-tight text-text-primary outline-none placeholder:text-text-secondary disabled:text-text-secondary"
                                placeholder={carregandoVidros ? "Carregando..." : "Digite o vidro"}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setListaVidrosBandeiraAberta(true)}
                                onFocus={() => setListaVidrosBandeiraAberta(true)}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowDown" || e.key === "Enter") {
                                    e.preventDefault();
                                    setListaVidrosBandeiraAberta(true);
                                  }
                                }}
                                className="mt-0.5 block w-full truncate rounded-md bg-transparent p-0 text-left text-[15px] font-semibold leading-tight text-text-primary outline-none focus-visible:bg-surface/70"
                              >
                                {dados.vidroBandeira || "Digite o vidro"}
                              </button>
                            )}
                          </span>
                          {listaVidrosBandeiraAberta && (
                            <div className="absolute left-21 top-16 z-30 max-h-62.5 w-80 overflow-auto rounded-lg border border-border-strong/20 bg-surface py-1 text-sm shadow-xl shadow-slate-900/10">
                              {carregandoVidros ? (
                                <div className="px-3 py-2 font-medium text-text-secondary">Carregando vidros...</div>
                              ) : vidrosBandeiraFiltrados.length > 0 ? (
                                vidrosBandeiraFiltrados.map((vidro, index) => (
                                  <button
                                    key={vidro.id}
                                    type="button"
                                    tabIndex={-1}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selecionarVidroBandeira(vidro);
                                    }}
                                    onMouseEnter={() => setVidroBandeiraAtivoIndex?.(index)}
                                    className={`block w-full px-3 py-2 text-left font-semibold text-text-primary ${index === vidroBandeiraAtivoIndex ? "bg-primary/10"
                                        : "bg-transparent hover:bg-navigation/10"
                                      }`}
                                  >
                                    {formatarVidroCadastro(vidro)}
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 font-medium text-text-secondary">Nenhum vidro encontrado</div>
                              )}
                            </div>
                          )}
                        </label>
                        <OptionInput
                          icon={<Palette size={24} strokeWidth={1.6} />}
                          label="Cor do material"
                          value={dados.corKit}
                          options={corKitOpcoes}
                          onChange={(v) => atualizarCampo("corKit", v)}
                        />

                        <OptionInput
                          icon={<RailSymbol size={24} strokeWidth={1.6} />}
                          label="Tubo"
                          value={dados.tuboPerfil}
                          options={tuboOpcoes}
                          onChange={(v) => atualizarCampo("tuboPerfil", v)}
                        />

                        <OptionInput
                          icon={<Wrench size={24} strokeWidth={1.6} />}
                          label="Uso do tubo"
                          value={dados.tuboUso}
                          options={tuboUsoOpcoes}
                          onChange={(v) => atualizarCampo("tuboUso", v)}
                        />

                        <OptionInput
                          icon={<Grid2X2 size={24} strokeWidth={1.6} />}
                          label="Projeto"
                          value={String(dados.pecasDivisao || 1)}
                          options={divisaoPecasOpcoes}
                          onChange={(v) => atualizarCampo("pecasDivisao", limitarDivisaoPecas(Number(v)))}
                        />
                      </div>
                    </section>

                    <PerfisExtrasProjeto perfis={perfis} materiais={materiais} setMateriais={setMateriais} altura={dados.altura} largura={dados.largura} quantidade={dados.quantidade} />

                    <LoteRapidoProjetos
                      aberto={loteRapido.aberto}
                      editando={loteRapido.editando}
                      linhas={loteRapido.linhas}
                      onAlternar={loteRapido.alternar}
                      onAdicionar={loteRapido.adicionarLinha}
                      onRemover={loteRapido.removerLinha}
                      onAtualizar={loteRapido.atualizarLinha}
                      onEnviar={loteRapido.enviar}
                    />


                    <section className="rounded-2xl border border-border bg-surface/95 p-5 shadow-[0_18px_45px_var(--shadow)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <SectionTitle>Relação de materiais</SectionTitle>
                        <div className="flex items-center gap-2 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={novoProjeto}
                            className="rounded-xl bg-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-primary shadow-sm"
                          >
                            Novo
                          </button>
                          <button
                            type="button"
                            onClick={() => setMateriais((lista) => [...lista, criarMaterial()])}
                            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-on-primary shadow-sm"
                          >
                            Adicionar item
                          </button>

                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto overflow-y-visible rounded-2xl border border-border/80 bg-surface shadow-sm">
                        <div className="grid min-w-180 grid-cols-[80px_2fr_70px_36px_115px_36px_105px] bg-surface-secondary text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                          <div className="border-r border-border/80 px-3 py-3 text-center">Qtd</div>
                          <div className="border-r border-border/80 px-3 py-3">Produto / descrição</div>
                          <div className="border-r border-border/80 px-3 py-3 text-center">Unidade</div>
                          <div className="px-3 py-3 text-center" />
                          <div className="border-r border-border/80 px-3 py-3 text-right">Valor unit.</div>
                          <div className="px-3 py-3 text-center" />
                          <div className="px-3 py-3 text-right">Valor total</div>
                        </div>
                        {materiaisOrdenados.map((item) => (
                          <div key={item.id} className="group relative grid min-w-180 grid-cols-[80px_2fr_70px_36px_115px_36px_105px] items-center border-t border-border bg-surface text-xs text-text-primary transition hover:bg-surface-secondary/70">
                            <div className="px-3 py-2.5">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={formatarQtdMaterial(item.qtd, item.unidade)}
                                onChange={(e) => atualizarMaterial(item.id, "qtd", parseQtdMaterial(e.target.value, item.unidade))}
                                className="w-full bg-transparent text-center font-medium outline-none focus:rounded-md focus:bg-surface-secondary"
                              />
                            </div>
                            <div className="flex items-center px-3 py-2.5">
                              <DescricaoMaterialInput
                                item={item}
                                itensCatalogo={itensCatalogo}
                                atualizarMaterial={atualizarMaterial}
                                selecionarItemCatalogo={selecionarItemCatalogo}
                              />
                            </div>
                            <div className="px-3 py-2.5">
                              <input
                                value={item.unidade}
                                onChange={(e) => atualizarMaterial(item.id, "unidade", e.target.value)}
                                className="w-full bg-transparent text-center font-medium outline-none focus:rounded-md focus:bg-surface-secondary"
                              />
                            </div>
                            <div className="px-3 py-2.5 text-center font-medium">R$</div>
                            <div className="px-3 py-2.5">
                              <input
                                value={numero(item.valorUnitario)}
                                onChange={(e) => atualizarMaterial(item.id, "valorUnitario", parseNumeroPtBr(e.target.value))}
                                className="w-full bg-transparent text-right font-medium outline-none focus:rounded-md focus:bg-surface-secondary"
                              />
                            </div>
                            <div className="px-3 py-2.5 text-center font-medium">R$</div>
                            <div className="px-3 py-2.5 text-right font-medium">
                              {numero(Number(item.qtd || 0) * Number(item.valorUnitario || 0))}
                            </div>
                            <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg bg-surface/95 p-1 shadow-sm group-hover:flex">
                              <button type="button" onClick={() => duplicarMaterial(item)} className="rounded-md bg-info-soft p-1.5 text-info">
                                <Copy size={16} />
                              </button>
                              <button type="button" onClick={() => removerMaterial(item.id)} className="rounded-md bg-danger-soft p-1.5 text-danger">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-4 rounded-2xl border border-border bg-surface-secondary px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-primary">Valor total</p>
                        <div className="rounded-lg bg-surface-secondary px-6 py-2.5 text-lg font-bold text-text-primary">
                          {moeda(totalMateriais)}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                <section className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface/90 p-4 shadow-[0_18px_45px_var(--shadow)] md:grid-cols-3 xl:grid-cols-6">
                  <SummaryCard icon={<Grid2X2 size={30} />} label="Área total" value={`${numero(calculoVidro.areaTotalCobrada)} m2`} detail="Área de vidro" tone="green" />
                  <SummaryCard icon={<ClipboardList size={30} />} label="Total de vidros" value={numero(totalVidros, 0)} detail="Peças de vidro" tone="blue" />
                  <SummaryCard icon={<Layers3 size={30} />} label="Valor vidros" value={moeda(valorVidros)} detail="Vidros" tone="purple" />
                  <SummaryCard icon={<RailSymbol size={30} />} label="Valor perfis" value={moeda(valorPerfis)} detail="Perfis" tone="blue" />
                  <SummaryCard icon={<Wrench size={30} />} label="Valor ferragens" value={moeda(valorFerragens)} detail="Kits e acessórios" tone="orange" />
                  <SummaryCard icon={<DollarSign size={30} />} label="Valor total" value={moeda(totalMateriais)} detail="Orçamento total" tone="emerald" />
                </section>
              </div>

            </section>
          </div>
        </div>
      </div>
      {mensagemSistema && (
        <div className="fixed inset-0 z-60 flex items-start justify-center bg-navigation/20 p-4 pt-8 backdrop-blur-[1px]">
          <section
            className="w-full max-w-sm rounded-xl border p-4 shadow-lg"
            style={{
              backgroundColor: theme.modalBackgroundColor,
              borderColor: `color-mix(in srgb, ${theme.menuBackgroundColor} 13%, transparent)`,
              color: theme.modalTextColor,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor:
                    mensagemSistema.tipo === "sucesso" ? `color-mix(in srgb, ${theme.modalIconSuccessColor} 8%, transparent)`
                      : mensagemSistema.tipo === "erro" ? `color-mix(in srgb, ${theme.modalIconErrorColor} 8%, transparent)`
                        : `color-mix(in srgb, ${theme.modalIconWarningColor} 8%, transparent)`,
                  color:
                    mensagemSistema.tipo === "sucesso" ? theme.modalIconSuccessColor
                      : mensagemSistema.tipo === "erro" ? theme.modalIconErrorColor
                        : theme.modalIconWarningColor,
                }}
              >
                {mensagemSistema.tipo === "sucesso" ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <h2 className="text-sm font-black tracking-tight">{mensagemSistema.titulo}</h2>
                <p className="mt-1 text-xs leading-5 opacity-70">{mensagemSistema.mensagem}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const aoFechar = mensagemSistema.aoFechar;
                  setMensagemSistema(null);
                  aoFechar?.();
                }}
                className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-on-primary shadow-sm transition hover:brightness-95"
                style={{
                  backgroundColor: theme.modalButtonBackgroundColor || theme.menuBackgroundColor,
                  color: theme.modalButtonTextColor,
                }}
              >
                OK
              </button>
            </div>
          </section>
        </div>
      )}

      {configAberta && (
        <PainelModal
          titulo="Configurações"
          subtitulo="Preferências desta página"
          onClose={() => setConfigAberta(false)}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <OptionInput
              icon={<Palette size={22} strokeWidth={1.6} />}
              label="Cor padrão"
              value={preferencias.corPadrão}
              options={corKitOpcoes}
              onChange={(v) => setPreferencias((atual) => ({ ...atual, corPadrão: v }))}
            />
            <DataInput
              icon={<Copy size={22} strokeWidth={1.6} />}
              label="Quantidade padrão"
              value={preferencias.quantidadePadrão}
              onChange={(v) => setPreferencias((atual) => ({ ...atual, quantidadePadrão: Math.max(1, Number(v || 1)) }))}
            />
          </div>

          <div className="mt-4 grid gap-2">
            <ToggleLinha
              titulo="Salvar rascunho automaticamente"
              descricao="Mantém a digitação desta página se atualizar ou sair sem salvar."
              ativo={preferencias.lembrarRascunho}
              onChange={(ativo) => setPreferencias((atual) => ({ ...atual, lembrarRascunho: ativo }))}
            />
            <ToggleLinha
              titulo="Avisar campos zerados"
              descricao="Preparado para alertas futuros antes de imprimir ou salvar."
              ativo={preferencias.avisarCamposZerados}
              onChange={(ativo) => setPreferencias((atual) => ({ ...atual, avisarCamposZerados: ativo }))}
            />
            <ToggleLinha
              titulo="Mostrar valores no PDF"
              descricao="Preferência reservada para os próximos modelos de impressão."
              ativo={preferencias.mostrarValoresPdf}
              onChange={(ativo) => setPreferencias((atual) => ({ ...atual, mostrarValoresPdf: ativo }))}
            />
            <ToggleLinha
              titulo="Mostrar materiais no PDF"
              descricao="Preferência reservada para controlar relações de materiais nos PDFs."
              ativo={preferencias.mostrarMateriaisPdf}
              onChange={(ativo) => setPreferencias((atual) => ({ ...atual, mostrarMateriaisPdf: ativo }))}
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(PROJETO_INDIVIDUAL_DRAFT_KEY);
                setMensagemSistema({
                  tipo: "sucesso",
                  titulo: "Rascunho limpo",
                  mensagem: "O rascunho salvo desta página foi removido.",
                });
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface-secondary"
            >
              Limpar rascunho
            </button>
            <button
              type="button"
              onClick={() => setConfigAberta(false)}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition hover:brightness-95"
            >
              Concluir
            </button>
          </div>
        </PainelModal>
      )}

      {ajudaAberta && (
        <PainelModal
          titulo="Ajuda"
          subtitulo="Base rápida de consulta do projeto"
          onClose={() => setAjudaAberta(false)}
          largura="max-w-3xl"
        >
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4">
            <SearchIcon />
            <input
              value={buscaAjuda}
              onChange={(e) => setBuscaAjuda(e.target.value)}
              placeholder="Pesquisar por medida, vidro, tubo, PDF, salvamento..."
              className="w-full bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-secondary"
            />
          </label>

          <div className="mt-4 max-h-[58vh] space-y-3 overflow-auto pr-1">
            {topicosAjudaFiltrados.length > 0 ? (
              topicosAjudaFiltrados.map((topico) => (
                <article key={`${topico.categoria}-${topico.titulo}`} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-navigation/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-primary">
                      {topico.categoria}
                    </span>
                    <h3 className="text-sm font-semibold text-text-primary">{topico.titulo}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{topico.texto}</p>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-surface-secondary p-6 text-center">
                <p className="text-sm font-semibold text-text-primary">Nenhum tópico encontrado</p>
                <p className="mt-1 text-sm text-text-secondary">Tente pesquisar por outro termo.</p>
              </div>
            )}
          </div>
        </PainelModal>
      )}
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-text-primary">{children}</h2>
      <div className="mt-3 h-0.5 w-10 rounded-full bg-primary" />
    </div>
  );
}

function PainelModal({
  titulo,
  subtitulo,
  children,
  largura = "max-w-2xl",
  onClose,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  largura?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-55 flex items-start justify-center bg-navigation/25 p-4 pt-8 backdrop-blur-[1px]">
      <section className={`w-full ${largura} overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-slate-950/10`}>
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{titulo}</h2>
            <p className="mt-1 text-sm text-text-secondary">{subtitulo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-lg leading-none text-text-secondary transition hover:bg-surface-secondary"
            aria-label="Fechar"
          > ? </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

function ToggleLinha({
  titulo,
  descricao,
  ativo,
  onChange,
}: {
  titulo: string;
  descricao: string;
  ativo: boolean;
  onChange: (ativo: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ativo)}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-left transition hover:bg-surface-secondary"
    >
      <span>
        <span className="block text-sm font-semibold text-text-primary">{titulo}</span>
        <span className="mt-1 block text-xs leading-5 text-text-secondary">{descricao}</span>
      </span>
      <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${ativo ? "bg-primary" : "bg-border"}`}>
        <span className={`h-4 w-4 rounded-full bg-surface shadow-sm transition ${ativo ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function SearchIcon() {
  return <Search size={18} className="shrink-0 text-text-secondary" />;
}

function DataInput({
  icon,
  label,
  value,
  suffix,
  tabIndex,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  tabIndex?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-h-19 items-center gap-3 rounded-2xl border border-border/80 bg-surface-secondary/80 px-4 py-3 transition-colors focus-within:border-success-soft focus-within:bg-surface focus-within:ring-4 focus-within:ring-success/10">
      <span className="flex w-7 shrink-0 justify-start text-text-primary/65">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            tabIndex={tabIndex}
            min={0}
            max={9999}
            inputMode="numeric"
            onKeyDown={(e) => {
              if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
            }}
            onChange={(e) => onChange(limitarNumero4Digitos(e.target.value))}
            className="w-20.5 min-w-0 rounded-lg bg-transparent text-base font-semibold leading-tight text-text-primary outline-none focus-visible:bg-surface/80"
          />
          {suffix && <span className="text-sm font-medium leading-tight text-text-secondary">{suffix}</span>}
        </span>
      </span>
    </label>
  );
}

function OptionInput({
  icon,
  label,
  value,
  options,
  tabIndex,
  disabled = false,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  tabIndex?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={`flex min-h-19 items-center gap-3 rounded-2xl border border-border/80 bg-surface-secondary/80 px-4 py-3 transition-colors focus-within:border-success-soft focus-within:bg-surface focus-within:ring-4 focus-within:ring-success/10 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <span className="flex w-7 shrink-0 justify-start text-text-primary/65">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          {label}
        </span>

        <select
          value={value}
          tabIndex={tabIndex}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full cursor-pointer appearance-auto rounded-lg border-0 bg-transparent p-0 text-base font-semibold leading-tight text-text-primary outline-none focus-visible:bg-surface/80 disabled:cursor-not-allowed"
        >
          {options.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function DescricaoMaterialInput({
  item,
  itensCatalogo,
  atualizarMaterial,
  selecionarItemCatalogo,
}: {
  item: ProjetoIndividualMaterial;
  itensCatalogo: ItemCatalogo[];
  atualizarMaterial: <K extends keyof ProjetoIndividualMaterial>(
    id: string,
    campo: K,
    valor: ProjetoIndividualMaterial[K]
  ) => void;
  selecionarItemCatalogo: (idMaterial: string, item: ItemCatalogo) => void;
}) {
  const [aberto, setAberto] = useState(false);

  const termo = item.descricao.trim().toLowerCase();

  const itensFiltrados = useMemo(() => {
    if (!termo || termo === "novo item") return itensCatalogo.slice(0, 10);

    return itensCatalogo
      .filter((catalogo) => catalogo.descricao.toLowerCase().includes(termo))
      .slice(0, 10);
  }, [itensCatalogo, termo]);

  return (
    <div className="relative w-full">
      <input
        value={item.descricao}
        onFocus={() => {
          if (item.descricao.toLowerCase() === "novo item") {
            atualizarMaterial(item.id, "descricao", "");
          }

          setAberto(true);
        }}
        onChange={(e) => {
          atualizarMaterial(item.id, "descricao", e.target.value.toUpperCase());
          setAberto(true);
        }}
        onBlur={() => window.setTimeout(() => setAberto(false), 250)}
        className="w-full bg-transparent text-xs font-medium uppercase outline-none focus:rounded-md focus:bg-surface-secondary"
      />

      {aberto && itensFiltrados.length > 0 && (
        <div className="absolute left-0 top-7 z-40 max-h-64 w-130 overflow-auto rounded-lg border border-border bg-surface py-1 shadow-xl">
          {itensFiltrados.map((catalogo) => (
            <button
              key={catalogo.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selecionarItemCatalogo(item.id, catalogo);
                setAberto(false);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selecionarItemCatalogo(item.id, catalogo);
                setAberto(false);
              }}
              onClick={() => {
                selecionarItemCatalogo(item.id, catalogo);
                setAberto(false);
              }}
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-text-primary hover:bg-navigation/10"
            >
              <span>{catalogo.descricao}</span>
              <span className="ml-2 text-[10px] text-text-secondary">
                {catalogo.tipo}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjetoDrawing({ desenhoUrl }: { desenhoUrl: string }) {
  return (
    <div className="flex h-87.5 w-full items-center justify-center sm:h-102.5" role="img" aria-label="Desenho ilustrativo do projeto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={desenhoUrl}
        alt=""
        className="max-h-full w-auto max-w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "green" | "blue" | "purple" | "orange" | "emerald" }) {
  const tones = {
    green: "bg-success-soft text-success",
    blue: "bg-info-soft text-info",
    purple: "bg-info-soft text-info",
    orange: "bg-warning-soft text-warning",
    emerald: "bg-success-soft text-success",
  };
  return (
    <div className="flex items-center gap-3 border-border px-3 py-2 xl:border-r last:border-r-0">
      <div className={`flex h-11 w-12 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
        <p className="mt-0.5 text-base font-semibold leading-tight text-text-primary">{value}</p>
        <p className="mt-0.5 text-[11px] text-text-secondary">{detail}</p>
      </div>
    </div>
  );
}






