//app/relatorios/sacadatorre/SacadaTorrePDF.tsx
"use client";

import React from "react";
import { DesenhoSacadaTorrePDF } from "./DesenhoSacadaTorrePDF";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
import { PDF_COLORS, buildPdfFooterText } from "../shared/pdfLayout";

type SacadaTorrePDFProps = {
  avisosMedida?: string[];
  nomeEmpresa: string;
  logoUrl?: string | null;
  tituloDocumento?: string;
  numeroOrcamento?: string;
  nomeCliente: string;
  nomeObra: string;
  larguraVaoMm: number;
  alturaVaoMm: number;
  quantidadeVaos: number;
  divisoesPorVao: number;
  torresPorVidro: number;
  corPerfil: string;
  vidroDescricao: string;
  torreDescricao: string;
  medidaVidro: string;
  areaTotal: number;
  totalVidro: number;
  totalAcessorios: number;
  totalGeral: number;
  materiais: ProjetoIndividualMaterial[];
  desenhoUrl: string;
};

const fmtMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtNumero = (valor: number, casas = 2) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 36,
    paddingBottom: 54,
    backgroundColor: PDF_COLORS.white,
    color: PDF_COLORS.ink,
    fontFamily: "Inter",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerText: { flex: 1, paddingRight: 18 },
  title: { fontSize: 15, color: PDF_COLORS.ink, fontWeight: "bold", textTransform: "uppercase" },
   subtitle: { fontSize: 8, color: PDF_COLORS.muted, marginTop: 5 },
  logo: { width: 118, height: 42, objectFit: "contain", objectPosition: "right" },
  infoStrip: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  infoBox: { flex: 1 },
  label: { fontSize: 6.5, color: PDF_COLORS.muted, textTransform: "uppercase", marginBottom: 3 },
  value: { fontSize: 9, color: PDF_COLORS.ink, fontWeight: "normal" },
  valueStrong: { fontSize: 9, color: PDF_COLORS.ink, fontWeight: "bold" },
  mainGrid: { flexDirection: "column", gap: 10, marginBottom: 12 },
  drawingBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderRadius: 8,
    padding: 8,
    backgroundColor: PDF_COLORS.white,
  },
  drawingTitle: { fontSize: 9, color: PDF_COLORS.ink, fontWeight: "bold", marginBottom: 6 },
  drawing: { width: "100%", height: 170, objectFit: "contain" },
  dataBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderRadius: 8,
    padding: 8,
    backgroundColor: PDF_COLORS.white,
  },
  dataTitle: { fontSize: 9, color: PDF_COLORS.ink, fontWeight: "bold", marginBottom: 7 },
  dataGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dataItem: {
    width: "31.8%",
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 5,
    minHeight: 30,
  },
  dataItemWide: {
    width: "48%",
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 5,
    minHeight: 30,
  },
  sectionTitle: { fontSize: 10, color: PDF_COLORS.ink, fontWeight: "bold", marginTop: 4, marginBottom: 6 },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderRadius: 7,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    minHeight: 24,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    minHeight: 22,
    alignItems: "center",
    backgroundColor: PDF_COLORS.panelBg,
  },
  th: { padding: 5, fontSize: 6.5, color: PDF_COLORS.ink, textTransform: "uppercase", fontWeight: "bold" },
  td: { padding: 5, fontSize: 7, color: PDF_COLORS.ink },
  colQtd: { width: "12%", textAlign: "center" },
  colDesc: { width: "46%" },
  colUn: { width: "11%", textAlign: "center" },
  colUnit: { width: "15%", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },
  totals: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 10,
  },
  totalBox: { flex: 1 },
  totalLabel: { fontSize: 6.5, color: PDF_COLORS.muted, textTransform: "uppercase", marginBottom: 3 },
  totalValue: { fontSize: 10, color: PDF_COLORS.ink, fontWeight: "normal" },
  totalValueStrong: { fontSize: 13, color: PDF_COLORS.ink, fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 7,
    color: PDF_COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 8,
  },
});

