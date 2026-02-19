"use client"
import { RelatorioBase } from "@/components/relatorios/RelatorioBase"
import { TabelaPadrao } from "@/components/relatorios/TabelaPadrao"
import type { Ferragem } from "@/types/ferragem"

interface FerragensPDFProps {
  dados: Ferragem[];
  empresa: string;
}

export function FerragensPDF({ dados, empresa }: FerragensPDFProps) {
  const colunas = [
    { titulo: "Codigo", largura: 20 },
    { titulo: "Nome", largura: 40 },
    { titulo: "Cores", largura: 20 },
    { titulo: "Preco", largura: 20 }
  ]

  return (
    <RelatorioBase 
      titulo="Catálogo de Ferragens" 
      empresa={empresa}
      logo="/glasscode2.png" 
    >
      <TabelaPadrao colunas={colunas} dados={dados} />
    </RelatorioBase>
  )
}