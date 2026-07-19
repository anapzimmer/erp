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
  vidroBandeira?: string;
  corKit?: string;
  alturaAteTubo?: number;
  tuboPerfil?: string;
  trilho?: string;
  puxador?: string;
  tamanhoPuxador?: string;
  trinco?: string;
  pecasDivisao?: number;
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

const calcularAreaVidrosItem = (item: CentralImpressaoItem) => {
  const areaMateriais = item.materiais?.reduce((total, material) => {
    const descricao = String(material.descricao || "").toLowerCase();
    const unidade = String(material.unidade || "").toLowerCase();
    if (!descricao.includes("vidro") && !unidade.includes("m2")) return total;
    return total + Number(material.qtd || 0);
  }, 0) || 0;

  if (areaMateriais > 0) return areaMateriais;

  return (Number(item.largura || 0) * Number(item.altura || 0) * Number(item.quantidade || 0)) / 1_000_000;
};

const multiplicadorPecasProjeto = (projeto?: string, item?: Pick<CentralImpressaoItem, "pecasDivisao" | "tamanhoPuxador">) => {
  const texto = String(projeto || "").toLowerCase();
  if (texto.includes("fixos") || texto.includes("fixo")) {
    return Math.min(6, Math.max(1, Number(item?.pecasDivisao || item?.tamanhoPuxador || 1)));
  }
  if (texto.includes("pma2f") || texto.includes("mao amiga 2") || texto.includes("mão amiga 2")) return 2;
  if (texto.includes("pma3f") || texto.includes("mao amiga 3") || texto.includes("mão amiga 3")) return 3;
  if (texto.includes("pma4f") || texto.includes("mao amiga 4") || texto.includes("mão amiga 4")) return 4;
  if (texto.includes("pma5f") || texto.includes("mao amiga 5") || texto.includes("mão amiga 5")) return 5;
  if (texto.includes("pma6f") || texto.includes("mao amiga 6") || texto.includes("mão amiga 6")) return 6;
  if (texto.includes("pma2f4m") || texto.includes("2 fixas + 4") || texto.includes("2 fixas e 4")) return 6;
  if (texto.includes("box2fls") || texto.includes("box 2 folhas")) return 2;
  if (texto.includes("deslizante2f") || texto.includes("deslizante 2")) return 2;
  if (texto.includes("deslizante3f") || texto.includes("deslizante 3")) return 3;
  if (texto.includes("deslizante4f") || texto.includes("deslizante 4")) return 4;
  if (texto.includes("deslizante5f") || texto.includes("deslizante 5")) return 5;
  if (texto.includes("deslizante6f") || texto.includes("deslizante 6")) return 6;
  if (texto.includes("pc4fcb") || texto.includes("4 folhas com bandeira")) return 6;
  if (texto.includes("pc2fcb") || texto.includes("2 folhas com bandeira")) return 3;
  if (texto.includes("pg - 2") || texto.includes("porta de giro - 2")) return 2;
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
  const quantidadePecas = itens.reduce((total, item) => total + (Number(item.quantidade || 0) * multiplicadorPecasProjeto(item.projeto, item)), 0);
  const areaTotal = itens.reduce((total, item) => total + calcularAreaVidrosItem(item), 0);
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
            <Text style={styles.topLabel}>Nº Orçamento</Text>
            <Text style={styles.topValue}>{numeroOrcamento || "Novo Orçamento"}</Text>
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
            const ehFixos = /fixos|fixo/i.test(item.projeto || "");
            const ehPma2f = /pma2f|m[aã]o amiga 2/i.test(item.projeto || "");
            const ehPma3f = /pma3f|m[aã]o amiga 3/i.test(item.projeto || "");
            const ehPma4f = /pma4f|m[aã]o amiga 4/i.test(item.projeto || "");
            const ehPma5f = /pma5f|m[aã]o amiga 5/i.test(item.projeto || "");
            const ehPma6f = /pma6f|m[aã]o amiga 6/i.test(item.projeto || "");
            const ehPma2f4m = /pma2f4m|2 fixas \+ 4|2 fixas e 4/i.test(item.projeto || "");
            const ehPma = ehPma2f || ehPma3f || ehPma4f || ehPma5f || ehPma6f || ehPma2f4m;
            const ehBox2Fls = /box2fls|box 2 folhas/i.test(item.projeto || "");
            const ehDeslizante2f = /deslizante2f|deslizante 2/i.test(item.projeto || "");
            const ehDeslizante3f = /deslizante3f|deslizante 3/i.test(item.projeto || "");
            const ehDeslizante4f = /deslizante4f|deslizante 4/i.test(item.projeto || "");
            const ehDeslizante5f = /deslizante5f|deslizante 5/i.test(item.projeto || "");
            const ehDeslizante6f = /deslizante6f|deslizante 6/i.test(item.projeto || "");
            const ehPc2fComBandeira = /pc2fcb|2 folhas com bandeira/i.test(item.projeto || "");
            const ehPc4fComBandeira = /pc4fcb|4 folhas com bandeira/i.test(item.projeto || "");
            const pecasFixos = Math.min(6, Math.max(1, Number(item.pecasDivisao || item.tamanhoPuxador || 1)));
            const temBandeira = ehPc2fComBandeira || ehPc4fComBandeira;
            const nomeProjeto = ehPc4fComBandeira ? "Porta de correr 4 folhas com bandeira" : ehPc2fComBandeira ? "Porta de correr 2 folhas com bandeira" : ehDeslizante6f ? "Deslizante 6 folhas" : ehDeslizante5f ? "Deslizante 5 folhas" : ehDeslizante4f ? "Deslizante 4 folhas" : ehDeslizante3f ? "Deslizante 3 folhas" : ehDeslizante2f ? "Deslizante 2 folhas" : item.projeto;

            return (
              <View key={item.id} style={styles.card} wrap={false}>
                <View style={styles.imageWrap}>
                  <Image src={item.desenhoUrl} style={styles.image} />
                </View>

                <View style={styles.infoArea}>
                  <Text style={styles.projectLabel}>Projeto {index + 1}</Text>
                  <Text style={styles.projectName}>{nomeProjeto}</Text>
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
                      <Text style={styles.infoLabel}>{temBandeira ? "Vidro porta" : "Vidro"}</Text>
                      <Text style={styles.infoValue}>{item.vidro || "-"}</Text>
                    </View>
                    {temBandeira ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Vidro bandeira</Text>
                        <Text style={styles.infoValue}>{item.vidroBandeira || "-"}</Text>
                      </View>
                    ) : null}
                    {temBandeira ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Altura até o tubo</Text>
                        <Text style={styles.infoValue}>{item.alturaAteTubo || 0} mm</Text>
                      </View>
                    ) : null}
                    <View style={styles.info}>
                      <Text style={styles.infoLabel}>Cor</Text>
                      <Text style={styles.infoValue}>{item.corKit || "-"}</Text>
                    </View>
                    {temBandeira ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Tubo</Text>
                        <Text style={styles.infoValue}>{item.tuboPerfil || "-"}</Text>
                      </View>
                    ) : null}
                    {ehFixos ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Divisão</Text>
                        <Text style={styles.infoValue}>{pecasFixos} peça(s)</Text>
                      </View>
                    ) : null}
                    {!ehJanela && !ehFixos ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{ehBox2Fls ? "Altura" : ehPma || ehDeslizante2f || ehDeslizante3f || ehDeslizante4f || ehDeslizante5f || ehDeslizante6f ? "Projeto" : ehPortaGiro ? "Fechadura" : "Trilho"}</Text>
                        <Text style={styles.infoValue}>{item.trilho || "-"}</Text>
                      </View>
                    ) : null}
                    {!ehJanela && !ehFixos ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>Puxador</Text>
                        <Text style={styles.infoValue}>{item.puxador || "-"}</Text>
                      </View>
                    ) : null}
                    {!ehFixos ? (
                      <View style={styles.info}>
                        <Text style={styles.infoLabel}>{ehBox2Fls ? "Modelo do kit" : ehDeslizante2f || ehDeslizante3f || ehDeslizante4f || ehDeslizante5f || ehDeslizante6f ? "Carrinho" : ehPma ? "Roldana" : ehPortaGiro ? "Ferragens" : "Trinco"}</Text>
                        <Text style={styles.infoValue}>{item.trinco || "-"}</Text>
                      </View>
                    ) : null}
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
            <Text style={styles.totalLabel}>Valor total do Orçamento</Text>
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

