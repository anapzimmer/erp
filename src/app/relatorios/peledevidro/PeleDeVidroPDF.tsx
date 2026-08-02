// app/relatorios/peledevidro/PeleDeVidroPDF.tsx
"use client";

import React from "react";
import {
  Document,
  G,
  Image,
  Line,
  Page,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

interface PerfilPDF {
  nome: string;
  codigo: string;
  unidade: string;
  kgmt: number | string;
  metroLinear: number;
  barras: number;
  kgTotal: number;
  precoBarra: number;
  valorTotal: number;
}

interface AcessorioPDF {
  nome: string;
  codigo: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
}

interface PeleDeVidroPDFProps {
  nomeEmpresa: string;
  logoUrl?: string | null;
  themeColor: string;
  textColor?: string;
  nomeCliente: string;
  nomeObra: string;
  numeroOrcamento?: string;
  larguraVaoMm: number;
  alturaVaoMm: number;
  quadrosHorizontal: number;
  quadrosVertical: number;
  quantidadeLajes: number;
  quantidadeFachadas: number;
  quadrosFixos?: number;
  quadrosMoveis?: number;
  vidroDescricao: string;
  areaVidro: number;
  totalVidro: number;
  perfis: PerfilPDF[];
  acessorios: AcessorioPDF[];
  totalPerfis: number;
  totalAcessorios: number;
  totalGeral: number;
}

const fmtMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

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
  title: {
    fontSize: 15,
    color: "#153047",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  subtitle: { fontSize: 8, color: "#6f8193", marginTop: 5 },
  logo: {
    width: 118,
    height: 42,
    objectFit: "contain",
    objectPosition: "right",
  },
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
  label: {
    fontSize: 6.5,
    color: "#718398",
    textTransform: "uppercase",
    marginBottom: 3,
  },
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
  drawingTitle: {
    fontSize: 9,
    color: "#153047",
    fontWeight: "bold",
    marginBottom: 6,
  },
  dataBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dce5ed",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#ffffff",
  },
  dataTitle: {
    fontSize: 9,
    color: "#153047",
    fontWeight: "bold",
    marginBottom: 7,
  },
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
  sectionTitle: {
    fontSize: 10,
    color: "#153047",
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 6,
  },
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
  th: {
    padding: 4,
    fontSize: 6.5,
    color: "#153047",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  td: { padding: 4, fontSize: 7.5, color: "#153047" },
  perfilCodigo: { width: "9%" },
  perfilNome: { width: "19%" },
  perfilUn: { width: "7%", textAlign: "center" },
  perfilKgMt: { width: "9%", textAlign: "right" },
  perfilMetro: { width: "10%", textAlign: "right" },
  perfilBarras: { width: "9%", textAlign: "right" },
  perfilKgTotal: { width: "10%", textAlign: "right" },
  perfilPreco: { width: "13%", textAlign: "right" },
  perfilTotal: { width: "14%", textAlign: "right" },
  acessCodigo: { width: "12%" },
  acessNome: { width: "38%" },
  acessUn: { width: "10%", textAlign: "center" },
  acessQtd: { width: "10%", textAlign: "right" },
  acessPreco: { width: "15%", textAlign: "right" },
  acessTotal: { width: "15%", textAlign: "right" },
  groupTotalLabel: {
    flex: 1,
    padding: 5,
    fontSize: 8,
    color: "#153047",
    textAlign: "right",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  groupTotalValue: {
    width: "15%",
    padding: 5,
    fontSize: 8,
    color: "#153047",
    textAlign: "right",
    fontWeight: "bold",
  },
  totals: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#dce5ed",
    paddingTop: 10,
  },
  totalBox: { flex: 1 },
  totalLabel: {
    fontSize: 6.5,
    color: "#718398",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  totalValue: {
    fontSize: 10,
    color: "#153047",
    fontWeight: "normal",
  },
  totalValueStrong: {
    fontSize: 13,
    color: "#153047",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 10,
    color: "#8a9aab",
    borderTopWidth: 0.5,
    borderTopColor: "#dce5ed",
    paddingTop: 8,
  },
});

export function PeleDeVidroPDF(props: PeleDeVidroPDFProps) {
  const svgW = 430;
  const pad = 16;
  const drawW = svgW - pad * 2;
  const ratio = Math.min(
    Math.max(Number(props.alturaVaoMm || 1000) / Number(props.larguraVaoMm || 2000), 0.35),
    0.78,
  );
  const drawH = Math.round(drawW * ratio);
  const svgH = drawH + pad * 2 + 18;
  const x0 = pad;
  const y0 = pad;
  const rail = 8;
  const side = 6;
  const qH = Math.max(Math.floor(props.quadrosHorizontal || 1), 1);
  const qV = Math.max(Math.floor(props.quadrosVertical || 1), 1);
  const glassW = drawW - side * 2;
  const glassH = drawH - rail * 2;
  const panelW = glassW / qH;
  const panelH = glassH / qV;
  const totalKg = props.perfis.reduce(
    (acc, perfil) => acc + Number(perfil.kgTotal || 0),
    0,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Orçamento Pele de Vidro</Text>
            <Text style={styles.subtitle}>
              {props.numeroOrcamento
                ? `N. orçamento: ${props.numeroOrcamento} - `
                : ""}
              Emissão: {new Date().toLocaleDateString("pt-BR")}
            </Text>
          </View>

          {props.logoUrl ? (
            <Image src={props.logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.title}>{props.nomeEmpresa}</Text>
          )}
        </View>

        <View style={styles.infoStrip}>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.valueStrong}>
              {props.nomeCliente || "Não informado"}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Obra / Referência</Text>
            <Text style={styles.value}>{props.nomeObra || "Geral"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Projeto</Text>
            <Text style={styles.value}>Pele de vidro</Text>
          </View>
        </View>

        <View style={styles.mainGrid} wrap={false}>
          <View style={styles.drawingBox}>
            <Text style={styles.drawingTitle}>Vista frontal</Text>
            <Svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              width="100%"
              height={210}
              preserveAspectRatio="xMidYMid meet"
            >
              <Rect
                x={x0}
                y={y0}
                width={drawW}
                height={drawH}
                fill="#ffffff"
                stroke="#d6e0e8"
                strokeWidth={0.8}
              />

              {Array.from({ length: qH }).map((_, col) =>
                Array.from({ length: qV }).map((__, row) => {
                  const x = x0 + side + panelW * col;
                  const y = y0 + rail + panelH * row;
                  return (
                    <G key={`painel-${col}-${row}`}>
                      <Rect
                        x={x}
                        y={y}
                        width={panelW}
                        height={panelH}
                        fill="#edf8ff"
                        stroke="#a9bfce"
                        strokeWidth={0.5}
                      />
                      <Line
                        x1={x + panelW * 0.14}
                        y1={y + panelH * 0.9}
                        x2={x + panelW * 0.72}
                        y2={y + panelH * 0.1}
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                      <Line
                        x1={x + panelW * 0.34}
                        y1={y + panelH * 0.86}
                        x2={x + panelW * 0.92}
                        y2={y + panelH * 0.15}
                        stroke="#ffffff"
                        strokeWidth={1.6}
                      />
                    </G>
                  );
                }),
              )}

              {Array.from({ length: Math.max(qH - 1, 0) }).map((_, index) => {
                const x = x0 + side + panelW * (index + 1);
                return (
                  <Rect
                    key={`montante-${index}`}
                    x={x - side / 2}
                    y={y0}
                    width={side}
                    height={drawH}
                    fill="#eef2f5"
                    stroke="#b5c0ca"
                    strokeWidth={0.8}
                  />
                );
              })}

              {Array.from({ length: Math.max(qV - 1, 0) }).map((_, index) => {
                const y = y0 + rail + panelH * (index + 1);
                return (
                  <Rect
                    key={`travessa-${index}`}
                    x={x0}
                    y={y - rail / 2}
                    width={drawW}
                    height={rail}
                    fill="#eef2f5"
                    stroke="#b5c0ca"
                    strokeWidth={0.8}
                  />
                );
              })}

              <Rect x={x0} y={y0} width={drawW} height={rail} fill="#eef2f5" stroke="#b5c0ca" strokeWidth={0.8} />
              <Rect x={x0} y={y0 + drawH - rail} width={drawW} height={rail} fill="#eef2f5" stroke="#b5c0ca" strokeWidth={0.8} />
              <Rect x={x0} y={y0} width={side} height={drawH} fill="#eef2f5" stroke="#b5c0ca" strokeWidth={0.8} />
              <Rect x={x0 + drawW - side} y={y0} width={side} height={drawH} fill="#eef2f5" stroke="#b5c0ca" strokeWidth={0.8} />

              <Line x1={x0} y1={y0 + drawH + 10} x2={x0 + drawW} y2={y0 + drawH + 10} stroke="#6aa6d8" strokeWidth={0.7} />
              <Text x={x0 + drawW / 2 - 16} y={y0 + drawH + 22} style={{ fontSize: 10, fill: "#153047" }}>
                {props.larguraVaoMm} mm
              </Text>
            </Svg>
          </View>

          <View style={styles.dataBox}>
            <Text style={styles.dataTitle}>Dados do projeto</Text>
            <View style={styles.dataGrid}>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Largura do vão</Text>
                <Text style={styles.value}>{props.larguraVaoMm} mm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Altura do vão</Text>
                <Text style={styles.value}>{props.alturaVaoMm} mm</Text>
              </View>
               <View style={styles.dataItem}>
                <Text style={styles.label}>Fachadas</Text>
                <Text style={styles.value}>{props.quantidadeFachadas}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Quadros horizontais</Text>
                <Text style={styles.value}>{props.quadrosHorizontal}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Quadros verticais</Text>
                <Text style={styles.value}>{props.quadrosVertical}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Lajes</Text>
                <Text style={styles.value}>{props.quantidadeLajes}</Text>
              </View>
             
              <View style={styles.dataItem}>
                <Text style={styles.label}>Quadros fixos</Text>
                <Text style={styles.value}>
                  {props.quadrosFixos !== undefined ? props.quadrosFixos : "Não informado"}
                </Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.label}>Quadros móveis</Text>
                <Text style={styles.value}>
                  {props.quadrosMoveis !== undefined ? props.quadrosMoveis : "Não informado"}
                </Text>
              </View>
              <View style={styles.dataItemWide}>
                <Text style={styles.label}>Vidro selecionado</Text>
                <Text style={styles.value}>
                  {props.vidroDescricao || "Não informado"}
                </Text>
              </View>
              <View style={styles.dataItemWide}>
                <Text style={styles.label}>Área total de vidro</Text>
                <Text style={styles.value}>{fmtNumero(props.areaVidro, 3)} m²</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Perfis de alumínio</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.th, styles.perfilCodigo]}>Código</Text>
            <Text style={[styles.th, styles.perfilNome]}>Perfil</Text>
            <Text style={[styles.th, styles.perfilUn]}>Un</Text>
            <Text style={[styles.th, styles.perfilKgMt]}>KG/MT</Text>
            <Text style={[styles.th, styles.perfilMetro]}>Metro</Text>
            <Text style={[styles.th, styles.perfilBarras]}>Barras</Text>
            <Text style={[styles.th, styles.perfilKgTotal]}>KG total</Text>
            <Text style={[styles.th, styles.perfilPreco]}>Preço</Text>
            <Text style={[styles.th, styles.perfilTotal]}>Total</Text>
          </View>
          {props.perfis.map((perfil, index) => (
            <View key={`perfil-${perfil.codigo}-${index}`} style={styles.row} wrap={false}>
              <Text style={[styles.td, styles.perfilCodigo]}>{perfil.codigo}</Text>
              <Text style={[styles.td, styles.perfilNome]}>{perfil.nome}</Text>
              <Text style={[styles.td, styles.perfilUn]}>{perfil.unidade}</Text>
              <Text style={[styles.td, styles.perfilKgMt]}>{perfil.kgmt}</Text>
              <Text style={[styles.td, styles.perfilMetro]}>{fmtNumero(perfil.metroLinear, 2)}</Text>
              <Text style={[styles.td, styles.perfilBarras]}>{fmtNumero(perfil.barras, 0)}</Text>
              <Text style={[styles.td, styles.perfilKgTotal]}>{fmtNumero(perfil.kgTotal, 2)}</Text>
              <Text style={[styles.td, styles.perfilPreco]}>{fmtMoeda(perfil.precoBarra)}</Text>
              <Text style={[styles.td, styles.perfilTotal]}>{fmtMoeda(perfil.valorTotal)}</Text>
            </View>
          ))}
          <View style={styles.row} wrap={false}>
            <Text style={styles.groupTotalLabel}>Total KG: {fmtNumero(totalKg, 2)} | Total dos perfis</Text>
            <Text style={styles.groupTotalValue}>{fmtMoeda(props.totalPerfis)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Acessórios / ferragens</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.th, styles.acessCodigo]}>Código</Text>
            <Text style={[styles.th, styles.acessNome]}>Acessório</Text>
            <Text style={[styles.th, styles.acessUn]}>Un</Text>
            <Text style={[styles.th, styles.acessQtd]}>Qtd</Text>
            <Text style={[styles.th, styles.acessPreco]}>Preço</Text>
            <Text style={[styles.th, styles.acessTotal]}>Total</Text>
          </View>
          {props.acessorios.map((acessorio, index) => (
            <View key={`acessorio-${acessorio.codigo}-${index}`} style={styles.row} wrap={false}>
              <Text style={[styles.td, styles.acessCodigo]}>{acessorio.codigo}</Text>
              <Text style={[styles.td, styles.acessNome]}>{acessorio.nome}</Text>
              <Text style={[styles.td, styles.acessUn]}>{acessorio.unidade}</Text>
              <Text style={[styles.td, styles.acessQtd]}>{fmtNumero(acessorio.quantidade, 0)}</Text>
              <Text style={[styles.td, styles.acessPreco]}>{fmtMoeda(acessorio.precoUnitario)}</Text>
              <Text style={[styles.td, styles.acessTotal]}>{fmtMoeda(acessorio.valorTotal)}</Text>
            </View>
          ))}
          <View style={styles.row} wrap={false}>
            <Text style={styles.groupTotalLabel}>Total das ferragens</Text>
            <Text style={styles.groupTotalValue}>{fmtMoeda(props.totalAcessorios)}</Text>
          </View>
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Área total</Text>
            <Text style={styles.totalValue}>{fmtNumero(props.areaVidro, 3)} m²</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor vidro</Text>
            <Text style={styles.totalValue}>{fmtMoeda(props.totalVidro)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor perfis</Text>
            <Text style={styles.totalValue}>{fmtMoeda(props.totalPerfis)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor ferragens</Text>
            <Text style={styles.totalValue}>{fmtMoeda(props.totalAcessorios)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor total</Text>
            <Text style={styles.totalValueStrong}>{fmtMoeda(props.totalGeral)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {props.nomeEmpresa || "Glass Code"} - Soluções em Vidros e Ferragens
        </Text>
      </Page>
    </Document>
  );
}