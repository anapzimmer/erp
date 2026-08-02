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

const obterMedidas = (item: ItemPinazioPDF) => {
  if (item.medidas) return item.medidas;

  const largura = Number(item.larguraReal || item.largura || 0);
  const altura = Number(item.alturaReal || item.altura || 0);

  return `${largura}x${altura}`;
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
    padding: 40,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: PDF_HEADER_LAYOUT.marginBottom,
    paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
    borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
  },
  headerLeft: {
    flexDirection: "column",
  },
  tituloRelatorio: {
    fontSize: PDF_HEADER_LAYOUT.titleSize,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  subtitulo: {
    fontSize: PDF_HEADER_LAYOUT.subtitleSize,
    marginTop: 2,
    fontWeight: "bold",
  },
  dataEmissao: {
    fontSize: PDF_HEADER_LAYOUT.dateSize,
    color: "#666666",
    marginTop: 6,
  },
  headerRight: {
    width: 140,
    alignItems: "flex-end",
  },
  logo: {
    width: PDF_HEADER_LAYOUT.logoWidth,
    height: PDF_HEADER_LAYOUT.logoHeight,
    objectFit: "contain",
    objectPosition: "right",
  },
  infoSection: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  infoBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  label: {
    fontSize: 6,
    color: "#999999",
    textTransform: "uppercase",
    marginBottom: 3,
    fontWeight: "bold",
  },
  value: {
    fontSize: 10,
    fontWeight: "bold",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth,
    borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor,
    alignItems: "center",
    minHeight: 52,
  },
  tableColHeader: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    color: "#FFFFFF",
    fontSize: PDF_TABLE_LAYOUT.headerFontSize,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableCol: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    fontSize: PDF_TABLE_LAYOUT.bodyFontSize,
  },
  colImagem: {
    width: "13%",
    alignItems: "center",
    justifyContent: "center",
  },
  desenho: {
    width: 50,
    height: 38,
    objectFit: "contain",
  },
  colDesc: {
    width: "43%",
  },
  colMedidas: {
    width: "15%",
    textAlign: "center",
  },
  colQtd: {
    width: "8%",
    textAlign: "center",
  },
  colTotal: {
    width: "21%",
    textAlign: "right",
    paddingRight: 8,
  },
  detalhePinazio: {
    marginTop: 3,
    fontSize: 6.5,
    color: "#667785",
    lineHeight: 1.3,
  },
  resumo: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#DDDDDD",
  },
  resumoLinha: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 4,
    paddingRight: 10,
  },
  resumoLabel: {
    fontSize: 9,
    color: "#666666",
    marginRight: 10,
  },
  resumoValor: {
    width: 100,
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "right",
  },
  totalLabel: {
    fontSize: 10,
    color: "#666666",
    marginRight: 10,
  },
  totalValor: {
    width: 100,
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "right",
  },
  observacao: {
    marginTop: 14,
    padding: 9,
    backgroundColor: "#F9FAFB",
    borderRadius: 5,
    fontSize: 7,
    color: "#666666",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7,
    color: "#999999",
    borderTopWidth: 0.5,
    borderTopColor: "#DDDDDD",
    paddingTop: 10,
  },
});

export function PinazioPDF({
  itens,
  nomeEmpresa,
  logoUrl,
  themeColor,
  textColor,
  nomeCliente,
  nomeObra,
  numeroOrcamento,
  valorTotal,
}: PinazioPDFProps) {
  const dataGeracao = new Date().toLocaleDateString("pt-BR");
  const contentColor = textColor || themeColor;

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View
          style={[
            styles.header,
            {
              marginRight: 10,
              borderBottomColor: themeColor,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.tituloRelatorio, { color: themeColor }]}> 
              Orçamento de Vidros
            </Text>

            {numeroOrcamento ? (
              <Text
                style={[
                  styles.subtitulo,
                  {
                    color: themeColor,
                    marginTop: 4,
                  },
                ]}
              >
                Nº Orçamento: {numeroOrcamento}
              </Text>
            ) : (
              <Text style={[styles.subtitulo, { color: contentColor }]}> 
                {nomeEmpresa}
              </Text>
            )}

            <Text style={styles.dataEmissao}>
              Emissão em: {dataGeracao}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.infoBox, { borderLeftColor: themeColor }]}> 
            <Text style={styles.label}>Cliente</Text>
            <Text style={[styles.value, { color: contentColor }]}> 
              {nomeCliente || "Não informado"}
            </Text>
          </View>

          <View style={[styles.infoBox, { borderLeftColor: themeColor }]}> 
            <Text style={styles.label}>Obra / Referência</Text>
            <Text style={[styles.value, { color: contentColor }]}> 
              {nomeObra || "Geral"}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View
            style={[
              styles.tableHeader,
              {
                backgroundColor: themeColor,
              },
            ]}
          >
            <Text style={[styles.tableColHeader, styles.colImagem]}>Desenho</Text>
            <Text style={[styles.tableColHeader, styles.colDesc]}>Descrição</Text>
            <Text style={[styles.tableColHeader, styles.colMedidas]}>Medidas</Text>
            <Text style={[styles.tableColHeader, styles.colQtd]}>Qtd</Text>
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
                  width={58}
                  height={42}
                />
              </View>

              <View style={[styles.tableCol, styles.colDesc]}>
                <Text style={{ color: contentColor }}>
                  {item.descricao}
                </Text>

                {item.pinazioId === "sem-pinazio" ||
                obterMetroLinearTotal(item) <= 0 ? (
                  <Text style={styles.detalhePinazio}>
                    Sem Pinázio — cálculo somente do vidro
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
                  { color: contentColor },
                ]}
              >
                {obterMedidas(item)} mm
              </Text>

              <Text
                style={[
                  styles.tableCol,
                  styles.colQtd,
                  { color: contentColor },
                ]}
              >
                {Math.max(1, Number(item.quantidade || 1))}
              </Text>

              <Text
                style={[
                  styles.tableCol,
                  styles.colTotal,
                  {
                    color: themeColor,
                    fontWeight: "bold",
                  },
                ]}
              >
                {formatarMoeda(item.total)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.resumo}>
          <View style={styles.resumoLinha}>
            <Text style={styles.resumoLabel}>Total de peças:</Text>
            <Text style={[styles.resumoValor, { color: contentColor }]}> 
              {totalPecas}
            </Text>
          </View>

          {totalMetroLinear > 0 ? (
            <View style={styles.resumoLinha}>
              <Text style={styles.resumoLabel}>Total de Pinázio:</Text>
              <Text style={[styles.resumoValor, { color: contentColor }]}> 
                {formatarMetroLinear(totalMetroLinear)} ml
              </Text>
            </View>
          ) : null}

          <View style={[styles.resumoLinha, { marginTop: 5 }]}> 
            <Text style={styles.totalLabel}>Valor total:</Text>
            <Text style={[styles.totalValor, { color: themeColor }]}> 
              {formatarMoeda(totalGeral)}
            </Text>
          </View>
        </View>

        <View style={styles.observacao}>
          <Text>
            O vidro é calculado em sua medida total. Quando houver Pinázio,
            as divisões informadas serão usadas exclusivamente para calcular
            o metro linear das barras internas.
          </Text>
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