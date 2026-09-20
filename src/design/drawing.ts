import tokens from "./tokens.json";
// Standalone SVGs are also embedded in PDFs/data URLs: they cannot depend on inherited CSS variables.
export const DRAWING_COLORS = {
  ink: tokens.brand.graphite,
  frame: tokens.brand.silver,
  edge: tokens.brand.mist,
  glass: tokens.brand.ice,
  white: tokens.light.surface,
} as const;
