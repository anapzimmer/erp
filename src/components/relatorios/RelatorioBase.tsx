// src/components/relatorios/RelatorioBase.tsx
"use client"

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image
} from "@react-pdf/renderer"

interface RelatorioBaseProps {
  titulo: string
  subtitulo?: string
  empresa: string
  logo?: string
  children: React.ReactNode
}

export function RelatorioBase({
  titulo,
  subtitulo,
  empresa,
  logo,
  children
}: RelatorioBaseProps) {

  const styles = StyleSheet.create({
    page: {
      paddingTop: 50,      // Margem superior aumentada
      paddingBottom: 50,   // Margem inferior aumentada
      paddingLeft: 40,     // Margem esquerda
      paddingRight: 40,    // Margem direita
      fontSize: 10,
      fontFamily: "Helvetica"
    },
    header: {
      flexDirection: 'row',       // Alinha os itens em linha
      justifyContent: 'space-between', // Joga o texto para a esquerda e a logo para a direita
      alignItems: 'flex-start',
      marginBottom: 20,
      borderBottom: "1 solid #1C415B", // Cor primária do seu sistema
      paddingBottom: 10
    },
    headerTextGroup: {
      flexDirection: 'column',
      flex: 1
    },
    empresa: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#1C415B"
    },
    titulo: {
      fontSize: 12,
      marginTop: 4,
      color: "#333"
    },
    subtitulo: {
      fontSize: 9,
      marginTop: 2,
      color: "#666"
    },
    logo: {
      width: 80,           // Ajuste o tamanho conforme necessário
      height: 'auto',
      marginLeft: 10       // Pequeno afastamento do texto
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 8,
      color: "#999"
    }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* Grupo de textos à esquerda */}
          <View style={styles.headerTextGroup}>
            <Text style={styles.empresa}>{empresa}</Text>
            <Text style={styles.titulo}>{titulo}</Text>
            {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
          </View>

          {/* Logo à direita */}
          {logo && <Image src={logo} style={styles.logo} />}
        </View>

        {/* Conteúdo da Tabela */}
        <View>
          {children}
        </View>

        <Text
          style={styles.footer}
       render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
  `Página ${pageNumber} de ${totalPages}`
)}
          fixed
        />
      </Page>
    </Document>
  )
}