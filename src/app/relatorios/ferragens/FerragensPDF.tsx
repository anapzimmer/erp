import { PDFDownloadLink } from "@react-pdf/renderer"
import { RelatorioBase } from "@/components/relatorios/RelatorioBase"
import { TabelaPadrao } from "@/components/relatorios/TabelaPadrao"
import { Ferragem, Branding } from "@/types/relatorios"

interface FerragensPDFProps {
  ferragens: Ferragem[]
  branding: Branding
}

export function FerragensPDF({ ferragens, branding }: FerragensPDFProps) {

  const colunas = [
    { titulo: "Código" },
    { titulo: "Nome" },
    { titulo: "Cor" },
    { titulo: "Categoria" },
    { titulo: "Preço" }
  ]

  const dados = ferragens.map(f => ({
    código: f.codigo,
    nome: f.nome,
    cor: f.cor,
    categoria: f.categoria,
    preço: f.preco
  }))

  return (
    <PDFDownloadLink
      document={
        <RelatorioBase
          titulo="Relatório de Ferragens"
          empresa={branding.nome_empresa}
          logo={branding.logo_url}
        >
          <TabelaPadrao colunas={colunas} dados={dados} />
        </RelatorioBase>
      }
      fileName="relatorio-ferragens.pdf"
    >
      {({ loading }) =>
        loading ? "Gerando PDF..." : "Exportar PDF"
      }
    </PDFDownloadLink>
  )
}
