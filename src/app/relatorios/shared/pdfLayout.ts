export const PDF_HEADER_LAYOUT = {
  marginBottom: 20,
  paddingBottom: 10,
  borderBottomWidth: 2,
  titleSize: 18,
  subtitleSize: 10,
  dateSize: 9,
  logoWidth: 140,
  logoHeight: 45,
} as const;

export const PDF_TABLE_LAYOUT = {
  rowBorderWidth: 1,
  rowBorderColor: '#EEEEEE',
  zebraEvenBg: '#FFFFFF',
  zebraOddBg: '#F9F9F9',
  headerFontSize: 9,
  bodyFontSize: 8,
} as const;

export function getPdfZebraRowBackground(index: number): string {
  return index % 2 === 0 ? PDF_TABLE_LAYOUT.zebraEvenBg : PDF_TABLE_LAYOUT.zebraOddBg;
}

export function buildPdfFooterText(empresa: string, pageNumber: number, totalPages: number): string {
  return `Glass Code ERP - Licenciado para ${empresa} - Pagina ${pageNumber} de ${totalPages}`;
}
