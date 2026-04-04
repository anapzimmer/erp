//app/relatorios/calculovidros/CalculoVidroPDF.tsx
"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { PDF_HEADER_LAYOUT, PDF_TABLE_LAYOUT, buildPdfFooterText, getPdfZebraRowBackground } from "../shared/pdfLayout";

// --- TIPAGENS ---
interface ItemVidro {
    id: string | number;
    descricao: string;
    tipo?: string;
    precoVidroM2?: number;
    acabamento?: string;
    servicos?: string;
    observacaoRateio?: string;
    medidaReal: string;
    medidaCalc: string;
    qtd: number;
    total: number;
    valorServicoUn?: number;
}

interface CalculoVidroPDFProps {
    itens: ItemVidro[];
    nomeEmpresa: string;
    logoUrl?: string | null;
    nomeCliente?: string | null;
    themeColor: string; // Cor principal (ex: o azul do header)
    textColor?: string;
    nomeObra?: string;
    pesoTotal: number;
    metragemTotal: number;
    valorTotal: number;
    totalPecas: number;
    numeroOrcamento?: string;
}

const styles = StyleSheet.create({
    page: { padding: 40, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: PDF_HEADER_LAYOUT.marginBottom,
        paddingBottom: PDF_HEADER_LAYOUT.paddingBottom,
        borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth,
    },
    headerLeft: { flexDirection: 'column', flex: 1 },
    tituloRelatorio: { fontSize: PDF_HEADER_LAYOUT.titleSize, fontWeight: 'bold', textTransform: 'uppercase' },
    subtitulo: { fontSize: PDF_HEADER_LAYOUT.subtitleSize, color: '#1C415B', marginTop: 2, fontWeight: 'bold' },
    dataEmissao: { fontSize: PDF_HEADER_LAYOUT.dateSize, color: '#666', marginTop: 6 },
    logo: {
        width: PDF_HEADER_LAYOUT.logoWidth,
        height: PDF_HEADER_LAYOUT.logoHeight,
        objectFit: 'contain',
        objectPosition: 'right',
    },

    infoSection: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 8,
    },
    infoBox: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 6,
        borderLeftWidth: 3,
    },
    label: { fontSize: 6, color: '#999', textTransform: 'uppercase', marginBottom: 3, fontWeight: 'bold' },
    value: { fontSize: 10, fontWeight: 'bold', color: '#1C415B' },

    // Tabela
    table: { width: '100%', marginTop: 5 },
    tableHeader: { flexDirection: 'row' },
    tableRow: { flexDirection: 'row', borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth, borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor, alignItems: 'center', minHeight: 32 },
    tableColHeader: { padding: 5, color: '#FFFFFF', fontSize: PDF_TABLE_LAYOUT.headerFontSize, fontWeight: 'bold', textTransform: 'uppercase' },

    // Textos da Tabela com a cor solicitada
    tableCol: { padding: 5, fontSize: PDF_TABLE_LAYOUT.bodyFontSize, color: '#1C415B' },

    colDesc: { width: '32%' },
    colQtd: { width: '8%' , textAlign: 'center' },
    colMedReal: { width: '17%', textAlign: 'center' },
    colM2: { width: '10%', textAlign: 'right' },
    colSubtotal: { width: '16%', textAlign: 'right' },
    colTotal: { width: '17%', textAlign: 'right' },

    summaryContainer: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    summaryGroup: { flexDirection: 'row', gap: 20 },
    summaryItem: { flexDirection: 'column', alignItems: 'flex-start' },
    summaryLabel: { fontSize: 6, color: '#999', textTransform: 'uppercase', marginBottom: 2 },
    summaryValue: { fontSize: 10, fontWeight: 'bold', color: '#1C415B' },

    totalFinalBox: { textAlign: 'right' },
    totalFinalLabel: { fontSize: 7, color: '#999', textTransform: 'uppercase' },
    totalFinalValue: { fontSize: 16, fontWeight: 'bold' },

    footer: {
        position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center',
        fontSize: 8, color: '#999', paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#DDD'
    }
});

