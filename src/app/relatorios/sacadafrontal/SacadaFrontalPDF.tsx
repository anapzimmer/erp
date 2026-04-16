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
  tituloDocumento?: string;
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
  acessoriosGuardaCorpo?: AcessorioPDF[];
  acessoriosFechamentoSacada?: AcessorioPDF[];
  totalPerfis: number;
  totalAcessorios: number;
  totalGeral: number;
  larguraVidroMm?: number;
  alturaVidroMm?: number;
  alturaInferiorMm?: number;
  alturaSuperiorMm?: number;
  divisoesInferiorPorVao?: number;
  divisoesSuperiorPorVao?: number;
  larguraVidroInferiorMm?: number;
  alturaVidroInferiorMm?: number;
  larguraVidroSuperiorMm?: number;
  alturaVidroSuperiorMm?: number;
  numeroOrcamento?: string;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const sentenceCase = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 80, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
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
  },
  clientObraItem: { flex: 1 },
  clientObraItemRight: { flex: 1, marginLeft: 12 },
  plainInfoList: {
    marginBottom: 12,
  },
  plainInfoText: {
    fontSize: 9,
    color: "#1C415B",
    marginBottom: 4,
  },
  label: { fontSize: 6, color: "#999", textTransform: "uppercase", marginBottom: 3, fontWeight: "bold" },
  value: { fontSize: 10, fontWeight: "bold", color: "#1C415B" },

  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 18, marginBottom: 6 },

  tableSection: { width: "100%", marginTop: 4, backgroundColor: "#FFFFFF" },
  table: { width: "100%", backgroundColor: "#FFFFFF" },
  tableHeader: { flexDirection: "row", minHeight: 20, alignItems: "center", backgroundColor: "#FFFFFF" },
  tableRow: { flexDirection: "row", borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth, borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor, alignItems: "center", minHeight: 26, backgroundColor: "#FFFFFF" },
  thCell: { padding: 5, color: "#FFFFFF", fontSize: PDF_TABLE_LAYOUT.headerFontSize, fontWeight: "bold", textTransform: "uppercase" },
  tdCell: { padding: 5, fontSize: PDF_TABLE_LAYOUT.bodyFontSize, color: "#1C415B", backgroundColor: "#FFFFFF" },

  summaryContainer: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 12 },
  summaryMetrics: { flexDirection: "row", alignItems: "flex-end" },
  summaryItem: { flexDirection: "column", alignItems: "flex-start" },
  summaryItemCol: { width: "17%" },
  summaryLabel: { fontSize: 6, color: "#999", textTransform: "uppercase", marginBottom: 2 },
  summaryValue: { fontSize: 10, fontWeight: "bold", color: "#1C415B" },
  totalBox: { width: "32%", alignItems: "flex-end" },
  totalLabel: { fontSize: 7, color: "#999", textTransform: "uppercase" },
  totalValue: { fontSize: 16, fontWeight: "bold" },

  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999", paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#DDD" },
});

