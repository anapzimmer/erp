"use client";

type SidebarProps = {
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
  nomeEmpresa: string;
  expandido: boolean;
  setExpandido: (expandido: boolean) => void;
};

export default function Sidebar(_props: SidebarProps) {
  // Navegação lateral desativada: menu unificado no Header para todo o sistema.
  return null;
}
