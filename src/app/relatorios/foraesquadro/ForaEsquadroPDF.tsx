"use client";

import React from "react";
import { Document, Image, Line, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { buildPdfFooterText } from "../shared/pdfLayout";

export type ForaEsquadroPecaPDF = {
  indice: number;
  largura: number;
  alturaEsquerda: number;
  alturaDireita: number;
  queda: number;
  larguraCalculo?: number;
  alturaCalculo?: number;
  area: number;
};

type ForaEsquadroPDFProps = {
  nomeEmpresa: string;
  logoUrl?: string | null;
  largura: number;
  alturaInicial: number;
  alturaFinal: number;
  quantidade: number;
  divisoes: number;
  pecas: ForaEsquadroPecaPDF[];
  areaPorVao: number;
  areaTotal: number;
  cliente?: string;
  vidro?: string;
  precoM2?: number;
  valorTotal?: number;
};

const fmtMm = (valor: number) => `${Math.round(Number(valor || 0)).toLocaleString("pt-BR")} mm`;
const fmtM2 = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 36,
    paddingBottom: 44,
    backgroundColor: "#ffffff",
    color: "#153047",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#d9e2ea",
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerBrand: { width: 165, paddingRight: 18 },
  headerText: { flex: 1, alignItems: "flex-end" },
  title: { fontSize: 15, color: "#153047", fontWeight: "bold", textTransform: "uppercase" },
  subtitle: { fontSize: 8, color: "#6f8193", marginTop: 5, textAlign: "right" },
  logo: { width: 118, height: 42, objectFit: "contain", objectPosition: "left" },
  brandFallback: { fontSize: 16, color: "#153047", fontWeight: "bold" },
  brandSlogan: { fontSize: 7.5, color: "#6f8193", marginTop: 3 },
  infoStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderWidth: 1,
    borderColor: "#dce5ed",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  infoBox: { width: "23.7%" },
  infoBoxWide: { width: "48.5%" },
  label: { fontSize: 6.5, color: "#718398", textTransform: "uppercase", marginBottom: 3 },
  value: { fontSize: 9, color: "#153047", fontWeight: "normal" },
  drawingBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dce5ed",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#ffffff",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 10, color: "#153047", fontWeight: "bold", marginBottom: 7 },
  drawing: { width: "100%", height: 250 },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dce5ed",
    borderRadius: 7,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    minHeight: 22,
    alignItems: "center",
    backgroundColor: "#f3f6f9",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e8eef3",
    minHeight: 24,
    alignItems: "center",
  },
  th: { padding: 5, fontSize: 6.5, color: "#153047", textTransform: "uppercase", fontWeight: "bold" },
  td: { padding: 5, fontSize: 7, color: "#153047" },
  colPeca: { width: "12%" },
  colMedida: { width: "18%" },
  colAltura: { width: "18%" },
  colQueda: { width: "15%" },
  colArea: { width: "19%", textAlign: "right" },
  totals: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#dce5ed",
    paddingTop: 10,
  },
  totalBox: { flex: 1 },
  totalLabel: { fontSize: 6.5, color: "#718398", textTransform: "uppercase", marginBottom: 3 },
  totalValue: { fontSize: 10, color: "#153047", fontWeight: "normal" },
  totalValueStrong: { fontSize: 12, color: "#153047", fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 7,
    color: "#8a9aab",
    borderTopWidth: 0.5,
    borderTopColor: "#dce5ed",
    paddingTop: 8,
  },
});

