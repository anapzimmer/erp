//app/relatorios/ferragens/FerragensPDF.tsx
"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatarPreco } from "@/utils/formatarPreco";
import type { Ferragem } from "@/types/ferragem";
import { PDF_HEADER_LAYOUT, PDF_TABLE_LAYOUT, buildPdfFooterText, getPdfZebraRowBackground } from "../shared/pdfLayout";

interface FerragensPDFProps {
  dados: Ferragem[];
  empresa: string;
  logoUrl?: string;
  coresEmpresa?: {
    primary?: string;
    tertiary?: string;
    textOnDark?: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: PDF_HEADER_LAYOUT.marginBottom,
    paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
    borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
    borderBottomColor: '#39B89F', // Cor Tema (darkTertiary)
  },
  headerLeft: {
    flexDirection: 'column',
    flex: 1,
  },
  tituloRelatorio: {
    fontSize: PDF_HEADER_LAYOUT.titleSize,
    fontWeight: 'bold',
    color: '#1C415B', // Cor Tema (darkPrimary)
    textTransform: 'uppercase',
  },
  subtitulo: {
    fontSize: PDF_HEADER_LAYOUT.subtitleSize,
    color: '#1C415B',
    marginTop: 2,
    fontWeight: 'bold',
  },
  dataEmissao: {
    fontSize: PDF_HEADER_LAYOUT.dateSize,
    color: '#666',
    marginTop: 6,
  },
  headerRight: {
    width: 140, 
    alignItems: 'flex-end',
  },
  logo: {
    width: PDF_HEADER_LAYOUT.logoWidth,
    height: PDF_HEADER_LAYOUT.logoHeight,
    objectFit: 'contain',
    objectPosition: 'right',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1C415B', // Cor Tema (darkPrimary)
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth,
    borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor,
    alignItems: 'center',
    minHeight: 30,
  },
  tableColHeader: {
    padding: 8,
    color: '#FFFFFF',
    fontSize: PDF_TABLE_LAYOUT.headerFontSize,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableCol: {
    padding: 6,
    fontSize: PDF_TABLE_LAYOUT.bodyFontSize,
    color: '#1C415B', // Padronizado para a cor tema (darkPrimary) em vez de cinza
  },
  // LARGURAS
  colCodigo: { width: '15%' },
  colNome: { width: '40%' },
  colCor: { width: '15%' },
  colCategoria: { width: '15%' },
  colPreco: { width: '15%', textAlign: 'right' },
  
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTopWidth: 0.5,
    borderTopColor: '#DDD',
    paddingTop: 10,
  }
});

export function FerragensPDF({ dados, empresa, logoUrl, coresEmpresa }: FerragensPDFProps) {
  const dataGeracao = new Date().toLocaleDateString('pt-BR');
  const primaryColor = coresEmpresa?.primary || '#1C415B';
  const tertiaryColor = coresEmpresa?.tertiary || '#39B89F';
  const textOnDarkColor = coresEmpresa?.textOnDark || '#FFFFFF';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        <View style={[styles.header, { borderBottomColor: tertiaryColor }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.tituloRelatorio, { color: primaryColor }]}>Catálogo de Ferragens</Text>
            <Text style={[styles.subtitulo, { color: primaryColor }]}>{empresa}</Text>
            <Text style={styles.dataEmissao}>Emissão em: {dataGeracao}</Text>
          </View>

          <View style={styles.headerRight}>
            <Image src={logoUrl || "/glasscode.png"} style={styles.logo} />
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: primaryColor }]}>
            <Text style={[styles.tableColHeader, styles.colCodigo, { color: textOnDarkColor }]}>Código</Text>
            <Text style={[styles.tableColHeader, styles.colNome, { color: textOnDarkColor }]}>Descrição do Produto</Text>
            <Text style={[styles.tableColHeader, styles.colCor, { color: textOnDarkColor }]}>Cor</Text>
            <Text style={[styles.tableColHeader, styles.colCategoria, { color: textOnDarkColor }]}>Categoria</Text>
            <Text style={[styles.tableColHeader, styles.colPreco, { color: textOnDarkColor }]}>Preço Unit.</Text>
          </View>

          {dados.map((item, index) => (
            <View key={item.id || index} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(index) }]}>
              {/* Removido fontWeight bold de todas as colunas abaixo */}
              <Text style={[styles.tableCol, styles.colCodigo, { color: primaryColor }]}>{item.codigo}</Text>
              <Text style={[styles.tableCol, styles.colNome, { color: primaryColor }]}>{item.nome}</Text>
              <Text style={[styles.tableCol, styles.colCor, { color: primaryColor }]}>{item.cores || 'Padrão'}</Text>
              <Text style={[styles.tableCol, styles.colCategoria, { color: primaryColor }]}>{item.categoria || 'Geral'}</Text>
              <Text style={[styles.tableCol, styles.colPreco, { color: primaryColor }]}>
                {item.preco ? formatarPreco(item.preco) : 'Consulte'}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          buildPdfFooterText(empresa, pageNumber, totalPages)
        )} fixed />
      </Page>
    </Document>
  );
}