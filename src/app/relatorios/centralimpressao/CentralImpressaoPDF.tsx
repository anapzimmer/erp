//app/(projetos)/central-impressao/page.tsx
"use client";

/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { Document, Ellipse, G, Image, Line, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
import MiniProjetoPinazioPDF from "@/components/desenhos/MiniProjetoPinazioPDF";

export type CentralImpressaoItem = {
  id: string;
  numero: string;
  projeto: string;
  cliente: string;
  medidas: string;
  largura?: number;
  altura?: number;
  quantidade: number;
  modo: string;
  desenhoUrl: string;
  vidro?: string;
  vidroBandeira?: string;
  corKit?: string;
  alturaAteTubo?: number;
  tuboPerfil?: string;
  trilho?: string;
  puxador?: string;
  tamanhoPuxador?: string;
  trinco?: string;
  observacao?: string;
  pecasDivisao?: number;
  medidasDetalhadas?: string;
  vidrosAvulsos?: Array<{
    id: string;
    quantidade: number;
    medida: string;
    vidro: string;
    valorTotal: number;
  }>;
  valorTotal?: number;
  origemRota?: string;
  origemTipo?: string;
  pinazioId?: string;
  pinazioNome?: string;
  pinazioCor?: "branco" | "preto" | "nogal";
  divisoesLargura?: number;
  divisoesAltura?: number;
  materiais?: ProjetoIndividualMaterial[];
};

export type CentralOtimizacaoPerfil = {
  codigo: string;
  descricao: string;
  comprimentoBarra: number;
  origem?: GrupoOrigemPerfil;
  barras: number[][];
  totalCortes: number;
  barrasOriginais?: number;
  valorUnitario?: number;
  valorOriginal?: number;
  valorOtimizado?: number;
};

type CentralImpressaoPDFProps = {
  itens: CentralImpressaoItem[];
  nomeEmpresa: string;
  logoUrl?: string | null;
  numeroOrcamento?: string;
  cliente?: string;
  obra?: string;
  otimizacaoPerfis?: CentralOtimizacaoPerfil[];
  somenteRelacaoObra?: boolean;
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0f2742",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe4ee",
    paddingBottom: 12,
    marginBottom: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 120, maxHeight: 42, objectFit: "contain", objectPosition: "left" },
  title: { fontSize: 15, fontWeight: "bold", color: "#0f2742" },
  subtitle: { fontSize: 8, color: "#64748b", marginTop: 3 },
  meta: { fontSize: 8, color: "#64748b", textAlign: "right" },
  topInfo: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  topInfoBox: { flex: 1 },
  topLabel: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  topValue: { fontSize: 9, color: "#0f2742", fontWeight: "bold" },
  list: { gap: 8 },
  card: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    gap: 9,
  },
  imageWrap: {
    width: 120,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 6,
  },
  image: { maxWidth: 112, maxHeight: 104, objectFit: "contain" },
  imagePlaceholderTitle: { fontSize: 9, color: "#0f2742", fontWeight: "bold", textAlign: "center" },
  imagePlaceholderText: { fontSize: 7, color: "#64748b", marginTop: 3, textAlign: "center" },
  infoArea: { flex: 1 },
  projectLabel: { fontSize: 7, color: "#00a85a", fontWeight: "bold", textTransform: "uppercase", marginBottom: 3 },
  projectName: { fontSize: 11, fontWeight: "normal", color: "#0f2742", marginBottom: 7 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  info: { width: "31.8%", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 4 },
  infoAvulso: { width: "23%", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 4 },
  infoWide: { width: "98%", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 4 },
  infoLabel: { fontSize: 6, color: "#64748b", textTransform: "uppercase" },
  infoValue: { fontSize: 8, color: "#0f2742", marginTop: 2, fontWeight: "normal" },
  infoMultiline: { fontSize: 7, color: "#0f2742", marginTop: 2, lineHeight: 1.35, fontWeight: "normal" },
  infoValueStrong: { fontSize: 8, color: "#0f2742", marginTop: 2, fontWeight: "bold" },
  vidroTable: {
    width: "98%",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 4,
  },
  vidroHeader: { flexDirection: "row", backgroundColor: "#07385a", color: "#ffffff" },
  vidroRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  vidroCellQtd: { width: "16%", padding: 4, fontSize: 7, textAlign: "center" },
  vidroCellMedida: { width: "24%", padding: 4, fontSize: 7 },
  vidroCellDesc: { width: "40%", padding: 4, fontSize: 7 },
  vidroCellTotal: { width: "20%", padding: 4, fontSize: 7, textAlign: "right" },
  totals: {
    flexDirection: "row",
    gap: 4,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 6,
    marginTop: 10,
    backgroundColor: "#f8fafc",
  },
  totalBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 5,
  },
  totalBoxStrong: {
    flex: 1.55,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  totalLabel: { fontSize: 5.4, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  totalValue: { fontSize: 8, color: "#0f2742", fontWeight: "normal" },
  totalValueStrong: { fontSize: 9.5, color: "#0f2742", fontWeight: "bold" },
  optSection: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 8,
  },
  optTitle: { fontSize: 10, fontWeight: "bold", color: "#0f2742", marginBottom: 6 },
  optCard: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 6, marginTop: 6 },
  optName: { fontSize: 8, color: "#0f2742", fontWeight: "bold" },
  optLine: { fontSize: 7, color: "#475569", marginTop: 3 },
  relationSection: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 8,
  },
  relationTitle: { fontSize: 10, fontWeight: "bold", color: "#0f2742", marginBottom: 6 },
  relationSubtitle: { fontSize: 8, fontWeight: "normal", color: "#0f2742", marginTop: 6, marginBottom: 4 },
  relationHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#e2e8f0",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  relationRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  relationTotalRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#cbd5e1", marginTop: 2 },
  relationCellQty: { width: "10%", padding: 4, fontSize: 7, textAlign: "center", color: "#0f2742" },
  relationCellDesc: { width: "48%", padding: 4, fontSize: 7, color: "#0f2742" },
  relationCellUnit: { width: "10%", padding: 4, fontSize: 7, textAlign: "center", color: "#0f2742" },
  relationCellUnitPrice: { width: "16%", padding: 4, fontSize: 7, textAlign: "right", color: "#0f2742" },
  relationCellValue: { width: "16%", padding: 4, fontSize: 7, textAlign: "right", color: "#0f2742" },
  relationGlassCellQty: { width: "9%", padding: 4, fontSize: 7, textAlign: "center", color: "#0f2742" },
  relationGlassCellMeasure: { width: "17%", padding: 4, fontSize: 7, color: "#0f2742" },
  relationGlassCellDesc: { width: "34%", padding: 4, fontSize: 7, color: "#0f2742" },
  relationGlassCellArea: { width: "10%", padding: 4, fontSize: 7, textAlign: "right", color: "#0f2742" },
  relationGlassCellUnitPrice: { width: "15%", padding: 4, fontSize: 7, textAlign: "right", color: "#0f2742" },
  relationGlassCellValue: { width: "15%", padding: 4, fontSize: 7, textAlign: "right", color: "#0f2742" },
  relationTotalLabel: { width: "84%", padding: 4, fontSize: 7, textAlign: "right", color: "#64748b", fontWeight: "bold" },
  relationTotalValue: { width: "16%", padding: 4, fontSize: 7, textAlign: "right", color: "#0f2742", fontWeight: "bold" },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 12,
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
  },
});

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const numero = (valor: number, casas = 2) =>
  Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const limparDescricaoVidroMaterial = (descricao: string) =>
  String(descricao || "")
    .replace(/^vidro\s*/i, "")
    .replace(/^\d+(?:[.,]\d+)x\s*x\s*\d+(?:[.,]\d+)x\s*/i, "")
    .replace(/^vidro\s*/i, "")
    .trim();