export function CalculoVidroPDF({
    itens,
    nomeEmpresa,
    logoUrl,
    themeColor,
    textColor,
    nomeCliente,
    nomeObra,
    pesoTotal,
    metragemTotal,
    valorTotal,
    totalPecas,
    numeroOrcamento,
}: CalculoVidroPDFProps) {

    const totalFinanceiro = itens.reduce((sum, item) => sum + item.total, 0);
    // totalPecas já vem das props, não precisa recalcular
    const contentColor = textColor || themeColor;
    const calcularM2Item = (item: ItemVidro) => {
        const [largura, altura] = item.medidaCalc
            .split('x')
            .map((valor) => parseInt(valor.replace(/\D/g, ''), 10) || 0);

        return (largura / 1000) * (altura / 1000) * Number(item.qtd || 0);
    };

    const calcularPrecoM2Item = (item: ItemVidro) => {
        if (typeof item.precoVidroM2 === 'number' && !Number.isNaN(item.precoVidroM2)) {
            return item.precoVidroM2;
        }

        const metragemItem = calcularM2Item(item);
        if (!metragemItem) return 0;

        const totalSemServico = item.total - (item.valorServicoUn || 0) * Number(item.qtd || 0);
        return totalSemServico > 0 ? totalSemServico / metragemItem : 0;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Cabeçalho */}
                <View style={[styles.header, { borderBottomColor: themeColor }]}> 
                    <View style={styles.headerLeft}>
                        <Text style={[styles.tituloRelatorio, { color: themeColor }]}>Orçamento de Vidros</Text>
                        {numeroOrcamento && (
                            <Text style={styles.subtitulo}>Nº {numeroOrcamento}</Text>
                        )}
                        <Text style={styles.dataEmissao}>Emissão em: {new Date().toLocaleDateString('pt-BR')}</Text>
                    </View>
                    {logoUrl && <Image src={logoUrl} style={styles.logo} />}
                </View>
                <View style={styles.infoSection}>
                    <View style={[styles.infoBox, { borderLeftColor: themeColor }]}> 
                        <Text style={styles.label}>Cliente</Text>
                        <Text style={[styles.value, { color: contentColor }]}>{nomeCliente || "Não informado"}</Text>
                    </View>
                    <View style={[styles.infoBox, { borderLeftColor: themeColor }]}> 
                        <Text style={styles.label}>Obra / Referência</Text>
                        <Text style={[styles.value, { color: contentColor }]}>{nomeObra || "Geral"}</Text>
                    </View>
                </View>

                {/* Tabela de Itens */}
                <View style={styles.table}>
                    <View style={[styles.tableHeader, { backgroundColor: themeColor }]}>
                        <Text style={[styles.tableColHeader, styles.colDesc]}>Descrição do Material</Text>
                        <Text style={[styles.tableColHeader, styles.colQtd]}>Qtd</Text>
                        <Text style={[styles.tableColHeader, styles.colMedReal]}>Dimensão</Text>
                        <Text style={[styles.tableColHeader, styles.colM2]}>M²</Text>
                        <Text style={[styles.tableColHeader, styles.colSubtotal]}>Valor m²</Text>
                        <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
                    </View>

                    {itens.map((item, index) => (
                        <View key={item.id} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(index) }]}>

                            {/* Descrição e Serviços */}
                            <View style={[styles.tableCol, styles.colDesc]}>
                                <Text style={{ color: contentColor }}>
                                    {item.descricao}{item.tipo ? ` - ${item.tipo}` : ''}
                                </Text>
                                {(item.servicos || item.acabamento) && (
                                    <Text style={{ fontSize: 7, color: '#c9c9c9', marginTop: 2 }}>
                                        {item.acabamento ? `Acabamento: ${item.acabamento}` : ''}
                                        {item.acabamento && item.servicos ? ' | ' : ''}
                                        {item.servicos ? `Serviço: ${item.servicos}` : ''}
                                    </Text>
                                )}
                                {item.observacaoRateio && (
                                    <Text style={{ fontSize: 6.5, color: '#7c8b9a', marginTop: 2 }}>
                                        {item.observacaoRateio}
                                    </Text>
                                )}
                            </View>

                            {/* Medidas, Qtd e Preço */}
                            <Text style={[styles.tableCol, styles.colQtd, { color: contentColor }]}>
                                {Number(item.qtd || 0).toString().padStart(2, '0')}
                            </Text>
                            <Text style={[styles.tableCol, styles.colMedReal, { color: contentColor }]}>{item.medidaReal}</Text>
                            <Text style={[styles.tableCol, styles.colM2, { color: contentColor }]}>
                                {calcularM2Item(item).toFixed(3)}
                            </Text>
                            <Text style={[styles.tableCol, styles.colSubtotal, { color: contentColor }]}>
                                {calcularPrecoM2Item(item).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Text>
                            <Text style={[styles.tableCol, styles.colTotal, { color: contentColor }]}>
                                {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Resumo Final */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryGroup}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Peças</Text>
                            <Text style={[styles.summaryValue, { color: contentColor }]}>{totalPecas} un</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Metragem</Text>
                            <Text style={[styles.summaryValue, { color: contentColor }]}>{metragemTotal.toFixed(3)} m²</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Peso Total</Text>
                            <Text style={[styles.summaryValue, { color: contentColor }]}>{pesoTotal.toFixed(3)} kg</Text>
                        </View>
                    </View>

                    <View style={styles.totalFinalBox}>
                        <Text style={styles.totalFinalLabel}>Valor Total do Orçamento</Text>
                        <Text style={[styles.totalFinalValue, { color: themeColor }]}>
                            {totalFinanceiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Text>
                    </View>
                </View>

                <Text
                    style={styles.footer}
                    render={({ pageNumber, totalPages }) => (
                        buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)
                    )}
                    fixed
                />
            </Page>
        </Document>
    );
}   