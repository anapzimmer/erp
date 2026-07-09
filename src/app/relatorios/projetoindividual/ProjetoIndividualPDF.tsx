"use client";

import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, Svg, Rect, Line, Path } from "@react-pdf/renderer";

export type ProjetoIndividualMaterial = {
  id: string;
  qtd: number;
  unidade: string;
  descricao: string;
  valorUnitario: number;
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

const styles = StyleSheet.create({
  page: {
    padding: 28,
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
    marginBottom: 8,
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
  headerMetaWrap: { flexDirection: "row", gap: 10, flex: 2, justifyContent: "flex-end" },
  metaBox: { borderLeftWidth: 1, borderLeftColor: "#dbe4ee", paddingLeft: 10, minWidth: 80 },
  metaLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  metaValue: { fontSize: 10, color: "#0f2742", fontWeight: "bold" },
  metaGreen: { color: "#009b55" },
  titleRow: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    marginBottom: 14,
  },
  titleLabel: { fontSize: 8, color: "#64748b", textTransform: "uppercase" },
  title: { fontSize: 18, color: "#0f2742", fontWeight: "bold", marginTop: 3 },
  grid: { flexDirection: "row", gap: 12, marginBottom: 14 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 8,
  },
  drawingCard: { width: "36%" },
  dataCard: { width: "64%" },
  sectionTitle: { fontSize: 10, color: "#0f2742", fontWeight: "bold", textTransform: "uppercase" },
  titleLine: { width: 22, height: 2, backgroundColor: "#00a85a", marginTop: 8, marginBottom: 12 },
  drawingBox: { height: 210, alignItems: "center", justifyContent: "center" },
  drawingCaption: { fontSize: 7, color: "#64748b", marginTop: 8 },
  dataGrid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  dataItem: {
    width: "50%",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  dataLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  dataValue: { fontSize: 12, color: "#0f2742", fontWeight: "bold" },
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
  colQtd: { width: "12%", textAlign: "center" },
  colDesc: { width: "46%" },
  colUn: { width: "12%", textAlign: "center" },
  colValor: { width: "15%", textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 10, gap: 14 },
  totalLabel: { fontSize: 10, color: "#0f2742", fontWeight: "bold" },
  totalValue: {
    backgroundColor: "#10b981",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 7,
  },
  summary: { flexDirection: "row", gap: 8, marginTop: 14 },
  summaryBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 9,
    padding: 10,
  },
  summaryLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase" },
  summaryValue: { fontSize: 13, color: "#0f2742", fontWeight: "bold", marginTop: 4 },
  footer: { position: "absolute", left: 28, right: 28, bottom: 14, fontSize: 7, color: "#94a3b8", textAlign: "center" },
});

export function ProjetoIndividualPDF({ dados, logoUrl }: ProjetoIndividualPDFProps) {
  const areaTotal = (Number(dados.largura || 0) * Number(dados.altura || 0) * Number(dados.quantidade || 0)) / 1_000_000;
  const total = dados.materiais.reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0);
  const totalItens = dados.materiais.reduce((soma, item) => soma + Number(item.qtd || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logoEmpresa} />
            ) : (
              <>
                <View style={styles.logoBox}>
                  <Text style={styles.logoText}>GV</Text>
                </View>
                <View>
                  <Text style={styles.brandName}>Logo da empresa</Text>
                  <Text style={styles.brandSub}>Projetos em Vidros e Ferragens</Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.headerMetaWrap}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>N orçamento</Text>
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
          <Text style={styles.title}>{dados.projeto || "Projeto individual"}</Text>
        </View>

        <View style={styles.grid}>
          <View style={[styles.card, styles.drawingCard]}>
            <Text style={styles.sectionTitle}>Desenho ilustrativo</Text>
            <View style={styles.titleLine} />
            <View style={styles.drawingBox}>
              <Svg width="170" height="250" viewBox="0 0 170 250">
                <Rect x="28" y="18" width="114" height="198" fill="#f8fafc" stroke="#0f2742" strokeWidth="1.5" />
                <Rect x="28" y="18" width="52" height="198" fill="#ffffff" stroke="#0f2742" strokeWidth="1" />
                {Array.from({ length: 16 }).map((_, row) =>
                  Array.from({ length: 5 }).map((__, col) => (
                    <Rect
                      key={`b-${row}-${col}`}
                      x={31 + col * 9.5 + (row % 2 ? 4.5 : 0)}
                      y={22 + row * 11.5}
                      width="9"
                      height="5"
                      fill="#ffffff"
                      stroke="#94a3b8"
                      strokeWidth="0.35"
                    />
                  ))
                )}
                <Rect x="82" y="22" width="56" height="190" fill="#e8f7ff" stroke="#0f2742" strokeWidth="1" />
                <Path d="M88 190 L132 128" stroke="#ffffff" strokeWidth="5" opacity="0.65" />
                <Path d="M88 142 L132 80" stroke="#ffffff" strokeWidth="5" opacity="0.45" />
                <Rect x="132" y="107" width="7" height="28" fill="#ffffff" stroke="#0f2742" strokeWidth="1" />
                <Line x1="28" y1="220" x2="142" y2="220" stroke="#0f2742" strokeWidth="3" />
                <Line x1="28" y1="12" x2="142" y2="12" stroke="#1d8bd1" strokeWidth="0.7" />
                <Line x1="28" y1="8" x2="28" y2="16" stroke="#1d8bd1" strokeWidth="0.7" />
                <Line x1="142" y1="8" x2="142" y2="16" stroke="#1d8bd1" strokeWidth="0.7" />
                <Line x1="148" y1="18" x2="148" y2="216" stroke="#1d8bd1" strokeWidth="0.7" />
                <Line x1="144" y1="18" x2="152" y2="18" stroke="#1d8bd1" strokeWidth="0.7" />
                <Line x1="144" y1="216" x2="152" y2="216" stroke="#1d8bd1" strokeWidth="0.7" />
              </Svg>
              <Text style={styles.drawingCaption}>{dados.largura || 0} mm x {dados.altura || 0} mm</Text>
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
                <Text style={styles.dataLabel}>Trilho</Text>
                <Text style={styles.dataValue}>{dados.trilho || "-"}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Altura</Text>
                <Text style={styles.dataValue}>{dados.altura || 0} mm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Vidro</Text>
                <Text style={styles.dataValue}>{dados.vidro || "-"}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Quantidade</Text>
                <Text style={styles.dataValue}>{dados.quantidade || 0}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Cor do kit</Text>
                <Text style={styles.dataValue}>{dados.corKit || "-"}</Text>
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
          {dados.materiais.map((item) => (
            <View key={item.id} style={styles.tr}>
              <Text style={[styles.td, styles.colQtd]}>{numero(item.qtd)}</Text>
              <Text style={[styles.td, styles.colDesc]}>{item.descricao}</Text>
              <Text style={[styles.td, styles.colUn]}>{item.unidade}</Text>
              <Text style={[styles.td, styles.colValor]}>{moeda(item.valorUnitario)}</Text>
              <Text style={[styles.td, styles.colValor]}>{moeda(Number(item.qtd || 0) * Number(item.valorUnitario || 0))}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Valor total do orçamento</Text>
            <Text style={styles.totalValue}>{moeda(total)}</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Área total</Text>
            <Text style={styles.summaryValue}>{numero(areaTotal)} m2</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total de itens</Text>
            <Text style={styles.summaryValue}>{numero(totalItens)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Valor total</Text>
            <Text style={styles.summaryValue}>{moeda(total)}</Text>
          </View>
        </View>

        {dados.observacao ? (
          <Text style={[styles.footer, { bottom: 26 }]}>{dados.observacao}</Text>
        ) : null}
        <Text style={styles.footer}>Projeto individual gerado pelo Glass Code</Text>
      </Page>
    </Document>
  );
}
