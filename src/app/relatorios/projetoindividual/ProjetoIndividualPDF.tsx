"use client";

import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type ProjetoIndividualMaterial = {
  id: string;
  qtd: number;
  unidade: string;
  descricao: string;
  valorUnitario: number;
  codigoPerfil?: string;
  comprimentoBarra?: number;
  cortes?: number[];
};

export type ProjetoIndividualDados = {
  projeto: string;
  numero: string;
  data: string;
  cliente: string;
  largura: number;
  altura: number;
  quantidade: number;
  trilho: string;
  vidro: string;
  corKit: string;
  puxador?: string;
  tamanhoPuxador?: string;
  trinco?: string;
  pecasDivisao?: number;
  alturaAteTubo?: number;
  vidroBandeira?: string;
  tuboPerfil?: string;
  observacao?: string;
  materiais: ProjetoIndividualMaterial[];
};

type ProjetoIndividualPDFProps = {
  dados: ProjetoIndividualDados;
  logoUrl?: string | null;
};

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const numero = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const quantidade = (valor: number, unidade: string) => {
  const unidadeNormalizada = String(unidade || "").toLowerCase();

  if (unidadeNormalizada.includes("und") || unidadeNormalizada.includes("barra")) {
    return Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }

  return numero(valor);
};

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

const arredondar5cm = (valorMm: number) => Math.ceil(Number(valorMm || 0) / 50) * 50;

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0f2742",
  },
  header: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: { flexDirection: "row", gap: 10, alignItems: "center", flex: 1.2 },
  logoEmpresa: { width: 150, maxHeight: 48, objectFit: "contain", objectPosition: "left" },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#00a85a",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#00a85a", fontSize: 16, fontWeight: "bold" },
  brandName: { fontSize: 20, fontWeight: "bold", color: "#10253f" },
  brandSub: { fontSize: 8, color: "#00a85a", marginTop: 2 },
  headerMetaWrap: { flexDirection: "row", gap: 8, flex: 2, justifyContent: "flex-end" },
  metaBox: { borderLeftWidth: 1, borderLeftColor: "#dbe4ee", paddingLeft: 8, minWidth: 78 },
  metaLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  metaValue: { fontSize: 10, color: "#0f2742", fontWeight: "bold" },
  metaGreen: { color: "#009b55" },
  titleRow: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    marginBottom: 10,
  },
  titleLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase" },
  title: { fontSize: 12, color: "#0f2742", fontWeight: "normal", marginTop: 3 },
  grid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 8,
  },
  drawingCard: { width: "32%" },
  dataCard: { width: "68%" },
  sectionTitle: { fontSize: 10, color: "#0f2742", fontWeight: "bold", textTransform: "uppercase" },
  titleLine: { width: 22, height: 2, backgroundColor: "#00a85a", marginTop: 8, marginBottom: 12 },
  drawingBox: { height: 190, alignItems: "center", justifyContent: "center" },
  drawingImage: { width: 140, maxHeight: 180, objectFit: "contain" },
  drawingCaption: { fontSize: 7, color: "#64748b", marginTop: 8 },
  dataGrid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  dataItem: {
    width: "33.33%",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  dataLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  dataValue: { fontSize: 11, color: "#0f2742", fontWeight: "normal" },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#07385a",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 24,
    alignItems: "center",
  },
  th: { color: "#ffffff", fontSize: 8, fontWeight: "bold", textTransform: "uppercase", paddingHorizontal: 6 },
  tr: { flexDirection: "row", minHeight: 28, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  td: { fontSize: 8.5, color: "#0f2742", paddingHorizontal: 6 },
  colQtd: { width: "10%", textAlign: "center" },
  colDesc: { width: "50%" },
  colUn: { width: "10%", textAlign: "center" },
  colValor: { width: "15%", textAlign: "right" },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  summaryBox: {
    width: "31.8%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 9,
    padding: 8,
  },
  summaryLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase" },
  summaryValue: { fontSize: 10.5, color: "#0f2742", fontWeight: "bold", marginTop: 5 },
  footer: { position: "absolute", left: 28, right: 28, bottom: 14, fontSize: 7, color: "#94a3b8", textAlign: "center" },
});

