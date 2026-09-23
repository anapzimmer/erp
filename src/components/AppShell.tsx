"use client";

import { usePathname } from "next/navigation";
import { OrcamentoProvider } from "@/context/OrcamentoContext";
import ProjetoAssistenteGlobal from "@/components/ProjetoAssistenteGlobal";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const rotaPublica =
    pathname === "/" ||
    pathname === "/como-funciona" ||
    pathname === "/recursos" ||
    pathname === "/planos" ||
    pathname === "/login" ||
    pathname === "/recuperar-senha" ||
    pathname === "/reset-password";

  // SITE COMERCIAL / AUTENTICAÇÃO
  // Não carrega recursos internos do ERP.
  if (rotaPublica) {
    return <>{children}</>;
  }

  // ERP
  // Mantém exatamente a estrutura que já existia.
  return (
    <OrcamentoProvider>
      {children}
      <ProjetoAssistenteGlobal />
    </OrcamentoProvider>
  );
}