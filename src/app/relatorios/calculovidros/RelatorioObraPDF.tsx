"use client"

import React from "react"
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { PDF_HEADER_LAYOUT, buildPdfFooterText } from "../shared/pdfLayout"

type RelatorioObraItem = {
  itemId: string
  projetoNome: string
  desenhoUrl?: string | null
  quantidade: number
  vao: string
  vidro: string
  corMaterial: string
  folhas: Array<{
    id: string
    titulo: string
    medida: string
    medidaCalc: string
    area: number
    total: number
  }>
  materiais: string[]
  ferragens: Array<{
    id: string
    nome: string
    codigo?: string | null
    qtd: number
    total: number
  }>
  otimizacao: Array<{
    id: string
    perfilCodigo?: string
    perfilNome: string
    comprimentoBarra: number
    qtdBarras: number
    aproveitamento: number
    desperdicioMm: number
    total: number
    barras?: Array<{
      numero: number
      cortes: number[]
      usadoMm: number
      sobraMm: number
    }>
  }>
}

type OtimizacaoGlobalItem = {
  id: string
  projetoNome: string
  perfilNome: string
  perfilCodigo?: string
  corMaterial: string
  comprimentoBarra: number
  qtdBarrasOriginal: number
  qtdBarrasOtimizada: number
  aproveitamento: number
  desperdicioMm: number
  precoOtimizado: number
  barras?: Array<{
    numero: number
    cortes: number[]
    usadoMm: number
    sobraMm: number
  }>
}

type RelatorioObraPDFProps = {
  nomeEmpresa: string
  logoUrl?: string | null
  nomeCliente?: string | null
  nomeObra?: string | null
  themeColor: string
  relatorioObra: RelatorioObraItem[]
  otimizacaoGlobal: OtimizacaoGlobalItem[]
}

const styles = StyleSheet.create({
  page: { padding: 32, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: PDF_HEADER_LAYOUT.marginBottom,
    paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
    borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
  },
  headerLeft: { flex: 1 },
  logo: {
    width: PDF_HEADER_LAYOUT.logoWidth,
    height: PDF_HEADER_LAYOUT.logoHeight,
    objectFit: "contain",
    objectPosition: "right",
  },
  titulo: { fontSize: 18, fontWeight: "bold", textTransform: "uppercase" },
  subtitulo: { fontSize: 10, color: "#64748B", marginTop: 3 },
  blocoInfos: { flexDirection: "row", gap: 10, marginBottom: 16 },
  infoBox: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 8, padding: 10, borderLeftWidth: 3 },
  infoLabel: { fontSize: 6.5, textTransform: "uppercase", color: "#94A3B8", marginBottom: 3, fontWeight: "bold" },
  infoValue: { fontSize: 9.5, color: "#0F172A", fontWeight: "bold" },
  sectionTitle: { fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "#334155", marginBottom: 8 },
  card: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  cardHeader: { padding: 10, backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  cardHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  desenhoBox: {
    width: 84,
    height: 58,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    padding: 4,
  },
  desenhoImg: { width: "100%", height: "100%", objectFit: "contain" },
  cardTitle: { fontSize: 10.5, fontWeight: "bold", color: "#0F172A" },
  cardMeta: { fontSize: 7.5, color: "#64748B", marginTop: 3 },
  cardBody: { padding: 10 },
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  chip: { fontSize: 7, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 999, marginRight: 4, marginBottom: 4 },
  bloco: { backgroundColor: "#F8FAFC", borderRadius: 8, padding: 8, marginBottom: 10 },
  desenhoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
  },
  desenhoMiniaturaBox: {
    width: 150,
    height: 108,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    padding: 4,
  },
  desenhoMiniatura: { width: "100%", height: "100%", objectFit: "contain" },
  desenhoTexto: { flex: 1 },
  blocoTitulo: { fontSize: 8.5, fontWeight: "bold", color: "#334155", marginBottom: 5 },
  linha: { fontSize: 7.5, color: "#475569", marginBottom: 3 },
  destaque: { fontWeight: "bold", color: "#0F172A" },
  footer: {
    position: "absolute", bottom: 18, left: 32, right: 32,
    textAlign: "center", fontSize: 8, color: "#94A3B8",
    paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#CBD5E1"
  },
})

