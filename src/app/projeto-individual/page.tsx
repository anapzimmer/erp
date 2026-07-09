"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  Calendar,
  ClipboardList,
  Copy,
  DollarSign,
  FileText,
  FolderOpen,
  Grid2X2,
  HelpCircle,
  Layers,
  Layers3,
  MoveHorizontal,
  MoveVertical,
  Palette,
  Printer,
  RailSymbol,
  Save,
  Settings,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { ProjetoIndividualPDF, type ProjetoIndividualDados, type ProjetoIndividualMaterial } from "../relatorios/projetoindividual/ProjetoIndividualPDF";

type ClienteCadastro = {
  id: string;
  nome: string;
  grupo_preco_id?: string | null;
};

type VidroCadastro = {
  id: string;
  nome: string;
  espessura?: string | number | null;
  tipo?: string | null;
  preco?: number | null;
};

type PrecoVidroGrupo = {
  vidro_id: string;
  grupo_preco_id: string | null;
  preco: number;
};

type KitCadastro = {
  id: number;
  nome: string;
  largura: number;
  altura: number;
  categoria?: string | null;
  cores?: string | null;
  preco_por_cor?: string | null;
  preco?: number | null;
  empresa_id: string;
};

const formatarVidroCadastro = (vidro: VidroCadastro) => {
  const partes = [vidro.nome];
  const espessura = vidro.espessura ? String(vidro.espessura).replace(/\s*mm$/i, "") : "";
  if (espessura) partes.push(`${espessura}mm`);
  return partes.join(" ");
};

const arredondar5cm = (valor: number) => Math.ceil(Number(valor || 0) / 50) * 50;

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const numero = (valor: number, casas = 2) =>
  Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const parseNumeroPtBr = (valor: string) => Number(valor.replace(/\./g, "").replace(",", ".") || 0);

const hojePtBr = () => new Date().toLocaleDateString("pt-BR");

const criarMaterial = (parcial?: Partial<ProjetoIndividualMaterial>): ProjetoIndividualMaterial => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()),
  qtd: parcial?.qtd ?? 1,
  unidade: parcial?.unidade ?? "und",
  descricao: parcial?.descricao ?? "Novo item",
  valorUnitario: parcial?.valorUnitario ?? 0,
});

const materiaisIniciais: ProjetoIndividualMaterial[] = [
  criarMaterial({ qtd: 2.31, unidade: "m2", descricao: "VIDRO FUME 10MM", valorUnitario: 302.5 }),
  criarMaterial({ qtd: 1, unidade: "und", descricao: "KIT PORTA 10MM 2,40A X 2,00L 2F", valorUnitario: 260 }),
  criarMaterial({ qtd: 1, unidade: "und", descricao: "TQ047 - TUBO QUADRADO 50X50", valorUnitario: 237.94 }),
  criarMaterial({ qtd: 1, unidade: "und", descricao: "3530 - FECHADURA COMPLETA V/A", valorUnitario: 75.98 }),
];

const trilhoOpcoes = ["Interrompido", "Embutido"];
const corKitOpcoes = ["Preto", "Branco", "Fosco"];

