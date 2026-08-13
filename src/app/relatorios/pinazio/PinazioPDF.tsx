"use client";

import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import {
  PDF_COLORS,
  PDF_HEADER_LAYOUT,
  PDF_TABLE_LAYOUT,
  buildPdfFooterText,
  getPdfZebraRowBackground,
} from "../shared/pdfLayout";
import MiniProjetoPinazioPDF from "@/components/desenhos/MiniProjetoPinazioPDF";

export interface ItemPinazioPDF {
  id?: number | string;
  descricao: string;
  medidas?: string;
  largura?: number;
  altura?: number;
  larguraReal?: number;
  alturaReal?: number;
  quantidade: number;
  divisoesLargura: number;
  divisoesAltura: number;
  metroLinearPinazio?: number;
  metroLinearPinazioTotal?: number;
  valorVidro?: number;
  valorPinazio?: number;
  pinazioId?: string;
  pinazioNome?: string;
  pinazioCor?: "branco" | "preto" | "nogal";
  precoMetroPinazio?: number;
  designUrl?: string;
  desenhoUrl?: string;
  total: number;
}

interface PinazioPDFProps {
  itens: ItemPinazioPDF[];
  nomeEmpresa: string;
  numeroOrcamento?: string;
  themeColor: string;
  textColor?: string;
  nomeCliente?: string;
  nomeObra?: string;
  logoUrl?: string;
  valorTotal?: number;
}

const formatarMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatarMetroLinear = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatarM2 = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const obterMedidas = (item: ItemPinazioPDF) => {
  if (item.medidas) return item.medidas;

  const largura = Number(item.larguraReal || item.largura || 0);
  const altura = Number(item.alturaReal || item.altura || 0);

  return `${largura}x${altura}`;
};

const obterAreaVidro = (item: ItemPinazioPDF) => {
  const medidas = String(item.medidas || "").match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
  const largura = Number(item.larguraReal || item.largura || medidas?.[1]?.replace(",", ".") || 0);
  const altura = Number(item.alturaReal || item.altura || medidas?.[2]?.replace(",", ".") || 0);
  const quantidade = Math.max(1, Number(item.quantidade || 1));

  return (largura * altura * quantidade) / 1_000_000;
};

