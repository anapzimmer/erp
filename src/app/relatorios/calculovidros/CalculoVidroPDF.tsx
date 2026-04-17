//app/relatorios/calculovidros/CalculoVidroPDF.tsx
"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { PDF_HEADER_LAYOUT, PDF_TABLE_LAYOUT, buildPdfFooterText, getPdfZebraRowBackground } from "../shared/pdfLayout";

// --- TIPAGENS ---
interface ItemVidro {
    id: string | number;
    descricao: string;
    desenhoUrl?: string;
    tipo?: string;
    precoVidroM2?: number;
    valorUnitario?: number;
    acabamento?: string;
    corVidro?: string;
    servicos?: string;
    observacaoRateio?: string;
    observacaoPreco?: string;
    vao?: string;
    medidaReal: string;
    medidaCalc: string;
    qtd: number;
    total: number;
    valorServicoUn?: number;
    planoCorte?: Array<{
        numero: number;
        cortes: number[];
        usadoMm: number;
        sobraMm: number;
    }>;
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
    tableRow: { flexDirection: 'row', borderBottomWidth: PDF_TABLE_LAYOUT.rowBorderWidth, borderBottomColor: PDF_TABLE_LAYOUT.rowBorderColor, alignItems: 'stretch', minHeight: 32 },
    tableColHeader: { padding: 5, color: '#FFFFFF', fontSize: PDF_TABLE_LAYOUT.headerFontSize, fontWeight: 'bold', textTransform: 'uppercase' },

    // Textos da Tabela com a cor solicitada
    tableCol: { padding: 5, fontSize: PDF_TABLE_LAYOUT.bodyFontSize, color: '#1C415B' },
    planoCorteContainer: { marginTop: 6, gap: 6 },
    planoCorteLinha: { borderWidth: 0.5, borderColor: '#E5E7EB', borderRadius: 4, padding: 5, backgroundColor: '#FAFAFA' },
    planoCorteTopo: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
    planoCorteTexto: { fontSize: 6.5, color: '#6B7280' },
    barraVisual: { flexDirection: 'row', width: '100%', height: 8, borderRadius: 999, overflow: 'hidden', marginTop: 5, backgroundColor: '#F3F4F6' },
    corteVisual: { height: '100%', backgroundColor: '#94A3B8', borderRightWidth: 0.5, borderRightColor: '#FFFFFF' },
    sobraVisualCurta: { height: '100%', backgroundColor: '#E5E7EB' },
    sobraVisualReaproveitavel: { height: '100%', backgroundColor: '#DCFCE7' },
    rowCabecalhoProjeto: { backgroundColor: '#EFF6FF' },
    rowPerfilConsolidado: { backgroundColor: '#F8FAFC' },
    tituloCabecalhoProjeto: { fontSize: 8.5, fontWeight: 'bold' },
    seloConsolidado: { marginTop: 3, fontSize: 6.5, color: '#64748B' },
    descricaoComDesenho: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
    descricaoTexto: { flex: 1 },
    desenhoThumbBox: {
        width: 82,
        height: 60,
        padding: 2,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    desenhoThumb: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },

    colDesc: { width: '39%' },
    colQtd: { width: '9%', textAlign: 'center' },
    colVao: { width: '18%', textAlign: 'center' },
    colPrecoM2: { width: '14%', textAlign: 'center' },
    colTotal: { width: '20%', textAlign: 'right' },

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
    const contentColor = textColor || themeColor;
    const ehCabecalhoProjeto = (item: ItemVidro) => item.descricao.startsWith('Projeto:');
    const ehPerfilConsolidado = (item: ItemVidro) => item.descricao.startsWith('Perfil Consolidado ');
    const comprimentoBarraItem = (item: ItemVidro) => parseInt(String(item.medidaReal || '').replace(/\D/g, ''), 10) || 0;
    const calcularValorUnitarioItem = (item: ItemVidro) => {
        if (typeof item.valorUnitario === 'number' && !Number.isNaN(item.valorUnitario)) {
            return item.valorUnitario;
        }

        const quantidade = Number(item.qtd || 0);
        if (!quantidade) return Number(item.total || 0);

        return Number(item.total || 0) / quantidade;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Cabeçalho */}
                <View style={[styles.header, { borderBottomColor: themeColor, borderBottomWidth: PDF_HEADER_LAYOUT.borderBottomWidth }]}> 
                    <View style={styles.headerLeft}>
                        <Text style={[styles.tituloRelatorio, { color: themeColor }]}>Orçamento da Obra</Text>
                        {numeroOrcamento && (
                            <Text style={styles.subtitulo}>Nº {numeroOrcamento}</Text>
                        )}
                        <Text style={styles.dataEmissao}>Emissão em: {new Date().toLocaleDateString('pt-BR')}</Text>
                    </View>
                    {logoUrl && <Image src={logoUrl} style={styles.logo} />}
                </View>
                <View style={styles.infoSection}>
                    <View style={[styles.infoBox, { borderLeftColor: themeColor, borderLeftWidth: 3 }]}> 
                        <Text style={styles.label}>Cliente</Text>
                        <Text style={[styles.value, { color: contentColor }]}>{nomeCliente || "Não informado"}</Text>
                    </View>
                    <View style={[styles.infoBox, { borderLeftColor: themeColor, borderLeftWidth: 3 }]}> 
                        <Text style={styles.label}>Obra / Referência</Text>
                        <Text style={[styles.value, { color: contentColor }]}>{nomeObra || "Geral"}</Text>
                    </View>
                </View>

