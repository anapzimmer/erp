"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatarPreco } from "@/utils/formatarPreco";
import { PDF_HEADER_LAYOUT, PDF_TABLE_LAYOUT, buildPdfFooterText, getPdfZebraRowBackground } from "../shared/pdfLayout";

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
  logoUrl: string | null;
  // Mapeado conforme sua tabela public.configuracoes_branding
  coresEmpresa: {
    primary: string;   // será o button_dark_bg
    secondary: string; // será o button_dark_text
    tertiary: string;  // será o menu_hover_color ou similar para a linha
    textDefault: string; // será o content_text_light_bg
  };
}

export function PerfisPDF({ dados, empresa, logoUrl, coresEmpresa }: PerfisPDFProps) {
  const dataGeracao = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());

  // Definimos a cor do texto: Prioridade para o banco, senão o azul desejado
  const textColor = coresEmpresa.textDefault || '#1C415B';

  const styles = StyleSheet.create({
    page: {
      paddingTop: 40,
      paddingHorizontal: 40,
      paddingBottom: 70,
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
      borderBottomColor: coresEmpresa.tertiary || '#39B89F',
    },
    headerLeft: {
      flexDirection: 'column',
      flex: 1,
    },
    tituloRelatorio: {
      fontSize: PDF_HEADER_LAYOUT.titleSize,
      fontWeight: 'bold',
      color: coresEmpresa.primary || '#1C415B',
      textTransform: 'uppercase',
    },
    subtitulo: {
      fontSize: PDF_HEADER_LAYOUT.subtitleSize,
      color: textColor, // Aplicando a cor aqui também
      marginTop: 2,
      fontWeight: 'bold',
    },
    dataEmissao: {
      fontSize: PDF_HEADER_LAYOUT.dateSize,
      color: '#666',
      marginTop: 6, 
    },
   logo: {
      width: PDF_HEADER_LAYOUT.logoWidth,
      height: PDF_HEADER_LAYOUT.logoHeight,
      objectFit: 'contain',
      objectPosition: 'right',
    },
    
    table: {
      width: '100%',
      marginTop: 10,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: coresEmpresa.primary || '#1C415B',
      borderRadius: 4,
      minHeight: 30,
      alignItems: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth,
      borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor,
      alignItems: 'center',
      paddingVertical: 6,
    },
    tableColHeader: {
      paddingHorizontal: 6,
      color: coresEmpresa.secondary || '#FFFFFF',
      fontSize: PDF_TABLE_LAYOUT.headerFontSize,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      lineHeight: 1.5, 
    },
    // 🔥 Estilo base da coluna (sem a cor aqui para forçar no componente)
    tableCol: {
      paddingHorizontal: 6,
      fontSize: PDF_TABLE_LAYOUT.bodyFontSize,
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.tituloRelatorio}>CATÁLOGO DE PERFIS</Text>
            <Text style={styles.subtitulo}>{empresa}</Text>
            <Text style={styles.dataEmissao}>Emissão em: {dataGeracao}</Text>
          </View>
          <View style={{ width: 120, alignItems: 'flex-end' }}>
            <Image src={logoUrl || "/glasscode.png"} style={styles.logo} />
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colCodigo]}>Código</Text>
            <Text style={[styles.tableColHeader, styles.colNome]}>Descrição</Text>
            <Text style={[styles.tableColHeader, styles.colCor]}>Cor</Text>
            <Text style={[styles.tableColHeader, styles.colCategoria]}>Categoria</Text>
            <Text style={[styles.tableColHeader, styles.colPreco]}>Preço Unit.</Text>
          </View>

          {dados.map((item, index) => (
            <View key={index} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(index) }]}>
              {/* Forçamos a cor diretamente no estilo inline de cada texto */}
              <Text style={[styles.tableCol, styles.colCodigo, { color: textColor }]}>{item.codigo}</Text>
              <Text style={[styles.tableCol, styles.colNome, { color: textColor }]}>{item.nome}</Text>
              <Text style={[styles.tableCol, styles.colCor, { color: textColor }]}>{item.cores || '-'}</Text>
              <Text style={[styles.tableCol, styles.colCategoria, { color: textColor }]}>{item.categoria || '-'}</Text>
              <Text style={[styles.tableCol, styles.colPreco, { fontWeight: 'bold', color: textColor }]}>
                {item.preco ? formatarPreco(item.preco) : 'Consulte'}
              </Text>
            </View>
          ))}
        </View>

        <Text 
          style={styles.footer} 
          render={({ pageNumber, totalPages }) => (
            buildPdfFooterText(empresa, pageNumber, totalPages)
          )} 
          fixed 
        />
      </Page>
    </Document>
  );
}