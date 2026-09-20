import tokens from "@/design/tokens.json";
import { Font } from "@react-pdf/renderer";

// Print always consumes the light palette, regardless of the screen theme.
Font.register({ family: "Inter", fonts: [
  { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
  { src: "/fonts/Inter-SemiBold.ttf", fontWeight: 500 },
  { src: "/fonts/Inter-SemiBold.ttf", fontWeight: 600 },
  { src: "/fonts/Inter-SemiBold.ttf", fontWeight: 700 },
] });

export const PDF_COLORS = {
  ink: tokens.brand.graphite,
  muted: tokens.light["text-secondary"],
  softMuted: tokens.brand.silver,
  border: tokens.brand.mist,
  borderLight: tokens.brand.mist,
  panelBg: tokens.brand.ice,
  tableHeaderBg: tokens.light["surface-secondary"],
  white: tokens.light.surface,
  accent: tokens.brand.lime,
  accentSoft: tokens.light.selection,
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
