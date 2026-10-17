export const whatsappComercial = "5546988271599";

// Preços de divulgação. Não atualizam contratos ou assinaturas existentes.
export const precosPlanosCentavos = {
  essencial: 19990,
  profissional: 29990,
  completo: 49990,
} as const;

export const moedaComercial = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Recursos do plano Completo, compartilhados por /planos e /fundadores.
export const recursosCompleto = [
  "Tudo do plano Profissional",
  "Sacada frontal",
  "Sacada na torre e com grapas",
  "Fechamento de sacada",
  "Pele de vidro",
  "Projetos com pinázio",
  "Cálculos fora do esquadro",
  "Documentos técnicos com desenhos",
] as const;
