import type { Metadata } from "next";
import { precosPlanosCentavos, moedaComercial } from "@/config/comercial";

const descricaoPlanos = `Planos do software para vidraçarias a partir de ${moedaComercial(precosPlanosCentavos.essencial)}/mês. Cálculos de vidros, espelhos, projetos e orçamentos em PDF com atendimento personalizado.`;

export const metadata: Metadata = {
  title: "Planos do Software para Vidraçarias",

  description:
    descricaoPlanos,

  alternates: {
    canonical: "/planos",
  },

  openGraph: {
    title: "Planos Glass Code | Software para o Setor de Vidro",
    description:
      descricaoPlanos,
    url: "/planos",
  },
};

export default function PlanosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}