"use client";
import React from "react";
import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";
import { PDF_HEADER_LAYOUT, PDF_TABLE_LAYOUT, buildPdfFooterText, getPdfZebraRowBackground } from "../shared/pdfLayout";

interface PerfilPDF {
  nome: string;
  codigo: string;
  corEncontrada: string;
  comprimentoTotal: number;
  quantidadeBarras: number;
  precoBarra: number;
  valorTotal: number;
}

interface AcessorioPDF {
  nome: string;
  codigo: string;
  corEncontrada: string;
  quantidade: number;
  quantidadePacote?: number;
  pacote?: number;
  precoUnitario: number;
  valorTotal: number;
}

interface SacadaFrontalPDFProps {
  nomeEmpresa: string;
  logoUrl?: string | null;
  themeColor: string;
  textColor?: string;
  nomeCliente: string;
  nomeObra: string;
  larguraVaoMm: number;
  alturaVaoMm: number;
  quantidadeVaos: number;
  divisoesPorVao: number;
  corPerfil: string;
  vidroDescricao: string;
  medidaVidro: string;
  areaTotal: number;
  totalVidro: number;
  perfis: PerfilPDF[];
  acessorios: AcessorioPDF[];
  totalPerfis: number;
  totalAcessorios: number;
  totalGeral: number;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: PDF_HEADER_LAYOUT.marginBottom,
    paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
    borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
  },
  headerLeft: { flexDirection: "column", flex: 1 },
  titulo: { fontSize: PDF_HEADER_LAYOUT.titleSize, fontWeight: "bold", textTransform: "uppercase" },
  data: { fontSize: PDF_HEADER_LAYOUT.dateSize, color: "#666", marginTop: 6 },
  logo: { width: PDF_HEADER_LAYOUT.logoWidth, height: PDF_HEADER_LAYOUT.logoHeight, objectFit: "contain", objectPosition: "right" },

  infoSection: { flexDirection: "row", marginBottom: 16 },
  infoBox: { flex: 1, backgroundColor: "#F9FAFB", padding: 10, borderRadius: 6, borderLeftWidth: 3 },
  label: { fontSize: 6, color: "#999", textTransform: "uppercase", marginBottom: 3, fontWeight: "bold" },
  value: { fontSize: 10, fontWeight: "bold", color: "#1C415B" },

  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 18, marginBottom: 6 },

  table: { width: "100%", marginTop: 4 },
  tableHeader: { flexDirection: "row" },
  tableRow: { flexDirection: "row", borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth, borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor, alignItems: "center", minHeight: 26 },
  thCell: { padding: 5, color: "#FFFFFF", fontSize: PDF_TABLE_LAYOUT.headerFontSize, fontWeight: "bold", textTransform: "uppercase" },
  tdCell: { padding: 5, fontSize: PDF_TABLE_LAYOUT.bodyFontSize, color: "#1C415B" },

  summaryContainer: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  summaryItem: { flexDirection: "column", alignItems: "flex-start" },
  summaryLabel: { fontSize: 6, color: "#999", textTransform: "uppercase", marginBottom: 2 },
  summaryValue: { fontSize: 10, fontWeight: "bold", color: "#1C415B" },
  totalBox: { textAlign: "right" },
  totalLabel: { fontSize: 7, color: "#999", textTransform: "uppercase" },
  totalValue: { fontSize: 16, fontWeight: "bold" },

  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999", paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#DDD" },
});

