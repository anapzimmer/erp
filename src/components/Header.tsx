"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, Building2, ChevronDown, Settings, LogOut } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface HeaderProps {
  setShowMobileMenu: (show: boolean) => void;
  nomeEmpresa: string;
  usuarioEmail: string;
  handleSignOut: () => void;
}

export default function Header({ setShowMobileMenu, nomeEmpresa, usuarioEmail, handleSignOut }: HeaderProps) {
  const router = useRouter();
  const { theme } = useTheme(); // 🔥 Consumindo o tema para cores
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm bg-white">
      <div className="flex items-center gap-2 md:gap-4">
        <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
          <Menu size={24} className="text-gray-600" />
        </button>

        <div className="flex items-center gap-4 bg-gray-100 px-3 py-2 rounded-full w-full md:w-96 border border-gray-200 focus-within:ring-2 focus-within:ring-[#39B89F]/30">
          <Search className="text-gray-400" size={18} />
          <input type="search" placeholder="Buscar..." className="w-full text-sm bg-transparent outline-none" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-200 hover:opacity-75 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
              <Building2 size={16} />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-400">Logado como</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{usuarioEmail}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push("/configuracoes");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                <Settings size={18} className="text-gray-400" />
                Configurações
              </button>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl"
              >
                <LogOut size={18} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}