function DesenhoPDF({
  largura,
  alturaInicial,
  alturaFinal,
  divisoes,
  pecas,
}: Pick<ForaEsquadroPDFProps, "largura" | "alturaInicial" | "alturaFinal" | "divisoes" | "pecas">) {
  const svgW = 500;
  const svgH = 240;
  const padX = 58;
  const padTop = 34;
  const padBottom = 54;
  const drawW = svgW - padX * 2;
  const maxAltura = Math.max(alturaInicial, alturaFinal, 1);
  const drawH = svgH - padTop - padBottom;
  const x0 = padX;
  const yBase = padTop + drawH;
  const yInicial = yBase - (alturaInicial / maxAltura) * drawH;
  const yFinal = yBase - (alturaFinal / maxAltura) * drawH;
  const totalDivisoes = Math.max(1, Math.min(12, Math.floor(divisoes || 1)));
  const panelW = drawW / totalDivisoes;
  const pathVidro = `M ${x0} ${yBase} L ${x0 + drawW} ${yBase} L ${x0 + drawW} ${yFinal} L ${x0} ${yInicial} Z`;
  const yTopoEm = (index: number) => yInicial + (yFinal - yInicial) * (index / totalDivisoes);

  return (
    <Svg width="100%" height={250} viewBox={`0 0 ${svgW} ${svgH}`}>
      <Rect x={0} y={0} width={svgW} height={svgH} rx={12} fill="#f8fafc" />
      <Path d={pathVidro} fill="#e3f3fa" stroke="#b9c9d4" strokeWidth={1.4} />
      <Path d={pathVidro} fill="none" stroke="#e4eef4" strokeWidth={6.8} opacity={0.95} />
      <Path d={pathVidro} fill="none" stroke="#b9c9d4" strokeWidth={0.9} opacity={0.78} />
      <Line x1={x0 + 22} y1={yInicial + 22} x2={x0 + drawW * 0.68} y2={yTopoEm(totalDivisoes * 0.68) + 28} stroke="#ffffff" strokeWidth={5.2} opacity={0.22} />
      <Line x1={x0 + drawW * 0.38} y1={yTopoEm(totalDivisoes * 0.38) + 32} x2={x0 + drawW - 34} y2={yFinal + 42} stroke="#ffffff" strokeWidth={4} opacity={0.24} />

      {Array.from({ length: Math.max(totalDivisoes - 1, 0) }, (_, index) => {
        const posicao = index + 1;
        const x = x0 + panelW * posicao;
        const yTop = yTopoEm(posicao);
        const altura = pecas[index]?.alturaDireita ?? 0;
        const yTexto = Math.max(14, yTop - 6);

        return (
          <React.Fragment key={posicao}>
            <Line x1={x} y1={yTop} x2={x} y2={yBase} stroke="#b9c9d4" strokeWidth={1} />
            <Text x={x + 4} y={yTexto} style={{ fontSize: 8, fill: "#153047" }}>
              {Math.round(altura)}
            </Text>
          </React.Fragment>
        );
      })}

      <Line x1={x0} y1={yBase + 20} x2={x0 + drawW} y2={yBase + 20} stroke="#2086e8" strokeWidth={0.9} />
      <Line x1={x0} y1={yBase + 14} x2={x0} y2={yBase + 26} stroke="#2086e8" strokeWidth={0.9} />
      <Line x1={x0 + drawW} y1={yBase + 14} x2={x0 + drawW} y2={yBase + 26} stroke="#2086e8" strokeWidth={0.9} />
      <Text x={x0 + drawW / 2 - 28} y={yBase + 36} style={{ fontSize: 10, fill: "#153047" }}>
        {fmtMm(largura)}
      </Text>

      <Text x={x0 + 7} y={(yInicial + yBase) / 2} style={{ fontSize: 9, fill: "#153047" }}>
        {fmtMm(alturaInicial)}
      </Text>
      <Text x={x0 + drawW - 34} y={(yFinal + yBase) / 2} style={{ fontSize: 9, fill: "#153047" }}>
        {fmtMm(alturaFinal)}
      </Text>
    </Svg>
  );
}

