"use client"

import React from "react"
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { PDF_HEADER_LAYOUT, buildPdfFooterText } from "../shared/pdfLayout"
import { compareFerragensByNome } from "@/utils/ordemTecnica"

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items]

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks.length > 0 ? chunks : [[]]
}

const extrairMedidasVao = (vao?: string | null) => {
  const partes = String(vao || "").split(/\s*[xX]\s*/)
  if (partes.length !== 2) {
    return { largura: vao || "-", altura: "-" }
  }

  return {
    largura: `${partes[0].trim()} mm`,
    altura: `${partes[1].trim()} mm`,
  }
}

type RelatorioObraItem = {
  itemId: string
  projetoNome: string
  desenhoUrl?: string | null
  variacaoLabel?: string | null
  quantidade: number
  vao: string
  vidro: string
  corMaterial: string
  modoCalculo: string
  subtotal: number
  folhas: Array<{
    id: string
    titulo: string
    medida: string
    medidaCalc: string
    area: number
    total: number
  }>
  kitNome?: string | null
  kitQuantidade?: number
  perfis: string[]
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
  coverPage: { padding: 40, backgroundColor: "#FFFFFF", fontFamily: "Helvetica", justifyContent: "space-between" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: PDF_HEADER_LAYOUT.marginBottom,
    paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
    borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
  },
  headerLeft: { flex: 1 },
  coverTop: { alignItems: "center", marginTop: 32 },
  coverLogo: {
    width: 180,
    height: 72,
    objectFit: "contain",
    marginBottom: 24,
  },
  coverKicker: { fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 },
  coverTitle: { fontSize: 24, fontWeight: "bold", textTransform: "uppercase", textAlign: "center" },
  coverSubtitle: { fontSize: 11, color: "#475569", marginTop: 8, textAlign: "center" },
  coverInfoWrap: { marginTop: 28, width: "100%" },
  coverInfoBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginBottom: 10,
  },
  coverInfoLabel: { fontSize: 7, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4, fontWeight: "bold" },
  coverInfoValue: { fontSize: 12, color: "#0F172A", fontWeight: "bold" },
  coverResumoGrid: { flexDirection: "row", gap: 10, marginTop: 14 },
  coverResumoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  coverResumoLabel: { fontSize: 7, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4, fontWeight: "bold" },
  coverResumoValor: { fontSize: 14, color: "#0F172A", fontWeight: "bold" },
  coverModesWrap: { marginTop: 14 },
  coverModesTitle: { fontSize: 8, color: "#64748B", textTransform: "uppercase", marginBottom: 6, fontWeight: "bold" },
  coverModesRow: { flexDirection: "row", gap: 10 },
  coverModesBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  coverModesLabel: { fontSize: 8, fontWeight: "bold", marginBottom: 5 },
  coverModesLine: { fontSize: 8, color: "#475569", marginBottom: 3 },
  coverBottom: { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 14 },
  coverBottomText: { fontSize: 8.5, color: "#64748B", textAlign: "center", marginBottom: 3 },
  logo: {
    width: PDF_HEADER_LAYOUT.logoWidth,
    height: PDF_HEADER_LAYOUT.logoHeight,
    objectFit: "contain",
    objectPosition: "right",
  },
  titulo: { fontSize: 18, fontWeight: "bold", textTransform: "uppercase" },
  subtitulo: { fontSize: 10, color: "#64748B", marginTop: 3 },
  blocoInfos: { flexDirection: "row", gap: 10, marginBottom: 16 },
  infoBox: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 8, padding: 10, borderLeftWidth: 3 },
  infoLabel: { fontSize: 6.5, textTransform: "uppercase", color: "#94A3B8", marginBottom: 3, fontWeight: "bold" },
  infoValue: { fontSize: 9.5, color: "#0F172A", fontWeight: "bold" },
  sectionTitle: { fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "#334155", marginBottom: 8 },
  resumoGrid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  resumoBox: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  resumoLabel: { fontSize: 6.5, color: "#94A3B8", textTransform: "uppercase", marginBottom: 3, fontWeight: "bold" },
  resumoValor: { fontSize: 10, color: "#0F172A", fontWeight: "bold" },
  pageBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 7,
    color: "#334155",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  card: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  cardHeader: { padding: 10, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  cardHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 10.5, fontWeight: "bold", color: "#0F172A" },
  cardMeta: { fontSize: 7.5, color: "#64748B", marginTop: 3 },
  cardBody: { padding: 10 },
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  chip: { fontSize: 7, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 999 },
  bloco: { backgroundColor: "#FFFFFF", borderRadius: 8, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  blocoSemContorno: { backgroundColor: "#FFFFFF", borderRadius: 8, padding: 8, marginBottom: 10 },
  blocoSemMargem: { backgroundColor: "#FFFFFF", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  desenhoPaginaBloco: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
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
  desenhoArea: {
    flexDirection: "column",
    alignItems: "center",
  },
  desenhoLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 10,
  },
  desenhoPrincipal: {
    width: 240,
    alignItems: "center",
  },
  larguraInfo: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
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
    height: 240,
  },
  medidaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  medidaLabel: {
    fontSize: 7.5,
    color: "#64748B",
    fontWeight: "bold",
    marginRight: 4,
    textTransform: "uppercase",
  },
  medidaValor: {
    fontSize: 7.5,
    color: "#0F172A",
    fontWeight: "bold",
  },
  desenhoMiniaturaBox: {
    width: 220,
    height: 220,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    padding: 4,
  },
  desenhoMiniatura: { width: "100%", height: "100%", objectFit: "contain" },
  desenhoTexto: { flex: 1 },
  blocoTitulo: { fontSize: 8.5, fontWeight: "bold", color: "#334155", marginBottom: 5 },
  blocoSubtitulo: { fontSize: 7.2, color: "#64748B", marginBottom: 6 },
  linha: { fontSize: 7.5, color: "#475569", marginBottom: 3 },
  destaque: { fontWeight: "bold", color: "#0F172A" },
  barraLista: { marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#CBD5E1" },
  barraLinha: { fontSize: 7.2, color: "#475569", marginBottom: 5 },
  footer: {
    position: "absolute", bottom: 18, left: 32, right: 32,
    textAlign: "center", fontSize: 8, color: "#94A3B8",
    paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#CBD5E1"
  },
})

