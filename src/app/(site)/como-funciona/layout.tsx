import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Como Funciona o Software para Indústria de Vidro",

  description:
    "Veja como o Glass Code organiza o orçamento da indústria de vidro temperado, do cadastro do cliente e projeto ao cálculo de vidros, materiais, preços e geração da proposta.",

  alternates: {
    canonical: "/como-funciona",
  },

  openGraph: {
    title: "Como Funciona o Glass Code",
    description:
      "Do pedido do cliente ao orçamento pronto: conheça o fluxo do Glass Code para indústrias de vidro temperado.",
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