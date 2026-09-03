//app/(projetos)/central-impressao/page.tsx
"use client";

import { normalizarDivisaoFixos, desenhoFixosUrl } from "@/utils/fixos";
import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Copy, FileDown, Layers3, Palette, PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { CentralImpressaoPDF, type CentralImpressaoItem } from "@/app/relatorios/centralimpressao/CentralImpressaoPDF";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
import { supabase } from "@/lib/supabaseClient";
import { gerarNumeroOrcamentoPadrao } from "@/utils/orcamentoNumero";
import { normalizarPrecoCatalogo } from "@/utils/precos";
import { descricaoVidroCompativel } from "@/utils/vidros";

type ProjetoComposicao = CentralImpressaoItem & {
  largura: number;
  altura: number;
  alturaInicial?: number;
  alturaFinal?: number;
  corPerfil?: string;
  valorTotal?: number;
  trilho?: string;
  alturaAteTubo?: number;
  alturaPeitoril?: number;
  alturaJanela?: number;
  alturaBandeira?: number;
  alturaTotal?: number;
  vidroPeitoril?: string;
  vidroJanela?: string;
  vidroBandeira?: string;
  tuboPerfil?: string;
  tubo?: string;
  temTrinco?: boolean;
  puxador?: string;
  tamanhoPuxador?: string;
  trinco?: string;
  observacao?: string;
  medidasDetalhadas?: string;
  foraEsquadroPecas?: Array<{
    indice: number;
    largura: number;
    alturaEsquerda: number;
    alturaDireita: number;
    queda: number;
    larguraCalculo?: number;
    alturaCalculo?: number;
    area: number;
  }>;
  pecasDivisao?: number;
  origemRota?: string;
  origemTipo?: string;
  loteId?: string;
  loteSeq?: number;
  loteTotal?: number;
  loteObservacao?: string;
  pinazioId?: string;
  pinazioNome?: string;
  pinazioCor?: "branco" | "preto" | "nogal";
  divisoesLargura?: number;
  divisoesAltura?: number;
  materiais?: ProjetoIndividualMaterial[];
};

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

type CatalogoMaterial = {
  id: string;
  tipo: "perfil" | "ferragem" | "kit";
  codigo?: string | null;
  nome: string;
  cores?: string | null;
  categoria?: string | null;
  preco?: number | null;
};

type MaterialAvulsoForm = {
  descricao: string;
  qtd: string;
  unidade: string;
  valorUnitario: string;
};

type PrecoVidroGrupo = {
  vidro_id: string;
  grupo_preco_id: string | null;
  preco: number;
};

type VidroOrigemOrcamento = {
  chave: string;
  descricao: string;
  ocorrencias: number;
  vidroId?: string;
};

export type OtimizacaoPerfil = {
  codigo: string;
  descricao: string;
  comprimentoBarra: number;
  origem: "projetos" | "sacada-frontal" | "pele-de-vidro" | "fechamento-sacada";
  barras: number[][];
  totalCortes: number;
  barrasOriginais: number;
  valorUnitario: number;
  valorOriginal: number;
  valorOtimizado: number;
};

const CENTRAL_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_CLIENTE_KEY = "glasscode:central-impressao:cliente";
const CENTRAL_OBRA_KEY = "glasscode:central-impressao:obra";
const CENTRAL_NUMERO_KEY = "glasscode:central-impressao:numero";
const CENTRAL_ORCAMENTO_ID_KEY = "glasscode:central-impressao:orcamento-id";
const CENTRAL_USAR_OTIMIZACAO_KEY = "glasscode:central-impressao:usar-otimizacao";
const CENTRAL_IMPRIMIR_OTIMIZACAO_KEY = "glasscode:central-impressao:imprimir-otimizacao";
const CENTRAL_MATERIAIS_AVULSOS_KEY = "glasscode:central-impressao:materiais-avulsos";

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const numeroDecimal = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseNumero = (valor: string) => Number(valor.replace(/\./g, "").replace(",", ".") || 0);

const numeroSeguro = (valor: unknown) => {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (typeof valor === "string") {
    const texto = valor.trim();
    if (!texto) return 0;

    const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
    const convertido = Number(normalizado);
    if (Number.isFinite(convertido)) return convertido;

    const match = texto.match(/-?\d+(?:[.,]\d+)?/);
    if (!match) return 0;
    return Number(match[0].replace(",", ".")) || 0;
  }
  return Number(valor) || 0;
};

const criarId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const temLarguraComposta = (medidas?: string) =>
  /^\s*\d+(?:[.,]\d+)?\s*\+\s*\d+(?:[.,]\d+)?\s*[xX×]/.test(String(medidas || ""));

