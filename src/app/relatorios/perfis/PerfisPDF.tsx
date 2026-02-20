//app/relatorios/perfis/PerfisPDF.tsx
"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatarPreco } from "@/utils/formatarPreco";

// AQUI ESTÁ O AJUSTE: Definimos o que é um Perfil diretamente aqui
interface Perfil {
  id?: string;
  codigo: string;
  nome: string;
  cores: string;
  preco: number | null;
  categoria: string;
}

interface PerfisPDFProps {
  dados: Perfil[];
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
  alignItems: 'center', // Alinhado ao centro para a logo e o título
  marginBottom: 20,
  paddingBottom: 10,
  borderBottomWidth: 2,
  borderBottomColor: '#39B89F', // A linha verde da imagem
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

export function PerfisPDF({ dados, empresa }: PerfisPDFProps) {
  const dataGeracao = new Date().toLocaleDateString('pt-BR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.tituloRelatorio}>Catálogo de Perfis de Alumínio</Text>
            <Text style={styles.subtitulo}>Gerado em: {dataGeracao}</Text>
          </View>
          <View style={styles.headerRight}>
            <Image src="/glasscode.png" style={styles.logo} />
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colCodigo]}>Código</Text>
            <Text style={[styles.tableColHeader, styles.colNome]}>Descrição do Perfil</Text>
            <Text style={[styles.tableColHeader, styles.colCor]}>Cor</Text>
            <Text style={[styles.tableColHeader, styles.colCategoria]}>Categoria</Text>
            <Text style={[styles.tableColHeader, styles.colPreco]}>Preço Unit.</Text>
          </View>

          {dados.map((item, index) => (
            <View key={item.id || index} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }]}>
              <Text style={[styles.tableCol, styles.colCodigo]}>{item.codigo}</Text>
              <Text style={[styles.tableCol, styles.colNome]}>{item.nome}</Text>
              <Text style={[styles.tableCol, styles.colCor]}>{item.cores || 'Padrão'}</Text>
              <Text style={[styles.tableCol, styles.colCategoria]}>{item.categoria || 'Geral'}</Text>
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