export function ForaEsquadroPDF({
  nomeEmpresa,
  logoUrl,
  largura,
  alturaInicial,
  alturaFinal,
  quantidade,
  divisoes,
  pecas,
  areaPorVao,
  areaTotal,
  cliente,
  vidro,
  precoM2,
  valorTotal,
}: ForaEsquadroPDFProps) {
  const data = new Date().toLocaleDateString("pt-BR");
  const quedaTotal = alturaInicial - alturaFinal;
  const quedaPorDivisao = quedaTotal / Math.max(1, divisoes || 1);
  const temCalculoPreco = Boolean(vidro && Number(precoM2 || 0) > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            {logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <>
                <Text style={styles.brandFallback}>{nomeEmpresa}</Text>
                <Text style={styles.brandSlogan}>Soluções em Vidros e Ferragens</Text>
              </>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Calculo de vidro fora de esquadro</Text>
            <Text style={styles.subtitle}>Alturas por divisao, area das pecas e desenho tecnico do vao</Text>
          </View>
        </View>

        <View style={styles.infoStrip}>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Data</Text>
            <Text style={styles.value}>{data}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Largura</Text>
            <Text style={styles.value}>{fmtMm(largura)}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Altura inicial</Text>
            <Text style={styles.value}>{fmtMm(alturaInicial)}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Altura final</Text>
            <Text style={styles.value}>{fmtMm(alturaFinal)}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Quantidade</Text>
            <Text style={styles.value}>{quantidade || 1} vao(s)</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Divisoes</Text>
            <Text style={styles.value}>{divisoes || 1} peca(s)</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Queda total</Text>
            <Text style={styles.value}>{fmtMm(Math.abs(quedaTotal))}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Queda por divisao</Text>
            <Text style={styles.value}>{fmtMm(Math.abs(quedaPorDivisao))}</Text>
          </View>
        </View>

        {temCalculoPreco ? (
          <View style={styles.infoStrip}>
            <View style={styles.infoBoxWide}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{cliente || "-"}</Text>
            </View>
            <View style={styles.infoBoxWide}>
              <Text style={styles.label}>Vidro</Text>
              <Text style={styles.value}>{vidro}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Preço por m²</Text>
              <Text style={styles.value}>{moeda(precoM2 || 0)}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Area cobrada</Text>
              <Text style={styles.value}>{fmtM2(areaTotal)} m²</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Valor total</Text>
              <Text style={styles.value}>{moeda(valorTotal || 0)}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.drawingBox} wrap={false}>
          <Text style={styles.sectionTitle}>Desenho ilustrativo</Text>
          <View style={styles.drawing}>
            <DesenhoPDF largura={largura} alturaInicial={alturaInicial} alturaFinal={alturaFinal} divisoes={divisoes} pecas={pecas} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Relacao das pecas</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.th, styles.colPeca]}>Peca</Text>
            <Text style={[styles.th, styles.colMedida]}>Largura</Text>
            <Text style={[styles.th, styles.colAltura]}>Alt. esq.</Text>
            <Text style={[styles.th, styles.colAltura]}>Alt. dir.</Text>
            <Text style={[styles.th, styles.colQueda]}>Queda</Text>
            <Text style={[styles.th, styles.colArea]}>Area</Text>
          </View>

          {pecas.map((peca) => (
            <View key={peca.indice} style={styles.row} wrap={false}>
              <Text style={[styles.td, styles.colPeca]}>Peca {peca.indice}</Text>
              <Text style={[styles.td, styles.colMedida]}>{fmtMm(peca.largura)}</Text>
              <Text style={[styles.td, styles.colAltura]}>{fmtMm(peca.alturaEsquerda)}</Text>
              <Text style={[styles.td, styles.colAltura]}>{fmtMm(peca.alturaDireita)}</Text>
              <Text style={[styles.td, styles.colQueda]}>{fmtMm(Math.abs(peca.queda))}</Text>
              <Text style={[styles.td, styles.colArea]}>{fmtM2(peca.area)} m²</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Area por vao</Text>
            <Text style={styles.totalValue}>{fmtM2(areaPorVao)} m²</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Quantidade de vãos</Text>
            <Text style={styles.totalValue}>{quantidade || 1}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Área total</Text>
            <Text style={styles.totalValueStrong}>{fmtM2(areaTotal)} m²</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa || "Glass Code", pageNumber, totalPages)}
        />
      </Page>
    </Document>
  );
}
