"use client";

/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";

export type CentralImpressaoItem = {
  id: string;
  numero: string;
  projeto: string;
  cliente: string;
  medidas: string;
  largura?: number;
  altura?: number;
  quantidade: number;
  modo: string;
  desenhoUrl: string;
  vidro?: string;
  corKit?: string;
  trilho?: string;
  puxador?: string;
  trinco?: string;
  valorTotal?: number;
  materiais?: ProjetoIndividualMaterial[];
};

export type CentralOtimizacaoPerfil = {
  codigo: string;
  descricao: string;
  comprimentoBarra: number;
  barras: number[][];
  totalCortes: number;
  barrasOriginais?: number;
  valorUnitario?: number;
  valorOriginal?: number;
  valorOtimizado?: number;
};

type CentralImpressaoPDFProps = {
  itens: CentralImpressaoItem[];
  nomeEmpresa: string;
  logoUrl?: string | null;
  numeroOrcamento?: string;
  cliente?: string;
  obra?: string;
  otimizacaoPerfis?: CentralOtimizacaoPerfil[];
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0f2742",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe4ee",
    paddingBottom: 12,
    marginBottom: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 120, maxHeight: 42, objectFit: "contain", objectPosition: "left" },
  title: { fontSize: 15, fontWeight: "bold", color: "#0f2742" },
  subtitle: { fontSize: 8, color: "#64748b", marginTop: 3 },
  meta: { fontSize: 8, color: "#64748b", textAlign: "right" },
  topInfo: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  topInfoBox: { flex: 1 },
  topLabel: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  topValue: { fontSize: 9, color: "#0f2742", fontWeight: "bold" },
  list: { gap: 8 },
  card: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    gap: 9,
  },
  imageWrap: {
    width: 120,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 6,
  },
  image: { maxWidth: 112, maxHeight: 104, objectFit: "contain" },
  infoArea: { flex: 1 },
  projectLabel: { fontSize: 7, color: "#00a85a", fontWeight: "bold", textTransform: "uppercase", marginBottom: 3 },
  projectName: { fontSize: 11, fontWeight: "normal", color: "#0f2742", marginBottom: 7 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  info: { width: "31.8%", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 4 },
  infoLabel: { fontSize: 6, color: "#64748b", textTransform: "uppercase" },
  infoValue: { fontSize: 8, color: "#0f2742", marginTop: 2, fontWeight: "normal" },
  infoValueStrong: { fontSize: 8, color: "#0f2742", marginTop: 2, fontWeight: "bold" },
  totals: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    backgroundColor: "#f8fafc",
  },
  totalBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 7,
  },
  totalLabel: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  totalValue: { fontSize: 10, color: "#0f2742", fontWeight: "normal" },
  totalValueStrong: { fontSize: 10, color: "#0f2742", fontWeight: "bold" },
  optSection: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 8,
  },
  optTitle: { fontSize: 10, fontWeight: "bold", color: "#0f2742", marginBottom: 6 },
  optCard: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 6, marginTop: 6 },
  optName: { fontSize: 8, color: "#0f2742", fontWeight: "bold" },
  optLine: { fontSize: 7, color: "#475569", marginTop: 3 },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 12,
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
  },
});

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const multiplicadorPecasProjeto = (projeto?: string) => {
  const texto = String(projeto || "").toLowerCase();
  if (texto.includes("jc4f") || texto.includes("janela de correr 4")) return 4;
  if (texto.includes("jc2f") || texto.includes("janela de correr 2")) return 2;
  if (texto.includes("pc4f") || texto.includes("porta de correr 4 folhas")) return 4;
  if (texto.includes("pc2f") || texto.includes("porta de correr 2 folhas")) return 2;
  if (texto.includes("pfv2f") || texto.includes("2 folhas")) return 2;
  return 1;
};

