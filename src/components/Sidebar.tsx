"use client";

import { useEffect, useRef, useState } from "react";
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

type MenuItem = {
  nome: string;
  rota: string;
  icone: LucideIcon;
  submenu?: { nome: string; rota: string }[];
};

type SubmenuPreset = "discreto" | "destacado";

const SUBMENU_PRESET_STYLES: Record<SubmenuPreset, {
  activeBgAlpha: string;
  hoverBgAlpha: string;
  floatingBgAlpha: string;
  floatingBorderAlpha: string;
  mutedBulletAlpha: string;
  activeRingAlpha: string;
  itemOpacity: number;
  floatingBlur: string;
}> = {
  discreto: {
    activeBgAlpha: "12",
    hoverBgAlpha: "0D",
    floatingBgAlpha: "F5",
    floatingBorderAlpha: "2B",
    mutedBulletAlpha: "66",
    activeRingAlpha: "00",
    itemOpacity: 0.9,
    floatingBlur: "6px",
  },
  destacado: {
    activeBgAlpha: "2B",
    hoverBgAlpha: "22",
    floatingBgAlpha: "FA",
    floatingBorderAlpha: "73",
    mutedBulletAlpha: "8F",
    activeRingAlpha: "00",
    itemOpacity: 1,
    floatingBlur: "8px",
  },
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
      { nome: "Sacada Frontal", rota: "/calculo/sacadafrontal" },
      { nome: "Pele de Vidro", rota: "/calculo/peledevidro" },
    ],
  },
  {
    nome: "Projetos",
    rota: "/projetos",
    icone: Building2,
    submenu: [
      { nome: "Cadastro de Projetos", rota: "/projetos" },
      { nome: "Calcular Projeto", rota: "/calculoprojeto" },
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
  expandido: boolean;
  setExpandido: (expandido: boolean) => void;
}

const alphaHex = (hexColor: string, alpha: string) => {
  const normalized = hexColor.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${alpha}`;
  }
  return hexColor;
};

export default function Sidebar({
  showMobileMenu,
  setShowMobileMenu,
  nomeEmpresa,
  expandido,
  setExpandido
}: SidebarProps) {

  const SIDEBAR_EXPANDED_STORAGE_KEY = "sidebar:expandido";

  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
  const closeSubmenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstPersist = useRef(true);

  // Altere para "destacado" se quiser um visual com mais contraste.
  const submenuPreset: SubmenuPreset = "discreto";
  const submenuPresetConfig = SUBMENU_PRESET_STYLES[submenuPreset];

  // Estilos do menu baseados no tema
  const variantStyles = {
    itemActiveBg: alphaHex(theme.menuIconColor, "1A"),
    itemActiveBorder: alphaHex(theme.menuIconColor, "4D"),
    itemActiveShadow: `inset 0 0 8px ${alphaHex(theme.menuIconColor, "1A")}`,
    marker: true,
    submenuActiveBg: alphaHex(theme.menuIconColor, submenuPresetConfig.activeBgAlpha),
    submenuHoverBg: alphaHex(theme.menuIconColor, submenuPresetConfig.hoverBgAlpha),
    submenuFloatingBg: theme.screenBackgroundColor,
    submenuFloatingBorder: alphaHex(theme.menuIconColor, submenuPresetConfig.floatingBorderAlpha),
    submenuMutedBullet: alphaHex(theme.menuTextColor, submenuPresetConfig.mutedBulletAlpha),
    submenuFloatingText: theme.contentTextLightBg,
    submenuFloatingMutedBullet: alphaHex(theme.contentTextLightBg, submenuPresetConfig.mutedBulletAlpha),
    submenuActiveRing: alphaHex(theme.menuIconColor, submenuPresetConfig.activeRingAlpha),
    submenuItemOpacity: submenuPresetConfig.itemOpacity,
    submenuFloatingBlur: submenuPresetConfig.floatingBlur,
    asideBackground: theme.menuBackgroundColor,
    asideBorder: alphaHex(theme.menuBackgroundColor, "4D"),
    overlayBackground: "transparent",
    sectionPrincipalBg: alphaHex(theme.menuBackgroundColor, "33"),
    sectionCadastroBg: alphaHex(theme.menuBackgroundColor, "33"),
    sectionBorder: alphaHex(theme.menuBackgroundColor, "59"),
    footerText: theme.menuTextColor,
    footerBg: alphaHex(theme.menuBackgroundColor, "4D"),
    footerBorder: alphaHex(theme.menuBackgroundColor, "7A")
  };

  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);

      if (savedState === "true" || savedState === "false") {
        setExpandido(savedState === "true");
      }
    } catch {
      // Ignora falhas de acesso ao storage para não quebrar render.
    }
  }, [setExpandido]);

  useEffect(() => {
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }

    try {
      window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(expandido));
    } catch {
      // Ignora falhas de acesso ao storage para não quebrar render.
    }
  }, [expandido]);

  useEffect(() => {
    return () => {
      if (closeSubmenuTimerRef.current) {
        clearTimeout(closeSubmenuTimerRef.current);
      }
    };
  }, []);

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    const isActive = pathname === item.rota || item.submenu?.some((sub) => pathname === sub.rota);
    const isSubmenuOpen = hoveredSubmenu === item.nome || (isActive && expandido);
    const isSubmenuVisibleCollapsed = hoveredSubmenu === item.nome;

    return (
      <div
  key={item.nome}
  className="group mb-1.5 px-2 relative"
  onMouseEnter={() => {
    if (closeSubmenuTimerRef.current) {
      clearTimeout(closeSubmenuTimerRef.current);
      closeSubmenuTimerRef.current = null;
    }
    setHoveredSubmenu(item.nome);
  }}
  onMouseLeave={() => {
    if (!expandido) {
      closeSubmenuTimerRef.current = setTimeout(() => {
        setHoveredSubmenu(null);
      }, 150);
      return;
    }
    setHoveredSubmenu(null);
  }}
>
      <div
    onClick={() => {
      router.push(item.rota);
      setShowMobileMenu(false);
    }}
    title={!expandido ? item.nome : undefined}
    className={`relative flex items-center ${
      expandido ? "justify-between" : "justify-center"
    } px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300 hover:translate-x-0.5`}
    style={{
      color: theme.menuTextColor,
      backgroundColor: isActive ? variantStyles.itemActiveBg : "transparent",
      border: `1px solid ${isActive ? variantStyles.itemActiveBorder : "transparent"}`,
      boxShadow: isActive ? variantStyles.itemActiveShadow : "none",
    }}
  >
    {isActive && variantStyles.marker && (
      <span
        className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full"
        style={{
          width: "3px",
          backgroundColor: theme.menuIconColor,
          boxShadow: `0 0 14px ${alphaHex(theme.menuIconColor, "B3")}`
        }}
      />
    )}

    <div className={`flex items-center ${expandido ? "gap-3" : ""}`}>
      <Icon
        className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? "scale-105" : ""}`}
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


   {!expandido && !item.submenu && (
  <div
    className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-lg z-[130]"
    style={{
      backgroundColor: theme.menuHoverColor,
      color: theme.menuTextColor,
      border: `1px solid ${theme.menuIconColor}30`,
    }}
  >
    {item.nome}
  </div>
)}

        {item.submenu && !expandido && (
          <div
            className={`absolute left-full top-0 min-w-60 rounded-2xl p-2.5 shadow-md z-[140] translate-x-2 transition-all duration-200 ${
              isSubmenuVisibleCollapsed
                ? "opacity-100 pointer-events-auto translate-x-0"
                : "opacity-0 pointer-events-none"
            }`}
            style={{
              backgroundColor: variantStyles.submenuFloatingBg,
              border: `1px solid ${variantStyles.submenuFloatingBorder}`,
              backdropFilter: `blur(${variantStyles.submenuFloatingBlur})`,
            }}
            onMouseEnter={() => {
              if (closeSubmenuTimerRef.current) {
                clearTimeout(closeSubmenuTimerRef.current);
                closeSubmenuTimerRef.current = null;
              }
              setHoveredSubmenu(item.nome);
            }}
            onMouseLeave={() => {
              closeSubmenuTimerRef.current = setTimeout(() => {
                setHoveredSubmenu(null);
              }, 150);
            }}
          >
            <p
              className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: alphaHex(variantStyles.submenuFloatingText, "A3") }}
            >
              {item.nome}
            </p>
            <div className="mt-1 flex flex-col gap-1.5">
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
                    className="group/sub flex items-center gap-2 px-2.5 py-2.5 text-xs rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      color: variantStyles.submenuFloatingText,
                      backgroundColor: isSubActive ? variantStyles.submenuActiveBg : "transparent",
                      opacity: isSubActive ? 1 : variantStyles.submenuItemOpacity,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubActive) {
                        e.currentTarget.style.backgroundColor = variantStyles.submenuHoverBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isSubActive ? variantStyles.submenuActiveBg : "transparent";
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSubActive ? theme.menuIconColor : variantStyles.submenuFloatingMutedBullet }}
                    />
                    <span className="truncate font-medium tracking-[0.01em]">{sub.nome}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {item.submenu && expandido && (
          <div
            className={`ml-7 flex flex-col gap-1.5 pl-3 overflow-hidden transition-all duration-300 ease-in-out ${isSubmenuOpen ? "max-h-96 opacity-100 mt-1.5" : "max-h-0 opacity-0"}`}
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
                  className="group/sub flex items-center gap-2 px-2.5 py-2 text-xs rounded-xl cursor-pointer transition-all duration-200"
                  style={{
                    color: theme.menuTextColor,
                    backgroundColor: isSubActive ? variantStyles.submenuActiveBg : "transparent",
                    opacity: isSubActive ? 1 : 0.92,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubActive) {
                      e.currentTarget.style.backgroundColor = variantStyles.submenuHoverBg;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSubActive ? variantStyles.submenuActiveBg : "transparent";
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isSubActive ? theme.menuIconColor : variantStyles.submenuMutedBullet }}
                  />
                  <span className="truncate font-medium tracking-[0.01em]">{sub.nome}</span>
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
      className={`fixed inset-y-0 left-0 z-[120] min-h-screen flex flex-col p-4 shadow-2xl transition-all duration-300 ease-in-out md:relative md:z-[120] md:translate-x-0 shrink-0 ${expandido ? "overflow-hidden" : "overflow-visible"}
      ${showMobileMenu ? "translate-x-0" : "-translate-x-full"}
      ${expandido ? "w-64" : "w-20"}`}
      aria-label={`Menu lateral - ${nomeEmpresa}`}
      style={{ background: variantStyles.asideBackground, borderRight: `1px solid ${variantStyles.asideBorder}` }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: variantStyles.overlayBackground }}
      />

      <button
        onClick={() => setShowMobileMenu(false)}
        className="md:hidden absolute top-4 right-4 z-20"
        style={{ color: theme.menuTextColor }}
      >
        <X size={24} />
      </button>

      <button
        onClick={() => setExpandido(!expandido)}
        className="absolute -right-3 top-10 p-1 rounded-full shadow-md z-[130] hidden md:block transition-colors"
        style={{
          backgroundColor: "#FFFFFF",
          border: `1px solid ${alphaHex(theme.menuIconColor, "59")}`,
          color: "#475569"
        }}
      >
        {expandido ? <ChevronLeft size={16} /> : <ChevronRightIcon size={16} />}
      </button>

      <nav className={`relative flex-1 ${expandido ? "overflow-y-auto overflow-x-hidden" : "overflow-visible"} space-y-5 z-[125] scrollbar-erp pr-1`}>
        <div
          className="rounded-2xl p-2.5"
          style={{
            backgroundColor: variantStyles.sectionPrincipalBg,
            border: `1px solid ${variantStyles.sectionBorder}`
          }}
        >
          {expandido && (
            <p className="px-4 text-[10px] font-bold uppercase tracking-[0.18em] mb-2.5" style={{ color: alphaHex(theme.menuTextColor, "B8") }}>
              Principal
            </p>
          )}
          {menuPrincipal.map(renderMenuItem)}
        </div>
        <div
          className="rounded-2xl p-2.5"
          style={{
            backgroundColor: variantStyles.sectionCadastroBg,
            border: `1px solid ${variantStyles.sectionBorder}`
          }}
        >
          {expandido && (
            <p className="px-4 text-[10px] font-bold uppercase tracking-[0.18em] mb-2.5" style={{ color: alphaHex(theme.menuTextColor, "B8") }}>
              Cadastros
            </p>
          )}
          {menuCadastros.map(renderMenuItem)}
        </div>
      </nav>

    </aside>
  );
}