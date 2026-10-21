import { whatsappComercial, moedaComercial } from "./comercial";
export { moedaComercial } from "./comercial";

// Comunicação da nova oferta. Não altera contratos, acesso ou cobranças existentes.
export const foundersComercial = {
  nome: "Programa de Parceiros Fundadores",
  limiteEmpresas: 30,
  usuariosIncluidos: 3,
  precoPromocionalCentavos: 8990,
  precoRegularCentavos: 14990,
  mensalidadesPagasPromocionais: 6,
  planoIncluido: "Completo",
} as const;

// Proposta para o futuro catálogo; não habilita resgates no banco.
export const foundersDescontosPropostos = [
  { pontos: 100, descontoCentavos: 1000 },
  { pontos: 250, descontoCentavos: 2500 },
  { pontos: 500, descontoCentavos: 5000 },
] as const;

export const contatoFounders = `https://wa.me/${whatsappComercial}?text=${encodeURIComponent(
  `Olá! Quero ser Parceiro Fundador do Glass Code: ${moedaComercial(foundersComercial.precoPromocionalCentavos)}/mês nas primeiras ${foundersComercial.mensalidadesPagasPromocionais} mensalidades pagas e ${moedaComercial(foundersComercial.precoRegularCentavos)}/mês depois, por empresa. Gostaria de conhecer as condições de contratação e consultar a disponibilidade de vaga no programa.`,
)}`;