const descricaoVidroItem = (item: Pick<CentralImpressaoItem, "vidro" | "materiais">) => {
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

const calcularResumoVidrosAvulsos = (item: Pick<CentralImpressaoItem, "vidrosAvulsos" | "pecasDivisao" | "valorTotal" | "materiais">) => {
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

const ehSacadaFrontal = (projeto?: string) => /sacada frontal/i.test(String(projeto || ""));
const ehSacadaComTorre = (projeto?: string) => /sacada com torre/i.test(String(projeto || ""));
const ehSacadaGrapa = (projeto?: string) => /sacada grapa|sacada com grapa/i.test(String(projeto || ""));
const ehFechamentoSacada = (projeto?: string) => /fechamento de sacada/i.test(String(projeto || ""));
const ehPeleDeVidro = (projeto?: string) => /pele de vidro/i.test(String(projeto || ""));
const ehEspelhoComDesenho = (projeto?: string) => {
  const texto = normalizarTexto(projeto).trim();
  return /^espelhos?x?$/.test(texto) || /^espelhos? com desenho/.test(texto);
};
const ehProjetoTecnico = (projeto?: string) => ehSacadaFrontal(projeto) || ehSacadaGrapa(projeto) || ehFechamentoSacada(projeto) || ehPeleDeVidro(projeto);

const ehItemPinazio = (
  item?: Pick<
    CentralImpressaoItem,
    "projeto" | "origemRota" | "origemTipo" | "pinazioId" | "pinazioNome"
  >
) =>
  String(item?.origemTipo || "") === "pinazio-individual" ||
  String(item?.origemRota || "").includes("/calculo/pinazio") ||
  /pin[aá]zio/i.test(String(item?.projeto || "")) ||
  Boolean(item?.pinazioId || item?.pinazioNome);

const formatarPinazioItem = (
  item: Pick<CentralImpressaoItem, "pinazioId" | "pinazioNome" | "pinazioCor">
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

const desenhoSacadaFrontalUrl = (item?: Pick<CentralImpressaoItem, "largura" | "altura" | "pecasDivisao" | "corKit">) => {
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
  const glassW = (drawW - (divisoes + 1) * postW) / divisoes;
  const glassH = drawH - railH * 2;
  const x0 = padL;
  const y0 = padTop;
  const cor = corPerfilSvg(item?.corKit);
  const paineis = Array.from({ length: divisoes }).map((_, i) => {
    const pX = x0 + i * (glassW + postW);
    const gX = pX + postW;
    return `<g><rect x="${pX}" y="${y0}" width="${postW}" height="${drawH}" fill="${cor.fill}" rx="0.5"/><rect x="${pX}" y="${y0}" width="${postW}" height="${drawH}" fill="none" stroke="${cor.stroke}" stroke-width="0.4" rx="0.5"/><rect x="${gX}" y="${y0 + railH}" width="${glassW}" height="${glassH}" fill="url(#glassGrad)" rx="1"/><rect x="${gX}" y="${y0 + railH}" width="${glassW}" height="${glassH}" fill="none" stroke="#7cbfb5" stroke-width="0.6" stroke-opacity="0.5" rx="1"/><line x1="${gX + glassW * 0.18}" y1="${y0 + railH + glassH * 0.06}" x2="${gX + glassW * 0.08}" y2="${y0 + railH + glassH * 0.38}" stroke="#ffffff" stroke-width="0.7" stroke-opacity="0.3"/><line x1="${gX + glassW * 0.24}" y1="${y0 + railH + glassH * 0.06}" x2="${gX + glassW * 0.14}" y2="${y0 + railH + glassH * 0.38}" stroke="#ffffff" stroke-width="0.4" stroke-opacity="0.18"/></g>`;
  }).join("");

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}"><defs><linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b8e6e0" stop-opacity="0.35"/><stop offset="50%" stop-color="#b8e6e0" stop-opacity="0.18"/><stop offset="100%" stop-color="#b8e6e0" stop-opacity="0.3"/></linearGradient><linearGradient id="railGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${cor.fill}"/><stop offset="50%" stop-color="${cor.stroke}"/><stop offset="100%" stop-color="${cor.fill}"/></linearGradient></defs><rect x="${x0}" y="${y0}" width="${drawW}" height="${railH}" fill="url(#railGrad)" rx="1.5"/><rect x="${x0}" y="${y0}" width="${drawW}" height="${railH}" fill="none" stroke="${cor.stroke}" stroke-width="0.5" rx="1.5"/><rect x="${x0}" y="${y0 + drawH - railH}" width="${drawW}" height="${railH}" fill="url(#railGrad)" rx="1.5"/><rect x="${x0}" y="${y0 + drawH - railH}" width="${drawW}" height="${railH}" fill="none" stroke="${cor.stroke}" stroke-width="0.5" rx="1.5"/>${paineis}<rect x="${x0 + divisoes * (glassW + postW)}" y="${y0}" width="${postW}" height="${drawH}" fill="${cor.fill}" rx="0.5"/><rect x="${x0 + divisoes * (glassW + postW)}" y="${y0}" width="${postW}" height="${drawH}" fill="none" stroke="${cor.stroke}" stroke-width="0.4" rx="0.5"/><line x1="${x0}" y1="${y0 + drawH + 14}" x2="${x0 + drawW}" y2="${y0 + drawH + 14}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/><line x1="${x0}" y1="${y0 + drawH + 10}" x2="${x0}" y2="${y0 + drawH + 18}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/><line x1="${x0 + drawW}" y1="${y0 + drawH + 10}" x2="${x0 + drawW}" y2="${y0 + drawH + 18}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/><text x="${x0 + drawW / 2}" y="${y0 + drawH + 28}" text-anchor="middle" font-size="9.5" fill="#0f2742" opacity="0.6" font-weight="700" font-family="Arial">${largura} mm</text><line x1="${x0 - 10}" y1="${y0}" x2="${x0 - 10}" y2="${y0 + drawH}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/><line x1="${x0 - 14}" y1="${y0}" x2="${x0 - 6}" y2="${y0}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/><line x1="${x0 - 14}" y1="${y0 + drawH}" x2="${x0 - 6}" y2="${y0 + drawH}" stroke="#0f2742" stroke-width="0.6" stroke-opacity="0.4"/><text x="0" y="0" text-anchor="middle" font-size="9.5" fill="#0f2742" opacity="0.6" font-weight="700" font-family="Arial" transform="translate(${x0 - 22}, ${y0 + drawH / 2}) rotate(-90)">${altura} mm</text></svg>`);
};

const desenhoTecnicoUrl = (projeto?: string, item?: CentralImpressaoItem) => {
  if (ehSacadaGrapa(projeto) && item?.desenhoUrl) {
    return item.desenhoUrl;
  }

  if (ehSacadaFrontal(projeto)) {
    return desenhoSacadaFrontalUrl(item);
  }

  if (ehFechamentoSacada(projeto)) {
    return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><rect width="320" height="220" rx="18" fill="#f8fbfd"/><rect x="48" y="30" width="224" height="158" rx="4" fill="#eef7fb" stroke="#12324d" stroke-width="5"/><line x1="48" y1="92" x2="272" y2="92" stroke="#12324d" stroke-width="5"/><line x1="104" y1="30" x2="104" y2="188" stroke="#12324d" stroke-width="3"/><line x1="160" y1="30" x2="160" y2="188" stroke="#12324d" stroke-width="3"/><line x1="216" y1="30" x2="216" y2="188" stroke="#12324d" stroke-width="3"/><rect x="48" y="188" width="224" height="10" rx="3" fill="#d5dde5" stroke="#12324d" stroke-width="3"/><text x="160" y="215" text-anchor="middle" font-family="Arial" font-size="15" fill="#12324d">Fechamento de sacada</text></svg>`);
  }

  if (ehPeleDeVidro(projeto)) {
    return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><rect width="320" height="220" rx="18" fill="#f8fbfd"/><rect x="58" y="28" width="204" height="160" rx="4" fill="#edf8fc" stroke="#12324d" stroke-width="5"/><line x1="126" y1="28" x2="126" y2="188" stroke="#12324d" stroke-width="4"/><line x1="194" y1="28" x2="194" y2="188" stroke="#12324d" stroke-width="4"/><line x1="58" y1="81" x2="262" y2="81" stroke="#12324d" stroke-width="4"/><line x1="58" y1="134" x2="262" y2="134" stroke="#12324d" stroke-width="4"/><path d="M72 68 L112 42 M141 120 L183 87 M204 172 L247 139" stroke="#bfe4f2" stroke-width="5" opacity="0.8"/><text x="160" y="215" text-anchor="middle" font-family="Arial" font-size="15" fill="#12324d">Pele de vidro</text></svg>`);
  }

  return "";
};

function SacadaFrontalDesenhoPDF({ item }: { item: CentralImpressaoItem }) {
  const divisoes = Math.max(1, Math.min(12, Number(item.pecasDivisao || 1)));
  const largura = Math.max(1, Number(item.largura || 2000));
  const altura = Math.max(1, Number(item.altura || 1000));
  const ratio = Math.min(Math.max(altura / largura, 0.35), 1.35);
  const svgW = 220;
  const padL = 12;
  const padR = 12;
  const padTop = 12;
  const padBot = 12;
  const drawW = svgW - padL - padR;
  const drawH = Math.min(86, Math.max(34, drawW * ratio));
  const svgH = drawH + padTop + padBot;
  const postW = Math.max(2.5, Math.min(5.5, drawW * 0.018));
  const railH = Math.max(3.2, Math.min(6, drawH * 0.05));
  const glassW = (drawW - (divisoes + 1) * postW) / divisoes;
  const glassH = drawH - railH * 2;
  const x0 = padL;
  const y0 = padTop;
  const cor = corPerfilSvg(item.corKit);

  return (
    <Svg width={112} height={104} viewBox={`0 0 ${svgW} ${svgH}`}>
      <Rect x={x0} y={y0} width={drawW} height={railH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.7} />
      <Rect x={x0} y={y0 + drawH - railH} width={drawW} height={railH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.7} />
      {Array.from({ length: divisoes }).map((_, index) => {
        const pX = x0 + index * (glassW + postW);
        const gX = pX + postW;
        return (
          <G key={`sacada-painel-${index}`}>
            <Rect x={pX} y={y0} width={postW} height={drawH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.55} />
            <Rect x={gX} y={y0 + railH} width={glassW} height={glassH} fill="#dff5f2" stroke="#7cbfb5" strokeWidth={0.7} />
            <Line x1={gX + glassW * 0.2} y1={y0 + railH + 4} x2={gX + glassW * 0.08} y2={y0 + railH + glassH * 0.42} stroke="#ffffff" strokeWidth={1.2} />
            <Line x1={gX + glassW * 0.34} y1={y0 + railH + 5} x2={gX + glassW * 0.2} y2={y0 + railH + glassH * 0.42} stroke="#ffffff" strokeWidth={0.7} />
          </G>
        );
      })}
      <Rect x={x0 + divisoes * (glassW + postW)} y={y0} width={postW} height={drawH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.55} />
    </Svg>
  );
}

const numeroCampoFechamento = (valor: unknown, padrao = 1) => {
  const direto = Number(valor || 0);
  if (Number.isFinite(direto) && direto > 0) return direto;
  const encontrado = String(valor || "").match(/\d+/);
  return encontrado ? Number(encontrado[0]) : padrao;
};

const alturaSuperiorFechamento = (item: CentralImpressaoItem) => {
  const direta = Number(item.tamanhoPuxador || 0);
  if (Number.isFinite(direta) && direta > 0) return direta;
  const total = Number(item.altura || 0);
  const inferior = Number(item.alturaAteTubo || 0);
  return total > inferior ? total - inferior : 0;
};

function FechamentoSacadaDesenhoPDF({ item }: { item: CentralImpressaoItem }) {
  const largura = Math.max(1, Number(item.largura || 2000));
  const alturaInferior = Math.max(1, Number(item.alturaAteTubo || Math.round(Number(item.altura || 2000) / 2)));
  const alturaSuperior = Math.max(1, alturaSuperiorFechamento(item) || alturaInferior);
  const divisoesInferior = Math.max(1, Math.min(12, numeroCampoFechamento(item.trilho, 1)));
  const divisoesSuperior = Math.max(1, Math.min(12, numeroCampoFechamento(item.trinco, divisoesInferior)));
  const totalAltura = alturaInferior + alturaSuperior;
  const svgW = 220;
  const padL = 22;
  const padR = 8;
  const padTop = 8;
  const padBot = 16;
  const drawW = svgW - padL - padR;
  const ratio = Math.min(Math.max((totalAltura / largura) * 1.46, 0.62), 2.45);
  const drawH = Math.min(94, Math.max(46, drawW * ratio));
  const svgH = drawH + padTop + padBot;
  const postW = Math.max(2, Math.min(4, drawW * 0.014));
  const railH = Math.max(3, Math.min(6, drawH * 0.03));
  const areaUtilH = Math.max(drawH - railH * 3, 36);
  const supH = areaUtilH * (alturaSuperior / totalAltura);
  const infH = areaUtilH * (alturaInferior / totalAltura);
  const x0 = padL;
  const y0 = padTop;
  const yModuloSup = y0 + railH;
  const yMeio = yModuloSup + supH;
  const yModuloInf = yMeio + railH;
  const yBase = yModuloInf + infH;
  const cor = corPerfilSvg(item.corKit);

  const renderModulo = (prefixo: string, yModulo: number, moduloH: number, divisoes: number, fill: string, stroke: string) => {
    const totalPostW = (divisoes + 1) * postW;
    const glassW = (drawW - totalPostW) / divisoes;
    const glassH = Math.max(moduloH, 8);

    return (
      <G>
        {Array.from({ length: divisoes }).map((_, index) => {
          const pX = x0 + index * (glassW + postW);
          const gX = pX + postW;
          return (
            <G key={`${prefixo}-${index}`}>
              <Rect x={pX} y={yModulo} width={postW} height={glassH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.4} />
              <Rect x={gX} y={yModulo} width={glassW} height={glassH} fill={fill} stroke={stroke} strokeWidth={0.45} opacity={0.55} />
              <Line x1={gX + glassW * 0.18} y1={yModulo + glassH * 0.06} x2={gX + glassW * 0.08} y2={yModulo + glassH * 0.38} stroke="#ffffff" strokeWidth={0.55} />
            </G>
          );
        })}
        <Rect x={x0 + divisoes * (glassW + postW)} y={yModulo} width={postW} height={glassH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.4} />
      </G>
    );
  };

  return (
    <Svg width={112} height={104} viewBox={`0 0 ${svgW} ${svgH}`}>
      <Rect x={x0} y={y0} width={drawW} height={railH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.55} />
      <Rect x={x0} y={yMeio} width={drawW} height={railH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.55} />
      <Rect x={x0} y={yBase} width={drawW} height={railH} fill={cor.fill} stroke={cor.stroke} strokeWidth={0.55} />
      {renderModulo("sup", yModuloSup, supH, divisoesSuperior, "#b8dff2", "#7fb7d4")}
      {renderModulo("inf", yModuloInf, infH, divisoesInferior, "#b8e6e0", "#7cbfb5")}
    </Svg>
  );
}

function PeleDeVidroDesenhoPDF({ item }: { item: CentralImpressaoItem }) {
  const nH = Math.max(1, Math.min(12, numeroCampoFechamento(item.trilho, 1)));
  const nV = Math.max(1, Math.min(12, numeroCampoFechamento(item.trinco, 1)));
  const largura = Math.max(1, Number(item.largura || 2000));
  const altura = Math.max(1, Number(item.altura || 2000));
  const svgW = 160;
  const padL = 16;
  const padR = 16;
  const padTop = 10;
  const padBot = 10;
  const drawW = svgW - padL - padR;
  const ratio = Math.min(Math.max(altura / largura, 0.9), 1.55);
  const drawH = Math.min(140, Math.max(98, drawW * ratio));
  const svgH = drawH + padTop + padBot;
  const mullionW = Math.max(1.8, Math.min(4, drawW * 0.012));
  const glassW = (drawW - (nH + 1) * mullionW) / nH;
  const glassH = (drawH - (nV + 1) * mullionW) / nV;
  const x0 = padL;
  const y0 = padTop;
  const perfilFill = "#f7fafc";
  const perfilStroke = "#aebbc7";
  const vidroFill = "#eef8fb";
  const vidroStroke = "#bfd8e5";

  return (
    <Svg width={104} height={112} viewBox={`0 0 ${svgW} ${svgH}`}>
      {Array.from({ length: nV * nH }).map((_, index) => {
        const row = Math.floor(index / nH);
        const col = index % nH;
        const x = x0 + mullionW + col * (glassW + mullionW);
        const y = y0 + mullionW + row * (glassH + mullionW);
        return (
          <G key={`pv-${row}-${col}`}>
            <Rect x={x} y={y} width={glassW} height={glassH} fill={vidroFill} stroke={vidroStroke} strokeWidth={0.35} />
            <Line x1={x + glassW * 0.2} y1={y + glassH * 0.08} x2={x + glassW * 0.08} y2={y + glassH * 0.42} stroke="#ffffff" strokeWidth={0.45} />
          </G>
        );
      })}
      {Array.from({ length: nH + 1 }).map((_, index) => {
        const x = x0 + index * (glassW + mullionW);
        return <Rect key={`pv-v-${index}`} x={x} y={y0} width={mullionW} height={drawH} fill={perfilFill} stroke={perfilStroke} strokeWidth={0.35} />;
      })}
      {Array.from({ length: nV + 1 }).map((_, index) => {
        const y = y0 + index * (glassH + mullionW);
        return <Rect key={`pv-h-${index}`} x={x0} y={y} width={drawW} height={mullionW} fill={perfilFill} stroke={perfilStroke} strokeWidth={0.35} />;
      })}
    </Svg>
  );
}

function PinazioDesenhoPDF({ item }: { item: CentralImpressaoItem }) {
  const largura = Math.max(1, Number(item.largura || 1));
  const altura = Math.max(1, Number(item.altura || 1));
  const divL = Math.max(1, Number(item.divisoesLargura || 1));
  const divA = Math.max(1, Number(item.divisoesAltura || 1));

  const escala = Math.min(90 / largura, 76 / altura);
  const w = Math.max(36, Math.min(94, largura * escala));
  const h = Math.max(34, Math.min(80, altura * escala));
  const x = (112 - w) / 2;
  const y = 8;

  const corNormalizada = normalizarTexto(item.pinazioCor);
  const corLinha =
    corNormalizada === "preto" ? "#222222"
      : corNormalizada === "nogal" ? "#79543a"
        : "#f8fafc";

  const corContorno =
    corNormalizada === "branco" ? "#94a3b8"
      : corNormalizada === "nogal" ? "#5d3c28"
        : "#111827";

  const semPinazio = item.pinazioId === "sem-pinazio";

  return (
    <View>
      <Svg width={112} height={92} viewBox="0 0 112 92">
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={3}
          fill="#e8f4f7"
          stroke="#718596"
          strokeWidth={1.2}
        />

        <Line
          x1={x + w * 0.12}
          y1={y + h * 0.18}
          x2={x + w * 0.38}
          y2={y + h * 0.06}
          stroke="#ffffff"
          strokeWidth={2.2}
          opacity={0.65}
        />

        {!semPinazio ? Array.from({ length: Math.max(0, divL - 1) }).map((_, index) => {
              const linhaX = x + (w / divL) * (index + 1);

              return (
                <G key={`pinazio-v-${index}`}>
                  <Line
                    x1={linhaX}
                    y1={y}
                    x2={linhaX}
                    y2={y + h}
                    stroke={corContorno}
                    strokeWidth={2.2}
                  />
                  <Line
                    x1={linhaX}
                    y1={y}
                    x2={linhaX}
                    y2={y + h}
                    stroke={corLinha}
                    strokeWidth={1.3}
                  />
                </G>
              );
            })
          : null}

        {!semPinazio ? Array.from({ length: Math.max(0, divA - 1) }).map((_, index) => {
              const linhaY = y + (h / divA) * (index + 1);

              return (
                <G key={`pinazio-h-${index}`}>
                  <Line
                    x1={x}
                    y1={linhaY}
                    x2={x + w}
                    y2={linhaY}
                    stroke={corContorno}
                    strokeWidth={2.2}
                  />
                  <Line
                    x1={x}
                    y1={linhaY}
                    x2={x + w}
                    y2={linhaY}
                    stroke={corLinha}
                    strokeWidth={1.3}
                  />
                </G>
              );
            })
          : null}
      </Svg>

      <Text style={styles.imagePlaceholderText}>
        {item.largura || 0} x {item.altura || 0} mm
      </Text>
    </View>
  );
}

function EspelhoDesenhoPDF({ item }: { item: CentralImpressaoItem }) {
  const largura = Math.max(1, Number(item.largura || 1));
  const altura = Math.max(1, Number(item.altura || 1));
  const divL = Math.max(1, numeroCampoFechamento(item.trilho, 1));
  const divA = Math.max(1, numeroCampoFechamento(item.tamanhoPuxador, 1));
  const tipoVisual = String(item.puxador || "padrao")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const escala = Math.min(90 / largura, 78 / altura);
  let w = Math.max(34, Math.min(92, largura * escala));
  let h = Math.max(34, Math.min(82, altura * escala));
  const maior = Math.max(w, h);
  const menor = Math.min(w, h);
  const ehRedondo = tipoVisual.includes("redondo");
  const ehOvalVertical = tipoVisual.includes("oval_vertical") || tipoVisual.includes("oval-vertical") || tipoVisual.includes("vertical");
  const ehOvalHorizontal = tipoVisual.includes("oval_horizontal") || tipoVisual.includes("oval-horizontal") || tipoVisual === "oval" || (tipoVisual.includes("oval") && !ehOvalVertical && !tipoVisual.includes("semi_oval"));
  const ehSemiOval = tipoVisual.includes("semi_oval") || tipoVisual.includes("semi-oval");
  const ehOrganico = tipoVisual.includes("organico");
  const ehMolde = tipoVisual.includes("molde");
  const ehCapsula = tipoVisual.includes("capsula");

  if (ehRedondo) {
    w = menor;
    h = menor;
  } else if (ehOvalVertical) {
    w = Math.max(26, menor * 0.68);
    h = maior;
  } else if (ehOvalHorizontal) {
    w = maior;
    h = Math.max(26, menor * 0.68);
  } else if (ehCapsula) {
    w = maior;
    h = Math.max(24, menor * 0.55);
  }

  const x = (112 - w) / 2;
  const y = 10;
  const ehBisote = tipoVisual.includes("bisote");
  const ehLed = tipoVisual.includes("led");
  const fill = "#e8f1f6";
  const stroke = "#8fa1ae";
  const strokeWidth = ehBisote ? 5 : 1.8;
  const rx = ehCapsula ? Math.min(w, h) / 2 : 4;
  const pathSemiOval = `M ${x} ${y + h} L ${x} ${y + h * 0.48} C ${x} ${y + h * 0.08} ${x + w} ${y + h * 0.08} ${x + w} ${y + h * 0.48} L ${x + w} ${y + h} Z`;
  const pathOrganico = `M ${x + w * 0.5} ${y} C ${x + w * 0.88} ${y + h * 0.06} ${x + w} ${y + h * 0.36} ${x + w * 0.86} ${y + h * 0.68} C ${x + w * 0.72} ${y + h} ${x + w * 0.25} ${y + h} ${x + w * 0.08} ${y + h * 0.7} C ${x - w * 0.08} ${y + h * 0.4} ${x + w * 0.12} ${y + h * 0.04} ${x + w * 0.5} ${y} Z`;
  const pathMolde = `M ${x + w * 0.16} ${y + h * 0.05} C ${x + w * 0.48} ${y - h * 0.08} ${x + w * 0.78} ${y + h * 0.1} ${x + w * 0.95} ${y + h * 0.38} C ${x + w * 1.06} ${y + h * 0.62} ${x + w * 0.84} ${y + h * 0.96} ${x + w * 0.52} ${y + h * 0.98} C ${x + w * 0.18} ${y + h} ${x - w * 0.04} ${y + h * 0.7} ${x + w * 0.04} ${y + h * 0.42} C ${x + w * 0.08} ${y + h * 0.26} ${x + w * 0.02} ${y + h * 0.12} ${x + w * 0.16} ${y + h * 0.05} Z`;

  if (tipoVisual.includes("jogo") && (divL > 1 || divA > 1)) {
    const gap = 2;
    const cellW = (w - gap * (divL - 1)) / divL;
    const cellH = (h - gap * (divA - 1)) / divA;

    return (
      <View>
        <Svg width={112} height={96} viewBox="0 0 112 96">
          {Array.from({ length: divL * divA }).map((_, index) => {
            const col = index % divL;
            const row = Math.floor(index / divL);
            return (
              <Rect
                key={`espelho-jogo-${index}`}
                x={x + col * (cellW + gap)}
                y={y + row * (cellH + gap)}
                width={cellW}
                height={cellH}
                rx={3}
                fill="#e8f1f6"
                stroke="#8fa1ae"
                strokeWidth={1.2}
              />
            );
          })}
        </Svg>
        <Text style={styles.imagePlaceholderText}>{item.largura} x {item.altura} mm</Text>
      </View>
    );
  }

  return (
    <View>
      <Svg width={112} height={96} viewBox="0 0 112 96">
        {ehSemiOval ? (
          <>
            <Path d={pathSemiOval} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            {ehBisote ? <Path d={`M ${x + 5} ${y + h - 5} L ${x + 5} ${y + h * 0.5} C ${x + 5} ${y + h * 0.18} ${x + w - 5} ${y + h * 0.18} ${x + w - 5} ${y + h * 0.5} L ${x + w - 5} ${y + h - 5} Z`} fill="none" stroke="#ffffff" strokeWidth={1.5} /> : null}
          </>
        ) : ehOrganico ? (
          <Path d={pathOrganico} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        ) : ehMolde ? (
          <Path d={pathMolde} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        ) : ehRedondo || ehOvalVertical || ehOvalHorizontal ? (
          <>
            <Ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            {ehBisote ? <Ellipse cx={x + w / 2} cy={y + h / 2} rx={Math.max(1, w / 2 - 5)} ry={Math.max(1, h / 2 - 5)} fill="none" stroke="#ffffff" strokeWidth={1.5} /> : null}
            {ehLed ? <Ellipse cx={x + w / 2} cy={y + h / 2} rx={Math.max(1, w / 2 - 8)} ry={Math.max(1, h / 2 - 8)} fill="none" stroke="#ffffff" strokeWidth={1.2} strokeDasharray="4 4" /> : null}
          </>
        ) : (
          <>
            <Rect x={x} y={y} width={w} height={h} rx={rx} ry={rx} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            {ehBisote ? <Rect x={x + 5} y={y + 5} width={Math.max(0, w - 10)} height={Math.max(0, h - 10)} rx={Math.max(2, rx - 3)} ry={Math.max(2, rx - 3)} fill="none" stroke="#ffffff" strokeWidth={1.5} /> : null}
            {ehLed ? <Rect x={x + 8} y={y + 8} width={Math.max(0, w - 16)} height={Math.max(0, h - 16)} rx={Math.max(2, rx - 5)} ry={Math.max(2, rx - 5)} fill="none" stroke="#ffffff" strokeWidth={1.2} strokeDasharray="4 4" /> : null}
          </>
        )}
      </Svg>
      <Text style={styles.imagePlaceholderText}>{item.largura} x {item.altura} mm</Text>
    </View>
  );
}

const nomeEmpresaComSlogan = (nomeEmpresa: string) => {
  const slogan = "Soluções em Vidros e Ferragens";
  return normalizarTexto(nomeEmpresa).includes(normalizarTexto(slogan)) ? nomeEmpresa
    : `${nomeEmpresa} - ${slogan}`;
};

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

const ordemPerfilOtimizado = (perfil: Pick<CentralOtimizacaoPerfil, "codigo" | "descricao">) => {
  const codigo = codigoMaterialNormalizado(perfil.codigo);
  const descricao = normalizarTexto(perfil.descricao);
  const indiceCodigo = ORDEM_PERFIS_OTIMIZADOS.findIndex?.((item) => codigoMaterialNormalizado(item) === codigo);
  if (indiceCodigo >= 0) return indiceCodigo;
  if (descricao.includes("tubo")) return 100;
  if (descricao.includes("cantoneira")) return 110;
  return 120;
};

type TipoMaterialRelacao = "vidros" | "kits" | "perfis" | "ferragens";
type GrupoOrigemPerfil = "projetos" | "sacada-frontal" | "pele-de-vidro" | "fechamento-sacada";

type MaterialConsolidado = {
  chave: string;
  codigo: string;
  descricao: string;
  unidade: string;
  qtd: number;
  medida?: string;
  vidroDescricao?: string;
  pecas?: number;
  areaM2?: number;
  valorUnitario: number;
  valorTotal: number;
};

const normalizarUnidadeMaterial = (unidade?: string | null) => {
  const texto = normalizarTexto(unidade)
    .replace(/\s+/g, "")
    .replace(/[²]/g, "2");

  if (
    texto === "m2" ||
    texto === "mt2" ||
    texto === "metroquadrado" ||
    texto === "metrosquadrados"
  ) {
    return "m²";
  }

  if (
    texto === "m" ||
    texto === "mt" ||
    texto === "mts" ||
    texto === "metro" ||
    texto === "metros"
  ) {
    return "m";
  }

  if (
    texto === "und" ||
    texto === "un" ||
    texto === "unid" ||
    texto === "unidade" ||
    texto === "unidades" ||
    texto === "pc" ||
    texto === "pca" ||
    texto === "peca" ||
    texto === "pecas"
  ) {
    return "und";
  }

  if (
    texto === "barra" ||
    texto === "barras" ||
    texto === "br"
  ) {
    return "barra";
  }

  if (
    texto === "rolo" ||
    texto === "rolos"
  ) {
    return "rolo";
  }

  if (
    texto === "pacote" ||
    texto === "pacotes" ||
    texto === "pct"
  ) {
    return "pacote";
  }

  if (
    texto === "kit" ||
    texto === "kits"
  ) {
    return "kit";
  }

  if (
    texto === "kg" ||
    texto === "quilo" ||
    texto === "quilos"
  ) {
    return "kg";
  }

  return String(unidade || "und").trim().toLowerCase() || "und";
};

const normalizarCodigoMaterial = (codigo?: string | null) =>
  String(codigo || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");

const normalizarDescricaoMaterial = (descricao?: string | null) =>
  String(descricao || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

const numeroSeguro = (valor: unknown) => {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

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

  const numeroConvertido = Number(valor);
  return Number.isFinite(numeroConvertido) ? numeroConvertido : 0;
};

const classificarMaterialRelacao = (
  material: ProjetoIndividualMaterial
): TipoMaterialRelacao => {
  const descricao = normalizarTexto(material.descricao).trim();
  const unidade = normalizarUnidadeMaterial(material.unidade);
  const codigo = normalizarCodigoMaterial(material.codigoPerfil);

  /*
   * 1. Ferragens e acessórios precisam ser identificados antes dos vidros.
   * Exemplo: "SUPORTE FIXAÇÃO VIDRO" contém a palavra vidro,
   * mas continua sendo um acessório.
   */
  const termosFerragem = [
    "suporte",
    "fixacao",
    "presilha",
    "ancoragem",
    "chumbador",
    "prisioneiro",
    "parafuso",
    "porca",
    "bucha",
    "tapa furo",
    "tampa nylon",
    "canopla",
    "dobradica",
    "fecho",
    "fechadura",
    "cilindro",
    "contrafecho",
    "contra v/a",
    "placa fech",
    "braco",
    "roldana",
    "rodizio",
    "puxador",
    "macaneta",
    "trinco",
    "guarnicao",
    "borracha",
    "escova",
    "fita",
    "silicone",
    "cola",
    "arruela",
    "mola",
    "pino",
    "conector",
    "terminal",
  ];

  const prefixosFerragem = [
    "SUP",
    "PRE",
    "ANC",
    "CHU",
    "PAR",
    "POR",
    "BRA",
    "FEC",
    "PUX",
    "GUA",
    "FITA",
    "NYL",
    "CAN",
  ];

  const ehFerragemPorDescricao = termosFerragem.some((termo) =>
    descricao.includes(termo)
  );

  const ehFerragemPorCodigo = prefixosFerragem.some((prefixo) =>
    codigo.startsWith(prefixo)
  );

  if (ehFerragemPorDescricao || ehFerragemPorCodigo) {
    return "ferragens";
  }

  /* Kits completos vendidos como um único conjunto. */
  if (
    unidade === "kit" ||
    descricao.includes("kit box") ||
    descricao.includes("kit porta") ||
    descricao.includes("kit janela") ||
    descricao.includes("kit sacada") ||
    descricao.includes("kit completo")
  ) {
    return "kits";
  }

  /* Perfis, tubos, trilhos e barras de alumínio. */
  if (
    unidade === "barra" ||
    descricao.includes("perfil") ||
    descricao.includes("tubo") ||
    descricao.includes("cantoneira") ||
    descricao.includes("trilho") ||
    descricao.includes("corrimao") ||
    descricao.includes("prolongamento") ||
    /^(VT|FC|CL|CT|GR)\d+/i.test(codigo)
  ) {
    return "perfis";
  }

  /*
   * Vidro é identificado principalmente pela unidade m².
   * A descrição precisa começar como vidro ou espelho; apenas conter
   * a palavra "vidro" não é suficiente.
   */
  if (
    unidade === "m²" ||
    descricao.startsWith("vidro ") ||
    descricao.startsWith("espelho ") ||
    descricao.startsWith("laminado ") ||
    descricao.startsWith("temperado ")
  ) {
    return "vidros";
  }

  /* Todo material não identificado fica como ferragem/acessório. */
  return "ferragens";
};

const criarChaveMaterial = (
  codigo: string,
  descricao: string,
  unidade: string
) => {
  const codigoChave = normalizarCodigoMaterial(codigo);
  const descricaoChave = normalizarTexto(descricao)
    .replace(/\s+/g, " ")
    .trim();

  const unidadeChave = normalizarUnidadeMaterial(unidade);

  /*
   * O código é usado junto com a descrição.
   * Assim, materiais com códigos diferentes não são unidos por engano.
   */
  return `${codigoChave || "SEM-CODIGO"}|${descricaoChave}|${unidadeChave}`;
};

const removerCodigoDuplicadoDescricao = (codigo: string, descricao: string) => {
  const codigoNormalizado = normalizarCodigoMaterial(codigo);
  let descricaoLimpa = normalizarDescricaoMaterial(descricao);

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

const extrairVidroRelacao = (descricao: string) => {
  const descricaoLimpa = normalizarDescricaoMaterial(descricao)
    .replace(/^(VIDRO|ESPELHO)\s+/i, "")
    .trim();

  const medidaMatch = descricaoLimpa.match(/(\d{2,5}(?:[.,]\d+)?)\s*[xX]\s*(\d{2,5}(?:[.,]\d+)?)\s*(?:MM)?\b/i);

  if (!medidaMatch) {
    return {
      medida: "-",
      vidroDescricao: descricaoLimpa || normalizarDescricaoMaterial(descricao),
    };
  }

  const medida = `${String(medidaMatch[1]).replace(/\s+/g, "")} x ${String(medidaMatch[2]).replace(/\s+/g, "")} mm`;
  const vidroDescricao =
    descricaoLimpa
      .replace(medidaMatch[0], "")
      .replace(/\s+/g, " ")
      .trim() || "VIDRO";

  return { medida, vidroDescricao };
};

const inferirPecasVidroMaterial = (
  material: ProjetoIndividualMaterial,
  item: CentralImpressaoItem,
  totalVidrosDoItem: number
) => {
  const descricao = normalizarTexto(material.descricao);
  const projeto = normalizarTexto(item.projeto);
  const origemRota = normalizarTexto(item.origemRota);
  const matchPecas =
    descricao.match(/(?:^|\D)(\d+)\s*(?:peca|pecas|un|und)\b/i) ||
    descricao.match(/x\s*(\d+)\s*(?:peca|pecas)\b/i);

  if (matchPecas?.[1]) {
    return Number(matchPecas[1]) * Math.max(1, numeroSeguro(item.quantidade));
  }

  const pecasProjeto =
    Math.max(1, numeroSeguro(item.quantidade)) *
    multiplicadorPecasProjeto(item.projeto, item);

  // Em fixo com bandeira, os vidros inferior e bandeira usam a mesma
  // quantidade de folhas por vao. Nao deve dividir as pecas entre os dois.
  if (
    (origemRota.includes("fixo-bandeira") || projeto.includes("fixo com bandeira")) &&
    (descricao.includes("vidro inferior") || descricao.includes("vidro bandeira"))
  ) {
    return pecasProjeto;
  }

  if (totalVidrosDoItem <= 1) {
    return pecasProjeto;
  }

  return Math.max(1, Math.round(pecasProjeto / totalVidrosDoItem));
};

const adicionarMaterialConsolidado = (
  grupos: Map<string, MaterialConsolidado>,
  material: {
    codigo?: string;
    descricao?: string;
    unidade?: string;
    qtd?: number;
    medida?: string;
    vidroDescricao?: string;
    pecas?: number;
    areaM2?: number;
    valorUnitario?: number;
    valorTotal?: number;
  }
) => {
  const codigo = normalizarCodigoMaterial(material.codigo);
  const descricaoBase = normalizarDescricaoMaterial(material.descricao);
  const descricao = codigo ? removerCodigoDuplicadoDescricao(codigo, descricaoBase)
    : descricaoBase;
  const unidade = normalizarUnidadeMaterial(material.unidade);
  const qtd = numeroSeguro(material.qtd);

  if (!descricao || qtd <= 0) {
    return;
  }

  const valorTotalInformado = numeroSeguro(material.valorTotal);
  const valorUnitario = numeroSeguro(material.valorUnitario);

  const valorTotal =
    valorTotalInformado > 0 ? valorTotalInformado
      : qtd * valorUnitario;

  const detalhesVidro =
    material.medida || material.vidroDescricao ? {
          medida: material.medida,
          vidroDescricao: material.vidroDescricao,
        }
      : unidade === "m²" ? extrairVidroRelacao(descricao)
        : {};

  const chave = criarChaveMaterial(codigo, descricao, unidade);

  const atual = grupos.get(chave) || {
    chave,
    codigo,
    descricao,
    unidade,
    qtd: 0,
    medida: detalhesVidro.medida,
    vidroDescricao: detalhesVidro.vidroDescricao,
    pecas: 0,
    areaM2: 0,
    valorUnitario: 0,
    valorTotal: 0,
  };

  atual.qtd += qtd;
  atual.pecas = numeroSeguro(atual.pecas) + numeroSeguro(material.pecas);
  atual.areaM2 = numeroSeguro(atual.areaM2) + numeroSeguro(material.areaM2);
  atual.valorUnitario = valorUnitario > 0 ? valorUnitario : atual.valorUnitario;
  atual.valorTotal += valorTotal;

  grupos.set(chave, atual);
};

const consolidarMateriais = (
  itens: CentralImpressaoItem[],
  tipo: TipoMaterialRelacao,
  filtroItem?: (item: CentralImpressaoItem) => boolean
) => {
  const grupos = new Map<string, MaterialConsolidado>();

  itens.forEach((item) => {
    if (filtroItem && !filtroItem(item)) {
      return;
    }

    /*
     * Materiais normalmente enviados por cada página de cálculo.
     */
    const materiaisDoTipo = (item.materiais || []).filter(
      (material) => classificarMaterialRelacao(material) === tipo
    );

    materiaisDoTipo.forEach((material) => {
      if (classificarMaterialRelacao(material) !== tipo) {
        return;
      }

      const qtd = numeroSeguro(material.qtd);

      adicionarMaterialConsolidado(grupos, {
        codigo: material.codigoPerfil,
        descricao: material.descricao,
        unidade: material.unidade,
        qtd,
        medida: material.medida,
        vidroDescricao: material.vidroDescricao,
        pecas:
          tipo === "vidros" ? inferirPecasVidroMaterial(material, item, materiaisDoTipo.length)
            : undefined,
        areaM2: tipo === "vidros" ? qtd : undefined,
        valorUnitario: numeroSeguro(material.valorUnitario),
      });
    });

    /*
     * Segurança adicional para vidros e espelhos avulsos.
     * Eles passam a entrar na relação mesmo que a página de origem
     * não tenha preenchido item.materiais.
     */
    if (tipo === "vidros" && item.vidrosAvulsos?.length) {
      item.vidrosAvulsos.forEach((vidro) => {
        const { largura, altura } = extrairMedidaVidroAvulso(vidro.medida);
        const quantidade = numeroSeguro(vidro.quantidade);

        const areaTotal =
          largura > 0 && altura > 0 ? (largura * altura * quantidade) / 1_000_000
            : 0;

        if (areaTotal <= 0) {
          return;
        }

        adicionarMaterialConsolidado(grupos, {
          descricao: `VIDRO ${vidro.medida} ${vidro.vidro}`,
          unidade: "m²",
          qtd: areaTotal,
          medida: vidro.medida,
          vidroDescricao: vidro.vidro,
          pecas: quantidade,
          areaM2: areaTotal,
          valorTotal: numeroSeguro(vidro.valorTotal),
        });
      });
    }
  });

  return Array.from(grupos.values()).sort((a, b) => {
    const comparacaoDescricao = a.descricao.localeCompare(
      b.descricao,
      "pt-BR",
      { numeric: true }
    );

    if (comparacaoDescricao !== 0) {
      return comparacaoDescricao;
    }

    return a.codigo.localeCompare(b.codigo, "pt-BR", {
      numeric: true,
    });
  });
};

const origemPerfilItem = (item: CentralImpressaoItem): GrupoOrigemPerfil => {
  if (ehSacadaFrontal(item.projeto) || ehSacadaComTorre(item.projeto) || ehSacadaGrapa(item.projeto)) return "sacada-frontal";
  if (ehPeleDeVidro(item.projeto)) return "pele-de-vidro";
  if (ehFechamentoSacada(item.projeto)) return "fechamento-sacada";
  return "projetos";
};

const consolidarPerfisPorOrigem = (
  itens: CentralImpressaoItem[],
  origem: GrupoOrigemPerfil
) => consolidarMateriais(
  itens,
  "perfis",
  (item) => origemPerfilItem(item) === origem
);

const consolidarMateriaisPorOrigem = (
  itens: CentralImpressaoItem[],
  tipo: TipoMaterialRelacao,
  origem: GrupoOrigemPerfil
) => consolidarMateriais(
  itens,
  tipo,
  (item) => origemPerfilItem(item) === origem
);

const consolidarPerfisOtimizados = (
  otimizacaoPerfis: CentralOtimizacaoPerfil[],
  origem?: GrupoOrigemPerfil
): MaterialConsolidado[] =>
  [...otimizacaoPerfis]
    .filter((perfil) => !origem || (perfil.origem || "projetos") === origem)
    .sort((a, b) => {
      const ordemA = ordemPerfilOtimizado(a);
      const ordemB = ordemPerfilOtimizado(b);

      return ordemA === ordemB ? a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true })
        : ordemA - ordemB;
    })
    .map((perfil) => {
      const codigo = normalizarCodigoMaterial(perfil.codigo);
      const descricaoBase =
        normalizarDescricaoMaterial(perfil.descricao) ||
        codigo ||
        "PERFIL";

      const barrasOtimizadas = perfil.barras.length;

      const descricao = removerCodigoDuplicadoDescricao(codigo, descricaoBase);

      return {
        chave: criarChaveMaterial(codigo, descricao, "barra"),
        codigo,
        descricao,
        unidade: "barra",
        qtd: barrasOtimizadas,
        valorUnitario: numeroSeguro(perfil.valorUnitario),
        valorTotal: numeroSeguro(perfil.valorOtimizado),
      };
    });

const combinarPerfisComOtimizacao = (
  perfisNormais: MaterialConsolidado[],
  perfisOtimizados: MaterialConsolidado[]
) => {
  if (!perfisOtimizados.length) {
    return perfisNormais;
  }

  const codigosOtimizados = new Set(
    perfisOtimizados
      .map((perfil) => normalizarCodigoMaterial(perfil.codigo))
      .filter(Boolean)
  );

  /*
   * Mantém os perfis normais que não participaram da otimização.
   * Antes, qualquer otimização substituía toda a relação de perfis.
   */
  const perfisNaoOtimizados = perfisNormais.filter((perfil) => {
    const codigo = normalizarCodigoMaterial(perfil.codigo);

    if (!codigo) {
      return true;
    }

    return !codigosOtimizados.has(codigo);
  });

  return [...perfisOtimizados, ...perfisNaoOtimizados].sort((a, b) =>
    a.descricao.localeCompare(b.descricao, "pt-BR", {
      numeric: true,
    })
  );
};

const quantidadeUsaDecimal = (unidade?: string) => {
  const unidadeNormalizada = normalizarUnidadeMaterial(unidade);

  return [
    "m²",
    "m",
    "kg",
  ].includes(unidadeNormalizada);
};

const formatarQuantidadeMaterial = (
  quantidade: number,
  unidade?: string
) => {
  const casas = quantidadeUsaDecimal(unidade) ? 2 : 0;
  return numero(quantidade, casas);
};

const calcularAreaVidrosItem = (item: CentralImpressaoItem) => {
  const areaMateriais = item.materiais?.reduce((total, material) => {
    const descricao = String(material.descricao || "").toLowerCase();
    const unidade = String(material.unidade || "").toLowerCase();
    if (!descricao.includes("vidro") && !unidade.includes("m2")) return total;
    return total + Number(material.qtd || 0);
  }, 0) || 0;

  if (areaMateriais > 0) return areaMateriais;

  return (Number(item.largura || 0) * Number(item.altura || 0) * numeroSeguro(item.quantidade)) / 1_000_000;
};

const totalQuadrosPeleDeVidro = (item?: Pick<CentralImpressaoItem, "pecasDivisao" | "puxador" | "tamanhoPuxador">) => {
  return Math.max(1, Number(item?.pecasDivisao || 1));
};

const totalQuadrosPeleDeVidroComVaos = (item?: Pick<CentralImpressaoItem, "quantidade" | "pecasDivisao" | "puxador" | "tamanhoPuxador">) => {
  return Math.max(1, Number(item?.quantidade || 1)) * totalQuadrosPeleDeVidro(item);
};

const medidasDetalhadasPeleDeVidro = (item: Pick<CentralImpressaoItem, "largura" | "altura" | "trilho" | "trinco" | "puxador" | "tamanhoPuxador" | "pecasDivisao" | "medidasDetalhadas">) => {
  const medidaSalva = String(item.medidasDetalhadas || "").match(/Quadro:\s*([^\n]+)/i)?.[1];
  const larguraQuadro = numeroCampoFechamento(item.trilho, 0) > 0 ? Math.round(Number(item.largura || 0) / numeroCampoFechamento(item.trilho, 1)) : 0;
  const alturaQuadro = numeroCampoFechamento(item.trinco, 0) > 0 ? Math.round(Number(item.altura || 0) / numeroCampoFechamento(item.trinco, 1)) : 0;
  const medida = medidaSalva || `${larguraQuadro.toLocaleString("pt-BR")} x ${alturaQuadro.toLocaleString("pt-BR")} mm`;
  return `Quadro: ${medida}\nTotal de quadros: ${totalQuadrosPeleDeVidro(item)}\nFixos: ${numeroCampoFechamento(item.puxador, 0)} | Móveis: ${numeroCampoFechamento(item.tamanhoPuxador, 0)}`;
};

const multiplicadorPecasProjeto = (projeto?: string, item?: Pick<CentralImpressaoItem, "pecasDivisao" | "puxador" | "tamanhoPuxador" | "trinco">) => {
  const texto = String(projeto || "").toLowerCase();
  const variacao = String(item?.trinco || "").toLowerCase();
  if (texto.includes("vidros avulsos") || texto.includes("espelhos avulsos")) return Math.max(1, Number(item?.pecasDivisao || 1));
  if (texto === "max" || texto.includes("max")) return variacao.includes("único") || variacao.includes("unico") ? 1 : 2;
  if (texto.includes("pele de vidro")) {
    return totalQuadrosPeleDeVidro(item);
  }
  if (texto.includes("sacada frontal") || texto.includes("sacada grapa") || texto.includes("sacada com grapa") || texto.includes("fechamento de sacada")) {
    return Math.max(1, Number(item?.pecasDivisao || 1));
  }
  if (texto.includes("fixos") || texto.includes("fixo")) {
    return Math.min(6, Math.max(1, Number(item?.pecasDivisao || item?.tamanhoPuxador || 1)));
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
  item: Pick<CentralImpressaoItem, "projeto" | "pecasDivisao" | "tamanhoPuxador" | "origemRota" | "puxador" | "trinco">
) => {
  const projeto = normalizarTexto(item.projeto);
  const origemRota = normalizarTexto(item.origemRota);

  if (projeto.includes("fixo com bandeira") || origemRota.includes("fixo-bandeira")) {
    const divisao = Math.min(6, Math.max(1, Number(item.pecasDivisao || item.tamanhoPuxador || 1)));
    return divisao * 2;
  }

  return multiplicadorPecasProjeto(item.projeto, item);
};

const ehVidroAvulso = (projeto?: string) => /(vidros|espelhos) avulsos/i.test(String(projeto || ""));

export function CentralImpressaoPDF({
  itens,
  nomeEmpresa,
  logoUrl,
  numeroOrcamento,
  cliente,
  obra,
  otimizacaoPerfis = [],
  somenteRelacaoObra = false,
}: CentralImpressaoPDFProps) {
  const data = new Date().toLocaleDateString("pt-BR");
  const quantidadeVaos = itens.reduce((total, item) => total + (ehVidroAvulso(item.projeto) ? 0 : numeroSeguro(item.quantidade)), 0);
  const quantidadePecasVaos = itens.reduce((total, item) => total + (ehVidroAvulso(item.projeto) ? 0 : numeroSeguro(item.quantidade) * pecasPorVaoProjeto(item)), 0);
  const quantidadePecasAvulsas = itens.reduce((total, item) => {
    if (!ehVidroAvulso(item.projeto)) return total;
    return total + (item.vidrosAvulsos?.reduce((subtotal, vidro) => subtotal + Number(vidro.quantidade || 0), 0) || Number(item.pecasDivisao || 0));
  }, 0);
  const quantidadePecas = quantidadePecasVaos + quantidadePecasAvulsas;
  const areaTotal = itens.reduce((total, item) => total + calcularAreaVidrosItem(item), 0);
  const valorTotalOrcamento = itens.reduce((total, item) => total + Number(item.valorTotal || 0), 0);
  const valorPerfisOriginais = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOriginal || 0), 0);
  const valorPerfisOtimizados = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOtimizado || 0), 0);
  const economiaPerfis = Math.max(0, valorPerfisOriginais - valorPerfisOtimizados);
  const otimizacaoOrdenada = [...otimizacaoPerfis].sort((a, b) => {
    const ordemA = ordemPerfilOtimizado(a);
    const ordemB = ordemPerfilOtimizado(b);
    return ordemA === ordemB ? a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }) : ordemA - ordemB;
  });
