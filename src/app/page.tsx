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
} from "lucide-react"

// MENU lateral
const menu = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  { nome: "Clientes", rota: "/clientes", icone: Users },
  { 
    nome: "Orçamentos", 
    rota: "/orcamentos", 
    icone: FileText,
    submenu: [
      { nome: "Espelhos", rota: "/espelhos", icone: Layers },
      { nome: "Vidros", rota: "/calculovidro", icone: Layers },
      { nome: "Vidros PDF", rota: "/calculovidroPDF", icone: Layers }, // submenu com ícone
      // outros submenus podem ser adicionados aqui
    ]
  },
  { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart },
  { nome: "Vidros", rota: "/vidros", icone: Square },
  { nome: "Perfis", rota: "/perfis", icone: Package },
  { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/kits", icone: Boxes },
  { nome: "Serviços", rota: "/servicos", icone: Briefcase },
]

// CARDS do Dashboard
const cards = [
  {
    titulo: "Total de Clientes",
    valor: 1,
    descricao: "Clientes cadastrados",
    icone: Users,
  },
  {
    titulo: "Total de Orçamentos",
    valor: 0,
    descricao: "Orçamentos criados",
    icone: FileText,
  },
  {
    titulo: "Orçamentos em Aberto",
    valor: 0,
    descricao: "Aguardando aprovação",
    icone: DollarSign,
  },
  {
    titulo: "Imagens Processadas",
    valor: 0,
    descricao: "Imagens no sistema",
    icone: ImageIcon,
  },
  {
    titulo: "Projetos Cadastrados",
    valor: 0,
    descricao: "Projetos disponíveis",
    icone: Briefcase,
  },
]

// BOTÃO PADRÃO
function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#92D050] text-[#1C415B] font-semibold py-2 rounded-lg hover:opacity-90 transition"
    >
      {children}
    </button>
  )
}

export default function Dashboard() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#1C415B] text-white flex flex-col">
        <h2 className="text-xl font-bold p-6">Sistema Vidraçaria</h2>
        <nav className="flex-1 px-2">
          {menu.map((item) => {
  const Icon = item.icone
  return (
    <div key={item.nome}>
      <div
        onClick={() => router.push(item.rota)}
        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-[#285A7B] transition"
      >
        <Icon className="w-5 h-5 text-white" />
        <span>{item.nome}</span>
      </div>

      {/* Submenu */}
      {item.submenu && (
        <div className="ml-8 flex flex-col gap-1">
          {item.submenu.map(sub => {
            const SubIcon = sub.icone
            return (
              <div
                key={sub.nome}
                onClick={() => router.push(sub.rota)}
                className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-[#285A7B] transition"
              >
                {SubIcon && <SubIcon className="w-4 h-4 text-white" />}
                <span className="text-sm">{sub.nome}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})}

        </nav>
        <div className="p-4 border-t border-gray-600">
          <Button onClick={() => alert("Saindo...")}>Sair</Button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <p className="text-gray-600 mb-8">Visão geral do sistema de orçamentos</p>

        {/* GRID DE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icone
            return (
              <div
                key={card.titulo}
                className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-[#E6F4F1]">
                    <Icon className="w-6 h-6 text-[#92D050]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#1C415B]">
                      {card.valor}
                    </h2>
                    <p className="text-gray-600">{card.titulo}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">{card.descricao}</p>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}