export default function ProjetoIndividualPage() {
  const { empresaId } = useAuth();
  const { theme } = useTheme();
  const logoUsuario = theme.logoLightUrl || theme.logoUrl || theme.logoDarkUrl || null;
  const [clientes, setClientes] = useState<ClienteCadastro[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [listaClientesAberta, setListaClientesAberta] = useState(false);
  const [clienteAtivoIndex, setClienteAtivoIndex] = useState(0);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const [vidros, setVidros] = useState<VidroCadastro[]>([]);
  const [carregandoVidros, setCarregandoVidros] = useState(false);
  const [listaVidrosAberta, setListaVidrosAberta] = useState(false);
  const [vidroAtivoIndex, setVidroAtivoIndex] = useState(0);
  const vidroInputRef = useRef<HTMLInputElement>(null);
  const [precosVidroGrupos, setPrecosVidroGrupos] = useState<PrecoVidroGrupo[]>([]);
  const [kits, setKits] = useState<KitCadastro[]>([]);
  const [dados, setDados] = useState<Omit<ProjetoIndividualDados, "materiais">>({
    projeto: "PORTA DE CORRER",
    numero: "005412",
    data: hojePtBr(),
    cliente: "Cliente Exemplo",
    largura: 1000,
    altura: 2140,
    quantidade: 1,
    trilho: "Interrompido",
    vidro: "Fume 10mm",
    corKit: "Preto",
    observacao: "Imagem ilustrativa do projeto",
  });
  const [materiais, setMateriais] = useState<ProjetoIndividualMaterial[]>(materiaisIniciais);

  const projetoPdf: ProjetoIndividualDados = useMemo(() => ({ ...dados, materiais }), [dados, materiais]);
  const totalMateriais = useMemo(
    () => materiais.reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0),
    [materiais]
  );
  const totalItens = useMemo(() => materiais.reduce((soma, item) => soma + Number(item.qtd || 0), 0), [materiais]);
  const valorVidros = useMemo(
    () => materiais
      .filter((item) => item.descricao.toLowerCase().includes("vidro"))
      .reduce((soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0), 0),
    [materiais]
  );
  const valorFerragens = Math.max(0, totalMateriais - valorVidros);
  const clientesFiltrados = useMemo(() => {
    const termo = dados.cliente.trim().toLowerCase();
    if (!termo || dados.cliente === "Cliente Exemplo") return clientes.slice(0, 8);
    return clientes.filter((cliente) => cliente.nome.toLowerCase().includes(termo)).slice(0, 8);
  }, [clientes, dados.cliente]);
  const vidrosFiltrados = useMemo(() => {
    const termo = dados.vidro.trim().toLowerCase();
    if (!termo) return vidros.slice(0, 8);
    return vidros.filter((vidro) => formatarVidroCadastro(vidro).toLowerCase().includes(termo)).slice(0, 8);
  }, [dados.vidro, vidros]);
  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.nome === dados.cliente) || null,
    [clientes, dados.cliente]
  );
  const vidroSelecionado = useMemo(
    () => vidros.find((vidro) => formatarVidroCadastro(vidro) === dados.vidro) || null,
    [dados.vidro, vidros]
  );
  const precoVidroM2 = useMemo(() => {
    if (!vidroSelecionado) return 0;

    const precoGrupo = clienteSelecionado?.grupo_preco_id
      ? precosVidroGrupos.find(
          (preco) =>
            String(preco.vidro_id) === String(vidroSelecionado.id) &&
            String(preco.grupo_preco_id) === String(clienteSelecionado.grupo_preco_id)
        )
      : null;

    return Number(precoGrupo?.preco ?? vidroSelecionado.preco ?? 0);
  }, [clienteSelecionado, precosVidroGrupos, vidroSelecionado]);
  const calculoVidro = useMemo(() => {
    const larguraCalculo = arredondar5cm(Number(dados.largura || 0) + 50);
    const alturaAdicional = dados.trilho === "Embutido" ? 70 : 50;
    const alturaCalculo = arredondar5cm(Number(dados.altura || 0) + alturaAdicional);
    const areaUnit = (larguraCalculo * alturaCalculo) / 1_000_000;
    const areaTotalCobrada = areaUnit * Number(dados.quantidade || 0);

    return {
      larguraCalculo,
      alturaCalculo,
      areaTotalCobrada: Number(areaTotalCobrada.toFixed(3)),
    };
  }, [dados.altura, dados.largura, dados.quantidade, dados.trilho]);

  const atualizarCampo = <K extends keyof Omit<ProjetoIndividualDados, "materiais">>(
    campo: K,
    valor: Omit<ProjetoIndividualDados, "materiais">[K]
  ) => setDados((atual) => ({ ...atual, [campo]: valor }));

  const atualizarMaterial = <K extends keyof ProjetoIndividualMaterial>(
    id: string,
    campo: K,
    valor: ProjetoIndividualMaterial[K]
  ) => {
    setMateriais((lista) => lista.map((item) => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const duplicarMaterial = (item: ProjetoIndividualMaterial) => {
    setMateriais((lista) => [...lista, criarMaterial({ ...item })]);
  };

  const removerMaterial = (id: string) => {
    setMateriais((lista) => lista.filter((item) => item.id !== id));
  };

  const selecionarCliente = (cliente: ClienteCadastro) => {
    atualizarCampo("cliente", cliente.nome);
    setListaClientesAberta(false);
    setClienteAtivoIndex(0);
  };

  const selecionarVidro = (vidro: VidroCadastro) => {
    atualizarCampo("vidro", formatarVidroCadastro(vidro));
    setListaVidrosAberta(false);
    setVidroAtivoIndex(0);
  };

  const obterEspessuraVidro = (texto: string) => {
  const match = texto.match(/(\d{1,2})\s*mm/i);
  return match ? Number(match[1]) : 0;
};


const kitSelecionado = useMemo(() => {
  const espessura = obterEspessuraVidro(dados.vidro);

  const categoriaEsperada =
    espessura === 10
      ? "Kit Porta"
      : espessura === 6 || espessura === 8
        ? "Kit Janela"
        : "";

  if (!categoriaEsperada) return null;

  const corAtual = dados.corKit.toLowerCase();

  const larguraKitNecessaria = Number(dados.largura || 0) * 2;
  const alturaKitNecessaria = Number(dados.altura || 0);

  const kitsFiltrados = kits.filter((kit) => {
    const categoriaOk = String(kit.categoria || "")
      .toLowerCase()
      .includes(categoriaEsperada.toLowerCase());

    const corOk = String(kit.cores || "").toLowerCase() === corAtual;

    return categoriaOk && corOk;
  });

  if (kitsFiltrados.length === 0) return null;

  return kitsFiltrados
    .filter((kit) =>
      Number(kit.largura || 0) >= larguraKitNecessaria &&
      Number(kit.altura || 0) >= alturaKitNecessaria
    )
    .sort((a, b) => {
      const diferencaA =
        Math.abs(Number(a.largura || 0) - larguraKitNecessaria) +
        Math.abs(Number(a.altura || 0) - alturaKitNecessaria);

      const diferencaB =
        Math.abs(Number(b.largura || 0) - larguraKitNecessaria) +
        Math.abs(Number(b.altura || 0) - alturaKitNecessaria);

      return diferencaA - diferencaB;
    })[0] || null;
}, [dados.altura, dados.corKit, dados.largura, dados.vidro, kits]);


  useEffect(() => {
    let ativo = true;

    const carregarCadastros = async () => {
      if (!empresaId) return;

      setCarregandoClientes(true);
      setCarregandoVidros(true);
     const [
  { data: clientesData, error: clientesError },
  { data: vidrosData, error: vidrosError },
  { data: precosVidroData, error: precosVidroError },
  { data: kitsData, error: kitsError },
] = await Promise.all([
  supabase
    .from("clientes")
    .select("id, nome, grupo_preco_id")
    .eq("empresa_id", empresaId)
    .order("nome", { ascending: true }),

  supabase
    .from("vidros")
    .select("id, nome, espessura, tipo, preco")
    .eq("empresa_id", empresaId)
    .order("nome", { ascending: true }),

  supabase
    .from("vidro_precos_grupos")
    .select("vidro_id, grupo_preco_id, preco")
    .eq("empresa_id", empresaId),

  supabase
    .from("kits")
    .select("id, nome, largura, altura, categoria, cores, preco_por_cor, preco, empresa_id")
    .eq("empresa_id", empresaId),
]);

      if (!ativo) return;

      if (clientesError) {
        console.error("Erro ao carregar clientes:", clientesError);
        setClientes([]);
      } else {
        const lista = (clientesData || []) as ClienteCadastro[];
        setClientes(lista);
        if (lista.length > 0) {
          setDados((atual) => ({
            ...atual,
            cliente: atual.cliente && atual.cliente !== "Cliente Exemplo" ? atual.cliente : lista[0].nome,
          }));
        }
      }

      if (vidrosError) {
        console.error("Erro ao carregar vidros:", vidrosError);
        setVidros([]);
      } else {
        const lista = (vidrosData || []) as VidroCadastro[];
        setVidros(lista);
        if (lista.length > 0) {
          setDados((atual) => ({
            ...atual,
            vidro: atual.vidro && atual.vidro !== "Fume 10mm" ? atual.vidro : formatarVidroCadastro(lista[0]),
          }));
        }
      }

      if (precosVidroError) {
        console.error("Erro ao carregar preços por tabela:", precosVidroError);
        setPrecosVidroGrupos([]);
      } else {
        setPrecosVidroGrupos((precosVidroData || []) as PrecoVidroGrupo[]);
      }

      if (kitsError) {
  console.error("Erro ao carregar kits:", kitsError);
  setKits([]);
} else {
  setKits((kitsData || []) as KitCadastro[]);
}

      setCarregandoClientes(false);
      setCarregandoVidros(false);
    };

    carregarCadastros();

    return () => {
      ativo = false;
    };
  }, [empresaId]);

  useEffect(() => {
    setClienteAtivoIndex(0);
  }, [dados.cliente]);

  useEffect(() => {
    if (listaClientesAberta) {
      window.setTimeout(() => clienteInputRef.current?.focus(), 0);
    }
  }, [listaClientesAberta]);

  useEffect(() => {
    setVidroAtivoIndex(0);
  }, [dados.vidro]);

  useEffect(() => {
    if (listaVidrosAberta) {
      window.setTimeout(() => vidroInputRef.current?.focus(), 0);
    }
  }, [listaVidrosAberta]);

useEffect(() => {
  if (!kitSelecionado) return;

  const descricaoKit = kitSelecionado.nome.toUpperCase();
  const precoKit = Number(kitSelecionado.preco || 0);

  setMateriais((lista) => {
    const indiceKit = lista.findIndex((item) =>
      item.descricao.toLowerCase().includes("kit")
    );

    const itemAtual = lista[indiceKit] || criarMaterial();

    const itemAtualizado: ProjetoIndividualMaterial = {
      ...itemAtual,
      qtd: Number(dados.quantidade || 1),
      unidade: "und",
      descricao: descricaoKit,
      valorUnitario: precoKit,
    };

    if (indiceKit < 0) return [...lista, itemAtualizado];

    return lista.map((item, index) =>
      index === indiceKit ? itemAtualizado : item
    );
  });
}, [dados.quantidade, kitSelecionado]);

useEffect(() => {
  if (!dados.vidro) return;

  const vidroNome = dados.vidro
    .replace(/^vidro\s+/i, "")
    .trim();

  const descricaoVidro = `VIDRO ${vidroNome.toUpperCase()}`;

  setMateriais((lista) => {
    const indiceVidro = lista.findIndex((item) =>
      item.descricao.toLowerCase().includes("vidro")
    );

    const itemAtual = lista[indiceVidro] || criarMaterial();

    const itemAtualizado: ProjetoIndividualMaterial = {
      ...itemAtual,
      qtd: calculoVidro.areaTotalCobrada,
      unidade: "m2",
      descricao: descricaoVidro,
      valorUnitario: precoVidroM2,
    };

    if (indiceVidro < 0) return [itemAtualizado, ...lista];

    return lista.map((item, index) =>
      index === indiceVidro ? itemAtualizado : item
    );
  });
}, [calculoVidro.areaTotalCobrada, dados.vidro, precoVidroM2]);

  return (
    <main className="min-h-screen overflow-x-auto bg-[#eef3f8] text-[#0f2742]">
     <div className="mx-auto w-full max-w-[1800px] p-3 lg:p-5">
        <div className="flex min-h-[calc(100vh-40px)] w-full flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,39,66,0.10)]">
          <header className="grid min-h-[118px] grid-cols-[25%_25%_50%] items-center gap-5 border-b border-slate-200 bg-white px-9 py-4">
            <div className="flex items-center">
              <div className="flex h-[82px] w-[300px] items-center">
                {logoUsuario ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUsuario}
                    alt="Logo da empresa"
                    className="max-h-[82px] w-auto max-w-[300px] object-contain"
                  />
                ) : (
                  <div className="text-[30px] font-semibold leading-none text-[#10253f]">
                    Logo da empresa
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <label className="text-sm font-medium uppercase tracking-wide text-slate-500">Projeto:</label>
              <input
                value={dados.projeto}
                onChange={(e) => atualizarCampo("projeto", e.target.value)}
                className="w-[230px] border-0 bg-transparent p-0 text-[20px] font-bold uppercase leading-tight text-[#102d4d] outline-none"
              />
            </div>

            <div className="grid grid-cols-[180px_170px_1fr]">
              <div className="flex min-h-[58px] items-center gap-3 border-l border-slate-200 px-5">
                <FileText size={26} strokeWidth={1.6} className="shrink-0 text-slate-600" />
                <div className="min-w-0">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Nº orçamento</label>
                  <input
                    value={dados.numero}
                    onChange={(e) => atualizarCampo("numero", e.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-emerald-600 outline-none"
                  />
                </div>
              </div>
              <div className="flex min-h-[58px] items-center gap-3 border-l border-slate-200 px-5">
                <Calendar size={26} strokeWidth={1.6} className="shrink-0 text-slate-600" />
                <div className="min-w-0">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Data</label>
                  <input
                    value={dados.data}
                    onChange={(e) => atualizarCampo("data", e.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-emerald-600 outline-none"
                  />
                </div>
              </div>
              <div className="flex min-h-[58px] items-center gap-3 border-l border-slate-200 px-5">
                <UserRound size={28} strokeWidth={1.6} className="shrink-0 text-slate-600" />
                <div className="relative min-w-0">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Cliente</label>
                  {listaClientesAberta ? (
                    <input
                      ref={clienteInputRef}
                      value={dados.cliente}
                      onChange={(e) => {
                        atualizarCampo("cliente", e.target.value);
                        setClienteAtivoIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setClienteAtivoIndex((atual) => Math.min(atual + 1, Math.max(clientesFiltrados.length - 1, 0)));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setClienteAtivoIndex((atual) => Math.max(atual - 1, 0));
                        } else if (e.key === "Enter" && clientesFiltrados[clienteAtivoIndex]) {
                          e.preventDefault();
                          selecionarCliente(clientesFiltrados[clienteAtivoIndex]);
                        } else if (e.key === "Escape") {
                          setListaClientesAberta(false);
                        }
                      }}
                      onBlur={() => window.setTimeout(() => setListaClientesAberta(false), 120)}
                      disabled={carregandoClientes}
                      className="w-full min-w-[180px] border-0 bg-transparent p-0 text-sm font-semibold text-[#07385a] outline-none placeholder:text-slate-400 disabled:text-slate-400"
                      placeholder={carregandoClientes ? "Carregando..." : "Digite o cliente"}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setListaClientesAberta(true)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "Enter") {
                          e.preventDefault();
                          setListaClientesAberta(true);
                        }
                      }}
                      className="block w-full min-w-[180px] truncate bg-transparent p-0 text-left text-sm font-semibold text-emerald-600"
                    >
                      {dados.cliente || "Digite o cliente"}
                    </button>
                  )}
                  {listaClientesAberta && (
                    <div className="absolute right-0 top-[42px] z-30 max-h-[250px] w-[260px] overflow-auto rounded-lg border border-[#07385a]/20 bg-white py-1 text-sm shadow-xl shadow-slate-900/10">
                      {carregandoClientes ? (
                        <div className="px-3 py-2 font-medium text-slate-500">Carregando clientes...</div>
                      ) : clientesFiltrados.length > 0 ? (
                        clientesFiltrados.map((cliente, index) => (
                          <button
                            key={cliente.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setClienteAtivoIndex(index)}
                            onClick={() => selecionarCliente(cliente)}
                            className={`block w-full px-3 py-2 text-left font-semibold text-[#07385a] ${
                              index === clienteAtivoIndex ? "bg-[#07385a]/10" : "bg-transparent hover:bg-[#07385a]/10"
                            }`}
                          >
                            {cliente.nome}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 font-medium text-slate-500">Nenhum cliente encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
          <aside className="flex w-20 xl:w-[210px] shrink-0 flex-col bg-[#00375a]">
            <nav className="flex flex-1 flex-col gap-4 px-4 py-5">
              {[
                { label: "Orcamento", icon: ClipboardList, ativo: true },
                { label: "Imprimir", icon: Printer },
                { label: "Projetos", icon: FolderOpen },
                { label: "PDF +", icon: FileText },
                { label: "Salvar", icon: Save },
                { label: "Configuracoes", icon: Settings },
                { label: "Ajuda", icon: HelpCircle },
              ].map(({ label, icon: Icon, ativo }) => (
                <button
                  key={label}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                    ativo ? "bg-[#18c979] text-white shadow-lg shadow-emerald-900/20" : "text-white/90 hover:bg-white/10"
                  }`}
                  type="button"
                >
                  <Icon size={22} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto bg-[#f7fafc] p-3">
              <div className="grid grid-cols-1
xl:grid-cols-[380px_1fr] gap-3">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionTitle>Desenho ilustrativo</SectionTitle>
                  <div className="mt-7 flex min-h-[460px] items-center justify-center">
                    <ProjetoDrawing largura={dados.largura} altura={dados.altura} />
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <HelpCircle size={16} /> Imagem ilustrativa do projeto
                  </p>
                </section>

                <div className="space-y-5">
                  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionTitle>Dados do projeto</SectionTitle>
                    <div className="mt-5 grid overflow-visible md:grid-cols-2">
                      <DataInput icon={<MoveHorizontal size={24} strokeWidth={1.6} />} label="Largura" value={dados.largura} suffix="mm" onChange={(v) => atualizarCampo("largura", v)} />
                      <OptionInput icon={<RailSymbol size={24} strokeWidth={1.6} />} label="Trilho" value={dados.trilho} options={trilhoOpcoes} onChange={(v) => atualizarCampo("trilho", v)} />
                      <DataInput icon={<MoveVertical size={24} strokeWidth={1.6} />} label="Altura" value={dados.altura} suffix="mm" onChange={(v) => atualizarCampo("altura", v)} />
                      <label className="relative flex min-h-[72px] items-center gap-5 border-b border-slate-200 py-3 pl-6">
                        <span className="flex w-9 shrink-0 justify-start text-[#0f2742]/80">
                          <Layers size={24} strokeWidth={1.6} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vidro</span>
                          {listaVidrosAberta ? (
                            <input
                              ref={vidroInputRef}
                              value={dados.vidro}
                              onChange={(e) => {
                                atualizarCampo("vidro", e.target.value);
                                setVidroAtivoIndex(0);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setVidroAtivoIndex((atual) => Math.min(atual + 1, Math.max(vidrosFiltrados.length - 1, 0)));
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setVidroAtivoIndex((atual) => Math.max(atual - 1, 0));
                                } else if (e.key === "Enter" && vidrosFiltrados[vidroAtivoIndex]) {
                                  e.preventDefault();
                                  selecionarVidro(vidrosFiltrados[vidroAtivoIndex]);
                                } else if (e.key === "Escape") {
                                  setListaVidrosAberta(false);
                                }
                              }}
                              onBlur={() => window.setTimeout(() => setListaVidrosAberta(false), 120)}
                              disabled={carregandoVidros}
                              className="mt-0.5 w-full bg-transparent text-[15px] font-semibold leading-tight text-[#10253f] outline-none placeholder:text-slate-400 disabled:text-slate-400"
                              placeholder={carregandoVidros ? "Carregando..." : "Digite o vidro"}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setListaVidrosAberta(true)}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowDown" || e.key === "Enter") {
                                  e.preventDefault();
                                  setListaVidrosAberta(true);
                                }
                              }}
                              className="mt-0.5 block w-full truncate bg-transparent p-0 text-left text-[15px] font-semibold leading-tight text-[#10253f]"
                            >
                              {dados.vidro || "Digite o vidro"}
                            </button>
                          )}
                        </span>
                        {listaVidrosAberta && (
                          <div className="absolute left-[84px] top-[64px] z-30 max-h-[250px] w-[320px] overflow-auto rounded-lg border border-[#07385a]/20 bg-white py-1 text-sm shadow-xl shadow-slate-900/10">
                            {carregandoVidros ? (
                              <div className="px-3 py-2 font-medium text-slate-500">Carregando vidros...</div>
                            ) : vidrosFiltrados.length > 0 ? (
                              vidrosFiltrados.map((vidro, index) => (
                                <button
                                  key={vidro.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => setVidroAtivoIndex(index)}
                                  onClick={() => selecionarVidro(vidro)}
                                  className={`block w-full px-3 py-2 text-left font-semibold text-[#07385a] ${
                                    index === vidroAtivoIndex ? "bg-[#07385a]/10" : "bg-transparent hover:bg-[#07385a]/10"
                                  }`}
                                >
                                  {formatarVidroCadastro(vidro)}
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 font-medium text-slate-500">Nenhum vidro encontrado</div>
                            )}
                          </div>
                        )}
                      </label>
                      <DataInput icon={<Copy size={24} strokeWidth={1.6} />} label="Quantidade (und)" value={dados.quantidade} onChange={(v) => atualizarCampo("quantidade", v)} />
                      <OptionInput icon={<Palette size={24} strokeWidth={1.6} />} label="Cor do kit" value={dados.corKit} options={corKitOpcoes} onChange={(v) => atualizarCampo("corKit", v)} />
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <SectionTitle>Relação de materiais</SectionTitle>
                      <div className="flex items-center gap-2 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => setMateriais((lista) => [...lista, criarMaterial()])}
                          className="rounded-xl bg-[#07385a] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm"
                        >
                          Adicionar item
                        </button>
                        <PDFDownloadLink
                          document={<ProjetoIndividualPDF dados={projetoPdf} logoUrl={logoUsuario} />}
                          fileName={`projeto_individual_${dados.numero || "novo"}.pdf`}
                          className="rounded-xl bg-[#18bd72] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm"
                        >
                          {({ loading }) => loading ? "Gerando..." : "Baixar PDF"}
                        </PDFDownloadLink>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                      <div className="grid grid-cols-[80px_2fr_70px_36px_115px_36px_105px] bg-[#07385a] text-[11px] font-semibold uppercase tracking-wide text-white">
                        <div className="border-r border-white/20 px-3 py-3 text-center">Qtd</div>
                        <div className="border-r border-white/20 px-3 py-3">Produto / descrição</div>
                        <div className="border-r border-white/20 px-3 py-3 text-center">Unidade</div>
                        <div className="px-3 py-3 text-center" />
                        <div className="border-r border-white/20 px-3 py-3 text-right">Valor unit.</div>
                        <div className="px-3 py-3 text-center" />
                        <div className="px-3 py-3 text-right">Valor total</div>
                      </div>
                      {materiais.map((item) => (
                        <div key={item.id} className="group relative grid grid-cols-[80px_2fr_70px_36px_115px_36px_105px] items-center border-t border-slate-200 bg-white text-xs text-[#10253f]">
                          <div className="px-3 py-2.5">
                            <input
                              type="number"
                              value={item.qtd}
                              step="0.01"
                              onChange={(e) => atualizarMaterial(item.id, "qtd", Number(e.target.value || 0))}
                              className="w-full bg-transparent text-center font-medium outline-none focus:rounded-md focus:bg-slate-50"
                            />
                          </div>
                          <div className="flex items-center px-3 py-2.5">
                            <input
                              value={item.descricao}
                              onChange={(e) => atualizarMaterial(item.id, "descricao", e.target.value)}
                              className="w-full bg-transparent text-xs font-medium uppercase outline-none focus:rounded-md focus:bg-slate-50"
                            />
                          </div>
                          <div className="px-3 py-2.5">
                            <input
                              value={item.unidade}
                              onChange={(e) => atualizarMaterial(item.id, "unidade", e.target.value)}
                              className="w-full bg-transparent text-center font-medium outline-none focus:rounded-md focus:bg-slate-50"
                            />
                          </div>
                          <div className="px-3 py-2.5 text-center font-medium">R$</div>
                          <div className="px-3 py-2.5">
                            <input
                              value={numero(item.valorUnitario)}
                              onChange={(e) => atualizarMaterial(item.id, "valorUnitario", parseNumeroPtBr(e.target.value))}
                              className="w-full bg-transparent text-right font-medium outline-none focus:rounded-md focus:bg-slate-50"
                            />
                          </div>
                          <div className="px-3 py-2.5 text-center font-medium">R$</div>
                          <div className="px-3 py-2.5 text-right font-medium">
                            {numero(Number(item.qtd || 0) * Number(item.valorUnitario || 0))}
                          </div>
                          <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg bg-white/95 p-1 shadow-sm group-hover:flex">
                            <button type="button" onClick={() => duplicarMaterial(item)} className="rounded-md bg-blue-50 p-1.5 text-blue-700">
                              <Copy size={16} />
                            </button>
                            <button type="button" onClick={() => removerMaterial(item.id)} className="rounded-md bg-red-50 p-1.5 text-red-600">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-5">
                      <p className="text-sm font-bold uppercase text-[#0f2742]">Valor total do orçamento</p>
                      <div className="rounded-lg bg-[#18bd72] px-8 py-3 text-xl font-bold text-white shadow-lg shadow-emerald-900/10">
                        {moeda(totalMateriais)}
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <section className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <SummaryCard icon={<Grid2X2 size={30} />} label="Area total" value={`${numero(calculoVidro.areaTotalCobrada)} m2`} detail="Area de vidro" tone="green" />
                <SummaryCard icon={<ClipboardList size={30} />} label="Total de itens" value={numero(totalItens, 0)} detail="Itens na lista" tone="blue" />
                <SummaryCard icon={<Layers3 size={30} />} label="Valor vidros" value={moeda(valorVidros)} detail="Vidros" tone="purple" />
                <SummaryCard icon={<Wrench size={30} />} label="Valor ferragens" value={moeda(valorFerragens)} detail="Kits e acessorios" tone="orange" />
                <SummaryCard icon={<DollarSign size={30} />} label="Valor total" value={moeda(totalMateriais)} detail="Orcamento total" tone="emerald" />
              </section>
            </div>

          </section>
        </div>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#0f2742]">{children}</h2>
      <div className="mt-3 h-[2px] w-9 rounded-full bg-[#18bd72]" />
    </div>
  );
}

function DataInput({ icon, label, value, suffix, onChange }: { icon: React.ReactNode; label: string; value: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="flex min-h-[72px] items-center gap-5 border-b border-slate-200 py-3 pr-6 odd:border-r odd:border-slate-200">
      <span className="flex w-9 shrink-0 justify-start text-[#0f2742]/80">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value || 0))}
            className="w-[64px] min-w-0 bg-transparent text-[15px] font-semibold leading-tight text-[#10253f] outline-none"
          />
          {suffix && <span className="text-[15px] font-semibold leading-tight text-[#10253f]">{suffix}</span>}
        </span>
      </span>
    </label>
  );
}

function OptionInput({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [ativoIndex, setAtivoIndex] = useState(Math.max(0, options.indexOf(value)));

  const selecionar = (opcao: string) => {
    onChange(opcao);
    setAberto(false);
    setAtivoIndex(Math.max(0, options.indexOf(opcao)));
  };

  return (
    <label className="relative flex min-h-[72px] items-center gap-5 border-b border-slate-200 py-3 pl-6">
      <span className="flex w-9 shrink-0 justify-start text-[#0f2742]/80">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          onBlur={() => window.setTimeout(() => setAberto(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAberto(true);
              setAtivoIndex((atual) => Math.min(atual + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAberto(true);
              setAtivoIndex((atual) => Math.max(atual - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              selecionar(options[ativoIndex] || options[0]);
            } else if (e.key === "Escape") {
              setAberto(false);
            }
          }}
          className="mt-0.5 flex w-full items-center justify-between bg-transparent p-0 text-left text-[15px] font-semibold leading-tight text-[#10253f] outline-none"
        >
          <span>{value}</span>
          <span className="ml-2 text-[10px] text-slate-400">▼</span>
        </button>
      </span>
      {aberto && (
        <div className="absolute left-[84px] top-[64px] z-30 w-[220px] overflow-hidden rounded-lg border border-[#07385a]/15 bg-white py-1 text-sm shadow-xl shadow-slate-900/10">
          {options.map((opcao, index) => (
            <button
              key={opcao}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAtivoIndex(index)}
              onClick={() => selecionar(opcao)}
              className={`block w-full px-3 py-2 text-left font-semibold text-[#07385a] ${
                index === ativoIndex ? "bg-[#07385a]/10" : "bg-transparent hover:bg-[#07385a]/10"
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function ProjetoDrawing({ largura, altura }: { largura: number; altura: number }) {
  return (
    <div className="relative h-[520px] w-[360px]" role="img" aria-label="Desenho ilustrativo do projeto">
      <div className="absolute left-[36px] top-[76px] h-[390px] w-[248px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/desenhos/portaforavao-1fls.png"
          alt=""
          className="h-full w-full object-fill"
          draggable={false}
        />
      </div>

      <div className="absolute left-[160px] top-[34px] h-px w-[124px] bg-[#2389dc]" />
      <div className="absolute left-[160px] top-[24px] h-5 w-px bg-[#2389dc]" />
      <div className="absolute left-[284px] top-[24px] h-5 w-px bg-[#2389dc]" />
      <div className="absolute left-[154px] top-[31px] h-px w-3 -rotate-45 bg-[#2389dc]" />
      <div className="absolute left-[280px] top-[31px] h-px w-3 -rotate-45 bg-[#2389dc]" />
      <div className="absolute left-[186px] top-[2px] whitespace-nowrap text-[22px] font-semibold leading-none text-[#07385a]">
        {largura} mm
      </div>

      <div className="absolute left-[306px] top-[76px] h-[390px] w-px bg-[#2389dc]" />
      <div className="absolute left-[294px] top-[76px] h-px w-6 bg-[#2389dc]" />
      <div className="absolute left-[294px] top-[466px] h-px w-6 bg-[#2389dc]" />
      <div className="absolute left-[300px] top-[69px] h-px w-4 rotate-45 bg-[#2389dc]" />
      <div className="absolute left-[300px] top-[459px] h-px w-4 -rotate-45 bg-[#2389dc]" />
      <div className="absolute left-[333px] top-[228px] origin-left rotate-90 whitespace-nowrap text-[22px] font-semibold leading-none text-[#07385a]">
        {altura} mm
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "green" | "blue" | "purple" | "orange" | "emerald" }) {
  const tones = {
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    emerald: "bg-green-100 text-green-700",
  };
  return (
    <div className="flex items-center gap-4 border-slate-200 px-3 xl:border-r last:border-r-0">
      <div className={`flex h-[68px] w-[74px] shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f2742]">{label}</p>
        <p className="mt-1 text-xl font-bold leading-tight text-[#0f2742] xl:text-[22px]">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
