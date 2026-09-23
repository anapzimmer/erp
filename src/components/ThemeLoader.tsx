"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function ThemeLoader({
  children,
}: {
  children: ReactNode;
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

  /*
   * IMPORTANTE:
   *
   * O ThemeLoader não pode remover a aplicação da tela enquanto
   * o tema/branding estiver sendo atualizado.
   *
   * O ThemeProvider continua carregando logos e aparência
   * normalmente em segundo plano.
   *
   * Assim, uma atualização do tema não desmonta:
   * - AuthProvider
   * - PlatformAccessGate
   * - AppShell
   * - páginas do ERP
   * - formulários abertos
   */

  if (rotaPublica) {
    return <>{children}</>;
  }

  return <>{children}</>;
}