                {/* Tabela de Itens */}
                <View style={styles.table}>
                    <View style={[styles.tableHeader, { backgroundColor: themeColor }]}>
                        <Text style={[styles.tableColHeader, styles.colDesc]}>Vidro</Text>
                        <Text style={[styles.tableColHeader, styles.colQtd]}>QTDE</Text>
                        <Text style={[styles.tableColHeader, styles.colVao]}>Larg x Alt</Text>
                        <Text style={[styles.tableColHeader, styles.colPrecoM2]}>Preco m²</Text>
                        <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
                    </View>

                    {itens.map((item, index) => (
                        <View key={item.id} style={[
                            styles.tableRow,
                            ehCabecalhoProjeto(item)
                                ? styles.rowCabecalhoProjeto
                                : ehPerfilConsolidado(item)
                                    ? styles.rowPerfilConsolidado
                                    : { backgroundColor: getPdfZebraRowBackground(index) }
                        ]}> 

                            {/* Descrição e Serviços */}
                            <View style={[styles.tableCol, styles.colDesc]}>
                                <View style={styles.descricaoComDesenho}>
                                    {item.desenhoUrl && (
                                        <View style={styles.desenhoThumbBox}>
                                            <Image src={item.desenhoUrl} style={styles.desenhoThumb} />
                                        </View>
                                    )}
                                    <View style={styles.descricaoTexto}>
                                        <Text style={ehCabecalhoProjeto(item) ? [styles.tituloCabecalhoProjeto, { color: contentColor }] : { color: contentColor }}>
                                            {item.descricao}{item.tipo ? ` - ${item.tipo}` : ''}
                                        </Text>
                                        {ehPerfilConsolidado(item) && (
                                            <Text style={styles.seloConsolidado}>Plano de corte consolidado de barras</Text>
                                        )}
                                        {item.medidaCalc && item.medidaCalc !== '-' && (
                                            <Text style={{ fontSize: 6.5, color: '#64748B', marginTop: 2 }}>
                                                Medida de cálculo: {item.medidaCalc}
                                            </Text>
                                        )}
                                        {item.corVidro && item.corVidro !== '-' && (
                                            <Text style={{ fontSize: 6.5, color: '#64748B', marginTop: 2 }}>
                                                Cor do vidro: {item.corVidro}
                                            </Text>
                                        )}
                                        {(item.servicos || item.acabamento) && (
                                            <Text style={{ fontSize: 7, color: '#c9c9c9', marginTop: 2 }}>
                                                {item.acabamento ? `Acabamento: ${item.acabamento}` : ''}
                                                {item.acabamento && item.servicos ? ' | ' : ''}
                                                {item.servicos ? `${ehPerfilConsolidado(item) ? 'Obs.' : 'Serviço'}: ${item.servicos}` : ''}
                                            </Text>
                                        )}
                                        {item.observacaoRateio && (
                                            <Text style={{ fontSize: 6.5, color: '#7c8b9a', marginTop: 2 }}>
                                                {item.observacaoRateio}
                                            </Text>
                                        )}
                                        {item.observacaoPreco && (
                                            <Text style={{ fontSize: 6.5, color: '#059669', marginTop: 2 }}>
                                                {item.observacaoPreco}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                {ehPerfilConsolidado(item) && Array.isArray(item.planoCorte) && item.planoCorte.length > 0 && (
                                    <View style={styles.planoCorteContainer}>
                                        {item.planoCorte.map((barra) => {
                                            const comprimentoBarra = Math.max(comprimentoBarraItem(item), 1);
                                            const sobraReaproveitavel = barra.sobraMm >= 300;
                                            return (
                                                <View key={`${item.id}-barra-${barra.numero}`} style={styles.planoCorteLinha}>
                                                    <View style={styles.planoCorteTopo}>
                                                        <Text style={styles.planoCorteTexto}>Barra {barra.numero}</Text>
                                                        <Text style={styles.planoCorteTexto}>Usado {barra.usadoMm} mm · Sobra {barra.sobraMm} mm</Text>
                                                    </View>
                                                    <View style={styles.barraVisual}>
                                                        {barra.cortes.map((corte, index) => (
                                                            <View
                                                                key={`${item.id}-barra-${barra.numero}-corte-${index}`}
                                                                style={[
                                                                    styles.corteVisual,
                                                                    { width: `${Math.max((corte / comprimentoBarra) * 100, 2)}%` },
                                                                ]}
                                                            />
                                                        ))}
                                                        {barra.sobraMm > 0 && (
                                                            <View
                                                                style={[
                                                                    sobraReaproveitavel ? styles.sobraVisualReaproveitavel : styles.sobraVisualCurta,
                                                                    { width: `${Math.max((barra.sobraMm / comprimentoBarra) * 100, 2)}%` },
                                                                ]}
                                                            />
                                                        )}
                                                    </View>
                                                    <Text style={[styles.planoCorteTexto, { marginTop: 3 }]}>Cortes: {barra.cortes.join(' · ')} mm</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            {/* Quantidade, Medidas e Preço */}
                            <Text style={[styles.tableCol, styles.colQtd, { color: contentColor }]}>
                                {Number(item.qtd || 0).toString().padStart(2, '0')}
                            </Text>
                            <Text style={[styles.tableCol, styles.colVao, { color: contentColor }]}>{item.vao || item.medidaReal || '-'}</Text>
                            <Text style={[styles.tableCol, styles.colPrecoM2, { color: contentColor }]}>
                                {Number(item.precoVidroM2 || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                            {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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