export function SacadaTorrePDF({
  avisosMedida = [],
  nomeEmpresa,
  logoUrl,
  tituloDocumento = "Orçamento Sacada com Torre",
  numeroOrcamento,
  nomeCliente,
  nomeObra,
  larguraVaoMm,
  alturaVaoMm,
  quantidadeVaos,
  divisoesPorVao,
  torresPorVidro,
  corPerfil,
  vidroDescricao,
  torreDescricao,
  medidaVidro,
  areaTotal,
  totalVidro,
  totalAcessorios,
  totalGeral,
  materiais,
  desenhoUrl,
}: SacadaTorrePDFProps) {

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{tituloDocumento}</Text>
            <Text style={styles.subtitle}>
              {numeroOrcamento ? `Nº orçamento: ${numeroOrcamento} - ` : ""}Emissão: {new Date().toLocaleDateString("pt-BR")}
            </Text>
          </View>
          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : <Text style={styles.title}>{nomeEmpresa}</Text>}
        </View>

        <View style={styles.infoStrip}>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.valueStrong}>{nomeCliente || "Nao informado"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Obra / Referencia</Text>
            <Text style={styles.value}>{nomeObra || "Geral"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Projeto</Text>
            <Text style={styles.value}>Sacada com torre</Text>
          </View>
        </View>

        <View style={styles.mainGrid} wrap={false}>
          <View style={styles.drawingBox}>
            <Text style={styles.drawingTitle}>Vista frontal</Text>
            <DesenhoSacadaTorrePDF desenhoUrl={desenhoUrl} larguraVaoMm={larguraVaoMm} alturaVaoMm={alturaVaoMm} divisoesPorVao={divisoesPorVao} torresPorVidro={torresPorVidro} />
          </View>

          <View style={styles.dataBox}>
            <Text style={styles.dataTitle}>Dados do projeto</Text>
            <View style={styles.dataGrid}>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Largura do vao</Text>
                <Text style={styles.value}>{larguraVaoMm} mm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Altura do vao</Text>
                <Text style={styles.value}>{alturaVaoMm} mm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Quantidade</Text>
                <Text style={styles.value}>{quantidadeVaos}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Divisoes</Text>
                <Text style={styles.value}>{divisoesPorVao}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Torres por vidro</Text>
                <Text style={styles.value}>{torresPorVidro}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Cor do material</Text>
                <Text style={styles.value}>{corPerfil || "Nao selecionada"}</Text>
              </View>
              <View style={styles.dataItemWide}>
                <Text style={styles.label}>Vidro</Text>
                <Text style={styles.value}>{vidroDescricao}</Text>
              </View>
              <View style={styles.dataItemWide}>
                <Text style={styles.label}>Torre</Text>
                <Text style={styles.value}>{torreDescricao}</Text>
              </View>
              <View style={styles.dataItemWide}>
                <Text style={styles.label}>Medida do vidro</Text>
                <Text style={styles.value}>{medidaVidro}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Relacao de materiais</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.th, styles.colQtd]}>Qtd</Text>
            <Text style={[styles.th, styles.colDesc]}>Descricao</Text>
            <Text style={[styles.th, styles.colUn]}>Und</Text>
            <Text style={[styles.th, styles.colUnit]}>Valor unit.</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {materiais.map((material, index) => {
            const qtd = Number(material.qtd || 0);
            const unit = Number(material.valorUnitario || 0);
            const unidade = String(material.unidade || "");
            const unidadeNormalizada = unidade
  .toLowerCase()
  .replace(/Â/g, "")
  .trim();

const casasQtd =
  unidadeNormalizada.includes("m2") ||
  unidadeNormalizada.includes("m²")
    ? 3
    : 0;

            return (
              <View key={`${material.id}-${index}`} style={styles.row}>
                <Text style={[styles.td, styles.colQtd]}>{fmtNumero(qtd, casasQtd)}</Text>
                <Text style={[styles.td, styles.colDesc]}>{material.descricao}</Text>
                <Text style={[styles.td, styles.colUn]}>{material.unidade}</Text>
                <Text style={[styles.td, styles.colUnit]}>{fmtMoeda(unit)}</Text>
                <Text style={[styles.td, styles.colTotal]}>{fmtMoeda(qtd * unit)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Área total</Text>
            <Text style={styles.totalValue}>
  {fmtNumero(areaTotal, 3)} m²
</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor de vidro</Text>
            <Text style={styles.totalValue}>{fmtMoeda(totalVidro)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor ferragens</Text>
            <Text style={styles.totalValue}>{fmtMoeda(totalAcessorios)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor total</Text>
            <Text style={styles.totalValueStrong}>{fmtMoeda(totalGeral)}</Text>
          </View>
        </View>

        {(avisosMedida).map(aviso => <Text key={aviso} style={{ fontSize: 7, color: "#416F88", marginTop: 5 }}>{aviso}</Text>)}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa || "Glass Code", pageNumber, totalPages)}
        />
      </Page>
    </Document>
  );
}
