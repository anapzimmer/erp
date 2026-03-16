//app/relatorios/peledevidro/PeleDeVidroPDF.tsx
"use client";
import React from "react";
import { Page, Text, View, Document, StyleSheet, Image, Svg, Rect, Line, G } from "@react-pdf/renderer";
import { PDF_HEADER_LAYOUT, PDF_TABLE_LAYOUT, buildPdfFooterText, getPdfZebraRowBackground } from "../shared/pdfLayout";

interface PerfilPDF {
    nome: string;
    codigo: string;
    unidade: string;
    kgmt: number | string;
    metroLinear: number;
    barras: number;
    kgTotal: number;
    precoBarra: number;
    valorTotal: number;
}

interface AcessorioPDF {
    nome: string;
    codigo: string;
    unidade: string;
    quantidade: number;
    precoUnitario: number;
    valorTotal: number;
}

interface PeleDeVidroPDFProps {
    nomeEmpresa: string;
    logoUrl?: string | null;
    themeColor: string;
    textColor?: string;
    nomeCliente: string;
    nomeObra: string;
    larguraVaoMm: number;
    alturaVaoMm: number;
    quadrosHorizontal: number;
    quadrosVertical: number;
    quantidadeLajes: number;
    quantidadeFachadas: number;
    quadrosFixos?: number;
    quadrosMoveis?: number;
    vidroDescricao: string;
    areaVidro: number;
    totalVidro: number;
    perfis: PerfilPDF[];
    acessorios: AcessorioPDF[];
    totalPerfis: number;
    totalAcessorios: number;
    totalGeral: number;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const styles = StyleSheet.create({
    page: { padding: 40, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: PDF_HEADER_LAYOUT.marginBottom,
        paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
        borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
    },
    headerLeft: { flexDirection: "column", flex: 1 },
    titulo: { fontSize: PDF_HEADER_LAYOUT.titleSize, fontWeight: "bold", textTransform: "uppercase" },
    data: { fontSize: PDF_HEADER_LAYOUT.dateSize, color: "#666", marginTop: 6 },
    logo: { width: PDF_HEADER_LAYOUT.logoWidth, height: PDF_HEADER_LAYOUT.logoHeight, objectFit: "contain", objectPosition: "right" },

    clientObraBox: {
        backgroundColor: "#EFEFEF",
        padding: 10,
        borderRadius: 6,
        marginBottom: 10,
    },
    clientObraLine: {
        flexDirection: "row",
        gap: 12,
    },
    clientObraItem: { flex: 1 },
    plainInfoList: {
        marginBottom: 12,
        gap: 4,
    },
    plainInfoText: {
        fontSize: 9,
        color: "#1C415B",
    },
    label: { fontSize: 6, color: "#999", textTransform: "uppercase", marginBottom: 3, fontWeight: "bold" },
    value: { fontSize: 10, fontWeight: "bold", color: "#1C415B" },

    sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 18, marginBottom: 6 },

    table: { width: "100%", marginTop: 4 },
    tableHeader: { flexDirection: "row" },
    tableRow: { flexDirection: "row", borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth, borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor, alignItems: "center", minHeight: 26 },
    thCell: { padding: 5, color: "#FFFFFF", fontSize: PDF_TABLE_LAYOUT.headerFontSize, fontWeight: "bold", textTransform: "uppercase" },
    tdCell: { padding: 5, fontSize: PDF_TABLE_LAYOUT.bodyFontSize, color: "#1C415B" },

    summaryContainer: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    summaryItem: { flexDirection: "column", alignItems: "flex-start" },
    summaryLabel: { fontSize: 6, color: "#999", textTransform: "uppercase", marginBottom: 2 },
    summaryValue: { fontSize: 10, fontWeight: "bold", color: "#1C415B" },
    totalBox: { textAlign: "right" },
    totalLabel: { fontSize: 7, color: "#999", textTransform: "uppercase" },
    totalValue: { fontSize: 16, fontWeight: "bold" },
    footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999", paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#DDD" },
});

