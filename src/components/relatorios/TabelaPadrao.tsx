import { View, Text, StyleSheet } from "@react-pdf/renderer"

interface Coluna {
  titulo: string
  largura?: number
}

interface TabelaPadraoProps {
  colunas: Coluna[]
  dados: Record<string, any>[]
}

export function TabelaPadrao({ colunas, dados }: TabelaPadraoProps) {

  const styles = StyleSheet.create({
    table: {
      width: "100%",
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: "#000"
    },
    row: {
      flexDirection: "row"
    },
    headerCell: {
      fontWeight: "bold",
      backgroundColor: "#eee"
    },
    cell: {
      borderRight: 1,
      borderBottom: 1,
      padding: 4,
      flex: 1
    }
  })

  return (
    <View style={styles.table}>
      <View style={styles.row}>
        {colunas.map((col, i) => (
          <Text key={i} style={[styles.cell, styles.headerCell]}>
            {col.titulo}
          </Text>
        ))}
      </View>

      {dados.map((item, i) => (
        <View key={i} style={styles.row}>
          {colunas.map((col, j) => (
            <Text key={j} style={styles.cell}>
              {item[col.titulo.toLowerCase()] ?? "-"}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}
