//app/relatorios/ferragens/FerragensPDF.tsx
"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatarPreco } from "@/utils/formatarPreco";
import type { Ferragem } from "@/types/ferragem";

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
    alignItems: 'flex-end',
    marginBottom: 30,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#39B89F', // Cor Tema (darkTertiary)
  },
  headerLeft: {
    flexDirection: 'column',
  },
  tituloRelatorio: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C415B', // Cor Tema (darkPrimary)
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitulo: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    width: 140, 
    alignItems: 'flex-end',
  },
  logo: {
    width: 150,
    objectFit: 'contain',
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
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    alignItems: 'center',
    minHeight: 30,
  },
  tableColHeader: {
    padding: 8,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableCol: {
    padding: 6,
    fontSize: 9,
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
            <Text style={styles.subtitulo}>Gerado em: {dataGeracao}</Text>
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
            <View key={item.id || index} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }]}>
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
          `Sistema Glass Code - Licenciado para ${empresa} - Página ${pageNumber} de ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
}