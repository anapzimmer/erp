"use client"

import React from "react"
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { PDF_HEADER_LAYOUT, buildPdfFooterText } from "../shared/pdfLayout"

type RelatorioObraItem = {
  itemId: string
  projetoNome: string
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
  otimizacao: Array<{
    id: string
    perfilNome: string
    comprimentoBarra: number
    qtdBarras: number
    aproveitamento: number
    desperdicioMm: number
    total: number
  }>
}

type OtimizacaoGlobalItem = {
  id: string
  projetoNome: string
  perfilNome: string
  corMaterial: string
  comprimentoBarra: number
  qtdBarrasOriginal: number
  qtdBarrasOtimizada: number
  aproveitamento: number
  desperdicioMm: number
  precoOtimizado: number
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
  cardTitle: { fontSize: 10.5, fontWeight: "bold", color: "#0F172A" },
  cardMeta: { fontSize: 7.5, color: "#64748B", marginTop: 3 },
  cardBody: { padding: 10 },
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  chip: { fontSize: 7, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 999, marginRight: 4, marginBottom: 4 },
  bloco: { backgroundColor: "#F8FAFC", borderRadius: 8, padding: 8, marginBottom: 8 },
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
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { borderBottomColor: themeColor }]}> 
          <View style={styles.headerLeft}>
            <Text style={[styles.titulo, { color: themeColor }]}>Relatório Técnico da Obra</Text>
            <Text style={styles.subtitulo}>Conferência de vidros, materiais e otimização</Text>
            <Text style={styles.subtitulo}>Emissão em: {new Date().toLocaleDateString("pt-BR")}</Text>
          </View>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>

        <View style={styles.blocoInfos}>
          <View style={[styles.infoBox, { borderLeftColor: themeColor }]}>
            <Text style={styles.infoLabel}>Cliente</Text>
            <Text style={styles.infoValue}>{nomeCliente || "Não informado"}</Text>
          </View>
          <View style={[styles.infoBox, { borderLeftColor: themeColor }]}>
            <Text style={styles.infoLabel}>Obra</Text>
            <Text style={styles.infoValue}>{nomeObra || "Composição de Projetos"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumo por Projeto</Text>
        {relatorioObra.map((obra) => (
          <View key={obra.itemId} style={styles.card} wrap={false}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{obra.projetoNome}</Text>
              <Text style={styles.cardMeta}>Vão {obra.vao} · Quantidade {obra.quantidade} · Vidro {obra.vidro} · Material {obra.corMaterial}</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.row}>
                <View style={styles.col}>
                  <View style={styles.bloco}>
                    <Text style={styles.blocoTitulo}>Tamanhos dos Vidros</Text>
                    {obra.folhas.map((folha) => (
                      <Text key={folha.id} style={styles.linha}>
                        <Text style={styles.destaque}>{folha.titulo}:</Text> {folha.medida} | arred. {folha.medidaCalc} | {folha.area.toFixed(3)} m² | {moeda(folha.total)}
                      </Text>
                    ))}
                  </View>
                </View>

                <View style={styles.col}>
                  <View style={styles.bloco}>
                    <Text style={styles.blocoTitulo}>Materiais</Text>
                    {obra.materiais.length > 0 ? obra.materiais.map((material) => (
                      <Text key={material} style={styles.linha}>{material}</Text>
                    )) : (
                      <Text style={styles.linha}>Sem material adicional</Text>
                    )}
                  </View>

                  <View style={styles.bloco}>
                    <Text style={styles.blocoTitulo}>Otimização de Barras</Text>
                    {obra.otimizacao.length > 0 ? obra.otimizacao.map((item) => (
                      <Text key={item.id} style={styles.linha}>
                        <Text style={styles.destaque}>{item.perfilNome}:</Text> {item.qtdBarras} barra(s) de {item.comprimentoBarra} mm | aproveitamento {item.aproveitamento}% | desperdício {item.desperdicioMm} mm | {moeda(item.total)}
                      </Text>
                    )) : (
                      <Text style={styles.linha}>Item em modo kit, sem otimização de barras.</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        ))}

        {otimizacaoGlobal.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Otimização Global</Text>
            <View style={styles.card}>
              <View style={styles.cardBody}>
                {otimizacaoGlobal.map((item) => (
                  <Text key={item.id} style={styles.linha}>
                    <Text style={styles.destaque}>{item.projetoNome} - {item.perfilNome}:</Text> cor {item.corMaterial} | {item.qtdBarrasOriginal} barra(s) individuais vs {item.qtdBarrasOtimizada} consolidada(s) | barra {item.comprimentoBarra} mm | aproveitamento {item.aproveitamento}% | desperdício {item.desperdicioMm} mm | {moeda(item.precoOtimizado)}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)}
          fixed
        />
      </Page>
    </Document>
  )
}