export function PeleDeVidroPDF(props: PeleDeVidroPDFProps) {
    const c = props.textColor || props.themeColor;
    const dataGeracao = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(new Date());


    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: props.themeColor }]}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.titulo, { color: props.themeColor }]}>Orçamento Pele de Vidro</Text>
                        <Text style={styles.data}>Emissão em: {dataGeracao}</Text>
                    </View>
                    {props.logoUrl && <Image src={props.logoUrl} style={styles.logo} />}
                </View>

                {/* Box Cliente/Obra */}
                <View style={styles.clientObraBox}>
                    <View style={styles.clientObraLine}>
                        <View style={styles.clientObraItem}>
                            <Text style={styles.label}>Cliente</Text>
                            <Text style={[styles.value, { color: c }]}>{props.nomeCliente || "Não informado"}</Text>
                        </View>
                        <View style={styles.clientObraItem}>
                            <Text style={styles.label}>Obra / Referência</Text>
                            <Text style={[styles.value, { color: c }]}>{props.nomeObra || "Geral"}</Text>
                        </View>
                    </View>
                </View>

                {/* Preview do desenho */}
                {(() => {
                    // Parâmetros para o preview SVG
                    const sw = 460;
                    const sl = 28;
                    const sr = 8;
                    const st = 6;
                    const sb = 14;
                    const cw = sw - sl - sr;
                    const rat = Math.min(Math.max(props.alturaVaoMm / (props.larguraVaoMm || 1), 0.25), 1.2);
                    const ch = cw * rat;
                    const sh = ch + st + sb;
                    const pw = Math.max(1.5, Math.min(4, cw * 0.01));
                    const rh = Math.max(2.5, Math.min(6, ch * 0.025));
                    const qH = Math.max(props.quadrosHorizontal, 1);
                    const qV = Math.max(props.quadrosVertical, 1);
                    const gw = (cw - (qH + 1) * pw) / qH;
                    const gh = (ch - rh * 2) / qV;
                    const x0 = sl;
                    const y0 = st;
                    const dw = 440;
                    const dh = dw * (sh / sw);
                    return (
                        <View style={{ marginTop: 6, marginBottom: 10, alignItems: "center" }}>
                            <Text style={{ fontSize: 9, fontWeight: "bold", color: props.themeColor, marginBottom: 5, alignSelf: "flex-start" }}>Vista Frontal</Text>
                            <Svg viewBox={`0 0 ${sw} ${sh}`} style={{ width: dw, height: dh }}>
                                <Rect x={x0} y={y0} width={cw} height={rh} fill="#d8d8d8" />
                                <Rect x={x0} y={y0} width={cw} height={rh} fill="none" stroke="#b0b0b0" strokeWidth={0.4} />
                                <Rect x={x0} y={y0 + ch - rh} width={cw} height={rh} fill="#d8d8d8" />
                                <Rect x={x0} y={y0 + ch - rh} width={cw} height={rh} fill="none" stroke="#b0b0b0" strokeWidth={0.4} />
                                {Array.from({ length: qH }).map((_, i) => {
                                    const pX = x0 + i * (gw + pw);
                                    const gX = pX + pw;
                                    return (
                                        <G key={i}>
                                            <Rect x={pX} y={y0} width={pw} height={ch} fill="#d8d8d8" />
                                            <Rect x={pX} y={y0} width={pw} height={ch} fill="none" stroke="#b0b0b0" strokeWidth={0.3} />
                                            {Array.from({ length: qV }).map((_, j) => {
                                                const gY = y0 + rh + j * gh;
                                                return (
                                                    <G key={j}>
                                                        <Rect x={gX} y={gY} width={gw} height={gh} fill="#ddf2ee" />
                                                        <Rect x={gX} y={gY} width={gw} height={gh} fill="none" stroke="#88bbb2" strokeWidth={0.4} />
                                                    </G>
                                                );
                                            })}
                                        </G>
                                    );
                                })}
                                <Rect x={x0 + qH * (gw + pw)} y={y0} width={pw} height={ch} fill="#d8d8d8" />
                                <Rect x={x0 + qH * (gw + pw)} y={y0} width={pw} height={ch} fill="none" stroke="#b0b0b0" strokeWidth={0.3} />
                                <Line x1={x0} y1={y0 + ch + 6} x2={x0 + cw} y2={y0 + ch + 6} stroke="#999999" strokeWidth={0.3} />
                                <Line x1={x0} y1={y0 + ch + 3} x2={x0} y2={y0 + ch + 9} stroke="#999999" strokeWidth={0.3} />
                                <Line x1={x0 + cw} y1={y0 + ch + 3} x2={x0 + cw} y2={y0 + ch + 9} stroke="#999999" strokeWidth={0.3} />
                                <Line x1={x0 - 6} y1={y0} x2={x0 - 6} y2={y0 + ch} stroke="#999999" strokeWidth={0.3} />
                                <Line x1={x0 - 9} y1={y0} x2={x0 - 3} y2={y0} stroke="#999999" strokeWidth={0.3} />
                                <Line x1={x0 - 9} y1={y0 + ch} x2={x0 - 3} y2={y0 + ch} stroke="#999999" strokeWidth={0.3} />
                            </Svg>
                            <Text style={{ fontSize: 7, color: "#777777", marginTop: 3 }}>
                                Vão: {props.larguraVaoMm} × {props.alturaVaoMm} mm · {qH} quadros H · {qV} quadros V
                            </Text>
                        </View>
                    );
                })()}

                {/* Perfis */}
                <Text style={[styles.sectionTitle, { color: props.themeColor }]}>Perfis de Alumínio</Text>
                <View style={styles.table}>
                    <View style={[styles.tableHeader, { backgroundColor: props.themeColor }]}>
                        <Text style={[styles.thCell, { width: "10%" }]}>Código</Text>
                        <Text style={[styles.thCell, { width: "18%" }]}>Perfil</Text>
                        <Text style={[styles.thCell, { width: "10%", textAlign: "center" }]}>Un</Text>
                        <Text style={[styles.thCell, { width: "10%", textAlign: "right" }]}>KG/MT</Text>
                        <Text style={[styles.thCell, { width: "12%", textAlign: "right" }]}>Metro</Text>
                        <Text style={[styles.thCell, { width: "10%", textAlign: "right" }]}>Barras</Text>
                        <Text style={[styles.thCell, { width: "10%", textAlign: "right" }]}>KG total</Text>
                        <Text style={[styles.thCell, { width: "10%", textAlign: "right" }]}>Preço</Text>
                        <Text style={[styles.thCell, { width: "10%", textAlign: "right" }]}>Total</Text>
                    </View>
                    {props.perfis.map((p, i) => (
                        <View key={`p-${i}`} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(i) }]}>
                            <Text style={[styles.tdCell, { width: "10%" }]}>{p.codigo}</Text>
                            <Text style={[styles.tdCell, { width: "18%" }]}>{p.nome}</Text>
                            <Text style={[styles.tdCell, { width: "10%", textAlign: "center" }]}>{p.unidade}</Text>
                            <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{p.kgmt}</Text>
                            <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]}>{typeof p.metroLinear === "number" ? p.metroLinear.toLocaleString("pt-BR") : p.metroLinear}</Text>
                            <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{p.barras}</Text>
                            <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{typeof p.kgTotal === "number" ? p.kgTotal.toFixed(2) : p.kgTotal}</Text>
                            <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{fmt(p.precoBarra)}</Text>
                            <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}>{fmt(p.valorTotal)}</Text>
                        </View>
                    ))}
                    {/* Linha de total de kg das barras */}
                    <View style={[styles.tableRow, { backgroundColor: "#f7f7f7" }]}>
                        <Text style={[styles.tdCell, { width: "10%" }]}></Text>
                        <Text style={[styles.tdCell, { width: "18%" }]}>Total KG das barras</Text>
                        <Text style={[styles.tdCell, { width: "10%", textAlign: "center" }]}></Text>
                        <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}></Text>
                        <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]}></Text>
                        <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}></Text>
                        <Text style={[styles.tdCell, { width: "10%", textAlign: "right", fontWeight: "bold" }]}> {
                           props.perfis.reduce((acc, p) => acc + (typeof p.kgTotal === "number" ? p.kgTotal : 0), 0).toFixed(2)
                        } </Text>
                        <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}></Text>
                        <Text style={[styles.tdCell, { width: "10%", textAlign: "right" }]}></Text>
                    </View>
                </View>

                {/* Acessórios */}
                <Text style={[styles.sectionTitle, { color: props.themeColor }]}>Acessórios / Ferragens</Text>
                <View style={styles.table}>
                    <View style={[styles.tableHeader, { backgroundColor: props.themeColor }]}>
                        <Text style={[styles.thCell, { width: "12%" }]}>Código</Text>
                        <Text style={[styles.thCell, { width: "34%" }]}>Acessório</Text>
                        <Text style={[styles.thCell, { width: "12%" }]}>Un</Text>
                        <Text style={[styles.thCell, { width: "12%", textAlign: "right" }]}>Qtd</Text>
                        <Text style={[styles.thCell, { width: "15%", textAlign: "right" }]}>Preço</Text>
                        <Text style={[styles.thCell, { width: "15%", textAlign: "right" }]}>Total</Text>
                    </View>
                    {props.acessorios.map((a, i) => (
                        <View key={`a-${i}`} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(i) }]}>
                            <Text style={[styles.tdCell, { width: "12%" }]}>{a.codigo}</Text>
                            <Text style={[styles.tdCell, { width: "34%" }]}>{a.nome}</Text>
                            <Text style={[styles.tdCell, { width: "12%" }]}>{a.unidade}</Text>
                            <Text style={[styles.tdCell, { width: "12%", textAlign: "right" }]}>{a.quantidade}</Text>
                            <Text style={[styles.tdCell, { width: "15%", textAlign: "right" }]}>{fmt(a.precoUnitario)}</Text>
                            <Text style={[styles.tdCell, { width: "15%", textAlign: "right" }]}>{fmt(a.valorTotal)}</Text>
                        </View>
                    ))}
                </View>

                {/* Resumo */}
                <View style={styles.summaryContainer}>
                    <View style={{ flexDirection: "row", gap: 20 }}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Área total de vidro</Text>
                            <Text style={[styles.summaryValue, { color: c }]}>{props.areaVidro.toFixed(3)} m²</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total vidro</Text>
                            <Text style={[styles.summaryValue, { color: c }]}>{fmt(props.totalVidro)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total perfis</Text>
                            <Text style={[styles.summaryValue, { color: c }]}>{fmt(props.totalPerfis)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total acessórios</Text>
                            <Text style={[styles.summaryValue, { color: c }]}>{fmt(props.totalAcessorios)}</Text>
                        </View>
                    </View>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Valor Total</Text>
                        <Text style={[styles.totalValue, { color: props.themeColor }]}>{fmt(props.totalGeral)}</Text>
                    </View>
                </View>

                <Text
                    style={styles.footer}
                    render={({ pageNumber, totalPages }) => buildPdfFooterText(props.nomeEmpresa, pageNumber, totalPages)}
                    fixed
                />
            </Page>
        </Document>
    );
}
