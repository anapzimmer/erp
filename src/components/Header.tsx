//app/components/Header.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ChevronDown, Settings, Palette, LogOut, TableProperties } from "lucide-react";
import Image from "next/image";
import ThemeSelect from "@/components/ThemeSelect";
import { useTheme } from "@/context/ThemeContext";
import { consultarPlataforma } from "@/lib/plataforma";

type MenuSubItem = {
  label: string;
  href: string;
};

type MenuItem = {
  label: string;
  href: string;
  submenu?: MenuSubItem[];
};

type MenuGroup = {
  group: string;
  href?: string;
  items: MenuItem[];
};

const HEADER_MENU_GROUPS: MenuGroup[] = [
  {
    group: "Dashboard",
    href: "/",
    items: [],
  },
  {
    group: "Cadastros",
    items: [
      { label: "Clientes", href: "/cadastros/clientes" },
      { label: "Vidros", href: "/cadastros/vidros" },
      { label: "Perfis", href: "/cadastros/perfis" },
      { label: "Ferragens", href: "/cadastros/ferragens" },
      { label: "Kits", href: "/cadastros/kits" },
      { label: "Serviços", href: "/cadastros/servicos" },
      { label: "Acabamentos", href: "/cadastros/acabamentos" },
    ],
  },
  {
    group: "Orçamentos",
    items: [
      { label: "Espelhos", href: "/calculo/espelhos" },
      { label: "Vidros", href: "/calculo/calculovidro" },
      { label: "Matriz de Orçamentos", href: "/matriz-projetos" },
    ],
  },
  {
    group: "Projetos",
    items: [
      { label: "Central de Impressão", href: "/central-impressao" },
      { label: "Imagens", href: "/imagens" },
    ],
  },
  {
    group: "Relatórios",
    items: [{ label: "Orçamentos", href: "/admin/relatorio.orcamento" }],
  },
];

interface HeaderProps {
  setShowMobileMenu?: (show: boolean) => void;
  nomeEmpresa: string;
  usuarioEmail: string;
  handleSignOut: () => void;
  logoUrl?: string | null;
  children?: React.ReactNode;
}

