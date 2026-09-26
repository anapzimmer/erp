"use client";
import { DataInput, OptionInput } from "@/components/CamposCalculoProjeto";
import { confirmarEnvioOrcamento } from "@/utils/envioOrcamento";
import Header from "@/components/Header";
import CadastroClientes from "@/components/CadastroClientes";
import PerfisExtrasProjeto from "@/components/PerfisExtrasProjeto";
import { DRAWING_COLORS } from "@/design/drawing";
import { useClienteOrcamento } from "@/context/OrcamentoContext";

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
import { calcularBarrasPorCortes, prepararCortesPorBarra } from "@/utils/barras";
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
  Plus,
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

type Box2FlsOrcamentoPersistido = {
  tipo?: string;
  modo?: string;
  dados?: Partial<Omit<ProjetoIndividualDados, "materiais">>;
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
  codigoPerfil: parcial?.codigoPerfil,
  comprimentoBarra: parcial?.comprimentoBarra,
  cortes: parcial?.cortes,
  perfilExtra: parcial?.perfilExtra,
});

const alturaBoxOpcoes = ["Padrão", "Até o teto"];
const modeloKitOpcoes = ["Tradicional", "Quadrado", "Evidence"];
const corKitOpcoes = ["Escolher", "Preto", "Branco", "Fosco", "Gold", "Cromado", "Rose"];
const puxadorOpcoes = ["Sem puxador", "Com puxador"];

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();


const ordemMaterialDescricao = (descricaoOriginal?: string, unidadeOriginal?: string) => ordemMaterialRelacao({
  descricao: descricaoOriginal,
  unidade: unidadeOriginal,
});
const PROJETO_INDIVIDUAL_DRAFT_KEY = "glasscode:box2fls:rascunho";
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

const desenhoBox2Fls = (modelo?: string, puxador?: string) => {
  if (normalizarTexto(modelo).includes("evidence")) {
    return puxador === "Com puxador" ? "/desenhos/box-eleganceduplo.png" : "/desenhos/box-elegancesimples.png";
  }

  return puxador === "Com puxador" ? "/desenhos/box-padraopuxador.png" : "/desenhos/box-padrao.png";
};

const precoKitPorCor = (kit: KitCadastro, cor: string) => {
  const precoBase = Number(kit.preco || 0);
  const texto = String(kit.preco_por_cor || "").trim();
  if (!texto) return precoBase;

  try {
    const parsed = JSON.parse(texto) as Record<string, number | string>;
    const chave = Object.keys(parsed).find((item) => normalizarTexto(item) === normalizarTexto(cor));
    return chave ? Number(parsed[chave] || precoBase) : precoBase;
  } catch {
    const partes = texto.split(/[;|,]/);
    const encontrado = partes.find((parte) => normalizarTexto(parte).includes(normalizarTexto(cor)));
    const valor = encontrado?.match(/(\d+(?:[.,]\d+)x)/)?.[1];
    return valor ? parseNumeroPtBr(valor) : precoBase;
  }
};

const limiteKitBox = (nome: string) => {
  const texto = normalizarTexto(nome);
  if (texto.includes("300x150") || texto.includes("1,50") || texto.includes("1.50")) return 1500;
  if (texto.includes("300x200") || texto.includes("2,00") || texto.includes("2.00")) return 2000;
  const match = texto.match(/\b(120|130|133|150|180|200)\b/);
  return match ? Number(match[1]) * 10 : 0;
};

const limiteLarguraKitBox = (kit: KitCadastro) => Number(kit.largura || 0) || limiteKitBox?.(kit.nome);
const limiteAlturaKitBox = (kit: KitCadastro) => Number(kit.altura || 0);

const kitCorrespondeModeloBox = (kit: KitCadastro, modelo: string) => {
  const nome = normalizarTexto(kit.nome);
  const modeloNormalizado = normalizarTexto(modelo);

  if (modeloNormalizado.includes("tradicional")) {
    return nome.includes("kit f1") && !nome.includes("quadrado") && !nome.includes("evid") && !nome.includes("elegance");
  }

  if (modeloNormalizado.includes("quadrado")) {
    return nome.includes("quadrado") && nome.includes("f1");
  }

  return nome.includes("evid") || nome.includes("elegance");
};