const obterMetroLinearTotal = (item: ItemPinazioPDF) => {
  if (Number(item.metroLinearPinazioTotal || 0) > 0) {
    return Number(item.metroLinearPinazioTotal || 0);
  }

  return (
    Number(item.metroLinearPinazio || 0) *
    Math.max(1, Number(item.quantidade || 1))
  );
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: PDF_COLORS.white,
    fontFamily: "Helvetica",
    color: PDF_COLORS.ink,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 12,
    borderBottomWidth: 0.8,
  },
  headerLeft: {
    flexDirection: "column",
    flex: 1,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    maxWidth: 240,
  },
  tituloRelatorio: {
    fontSize: 14,
    fontWeight: "bold",
    color: PDF_COLORS.ink,
  },
  subtitulo: {
    fontSize: 7.8,
    marginTop: 4,
    fontWeight: "normal",
    color: PDF_COLORS.muted,
  },
  dataEmissao: {
    fontSize: 8,
    color: PDF_COLORS.muted,
    marginTop: 3,
  },
  logo: {
    width: PDF_HEADER_LAYOUT.logoWidth,
    height: PDF_HEADER_LAYOUT.logoHeight,
    objectFit: "contain",
    objectPosition: "left",
  },
  empresaFallback: { fontSize: 15, color: PDF_COLORS.ink, fontWeight: "bold" },
  empresaSlogan: { fontSize: 7.5, color: PDF_COLORS.muted, marginTop: 2 },
  infoSection: { marginBottom: 14, borderWidth: 0.8, borderColor: PDF_COLORS.borderLight, borderRadius: 6 },
  infoRow: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: PDF_COLORS.borderLight },
  infoRowLast: { flexDirection: "row" },
  infoBoxQuarter: {
    width: "25%",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRightWidth: 0.8,
    borderRightColor: PDF_COLORS.borderLight,
  },
  infoBoxHalfBorder: {
    width: "50%",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRightWidth: 0.8,
    borderRightColor: PDF_COLORS.borderLight,
  },
  infoBoxLast: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  label: {
    fontSize: 6.4,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 3,
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 9,
    fontWeight: "normal",
    color: PDF_COLORS.ink,
  },
  table: {
    width: "100%",
    borderTopWidth: 0.8,
    borderTopColor: "#CBD5E1",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderBottomColor: "#CBD5E1",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.7,
    borderBottomColor: PDF_COLORS.borderLight,
    alignItems: "center",
    minHeight: 72,
  },
  tableColHeader: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    color: "#334155",
    fontSize: PDF_TABLE_LAYOUT.headerFontSize,
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  tableCol: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    fontSize: PDF_TABLE_LAYOUT.bodyFontSize,
    color: PDF_COLORS.ink,
  },
  colImagem: {
    width: "17%",
    alignItems: "center",
    justifyContent: "center",
  },
  colDesc: {
    width: "31%",
  },
  colMedidas: {
    width: "16%",
    textAlign: "center",
  },
  colQtd: {
    width: "9%",
    textAlign: "center",
  },
  colMetro: {
    width: "10%",
    textAlign: "right",
  },
  colTotal: {
    width: "17%",
    textAlign: "right",
  },
  detalhePinazio: {
    marginTop: 2,
    fontSize: 6.4,
    color: PDF_COLORS.muted,
    lineHeight: 1.25,
  },
  summaryContainer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 0.8,
    borderTopColor: "#CBD5E1",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  summaryGroup: { flexDirection: "row", gap: 14 },
  summaryItem: { flexDirection: "column", alignItems: "flex-start" },
  summaryLabel: { fontSize: 6.2, color: PDF_COLORS.muted, textTransform: "uppercase", marginBottom: 2, letterSpacing: 0.5 },
  summaryValue: { fontSize: 9.4, fontWeight: "bold", color: PDF_COLORS.ink },
  totalFinalBox: { textAlign: "right" },
  totalFinalLabel: { fontSize: 6.5, color: PDF_COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  totalFinalValue: { fontSize: 14, fontWeight: "bold", color: PDF_COLORS.ink, marginTop: 3 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 7,
    color: PDF_COLORS.softMuted,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.borderLight,
    paddingTop: 8,
  },
});

