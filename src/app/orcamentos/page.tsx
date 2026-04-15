//app/orcamentos/page.tsx
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

// Lista de Modelos - Adicionado o item aberturas.png
const modelosOrcamento = [
  {
    id: "aberturas",
    nome: "Cálculo Projetos",
    categoria: "Engenharia",
    descricao: "Calculadora somente vidros",
    imagem: "/desenhos/aberturas.png", // <--- IMAGEM REFERENCIADA AQUI
    rota: "/calculosomentevidro",    // <--- ROTA CONFIGURADA AQUI
    tags: ["Somente vidros", "kis"],
  },
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
  },

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

  const totalModelos = modelosOrcamento.length
  const totalFiltrados = modelosFiltrados.length

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F8FB]">
      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#4E9B6B]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-16 h-80 w-80 rounded-full bg-[#2A5D7C]/8 blur-3xl" />

      <main className="relative mx-auto w-full max-w-350 px-5 py-8 md:px-8 md:py-10 xl:px-12">
        <header className="mb-7 rounded-3xl border border-[#dce4ec] bg-white/85 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur-sm md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e9f6ee] px-3 py-1.5 text-[#2F7A4D]">
                <PlusCircle size={16} />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.18em]">Novo Orçamento</span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-[#1F3F57] md:text-4xl">Selecione o modelo de cálculo</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-[#5f7385] md:text-base">
                Fluxo rápido para iniciar um novo orçamento com o tipo de projeto certo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[#dce4ec] bg-[#f8fafc] px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8092a1]">Modelos</p>
                <p className="text-xl font-black text-[#1F3F57]">{totalModelos}</p>
              </div>

              <div className="rounded-2xl border border-[#dce4ec] bg-[#f8fafc] px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8092a1]">Exibidos</p>
                <p className="text-xl font-black text-[#1F3F57]">{totalFiltrados}</p>
              </div>

              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#d5dee7] bg-white px-4 py-2.5 text-sm font-semibold text-[#4f6577] transition-all hover:-translate-y-0.5 hover:border-[#c5d1dd] hover:bg-[#f9fbfd]"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
            </div>
          </div>
        </header>

        <section className="mb-8 rounded-3xl border border-[#dce4ec] bg-white p-4 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.5)] md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8fa0ae]" size={18} />
              <input
                type="text"
                placeholder="Pesquisar modelo de orçamento"
                className="w-full rounded-2xl border border-[#e1e8ef] bg-[#f9fbfd] py-3 pl-12 pr-4 text-sm font-medium text-[#30495c] outline-none transition-all placeholder:text-[#9aabba] focus:border-[#b8cbdb] focus:bg-white"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-2xl border border-[#e1e8ef] bg-[#f8fafc] p-1.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#7f93a5]">
                <Filter size={14} />
              </div>

              {categoriasFiltro.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFiltroAtivo(cat)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-all ${
                    filtroAtivo === cat
                      ? "bg-[#2F7A4D] text-white shadow-[0_10px_24px_-14px_rgba(47,122,77,0.9)]"
                      : "text-[#778b9d] hover:bg-white hover:text-[#40596e]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {modelosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {modelosFiltrados.map((item) => (
              <article
                key={item.id}
                onClick={() => router.push(item.rota)}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-[#dce4ec] bg-white shadow-[0_22px_50px_-45px_rgba(15,23,42,0.65)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#c9d8e4] hover:shadow-[0_34px_60px_-42px_rgba(15,23,42,0.45)]"
              >
                <div className="absolute right-4 top-4 z-10 rounded-full border border-white/70 bg-white/85 p-2 text-[#43647a] opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                  <Maximize size={14} />
                </div>

                <div className="relative flex aspect-16/10 items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#eef4f9_100%)] p-8">
                  <img
                    src={item.imagem}
                    alt={item.nome}
                    className="max-h-full object-contain transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/400x300/f1f5f9/1c415b?text=Sem+Imagem"
                    }}
                  />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#eef4f8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5f778b]">
                      {item.categoria}
                    </span>

                    <div className="flex flex-wrap justify-end gap-1">
                      {item.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="rounded-md bg-[#f3f6f9] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#8a9aaa]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 className="mb-2 text-xl font-black leading-tight text-[#1F3F57] transition-colors group-hover:text-[#2F7A4D]">
                    {item.nome}
                  </h3>

                  <p className="mb-5 flex-1 text-sm font-medium leading-relaxed text-[#6c8092] line-clamp-2">
                    {item.descricao}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-[#edf2f7] pt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#244b66]">
                      Selecionar
                      <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </span>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f6ee] text-[#2F7A4D] transition-all duration-300 group-hover:bg-[#2F7A4D] group-hover:text-white">
                      <PlusCircle size={18} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#cfdae4] bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-18 w-18 items-center justify-center rounded-full bg-[#f3f7fb]">
              <Search className="text-[#a5b4c2]" size={30} />
            </div>
            <h3 className="text-2xl font-black text-[#1F3F57]">Nenhum projeto encontrado</h3>
            <p className="mt-2 text-sm font-medium text-[#75899c]">Tente outro nome ou altere os filtros para visualizar mais opções.</p>
          </div>
        )}
      </main>
    </div>
  )
}