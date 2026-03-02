// src/app/relatorios/espelhos/EspelhosPDF.tsx
"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image as PDFImage, Font } from '@react-pdf/renderer';

// Nota: Para um visual ainda mais delicado, você poderia registrar uma fonte customizada (ex: Roboto Light)
// Font.register({ family: 'Roboto', src: '...' });

interface ItemPedido {
  id: number;
  descricao: string;
  medidas: string;
  quantidade: number;
  total: number;
}

interface EspelhosPDFProps {
  itens: any[];
  nomeEmpresa: string;
  logoUrl?: string;
  themeColor: string;
  nomeCliente?: string; // ADICIONE ESTA LINHA
  nomeObra?: string;    // ADICIONE ESTA LINHA
}

const createStyles = (themeColor: string) => StyleSheet.create({
  page: { padding: 40, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  
  // Cabeçalho Delicado
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  headerLeft: { flexDirection: 'column' },
  empresaNome: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  tituloRelatorio: { fontSize: 24, fontWeight: 'light', color: themeColor, marginTop: 10 },
  headerRight: { width: 100, height: 50, alignItems: 'flex-end' },
  logo: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  
  // Seção de Clientes Refinada
  infoSection: { marginBottom: 30, padding: 15, backgroundColor: '#fbfbfb', borderRadius: 4, borderLeftWidth: 2, borderLeftColor: themeColor },
  infoRow: { flexDirection: 'row', marginBottom: 5 },
  infoLabel: { fontSize: 9, color: '#777', width: 50 },
  infoValue: { fontSize: 9, color: '#333', fontWeight: 'bold' },

  // Tabela Minimalista
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 12 },
  
  colDesc: { width: '50%', fontSize: 9, color: '#333' },
  colMedidas: { width: '20%', fontSize: 9, color: '#555' },
  colQtd: { width: '10%', fontSize: 9, color: '#555', textAlign: 'center' },
  colTotal: { width: '20%', fontSize: 9, color: '#333', textAlign: 'right', fontWeight: 'bold' },
  
  headerColText: { fontSize: 8, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', letterSpacing: 1 },

  // Rodapé Leve
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: '#bbb' },
});

export function EspelhosPDF({ 
  itens, 
  nomeEmpresa, 
  logoUrl, 
  themeColor, 
  nomeCliente, 
  nomeObra 
}: EspelhosPDFProps) {
  const styles = createStyles(themeColor);
  const totalGeral = itens.reduce((sum, item) => sum + item.total, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.empresaNome}>{nomeEmpresa}</Text>
            <Text style={styles.tituloRelatorio}>Orçamento</Text>
            <Text style={{ fontSize: 9, color: '#999', marginTop: 5 }}>Emitido em: {new Date().toLocaleDateString('pt-BR')}</Text>
          </View>
          <View style={styles.headerRight}>
            {logoUrl && <PDFImage src={logoUrl} style={styles.logo} />}
          </View>
        </View>

        {/* Informações do Cliente/Obra */}
        {(nomeCliente || nomeObra) && (
          <View style={styles.infoSection}>
            {nomeCliente && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cliente:</Text>
                <Text style={styles.infoValue}>{nomeCliente}</Text>
              </View>
            )}
            {nomeObra && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Obra:</Text>
                <Text style={styles.infoValue}>{nomeObra}</Text>
              </View>
            )}
          </View>
        )}

        {/* Tabela */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, styles.headerColText]}>Descrição</Text>
            <Text style={[styles.colMedidas, styles.headerColText]}>Medidas</Text>
            <Text style={[styles.colQtd, styles.headerColText]}>Qtd</Text>
            <Text style={[styles.colTotal, styles.headerColText]}>Total</Text>
          </View>

          {itens.map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.descricao}</Text>
              <Text style={styles.colMedidas}>{item.medidas}</Text>
              <Text style={styles.colQtd}>{item.quantidade}</Text>
              <Text style={[styles.colTotal, { color: '#333' }]}>
                {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
          ))}
        </View>

        {/* Total Geral */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbfbfb', padding: 10, borderRadius: 4 }}>
            <Text style={{ fontSize: 10, color: '#777', marginRight: 15 }}>Total Geral</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: themeColor }}>
              {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (`Página ${pageNumber} de ${totalPages}`)} fixed />
      </Page>
    </Document>
  );
}