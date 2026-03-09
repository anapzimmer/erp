"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FileText, UsersRound, Briefcase, DollarSign } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function Dashboard() {
  const { theme } = useTheme();
  const { user, nomeEmpresa, loading, signOut } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 1. Tela de Carregamento Única e Elegante
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" 
             style={{ borderColor: theme.menuBackgroundColor, borderTopColor: 'transparent' }}>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Configuração dos Cards com as cores do seu tema
  const stats = [
    { titulo: "Clientes Ativos", valor: "24", icone: UsersRound, color: theme.menuIconColor, bg: `${theme.menuIconColor}15` },
    { titulo: "Orçamentos", valor: "12", icone: FileText, color: "#4FA2D9", bg: "#4FA2D915" },
    { titulo: "Projetos", valor: "5", icone: Briefcase, color: "#92D050", bg: "#92D05015" },
    { titulo: "Faturamento", valor: "R$ 15.2k", icone: DollarSign, color: "#F59E0B", bg: "#F59E0B15" },
  ];

  return (
    <div className="flex min-h-screen transition-colors duration-500" style={{ backgroundColor: theme.screenBackgroundColor }}>
      
      <Sidebar 
        showMobileMenu={showMobileMenu} 
        setShowMobileMenu={setShowMobileMenu} 
        nomeEmpresa={nomeEmpresa} 
      />

      {/* Overlay para Mobile */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>
      )}

      <div className="flex-1 flex flex-col w-full">
        <Header 
            setShowMobileMenu={setShowMobileMenu}
            nomeEmpresa={nomeEmpresa}
            usuarioEmail={user.email} 
            handleSignOut={signOut}
        />
        
        <main className="p-6 md:p-10 flex-1">
          {/* Título e Boas-vindas */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: theme.contentTextLightBg }}>
              Dashboard
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              Bem-vindo à gestão da <span className="font-bold" style={{ color: theme.menuIconColor }}>{nomeEmpresa}</span>.
            </p>
          </div>

          {/* Grid de Stats - Onde a mágica acontece */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
            {stats.map((stat) => {
              const Icon = stat.icone;
              return (
                <div
                  key={stat.titulo}
                  className="group relative overflow-hidden p-7 rounded-[2rem] border border-gray-100/50 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 cursor-pointer"
                  style={{ backgroundColor: theme.modalBackgroundColor }}
                >
                  {/* Efeito de Brilho (Glow) ao passar o mouse */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${stat.color}10 0%, transparent 100%)` }}
                  />

                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: theme.modalTextColor }}>
                        {stat.titulo}
                      </span>
                      <span className="text-4xl font-black tracking-tighter" style={{ color: theme.modalTextColor }}>
                        {stat.valor}
                      </span>
                    </div>
                    
                    {/* Ícone com Background Suave */}
                    <div className="p-4 rounded-2xl transition-transform duration-500 group-hover:scale-110" style={{ backgroundColor: stat.bg }}>
                      <Icon size={28} style={{ color: stat.color }} />
                    </div>
                  </div>

                  {/* Detalhe Visual: Barra de Progresso/Decoração inferior */}
                  <div className="relative h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out w-1/3 group-hover:w-full"
                      style={{ backgroundColor: stat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}