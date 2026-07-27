"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Layers3, LayoutGrid, Search, SlidersHorizontal, Wrench } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";

const projetos = [
  {
    id: "pfv1f",
    nome: "Porta fora vão - 1 folha",
    titulo: "Cálculo com e sem puxador",
    categoria: "Porta fora vão",
    status: "Disponível",
    imagem: "/desenhos/portaforavao-1fls.png",
    kitHref: "/pfv1f-kit",
    barraHref: "/pfv1f-barra",
    descricao: "Projeto individual para orçamento por kit ou por barra.",
  },
  {
    id: "pfv2f",
    nome: "Porta fora vão - 2 folhas",
    titulo: "Cálculo com e sem puxador",
    categoria: "Porta fora vão",
    status: "Disponível",
    imagem: "/desenhos/portaforavao-2fls.png",
    kitHref: "/pfv2f-kit",
    barraHref: "/pfv2f-barra",
    descricao: "Projeto individual para orçamento por kit ou por barra.",
  },
  {
    id: "pc2f",
    nome: "Porta de correr - 2 folhas",
    titulo: "Cálculo com e sem puxador",
    categoria: "Portas",
    status: "Disponível",
    imagem: "/desenhos/projeto2fls-trincoepuxador.png",
    kitHref: "/pc2f-kit",
    barraHref: "/pc2f-barra",
    descricao: "Projeto individual para orçamento por kit.",
  },
  {
    id: "pc2fcb",
    nome: "Porta de correr - 2 folhas com bandeira",
    titulo: "Cálculo por barra com tubo e bandeira",
    categoria: "Portas",
    status: "Disponível",
    imagem: "/desenhos/portaband2fls.png",
    kitHref: "/pc2fcb-kit",
    barraHref: "/pc2fcb",
    kitLabel: "Kit",
    barraLabel: "Barra",
    descricao: "Projeto individual para orçamento por barra.",
  },
  {
    id: "pc4f",
    nome: "Porta de correr - 4 folhas",
    titulo: "Cálculo com e sem puxador",
    categoria: "Portas",
    status: "Disponível",
    imagem: "/desenhos/porta4fls-completo.png",
    kitHref: "/pc4f-kit",
    barraHref: "/pc4f-barra",
    descricao: "Projeto individual para orçamento por kit.",
  },
  {
    id: "pc4fcb",
    nome: "Porta de correr - 4 folhas com bandeira",
    titulo: "Cálculo por kit ou barra com tubo e bandeira",
    categoria: "Portas",
    status: "Disponível",
    imagem: "/desenhos/portaband4fls-simples.png",
    kitHref: "/pc4fcb-kit",
    barraHref: "/pc4fcb",
    descricao: "Projeto individual para orçamento por kit ou por barra.",
  },
  {
    id: "jc4f",
    nome: "Janela de correr - 4 folhas",
    titulo: "Cálculo com e sem trinco",
    categoria: "Janelas",
    status: "Disponível",
    imagem: "/desenhos/janela4fls-semtrinco.png",
    kitHref: "/jc4f-kit",
    barraHref: "/jc4f-barra",
    descricao: "Projeto individual para orçamento por kit.",
  },
  {
    id: "jc4fcs",
    nome: "Janela de correr - 4 folhas com sacada inferior",
    titulo: "Cálculo por kit ou barra com tubo e sacada",
    categoria: "Janelas",
    status: "Disponível",
    imagem: "/desenhos/janela-bst-trinco-4fls.png",
    kitHref: "/jc4fcs-kit",
    barraHref: "/jc4fcs",
    descricao: "Projeto individual para orçamento por kit ou por barra.",
  },
  {
    id: "jc2fcs",
    nome: "Janela de correr - 2 folhas com sacada inferior",
    titulo: "Cálculo por kit ou barra com tubo e sacada",
    categoria: "Janelas",
    status: "Disponível",
    imagem: "/desenhos/janela-bst-trinco-2fls.png",
    kitHref: "/jc2fcs-kit",
    barraHref: "/jc2fcs",
    descricao: "Projeto individual para orçamento por kit ou por barra.",
  },
  {
    id: "jc2f",
    nome: "Janela de correr - 2 folhas",
    titulo: "Cálculo com e sem trinco",
    categoria: "Janelas",
    status: "Disponível",
    imagem: "/desenhos/projeto2f-simples.png",
    kitHref: "/jc2f-kit",
    barraHref: "/jc2f-barra",
    descricao: "Projeto individual para orçamento por kit.",
  },
  {
    id: "pg",
    nome: "Porta de giro",
    titulo: "Cálculo para 1 folha e 2 folhas",
    categoria: "Portas giro",
    status: "Disponível",
    imagem: "/desenhos/portagiro-1fls1520ta.png",
    kitHref: "/pg",
    barraHref: "/pg2f",
    kitLabel: "1 folha",
    barraLabel: "2 folhas",
    descricao: "Projeto individual para porta de giro.",
  },
  {
    id: "pg-dobradica",
    nome: "Porta de giro dobradiça",
    titulo: "Projeto único com dobradiça",
    categoria: "Portas giro",
    status: "Disponível",
    imagem: "/desenhos/portagirodob-1flssimples.png",
    kitHref: "/pg?modelo=dobradica",
    kitLabel: "Calcular",
    descricao: "Projeto individual de porta de giro com dobradiça.",
  },
  {
    id: "pgf",
    nome: "Porta de giro com fixo lateral",
    titulo: "Vidro / vidro ou vidro / alvenaria",
    categoria: "Portas giro",
    status: "Disponível",
    imagem: "/desenhos/pgf-simples.png",
    kitHref: "/pgf?encontro=vidro",
    barraHref: "/pgf?encontro=alvenaria",
    kitLabel: "Vidro / vidro",
    barraLabel: "Vidro / alvenaria",
    descricao: "Projeto individual para porta de giro com fixo lateral.",
  },
  {
    id: "max",
    nome: "MAX",
    titulo: "Max único, V/V, com tubo ou bandeira",
    categoria: "Max",
    status: "Disponível",
    imagem: "/desenhos/max-unica.png",
    kitHref: "/max",
    kitLabel: "Calcular",
    descricao: "Projeto individual MAX com vidros, cantoneiras, perfis e ferragens automáticas.",
  },
  {
    id: "fixos",
    nome: "Fixos",
    titulo: "Cálculo dividido em 1 a 6 peças",
    categoria: "Fixos",
    status: "Disponível",
    imagem: "/desenhos/fixo-1folha.png",
    kitHref: "/fixos",
    kitLabel: "Calcular",
    descricao: "Projeto individual para painéis fixos por barra.",
  },
  {
    id: "fixo-bandeira",
    nome: "Fixo com bandeira",
    titulo: "Fixo inferior com bandeira superior",
    categoria: "Fixos",
    status: "Disponível",
    imagem: "/desenhos/fixo-1folhascombandeira.png",
    kitHref: "/fixo-bandeira",
    kitLabel: "Calcular",
    descricao: "Projeto individual com vidro inferior, vidro de bandeira e tubo selecionável.",
  },
  {
    id: "pma2f",
    nome: "Mão Amiga - 2 folhas",
    titulo: "Janela, porta ou kit pia",
    categoria: "Mão Amiga",
    status: "Disponível",
    imagem: "/desenhos/pma-2fs-simples.png",
    kitHref: "/pma2f",
    kitLabel: "Calcular",
    descricao: "Projeto individual PMA com 2 folhas móveis.",
  },
  {
    id: "pma3f",
    nome: "Mão Amiga - 3 folhas",
    titulo: "Todas correm ou 1 fixa + 2 móveis",
    categoria: "Mão Amiga",
    status: "Disponível",
    imagem: "/desenhos/pma-3fs-simples.png",
    kitHref: "/pma3f",
    kitLabel: "Calcular",
    descricao: "Projeto individual PMA com 3 folhas.",
  },
  {
    id: "pma4f",
    nome: "Mão Amiga - 4 folhas",
    titulo: "Todas correm ou 1 fixa + 3 móveis",
    categoria: "Mão Amiga",
    status: "Disponível",
    imagem: "/desenhos/pma-4fs-simples.png",
    kitHref: "/pma4f",
    kitLabel: "Calcular",
    descricao: "Projeto individual PMA com 4 folhas.",
  },
  {
    id: "pma5f",
    nome: "Mão Amiga - 5 folhas",
    titulo: "Todas correm ou 1 fixa + 4 móveis",
    categoria: "Mão Amiga",
    status: "Disponível",
    imagem: "/desenhos/pma-5fs-simples.png",
    kitHref: "/pma5f",
    kitLabel: "Calcular",
    descricao: "Projeto individual PMA com 5 folhas.",
  },
  {
    id: "pma6f",
    nome: "Mão Amiga - 6 folhas",
    titulo: "Todas correm ou 1 fixa + 5 móveis",
    categoria: "Mão Amiga",
    status: "Disponível",
    imagem: "/desenhos/pma-6fs-simples.png",
    kitHref: "/pma6f",
    kitLabel: "Calcular",
    descricao: "Projeto individual PMA com 6 folhas.",
  },
  {
    id: "pma2f4m",
    nome: "Mão Amiga - 2 fixas + 4 móveis",
    titulo: "Porta ou janela",
    categoria: "Mão Amiga",
    status: "Disponível",
    imagem: "/desenhos/pma-24fs-simples.png",
    kitHref: "/pma2f4m",
    kitLabel: "Calcular",
    descricao: "Projeto individual PMA com 2 folhas fixas e 4 móveis.",
  },
  {
    id: "deslizante2f",
    nome: "Deslizante - 2 folhas",
    titulo: "Carrinho simples ou inteiro",
    categoria: "Deslizante",
    status: "Disponível",
    imagem: "/desenhos/deslizante-2fls-cs-simples.png",
    kitHref: "/deslizante2f",
    kitLabel: "Calcular",
    descricao: "Projeto individual deslizante com 2 folhas.",
  },
  {
    id: "deslizante3f",
    nome: "Deslizante - 3 folhas",
    titulo: "Todas correm ou 1 fixa + 2 móveis",
    categoria: "Deslizante",
    status: "Disponível",
    imagem: "/desenhos/deslizante-3fls-cs-simples.png",
    kitHref: "/deslizante3f",
    kitLabel: "Calcular",
    descricao: "Projeto individual deslizante com 3 folhas.",
  },
  {
    id: "deslizante4f",
    nome: "Deslizante - 4 folhas",
    titulo: "Todas correm ou 1 fixa + 3 móveis",
    categoria: "Deslizante",
    status: "Disponível",
    imagem: "/desenhos/deslizante-4fls-cs-simples.png",
    kitHref: "/deslizante4f",
    kitLabel: "Calcular",
    descricao: "Projeto individual deslizante com 4 folhas.",
  },
  {
    id: "deslizante5f",
    nome: "Deslizante - 5 folhas",
    titulo: "Todas correm ou 1 fixa + 4 móveis",
    categoria: "Deslizante",
    status: "Disponível",
    imagem: "/desenhos/deslizante-5fls-cs-simples.png",
    kitHref: "/deslizante5f",
    kitLabel: "Calcular",
    descricao: "Projeto individual deslizante com 5 folhas.",
  },
  {
    id: "deslizante6f",
    nome: "Deslizante - 6 folhas",
    titulo: "Todas correm ou 1 fixa + 5 móveis",
    categoria: "Deslizante",
    status: "Disponível",
    imagem: "/desenhos/deslizante-6fls-cs-simples.png",
    kitHref: "/deslizante6f",
    kitLabel: "Calcular",
    descricao: "Projeto individual deslizante com 6 folhas.",
  },
  {
    id: "box2fls",
    nome: "Box 2 folhas",
    titulo: "Cálculo de box tradicional, quadrado e Evidence",
    categoria: "Box",
    status: "Disponível",
    imagem: "/desenhos/box-padrao.png",
    kitHref: "/box2fls",
    kitLabel: "Calcular",
    descricao: "Projeto individual de box frontal com 2 folhas.",
  },
  {
    id: "boxcanto",
    nome: "Box de canto",
    titulo: "Cálculo de box de canto com 4 folhas",
    categoria: "Box",
    status: "Disponível",
    imagem: "/desenhos/box-canto4f.png",
    kitHref: "/boxcanto",
    kitLabel: "Calcular",
    descricao: "Projeto individual de box de canto usando largura A e largura B.",
  },
  {
    id: "boxcanto3f",
    nome: "Box de canto 3 folhas",
    titulo: "Lado A fixo e lado B fixo + móvel",
    categoria: "Box",
    status: "Disponível",
    imagem: "/desenhos/box-canto3f.png",
    kitHref: "/boxcanto3f",
    kitLabel: "Calcular",
    descricao: "Projeto individual de box de canto com um fixo no lado A e duas folhas no lado B.",
  }
];

