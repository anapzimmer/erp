//app/relatorios/sacadagrapa/SacadaGrapaPDF.tsx
"use client";

import React from "react";
import { Document, G, Image, Line, Page, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
import { buildPdfFooterText } from "../shared/pdfLayout";

type SacadaGrapaPDFProps = {
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
  grapasLateraisPorVao: number;
  grapasInferioresPorVao: number;
  grapas1305PorUniao: number;
  tuboDescricao?: string;
  corPerfil: string;
  vidroDescricao: string;
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
  headerText: { flex: 1, paddingRight: 18 },
  title: { fontSize: 15, color: "#153047", fontWeight: "bold", textTransform: "uppercase" },
   subtitle: { fontSize: 8, color: "#6f8193", marginTop: 5 },
  logo: { width: 118, height: 42, objectFit: "contain", objectPosition: "right" },
  infoStrip: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#dce5ed",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  infoBox: { flex: 1 },
  label: { fontSize: 6.5, color: "#718398", textTransform: "uppercase", marginBottom: 3 },
  value: { fontSize: 9, color: "#153047", fontWeight: "normal" },
  valueStrong: { fontSize: 9, color: "#153047", fontWeight: "bold" },
  mainGrid: { flexDirection: "column", gap: 10, marginBottom: 12 },
  drawingBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dce5ed",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#ffffff",
  },
  drawingTitle: { fontSize: 9, color: "#153047", fontWeight: "bold", marginBottom: 6 },
  drawing: { width: "100%", height: 170, objectFit: "contain" },
  dataBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dce5ed",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#ffffff",
  },
  dataTitle: { fontSize: 9, color: "#153047", fontWeight: "bold", marginBottom: 7 },
  dataGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dataItem: {
    width: "31.8%",
    borderTopWidth: 1,
    borderTopColor: "#e8eef3",
    paddingTop: 5,
    minHeight: 30,
  },
  dataItemWide: {
    width: "48%",
    borderTopWidth: 1,
    borderTopColor: "#e8eef3",
    paddingTop: 5,
    minHeight: 30,
  },
  sectionTitle: { fontSize: 10, color: "#153047", fontWeight: "bold", marginTop: 4, marginBottom: 6 },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dce5ed",
    borderRadius: 7,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e8eef3",
    minHeight: 24,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    minHeight: 22,
    alignItems: "center",
    backgroundColor: "#f3f6f9",
  },
  th: { padding: 5, fontSize: 6.5, color: "#153047", textTransform: "uppercase", fontWeight: "bold" },
  td: { padding: 5, fontSize: 7, color: "#153047" },
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
    borderTopColor: "#dce5ed",
    paddingTop: 10,
  },
  totalBox: { flex: 1 },
  totalLabel: { fontSize: 6.5, color: "#718398", textTransform: "uppercase", marginBottom: 3 },
  totalValue: { fontSize: 10, color: "#153047", fontWeight: "normal" },
  totalValueStrong: { fontSize: 13, color: "#153047", fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 20,
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

export function SacadaGrapaPDF({
  nomeEmpresa,
  logoUrl,
  tituloDocumento = "Orçamento Sacada com Grapa",
  numeroOrcamento,
  nomeCliente,
  nomeObra,
  larguraVaoMm,
  alturaVaoMm,
  quantidadeVaos,
  divisoesPorVao,
  grapasLateraisPorVao,
  grapasInferioresPorVao,
  grapas1305PorUniao,
  tuboDescricao,
  corPerfil,
  vidroDescricao,
  medidaVidro,
  areaTotal,
  totalVidro,
  totalAcessorios,
  totalGeral,
  materiais,
  desenhoUrl: _desenhoUrl,
}: SacadaGrapaPDFProps) {
  const perfilCor = { fill: "#eef2f5", stroke: "#b5c0ca" };
  const tuboCor = { fill: "#8b949e", stroke: "#58616b" };
  const svgW = 430;
  const pad = 16;
  const drawW = svgW - pad * 2;
  const ratio = Math.min(Math.max((alturaVaoMm || 1000) / (larguraVaoMm || 2000), 0.35), 0.78);
  const drawH = Math.round(drawW * ratio);
  const svgH = drawH + pad * 2 + 18;
  const x0 = pad;
  const y0 = pad;
  const rail = 8;
  const side = 6;
  const divs = Math.max(Math.floor(divisoesPorVao || 1), 1);
  const laterais = Math.max(Math.floor(grapasLateraisPorVao || 0), 0);
  const inferiores = Math.max(Math.floor(grapasInferioresPorVao || 0), 0);
  const grapasPorUniao = Math.max(Math.floor(grapas1305PorUniao || 0), 0);
  const panelW = (drawW - side * 2) / divs;
  const glassY = y0 + rail;
  const glassH = drawH - rail * 2;
  const tuboTexto = String(tuboDescricao || "Sem tubo");
  const temTuboEmCima = /em cima|largura/i.test(tuboTexto);
  const temTuboEntreMeios = /entre|meio/i.test(tuboTexto);
  const posicaoY = (index: number, total: number, alturaGrapa: number) => {
    if (total <= 1) return glassY + glassH * 0.16 - alturaGrapa / 2;
    const inicio = glassY + glassH * 0.14;
    const fim = glassY + glassH * 0.86;
    return inicio + ((fim - inicio) * index) / (total - 1) - alturaGrapa / 2;
  };

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
            <Text style={styles.value}>Sacada com Grapa</Text>
          </View>
        </View>

        <View style={styles.mainGrid} wrap={false}>
          <View style={styles.drawingBox}>
            <Text style={styles.drawingTitle}>Vista frontal</Text>
            <Svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={210} preserveAspectRatio="xMidYMid meet">
              <Rect x={x0} y={y0} width={drawW} height={drawH} fill="#ffffff" stroke="#d6e0e8" strokeWidth={0.8} />

              {Array.from({ length: divs }).map((_, index) => {
                const x = x0 + side + panelW * index;
                return (
                  <G key={`vidro-${index}`}>
                    <Rect x={x} y={glassY} width={panelW} height={glassH} fill="#edf8ff" stroke="#a9bfce" strokeWidth={0.5} />
                    <Line x1={x + panelW * 0.14} y1={glassY + glassH * 0.9} x2={x + panelW * 0.72} y2={glassY + glassH * 0.1} stroke="#ffffff" strokeWidth={3} />
                    <Line x1={x + panelW * 0.34} y1={glassY + glassH * 0.86} x2={x + panelW * 0.92} y2={glassY + glassH * 0.15} stroke="#ffffff" strokeWidth={1.6} />
                  </G>
                );
              })}

              <Rect x={x0} y={y0} width={drawW} height={rail} fill={perfilCor.fill} stroke={perfilCor.stroke} strokeWidth={0.8} />
              <Rect x={x0} y={y0 + drawH - rail} width={drawW} height={rail} fill={perfilCor.fill} stroke={perfilCor.stroke} strokeWidth={0.8} />
              <Rect x={x0} y={y0} width={side} height={drawH} fill={perfilCor.fill} stroke={perfilCor.stroke} strokeWidth={0.8} />
              <Rect x={x0 + drawW - side} y={y0} width={side} height={drawH} fill={perfilCor.fill} stroke={perfilCor.stroke} strokeWidth={0.8} />

              {Array.from({ length: Math.max(divs - 1, 0) }).map((_, index) => {
                const x = x0 + side + panelW * (index + 1);
                return <Line key={`div-${index}`} x1={x} y1={y0 + rail} x2={x} y2={y0 + drawH - rail} stroke="#273444" strokeWidth={0.8} />;
              })}

              {temTuboEmCima ? (
                <Rect x={x0 - 2} y={y0 - 10} width={drawW + 4} height={11} fill={tuboCor.fill} stroke={tuboCor.stroke} strokeWidth={0.7} />
              ) : null}

              {temTuboEntreMeios ? Array.from({ length: Math.max(divs - 1, 0) }).map((_, index) => {
                const tuboW = 10;
                const x = x0 + side + panelW * (index + 1) - tuboW / 2;
                return (
                  <G key={`tubo-meio-${index}`}>
                    <Rect x={x} y={glassY} width={tuboW} height={glassH} fill={tuboCor.fill} stroke={tuboCor.stroke} strokeWidth={0.7} />
                    {Array.from({ length: laterais }).map((__, grapaIndex) => {
                      const y = posicaoY(grapaIndex, laterais, 14);
                      return (
                        <G key={`grapa-tubo-${index}-${grapaIndex}`}>
                          <Rect x={x - 14} y={y} width={10} height={14} fill="#eef2f5" stroke="#8a96a3" strokeWidth={0.7} />
                          <Rect x={x + tuboW + 4} y={y} width={10} height={14} fill="#eef2f5" stroke="#8a96a3" strokeWidth={0.7} />
                        </G>
                      );
                    })}
                  </G>
                );
              }) : null}

              {Array.from({ length: laterais }).map((_, index) => {
                const y = posicaoY(index, laterais, 17);
                return (
                  <G key={`grapa-lateral-${index}`}>
                    <Rect x={x0 + 1} y={y} width={12} height={17} fill="#eef2f5" stroke="#8a96a3" strokeWidth={0.7} />
                    <Rect x={x0 + drawW - 13} y={y} width={12} height={17} fill="#eef2f5" stroke="#8a96a3" strokeWidth={0.7} />
                  </G>
                );
              })}

              {Array.from({ length: divs }).map((_, painelIndex) => {
                const painelX = x0 + side + panelW * painelIndex;
                return (
                  <G key={`grapas-inf-painel-${painelIndex}`}>
                    {Array.from({ length: inferiores }).map((__, index) => {
                      const x = painelX + ((index + 1) / (inferiores + 1)) * panelW - 7;
                      return <Rect key={`grapa-inf-${painelIndex}-${index}`} x={x} y={y0 + drawH - 10} width={14} height={17} fill="#eef2f5" stroke="#8a96a3" strokeWidth={0.7} />;
                    })}
                  </G>
                );
              })}

              {!temTuboEntreMeios ? Array.from({ length: Math.max(divs - 1, 0) }).map((_, uniaoIndex) => {
                const x = x0 + side + panelW * (uniaoIndex + 1) - 11;
                return (
                  <G key={`grapas-1305-${uniaoIndex}`}>
                    {Array.from({ length: grapasPorUniao }).map((__, index) => {
                      const y = posicaoY(index, grapasPorUniao, 17);
                      return <Rect key={`1305-${uniaoIndex}-${index}`} x={x} y={y} width={22} height={17} fill="#eef2f5" stroke="#8a96a3" strokeWidth={0.7} />;
                    })}
                  </G>
                );
              }) : null}

              <Line x1={x0} y1={y0 + drawH + 10} x2={x0 + drawW} y2={y0 + drawH + 10} stroke="#6aa6d8" strokeWidth={0.7} />
              <Text x={x0 + drawW / 2 - 16} y={y0 + drawH + 22} style={{ fontSize: 7, fill: "#153047" }}>{larguraVaoMm} mm</Text>
            </Svg>
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
                <Text style={styles.label}>Grapas laterais</Text>
                <Text style={styles.value}>{grapasLateraisPorVao}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Grapas embaixo/vidro</Text>
                <Text style={styles.value}>{grapasInferioresPorVao}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>1305 por uniao</Text>
                <Text style={styles.value}>{grapas1305PorUniao}</Text>
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
                <Text style={styles.label}>Tubo</Text>
                <Text style={styles.value}>{tuboTexto}</Text>
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

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa || "Glass Code", pageNumber, totalPages)}
        />
      </Page>
    </Document>
  );
}

