"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatarPreco } from "@/utils/formatarPreco";

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
  logoUrl: string | null;
  coresEmpresa: {
    primary: string;
    secondary: string;
    tertiary: string;
    textDefault: string;
  };
}

export function KitsPDF({ dados, empresa, logoUrl, coresEmpresa }: KitsPDFProps) {
  const dataGeracao = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date());

  const textColor = coresEmpresa.textDefault || '#1C415B';

  const styles = StyleSheet.create({
    page: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 70, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: coresEmpresa.tertiary || '#39B89F' },
    headerLeft: { flexDirection: 'column', flex: 1 },
    tituloRelatorio: { fontSize: 18, fontWeight: 'bold', color: coresEmpresa.primary || '#1C415B', textTransform: 'uppercase' },
    subtitulo: { fontSize: 10, color: textColor, marginTop: 2, fontWeight: 'bold' },
    dataEmissao: { fontSize: 9, color: '#666', marginTop: 6 },
    logo: { width: 140, height: 45, objectFit: 'contain', objectPosition: 'right' },
    table: { width: '100%', marginTop: 10 },
    tableHeader: { flexDirection: 'row', backgroundColor: coresEmpresa.primary || '#1C415B', borderRadius: 4, minHeight: 30, alignItems: 'center' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEEEEE', alignItems: 'center', paddingVertical: 6 },
    tableColHeader: { paddingHorizontal: 6, color: coresEmpresa.secondary || '#FFFFFF', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
    tableCol: { paddingHorizontal: 6, fontSize: 8 },
    colNome: { width: '30%' },
    colMedidas: { width: '20%' },
    colCor: { width: '20%' },
    colCategoria: { width: '15%' },
    colPreco: { width: '15%', textAlign: 'right' },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999', borderTopWidth: 0.5, borderTopColor: '#DDD', paddingTop: 10 }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.tituloRelatorio}>CATÁLOGO DE KITS</Text>
            <Text style={styles.dataEmissao}>Emissão em: {dataGeracao}</Text>
          </View>
          <View style={{ width: 120, alignItems: 'flex-end' }}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colNome]}>Nome</Text>
            <Text style={[styles.tableColHeader, styles.colMedidas]}>Medidas (mm)</Text>
            <Text style={[styles.tableColHeader, styles.colCor]}>Cor</Text>
            <Text style={[styles.tableColHeader, styles.colCategoria]}>Cat.</Text>
            <Text style={[styles.tableColHeader, styles.colPreco]}>Preço</Text>
          </View>

          {dados.map((item, index) => (
            <View key={index} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9F9F9' }]}>
              <Text style={[styles.tableCol, styles.colNome, { color: textColor }]}>{item.nome}</Text>
              <Text style={[styles.tableCol, styles.colMedidas, { color: textColor }]}>{`${item.largura} x ${item.altura}`}</Text>
              <Text style={[styles.tableCol, styles.colCor, { color: textColor }]}>{item.cores || '-'}</Text>
              <Text style={[styles.tableCol, styles.colCategoria, { color: textColor }]}>{item.categoria || '-'}</Text>
              <Text style={[styles.tableCol, styles.colPreco, { fontWeight: 'bold', color: textColor }]}>
                {item.preco ? formatarPreco(item.preco) : 'Consulte'}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (`Glass Code ERP - Licenciado para ${empresa} - Página ${pageNumber} de ${totalPages}`)} fixed />
      </Page>
    </Document>
  );
}