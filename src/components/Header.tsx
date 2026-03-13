"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Building2, ChevronDown, Settings, Palette, LogOut } from "lucide-react";
import Image from "next/image"; // Importado para performance
import { useTheme } from "@/context/ThemeContext";

interface HeaderProps {
  setShowMobileMenu?: (show: boolean) => void;
  nomeEmpresa: string;
  usuarioEmail: string;
  handleSignOut: () => void;
  logoUrl?: string | null;
  children?: React.ReactNode;
}

export default function Header({
  setShowMobileMenu,
  nomeEmpresa,
  usuarioEmail,
  handleSignOut,
  logoUrl,
  children
}: HeaderProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const displayedLogo = logoUrl ?? theme.logoLightUrl;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="border-b py-4 px-6 flex items-center justify-between sticky top-0 z-30"
      style={{
        borderColor: `${theme.contentTextLightBg}1A`,
        backgroundColor: `${theme.contentTextDarkBg}F2`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-4">
        <button onClick={() => setShowMobileMenu?.(true)} className="md:hidden p-2 rounded-lg hover:bg-black/5">
          <Menu size={20} style={{ color: theme.contentTextLightBg }} />
        </button>
        
        {displayedLogo ? (
          <div className="relative h-8 w-32">
            <Image 
              src={displayedLogo}
              alt={nomeEmpresa}
              fill
              className="object-contain object-left"
              unoptimized
            />
          </div>
        ) : null}
        
        {children}
      </div>

      <div className="flex items-center">
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-4 border-l"
            style={{ borderColor: `${theme.contentTextLightBg}26` }}
          >
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold leading-none" style={{ color: `${theme.contentTextLightBg}99` }}>Empresa</p>
              <p className="text-xs font-semibold max-w-42.5 truncate" style={{ color: theme.contentTextLightBg }}>{nomeEmpresa}</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${theme.menuIconColor}1F`, color: theme.contentTextLightBg }}>
              <Building2 size={16} />
            </div>
            <ChevronDown size={14} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} style={{ color: `${theme.contentTextLightBg}80` }} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-56 rounded-xl shadow-lg border p-2 z-50" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}1A` }}>
              <div className="px-3 py-2 mb-1">
                <p className="text-[10px] font-bold uppercase" style={{ color: `${theme.contentTextLightBg}80` }}>Logado como</p>
                <p className="text-sm font-medium truncate" style={{ color: theme.contentTextLightBg }}>{usuarioEmail}</p>
              </div>
              <hr className="my-1" style={{ borderColor: `${theme.contentTextLightBg}14` }} />
              <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-black/5" style={{ color: theme.contentTextLightBg }}>
                <Settings size={16} /> Configurações
              </button>
              <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes/branding"); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-black/5" style={{ color: theme.contentTextLightBg }}>
                <Palette size={16} /> Identidade Visual
              </button>
              <button 
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  setShowUserMenu(false); 
                  await handleSignOut(); 
                }} 
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}