export default function Box2FlsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const centralItemId = searchParams.get("centralItem");
  const centralLoteId = searchParams.get("loteId");
  const returnTo = searchParams.get("returnTo") || "/admin/relatorio.orcamento";
  const { empresaId, nomeEmpresa, user, signOut } = useAuth();
  const { theme } = useTheme();
  const logoUsuario = theme.logoLightUrl || theme.logoUrl || theme.logoDarkUrl || null;
  const [clientes, setClientes] = useState<ClienteCadastro[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [modalNovoClienteAberto, setModalNovoClienteAberto] = useState(false);
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
    projeto: "BOX2FLS",
    numero: "005412",
    data: hojePtBr(),
    cliente: "",

    obra: "",
    largura: 0,
    altura: 0,
    quantidade: 1,
    trilho: "Padrão",
    vidro: "Escolher",
    corKit: "Escolher",
    puxador: "Sem puxador",
    tamanhoPuxador: "Escolher",
    trinco: "Tradicional",
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
  }, [centralItemId, editId]);

  useEffect(() => {
    if (!rascunhoRestaurado || editId || centralItemId) return;

    try {
      window.localStorage.setItem(
        PROJETO_INDIVIDUAL_DRAFT_KEY,
        JSON.stringify({ dados, materiais })
      );
    } catch (erro) {
      console.warn("Não foi possível salvar o rascunho do projeto individual:", erro);
    }
  }, [centralItemId, dados, editId, materiais, rascunhoRestaurado]);

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
        projeto: "BOX2FLS",
        numero: item.numero || atual.numero,
        cliente: item.cliente || atual.cliente,
        obra: item.obra || "",
        largura: Number(item.largura || 0),
        altura: Number(item.altura || 0),
        quantidade: Number(item.quantidade || 1),
        trilho: item.trilho || "Padrão",
        vidro: item.vidro || "Escolher",
        corKit: item.corPerfil || item.corKit || "Escolher",
        puxador: item.puxador || "Sem puxador",
        tamanhoPuxador: "Escolher",
        trinco: item.trinco || "Tradicional",
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
    const quantidadeVaos = Number(dados.quantidade || 0);
    const alturaAteTeto = dados.trilho === "Até o teto";
    const larguraFixaMedida = Number(dados.largura || 0) / 2;
    const larguraMovelMedida = larguraFixaMedida + 50;
    const alturaFixaMedida = Math.max(0, Number(dados.altura || 0) - (alturaAteTeto ? 55 : 35));
    const alturaMovelMedida = Math.max(0, Number(dados.altura || 0) - (alturaAteTeto ? 20 : 0));
    const larguraFixa = arredondar5cm(larguraFixaMedida);
    const larguraMovel = arredondar5cm(larguraMovelMedida);
    const alturaFixa = arredondar5cm(alturaFixaMedida);
    const alturaMovel = arredondar5cm(alturaMovelMedida);
    const areaFixa = (larguraFixa * alturaFixa * quantidadeVaos) / 1_000_000;
    const areaMovel = (larguraMovel * alturaMovel * quantidadeVaos) / 1_000_000;
    const areaTotalCobrada = areaFixa + areaMovel;

    return {
      larguraCalculo: larguraMovel,
      alturaCalculo: alturaMovel,
      larguraFixa,
      alturaFixa,
      larguraMovel,
      alturaMovel,
      larguraFixaMedida,
      alturaFixaMedida,
      larguraMovelMedida,
      alturaMovelMedida,
      areaFixa: Number(areaFixa.toFixed(3)),
      areaMovel: Number(areaMovel.toFixed(3)),
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

  const codigoCatalogoCompativel = (codigoCadastro: string, codigoBase: string) => {
    if (!codigoCadastro || !codigoBase) return false;
    if (codigoCadastro === codigoBase) return true;
    if (codigoCadastro.replace(/[^a-z0-9]/g, "") === codigoBase.replace(/[^a-z0-9]/g, "")) return true;
    if (codigoCadastro.startsWith(`${codigoBase}-`)) return true;
    if (!codigoCadastro.startsWith(codigoBase)) return false;
    const sufixo = codigoCadastro.slice(codigoBase.length);
    return /^[a-z]{1,8}$/.test(sufixo);
  };

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
  }, [dados.corKit, perfis]);

  const kitSelecionado = useMemo(() => {
    const largura = Number(dados.largura || 0);
    if (largura <= 0) return null;
    const modeloTradicional = normalizarTexto(dados.trinco || "Tradicional").includes("tradicional");
    const candidatosModelo = kits
      .filter((kit) => kitCorrespondeModeloBox?.(kit, dados.trinco || "Tradicional"))
      .map((kit) => ({
        kit,
        limiteLargura: limiteLarguraKitBox?.(kit),
        limiteAltura: limiteAlturaKitBox?.(kit),
      }))
      .filter(({ limiteLargura, limiteAltura }) =>
        limiteLargura >= largura &&
        (modeloTradicional || limiteAltura <= 0 || limiteAltura >= Number(dados.altura || 0))
      )
      .sort((a, b) => a.limiteLargura - b.limiteLargura || a.limiteAltura - b.limiteAltura);

    return escolherItemPorCor(candidatosModelo.map(({ kit }) => kit), dados.corKit, (kit) => kit.cores);
  }, [dados.altura, dados.corKit, dados.largura, dados.trinco, kits]);

  const criarPerfilBarra = useCallback((codigo: string, comprimentoMm: number, quantidadeCortes: number) => {
    const quantidadeProjeto = Number(dados.quantidade || 0);
    const perfil = buscarPerfilPorCodigo(codigo);
    const totalUsadoMm = Number(comprimentoMm || 0) * Number(quantidadeCortes || 0) * quantidadeProjeto;

    if (!perfil || totalUsadoMm <= 0) return null;

    return criarMaterial({
      qtd: calcularBarrasPorCortes(prepararCortesPorBarra(Array.from({ length: Number(quantidadeCortes || 0) * quantidadeProjeto }, () => Number(comprimentoMm || 0)), 6000), 6000),
      unidade: "barra",
      descricao: `${perfil.codigo} - ${perfil.nome_completo || perfil.nome}${perfil.cores ? ` | ${perfil.cores}` : ""}`.toUpperCase(),
      valorUnitario: Number(perfil.preco || 0),
      codigoPerfil: perfil.codigo,
      comprimentoBarra: 6000,
      cortes: prepararCortesPorBarra(Array.from({ length: Number(quantidadeCortes || 0) * quantidadeProjeto }, () => Number(comprimentoMm || 0)), 6000),
    });
  }, [buscarPerfilPorCodigo, dados.quantidade]);

  const perfisAutomaticos = useMemo(() => {
    const altura = Number(dados.altura || 0);
    const modeloTradicional = normalizarTexto(dados.trinco).includes("tradicional");

    if (dados.corKit === "Escolher" || !modeloTradicional || altura <= 1900) return [];

    const perfilVt806 = criarPerfilBarra("VT806", altura, 1);
    const perfilVt66 = criarPerfilBarra("VT66", altura, 1);

    return [perfilVt806, perfilVt66].filter((item): item is ProjetoIndividualMaterial => Boolean(item));
  }, [criarPerfilBarra, dados.altura, dados.corKit, dados.trinco]);


  useEffect(() => {
    let ativo = true;

    const carregarCadastros = async () => {
      if (!empresaId) return;

      setCarregandoClientes(true);
      setCarregandoVidros(true);
      const [
        { data: clientesData, error: clientesError },
        { data: vidrosData, error: vidrosError },
        { data: precosVidroData, error: precosVidroError },
        { data: tabelasData, error: tabelasError },
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
          .from("vidros")
          .select("id, nome, espessura, tipo, preco")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),

        supabase
          .from("vidro_precos_grupos")
          .select("vidro_id, grupo_preco_id, preco")
          .eq("empresa_id", empresaId),

        supabase
          .from("tabelas")
          .select("id, nome")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),

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

      if (tabelasError) {
        console.error("Erro ao carregar tabelas:", tabelasError);
        setTabelasPreco([]);
      } else {
        setTabelasPreco((tabelasData || []) as TabelaPrecoCadastro[]);
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

  const codigosAutomaticos = useMemo(
    () => ["VT806", "VT66", "1679C"].map(normalizarTexto),
    []
  );

  const buscarFerragemPorCodigo = useCallback((codigo: string, ignorarCor = false) => {
    const codigoNormalizado = normalizarTexto(codigo);

    const ferragensDoCodigo = ferragens.filter((ferragem) => {
      const codigoFerragem = normalizarTexto(ferragem.codigo);
      const codigoInterno = normalizarTexto(ferragem.codigo_interno);
      return (
        codigoFerragem === codigoNormalizado ||
        codigoFerragem.startsWith(codigoNormalizado) ||
        codigoInterno.includes(codigoNormalizado)
      );
    });

    return ignorarCor ? ferragensDoCodigo[0] || null : escolherItemPorCor(ferragensDoCodigo, dados.corKit, (ferragem) => ferragem.cores);
  }, [dados.corKit, ferragens]);

  const kitAutomatico = useMemo(() => {
    const quantidadeProjeto = Number(dados.quantidade || 0);
    if (!kitSelecionado || quantidadeProjeto <= 0) return [];

    return [
      criarMaterial({
        qtd: quantidadeProjeto,
        unidade: "und",
        descricao: `${kitSelecionado.nome}${kitSelecionado.cores ? ` | ${kitSelecionado.cores}` : ""}`.toUpperCase(),
        valorUnitario: precoKitPorCor(kitSelecionado, dados.corKit),
      }),
    ];
  }, [dados.corKit, dados.quantidade, kitSelecionado]);

  const ferragensAutomaticas = useMemo(() => {
    const quantidadeProjeto = Number(dados.quantidade || 0);
    if (dados.puxador !== "Com puxador" || quantidadeProjeto <= 0) return [];

    const puxador = buscarFerragemPorCodigo("1679C");

    return [
      criarMaterial({
        qtd: quantidadeProjeto,
        unidade: "und",
        descricao: puxador ? montarDescricaoComCor(puxador.codigo, puxador.nome, puxador.cores)
          : "1679C - PUXADOR C BARRA CHATA 300MM",
        valorUnitario: Number(puxador?.preco || 0),
      }),
    ];
  }, [buscarFerragemPorCodigo, dados.puxador, dados.quantidade]);


  useEffect(() => {
    if (!dados.vidro || dados.vidro === "Escolher") return;

    const vidroNome = dados.vidro
      .replace(/^vidro\s+/i, "")
      .trim();

    const medidaVidroFixo = `${calculoVidro.larguraFixaMedida}x${calculoVidro.alturaFixaMedida}`;
    const medidaVidroMovel = `${calculoVidro.larguraMovelMedida}x${calculoVidro.alturaMovelMedida}`;
    const descricaoVidroFixo = `VIDRO FIXO ${medidaVidroFixo} ${vidroNome.toUpperCase()}`;
    const descricaoVidroMovel = `VIDRO MOVEL ${medidaVidroMovel} ${vidroNome.toUpperCase()}`;

    setMateriais((lista) => {
      const semVidrosAutomaticos = lista.filter((item) => {
        if (item.perfilExtra) return true;
        const descricao = normalizarTexto(item.descricao);
        return !descricao.startsWith("vidro");
      });

      const vidroFixo = criarMaterial({
        qtd: calculoVidro.areaFixa,
        unidade: "m2",
        descricao: descricaoVidroFixo,
        valorUnitario: precoVidroM2,
      });

      const vidroMovel = criarMaterial({
        qtd: calculoVidro.areaMovel,
        unidade: "m2",
        descricao: descricaoVidroMovel,
        valorUnitario: precoVidroM2,
      });

      return [vidroFixo, vidroMovel, ...semVidrosAutomaticos];
    });
  }, [calculoVidro.alturaFixaMedida, calculoVidro.alturaMovelMedida, calculoVidro.areaFixa, calculoVidro.areaMovel, calculoVidro.larguraFixaMedida, calculoVidro.larguraMovelMedida, dados.vidro, precoVidroM2]);

  useEffect(() => {
    setMateriais((lista) => {
      return mesclarMateriaisAutomaticos(lista, [...kitAutomatico, ...perfisAutomaticos, ...ferragensAutomaticas], codigosAutomaticos);
    });
  }, [codigosAutomaticos, ferragensAutomaticas, kitAutomatico, perfisAutomaticos]);

  useEffect(() => {
    setMateriais((lista) => {
      const filtrada = lista.filter((item) => item.perfilExtra || !normalizarTexto(item.descricao).includes("tubo"));
      return filtrada.length === lista.length ? lista : filtrada;
    });
  }, [materiais]);

  const novoProjeto = () => {
    if (editId) {
      router.push("/box2fls");
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
      trilho: "Padrão",
      vidro: "Escolher",
      corKit: "Escolher",
      puxador: "Sem puxador",
      tamanhoPuxador: "Escolher",
      trinco: "Tradicional",
    }));

    setMateriais([]);
  };

  const montarItemCentral = (id?: string): CentralImpressaoProjetoItem => {
    const desenhoUrl = desenhoBox2Fls(dados.trinco, dados.puxador);

    return {
      id: id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      numero: dados.numero || "novo",
      projeto: "Box 2 folhas",
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
      tamanhoPuxador: "",
      trinco: dados.trinco || "",
      valorTotal: Number(totalMateriais || 0),
      materiais,
      origemRota: "/box2fls",
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
      console.error("Erro ao carregar Orçamento BOX2FLS:", error);
      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao carregar",
        mensagem: `Não foi possível carregar o Orçamento: ${error.message}`,
      });
      return;
    }

    const itens = orcamento?.itens as Box2FlsOrcamentoPersistido | null;
    if (itens?.tipo !== "box2fls") {
      setMensagemSistema({
        tipo: "aviso",
        titulo: "Orçamento incompatível",
        mensagem: "Este Orçamento não pertence ao BOX2FLS.",
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
      projeto: "BOX2FLS",
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
        projeto: "BOX2FLS",
      };
      const itensPersistidos: Box2FlsOrcamentoPersistido & {
        resumo: {
          areaTotal: number;
          totalVidros: number;
          valorVidros: number;
          valorPerfis: number;
          valorFerragens: number;
          valorTotal: number;
        };
      } = {
        tipo: "box2fls",
        modo: "kit",
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
      console.error("Erro ao salvar Orçamento BOX2FLS:", erro);
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
      descricao: `${kit.nome}${kit.cores ? ` | ${kit.cores}` : ""}`.toUpperCase(),
      preco: precoKitPorCor(kit, dados.corKit),
    }));

    const itensFerragens = ferragens.map((ferragem) => ({
      id: `ferragem-${ferragem.id}`,
      tipo: "ferragem" as const,
      descricao: montarDescricaoComCor(ferragem.codigo, ferragem.nome, ferragem.cores),
      preco: Number(ferragem.preco || 0),
    }));

    return [...itensPerfis, ...itensKits, ...itensFerragens];
  }, [dados.corKit, ferragens, kits, perfis]);

  return (
    <main className="min-h-screen w-full bg-background text-text-primary">
      <Header nomeEmpresa={nomeEmpresa || ""} usuarioEmail={user?.email || ""} handleSignOut={signOut} />
      <div className="w-full px-4 pb-28 pt-5 sm:px-6 lg:px-8 2xl:px-10">

        {/* =========================================================
            CABEÇALHO DA PÁGINA
        ========================================================= */}
        <header className="mb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-text-secondary">
                <span>Orçamentos</span>
                <span className="opacity-40">/</span>
                <span>Novo orçamento</span>
                <span className="opacity-40">/</span>
                <span className="text-text-primary">Box 2 Folhas</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
                  <Grid2X2 size={22} strokeWidth={1.7} className="text-primary" />
                </div>

                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">
                    Box 2 Folhas
                  </h1>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    Configure as medidas e o sistema calcula automaticamente os materiais e o valor.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <div className="mr-2 hidden items-center gap-3 text-xs text-text-secondary lg:flex">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {editId ? "Editando orçamento" : "Orçamento não salvo"}
                </span>

                <span className="h-4 w-px bg-border" />

                <span className="font-medium text-text-primary">
                  Nº {dados.numero || "automático"}
                </span>

                <span className="h-4 w-px bg-border" />

                <span>{dados.data}</span>
              </div>

              <button
                type="button"
                onClick={novoProjeto}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-secondary"
              >
                <Plus size={17} />
                Novo
              </button>

              <button
                type="button"
                onClick={() => router.push("/matriz-projetos")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-secondary"
              >
                <FolderOpen size={17} />
                Projetos
              </button>

              <button
                type="button"
                disabled={salvandoOrcamento}
                onClick={salvarOrcamento}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-on-primary shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />
                {salvandoOrcamento ? "Salvando..." : "Salvar orçamento"}
              </button>
            </div>
          </div>
        </header>

        {/* =========================================================
            CLIENTE E OBRA
        ========================================================= */}
        <section className="mb-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <UserRound size={18} strokeWidth={1.7} className="text-text-secondary" />
            <h2 className="text-sm font-semibold text-text-primary">
              Cliente e Obra
            </h2>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Cliente
              </label>

              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  {listaClientesAberta ? (
                    <input
                      ref={clienteInputRef}
                      value={dados.cliente}
                      onChange={(e) => {
                        atualizarCampo("cliente", e.target.value);
                        setClienteAtivoIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setClienteAtivoIndex((atual) =>
                            Math.min(
                              atual + 1,
                              Math.max(clientesFiltrados.length - 1, 0)
                            )
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setClienteAtivoIndex((atual) =>
                            Math.max(atual - 1, 0)
                          );
                        } else if (
                          e.key === "Enter" &&
                          clientesFiltrados[clienteAtivoIndex]
                        ) {
                          e.preventDefault();
                          selecionarCliente(
                            clientesFiltrados[clienteAtivoIndex]
                          );
                        } else if (e.key === "Escape") {
                          setListaClientesAberta(false);
                        }
                      }}
                      onBlur={() =>
                        window.setTimeout(
                          () => setListaClientesAberta(false),
                          250
                        )
                      }
                      disabled={carregandoClientes}
                      placeholder={
                        carregandoClientes
                          ? "Carregando..."
                          : "Digite ou pesquise o cliente"
                      }
                      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-text-primary outline-none transition placeholder:text-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setListaClientesAberta(true)}
                      className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-left text-sm font-medium text-text-primary transition hover:border-border-strong"
                    >
                      <span className="truncate">
                        {dados.cliente || "Digite ou pesquise o cliente"}
                      </span>

                      <UserRound
                        size={17}
                        className="shrink-0 text-text-secondary"
                      />
                    </button>
                  )}

                  {listaClientesAberta && (
                    <div className="absolute left-0 top-full z-[120] mt-1 max-h-[280px] w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-xl">
                      {carregandoClientes ? (
                        <div className="px-3 py-2 text-sm text-text-secondary">
                          Carregando clientes...
                        </div>
                      ) : clientesFiltrados.length > 0 ? (
                        clientesFiltrados.map((cliente, index) => (
                          <button
                            key={cliente.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selecionarCliente(cliente);
                            }}
                            onMouseEnter={() =>
                              setClienteAtivoIndex(index)
                            }
                            className={`block w-full px-3 py-2.5 text-left text-sm font-medium transition ${index === clienteAtivoIndex
                                ? "bg-primary/10 text-text-primary"
                                : "text-text-primary hover:bg-surface-secondary"
                              }`}
                          >
                            {cliente.nome}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-text-secondary">
                          Nenhum cliente encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setListaClientesAberta(false);
                    setModalNovoClienteAberto(true);
                  }}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-secondary"
                >
                  <Plus size={17} />
                  <span className="hidden sm:inline">Novo cliente</span>
                </button>
              </div>

              {clienteSelecionado && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-surface-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                    Rota: {clienteSelecionado.rota?.trim() || "Não informada"}
                  </span>

                  <span className="rounded-md bg-surface-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                    Tabela: {tabelaPrecoSelecionada?.nome || "Padrão"}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Obra
                <span className="ml-1 opacity-60">(opcional)</span>
              </label>

              <input
                value={dados.obra || ""}
                onChange={(e) => atualizarCampo("obra", e.target.value)}
                placeholder="Ex.: Banheiro suíte"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-text-primary outline-none transition placeholder:text-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>
        </section>

        {/* =========================================================
            CONFIGURAÇÃO + PRÉ-VISUALIZAÇÃO
        ========================================================= */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.85fr)]">

          {/* CONFIGURAÇÃO */}
          <section className="rounded-xl border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Settings
                size={18}
                strokeWidth={1.7}
                className="text-text-secondary"
              />
              <h2 className="text-sm font-semibold text-text-primary">
                Configuração do Projeto
              </h2>
            </div>

            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <DataInput
                  icon={
                    <MoveHorizontal size={19} strokeWidth={1.7} />
                  }
                  label="Largura"
                  value={dados.largura}
                  suffix="mm"
                  onChange={(v) =>
                    atualizarCampo("largura", v)
                  }
                />

                <DataInput
                  icon={
                    <MoveVertical size={19} strokeWidth={1.7} />
                  }
                  label="Altura"
                  value={dados.altura}
                  suffix="mm"
                  onChange={(v) =>
                    atualizarCampo("altura", v)
                  }
                />

                <DataInput
                  icon={<Copy size={19} strokeWidth={1.7} />}
                  label="Quantidade"
                  value={dados.quantidade}
                  onChange={(v) =>
                    atualizarCampo("quantidade", v)
                  }
                />

                {/* VIDRO */}
                <div className="relative">
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Tipo de vidro
                  </label>

                  {listaVidrosAberta ? (
                    <input
                      ref={vidroInputRef}
                      value={dados.vidro}
                      onChange={(e) => {
                        atualizarCampo("vidro", e.target.value);
                        setVidroAtivoIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setVidroAtivoIndex((atual) =>
                            Math.min(
                              atual + 1,
                              Math.max(vidrosFiltrados.length - 1, 0)
                            )
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setVidroAtivoIndex((atual) =>
                            Math.max(atual - 1, 0)
                          );
                        } else if (
                          e.key === "Enter" &&
                          vidrosFiltrados[vidroAtivoIndex]
                        ) {
                          e.preventDefault();
                          selecionarVidro(
                            vidrosFiltrados[vidroAtivoIndex]
                          );
                        } else if (e.key === "Escape") {
                          setListaVidrosAberta(false);
                        }
                      }}
                      onBlur={() =>
                        window.setTimeout(
                          () => setListaVidrosAberta(false),
                          250
                        )
                      }
                      disabled={carregandoVidros}
                      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setListaVidrosAberta(true)}
                      className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-left text-sm font-semibold text-text-primary transition hover:border-border-strong"
                    >
                      <span className="truncate">
                        {dados.vidro || "Escolher"}
                      </span>
                      <span className="text-xs text-text-secondary">⌄</span>
                    </button>
                  )}

                  {listaVidrosAberta && (
                    <div className="absolute left-0 top-full z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-xl">
                      {vidrosFiltrados.map((vidro, index) => (
                        <button
                          key={vidro.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selecionarVidro(vidro);
                          }}
                          onMouseEnter={() =>
                            setVidroAtivoIndex(index)
                          }
                          className={`block w-full px-3 py-2 text-left text-sm font-medium ${index === vidroAtivoIndex
                              ? "bg-primary/10"
                              : "hover:bg-surface-secondary"
                            }`}
                        >
                          {formatarVidroCadastro(vidro)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <OptionInput
                  icon={<Wrench size={19} strokeWidth={1.7} />}
                  label="Modelo do kit"
                  value={dados.trinco || "Tradicional"}
                  options={modeloKitOpcoes}
                  onChange={(v) =>
                    atualizarCampo("trinco", v)
                  }
                />

                <OptionInput
                  icon={<Palette size={19} strokeWidth={1.7} />}
                  label="Cor"
                  value={dados.corKit}
                  options={corKitOpcoes}
                  onChange={(v) =>
                    atualizarCampo("corKit", v)
                  }
                />

                <OptionInput
                  icon={<RailSymbol size={19} strokeWidth={1.7} />}
                  label="Altura do box"
                  value={dados.trilho}
                  options={alturaBoxOpcoes}
                  onChange={(v) =>
                    atualizarCampo("trilho", v)
                  }
                />

                <OptionInput
                  icon={<Settings size={19} strokeWidth={1.7} />}
                  label="Puxador"
                  value={dados.puxador || "Sem puxador"}
                  options={puxadorOpcoes}
                  onChange={(v) =>
                    atualizarCampo("puxador", v)
                  }
                />
              </div>

              {/* INFORMAÇÕES AUTOMÁTICAS */}
           {/* INFORMAÇÕES AUTOMÁTICAS */}
<div className="mt-5 grid gap-x-5 gap-y-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">

  {/* KIT */}
  <div className="flex items-start gap-2">
    {kitSelecionado ? (
      <CheckCircle2
        size={15}
        className="mt-0.5 shrink-0 text-primary"
      />
    ) : (
      <AlertTriangle
        size={15}
        className="mt-0.5 shrink-0 text-amber-500"
      />
    )}

    <div className="min-w-0">
      <p
        className={`text-xs font-medium ${
          kitSelecionado
            ? "text-text-secondary"
            : "text-text-primary"
        }`}
      >
        {kitSelecionado
          ? "Kit incluído"
          : "Kit não incluído"}
      </p>

      <p className="mt-0.5 truncate text-[10px] text-text-secondary">
        {kitSelecionado
          ? `${dados.trinco} · ${dados.corKit}`
          : dados.corKit === "Escolher"
          ? "Selecione uma cor"
          : "Nenhum kit compatível encontrado"}
      </p>
    </div>
  </div>

  {/* PERFIS */}
  <div className="flex items-start gap-2">
    <CheckCircle2
      size={15}
      className="mt-0.5 shrink-0 text-primary"
    />

    <div>
      <p className="text-xs font-medium text-text-secondary">
        Perfis calculados
      </p>

      <p className="mt-0.5 text-[10px] text-text-secondary">
        Conforme medidas
      </p>
    </div>
  </div>

  {/* FERRAGENS */}
  <div className="flex items-start gap-2">
    <CheckCircle2
      size={15}
      className="mt-0.5 shrink-0 text-primary"
    />

    <div>
      <p className="text-xs font-medium text-text-secondary">
        Ferragens compatíveis
      </p>

      <p className="mt-0.5 text-[10px] text-text-secondary">
        Conforme configuração
      </p>
    </div>
  </div>

  {/* PREÇO */}
  <div className="flex items-start gap-2">
    {precoVidroM2 > 0 ? (
      <CheckCircle2
        size={15}
        className="mt-0.5 shrink-0 text-primary"
      />
    ) : (
      <AlertTriangle
        size={15}
        className="mt-0.5 shrink-0 text-amber-500"
      />
    )}

    <div>
      <p className="text-xs font-medium text-text-secondary">
        {precoVidroM2 > 0
          ? "Preço conforme tabela"
          : "Preço não encontrado"}
      </p>

      <p className="mt-0.5 text-[10px] text-text-secondary">
        {precoVidroM2 > 0
          ? tabelaPrecoSelecionada?.nome || "Tabela padrão"
          : "Verifique o cadastro"}
      </p>
    </div>
  </div>

</div>
            </div>
          </section>

          {/* PRÉ-VISUALIZAÇÃO */}
          <section className="rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Grid2X2
                  size={18}
                  strokeWidth={1.7}
                  className="text-text-secondary"
                />
                <h2 className="text-sm font-semibold text-text-primary">
                  Pré-visualização
                </h2>
              </div>

              <span className="rounded-md bg-surface-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Vista externa
              </span>
            </div>

            <div className="grid min-h-[390px] gap-4 p-5 md:grid-cols-[minmax(0,1fr)_165px] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_165px]">
             <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-white p-3">
                <ProjetoDrawing
                  modelo={dados.trinco || "Tradicional"}
                  puxador={dados.puxador}
                />
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={18}
                      className="text-primary"
                    />
                    <span className="text-sm font-semibold text-text-primary">
                      Projeto calculado
                    </span>
                  </div>

                  <p className="mt-1 pl-6 text-[11px] leading-4 text-text-secondary">
                    Materiais atualizados automaticamente.
                  </p>
                </div>

                <div className="space-y-2 rounded-lg bg-surface-secondary p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Folhas</span>
                    <strong className="text-text-primary">
                      {numero(totalVidros, 0)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Área</span>
                    <strong className="text-text-primary">
                      {numero(calculoVidro.areaTotalCobrada)} m²
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Modelo</span>
                    <strong className="max-w-[90px] truncate text-right text-text-primary">
                      {dados.trinco}
                    </strong>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                    Valor estimado
                  </p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-text-primary">
                    {moeda(totalMateriais)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* =========================================================
            PERFIS EXTRAS
        ========================================================= */}
        <div className="mt-4">
          <PerfisExtrasProjeto
            perfis={perfis}
            materiais={materiais}
            setMateriais={setMateriais}
            altura={dados.altura}
            largura={dados.largura}
            quantidade={dados.quantidade}
          />
        </div>

        {/* =========================================================
            LOTE RÁPIDO
        ========================================================= */}
        <div className="mt-4">
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
        </div>

        {/* =========================================================
            MATERIAIS
        ========================================================= */}
        <section className="mt-4 overflow-visible rounded-xl border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Layers3
                size={18}
                strokeWidth={1.7}
                className="text-text-secondary"
              />
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  Materiais do Projeto
                </h2>
                <p className="mt-0.5 text-[11px] text-text-secondary">
                  Itens calculados automaticamente e ajustes manuais.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setMateriais((lista) => [
                  ...lista,
                  criarMaterial(),
                ])
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-text-primary transition hover:bg-surface-secondary"
            >
              <Plus size={15} />
              Adicionar item
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-visible">
            <div className="min-w-[880px]">
              <div className="grid grid-cols-[80px_minmax(300px,1fr)_90px_130px_140px_74px] border-b border-border bg-surface-secondary/70 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                <div className="px-4 py-3 text-center">Qtd.</div>
                <div className="px-4 py-3">Descrição</div>
                <div className="px-4 py-3 text-center">Unidade</div>
                <div className="px-4 py-3 text-right">Valor unit.</div>
                <div className="px-4 py-3 text-right">Valor total</div>
                <div className="px-4 py-3" />
              </div>

              {materiaisOrdenados.map((item) => (
                <div
                  key={item.id}
                  className="group grid grid-cols-[80px_minmax(300px,1fr)_90px_130px_140px_74px] items-center border-b border-border/70 text-xs transition last:border-b-0 hover:bg-surface-secondary/50"
                >
                  <div className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatarQtdMaterial(
                        item.qtd,
                        item.unidade
                      )}
                      onChange={(e) =>
                        atualizarMaterial(
                          item.id,
                          "qtd",
                          parseQtdMaterial(
                            e.target.value,
                            item.unidade
                          )
                        )
                      }
                      className="w-full rounded-md bg-transparent px-1 py-1 text-center font-medium text-text-primary outline-none focus:bg-background"
                    />
                  </div>

                  <div className="px-4 py-3">
                    <DescricaoMaterialInput
                      item={item}
                      itensCatalogo={itensCatalogo}
                      atualizarMaterial={atualizarMaterial}
                      selecionarItemCatalogo={
                        selecionarItemCatalogo
                      }
                    />
                  </div>

                  <div className="px-4 py-3">
                    <input
                      value={item.unidade}
                      onChange={(e) =>
                        atualizarMaterial(
                          item.id,
                          "unidade",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md bg-transparent px-1 py-1 text-center font-medium text-text-primary outline-none focus:bg-background"
                    />
                  </div>

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-text-secondary">R$</span>
                      <input
                        value={numero(item.valorUnitario)}
                        onChange={(e) =>
                          atualizarMaterial(
                            item.id,
                            "valorUnitario",
                            parseNumeroPtBr(e.target.value)
                          )
                        }
                        className="w-[82px] rounded-md bg-transparent px-1 py-1 text-right font-medium text-text-primary outline-none focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="px-4 py-3 text-right font-semibold text-text-primary">
                    {moeda(
                      Number(item.qtd || 0) *
                      Number(item.valorUnitario || 0)
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 px-3 py-3">
                    <button
                      type="button"
                      title="Duplicar"
                      onClick={() => duplicarMaterial(item)}
                      className="rounded-md p-1.5 text-text-secondary transition hover:bg-info-soft hover:text-info"
                    >
                      <Copy size={15} />
                    </button>

                    <button
                      type="button"
                      title="Excluir"
                      onClick={() => removerMaterial(item.id)}
                      className="rounded-md p-1.5 text-text-secondary transition hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}

              {materiaisOrdenados.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-text-secondary">
                  Configure o projeto para gerar os materiais.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            RESUMO
        ========================================================= */}
        <section className="mt-4 rounded-xl border border-border bg-surface">
          <div className="grid divide-y divide-border md:grid-cols-5 md:divide-x md:divide-y-0">
            <div className="px-5 py-4 md:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Resumo do projeto
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Atualizado automaticamente
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Área total
              </p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {numero(calculoVidro.areaTotalCobrada)} m²
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Vidros
              </p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {numero(totalVidros, 0)}
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Vidro
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-text-primary">
                {dados.vidro || "Não selecionado"}
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Valor total
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {moeda(totalMateriais)}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================
          BARRA FIXA DE AÇÕES
      ========================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
        <div className="flex w-full flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 2xl:px-10">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-text-secondary">
                Área
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {numero(calculoVidro.areaTotalCobrada)} m²
              </p>
            </div>

            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-text-secondary">
                Vidros
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {numero(totalVidros, 0)} peças
              </p>
            </div>

            <div className="border-l border-border pl-6">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-text-secondary">
                Total do projeto
              </p>
              <p className="text-lg font-bold text-primary">
                {moeda(totalMateriais)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PDFDownloadLink
              document={
                <ProjetoIndividualPDF
                  nomeEmpresa={nomeEmpresa}
                  dados={projetoPdf}
                  logoUrl={logoUsuario}
                />
              }
              fileName={`box2fls_${dados.numero || "novo"}.pdf`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-secondary"
            >
              {() => (
                <>
                  <Printer size={17} />
                  Imprimir
                </>
              )}
            </PDFDownloadLink>

            <button
              type="button"
              onClick={enviarParaCentralImpressao}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-secondary"
            >
              <FileText size={17} />
              PDF +
            </button>

            <button
              type="button"
              onClick={enviarParaCentralImpressao}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-secondary"
            >
              <FolderOpen size={17} />
              Central
            </button>

            <button
              type="button"
              disabled={salvandoOrcamento}
              onClick={salvarOrcamento}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-on-primary transition hover:brightness-95 disabled:opacity-60"
            >
              <Save size={17} />
              {salvandoOrcamento
                ? "Salvando..."
                : "Salvar orçamento"}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          MENSAGEM DO SISTEMA
      ========================================================= */}
      {mensagemSistema && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-navigation/20 p-4 pt-8 backdrop-blur-[1px]">
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
                    mensagemSistema.tipo === "sucesso"
                      ? `color-mix(in srgb, ${theme.modalIconSuccessColor} 8%, transparent)`
                      : mensagemSistema.tipo === "erro"
                        ? `color-mix(in srgb, ${theme.modalIconErrorColor} 8%, transparent)`
                        : `color-mix(in srgb, ${theme.modalIconWarningColor} 8%, transparent)`,
                  color:
                    mensagemSistema.tipo === "sucesso"
                      ? theme.modalIconSuccessColor
                      : mensagemSistema.tipo === "erro"
                        ? theme.modalIconErrorColor
                        : theme.modalIconWarningColor,
                }}
              >
                {mensagemSistema.tipo === "sucesso" ? (
                  <CheckCircle2 size={21} />
                ) : (
                  <AlertTriangle size={21} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold">
                  {mensagemSistema.titulo}
                </h2>
                <p className="mt-1 text-xs leading-5 opacity-70">
                  {mensagemSistema.mensagem}
                </p>
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
                className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide"
                style={{
                  backgroundColor:
                    theme.modalButtonBackgroundColor ||
                    theme.menuBackgroundColor,
                  color: theme.modalButtonTextColor,
                }}
              >
                OK
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =========================================================
          MODAL NOVO CLIENTE
      ========================================================= */}
      {modalNovoClienteAberto && <CadastroClientes somenteNovo
        onClose={() => setModalNovoClienteAberto(false)}
        onCreated={cliente => {
          setClientes(lista => [...lista.filter(atual => String(atual.id) !== String(cliente.id)), { ...cliente, id: String(cliente.id) }]);
          setDados(atual => ({ ...atual, cliente: cliente.nome }));
          setListaClientesAberta(false);
        }}
      />}
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-text-primary">{children}</h2>
      <div className="mt-3 h-[2px] w-10 rounded-full bg-primary" />
    </div>
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

function ProjetoDrawing({ modelo, puxador }: { modelo: string; puxador?: string }) {
  const desenhoSrc = desenhoBox2Fls(modelo, puxador);

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







