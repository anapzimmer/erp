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
  logoUrl: string | null;
  coresEmpresa: {
    primary: string;    // button_dark_bg
    secondary: string;  // button_dark_text
    tertiary: string;   // menu_hover_color
    textDefault: string; // content_text_light_bg
  };
}

export function VidrosPDF({ dados, empresa, logoUrl, coresEmpresa }: VidrosPDFProps) {
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
      paddingBottom: 80, // 👈 Aumente de 70 para 80 para dar espaço ao rodapé
      backgroundColor: '#FFFFFF',
      fontFamily: 'Helvetica',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: coresEmpresa.tertiary || '#39B89F',
    },
    headerLeft: {
      flexDirection: 'column',
      flex: 1,
    },
    tituloRelatorio: {
      fontSize: 18,
      fontWeight: 'bold',
      color: coresEmpresa.primary || '#1C415B',
      textTransform: 'uppercase',
    },
    subtitulo: {
      fontSize: 10,
      color: textColor,
      marginTop: 2,
      fontWeight: 'bold',
    },
    dataEmissao: {
      fontSize: 9,
      color: '#666',
      marginTop: 6,
    },
    logo: {
      width: 140,
      height: 45,
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
      borderBottomWidth: 1,
      borderBottomColor: '#EEEEEE',
      alignItems: 'center',
      paddingVertical: 6,
    },
    tableColHeader: {
      paddingHorizontal: 6,
      color: coresEmpresa.secondary || '#FFFFFF',
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      lineHeight: 1.5,
    },
    tableCol: {
      paddingHorizontal: 6,
      fontSize: 8,
    },
    // LARGURAS AJUSTADAS PARA VIDROS (Soma 100%)
    colNome: { width: '45%' },
    colEspessura: { width: '15%', textAlign: 'center' },
    colTipo: { width: '25%' },
    colPreco: { width: '15%', textAlign: 'right' },

   footer: {
  position: 'absolute',
  bottom: 20, // 👈 Diminua um pouco para afastar da tabela
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

        {/* CABEÇALHO PADRONIZADO */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.tituloRelatorio}>Catálogo de Vidros</Text>
            <Text style={styles.subtitulo}>{empresa}</Text>
            <Text style={styles.dataEmissao}>Emissão em: {dataGeracao}</Text>
          </View>

          <View style={{ width: 120, alignItems: 'flex-end' }}>
            <Image src={logoUrl || "/glasscode.png"} style={styles.logo} />
          </View>
        </View>

        {/* TABELA COM CORES DO USUÁRIO */}
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
                { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9F9F9' }
              ]}
            >
              <Text style={[styles.tableCol, styles.colNome, { color: textColor }]}>{item.nome}</Text>
              <Text style={[styles.tableCol, styles.colEspessura, { color: textColor }]}>{item.espessura}</Text>
              <Text style={[styles.tableCol, styles.colTipo, { color: textColor }]}>{item.tipo}</Text>
              <Text style={[styles.tableCol, styles.colPreco, { fontWeight: 'bold', color: textColor }]}>
                {formatarPreco(item.preco)}
              </Text>
            </View>
          ))}
        </View>

        {/* RODAPÉ PADRONIZADO */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => (
            `Glass Code ERP - Licenciado para ${empresa} - Página ${pageNumber} de ${totalPages}`
          )}
          fixed
        />
      </Page>
    </Document>
  );
}