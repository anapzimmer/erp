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
    
    // 🔥 CORREÇÃO: Verificar se o item ou algum submenu está ativo
    const isActive = pathname === item.rota || item.submenu?.some(sub => pathname === sub.rota);

    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => {
            router.push(item.rota);
            setShowMobileMenu(false);
          }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
          style={{
            // 🔥 CORREÇÃO: Usando a cor do ícone com transparência para o fundo ativo
            backgroundColor: isActive ? `${theme.menuIconColor}33` : "transparent",
            color: theme.menuTextColor,
          }}
          onMouseEnter={(e) => {
            // 🔥 CORREÇÃO: Efeito hover usando a cor do ícone
            if (!isActive) e.currentTarget.style.backgroundColor = `${theme.menuIconColor}15`;
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
            <ChevronRight className="w-4 h-4" style={{ color: theme.menuTextColor, opacity: 0.7 }} />
          )}
        </div>

        {item.submenu && (
          <div className="ml-7 flex flex-col gap-1 pl-2" style={{ borderLeft: `1px solid ${theme.menuTextColor}40` }}>
            {item.submenu.map((sub) => {
              const isSubActive = pathname === sub.rota;
              return (
                <div
                  key={sub.nome}
                  onClick={() => {
                    router.push(sub.rota);
                    setShowMobileMenu(false);
                  }}
                  className="p-2 text-xs rounded-lg cursor-pointer"
                  style={{
                    color: theme.menuTextColor,
                    // 🔥 CORREÇÃO: Fundo ativo do submenu
                    backgroundColor: isSubActive ? `${theme.menuIconColor}33` : "transparent",
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
      className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? "translate-x-0" : "-translate-x-full"}`}
      style={{ backgroundColor: theme.menuBackgroundColor }}
    >
      <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50">
        <X size={24} />
      </button>

      <div className="px-3 py-4 mb-4 flex justify-center">
        <Image
          src={theme.logoDarkUrl || "/glasscode2.png"}
          alt="Logo Empresa"
          width={200}
          height={56}
          className="h-12 md:h-14 object-contain"
        />
      </div>

      <nav className="flex-1 overflow-y-auto space-y-6">
        <div>
          <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.menuIconColor }}>
            Principal
          </p>
          {menuPrincipal.map(renderMenuItem)}
        </div>
        <div>
          <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.menuIconColor }}>
            Cadastros
          </p>
          {menuCadastros.map(renderMenuItem)}
        </div>
      </nav>
    </aside>
  );
}