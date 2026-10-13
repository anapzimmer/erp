import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import DesenhoTemperaJanela4 from "@/components/DesenhoTemperaJanela4";
import { pecasJanela4, type MedidasJanela4 } from "@/utils/desenhoTemperaJanela4";
import type { ProjetoIndividualDados } from "./ProjetoIndividualPDF";

export type DadosTemperaJanela4 = Pick<ProjetoIndividualDados, "cliente" | "obra" | "numero" | "data" | "largura" | "altura" | "vidro" | "trinco" | "quantidade" | "observacao">;
export type PropsTemperaJanela4 = { dados: DadosTemperaJanela4; medidas: MedidasJanela4; nomeEmpresa: string; detalhes?: boolean };
const s = StyleSheet.create({ page: { padding: 32, fontFamily: "Helvetica", fontSize: 10, color: "#111111", backgroundColor: "#ffffff" }, title: { fontSize: 17, marginBottom: 8 }, row: { paddingVertical: 7, borderBottom: "1 solid #cccccc" }, note: { fontSize: 9, marginTop: 14, lineHeight: 1.4 }, footer: { position: "absolute", bottom: 24, left: 32, fontSize: 8 } });
export default function Janela4TemperaPDF({ dados, medidas, nomeEmpresa, detalhes = false }: PropsTemperaJanela4) {
  const pecas = pecasJanela4(medidas, dados.quantidade);
  const paginas = [undefined, ...(detalhes ? pecas : [])];
  return <Document title="Janela 4 folhas - desenho para têmpera">{paginas.map((peca, i) => <Page size="A4" key={peca?.id || "conjunto"} style={s.page}>
    <Text style={s.title}>DESENHO PARA TÊMPERA</Text>
    <Text>{nomeEmpresa} | Janela de correr - 4 folhas</Text>
    <Text style={s.row}>Cliente: {dados.cliente || "-"} | Obra: {dados.obra || "-"}</Text>
    <Text style={s.row}>Projeto: {dados.numero || "-"} | Data: {dados.data} | Quantidade: {dados.quantidade}</Text>
    <Text style={s.row}>Vidro: {dados.vidro} | {dados.trinco || "Sem trinco"}</Text>
    <Text style={s.row}>Vão: {dados.largura} × {dados.altura} mm | Vista interna | Sem escala</Text>
    <DesenhoTemperaJanela4 comTrinco={dados.trinco === "Com trinco"} peca={peca} pdf />
    {(peca ? [peca] : pecas).map(p => <View key={p.id} style={s.row}><Text>{p.id} - {p.nome}: {p.largura} × {p.altura} mm | {p.quantidade} peça(s)</Text></View>)}
    <Text style={s.note}>Roldanas: 2 furos Ø12 mm por folha móvel (P2 e P3), centros a 50 mm das respectivas laterais e 20 mm da borda superior. Gabarito espelhado nos dois cantos superiores. Fecho central: 2 furos Ø16 mm por folha móvel, a 21 mm da borda de encontro e 50 mm entre centros, par centralizado na altura da peça. Não necessita refilar o perfil 1035. Trincos ainda esquemáticos, aguardando gabarito.</Text>
    {dados.observacao ? <Text style={s.note}>Observações: {dados.observacao}</Text> : null}
    <Text style={s.footer}>Medidas das peças sem arredondamento de cobrança | Folha {i + 1} / {paginas.length}</Text>
  </Page>)}</Document>;
}
