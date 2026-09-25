"use client";
import { rotaPublica as ehRotaPublica } from "@/lib/rotasPublicas";

import EntradaAutenticada from "@/components/EntradaAutenticada";
import SuporteNotificacoes from "@/components/SuporteNotificacoes";
import { usePathname } from "next/navigation";
import { OrcamentoProvider } from "@/context/OrcamentoContext";
import ProjetoAssistenteGlobal from "@/components/ProjetoAssistenteGlobal";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const rotaPublica = ehRotaPublica(pathname);

  // SITE COMERCIAL / AUTENTICAÇÃO
  // Não carrega recursos internos do ERP.
  if (rotaPublica) {
    return <><EntradaAutenticada />{children}</>;
  }

  // ERP
  // Mantém exatamente a estrutura que já existia.
  return (
    <OrcamentoProvider>
      {children}
      <ProjetoAssistenteGlobal />
      <SuporteNotificacoes />
    </OrcamentoProvider>
  );
}