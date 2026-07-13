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
  const ehJanelaCorrer4Folhas = projetoNormalizado.includes("jc4f") || projetoNormalizado.includes("janela de correr 4");
  const ehJanelaCorrer2Folhas = projetoNormalizado.includes("jc2f") || projetoNormalizado.includes("janela de correr 2");
  const ehJanelaCorrer = ehJanelaCorrer4Folhas || ehJanelaCorrer2Folhas;
  const ehPc2f = projetoNormalizado.includes("pc2f") || projetoNormalizado.includes("porta de correr 2 folhas");
  const ehPc4f = projetoNormalizado.includes("pc4f") || projetoNormalizado.includes("porta de correr 4 folhas");
  const ehPortaGiro = projetoNormalizado.includes("pg") || projetoNormalizado.includes("porta de giro");
  const ehDuasFolhas = projetoNormalizado.includes("pfv2f") || projetoNormalizado.includes("2 folhas");
  const quantidadeVaos = Number(dados.quantidade || 0);
  const larguraFixaJc = arredondar5cm(Number(dados.largura || 0) / (ehJanelaCorrer2Folhas ? 2 : 4));
  const alturaFixaJc4f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 60));
  const larguraMovelJc = arredondar5cm(larguraFixaJc + 50);
  const alturaMovelJc4f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 20));
  const larguraFixaPc2f = arredondar5cm(Number(dados.largura || 0) / 2);
  const larguraMovelPc2f = arredondar5cm(larguraFixaPc2f + 50);
  const alturaFixaPc2f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - (dados.trilho === "Embutido" ? 40 : 60)));
  const alturaMovelPc2f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - (dados.trilho === "Embutido" ? 0 : 20)));
  const larguraFixaPc4f = arredondar5cm(Number(dados.largura || 0) / 4);
  const larguraMovelPc4f = arredondar5cm(larguraFixaPc4f + 50);
  const alturaFixaPc4f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - (dados.trilho === "Embutido" ? 40 : 60)));
  const alturaMovelPc4f = arredondar5cm(Math.max(0, Number(dados.altura || 0) - (dados.trilho === "Embutido" ? 0 : 20)));
  const larguraPortaGiro = arredondar5cm(Math.max(0, Number(dados.largura || 0) - 15));
  const alturaPortaGiro = arredondar5cm(Math.max(0, Number(dados.altura || 0) - 15));
  const quantidadePecasVidro = ehJanelaCorrer4Folhas || ehPc4f ? quantidadeVaos * 4 : ehJanelaCorrer2Folhas || ehPc2f ? quantidadeVaos * 2 : ehDuasFolhas ? quantidadeVaos * 2 : quantidadeVaos;
  const larguraBaseVidro = ehDuasFolhas ? Number(dados.largura || 0) / 2 : Number(dados.largura || 0);
  const larguraVidro = arredondar5cm(larguraBaseVidro + 50);
  const alturaVidro = arredondar5cm(Number(dados.altura || 0) + (dados.trilho === "Embutido" ? 70 : 50));
  const areaTotal = ehJanelaCorrer
    ? Number((((larguraFixaJc * alturaFixaJc4f * (ehJanelaCorrer2Folhas ? 1 : 2) * quantidadeVaos) + (larguraMovelJc * alturaMovelJc4f * (ehJanelaCorrer2Folhas ? 1 : 2) * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehPc2f
      ? Number((((larguraFixaPc2f * alturaFixaPc2f * quantidadeVaos) + (larguraMovelPc2f * alturaMovelPc2f * quantidadeVaos)) / 1_000_000).toFixed(3))
    : ehPc4f
      ? Number((((larguraFixaPc4f * alturaFixaPc4f * 2 * quantidadeVaos) + (larguraMovelPc4f * alturaMovelPc4f * 2 * quantidadeVaos)) / 1_000_000).toFixed(3))
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
  const nomeProjeto = ehJanelaCorrer4Folhas
    ? "Janela de correr 4 folhas"
    : ehJanelaCorrer2Folhas
      ? "Janela de correr 2 folhas"
    : ehPc2f
      ? "Porta de correr 2 folhas"
    : ehPc4f
      ? "Porta de correr 4 folhas"
    : ehPortaGiro
      ? "Porta de giro - 1 folha"
    : ehDuasFolhas
      ? "Porta de correr atrás do vão - 2 folhas"
      : projetoNormalizado.includes("pfv1f")
        ? "Porta de correr atrás do Vão - 1 folha"
    : dados.projeto || "Projeto individual";
  const desenhoSrc = ehJanelaCorrer4Folhas
    ? dados.trinco === "Com trinco"
      ? "/desenhos/janela4fls-comtrinco.png"
      : "/desenhos/janela4fls-semtrinco.png"
    : ehJanelaCorrer2Folhas
      ? dados.trinco === "Com trinco"
        ? "/desenhos/projeto2f-trinco.png"
        : "/desenhos/projeto2f-simples.png"
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
              <Text style={styles.metaLabel}>Nº orçamento</Text>
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
                <Text style={styles.dataLabel}>Largura</Text>
                <Text style={styles.dataValue}>{dados.largura || 0} mm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Altura</Text>
                <Text style={styles.dataValue}>{dados.altura || 0} mm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Quantidade</Text>
                <Text style={styles.dataValue}>{dados.quantidade || 0}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Cor do vidro</Text>
                <Text style={styles.dataValue}>{dados.vidro || "-"}</Text>
              </View>
              {!ehJanelaCorrer ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>{ehPortaGiro ? "Fechadura" : "Trilho"}</Text>
                  <Text style={styles.dataValue}>{dados.trilho || "-"}</Text>
                </View>
              ) : null}
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>{ehPortaGiro ? "Cor do material" : "Cor do kit"}</Text>
                <Text style={styles.dataValue}>{dados.corKit || "-"}</Text>
              </View>
              {!ehJanelaCorrer ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Puxador</Text>
                  <Text style={styles.dataValue}>{dados.puxador || "-"}</Text>
                </View>
              ) : null}
              {!ehJanelaCorrer ? (
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Tamanho do puxador</Text>
                  <Text style={styles.dataValue}>{dados.tamanhoPuxador || "-"}</Text>
                </View>
              ) : null}
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>{ehPortaGiro ? "Ferragens" : "Trinco"}</Text>
                <Text style={styles.dataValue}>{dados.trinco || "-"}</Text>
              </View>
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
