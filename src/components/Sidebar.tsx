"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, UsersRound, FileText, ImageIcon, BarChart3, Square, Package, Wrench, Boxes, Briefcase, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

type MenuItem = {
  nome: string;
  rota: string;
  icone: any;
  submenu?: { nome: string; rota: string }[];
};

const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  {
    nome: "Orçamentos",
    rota: "/orcamentos",
    icone: FileText,
    submenu: [
      { nome: "Espelhos", rota: "/espelhos" },
      { nome: "Vidros", rota: "/calculovidro" },
      { nome: "Vidros PDF", rota: "/calculovidroPDF" },
    ],
  },
  { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart3 },
];

const menuCadastros: MenuItem[] = [
  { nome: "Clientes", rota: "/clientes", icone: UsersRound },
  { nome: "Vidros", rota: "/vidros", icone: Square },
  { nome: "Perfis", rota: "/perfis", icone: Package },
  { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/kits", icone: Boxes },
  { nome: "Serviços", rota: "/servicos", icone: Briefcase },
];

interface SidebarProps {
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
  nomeEmpresa: string;
}

export default function Sidebar({ showMobileMenu, setShowMobileMenu, nomeEmpresa }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    const isActive = pathname === item.rota || item.submenu?.some(sub => pathname === sub.rota);

    return (
      <div key={item.nome} className="group mb-1 px-2">
        <div
          onClick={() => {
            if (!item.submenu) {
              router.push(item.rota);
              setShowMobileMenu(false);
            }
          }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 hover:translate-x-1"
          style={{ 
            color: theme.menuTextColor,
            // 🔥 Aplica a cor de hover ou ativo dinamicamente
            backgroundColor: isActive ? theme.menuHoverColor : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.backgroundColor = theme.menuHoverColor;
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: theme.menuIconColor }} /> 
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
          {item.submenu && (
            <ChevronRight className={`w-4 h-4 opacity-70 transition-transform duration-300 ${isActive ? 'rotate-90' : ''}`} />
          )}
        </div>
        
        {item.submenu && (
          <div className="ml-7 flex flex-col gap-1 pl-2 mt-1" style={{ borderLeft: `1px solid ${theme.menuTextColor}40` }}>
            {item.submenu.map((sub) => {
              const isSubActive = pathname === sub.rota;
              return (
                <div
                  key={sub.nome}
                  onClick={() => {
                    router.push(sub.rota);
                    setShowMobileMenu(false);
                  }}
                  className="p-2 text-xs rounded-lg cursor-pointer transition-colors duration-200"
                  style={{
                    color: theme.menuTextColor,
                    backgroundColor: isSubActive ? theme.menuHoverColor : "transparent",
                    opacity: isSubActive ? 1 : 0.7
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
      className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 
        ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} 
      style={{ backgroundColor: theme.menuBackgroundColor }}
    >
      <button 
        onClick={() => setShowMobileMenu(false)} 
        className="md:hidden absolute top-4 right-4"
        style={{ color: theme.menuTextColor }}
      >
        <X size={24} />
      </button>

      <div className="px-3 py-6 mb-6 flex justify-center">
        <Image 
          src={theme.logoDarkUrl || "/glasscode2.png"} 
          alt="Logo ERP" 
          width={200} 
          height={56} 
          className="h-12 md:h-14 object-contain" 
        />
      </div>

      <nav className="flex-1 overflow-y-auto space-y-6">
        <div>
          <p className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] mb-3 opacity-60" 
             style={{ color: theme.menuIconColor }}>
            Principal
          </p>
          {menuPrincipal.map(renderMenuItem)}
        </div>
        <div>
          <p className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] mb-3 opacity-60" 
             style={{ color: theme.menuIconColor }}>
            Cadastros
          </p>
          {menuCadastros.map(renderMenuItem)}
        </div>
      </nav>
    </aside>
  );
}