export function ProjetoIndividualPDF({ dados, logoUrl }: ProjetoIndividualPDFProps) {
  const projetoNormalizado = String(dados.projeto || "").toLowerCase();
  const ehJc4fComSacada = projetoNormalizado.includes("jc4fcs") || projetoNormalizado.includes("janela 4 folhas com sacada inferior") || projetoNormalizado.includes("janela de correr 4 folhas com sacada inferior");
  const ehJc2fComSacada = projetoNormalizado.includes("jc2fcs") || projetoNormalizado.includes("janela 2 folhas com sacada inferior") || projetoNormalizado.includes("janela de correr 2 folhas com sacada inferior");
  const ehJanelaComSacada = ehJc2fComSacada || ehJc4fComSacada;
  const ehJanelaCorrer4Folhas = projetoNormalizado.includes("jc4f") || projetoNormalizado.includes("janela de correr 4");
  const ehJanelaCorrer2Folhas = projetoNormalizado.includes("jc2f") || projetoNormalizado.includes("janela de correr 2");
  const ehJanelaCorrer = ehJanelaCorrer4Folhas || ehJanelaCorrer2Folhas;
  const ehPc2fComBandeira = projetoNormalizado.includes("pc2fcb") || projetoNormalizado.includes("2 folhas com bandeira");
  const ehPc2f = projetoNormalizado.includes("pc2f") || projetoNormalizado.includes("porta de correr 2 folhas");
  const ehPc4fComBandeira = projetoNormalizado.includes("pc4fcb") || projetoNormalizado.includes("4 folhas com bandeira");
  const ehPc4f = projetoNormalizado.includes("pc4f") || projetoNormalizado.includes("porta de correr 4 folhas");
  const ehPortaGiro2Folhas = projetoNormalizado.includes("pg - 2") || projetoNormalizado.includes("pg dobradica - 2") || projetoNormalizado.includes("pg dobradiça - 2") || projetoNormalizado.includes("porta de giro - 2") || projetoNormalizado.includes("porta de giro dobradica - 2") || projetoNormalizado.includes("porta de giro dobradiça - 2");
  const ehPortaGiroFixo = projetoNormalizado.includes("pgf") || projetoNormalizado.includes("porta de giro com fixo lateral");
  const ehMax = projetoNormalizado === "max" || projetoNormalizado.includes("max");
  const ehPortaGiro = projetoNormalizado.includes("pg") || projetoNormalizado.includes("porta de giro");
  const ehFixos = projetoNormalizado.includes("fixos") || projetoNormalizado.includes("fixo");
  const ehPma2f = projetoNormalizado.includes("pma2f") || projetoNormalizado.includes("mao amiga 2") || projetoNormalizado.includes("mão amiga 2");
  const ehPma3f = projetoNormalizado.includes("pma3f") || projetoNormalizado.includes("mao amiga 3") || projetoNormalizado.includes("mão amiga 3");
  const ehPma4f = projetoNormalizado.includes("pma4f") || projetoNormalizado.includes("mao amiga 4") || projetoNormalizado.includes("mão amiga 4");
  const ehPma5f = projetoNormalizado.includes("pma5f") || projetoNormalizado.includes("mao amiga 5") || projetoNormalizado.includes("mão amiga 5");
  const ehPma6f = projetoNormalizado.includes("pma6f") || projetoNormalizado.includes("mao amiga 6") || projetoNormalizado.includes("mão amiga 6");
  const ehPma2f4m = projetoNormalizado.includes("pma2f4m") || projetoNormalizado.includes("2 fixas + 4") || projetoNormalizado.includes("2 fixas e 4");
  const ehPma = ehPma2f || ehPma3f || ehPma4f || ehPma5f || ehPma6f || ehPma2f4m;
  const ehBoxCanto3f = projetoNormalizado.includes("boxcanto3f") || projetoNormalizado.includes("box de canto 3");
  const ehBoxCanto = !ehBoxCanto3f && (projetoNormalizado.includes("boxcanto") || projetoNormalizado.includes("box de canto"));
  const ehBox2Fls = projetoNormalizado.includes("box2fls") || projetoNormalizado.includes("box 2 folhas");
  const ehDeslizante2f = projetoNormalizado.includes("deslizante2f") || projetoNormalizado.includes("deslizante 2");
  const ehDeslizante3f = projetoNormalizado.includes("deslizante3f") || projetoNormalizado.includes("deslizante 3");
  const ehDeslizante4f = projetoNormalizado.includes("deslizante4f") || projetoNormalizado.includes("deslizante 4");
  const ehDeslizante5f = projetoNormalizado.includes("deslizante5f") || projetoNormalizado.includes("deslizante 5");
  const ehDeslizante6f = projetoNormalizado.includes("deslizante6f") || projetoNormalizado.includes("deslizante 6");
  const ehDuasFolhas = projetoNormalizado.includes("pfv2f") || projetoNormalizado.includes("2 folhas");
  const quantidadeVaos = Number(dados.quantidade || 0);
  const pecasFixos = Math.min(6, Math.max(1, Number(dados.pecasDivisao || dados.tamanhoPuxador || 1)));
  const larguraFixaJc = arredondar5cm(Number(dados.largura || 0) / (ehJanelaCorrer2Folhas ? 2 : 4));
  const alturaFixaJc4f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 60));
  const larguraMovelJc = arredondar5cm(larguraFixaJc + 50);
  const alturaMovelJc4f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 20));
  const alturaSacadaJc2f = arredondar5cm(Math.min(Math.max(0, Number(dados.alturaAteTubo || 0)), Number(dados.altura || 0)));
  const alturaJanelaJc2f = Math.max(0, Number(dados.altura || 0) - Number(dados.alturaAteTubo || 0));
  const larguraFixaJc2fSacada = arredondar5cm(Number(dados.largura || 0) / 2);
  const larguraMovelJc2fSacada = arredondar5cm(larguraFixaJc2fSacada + 50);
  const alturaFixaJc2fSacada = arredondar5cm(Math.max(0, alturaJanelaJc2f - 60));
  const alturaMovelJc2fSacada = arredondar5cm(Math.max(0, alturaJanelaJc2f - 20));
  const larguraSacadaJc2f = arredondar5cm(Number(dados.largura || 0));
  const alturaSacadaJc4f = arredondar5cm(Math.min(Math.max(0, Number(dados.alturaAteTubo || 0)), Number(dados.altura || 0)));
  const alturaJanelaJc4f = Math.max(0, Number(dados.altura || 0) - Number(dados.alturaAteTubo || 0));
  const larguraFixaJc4fSacada = arredondar5cm(Number(dados.largura || 0) / 4);
  const larguraMovelJc4fSacada = arredondar5cm(larguraFixaJc4fSacada + 50);
  const alturaFixaJc4fSacada = arredondar5cm(Math.max(0, alturaJanelaJc4f - 60));
  const alturaMovelJc4fSacada = arredondar5cm(Math.max(0, alturaJanelaJc4f - 20));
  const larguraSacadaJc4f = arredondar5cm(Number(dados.largura || 0) / 2);
  const larguraFixaPc2f = arredondar5cm(Number(dados.largura || 0) / 2);
  const larguraMovelPc2f = arredondar5cm(larguraFixaPc2f + 50);
  const alturaPortaPc2fComBandeira = dados.alturaAteTubo && Number(dados.alturaAteTubo) > 0
    ? Math.min(Number(dados.alturaAteTubo), Number(dados.altura || 0))
    : Number(dados.altura || 0);
  const alturaBandeiraPc2f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - alturaPortaPc2fComBandeira));
  const larguraBandeiraPc2f = arredondar5cm(Number(dados.largura || 0));
  const alturaReferenciaPc2f = ehPc2fComBandeira ? alturaPortaPc2fComBandeira : Number(dados.altura || 0);
  const alturaFixaPc2f = arredondar5cm(Math.max(0, alturaReferenciaPc2f - (dados.trilho === "Embutido" ? 40 : 60)));
  const alturaMovelPc2f = arredondar5cm(Math.max(0, alturaReferenciaPc2f - (dados.trilho === "Embutido" ? 0 : 20)));
  const larguraFixaPc4f = arredondar5cm(Number(dados.largura || 0) / 4);
  const larguraMovelPc4f = arredondar5cm(larguraFixaPc4f + 50);
  const alturaPortaPc4fComBandeira = dados.alturaAteTubo && Number(dados.alturaAteTubo) > 0
    ? Math.min(Number(dados.alturaAteTubo), Number(dados.altura || 0))
    : Number(dados.altura || 0);
  const alturaBandeiraPc4f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - alturaPortaPc4fComBandeira));
  const larguraBandeiraPc4f = arredondar5cm(Number(dados.largura || 0) / 2);
  const alturaReferenciaPc4f = ehPc4fComBandeira ? alturaPortaPc4fComBandeira : Number(dados.altura || 0);
  const alturaFixaPc4f = arredondar5cm(Math.max(0, alturaReferenciaPc4f - (dados.trilho === "Embutido" ? 40 : 60)));
  const alturaMovelPc4f = arredondar5cm(Math.max(0, alturaReferenciaPc4f - (dados.trilho === "Embutido" ? 0 : 20)));
  const larguraPortaGiro = arredondar5cm(Math.max(0, Number(dados.largura || 0) - 15));
  const alturaPortaGiro = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 15));
  const larguraPortaGiroFixo = arredondar5cm(Math.max(0, (Number(dados.alturaAteTubo || 0) || Number(dados.largura || 0)) - 15));
  const larguraFixoPortaGiro = arredondar5cm(Math.max(0, Number(dados.largura || 0) - (Number(dados.alturaAteTubo || 0) || Number(dados.largura || 0)) - 15));
  const alturaPortaGiroFixo = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 15));
  const larguraPortaGiro2Folhas = arredondar5cm(Math.max(0, (Number(dados.largura || 0) / 2) - 12));
  const alturaPortaGiro2Folhas = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 12));
  const larguraFixos = arredondar5cm(Math.max(0, Number(dados.largura || 0) - 25) / pecasFixos);
  const alturaFixos = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 25));
  const larguraPma2f = arredondar5cm((Number(dados.largura || 0) / 2) + 50);
  const alturaPma2f = arredondar5cm(Number(dados.altura || 0));
  const larguraPma3f = arredondar5cm((Number(dados.largura || 0) + 20) / 3);
  const alturaPma3f = arredondar5cm(Number(dados.altura || 0));
  const larguraPma4f = arredondar5cm((Number(dados.largura || 0) + 30) / 4);
  const alturaPma4f = arredondar5cm(Number(dados.altura || 0));
  const larguraPma5f = arredondar5cm((Number(dados.largura || 0) + 40) / 5);
  const alturaPma5f = arredondar5cm(Number(dados.altura || 0));
  const larguraPma6f = arredondar5cm((Number(dados.largura || 0) + 50) / 6);
  const alturaPma6f = arredondar5cm(Number(dados.altura || 0));
  const larguraPma2f4m = arredondar5cm((Number(dados.largura || 0) + 40) / 6);
  const alturaPma2f4m = arredondar5cm(Number(dados.altura || 0));
  const larguraFixaBox2Fls = arredondar5cm(Number(dados.largura || 0) / 2);
  const larguraMovelBox2Fls = arredondar5cm((Number(dados.largura || 0) / 2) + 50);
  const alturaFixaBox2Fls = arredondar5cm(Math.max(0, Number(dados.altura || 0) - (dados.trilho === "Até o teto" ? 55 : 35)));
  const alturaMovelBox2Fls = arredondar5cm(Math.max(0, Number(dados.altura || 0) - (dados.trilho === "Até o teto" ? 25 : 0)));
  const larguraDeslizante2f = arredondar5cm((Number(dados.largura || 0) + 10) / 2);
  const alturaDeslizante2f = arredondar5cm(Number(dados.altura || 0));
  const larguraDeslizante3f = arredondar5cm((Number(dados.largura || 0) + 20) / 3);
  const alturaDeslizante3f = arredondar5cm(Number(dados.altura || 0));
  const larguraDeslizante4f = arredondar5cm((Number(dados.largura || 0) + 30) / 4);
  const alturaDeslizante4f = arredondar5cm(Number(dados.altura || 0));
  const larguraDeslizante5f = arredondar5cm((Number(dados.largura || 0) + 40) / 5);
  const alturaDeslizante5f = arredondar5cm(Number(dados.altura || 0));
  const larguraDeslizante6f = arredondar5cm((Number(dados.largura || 0) + 50) / 6);
  const alturaDeslizante6f = arredondar5cm(Number(dados.altura || 0));
  const quantidadePecasVidro = ehDeslizante6f ? quantidadeVaos * 6 : ehDeslizante5f ? quantidadeVaos * 5 : ehDeslizante4f ? quantidadeVaos * 4 : ehDeslizante3f ? quantidadeVaos * 3 : ehDeslizante2f ? quantidadeVaos * 2 : ehBoxCanto3f ? quantidadeVaos * 3 : ehBoxCanto ? quantidadeVaos * 4 : ehBox2Fls ? quantidadeVaos * 2 : ehPma2f4m ? quantidadeVaos * 6 : ehPma6f ? quantidadeVaos * 6 : ehPma5f ? quantidadeVaos * 5 : ehPma4f ? quantidadeVaos * 4 : ehPma3f ? quantidadeVaos * 3 : ehPma2f ? quantidadeVaos * 2 : ehMax ? quantidadeVaos * (dados.trinco === "Max Único" ? 1 : 2) : ehFixos ? quantidadeVaos * pecasFixos : ehJc4fComSacada || ehPc4fComBandeira ? quantidadeVaos * 6 : ehPc2fComBandeira || ehJc2fComSacada ? quantidadeVaos * 3 : ehJanelaCorrer4Folhas || ehPc4f ? quantidadeVaos * 4 : ehJanelaCorrer2Folhas || ehPc2f || ehPortaGiro2Folhas || ehPortaGiroFixo ? quantidadeVaos * 2 : ehDuasFolhas ? quantidadeVaos * 2 : quantidadeVaos;
  const maxUnico = dados.trinco === "Max Único";
  const alturaBaseMax = maxUnico ? Number(dados.altura || 0) : Number(dados.altura || 0) / 2;
  const larguraVidroMax = arredondar5cm(Math.max(0, Number(dados.largura || 0) - 12));
  const alturaVidroMax = arredondar5cm(Math.max(0, alturaBaseMax - 12));
  const larguraVidroFixoMax = arredondar5cm(Math.max(0, Number(dados.largura || 0) - 20));
  const alturaVidroFixoMax = arredondar5cm(Math.max(0, alturaBaseMax - 20));
  const larguraBaseVidro = ehDuasFolhas ? Number(dados.largura || 0) / 2 : Number(dados.largura || 0);
  const larguraVidro = arredondar5cm(larguraBaseVidro + 50);
  const alturaVidro = arredondar5cm(Number(dados.altura || 0) + (dados.trilho === "Embutido" ? 70 : 50));
  const areaTotal = ehJc4fComSacada
    ? Number((((larguraFixaJc4fSacada * alturaFixaJc4fSacada * 2 * quantidadeVaos) + (larguraMovelJc4fSacada * alturaMovelJc4fSacada * 2 * quantidadeVaos) + (larguraSacadaJc4f * alturaSacadaJc4f * 2 * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehJc2fComSacada
    ? Number((((larguraFixaJc2fSacada * alturaFixaJc2fSacada * quantidadeVaos) + (larguraMovelJc2fSacada * alturaMovelJc2fSacada * quantidadeVaos) + (larguraSacadaJc2f * alturaSacadaJc2f * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehJanelaCorrer
    ? Number((((larguraFixaJc * alturaFixaJc4f * (ehJanelaCorrer2Folhas ? 1 : 2) * quantidadeVaos) + (larguraMovelJc * alturaMovelJc4f * (ehJanelaCorrer2Folhas ? 1 : 2) * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehDeslizante2f
      ? Number(((larguraDeslizante2f * alturaDeslizante2f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehDeslizante3f
      ? Number(((larguraDeslizante3f * alturaDeslizante3f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehDeslizante4f
      ? Number(((larguraDeslizante4f * alturaDeslizante4f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehDeslizante5f
      ? Number(((larguraDeslizante5f * alturaDeslizante5f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehDeslizante6f
      ? Number(((larguraDeslizante6f * alturaDeslizante6f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehFixos
      ? Number(((larguraFixos * alturaFixos * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehPma2f4m
      ? Number(((larguraPma2f4m * alturaPma2f4m * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehPma6f
      ? Number(((larguraPma6f * alturaPma6f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehPma5f
      ? Number(((larguraPma5f * alturaPma5f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehPma4f
      ? Number(((larguraPma4f * alturaPma4f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehPma3f
      ? Number(((larguraPma3f * alturaPma3f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehPma2f
      ? Number(((larguraPma2f * alturaPma2f * quantidadePecasVidro) / 1_000_000).toFixed(3))
    : ehBoxCanto || ehBoxCanto3f
      ? dados.materiais
        .filter((item) => item.descricao.toLowerCase().includes("vidro") || item.unidade.toLowerCase().includes("m2"))
        .reduce((soma, item) => soma + Number(item.qtd || 0), 0)
    : ehBox2Fls
      ? Number((((larguraFixaBox2Fls * alturaFixaBox2Fls * quantidadeVaos) + (larguraMovelBox2Fls * alturaMovelBox2Fls * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehPc2fComBandeira
      ? Number((((larguraFixaPc2f * alturaFixaPc2f * quantidadeVaos) + (larguraMovelPc2f * alturaMovelPc2f * quantidadeVaos) + (larguraBandeiraPc2f * alturaBandeiraPc2f * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehPc2f
      ? Number((((larguraFixaPc2f * alturaFixaPc2f * quantidadeVaos) + (larguraMovelPc2f * alturaMovelPc2f * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehPc4fComBandeira
      ? Number((((larguraFixaPc4f * alturaFixaPc4f * 2 * quantidadeVaos) + (larguraMovelPc4f * alturaMovelPc4f * 2 * quantidadeVaos) + (larguraBandeiraPc4f * alturaBandeiraPc4f * 2 * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehPc4f
      ? Number((((larguraFixaPc4f * alturaFixaPc4f * 2 * quantidadeVaos) + (larguraMovelPc4f * alturaMovelPc4f * 2 * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehMax
      ? Number((((larguraVidroMax * alturaVidroMax * quantidadeVaos) + (maxUnico ? 0 : larguraVidroFixoMax * alturaVidroFixoMax * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehPortaGiroFixo
      ? Number((((larguraPortaGiroFixo * alturaPortaGiroFixo * quantidadeVaos) + (larguraFixoPortaGiro * alturaPortaGiroFixo * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehPortaGiro2Folhas
      ? Number(((larguraPortaGiro2Folhas * alturaPortaGiro2Folhas * quantidadeVaos * 2) / 1_000_000).toFixed(3))
    : ehPortaGiro
      ? Number(((larguraPortaGiro * alturaPortaGiro * quantidadeVaos) / 1_000_000).toFixed(3))
    : Number(((larguraVidro * alturaVidro * quantidadePecasVidro) / 1_000_000).toFixed(3));
  const total = dados.materiais.reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0);
  const valorVidros = dados.materiais
    .filter((item) => item.descricao.toLowerCase().includes("vidro"))
    .reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0);
  const valorKitPerfis = dados.materiais
    .filter((item) => {
      const descricao = item.descricao.toLowerCase();
      const unidade = item.unidade.toLowerCase();
      return descricao.includes("kit") || unidade.includes("barra") || descricao.includes("perfil") || descricao.includes("tubo") || descricao.includes("cantoneira") || descricao.includes("vt");
    })
    .reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0);
  const valorFerragens = Math.max(0, total - valorVidros - valorKitPerfis);
  const materiaisOrdenados = dados.materiais
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ordemA = ordemMaterialDescricao(a.item.descricao, a.item.unidade);
      const ordemB = ordemMaterialDescricao(b.item.descricao, b.item.unidade);
      return ordemA === ordemB ? a.index - b.index : ordemA - ordemB;
    })
    .map(({ item }) => item);
  const totalVidros = quantidadePecasVidro;
  const nomeProjeto = ehJc4fComSacada
    ? "Janela de correr 4 folhas com sacada inferior"
    : ehJc2fComSacada
    ? "Janela de correr 2 folhas com sacada inferior"
    : ehJanelaCorrer4Folhas
    ? "Janela de correr 4 folhas"
    : ehJanelaCorrer2Folhas
      ? "Janela de correr 2 folhas"
    : ehPc2fComBandeira
      ? "Porta de correr 2 folhas com bandeira"
    : ehPc2f
      ? "Porta de correr 2 folhas"
    : ehPc4fComBandeira
      ? "Porta de correr 4 folhas com bandeira"
    : ehPc4f
      ? "Porta de correr 4 folhas"
    : ehPortaGiroFixo
      ? "Porta de giro com fixo lateral"
    : ehPortaGiro2Folhas
      ? "Porta de giro - 2 folhas"
    : ehPortaGiro
      ? "Porta de giro - 1 folha"
    : ehFixos
      ? "Fixos"
    : ehPma2f4m
      ? "Mão Amiga 2 fixas + 4 móveis"
    : ehPma6f
      ? "Mão Amiga 6 folhas"
    : ehPma5f
      ? "Mão Amiga 5 folhas"
    : ehPma4f
      ? "Mão Amiga 4 folhas"
    : ehPma3f
      ? "Mão Amiga 3 folhas"
    : ehPma2f
      ? "Mão Amiga 2 folhas"
    : ehBoxCanto3f
      ? "Box de canto 3 folhas"
    : ehBoxCanto
      ? "Box de canto"
    : ehBox2Fls
      ? "Box 2 folhas"
    : ehDeslizante2f
      ? "Deslizante 2 folhas"
    : ehDeslizante3f
      ? "Deslizante 3 folhas"
    : ehDeslizante4f
      ? "Deslizante 4 folhas"
    : ehDeslizante5f
      ? "Deslizante 5 folhas"
    : ehDeslizante6f
      ? "Deslizante 6 folhas"
    : ehDuasFolhas
      ? "Porta de correr atrás do vão - 2 folhas"
      : projetoNormalizado.includes("pfv1f")
        ? "Porta de correr atrás do Vão - 1 folha"
    : dados.projeto || "Projeto individual";
  const desenhoFixos = pecasFixos === 1 ? "/desenhos/fixo-1folha.png" : `/desenhos/fixo-${pecasFixos}folhas.png`;
  const desenhoPma2f = String(dados.trilho || "").toLowerCase().includes("kit pia")
    ? "/desenhos/pma-2fs-kitpia.png"
    : dados.puxador === "Com puxador"
      ? "/desenhos/pma-2fs-completo.png"
      : "/desenhos/pma-2fs-simples.png";
  const desenhoPma3f = normalizarTexto(dados.trilho).includes("todas")
    ? dados.puxador === "Com puxador"
      ? "/desenhos/pma-3fs-completo.png"
      : "/desenhos/pma-3fs-simples.png"
    : dados.puxador === "Com puxador"
      ? "/desenhos/pma-12fs-completo.png"
      : "/desenhos/pma-12fs-simples.png";
  const desenhoPma4f = normalizarTexto(dados.trilho).includes("todas")
    ? dados.puxador === "Com puxador"
      ? "/desenhos/pma-4fs-completo.png"
      : "/desenhos/pma-4fs-simples.png"
    : dados.puxador === "Com puxador"
      ? "/desenhos/pma-13fs-completo.png"
      : "/desenhos/pma-13fs-simples.png";
  const desenhoPma5f = normalizarTexto(dados.trilho).includes("todas")
    ? dados.puxador === "Com puxador"
      ? "/desenhos/pma-5fs-completo.png"
      : "/desenhos/pma-5fs-simples.png"
    : dados.puxador === "Com puxador"
      ? "/desenhos/pma-14fs-completo.png"
      : "/desenhos/pma-14fs-simples.png";
  const desenhoPma6f = normalizarTexto(dados.trilho).includes("todas")
    ? dados.puxador === "Com puxador"
      ? "/desenhos/pma-6fs-completo.png"
      : "/desenhos/pma-6fs-simples.png"
    : dados.puxador === "Com puxador"
      ? "/desenhos/pma-15fs-completo.png"
      : "/desenhos/pma-15fs-simples.png";
  const desenhoPma2f4m = dados.puxador === "Com puxador"
    ? "/desenhos/pma-24fs-completo.png"
    : "/desenhos/pma-24fs-simples.png";
  const modeloBoxNormalizado = normalizarTexto(dados.trinco);
  const desenhoBox2Fls = modeloBoxNormalizado.includes("evidence") || modeloBoxNormalizado.includes("elegance")
    ? dados.puxador === "Com puxador"
      ? "/desenhos/box-eleganceduplo.png"
      : "/desenhos/box-elegancesimples.png"
    : dados.puxador === "Com puxador"
      ? "/desenhos/box-padraopuxador.png"
      : "/desenhos/box-padrao.png";
  const desenhoDeslizante2f = normalizarTexto(dados.trinco).includes("inteiro")
    ? dados.puxador === "Com puxador"
      ? "/desenhos/deslizante-2fls-ci-completo.png"
      : "/desenhos/deslizante-2fls-ci-simples.png"
    : dados.puxador === "Com puxador"
      ? "/desenhos/deslizante-2fls-cs-completo.png"
      : "/desenhos/deslizante-2fls-cs-simples.png";
  const desenhoDeslizante3f = normalizarTexto(dados.trilho).includes("fixo")
    ? normalizarTexto(dados.trinco).includes("inteiro")
      ? dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-12fls-ci-completo.png"
        : "/desenhos/deslizante-12fls-ci-simples.png"
      : dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-12fls-cs-completo.png"
        : "/desenhos/deslizante-12fls-cs-simples.png"
    : normalizarTexto(dados.trinco).includes("inteiro")
      ? dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-3fls-ci-completo.png"
        : "/desenhos/deslizante-3fls-ci-simples.png"
      : dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-3fls-cs-completo.png"
        : "/desenhos/deslizante-3fls-cs-simples.png";
  const desenhoDeslizante4f = normalizarTexto(dados.trilho).includes("fixo")
    ? normalizarTexto(dados.trinco).includes("inteiro")
      ? dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-13fls-ci-completo.png"
        : "/desenhos/deslizante-13fls-ci-simples.png"
      : dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-13fls-cs-completo.png"
        : "/desenhos/deslizante-13fls-cs-simples.png"
    : normalizarTexto(dados.trinco).includes("inteiro")
      ? dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-4fls-ci-completo.png"
        : "/desenhos/deslizante-4fls-ci-simples.png"
      : dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-4fls-cs-completo.png"
        : "/desenhos/deslizante-4fls-cs-simples.png";
  const desenhoDeslizante5f = normalizarTexto(dados.trilho).includes("fixo")
    ? normalizarTexto(dados.trinco).includes("inteiro")
      ? dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-14fls-ci-completo.png"
        : "/desenhos/deslizante-14fls-ci-simples.png"
      : dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-14fls-cs-completo.png"
        : "/desenhos/deslizante-14fls-cs-simples.png"
    : normalizarTexto(dados.trinco).includes("inteiro")
      ? dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-5fls-ci-completo.png"
        : "/desenhos/deslizante-5fls-ci-simples.png"
      : dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-5fls-cs-completo.png"
        : "/desenhos/deslizante-5fls-cs-simples.png";
  const desenhoDeslizante6f = normalizarTexto(dados.trilho).includes("fixo")
    ? normalizarTexto(dados.trinco).includes("inteiro")
      ? dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-15fls-ci-completo.png"
        : "/desenhos/deslizante-15fls-ci-simples.png"
      : dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-15fls-cs-completo.png"
        : "/desenhos/deslizante-15fls-cs-simples.png"
    : normalizarTexto(dados.trinco).includes("inteiro")
      ? dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-6fls-ci-completo.png"
        : "/desenhos/deslizante-6fls-ci-simples.png"
      : dados.puxador === "Com puxador"
        ? "/desenhos/deslizante-6fls-cs-completo.png"
        : "/desenhos/deslizante-6fls-cs-simples.png";
  const desenhoSrc = ehFixos
    ? desenhoFixos
    : ehBoxCanto3f
      ? dados.puxador === "Com puxador"
        ? "/desenhos/box-canto3fcp.png"
        : "/desenhos/box-canto3f.png"
    : ehBoxCanto
      ? dados.puxador === "Com puxador"
        ? "/desenhos/box-canto4fpd.png"
        : "/desenhos/box-canto4f.png"
    : ehBox2Fls
      ? desenhoBox2Fls
    : ehDeslizante2f
      ? desenhoDeslizante2f
    : ehDeslizante3f
      ? desenhoDeslizante3f
    : ehDeslizante4f
      ? desenhoDeslizante4f
    : ehDeslizante5f
      ? desenhoDeslizante5f
    : ehDeslizante6f
      ? desenhoDeslizante6f
    : ehPma2f4m
      ? desenhoPma2f4m
    : ehPma6f
      ? desenhoPma6f
    : ehPma5f
      ? desenhoPma5f
    : ehPma4f
      ? desenhoPma4f
    : ehPma3f
      ? desenhoPma3f
    : ehPma2f
      ? desenhoPma2f
    : ehJc4fComSacada
      ? dados.trinco === "Com trinco"
        ? "/desenhos/janela-bct-trinco-4fls.png"
        : "/desenhos/janela-bst-trinco-4fls.png"
    : ehJc2fComSacada
      ? dados.trinco === "Com trinco"
        ? "/desenhos/janela-bct-trinco-2fls.png"
        : "/desenhos/janela-bst-trinco-2fls.png"
    : ehJanelaCorrer4Folhas
    ? dados.trinco === "Com trinco"
      ? "/desenhos/janela4fls-comtrinco.png"
      : "/desenhos/janela4fls-semtrinco.png"
    : ehJanelaCorrer2Folhas
      ? dados.trinco === "Com trinco"
        ? "/desenhos/projeto2f-trinco.png"
        : "/desenhos/projeto2f-simples.png"
    : ehPc2fComBandeira
      ? dados.puxador === "Com puxador"
        ? "/desenhos/portaband2fls-completa.png"
        : dados.trinco !== "Sem trinco"
          ? "/desenhos/portaband2fls-simples.png"
          : "/desenhos/portaband2fls.png"
    : ehPc4fComBandeira
      ? dados.puxador === "Com puxador" && String(dados.trinco || "").includes("+ 1520")
        ? "/desenhos/portaband4fls-completa.png"
        : dados.puxador === "Com puxador" && dados.trinco !== "Sem trinco"
          ? "/desenhos/portaband4fls-puxadoretrinco.png"
          : dados.puxador === "Com puxador"
            ? "/desenhos/portaband4fls-puxador.png"
            : String(dados.trinco || "").includes("+ 1520")
              ? "/desenhos/portaband4fls-trincoechave.png"
              : dados.trinco !== "Sem trinco"
                ? "/desenhos/portaband4fls-trinco.png"
                : "/desenhos/portaband4fls-simples.png"
    : ehPc2f
      ? dados.puxador === "Com puxador" && dados.trinco !== "Sem trinco"
        ? "/desenhos/projeto2fls-trincoepuxador.png"
        : dados.puxador === "Com puxador"
          ? "/desenhos/projeto2f-puxador.png"
          : "/desenhos/projeto2f-simples.png"
    : ehPc4f
      ? dados.puxador === "Com puxador" && dados.trinco !== "Sem trinco"
        ? "/desenhos/porta4fls-completo.png"
        : dados.puxador === "Com puxador"
          ? "/desenhos/porta4fls-puxador.png"
          : dados.trinco !== "Sem trinco"
            ? "/desenhos/porta4fls-comtrincos.png"
            : "/desenhos/porta4fls-simples.png"
    : ehMax
      ? dados.trinco === "Max com tubo"
        ? "/desenhos/max-tubo.png"
        : dados.trinco === "Max bandeira"
          ? "/desenhos/max-unica vv.png"
          : dados.trinco === "Max V/V"
            ? "/desenhos/max-vv.png"
            : "/desenhos/max-unica.png"
    : ehPortaGiroFixo
      ? normalizarTexto(dados.trinco).includes("vidro / vidro") || normalizarTexto(dados.trinco).includes("vidro vidro")
        ? dados.trilho === "1520TA"
          ? dados.puxador === "Com puxador"
            ? "/desenhos/pgf-macpuxador.png"
            : "/desenhos/pgf-mac.png"
          : dados.puxador === "Com puxador"
            ? "/desenhos/pgf-simplespuxador.png"
            : "/desenhos/pgf-simples.png"
        : dados.trilho === "1520TA"
          ? dados.puxador === "Com puxador"
            ? "/desenhos/pg-macpuxador.png"
            : "/desenhos/pg-mac.png"
          : dados.puxador === "Com puxador"
            ? "/desenhos/pg-simplespuxador.png"
            : "/desenhos/pg-simples.png"
    : ehPortaGiro2Folhas
      ? dados.puxador === "Com puxador"
        ? "/desenhos/portagiro-2flscompleto.png"
        : "/desenhos/portagiro-2fls.png"
    : ehPortaGiro
      ? String(dados.trinco || "").toLowerCase().includes("dobradi")
        ? dados.trilho === "Sem fechadura"
          ? "/desenhos/portagirodob-1flssimples.png"
          : dados.trilho === "1520TA" && dados.puxador === "Com puxador"
            ? "/desenhos/portagirodob-1fls1520tacompleto.png"
            : dados.trilho === "1520TA"
              ? "/desenhos/portagirodob-1fls1520ta.png"
              : dados.puxador === "Com puxador"
                ? "/desenhos/portagirodob-1flscompleto.png"
                : "/desenhos/portagirodob-1fls.png"
        : dados.trilho === "1520TA" && dados.puxador === "Com puxador"
          ? "/desenhos/portagiro-1fls1520tacompleto.png"
          : dados.trilho === "1520TA"
            ? "/desenhos/portagiro-1fls1520ta.png"
            : dados.puxador === "Com puxador"
              ? "/desenhos/portagiro-1flscompleto.png"
              : "/desenhos/portagiro-1fls.png"
    : dados.puxador === "Com puxador"
      ? ehDuasFolhas
        ? "/desenhos/portaforavao-2flscompleto.png"
        : "/desenhos/portaforavao-1flscompleto.png"
      : ehDuasFolhas
        ? "/desenhos/portaforavao-2fls.png"
        : "/desenhos/portaforavao-1fls.png";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoUrl} style={styles.logoEmpresa} />
            ) : (
              <>
                <View style={styles.logoBox}>
                  <Text style={styles.logoText}>GV</Text>
                </View>
                <View>
                  <Text style={styles.brandName}>Logo da empresa</Text>
                  <Text style={styles.brandSub}>Projetos em vidros e ferragens</Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.headerMetaWrap}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Nº Orçamento</Text>
              <Text style={[styles.metaValue, styles.metaGreen]}>{dados.numero || "-"}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Data</Text>
              <Text style={[styles.metaValue, styles.metaGreen]}>{dados.data || "-"}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Cliente</Text>
              <Text style={[styles.metaValue, styles.metaGreen]}>{dados.cliente || "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.titleLabel}>Projeto</Text>
          <Text style={styles.title}>{nomeProjeto}</Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.card, styles.drawingCard]}>
            <Text style={styles.sectionTitle}>Desenho ilustrativo</Text>
            <View style={styles.titleLine} />
            <View style={styles.drawingBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={desenhoSrc} style={styles.drawingImage} />
            </View>
          </View>

          <View style={[styles.card, styles.dataCard]}>
            <Text style={styles.sectionTitle}>Dados do projeto</Text>
            <View style={styles.titleLine} />
            <View style={styles.dataGrid}>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>{ehBoxCanto || ehBoxCanto3f ? "Largura A" : "Largura"}</Text>
                <Text style={styles.dataValue}>{dados.largura || 0} mm</Text>
              </View>
              {ehBoxCanto || ehBoxCanto3f ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Largura B</Text>
                  <Text style={styles.dataValue}>{dados.alturaAteTubo || 0} mm</Text>
                </View>
              ) : null}
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Altura</Text>
                <Text style={styles.dataValue}>{dados.altura || 0} mm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Quantidade</Text>
                <Text style={styles.dataValue}>{dados.quantidade || 0}</Text>
              </View>
              {ehPortaGiroFixo ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Largura da porta</Text>
                  <Text style={styles.dataValue}>{dados.alturaAteTubo || 0} mm</Text>
                </View>
              ) : null}
              {ehPc2fComBandeira || ehPc4fComBandeira || ehJanelaComSacada ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>{ehJanelaComSacada ? "Altura da sacada" : "Altura até o tubo"}</Text>
                  <Text style={styles.dataValue}>{dados.alturaAteTubo || 0} mm</Text>
                </View>
              ) : null}
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>{ehJanelaComSacada ? "Vidro janela" : ehPc2fComBandeira || ehPc4fComBandeira ? "Vidro porta" : "Cor do vidro"}</Text>
                <Text style={styles.dataValue}>{dados.vidro || "-"}</Text>
              </View>
              {ehPc2fComBandeira || ehPc4fComBandeira || ehJanelaComSacada ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>{ehJanelaComSacada ? "Vidro sacada" : "Vidro bandeira"}</Text>
                  <Text style={styles.dataValue}>{dados.vidroBandeira || "-"}</Text>
                </View>
              ) : null}
              {!ehJanelaCorrer && !ehFixos && !ehMax ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>{ehBox2Fls ? "Altura" : ehPma || ehDeslizante2f || ehDeslizante3f || ehDeslizante4f || ehDeslizante5f || ehDeslizante6f ? "Projeto" : ehPortaGiro ? "Fechadura" : "Trilho"}</Text>
                  <Text style={styles.dataValue}>{dados.trilho || "-"}</Text>
                </View>
              ) : null}
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>{ehPortaGiro || ehFixos || ehPma || ehDeslizante2f || ehDeslizante3f || ehDeslizante4f || ehDeslizante5f || ehDeslizante6f ? "Cor do material" : "Cor do kit"}</Text>
                <Text style={styles.dataValue}>{dados.corKit || "-"}</Text>
              </View>
              {ehPc2fComBandeira || ehPc4fComBandeira || ehJanelaComSacada || (ehMax && dados.trinco === "Max com tubo") ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Tubo</Text>
                  <Text style={styles.dataValue}>{dados.tuboPerfil || "-"}</Text>
                </View>
              ) : null}
              {ehFixos ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Divisão</Text>
                  <Text style={styles.dataValue}>{pecasFixos} peça(s)</Text>
                </View>
              ) : null}
              {!ehJanelaCorrer && !ehFixos && !ehMax ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Puxador</Text>
                  <Text style={styles.dataValue}>{dados.puxador || "-"}</Text>
                </View>
              ) : null}
              {!ehJanelaCorrer && !ehFixos && !ehMax ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Tamanho do puxador</Text>
                  <Text style={styles.dataValue}>{dados.tamanhoPuxador || "-"}</Text>
                </View>
              ) : null}
              {!ehFixos ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>{ehMax ? "Projeto" : ehBox2Fls ? "Modelo do kit" : ehDeslizante2f || ehDeslizante3f || ehDeslizante4f || ehDeslizante5f || ehDeslizante6f ? "Carrinho" : ehPma ? "Roldana" : ehPortaGiroFixo ? "Projeto" : ehPortaGiro ? "Ferragens" : "Trinco"}</Text>
                  <Text style={styles.dataValue}>{dados.trinco || "-"}</Text>
                </View>
              ) : null}
              {ehPortaGiroFixo ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Ferragens</Text>
                  <Text style={styles.dataValue}>{dados.observacao || "Padrão"}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.tableCard}>
          <Text style={styles.sectionTitle}>Relação de materiais</Text>
          <View style={styles.titleLine} />
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colQtd]}>Qtd</Text>
            <Text style={[styles.th, styles.colDesc]}>Produto / descrição</Text>
            <Text style={[styles.th, styles.colUn]}>Unidade</Text>
            <Text style={[styles.th, styles.colValor]}>Valor unit.</Text>
            <Text style={[styles.th, styles.colValor]}>Valor total</Text>
          </View>
          {materiaisOrdenados.map((item) => (
            <View key={item.id} style={styles.tr} wrap={false}>
              <Text style={[styles.td, styles.colQtd]}>{quantidade(item.qtd, item.unidade)}</Text>
              <Text style={[styles.td, styles.colDesc]}>{item.descricao}</Text>
              <Text style={[styles.td, styles.colUn]}>{item.unidade}</Text>
              <Text style={[styles.td, styles.colValor]}>{moeda(item.valorUnitario)}</Text>
              <Text style={[styles.td, styles.colValor]}>{moeda(Number(item.qtd || 0) * Number(item.valorUnitario || 0))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary} wrap={false}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Area total</Text>
            <Text style={styles.summaryValue}>{numero(areaTotal)} m2</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Qtd. Peças</Text>
            <Text style={styles.summaryValue}>{numero(totalVidros)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Valor de vidro</Text>
            <Text style={styles.summaryValue}>{moeda(valorVidros)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Valor kit/perfis</Text>
            <Text style={styles.summaryValue}>{moeda(valorKitPerfis)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Valor ferragens</Text>
            <Text style={styles.summaryValue}>{moeda(valorFerragens)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Valor total</Text>
            <Text style={styles.summaryValue}>{moeda(total)}</Text>
          </View>
        </View>
        <Text style={styles.footer}>Projeto individual gerado pelo Glass Code</Text>
      </Page>
    </Document>
  );
}
