"use client";
import React from "react";
import { Page, Text, View, Document, StyleSheet, Image, Svg, Rect, Line, G } from "@react-pdf/renderer";
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
  larguraVidroMm?: number;
  alturaVidroMm?: number;
  numeroOrcamento?: string;
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

  clientObraBox: {
    backgroundColor: "#EFEFEF",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  clientObraLine: {
    flexDirection: "row",
    gap: 12,
  },
  clientObraItem: { flex: 1 },
  plainInfoList: {
    marginBottom: 12,
    gap: 4,
  },
  plainInfoText: {
    fontSize: 9,
    color: "#1C415B",
  },
  label: { fontSize: 6, color: "#999", textTransform: "uppercase", marginBottom: 3, fontWeight: "bold" },
  value: { fontSize: 10, fontWeight: "bold", color: "#1C415B" },

  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 18, marginBottom: 6 },

  table: { width: "100%", marginTop: 4 },
  tableHeader: { flexDirection: "row", minHeight: 20 },
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
  numeroOrcamento,
  larguraVaoMm, alturaVaoMm, quantidadeVaos, divisoesPorVao, corPerfil,
  vidroDescricao, medidaVidro, areaTotal, totalVidro,
  perfis, acessorios, totalPerfis, totalAcessorios, totalGeral,
  larguraVidroMm, alturaVidroMm,
}: SacadaFrontalPDFProps) {
  const c = textColor || themeColor;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColor }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.titulo, { color: themeColor }]}>Orçamento Sacada Frontal</Text>
            {numeroOrcamento && (
              <Text style={[styles.label, { color: themeColor, fontSize: 11, fontWeight: "bold", marginTop: 4 }]}>
                Nº Orçamento: {numeroOrcamento}
              </Text>
            )}
            <Text style={styles.data}>Emissão em: {new Date().toLocaleDateString("pt-BR")}</Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>

        {/* Destaque cinza apenas para Cliente e Obra */}
        <View style={styles.clientObraBox}>
          <View style={styles.clientObraLine}>
            <View style={styles.clientObraItem}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={[styles.value, { color: c }]}>{nomeCliente || "Não informado"}</Text>
            </View>
            <View style={styles.clientObraItem}>
            <Text style={styles.label}>Obra / Referência</Text>
            <Text style={[styles.value, { color: c }]}>{nomeObra || "Geral"}</Text>
            </View>
          </View>
        </View>

        {/* Demais dados em texto simples, um abaixo do outro */}
        <View style={styles.plainInfoList}>
          <Text style={styles.plainInfoText}>Vidro: {vidroDescricao}</Text>
          <Text style={styles.plainInfoText}>Medidas de vão: {larguraVaoMm}x{alturaVaoMm}mm · {quantidadeVaos} vão(s) · {divisoesPorVao} div.</Text>
          <Text style={styles.plainInfoText}>Medida do vidro: {medidaVidro}</Text>
          <Text style={styles.plainInfoText}>Cor dos perfis: {corPerfil}</Text>
        </View>

        {/* Vista frontal */}
        {(() => {
          const div = Math.max(divisoesPorVao, 1);
          const sw = 460;
          const sl = 28;
          const sr = 8;
          const st = 6;
          const sb = 14;
          const cw = sw - sl - sr;
          const rat = Math.min(Math.max(alturaVaoMm / (larguraVaoMm || 1), 0.25), 1.2);
          const ch = cw * rat;
          const sh = ch + st + sb;
          const pw = Math.max(1.5, Math.min(4, cw * 0.01));
          const rh = Math.max(2.5, Math.min(6, ch * 0.025));
          const gw = (cw - (div + 1) * pw) / div;
          const gh = ch - rh * 2;
          const x0 = sl;
          const y0 = st;
          const cl = (corPerfil || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          const ac = cl === "branco" ? "#d8d8d8" : cl === "preto" ? "#303030" : cl === "fosco" ? "#888888" : "#999999";
          const ab = cl === "branco" ? "#b0b0b0" : cl === "preto" ? "#1a1a1a" : cl === "fosco" ? "#666666" : "#777777";
          const dw = 440;
          const dh = dw * (sh / sw);
          return (
            <View style={{ marginTop: 6, marginBottom: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: themeColor, marginBottom: 5, alignSelf: "flex-start" }}>Vista Frontal</Text>
              <Svg viewBox={`0 0 ${sw} ${sh}`} style={{ width: dw, height: dh }}>
                <Rect x={x0} y={y0} width={cw} height={rh} fill={ac} />
                <Rect x={x0} y={y0} width={cw} height={rh} fill="none" stroke={ab} strokeWidth={0.4} />
                <Rect x={x0} y={y0 + ch - rh} width={cw} height={rh} fill={ac} />
                <Rect x={x0} y={y0 + ch - rh} width={cw} height={rh} fill="none" stroke={ab} strokeWidth={0.4} />
                {Array.from({ length: div }).map((_, i) => {
                  const pX = x0 + i * (gw + pw);
                  const gX = pX + pw;
                  return (
                    <G key={i}>
                      <Rect x={pX} y={y0} width={pw} height={ch} fill={ac} />
                      <Rect x={pX} y={y0} width={pw} height={ch} fill="none" stroke={ab} strokeWidth={0.3} />
                      <Rect x={gX} y={y0 + rh} width={gw} height={gh} fill="#ddf2ee" />
                      <Rect x={gX} y={y0 + rh} width={gw} height={gh} fill="none" stroke="#88bbb2" strokeWidth={0.4} />
                      <Line x1={gX + gw * 0.18} y1={y0 + rh + gh * 0.06} x2={gX + gw * 0.08} y2={y0 + rh + gh * 0.35} stroke="#ffffff" strokeWidth={0.5} />
                    </G>
                  );
                })}
                <Rect x={x0 + div * (gw + pw)} y={y0} width={pw} height={ch} fill={ac} />
                <Rect x={x0 + div * (gw + pw)} y={y0} width={pw} height={ch} fill="none" stroke={ab} strokeWidth={0.3} />
                <Line x1={x0} y1={y0 + ch + 6} x2={x0 + cw} y2={y0 + ch + 6} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0} y1={y0 + ch + 3} x2={x0} y2={y0 + ch + 9} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0 + cw} y1={y0 + ch + 3} x2={x0 + cw} y2={y0 + ch + 9} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0 - 6} y1={y0} x2={x0 - 6} y2={y0 + ch} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0 - 9} y1={y0} x2={x0 - 3} y2={y0} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0 - 9} y1={y0 + ch} x2={x0 - 3} y2={y0 + ch} stroke="#999999" strokeWidth={0.3} />
              </Svg>
              <Text style={{ fontSize: 7, color: "#777777", marginTop: 3 }}>
                Vão: {larguraVaoMm} × {alturaVaoMm} mm  ·  Vidro: {larguraVidroMm ?? "–"} × {alturaVidroMm ?? "–"} mm  ·  {divisoesPorVao} peça(s)/vão{quantidadeVaos > 1 ? `  ·  ${quantidadeVaos} vãos` : ""}
              </Text>
            </View>
          );
        })()}

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
              <Text style={[styles.tdCell, { width: "30%" }]}>{p.nome}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]}>{p.codigo}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "right" }]}>{p.comprimentoTotal.toLocaleString("pt-BR")}</Text>
              <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{p.quantidadeBarras}</Text>
              <Text style={[styles.tdCell, { width: "16%", textAlign: "right" }]}>{fmt(p.precoBarra)}</Text>
              <Text style={[styles.tdCell, { width: "16%", textAlign: "right" }]}>{fmt(p.valorTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Acessórios */}
        <Text style={[styles.sectionTitle, { color: themeColor }]}>Acessórios / Ferragens</Text>
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: themeColor }]}> 
            <Text style={[styles.thCell, { width: "28%" }]}>Acessório</Text>
            <Text style={[styles.thCell, { width: "14%", textAlign: "center" }]}>Código</Text>
            <Text style={[styles.thCell, { width: "12%", textAlign: "right" }]}>Qtd</Text>
            <Text style={[styles.thCell, { width: "12%", textAlign: "right" }]}>Cor</Text>
            <Text style={[styles.thCell, { width: "17%", textAlign: "right" }]}>Preço un.</Text>
            <Text style={[styles.thCell, { width: "17%", textAlign: "right" }]}>Total</Text>
          </View>
          {acessorios.map((a, i) => (
            <View key={`a-${i}`} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(i) }]}>
              <Text style={[styles.tdCell, { width: "28%" }]}>{a.nome}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]}>{a.codigo}</Text>
              <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]}>{a.quantidadePacote ?? a.quantidade}</Text>
              <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]}>{a.corEncontrada || "-"}</Text>
              <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]}>{fmt(a.precoUnitario)}</Text>
              <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]}>{fmt(a.valorTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Resumo */}
        <View style={styles.summaryContainer}>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Área total de vidro</Text>
                <Text style={[styles.summaryValue, { color: c }]}>{Number(areaTotal).toFixed(2)} m²</Text>
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
