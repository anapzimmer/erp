"use client";
import ResumoConfiguracaoProjeto from "@/components/ResumoConfiguracaoProjeto";
import PreviaCalculoProjeto from "@/components/PreviaCalculoProjeto";
import RodapeCalculoProjeto from "@/components/RodapeCalculoProjeto";
import layoutProjeto from "@/components/CalculoProjeto.module.css";
import { DataInput, OptionInput } from "@/components/CamposCalculoProjeto";
import CabecalhoCalculoProjeto from "@/components/CabecalhoCalculoProjeto";
import { confirmarEnvioOrcamento } from "@/utils/envioOrcamento";
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
  Settings,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { ProjetoIndividualPDF, type ProjetoIndividualDados, type ProjetoIndividualMaterial } from "../../relatorios/projetoindividual/ProjetoIndividualPDF";
import { LoteRapidoProjetos, useLoteRapidoProjetos } from "@/components/LoteRapidoProjetos";
import { mesclarMateriaisAutomaticos } from "@/utils/materiaisAutomaticos";
import { kitCategoriaCompativel, kitCorCompativel } from "@/utils/kitsCompatibilidade";

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

type KitCadastro = {
  id: number;
  nome: string;
  largura: number;
  altura: number;
  categoria?: string | null;
  cores?: string | null;
  preco_por_cor?: string | null;
  preco?: number | null;
  empresa_id: string;
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
  tipo: "perfil" | "kit" | "ferragem";
  descricao: string;
  preco: number;
};

type FerragemCadastro = {
  id: string;
  codigo: string;
  nome: string;
  preco?: number | null;
  categoria?: string | null;
  cores?: string | null;
  codigo_interno?: string | null;
  empresa_id?: string | null;
};

type PFV2FKitOrcamentoPersistido = {
  tipo?: string;
  modo?: string;
  dados?: Partial<Omit<ProjetoIndividualDados, "materiais">>;
  materiais?: ProjetoIndividualMaterial[];
  perfilTuboId?: string | null;
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
  trilho?: string;
  puxador?: string;
  tamanhoPuxador?: string;
  trinco?: string;
  valorTotal?: number;
  materiais?: ProjetoIndividualMaterial[];
  origemRota?: string;
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
  perfilExtra: parcial?.perfilExtra,
  codigoPerfil: parcial?.codigoPerfil,
  comprimentoBarra: parcial?.comprimentoBarra,
  cortes: parcial?.cortes,
});

