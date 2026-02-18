//src/components/Sidebar.tsx
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

  // --- Renderização do Menu (Padronizado igual ao Sidebar.tsx) ---
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;

    // 🔥 Lógica de item ativo
    const isActive = window.location.pathname === item.rota || item.submenu?.some(sub => window.location.pathname === sub.rota);

    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => {
            router.push(item.rota);
            setShowMobileMenu(false);
          }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
          style={{
            // 🔥 Define fundo se ativo
            backgroundColor: isActive ? theme.menuHoverColor : "transparent",
            // 🔥 Define a cor do texto de forma fixa (não muda no hover)
            color: theme.menuTextColor,
          }}
          onMouseEnter={(e) => {
            // 🔥 Apenas muda o fundo no hover, nunca a cor do texto
            if (!isActive) e.currentTarget.style.backgroundColor = `${theme.menuTextColor}10`;
          }}
          onMouseLeave={(e) => {
            // 🔥 Restaura fundo se não ativo
            if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div className="flex items-center gap-3">
            {/* Ícone usa a cor definida no tema */}
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
              const isSubActive = window.location.pathname === sub.rota;
              return (
                <div
                  key={sub.nome}
                  onClick={() => {
                    router.push(sub.rota);
                    setShowMobileMenu(false);
                  }}
                  className="p-2 text-xs rounded-lg cursor-pointer"
                  style={{
                    // 🔥 Cor do texto do submenu fixa
                    color: theme.menuTextColor,
                    backgroundColor: isSubActive ? theme.menuHoverColor : "transparent",
                    opacity: isSubActive ? 1 : 0.8
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
      style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
    >
      <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4" style={{ color: theme.menuTextColor }}>
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