export function RelatorioObraPDF({
  nomeEmpresa,
  logoUrl,
  nomeCliente,
  nomeObra,
  themeColor,
  relatorioObra,
  otimizacaoGlobal,
}: RelatorioObraPDFProps) {
  const paginasMateriais = chunkArray(relatorioObra, 3)
  const ferragensGlobal = Array.from(
    relatorioObra.reduce((mapa, obra) => {
      obra.ferragens.forEach((ferragem) => {
        const chave = `${ferragem.codigo || ""}|${ferragem.nome}`
        const existente = mapa.get(chave)

        if (existente) {
          existente.qtd += ferragem.qtd
          return
        }

        mapa.set(chave, {
          codigo: ferragem.codigo || null,
          nome: ferragem.nome,
          qtd: ferragem.qtd,
        })
      })

      return mapa
    }, new Map<string, { codigo: string | null; nome: string; qtd: number }>()).values()
  ).sort((a, b) => {
    const ordemLogica = compareFerragensByNome(a.nome, b.nome)
    if (ordemLogica !== 0) return ordemLogica

    const codigoA = a.codigo || ""
    const codigoB = b.codigo || ""
    if (codigoA !== codigoB) return codigoA.localeCompare(codigoB, "pt-BR")
    return a.nome.localeCompare(b.nome, "pt-BR")
  })

  const resumo = {
    projetos: relatorioObra.length,
    folhas: relatorioObra.reduce((acc, obra) => acc + obra.folhas.length, 0),
    ferragens: relatorioObra.reduce((acc, obra) => acc + obra.ferragens.reduce((total, item) => total + item.qtd, 0), 0),
    perfis: otimizacaoGlobal.reduce((acc, grupo) => acc + grupo.qtdBarrasOtimizada, 0),
  }
  const indicesProjetos = new Map(relatorioObra.map((obra, index) => [obra.itemId, index + 1]))
  const projetosKit = relatorioObra.filter((obra) => obra.modoCalculo === "Kit")
  const projetosBarra = relatorioObra.filter((obra) => obra.modoCalculo === "Barra")

  return (
    <Document>
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverTop}>
          {logoUrl && <Image src={logoUrl} style={styles.coverLogo} />}
          <Text style={styles.coverKicker}>Glass Code ERP</Text>
          <Text style={[styles.coverTitle, { color: themeColor }]}>Relatório Técnico da Obra</Text>
          <Text style={styles.coverSubtitle}>Caderno de conferência com desenhos, vidros, ferragens e otimização de barras</Text>

          <View style={styles.coverInfoWrap}>
            <View style={styles.coverInfoBox}>
              <Text style={styles.coverInfoLabel}>Cliente</Text>
              <Text style={styles.coverInfoValue}>{nomeCliente || "Não informado"}</Text>
            </View>
            <View style={styles.coverInfoBox}>
              <Text style={styles.coverInfoLabel}>Obra</Text>
              <Text style={styles.coverInfoValue}>{nomeObra || "Composição de Projetos"}</Text>
            </View>
            <View style={styles.coverInfoBox}>
              <Text style={styles.coverInfoLabel}>Emissão</Text>
              <Text style={styles.coverInfoValue}>{new Date().toLocaleDateString("pt-BR")}</Text>
            </View>

            <View style={styles.coverResumoGrid}>
              <View style={styles.coverResumoBox}>
                <Text style={styles.coverResumoLabel}>Projetos</Text>
                <Text style={styles.coverResumoValor}>{resumo.projetos}</Text>
              </View>
              <View style={styles.coverResumoBox}>
                <Text style={styles.coverResumoLabel}>Folhas</Text>
                <Text style={styles.coverResumoValor}>{resumo.folhas}</Text>
              </View>
              <View style={styles.coverResumoBox}>
                <Text style={styles.coverResumoLabel}>Ferragens</Text>
                <Text style={styles.coverResumoValor}>{resumo.ferragens} un</Text>
              </View>
              <View style={styles.coverResumoBox}>
                <Text style={styles.coverResumoLabel}>Barras</Text>
                <Text style={styles.coverResumoValor}>{resumo.perfis}</Text>
              </View>
            </View>

            <View style={styles.coverModesWrap}>
              <Text style={styles.coverModesTitle}>Classificação dos Projetos</Text>
              <View style={styles.coverModesRow}>
                <View style={styles.coverModesBox}>
                  <Text style={[styles.coverModesLabel, { color: "#166534" }]}>Modo Kit ({projetosKit.length})</Text>
                  {projetosKit.length > 0 ? projetosKit.map((obra) => (
                    <Text key={`kit-${obra.itemId}`} style={styles.coverModesLine}>
                      Projeto {indicesProjetos.get(obra.itemId)} - {obra.projetoNome}
                    </Text>
                  )) : (
                    <Text style={styles.coverModesLine}>Nenhum projeto em modo kit.</Text>
                  )}
                </View>
                <View style={styles.coverModesBox}>
                  <Text style={[styles.coverModesLabel, { color: "#92400E" }]}>Modo Barra ({projetosBarra.length})</Text>
                  {projetosBarra.length > 0 ? projetosBarra.map((obra) => (
                    <Text key={`barra-${obra.itemId}`} style={styles.coverModesLine}>
                      Projeto {indicesProjetos.get(obra.itemId)} - {obra.projetoNome}
                    </Text>
                  )) : (
                    <Text style={styles.coverModesLine}>Nenhum projeto em modo barra.</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.coverBottom}>
          <Text style={styles.coverBottomText}>Caderno 1: desenhos e vidros</Text>
          <Text style={styles.coverBottomText}>Caderno 2: ferragens e otimização</Text>
          <Text style={styles.coverBottomText}>A numeração dos projetos é mantida igual nos dois cadernos para facilitar a conferência.</Text>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)}
          fixed
        />
      </Page>

      {relatorioObra.map((obra, paginaIndex) => (
        <Page key={`relatorio-vidros-${obra.itemId}`} size="A4" style={styles.page}>
          <View style={[styles.header, { borderBottomColor: themeColor, borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth }]}> 
            <View style={styles.headerLeft}>
              <Text style={[styles.titulo, { color: themeColor }]}>Relatório Técnico da Obra</Text>
              <Text style={styles.subtitulo}>Caderno 1: desenhos e vidros</Text>
              <Text style={styles.subtitulo}>Emissão em: {new Date().toLocaleDateString("pt-BR")}</Text>
              <Text style={styles.pageBadge}>Projeto {indicesProjetos.get(obra.itemId)} - Desenhos e Vidros</Text>
            </View>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          </View>

          <View style={styles.desenhoPaginaBloco}>
            <Text style={styles.cardTitle}>Projeto {indicesProjetos.get(obra.itemId)} - {obra.projetoNome}</Text>
            <Text style={styles.cardMeta}>Cor do vidro: {obra.vidro || "-"}</Text>
            <Text style={styles.cardMeta}>
              Material {obra.corMaterial} · Modo {obra.modoCalculo}
              {obra.variacaoLabel ? ` · Variação ${obra.variacaoLabel}` : ""}
            </Text>
            <View style={styles.destaqueVao}>
              <Text style={styles.destaqueVaoTexto}>Quantidade de vãos: {obra.quantidade}</Text>
            </View>

            <View style={styles.cotaContainer}>
              <View style={styles.desenhoArea}>
                <View style={styles.desenhoLinha}>
                  <View style={styles.desenhoPrincipal}>
                    <View style={styles.larguraInfo}>
                      <View style={styles.medidaItem}>
                        <Text style={styles.medidaLabel}>Largura:</Text>
                        <Text style={styles.medidaValor}>{extrairMedidasVao(obra.vao).largura}</Text>
                      </View>
                    </View>

                    <View style={styles.desenhoComAltura}>
                      <View style={styles.desenhoMiniaturaBox}>
                        {obra.desenhoUrl ? <Image src={obra.desenhoUrl} style={styles.desenhoMiniatura} /> : null}
                      </View>
                      <View style={styles.alturaLateral}>
                        <View style={styles.medidaItem}>
                          <Text style={styles.medidaLabel}>Altura:</Text>
                          <Text style={styles.medidaValor}>{extrairMedidasVao(obra.vao).altura}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.blocoSemMargem}>
              <Text style={styles.blocoTitulo}>Folhas do Projeto</Text>
              {obra.folhas.map((folha) => (
                <Text key={folha.id} style={styles.linha}>
                  <Text style={styles.destaque}>{folha.titulo}:</Text> {folha.medida} | qtd. {obra.quantidade} | {folha.area.toFixed(3)} m²
                </Text>
              ))}
            </View>
          </View>

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)}
            fixed
          />
        </Page>
      ))}

      {paginasMateriais.map((pagina, paginaIndex) => (
        <Page key={`relatorio-materiais-${paginaIndex}`} size="A4" style={styles.page}>
          <View style={[styles.header, { borderBottomColor: themeColor, borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth }]}> 
            <View style={styles.headerLeft}>
              <Text style={[styles.titulo, { color: themeColor }]}>Relatório Técnico da Obra</Text>
              <Text style={styles.subtitulo}>Caderno 2: ferragens e otimização</Text>
              <Text style={styles.subtitulo}>Emissão em: {new Date().toLocaleDateString("pt-BR")}</Text>
              <Text style={styles.pageBadge}>Página {paginaIndex + 1} - Ferragens e Otimização</Text>
            </View>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          </View>

          <Text style={styles.sectionTitle}>Fechamento Global e Depois Detalhe Individual</Text>
          {paginaIndex === 0 && otimizacaoGlobal.length > 0 && (
            <View style={styles.bloco}>
              <Text style={styles.blocoTitulo}>Global - Fechamento de Perfis</Text>
              <Text style={styles.blocoSubtitulo}>Consolidação de todos os projetos da obra antes do detalhamento individual.</Text>
              {otimizacaoGlobal.map((item) => (
                <View key={item.id} style={styles.blocoSemMargem}>
                  <Text style={styles.linha}>
                    <Text style={styles.destaque}>{item.perfilCodigo || "-"} | {item.perfilNome}:</Text> origem {item.projetoNome} | cor {item.corMaterial} | {item.qtdBarrasOriginal} barras separadas / {item.qtdBarrasOtimizada} barras no global | aproveitamento {item.aproveitamento}% | desperdício {item.desperdicioMm} mm
                  </Text>
                  {Array.isArray(item.barras) && item.barras.length > 0 && (
                    <View style={styles.barraLista}>
                      {item.barras.map((barra) => (
                        <Text key={`${item.id}-barra-${barra.numero}`} style={styles.barraLinha}>
                          Barra {barra.numero}: cortes {barra.cortes.join(" · ")} mm | usado {barra.usadoMm} mm | sobra {barra.sobraMm} mm
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {paginaIndex === 0 && ferragensGlobal.length > 0 && (
            <View style={styles.bloco}>
              <Text style={styles.blocoTitulo}>Global - Fechamento de Ferragens</Text>
              <Text style={styles.blocoSubtitulo}>Quantidade total somada da obra inteira, sem separar por projeto.</Text>
              {ferragensGlobal.map((ferragem) => (
                <View key={`${ferragem.codigo || "sem-codigo"}-${ferragem.nome}`} style={styles.blocoSemMargem}>
                  <Text style={styles.linha}>
                    <Text style={styles.destaque}>{ferragem.codigo ? `${ferragem.codigo} | ` : ""}{ferragem.nome}:</Text> {ferragem.qtd} un
                  </Text>
                </View>
              ))}
            </View>
          )}

          {paginaIndex === 0 && (
            <View style={styles.blocoSemContorno}>
              <Text style={styles.blocoTitulo}>Individual - Projetos Separados</Text>
              <Text style={styles.blocoSubtitulo}>A partir daqui, cada bloco mostra apenas o detalhe daquele projeto.</Text>
            </View>
          )}

          {pagina.map((obra) => (
            <View key={`${obra.itemId}-estrutura`} style={styles.card} wrap={false}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Projeto {indicesProjetos.get(obra.itemId)} - {obra.projetoNome}</Text>
                <Text style={styles.cardMeta}>Individual deste projeto · Modo {obra.modoCalculo} · Cor {obra.corMaterial} · Quantidade {obra.quantidade}</Text>
              </View>

              <View style={styles.cardBody}>
                {obra.kitNome && (
                  <View style={styles.bloco}>
                    <Text style={styles.blocoTitulo}>Kits</Text>
                    <Text style={styles.linha}>
                      <Text style={styles.destaque}>{obra.kitNome}:</Text> {obra.kitQuantidade || obra.quantidade} un
                    </Text>
                  </View>
                )}

                <View style={styles.bloco}>
                  <Text style={styles.blocoTitulo}>Ferragens</Text>
                  {obra.ferragens.length > 0 ? obra.ferragens.map((ferragem) => (
                    <Text key={ferragem.id} style={styles.linha}>
                      <Text style={styles.destaque}>{ferragem.codigo ? `${ferragem.codigo} | ` : ""}{ferragem.nome}:</Text> {ferragem.qtd} un
                    </Text>
                  )) : (
                    <Text style={styles.linha}>Sem ferragens aplicadas.</Text>
                  )}
                </View>

                <View style={styles.blocoSemMargem}>
                  <Text style={styles.blocoTitulo}>Otimização por Projeto</Text>
                  {obra.otimizacao.length > 0 ? obra.otimizacao.map((item) => (
                    <View key={item.id} style={styles.blocoSemMargem}>
                      <Text style={styles.linha}>
                        <Text style={styles.destaque}>{item.perfilCodigo || "-"} | {item.perfilNome}:</Text> {item.qtdBarras} barra(s) de {item.comprimentoBarra} mm | aproveitamento {item.aproveitamento}% | desperdício {item.desperdicioMm} mm
                      </Text>
                      {Array.isArray(item.barras) && item.barras.length > 0 && (
                        <View style={styles.barraLista}>
                          {item.barras.map((barra) => (
                            <Text key={`${item.id}-barra-${barra.numero}`} style={styles.barraLinha}>
                              Barra {barra.numero}: cortes {barra.cortes.join(" · ")} mm | usado {barra.usadoMm} mm | sobra {barra.sobraMm} mm
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )) : (
                    <Text style={styles.linha}>Item em modo kit, sem otimização de barras.</Text>
                  )}
                </View>
              </View>
            </View>
          ))}

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)}
            fixed
          />
        </Page>
      ))}
    </Document>
  )
}