export function SacadaFrontalPDF({
  nomeEmpresa, logoUrl, themeColor, textColor, nomeCliente, nomeObra,
  larguraVaoMm, alturaVaoMm, quantidadeVaos, divisoesPorVao, corPerfil,
  vidroDescricao, medidaVidro, areaTotal, totalVidro,
  perfis, acessorios, totalPerfis, totalAcessorios, totalGeral,
}: SacadaFrontalPDFProps) {
  const c = textColor || themeColor;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColor }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.titulo, { color: themeColor }]}>Orçamento Sacada Frontal</Text>
            <Text style={styles.data}>Emissão em: {new Date().toLocaleDateString("pt-BR")}</Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>

        {/* Info boxes */}
        <View style={styles.infoSection}>
          <View style={[styles.infoBox, { marginRight: 8, borderLeftColor: themeColor }]}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={[styles.value, { color: c }]}>{nomeCliente || "Não informado"}</Text>
          </View>
          <View style={[styles.infoBox, { marginRight: 8, borderLeftColor: themeColor }]}>
            <Text style={styles.label}>Obra / Referência</Text>
            <Text style={[styles.value, { color: c }]}>{nomeObra || "Geral"}</Text>
          </View>
          <View style={[styles.infoBox, { borderLeftColor: themeColor }]}>
            <Text style={styles.label}>Configuração</Text>
            <Text style={[styles.value, { color: c }]}>{larguraVaoMm}x{alturaVaoMm}mm · {quantidadeVaos} vão(s) · {divisoesPorVao} div.</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.infoBox, { marginRight: 8, borderLeftColor: themeColor }]}>
            <Text style={styles.label}>Vidro</Text>
            <Text style={[styles.value, { color: c }]}>{vidroDescricao}</Text>
          </View>
          <View style={[styles.infoBox, { marginRight: 8, borderLeftColor: themeColor }]}>
            <Text style={styles.label}>Medida do vidro</Text>
            <Text style={[styles.value, { color: c }]}>{medidaVidro}</Text>
          </View>
          <View style={[styles.infoBox, { borderLeftColor: themeColor }]}>
            <Text style={styles.label}>Cor dos perfis</Text>
            <Text style={[styles.value, { color: c }]}>{corPerfil}</Text>
          </View>
        </View>

        {/* Perfis */}
        <Text style={[styles.sectionTitle, { color: themeColor }]}>Perfis de Alumínio</Text>
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: themeColor }]}>
            <Text style={[styles.thCell, { width: "30%" }]}>Perfil</Text>
            <Text style={[styles.thCell, { width: "14%", textAlign: "center" }]}>Código</Text>
            <Text style={[styles.thCell, { width: "14%", textAlign: "right" }]}>Compr. (mm)</Text>
            <Text style={[styles.thCell, { width: "10%", textAlign: "right" }]}>Barras</Text>
            <Text style={[styles.thCell, { width: "16%", textAlign: "right" }]}>Preço barra</Text>
            <Text style={[styles.thCell, { width: "16%", textAlign: "right" }]}>Total</Text>
          </View>
          {perfis.map((p, i) => (
            <View key={`p-${i}`} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(i) }]}>
              <Text style={[styles.tdCell, { width: "30%", fontWeight: "bold" }]}>{p.nome}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]}>{p.codigo}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "right" }]}>{p.comprimentoTotal.toLocaleString("pt-BR")}</Text>
              <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{p.quantidadeBarras}</Text>
              <Text style={[styles.tdCell, { width: "16%", textAlign: "right" }]}>{fmt(p.precoBarra)}</Text>
              <Text style={[styles.tdCell, { width: "16%", textAlign: "right", fontWeight: "bold" }]}>{fmt(p.valorTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Acessórios */}
        <Text style={[styles.sectionTitle, { color: themeColor }]}>Acessórios / Ferragens</Text>
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: themeColor }]}>
            <Text style={[styles.thCell, { width: "30%" }]}>Acessório</Text>
            <Text style={[styles.thCell, { width: "14%", textAlign: "center" }]}>Código</Text>
            <Text style={[styles.thCell, { width: "14%", textAlign: "center" }]}>Cor</Text>
            <Text style={[styles.thCell, { width: "10%", textAlign: "right" }]}>Qtd</Text>
            <Text style={[styles.thCell, { width: "16%", textAlign: "right" }]}>Preço un.</Text>
            <Text style={[styles.thCell, { width: "16%", textAlign: "right" }]}>Total</Text>
          </View>
          {acessorios.map((a, i) => (
            <View key={`a-${i}`} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(i) }]}>
              <Text style={[styles.tdCell, { width: "30%", fontWeight: "bold" }]}>{a.nome}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]}>{a.codigo}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]}>{a.corEncontrada}</Text>
              <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{a.quantidadePacote ?? a.quantidade}</Text>
              <Text style={[styles.tdCell, { width: "16%", textAlign: "right" }]}>{fmt(a.precoUnitario)}</Text>
              <Text style={[styles.tdCell, { width: "16%", textAlign: "right", fontWeight: "bold" }]}>{fmt(a.valorTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Resumo */}
        <View style={styles.summaryContainer}>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Área total de vidro</Text>
              <Text style={[styles.summaryValue, { color: c }]}>{areaTotal.toFixed(3)} m²</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total vidro</Text>
              <Text style={[styles.summaryValue, { color: c }]}>{fmt(totalVidro)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total perfis</Text>
              <Text style={[styles.summaryValue, { color: c }]}>{fmt(totalPerfis)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total acessórios</Text>
              <Text style={[styles.summaryValue, { color: c }]}>{fmt(totalAcessorios)}</Text>
            </View>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor Total</Text>
            <Text style={[styles.totalValue, { color: themeColor }]}>{fmt(totalGeral)}</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)}
          fixed
        />
      </Page>
    </Document>
  );
}