const trilhoOpcoes = ["Escolher", "Interrompido", "Embutido"];
const corKitOpcoes = ["Escolher", "Preto", "Branco", "Fosco"];
const puxadorOpcoes = ["Sem puxador", "Com puxador"];
const tamanhoPuxadorOpcoes = ["Escolher", "300mm", "600mm", "800mm"];
const trincoOpcoes = ["Sem trinco", "Com trinco", "Com chave"];

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const descricaoTemCodigo = (descricao: string, codigo: string) => {
  const descricaoNormalizada = normalizarTexto(descricao);
  const codigoNormalizado = normalizarTexto(codigo).replace(/[.*+x^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${codigoNormalizado}($|[^a-z0-9])`).test(descricaoNormalizada);
};


const ordemMaterialDescricao = (descricaoOriginal?: string, unidadeOriginal?: string) => ordemMaterialRelacao({
  descricao: descricaoOriginal,
  unidade: unidadeOriginal,
});
const PROJETO_INDIVIDUAL_DRAFT_KEY = "glasscode:pfv2f-kit:rascunho";
const CENTRAL_IMPRESSAO_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_IMPRESSAO_CLIENTE_KEY = "glasscode:central-impressao:cliente";

const montarDescricaoComCor = (codigo: string, nome: string, cor?: string | null) => {
  const descricaoBase = `${codigo} - ${nome}`.trim();
  const corTexto = String(cor || "").trim();

  if (!corTexto || normalizarTexto(descricaoBase).includes(normalizarTexto(corTexto))) {
    return descricaoBase.toUpperCase();
  }

  return `${descricaoBase} | ${corTexto}`.toUpperCase();
};

export default function PFV2FKitPage() {
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
  const [precosVidroGrupos, setPrecosVidroGrupos] = useState<PrecoVidroGrupo[]>([]);
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPrecoCadastro[]>([]);
  const [kits, setKits] = useState<KitCadastro[]>([]);
  const [perfis, setPerfis] = useState<PerfilCadastro[]>([]);
  const [perfilTuboId, setPerfilTuboId] = useState<string | null>(null);
  const [ferragens, setFerragens] = useState<FerragemCadastro[]>([]);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [mensagemSistema, setMensagemSistema] = useState<{
    tipo: "sucesso" | "erro" | "aviso";
    titulo: string;
    mensagem: string;
    aoFechar?: () => void;
  } | null>(null);
  const [dados, setDados] = useState<Omit<ProjetoIndividualDados, "materiais">>({
    projeto: "PFV2F - KIT",
    numero: "005412",
    data: hojePtBr(),
    cliente: "",

    obra: "",
    largura: 0,
    altura: 0,
    quantidade: 1,
    trilho: "Escolher",
    vidro: "Escolher",
    corKit: "Escolher",
    puxador: "Sem puxador",
    tamanhoPuxador: "Escolher",
    trinco: "Sem trinco",
    observacao: "Imagem ilustrativa do projeto",
  });
  const orcamentoAtivo = useClienteOrcamento({ cliente: dados.cliente, onCliente: cliente => setDados(atual => ({ ...atual, cliente })) });

  const [materiais, setMateriais] = useState<ProjetoIndividualMaterial[]>([]);

  useEffect(() => {
    if (editId || centralItemId) {
      setRascunhoRestaurado(true);
      return;
    }

    try {
      const salvo = window.localStorage.getItem(PROJETO_INDIVIDUAL_DRAFT_KEY);

      if (salvo) {
        const rascunho = JSON.parse(salvo) as {
          dados?: Partial<Omit<ProjetoIndividualDados, "materiais">>;
          materiais?: ProjetoIndividualMaterial[];
          perfilTuboId?: string | null;
        };

        if (rascunho.dados) {
          setDados((atual) => ({ ...atual, ...rascunho.dados }));
        }

        if (Array.isArray(rascunho.materiais)) {
          setMateriais(rascunho.materiais);
        }


        if ("perfilTuboId" in rascunho) {
          setPerfilTuboId(rascunho.perfilTuboId || null);
        }
      }
    } catch (erro) {
      console.warn("Não foi possível restaurar o rascunho do projeto individual:", erro);
    } finally {
      setRascunhoRestaurado(true);
    }
  }, [centralItemId, editId]);

  useEffect(() => {
    if (!rascunhoRestaurado || editId || centralItemId) return;

    try {
      window.localStorage.setItem(
        PROJETO_INDIVIDUAL_DRAFT_KEY,
        JSON.stringify({ dados, materiais, perfilTuboId })
      );
    } catch (erro) {
      console.warn("Não foi possível salvar o rascunho do projeto individual:", erro);
    }
  }, [centralItemId, dados, editId, materiais, perfilTuboId, rascunhoRestaurado]);

  useEffect(() => {
    if (!centralItemId) return;

    try {
      const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = salvo ? JSON.parse(salvo) as CentralImpressaoProjetoItem[] : [];
      const item = lista.find((projeto) => projeto.id === centralItemId);

      if (!item) {
        setMensagemSistema({
          tipo: "aviso",
          titulo: "Projeto Não encontrado",
          mensagem: "Não foi possível localizar este projeto na central de impressão.",
          aoFechar: () => router.push(returnTo),
        });
        return;
      }

      setDados((atual) => ({
        ...atual,
        projeto: "PFV2F - KIT",
        numero: item.numero || atual.numero,
        cliente: item.cliente || atual.cliente,
        obra: item.obra || "",
        largura: Number(item.largura || 0),
        altura: Number(item.altura || 0),
        quantidade: Number(item.quantidade || 1),
        trilho: item.trilho || "Escolher",
        vidro: item.vidro || "Escolher",
        corKit: item.corPerfil || item.corKit || "Escolher",
        puxador: item.puxador || "Sem puxador",
        tamanhoPuxador: item.tamanhoPuxador || (item.puxador === "Com puxador" ? "300mm" : "Escolher"),
        trinco: item.trinco || "Sem trinco",
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
  const totalVidros = Number(dados.quantidade || 0) * 2;
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
        return unidade.includes("barra") || descricao.includes("kit") || descricao.includes("perfil") || descricao.includes("tubo") || descricao.includes("cantoneira") || descricao.includes("vt");
      })
      .reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0),
    [materiais]
  );
  const valorFerragens = Math.max(0, totalMateriais - valorVidros - valorPerfis);
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
  const calculoVidro = useMemo(() => {
    const larguraMedida = (Number(dados.largura || 0) / 2) + 50;
    const alturaAdicional = dados.trilho === "Embutido" ? 70 : 50;
    const alturaMedida = Number(dados.altura || 0) + alturaAdicional;
    const larguraCalculo = arredondar5cm(larguraMedida);
    const alturaCalculo = arredondar5cm(alturaMedida);
    const areaUnit = (larguraCalculo * alturaCalculo) / 1_000_000;
    const areaTotalCobrada = areaUnit * Number(dados.quantidade || 0) * 2;

    return {
      larguraCalculo,
      alturaCalculo,
      larguraMedida,
      alturaMedida,
      areaTotalCobrada: Number(areaTotalCobrada.toFixed(3)),
    };
  }, [dados.altura, dados.largura, dados.quantidade, dados.trilho]);

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

  const atualizarCampo = <K extends keyof Omit<ProjetoIndividualDados, "materiais">>(
    campo: K,
    valor: Omit<ProjetoIndividualDados, "materiais">[K]
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

  const obterEspessuraVidro = (texto: string) => {
    const laminado = texto.match(/(\d{1,2})\s*\+\s*(\d{1,2})\s*mm/i);
    if (laminado) return Number(laminado[1]) + Number(laminado[2]);

    const match = texto.match(/(\d{1,2})\s*mm/i);
    return match ? Number(match[1]) : 0;
  };

  const kitSelecionado = useMemo(() => {
    const espessura = obterEspessuraVidro(dados.vidro);

    const categoriaEsperada =
      espessura === 10 ? "Kit Porta"
        : espessura === 6 || espessura === 8 ? "Kit Janela"
          : "";

    if (!categoriaEsperada) return null;

    const corAtual = normalizarTexto(dados.corKit);

    const larguraKitNecessaria = Number(dados.largura || 0) * 2;
    const alturaKitNecessaria = Number(dados.altura || 0);

    const kitsFiltrados = kits.filter((kit) => {
      const categoriaOk = kitCategoriaCompativel(kit, categoriaEsperada);
      const corOk = kitCorCompativel(kit, corAtual);

      return categoriaOk && corOk;
    });

    if (kitsFiltrados.length === 0) return null;

    const kitsOrdenados = kitsFiltrados
      .filter((kit) =>
        Number(kit.largura || 0) >= larguraKitNecessaria &&
        Number(kit.altura || 0) >= alturaKitNecessaria
      )
      .sort((a, b) => {
        const diferencaA =
          Math.abs(Number(a.largura || 0) - larguraKitNecessaria) +
          Math.abs(Number(a.altura || 0) - alturaKitNecessaria);

        const diferencaB =
          Math.abs(Number(b.largura || 0) - larguraKitNecessaria) +
          Math.abs(Number(b.altura || 0) - alturaKitNecessaria);

        return diferencaA - diferencaB;
      });

    return escolherItemPorCor(kitsOrdenados, dados.corKit, (kit) => kit.cores);
  }, [dados.altura, dados.corKit, dados.largura, dados.vidro, kits]);


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
        { data: kitsData, error: kitsError },
        { data: perfisData, error: perfisError },
        { data: ferragensData, error: ferragensError },
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
          .from("kits")
          .select("id, nome, largura, altura, categoria, cores, preco_por_cor, preco, empresa_id")
          .eq("empresa_id", empresaId),

        supabase
          .from("perfis")
          .select("id, codigo, nome, cores, categoria, preco, empresa_id, nome_completo")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),

        supabase
          .from("ferragens")
          .select("id, codigo, nome, preco, categoria, cores, codigo_interno, empresa_id")
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
          }));
        }
      }

      if (precosVidroError) {
        console.error("Erro ao carregar preços por tabela:", precosVidroError);
        setPrecosVidroGrupos([]);
      } else {
        setPrecosVidroGrupos((precosVidroData || []) as PrecoVidroGrupo[]);
      }

      if (ferragensError) {
        console.error("Erro ao carregar ferragens:", ferragensError);
        setFerragens([]);
      } else {
        setFerragens((ferragensData || []) as FerragemCadastro[]);
      }

      if (kitsError) {
        console.error("Erro ao carregar kits:", kitsError);
        setKits([]);
      } else {
        setKits((kitsData || []) as KitCadastro[]);
      }

      if (perfisError) {
        console.error("Erro ao carregar perfis:", perfisError);
        setPerfis([]);
      } else {
        const listaPerfis = (perfisData || []) as PerfilCadastro[];
        setPerfis(listaPerfis);
        setPerfilTuboId(null);
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

  const corFerragemSelecionada = normalizarTexto(dados.corKit);

  const ferragemCorrespondeCor = useCallback((ferragem: FerragemCadastro, ignorarCor = false) => {
    if (ignorarCor) return true;
    if (!corFerragemSelecionada || corFerragemSelecionada === "escolher") return false;
    return normalizarTexto(ferragem.cores).includes(corFerragemSelecionada);
  }, [corFerragemSelecionada]);

  const textoFerragem = useCallback((ferragem: FerragemCadastro) =>
    normalizarTexto(`${ferragem.codigo} ${ferragem.codigo_interno || ""} ${ferragem.nome} ${ferragem.categoria || ""}`), []);

  const buscarFerragem = useCallback((predicado: (texto: string, ferragem: FerragemCadastro) => boolean, opcoes?: { ignorarCor?: boolean }) =>
    (() => {
      const candidatas = ferragens.filter((ferragem) => predicado(textoFerragem(ferragem), ferragem));
      return opcoes?.ignorarCor ? candidatas[0] || null : escolherItemPorCor(candidatas, dados.corKit, (ferragem) => ferragem.cores);
    })(),
    [dados.corKit, ferragens, textoFerragem]);

  const buscarFerragemPorCodigo = useCallback((codigo: string, opcoes?: { ignorarCor?: boolean }) => {
    const codigoNormalizado = normalizarTexto(codigo);

    return buscarFerragem((_, ferragem) => {
      const codigoFerragem = normalizarTexto(ferragem.codigo);
      const codigoInterno = normalizarTexto(ferragem.codigo_interno);

      if (
        codigoFerragem &&
        codigoFerragem.startsWith(codigoNormalizado) &&
        codigoFerragem !== codigoNormalizado &&
        /^\d/.test(codigoFerragem.slice(codigoNormalizado.length))
      ) {
        return false;
      }

      return codigoFerragem === codigoNormalizado ||
        codigoInterno === codigoNormalizado ||
        descricaoTemCodigo(codigoFerragem, codigoNormalizado) ||
        descricaoTemCodigo(codigoInterno, codigoNormalizado);
    }, opcoes);
  }, [buscarFerragem]);

  const codigosFerragensAutomaticas = useMemo(
    () => [
      "3530AROU-CIL",
      "3530DP",
      "3230DP",
      "3230D",
      "353490",
      "3530P",
      "3534",
      "PUXBC30",
      "PUXBC60",
      "PUXBC80",
      "1519",
      "1038B",
      "1520AROU-CIL",
      "1520P",
    ].map(normalizarTexto),
    []
  );

  const ferragensAutomaticas = useMemo(() => {
    const quantidadeProjeto = Number(dados.quantidade || 0);
    if (quantidadeProjeto <= 0 || dados.corKit === "Escolher") return [];
    const codigoPuxador =
      dados.tamanhoPuxador === "600mm" ? "PUXBC60"
        : dados.tamanhoPuxador === "800mm" ? "PUXBC80"
          : "PUXBC30";

    const regras: Array<{ codigo: string; multiplicador: number }> = [
      { codigo: "3530AROU-CIL", multiplicador: 1 },
      { codigo: "3530P", multiplicador: 1 },
      { codigo: "3534", multiplicador: 1 },
    ];

    if (dados.puxador === "Com puxador") {
      regras.push({ codigo: codigoPuxador, multiplicador: 2 });
    }

    if (dados.trinco === "Com trinco") {
      regras.push({ codigo: "1519", multiplicador: 1 }, { codigo: "1038B", multiplicador: 1 });
    }

    if (dados.trinco === "Com chave") {
      regras.push(
        { codigo: "1520AROU-CIL", multiplicador: 1 },
        { codigo: "1520P", multiplicador: 1 },
        { codigo: "1038B", multiplicador: 1 }
      );
    }

    return regras
      .map(({ codigo, multiplicador }) => {
    let ferragem = buscarFerragemPorCodigo(codigo, {
        ignorarCor: codigo === "3530AROU-CIL" || codigo === "1520AROU-CIL",
      });

      if (!ferragem && codigo.startsWith("PUXBC")) {
        ferragem = buscarFerragemPorCodigo(codigo, {
          ignorarCor: true,
        });
      }
        if (!ferragem) return null;

        return criarMaterial({
          qtd: quantidadeProjeto * multiplicador,
          unidade: "und",
          descricao: montarDescricaoComCor(ferragem.codigo, ferragem.nome, ferragem.cores),
          valorUnitario: Number(ferragem.preco || 0),
        });
      })
      .filter((item): item is ProjetoIndividualMaterial => Boolean(item));
  }, [buscarFerragemPorCodigo, dados.corKit, dados.puxador, dados.quantidade, dados.tamanhoPuxador, dados.trinco]);

  useEffect(() => {
    if (!kitSelecionado) return;

    const descricaoKit = kitSelecionado.nome.toUpperCase();
    const precoKit = Number(kitSelecionado.preco || 0);

    setMateriais((lista) => {
      const indiceKit = lista.findIndex?.((item) =>
        item.descricao.toLowerCase().includes("kit")
      );

      const itemAtual = lista[indiceKit] || criarMaterial();

      const itemAtualizado: ProjetoIndividualMaterial = {
        ...itemAtual,
        qtd: Number(dados.quantidade || 1),
        unidade: "und",
        descricao: descricaoKit,
        valorUnitario: precoKit,
      };

      if (indiceKit < 0) return [...lista, itemAtualizado];

      return lista.map((item, index) =>
        index === indiceKit ? itemAtualizado : item
      );
    });
  }, [dados.quantidade, kitSelecionado]);

  useEffect(() => {
    if (!dados.vidro || dados.vidro === "Escolher") return;

    const vidroNome = dados.vidro
      .replace(/^vidro\s+/i, "")
      .trim();

    const medidaVidro = `${calculoVidro.larguraMedida}x${calculoVidro.alturaMedida}`;
    const descricaoVidro = `VIDRO ${medidaVidro} ${vidroNome.toUpperCase()}`;

    setMateriais((lista) => {
      const indiceVidro = lista.findIndex?.((item) =>
        !item.perfilExtra && item.descricao.toLowerCase().includes("vidro")
      );

      const itemAtual = lista[indiceVidro] || criarMaterial();

      const itemAtualizado: ProjetoIndividualMaterial = {
        ...itemAtual,
        qtd: calculoVidro.areaTotalCobrada,
        unidade: "m2",
        descricao: descricaoVidro,
        valorUnitario: precoVidroM2,
      };

      if (indiceVidro < 0) return [itemAtualizado, ...lista];

      return lista.map((item, index) =>
        index === indiceVidro ? itemAtualizado : item
      );
    });
  }, [calculoVidro.alturaMedida, calculoVidro.areaTotalCobrada, calculoVidro.larguraMedida, dados.vidro, precoVidroM2]);

  useEffect(() => {
    setMateriais((lista) => {
      return mesclarMateriaisAutomaticos(lista, ferragensAutomaticas, codigosFerragensAutomaticas);
    });
  }, [codigosFerragensAutomaticas, ferragensAutomaticas]);

  useEffect(() => {
    setMateriais((lista) => {
      const filtrada = lista.filter((item) => item.perfilExtra || !normalizarTexto(item.descricao).includes("tubo"));
      return filtrada.length === lista.length ? lista : filtrada;
    });
  }, [materiais]);

  const novoProjeto = () => {
    if (editId) {
      router.push("/pfv2f-kit");
      return;
    }

    window.localStorage.removeItem(PROJETO_INDIVIDUAL_DRAFT_KEY);

    setDados((atual) => ({
      ...atual,
      cliente: "",

      obra: "",
      largura: 0,
      altura: 0,
      quantidade: 1,
      trilho: "Escolher",
      vidro: "Escolher",
      corKit: "Escolher",
      puxador: "Sem puxador",
      tamanhoPuxador: "Escolher",
      trinco: "Sem trinco",
    }));

    setMateriais([]);

    setPerfilTuboId(null);
  };

  const montarItemCentral = (id?: string): CentralImpressaoProjetoItem => {
    const desenhoUrl = dados.puxador === "Com puxador" ? "/desenhos/portaforavao-2flscompleto.png"
      : "/desenhos/portaforavao-2fls.png";

    return {
      id: id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      numero: dados.numero || "novo",
      projeto: "Porta de correr atrás do vão - 2 folhas",
      cliente: dados.cliente || "",
      obra: dados.obra?.trim() || "",
      medidas: `${Number(dados.largura || 0)} x ${Number(dados.altura || 0)} mm`,
      largura: Number(dados.largura || 0),
      altura: Number(dados.altura || 0),
      quantidade: Number(dados.quantidade || 0),
      modo: "Kit",
      desenhoUrl,
      vidro: dados.vidro || "",
      corKit: dados.corKit || "",
      corPerfil: dados.corKit || "",
      trilho: dados.trilho || "",
      puxador: dados.puxador || "",
      tamanhoPuxador: dados.tamanhoPuxador || "",
      trinco: dados.trinco || "",
      valorTotal: Number(totalMateriais || 0),
      materiais,
      origemRota: "/pfv2f-kit",
    };
  };

  const enviarParaCentralImpressao = async () => {
    const itemCentral = montarItemCentral(centralItemId || undefined);
    if (!await confirmarEnvioOrcamento([itemCentral])) return;

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
      console.error("Erro ao carregar Orçamento PFV2F:", error);
      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao carregar",
        mensagem: `Não foi possível carregar o Orçamento: ${error.message}`,
      });
      return;
    }

    const itens = orcamento?.itens as PFV2FKitOrcamentoPersistido | null;
    if (itens?.tipo !== "pfv2f_kit") {
      setMensagemSistema({
        tipo: "aviso",
        titulo: "Orçamento incompatível",
        mensagem: "Este Orçamento Não pertence ao PFV2F - KIT.",
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
      projeto: "PFV2F - KIT",
    }));
    setMateriais(Array.isArray(itens.materiais) ? itens.materiais : []);
    setPerfilTuboId(itens.perfilTuboId || null);
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
        titulo: "Empresa Não encontrada",
        mensagem: "Empresa Não encontrada para salvar o Orçamento.",
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
        projeto: "PFV2F - KIT",
      };
      const itensPersistidos: PFV2FKitOrcamentoPersistido & {
        resumo: {
          areaTotal: number;
          totalVidros: number;
          valorVidros: number;
          valorPerfis: number;
          valorFerragens: number;
          valorTotal: number;
        };
      } = {
        tipo: "pfv2f_kit",
        modo: "kit",
        dados: dadosAtualizados,
        materiais,
        perfilTuboId,
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
      console.error("Erro ao salvar Orçamento PFV2F:", erro);
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

    const itensKits = kits.map((kit) => ({
      id: `kit-${kit.id}`,
      tipo: "kit" as const,
      descricao: `${kit.nome} ${kit.cores ? `| ${kit.cores}` : ""}`.toUpperCase(),
      preco: Number(kit.preco || 0),
    }));

    const itensFerragens = ferragens.map((ferragem) => ({
      id: `ferragem-${ferragem.id}`,
      tipo: "ferragem" as const,
      descricao: montarDescricaoComCor(ferragem.codigo, ferragem.nome, ferragem.cores),
      preco: Number(ferragem.preco || 0),
    }));

    return [...itensPerfis, ...itensKits, ...itensFerragens];
  }, [perfis, kits, ferragens]);

  return (
    <main className={`${layoutProjeto.pagina} min-h-screen w-full bg-background text-text-primary`}>
      <div className="flex min-h-screen w-full">
        <div className="flex min-h-screen w-full flex-col bg-transparent">
          <CabecalhoCalculoProjeto titulo={dados.projeto} numero={dados.numero} data={dados.data} onNovo={novoProjeto} onSalvar={salvarOrcamento} salvando={salvandoOrcamento} />

          <section className="relative z-20 mx-4 mt-4 rounded-xl border border-border bg-surface p-5 sm:mx-6 lg:mx-8 2xl:mx-10"><h2 className="mb-4 border-b border-border pb-3 text-sm font-semibold">Cliente e obra</h2>
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
            <div className="relative min-h-[66px] rounded-lg border border-border bg-background px-3 py-2">
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
              <label className="block min-h-[66px] rounded-lg border border-border bg-background px-3 py-2">
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


            <section className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 bg-transparent p-4 sm:p-6 lg:px-8 2xl:px-10">
                <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.85fr)]"><div className="min-w-0"><section className="h-full rounded-xl border border-border bg-surface p-5">
                      <SectionTitle>Configuração do projeto</SectionTitle>
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
                          icon={<Copy size={24} strokeWidth={1.6} />}
                          label="Quantidade"
                          value={dados.quantidade}
                          onChange={(v) => atualizarCampo("quantidade", v)}
                        />
                        <label data-campo-legado className="relative flex min-h-[76px] items-center gap-3 rounded-2xl border border-border/80 bg-surface px-4 py-3 transition-colors focus-within:border-success-soft focus-within:bg-surface focus-within:ring-4 focus-within:ring-success/10">
                          <span className="flex w-7 shrink-0 justify-start text-text-primary/65">
                            <Layers size={24} strokeWidth={1.6} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Cor do vidro</span>
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
                                className="mt-1 w-full bg-transparent text-base font-semibold leading-tight text-text-primary outline-none placeholder:text-text-secondary disabled:text-text-secondary"
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
                                className="mt-1 block w-full truncate rounded-lg bg-transparent p-0 text-left text-base font-semibold leading-tight text-text-primary outline-none focus-visible:bg-surface/80"
                              >
                                {dados.vidro || "Digite o vidro"}
                              </button>
                            )}
                          </span>
                          {listaVidrosAberta && (
                            <div className="absolute left-[84px] top-[64px] z-30 max-h-[250px] w-[320px] overflow-auto rounded-lg border border-border-strong/20 bg-surface py-1 text-sm shadow-xl shadow-slate-900/10">
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
                        <OptionInput
                          icon={<RailSymbol size={24} strokeWidth={1.6} />}
                          label="Trilho"
                          value={dados.trilho}
                          options={trilhoOpcoes}
                          onChange={(v) => atualizarCampo("trilho", v)}
                        />

                        <OptionInput
                          icon={<Palette size={24} strokeWidth={1.6} />}
                          label="Cor do kit"
                          value={dados.corKit}
                          options={corKitOpcoes}
                          onChange={(v) => atualizarCampo("corKit", v)}
                        />

                        <OptionInput
                          icon={<Wrench size={24} strokeWidth={1.6} />}
                          label="Puxador"
                          value={dados.puxador || "Sem puxador"}
                          options={puxadorOpcoes}
                          onChange={(v) => {
                            atualizarCampo("puxador", v);

                            if (v === "Sem puxador") {
                              atualizarCampo("tamanhoPuxador", "Escolher");
                            }

                            if (
                              v === "Com puxador" &&
                              dados.tamanhoPuxador === "Escolher"
                            ) {
                              atualizarCampo("tamanhoPuxador", "300mm");
                            }
                          }}
                        />

                        <OptionInput
                          icon={<MoveHorizontal size={24} strokeWidth={1.6} />}
                          label="Furação do puxador"
                          value={dados.tamanhoPuxador || "Escolher"}
                          options={tamanhoPuxadorOpcoes}
                          disabled={dados.puxador !== "Com puxador"}
                          onChange={(v) => atualizarCampo("tamanhoPuxador", v)}
                        />

                        <OptionInput
                          icon={<Settings size={24} strokeWidth={1.6} />}
                          label="Trinco"
                          value={dados.trinco || "Sem trinco"}
                          options={trincoOpcoes}
                          onChange={(v) => atualizarCampo("trinco", v)}
                        />
                      </div>
                    <ResumoConfiguracaoProjeto materiais={materiais} /></section></div><div className="min-w-0"><PreviaCalculoProjeto area={numero(calculoVidro.areaTotalCobrada)} pecas={numero(totalVidros, 0)} total={moeda(totalMateriais)} modelo={dados.trinco}><ProjetoDrawing comPuxador={dados.puxador === "Com puxador"} /></PreviaCalculoProjeto></div></div><div className="mt-4 space-y-4"><PerfisExtrasProjeto perfis={perfis} materiais={materiais} setMateriais={setMateriais} altura={dados.altura} largura={dados.largura} quantidade={dados.quantidade} />
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
<section className="rounded-xl border border-border bg-surface p-5">
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
                        <div className="grid min-w-[720px] grid-cols-[80px_2fr_70px_36px_115px_36px_105px] bg-surface-secondary text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                          <div className="border-r border-border/80 px-3 py-3 text-center">Qtd</div>
                          <div className="border-r border-border/80 px-3 py-3">Produto / descrição</div>
                          <div className="border-r border-border/80 px-3 py-3 text-center">Unidade</div>
                          <div className="px-3 py-3 text-center" />
                          <div className="border-r border-border/80 px-3 py-3 text-right">Valor unit.</div>
                          <div className="px-3 py-3 text-center" />
                          <div className="px-3 py-3 text-right">Valor total</div>
                        </div>
                        {materiaisOrdenados.map((item) => (
                          <div key={item.id} className="group relative grid min-w-[720px] grid-cols-[80px_2fr_70px_36px_115px_36px_105px] items-center border-t border-border bg-surface text-xs text-text-primary transition hover:bg-surface-secondary/70">
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

                      <div className="mt-4 flex items-center justify-end gap-4 rounded-2xl border border-border bg-surface-secondary px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-primary">Valor total do Orçamento</p>
                        <div className="rounded-2xl bg-surface-secondary px-7 py-3 text-xl font-bold text-text-primary">
                          {moeda(totalMateriais)}
                        </div>
                      </div>
                    </section></div>

                <section className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-3 xl:grid-cols-6">
                  <SummaryCard icon={<Grid2X2 size={30} />} label="Área total" value={`${numero(calculoVidro.areaTotalCobrada)} m2`} detail="Área de vidro" tone="green" />
                  <SummaryCard icon={<ClipboardList size={30} />} label="Total de vidros" value={numero(totalVidros, 0)} detail="peças de vidro" tone="blue" />
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
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-navigation/20 p-4 pt-8 backdrop-blur-[1px]">
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
    <RodapeCalculoProjeto area={numero(calculoVidro.areaTotalCobrada)} pecas={numero(totalVidros, 0)} total={moeda(totalMateriais)} documento={<ProjetoIndividualPDF nomeEmpresa={nomeEmpresa} dados={projetoPdf} logoUrl={logoUsuario} />} arquivo={`pfv2f_kit_${dados.numero || "novo"}.pdf`} onEnviar={enviarParaCentralImpressao} onSalvar={salvarOrcamento} salvando={salvandoOrcamento} /></main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) { return <div className="-mx-5 -mt-5 mb-4 border-b border-border px-5 py-3.5"><h2 className="text-sm font-semibold text-text-primary">{children}</h2></div>; }





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
        <div className="absolute left-0 top-7 z-40 max-h-64 w-[520px] overflow-auto rounded-lg border border-border bg-surface py-1 shadow-xl">
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

function ProjetoDrawing({ comPuxador }: { comPuxador: boolean }) {
  const desenhoSrc = comPuxador ? "/desenhos/portaforavao-2flscompleto.png" : "/desenhos/portaforavao-2fls.png";

  return (
    <div className="flex h-[350px] w-full items-center justify-center sm:h-[410px]" role="img" aria-label="Desenho ilustrativo do projeto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={desenhoSrc}
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










