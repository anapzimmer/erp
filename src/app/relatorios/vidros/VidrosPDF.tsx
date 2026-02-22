"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatarPreco } from "@/utils/formatarPreco";

// Tipagem baseada no seu componente de Vidros
interface Vidro {
  id?: string;
  nome: string;
  espessura: string;
  tipo: string;
  preco: number;
}

interface VidrosPDFProps {
  dados: Vidro[];
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
    alignItems: 'flex-end',
    marginBottom: 30,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#39B89F', // Cor Tema (darkTertiary) igual ao ferragens
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
    color: '#1C415B', 
  },
  // LARGURAS AJUSTADAS PARA VIDROS
  colNome: { width: '40%' },
  colEspessura: { width: '20%' },
  colTipo: { width: '25%' },
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

export function VidrosPDF({ dados, empresa }: VidrosPDFProps) {
  const dataGeracao = new Date().toLocaleDateString('pt-BR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.tituloRelatorio}>Catálogo de Vidros</Text>
            <Text style={styles.subtitulo}>Gerado em: {dataGeracao}</Text>
          </View>

          <View style={styles.headerRight}>
            <Image src="/glasscode.png" style={styles.logo} />
          </View>
        </View>

        {/* TABELA */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colNome]}>Descrição do Vidro</Text>
            <Text style={[styles.tableColHeader, styles.colEspessura]}>Espessura</Text>
            <Text style={[styles.tableColHeader, styles.colTipo]}>Tipo</Text>
            <Text style={[styles.tableColHeader, styles.colPreco]}>Preço m²</Text>
          </View>

          {dados.map((item, index) => (
            <View 
              key={item.id || index} 
              style={[
                styles.tableRow, 
                { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }
              ]}
            >
              <Text style={[styles.tableCol, styles.colNome]}>{item.nome}</Text>
              <Text style={[styles.tableCol, styles.colEspessura]}>{item.espessura}</Text>
              <Text style={[styles.tableCol, styles.colTipo]}>{item.tipo}</Text>
              <Text style={[styles.tableCol, styles.colPreco]}>
                {formatarPreco(item.preco)}
              </Text>
            </View>
          ))}
        </View>

        {/* RODAPÉ DINÂMICO */}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Sistema Glass Code - Licenciado para ${empresa} - Página ${pageNumber} de ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
}