export function SacadaFrontalPDF({
  nomeEmpresa, logoUrl, themeColor, textColor, tituloDocumento, nomeCliente, nomeObra,
  numeroOrcamento,
  larguraVaoMm, alturaVaoMm, quantidadeVaos, divisoesPorVao, corPerfil,
  vidroDescricao, medidaVidro, areaTotal, totalVidro,
  perfis, acessorios, acessoriosGuardaCorpo, acessoriosFechamentoSacada, totalPerfis, totalAcessorios, totalGeral,
  larguraVidroMm, alturaVidroMm,
  alturaInferiorMm, alturaSuperiorMm,
  divisoesInferiorPorVao, divisoesSuperiorPorVao,
  larguraVidroInferiorMm, alturaVidroInferiorMm,
  larguraVidroSuperiorMm, alturaVidroSuperiorMm,
}: SacadaFrontalPDFProps) {
  const c = textColor || themeColor;
  const temModulosSupInf = (alturaInferiorMm ?? 0) > 0 && (alturaSuperiorMm ?? 0) > 0;
  const listaAcessoriosGuardaCorpo = acessoriosGuardaCorpo ?? acessorios;
  const listaAcessoriosFechamento = acessoriosFechamentoSacada ?? [];
  const temSecoesAcessoriosSeparadas = listaAcessoriosFechamento.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColor }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.titulo, { color: themeColor }]}>{tituloDocumento || "Orçamento Sacada Frontal"}</Text>
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
            <View style={styles.clientObraItemRight}>
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
          <Text style={[styles.plainInfoText, { marginBottom: 0 }]}>Cor dos perfis: {corPerfil}</Text>
        </View>

        {/* Vista frontal */}
        {(() => {
          const div = Math.max(divisoesPorVao, 1);
          const divSup = Math.max(divisoesSuperiorPorVao ?? divisoesPorVao, 1);
          const divInf = Math.max(divisoesInferiorPorVao ?? divisoesPorVao, 1);
          const sw = 460;
          const sl = 28;
          const sr = 8;
          const st = 6;
          const sb = 14;
          const cw = sw - sl - sr;
          const larguraBase = larguraVaoMm > 0 ? larguraVaoMm : 1000;
          const alturaBase = temModulosSupInf
            ? (alturaInferiorMm || 0) + (alturaSuperiorMm || 0)
            : (alturaVaoMm > 0 ? alturaVaoMm : 1100);
          const rat = Math.min(Math.max(alturaBase / larguraBase, 0.45), 1.1);
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
          const dw = 430;
          const dh = dw * (sh / sw);

          const alturaSupBase = Math.max(alturaSuperiorMm || 0, 0);
          const alturaInfBase = Math.max(alturaInferiorMm || 0, 0);
          const areaUtilH = Math.max(ch - rh * 3, 40);
          const moduloSupH = temModulosSupInf
            ? areaUtilH * (alturaSupBase / Math.max(alturaBase, 1))
            : 0;
          const moduloInfH = temModulosSupInf
            ? areaUtilH * (alturaInfBase / Math.max(alturaBase, 1))
            : 0;

          const renderModulo = (
            modulo: "SUP" | "INF",
            yModulo: number,
            moduloH: number,
            divisoes: number,
            corVidroFill: string,
            corVidroBorda: string
          ) => {
            const numPosts = divisoes + 1;
            const totalPostW = numPosts * pw;
            const glassW = (cw - totalPostW) / divisoes;
            const glassH = Math.max(moduloH, 10);

            return (
              <G key={modulo}>
                {Array.from({ length: divisoes }).map((_, i) => {
                  const pX = x0 + i * (glassW + pw);
                  const gX = pX + pw;

                  return (
                    <G key={`${modulo}-${i}`}>
                      <Rect x={gX} y={yModulo} width={glassW} height={glassH} fill={corVidroFill} />
                      <Rect x={gX} y={yModulo} width={glassW} height={glassH} fill="none" stroke={corVidroBorda} strokeWidth={0.4} />
                      <Line x1={gX + glassW * 0.18} y1={yModulo + glassH * 0.06} x2={gX + glassW * 0.08} y2={yModulo + glassH * 0.35} stroke="#ffffff" strokeWidth={0.5} />
                      <Rect x={pX} y={yModulo} width={pw} height={glassH} fill={ac} />
                      <Rect x={pX} y={yModulo} width={pw} height={glassH} fill="none" stroke={ab} strokeWidth={0.3} />
                    </G>
                  );
                })}
                <Rect x={x0 + divisoes * (glassW + pw)} y={yModulo} width={pw} height={glassH} fill={ac} />
                <Rect x={x0 + divisoes * (glassW + pw)} y={yModulo} width={pw} height={glassH} fill="none" stroke={ab} strokeWidth={0.3} />
              </G>
            );
          };

          return (
            <View wrap={false} style={{ marginTop: 6, marginBottom: 14, alignItems: "center", minHeight: dh + 28 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: themeColor, marginBottom: 5, alignSelf: "flex-start" }}>Vista Frontal</Text>
              <Svg viewBox={`0 0 ${sw} ${sh}`} width={dw} height={dh} preserveAspectRatio="xMidYMid meet">
                <Rect x={x0} y={y0} width={cw} height={rh} fill={ac} />
                <Rect x={x0} y={y0} width={cw} height={rh} fill="none" stroke={ab} strokeWidth={0.4} />

                {temModulosSupInf ? (
                  <>
                    {(() => {
                      const yModuloSup = y0 + rh;
                      const yMeio = yModuloSup + moduloSupH;
                      const yModuloInf = yMeio + rh;
                      const yBase = yModuloInf + moduloInfH;
                      return (
                        <>
                          <Rect x={x0} y={yMeio} width={cw} height={rh} fill={ac} />
                          <Rect x={x0} y={yMeio} width={cw} height={rh} fill="none" stroke={ab} strokeWidth={0.4} />
                          <Rect x={x0} y={yBase} width={cw} height={rh} fill={ac} />
                          <Rect x={x0} y={yBase} width={cw} height={rh} fill="none" stroke={ab} strokeWidth={0.4} />

                          {renderModulo("SUP", yModuloSup, moduloSupH, divSup, "#eef6fb", "#aac7d9")}
                          {renderModulo("INF", yModuloInf, moduloInfH, divInf, "#edf7f4", "#a9cfc7")}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <Rect x={x0} y={y0 + ch - rh} width={cw} height={rh} fill={ac} />
                    <Rect x={x0} y={y0 + ch - rh} width={cw} height={rh} fill="none" stroke={ab} strokeWidth={0.4} />
                    {Array.from({ length: div }).map((_, i) => {
                      const pX = x0 + i * (gw + pw);
                      const gX = pX + pw;
                      return (
                        <G key={i}>
                          <Rect x={gX} y={y0 + rh} width={gw} height={gh} fill="#edf7f4" />
                          <Rect x={gX} y={y0 + rh} width={gw} height={gh} fill="none" stroke="#a9cfc7" strokeWidth={0.4} />
                          <Line x1={gX + gw * 0.18} y1={y0 + rh + gh * 0.06} x2={gX + gw * 0.08} y2={y0 + rh + gh * 0.35} stroke="#ffffff" strokeWidth={0.5} />
                          <Rect x={pX} y={y0} width={pw} height={ch} fill={ac} />
                          <Rect x={pX} y={y0} width={pw} height={ch} fill="none" stroke={ab} strokeWidth={0.3} />
                        </G>
                      );
                    })}
                    <Rect x={x0 + div * (gw + pw)} y={y0} width={pw} height={ch} fill={ac} />
                    <Rect x={x0 + div * (gw + pw)} y={y0} width={pw} height={ch} fill="none" stroke={ab} strokeWidth={0.3} />
                  </>
                )}

                <Line x1={x0} y1={y0 + ch + 6} x2={x0 + cw} y2={y0 + ch + 6} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0} y1={y0 + ch + 3} x2={x0} y2={y0 + ch + 9} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0 + cw} y1={y0 + ch + 3} x2={x0 + cw} y2={y0 + ch + 9} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0 - 6} y1={y0} x2={x0 - 6} y2={y0 + ch} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0 - 9} y1={y0} x2={x0 - 3} y2={y0} stroke="#999999" strokeWidth={0.3} />
                <Line x1={x0 - 9} y1={y0 + ch} x2={x0 - 3} y2={y0 + ch} stroke="#999999" strokeWidth={0.3} />
              </Svg>
              <Text style={{ fontSize: 7, color: "#777777", marginTop: 3 }}>
                {temModulosSupInf
                  ? `Vão: ${larguraVaoMm} × ${alturaBase} mm  ·  SUP: ${larguraVidroSuperiorMm ?? "–"} × ${alturaVidroSuperiorMm ?? "–"} mm (${divSup} peça(s)/vão)  ·  INF: ${larguraVidroInferiorMm ?? "–"} × ${alturaVidroInferiorMm ?? "–"} mm (${divInf} peça(s)/vão)${quantidadeVaos > 1 ? `  ·  ${quantidadeVaos} vãos` : ""}`
                  : `Vão: ${larguraVaoMm} × ${alturaVaoMm} mm  ·  Vidro: ${larguraVidroMm ?? "–"} × ${alturaVidroMm ?? "–"} mm  ·  ${divisoesPorVao} peça(s)/vão${quantidadeVaos > 1 ? `  ·  ${quantidadeVaos} vãos` : ""}`}
              </Text>
            </View>
          );
        })()}

        {/* Perfis */}
        <Text style={[styles.sectionTitle, { color: themeColor }]}>Perfis de Alumínio</Text>
        <View wrap={false} style={styles.tableSection}>
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: themeColor }]}>
            <Text style={[styles.thCell, { width: "30%" }]} wrap={false}>Perfil</Text>
            <Text style={[styles.thCell, { width: "14%", textAlign: "center" }]} wrap={false}>Código</Text>
            <Text style={[styles.thCell, { width: "14%", textAlign: "right" }]} wrap={false}>Compr. (mm)</Text>
            <Text style={[styles.thCell, { width: "10%", textAlign: "right" }]} wrap={false}>Barras</Text>
            <Text style={[styles.thCell, { width: "16%", textAlign: "right" }]} wrap={false}>Preço/b.</Text>
            <Text style={[styles.thCell, { width: "16%", textAlign: "right" }]} wrap={false}>Total</Text>
          </View>
          {perfis.map((p, i) => (
            <View key={`p-${i}`} style={[styles.tableRow, { backgroundColor: "#FFFFFF" }]}>
              <Text style={[styles.tdCell, { width: "30%" }]}>{p.nome}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]}>{p.codigo}</Text>
              <Text style={[styles.tdCell, { width: "14%", textAlign: "right" }]}>{p.comprimentoTotal.toLocaleString("pt-BR")}</Text>
              <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{p.quantidadeBarras}</Text>
              <Text style={[styles.tdCell, { width: "16%", textAlign: "right" }]}>{fmt(p.precoBarra)}</Text>
              <Text style={[styles.tdCell, { width: "16%", textAlign: "right" }]}>{fmt(p.valorTotal)}</Text>
            </View>
          ))}
        </View>
        </View>

        {/* Acessórios */}
        {temSecoesAcessoriosSeparadas ? (
          <>
            <Text style={[styles.sectionTitle, { color: themeColor }]}>Acessórios / Ferragens (Guarda-corpo)</Text>
            <View wrap={false} style={styles.tableSection}>
            <View style={styles.table}>
              <View style={[styles.tableHeader, { backgroundColor: themeColor }]}> 
                <Text style={[styles.thCell, { width: "28%" }]}>Acessório</Text>
                <Text style={[styles.thCell, { width: "14%", textAlign: "center" }]}>Código</Text>
                <Text style={[styles.thCell, { width: "12%", textAlign: "right" }]}>Qtd</Text>
                <Text style={[styles.thCell, { width: "12%", textAlign: "right" }]}>Cor</Text>
                <Text style={[styles.thCell, { width: "17%", textAlign: "right" }]}>Preço un.</Text>
                <Text style={[styles.thCell, { width: "17%", textAlign: "right" }]}>Total</Text>
              </View>
              {listaAcessoriosGuardaCorpo.map((a, i) => (
                <View key={`ag-${i}`} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(i) }]} wrap={false}>
                  <Text style={[styles.tdCell, { width: "28%" }]} wrap={false}>{a.nome}</Text>
                  <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]} wrap={false}>{a.codigo}</Text>
                  <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]} wrap={false}>{a.quantidadePacote ?? a.quantidade}</Text>
                  <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]} wrap={false}>{a.corEncontrada || "-"}</Text>
                  <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]} wrap={false}>{fmt(a.precoUnitario)}</Text>
                  <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]} wrap={false}>{fmt(a.valorTotal)}</Text>
                </View>
              ))}
            </View>
            </View>

            <Text style={[styles.sectionTitle, { color: themeColor }]}>Fechamento de sacada</Text>
            <View wrap={false} style={styles.tableSection}>
            <View style={styles.table}>
              <View style={[styles.tableHeader, { backgroundColor: themeColor }]}> 
                <Text style={[styles.thCell, { width: "28%" }]}>Material</Text>
                <Text style={[styles.thCell, { width: "14%", textAlign: "center" }]}>Código</Text>
                <Text style={[styles.thCell, { width: "12%", textAlign: "right" }]}>Qtd</Text>
                <Text style={[styles.thCell, { width: "12%", textAlign: "right" }]}>Cor</Text>
                <Text style={[styles.thCell, { width: "17%", textAlign: "right" }]}>Preço un.</Text>
                <Text style={[styles.thCell, { width: "17%", textAlign: "right" }]}>Total</Text>
              </View>
              {listaAcessoriosFechamento.map((a, i) => (
                <View key={`af-${i}`} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(i) }]} wrap={false}>
                  <Text style={[styles.tdCell, { width: "28%" }]} wrap={false}>{sentenceCase(a.nome)}</Text>
                  <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]} wrap={false}>{a.codigo}</Text>
                  <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]} wrap={false}>{a.quantidadePacote ?? a.quantidade}</Text>
                  <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]} wrap={false}>{a.corEncontrada || "-"}</Text>
                  <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]} wrap={false}>{fmt(a.precoUnitario)}</Text>
                  <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]} wrap={false}>{fmt(a.valorTotal)}</Text>
                </View>
              ))}
            </View>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: themeColor }]}>Acessórios / Ferragens</Text>
            <View wrap={false} style={styles.tableSection}>
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
                <View key={`a-${i}`} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(i) }]} wrap={false}>
                  <Text style={[styles.tdCell, { width: "28%" }]} wrap={false}>{a.nome}</Text>
                  <Text style={[styles.tdCell, { width: "14%", textAlign: "center" }]} wrap={false}>{a.codigo}</Text>
                  <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]} wrap={false}>{a.quantidadePacote ?? a.quantidade}</Text>
                  <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]} wrap={false}>{a.corEncontrada || "-"}</Text>
                  <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]} wrap={false}>{fmt(a.precoUnitario)}</Text>
                  <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]} wrap={false}>{fmt(a.valorTotal)}</Text>
                </View>
              ))}
            </View>
            </View>
          </>
        )}

        {/* Resumo */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryMetrics}>
            <View style={[styles.summaryItem, styles.summaryItemCol]}>
              <Text style={styles.summaryLabel}>Área total de vidro</Text>
                <Text style={[styles.summaryValue, { color: c }]}>{Number(areaTotal).toFixed(2)} m²</Text>
            </View>
            <View style={[styles.summaryItem, styles.summaryItemCol]}>
              <Text style={styles.summaryLabel}>Total vidro</Text>
              <Text style={[styles.summaryValue, { color: c }]}>{fmt(totalVidro)}</Text>
            </View>
            <View style={[styles.summaryItem, styles.summaryItemCol]}>
              <Text style={styles.summaryLabel}>Total perfis</Text>
              <Text style={[styles.summaryValue, { color: c }]}>{fmt(totalPerfis)}</Text>
            </View>
            <View style={[styles.summaryItem, styles.summaryItemCol]}>
              <Text style={styles.summaryLabel}>Total acessórios</Text>
              <Text style={[styles.summaryValue, { color: c }]}>{fmt(totalAcessorios)}</Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Valor Total</Text>
              <Text style={[styles.totalValue, { color: themeColor }]}>{fmt(totalGeral)}</Text>
            </View>
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
