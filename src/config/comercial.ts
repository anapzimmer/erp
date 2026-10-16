export const whatsappComercial = "5546988271599";

// Preços de divulgação. Não atualizam contratos ou assinaturas existentes.
export const precosPlanosCentavos = {
  essencial: 19990,
  profissional: 29990,
  completo: 49990,
} as const;

export const moedaComercial = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
