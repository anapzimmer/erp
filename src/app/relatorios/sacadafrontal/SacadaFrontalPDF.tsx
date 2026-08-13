// app/relatorios/sacadafrontal/SacadaFrontalPDF.tsx
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
import { buildPdfFooterText } from "../shared/pdfLayout";

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
  numeroOrcamento?: string;
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

const textoMinusculo = (texto?: string | null) =>
  String(texto || "").toLocaleLowerCase("pt-BR");

/*
 * ESTILOS CLONADOS DA SACADA COM TORRE.
 * Os únicos estilos extras são os dois usados no total de cada grupo.
 */
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
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d9e2ea",
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerBrand: { flex: 1, paddingRight: 18 },
  headerText: { flexDirection: "column", alignItems: "flex-end", maxWidth: 260 },
  title: {
    fontSize: 15,
    color: "#153047",
    fontWeight: "bold",
  },
  subtitle: { fontSize: 8, color: "#6f8193", marginTop: 5 },
  logo: {
    width: 118,
    height: 42,
    objectFit: "contain",
    objectPosition: "left",
  },
  empresaFallback: { fontSize: 15, color: "#153047", fontWeight: "bold" },
  empresaSlogan: { fontSize: 7.5, color: "#6f8193", marginTop: 2 },
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
    fontSize: 8,
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
  drawing: { width: "100%", height: 170, objectFit: "contain" },
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
    fontSize: 7.6,
    color: "#153047",
    textTransform: "uppercase",
    fontWeight: "normal",
  },
  td: {
    padding: 4,
    fontSize: 8,
    color: "#153047",
  },
  colQtd: { width: "12%", textAlign: "center" },
  colDesc: { width: "46%" },
  colUn: { width: "11%", textAlign: "center" },
  colUnit: { width: "15%", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },

  groupTotalLabel: {
    width: "84%",
    padding: 4,
    fontSize: 8,
    color: "#153047",
    textAlign: "right",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  groupTotalValue: {
    width: "16%",
    padding: 4,
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
    fontSize: 8,
    color: "#718398",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  totalValue: {
    fontSize: 8,
    color: "#153047",
    fontWeight: "normal",
  },
  totalValueStrong: {
    fontSize: 12,
    color: "#153047",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 8,
    color: "#8a9aab",
    borderTopWidth: 0.5,
    borderTopColor: "#dce5ed",
    paddingTop: 8,
  },
});

