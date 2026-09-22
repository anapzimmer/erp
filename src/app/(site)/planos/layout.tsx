import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos do Software para Indústria de Vidro",

  description:
    "Conheça os planos do Glass Code para empresas do setor de vidro. Tenha orçamentos, cálculos de vidros, projetos, materiais, propostas em PDF e gestão comercial em um único sistema.",

  alternates: {
    canonical: "/planos",
  },

  openGraph: {
    title: "Planos Glass Code | Software para o Setor de Vidro",
    description:
      "Escolha o plano Glass Code ideal para sua operação, com recursos para orçamentos, cálculos, projetos e gestão comercial.",
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