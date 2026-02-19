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
      padding: 40,
      fontSize: 10,
      fontFamily: "Helvetica"
    },
    header: {
      marginBottom: 20,
      borderBottom: "1 solid #000",
      paddingBottom: 10
    },
    empresa: {
      fontSize: 14,
      fontWeight: "bold"
    },
    titulo: {
      fontSize: 12,
      marginTop: 4
    },
    subtitulo: {
      fontSize: 9,
      marginTop: 2
    },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 8
    }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        <View style={styles.header}>
          {logo && <Image src={logo} style={{ width: 80, marginBottom: 5 }} />}
          <Text style={styles.empresa}>{empresa}</Text>
          <Text style={styles.titulo}>{titulo}</Text>
          {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
        </View>

        {children}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
