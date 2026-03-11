//app/header.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Building2, ChevronDown, Settings, LogOut } from "lucide-react";


interface HeaderProps {
  setShowMobileMenu?: (show: boolean) => void;
  nomeEmpresa: string;
  usuarioEmail: string;
  handleSignOut: () => void;
  logoUrl?: string | null;
  children?: React.ReactNode
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
   // Substitua o className da <header> por este:
<header className="border-b border-slate-200 bg-white/80 backdrop-blur-md py-4 px-6 flex items-center justify-between sticky top-0 z-30">
  <div className="flex items-center gap-4">
    <button onClick={() => setShowMobileMenu?.(true)} className="md:hidden p-2 rounded-lg hover:bg-slate-100">
      <Menu size={20} className="text-slate-600" />
    </button>
    {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />}
    {children}
  </div>

  <div className="flex items-center">
    <div className="relative" ref={userMenuRef}>
      <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 pl-4 border-l border-slate-200">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
          <Building2 size={16} />
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
      </button>

      {/* Menu suspenso mais elegante */}
      {showUserMenu && (
        <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-50">
          <div className="px-3 py-2 mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Logado como</p>
            <p className="text-sm font-medium text-slate-800 truncate">{usuarioEmail}</p>
          </div>
          <hr className="border-slate-100 my-1" />
          <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">
            <Settings size={16} /> Configurações
          </button>
          <button onClick={async (e) => { e.stopPropagation(); setShowUserMenu(false); await handleSignOut(); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  </div>
</header>
  );
}