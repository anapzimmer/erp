"use client";

import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  ProjetoIndividualDados,
  ProjetoIndividualMaterial,
} from "../projetoindividual/ProjetoIndividualPDF";

export type JC4FCBSDadosPDF = ProjetoIndividualDados & {
  alturaPeitoril: number;
  alturaJanela: number;
  alturaTotal: number;
  alturaBandeira: number;
  vidroPeitoril: string;
  vidroJanelaBandeira: string;
  tuboPerfil: string;
};

type JC4FCBSPDFProps = {
  dados: JC4FCBSDadosPDF;
  logoUrl?: string | null;
};

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const numero = (valor: number, casas = 2) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

const quantidade = (valor: number, unidade: string) => {
  const texto = String(unidade || "").toLowerCase();

  if (texto.includes("und") || texto.includes("barra")) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    });
  }

  return numero(valor);
};

const normalizar = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const ordemMaterial = (
  descricaoOriginal?: string,
  unidadeOriginal?: string
) => {
  const descricao = normalizar(descricaoOriginal);
  const unidade = normalizar(unidadeOriginal);

  if (descricao.includes("vidro") || unidade.includes("m2")) return 0;
  if (descricao.includes("tubo")) return 1;

  if (
    descricao.includes("vt") ||
    descricao.includes("perfil") ||
    unidade.includes("barra")
  ) {
    return 2;
  }

  return 3;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingHorizontal: 24,
    paddingBottom: 28,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0f2742",
    fontSize: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 9,
    padding: 12,
    marginBottom: 9,
  },
  logo: {
    width: 145,
    maxHeight: 45,
    objectFit: "contain",
    objectPosition: "left",
  },
  logoPlaceholder: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f2742",
  },
  metaRow: {
    flexDirection: "row",
  },
  meta: {
    minWidth: 72,
    borderLeftWidth: 1,
    borderLeftColor: "#dbe4ee",
    paddingLeft: 8,
    marginLeft: 8,
  },
  label: {
    fontSize: 6.8,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 9,
    color: "#009b55",
    fontWeight: "bold",
  },
  projectTitle: {
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 9,
  },
  projectValue: {
    marginTop: 3,
    fontSize: 11,
  },
  upperGrid: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 9,
  },
  card: {
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 9,
    padding: 8,
  },
  drawingCard: {
    width: "31%",
  },
  dataCard: {
    width: "69%",
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  greenLine: {
    width: 22,
    height: 2,
    backgroundColor: "#00a85a",
    marginTop: 6,
    marginBottom: 9,
  },
  drawingBox: {
    height: 168,
    alignItems: "center",
    justifyContent: "center",
  },
  drawing: {
    width: 138,
    maxHeight: 160,
    objectFit: "contain",
  },
  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  dataItem: {
    width: "33.333%",
    minHeight: 38,
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  dataValue: {
    fontSize: 9.5,
    lineHeight: 1.25,
  },
  tableCard: {
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 9,
    padding: 8,
  },
  tableHeader: {
    flexDirection: "row",
    minHeight: 24,
    alignItems: "center",
    backgroundColor: "#07385a",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  th: {
    color: "#ffffff",
    fontSize: 7.4,
    fontWeight: "bold",
    textTransform: "uppercase",
    paddingHorizontal: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 29,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  td: {
    fontSize: 7.8,
    color: "#0f2742",
    paddingHorizontal: 5,
    lineHeight: 1.35,
  },
  qtd: {
    width: "9%",
    textAlign: "center",
  },
  descricao: {
    width: "49%",
    textAlign: "left",
  },
  unidade: {
    width: "10%",
    textAlign: "center",
  },
  valor: {
    width: "16%",
    textAlign: "right",
  },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  summaryBox: {
    width: "31.9%",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    padding: 7,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 12,
    fontSize: 6.5,
    color: "#94a3b8",
    textAlign: "center",
  },
});

function DataItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <View style={styles.dataItem}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

export function JC4FCBSPDF({
  dados,
  logoUrl,
}: JC4FCBSPDFProps) {
  const materiaisOrdenados = [...(dados.materiais || [])]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ordemA = ordemMaterial(a.item.descricao, a.item.unidade);
      const ordemB = ordemMaterial(b.item.descricao, b.item.unidade);

      return ordemA === ordemB ? a.index - b.index : ordemA - ordemB;
    })
    .map(({ item }) => item);

  const total = materiaisOrdenados.reduce(
    (soma, item) =>
      soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0),
    0
  );

  const valorVidros = materiaisOrdenados
    .filter(
      (item) =>
        normalizar(item.descricao).includes("vidro") ||
        normalizar(item.unidade).includes("m2")
    )
    .reduce(
      (soma, item) =>
        soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0),
      0
    );

  const valorPerfis = materiaisOrdenados
    .filter((item) => {
      const descricao = normalizar(item.descricao);
      const unidade = normalizar(item.unidade);

      return (
        unidade.includes("barra") ||
        descricao.includes("perfil") ||
        descricao.includes("tubo") ||
        descricao.includes("vt")
      );
    })
    .reduce(
      (soma, item) =>
        soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0),
      0
    );

  const valorFerragens = Math.max(0, total - valorVidros - valorPerfis);
  const areaTotal = materiaisOrdenados
    .filter((item) => normalizar(item.unidade).includes("m2"))
    .reduce((soma, item) => soma + Number(item.qtd || 0), 0);

  const totalPecas = Number(dados.quantidade || 0) * 12;
  const desenhoSrc =
    dados.trinco === "Com trinco"
      ? "/desenhos/JC4FCBS_comtrinco.png"
      : "/desenhos/JC4FCBS_semtrinco.png";

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} wrap={false}>
          {logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.logoPlaceholder}>Logo da empresa</Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.meta}>
              <Text style={styles.label}>Nº orçamento</Text>
              <Text style={styles.metaValue}>{dados.numero || "-"}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.label}>Data</Text>
              <Text style={styles.metaValue}>{dados.data || "-"}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.metaValue}>{dados.cliente || "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.projectTitle} wrap={false}>
          <Text style={styles.label}>Projeto</Text>
          <Text style={styles.projectValue}>
            Janela de correr com bandeira e peitoril
          </Text>
        </View>

        <View style={styles.upperGrid} wrap={false}>
          <View style={[styles.card, styles.drawingCard]}>
            <Text style={styles.sectionTitle}>Desenho ilustrativo</Text>
            <View style={styles.greenLine} />
            <View style={styles.drawingBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={desenhoSrc} style={styles.drawing} />
            </View>
          </View>

          <View style={[styles.card, styles.dataCard]}>
            <Text style={styles.sectionTitle}>Dados do projeto</Text>
            <View style={styles.greenLine} />

            <View style={styles.dataGrid}>
              <DataItem label="Largura" value={`${dados.largura || 0} mm`} />
              <DataItem
                label="Altura peitoril"
                value={`${dados.alturaPeitoril || 0} mm`}
              />
              <DataItem
                label="Altura janela"
                value={`${dados.alturaJanela || 0} mm`}
              />
              <DataItem
                label="Altura bandeira"
                value={`${dados.alturaBandeira || 0} mm`}
              />
              <DataItem
                label="Altura total"
                value={`${dados.alturaTotal || 0} mm`}
              />
              <DataItem
                label="Quantidade"
                value={dados.quantidade || 0}
              />
              <DataItem
                label="Cor kit / perfil"
                value={dados.corKit || "-"}
              />
              <DataItem
                label="Vidro peitoril"
                value={dados.vidroPeitoril || "-"}
              />
              <DataItem
                label="Vidro janela / bandeira"
                value={dados.vidroJanelaBandeira || "-"}
              />
              <DataItem
                label="Tubo"
                value={dados.tuboPerfil || "-"}
              />
              <DataItem
                label="Trinco"
                value={dados.trinco || "Sem trinco"}
              />
            </View>
          </View>
        </View>

        <View style={styles.tableCard}>
          <Text style={styles.sectionTitle}>Relação de materiais</Text>
          <View style={styles.greenLine} />

          <View style={styles.tableHeader} wrap={false}>
            <Text style={[styles.th, styles.qtd]}>Qtd.</Text>
            <Text style={[styles.th, styles.descricao]}>
              Produto / descrição
            </Text>
            <Text style={[styles.th, styles.unidade]}>Unid.</Text>
            <Text style={[styles.th, styles.valor]}>Valor unit.</Text>
            <Text style={[styles.th, styles.valor]}>Valor total</Text>
          </View>

          {materiaisOrdenados.map((item: ProjetoIndividualMaterial) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={[styles.td, styles.qtd]}>
                {quantidade(item.qtd, item.unidade)}
              </Text>

              <Text style={[styles.td, styles.descricao]}>
                {item.descricao}
              </Text>

              <Text style={[styles.td, styles.unidade]}>
                {item.unidade}
              </Text>

              <Text style={[styles.td, styles.valor]}>
                {moeda(item.valorUnitario)}
              </Text>

              <Text style={[styles.td, styles.valor]}>
                {moeda(
                  Number(item.qtd || 0) *
                    Number(item.valorUnitario || 0)
                )}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summary} wrap={false}>
          <View style={styles.summaryBox}>
            <Text style={styles.label}>Área total</Text>
            <Text style={styles.summaryValue}>{numero(areaTotal)} m²</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.label}>Quantidade de peças</Text>
            <Text style={styles.summaryValue}>{totalPecas}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.label}>Valor de vidros</Text>
            <Text style={styles.summaryValue}>{moeda(valorVidros)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.label}>Valor de perfis</Text>
            <Text style={styles.summaryValue}>{moeda(valorPerfis)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.label}>Valor de ferragens</Text>
            <Text style={styles.summaryValue}>{moeda(valorFerragens)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.label}>Valor total</Text>
            <Text style={styles.summaryValue}>{moeda(total)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Projeto JC4FCBS gerado pelo Glass Code
        </Text>
      </Page>
    </Document>
  );
}