export function PinazioPDF({
  itens,
  nomeEmpresa,
  logoUrl,
  nomeCliente,
  nomeObra,
  numeroOrcamento,
  valorTotal,
}: PinazioPDFProps) {
  const dataGeracao = new Date().toLocaleDateString("pt-BR");

  const totalCalculado = itens.reduce(
    (soma, item) => soma + Number(item.total || 0),
    0
  );

  const totalGeral =
    typeof valorTotal === "number" ? valorTotal : totalCalculado;

  const totalMetroLinear = itens.reduce(
    (soma, item) => soma + obterMetroLinearTotal(item),
    0
  );

  const totalPecas = itens.reduce(
    (soma, item) => soma + Math.max(1, Number(item.quantidade || 1)),
    0
  );

  const metragemVidros = itens.reduce(
    (soma, item) => soma + obterAreaVidro(item),
    0
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View
          style={[
            styles.header,
            {
              marginRight: 10,
              borderBottomColor: PDF_COLORS.border,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <View>
                <Text style={styles.empresaFallback}>{nomeEmpresa || "Glass Code"}</Text>
                <Text style={styles.empresaSlogan}>Soluções em Vidros e Ferragens</Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.tituloRelatorio}>Orçamento de Pinázio</Text>
            <Text style={styles.subtitulo}>Composição comercial de peças, medidas e pinázios</Text>
            {numeroOrcamento ? (
              <Text style={styles.subtitulo}>Nº Orçamento: {numeroOrcamento}</Text>
            ) : (
              <Text style={styles.subtitulo}>{nomeEmpresa}</Text>
            )}
            <Text style={styles.dataEmissao}>Emissão em: {dataGeracao}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoBoxQuarter}>
              <Text style={styles.label}>Orçamento</Text>
              <Text style={styles.value}>{numeroOrcamento || "-"}</Text>
            </View>
            <View style={styles.infoBoxHalfBorder}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{nomeCliente || "Não informado"}</Text>
            </View>
            <View style={styles.infoBoxLast}>
              <Text style={styles.label}>Data</Text>
              <Text style={styles.value}>{dataGeracao}</Text>
            </View>
          </View>
          <View style={styles.infoRowLast}>
            <View style={styles.infoBoxLast}>
              <Text style={styles.label}>Obra / referência</Text>
              <Text style={styles.value}>{nomeObra || "Geral"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colImagem]}>Desenho</Text>
            <Text style={[styles.tableColHeader, styles.colDesc]}>Descrição</Text>
            <Text style={[styles.tableColHeader, styles.colMedidas]}>Medidas</Text>
            <Text style={[styles.tableColHeader, styles.colQtd]}>Qtd</Text>
            <Text style={[styles.tableColHeader, styles.colMetro]}>ML</Text>
            <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
          </View>

          {itens.map((item, index) => (
            <View
              key={item.id || index}
              wrap={false}
              style={[
                styles.tableRow,
                { backgroundColor: getPdfZebraRowBackground(index) },
              ]}
            >
              <View style={[styles.tableCol, styles.colImagem]}>
                <MiniProjetoPinazioPDF
                  largura={Number(item.larguraReal || item.largura || String(item.medidas || "").split("x")[0]) || 100}
                  altura={Number(item.alturaReal || item.altura || String(item.medidas || "").split("x")[1]) || 100}
                  divisoesLargura={Number(item.divisoesLargura || 1)}
                  divisoesAltura={Number(item.divisoesAltura || 1)}
                  cor={item.pinazioCor || "branco"}
                  width={78}
                  height={58}
                />
              </View>

              <View style={[styles.tableCol, styles.colDesc]}>
                <Text style={{ color: PDF_COLORS.ink }}>
                  {item.descricao}
                </Text>

                {item.pinazioId === "sem-pinazio" ||
                obterMetroLinearTotal(item) <= 0 ? (
                  <Text style={styles.detalhePinazio}>
                    Sem Pinázio - cálculo somente do vidro
                  </Text>
                ) : (
                  <>
                    <Text style={styles.detalhePinazio}>
                      {item.pinazioNome || "Pinázio"}
                      {Number(item.precoMetroPinazio || 0) > 0 ? ` - ${formatarMoeda(Number(item.precoMetroPinazio))}/ml`
                        : ""}
                    </Text>

                    <Text style={styles.detalhePinazio}>
                      Divisões: {Math.max(1, Number(item.divisoesLargura || 1))} x {Math.max(1, Number(item.divisoesAltura || 1))}
                      {` | Pinázio: ${formatarMetroLinear(obterMetroLinearTotal(item))} ml`}
                    </Text>
                  </>
                )}
              </View>

              <Text
                style={[
                  styles.tableCol,
                  styles.colMedidas,
                  { color: PDF_COLORS.ink },
                ]}
              >
                {obterMedidas(item)} mm
              </Text>

              <Text
                style={[
                  styles.tableCol,
                  styles.colQtd,
                  { color: PDF_COLORS.ink },
                ]}
              >
                {Math.max(1, Number(item.quantidade || 1))}
              </Text>

              <Text
                style={[
                  styles.tableCol,
                  styles.colMetro,
                  { color: PDF_COLORS.ink },
                ]}
              >
                {formatarMetroLinear(obterMetroLinearTotal(item))}
              </Text>

              <Text
                style={[
                  styles.tableCol,
                  styles.colTotal,
                  {
                    color: PDF_COLORS.ink,
                    fontWeight: "bold",
                  },
                ]}
              >
                {formatarMoeda(item.total)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryGroup}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Qtd. Peças</Text>
              <Text style={styles.summaryValue}>{totalPecas} un</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Metragem</Text>
              <Text style={styles.summaryValue}>{formatarM2(metragemVidros)} m²</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pinázio</Text>
              <Text style={styles.summaryValue}>{formatarMetroLinear(totalMetroLinear)} ml</Text>
            </View>
          </View>
          <View style={styles.totalFinalBox}>
            <Text style={styles.totalFinalLabel}>Valor total do orçamento</Text>
            <Text style={styles.totalFinalValue}>{formatarMoeda(totalGeral)}</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)
          }
          fixed
        />
      </Page>
    </Document>
  );
}

