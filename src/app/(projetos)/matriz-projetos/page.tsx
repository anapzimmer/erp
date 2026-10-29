"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutGrid, Search, SlidersHorizontal, Star, X } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";

const projetos = [
    {
      "id": "pinazio",
      "nome": "Pinázio",
      "categoria": "Pinázio",
      "titulo": "Divisões e acabamentos",
      "descricao": "Monte a composição do vidro e ajuste as divisões do pinázio.",
      "status": "Disponível",
      "imagem": "/desenhos/matriz-pinazio.svg",
      "kitHref": "/calculo/pinazio",
      "kitLabel": "Calcular"
    },
    {
      "id": "sacadafrontal",
      "nome": "Sacada frontal",
      "categoria": "Sacadas",
      "titulo": "Fixação frontal",
      "descricao": "Configure os vidros, as divisões e os perfis da sacada frontal.",
      "status": "Disponível",
      "imagem": "/desenhos/matriz-sacadafrontal.svg",
      "kitHref": "/calculo/sacadafrontal",
      "kitLabel": "Calcular"
    },
    {
      "id": "sacadatorre",
      "nome": "Sacada com torre",
      "categoria": "Sacadas",
      "titulo": "Vidros com torres",
      "descricao": "Defina medidas, divisões e torres de fixação.",
      "status": "Disponível",
      "imagem": "/desenhos/matriz-sacadatorre.svg",
      "kitHref": "/calculo/sacadatorre",
      "kitLabel": "Calcular"
    },
    {
      "id": "sacadagrapa",
      "nome": "Sacada com grapa",
      "categoria": "Sacadas",
      "titulo": "Grapas e tubo opcional",
      "descricao": "Ajuste as divisões, as grapas e a posição do tubo.",
      "status": "Disponível",
      "imagem": "/desenhos/matriz-sacadagrapa.svg",
      "kitHref": "/calculo/sacadagrapa",
      "kitLabel": "Calcular"
    },
    {
      "id": "fechamentosacada",
      "nome": "Fechamento de sacada",
      "categoria": "Sacadas",
      "titulo": "Painéis e divisões",
      "descricao": "Configure o fechamento de sacada conforme as medidas do vão.",
      "status": "Disponível",
      "imagem": "/desenhos/matriz-fechamentosacada.svg",
      "kitHref": "/calculo/fechamentosacada",
      "kitLabel": "Calcular"
    },
    {
      "id": "peledevidro",
      "nome": "Pele de vidro",
      "categoria": "Fachadas",
      "titulo": "Quadros fixos e móveis",
      "descricao": "Defina os quadros, as divisões e os materiais da fachada.",
      "status": "Disponível",
      "imagem": "/desenhos/matriz-peledevidro.svg",
      "kitHref": "/calculo/peledevidro",
      "kitLabel": "Calcular"
    },
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
      id: "jc4fcb",
      nome: "Janela de correr - 4 folhas com bandeira",
      titulo: "Cálculo por kit ou barra com tubo e bandeira",
      categoria: "Janelas",
      status: "Disponível",
      imagem: "/desenhos/jc4fcb-semtrinco.png",
      kitHref: "/jc4fcb-kit",
      barraHref: "/jc4fcb",
      descricao: "Projeto individual para orçamento por kit ou por barra.",
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
    id: "jc4fcbs",
    nome: "Janela de correr - 4 folhas com peitoril e bandeira",
    titulo: "Cálculo por barra com tubo, peitoril e bandeira",
    categoria: "Janelas",
    status: "Disponível",
    imagem: "/desenhos/JC4FCBS_semtrinco.png",
    kitHref: "/jc4fcbs",
    kitLabel: "Calcular",
    descricao:
      "Projeto individual para janela de correr com 4 folhas, peitoril inferior, bandeira superior e tubo selecionável.",
  },
    {
      id: "pg",
      nome: "Porta de giro",
      titulo: "Projeto de porta de giro com 1 folha",
      categoria: "Portas giro",
      status: "Disponível",
      imagem: "/desenhos/portagiro-1fls1520ta.png",
      kitHref: "/pg",
      kitLabel: "1 folha",
      descricao: "Projeto individual para porta de giro.",
    },
    {
      id: "pg-vidro-vidro-2f",
      nome: "Porta de giro vidro/vidro",
      titulo: "2 folhas móveis",
      categoria: "Portas giro",
      status: "Disponível",
      imagem: "/desenhos/portagiro-2fls.png",
      kitHref: "/pg2f",
      kitLabel: "Calcular",
      descricao: "Duas portas de giro, fechadura 1520 com contra 1531 ou 1520TA com contra 1504TA, com ou sem puxador.",
    },
    {
      id: "pg2f-bandeira",
      nome: "Porta de giro com bandeira",
      titulo: "2 folhas móveis e bandeira superior única",
      categoria: "Portas giro",
      status: "Disponível",
      imagem: "/desenhos/portagiro-2fls-bandeira.png",
      kitHref: "/pg2f-bandeira",
      kitLabel: "Calcular",
      descricao: "Duas portas de giro, tubo horizontal e vidros separados para portas e bandeira.",
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
      kitHref: "/pg2fva?encontro=vidro",
      barraHref: "/pg2fva?encontro=alvenaria",
      kitLabel: "PG2FVA - Vidro / vidro",
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
      id: "fora-esquadro",
      nome: "Fora de esquadro",
      titulo: "Cálculo de alturas por divisão",
      categoria: "Fixos",
      status: "Disponível",
      imagem: "/desenhos/fora-esquadro.svg",
      kitHref: "/calculo/fora-esquadro",
      kitLabel: "Calcular",
      descricao: "Cálculo dinâmico para vidros inclinados, triangulares ou fora de esquadro.",
    },
    {
      id: "fora-esquadro-lateral",
      nome: "Fora de esquadro lateral",
      titulo: "Altura fixa e larguras diferentes",
      categoria: "Fixos",
      status: "Disponível",
      imagem: "/desenhos/fora-esquadro-lateral.svg",
      kitHref: "/calculo/fora-esquadro-lateral",
      kitLabel: "Calcular",
      descricao: "Peças retangulares e uma ponta inclinada à esquerda ou à direita, com altura fixa.",
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

type Projeto = {
  id: string; nome: string; categoria: string; titulo: string;
  descricao: string; status: string; imagem: string; kitHref: string;
  kitLabel?: string; barraHref?: string; barraLabel?: string;
};
const catalogo: Projeto[] = projetos;
const FAVORITOS_KEY = "glasscode-biblioteca-favoritos";

export default function MatrizProjetosPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, nomeEmpresa, loading, signOut } = useAuth();
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [somenteFavoritos, setSomenteFavoritos] = useState(false);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(FAVORITOS_KEY) || "[]");
      if (Array.isArray(salvo)) setFavoritos(salvo.filter((v): v is string => typeof v === "string"));
    } catch { /* dados locais inválidos não impedem o acesso */ }
  }, []);

  function alternarFavorito(id: string) {
    setFavoritos(anteriores => {
      const novos = anteriores.includes(id) ? anteriores.filter(item => item !== id) : [...anteriores, id];
      try { localStorage.setItem(FAVORITOS_KEY, JSON.stringify(novos)); } catch { /* armazenamento indisponível */ }
      return novos;
    });
  }

  const categorias = useMemo(() => {
    const nomes = Array.from(new Set(catalogo.map(p => p.categoria)));
    nomes.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return ["Todos", ...nomes];
  }, []);
  const totais = useMemo(() => {
    const mapa = new Map<string, number>();
    catalogo.forEach(p => mapa.set(p.categoria, (mapa.get(p.categoria) || 0) + 1));
    return mapa;
  }, []);
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return catalogo.filter(p =>
      (categoriaAtiva === "Todos" || p.categoria === categoriaAtiva) &&
      (!somenteFavoritos || favoritos.includes(p.id)) &&
      (!termo || [p.nome, p.titulo, p.categoria, p.descricao].join(" ").toLocaleLowerCase("pt-BR").includes(termo))
    );
  }, [busca, categoriaAtiva, somenteFavoritos, favoritos]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#F6F8F8] text-[#38444B]">Carregando projetos...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <Header nomeEmpresa={nomeEmpresa} usuarioEmail={user.email || ""} handleSignOut={signOut} />
      <main className="w-full max-w-none px-3 py-5 sm:px-5 lg:px-6 2xl:px-8">
        <div className="mb-6 border-b border-[#DCE2E4] pb-5">
          <p className="mb-2 text-xs font-medium tracking-wide text-[#8F9AA1]">Projetos &amp; Cálculos <span className="mx-2">/</span> Biblioteca de Projetos</p>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE2E4] bg-white text-[#38444B]"><LayoutGrid size={19}/></div>
            <div><h1 className="text-2xl font-semibold tracking-tight text-[#38444B] md:text-3xl">Biblioteca de Projetos</h1>
              <p className="mt-1 text-sm text-[#69777E]">Escolha um desenho técnico para iniciar o cálculo. Se disponível, selecione Kit ou Barra.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border border-[#DCE2E4] bg-white p-3 lg:sticky lg:top-4">
            <div className="mb-3 flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#69777E]"><SlidersHorizontal size={15}/> Categorias</div>
            <div className="space-y-0.5">
              {categorias.map(c => <button key={c} type="button" onClick={() => setCategoriaAtiva(c)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${categoriaAtiva === c ? "bg-[#F0F3E0] font-semibold text-[#38444B]" : "text-[#69777E] hover:bg-[#F6F8F8]"}`}>
                <span>{c}</span><span className="text-xs tabular-nums text-[#8F9AA1]">{c === "Todos" ? catalogo.length : totais.get(c) || 0}</span>
              </button>)}
            </div>
          </aside>
          <section className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#DCE2E4] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-semibold text-[#38444B]">{categoriaAtiva === "Todos" ? "Todos os projetos" : categoriaAtiva}</h2>
                <p className="text-xs text-[#8F9AA1]">{filtrados.length} de {catalogo.length} projetos</p></div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex h-10 items-center gap-2 rounded-lg border border-[#DCE2E4] bg-[#F6F8F8] px-3 focus-within:border-[#8F9AA1]">
                  <Search size={16} className="text-[#8F9AA1]"/><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar projeto" className="w-full min-w-0 bg-transparent text-sm text-[#38444B] outline-none placeholder:text-[#8F9AA1] sm:w-48"/>
                  {busca && <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca"><X size={15}/></button>}
                </label>
                <button type="button" onClick={() => setSomenteFavoritos(v => !v)} aria-pressed={somenteFavoritos}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors ${somenteFavoritos ? "border-[#C8D463] bg-[#F0F3E0] text-[#38444B]" : "border-[#DCE2E4] text-[#69777E] hover:bg-[#F6F8F8]"}`}>
                  <Star size={15} fill={somenteFavoritos ? "#C8D463" : "none"}/> Favoritos ({favoritos.length})
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtrados.map(p => <article key={p.id} className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#DCE2E4] bg-white transition-colors duration-200 hover:border-[#C8D463] hover:shadow-[0_0_0_1px_rgba(200,212,99,0.18)]">
                <div className="relative flex h-40 items-center justify-center border-b border-[#EDF0F1] bg-[#FCFDFD] p-4">
                  <button type="button" onClick={() => router.push(p.kitHref)} title={`Abrir ${p.nome}`} className="flex h-full w-full items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imagem} alt={`Desenho técnico: ${p.nome}`} className="max-h-full max-w-full object-contain" />
                  </button>
                  <button type="button" onClick={() => alternarFavorito(p.id)} aria-label={favoritos.includes(p.id) ? `Remover ${p.nome} dos favoritos` : `Favoritar ${p.nome}`}
                    className="absolute right-2 top-2 rounded-lg border border-[#DCE2E4] bg-white p-2 text-[#8F9AA1] hover:text-[#38444B]">
                    <Star size={16} fill={favoritos.includes(p.id) ? "#C8D463" : "none"} stroke={favoritos.includes(p.id) ? "#38444B" : "currentColor"}/>
                  </button>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8F9AA1]">{p.categoria}</span>
                  <h3 className="text-sm font-semibold leading-5 text-[#38444B]">{p.nome}</h3>
                  <p className="mt-1 text-xs text-[#69777E]">{p.titulo}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#8F9AA1]">{p.descricao}</p>
                  <div className={`mt-auto grid gap-2 pt-4 ${p.barraHref ? "grid-cols-2" : "grid-cols-1"}`}>
                    <button type="button" onClick={() => router.push(p.kitHref)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-transparent px-3 py-2 text-xs font-medium text-[#38444B] transition-colors duration-200 hover:text-[#78852D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8D463]">
                      {p.kitLabel || (p.barraHref ? "Kit" : "Calcular")} <ArrowRight size={14}/>
                    </button>
                    {p.barraHref && <button type="button" onClick={() => router.push(p.barraHref!)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-transparent px-3 py-2 text-xs font-medium text-[#38444B] transition-colors duration-200 hover:text-[#78852D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8D463]">
                      {p.barraLabel || "Barra"} <ArrowRight size={14}/>
                    </button>}
                  </div>
                </div>
              </article>)}
            </div>
            {filtrados.length === 0 && <div className="rounded-xl border border-dashed border-[#DCE2E4] bg-white p-10 text-center text-sm text-[#69777E]">Nenhum projeto encontrado. Experimente limpar os filtros.</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
