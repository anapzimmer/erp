"use client"

import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  Image as ImageIcon,
  BarChart,
  Square,
  Package,
  Wrench,
  Boxes,
  Briefcase,
  DollarSign,
  Layers,
  LogOut,
  ChevronRight,
  Settings // Novo ícone para Cadastros
} from "lucide-react"

// MENU ORGANIZADO POR CATEGORIAS
const menuPrincipal = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  { nome: "Clientes", rota: "/clientes", icone: Users },
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
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart },
]

const menuCadastros = [
  { nome: "Vidros", rota: "/vidros", icone: Square },
  { nome: "Perfis", rota: "/perfis", icone: Package },
  { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/kits", icone: Boxes },
  { nome: "Serviços", rota: "/servicos", icone: Briefcase },
]

const cards = [
  { titulo: "Total de Clientes", valor: 1, descricao: "Clientes cadastrados", icone: Users },
  { titulo: "Total de Orçamentos", valor: 0, descricao: "Orçamentos criados", icone: FileText },
  { titulo: "Orçamentos em Aberto", valor: 0, descricao: "Aguardando aprovação", icone: DollarSign },
  { titulo: "Imagens Processadas", valor: 0, descricao: "Imagens no sistema", icone: ImageIcon },
  { titulo: "Projetos Cadastrados", valor: 0, descricao: "Projetos disponíveis", icone: Briefcase },
]

export default function Dashboard() {
  const router = useRouter()

  // Função auxiliar para renderizar itens de menu
  const renderMenuItem = (item: any) => {
    const Icon = item.icone
    return (
      <div key={item.nome} className="group">
        <div
          onClick={() => router.push(item.rota)}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-[#285A7B] transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-[#92D050]" />
            <span className="font-medium text-sm text-white/90">{item.nome}</span>
          </div>
          {item.submenu && <ChevronRight className="w-4 h-4 opacity-30 text-white" />}
        </div>

        {item.submenu && (
          <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-[#285A7B]">
            {item.submenu.map((sub: any) => (
              <div
                key={sub.nome}
                onClick={() => router.push(sub.rota)}
                className="p-2 pl-4 text-xs text-gray-400 hover:text-[#92D050] hover:bg-[#285A7B]/30 cursor-pointer rounded-r-lg transition-all"
              >
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
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#1C415B] text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-[#285A7B]">
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <div className="w-2 h-8 bg-[#92D050] rounded-full"></div>
            VIDRAÇARIA
          </h2>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
          {/* Seção Principal */}
          <div>
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Principal</p>
            {menuPrincipal.map(renderMenuItem)}
          </div>

          {/* Seção de Cadastros - AGRUPADA */}
          <div>
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Cadastros</p>
            {menuCadastros.map(renderMenuItem)}
          </div>
        </nav>

        <div className="p-4 bg-[#163449]">
          <button 
            onClick={() => alert("Saindo...")}
            className="flex items-center justify-center gap-2 w-full bg-[#92D050] text-[#1C415B] font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform active:scale-95 shadow-lg"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-[#1C415B]">Dashboard</h1>
          <p className="text-gray-500 mt-2 font-medium">Gestão e controle de orçamentos.</p>
        </header>

        {/* GRID DE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {cards.map((card) => {
            const Icon = card.icone
            return (
              <div
                key={card.titulo}
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl inline-block bg-[#F1F8E9]">
                      <Icon className="w-8 h-8 text-[#92D050]" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-[#1C415B] tracking-tight">{card.valor}</h2>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">{card.titulo}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-50">
                   <p className="text-sm text-gray-500 font-medium">{card.descricao}</p>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}