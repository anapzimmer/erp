//app/relatorios/espelhos/EspelhosPDF.tsx
"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Svg, Rect, Ellipse, Path } from '@react-pdf/renderer';
import { PDF_HEADER_LAYOUT, PDF_TABLE_LAYOUT, buildPdfFooterText, getPdfZebraRowBackground } from "../shared/pdfLayout";

// --- TIPAGENS ---
interface ItemPedido {
  id: number;
  descricao: string;
  medidas: string;
  quantidade: number;
  total: number;
  tipoVisual: string;
  designUrl?: string;
  larguraReal?: number;
  alturaReal?: number;
  divisoesLargura?: number;
  divisoesAltura?: number;
  m2?: number;
}

interface EspelhosPDFProps {
  itens: any[]
  nomeEmpresa: string
  numeroOrcamento?: string
  themeColor: string
  textColor?: string
  nomeCliente?: string
  nomeObra?: string
  logoUrl?: string
  valorTotal?: number
}

// --- ESTILOS DO PDF (Cores fixas apenas para fundo/texto neutro) ---
const styles = StyleSheet.create({
  page: { padding: 32, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 12,
    borderBottomWidth: 0.8,
  },
  headerLeft: { flexDirection: 'column', flex: 1 },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', maxWidth: 230 },
  tituloRelatorio: { fontSize: 14, fontWeight: 'bold', color: '#0F2D44' },
  subtitulo: { fontSize: 7.8, color: '#64748B', marginTop: 4 },
  dataEmissao: { fontSize: 8, color: '#64748B', marginTop: 3 },
  empresaFallback: { fontSize: 15, color: '#0F2D44', fontWeight: 'bold' },
  empresaSlogan: { fontSize: 7.5, color: '#64748B', marginTop: 2 },
  logo: {
    width: PDF_HEADER_LAYOUT.logoWidth,
    height: PDF_HEADER_LAYOUT.logoHeight,
    objectFit: 'contain',
    objectPosition: 'left',
  },

  infoSection: { marginBottom: 14, borderWidth: 0.8, borderColor: '#E2E8F0', borderRadius: 6 },
  infoRow: { flexDirection: 'row', borderBottomWidth: 0.8, borderBottomColor: '#E2E8F0' },
  infoRowLast: { flexDirection: 'row' },
  infoBoxQuarter: { width: '25%', paddingVertical: 7, paddingHorizontal: 9, borderRightWidth: 0.8, borderRightColor: '#E2E8F0' },
  infoBoxHalfBorder: { width: '50%', paddingVertical: 7, paddingHorizontal: 9, borderRightWidth: 0.8, borderRightColor: '#E2E8F0' },
  infoBoxHalf: { width: '50%', paddingVertical: 7, paddingHorizontal: 9 },
  infoBoxLast: { flex: 1, paddingVertical: 7, paddingHorizontal: 9 },
  label: { fontSize: 6.4, color: '#64748B', textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.8 },
  value: { fontSize: 9, color: '#0F2D44' },

  // Tabela
  table: { width: '100%', borderTopWidth: 0.8, borderTopColor: '#CBD5E1' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 0.8, borderBottomColor: '#CBD5E1' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.7, borderBottomColor: '#E2E8F0', alignItems: 'center', minHeight: 72 },
  tableColHeader: { paddingVertical: 6, paddingHorizontal: 4, color: '#334155', fontSize: 6.8, textTransform: 'uppercase', letterSpacing: 0.25 },
  tableCol: { paddingVertical: 6, paddingHorizontal: 4, fontSize: 7.6, color: '#0F2D44' },

  colDesenho: { width: '17%', textAlign: 'center' },
  colDesc: { width: '31%' },
  colMedidas: { width: '16%' },
  colQtd: { width: '9%', textAlign: 'center' },
  colM2: { width: '10%', textAlign: 'right' },
  colTotal: { width: '17%', textAlign: 'right' },
  desenhoBox: { alignItems: 'center', justifyContent: 'center' },
  desenhoMedida: { marginTop: 2, fontSize: 5.8, color: '#64748B', textAlign: 'center' },
  detalhesTexto: { fontSize: 6.4, color: '#64748B', marginTop: 2 },
  summaryContainer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 0.8,
    borderTopColor: '#CBD5E1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryGroup: { flexDirection: 'row', gap: 14 },
  summaryItem: { flexDirection: 'column', alignItems: 'flex-start' },
  summaryLabel: { fontSize: 6.2, color: '#64748B', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  summaryValue: { fontSize: 9.4, fontWeight: 'bold', color: '#0F2D44' },
  totalFinalBox: { textAlign: 'right' },
  totalFinalLabel: { fontSize: 6.5, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalFinalValue: { fontSize: 14, fontWeight: 'bold', color: '#0F2D44', marginTop: 3 },

  footer: {
    position: 'absolute', bottom: 18, left: 32, right: 32, textAlign: 'center',
    fontSize: 7, color: '#94A3B8', borderTopWidth: 0.5, borderTopColor: '#E2E8F0', paddingTop: 8,
  }
});

export function EspelhosPDF({ itens, nomeEmpresa, logoUrl, themeColor, textColor, nomeCliente, nomeObra, numeroOrcamento }: EspelhosPDFProps) {
  const dataGeracao = new Date().toLocaleDateString('pt-BR');
  const totalGeral = itens.reduce((sum, item) => sum + item.total, 0);
  const totalPecas = itens.reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
  const metragemTotal = itens.reduce((sum, item) => sum + Number(item.m2 || 0), 0);
  const contentColor = textColor || themeColor;
  const formatarM2 = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const itemM2 = (item: ItemPedido) => Number(item.m2 || 0);

  const EspelhoDesenho = ({ item }: { item: ItemPedido }) => {
    const largura = Math.max(1, Number(item.larguraReal || String(item.medidas || '').split('x')[0] || 1));
    const altura = Math.max(1, Number(item.alturaReal || String(item.medidas || '').split('x')[1] || 1));
    const tipoVisual = String(item.tipoVisual || "padrao")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const divL = Math.max(1, Number(item.divisoesLargura || 1));
    const divA = Math.max(1, Number(item.divisoesAltura || 1));
    const escala = Math.min(72 / largura, 52 / altura);
    let w = Math.max(22, Math.min(74, largura * escala));
    let h = Math.max(22, Math.min(54, altura * escala));
    const maior = Math.max(w, h);
    const menor = Math.min(w, h);
    const ehRedondo = tipoVisual.includes("redondo");
    const ehOvalVertical = tipoVisual.includes("oval_vertical") || tipoVisual.includes("oval-vertical") || tipoVisual.includes("vertical");
    const ehOvalHorizontal = tipoVisual.includes("oval_horizontal") || tipoVisual.includes("oval-horizontal") || tipoVisual === "oval" || (tipoVisual.includes("oval") && !ehOvalVertical && !tipoVisual.includes("semi_oval"));
    const ehSemiOval = tipoVisual.includes("semi_oval") || tipoVisual.includes("semi-oval");
    const ehOrganico = tipoVisual.includes("organico");
    const ehMolde = tipoVisual.includes("molde");
    const ehCapsula = tipoVisual.includes("capsula");

    if (ehRedondo) {
      w = menor;
      h = menor;
    } else if (ehOvalVertical) {
      w = Math.max(18, menor * 0.68);
      h = maior;
    } else if (ehOvalHorizontal) {
      w = maior;
      h = Math.max(18, menor * 0.68);
    } else if (ehCapsula) {
      w = maior;
      h = Math.max(16, menor * 0.55);
    }

    const x = (78 - w) / 2;
    const y = 4;
    const ehBisote = tipoVisual.includes("bisote");
    const ehLed = tipoVisual.includes("led");
    const strokeWidth = ehBisote ? 4 : 1.4;
    const fill = "#E8F1F6";
    const stroke = "#8FA1AE";
    const pathSemiOval = `M ${x} ${y + h} L ${x} ${y + h * 0.48} C ${x} ${y + h * 0.08} ${x + w} ${y + h * 0.08} ${x + w} ${y + h * 0.48} L ${x + w} ${y + h} Z`;
    const pathOrganico = `M ${x + w * 0.5} ${y} C ${x + w * 0.88} ${y + h * 0.06} ${x + w} ${y + h * 0.36} ${x + w * 0.86} ${y + h * 0.68} C ${x + w * 0.72} ${y + h} ${x + w * 0.25} ${y + h} ${x + w * 0.08} ${y + h * 0.7} C ${x - w * 0.08} ${y + h * 0.4} ${x + w * 0.12} ${y + h * 0.04} ${x + w * 0.5} ${y} Z`;
    const pathMolde = `M ${x + w * 0.16} ${y + h * 0.05} C ${x + w * 0.48} ${y - h * 0.08} ${x + w * 0.78} ${y + h * 0.1} ${x + w * 0.95} ${y + h * 0.38} C ${x + w * 1.06} ${y + h * 0.62} ${x + w * 0.84} ${y + h * 0.96} ${x + w * 0.52} ${y + h * 0.98} C ${x + w * 0.18} ${y + h} ${x - w * 0.04} ${y + h * 0.7} ${x + w * 0.04} ${y + h * 0.42} C ${x + w * 0.08} ${y + h * 0.26} ${x + w * 0.02} ${y + h * 0.12} ${x + w * 0.16} ${y + h * 0.05} Z`;
    const rx = ehCapsula ? Math.min(w, h) / 2 : 3;

    if (tipoVisual.includes("jogo") && (divL > 1 || divA > 1)) {
      const gap = 1.8;
      const cellW = (w - gap * (divL - 1)) / divL;
      const cellH = (h - gap * (divA - 1)) / divA;
      return (
        <View style={styles.desenhoBox}>
          <Svg width={78} height={62} viewBox="0 0 78 62">
            {Array.from({ length: divL * divA }).map((_, index) => {
              const col = index % divL;
              const row = Math.floor(index / divL);
              return (
                <Rect
                  key={`espelho-pdf-jogo-${item.id}-${index}`}
                  x={x + col * (cellW + gap)}
                  y={y + row * (cellH + gap)}
                  width={cellW}
                  height={cellH}
                  rx={2}
                  fill="#E8F1F6"
                  stroke="#8FA1AE"
                  strokeWidth={1}
                />
              );
            })}
          </Svg>
          <Text style={styles.desenhoMedida}>{largura} x {altura} mm</Text>
        </View>
      );
    }

    return (
      <View style={styles.desenhoBox}>
        <Svg width={78} height={62} viewBox="0 0 78 62">
          {ehSemiOval ? (
            <>
              <Path d={pathSemiOval} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
              {ehBisote ? <Path d={`M ${x + 4} ${y + h - 4} L ${x + 4} ${y + h * 0.5} C ${x + 4} ${y + h * 0.18} ${x + w - 4} ${y + h * 0.18} ${x + w - 4} ${y + h * 0.5} L ${x + w - 4} ${y + h - 4} Z`} fill="none" stroke="#FFFFFF" strokeWidth={1} /> : null}
            </>
          ) : ehOrganico ? (
            <Path d={pathOrganico} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          ) : ehMolde ? (
            <Path d={pathMolde} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          ) : ehRedondo || ehOvalVertical || ehOvalHorizontal ? (
            <>
              <Ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
              {ehBisote ? <Ellipse cx={x + w / 2} cy={y + h / 2} rx={Math.max(1, w / 2 - 4)} ry={Math.max(1, h / 2 - 4)} fill="none" stroke="#FFFFFF" strokeWidth={1} /> : null}
              {ehLed ? <Ellipse cx={x + w / 2} cy={y + h / 2} rx={Math.max(1, w / 2 - 6)} ry={Math.max(1, h / 2 - 6)} fill="none" stroke="#FFFFFF" strokeWidth={1} strokeDasharray="3 3" /> : null}
            </>
          ) : (
            <>
              <Rect x={x} y={y} width={w} height={h} rx={rx} ry={rx} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
              {ehBisote ? <Rect x={x + 4} y={y + 4} width={Math.max(0, w - 8)} height={Math.max(0, h - 8)} rx={Math.max(2, rx - 2)} ry={Math.max(2, rx - 2)} fill="none" stroke="#FFFFFF" strokeWidth={1} /> : null}
              {ehLed ? <Rect x={x + 6} y={y + 6} width={Math.max(0, w - 12)} height={Math.max(0, h - 12)} rx={Math.max(2, rx - 4)} ry={Math.max(2, rx - 4)} fill="none" stroke="#FFFFFF" strokeWidth={1} strokeDasharray="3 3" /> : null}
            </>
          )}
        </Svg>
        <Text style={styles.desenhoMedida}>{largura} x {altura} mm</Text>
      </View>
    );
  };

  return (
    <Document>
    <Page size="A4" style={styles.page}>

      {/* Cabeçalho */}
      <View style={[styles.header, { borderBottomColor: '#E2E8F0' }]}>
        <View style={styles.headerLeft}>
          {logoUrl ? (
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <>
              <Text style={styles.empresaFallback}>{nomeEmpresa}</Text>
              <Text style={styles.empresaSlogan}>Soluções em Vidros e Ferragens</Text>
            </>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.tituloRelatorio}>Orçamento de Espelhos</Text>
          <Text style={styles.subtitulo}>Composição comercial de peças, medidas e valores</Text>
          <Text style={styles.dataEmissao}>Emissão: {dataGeracao}</Text>
        </View>
      </View>

      {/* Informações do Cliente */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <View style={styles.infoBoxQuarter}>
            <Text style={styles.label}>Orçamento</Text>
            <Text style={[styles.value, { color: contentColor }]}>{numeroOrcamento || "-"}</Text>
          </View>
          <View style={styles.infoBoxHalfBorder}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={[styles.value, { color: contentColor }]}>{nomeCliente || "Não informado"}</Text>
          </View>
          <View style={styles.infoBoxLast}>
            <Text style={styles.label}>Data</Text>
            <Text style={[styles.value, { color: contentColor }]}>{dataGeracao}</Text>
          </View>
        </View>
        <View style={styles.infoRowLast}>
          <View style={styles.infoBoxLast}>
            <Text style={styles.label}>Obra / referência</Text>
            <Text style={[styles.value, { color: contentColor }]}>{nomeObra || "Geral"}</Text>
          </View>
        </View>
      </View>

      {/* Tabela */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableColHeader, styles.colDesenho]}>Desenho</Text>
          <Text style={[styles.tableColHeader, styles.colDesc]}>Descrição</Text>
          <Text style={[styles.tableColHeader, styles.colMedidas]}>Medidas</Text>
          <Text style={[styles.tableColHeader, styles.colQtd]}>Qtd</Text>
          <Text style={[styles.tableColHeader, styles.colM2]}>m²</Text>
          <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
        </View>

        {itens.map((item, index) => (
          <View key={item.id || index} style={[styles.tableRow, { backgroundColor: getPdfZebraRowBackground(index) }]}>
            <View style={[styles.tableCol, styles.colDesenho]}>
              <EspelhoDesenho item={item} />
            </View>
            <View style={[styles.tableCol, styles.colDesc]}>
              <Text style={{ color: contentColor }}>{item.descricao}</Text>
              <Text style={styles.detalhesTexto}>{item.tipoVisual || "Padrão"}</Text>
            </View>
            <Text style={[styles.tableCol, styles.colMedidas, { color: contentColor }]}>{item.medidas}</Text>

            <Text style={[styles.tableCol, styles.colQtd, { color: contentColor }]}>{item.quantidade.toString()}</Text>
            <Text style={[styles.tableCol, styles.colM2, { color: contentColor }]}>
              {formatarM2(itemM2(item))}
            </Text>
            <Text style={[styles.tableCol, styles.colTotal, { color: contentColor, fontWeight: 'bold' }]}>
              {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryGroup}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Qtd. Peças</Text>
            <Text style={[styles.summaryValue, { color: contentColor }]}>{totalPecas} un</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Metragem</Text>
            <Text style={[styles.summaryValue, { color: contentColor }]}>{formatarM2(metragemTotal)} m²</Text>
          </View>
        </View>
        <View style={styles.totalFinalBox}>
          <Text style={styles.totalFinalLabel}>Valor total do orçamento</Text>
          <Text style={styles.totalFinalValue}>
            {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
      </View>

      <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
        buildPdfFooterText(nomeEmpresa, pageNumber, totalPages)
      )} fixed />
    </Page>
    </Document>

  );
}
