"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  PlusCircle, 
  Search, 
  Filter,
  ArrowRight,
  Maximize
} from "lucide-react"

// Lista de Modelos - Mantendo os mesmos dados e rotas
const modelosOrcamento = [
  {
    id: "box-frontal",
    nome: "Box Frontal",
    categoria: "Box",
    descricao: "Modelos reto de 2, 3 e 4 folhas",
    imagem: "/desenhos/box-padrao.png",
    rota: "/calculobox",
    tags: ["2 folhas", "3 folhas", "4 folhas"],
  },
  {
    id: "box-canto",
    nome: "Box de Canto",
    categoria: "Box",
    descricao: "Modelos em 'L' para cantos de banheiro",
    imagem: "/desenhos/box-canto4f.png",
    rota: "/calculobox",
    tags: ["90 graus", "Canto"],
  },
  {
    id: "espelhos",
    nome: "Espelhos",
    categoria: "Decoração",
    descricao: "Cálculo de espelhos lapidados e bisotê",
    imagem: "/desenhos/espelhos.png",
    rota: "/espelhos",
    tags: ["Lapidado", "Bisotê"],
  },
  {
    id: "vidro-comum",
    nome: "Vidro Engenharia",
    categoria: "Engenharia",
    descricao: "Janelas, Portas e Vidros Fixos",
    imagem: "/desenhos/janela-exemplo.png",
    rota: "/calculovidro",
    tags: ["Temperado", "Comum"],
  }
]

export default function SelecaoOrcamento() {
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [filtroAtivo, setFiltroAtivo] = useState("Todos")

  // Categorias para os botões
  const categoriasFiltro = ["Todos", "Box", "Engenharia", "Decoração"]

  // Lógica de Filtragem combinada (Busca + Botão)
  const modelosFiltrados = modelosOrcamento.filter(item => {
    const matchBusca = item.nome.toLowerCase().includes(busca.toLowerCase());
    const matchFiltro = filtroAtivo === "Todos" || item.categoria === filtroAtivo;
    return matchBusca && matchFiltro;
  })

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <main className="flex-1 p-8 md:p-12">
        
        {/* HEADER - Mesmo layout anterior */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#92D050] mb-2">
               <PlusCircle size={20} />
               <span className="text-xs font-bold uppercase tracking-widest">Novo Orçamento</span>
            </div>
            <h1 className="text-4xl font-black text-[#1C415B]">O que vamos calcular?</h1>
            <p className="text-gray-500 mt-2 font-medium">Selecione o modelo para iniciar o orçamento.</p>
          </div>
          
          <button 
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm w-fit"
          >
            <ArrowLeft size={18} /> Voltar
          </button>
        </header>

        {/* ÁREA DE BUSCA E FILTROS - Integrada ao layout */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Pesquisar projeto..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#92D050]/50 text-sm shadow-sm transition-all"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            {categoriasFiltro.map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroAtivo(cat)}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filtroAtivo === cat 
                  ? "bg-[#1C415B] text-white shadow-md" 
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* GRID DE MODELOS - Layout idêntico ao anterior */}
        {modelosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {modelosFiltrados.map((item) => (
              <div 
                key={item.id}
                onClick={() => router.push(item.rota)}
                className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
              >
                {/* ÁREA DA IMAGEM (Fundo Cinza) */}
                <div className="relative aspect-[4/3] bg-[#F1F5F9] flex items-center justify-center p-8 overflow-hidden">
                  <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                     <Maximize size={16} className="text-[#1C415B]" />
                  </div>
                  <img 
                    src={item.imagem} 
                    alt={item.nome}
                    className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/400x300/f1f5f9/1c415b?text=Sem+Imagem"
                    }}
                  />
                </div>

                {/* CONTEÚDO */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex gap-1 mb-3">
                    {item.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-[10px] font-bold text-gray-400 rounded-md uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#1C415B] mb-2 group-hover:text-[#92D050] transition-colors">
                    {item.nome}
                  </h3>
                  
                  <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-2">
                    {item.descricao}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[#1C415B] font-bold text-sm flex items-center gap-1">
                      Selecionar <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center group-hover:bg-[#92D050] transition-colors">
                      <PlusCircle size={20} className="text-[#92D050] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Mensagem caso não encontre nada na busca */
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#1C415B]">Nenhum projeto encontrado</h3>
            <p className="text-gray-400 mt-2">Tente ajustar sua pesquisa ou categoria.</p>
          </div>
        )}
      </main>
    </div>
  )
}