const ordemCategorias = [
  "Porta fora vão",
  "Portas giro",
  "Portas",
  "Janelas",
  "Mão Amiga",
  "Deslizante",
  "Box",
  "Fixos",
  "Max",
];

export default function MatrizProjetosPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, nomeEmpresa, loading, signOut } = useAuth();
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");

  const categorias = useMemo(() => {
    const nomes = Array.from(new Set(projetos.map((projeto) => projeto.categoria)));
    const ordenadas = ordemCategorias.filter((categoria) => nomes.includes(categoria));
    const restantes = nomes.filter((categoria) => !ordemCategorias.includes(categoria)).sort();
    return ["Todos", ...ordenadas, ...restantes];
  }, []);

  const totalPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    projetos.forEach((projeto) => {
      mapa.set(projeto.categoria, (mapa.get(projeto.categoria) || 0) + 1);
    });
    return mapa;
  }, []);

  const projetosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return projetos.filter((projeto) => {
      const categoriaOk = categoriaAtiva === "Todos" || projeto.categoria === categoriaAtiva;
      const buscaOk = !termo || [projeto.nome, projeto.titulo, projeto.categoria, projeto.descricao]
        .join(" ")
        .toLowerCase()
        .includes(termo);
      return categoriaOk && buscaOk;
    });
  }, [busca, categoriaAtiva]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4"
          style={{
            borderTopColor: "transparent",
            borderRightColor: theme.menuBackgroundColor,
            borderBottomColor: theme.menuBackgroundColor,
            borderLeftColor: theme.menuBackgroundColor,
          }}
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <div className="flex w-full min-w-0 flex-col">
        <Header nomeEmpresa={nomeEmpresa} usuarioEmail={user.email || ""} handleSignOut={signOut} />

        <main className="min-w-0 flex-1 p-4 md:p-8 xl:p-10">
          <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6" style={{ borderColor: `${theme.menuBackgroundColor}18` }}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50" style={{ color: theme.menuBackgroundColor }}>
                    <LayoutGrid size={21} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.menuBackgroundColor }}>
                      Matriz de projetos
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: theme.contentTextLightBg }}>
                      Escolha o projeto para calcular
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
                  Selecione uma tipologia para abrir o cálculo individual. Os projetos com dois modos permitem escolher entre kit e barra.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ResumoCard icon={<Layers3 size={21} />} label="Projetos" value={String(projetos.length)} />
                <ResumoCard icon={<CheckCircle2 size={21} />} label="Ativos" value={String(projetos.length)} />
                <ResumoCard icon={<Wrench size={21} />} label="Modos" value="Kit/Barra" />
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border bg-white p-4 shadow-sm md:p-5" style={{ borderColor: `${theme.menuBackgroundColor}18` }}>
            <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 px-2 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <SlidersHorizontal size={15} />
                  Categorias
                </div>
                <div className="mt-2 grid gap-1">
                  {categorias.map((categoria) => {
                    const ativo = categoriaAtiva === categoria;
                    const total = categoria === "Todos" ? projetos.length : totalPorCategoria.get(categoria) || 0;

                    return (
                      <button
                        key={categoria}
                        type="button"
                        onClick={() => setCategoriaAtiva(categoria)}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          ativo ? "bg-white text-[#0f2742] shadow-sm" : "text-slate-500 hover:bg-white/70"
                        }`}
                      >
                        <span className={ativo ? "font-semibold" : "font-normal"}>{categoria}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${ativo ? "bg-[#07385a] text-white" : "bg-white text-slate-400"}`}>
                          {total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="min-w-0">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#0f2742]">
                      {categoriaAtiva === "Todos" ? "Todos os projetos" : categoriaAtiva}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {projetosFiltrados.length} projeto(s) encontrado(s)
                    </p>
                  </div>
                  <label className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 md:max-w-sm">
                    <Search size={18} className="text-slate-400" />
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar projeto"
                      className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {projetosFiltrados.map((projeto) => (
                <article
                  key={projeto.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="grid min-h-[190px] grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)]">
                    <button
                      type="button"
                      onClick={() => router.push(projeto.kitHref)}
                      className="flex h-44 items-center justify-center bg-[#f7fafc] p-4 transition group-hover:bg-slate-50 sm:h-full"
                      title={`Abrir ${projeto.nome}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={projeto.imagem} alt={projeto.nome} className="max-h-36 max-w-full object-contain" />
                    </button>

                    <div className="flex min-w-0 flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{projeto.categoria}</p>
                          <h3 className="mt-1 truncate text-lg font-semibold text-[#0f2742]">{projeto.nome}</h3>
                          <p className="mt-1 text-sm font-normal text-slate-600">{projeto.titulo}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-emerald-700">
                          {projeto.status}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{projeto.descricao}</p>
                      <div className={`mt-auto grid gap-2 pt-4 ${projeto.barraHref ? "grid-cols-2" : "grid-cols-1"}`}>
                        <button
                          type="button"
                          onClick={() => router.push(projeto.kitHref)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium transition hover:bg-white"
                          style={{ color: theme.menuBackgroundColor }}
                        >
                          {projeto.kitLabel || "Kit"}
                          <ArrowRight size={16} />
                        </button>
                        {projeto.barraHref ? (
                          <button
                            type="button"
                            onClick={() => router.push(projeto.barraHref)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#0f2742]"
                          >
                            {projeto.barraLabel || "Barra"}
                            <ArrowRight size={16} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
                </div>
                {projetosFiltrados.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-semibold text-[#0f2742]">Nenhum projeto encontrado</p>
                    <p className="mt-1 text-sm text-slate-500">Tente buscar por outro nome ou trocar a categoria.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ResumoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#07385a]">{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-semibold text-[#0f2742]">{value}</p>
        </div>
      </div>
    </div>
  );
}


