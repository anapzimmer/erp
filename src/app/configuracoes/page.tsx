"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, Users, FileText, Image as ImageIcon, BarChart3, Square, Package, Wrench, Boxes, Briefcase, DollarSign, LogOut, ChevronRight, Settings, UsersRound, TableProperties } from "lucide-react"

// --- REUTILIZANDO TIPAGENS E MENUS (Idealmente viriam de um arquivo de constantes) ---
type MenuItem = {
  nome: string
  rota: string
  icone: any
  submenu?: { nome: string; rota: string }[]
}

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
    ]
  },
  { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart3 },
]

const menuCadastros: MenuItem[] = [
  { nome: "Clientes", rota: "/clientes", icone: UsersRound },
  { nome: "Vidros", rota: "/vidros", icone: Square },
  { nome: "Perfis", rota: "/perfis", icone: Package },
  { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/kits", icone: Boxes },
  { nome: "Serviços", rota: "/servicos", icone: Briefcase },
]

// --- COMPONENTE ---
export default function ConfiguracoesPage() {
  const router = useRouter()

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone
    const isActive = item.rota === "/configuracoes" || item.rota === "/admin/tabelas" // Lógica simples de ativação

    return (
      <div key={item.nome} className="group">
        <div
          onClick={() => router.push(item.rota)}
          className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
            isActive ? "bg-[#285A7B] text-white" : "text-white/80 hover:bg-[#285A7B] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-[#92D050]" />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
          {item.submenu && <ChevronRight className="w-4 h-4 opacity-50" />}
        </div>
        {item.submenu && (
          <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-[#285A7B]">
            {item.submenu.map((sub) => (
              <div key={sub.nome} onClick={() => router.push(sub.rota)} className="p-2 pl-4 text-xs text-gray-400 hover:text-[#92D050] hover:bg-[#285A7B]/30 cursor-pointer rounded-r-lg transition-all">
                {sub.nome}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* MENU LATERAL (Idêntico ao Dashboard) */}
      <aside className="w-64 bg-[#1C415B] text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-[#285A7B]">
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <div className="w-2 h-8 bg-[#92D050] rounded-full"></div>
            VIDRAÇARIA
          </h2>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Principal</p>
            {menuPrincipal.map(renderMenuItem)}
          </div>
          <div>
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Cadastros</p>
            {menuCadastros.map(renderMenuItem)}
          </div>
        </nav>
        
        {/* Rodapé fixo */}
        <div className="p-4 bg-[#163449]">
            <button 
                onClick={() => router.push("/")}
                className="flex items-center gap-2 w-full text-white/80 hover:text-white font-medium p-3 rounded-xl hover:bg-[#285A7B] transition-all"
            >
                <LayoutDashboard size={18} className="text-[#92D050]" />
                Voltar ao Dashboard
            </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL (Específico de Configurações) */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-[#1C415B]">Configurações</h1>
          <p className="text-gray-500 mt-2 font-medium">Gerencie as regras e preços do sistema.</p>
        </header>

        {/* ÁREA DE CONFIGURAÇÃO - TABELA */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-[#F1F8E9]">
                <TableProperties className="w-8 h-8 text-[#92D050]" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-[#1C415B]">Tabelas de Preço</h2>
                <p className="text-sm text-gray-500">Gerencie tabelas de vidro, ferragens e perfis.</p>
            </div>
          </div>
          
          <button 
            onClick={() => router.push("/admin/tabelas")}
            className="flex items-center gap-2 bg-[#1C415B] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#285A7B] transition-all"
          >
            Acessar Tabelas
          </button>
        </div>
      </main>
    </div>
  )
}