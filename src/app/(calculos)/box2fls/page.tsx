"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
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
import { ProjetoIndividualPDF, type ProjetoIndividualDados, type ProjetoIndividualMaterial } from "../relatorios/projetoindividual/ProjetoIndividualPDF";

type ClienteCadastro = {
  id: string;
  nome: string;
  grupo_preco_id?: string | null;
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


const ordemMaterialDescricao = (descricaoOriginal?: string, unidadeOriginal?: string) => {
  const descricao = normalizarTexto(descricaoOriginal);
  const unidade = normalizarTexto(unidadeOriginal);

  if (descricao.includes("vidro") || unidade.includes("m2")) return 0;
  if (descricao.includes("tubo")) return 1;
  if (
    descricao.includes("kit") ||
    descricao.includes("perfil") ||
    descricao.includes("cantoneira") ||
    descricao.includes("baguete") ||
    descricao.includes("vt") ||
    unidade.includes("barra")
  ) return 2;

  return 3;
};
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
    const valor = encontrado?.match(/(\d+(?:[.,]\d+)?)/)?.[1];
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

const limiteLarguraKitBox = (kit: KitCadastro) => Number(kit.largura || 0) || limiteKitBox(kit.nome);
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
  const returnTo = searchParams.get("returnTo") || "/admin/relatorio.orcamento";
  const { empresaId } = useAuth();
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
      console.warn("Nao foi possivel restaurar o rascunho do projeto individual:", erro);
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
      console.warn("Nao foi possivel salvar o rascunho do projeto individual:", erro);
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
      .filter((item) => item.descricao.toLowerCase().includes("vidro"))
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
  const vidroSelecionado = useMemo(
    () => vidros.find((vidro) => formatarVidroCadastro(vidro) === dados.vidro) || null,
    [dados.vidro, vidros]
  );
  const precoVidroM2 = useMemo(() => {
    if (!vidroSelecionado) return 0;

    const precoGrupo = clienteSelecionado?.grupo_preco_id
      ? precosVidroGrupos.find(
        (preco) =>
          String(preco.vidro_id) === String(vidroSelecionado.id) &&
          String(preco.grupo_preco_id) === String(clienteSelecionado.grupo_preco_id)
      )
      : null;

    return Number(precoGrupo?.preco ?? vidroSelecionado.preco ?? 0);
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
        material.id === idMaterial
          ? {
            ...material,
            descricao: item.descricao,
            unidade: item.tipo === "perfil" ? "barra" : "und",
            valorUnitario: item.preco,
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
    setClienteAtivoIndex(0);
  };

  const selecionarVidro = (vidro: VidroCadastro) => {
    atualizarCampo("vidro", formatarVidroCadastro(vidro));
    setListaVidrosAberta(false);
    setVidroAtivoIndex(0);
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

    return perfis.find((perfil) => {
      const codigoOk = codigoCatalogoCompativel(normalizarTexto(perfil.codigo), codigoNormalizado);
      return codigoOk && perfilCorrespondeCor(perfil);
    }) || null;
  }, [perfilCorrespondeCor, perfis]);

  const kitSelecionado = useMemo(() => {
    const largura = Number(dados.largura || 0);
    if (largura <= 0) return null;

    const corAtual = normalizarTexto(dados.corKit);
    const modeloTradicional = normalizarTexto(dados.trinco || "Tradicional").includes("tradicional");
    const candidatosModelo = kits
      .filter((kit) => kitCorrespondeModeloBox(kit, dados.trinco || "Tradicional"))
      .map((kit) => ({
        kit,
        limiteLargura: limiteLarguraKitBox(kit),
        limiteAltura: limiteAlturaKitBox(kit),
      }))
      .filter(({ limiteLargura, limiteAltura }) =>
        limiteLargura >= largura &&
        (modeloTradicional || limiteAltura <= 0 || limiteAltura >= Number(dados.altura || 0))
      )
      .sort((a, b) => a.limiteLargura - b.limiteLargura || a.limiteAltura - b.limiteAltura);

    const candidatosComCor = corAtual && corAtual !== "escolher" ? candidatosModelo.filter(({ kit }) => {
      const corKit = normalizarTexto(kit.cores);
      return !corKit || corKit === "padrao" || corKit.includes(corAtual);
    }) : [];

    return (candidatosComCor[0] || candidatosModelo[0])?.kit || null;
  }, [dados.altura, dados.corKit, dados.largura, dados.trinco, kits]);

  const criarPerfilBarra = useCallback((codigo: string, comprimentoMm: number, quantidadeCortes: number) => {
    const quantidadeProjeto = Number(dados.quantidade || 0);
    const perfil = buscarPerfilPorCodigo(codigo);
    const totalUsadoMm = Number(comprimentoMm || 0) * Number(quantidadeCortes || 0) * quantidadeProjeto;

    if (!perfil || totalUsadoMm <= 0) return null;

    return criarMaterial({
      qtd: Math.ceil(totalUsadoMm / 6000),
      unidade: "barra",
      descricao: `${perfil.codigo} - ${perfil.nome_completo || perfil.nome}${perfil.cores ? ` | ${perfil.cores}` : ""}`.toUpperCase(),
      valorUnitario: Number(perfil.preco || 0),
      codigoPerfil: perfil.codigo,
      comprimentoBarra: 6000,
      cortes: Array.from({ length: Number(quantidadeCortes || 0) * quantidadeProjeto }, () => Number(comprimentoMm || 0)),
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
        { data: kitsData, error: kitsError },
        { data: perfisData, error: perfisError },
        { data: ferragensData, error: ferragensError },
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, grupo_preco_id")
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
    setClienteAtivoIndex(0);
  }, [dados.cliente]);

  useEffect(() => {
    if (listaClientesAberta) {
      window.setTimeout(() => clienteInputRef.current?.focus(), 0);
    }
  }, [listaClientesAberta]);

  useEffect(() => {
    setVidroAtivoIndex(0);
  }, [dados.vidro]);

  useEffect(() => {
    if (listaVidrosAberta) {
      window.setTimeout(() => vidroInputRef.current?.focus(), 0);
    }
  }, [listaVidrosAberta]);

  const codigosAutomaticos = useMemo(
    () => ["VT806", "VT66", "1679C"].map(normalizarTexto),
    []
  );

  const buscarFerragemPorCodigo = useCallback((codigo: string, ignorarCor = false) => {
    const codigoNormalizado = normalizarTexto(codigo);
    const corSelecionada = normalizarTexto(dados.corKit);
    const aliasesCor = new Map<string, string[]>([
      ["branco", ["branco", "bc"]],
      ["preto", ["preto", "pt"]],
      ["fosco", ["fosco"]],
      ["gold", ["gold", "dourado"]],
      ["cromado", ["cromado", "cr"]],
      ["rose", ["rose", "rosê", "rose gold"]],
    ]);
    const coresAceitas = aliasesCor.get(corSelecionada) || [corSelecionada];

    const ferragensDoCodigo = ferragens.filter((ferragem) => {
      const codigoFerragem = normalizarTexto(ferragem.codigo);
      const codigoInterno = normalizarTexto(ferragem.codigo_interno);
      return (
        codigoFerragem === codigoNormalizado ||
        codigoFerragem.startsWith(codigoNormalizado) ||
        codigoInterno.includes(codigoNormalizado)
      );
    });

    const comCorSelecionada = ferragensDoCodigo.find((ferragem) => {
      const corFerragem = normalizarTexto(ferragem.cores);
      return coresAceitas.some((cor) => cor && corFerragem.includes(cor));
    });

    if (comCorSelecionada) return comCorSelecionada;

    const semCor = ferragensDoCodigo.find((ferragem) => !normalizarTexto(ferragem.cores));
    if (semCor) return semCor;

    return ignorarCor ? ferragensDoCodigo[0] || null : null;
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
        descricao: puxador
          ? montarDescricaoComCor(puxador.codigo, puxador.nome, puxador.cores)
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
      const itensManuais = lista.filter((item) => {
        const descricao = normalizarTexto(item.descricao);
        return !descricao.includes("kit") && !codigosAutomaticos.some((codigo) => descricao.includes(codigo));
      });

      return [...itensManuais, ...kitAutomatico, ...perfisAutomaticos, ...ferragensAutomaticas];
    });
  }, [codigosAutomaticos, ferragensAutomaticas, kitAutomatico, perfisAutomaticos]);

  useEffect(() => {
    setMateriais((lista) => {
      const filtrada = lista.filter((item) => !normalizarTexto(item.descricao).includes("tubo"));
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

  const enviarParaCentralImpressao = () => {
    const itemCentral = montarItemCentral(centralItemId || undefined);

    try {
      const atual = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = atual ? JSON.parse(atual) as CentralImpressaoProjetoItem[] : [];
      const proximaLista = centralItemId && lista.some((item) => item.id === centralItemId)
        ? lista.map((item) => item.id === centralItemId ? itemCentral : item)
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
    const dataAtual = new Date();
    const prefixoData = `ORC${dataAtual.getFullYear().toString().slice(-2)}${(dataAtual.getMonth() + 1).toString().padStart(2, "0")}`;
    let query = supabase
      .from("orcamentos")
      .select("numero_formatado")
      .like("numero_formatado", `${prefixoData}%`)
      .order("numero_formatado", { ascending: false })
      .limit(1);

    if (empresaId) {
      query = query.eq("empresa_id", empresaId);
    }

    const { data: ultimos, error } = await query;
    if (error) throw error;

    const ultimoNumero = ultimos?.[0]?.numero_formatado;
    const proximaSequencia = ultimoNumero ? Number(String(ultimoNumero).slice(-2)) + 1 : 1;
    return `${prefixoData}${proximaSequencia.toString().padStart(2, "0")}`;
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
      projeto: "BOX2FLS",
    }));
    setMateriais(Array.isArray(itens.materiais) ? itens.materiais : []);
  }, [editId, returnTo, router]);

  useEffect(() => {
    carregarOrcamentoParaEdicao();
  }, [carregarOrcamentoParaEdicao]);

  const salvarOrcamento = async () => {
    if (centralItemId) {
      try {
        setSalvandoOrcamento(true);
        const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
        const lista = salvo ? JSON.parse(salvo) as CentralImpressaoProjetoItem[] : [];
        const itemAtualizado = montarItemCentral(centralItemId);
        const proximaLista = lista.some((item) => item.id === centralItemId)
          ? lista.map((item) => item.id === centralItemId ? itemAtualizado : item)
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
        obra_referencia: dadosAtualizados.projeto,
        itens: itensPersistidos,
        valor_total: Number(totalMateriais || 0),
        metragem_total: Number(calculoVidro.areaTotalCobrada || 0),
        peso_total: 0,
        empresa_id: empresaId,
        theme_color: theme.menuIconColor || "#07385a",
      };

      const { error } = editId
        ? await supabase.from("orcamentos").update(payload).eq("id", editId)
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
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f3f6f9] text-[#0f2742]">
      <div className="flex min-h-screen w-full">
        <div className="flex min-h-screen w-full flex-col bg-[#f3f6f9]">
          <header className="grid shrink-0 grid-cols-1 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 xl:grid-cols-[minmax(180px,0.7fr)_minmax(260px,0.9fr)_minmax(520px,1.5fr)]">
            <div className="flex items-center">
              <div className="flex h-[54px] w-full max-w-[220px] items-center">
                {logoUsuario ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUsuario}
                    alt="Logo da empresa"
                    className="max-h-[54px] w-auto max-w-[220px] object-contain"
                  />
                ) : (
                  <div className="text-[22px] font-semibold leading-none text-[#10253f]">
                    Logo da empresa
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-start gap-2 xl:justify-end">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Projeto:</label>
              <input
                value={dados.projeto}
                tabIndex={-1}
                onChange={(e) => atualizarCampo("projeto", e.target.value)}
                className="w-full max-w-[300px] border-0 bg-transparent p-0 text-[17px] font-semibold uppercase leading-tight text-[#102d4d] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="flex min-h-[48px] items-center gap-3 border-t border-slate-200 py-2 sm:border-l sm:border-t-0 sm:px-4">
                <FileText size={26} strokeWidth={1.6} className="shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Nº Orçamento</label>
                  <input
                    value={dados.numero}
                    tabIndex={-1}
                    onChange={(e) => atualizarCampo("numero", e.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-emerald-600 outline-none"
                  />
                </div>
              </div>
              <div className="flex min-h-[48px] items-center gap-3 border-t border-slate-200 py-2 sm:border-l sm:border-t-0 sm:px-4">
                <Calendar size={26} strokeWidth={1.6} className="shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Data</label>
                  <input
                    value={dados.data}
                    tabIndex={-1}
                    onChange={(e) => atualizarCampo("data", e.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-emerald-600 outline-none"
                  />
                </div>
              </div>
              <div className="flex min-h-[48px] items-center gap-3 border-t border-slate-200 py-2 sm:border-l sm:border-t-0 sm:px-4">
                <UserRound size={28} strokeWidth={1.6} className="shrink-0 text-slate-500" />
                <div className="relative min-w-0">
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cliente</label>
                  {listaClientesAberta ? (
                    <input
                      ref={clienteInputRef}
                      value={dados.cliente}
                      tabIndex={-1}
                      onChange={(e) => {
                        atualizarCampo("cliente", e.target.value);
                        setClienteAtivoIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setClienteAtivoIndex((atual) => Math.min(atual + 1, Math.max(clientesFiltrados.length - 1, 0)));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setClienteAtivoIndex((atual) => Math.max(atual - 1, 0));
                        } else if (e.key === "Enter" && clientesFiltrados[clienteAtivoIndex]) {
                          e.preventDefault();
                          selecionarCliente(clientesFiltrados[clienteAtivoIndex]);
                        } else if (e.key === "Escape") {
                          setListaClientesAberta(false);
                        }
                      }}
                      onBlur={() => window.setTimeout(() => setListaClientesAberta(false), 250)}
                      disabled={carregandoClientes}
                      className="w-full min-w-[180px] border-0 bg-transparent p-0 text-sm font-semibold text-[#07385a] outline-none placeholder:text-slate-400 disabled:text-slate-400"
                      placeholder={carregandoClientes ? "Carregando..." : "Digite o cliente"}
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
                      className="block w-full min-w-[180px] truncate bg-transparent p-0 text-left text-sm font-semibold text-emerald-600"
                    >
                      {dados.cliente || "Digite o cliente"}
                    </button>
                  )}
                  {listaClientesAberta && (
                    <div className="absolute right-0 top-[42px] z-30 max-h-[250px] w-[260px] overflow-auto rounded-lg border border-[#07385a]/20 bg-white py-1 text-sm shadow-xl shadow-slate-900/10">
                      {carregandoClientes ? (
                        <div className="px-3 py-2 font-medium text-slate-500">Carregando clientes...</div>
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
                            onMouseEnter={() => setClienteAtivoIndex(index)}
                            onClick={() => selecionarCliente(cliente)}
                            className={`block w-full px-3 py-2 text-left font-semibold text-[#07385a] ${index === clienteAtivoIndex ? "bg-[#07385a]/10" : "bg-transparent hover:bg-[#07385a]/10"
                              }`}
                          >
                            {cliente.nome}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 font-medium text-slate-500">Nenhum cliente encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <aside className="w-full shrink-0 border-b border-slate-200 bg-white">
              <nav className="flex flex-row gap-2 overflow-x-auto px-4 py-2 sm:px-6">
                {[
                  { label: "Orçamento", icon: ClipboardList, ativo: true },
                  { label: "Imprimir", icon: Printer },
                  { label: "Projetos", icon: FolderOpen },
                  { label: "PDF +", icon: FileText },
                  { label: "Salvar", icon: Save },
                  { label: "Configurações", icon: Settings },
                  { label: "Ajuda", icon: HelpCircle },
                ].map(({ label, icon: Icon, ativo }) => {
                  const itemClass = `flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${ativo ? "border-[#07385a]/15 bg-[#07385a]/5 text-[#07385a]" : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"}`;

                  if (label === "Imprimir") {
                    return (
                      <PDFDownloadLink
                        key={label}
                        tabIndex={-1}
                        document={<ProjetoIndividualPDF dados={projetoPdf} logoUrl={logoUsuario} />}
                        fileName={`box2fls_${dados.numero || "novo"}.pdf`}
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
              <div className="flex-1 overflow-y-auto bg-[#f3f6f9] p-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <SectionTitle>Desenho ilustrativo</SectionTitle>
                    <div className="mt-3 flex min-h-[300px] items-center justify-center sm:min-h-[390px] xl:min-h-[380px]">
                      <ProjetoDrawing modelo={dados.trinco || "Tradicional"} puxador={dados.puxador} />
                    </div>
                  </section>

                  <div className="space-y-4">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <SectionTitle>Dados do projeto</SectionTitle>
                      <div className="mt-4 grid overflow-visible md:grid-cols-3">
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
                        <label className="relative flex min-h-[58px] items-center gap-3 border-b border-slate-200 px-3 py-2 transition-colors focus-within:rounded-lg focus-within:bg-[#eaf4ff] focus-within:ring-1 focus-within:ring-[#1d8bd1]/25">
                          <span className="flex w-7 shrink-0 justify-start text-[#0f2742]/65">
                            <Layers size={24} strokeWidth={1.6} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cor do vidro</span>
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
                                    setVidroAtivoIndex((atual) => Math.min(atual + 1, Math.max(vidrosFiltrados.length - 1, 0)));
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setVidroAtivoIndex((atual) => Math.max(atual - 1, 0));
                                  } else if (e.key === "Enter" && vidrosFiltrados[vidroAtivoIndex]) {
                                    e.preventDefault();
                                    selecionarVidro(vidrosFiltrados[vidroAtivoIndex]);
                                  } else if (e.key === "Escape") {
                                    setListaVidrosAberta(false);
                                  }
                                }}
                                onBlur={() => window.setTimeout(() => setListaVidrosAberta(false), 250)}
                                disabled={carregandoVidros}
                                className="mt-0.5 w-full bg-transparent text-sm font-semibold leading-tight text-[#10253f] outline-none placeholder:text-slate-400 disabled:text-slate-400"
                                placeholder={carregandoVidros ? "Carregando..." : "Digite o vidro"}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setListaVidrosAberta(true)}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowDown" || e.key === "Enter") {
                                    e.preventDefault();
                                    setListaVidrosAberta(true);
                                  }
                                }}
                                className="mt-0.5 block w-full truncate rounded-md bg-transparent p-0 text-left text-sm font-semibold leading-tight text-[#10253f] outline-none focus-visible:bg-white/70"
                              >
                                {dados.vidro || "Digite o vidro"}
                              </button>
                            )}
                          </span>
                          {listaVidrosAberta && (
                            <div className="absolute left-[84px] top-[64px] z-30 max-h-[250px] w-[320px] overflow-auto rounded-lg border border-[#07385a]/20 bg-white py-1 text-sm shadow-xl shadow-slate-900/10">
                              {carregandoVidros ? (
                                <div className="px-3 py-2 font-medium text-slate-500">Carregando vidros...</div>
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
                                    onMouseEnter={() => setVidroAtivoIndex(index)}
                                    className={`block w-full px-3 py-2 text-left font-semibold text-[#07385a] ${index === vidroAtivoIndex
                                        ? "bg-[#07385a]/10"
                                        : "bg-transparent hover:bg-[#07385a]/10"
                                      }`}
                                  >
                                    {formatarVidroCadastro(vidro)}
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 font-medium text-slate-500">Nenhum vidro encontrado</div>
                              )}
                            </div>
                          )}
                        </label>
                        <OptionInput
                          icon={<RailSymbol size={24} strokeWidth={1.6} />}
                          label="Altura"
                          value={dados.trilho}
                          options={alturaBoxOpcoes}
                          onChange={(v) => atualizarCampo("trilho", v)}
                        />

                        <OptionInput
                          icon={<Palette size={24} strokeWidth={1.6} />}
                          label="Cor do perfil"
                          value={dados.corKit}
                          options={corKitOpcoes}
                          onChange={(v) => atualizarCampo("corKit", v)}
                        />

                        <OptionInput
                          icon={<Wrench size={24} strokeWidth={1.6} />}
                          label="Modelo do kit"
                          value={dados.trinco || "Tradicional"}
                          options={modeloKitOpcoes}
                          onChange={(v) => atualizarCampo("trinco", v)}
                        />

                        <OptionInput
                          icon={<Settings size={24} strokeWidth={1.6} />}
                          label="Puxador"
                          value={dados.puxador || "Sem puxador"}
                          options={puxadorOpcoes}
                          onChange={(v) => atualizarCampo("puxador", v)}
                        />
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <SectionTitle>Relação de materiais</SectionTitle>
                        <div className="flex items-center gap-2 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={novoProjeto}
                            className="rounded-xl bg-slate-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm"
                          >
                            Novo
                          </button>
                          <button
                            type="button"
                            onClick={() => setMateriais((lista) => [...lista, criarMaterial()])}
                            className="rounded-xl bg-[#07385a] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm"
                          >
                            Adicionar item
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto overflow-y-visible rounded-lg border border-slate-200">
                        <div className="grid min-w-[720px] grid-cols-[80px_2fr_70px_36px_115px_36px_105px] bg-[#07385a] text-[11px] font-semibold uppercase tracking-wide text-white">
                          <div className="border-r border-white/20 px-3 py-3 text-center">Qtd</div>
                          <div className="border-r border-white/20 px-3 py-3">Produto / descrição</div>
                          <div className="border-r border-white/20 px-3 py-3 text-center">Unidade</div>
                          <div className="px-3 py-3 text-center" />
                          <div className="border-r border-white/20 px-3 py-3 text-right">Valor unit.</div>
                          <div className="px-3 py-3 text-center" />
                          <div className="px-3 py-3 text-right">Valor total</div>
                        </div>
                        {materiaisOrdenados.map((item) => (
                          <div key={item.id} className="group relative grid min-w-[720px] grid-cols-[80px_2fr_70px_36px_115px_36px_105px] items-center border-t border-slate-200 bg-white text-xs text-[#10253f]">
                            <div className="px-3 py-2.5">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={formatarQtdMaterial(item.qtd, item.unidade)}
                                onChange={(e) => atualizarMaterial(item.id, "qtd", parseQtdMaterial(e.target.value, item.unidade))}
                                className="w-full bg-transparent text-center font-medium outline-none focus:rounded-md focus:bg-slate-50"
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
                                className="w-full bg-transparent text-center font-medium outline-none focus:rounded-md focus:bg-slate-50"
                              />
                            </div>
                            <div className="px-3 py-2.5 text-center font-medium">R$</div>
                            <div className="px-3 py-2.5">
                              <input
                                value={numero(item.valorUnitario)}
                                onChange={(e) => atualizarMaterial(item.id, "valorUnitario", parseNumeroPtBr(e.target.value))}
                                className="w-full bg-transparent text-right font-medium outline-none focus:rounded-md focus:bg-slate-50"
                              />
                            </div>
                            <div className="px-3 py-2.5 text-center font-medium">R$</div>
                            <div className="px-3 py-2.5 text-right font-medium">
                              {numero(Number(item.qtd || 0) * Number(item.valorUnitario || 0))}
                            </div>
                            <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg bg-white/95 p-1 shadow-sm group-hover:flex">
                              <button type="button" onClick={() => duplicarMaterial(item)} className="rounded-md bg-blue-50 p-1.5 text-blue-700">
                                <Copy size={16} />
                              </button>
                              <button type="button" onClick={() => removerMaterial(item.id)} className="rounded-md bg-red-50 p-1.5 text-red-600">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-5">
                        <p className="text-sm font-bold uppercase text-[#0f2742]">Valor total do Orçamento</p>
                        <div className="rounded-lg bg-[#18bd72] px-8 py-3 text-xl font-bold text-white shadow-lg shadow-emerald-900/10">
                          {moeda(totalMateriais)}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                <section className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-3 xl:grid-cols-6">
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
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/20 p-4 pt-8 backdrop-blur-[1px]">
          <section
            className="w-full max-w-sm rounded-xl border p-4 shadow-lg"
            style={{
              backgroundColor: theme.modalBackgroundColor || "#ffffff",
              borderColor: `${theme.menuBackgroundColor || "#07385a"}22`,
              color: theme.modalTextColor || "#0f2742",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor:
                    mensagemSistema.tipo === "sucesso"
                      ? `${theme.modalIconSuccessColor || "#18bd72"}14`
                      : mensagemSistema.tipo === "erro"
                        ? `${theme.modalIconErrorColor || "#dc2626"}14`
                        : `${theme.modalIconWarningColor || "#d97706"}14`,
                  color:
                    mensagemSistema.tipo === "sucesso"
                      ? theme.modalIconSuccessColor || "#18bd72"
                      : mensagemSistema.tipo === "erro"
                        ? theme.modalIconErrorColor || "#dc2626"
                        : theme.modalIconWarningColor || "#d97706",
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
                className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95"
                style={{
                  backgroundColor: theme.modalButtonBackgroundColor || theme.menuBackgroundColor || "#07385a",
                  color: theme.modalButtonTextColor || "#ffffff",
                }}
              >
                OK
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#0f2742]">{children}</h2>
      <div className="mt-3 h-[2px] w-9 rounded-full bg-[#18bd72]" />
    </div>
  );
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
    <label className="flex min-h-[58px] items-center gap-3 border-b border-slate-200 px-3 py-2 transition-colors focus-within:rounded-lg focus-within:bg-[#eaf4ff] focus-within:ring-1 focus-within:ring-[#1d8bd1]/25">
      <span className="flex w-7 shrink-0 justify-start text-[#0f2742]/65">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
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
            className="w-[64px] min-w-0 rounded-md bg-transparent text-sm font-semibold leading-tight text-[#10253f] outline-none focus-visible:bg-white/70"
          />
          {suffix && <span className="text-sm font-semibold leading-tight text-[#10253f]">{suffix}</span>}
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
      className={`flex min-h-[58px] items-center gap-3 border-b border-slate-200 px-3 py-2 transition-colors focus-within:rounded-lg focus-within:bg-[#eaf4ff] focus-within:ring-1 focus-within:ring-[#1d8bd1]/25 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <span className="flex w-7 shrink-0 justify-start text-[#0f2742]/65">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>

        <select
          value={value}
          tabIndex={tabIndex}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full cursor-pointer appearance-auto rounded-md border-0 bg-transparent p-0 text-sm font-semibold leading-tight text-[#10253f] outline-none focus-visible:bg-white/70 disabled:cursor-not-allowed"
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
        className="w-full bg-transparent text-xs font-medium uppercase outline-none focus:rounded-md focus:bg-slate-50"
      />

      {aberto && itensFiltrados.length > 0 && (
        <div className="absolute left-0 top-7 z-40 max-h-64 w-[520px] overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
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
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-[#07385a] hover:bg-[#07385a]/10"
            >
              <span>{catalogo.descricao}</span>
              <span className="ml-2 text-[10px] text-slate-400">
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
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    emerald: "bg-green-100 text-green-700",
  };
  return (
    <div className="flex items-center gap-3 border-slate-200 px-3 py-2 xl:border-r last:border-r-0">
      <div className={`flex h-11 w-12 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-base font-semibold leading-tight text-[#0f2742]">{value}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
      </div>
    </div>
  );
}