export function CentralImpressaoPDF({
  itens,
  nomeEmpresa,
  logoUrl,
  numeroOrcamento,
  cliente,
  obra,
  otimizacaoPerfis = [],
}: CentralImpressaoPDFProps) {
  const data = new Date().toLocaleDateString("pt-BR");
  const quantidadeVaos = itens.length;
  const quantidadePecas = itens.reduce((total, item) => total + (Number(item.quantidade || 0) * multiplicadorPecasProjeto(item.projeto)), 0);
  const areaTotal = itens.reduce((total, item) => total + ((Number(item.largura || 0) * Number(item.altura || 0) * Number(item.quantidade || 0)) / 1_000_000), 0);
  const valorTotalOrcamento = itens.reduce((total, item) => total + Number(item.valorTotal || 0), 0);
  const valorPerfisOriginais = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOriginal || 0), 0);
  const valorPerfisOtimizados = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOtimizado || 0), 0);
  const economiaPerfis = Math.max(0, valorPerfisOriginais - valorPerfisOtimizados);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.title}>Orçamentos Projetos</Text>
              <Text style={styles.subtitle}>{nomeEmpresa}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {itens.length} projeto(s)
            {"\n"}
            {data}
          </Text>
        </View>

        <View style={styles.topInfo} fixed>
          <View style={styles.topInfoBox}>
            <Text style={styles.topLabel}>Nº orçamento</Text>
            <Text style={styles.topValue}>{numeroOrcamento || "Novo orçamento"}</Text>
          </View>
          <View style={styles.topInfoBox}>
            <Text style={styles.topLabel}>Cliente</Text>
            <Text style={styles.topValue}>{cliente || "-"}</Text>
          </View>
          <View style={styles.topInfoBox}>
            <Text style={styles.topLabel}>Obra</Text>
            <Text style={styles.topValue}>{obra || "-"}</Text>
          </View>
        </View>

        <View style={styles.list}>
          {itens.map((item, index) => {
            const ehJanela = /jc4f|jc2f|janela de correr 4|janela de correr 2/i.test(item.projeto || "");
            const ehPortaGiro = /pg|porta de giro/i.test(item.projeto || "");

            return (
              <View key={item.id} style={styles.card} wrap={false}>
                <View style={styles.imageWrap}>
                  <Image src={item.desenhoUrl} style={styles.image} />
                </View>

                <View style={styles.infoArea}>
                  <Text style={styles.projectLabel}>Projeto {index + 1}</Text>
                  <Text style={styles.projectName}>{item.projeto}</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.info}>
                      <Text style={styles.infoLabel}>Medidas</Text>
                      <Text style={styles.infoValue}>{item.medidas}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.infoLabel}>Quantidade</Text>
                      <Text style={styles.infoValue}>{item.quantidade}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.infoLabel}>Modo</Text>
                      <Text style={styles.infoValue}>{item.modo}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.infoLabel}>Vidro</Text>
                      <Text style={styles.infoValue}>{item.vidro || "-"}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.infoLabel}>Cor</Text>
                      <Text style={styles.infoValue}>{item.corKit || "-"}</Text>
                    </View>
                    {!ehJanela ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{ehPortaGiro ? "Fechadura" : "Trilho"}</Text>
                        <Text style={styles.infoValue}>{item.trilho || "-"}</Text>
                      </View>
                    ) : null}
                    {!ehJanela ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Puxador</Text>
                        <Text style={styles.infoValue}>{item.puxador || "-"}</Text>
                      </View>
                    ) : null}
                    <View style={styles.info}>
                      <Text style={styles.infoLabel}>{ehPortaGiro ? "Ferragens" : "Trinco"}</Text>
                      <Text style={styles.infoValue}>{item.trinco || "-"}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.infoLabel}>Valor total</Text>
                      <Text style={styles.infoValueStrong}>{moeda(item.valorTotal || 0)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Quantidade de vão</Text>
            <Text style={styles.totalValue}>{quantidadeVaos}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Quantidade de peças</Text>
            <Text style={styles.totalValue}>{quantidadePecas}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>M² total</Text>
            <Text style={styles.totalValue}>
              {areaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
            </Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Valor total do orçamento</Text>
            <Text style={styles.totalValueStrong}>{moeda(valorTotalOrcamento)}</Text>
          </View>
        </View>

        {otimizacaoPerfis.length > 0 ? (
          <View style={styles.optSection} wrap={false}>
            <Text style={styles.optTitle}>Relação de materiais otimizada</Text>
            <Text style={styles.optLine}>Economia estimada em perfis: {moeda(economiaPerfis)}</Text>
            {otimizacaoPerfis.map((perfil) => (
              <View key={`${perfil.codigo}-${perfil.descricao}`} style={styles.optCard}>
                <Text style={styles.optName}>
                  {perfil.descricao} - {perfil.barrasOriginais || 0} para {perfil.barras.length} barra(s) - {moeda(Number(perfil.valorOtimizado || 0))}
                </Text>
                {perfil.barras.map((barra, index) => {
                  const usado = barra.reduce((soma, corte) => soma + corte, 0);
                  return (
                    <Text key={`${perfil.codigo}-${index}`} style={styles.optLine}>
                      Barra {index + 1}: {barra.join(" + ")} = {usado} mm
                    </Text>
                  );
                })}
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Orçamentos Projetos gerado pelo Glass Code
        </Text>
      </Page>
    </Document>
  );
}

