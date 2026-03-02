// src/app/relatorios/espelhos/EspelhosPDF.tsx
"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// --- TIPAGENS (Refletindo o contexto do Espelho) ---
interface ItemPedido {
  id: number;
  descricao: string;
  medidas: string;
  quantidade: number;
  total: number;
  tipoVisual: string; // ex: 'oval', 'jogo', 'padrao'
  designUrl?: string; // --- ADICIONADO: URL do desenho técnico ---
}

interface EspelhosPDFProps {
  itens: ItemPedido[];
  nomeEmpresa: string;
  logoUrl?: string; // --- ADICIONADO: prop logoUrl ---
  themeColor: string; // --- ADICIONADO: Cor do Tema (contentTextLightBg) ---
}

// --- ESTILOS DO PDF (Baseado no exemplo Ferragens) ---
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
    borderBottomColor: '#39B89F', // Cor Tema (menuIconColor)
  },
  headerLeft: {
    flexDirection: 'column',
  },
  tituloRelatorio: {
    fontSize: 16,
    fontWeight: 'bold',
    // --- CORREÇÃO: Cor dinâmica do tema ---
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
    // --- CORREÇÃO: Cor dinâmica do tema ---
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    alignItems: 'center',
    minHeight: 40, // Aumentado para acomodar a imagem
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
    // --- CORREÇÃO: Cor dinâmica do tema ---
  },
  // --- ADICIONADO: Estilo para a imagem do desenho ---
  designImage: {
    width: 30,
    height: 30,
    objectFit: 'contain',
  },
  // LARGURAS
  colDesenho: { width: '10%' },
  colDesc: { width: '40%' },
  colMedidas: { width: '20%' },
  colQtd: { width: '10%' },
  colTotal: { width: '20%', textAlign: 'right' },

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

export function EspelhosPDF({ itens, nomeEmpresa, logoUrl, themeColor }: EspelhosPDFProps) {
  const dataGeracao = new Date().toLocaleDateString('pt-BR');
  const totalGeral = itens.reduce((sum, item) => sum + item.total, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.tituloRelatorio, { color: themeColor }]}>Orçamento de Espelhos</Text>
            <Text style={styles.subtitulo}>Gerado em: {dataGeracao}</Text>
          </View>

          <View style={styles.headerRight}>
            {/* --- ADICIONADO: Logo dinâmico --- */}
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          </View>
        </View>

        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableHeader, { backgroundColor: themeColor }]}>
            <Text style={[styles.tableColHeader, styles.colDesenho]}>Desenho</Text>
            <Text style={[styles.tableColHeader, styles.colDesc]}>Descrição</Text>
            <Text style={[styles.tableColHeader, styles.colMedidas]}>Medidas</Text>
            <Text style={[styles.tableColHeader, styles.colQtd]}>Qtd</Text>
            <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
          </View>

          {/* Rows */}
          {itens.map((item, index) => (
            <View 
              key={item.id || index} 
              style={[
                styles.tableRow, 
                { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }
              ]}
            >
              {/* Coluna Desenho */}
              <View style={[styles.tableCol, styles.colDesenho]}>
                {item.designUrl && <Image src={item.designUrl} style={styles.designImage} />}
              </View>
              
              <Text style={[styles.tableCol, styles.colDesc, { color: themeColor }]}>{item.descricao}</Text>
              <Text style={[styles.tableCol, styles.colMedidas]}>{item.medidas}</Text>
              <Text style={[styles.tableCol, styles.colQtd]}>{item.quantidade.toString()}</Text>
              <Text style={[styles.tableCol, styles.colTotal, { color: themeColor }]}>
                {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Totalizador simples no final da tabela se preferir, ou footer fixo */}
        <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingRight: 10}}>
            <Text style={{fontSize: 10, fontWeight: 'bold', marginRight: 10}}>Total Geral:</Text>
            <Text style={{fontSize: 10, fontWeight: 'bold', color: themeColor}}>
                {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Sistema Glass Code - Licenciado para ${nomeEmpresa} - Página ${pageNumber} de ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
}