const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function RelatorioObraPDF({
  nomeEmpresa,
  logoUrl,
  nomeCliente,
  nomeObra,
  themeColor,
  relatorioObra,
  otimizacaoGlobal,
}: RelatorioObraPDFProps) {
  const desenhosLista = relatorioObra
    .filter((obra) => Boolean(obra.desenhoUrl))
    .map((obra) => ({
      id: `desenho-${obra.itemId}`,
      projetoNome: obra.projetoNome,
      vao: obra.vao,
      desenhoUrl: obra.desenhoUrl as string,
      folhas: obra.folhas,
    }))

  const ferragensMap = new Map<string, { nome: string; codigo?: string | null; qtd: number; total: number }>()
  relatorioObra.forEach((obra) => {
    obra.ferragens.forEach((ferragem) => {
      const atual = ferragensMap.get(ferragem.nome)
      if (atual) {
        atual.qtd += ferragem.qtd
        atual.total += ferragem.total
        return
      }

      ferragensMap.set(ferragem.nome, {
        nome: ferragem.nome,
        codigo: ferragem.codigo || null,
        qtd: ferragem.qtd,
        total: ferragem.total,
      })
    })
  })

  const ORDEM_FERRAGENS = ["roldana", "batente", "fecho", "fechadura", "puxador", "trinco", "castanha"]
  const ORDEM_PERFIS = ["superior", "capa", "inferior", "clic", "baguete", "transpasse", "cadeirinha", "tubo"]

  const idxInstalacao = (ordem: string[]) => (nome: string) => {
    const lower = nome.toLowerCase()
    const idx = ordem.findIndex((kw) => lower.includes(kw))
    return idx === -1 ? ordem.length : idx
  }

  const ferragensLista = Array.from(ferragensMap.values()).sort((a, b) => {
    const diff = idxInstalacao(ORDEM_FERRAGENS)(a.nome) - idxInstalacao(ORDEM_FERRAGENS)(b.nome)
    return diff !== 0 ? diff : a.nome.localeCompare(b.nome, "pt-BR")
  })

  const otimizacaoGlobalOrdenada = [...otimizacaoGlobal].sort((a, b) => {
    const diff = idxInstalacao(ORDEM_PERFIS)(a.perfilNome) - idxInstalacao(ORDEM_PERFIS)(b.perfilNome)
    return diff !== 0 ? diff : a.perfilNome.localeCompare(b.perfilNome, "pt-BR")
  })

  const otimizacaoPorBarra = otimizacaoGlobalOrdenada.flatMap((grupo) =>
    (grupo.barras || []).map((barra, idx) => ({
      id: `${grupo.id}-barra-${idx + 1}`,
      perfilCodigo: grupo.perfilCodigo || "-",
      perfilNome: grupo.perfilNome,
      barraNumero: idx + 1,
      cortes: barra.cortes,
    }))
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { borderBottomColor: themeColor, borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth }]}> 
          <View style={styles.headerLeft}>
            <Text style={[styles.titulo, { color: themeColor }]}>Relatório Técnico da Obra</Text>
            <Text style={styles.subtitulo}>Conferência de vidros, materiais e otimização</Text>
            <Text style={styles.subtitulo}>Emissão em: {new Date().toLocaleDateString("pt-BR")}</Text>
          </View>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>

        <View style={styles.blocoInfos}>
          <View style={[styles.infoBox, { borderLeftColor: themeColor, borderLeftWidth: 3 }]}>
            <Text style={styles.infoLabel}>Cliente</Text>
            <Text style={styles.infoValue}>{nomeCliente || "Não informado"}</Text>
          </View>
          <View style={[styles.infoBox, { borderLeftColor: themeColor, borderLeftWidth: 3 }]}>
            <Text style={styles.infoLabel}>Obra</Text>
            <Text style={styles.infoValue}>{nomeObra || "Composição de Projetos"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Desenhos dos Projetos</Text>
        <View style={styles.bloco}>
          <Text style={styles.blocoTitulo}>Referência visual e relação de vidros por projeto</Text>
          {desenhosLista.length > 0 ? desenhosLista.map((desenho) => (
            <View key={desenho.id} style={styles.desenhoLinha}>
              <View style={styles.desenhoMiniaturaBox}>
                <Image src={desenho.desenhoUrl} style={styles.desenhoMiniatura} />
              </View>
              <View style={styles.desenhoTexto}>
                <Text style={styles.linha}>
                  <Text style={styles.destaque}>{desenho.projetoNome}</Text>
                </Text>
                <Text style={styles.linha}>Vão: {desenho.vao}</Text>
                {desenho.folhas.map((folha) => (
                  <Text key={folha.id} style={styles.linha}>
                    {folha.titulo}: {folha.medida} | arred. {folha.medidaCalc}
                  </Text>
                ))}
              </View>
            </View>
          )) : (
            <Text style={styles.linha}>Nenhum desenho disponível para os projetos calculados.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Materiais - Ferragens</Text>
        <View style={styles.bloco}>
          <Text style={styles.blocoTitulo}>Nome e quantidade total</Text>
          {ferragensLista.length > 0 ? ferragensLista.map((ferragem) => (
            <Text key={ferragem.nome} style={styles.linha}>
              <Text style={styles.destaque}>{ferragem.codigo ? `${ferragem.codigo} | ` : ""}{ferragem.nome}:</Text> {ferragem.qtd} un | {moeda(ferragem.total)}
            </Text>
          )) : (
            <Text style={styles.linha}>Sem ferragens na composição.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Otimização de Barras</Text>
        <View style={styles.bloco}>
          <Text style={styles.blocoTitulo}>Código, perfil e medidas tiradas por barra</Text>
          {otimizacaoPorBarra.length > 0 ? otimizacaoPorBarra.map((item) => (
            <Text key={item.id} style={styles.linha}>
              <Text style={styles.destaque}>{item.perfilCodigo}</Text> | {item.perfilNome} | barra {item.barraNumero} | cortes: {[...item.cortes].sort((a, b) => b - a).join(" · ")} mm
            </Text>
          )) : (
            <Text style={styles.linha}>Sem itens em modo barra para otimização.</Text>
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)}
          fixed
        />
      </Page>
    </Document>
  )
}