const relacaoVidros = consolidarMateriais(itens, "vidros");
const relacaoKits = consolidarMateriais(itens, "kits");

const relacaoPerfisProjetosNormais = consolidarPerfisPorOrigem(itens, "projetos");
const relacaoPerfisProjetos = combinarPerfisComOtimizacao(
  relacaoPerfisProjetosNormais,
  consolidarPerfisOtimizados(otimizacaoOrdenada, "projetos")
);

const relacaoPerfisSacadaFrontal = combinarPerfisComOtimizacao(
  consolidarPerfisPorOrigem(itens, "sacada-frontal"),
  consolidarPerfisOtimizados(otimizacaoOrdenada, "sacada-frontal")
);
const relacaoPerfisPeleDeVidro = combinarPerfisComOtimizacao(
  consolidarPerfisPorOrigem(itens, "pele-de-vidro"),
  consolidarPerfisOtimizados(otimizacaoOrdenada, "pele-de-vidro")
);
const relacaoPerfisFechamentoSacada = combinarPerfisComOtimizacao(
  consolidarPerfisPorOrigem(itens, "fechamento-sacada"),
  consolidarPerfisOtimizados(otimizacaoOrdenada, "fechamento-sacada")
);
const relacaoFerragensPeleDeVidro = consolidarMateriaisPorOrigem(itens, "ferragens", "pele-de-vidro");
const relacaoFerragensFechamentoSacada = consolidarMateriaisPorOrigem(itens, "ferragens", "fechamento-sacada");
const relacaoFerragensSacadaFrontal = consolidarMateriaisPorOrigem(itens, "ferragens", "sacada-frontal");
const relacaoFerragensProjetos = consolidarMateriaisPorOrigem(itens, "ferragens", "projetos");
const possuiRelacaoObra =
  relacaoVidros.length > 0 ||
  relacaoPerfisProjetos.length > 0 ||
  relacaoPerfisSacadaFrontal.length > 0 ||
  relacaoPerfisPeleDeVidro.length > 0 ||
  relacaoPerfisFechamentoSacada.length > 0 ||
  relacaoKits.length > 0 ||
  relacaoFerragensPeleDeVidro.length > 0 ||
  relacaoFerragensFechamentoSacada.length > 0 ||
  relacaoFerragensSacadaFrontal.length > 0 ||
  relacaoFerragensProjetos.length > 0;

  const renderRelacaoGrupo = (
    titulo: string,
    materiais: MaterialConsolidado[],
    opcoes?: { vidros?: boolean }
  ) => (
    materiais.length > 0 ? (
      <View style={styles.relationSection}>
        <Text style={styles.relationSubtitle}>{titulo}</Text>
        <View style={styles.relationHeader}>
          {opcoes?.vidros ? (
            <>
              <Text style={styles.relationGlassCellQty}>QTD</Text>
              <Text style={styles.relationGlassCellMeasure}>MEDIDA</Text>
              <Text style={styles.relationGlassCellDesc}>VIDRO</Text>
              <Text style={styles.relationGlassCellArea}>M²</Text>
              <Text style={styles.relationGlassCellUnitPrice}>VALOR UNIT.</Text>
              <Text style={styles.relationGlassCellValue}>TOTAL</Text>
            </>
          ) : (
            <>
              <Text style={styles.relationCellQty}>QTD</Text>
              <Text style={styles.relationCellDesc}>DESCRIÇÃO</Text>
              <Text style={styles.relationCellUnit}>UND</Text>
              <Text style={styles.relationCellUnitPrice}>VALOR UNIT.</Text>
              <Text style={styles.relationCellValue}>TOTAL</Text>
            </>
          )}
        </View>
        {materiais.map((material) => {
          const descricaoExibicao = removerCodigoDuplicadoDescricao(
            material.codigo,
            material.descricao
          );
          const areaM2 = numeroSeguro(material.areaM2) || material.qtd;
          const valorUnitario = opcoes?.vidros ? areaM2 > 0 ? material.valorTotal / areaM2
              : material.valorUnitario
            : material.valorUnitario || (material.qtd > 0 ? material.valorTotal / material.qtd : 0);

          return opcoes?.vidros ? (
            <View key={material.chave} style={styles.relationRow} wrap={false}>
              <Text style={styles.relationGlassCellQty}>
                {numero(numeroSeguro(material.pecas) || material.qtd, 0)}
              </Text>
              <Text style={styles.relationGlassCellMeasure}>
                {material.medida || "-"}
              </Text>
              <Text style={styles.relationGlassCellDesc}>
                {material.vidroDescricao || descricaoExibicao}
              </Text>
              <Text style={styles.relationGlassCellArea}>
                {numero(areaM2, 2)}
              </Text>
              <Text style={styles.relationGlassCellUnitPrice}>
                {moeda(valorUnitario)}
              </Text>
              <Text style={styles.relationGlassCellValue}>
                {moeda(material.valorTotal)}
              </Text>
            </View>
          ) : (
            <View key={material.chave} style={styles.relationRow} wrap={false}>
              <Text style={styles.relationCellQty}>
                {formatarQuantidadeMaterial(material.qtd, material.unidade)}
              </Text>
              <Text style={styles.relationCellDesc}>{descricaoExibicao}</Text>
              <Text style={styles.relationCellUnit}>{material.unidade}</Text>
              <Text style={styles.relationCellUnitPrice}>
                {moeda(valorUnitario)}
              </Text>
              <Text style={styles.relationCellValue}>
                {moeda(material.valorTotal)}
              </Text>
            </View>
          );
        })}
        <View style={styles.relationTotalRow} wrap={false}>
          <Text style={styles.relationTotalLabel}>Total {titulo.toLowerCase()}</Text>
          <Text style={styles.relationTotalValue}>
            {moeda(materiais.reduce((total, material) => total + material.valorTotal, 0))}
          </Text>
        </View>
      </View>
    ) : null
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.title}>Orçamentos Projetos</Text>
              <Text style={styles.subtitle}>{nomeEmpresaComSlogan(nomeEmpresa)}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {itens.length} projeto(s)
            {"\n"}
            {data}
          </Text>
        </View>

        <View style={styles.topInfo} fixed>
          <View style={styles.topInfoBox}>
            <Text style={styles.topLabel}>Nº Orçamento</Text>
            <Text style={styles.topValue}>{numeroOrcamento || "Novo Orçamento"}</Text>
          </View>
          <View style={styles.topInfoBox}>
            <Text style={styles.topLabel}>Cliente</Text>
            <Text style={styles.topValue}>{cliente || "-"}</Text>
          </View>
          <View style={styles.topInfoBox}>
            <Text style={styles.topLabel}>Obra</Text>
            <Text style={styles.topValue}>{obra || "-"}</Text>
          </View>
        </View>

        {!somenteRelacaoObra ? (
          <View style={styles.list}>
            {itens.map((item, index) => {
            const ehJanela = /jc4f|jc2f|janela de correr 4|janela de correr 2/i.test(item.projeto || "");
            const ehPortaGiro = /pg|porta de giro/i.test(item.projeto || "");
            const ehPortaGiroFixo = /pgf|porta de giro com fixo lateral/i.test(item.projeto || "");
            const ehFixos = /fixos|fixo/i.test(item.projeto || "");
            const ehPma2f = /pma2f|m[aã]o amiga 2/i.test(item.projeto || "");
            const ehPma3f = /pma3f|m[aã]o amiga 3/i.test(item.projeto || "");
            const ehPma4f = /pma4f|m[aã]o amiga 4/i.test(item.projeto || "");
            const ehPma5f = /pma5f|m[aã]o amiga 5/i.test(item.projeto || "");
            const ehPma6f = /pma6f|m[aã]o amiga 6/i.test(item.projeto || "");
            const ehPma2f4m = /pma2f4m|2 fixas \+ 4|2 fixas e 4/i.test(item.projeto || "");
            const ehPma = ehPma2f || ehPma3f || ehPma4f || ehPma5f || ehPma6f || ehPma2f4m;
            const ehBox2Fls = /box2fls|box 2 folhas/i.test(item.projeto || "");
            const ehBoxProjeto = /box2fls|boxcanto|box de canto|box 2 folhas/i.test(item.projeto || "");
            const ehDeslizante2f = /deslizante2f|deslizante 2/i.test(item.projeto || "");
            const ehDeslizante3f = /deslizante3f|deslizante 3/i.test(item.projeto || "");
            const ehDeslizante4f = /deslizante4f|deslizante 4/i.test(item.projeto || "");
            const ehDeslizante5f = /deslizante5f|deslizante 5/i.test(item.projeto || "");
            const ehDeslizante6f = /deslizante6f|deslizante 6/i.test(item.projeto || "");
            const ehPc2fComBandeira = /pc2fcb|2 folhas com bandeira/i.test(item.projeto || "");
            const ehPc4fComBandeira = /pc4fcb|4 folhas com bandeira/i.test(item.projeto || "");
            const ehJc2fComSacada = /jc2fcs|sacada inferior/i.test(item.projeto || "");
            const ehJc4fComSacada = /jc4fcs|janela 4 folhas com sacada inferior|janela de correr 4 folhas com sacada inferior/i.test(item.projeto || "");
            const projetoTecnico = ehProjetoTecnico(item.projeto);
            const sacadaFrontal = ehSacadaFrontal(item.projeto);
            const sacadaGrapa = ehSacadaGrapa(item.projeto);
            const peleDeVidro = ehPeleDeVidro(item.projeto);
            const espelhoComDesenho = ehEspelhoComDesenho(item.projeto);
            const pinazio = ehItemPinazio(item);
            const pecasFixos = Math.min(6, Math.max(1, Number(item.pecasDivisao || item.tamanhoPuxador || 1)));
            const temBandeira = ehPc2fComBandeira || ehPc4fComBandeira || ehJc2fComSacada || ehJc4fComSacada;
            const fechamentoSacada = ehFechamentoSacada(item.projeto);
            const temSegundoVidro = temBandeira || fechamentoSacada;
            const ehJanelaComSacada = ehJc2fComSacada || ehJc4fComSacada;
            const ehVidroAvulso = /(vidros|espelhos) avulsos/i.test(item.projeto || "");
            const resumoAvulso = ehVidroAvulso ? calcularResumoVidrosAvulsos(item) : null;
            const nomeProjeto = ehPortaGiroFixo ? "Porta de giro com fixo lateral" : ehJc4fComSacada ? "Janela de correr 4 folhas com sacada inferior" : ehJc2fComSacada ? "Janela de correr 2 folhas com sacada inferior" : ehPc4fComBandeira ? "Porta de correr 4 folhas com bandeira" : ehPc2fComBandeira ? "Porta de correr 2 folhas com bandeira" : ehDeslizante6f ? "Deslizante 6 folhas" : ehDeslizante5f ? "Deslizante 5 folhas" : ehDeslizante4f ? "Deslizante 4 folhas" : ehDeslizante3f ? "Deslizante 3 folhas" : ehDeslizante2f ? "Deslizante 2 folhas" : item.projeto;
            const desenhoCentral = projetoTecnico ? desenhoTecnicoUrl(item.projeto, item) : item.desenhoUrl || desenhoTecnicoUrl(item.projeto, item);
            const vidroPrincipal = sacadaFrontal || sacadaGrapa ? descricaoVidroItem(item) : item.vidro;
            const labelVidroPrincipal = espelhoComDesenho ? "Espelho" : sacadaFrontal || sacadaGrapa ? "Cor do vidro" : ehFechamentoSacada(item.projeto) ? "Vidro inferior" : "Vidro";
            const labelCampoPrincipal = ehPeleDeVidro(item.projeto) ? "Quadros"
              : ehSacadaFrontal(item.projeto) || ehFechamentoSacada(item.projeto) ? "Divisões"
              : ehBox2Fls ? "Altura"
              : ehPma || ehDeslizante2f || ehDeslizante3f || ehDeslizante4f || ehDeslizante5f || ehDeslizante6f ? "Projeto"
              : ehPortaGiro ? "Fechadura"
              : "Trilho";
            const labelCampoSecundario = ehPeleDeVidro(item.projeto) ? "Lajes"
              : ehSacadaFrontal(item.projeto) || ehFechamentoSacada(item.projeto) ? "Tipo"
              : ehBox2Fls ? "Modelo do kit"
              : ehDeslizante2f || ehDeslizante3f || ehDeslizante4f || ehDeslizante5f || ehDeslizante6f ? "Carrinho"
              : ehPma ? "Roldana"
              : ehPortaGiroFixo ? "Projeto"
              : ehPortaGiro ? "Ferragens"
              : "Trinco";

            return (
              <View key={item.id} style={styles.card} wrap={false}>
                <View style={styles.imageWrap}>
                  {pinazio ? (
                    <MiniProjetoPinazioPDF
                      largura={Number(item.largura || 100)}
                      altura={Number(item.altura || 100)}
                      divisoesLargura={
                        item.pinazioId === "sem-pinazio" ? 1
                          : Math.max(1, Number(item.divisoesLargura || 1))
                      }
                      divisoesAltura={
                        item.pinazioId === "sem-pinazio" ? 1
                          : Math.max(1, Number(item.divisoesAltura || 1))
                      }
                      cor={item.pinazioCor || "branco"}
                      width={112}
                      height={104}
                    />
                  ) : sacadaFrontal ? (
                    <SacadaFrontalDesenhoPDF item={item} />
                  ) : fechamentoSacada ? (
                    <FechamentoSacadaDesenhoPDF item={item} />
                  ) : peleDeVidro ? (
                    <PeleDeVidroDesenhoPDF item={item} />
                  ) : espelhoComDesenho ? (
                    <EspelhoDesenhoPDF item={item} />
                  ) : desenhoCentral ? (
                    <Image src={desenhoCentral} style={styles.image} />
                  ) : (
                    <View>
                      <Text style={styles.imagePlaceholderTitle}>Sem desenho</Text>
                      <Text style={styles.imagePlaceholderText}>Itens avulsos</Text>
                    </View>
                  )}
                </View>

                <View style={styles.infoArea}>
                  <Text style={styles.projectLabel}>Projeto {index + 1}</Text>
                  <Text style={styles.projectName}>{nomeProjeto}</Text>
                  <View style={styles.infoGrid}>
                    {espelhoComDesenho ? (
                      <>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Largura</Text>
                          <Text style={styles.infoValue}>{item.largura || 0} mm</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Altura</Text>
                          <Text style={styles.infoValue}>{item.altura || 0} mm</Text>
                        </View>
                      </>
                    ) : ehVidroAvulso ? null : sacadaFrontal || sacadaGrapa ? (
                      <>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Largura</Text>
                          <Text style={styles.infoValue}>{item.largura || 0} mm</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Altura</Text>
                          <Text style={styles.infoValue}>{item.altura || 0} mm</Text>
                        </View>
                      </>
                    ) : fechamentoSacada ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Largura do vão</Text>
                        <Text style={styles.infoValue}>{item.largura || 0} mm</Text>
                      </View>
                    ) : peleDeVidro ? (
                      <>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Largura do vão</Text>
                          <Text style={styles.infoValue}>{item.largura || 0} mm</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Altura do vão</Text>
                          <Text style={styles.infoValue}>{item.altura || 0} mm</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Medidas</Text>
                        <Text style={styles.infoValue}>{item.medidas}</Text>
                      </View>
                    )}
                    {!(fechamentoSacada || peleDeVidro) ? (
                      <View style={ehVidroAvulso ? styles.infoAvulso : styles.info}>
                        <Text style={styles.infoLabel}>Quantidade</Text>
                        <Text style={styles.infoValue}>{ehVidroAvulso ? `${resumoAvulso?.pecas || 0} peça(s)` : item.quantidade}</Text>
                      </View>
                    ) : null}
                    {fechamentoSacada ? (
                      <>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Altura da sacada inferior</Text>
                          <Text style={styles.infoValue}>{item.alturaAteTubo || 0} mm</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Altura da sacada superior</Text>
                          <Text style={styles.infoValue}>{alturaSuperiorFechamento(item)} mm</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Quantidade de vão</Text>
                          <Text style={styles.infoValue}>{item.quantidade}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Divisão da parte de baixo</Text>
                          <Text style={styles.infoValue}>{numeroCampoFechamento(item.trilho, 1)}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Divisão da parte de cima</Text>
                          <Text style={styles.infoValue}>{numeroCampoFechamento(item.trinco, 1)}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Cor do perfil</Text>
                          <Text style={styles.infoValue}>{item.corKit || "-"}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Vidro inferior</Text>
                          <Text style={styles.infoValue}>{item.vidro || "-"}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Vidro de cima</Text>
                          <Text style={styles.infoValue}>{item.vidroBandeira || "-"}</Text>
                        </View>
                      </>
                    ) : peleDeVidro ? (
                      <>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Qtd. de fachadas</Text>
                          <Text style={styles.infoValue}>{item.quantidade}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Quadros horizontal</Text>
                          <Text style={styles.infoValue}>{numeroCampoFechamento(item.trilho, 1)}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Quadros vertical</Text>
                          <Text style={styles.infoValue}>{numeroCampoFechamento(item.trinco, 1)}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Quantidade de lajes</Text>
                          <Text style={styles.infoValue}>{item.alturaAteTubo || 0}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Quadros fixos</Text>
                          <Text style={styles.infoValue}>{numeroCampoFechamento(item.puxador, 0)}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Quadros móveis</Text>
                          <Text style={styles.infoValue}>{numeroCampoFechamento(item.tamanhoPuxador, 0)}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Quantidade de quadros</Text>
                          <Text style={styles.infoValue}>{totalQuadrosPeleDeVidroComVaos(item)}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.infoLabel}>Vidro da fachada</Text>
                          <Text style={styles.infoValue}>{descricaoVidroItem(item) || "-"}</Text>
                        </View>
                      </>
                    ) : ehVidroAvulso ? (
                      <View style={styles.infoAvulso}>
                        <Text style={styles.infoLabel}>M² total</Text>
                        <Text style={styles.infoValue}>
                          {(resumoAvulso?.area || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
                        </Text>
                      </View>
                    ) : sacadaFrontal ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Peças por vão na largura</Text>
                        <Text style={styles.infoValue}>{item.pecasDivisao || 1}</Text>
                      </View>
                    ) : sacadaGrapa ? null : ehBoxProjeto || pinazio || espelhoComDesenho ? null : (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Modo</Text>
                        <Text style={styles.infoValue}>{item.modo}</Text>
                      </View>
                    )}
                    {ehVidroAvulso ? (
                      <View style={styles.infoAvulso}>
                        <Text style={styles.infoLabel}>Vidro</Text>
                        <Text style={styles.infoValue}>{item.vidro || "Conforme relação"}</Text>
                      </View>
                    ) : null}
                    {!ehVidroAvulso && !fechamentoSacada && !peleDeVidro && !pinazio ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{labelVidroPrincipal}</Text>
                        <Text style={styles.infoValue}>{vidroPrincipal || "-"}</Text>
                      </View>
                    ) : null}
                    {temSegundoVidro && !fechamentoSacada ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{ehFechamentoSacada(item.projeto) ? "Vidro superior" : ehJanelaComSacada ? "Vidro sacada" : "Vidro bandeira"}</Text>
                        <Text style={styles.infoValue}>{item.vidroBandeira || "-"}</Text>
                      </View>
                    ) : null}
                    {temBandeira ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{ehJanelaComSacada ? "Altura da sacada" : "Altura até o tubo"}</Text>
                        <Text style={styles.infoValue}>{item.alturaAteTubo || 0} mm</Text>
                      </View>
                    ) : null}
                    {pinazio ? (
                      <View style={styles.infoWide}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>Vidro</Text>
                            <Text style={styles.infoValue}>
                              {descricaoVidroItem(item) || item.vidro || "-"}
                            </Text>
                          </View>

                          <View style={{ width: 82, alignItems: "flex-end" }}>
                            <Text style={styles.infoLabel}>Valor</Text>
                            <Text style={styles.infoValue}>
                              {moeda(Number(item.valorTotal || 0))}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : !ehVidroAvulso && !fechamentoSacada && !peleDeVidro && !espelhoComDesenho ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{sacadaFrontal ? "Cor do perfil" : ehBoxProjeto ? "Cor do kit" : "Cor"}</Text>
                        <Text style={styles.infoValue}>{item.corKit || "-"}</Text>
                      </View>
                    ) : null}
                    {temBandeira ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Tubo</Text>
                        <Text style={styles.infoValue}>{item.tuboPerfil || "-"}</Text>
                      </View>
                    ) : null}
                    {ehFixos ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Divisão</Text>
                        <Text style={styles.infoValue}>{pecasFixos} peça(s)</Text>
                      </View>
                    ) : null}
                    {!ehVidroAvulso && !ehBoxProjeto && !sacadaFrontal && !sacadaGrapa && !fechamentoSacada && !peleDeVidro && !ehJanela && !ehFixos && !pinazio && !espelhoComDesenho ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{labelCampoPrincipal}</Text>
                        <Text style={styles.infoValue}>{item.trilho || "-"}</Text>
                      </View>
                    ) : null}
                    {!ehVidroAvulso && !projetoTecnico && !sacadaGrapa && !ehJanela && !ehFixos && !pinazio && !espelhoComDesenho && item.puxador && !/^sem\b/i.test(String(item.puxador).trim()) ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Puxador</Text>
                        <Text style={styles.infoValue}>{item.puxador || "-"}</Text>
                      </View>
                    ) : null}
                    {!ehVidroAvulso && !sacadaFrontal && !sacadaGrapa && !fechamentoSacada && !peleDeVidro && !ehFixos && !pinazio && !espelhoComDesenho ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{labelCampoSecundario}</Text>
                        <Text style={styles.infoValue}>{item.trinco || "-"}</Text>
                      </View>
                    ) : null}
                    {ehPortaGiroFixo ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Ferragens</Text>
                        <Text style={styles.infoValue}>{item.observacao || "Padrão"}</Text>
                      </View>
                    ) : null}
                    {!pinazio ? (
                      <View style={ehVidroAvulso ? styles.infoAvulso : styles.info}>
                        <Text style={styles.infoLabel}>{espelhoComDesenho ? "Valor" : "Valor total"}</Text>
                        <Text style={styles.infoValueStrong}>{moeda(ehVidroAvulso ? resumoAvulso?.valor || 0 : item.valorTotal || 0)}</Text>
                      </View>
                    ) : null}
                    {ehVidroAvulso && item.vidrosAvulsos?.length ? (
                      <View style={styles.vidroTable}>
                        <View style={styles.vidroHeader}>
                          <Text style={styles.vidroCellQtd}>PEÇAS</Text>
                          <Text style={styles.vidroCellMedida}>MEDIDAS</Text>
                          <Text style={styles.vidroCellDesc}>VIDRO</Text>
                          <Text style={styles.vidroCellTotal}>TOTAL</Text>
                        </View>
                        {item.vidrosAvulsos.map((vidro) => (
                          <View key={vidro.id} style={styles.vidroRow} wrap={false}>
                            <Text style={styles.vidroCellQtd}>{numero(vidro.quantidade, 0)}</Text>
                            <Text style={styles.vidroCellMedida}>{vidro.medida}</Text>
                            <Text style={styles.vidroCellDesc}>{vidro.vidro}</Text>
                            <Text style={styles.vidroCellTotal}>{moeda(vidro.valorTotal)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (peleDeVidro || item.medidasDetalhadas) && !sacadaFrontal && !espelhoComDesenho ? (
                      <View style={styles.infoWide}>
                        <Text style={styles.infoLabel}>Medidas detalhadas</Text>
                        <Text style={styles.infoMultiline}>{item.medidasDetalhadas}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
            })}
          </View>
        ) : null}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Quantidade de vão</Text>
            <Text style={styles.totalValue}>{quantidadeVaos}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Peças dos vãos</Text>
            <Text style={styles.totalValue}>{quantidadePecasVaos}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Peças avulsas</Text>
            <Text style={styles.totalValue}>{quantidadePecasAvulsas}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total peças</Text>
            <Text style={styles.totalValue}>{quantidadePecas}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>M² total</Text>
            <Text style={styles.totalValue}>
              {areaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
            </Text>
          </View>
          <View style={styles.totalBoxStrong}>
            <Text style={styles.totalLabel}>Valor total do Orçamento</Text>
            <Text style={styles.totalValueStrong}>{moeda(valorTotalOrcamento)}</Text>
          </View>
        </View>

        {!somenteRelacaoObra && otimizacaoOrdenada.length > 0 ? (
          <View style={styles.optSection}>
            <Text style={styles.optTitle}>Relação de materiais otimizada</Text>
            <Text style={styles.optLine}>Economia estimada em perfis: {moeda(economiaPerfis)}</Text>
            {otimizacaoOrdenada.map((perfil) => (
              <View key={`${perfil.codigo}-${perfil.descricao}`} style={styles.optCard} wrap={false}>
                <Text style={styles.optName}>
                  {perfil.descricao} - {moeda(Number(perfil.valorOtimizado || 0))}
                </Text>
                {perfil.barras.map((barra, index) => {
                  const usado = barra.reduce((soma, corte) => soma + corte, 0);
                  return (
                    <Text key={`${perfil.codigo}-${index}`} style={styles.optLine}>
                      Barra {index + 1}: {barra.join(" + ")} = {usado} mm
                    </Text>
                  );
                })}
              </View>
            ))}
          </View>
        ) : null}

        {somenteRelacaoObra && possuiRelacaoObra ? (
          <View style={styles.relationSection} wrap={false}>
            <Text style={styles.relationTitle}>Relação da obra</Text>
            <Text style={styles.optLine}>Materiais consolidados por descrição e separados por origem do orçamento.</Text>
          </View>
        ) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Vidros", relacaoVidros, { vidros: true }) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Perfis pele de vidro", relacaoPerfisPeleDeVidro) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Perfis fechamento de sacada", relacaoPerfisFechamentoSacada) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Perfis de sacada", relacaoPerfisSacadaFrontal) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo(
              "Perfis engenharia",
              relacaoPerfisProjetos
            )
          : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Kits", relacaoKits) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Acessórios/ferragens da pele de vidro", relacaoFerragensPeleDeVidro) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Acessórios/ferragens do fechamento de sacada", relacaoFerragensFechamentoSacada) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Acessórios/ferragens da sacada", relacaoFerragensSacadaFrontal) : null}
        {somenteRelacaoObra ? renderRelacaoGrupo("Acessórios/ferragens da engenharia", relacaoFerragensProjetos) : null}

        <Text style={styles.footer} fixed>
          Orçamentos Projetos gerado pelo Glass Code
        </Text>
      </Page>
    </Document>
  );
}
