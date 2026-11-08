import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Como Funciona o Software para Vidraçarias",

  description:
    "Veja como o Glass Code organiza o orçamento da vidraçaria, do cadastro do cliente e projeto ao cálculo de vidros, materiais, preços e geração da proposta.",

  alternates: {
    canonical: "/como-funciona",
  },

  openGraph: {
    title: "Como Funciona o Glass Code",
    description:
      "Do pedido do cliente ao orçamento pronto: conheça o fluxo do Glass Code para pequenas vidraçarias.",
    url: "/como-funciona",
  },
};

export default function ComoFuncionaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}