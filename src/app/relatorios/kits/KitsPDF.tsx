"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatarPreco } from "@/utils/formatarPreco";

// Tipagem baseada na estrutura de Kits
interface Kit {
  id: number;
  nome: string;
  largura: number;
  altura: number;
  categoria: string | null;
  cores: string | null;
  preco: number | null;
}

interface KitsPDFProps {
  dados: Kit[];
  empresa: string;
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
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#39B89F', // A linha verde característica
  },
  headerLeft: {
    flexDirection: 'column',
  },
  tituloRelatorio: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C415B', // DarkPrimary
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
    backgroundColor: '#1C415B', // DarkPrimary
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
    color: '#1C415B', 
  },
  // Ajuste de larguras das colunas para Kits
  colNome: { width: '35%' },
  colMedidas: { width: '20%' },
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

export function KitsPDF({ dados, empresa }: KitsPDFProps) {
  const dataGeracao = new Date().toLocaleDateString('pt-BR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.tituloRelatorio}>Catálogo de Kits</Text>
            <Text style={styles.subtitulo}>Gerado em: {dataGeracao}</Text>
          </View>
          <View style={styles.headerRight}>
            <Image src="/glasscode.png" style={styles.logo} />
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colNome]}>Descrição do Kit</Text>
            <Text style={[styles.tableColHeader, styles.colMedidas]}>Medidas (LxA)</Text>
            <Text style={[styles.tableColHeader, styles.colCor]}>Cor</Text>
            <Text style={[styles.tableColHeader, styles.colCategoria]}>Categoria</Text>
            <Text style={[styles.tableColHeader, styles.colPreco]}>Preço</Text>
          </View>

          {dados.map((item, index) => (
            <View key={item.id || index} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }]}>
              <Text style={[styles.tableCol, styles.colNome]}>{item.nome}</Text>
              <Text style={[styles.tableCol, styles.colMedidas]}>
                {item.largura} x {item.altura} mm
              </Text>
              <Text style={[styles.tableCol, styles.colCor]}>{item.cores || 'Padrão'}</Text>
              <Text style={[styles.tableCol, styles.colCategoria]}>{item.categoria || 'Kits'}</Text>
              <Text style={[styles.tableCol, styles.colPreco]}>
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