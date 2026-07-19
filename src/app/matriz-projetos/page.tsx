"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Layers3, Search, Wrench } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";

const projetos = [
  {
    id: "pfv1f",
    nome: "Porta fora vão - 1 folha",
    titulo: "Calculo com e sem puxador",
    categoria: "Portas",
    status: "Disponível",
    imagem: "/desenhos/portaforavao-1fls.png",
    kitHref: "/pfv1f-kit",
    barraHref: "/pfv1f-barra",
    descricao: "Projeto individual para Orçamento por kit ou por barra.",
  },
  {
    id: "pfv2f",
    nome: "Porta fora vão - 2 folhas",
    titulo: "Calculo com e sem puxador",
    categoria: "Portas",
    status: "Disponível",
    imagem: "/desenhos/portaforavao-2fls.png",
    kitHref: "/pfv2f-kit",
    barraHref: "/pfv2f-barra",
    descricao: "Projeto individual para Orçamento por kit ou por barra.",
  },
  {
    id: "pc2f",
    nome: "Porta de correr - 2 folhas",
    titulo: "Calculo com e sem puxador",
    categoria: "Portas",
    status: "Disponivel",
    imagem: "/desenhos/projeto2fls-trincoepuxador.png",
    kitHref: "/pc2f-kit",
    barraHref: "/pc2f-barra",
    descricao: "Projeto individual para Orçamento por kit.",
  },
  {
    id: "pc4f",
    nome: "Porta de correr - 4 folhas",
    titulo: "Calculo com e sem puxador",
    categoria: "Portas",
    status: "Disponivel",
    imagem: "/desenhos/porta4fls-completo.png",
    kitHref: "/pc4f-kit",
    barraHref: "/pc4f-barra",
    descricao: "Projeto individual para Orçamento por kit.",
  },
  {
    id: "jc4f",
    nome: "Janela de correr - 4 folhas",
    titulo: "Calculo com e sem trinco",
    categoria: "Janelas",
    status: "Disponível",
    imagem: "/desenhos/janela4fls-semtrinco.png",
    kitHref: "/jc4f-kit",
    barraHref: "/jc4f-barra",
    descricao: "Projeto individual para Orçamento por kit.",
  },
  {
    id: "jc2f",
    nome: "Janela de correr - 2 folhas",
    titulo: "Calculo com e sem trinco",
    categoria: "Janelas",
    status: "Disponível",
    imagem: "/desenhos/projeto2f-simples.png",
    kitHref: "/jc2f-kit",
    barraHref: "/jc2f-barra",
    descricao: "Projeto individual para Orçamento por kit.",
  },
  {
    id: "pg",
    nome: "Porta de giro",
    titulo: "Calculo para 1 folha e 2 folhas",
    categoria: "Portas",
    status: "Disponivel",
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
    titulo: "Projeto unico com dobradiça",
    categoria: "Portas",
    status: "Disponivel",
    imagem: "/desenhos/portagirodob-1flssimples.png",
    kitHref: "/pg?modelo=dobradica",
    kitLabel: "Calcular",
    descricao: "Projeto individual de porta de giro com dobradiça.",
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
    id: "box2fls",
    nome: "Box 2 folhas",
    titulo: "Cálculo de box tradicional, quadrado e Evidence",
    categoria: "Box",
    status: "Disponível",
    imagem: "/desenhos/box-padrao.png",
    kitHref: "/box2fls",
    kitLabel: "Calcular",
    descricao: "Projeto individual de box frontal com 2 folhas.",
  }
];

export default function MatrizProjetosPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, nomeEmpresa, loading, signOut } = useAuth();
  const [busca, setBusca] = useState("");

  const projetosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return projetos;
    return projetos.filter((projeto) =>
      [projeto.nome, projeto.titulo, projeto.categoria, projeto.descricao]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    );
  }, [busca]);

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
          <section
            className="relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.32)] md:p-8 xl:p-10"
            style={{
              background: `linear-gradient(120deg, #ffffff 0%, #f8fafc 65%, ${theme.menuBackgroundColor}08 100%)`,
              borderColor: `${theme.menuBackgroundColor}1A`,
            }}
          >
            <div
              className="absolute right-0 top-0 h-56 w-56 rounded-full blur-3xl"
              style={{ backgroundColor: `${theme.menuBackgroundColor}10` }}
            />

            <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: theme.menuBackgroundColor }}>
                  Matriz de projetos
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl" style={{ color: theme.contentTextLightBg }}>
                  Escolha o projeto para calcular
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 opacity-70" style={{ color: theme.contentTextLightBg }}>
                  Use esta página como central dos projetos individuais. Cada card pode abrir o cálculo por kit ou por barra.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ResumoCard icon={<Layers3 size={22} />} label="Projetos" value={String(projetos.length)} />
                <ResumoCard icon={<CheckCircle2 size={22} />} label="Ativos" value={String(projetos.length)} />
                <ResumoCard icon={<Wrench size={22} />} label="Modos" value="Kit/Barra" />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm" style={{ borderColor: `${theme.menuBackgroundColor}18` }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight" style={{ color: theme.contentTextLightBg }}>
                  Projetos disponíveis
                </h2>
                <p className="mt-1 text-sm text-slate-500">A lista já fica pronta para receber novos modelos.</p>
              </div>
              <label className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 md:max-w-sm">
                <Search size={18} className="text-slate-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar projeto"
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projetosFiltrados.map((projeto) => (
                <article
                  key={projeto.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex h-56 items-center justify-center bg-[#f7fafc] p-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={projeto.imagem} alt={projeto.nome} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="border-t border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{projeto.categoria}</p>
                        <h3 className="mt-1 text-xl font-black text-[#0f2742]">{projeto.nome}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-600">{projeto.titulo}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
                        {projeto.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{projeto.descricao}</p>
                    <div className={`mt-5 grid gap-3 ${projeto.barraHref ? "grid-cols-2" : "grid-cols-1"}`}>
                      <button
                        type="button"
                        onClick={() => router.push(projeto.kitHref)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white transition hover:brightness-95"
                        style={{ backgroundColor: theme.menuBackgroundColor }}
                      >
                        {projeto.kitLabel || "Kit"}
                        <ArrowRight size={16} />
                      </button>
                      {projeto.barraHref ? (
                        <button
                          type="button"
                          onClick={() => router.push(projeto.barraHref)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#0f2742] transition hover:bg-slate-50"
                        >
                          {projeto.barraLabel || "Barra"}
                          <ArrowRight size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
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
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-black text-[#0f2742]">{value}</p>
        </div>
      </div>
    </div>
  );
}
