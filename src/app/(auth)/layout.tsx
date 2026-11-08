import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Acesso ao sistema para vidraçarias",
  description: "Acesse o Glass Code para organizar cálculos, projetos e orçamentos da sua vidraçaria.",
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  alternates: { canonical: null },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