export function SacadaFrontalPDF({
  nomeEmpresa,
  logoUrl,
  tituloDocumento = "Orçamento Sacada Panorâmica",
  numeroOrcamento,
  nomeCliente,
  nomeObra,
  larguraVaoMm,
  alturaVaoMm,
  quantidadeVaos,
  divisoesPorVao,
  corPerfil,
  vidroDescricao,
  medidaVidro,
  areaTotal,
  totalVidro,
  perfis,
  acessorios,
  acessoriosGuardaCorpo,
  acessoriosFechamentoSacada,
  totalPerfis,
  totalAcessorios,
  totalGeral,
  larguraVidroMm,
  alturaVidroMm,
  alturaInferiorMm,
  alturaSuperiorMm,
  divisoesInferiorPorVao,
  divisoesSuperiorPorVao,
  larguraVidroInferiorMm,
  alturaVidroInferiorMm,
  larguraVidroSuperiorMm,
  alturaVidroSuperiorMm,
}: SacadaFrontalPDFProps) {
  // Mantém compatibilidade com as propriedades existentes da página.
  const listaAcessoriosGuardaCorpo = acessoriosGuardaCorpo ?? acessorios;
  const listaAcessoriosFechamento = acessoriosFechamentoSacada ?? [];

  const materiaisPerfis = perfis.map((perfil, index) => ({
    id: `perfil-${perfil.codigo}-${index}`,
    qtd: Number(perfil.quantidadeBarras || 0),
    descricao: textoMinusculo(`${perfil.nome}${perfil.codigo ? ` (${perfil.codigo})` : ""}`),
    unidade: "barra",
    valorUnitario: Number(perfil.precoBarra || 0),
    valorTotal: Number(perfil.valorTotal || 0),
  }));

  const materiaisAcessorios = [
    ...listaAcessoriosGuardaCorpo.map((item, index) => ({
      id: `acessorio-gc-${item.codigo}-${index}`,
      qtd: Number(item.quantidadePacote ?? item.quantidade ?? 0),
      descricao: textoMinusculo(`${item.nome}${item.codigo ? ` (${item.codigo})` : ""}`),
      unidade: "un",
      valorUnitario: Number(item.precoUnitario || 0),
      valorTotal: Number(item.valorTotal || 0),
    })),
    ...listaAcessoriosFechamento.map((item, index) => ({
      id: `acessorio-fech-${item.codigo}-${index}`,
      qtd: Number(item.quantidadePacote ?? item.quantidade ?? 0),
      descricao: textoMinusculo(`${item.nome}${item.codigo ? ` (${item.codigo})` : ""}`),
      unidade: "un",
      valorUnitario: Number(item.precoUnitario || 0),
      valorTotal: Number(item.valorTotal || 0),
    })),
  ];

  /*
   * DESENHO NO MESMO ENVELOPE DA SACADA TORRE:
   * svgW=430, padding=16, altura máxima controlada e height fixo de 210.
   */
  const corNormalizada = String(corPerfil || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const perfilCor = corNormalizada.includes("preto")
    ? { fill: "#2f3439", stroke: "#171a1e" }
    : corNormalizada.includes("fosco") ||
        corNormalizada.includes("inox")
      ? { fill: "#b8c0c7", stroke: "#7d8994" }
      : { fill: "#eef2f5", stroke: "#b5c0ca" };

  const svgW = 430;
  const pad = 16;
  const drawW = svgW - pad * 2;
  const alturaProjetoMm =
    (alturaInferiorMm ?? 0) > 0 && (alturaSuperiorMm ?? 0) > 0
      ? Number(alturaInferiorMm || 0) + Number(alturaSuperiorMm || 0)
      : Number(alturaVaoMm || 1000);

  const ratio = Math.min(
    Math.max(alturaProjetoMm / Number(larguraVaoMm || 2000), 0.35),
    0.78,
  );
  const drawH = Math.round(drawW * ratio);
  const svgH = drawH + pad * 2 + 18;
  const x0 = pad;
  const y0 = pad;
  const rail = 8;
  const side = 6;

  const temModulosSupInf =
    Number(alturaInferiorMm || 0) > 0 && Number(alturaSuperiorMm || 0) > 0;

  const divPadrao = Math.max(Math.floor(divisoesPorVao || 1), 1);
  const divSuperior = Math.max(
    Math.floor(divisoesSuperiorPorVao ?? divisoesPorVao ?? 1),
    1,
  );
  const divInferior = Math.max(
    Math.floor(divisoesInferiorPorVao ?? divisoesPorVao ?? 1),
    1,
  );

  const glassY = y0 + rail;
  const glassH = drawH - rail * 2;

  const renderPaineis = (
    prefixo: string,
    y: number,
    altura: number,
    divisoes: number,
    fill: string,
    stroke: string,
  ) => {
    const larguraPainel = (drawW - side * 2) / divisoes;

    return (
      <G>
        {Array.from({ length: divisoes }).map((_, index) => {
          const x = x0 + side + larguraPainel * index;

          return (
            <G key={`${prefixo}-${index}`}>
              <Rect
                x={x}
                y={y}
                width={larguraPainel}
                height={altura}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.5}
              />
              <Line
                x1={x + larguraPainel * 0.14}
                y1={y + altura * 0.9}
                x2={x + larguraPainel * 0.72}
                y2={y + altura * 0.1}
                stroke="#ffffff"
                strokeWidth={3}
              />
              <Line
                x1={x + larguraPainel * 0.34}
                y1={y + altura * 0.86}
                x2={x + larguraPainel * 0.92}
                y2={y + altura * 0.15}
                stroke="#ffffff"
                strokeWidth={1.6}
              />
            </G>
          );
        })}

        {Array.from({ length: Math.max(divisoes - 1, 0) }).map(
          (_, index) => {
            const x =
              x0 + side + ((drawW - side * 2) / divisoes) * (index + 1);

            return (
              <Line
                key={`${prefixo}-div-${index}`}
                x1={x}
                y1={y}
                x2={x}
                y2={y + altura}
                stroke="#273444"
                strokeWidth={0.8}
              />
            );
          },
        )}
      </G>
    );
  };

  const somaAlturas = Math.max(
    Number(alturaSuperiorMm || 0) + Number(alturaInferiorMm || 0),
    1,
  );
  const areaInterna = glassH - (temModulosSupInf ? rail : 0);
  const alturaSuperiorDesenho = temModulosSupInf
    ? areaInterna * (Number(alturaSuperiorMm || 0) / somaAlturas)
    : 0;
  const alturaInferiorDesenho = temModulosSupInf
    ? areaInterna - alturaSuperiorDesenho
    : 0;
  const yDivisoria = glassY + alturaSuperiorDesenho;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <View>
                <Text style={styles.empresaFallback}>{nomeEmpresa || "Glass Code"}</Text>
                <Text style={styles.empresaSlogan}>Soluções em Vidros e Ferragens</Text>
              </View>
            )}
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>{tituloDocumento}</Text>
            <Text style={styles.subtitle}>
              {numeroOrcamento ? `Nº orçamento: ${numeroOrcamento} - ` : ""}
              Emissão: {new Date().toLocaleDateString("pt-BR")}
            </Text>
          </View>
        </View>
        <View style={styles.infoStrip}>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.valueStrong}>
              {nomeCliente || "Não informado"}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Obra / Referência</Text>
            <Text style={styles.value}>{nomeObra || "Geral"}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Projeto</Text>
            <Text style={styles.value}>Sacada frontal panorâmica</Text>
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

              {temModulosSupInf ? (
                <>
                  {renderPaineis(
                    "superior",
                    glassY,
                    alturaSuperiorDesenho,
                    divSuperior,
                    "#edf8ff",
                    "#a9bfce",
                  )}

                  <Rect
                    x={x0}
                    y={yDivisoria}
                    width={drawW}
                    height={rail}
                    fill={perfilCor.fill}
                    stroke={perfilCor.stroke}
                    strokeWidth={0.8}
                  />

                  {renderPaineis(
                    "inferior",
                    yDivisoria + rail,
                    alturaInferiorDesenho,
                    divInferior,
                    "#edf8ff",
                    "#a9bfce",
                  )}
                </>
              ) : (
                renderPaineis(
                  "vidro",
                  glassY,
                  glassH,
                  divPadrao,
                  "#edf8ff",
                  "#a9bfce",
                )
              )}

              <Rect
                x={x0}
                y={y0}
                width={drawW}
                height={rail}
                fill={perfilCor.fill}
                stroke={perfilCor.stroke}
                strokeWidth={0.8}
              />
              <Rect
                x={x0}
                y={y0 + drawH - rail}
                width={drawW}
                height={rail}
                fill={perfilCor.fill}
                stroke={perfilCor.stroke}
                strokeWidth={0.8}
              />
              <Rect
                x={x0}
                y={y0}
                width={side}
                height={drawH}
                fill={perfilCor.fill}
                stroke={perfilCor.stroke}
                strokeWidth={0.8}
              />
              <Rect
                x={x0 + drawW - side}
                y={y0}
                width={side}
                height={drawH}
                fill={perfilCor.fill}
                stroke={perfilCor.stroke}
                strokeWidth={0.8}
              />

              <Line
                x1={x0}
                y1={y0 + drawH + 10}
                x2={x0 + drawW}
                y2={y0 + drawH + 10}
                stroke="#6aa6d8"
                strokeWidth={0.7}
              />
              <Text
                x={x0 + drawW / 2 - 16}
                y={y0 + drawH + 22}
                style={{ fontSize: 10, fill: "#153047" }}
              >
                {larguraVaoMm} mm
              </Text>
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
                <Text style={styles.label}>Cor do material</Text>
                <Text style={styles.value}>
                  {corPerfil || "Não selecionada"}
                </Text>
              </View>

              <View style={styles.dataItem}>
                <Text style={styles.label}>Área total</Text>
                <Text style={styles.value}>
                  {fmtNumero(areaTotal, 3)} mÂ²
                </Text>
              </View>

              <View style={styles.dataItemWide}>
                <Text style={styles.label}>Vidro</Text>
                <Text style={styles.value}>{vidroDescricao}</Text>
              </View>

              <View style={styles.dataItemWide}>
                <Text style={styles.label}>Medida do vidro</Text>
                <Text style={styles.value}>{medidaVidro}</Text>
              </View>

              {temModulosSupInf && (
                <>
                  <View style={styles.dataItemWide}>
                    <Text style={styles.label}>Vidro superior</Text>
                    <Text style={styles.value}>
                      {larguraVidroSuperiorMm ?? "-"} x{" "}
                      {alturaVidroSuperiorMm ?? "-"} mm
                    </Text>
                  </View>

                  <View style={styles.dataItemWide}>
                    <Text style={styles.label}>Vidro inferior</Text>
                    <Text style={styles.value}>
                      {larguraVidroInferiorMm ?? "-"} x{" "}
                      {alturaVidroInferiorMm ?? "-"} mm
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Perfis de aluminio</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.th, styles.colQtd]}>Qtd</Text>
            <Text style={[styles.th, styles.colDesc]}>Descricao</Text>
            <Text style={[styles.th, styles.colUn]}>Und</Text>
            <Text style={[styles.th, styles.colUnit]}>Valor unit.</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>

          {materiaisPerfis.map((material) => (
            <View key={material.id} style={styles.row} wrap={false}>
              <Text style={[styles.td, styles.colQtd]}>
                {fmtNumero(material.qtd, 0)}
              </Text>
              <Text style={[styles.td, styles.colDesc]}>{material.descricao}</Text>
              <Text style={[styles.td, styles.colUn]}>
                {material.unidade}
              </Text>
              <Text style={[styles.td, styles.colUnit]}>
                {fmtMoeda(material.valorUnitario)}
              </Text>
              <Text style={[styles.td, styles.colTotal]}>
                {fmtMoeda(material.valorTotal)}
              </Text>
            </View>
          ))}

          <View style={styles.row} wrap={false}>
            <Text style={styles.groupTotalLabel}>Total dos perfis</Text>
            <Text style={styles.groupTotalValue}>
              {fmtMoeda(totalPerfis)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Acessorios / ferragens</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.th, styles.colQtd]}>Qtd</Text>
            <Text style={[styles.th, styles.colDesc]}>Descricao</Text>
            <Text style={[styles.th, styles.colUn]}>Und</Text>
            <Text style={[styles.th, styles.colUnit]}>Valor unit.</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>

          {materiaisAcessorios.map((material) => (
            <View key={material.id} style={styles.row} wrap={false}>
              <Text style={[styles.td, styles.colQtd]}>
                {fmtNumero(material.qtd, 0)}
              </Text>
              <Text style={[styles.td, styles.colDesc]}>{material.descricao}</Text>
              <Text style={[styles.td, styles.colUn]}>
                {material.unidade}
              </Text>
              <Text style={[styles.td, styles.colUnit]}>
                {fmtMoeda(material.valorUnitario)}
              </Text>
              <Text style={[styles.td, styles.colTotal]}>
                {fmtMoeda(material.valorTotal)}
              </Text>
            </View>
          ))}

          <View style={styles.row} wrap={false}>
            <Text style={styles.groupTotalLabel}>Total das ferragens</Text>
            <Text style={styles.groupTotalValue}>
              {fmtMoeda(totalAcessorios)}
            </Text>
          </View>
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Área total</Text>
            <Text style={styles.totalValue}>
              {fmtNumero(areaTotal, 3)} mÂ²
            </Text>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor de vidro</Text>
            <Text style={styles.totalValue}>{fmtMoeda(totalVidro)}</Text>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor perfis</Text>
            <Text style={styles.totalValue}>{fmtMoeda(totalPerfis)}</Text>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor ferragens</Text>
            <Text style={styles.totalValue}>
              {fmtMoeda(totalAcessorios)}
            </Text>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor total</Text>
            <Text style={styles.totalValueStrong}>
              {fmtMoeda(totalGeral)}
            </Text>
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


