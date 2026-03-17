//app/relatorios/espelhos/EspelhosPDF.tsx
"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { PDF_HEADER_LAYOUT, PDF_TABLE_LAYOUT, buildPdfFooterText, getPdfZebraRowBackground } from "../shared/pdfLayout";

// --- TIPAGENS ---
interface ItemPedido {
  id: number;
  descricao: string;
  medidas: string;
  quantidade: number;
  total: number;
  tipoVisual: string;
  designUrl?: string;
}

interface EspelhosPDFProps {
  itens: any[]
  nomeEmpresa: string
  numeroOrcamento?: string
  themeColor: string
  textColor?: string
  nomeCliente?: string
  nomeObra?: string
  logoUrl?: string
  valorTotal?: number
}

// --- ESTILOS DO PDF (Cores fixas apenas para fundo/texto neutro) ---
const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: PDF_HEADER_LAYOUT.marginBottom,
    paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
    borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
    // borderBottomColor será definido inline
  },
  headerLeft: { flexDirection: 'column' },
  tituloRelatorio: { fontSize: PDF_HEADER_LAYOUT.titleSize, fontWeight: 'bold', textTransform: 'uppercase' },
  subtitulo: { fontSize: PDF_HEADER_LAYOUT.subtitleSize, color: '#1C415B', marginTop: 2, fontWeight: 'bold' },
  dataEmissao: { fontSize: PDF_HEADER_LAYOUT.dateSize, color: '#666', marginTop: 6 },
  headerRight: { width: 140, alignItems: 'flex-end' },
  logo: {
    width: PDF_HEADER_LAYOUT.logoWidth,
    height: PDF_HEADER_LAYOUT.logoHeight,
    objectFit: 'contain',
    objectPosition: 'right',
  },

  // Info boxes do Cliente
  infoSection: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  label: { fontSize: 6, color: '#999', textTransform: 'uppercase', marginBottom: 3, fontWeight: 'bold' },
  value: { fontSize: 10, fontWeight: 'bold', color: '#1C415B' },

  // Tabela
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth, borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor, alignItems: 'center', minHeight: 35 },
  tableColHeader: { padding: 8, color: '#FFFFFF', fontSize: PDF_TABLE_LAYOUT.headerFontSize, fontWeight: 'bold', textTransform: 'uppercase' },
  tableCol: { padding: 6, fontSize: PDF_TABLE_LAYOUT.bodyFontSize },

  // --- MUDANÇA: Novas larguras das colunas ---
  colDesc: { width: '50%' }, // Aumentado
  colMedidas: { width: '25%' }, // Aumentado
  colQtd: { width: '10%', textAlign: 'center' },
  colTotal: { width: '15%', textAlign: 'right' }, // Ajustado para fechar 100%

  footer: {
    position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center',
    fontSize: 7, color: '#999', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10,
  }
});

export function EspelhosPDF({ itens, nomeEmpresa, logoUrl, themeColor, textColor, nomeCliente, nomeObra, numeroOrcamento }: EspelhosPDFProps) {
  const dataGeracao = new Date().toLocaleDateString('pt-BR');
  const totalGeral = itens.reduce((sum, item) => sum + item.total, 0);
  const contentColor = textColor || themeColor;

  return (
    <Document>
    <Page size="A4" style={styles.page}>

      {/* Cabeçalho */}
      <View style={[styles.header, { marginRight: 10 }, { borderBottomColor: themeColor }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.tituloRelatorio, { color: themeColor }]}>Orçamento de Espelhos</Text>
          {/* Número do orçamento substitui nomeEmpresa */}
          {numeroOrcamento ? (
            <Text style={[styles.subtitulo, { color: themeColor, fontWeight: "bold", marginTop: 4 }]}>
              Nº Orçamento: {numeroOrcamento}
            </Text>
          ) : (
            <Text style={[styles.subtitulo, { color: contentColor }]}>{nomeEmpresa}</Text>
          )}
          <Text style={styles.dataEmissao}>Emissão em: {dataGeracao}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Usando a logoUrl passada do tema claro */}
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>
      </View>

      {/* Informações do Cliente */}
      <View style={styles.infoSection}>
        <View style={[styles.infoBox, { borderLeftColor: themeColor }]}>
          <Text style={styles.label}>Cliente</Text>
          <Text style={[styles.value, { color: contentColor }]}>{nomeCliente || "Não informado"}</Text>
        </View>
        <View style={[styles.infoBox, { borderLeftColor: themeColor }]}>
          <Text style={styles.label}>Obra / Referência</Text>
          <Text style={[styles.value, { color: contentColor }]}>{nomeObra || "Geral"}</Text>
        </View>
      </View>

      {/* Tabela */}
      <View style={styles.table}>
        <View style={[styles.tableHeader, { marginRight: 10 }, { backgroundColor: themeColor }]}>
          {/* --- MUDANÇA: Coluna Img removida --- */}
          <Text style={[styles.tableColHeader, styles.colDesc]}>Descrição</Text>
          <Text style={[styles.tableColHeader, styles.colMedidas]}>Medidas</Text>
          <Text style={[styles.tableColHeader, styles.colQtd]}>Qtd</Text>
          <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
        </View>

        {itens.map((item, index) => (
          <View key={item.id || index} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(index) }]}>
            {/* --- MUDANÇA: Coluna Img removida --- */}
            <Text style={[styles.tableCol, styles.colDesc, { color: contentColor }]}>{item.descricao}</Text>
            <Text style={[styles.tableCol, styles.colMedidas, { color: contentColor }]}>{item.medidas}</Text>

            <Text style={[styles.tableCol, styles.colQtd, { color: contentColor }]}>{item.quantidade.toString()}</Text>
            <Text style={[styles.tableCol, styles.colTotal, { color: themeColor, fontWeight: 'bold' }]}>
              {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        ))}
      </View>

      {/* Totalizador com themeColor */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, paddingRight: 10 }}>
        <Text style={{ fontSize: 10, color: '#666', marginRight: 10 }}>Valor Total:</Text>
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColor }}>
          {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>
      </View>

      <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
        buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)
      )} fixed />
    </Page>
    </Document>

  );
}