export default function Header({
  nomeEmpresa,
  usuarioEmail,
  handleSignOut,
  logoUrl,
  children,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
  theme,
  isLoading: themeLoading,
} = useTheme();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [proprietaria, setProprietaria] = useState(false);
  useEffect(() => {
    let ativo = true;
    setProprietaria(false);
    consultarPlataforma("?verificar=1").then(() => { if (ativo) setProprietaria(true); }).catch(() => {});
    return () => { ativo = false; };
  }, [usuarioEmail]);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);

  const closeMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const displayedLogo = themeLoading
  ? null
  : theme.logoUrl || logoUrl || null;

  const cancelCloseMenu = () => {
    if (closeMenuTimerRef.current) {
      clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
  };

  const scheduleCloseMenu = () => {
    cancelCloseMenu();
    closeMenuTimerRef.current = setTimeout(() => {
      setOpenDesktopGroup(null);
    }, 320);
  };

  const toggleDesktopGroup = (groupName: string) => {
    cancelCloseMenu();
    setOpenDesktopGroup((current) => (current === groupName ? null : groupName));
  };

  const isGroupRouteActive = (group: MenuGroup) => {
    if (group.href && pathname === group.href) return true;
    return group.items.some(
      (item) => pathname === item.href || Boolean(item.submenu?.some((subitem) => pathname === subitem.href))
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }

      if (desktopNavRef.current && !desktopNavRef.current.contains(event.target as Node)) {
        setOpenDesktopGroup(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (closeMenuTimerRef.current) {
        clearTimeout(closeMenuTimerRef.current);
      }
    };
  }, []);

  return (
    <header
      className="border-b py-4 px-6 sticky top-0 z-30"
      style={{
        borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 10%, transparent)`,
        backgroundColor: theme.contentTextDarkBg,
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="gc-header-main">
        <div className="gc-header-left">
          {displayedLogo ? (
            <div className="relative h-8 w-32 shrink-0">
              <Image src={displayedLogo} alt={nomeEmpresa} fill className="object-contain object-left" unoptimized />
            </div>
          ) : null}

          <div className="gc-header-nav" onMouseEnter={cancelCloseMenu} onMouseLeave={scheduleCloseMenu} ref={desktopNavRef}>
            <nav className="flex flex-wrap items-center gap-2">
              {HEADER_MENU_GROUPS.map((group) => {
                const open = openDesktopGroup === group.group;
                const routeActive = isGroupRouteActive(group);

                if (group.href) {
                  return (
                    <Link
                      key={group.group}
                      href={group.href}
                      onMouseEnter={() => {
                        cancelCloseMenu();
                        setOpenDesktopGroup(null);
                      }}
                      className="whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                      style={{
                        color: routeActive ? theme.contentTextLightBg : `color-mix(in srgb, ${theme.contentTextLightBg} 65%, transparent)`,
                        borderColor: routeActive ? `color-mix(in srgb, ${theme.menuBackgroundColor} 50%, transparent)` : `color-mix(in srgb, ${theme.contentTextLightBg} 15%, transparent)`,
                        backgroundColor: routeActive ? `color-mix(in srgb, ${theme.menuBackgroundColor} 18%, transparent)` : `color-mix(in srgb, ${theme.contentTextDarkBg} 54%, transparent)`,
                      }}
                    >
                      {group.group}
                    </Link>
                  );
                }

                return (
                  <div
                    key={group.group}
                    className="relative"
                    onMouseEnter={() => {
                      cancelCloseMenu();

                    }}
                    onMouseLeave={scheduleCloseMenu}
                  >
                    <button
                      type="button"
                      onClick={() => toggleDesktopGroup(group.group)}
                      onMouseDown={cancelCloseMenu}
                      aria-expanded={open}
                      aria-controls={`menu-${group.group}`}
                      className="whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                      style={{
                        color: open || routeActive ? theme.contentTextLightBg : `color-mix(in srgb, ${theme.contentTextLightBg} 65%, transparent)`,
                        borderColor: open || routeActive ? `color-mix(in srgb, ${theme.menuBackgroundColor} 50%, transparent)` : `color-mix(in srgb, ${theme.contentTextLightBg} 15%, transparent)`,
                        backgroundColor: open || routeActive ? `color-mix(in srgb, ${theme.menuBackgroundColor} 18%, transparent)` : `color-mix(in srgb, ${theme.contentTextDarkBg} 54%, transparent)`,
                      }}
                    >
                      <span>{group.group}</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${open ? "rotate-180" : ""}`}
                        style={{ color: open || routeActive ? theme.contentTextLightBg : `color-mix(in srgb, ${theme.contentTextLightBg} 65%, transparent)` }}
                      />
                    </button>

                    {open && (
                      <div
                        onMouseEnter={cancelCloseMenu}
                        onMouseLeave={scheduleCloseMenu}
                        id={`menu-${group.group}`}
                        className="gc-nav-dropdown absolute left-0 top-full mt-2 w-[275px] rounded-2xl border p-3 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.7)] z-50"
                        style={{
                          borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 13%, transparent)`,
                          backgroundColor: theme.contentTextDarkBg,
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                          {group.items.map((item) => {
                            const visibleLinks = item.submenu && item.submenu.length > 0 ? item.submenu : [item];

                            return visibleLinks.map((linkItem) => {
                              const active = pathname === linkItem.href;

                              return (
                                <Link
                                  key={`desktop-item-${item.href}-${linkItem.href}`}
                                  href={linkItem.href}
                                  onClick={() => setOpenDesktopGroup(null)}
                                  className="group rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300"
                                  style={{
                                    color: active ? "var(--selection-text)" : theme.contentTextLightBg,
                                    backgroundColor: active ? `color-mix(in srgb, ${theme.menuBackgroundColor} 14%, transparent)` : "transparent",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!active) {
                                      e.currentTarget.style.backgroundColor = theme.menuHoverColor;
                                      e.currentTarget.style.color = theme.menuIconColor;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!active) {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.color = theme.contentTextLightBg;
                                    }
                                  }}
                                >
                                  <span className="inline-block transition-all duration-300 group-hover:translate-x-1 group-hover:tracking-[0.01em]">
                                    {linkItem.label}
                                  </span>
                                </Link>
                              );
                            });
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {children && <div className="hidden xl:flex items-center gap-3 min-w-0 overflow-x-auto pl-2">{children}</div>}
        </div>

        <div className="gc-header-account">
          <div className="relative" ref={userMenuRef}>
            <button
              aria-label="Menu da empresa"
              aria-expanded={showUserMenu}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 pl-4 border-l"
              style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 15%, transparent)` }}
            >
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold leading-none" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 60%, transparent)` }}>
                  Empresa
                </p>
                <p className="text-xs font-semibold max-w-42.5 truncate" style={{ color: theme.contentTextLightBg }}>
                  {nomeEmpresa}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 12%, transparent)`, color: theme.contentTextLightBg }}
              >
                <Building2 size={16} />
              </div>
              <ChevronDown
                size={14}
                className={`transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}
              />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-3 w-56 rounded-xl shadow-lg border p-2 z-50"
                style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 10%, transparent)` }}
              >
                <div className="px-3 py-2 mb-1">
                  <p className="text-[10px] font-bold uppercase" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                    Logado como
                  </p>
                  <p className="text-sm font-medium truncate" style={{ color: theme.contentTextLightBg }}>
                    {usuarioEmail}
                  </p>
                </div>
                <div className="px-3 py-2"><ThemeSelect /></div>
                <hr className="my-1" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 8%, transparent)` }} />
                {proprietaria && <Link href="/plataforma" onClick={() => setShowUserMenu(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-black/5" style={{ color: theme.contentTextLightBg }}><Building2 size={16} /> Painel Glass Code</Link>}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/configuracoes");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-black/5"
                  style={{ color: theme.contentTextLightBg }}
                >
                  <Settings size={16} /> Configurações
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/configuracoes/branding");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-black/5"
                  style={{ color: theme.contentTextLightBg }}
                >
                  <Palette size={16} /> Aparência e logos
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/admin/tabelas");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-black/5"
                  style={{ color: theme.contentTextLightBg }}
                >
                  <TableProperties size={16} /> Tabelas
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowUserMenu(false);
                    await handleSignOut();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-soft rounded-lg"
                >
                  <LogOut size={16} /> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </header>
  );
}

