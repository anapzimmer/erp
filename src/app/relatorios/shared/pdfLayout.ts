export const PDF_COLORS = {
  ink: "#0f2742",
  muted: "#64748b",
  softMuted: "#8a9aab",
  border: "#dbe4ee",
  borderLight: "#e2e8f0",
  panelBg: "#f8fafc",
  tableHeaderBg: "#f1f5f9",
  white: "#ffffff",
  accent: "#00a85a",
  accentSoft: "#bbf7d0",
} as const;

export const PDF_PAGE_LAYOUT = {
  paddingTop: 34,
  paddingHorizontal: 36,
  paddingBottom: 48,
} as const;

export const PDF_HEADER_LAYOUT = {
  marginBottom: 12,
  paddingBottom: 12,
  borderBottomWidth: 1,
  titleSize: 15,
  subtitleSize: 8,
  dateSize: 7.5,
  logoWidth: 118,
  logoHeight: 42,
} as const;

export const PDF_TABLE_LAYOUT = {
  rowBorderWidth: 0.8,
  rowBorderColor: PDF_COLORS.borderLight,
  zebraEvenBg: PDF_COLORS.white,
  zebraOddBg: PDF_COLORS.panelBg,
  headerBg: PDF_COLORS.tableHeaderBg,
  headerFontSize: 6.8,
  bodyFontSize: 7.4,
} as const;

export function getPdfZebraRowBackground(index: number): string {
  return index % 2 === 0 ? PDF_TABLE_LAYOUT.zebraEvenBg : PDF_TABLE_LAYOUT.zebraOddBg;
}

export function buildPdfFooterText(empresa: string, pageNumber: number, totalPages: number): string {
  return `Glass Code ERP - Licenciado para ${empresa} - Página ${pageNumber} de ${totalPages}`;
}
