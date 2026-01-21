"use client"
// O useRouter do next/navigation não é suportado neste ambiente.
// Substituindo por navegação nativa via window.location.href.
import { 
  Square, 
  Columns2, 
  Columns4, 
  DoorClosed, 
  LayoutTemplate,
  Maximize2,
  ArrowRight
} from "lucide-react"

// --- TEMA E CONFIGURAÇÕES REPLICADAS DO ORÇAMENTO ---
const theme = {
    // Cor Primária (Dark Blue)
    primary: "#1C415B",
    // Cor Secundária/Destaque (Cítrico Green)
    secondary: "#92D050",
    text: "#1C415B",
    background: "#FFFFFF",
    border: "#F2F2F2",
}

// Definição dos modelos padrão de vidraçaria
const categoriasProjetos = [
  {
    id: "box-2-folhas",
    nome: "Box Frontal (2 Folhas)",
    descricao: "1 Fixo e 1 Correr - Padrão de banheiro",
    icone: Columns2,
    cor: "bg-blue-500",
    slug: "box-2-folhas"
  },
  {
    id: "box-canto",
    nome: "Box de Canto (L)",
    descricao: "2 Fixos e 2 Correr em ângulo de 90°",
    icone: Square,
    cor: "bg-cyan-500",
    slug: "box-canto"
  },
  {
    id: "janela-2-folhas",
    nome: "Janela (2 Folhas)",
    descricao: "Janela de correr - 1 Fixo e 1 Móvel",
    icone: Columns2,
    cor: "bg-emerald-500",
    slug: "janela-2-folhas"
  },
  {
    id: "janela-4-folhas",
    nome: "Janela (4 Folhas)",
    descricao: "2 Fixos laterais e 2 Móveis centrais",
    icone: Columns4,
    cor: "bg-teal-500",
    slug: "janela-4-folhas"
  },
  {
    id: "porta-2-folhas",
    nome: "Porta (2 Folhas)",
    descricao: "Porta de correr ou abrir - Social",
    icone: DoorClosed,
    cor: "bg-indigo-500",
    slug: "porta-2-folhas"
  },
  {
    id: "porta-4-folhas",
    nome: "Porta (4 Folhas)",
    descricao: "Grande vão - 2 Fixos e 2 Móveis",
    icone: LayoutTemplate,
    cor: "bg-violet-500",
    slug: "porta-4-folhas"
  }
]

export default function Projetos() {

  const handleSelecao = (slug: string) => {
    // Redireciona para a página de cálculo passando o modelo via query string
    // Usando navegação nativa do navegador para simular o roteador
    if (typeof window !== 'undefined') {
        // Redireciona para o novo nome da página de cálculo
        window.location.href = `/orcamentos/calculobox2folhasfrontal?modelo=${slug}`
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-10">
        <h1 className="text-3xl font-bold" style={{ color: theme.primary }}>
            Projetos e Modelos
        </h1>
        <p className="text-gray-600 mt-2">
            Selecione um modelo padrão de esquadria ou box para iniciar um novo cálculo.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {categoriasProjetos.map((projeto) => {
          const Icon = projeto.icone
          return (
            <div 
              key={projeto.id}
              onClick={() => handleSelecao(projeto.slug)}
              // A classe ring-[#92D050] aplica a cor hexadecimal diretamente ao anel
              className="group bg-white rounded-2xl border shadow-lg hover:shadow-2xl hover:ring-2 ring-[--tw-ring-color] hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full overflow-hidden"
              style={{ 
                  borderColor: theme.border,
                  // Definição da cor do anel de hover usando uma variável CSS,
                  // mas removendo a sintaxe de variável CSS de dentro do style
                  // para evitar erro de tipagem e confiando na classe utilitária do Tailwind
              }}
              // Utilizando a classe Tailwind ring-opacity-100 junto com a cor customizada
              // A classe ring-green-400 é uma aproximação visual do #92D050
              data-ring-color="ring-green-400"
            >
              
              {/* Representação Visual do Projeto (Banner Colorido) */}
              <div className={`${projeto.cor} h-40 flex items-center justify-center text-white relative overflow-hidden`}>
                <Icon size={64} strokeWidth={1} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                   <Maximize2 size={150} />
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold mb-2" style={{ color: theme.primary }}>
                    {projeto.nome}
                </h3>
                <p className="text-gray-500 text-sm mb-6 flex-1">
                  {projeto.descricao}
                </p>
                
                {/* Rodapé do Cartão com Ação (Ajustado para o estilo de cor primária no texto) */}
                <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: theme.border }}>
                  <span 
                    className="text-sm font-semibold uppercase tracking-wider transition-colors duration-200" 
                    style={{ color: theme.primary }} // Usando a cor primária (#1C415B) para o texto
                  >
                    Selecionar Modelo
                  </span>
                  <div 
                    className="p-2 rounded-full group-hover:scale-110 transition-transform duration-200" 
                    style={{ backgroundColor: theme.secondary, color: theme.primary }} // Fundo Verde (#92D050), Ícone Azul Escuro (#1C415B)
                  >
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}