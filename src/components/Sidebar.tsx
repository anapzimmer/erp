"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UsersRound,
  FileText,
  ImageIcon,
  BarChart3,
  LucideIcon,
  Square,
  Package,
  Wrench,
  Boxes,
  Briefcase,
  X,
  Building2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";

type MenuItem = {
  nome: string;
  rota: string;
  icone: LucideIcon;
  submenu?: { nome: string; rota: string }[];
};

const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  {
    nome: "Orçamentos",
    rota: "/orcamentos",
    icone: FileText,
    submenu: [
      { nome: "Espelhos", rota: "/calculo/espelhos" },
      { nome: "Vidros", rota: "/calculo/calculovidro" },
    ],
  },
  { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
  {
    nome: "Relatórios",
    rota: "/relatorios",
    icone: BarChart3,
    submenu: [
      { nome: "Orçamentos", rota: "/admin/relatorio.orcamento" }
    ]
  },
];

const menuCadastros: MenuItem[] = [
  { nome: "Clientes", rota: "/cadastros/clientes", icone: UsersRound },
  { nome: "Vidros", rota: "/cadastros/vidros", icone: Square },
  { nome: "Perfis", rota: "/cadastros/perfis", icone: Package },
  { nome: "Ferragens", rota: "/cadastros/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/cadastros/kits", icone: Boxes },
  { nome: "Serviços", rota: "/cadastros/servicos", icone: Briefcase },
  { nome: "Acabamentos", rota: "/cadastros/acabamentos", icone: Package },
];

interface SidebarProps {
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
  nomeEmpresa: string;
  // Adicione estas duas linhas abaixo:
  expandido: boolean;
  setExpandido: (expandido: boolean) => void;
}

export default function Sidebar({
  showMobileMenu,
  setShowMobileMenu,
  nomeEmpresa,
  expandido, // Agora o TS reconhecerá
  setExpandido  // Agora o TS reconhecerá
}: SidebarProps) {

  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    const isActive = pathname === item.rota || item.submenu?.some((sub) => pathname === sub.rota);
    const isSubmenuOpen = hoveredSubmenu === item.nome || (isActive && expandido);

    return (
      <div
  key={item.nome}
  className="group mb-1 px-2 relative"
  onMouseEnter={() => setHoveredSubmenu(item.nome)}
  onMouseLeave={() => setHoveredSubmenu(null)}
>
      <div
    onClick={() => {
      router.push(item.rota);
      setShowMobileMenu(false);
    }}
    className={`flex items-center ${
      expandido ? "justify-between" : "justify-center"
    } p-3 rounded-xl cursor-pointer transition-all duration-300 hover:translate-x-1`}
    style={{
      color: theme.menuTextColor,
      backgroundColor: isActive ? theme.menuHoverColor : "transparent",
    }}
  >
    <div className={`flex items-center ${expandido ? "gap-3" : ""}`}>
      <Icon
        className="w-5 h-5 shrink-0"
        style={{ color: theme.menuIconColor }}
      />
      {expandido && (
        <span className="font-medium text-sm truncate">{item.nome}</span>
      )}
    </div>

          {item.submenu && expandido && (
      <ChevronRightIcon
        className={`w-4 h-4 opacity-70 transition-transform duration-300 ${
          isSubmenuOpen ? "rotate-90" : ""
        }`}
      />
    )}
  </div>


   {!expandido && (
  <div
    className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-lg z-50"
    style={{
      backgroundColor: theme.menuHoverColor,
      color: theme.menuTextColor,
      border: `1px solid ${theme.menuIconColor}30`,
    }}
  >
    {item.nome}
  </div>
)}


        {item.submenu && expandido && (
          <div
            className={`ml-7 flex flex-col gap-1 pl-2 overflow-hidden transition-all duration-300 ease-in-out ${isSubmenuOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"}`}
            style={{ borderLeft: `1px solid ${theme.menuIconColor}40` }}
          >
            {item.submenu.map((sub) => {
              const isSubActive = pathname === sub.rota;
              return (
                <div
                  key={sub.nome}
                  onClick={() => {
                    router.push(sub.rota);
                    setShowMobileMenu(false);
                    setHoveredSubmenu(null);
                  }}
                  className="p-2 text-xs rounded-lg cursor-pointer transition-colors duration-200"
                  style={{
                    color: theme.menuTextColor,
                    backgroundColor: isSubActive ? theme.menuHoverColor : "transparent",
                    opacity: isSubActive ? 1 : 0.85
                  }}
                >
                  {sub.nome}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 min-h-screen flex flex-col p-4 shadow-2xl transition-all duration-300 ease-in-out md:relative md:translate-x-0 shrink-0
      ${showMobileMenu ? "translate-x-0" : "-translate-x-full"}
      ${expandido ? "w-64" : "w-20"}`}
      style={{ backgroundColor: theme.menuBackgroundColor }}
    >
      <button
        onClick={() => setShowMobileMenu(false)}
        className="md:hidden absolute top-4 right-4"
        style={{ color: theme.menuTextColor }}
      >
        <X size={24} />
      </button>

      <button
        onClick={() => setExpandido(!expandido)}
        className="absolute -right-3 top-10 bg-white border border-gray-200 p-1 rounded-full shadow-md z-50 text-gray-500 hover:text-gray-800 transition-colors hidden md:block"
      >
        {expandido ? <ChevronLeft size={16} /> : <ChevronRightIcon size={16} />}
      </button>

     <div className="mb-8 flex flex-col items-center justify-center h-18 relative group">
        {theme.logoDarkUrl ? (
          <Image
            src={theme.logoDarkUrl}
            alt={nomeEmpresa || "Logo"}
            width={120}
            height={56}
            style={{ width: "auto", height: "auto" }}
            className="object-contain max-h-14"
          />
        ) : (
          <Building2 size={32} style={{ color: theme.menuIconColor }} />
        )}
        {!expandido && (
          <div
className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-lg"            style={{
              color: theme.menuTextColor,
              backgroundColor: theme.menuHoverColor,
              border: `1px solid ${theme.menuIconColor}30`
            }}
          >
            {nomeEmpresa}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-6">
        <div>
          {expandido && (
            <p className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: theme.menuIconColor }}>
              Principal
            </p>
          )}
          {menuPrincipal.map(renderMenuItem)}
        </div>
        <div>
          {expandido && (
            <p className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: theme.menuIconColor }}>
              Cadastros
            </p>
          )}
          {menuCadastros.map(renderMenuItem)}
        </div>
      </nav>
    </aside>
  );
}