const sanitizarNomeArquivo = (valor: string) =>
  valor
    .replace(/[<>:"/\\|x*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const formatarVidroCadastro = (vidro: VidroCadastro) => {
  const partes = [vidro.nome];
  const espessura = vidro.espessura ? String(vidro.espessura).replace(/\s*mm$/i, "") : "";
  if (espessura) partes.push(`${espessura}mm`);
  if (vidro.tipo && !normalizarTexto(vidro.nome).includes(normalizarTexto(vidro.tipo))) {
    partes.push(String(vidro.tipo));
  }
  return partes.join(" ");
};

const labelCatalogoMaterial = (item: CatalogoMaterial) => {
  const codigo = String(item.codigo || "").trim();
  const nome = String(item.nome || "").trim();
  const cor = String(item.cores || "").trim();
  return [codigo, nome, cor].filter(Boolean).join(" - ");
};

const unidadeSugeridaMaterial = (item?: CatalogoMaterial | null) => {
  const texto = normalizarTexto(`${item?.nome || ""} ${item?.categoria || ""}`);
  if (item?.tipo === "perfil" || texto.includes("tubo") || texto.includes("cantoneira")) return "barra";
  if (item?.tipo === "kit") return "und";
  return "und";
};

const formatarQuantidadeMaterialTela = (valor: number, unidade?: string) => {
  const unidadeNormalizada = normalizarTexto(unidade);
  const casas = unidadeNormalizada.includes("und") || unidadeNormalizada.includes("barra") || unidadeNormalizada.includes("pacote") || unidadeNormalizada.includes("rolo") ? 0 : 2;
  return Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
};

const trocarVidroDescricaoMaterial = (descricao: string, novoVidro: string) => {
  const texto = String(descricao || "").trim();
  const medida = texto.match(/\d+(?:[.,]\d+)?\s*[xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?/i);
  if (!medida) return `VIDRO ${novoVidro}`.toUpperCase();

  const prefixo = texto.slice(0, (medida.index || 0) + medida[0].length).trim();
  return `${prefixo} ${novoVidro}`.toUpperCase();
};

const limparDescricaoVidroMaterial = (descricao: string) =>
  String(descricao || "")
    .replace(/^vidro\s*/i, "")
    .replace(/^\d+(?:[.,]\d+)?\s*[xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?\s*/i, "")
    .replace(/^vidro\s*/i, "")
    .trim();

const chaveVidroParaTroca = (descricao?: string | null) =>
  normalizarTexto(limparDescricaoVidroMaterial(String(descricao || "")))
    .replace(/\s+/g, " ")
    .trim();

const descricaoVidroValidaParaTroca = (descricao?: string | null) => {
  const chave = chaveVidroParaTroca(descricao);
  return Boolean(chave && !/nao selecionado|não selecionado|selecionar|^-$/i.test(chave));
};

const localizarVidroCatalogoNaDescricao = (descricao: string, vidros: VidroCadastro[]) => {
  const texto = normalizarTexto(descricao).replace(/\s+/g, " ").trim();
  if (!texto) return null;

  return vidros
    .map((vidro) => ({
      vidro,
      label: formatarVidroCadastro(vidro),
      chave: normalizarTexto(formatarVidroCadastro(vidro)).replace(/\s+/g, " ").trim(),
    }))
    .filter(({ chave, label }) => chave && (texto.includes(chave) || descricaoVidroCompativel(descricao, label)))
    .sort((a, b) => b.chave.length - a.chave.length)[0] || null;
};

const chaveVidroOrigem = (descricao: string, vidros: VidroCadastro[]) => {
  const encontrado = localizarVidroCatalogoNaDescricao(descricao, vidros);
  if (encontrado) return `vidro:${encontrado.vidro.id}`;

  return `texto:${chaveVidroParaTroca(descricaoVidroAgrupadaParaTroca(descricao, vidros))}`;
};

const descricaoVidroAgrupadaParaTroca = (descricao: string, vidros: VidroCadastro[]) => {
  const encontrado = localizarVidroCatalogoNaDescricao(descricao, vidros);
  if (encontrado) return encontrado.label;

  return limparDescricaoVidroMaterial(descricao)
    .replace(/\b(fixo|fixa|movel|móvel|porta|janela|superior|inferior|bandeira|sacada)\b/gi, "")
    .replace(/\d+(?:[.,]\d+)?\s*[xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

const ehMaterialDeVidro = (material: ProjetoIndividualMaterial) => {
  const descricao = normalizarTexto(material.descricao);
  const unidade = normalizarTexto(material.unidade);
  return descricao.includes("vidro") || unidade.includes("m2") || unidade.includes("m²");
};

const descricaoVidroItem = (item: Pick<ProjetoComposicao, "vidro" | "materiais">) => {
  const vidroInformado = String(item.vidro || "").trim();
  if (vidroInformado && !/nao selecionado|não selecionado|selecionar|^-$/i.test(vidroInformado)) {
    return vidroInformado;
  }

  const vidroMaterial = item.materiais?.find((material) => /vidro/i.test(String(material.descricao || "")));
  return limparDescricaoVidroMaterial(String(vidroMaterial?.descricao || "")) || vidroInformado || "";
};

const extrairMedidaVidroAvulso = (medida?: string) => {
  const match = String(medida || "").match(/(\d+(?:[.,]\d+)x)\s*x\s*(\d+(?:[.,]\d+)x)/i);
  if (!match) return { largura: 0, altura: 0 };
  return {
    largura: Number(match[1].replace(",", ".")) || 0,
    altura: Number(match[2].replace(",", ".")) || 0,
  };
};

const calcularResumoVidrosAvulsos = (item: Pick<ProjetoComposicao, "vidrosAvulsos" | "pecasDivisao" | "valorTotal" | "materiais">) => {
  const pecas = item.vidrosAvulsos?.reduce((total, vidro) => total + Number(vidro.quantidade || 0), 0) || Number(item.pecasDivisao || 0);
  const areaAvulsos = item.vidrosAvulsos?.reduce((total, vidro) => {
    const { largura, altura } = extrairMedidaVidroAvulso(vidro.medida);
    return total + (largura * altura * Number(vidro.quantidade || 0)) / 1_000_000;
  }, 0) || 0;
  const areaMateriais = item.materiais?.reduce((total, material) => {
    const unidade = String(material.unidade || "").toLowerCase();
    if (!unidade.includes("m2") && !unidade.includes("m²")) return total;
    return total + Number(material.qtd || 0);
  }, 0) || 0;
  const valor = item.vidrosAvulsos?.reduce((total, vidro) => total + Number(vidro.valorTotal || 0), 0) || Number(item.valorTotal || 0);

  return {
    pecas,
    area: areaMateriais || areaAvulsos,
    valor,
  };
};

const somarMateriais = (materiais?: ProjetoIndividualMaterial[]) =>
  (materiais || []).reduce(
    (total, material) => total + Number(material.qtd || 0) * Number(material.valorUnitario || 0),
    0
  );

const ORDEM_PERFIS_OTIMIZADOS = [
  "VT51A",
  "VT52A",
  "VT05",
  "VT13",
  "VT10",
  "VT15",
  "VT17",
  "VT49A",
  "VT50A",
  "VT45",
  "VT65",
  "VT66",
  "VT16",
  "VT17",
];

const codigoMaterialNormalizado = (codigo?: string) => normalizarTexto(codigo).replace(/[^a-z0-9]/g, "");

const normalizarCodigoExibicao = (codigo?: string) =>
  String(codigo || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const removerCodigoDuplicadoDescricao = (codigo?: string, descricao?: string) => {
  const codigoNormalizado = normalizarCodigoExibicao(codigo);
  let descricaoLimpa = String(descricao || "").trim().replace(/\s+/g, " ");

  if (codigoNormalizado) {
    const codigoEscapado = codigoNormalizado.replace(/[.*+x^${}()|[\]\\]/g, "\\$&");
    const codigoFlexivel = codigoNormalizado
      .split("")
      .map((caractere) => caractere.replace(/[.*+x^${}()|[\]\\]/g, "\\$&"))
      .join("[\\s-]*");

    let anterior = "";
    while (anterior !== descricaoLimpa) {
      anterior = descricaoLimpa;
      descricaoLimpa = descricaoLimpa
        .replace(new RegExp(`^${codigoEscapado}\\s*-\\s*`, "i"), "")
        .replace(new RegExp(`^${codigoEscapado}\\s+`, "i"), "")
        .replace(new RegExp(`^${codigoFlexivel}\\s*-\\s*`, "i"), "")
        .replace(new RegExp(`^${codigoFlexivel}\\s+`, "i"), "");
    }
  }

  return codigoNormalizado ? `${codigoNormalizado} - ${descricaoLimpa || codigoNormalizado}`
    : descricaoLimpa;
};

const ordemPerfilOtimizado = (perfil: Pick<OtimizacaoPerfil, "codigo" | "descricao">) => {
  const codigo = codigoMaterialNormalizado(perfil.codigo);
  const descricao = normalizarTexto(perfil.descricao);
  const indiceCodigo = ORDEM_PERFIS_OTIMIZADOS.findIndex?.((item) => codigoMaterialNormalizado(item) === codigo);
  if (indiceCodigo >= 0) return indiceCodigo;
  if (descricao.includes("tubo")) return 100;
  if (descricao.includes("cantoneira")) return 110;
  return 120;
};

const formatarPuxador = (puxador?: string, tamanho?: string) => {
  const puxadorTexto = String(puxador || "").trim();
  const tamanhoTexto = String(tamanho || "").trim();
  if (!puxadorTexto) return "";
  if (!tamanhoTexto || tamanhoTexto === "Escolher" || puxadorTexto.toLowerCase().includes(tamanhoTexto.toLowerCase())) {
    return puxadorTexto;
  }
  return `${puxadorTexto} ${tamanhoTexto}`;
};

const ehJanelaCorrer4Folhas = (projeto?: string) => /jc4f|janela de correr 4/i.test(String(projeto || ""));
const ehJanelaCorrer2Folhas = (projeto?: string) => /jc2f|janela de correr 2/i.test(String(projeto || ""));
const ehPortaCorrer2Folhas = (projeto?: string) => /pc2f|porta de correr 2 folhas/i.test(String(projeto || ""));
const ehPortaCorrer4Folhas = (projeto?: string) => /pc4f|porta de correr 4 folhas/i.test(String(projeto || ""));
const ehPortaGiroFixo = (projeto?: string) => /pgf|porta de giro com fixo lateral/i.test(String(projeto || ""));
const ehMax = (projeto?: string) => /^max$/i.test(String(projeto || "")) || /(^|\s)ma?.($|\s)/i.test(String(projeto || ""));
const ehFixos = (projeto?: string) => !ehPortaGiroFixo(projeto) && /fixos|fixo/i.test(String(projeto || ""));
const ehPma2f = (projeto?: string) => /pma2f|m[aã]o amiga 2/i.test(String(projeto || ""));
const ehPma3f = (projeto?: string) => /pma3f|m[aã]o amiga 3/i.test(String(projeto || ""));
const ehPma4f = (projeto?: string) => /pma4f|m[aã]o amiga 4/i.test(String(projeto || ""));
const ehPma5f = (projeto?: string) => /pma5f|m[aã]o amiga 5/i.test(String(projeto || ""));
const ehPma6f = (projeto?: string) => /pma6f|m[aã]o amiga 6/i.test(String(projeto || ""));
const ehPma2f4m = (projeto?: string) => /pma2f4m|2 fixas \+ 4|2 fixas e 4/i.test(String(projeto || ""));
const ehPma = (projeto?: string) => ehPma2f(projeto) || ehPma3f(projeto) || ehPma4f(projeto) || ehPma5f(projeto) || ehPma6f(projeto) || ehPma2f4m(projeto);
const ehVidroAvulso = (projeto?: string) => /(vidros|espelhos) avulsos/i.test(String(projeto || ""));
const ehEspelhoComDesenho = (projeto?: string) => {
  const texto = normalizarTexto(projeto).trim();
  return /^espelhos?x?$/.test(texto) || /^espelhos? com desenho/.test(texto);
};
const ehBox2Fls = (projeto?: string) => /box2fls|box 2 folhas/i.test(String(projeto || ""));
const ehBoxCanto3f = (projeto?: string) => /boxcanto3f|box de canto 3/i.test(String(projeto || ""));
const ehBoxCanto = (projeto?: string) => /boxcanto|box de canto/i.test(String(projeto || ""));
const ehDeslizante2f = (projeto?: string) => /deslizante2f|deslizante 2/i.test(String(projeto || ""));
const ehDeslizante3f = (projeto?: string) => /deslizante3f|deslizante 3/i.test(String(projeto || ""));
const ehDeslizante4f = (projeto?: string) => /deslizante4f|deslizante 4/i.test(String(projeto || ""));
const ehDeslizante5f = (projeto?: string) => /deslizante5f|deslizante 5/i.test(String(projeto || ""));
const ehDeslizante6f = (projeto?: string) => /deslizante6f|deslizante 6/i.test(String(projeto || ""));
const ehPc2fComBandeira = (projeto?: string) => /pc2fcb|2 folhas com bandeira/i.test(String(projeto || ""));
const ehPc4fComBandeira = (projeto?: string) => /pc4fcb|4 folhas com bandeira/i.test(String(projeto || ""));
const ehJc4fComBandeira = (projeto?: string) => /jc4fcb|janela.*4.*folhas.*bandeira/i.test(String(projeto || ""));
const ehJc2fComSacada = (projeto?: string) => /jc2fcs|sacada inferior/i.test(String(projeto || ""));
const ehJc4fComSacada = (projeto?: string) => /jc4fcs|janela 4 folhas com sacada inferior|janela de correr 4 folhas com sacada inferior/i.test(String(projeto || ""));
const ehJc4fcbs = (projeto?: string) => /jc4fcbs|janela.*4.*folhas.*peitoril.*bandeira|janela.*peitoril.*sacada/i.test(String(projeto || ""));
const ehSacadaFrontal = (projeto?: string) => /sacada frontal/i.test(String(projeto || ""));
const ehSacadaComTorre = (projeto?: string) => /sacada com torre/i.test(String(projeto || ""));
const ehSacadaGrapa = (projeto?: string) => /sacada grapa|sacada com grapa/i.test(String(projeto || ""));
const ehFechamentoSacada = (projeto?: string) => /fechamento de sacada/i.test(String(projeto || ""));
const ehPeleDeVidro = (projeto?: string) => /pele de vidro/i.test(String(projeto || ""));
const ehProjetoTecnico = (projeto?: string) => ehSacadaFrontal(projeto) || ehFechamentoSacada(projeto) || ehPeleDeVidro(projeto);

const ehItemPinazio = (
  item?: Pick<
    ProjetoComposicao,
    "projeto" | "origemRota" | "origemTipo" | "pinazioId" | "pinazioNome"
  >
) =>
  String(item?.origemTipo || "") === "pinazio-individual" ||
  String(item?.origemRota || "").includes("/calculo/pinazio") ||
  /pin[aá]zio/i.test(String(item?.projeto || "")) ||
  Boolean(item?.pinazioId || item?.pinazioNome);

const formatarPinazioItem = (
  item: Pick<ProjetoComposicao, "pinazioId" | "pinazioNome" | "pinazioCor">
) => {
  if (item.pinazioId === "sem-pinazio") return "Sem Pinázio";

  const nome = String(item.pinazioNome || "Pinázio").trim();
  const cor = String(item.pinazioCor || "").trim();

  if (!cor || normalizarTexto(nome).includes(normalizarTexto(cor))) {
    return nome;
  }

  const corFormatada =
    cor.charAt(0).toUpperCase() + cor.slice(1).toLowerCase();

  return `${nome} - ${corFormatada}`;
};

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const corPerfilSvg = (cor?: string) => {
  const corNormalizada = normalizarTexto(cor).replace(/\s+/g, "");
  if (corNormalizada === "branco") return { fill: "#e8e8e8", stroke: "#c0c0c0" };
  if (corNormalizada === "preto") return { fill: "#2a2a2a", stroke: "#1a1a1a" };
  if (corNormalizada === "fosco") return { fill: "#8c8c8c", stroke: "#6b6b6b" };
  return { fill: "#9e9e9e", stroke: "#787878" };
};

function EspelhoDesenhoPreview({ item }: { item: Pick<ProjetoComposicao, "largura" | "altura" | "puxador" | "trilho" | "tamanhoPuxador"> }) {
  const largura = Math.max(1, Number(item.largura || 1));
  const altura = Math.max(1, Number(item.altura || 1));
  const tipoVisual = normalizarTexto(item.puxador || "padrao");
  const divL = Math.max(1, numeroCampoFechamento(item.trilho, 1));
  const divA = Math.max(1, numeroCampoFechamento(item.tamanhoPuxador, 1));
  const escala = Math.min(180 / largura, 150 / altura);
  let w = Math.max(70, Math.min(190, largura * escala));
  let h = Math.max(70, Math.min(160, altura * escala));
  const maior = Math.max(w, h);
  const menor = Math.min(w, h);
  const ehRedondo = tipoVisual.includes("redondo");
  const ehOvalVertical = tipoVisual.includes("oval_vertical") || tipoVisual.includes("oval-vertical") || tipoVisual.includes("vertical");
  const ehOvalHorizontal = tipoVisual.includes("oval_horizontal") || tipoVisual.includes("oval-horizontal") || tipoVisual === "oval" || (tipoVisual.includes("oval") && !ehOvalVertical && !tipoVisual.includes("semi_oval"));
  const ehSemiOval = tipoVisual.includes("semi_oval") || tipoVisual.includes("semi-oval");
  const ehOrganico = tipoVisual.includes("organico");
  const ehMolde = tipoVisual.includes("molde");
  const ehCapsula = tipoVisual.includes("capsula");
  const ehBisote = tipoVisual.includes("bisote");
  const ehLed = tipoVisual.includes("led");

  if (ehRedondo) {
    w = menor;
    h = menor;
  } else if (ehOvalVertical) {
    w = Math.max(58, menor * 0.68);
    h = maior;
  } else if (ehOvalHorizontal) {
    w = maior;
    h = Math.max(58, menor * 0.68);
  } else if (ehCapsula) {
    w = maior;
    h = Math.max(54, menor * 0.55);
  }

  const x = (220 - w) / 2;
  const y = (180 - h) / 2;
  const fill = "#e8f1f6";
  const stroke = "#8fa1ae";
  const strokeWidth = ehBisote ? 8 : 3;
  const rx = ehCapsula ? Math.min(w, h) / 2 : 8;
  const semiOvalPath = `M ${x} ${y + h} L ${x} ${y + h * 0.48} C ${x} ${y + h * 0.08} ${x + w} ${y + h * 0.08} ${x + w} ${y + h * 0.48} L ${x + w} ${y + h} Z`;
  const organicoPath = `M ${x + w * 0.5} ${y} C ${x + w * 0.88} ${y + h * 0.06} ${x + w} ${y + h * 0.36} ${x + w * 0.86} ${y + h * 0.68} C ${x + w * 0.72} ${y + h} ${x + w * 0.25} ${y + h} ${x + w * 0.08} ${y + h * 0.7} C ${x - w * 0.08} ${y + h * 0.4} ${x + w * 0.12} ${y + h * 0.04} ${x + w * 0.5} ${y} Z`;
  const moldePath = `M ${x + w * 0.16} ${y + h * 0.05} C ${x + w * 0.48} ${y - h * 0.08} ${x + w * 0.78} ${y + h * 0.1} ${x + w * 0.95} ${y + h * 0.38} C ${x + w * 1.06} ${y + h * 0.62} ${x + w * 0.84} ${y + h * 0.96} ${x + w * 0.52} ${y + h * 0.98} C ${x + w * 0.18} ${y + h} ${x - w * 0.04} ${y + h * 0.7} ${x + w * 0.04} ${y + h * 0.42} C ${x + w * 0.08} ${y + h * 0.26} ${x + w * 0.02} ${y + h * 0.12} ${x + w * 0.16} ${y + h * 0.05} Z`;

  if (tipoVisual.includes("jogo") && (divL > 1 || divA > 1)) {
    const gap = 5;
    const cellW = (w - gap * (divL - 1)) / divL;
    const cellH = (h - gap * (divA - 1)) / divA;
    return (
      <svg viewBox="0 0 220 180" className="h-full w-full">
        {Array.from({ length: divL * divA }).map((_, index) => {
          const col = index % divL;
          const row = Math.floor(index / divL);
          return (
            <rect
              key={`espelho-preview-jogo-${index}`}
              x={x + col * (cellW + gap)}
              y={y + row * (cellH + gap)}
              width={cellW}
              height={cellH}
              rx="7"
              fill={fill}
              stroke={stroke}
              strokeWidth="2"
            />
          );
        })}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 180" className="h-full w-full">
      {ehSemiOval ? (
        <>
          <path d={semiOvalPath} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          {ehBisote ? <path d={`M ${x + 9} ${y + h - 9} L ${x + 9} ${y + h * 0.5} C ${x + 9} ${y + h * 0.18} ${x + w - 9} ${y + h * 0.18} ${x + w - 9} ${y + h * 0.5} L ${x + w - 9} ${y + h - 9} Z`} fill="none" stroke="#ffffff" strokeWidth="2" /> : null}
        </>
      ) : ehOrganico ? (
        <path d={organicoPath} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      ) : ehMolde ? (
        <path d={moldePath} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      ) : ehRedondo || ehOvalVertical || ehOvalHorizontal ? (
        <>
          <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          {ehBisote ? <ellipse cx={x + w / 2} cy={y + h / 2} rx={Math.max(1, w / 2 - 9)} ry={Math.max(1, h / 2 - 9)} fill="none" stroke="#ffffff" strokeWidth="2" /> : null}
          {ehLed ? <ellipse cx={x + w / 2} cy={y + h / 2} rx={Math.max(1, w / 2 - 14)} ry={Math.max(1, h / 2 - 14)} fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="7 7" /> : null}
        </>
      ) : (
        <>
          <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          {ehBisote ? <rect x={x + 9} y={y + 9} width={Math.max(1, w - 18)} height={Math.max(1, h - 18)} rx={Math.max(1, rx - 3)} fill="none" stroke="#ffffff" strokeWidth="2" /> : null}
          {ehLed ? <rect x={x + 14} y={y + 14} width={Math.max(1, w - 28)} height={Math.max(1, h - 28)} rx={Math.max(1, rx - 4)} fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="7 7" /> : null}
        </>
      )}
    </svg>
  );
}

function ForaEsquadroPreview({
  item,
}: {
  item: Pick<ProjetoComposicao, "largura" | "altura" | "alturaInicial" | "alturaFinal" | "quantidade" | "pecasDivisao" | "medidasDetalhadas" | "foraEsquadroPecas">;
}) {
  const largura = Math.max(1, Number(item.largura || 2000));
  const alturaInicial = Math.max(1, Number(item.alturaInicial || item.altura || 1000));
  const alturasDireitas = Array.from(String(item.medidasDetalhadas || "").matchAll(/\/\s*(\d+(?:[.,]\d+)?)\s*mm/gi));
  const alturaFinalTexto = alturasDireitas.at(-1)?.[1] || "";
  const alturaFinal = Math.max(
    0,
    Number(item.alturaFinal ?? "") ||
      Number(String(alturaFinalTexto).replace(",", ".")) ||
      Math.round(alturaInicial * 0.35)
  );
  const quantidade = Math.max(1, Number(item.quantidade || 1));
  const divisoes = Math.max(1, Math.min(12, Math.round(Number(item.pecasDivisao || quantidade) / quantidade)));
  const svgW = 920;
  const svgH = 520;
  const padX = 92;
  const padTop = 62;
  const padBottom = 92;
  const drawW = svgW - padX * 2;
  const drawH = svgH - padTop - padBottom;
  const x0 = padX;
  const yBase = padTop + drawH;
  const maxAltura = Math.max(alturaInicial, alturaFinal, 1);
  const yInicial = yBase - (alturaInicial / maxAltura) * drawH;
  const yFinal = yBase - (alturaFinal / maxAltura) * drawH;
  const panelW = drawW / divisoes;
  const pontos = `${x0},${yBase} ${x0 + drawW},${yBase} ${x0 + drawW},${yFinal} ${x0},${yInicial}`;
  const yTopoEm = (index: number) => yInicial + (yFinal - yInicial) * (index / divisoes);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" role="img" aria-label="Desenho fora de esquadro">
      <defs>
        <linearGradient id={`vidroForaEsquadroCentral-${item.largura}-${item.altura}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#dff1f8" />
          <stop offset="100%" stopColor="#eef8fc" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={svgW} height={svgH} rx="28" fill="#f8fafc" />
      <polygon points={pontos} fill={`url(#vidroForaEsquadroCentral-${item.largura}-${item.altura})`} stroke="#b9c9d4" strokeWidth="2.4" strokeLinejoin="round" />
      <polygon points={pontos} fill="none" stroke="#e4eef4" strokeWidth="13" strokeLinejoin="round" opacity="0.95" />
      <polygon points={pontos} fill="none" stroke="#b9c9d4" strokeWidth="1.4" strokeLinejoin="round" opacity="0.78" />
      <line x1={x0 + 44} y1={yInicial + 44} x2={x0 + drawW * 0.68} y2={yTopoEm(divisoes * 0.68) + 54} stroke="#ffffff" strokeWidth="8" opacity="0.22" />
      <line x1={x0 + drawW * 0.38} y1={yTopoEm(divisoes * 0.38) + 58} x2={x0 + drawW - 64} y2={yFinal + 72} stroke="#ffffff" strokeWidth="6" opacity="0.24" />
      {Array.from({ length: Math.max(0, divisoes - 1) }).map((_, index) => {
        const posicao = index + 1;
        const x = x0 + panelW * posicao;
        const yTop = yTopoEm(posicao);
        const altura = item.foraEsquadroPecas?.[index]?.alturaDireita ?? alturaInicial + (alturaFinal - alturaInicial) * (posicao / divisoes);

        return (
          <g key={`fora-esquadro-preview-div-${posicao}`}>
            <line x1={x} y1={yTop} x2={x} y2={yBase} stroke="#b9c9d4" strokeWidth="1.8" opacity="0.82" />
            <text x={x + 8} y={yTop - 10} fontSize="18" fontFamily="Segoe UI, Arial" fill="#0f2742">
              {Math.round(altura)}
            </text>
          </g>
        );
      })}
      <line x1={x0} y1={yBase + 32} x2={x0 + drawW} y2={yBase + 32} stroke="#2086e8" strokeWidth="1.6" />
      <line x1={x0} y1={yBase + 22} x2={x0} y2={yBase + 42} stroke="#2086e8" strokeWidth="1.6" />
      <line x1={x0 + drawW} y1={yBase + 22} x2={x0 + drawW} y2={yBase + 42} stroke="#2086e8" strokeWidth="1.6" />
      <text x={x0 + drawW / 2} y={yBase + 62} textAnchor="middle" fontSize="21" fontFamily="Segoe UI, Arial" fontWeight="500" fill="#0f2742">
        {Math.round(largura).toLocaleString("pt-BR")} mm
      </text>
      <text x={x0 + 14} y={(yInicial + yBase) / 2} textAnchor="start" fontSize="19" fontFamily="Segoe UI, Arial" fill="#0f2742">
        {Math.round(alturaInicial).toLocaleString("pt-BR")} mm
      </text>
      <text x={x0 + drawW - 14} y={(yFinal + yBase) / 2} textAnchor="end" fontSize="19" fontFamily="Segoe UI, Arial" fill="#0f2742">
        {Math.round(alturaFinal).toLocaleString("pt-BR")} mm
      </text>
    </svg>
  );
}

const desenhoSacadaFrontalUrl = (item?: Pick<ProjetoComposicao, "largura" | "altura" | "pecasDivisao" | "corPerfil" | "corKit">) => {
  const divisoes = Math.max(1, Math.min(12, Number(item?.pecasDivisao || 1)));
  const largura = Math.max(1, Number(item?.largura || 2000));
  const altura = Math.max(1, Number(item?.altura || 1000));
  const ratio = Math.min(Math.max(altura / largura, 0.3), 2);
  const svgW = 360;
  const padL = 40;
  const padR = 10;
  const padTop = 15;
  const padBot = 40;
  const drawW = svgW - padL - padR;
  const drawH = Number((drawW * ratio).toFixed(2));
  const svgH = Number((drawH + padTop + padBot).toFixed(2));
  const postW = Math.max(2.5, Math.min(7, drawW * 0.014));
  const railH = Math.max(3.5, Math.min(10, drawH * 0.03));
  const totalPostW = (divisoes + 1) * postW;
  const glassW = (drawW - totalPostW) / divisoes;
  const glassH = drawH - railH * 2;
  const x0 = padL;
  const y0 = padTop;
  const cor = corPerfilSvg(item?.corPerfil || item?.corKit);

  const paineis = Array.from({ length: divisoes }).map((_, i) => {
    const pX = x0 + i * (glassW + postW);
    const gX = pX + postW;
    return `
      <g>
        <rect x="${pX}" y="${y0}" width="${postW}" height="${drawH}" fill="${cor.fill}" rx="0.5"/>
        <rect x="${pX}" y="${y0}" width="${postW}" height="${drawH}" fill="none" stroke="${cor.stroke}" stroke-width="0.4" rx="0.5"/>
        <rect x="${gX}" y="${y0 + railH}" width="${glassW}" height="${glassH}" fill="url(#glassGrad)" rx="1"/>
        <rect x="${gX}" y="${y0 + railH}" width="${glassW}" height="${glassH}" fill="none" stroke="#7cbfb5" stroke-width="0.6" stroke-opacity="0.5" rx="1"/>
        <line x1="${gX + glassW * 0.18}" y1="${y0 + railH + glassH * 0.06}" x2="${gX + glassW * 0.08}" y2="${y0 + railH + glassH * 0.38}" stroke="#ffffff" stroke-width="0.7" stroke-opacity="0.3"/>
        <line x1="${gX + glassW * 0.24}" y1="${y0 + railH + glassH * 0.06}" x2="${gX + glassW * 0.14}" y2="${y0 + railH + glassH * 0.38}" stroke="#ffffff" stroke-width="0.4" stroke-opacity="0.18"/>
      </g>
    `;
  }).join("");

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
      <defs>
        <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#b8e6e0" stop-opacity="0.35"/>
          <stop offset="50%" stop-color="#b8e6e0" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#b8e6e0" stop-opacity="0.3"/>
        </linearGradient>
        <linearGradient id="railGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${cor.fill}"/>
          <stop offset="50%" stop-color="${cor.stroke}"/>
          <stop offset="100%" stop-color="${cor.fill}"/>
        </linearGradient>
      </defs>
      <rect x="${x0}" y="${y0}" width="${drawW}" height="${railH}" fill="url(#railGrad)" rx="1.5"/>
      <rect x="${x0}" y="${y0}" width="${drawW}" height="${railH}" fill="none" stroke="${cor.stroke}" stroke-width="0.5" rx="1.5"/>
      <rect x="${x0}" y="${y0 + drawH - railH}" width="${drawW}" height="${railH}" fill="url(#railGrad)" rx="1.5"/>
      <rect x="${x0}" y="${y0 + drawH - railH}" width="${drawW}" height="${railH}" fill="none" stroke="${cor.stroke}" stroke-width="0.5" rx="1.5"/>
      ${paineis}
      <rect x="${x0 + divisoes * (glassW + postW)}" y="${y0}" width="${postW}" height="${drawH}" fill="${cor.fill}" rx="0.5"/>
      <rect x="${x0 + divisoes * (glassW + postW)}" y="${y0}" width="${postW}" height="${drawH}" fill="none" stroke="${cor.stroke}" stroke-width="0.4" rx="0.5"/>
      <line x1="${x0}" y1="${y0 + drawH + 14}" x2="${x0 + drawW}" y2="${y0 + drawH + 14}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <line x1="${x0}" y1="${y0 + drawH + 10}" x2="${x0}" y2="${y0 + drawH + 18}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <line x1="${x0 + drawW}" y1="${y0 + drawH + 10}" x2="${x0 + drawW}" y2="${y0 + drawH + 18}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <text x="${x0 + drawW / 2}" y="${y0 + drawH + 28}" text-anchor="middle" font-size="9.5" fill="#0f2742" opacity="0.6" font-weight="700" font-family="Arial">${largura} mm</text>
      <line x1="${x0 - 10}" y1="${y0}" x2="${x0 - 10}" y2="${y0 + drawH}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <line x1="${x0 - 14}" y1="${y0}" x2="${x0 - 6}" y2="${y0}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <line x1="${x0 - 14}" y1="${y0 + drawH}" x2="${x0 - 6}" y2="${y0 + drawH}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <text x="0" y="0" text-anchor="middle" font-size="9.5" fill="#0f2742" opacity="0.6" font-weight="700" font-family="Arial" transform="translate(${x0 - 22}, ${y0 + drawH / 2}) rotate(-90)">${altura} mm</text>
    </svg>
  `);
};

const numeroCampoFechamento = (valor: unknown, padrao = 1) => {
  const direto = Number(valor || 0);
  if (Number.isFinite(direto) && direto > 0) return direto;
  const encontrado = String(valor || "").match(/\d+/);
  return encontrado ? Number(encontrado[0]) : padrao;
};

const alturaSuperiorFechamento = (item?: Pick<ProjetoComposicao, "altura" | "alturaAteTubo" | "tamanhoPuxador">) => {
  const direta = Number(item?.tamanhoPuxador || 0);
  if (Number.isFinite(direta) && direta > 0) return direta;
  const total = Number(item?.altura || 0);
  const inferior = Number(item?.alturaAteTubo || 0);
  return total > inferior ? total - inferior : 0;
};

const desenhoFechamentoSacadaUrl = (item?: Pick<ProjetoComposicao, "largura" | "altura" | "alturaAteTubo" | "tamanhoPuxador" | "trilho" | "trinco" | "corPerfil" | "corKit">) => {
  const largura = Math.max(1, Math.round(Number(item?.largura || 2000)));
  const alturaInferior = Math.max(1, Math.round(Number(item?.alturaAteTubo || Math.round(Number(item?.altura || 2000) / 2))));
  const alturaSuperior = Math.max(1, Math.round(alturaSuperiorFechamento(item) || alturaInferior));
  const divisoesInferior = Math.max(1, Math.min(12, numeroCampoFechamento(item?.trilho, 1)));
  const divisoesSuperior = Math.max(1, Math.min(12, numeroCampoFechamento(item?.trinco, divisoesInferior)));
  const totalAltura = alturaInferior + alturaSuperior;
  const svgW = 360;
  const padL = 40;
  const padR = 10;
  const padTop = 15;
  const padBot = 40;
  const drawW = svgW - padL - padR;
  const ratio = Math.min(Math.max((totalAltura / largura) * 1.46, 0.62), 2.45);
  const drawH = Math.min(drawW * ratio, 180);
  const svgH = drawH + padTop + padBot;
  const postW = Math.max(2.5, Math.min(7, drawW * 0.014));
  const railH = Math.max(3.5, Math.min(10, drawH * 0.03));
  const areaUtilH = Math.max(drawH - railH * 3, 60);
  const moduloSupH = areaUtilH * (alturaSuperior / totalAltura);
  const moduloInfH = areaUtilH * (alturaInferior / totalAltura);
  const x0 = padL;
  const y0 = padTop;
  const yModuloSup = y0 + railH;
  const yMeio = yModuloSup + moduloSupH;
  const yModuloInf = yMeio + railH;
  const yBase = yModuloInf + moduloInfH;
  const corPerfilNorm = normalizarTexto(item?.corPerfil || item?.corKit).replace(/\s+/g, "");
  const corAluminio = corPerfilNorm === "branco" ? "#e8e8e8" : corPerfilNorm === "preto" ? "#5f666d" : corPerfilNorm === "fosco" ? "#a3a9af" : "#9e9e9e";
  const corAluminioBorda = corPerfilNorm === "branco" ? "#c0c0c0" : corPerfilNorm === "preto" ? "#4f555b" : corPerfilNorm === "fosco" ? "#8f959a" : "#787878";
  const renderModulo = (modulo: "SUP" | "INF", yModulo: number, moduloH: number, divisoes: number, larguraVidroMm: number, fill: string, stroke: string) => {
    const totalPostW = (divisoes + 1) * postW;
    const glassW = (drawW - totalPostW) / divisoes;
    const glassH = Math.max(moduloH, 10);
    const showLabelInside = divisoes <= 8 && glassW > 28;
    const paineis = Array.from({ length: divisoes }, (_, index) => {
      const pX = x0 + index * (glassW + postW);
      const gX = pX + postW;
      return `
        <g>
          <rect x="${pX}" y="${yModulo}" width="${postW}" height="${glassH}" fill="${corAluminio}" rx="0.5"/>
          <rect x="${pX}" y="${yModulo}" width="${postW}" height="${glassH}" fill="none" stroke="${corAluminioBorda}" stroke-width="0.4" rx="0.5"/>
          <rect x="${gX}" y="${yModulo}" width="${glassW}" height="${glassH}" fill="${fill}" fill-opacity="0.35" rx="1"/>
          <rect x="${gX}" y="${yModulo}" width="${glassW}" height="${glassH}" fill="none" stroke="${stroke}" stroke-width="0.6" stroke-opacity="0.5" rx="1"/>
          <line x1="${gX + glassW * 0.18}" y1="${yModulo + glassH * 0.06}" x2="${gX + glassW * 0.08}" y2="${yModulo + glassH * 0.38}" stroke="#ffffff" stroke-width="0.7" stroke-opacity="0.3"/>
          ${showLabelInside ? `<text x="${gX + glassW / 2}" y="${yModulo + glassH / 2 + 3}" text-anchor="middle" font-size="${glassW > 55 ? 7.5 : 6}" fill="#4a7a73" opacity="0.55" font-weight="600" font-family="Segoe UI, Arial">${larguraVidroMm}</text>` : ""}
        </g>
      `;
    }).join("");
    const pFinal = x0 + divisoes * (glassW + postW);
    return `
      <g>
        ${paineis}
        <rect x="${pFinal}" y="${yModulo}" width="${postW}" height="${glassH}" fill="${corAluminio}" rx="0.5"/>
        <rect x="${pFinal}" y="${yModulo}" width="${postW}" height="${glassH}" fill="none" stroke="${corAluminioBorda}" stroke-width="0.4" rx="0.5"/>
        <text x="${x0 + 3}" y="${yModulo + 11}" font-size="8" fill="#0f2742" opacity="0.55" font-weight="700" font-family="Segoe UI, Arial">${modulo}</text>
      </g>
    `;
  };
  const larguraVidroSuperior = Math.round(largura / divisoesSuperior);
  const larguraVidroInferior = Math.round(largura / divisoesInferior);

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
      <defs>
        <linearGradient id="railGradFechamento" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${corAluminio}"/>
          <stop offset="50%" stop-color="${corAluminioBorda}"/>
          <stop offset="100%" stop-color="${corAluminio}"/>
        </linearGradient>
      </defs>
      <rect x="${x0}" y="${y0}" width="${drawW}" height="${railH}" fill="url(#railGradFechamento)" rx="1.5"/>
      <rect x="${x0}" y="${y0}" width="${drawW}" height="${railH}" fill="none" stroke="${corAluminioBorda}" stroke-width="0.5" rx="1.5"/>
      <rect x="${x0}" y="${yMeio}" width="${drawW}" height="${railH}" fill="url(#railGradFechamento)" rx="1.5"/>
      <rect x="${x0}" y="${yMeio}" width="${drawW}" height="${railH}" fill="none" stroke="${corAluminioBorda}" stroke-width="0.5" rx="1.5"/>
      <rect x="${x0}" y="${yBase}" width="${drawW}" height="${railH}" fill="url(#railGradFechamento)" rx="1.5"/>
      <rect x="${x0}" y="${yBase}" width="${drawW}" height="${railH}" fill="none" stroke="${corAluminioBorda}" stroke-width="0.5" rx="1.5"/>
      ${renderModulo("SUP", yModuloSup, moduloSupH, divisoesSuperior, larguraVidroSuperior, "#b8dff2", "#7fb7d4")}
      ${renderModulo("INF", yModuloInf, moduloInfH, divisoesInferior, larguraVidroInferior, "#b8e6e0", "#7cbfb5")}
      <line x1="${x0}" y1="${yBase + railH + 14}" x2="${x0 + drawW}" y2="${yBase + railH + 14}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <line x1="${x0}" y1="${yBase + railH + 10}" x2="${x0}" y2="${yBase + railH + 18}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <line x1="${x0 + drawW}" y1="${yBase + railH + 10}" x2="${x0 + drawW}" y2="${yBase + railH + 18}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <text x="${x0 + drawW / 2}" y="${yBase + railH + 28}" text-anchor="middle" font-size="9.5" fill="#0f2742" opacity="0.6" font-weight="700" font-family="Segoe UI, Arial">${largura} mm</text>
      <line x1="${x0 - 10}" y1="${y0}" x2="${x0 - 10}" y2="${yBase + railH}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <line x1="${x0 - 14}" y1="${y0}" x2="${x0 - 6}" y2="${y0}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <line x1="${x0 - 14}" y1="${yBase + railH}" x2="${x0 - 6}" y2="${yBase + railH}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/>
      <text x="0" y="0" text-anchor="middle" font-size="9.5" fill="#0f2742" opacity="0.6" font-weight="700" font-family="Segoe UI, Arial" transform="translate(${x0 - 22}, ${y0 + (yBase + railH - y0) / 2}) rotate(-90)">${totalAltura} mm</text>
    </svg>
  `);
};

const desenhoPeleDeVidroUrl = (item?: Pick<ProjetoComposicao, "largura" | "altura" | "trilho" | "trinco" | "vidro">) => {
  const nH = Math.max(1, Math.min(12, numeroCampoFechamento(item?.trilho, 1)));
  const nV = Math.max(1, Math.min(12, numeroCampoFechamento(item?.trinco, 1)));
  const largura = Math.max(1, Math.round(Number(item?.largura || 2000)));
  const altura = Math.max(1, Math.round(Number(item?.altura || 2000)));
  const svgW = 280;
  const padL = 22;
  const padR = 22;
  const padTop = 18;
  const padBot = 18;
  const drawW = svgW - padL - padR;
  const ratio = Math.min(Math.max(altura / largura, 0.9), 1.55);
  const drawH = Math.min(drawW * ratio, 260);
  const svgH = drawH + padTop + padBot;
  const mullionW = Math.max(2, Math.min(6, drawW * 0.012));
  const glassW = (drawW - (nH + 1) * mullionW) / nH;
  const glassH = (drawH - (nV + 1) * mullionW) / nV;
  const x0 = padL;
  const y0 = padTop;
  const corAluminio = "#f7fafc";
  const corAluminioBorda = "#b8c2cc";
  const corVidroFill = "#eef8fb";
  const corVidroStroke = "#bfd8e5";
  const paineis = Array.from({ length: nV }, (_, row) =>
    Array.from({ length: nH }, (_, col) => {
      const x = x0 + mullionW + col * (glassW + mullionW);
      const y = y0 + mullionW + row * (glassH + mullionW);
      return `
        <g>
          <rect x="${x}" y="${y}" width="${glassW}" height="${glassH}" fill="${corVidroFill}" fill-opacity="0.9" stroke="${corVidroStroke}" stroke-opacity="0.55" stroke-width="0.6" rx="1"/>
          <line x1="${x + glassW * 0.18}" y1="${y + glassH * 0.07}" x2="${x + glassW * 0.08}" y2="${y + glassH * 0.4}" stroke="#ffffff" stroke-width="0.7" stroke-opacity="0.65"/>
        </g>
      `;
    }).join("")
  ).join("");
  const verticais = Array.from({ length: nH + 1 }, (_, index) => {
    const x = x0 + index * (glassW + mullionW);
    return `<rect x="${x}" y="${y0}" width="${mullionW}" height="${drawH}" fill="url(#pvRailGradCentral)" stroke="${corAluminioBorda}" stroke-width="0.4" rx="0.5"/>`;
  }).join("");
  const horizontais = Array.from({ length: nV + 1 }, (_, index) => {
    const y = y0 + index * (glassH + mullionW);
    return `<rect x="${x0}" y="${y}" width="${drawW}" height="${mullionW}" fill="url(#pvRailGradCentral)" stroke="${corAluminioBorda}" stroke-width="0.4" rx="0.5"/>`;
  }).join("");

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
      <defs>
        <linearGradient id="pvRailGradCentral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${corAluminio}"/>
          <stop offset="50%" stop-color="${corAluminioBorda}"/>
          <stop offset="100%" stop-color="${corAluminio}"/>
        </linearGradient>
      </defs>
      ${paineis}
      ${verticais}
      ${horizontais}
    </svg>
  `);
};

const desenhoTecnicoUrl = (projeto?: string, item?: ProjetoComposicao) => {
  if (String(projeto || "").trim().toLowerCase() === "fixos") {
    return desenhoFixosUrl(item?.pecasDivisao || item?.tamanhoPuxador);
  }
  if (ehSacadaFrontal(projeto)) {
    return desenhoSacadaFrontalUrl(item);
  }

  if (ehFechamentoSacada(projeto)) {
    return desenhoFechamentoSacadaUrl(item);
  }

  if (ehPeleDeVidro(projeto)) {
    return desenhoPeleDeVidroUrl(item);
  }

  return "";
};

const nomeProjetoVisivel = (projeto?: string) => {
  if (projeto === "PFV1F - KIT") return "Porta de correr atrás do Vão - 1 folha";
  if (projeto === "PFV2F - KIT") return "Porta de correr atrás do vão - 2 folhas";
  if (projeto === "PC2F - KIT") return "Porta de correr 2 folhas";
  if (projeto === "PC4F - KIT") return "Porta de correr 4 folhas";
  if (projeto === "JC4F - KIT") return "Janela de correr 4 folhas";
  if (projeto === "JC2F - KIT") return "Janela de correr 2 folhas";
  if (projeto === "PG - 1 folha") return "Porta de giro - 1 folha";
  if (projeto === "PG - 2 folhas") return "Porta de giro - 2 folhas";
  if (/pg dobradi[cç]a - 2|porta de giro dobradi[cç]a - 2/i.test(String(projeto || ""))) return "Porta de giro dobradiça - 2 folhas";
  if (ehPortaGiroFixo(projeto)) return "Porta de giro com fixo lateral";
  if (ehMax?.(projeto)) return "MAX";
  if (ehFixos(projeto)) return "Fixos";
  if (ehPma2f4m(projeto)) return "Mão Amiga 2 fixas + 4 móveis";
  if (ehPma6f(projeto)) return "Mão Amiga 6 folhas";
  if (ehPma5f(projeto)) return "Mão Amiga 5 folhas";
  if (ehPma4f(projeto)) return "Mão Amiga 4 folhas";
  if (ehPma3f(projeto)) return "Mão Amiga 3 folhas";
  if (ehPma2f(projeto)) return "Mão Amiga 2 folhas";
  if (ehBoxCanto3f(projeto)) return "Box de canto 3 folhas";
  if (ehBoxCanto(projeto)) return "Box de canto";
  if (ehBox2Fls(projeto)) return "Box 2 folhas";
  if (ehDeslizante2f(projeto)) return "Deslizante 2 folhas";
  if (ehDeslizante3f(projeto)) return "Deslizante 3 folhas";
  if (ehDeslizante4f(projeto)) return "Deslizante 4 folhas";
  if (ehDeslizante5f(projeto)) return "Deslizante 5 folhas";
  if (ehDeslizante6f(projeto)) return "Deslizante 6 folhas";
  if (ehJc4fComSacada(projeto)) return "Janela de correr 4 folhas com sacada inferior";
  if (ehJc2fComSacada(projeto)) return "Janela de correr 2 folhas com sacada inferior";
  if (ehSacadaFrontal(projeto)) return "Sacada frontal";
  if (ehSacadaGrapa(projeto)) return "Sacada Grapa";
  if (ehFechamentoSacada(projeto)) return "Fechamento de sacada";
  if (ehPeleDeVidro(projeto)) return "Pele de vidro";
  if (ehEspelhoComDesenho(projeto)) return "Espelho";
  if (ehPc4fComBandeira(projeto)) return "Porta de correr 4 folhas com bandeira";
  if (ehPc2fComBandeira(projeto)) return "Porta de correr 2 folhas com bandeira";
  return projeto || "Projeto";
};

const totalQuadrosPeleDeVidro = (item?: Pick<ProjetoComposicao, "pecasDivisao" | "puxador" | "tamanhoPuxador">) => {
  return Math.max(1, Number(item?.pecasDivisao || 1));
};

const totalQuadrosPeleDeVidroComVaos = (item?: Pick<ProjetoComposicao, "quantidade" | "pecasDivisao" | "puxador" | "tamanhoPuxador">) => {
  return Math.max(1, Number(item?.quantidade || 1)) * totalQuadrosPeleDeVidro(item);
};

const medidasDetalhadasPeleDeVidro = (item: Pick<ProjetoComposicao, "largura" | "altura" | "trilho" | "trinco" | "puxador" | "tamanhoPuxador" | "pecasDivisao" | "medidasDetalhadas">) => {
  const medidaSalva = String(item.medidasDetalhadas || "").match(/Quadro:\s*([^\n]+)/i)?.[1];
  const larguraQuadro = numeroCampoFechamento(item.trilho, 0) > 0 ? Math.round(Number(item.largura || 0) / numeroCampoFechamento(item.trilho, 1)) : 0;
  const alturaQuadro = numeroCampoFechamento(item.trinco, 0) > 0 ? Math.round(Number(item.altura || 0) / numeroCampoFechamento(item.trinco, 1)) : 0;
  const medida = medidaSalva || `${larguraQuadro.toLocaleString("pt-BR")} x ${alturaQuadro.toLocaleString("pt-BR")} mm`;
  return `Quadro: ${medida}\nTotal de quadros: ${totalQuadrosPeleDeVidro(item)}\nFixos: ${numeroCampoFechamento(item.puxador, 0)} | Móveis: ${numeroCampoFechamento(item.tamanhoPuxador, 0)}`;
};

const multiplicadorPecasProjeto = (projeto?: string, item?: Pick<ProjetoComposicao, "pecasDivisao" | "puxador" | "tamanhoPuxador" | "trinco">) => {
  const texto = String(projeto || "").toLowerCase();
  const variacao = String(item?.trinco || "").toLowerCase();
  if (texto.includes("vidros avulsos") || texto.includes("espelhos avulsos")) return Math.max(1, Number(item?.pecasDivisao || 1));
  if (texto.includes("pele de vidro")) {
    return totalQuadrosPeleDeVidro(item);
  }
  if (texto.includes("sacada frontal") || texto.includes("sacada grapa") || texto.includes("sacada com grapa") || texto.includes("fechamento de sacada")) {
    return Math.max(1, Number(item?.pecasDivisao || 1));
  }
  if (texto === "max" || texto.includes("max")) return variacao.includes("único") || variacao.includes("unico") ? 1 : 2;
  if (texto.includes("pg2fva") || texto.includes("pgf") || texto.includes("porta de giro com fixo lateral")) return 2;
  if (texto.includes("fixos") || texto.includes("fixo")) {
    return normalizarDivisaoFixos(item?.pecasDivisao || item?.tamanhoPuxador);
  }
  if (texto.includes("pma2f") || texto.includes("mao amiga 2") || texto.includes("mão amiga 2")) return 2;
  if (texto.includes("pma3f") || texto.includes("mao amiga 3") || texto.includes("mão amiga 3")) return 3;
  if (texto.includes("pma4f") || texto.includes("mao amiga 4") || texto.includes("mão amiga 4")) return 4;
  if (texto.includes("pma5f") || texto.includes("mao amiga 5") || texto.includes("mão amiga 5")) return 5;
  if (texto.includes("pma6f") || texto.includes("mao amiga 6") || texto.includes("mão amiga 6")) return 6;
  if (texto.includes("pma2f4m") || texto.includes("2 fixas + 4") || texto.includes("2 fixas e 4")) return 6;
  if (texto.includes("boxcanto3f") || texto.includes("box de canto 3")) return 3;
  if (texto.includes("boxcanto") || texto.includes("box de canto")) return 4;
  if (texto.includes("box2fls") || texto.includes("box 2 folhas")) return 2;
  if (texto.includes("deslizante2f") || texto.includes("deslizante 2")) return 2;
  if (texto.includes("deslizante3f") || texto.includes("deslizante 3")) return 3;
  if (texto.includes("deslizante4f") || texto.includes("deslizante 4")) return 4;
  if (texto.includes("deslizante5f") || texto.includes("deslizante 5")) return 5;
  if (texto.includes("deslizante6f") || texto.includes("deslizante 6")) return 6;
if (texto.includes("jc4fcbs") ||texto.includes("janela 4 folhas com peitoril e bandeira") ||texto.includes("janela de correr com bandeira e peitoril")) {
  return 12;}
  if (texto.includes("jc4fcs") || texto.includes("janela 4 folhas com sacada inferior") || texto.includes("janela de correr 4 folhas com sacada inferior")) return 6;
  if (texto.includes("jc2fcs") || texto.includes("janela 2 folhas com sacada inferior") || texto.includes("janela de correr 2 folhas com sacada inferior")) return 3;
  if (texto.includes("pc4fcb") || texto.includes("4 folhas com bandeira")) return 6;
  if (texto.includes("pc2fcb") || texto.includes("2 folhas com bandeira")) return 3;
  if (texto.includes("pg - 2") || texto.includes("porta de giro - 2")) return 2;
  if (texto.includes("jc4f") || texto.includes("janela de correr 4")) return 4;
  if (texto.includes("jc2f") || texto.includes("janela de correr 2")) return 2;
  if (texto.includes("pc4f") || texto.includes("porta de correr 4 folhas")) return 4;
  if (texto.includes("pc2f") || texto.includes("porta de correr 2 folhas")) return 2;
  if (texto.includes("pgf") || texto.includes("porta de giro com fixo lateral")) return 2;
  if (texto.includes("pfv2f") || texto.includes("2 folhas")) return 2;
  return 1;
};

const pecasPorVaoProjeto = (
  item: Pick<ProjetoComposicao, "projeto" | "pecasDivisao" | "tamanhoPuxador" | "origemRota" | "puxador" | "trinco">
) => {
  const projeto = normalizarTexto(item.projeto);
  const origemRota = normalizarTexto(item.origemRota);

  if (projeto.includes("fixo com bandeira") || origemRota.includes("fixo-bandeira")) {
    const divisao = Math.min(6, Math.max(1, Number(item.pecasDivisao || item.tamanhoPuxador || 1)));
    return divisao * 2;
  }

  return multiplicadorPecasProjeto(item.projeto, item);
};

const carregarLista = (): ProjetoComposicao[] => {
  try {
    const salvo = window.localStorage.getItem(CENTRAL_KEY);
    return salvo ? JSON.parse(salvo) as ProjetoComposicao[] : [];
  } catch {
    return [];
  }
};

const carregarMateriaisAvulsos = (): ProjetoIndividualMaterial[] => {
  try {
    const salvo = window.localStorage.getItem(CENTRAL_MATERIAIS_AVULSOS_KEY);
    return salvo ? JSON.parse(salvo) as ProjetoIndividualMaterial[] : [];
  } catch {
    return [];
  }
};

const limparRascunhosDosProjetos = () => {
  const ehRascunhoDeOrcamento = (chave: string) => {
    const chaveNormalizada = chave.toLowerCase();

    return (
      (chaveNormalizada.startsWith("glasscode:") &&
        (chaveNormalizada.includes(":rascunho") || chaveNormalizada.includes(":draft"))) ||
      (chaveNormalizada.startsWith("orcamento_") && chaveNormalizada.includes("_draft_"))
    );
  };

  const limparStorage = (storage: Storage) => {
    const chavesParaRemover = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter(
        (chave): chave is string =>
          typeof chave === "string" && ehRascunhoDeOrcamento(chave)
      );

    chavesParaRemover.forEach((chave) => storage.removeItem(chave));
  };

  limparStorage(window.localStorage);
  limparStorage(window.sessionStorage);
};

const extrairCodigoPerfil = (material: ProjetoIndividualMaterial) =>
  String(material.codigoPerfil || material.descricao.split(" - ")[0] || "").trim().toUpperCase();

const itemTemCortesDeBarra = (item: Pick<ProjetoComposicao, "materiais">) =>
  Boolean(
    item.materiais?.some(
      (material) =>
        String(material.unidade || "").toLowerCase().includes("barra") &&
        Array.isArray(material.cortes) &&
        material.cortes.length > 0
    )
  );

const itemParticipaOtimizacaoBarras = (item: Pick<ProjetoComposicao, "materiais">) =>
  itemTemCortesDeBarra(item);

const origemOtimizacaoItem = (
  item: Pick<ProjetoComposicao, "projeto">
): OtimizacaoPerfil["origem"] => {
  if (ehSacadaFrontal(item.projeto) || ehSacadaComTorre(item.projeto) || ehSacadaGrapa(item.projeto)) return "sacada-frontal";
  if (ehPeleDeVidro(item.projeto)) return "pele-de-vidro";
  if (ehFechamentoSacada(item.projeto)) return "fechamento-sacada";
  return "projetos";
};

const chaveOtimizacaoPerfil = (
  origem: OtimizacaoPerfil["origem"],
  codigo: string,
  descricao: string,
  comprimentoBarra: number
) => `${origem}|${codigo}|${String(descricao || codigo).toUpperCase()}|${comprimentoBarra}`;

const calcularValorPerfisOriginaisItem = (item: ProjetoComposicao) =>
  item.materiais?.reduce((total, material) => {
    if (!String(material.unidade || "").toLowerCase().includes("barra") || !Array.isArray(material.cortes) || material.cortes.length === 0) {
      return total;
    }
    return total + (Number(material.qtd || 0) * Number(material.valorUnitario || 0));
  }, 0) || 0;

const calcularAreaVidrosItem = (item: ProjetoComposicao) => {
  const areaMateriais = item.materiais?.reduce((total, material) => {
    const descricao = String(material.descricao || "").toLowerCase();
    const unidade = String(material.unidade || "").toLowerCase();
    if (!descricao.includes("vidro") && !unidade.includes("m2")) return total;
    return total + Number(material.qtd || 0);
  }, 0) || 0;

  if (areaMateriais > 0) return areaMateriais;

  return (Number(item.largura || 0) * Number(item.altura || 0) * numeroSeguro(item.quantidade)) / 1_000_000;
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

const otimizarCortes = (cortesOriginais: number[], comprimentoBarra: number) => {
  const cortes = cortesOriginais
    .flatMap((corte) => dividirCortePorBarra(corte, comprimentoBarra))
    .filter((corte) => corte > 0)
    .sort((a, b) => b - a);

  const barras: number[][] = [];

  cortes.forEach((corte) => {
    let melhorIndice = -1;
    let menorSobra = Number.POSITIVE_INFINITY;

    barras.forEach((barra, index) => {
      const usado = barra.reduce((soma, valor) => soma + valor, 0);
      const sobra = comprimentoBarra - usado - corte;
      if (sobra >= 0 && sobra < menorSobra) {
        melhorIndice = index;
        menorSobra = sobra;
      }
    });

    if (melhorIndice >= 0) {
      barras[melhorIndice].push(corte);
    } else {
      barras.push([corte]);
    }
  });

  return barras;
};

const calcularOtimizacaoPerfis = (itens: ProjetoComposicao[]): OtimizacaoPerfil[] => {
  const grupos = new Map<string, { codigo: string; descricao: string; comprimentoBarra: number; origem: OtimizacaoPerfil["origem"]; cortes: number[]; barrasOriginais: number; valorUnitario: number }>();

  itens.forEach((item) => {
    if (!itemParticipaOtimizacaoBarras(item)) return;

    const origem = origemOtimizacaoItem(item);

    item.materiais?.forEach((material) => {
      if (!String(material.unidade || "").toLowerCase().includes("barra") || !Array.isArray(material.cortes) || material.cortes.length === 0) {
        return;
      }

      const codigo = extrairCodigoPerfil(material);
      const descricao = String(material.descricao || codigo).toUpperCase();
      const comprimentoBarra = Number(material.comprimentoBarra || 6000);
      const chave = chaveOtimizacaoPerfil(origem, codigo, descricao, comprimentoBarra);
      const grupo = grupos.get(chave) || { codigo, descricao, comprimentoBarra, origem, cortes: [], barrasOriginais: 0, valorUnitario: Number(material.valorUnitario || 0) };

      grupo.cortes.push(...material.cortes.map((corte) => Number(corte || 0)));
      grupo.barrasOriginais += Number(material.qtd || 0);
      if (!grupo.valorUnitario && material.valorUnitario) grupo.valorUnitario = Number(material.valorUnitario || 0);
      grupos.set(chave, grupo);
    });
  });

  return Array.from(grupos.values())
    .map((grupo) => {
      const barras = otimizarCortes(grupo.cortes, grupo.comprimentoBarra);
      return {
        codigo: grupo.codigo,
        descricao: grupo.descricao,
        comprimentoBarra: grupo.comprimentoBarra,
        origem: grupo.origem,
        barras,
        totalCortes: grupo.cortes.length,
        barrasOriginais: grupo.barrasOriginais,
        valorUnitario: grupo.valorUnitario,
        valorOriginal: grupo.barrasOriginais * grupo.valorUnitario,
        valorOtimizado: barras.length * grupo.valorUnitario,
      };
    })
    .sort((a, b) => {
      const ordemA = ordemPerfilOtimizado(a);
      const ordemB = ordemPerfilOtimizado(b);
      return ordemA === ordemB ? a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }) : ordemA - ordemB;
    });
};

export default function CentralImpressaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { theme } = useTheme();
  const { user, nomeEmpresa, empresaId, loading, signOut } = useAuth();
  const [numeroOrcamento, setNumeroOrcamento] = useState("");
  const [cliente, setCliente] = useState("");
  const [obra, setObra] = useState("");
  const [itens, setItens] = useState<ProjetoComposicao[]>([]);
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [usarOtimizacao, setUsarOtimizacao] = useState(false);
  const [imprimirOtimizacao, setImprimirOtimizacao] = useState(false);
  const [modalVidroAberto, setModalVidroAberto] = useState(false);
  const [vidroOrigemOrcamento, setVidroOrigemOrcamento] = useState("");
  const [buscaVidroOrcamento, setBuscaVidroOrcamento] = useState("");
  const [vidroSelecionadoOrcamento, setVidroSelecionadoOrcamento] = useState<VidroCadastro | null>(null);
  const [vidros, setVidros] = useState<VidroCadastro[]>([]);
  const [clientes, setClientes] = useState<ClienteCadastro[]>([]);
  const [precosVidroGrupos, setPrecosVidroGrupos] = useState<PrecoVidroGrupo[]>([]);
  const [catalogoMateriais, setCatalogoMateriais] = useState<CatalogoMaterial[]>([]);
  const [materiaisAvulsos, setMateriaisAvulsos] = useState<ProjetoIndividualMaterial[]>([]);
  const [materialAvulsoForm, setMaterialAvulsoForm] = useState<MaterialAvulsoForm>({
    descricao: "",
    qtd: "1",
    unidade: "und",
    valorUnitario: "0,00",
  });
  const [buscaMaterialAvulso, setBuscaMaterialAvulso] = useState("");

  useEffect(() => {
    const carregarCadastros = async () => {
      if (!empresaId) return;

      const [
        { data: vidrosData, error: vidrosError },
        { data: clientesData, error: clientesError },
        { data: precosVidroData, error: precosVidroError },
        { data: perfisData, error: perfisError },
        { data: ferragensData, error: ferragensError },
        { data: kitsData, error: kitsError },
      ] = await Promise.all([
        supabase
          .from("vidros")
          .select("id, nome, espessura, tipo, preco")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),
        supabase
          .from("clientes")
          .select("id, nome, grupo_preco_id")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),
        supabase
          .from("vidro_precos_grupos")
          .select("vidro_id, grupo_preco_id, preco")
          .eq("empresa_id", empresaId),
        supabase
          .from("perfis")
          .select("id, codigo, nome, cores, categoria, preco")
          .eq("empresa_id", empresaId)
          .order("codigo", { ascending: true }),
        supabase
          .from("ferragens")
          .select("id, codigo, nome, cores, categoria, preco")
          .eq("empresa_id", empresaId)
          .order("codigo", { ascending: true }),
        supabase
          .from("kits")
          .select("id, codigo, nome, cores, categoria, preco")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),
      ]);

      if (vidrosError) {
        console.error("Erro ao carregar vidros:", vidrosError);
        setVidros([]);
      } else {
        setVidros((vidrosData || []) as VidroCadastro[]);
      }

      if (clientesError) {
        console.error("Erro ao carregar clientes:", clientesError);
        setClientes([]);
      } else {
        setClientes((clientesData || []) as ClienteCadastro[]);
      }

      if (precosVidroError) {
        console.error("Erro ao carregar preços por tabela:", precosVidroError);
        setPrecosVidroGrupos([]);
      } else {
        setPrecosVidroGrupos((precosVidroData || []) as PrecoVidroGrupo[]);
      }

      const catalogo: CatalogoMaterial[] = [];
      if (perfisError) {
        console.error("Erro ao carregar perfis para materiais avulsos:", perfisError);
      } else {
        catalogo.push(...((perfisData || []) as Omit<CatalogoMaterial, "tipo">[]).map((item) => ({ ...item, tipo: "perfil" as const })));
      }
      if (ferragensError) {
        console.error("Erro ao carregar ferragens para materiais avulsos:", ferragensError);
      } else {
        catalogo.push(...((ferragensData || []) as Omit<CatalogoMaterial, "tipo">[]).map((item) => ({ ...item, tipo: "ferragem" as const })));
      }
      if (kitsError) {
        console.error("Erro ao carregar kits para materiais avulsos:", kitsError);
      } else {
        catalogo.push(...((kitsData || []) as Omit<CatalogoMaterial, "tipo">[]).map((item) => ({ ...item, tipo: "kit" as const })));
      }
      setCatalogoMateriais(catalogo);
    };

    carregarCadastros();
  }, [empresaId]);

  useEffect(() => {
    const carregar = async () => {
      if (editId) {
        const idRascunho = window.localStorage.getItem(CENTRAL_ORCAMENTO_ID_KEY);
        const listaRascunho = carregarLista();

        if (idRascunho === editId && listaRascunho.length > 0) {
          setItens(listaRascunho);
          setMateriaisAvulsos(carregarMateriaisAvulsos());
          setNumeroOrcamento(window.localStorage.getItem(CENTRAL_NUMERO_KEY) || "Novo Orçamento");
          setCliente(window.localStorage.getItem(CENTRAL_CLIENTE_KEY) || listaRascunho[0]?.cliente || "");
          setObra(window.localStorage.getItem(CENTRAL_OBRA_KEY) || "");
          setUsarOtimizacao(window.localStorage.getItem(CENTRAL_USAR_OTIMIZACAO_KEY) === "1");
          setImprimirOtimizacao(window.localStorage.getItem(CENTRAL_IMPRIMIR_OTIMIZACAO_KEY) === "1");
          setRascunhoCarregado(true);
          return;
        }

        const { data, error } = await supabase
          .from("orcamentos")
          .select("*")
          .eq("id", editId)
          .maybeSingle();

        if (!error && data) {
          const itensSalvos = data.itens && !Array.isArray(data.itens) && typeof data.itens === "object" ? data.itens as { projetos?: ProjetoComposicao[]; materiaisAvulsos?: ProjetoIndividualMaterial[]; cliente?: string; obra?: string; otimizacaoPerfis?: OtimizacaoPerfil[]; resumo?: { otimizacaoAplicada?: boolean } }
            : null;

          setItens(Array.isArray(itensSalvos?.projetos) ? itensSalvos.projetos : []);
          setMateriaisAvulsos(Array.isArray(itensSalvos?.materiaisAvulsos) ? itensSalvos.materiaisAvulsos : []);
          setNumeroOrcamento(data.numero_formatado || "Novo Orçamento");
          setCliente(data.cliente_nome || itensSalvos?.cliente || "");
          setObra(data.obra_referencia || itensSalvos?.obra || "");
          setUsarOtimizacao(Boolean(itensSalvos?.resumo?.otimizacaoAplicada));
          setImprimirOtimizacao(Array.isArray(itensSalvos?.otimizacaoPerfis) && itensSalvos.otimizacaoPerfis.length > 0);
          window.localStorage.setItem(CENTRAL_ORCAMENTO_ID_KEY, editId);
          setRascunhoCarregado(true);
          return;
        }
      }

      const lista = carregarLista();
      setItens(lista);
      setMateriaisAvulsos(carregarMateriaisAvulsos());
      // Em uma composição nova, não reutiliza um número antigo salvo no
      // navegador. O efeito abaixo consulta o banco e prepara a sequência atual.
      setNumeroOrcamento("Novo Orçamento");
      setCliente(window.localStorage.getItem(CENTRAL_CLIENTE_KEY) || lista[0]?.cliente || "");
      setObra(window.localStorage.getItem(CENTRAL_OBRA_KEY) || "");
      setUsarOtimizacao(window.localStorage.getItem(CENTRAL_USAR_OTIMIZACAO_KEY) === "1");
      setImprimirOtimizacao(window.localStorage.getItem(CENTRAL_IMPRIMIR_OTIMIZACAO_KEY) === "1");
      setRascunhoCarregado(true);
    };

    carregar();
  }, [editId]);

  useEffect(() => {
    if (!rascunhoCarregado) return;
    window.localStorage.setItem(CENTRAL_KEY, JSON.stringify(itens));
    window.localStorage.setItem(CENTRAL_NUMERO_KEY, numeroOrcamento);
    window.localStorage.setItem(CENTRAL_CLIENTE_KEY, cliente);
    window.localStorage.setItem(CENTRAL_OBRA_KEY, obra);
    window.localStorage.setItem(CENTRAL_MATERIAIS_AVULSOS_KEY, JSON.stringify(materiaisAvulsos));
    window.localStorage.setItem(CENTRAL_USAR_OTIMIZACAO_KEY, usarOtimizacao ? "1" : "0");
    window.localStorage.setItem(CENTRAL_IMPRIMIR_OTIMIZACAO_KEY, imprimirOtimizacao ? "1" : "0");
    if (editId) {
      window.localStorage.setItem(CENTRAL_ORCAMENTO_ID_KEY, editId);
    }
  }, [cliente, editId, imprimirOtimizacao, itens, materiaisAvulsos, numeroOrcamento, obra, rascunhoCarregado, usarOtimizacao]);

  const otimizacaoPerfis = useMemo(() => calcularOtimizacaoPerfis(itens), [itens]);
  const otimizacaoAplicada = usarOtimizacao && otimizacaoPerfis.length > 0;
  const otimizacaoPerfisPdf = otimizacaoAplicada && imprimirOtimizacao ? otimizacaoPerfis : [];
  const vidrosFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaVidroOrcamento);
    if (!termo) return vidros.slice(0, 8);
    return vidros
      .filter((vidro) => normalizarTexto(formatarVidroCadastro(vidro)).includes(termo))
      .slice(0, 8);
  }, [buscaVidroOrcamento, vidros]);
  const vidrosOrigemOrcamento = useMemo<VidroOrigemOrcamento[]>(() => {
    const mapa = new Map<string, VidroOrigemOrcamento>();

    const adicionar = (descricao?: string | null) => {
      if (!descricaoVidroValidaParaTroca(descricao)) return;

      const texto = String(descricao || "");
      const descricaoLimpa = descricaoVidroAgrupadaParaTroca(texto, vidros);
      const chave = chaveVidroOrigem(texto, vidros);
      if (!chave) return;
      const vidroEncontrado = localizarVidroCatalogoNaDescricao(texto, vidros);

      const atual = mapa.get(chave);
      if (atual) {
        atual.ocorrencias += 1;
        return;
      }

      mapa.set(chave, {
        chave,
        descricao: descricaoLimpa,
        ocorrencias: 1,
        vidroId: vidroEncontrado?.vidro.id,
      });
    };

    itens.forEach((item) => {
      adicionar(item.vidro);
      adicionar(item.vidroPeitoril);
      adicionar(item.vidroJanela);
      adicionar(item.vidroBandeira);

      item.vidrosAvulsos?.forEach((vidro) => adicionar(vidro.vidro));
      item.materiais?.forEach((material) => {
        if (ehMaterialDeVidro(material)) adicionar(material.descricao);
      });
    });

    return Array.from(mapa.values()).sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR", { numeric: true }));
  }, [itens, vidros]);
  const clienteSelecionado = useMemo(
    () => clientes.find((item) => normalizarTexto(item.nome) === normalizarTexto(cliente)) || null,
    [cliente, clientes]
  );
  const precoVidroSelecionado = useMemo(() => {
    if (!vidroSelecionadoOrcamento) return 0;

    const precoGrupo = clienteSelecionado?.grupo_preco_id ? precosVidroGrupos.find(
        (preco) =>
          String(preco.vidro_id) === String(vidroSelecionadoOrcamento.id) &&
          String(preco.grupo_preco_id) === String(clienteSelecionado.grupo_preco_id)
      )
      : null;

    return normalizarPrecoCatalogo(precoGrupo?.preco ?? vidroSelecionadoOrcamento.preco ?? 0);
  }, [clienteSelecionado, precosVidroGrupos, vidroSelecionadoOrcamento]);

  const materiaisAvulsosValidos = useMemo(
    () => materiaisAvulsos.filter((material) => String(material.descricao || "").trim() && Number(material.qtd || 0) > 0),
    [materiaisAvulsos]
  );

  const totalMateriaisAvulsos = useMemo(
    () => materiaisAvulsosValidos.reduce((total, material) => total + Number(material.qtd || 0) * Number(material.valorUnitario || 0), 0),
    [materiaisAvulsosValidos]
  );

  const catalogoMateriaisFiltrado = useMemo(() => {
    const termo = normalizarTexto(buscaMaterialAvulso || materialAvulsoForm.descricao);
    if (!termo) return catalogoMateriais.slice(0, 10);
    return catalogoMateriais
      .filter((item) => normalizarTexto(labelCatalogoMaterial(item)).includes(termo))
      .slice(0, 10);
  }, [buscaMaterialAvulso, catalogoMateriais, materialAvulsoForm.descricao]);

  const totais = useMemo(() => {
    const base = itens.reduce(
      (acc, item) => {
        if (ehVidroAvulso(item.projeto)) {
          acc.pecasAvulsas += item.vidrosAvulsos?.reduce((total, vidro) => total + Number(vidro.quantidade || 0), 0) || Number(item.pecasDivisao || 0);
        } else {
          const quantidadeItem = numeroSeguro(item.quantidade);
          acc.projetos += quantidadeItem;
          acc.pecasVaos += quantidadeItem * pecasPorVaoProjeto(item);
        }
        acc.area += calcularAreaVidrosItem(item);
        acc.valorOriginal += Number(item.valorTotal || 0);
        return acc;
      },
      { projetos: 0, pecasVaos: 0, pecasAvulsas: 0, area: 0, valorOriginal: 0 }
    );

    const valorPerfisOriginais = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOriginal || 0), 0);
    const valorPerfisOtimizados = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOtimizado || 0), 0);
    const economiaPerfis = Math.max(0, valorPerfisOriginais - valorPerfisOtimizados);
    const valorProjetos = otimizacaoAplicada ? base.valorOriginal - valorPerfisOriginais + valorPerfisOtimizados
      : base.valorOriginal;
    const valor = valorProjetos + totalMateriaisAvulsos;

    return {
      ...base,
      pecas: base.pecasVaos + base.pecasAvulsas,
      valor,
      valorPerfisOriginais,
      valorPerfisOtimizados,
      economiaPerfis,
      otimizacaoAplicada,
    };
  }, [itens, otimizacaoAplicada, otimizacaoPerfis, totalMateriaisAvulsos]);

  const valoresRateadosPorItem = useMemo(() => {
    const mapa = new Map<string, number>();

    if (!otimizacaoAplicada || otimizacaoPerfis.length === 0) {
      itens.forEach((item) => mapa.set(item.id, Number(item.valorTotal || 0)));
      return mapa;
    }

    const gruposOtimizados = new Map<string, OtimizacaoPerfil>();
    otimizacaoPerfis.forEach((perfil) => {
      gruposOtimizados.set(
        chaveOtimizacaoPerfil(perfil.origem, perfil.codigo, perfil.descricao, perfil.comprimentoBarra),
        perfil
      );
    });

    const consumoPorGrupo = new Map<
      string,
      {
        totalComprimento: number;
        totalOriginal: number;
        itens: Map<string, { comprimento: number; valorOriginal: number }>;
      }
    >();
    const valorPerfilOriginalPorItem = new Map<string, number>();

    itens.forEach((item) => {
      if (!itemParticipaOtimizacaoBarras(item)) return;

      const origem = origemOtimizacaoItem(item);

      item.materiais?.forEach((material) => {
        if (!String(material.unidade || "").toLowerCase().includes("barra") || !Array.isArray(material.cortes) || material.cortes.length === 0) {
          return;
        }

        const codigo = extrairCodigoPerfil(material);
        const descricao = String(material.descricao || codigo).toUpperCase();
        const comprimentoBarra = Number(material.comprimentoBarra || 6000);
        const chave = chaveOtimizacaoPerfil(origem, codigo, descricao, comprimentoBarra);

        if (!gruposOtimizados.has(chave)) return;

        const comprimentoItem = material.cortes.reduce((total, corte) => total + Math.max(0, Number(corte || 0)), 0);
        const valorOriginalItem = Number(material.qtd || 0) * Number(material.valorUnitario || 0);
        const grupo = consumoPorGrupo.get(chave) || { totalComprimento: 0, totalOriginal: 0, itens: new Map<string, { comprimento: number; valorOriginal: number }>() };
        const atualItem = grupo.itens.get(item.id) || { comprimento: 0, valorOriginal: 0 };

        atualItem.comprimento += comprimentoItem;
        atualItem.valorOriginal += valorOriginalItem;
        grupo.totalComprimento += comprimentoItem;
        grupo.totalOriginal += valorOriginalItem;
        grupo.itens.set(item.id, atualItem);
        consumoPorGrupo.set(chave, grupo);
        valorPerfilOriginalPorItem.set(item.id, (valorPerfilOriginalPorItem.get(item.id) || 0) + valorOriginalItem);
      });
    });

    const valorPerfilOtimizadoPorItem = new Map<string, number>();

    consumoPorGrupo.forEach((grupo, chave) => {
      const perfilOtimizado = gruposOtimizados.get(chave);
      if (!perfilOtimizado) return;

      grupo.itens.forEach((consumo, itemId) => {
        const baseRateio = grupo.totalComprimento > 0
          ? consumo.comprimento / grupo.totalComprimento
          : grupo.totalOriginal > 0
            ? consumo.valorOriginal / grupo.totalOriginal
            : 0;

        valorPerfilOtimizadoPorItem.set(
          itemId,
          (valorPerfilOtimizadoPorItem.get(itemId) || 0) + (Number(perfilOtimizado.valorOtimizado || 0) * baseRateio)
        );
      });
    });

    itens.forEach((item) => {
      const valorOriginal = Number(item.valorTotal || 0);
      if (!itemParticipaOtimizacaoBarras(item)) {
        mapa.set(item.id, valorOriginal);
        return;
      }

      const valorPerfilOriginal = valorPerfilOriginalPorItem.get(item.id) || calcularValorPerfisOriginaisItem(item);
      const valorPerfilOtimizado = valorPerfilOtimizadoPorItem.get(item.id);

      if (valorPerfilOtimizado === undefined) {
        mapa.set(item.id, valorOriginal);
        return;
      }

      mapa.set(item.id, Math.max(0, valorOriginal - valorPerfilOriginal + valorPerfilOtimizado));
    });

    return mapa;
  }, [itens, otimizacaoAplicada, otimizacaoPerfis]);

  const itensPdf = useMemo<CentralImpressaoItem[]>(
    () => {
      const projetos = itens.map((item) => ({
      id: item.id,
      numero: item.numero,
      projeto: nomeProjetoVisivel(item.projeto),
      cliente: cliente || item.cliente,
      medidas: temLarguraComposta(item.medidas) ? item.medidas
        : Number(item.largura || 0) > 0 || Number(item.altura || 0) > 0 ? `${Number(item.largura || 0)} x ${Number(item.altura || 0)} mm`
        : item.medidas,
      largura: Number(item.largura || 0),
      altura: Number(item.altura || 0),
      alturaInicial: item.alturaInicial,
      alturaFinal: item.alturaFinal,
      quantidade: /fora de esquadro/i.test(item.projeto || "") ? numeroSeguro(item.quantidade)
        : ehVidroAvulso(item.projeto) ? calcularResumoVidrosAvulsos(item).pecas
          : numeroSeguro(item.quantidade),
      modo: ehVidroAvulso(item.projeto) || ehSacadaGrapa(item.projeto) ? "" : item.modo,
      desenhoUrl: item.desenhoUrl || (ehProjetoTecnico(item.projeto) ? desenhoTecnicoUrl(item.projeto, item) : desenhoTecnicoUrl(item.projeto, item)),
      vidro: ehSacadaFrontal(item.projeto) ? descricaoVidroItem(item) : item.vidro,
      vidroBandeira: item.vidroBandeira,
      corKit: item.corPerfil || item.corKit,
      alturaAteTubo: item.alturaAteTubo,
      tuboPerfil: item.tuboPerfil,
      trilho: ehSacadaGrapa(item.projeto) ? "" : item.trilho,
      puxador: ehSacadaGrapa(item.projeto) ? "" : formatarPuxador(item.puxador, item.tamanhoPuxador),
      tamanhoPuxador: item.tamanhoPuxador,
      trinco: ehSacadaGrapa(item.projeto) ? "" : item.trinco,
      pecasDivisao: item.pecasDivisao || (ehFixos(item.projeto) ? Number(item.tamanhoPuxador || 1) : undefined),
      medidasDetalhadas: item.medidasDetalhadas,
      foraEsquadroPecas: item.foraEsquadroPecas,
      vidrosAvulsos: item.vidrosAvulsos,
      valorTotal: ehVidroAvulso(item.projeto) ? calcularResumoVidrosAvulsos(item).valor : valoresRateadosPorItem.get(item.id) ?? Number(item.valorTotal || 0),

      // Dados necessários para o PDF reproduzir exatamente o desenho do Pinázio.
      origemRota: item.origemRota,
      origemTipo: item.origemTipo,
      pinazioId: item.pinazioId,
      pinazioNome: item.pinazioNome,
      pinazioCor: item.pinazioCor,
      divisoesLargura: Number(item.divisoesLargura || 1),
      divisoesAltura: Number(item.divisoesAltura || 1),

      materiais: item.materiais,
    }));

      if (materiaisAvulsosValidos.length === 0) return projetos;

      return [
        ...projetos,
        {
          id: "materiais-avulsos",
          numero: numeroOrcamento || "Novo Orçamento",
          projeto: "Materiais avulsos",
          cliente,
          medidas: "",
          largura: 0,
          altura: 0,
          quantidade: 0,
          modo: "",
          desenhoUrl: "",
          valorTotal: totalMateriaisAvulsos,
          materiais: materiaisAvulsosValidos,
        },
      ];
    },
    [cliente, itens, materiaisAvulsosValidos, numeroOrcamento, totalMateriaisAvulsos, valoresRateadosPorItem]
  );

  const selecionarMaterialCatalogo = (item: CatalogoMaterial) => {
    setMaterialAvulsoForm({
      descricao: labelCatalogoMaterial(item),
      qtd: materialAvulsoForm.qtd || "1",
      unidade: unidadeSugeridaMaterial(item),
      valorUnitario: numeroDecimal(Number(item.preco || 0)),
    });
    setBuscaMaterialAvulso("");
  };

  const adicionarMaterialAvulso = () => {
    const descricao = materialAvulsoForm.descricao.trim();
    const qtd = parseNumero(materialAvulsoForm.qtd || "0");
    const valorUnitario = parseNumero(materialAvulsoForm.valorUnitario || "0");
    const unidade = materialAvulsoForm.unidade.trim() || "und";

    if (!descricao || qtd <= 0) {
      setMensagem("Informe a descrição e a quantidade do material avulso.");
      return;
    }

    setMateriaisAvulsos((lista) => [
      ...lista,
      {
        id: criarId(),
        qtd,
        unidade,
        descricao,
        valorUnitario,
        codigoPerfil: descricao.split(" - ")[0]?.trim() || undefined,
      },
    ]);
    setMaterialAvulsoForm({ descricao: "", qtd: "1", unidade: "und", valorUnitario: "0,00" });
    setBuscaMaterialAvulso("");
    setMensagem("");
  };

  const removerMaterialAvulso = (id: string) => {
    setMateriaisAvulsos((lista) => lista.filter((material) => material.id !== id));
  };

  const atualizarItem = <K extends keyof ProjetoComposicao>(id: string, campo: K, valor: ProjetoComposicao[K]) => {
    setItens((lista) =>
      lista.map((item) => {
        if (item.id !== id) return item;
        const atualizado = { ...item, [campo]: valor };
        if (campo === "largura" || campo === "altura") {
          atualizado.medidas = `${Number(atualizado.largura || 0)} x ${Number(atualizado.altura || 0)} mm`;
        }
        return atualizado;
      })
    );
  };

  const removerItem = (id: string) => {
    setItens((lista) => lista.filter((item) => item.id !== id));
  };

  const copiarItem = (item: ProjetoComposicao) => {
    const copia: ProjetoComposicao = {
      ...item,
      id: criarId(),
      numero: numeroOrcamento || item.numero,
      medidas: Number(item.largura || 0) > 0 || Number(item.altura || 0) > 0 ? `${Number(item.largura || 0)} x ${Number(item.altura || 0)} mm`
        : item.medidas,
      materiais: item.materiais?.map((material) => ({ ...material, id: criarId() })),
      vidrosAvulsos: item.vidrosAvulsos?.map((vidro) => ({ ...vidro, id: criarId() })),
    };
    const proximaLista = [...itens, copia];

    setItens(proximaLista);
    window.localStorage.setItem(CENTRAL_KEY, JSON.stringify(proximaLista));
    window.localStorage.setItem(CENTRAL_NUMERO_KEY, numeroOrcamento);
    window.localStorage.setItem(CENTRAL_CLIENTE_KEY, cliente);
    window.localStorage.setItem(CENTRAL_OBRA_KEY, obra);

    editarItem(copia);
  };

  const duplicarOrcamentoComVidro = () => {
    if (itens.length === 0) {
      setMensagem("Adicione pelo menos um projeto antes de duplicar com outro vidro.");
      return;
    }
    if (!vidroOrigemOrcamento) {
      setMensagem("Escolha qual vidro do orçamento deseja trocar.");
      return;
    }
    if (!vidroSelecionadoOrcamento) {
      setMensagem("Selecione um vidro cadastrado antes de criar a cópia.");
      return;
    }

    const novoVidro = formatarVidroCadastro(vidroSelecionadoOrcamento);
    const deveTrocarVidro = (descricao?: string | null) => {
      const texto = String(descricao || "");
      if (!descricaoVidroValidaParaTroca(texto)) return false;
      return chaveVidroOrigem(texto, vidros) === vidroOrigemOrcamento;
    };
    const valorVidroAvulsoAtualizado = (vidro: NonNullable<ProjetoComposicao["vidrosAvulsos"]>[number]) => {
      const { largura, altura } = extrairMedidaVidroAvulso(vidro.medida);
      const area = (largura * altura * Number(vidro.quantidade || 0)) / 1_000_000;
      return area * precoVidroSelecionado;
    };

    const itensNovoVidro = itens.map((item) => {
      const materiaisAtualizados = item.materiais?.map((material) => ({
        ...material,
        id: criarId(),
        descricao: ehMaterialDeVidro(material) && deveTrocarVidro(material.descricao) ? trocarVidroDescricaoMaterial(material.descricao, novoVidro)
          : material.descricao,
        valorUnitario: ehMaterialDeVidro(material) && deveTrocarVidro(material.descricao) ? precoVidroSelecionado
          : material.valorUnitario,
      }));
      const vidrosAvulsosAtualizados = item.vidrosAvulsos?.map((vidro) => {
        if (!deveTrocarVidro(vidro.vidro)) return { ...vidro, id: criarId() };

        return {
          ...vidro,
          id: criarId(),
          vidro: novoVidro,
          valorTotal: valorVidroAvulsoAtualizado(vidro),
        };
      });
      const valorTotalAtualizado = vidrosAvulsosAtualizados?.length
        ? vidrosAvulsosAtualizados.reduce((total, vidro) => total + Number(vidro.valorTotal || 0), 0)
        : materiaisAtualizados?.length ? somarMateriais(materiaisAtualizados) : Number(item.valorTotal || 0);

      return {
        ...item,
        id: criarId(),
        numero: "Novo Orçamento",
        vidro: deveTrocarVidro(item.vidro) ? novoVidro : item.vidro,
        vidroPeitoril: deveTrocarVidro(item.vidroPeitoril) ? novoVidro : item.vidroPeitoril,
        vidroJanela: deveTrocarVidro(item.vidroJanela) ? novoVidro : item.vidroJanela,
        vidroBandeira: deveTrocarVidro(item.vidroBandeira) ? novoVidro : item.vidroBandeira,
        materiais: materiaisAtualizados,
        vidrosAvulsos: vidrosAvulsosAtualizados,
        valorTotal: valorTotalAtualizado,
      };
    });

    setItens(itensNovoVidro);
    setNumeroOrcamento("Novo Orçamento");
    setMensagem(`Cópia do orçamento criada com vidro ${novoVidro}. Revise os valores e salve para gerar um novo número.`);
    setModalVidroAberto(false);
    setVidroOrigemOrcamento("");
    setBuscaVidroOrcamento("");
    setVidroSelecionadoOrcamento(null);
    setUsarOtimizacao(false);
    setImprimirOtimizacao(false);
    window.localStorage.setItem(CENTRAL_KEY, JSON.stringify(itensNovoVidro));
    window.localStorage.setItem(CENTRAL_NUMERO_KEY, "Novo Orçamento");
    window.localStorage.setItem(CENTRAL_CLIENTE_KEY, cliente);
    window.localStorage.setItem(CENTRAL_OBRA_KEY, obra);
    window.localStorage.removeItem(CENTRAL_ORCAMENTO_ID_KEY);

    if (editId) {
      router.push("/central-impressao");
    }
  };

  const editarItem = (item: ProjetoComposicao) => {
    const projetoTexto = item.projeto.toLowerCase();
    const rota = item.origemRota || (String(item.projeto || "").toLowerCase().includes("pg2fva") ? "/pg2fva" : ehPortaGiroFixo(item.projeto) ? "/pgf"
      : ehSacadaComTorre(item.projeto) ? "/calculo/sacadatorre"
      : ehSacadaGrapa(item.projeto) ? "/calculo/sacadagrapa"
      : ehSacadaFrontal(item.projeto) ? "/calculo/sacadafrontal"
      : ehFechamentoSacada(item.projeto) ? "/calculo/fechamentosacada"
      : ehPeleDeVidro(item.projeto) ? "/calculo/peledevidro"
      : ehMax?.(item.projeto) ? "/max"
      : ehJc4fcbs(item.projeto) ? "/jc4fcbs"
      : ehJc4fComSacada(item.projeto) ? "/jc4fcs"
      : ehJc2fComSacada(item.projeto) ? "/jc2fcs"
      : ehJc4fComBandeira(item.projeto) ? "/jc4fcb"
      : ehPc4fComBandeira(item.projeto) ? "/pc4fcb"
      : ehPc2fComBandeira(item.projeto) ? "/pc2fcb"
      : projetoTexto.includes("pc4f") || ehPortaCorrer4Folhas(item.projeto) ? "/pc4f-kit"
      : projetoTexto.includes("pc2f") || ehPortaCorrer2Folhas(item.projeto) ? "/pc2f-kit"
      : projetoTexto.includes("jc2f") || projetoTexto.includes("janela de correr 2") ? "/jc2f-kit"
      : projetoTexto.includes("jc4f") || projetoTexto.includes("janela de correr 4") ? "/jc4f-kit"
      : projetoTexto.includes("pg - 2") || projetoTexto.includes("porta de giro - 2") ? "/pg2f"
      : projetoTexto.includes("pg") || projetoTexto.includes("porta de giro") ? "/pg"
      : projetoTexto.includes("deslizante2f") || projetoTexto.includes("deslizante 2") ? "/deslizante2f"
      : projetoTexto.includes("deslizante3f") || projetoTexto.includes("deslizante 3") ? "/deslizante3f"
      : projetoTexto.includes("deslizante4f") || projetoTexto.includes("deslizante 4") ? "/deslizante4f"
      : projetoTexto.includes("deslizante5f") || projetoTexto.includes("deslizante 5") ? "/deslizante5f"
      : projetoTexto.includes("deslizante6f") || projetoTexto.includes("deslizante 6") ? "/deslizante6f"
      : projetoTexto.includes("2 folhas") || projetoTexto.includes("pfv2f") ? "/pfv2f-kit"
      : projetoTexto.includes("porta de correr") || projetoTexto.includes("pfv1f") ? "/pfv1f-kit"
      : projetoTexto.includes("fixos") || projetoTexto.includes("fixo") ? "/fixos"
      : projetoTexto.includes("pma2f") || projetoTexto.includes("mao amiga 2") || projetoTexto.includes("mão amiga 2") ? "/pma2f"
      : projetoTexto.includes("pma3f") || projetoTexto.includes("mao amiga 3") || projetoTexto.includes("mão amiga 3") ? "/pma3f"
      : projetoTexto.includes("pma4f") || projetoTexto.includes("mao amiga 4") || projetoTexto.includes("mão amiga 4") ? "/pma4f"
      : projetoTexto.includes("pma5f") || projetoTexto.includes("mao amiga 5") || projetoTexto.includes("mão amiga 5") ? "/pma5f"
      : projetoTexto.includes("pma6f") || projetoTexto.includes("mao amiga 6") || projetoTexto.includes("mão amiga 6") ? "/pma6f"
      : projetoTexto.includes("pma2f4m") || projetoTexto.includes("2 fixas + 4") || projetoTexto.includes("2 fixas e 4") ? "/pma2f4m"
      : projetoTexto.includes("box2fls") || projetoTexto.includes("box 2 folhas") ? "/box2fls"
      : projetoTexto.includes("boxcanto3f") || projetoTexto.includes("box de canto 3") ? "/boxcanto3f"
      : projetoTexto.includes("boxcanto") || projetoTexto.includes("box de canto") ? "/boxcanto"
        : "");
    if (!rota) {
      setMensagem("Este projeto ainda não tem uma tela de edição vinculada.");
      return;
    }

    const retorno = editId
  ? `/central-impressao?edit=${encodeURIComponent(editId)}`
  : "/central-impressao";

router.push(
  `${rota}?centralItem=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(retorno)}`
);
  };

  const editarLote = (item: ProjetoComposicao) => {
    if (!item.loteId) {
      editarItem(item);
      return;
    }

    const rota = item.origemRota || "/jc4f-kit";
    const retorno = editId ? `/central-impressao?edit=${encodeURIComponent(editId)}`
      : "/central-impressao";

    router.push(`${rota}?loteId=${encodeURIComponent(item.loteId)}&returnTo=${encodeURIComponent(retorno)}`);
  };

  const limparTudo = () => {
    setItens([]);
    setMateriaisAvulsos([]);
    setNumeroOrcamento("");
    setCliente("");
    setObra("");
    window.localStorage.removeItem(CENTRAL_KEY);
    window.localStorage.removeItem(CENTRAL_NUMERO_KEY);
    window.localStorage.removeItem(CENTRAL_CLIENTE_KEY);
    window.localStorage.removeItem(CENTRAL_OBRA_KEY);
    window.localStorage.removeItem(CENTRAL_ORCAMENTO_ID_KEY);
    window.localStorage.removeItem(CENTRAL_USAR_OTIMIZACAO_KEY);
    window.localStorage.removeItem(CENTRAL_IMPRIMIR_OTIMIZACAO_KEY);
    window.localStorage.removeItem(CENTRAL_MATERIAIS_AVULSOS_KEY);
    setUsarOtimizacao(false);
    setImprimirOtimizacao(false);
  };

  const gerarNumeroOrcamento = useCallback(async () => {
    return gerarNumeroOrcamentoPadrao(supabase);
  }, []);

  useEffect(() => {
    if (!rascunhoCarregado || editId || !empresaId) return;
    if (numeroOrcamento && numeroOrcamento !== "Novo Orçamento") return;

    let ativo = true;

    gerarNumeroOrcamento()
      .then((numero) => {
        if (ativo) setNumeroOrcamento(numero);
      })
      .catch((erro) => {
        console.warn("Não foi possível preparar o número do orçamento:", erro);
      });

    return () => {
      ativo = false;
    };
  }, [editId, empresaId, gerarNumeroOrcamento, numeroOrcamento, rascunhoCarregado]);

  const salvarOrcamento = async () => {
    if (!empresaId) {
      setMensagem("Empresa não encontrada para salvar o Orçamento.");
      return;
    }
    if (itens.length === 0 && materiaisAvulsosValidos.length === 0) {
      setMensagem("Adicione pelo menos um projeto ou material avulso antes de salvar.");
      return;
    }

    try {
      setSalvando(true);
      setMensagem("");
      let numeroFinal = editId && numeroOrcamento && numeroOrcamento !== "Novo Orçamento" ? numeroOrcamento
        : await gerarNumeroOrcamento();

      const montarPayload = (numero: string) => ({
        numero_formatado: numero,
        cliente_nome: cliente || "Consumidor",
        obra_referencia: obra || "Projetos",
        itens: {
          tipo: "orcamento_projetos",
          cliente,
          obra,
          projetos: itens,
          // Mantém uma cópia já normalizada para que o histórico reproduza
          // exatamente o mesmo documento emitido pela Central de Impressão.
          projetosPdf: itensPdf.filter((item) => !/materiais avulsos/i.test(item.projeto || "")),
          materiaisAvulsos: materiaisAvulsosValidos,
          projetosOtimizados: otimizacaoAplicada
            ? itensPdf.filter((item) => !/materiais avulsos/i.test(item.projeto || ""))
            : undefined,
          resumo: totais,
          otimizacaoPerfis: otimizacaoAplicada ? otimizacaoPerfis : [],
          imprimirOtimizacao,
        },
        valor_total: Number(totais.valor || 0),
        metragem_total: 0,
        peso_total: 0,
        empresa_id: empresaId,
        theme_color: theme.menuIconColor || "#07385a",
      });

      let payload = montarPayload(numeroFinal);

      let { error } = editId ? await supabase.from("orcamentos").update(payload).eq("id", editId)
        : await supabase.from("orcamentos").insert([payload]);

      // Em um orçamento novo, uma sequência antiga pode ter ficado salva no
      // navegador ou dois usuários podem salvar ao mesmo tempo. Nessa situação,
      // consulta novamente o banco e repete uma vez com o próximo número livre.
      if (!editId && error?.code === "23505") {
        numeroFinal = await gerarNumeroOrcamento();
        payload = montarPayload(numeroFinal);
        const novaTentativa = await supabase.from("orcamentos").insert([payload]);
        error = novaTentativa.error;
      }

      if (error) throw error;

      // O orçamento já foi confirmado no banco. A composição temporária pode
      // ser encerrada para que o próximo orçamento comece totalmente vazio.
      limparRascunhosDosProjetos();
      limparTudo();
      setMensagem(`Orçamento ${numeroFinal} salvo com sucesso.`);
     router.push(`/admin/relatorio.orcamento?filtro=${encodeURIComponent(numeroFinal)}`);
    } catch (erro) {
      const erroSupabase = (typeof erro === "object" && erro !== null ? erro : {}) as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      const texto = erroSupabase.message || (erro instanceof Error ? erro.message : "Erro desconhecido");
      const detalhes = [erroSupabase.details, erroSupabase.hint, erroSupabase.code].filter(Boolean).join(" | ");

      console.error("Erro ao salvar composição do orçamento:", {
        message: texto,
        details: erroSupabase.details || null,
        hint: erroSupabase.hint || null,
        code: erroSupabase.code || null,
      });
      setMensagem(`Não foi possível salvar o Orçamento. ${texto}${detalhes ? ` (${detalhes})` : ""}`);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4"
          style={{
            borderTopColor: "transparent",
            borderRightColor: theme.menuBackgroundColor,
            borderBottomColor: theme.menuBackgroundColor,
            borderLeftColor: theme.menuBackgroundColor,
          }}
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <div className="flex w-full min-w-0 flex-col">
        <Header nomeEmpresa={nomeEmpresa} usuarioEmail={user.email || ""} handleSignOut={signOut} />

        <main className="min-w-0 flex-1 p-4 md:p-8 xl:p-10">
          <section
            className="rounded-4xl border bg-white p-6 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.32)] md:p-8"
            style={{ borderColor: `${theme.menuBackgroundColor}1A` }}
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: theme.menuBackgroundColor }}>
                  Composição do Orçamento
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl" style={{ color: theme.contentTextLightBg }}>
                  Projetos da mesma obra
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 opacity-70" style={{ color: theme.contentTextLightBg }}>
                  Cada projeto enviado pelos cálculos entra aqui como um item do mesmo cliente, pronto para revisar, imprimir e depois salvar como Orçamento único.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-[repeat(5,minmax(92px,1fr))_minmax(190px,1.55fr)]">
                <ResumoCard icon={<Layers3 size={22} />} label="Vãos" value={String(totais.projetos)} />
                <ResumoCard icon={<Plus size={22} />} label="Peças dos vãos" value={String(totais.pecasVaos)} />
                <ResumoCard icon={<Plus size={22} />} label="Peças avulsas" value={String(totais.pecasAvulsas)} />
                <ResumoCard icon={<Plus size={22} />} label="Total peças" value={String(totais.pecas)} />
                <ResumoCard icon={<Layers3 size={22} />} label="m² total" value={`${numeroDecimal(totais.area)} m²`} />
                <ResumoCard icon={<FileDown size={22} />} label="Total" value={moeda(totais.valor)} strong />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm" style={{ borderColor: `${theme.menuBackgroundColor}18` }}>
            <div className="grid gap-4 xl:grid-cols-[0.75fr_1fr_1fr_auto] xl:items-end">
              <Field label="Nº Orçamento">
                <input
                  value={numeroOrcamento}
                  onChange={(e) => setNumeroOrcamento(e.target.value)}
                  placeholder="Novo Orçamento"
                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                />
              </Field>
              <Field label="Cliente">
                <input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Cliente do Orçamento"
                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                />
              </Field>
              <Field label="Obra / referência">
                <input
                  value={obra}
                  onChange={(e) => setObra(e.target.value)}
                  placeholder="Ex.:: Obra Centro"
                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                {itensPdf.length > 0 ? (
                  <>
                    <PDFDownloadLink
                      document={<CentralImpressaoPDF itens={itensPdf} nomeEmpresa={nomeEmpresa} logoUrl={theme.logoLightUrl || theme.logoUrl || theme.logoDarkUrl} numeroOrcamento={numeroOrcamento} cliente={cliente} obra={obra} otimizacaoPerfis={otimizacaoPerfisPdf} />}
                      fileName={`${sanitizarNomeArquivo(`Orçamento N ${numeroOrcamento || "Novo"} _ ${cliente || "Consumidor"}`)}.pdf`}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                      style={{ backgroundColor: theme.menuBackgroundColor }}
                    >
                      {({ loading: gerando }) => (
                        <>
                          <FileDown size={16} />
                          {gerando ? "Gerando..." : "Gerar PDF"}
                        </>
                      )}
                    </PDFDownloadLink>
                    <PDFDownloadLink
                      document={<CentralImpressaoPDF itens={itensPdf} nomeEmpresa={nomeEmpresa} logoUrl={theme.logoLightUrl || theme.logoUrl || theme.logoDarkUrl} numeroOrcamento={numeroOrcamento} cliente={cliente} obra={obra} otimizacaoPerfis={otimizacaoPerfis} somenteRelacaoObra />}
                      fileName={`${sanitizarNomeArquivo(`Relação da obra N ${numeroOrcamento || "Novo"} _ ${cliente || "Consumidor"}`)}.pdf`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      {({ loading: gerando }) => (
                        <>
                          <FileDown size={16} />
                          {gerando ? "Gerando..." : "Relação da obra"}
                        </>
                      )}
                    </PDFDownloadLink>
                  </>
                ) : (
                  <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
                    <FileDown size={16} />
                    Gerar PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={salvarOrcamento}
                  disabled={salvando}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
                  title="Salvar esta composição como Orçamento único."
                >
                  <Save size={16} />
                  {salvando ? "Salvando..." : "Salvar Orçamento"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVidroOrigemOrcamento("");
                    setBuscaVidroOrcamento("");
                    setVidroSelecionadoOrcamento(null);
                    setModalVidroAberto(true);
                  }}
                  disabled={itens.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Criar uma nova versão deste orçamento com outra cor de vidro."
                >
                  <Palette size={16} />
                  Outro vidro
                </button>
                <button
                  type="button"
                  onClick={limparTudo}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <X size={16} />
                  Limpar
                </button>
              </div>
            </div>

            {mensagem ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{mensagem}</p>
            ) : null}

            <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#0f2742]">Materiais avulsos</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Inclua perfil, tubo, kit, ferragem ou qualquer item extra que não veio de um projeto.
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#0f2742]">Total: {moeda(totalMateriaisAvulsos)}</p>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[1.4fr_0.45fr_0.45fr_0.55fr_auto]">
                <div className="relative">
                  <Field label="Descrição / buscar cadastro">
                    <input
                      value={materialAvulsoForm.descricao}
                      onChange={(e) => {
                        setMaterialAvulsoForm((form) => ({ ...form, descricao: e.target.value }));
                        setBuscaMaterialAvulso(e.target.value);
                      }}
                      placeholder="Digite ou escolha um item cadastrado"
                      className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                    />
                  </Field>
                  {buscaMaterialAvulso.trim() ? (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      {catalogoMateriaisFiltrado.length > 0 ? (
                        catalogoMateriaisFiltrado.map((item) => (
                          <button
                            key={`${item.tipo}-${item.id}`}
                            type="button"
                            onClick={() => selecionarMaterialCatalogo(item)}
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                          >
                            <span className="font-semibold text-[#0f2742]">{labelCatalogoMaterial(item)}</span>
                            <span className="ml-2 text-xs text-slate-400">{item.tipo} · {moeda(Number(item.preco || 0))}</span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-slate-400">Nenhum cadastro encontrado. Pode seguir digitando manualmente.</p>
                      )}
                    </div>
                  ) : null}
                </div>
                <Field label="Qtd">
                  <input
                    value={materialAvulsoForm.qtd}
                    onChange={(e) => setMaterialAvulsoForm((form) => ({ ...form, qtd: e.target.value }))}
                    className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                  />
                </Field>
                <Field label="Unidade">
                  <select
                    value={materialAvulsoForm.unidade}
                    onChange={(e) => setMaterialAvulsoForm((form) => ({ ...form, unidade: e.target.value }))}
                    className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                  >
                    <option value="und">und</option>
                    <option value="barra">barra</option>
                    <option value="m">m</option>
                    <option value="m²">m²</option>
                    <option value="pacote">pacote</option>
                    <option value="rolo">rolo</option>
                  </select>
                </Field>
                <Field label="Valor unit.">
                  <input
                    value={materialAvulsoForm.valorUnitario}
                    onChange={(e) => setMaterialAvulsoForm((form) => ({ ...form, valorUnitario: e.target.value }))}
                    className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                  />
                </Field>
                <button
                  type="button"
                  onClick={adicionarMaterialAvulso}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                  style={{ backgroundColor: theme.menuBackgroundColor }}
                >
                  <Plus size={16} />
                  Adicionar
                </button>
              </div>

              {materiaisAvulsosValidos.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="grid grid-cols-[90px_1fr_110px_150px_52px] bg-slate-100 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    <div className="px-3 py-2 text-center">Qtd</div>
                    <div className="px-3 py-2">Descrição</div>
                    <div className="px-3 py-2">Unidade</div>
                    <div className="px-3 py-2 text-right">Total</div>
                    <div className="px-3 py-2" />
                  </div>
                  {materiaisAvulsosValidos.map((material) => (
                    <div key={material.id} className="grid grid-cols-[90px_1fr_110px_150px_52px] border-t border-slate-100 text-sm text-slate-700">
                      <div className="px-3 py-2 text-center">{formatarQuantidadeMaterialTela(material.qtd, material.unidade)}</div>
                      <div className="px-3 py-2">{material.descricao}</div>
                      <div className="px-3 py-2">{material.unidade}</div>
                      <div className="px-3 py-2 text-right font-semibold text-[#0f2742]">{moeda(Number(material.qtd || 0) * Number(material.valorUnitario || 0))}</div>
                      <div className="px-2 py-1 text-right">
                        <button
                          type="button"
                          onClick={() => removerMaterialAvulso(material.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                          title="Remover material avulso"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="mt-5 space-y-4">
              {itens.length > 0 ? (
                itens.map((item, index) => {
                  const vidroAvulso = ehVidroAvulso(item.projeto);
                  const espelhoComDesenho = ehEspelhoComDesenho(item.projeto);
                  const resumoAvulso = vidroAvulso ? calcularResumoVidrosAvulsos(item) : null;
                  const fechamentoSacada = ehFechamentoSacada(item.projeto);
                  const peleDeVidro = ehPeleDeVidro(item.projeto);
                  const pinazio = ehItemPinazio(item);
                  const projetoTecnico = ehProjetoTecnico(item.projeto);
                  const foraEsquadro = /fora de esquadro/i.test(item.projeto || "");
                  const janelaComPeitorilBandeira = ehJc4fcbs(item.projeto);
                  const desenhoCentral = item.desenhoUrl || (projetoTecnico ? desenhoTecnicoUrl(item.projeto, item) : desenhoTecnicoUrl(item.projeto, item));
                  const labelVidroPrincipal = espelhoComDesenho ? "Espelho" : ehFechamentoSacada(item.projeto) ? "Vidro inferior" : "Vidro";
                  const labelCampoPrincipal = ehPeleDeVidro(item.projeto) ? "Quadros"
                    : ehSacadaFrontal(item.projeto) || ehFechamentoSacada(item.projeto) ? "Divisões"
                    : ehBox2Fls(item.projeto) ? "Altura"
                    : ehPma(item.projeto) || ehDeslizante2f(item.projeto) || ehDeslizante3f(item.projeto) || ehDeslizante4f(item.projeto) || ehDeslizante5f(item.projeto) || ehDeslizante6f(item.projeto) ? "Projeto"
                    : ehPortaGiroFixo(item.projeto) ? "Fechadura"
                    : "Trilho";
                  const labelCampoSecundario = ehPeleDeVidro(item.projeto) ? "Lajes"
                    : ehSacadaFrontal(item.projeto) || ehFechamentoSacada(item.projeto) ? "Tipo"
                    : ehBox2Fls(item.projeto) ? "Modelo do kit"
                    : ehDeslizante2f(item.projeto) || ehDeslizante3f(item.projeto) || ehDeslizante4f(item.projeto) || ehDeslizante5f(item.projeto) || ehDeslizante6f(item.projeto) ? "Carrinho"
                    : ehPma(item.projeto) ? "Roldana"
                    : ehPortaGiroFixo(item.projeto) ? "Projeto"
                    : "Trinco";

                  if (janelaComPeitorilBandeira) {
                    return (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row">
                          <div className="flex h-56 shrink-0 items-center justify-center rounded-2xl bg-[#f7fafc] p-4 lg:w-72">
                            {desenhoCentral ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={desenhoCentral}
                                alt={item.projeto}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <div className="text-center">
                                <Layers3
                                  size={42}
                                  className="mx-auto text-slate-300"
                                />
                                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  Sem desenho
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                  Projeto {index + 1}
                                </p>
                                <h2 className="mt-1 text-xl font-normal text-[#0f2742]">
                                  Janela de correr com bandeira e peitoril
                                </h2>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copiarItem(item)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                                  title="Copiar e alterar medida"
                                >
                                  <Copy size={16} />
                                </button>

                                {item.loteId ? (
                                  <button
                                    type="button"
                                    onClick={() => editarLote(item)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                                    title="Editar lote"
                                  >
                                    <Layers3 size={16} />
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => editarItem(item)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                                  title="Editar projeto"
                                >
                                  <PencilLine size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removerItem(item.id)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                                  title="Remover projeto"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <Field label="Largura">
                                <input
                                  type="number"
                                  value={item.largura}
                                  onChange={(e) =>
                                    atualizarItem(
                                      item.id,
                                      "largura",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Altura peitoril">
                                <input
                                  type="number"
                                  value={Number(item.alturaPeitoril || 0)}
                                  onChange={(e) =>
                                    atualizarItem(
                                      item.id,
                                      "alturaPeitoril",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Altura janela">
                                <input
                                  type="number"
                                  value={Number(item.alturaJanela || 0)}
                                  onChange={(e) =>
                                    atualizarItem(
                                      item.id,
                                      "alturaJanela",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Altura total">
                                <input
                                  type="number"
                                  value={Number(item.alturaTotal || item.altura || 0)}
                                  onChange={(e) => {
                                    const valor = Number(e.target.value || 0);
                                    atualizarItem(item.id, "alturaTotal", valor);
                                    atualizarItem(item.id, "altura", valor);
                                  }}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Quantidade">
                                <input
                                  type="number"
                                  value={item.quantidade}
                                  onChange={(e) =>
                                    atualizarItem(
                                      item.id,
                                      "quantidade",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Modo">
                                <select
                                  value={item.modo || "Barra"}
                                  onChange={(e) =>
                                    atualizarItem(item.id, "modo", e.target.value)
                                  }
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                >
                                  <option>Kit</option>
                                  <option>Barra</option>
                                </select>
                              </Field>

                              <Field label="Cor do kit / perfil">
                                <input
                                  value={item.corPerfil || item.corKit || ""}
                                  onChange={(e) => {
                                    atualizarItem(
                                      item.id,
                                      "corPerfil",
                                      e.target.value
                                    );
                                    atualizarItem(
                                      item.id,
                                      "corKit",
                                      e.target.value
                                    );
                                  }}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Vidro peitoril">
                                <input
                                  value={item.vidroPeitoril || item.vidro || ""}
                                  onChange={(e) => {
                                    atualizarItem(
                                      item.id,
                                      "vidroPeitoril",
                                      e.target.value
                                    );
                                    atualizarItem(
                                      item.id,
                                      "vidro",
                                      e.target.value
                                    );
                                  }}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Vidro janela / bandeira">
                                <input
                                  value={
                                    item.vidroJanela ||
                                    item.vidroBandeira ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    atualizarItem(
                                      item.id,
                                      "vidroJanela",
                                      e.target.value
                                    );
                                    atualizarItem(
                                      item.id,
                                      "vidroBandeira",
                                      e.target.value
                                    );
                                  }}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Tubo">
                                <input
                                  value={item.tuboPerfil || item.tubo || ""}
                                  onChange={(e) => {
                                    atualizarItem(
                                      item.id,
                                      "tuboPerfil",
                                      e.target.value
                                    );
                                    atualizarItem(
                                      item.id,
                                      "tubo",
                                      e.target.value
                                    );
                                  }}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Trinco">
                                <input
                                  value={item.trinco || "Sem trinco"}
                                  onChange={(e) =>
                                    atualizarItem(
                                      item.id,
                                      "trinco",
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>

                              <Field label="Valor">
                                <input
                                  value={numeroDecimal(
                                    valoresRateadosPorItem.get(item.id) ??
                                      Number(item.valorTotal || 0)
                                  )}
                                  onChange={(e) =>
                                    atualizarItem(
                                      item.id,
                                      "valorTotal",
                                      parseNumero(e.target.value)
                                    )
                                  }
                                  readOnly={otimizacaoAplicada}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  }

                  return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <div className="flex h-56 shrink-0 items-center justify-center rounded-2xl bg-[#f7fafc] p-4 lg:w-72">
                        {foraEsquadro ? (
                          <ForaEsquadroPreview item={item} />
                        ) : espelhoComDesenho ? (
                          <EspelhoDesenhoPreview item={item} />
                        ) : desenhoCentral ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={desenhoCentral} alt={item.projeto} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="text-center">
                            <Layers3 size={42} className="mx-auto text-slate-300" />
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Sem desenho
                            </p>
                            <p className="mt-1 text-sm text-slate-500">Itens avulsos</p>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                              Projeto {index + 1}
                            </p>
                            <h2 className="mt-1 text-xl font-normal text-[#0f2742]">
                              {nomeProjetoVisivel(item.projeto)}
                            </h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copiarItem(item)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                              title="Copiar e alterar medida"
                            >
                              <Copy size={16} />
                            </button>
                            {item.loteId ? (
                              <button
                                type="button"
                                onClick={() => editarLote(item)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                                title="Editar lote"
                              >
                                <Layers3 size={16} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => editarItem(item)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                              title="Editar projeto"
                            >
                              <PencilLine size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removerItem(item.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                              title="Remover projeto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {!vidroAvulso ? (
                            <>
                              <Field label={fechamentoSacada || peleDeVidro ? "Largura do vão" : "Largura"}>
                                <input
                                  type="number"
                                  value={item.largura}
                                  onChange={(e) => atualizarItem(item.id, "largura", Number(e.target.value || 0))}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              {!fechamentoSacada ? (
                              <Field label={peleDeVidro ? "Altura do vão" : "Altura"}>
                                <input
                                  type="number"
                                  value={item.altura}
                                  onChange={(e) => atualizarItem(item.id, "altura", Number(e.target.value || 0))}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              ) : null}
                            </>
                          ) : null}
                          {!(fechamentoSacada || peleDeVidro) ? (
                            <Field label="Quantidade">
                              <input
                                type={vidroAvulso ? "text" : "number"}
                                value={vidroAvulso ? `${resumoAvulso?.pecas || 0} peça(s)` : item.quantidade}
                                onChange={(e) => !vidroAvulso && atualizarItem(item.id, "quantidade", Number(e.target.value || 0))}
                                readOnly={vidroAvulso}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {vidroAvulso ? (
                            <Field label="M² total">
                              <input
                                value={`${numeroDecimal(resumoAvulso?.area || 0)} m²`}
                                readOnly
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {vidroAvulso ? (
                            <Field label="Vidro">
                              <input
                                value={item.vidro || "Conforme relação"}
                                readOnly
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {peleDeVidro ? (
                            <>
                              <Field label="Qtd. de fachadas">
                                <input
                                  type="number"
                                  value={item.quantidade}
                                  onChange={(e) => atualizarItem(item.id, "quantidade", Number(e.target.value || 0))}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Quadros horizontal">
                                <input
                                  type="number"
                                  value={numeroCampoFechamento(item.trilho, 1)}
                                  onChange={(e) => atualizarItem(item.id, "trilho", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Quadros vertical">
                                <input
                                  type="number"
                                  value={numeroCampoFechamento(item.trinco, 1)}
                                  onChange={(e) => atualizarItem(item.id, "trinco", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Quantidade de lajes">
                                <input
                                  type="number"
                                  value={Number(item.alturaAteTubo || 0)}
                                  onChange={(e) => atualizarItem(item.id, "alturaAteTubo", Number(e.target.value || 0))}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Quadros fixos">
                                <input
                                  type="number"
                                  value={numeroCampoFechamento(item.puxador, 0)}
                                  onChange={(e) => atualizarItem(item.id, "puxador", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Quadros móveis">
                                <input
                                  type="number"
                                  value={numeroCampoFechamento(item.tamanhoPuxador, 0)}
                                  onChange={(e) => atualizarItem(item.id, "tamanhoPuxador", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Quantidade de quadros">
                                <input
                                  readOnly
                                  value={totalQuadrosPeleDeVidroComVaos(item)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Vidro da fachada">
                                <input
                                  value={descricaoVidroItem(item)}
                                  onChange={(e) => atualizarItem(item.id, "vidro", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                            </>
                          ) : null}
                          {fechamentoSacada ? (
                            <>
                              <Field label="Altura da sacada inferior">
                                <input
                                  type="number"
                                  value={item.alturaAteTubo || 0}
                                  onChange={(e) => atualizarItem(item.id, "alturaAteTubo", Number(e.target.value || 0))}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Altura da sacada superior">
                                <input
                                  type="number"
                                  value={alturaSuperiorFechamento(item)}
                                  onChange={(e) => atualizarItem(item.id, "tamanhoPuxador", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Quantidade de vão">
                                <input
                                  type="number"
                                  value={item.quantidade}
                                  onChange={(e) => atualizarItem(item.id, "quantidade", Number(e.target.value || 0))}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Divisão da parte de baixo">
                                <input
                                  type="number"
                                  value={numeroCampoFechamento(item.trilho, 1)}
                                  onChange={(e) => atualizarItem(item.id, "trilho", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Divisão da parte de cima">
                                <input
                                  type="number"
                                  value={numeroCampoFechamento(item.trinco, 1)}
                                  onChange={(e) => atualizarItem(item.id, "trinco", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Cor do perfil">
                                <input
                                  value={item.corPerfil || item.corKit || ""}
                                  onChange={(e) => atualizarItem(item.id, "corPerfil", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Vidro inferior">
                                <input
                                  value={item.vidro || ""}
                                  onChange={(e) => atualizarItem(item.id, "vidro", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                              <Field label="Vidro de cima">
                                <input
                                  value={item.vidroBandeira || ""}
                                  onChange={(e) => atualizarItem(item.id, "vidroBandeira", e.target.value)}
                                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                                />
                              </Field>
                            </>
                          ) : null}
                          {!(vidroAvulso || espelhoComDesenho || ehSacadaFrontal(item.projeto) || ehSacadaGrapa(item.projeto) || fechamentoSacada || peleDeVidro || pinazio) ? (
                            <Field label="Modo">
                              <select
                                value={item.modo}
                                onChange={(e) => atualizarItem(item.id, "modo", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              >
                                <option>Kit</option>
                                <option>Barra</option>
                              </select>
                            </Field>
                          ) : null}
                          {ehSacadaFrontal(item.projeto) ? (
                            <Field label="Peças por vão na largura">
                              <input
                                type="number"
                                value={Number(item.pecasDivisao || 1)}
                                onChange={(e) => atualizarItem(item.id, "pecasDivisao", Number(e.target.value || 1))}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {pinazio ? (
                            <Field label="Pinázio">
                              <input
                                value={formatarPinazioItem(item)}
                                readOnly
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : !(vidroAvulso || espelhoComDesenho || fechamentoSacada || peleDeVidro) ? (
                            <Field label={ehSacadaFrontal(item.projeto) ? "Cor do perfil" : "Cor do perfil / kit"}>
                              <input
                                value={item.corPerfil || item.corKit || ""}
                                onChange={(e) => atualizarItem(item.id, "corPerfil", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {!(vidroAvulso || fechamentoSacada || peleDeVidro) ? (
                            <Field label={ehSacadaFrontal(item.projeto) ? "Cor do vidro" : labelVidroPrincipal}>
                              <input
                                value={ehSacadaFrontal(item.projeto) ? descricaoVidroItem(item) : item.vidro || ""}
                                onChange={(e) => atualizarItem(item.id, "vidro", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {(!fechamentoSacada && (ehPc2fComBandeira(item.projeto) || ehPc4fComBandeira(item.projeto) || ehJc2fComSacada(item.projeto) || ehJc4fComSacada(item.projeto))) ? (
                            <Field label={ehFechamentoSacada(item.projeto) ? "Vidro superior" : ehJc2fComSacada(item.projeto) || ehJc4fComSacada(item.projeto) ? "Vidro sacada" : "Vidro bandeira"}>
                              <input
                                value={item.vidroBandeira || ""}
                                onChange={(e) => atualizarItem(item.id, "vidroBandeira", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {ehPc2fComBandeira(item.projeto) || ehPc4fComBandeira(item.projeto) || ehJc2fComSacada(item.projeto) || ehJc4fComSacada(item.projeto) ? (
                            <Field label={ehJc2fComSacada(item.projeto) || ehJc4fComSacada(item.projeto) ? "Altura da sacada" : "Altura até o tubo"}>
                              <input
                                value={item.alturaAteTubo || 0}
                                onChange={(e) => atualizarItem(item.id, "alturaAteTubo", Number(e.target.value || 0))}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {ehPc2fComBandeira(item.projeto) || ehPc4fComBandeira(item.projeto) || ehJc2fComSacada(item.projeto) || ehJc4fComSacada(item.projeto) ? (
                            <Field label="Tubo">
                              <input
                                value={item.tuboPerfil || ""}
                                onChange={(e) => atualizarItem(item.id, "tuboPerfil", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {ehPortaGiroFixo(item.projeto) ? (
                            <>
                              <Field label="Largura da porta de giro"><input readOnly value={`${item.alturaAteTubo || 0} mm`} className="w-full bg-transparent text-sm text-slate-700" /></Field>
                              <Field label="Largura do fixo"><input readOnly value={`${Math.max(0, Number(item.largura || 0) - Number(item.alturaAteTubo || 0))} mm`} className="w-full bg-transparent text-sm text-slate-700" /></Field>
                            </>
                          ) : null}
                          {ehFixos(item.projeto) ? (
                            <Field label="Divisão">
                              <input
                                value={`${normalizarDivisaoFixos(item.pecasDivisao || item.tamanhoPuxador)} peça(s)`}
                                readOnly
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {!(vidroAvulso || ehSacadaFrontal(item.projeto) || ehSacadaGrapa(item.projeto) || fechamentoSacada || peleDeVidro || ehFixos(item.projeto) || ehJanelaCorrer4Folhas(item.projeto) || ehJanelaCorrer2Folhas(item.projeto) || pinazio) ? (
                            <Field label={labelCampoPrincipal}>
                              <input
                                value={item.trilho || ""}
                                onChange={(e) => atualizarItem(item.id, "trilho", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {!(vidroAvulso || espelhoComDesenho || projetoTecnico || ehSacadaGrapa(item.projeto) || ehFixos(item.projeto) || ehJanelaCorrer4Folhas(item.projeto) || ehJanelaCorrer2Folhas(item.projeto) || pinazio) ? (
                            <Field label="Puxador">
                              <input
                                value={formatarPuxador(item.puxador, item.tamanhoPuxador)}
                                onChange={(e) => atualizarItem(item.id, "puxador", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {!(vidroAvulso || espelhoComDesenho || ehSacadaFrontal(item.projeto) || ehSacadaGrapa(item.projeto) || fechamentoSacada || peleDeVidro || ehFixos(item.projeto) || pinazio) ? (
                            <Field label={labelCampoSecundario}>
                              <input
                                value={item.trinco || ""}
                                onChange={(e) => atualizarItem(item.id, "trinco", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {ehPortaGiroFixo(item.projeto) ? (
                            <Field label="Ferragens">
                              <input
                                value={item.observacao || "Padrão"}
                                onChange={(e) => atualizarItem(item.id, "observacao", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          <Field label={vidroAvulso ? "Valor total" : espelhoComDesenho ? "Valor" : "Valor do projeto"}>
                            <input
                              value={numeroDecimal(vidroAvulso ? resumoAvulso?.valor || 0 : valoresRateadosPorItem.get(item.id) ?? Number(item.valorTotal || 0))}
                              onChange={(e) => atualizarItem(item.id, "valorTotal", parseNumero(e.target.value))}
                              readOnly={otimizacaoAplicada}
                              className={`w-full bg-transparent text-sm font-bold text-slate-700 outline-none ${otimizacaoAplicada ? "cursor-default" : ""}`}
                            />
                            {otimizacaoAplicada ? (
                              <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                                Valor com otimização rateada
                              </p>
                            ) : null}
                          </Field>
                          {item.vidrosAvulsos?.length ? (
                            <div className="md:col-span-2 xl:col-span-4">
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="grid grid-cols-[90px_1fr_1.6fr_130px] bg-slate-100 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-600">
                                  <div className="px-3 py-2 text-center">Peças</div>
                                  <div className="px-3 py-2">Medidas</div>
                                  <div className="px-3 py-2">Cor e espessura do vidro</div>
                                  <div className="px-3 py-2 text-right">Valor total</div>
                                </div>
                                {item.vidrosAvulsos.map((vidro) => (
                                  <div key={vidro.id} className="grid grid-cols-[90px_1fr_1.6fr_130px] border-t border-slate-100 text-sm text-slate-700">
                                    <div className="px-3 py-2 text-center">{Number(vidro.quantidade || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
                                    <div className="px-3 py-2">{vidro.medida}</div>
                                    <div className="px-3 py-2">{vidro.vidro}</div>
                                    <div className="px-3 py-2 text-right font-semibold text-[#0f2742]">{moeda(vidro.valorTotal)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (peleDeVidro || item.medidasDetalhadas) && !ehSacadaFrontal(item.projeto) && !espelhoComDesenho ? (
                            <div className="md:col-span-2 xl:col-span-4">
                              <Field label="Medidas dos vidros">
                                <textarea
                                  value={item.medidasDetalhadas}
                                  onChange={(e) => atualizarItem(item.id, "medidasDetalhadas", e.target.value)}
                                  rows={Math.min(6, Math.max(3, (item.medidasDetalhadas || "").split("\n").length))}
                                  className="w-full resize-none bg-transparent text-sm font-normal leading-6 text-slate-700 outline-none"
                                />
                              </Field>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-bold text-slate-600">Nenhum projeto na composição.</p>
                  <p className="mt-1 text-sm text-slate-500">Abra um cálculo de projeto e clique em PDF + para enviar o item para cá.</p>
                </div>
              )}
            </div>

            {itensPdf.length > 0 ? (
              <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3 2xl:grid-cols-[repeat(5,minmax(96px,1fr))_minmax(210px,1.6fr)]">
                <TotalResumo label="Quantidade de vão" value={String(totais.projetos)} />
                <TotalResumo label="Peças dos vãos" value={String(totais.pecasVaos)} />
                <TotalResumo label="Peças avulsas" value={String(totais.pecasAvulsas)} />
                <TotalResumo label="Total de peças" value={String(totais.pecas)} />
                <TotalResumo label="M² total" value={`${numeroDecimal(totais.area)} m²`} />
                <TotalResumo label="Valor total do Orçamento" value={moeda(totais.valor)} strong />
              </div>
            ) : null}

            {otimizacaoPerfis.length > 0 ? (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-[#0f2742]">Relação de materiais otimizada</h2>
                    <p className="text-sm text-slate-500">Cortes agrupados por perfil para aproveitamento em barras. Marque para aplicar a otimização no valor.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#0f2742] shadow-sm">
                      <input
                        type="checkbox"
                        checked={usarOtimizacao}
                        onChange={(event) => {
                          setUsarOtimizacao(event.target.checked);
                          if (!event.target.checked) setImprimirOtimizacao(false);
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Otimizar
                    </label>
                    <label className={`inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm ${usarOtimizacao ? "cursor-pointer text-[#0f2742]" : "cursor-not-allowed text-slate-400"}`}>
                      <input
                        type="checkbox"
                        checked={usarOtimizacao && imprimirOtimizacao}
                        onChange={(event) => setImprimirOtimizacao(event.target.checked)}
                        disabled={!usarOtimizacao}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Otimização no PDF
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <TotalResumo label="Barras sem otimização" value={String(otimizacaoPerfis.reduce((total, perfil) => total + perfil.barrasOriginais, 0))} />
                  <TotalResumo label="Barras otimizadas" value={String(otimizacaoPerfis.reduce((total, perfil) => total + perfil.barras.length, 0))} />
                  <TotalResumo label="Economia estimada" value={moeda(totais.economiaPerfis)} strong={otimizacaoAplicada} />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {otimizacaoPerfis.map((perfil, perfilIndex) => {
                    const descricaoPerfil = removerCodigoDuplicadoDescricao(perfil.codigo, perfil.descricao);
                    const chavePerfil = `${perfil.origem}-${perfil.codigo}-${perfil.descricao}-${perfil.comprimentoBarra}-${perfilIndex}`;

                    return (
                    <article key={chavePerfil} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{perfil.codigo}</p>
                          <h3 className="mt-1 text-sm font-black text-[#0f2742]">{descricaoPerfil}</h3>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {perfil.barrasOriginais} → {perfil.barras.length} barras
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Valor: {moeda(perfil.valorOriginal)} → {moeda(perfil.valorOtimizado)}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {perfil.barras.map((barra, index) => {
                          const usado = barra.reduce((soma, corte) => soma + corte, 0);
                          return (
                            <p key={`${chavePerfil}-barra-${index}`} className="text-xs font-semibold text-slate-600">
                              Barra {index + 1}: {barra.join(" + ")} = {usado} mm
                            </p>
                          );
                        })}
                      </div>
                    </article>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </section>
        </main>
      </div>

      {modalVidroAberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
          <section className="w-full max-w-2xl overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Nova versão
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Duplicar com outro vidro</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Escolha primeiro qual vidro do orçamento será substituído. A central criará uma nova cópia mantendo o restante igual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalVidroAberto(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                title="Fechar"
              >
                <X size={17} />
              </button>
            </div>

            <div className="px-5 py-4">
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Qual vidro deseja trocar</label>
              <div className="mt-2 space-y-2">
                {vidrosOrigemOrcamento.length > 0 ? (
                  vidrosOrigemOrcamento.map((vidro) => {
                    const selecionado = vidroOrigemOrcamento === vidro.chave;

                    return (
                      <button
                        key={vidro.chave}
                        type="button"
                        onClick={() => setVidroOrigemOrcamento(vidro.chave)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                          selecionado ? "border-slate-300 bg-white text-slate-900 shadow-sm" : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                        }`}
                      >
                        <span className="font-medium">{vidro.descricao}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                          {vidro.ocorrencias} ocorrência(s)
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-white px-3 py-3 text-sm text-slate-500">
                    Não encontrei vidros no orçamento atual para sugerir a troca.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Trocar pelo vidro cadastrado</label>
              <input
                value={buscaVidroOrcamento}
                onChange={(e) => {
                  setBuscaVidroOrcamento(e.target.value);
                  setVidroSelecionadoOrcamento(null);
                }}
                placeholder="Digite cor, tipo ou espessura"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300"
              />
              <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white">
                {vidrosFiltrados.length > 0 ? (
                  vidrosFiltrados.map((vidro) => {
                    const nomeVidro = formatarVidroCadastro(vidro);
                    const selecionado = vidroSelecionadoOrcamento?.id === vidro.id;

                    return (
                      <button
                        key={vidro.id}
                        type="button"
                        onClick={() => {
                          setVidroSelecionadoOrcamento(vidro);
                          setBuscaVidroOrcamento(nomeVidro);
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition ${
                          selecionado ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-medium">{nomeVidro}</span>
                        <span className={`text-xs ${selecionado ? "text-slate-500" : "text-slate-400"}`}>
                          {moeda(Number(vidro.preco || 0))}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-3 text-sm font-semibold text-slate-500">Nenhum vidro encontrado.</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalVidroAberto(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={duplicarOrcamentoComVidro}
                disabled={!vidroOrigemOrcamento || !vidroSelecionadoOrcamento}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: theme.menuBackgroundColor }}
              >
                Criar cópia
              </button>
            </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ResumoCard({ icon, label, value, strong = false }: { icon: React.ReactNode; label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white/80 shadow-sm ${strong ? "border-emerald-200 p-4" : "border-slate-200 p-3"}`}>
      <div className="flex items-center gap-3">
        <div className={`${strong ? "h-11 w-11 bg-emerald-50 text-emerald-700" : "h-9 w-9 bg-slate-100 text-[#07385a]"} flex items-center justify-center rounded-xl`}>{icon}</div>
        <div>
          <p className={`${strong ? "text-[11px]" : "text-[10px]"} font-medium uppercase tracking-[0.14em] text-slate-400`}>{label}</p>
          <p className={`mt-1 text-[#0f2742] ${strong ? "text-xl font-bold" : "text-base font-semibold"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function TotalResumo({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${strong ? "border-emerald-200 px-5 py-4" : "border-white px-3 py-3"}`}>
      <p className={`${strong ? "text-[11px]" : "text-[10px]"} font-black uppercase tracking-[0.14em] text-slate-400`}>{label}</p>
      <p className={`mt-1 text-[#0f2742] ${strong ? "text-2xl font-black" : "text-base font-normal"}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}
