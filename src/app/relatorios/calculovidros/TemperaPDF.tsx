"use client"

import React from "react"
import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { PDF_HEADER_LAYOUT, buildPdfFooterText } from "../shared/pdfLayout"

const DESENHO_W = 220
const DESENHO_H = 220

type TemperaItem = {
  id: string | number
  descricao: string
  desenhoUrl?: string
  corVidro?: string
  vao?: string
  qtd?: number
}

type TemperaPDFProps = {
  nomeEmpresa: string
  logoUrl?: string | null
  nomeCliente?: string | null
  nomeObra?: string
  themeColor: string
  itens: TemperaItem[]
}

const styles = StyleSheet.create({
  page: { padding: 28, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
    borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
  },
  headerLeft: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: "bold", textTransform: "uppercase" },
  subtitulo: { fontSize: 9, color: "#64748B", marginTop: 2 },
  logo: {
    width: PDF_HEADER_LAYOUT.logoWidth,
    height: PDF_HEADER_LAYOUT.logoHeight,
    objectFit: "contain",
    objectPosition: "right",
  },
  bloco: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  blocoTitulo: { fontSize: 11, fontWeight: "bold", color: "#0F172A", marginBottom: 6 },
  blocoMeta: { fontSize: 8, color: "#475569", marginBottom: 3 },
  destaqueVao: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  destaqueVaoTexto: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1D4ED8",
    textTransform: "uppercase",
  },
  cotaContainer: {
    marginTop: 6,
    padding: 6,
  },
  larguraInfo: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  medidaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  medidaLabel: {
    fontSize: 8,
    color: "#475569",
    fontWeight: "bold",
    marginRight: 4,
    textTransform: "uppercase",
  },
  medidaValor: {
    fontSize: 8,
    color: "#0F172A",
    fontWeight: "bold",
  },
  desenhoArea: {
    flexDirection: "column",
    alignItems: "center",
  },
  desenhoLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  desenhoPrincipal: {
    width: DESENHO_W + 20,
    alignItems: "center",
  },
  desenhoComAltura: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  alturaLateral: {
    marginLeft: 10,
    alignItems: "flex-start",
    justifyContent: "center",
    height: DESENHO_H + 20,
  },
  desenhoWrap: {
    width: DESENHO_W + 20,
    height: DESENHO_H + 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  desenho: { width: DESENHO_W, height: DESENHO_H, objectFit: "contain" },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    textAlign: "center",
    fontSize: 8,
    color: "#94A3B8",
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#CBD5E1",
  },
})

export function TemperaPDF({ nomeEmpresa, logoUrl, nomeCliente, nomeObra, themeColor, itens }: TemperaPDFProps) {
  const itensComDesenho = itens.filter((item) => Boolean(item.desenhoUrl))

  return (
    <Document>
      {itensComDesenho.length > 0 ? itensComDesenho.map((item, pageIndex) => (
        <Page key={`tempera-page-${item.id}-${pageIndex}`} size="A4" style={styles.page}>
          <View style={[styles.header, { borderBottomColor: themeColor, borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth }]}> 
            <View style={styles.headerLeft}>
              <Text style={[styles.titulo, { color: themeColor }]}>Tempera</Text>
              <Text style={styles.subtitulo}>Cliente: {nomeCliente || "Nao informado"}</Text>
              <Text style={styles.subtitulo}>Obra: {nomeObra || "Composicao de Projetos"}</Text>
            </View>
            {logoUrl && <PdfImage src={logoUrl} style={styles.logo} />}
          </View>

          <View style={styles.bloco}>
            <Text style={styles.blocoTitulo}>{item.descricao}</Text>
            <Text style={styles.blocoMeta}>Cor do vidro: {item.corVidro || "-"}</Text>
            <View style={styles.destaqueVao}>
              <Text style={styles.destaqueVaoTexto}>Quantidade de vaos: {item.qtd || 1}</Text>
            </View>

            {(() => {
              const partes = (item.vao || "").split(/\s*[xX]\s*/)
              const larguraMed = partes.length === 2 ? `${partes[0].trim()} mm` : (item.vao || "-")
              const alturaMed = partes.length === 2 ? partes[1].trim() : "-"
              return (
                <View style={styles.cotaContainer}>
                  <View style={styles.desenhoArea}>
                    <View style={styles.desenhoLinha}>
                      <View style={styles.desenhoPrincipal}>
                        <View style={styles.larguraInfo}>
                          <View style={styles.medidaItem}>
                            <Text style={styles.medidaLabel}>Largura:</Text>
                            <Text style={styles.medidaValor}>{larguraMed}</Text>
                          </View>
                        </View>

                        <View style={styles.desenhoComAltura}>
                          <View style={styles.desenhoWrap}>
                            {item.desenhoUrl ? <PdfImage src={item.desenhoUrl} style={styles.desenho} /> : null}
                          </View>
                          <View style={styles.alturaLateral}>
                            <View style={styles.medidaItem}>
                              <Text style={styles.medidaLabel}>Altura:</Text>
                              <Text style={styles.medidaValor}>{alturaMed}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )
            })()}
          </View>

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)}
            fixed
          />
        </Page>
      )) : (
        <Page size="A4" style={styles.page}>
          <View style={[styles.header, { borderBottomColor: themeColor, borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth }]}> 
            <View style={styles.headerLeft}>
              <Text style={[styles.titulo, { color: themeColor }]}>Tempera</Text>
              <Text style={styles.subtitulo}>Cliente: {nomeCliente || "Nao informado"}</Text>
              <Text style={styles.subtitulo}>Obra: {nomeObra || "Composicao de Projetos"}</Text>
            </View>
            {logoUrl && <PdfImage src={logoUrl} style={styles.logo} />}
          </View>
          <Text style={styles.blocoMeta}>Nenhum desenho disponivel para os projetos calculados.</Text>
        </Page>
      )}
    </Document>
  )
}
