"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileDown, Layers3, PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { CentralImpressaoPDF, type CentralImpressaoItem } from "@/app/relatorios/centralimpressao/CentralImpressaoPDF";
import { supabase } from "@/lib/supabaseClient";

type ProjetoComposicao = CentralImpressaoItem & {
  largura: number;
  altura: number;
  corPerfil?: string;
  valorTotal?: number;
  trilho?: string;
  puxador?: string;
  tamanhoPuxador?: string;
  trinco?: string;
  origemRota?: string;
};

const CENTRAL_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_CLIENTE_KEY = "glasscode:central-impressao:cliente";
const CENTRAL_OBRA_KEY = "glasscode:central-impressao:obra";
const CENTRAL_NUMERO_KEY = "glasscode:central-impressao:numero";
const CENTRAL_ORCAMENTO_ID_KEY = "glasscode:central-impressao:orcamento-id";

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const numeroDecimal = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseNumero = (valor: string) => Number(valor.replace(/\./g, "").replace(",", ".") || 0);

const formatarPuxador = (puxador?: string, tamanho?: string) => {
  const puxadorTexto = String(puxador || "").trim();
  const tamanhoTexto = String(tamanho || "").trim();
  if (!puxadorTexto) return "";
  if (!tamanhoTexto || tamanhoTexto === "Escolher" || puxadorTexto.toLowerCase().includes(tamanhoTexto.toLowerCase())) {
    return puxadorTexto;
  }
  return `${puxadorTexto} ${tamanhoTexto}`;
};

const ehJanelaCorrer4Folhas = (projeto?: string) => /jc4f|janela de correr 4/i.test(String(projeto || ""));
const ehJanelaCorrer2Folhas = (projeto?: string) => /jc2f|janela de correr 2/i.test(String(projeto || ""));
const ehPortaCorrer2Folhas = (projeto?: string) => /pc2f|porta de correr 2 folhas/i.test(String(projeto || ""));
const ehPortaCorrer4Folhas = (projeto?: string) => /pc4f|porta de correr 4 folhas/i.test(String(projeto || ""));

const nomeProjetoVisivel = (projeto?: string) => {
  if (projeto === "PFV1F - KIT") return "Porta de correr atrás do Vão - 1 folha";
  if (projeto === "PFV2F - KIT") return "Porta de correr atrás do vão - 2 folhas";
  if (projeto === "PC2F - KIT") return "Porta de correr 2 folhas";
  if (projeto === "PC4F - KIT") return "Porta de correr 4 folhas";
  if (projeto === "JC4F - KIT") return "Janela de correr 4 folhas";
  if (projeto === "JC2F - KIT") return "Janela de correr 2 folhas";
  if (projeto === "PG - 1 folha") return "Porta de giro - 1 folha";
  return projeto || "Projeto";
};

const multiplicadorPecasProjeto = (projeto?: string) => {
  const texto = String(projeto || "").toLowerCase();
  if (texto.includes("jc4f") || texto.includes("janela de correr 4")) return 4;
  if (texto.includes("jc2f") || texto.includes("janela de correr 2")) return 2;
  if (texto.includes("pc4f") || texto.includes("porta de correr 4 folhas")) return 4;
  if (texto.includes("pc2f") || texto.includes("porta de correr 2 folhas")) return 2;
  if (texto.includes("pfv2f") || texto.includes("2 folhas")) return 2;
  return 1;
};

const carregarLista = (): ProjetoComposicao[] => {
  try {
    const salvo = window.localStorage.getItem(CENTRAL_KEY);
    return salvo ? JSON.parse(salvo) as ProjetoComposicao[] : [];
  } catch {
    return [];
  }
};

export default function CentralImpressaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { theme } = useTheme();
  const { user, nomeEmpresa, empresaId, loading, signOut } = useAuth();
  const [numeroOrcamento, setNumeroOrcamento] = useState("");
  const [cliente, setCliente] = useState("");
  const [obra, setObra] = useState("");
  const [itens, setItens] = useState<ProjetoComposicao[]>([]);
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const carregar = async () => {
      if (editId) {
        const idRascunho = window.localStorage.getItem(CENTRAL_ORCAMENTO_ID_KEY);
        const listaRascunho = carregarLista();

        if (idRascunho === editId && listaRascunho.length > 0) {
          setItens(listaRascunho);
          setNumeroOrcamento(window.localStorage.getItem(CENTRAL_NUMERO_KEY) || "Novo orçamento");
          setCliente(window.localStorage.getItem(CENTRAL_CLIENTE_KEY) || listaRascunho[0]?.cliente || "");
          setObra(window.localStorage.getItem(CENTRAL_OBRA_KEY) || "");
          setRascunhoCarregado(true);
          return;
        }

        const { data, error } = await supabase
          .from("orcamentos")
          .select("*")
          .eq("id", editId)
          .maybeSingle();

        if (!error && data) {
          const itensSalvos = data.itens && !Array.isArray(data.itens) && typeof data.itens === "object"
            ? data.itens as { projetos?: ProjetoComposicao[]; cliente?: string; obra?: string }
            : null;

          setItens(Array.isArray(itensSalvos?.projetos) ? itensSalvos.projetos : []);
          setNumeroOrcamento(data.numero_formatado || "Novo orçamento");
          setCliente(data.cliente_nome || itensSalvos?.cliente || "");
          setObra(data.obra_referencia || itensSalvos?.obra || "");
          window.localStorage.setItem(CENTRAL_ORCAMENTO_ID_KEY, editId);
          setRascunhoCarregado(true);
          return;
        }
      }

      const lista = carregarLista();
      setItens(lista);
      setNumeroOrcamento(window.localStorage.getItem(CENTRAL_NUMERO_KEY) || "Novo orçamento");
      setCliente(window.localStorage.getItem(CENTRAL_CLIENTE_KEY) || lista[0]?.cliente || "");
      setObra(window.localStorage.getItem(CENTRAL_OBRA_KEY) || "");
      setRascunhoCarregado(true);
    };

    carregar();
  }, [editId]);

  useEffect(() => {
    if (!rascunhoCarregado) return;
    window.localStorage.setItem(CENTRAL_KEY, JSON.stringify(itens));
    window.localStorage.setItem(CENTRAL_NUMERO_KEY, numeroOrcamento);
    window.localStorage.setItem(CENTRAL_CLIENTE_KEY, cliente);
    window.localStorage.setItem(CENTRAL_OBRA_KEY, obra);
    if (editId) {
      window.localStorage.setItem(CENTRAL_ORCAMENTO_ID_KEY, editId);
    }
  }, [cliente, editId, itens, numeroOrcamento, obra, rascunhoCarregado]);

  const itensPdf = useMemo<CentralImpressaoItem[]>(
    () => itens.map((item) => ({
      id: item.id,
      numero: item.numero,
      projeto: nomeProjetoVisivel(item.projeto),
      cliente: cliente || item.cliente,
      medidas: `${Number(item.largura || 0)} x ${Number(item.altura || 0)} mm`,
      largura: Number(item.largura || 0),
      altura: Number(item.altura || 0),
      quantidade: Number(item.quantidade || 0),
      modo: item.modo,
      desenhoUrl: item.desenhoUrl,
      vidro: item.vidro,
      corKit: item.corPerfil || item.corKit,
      trilho: item.trilho,
      puxador: formatarPuxador(item.puxador, item.tamanhoPuxador),
      trinco: item.trinco,
      valorTotal: Number(item.valorTotal || 0),
    })),
    [cliente, itens]
  );

  const totais = useMemo(() => {
    return itens.reduce(
      (acc, item) => {
        acc.projetos += 1;
        acc.pecas += Number(item.quantidade || 0) * multiplicadorPecasProjeto(item.projeto);
        acc.area += (Number(item.largura || 0) * Number(item.altura || 0) * Number(item.quantidade || 0)) / 1_000_000;
        acc.valor += Number(item.valorTotal || 0);
        return acc;
      },
      { projetos: 0, pecas: 0, area: 0, valor: 0 }
    );
  }, [itens]);

  const atualizarItem = <K extends keyof ProjetoComposicao>(id: string, campo: K, valor: ProjetoComposicao[K]) => {
    setItens((lista) =>
      lista.map((item) => {
        if (item.id !== id) return item;
        const atualizado = { ...item, [campo]: valor };
        if (campo === "largura" || campo === "altura") {
          atualizado.medidas = `${Number(atualizado.largura || 0)} x ${Number(atualizado.altura || 0)} mm`;
        }
        return atualizado;
      })
    );
  };

  const removerItem = (id: string) => {
    setItens((lista) => lista.filter((item) => item.id !== id));
  };

  const editarItem = (item: ProjetoComposicao) => {
    const projetoTexto = item.projeto.toLowerCase();
    const rota = item.origemRota || (projetoTexto.includes("pc4f") || ehPortaCorrer4Folhas(item.projeto)
      ? "/pc4f-kit"
      : projetoTexto.includes("pc2f") || ehPortaCorrer2Folhas(item.projeto)
      ? "/pc2f-kit"
      : projetoTexto.includes("jc2f") || projetoTexto.includes("janela de correr 2")
      ? "/jc2f-kit"
      : projetoTexto.includes("jc4f") || projetoTexto.includes("janela de correr 4")
      ? "/jc4f-kit"
      : projetoTexto.includes("2 folhas") || projetoTexto.includes("pfv2f")
      ? "/pfv2f-kit"
      : projetoTexto.includes("porta de correr") || projetoTexto.includes("pfv1f")
        ? "/pfv1f-kit"
        : "");
    if (!rota) {
      setMensagem("Este projeto ainda não tem uma tela de edição vinculada.");
      return;
    }

    const retorno = editId
      ? `/central-impressao?edit=${encodeURIComponent(editId)}`
      : "/central-impressao";
    router.push(`${rota}?centralItem=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(retorno)}`);
  };

  const limparTudo = () => {
    setItens([]);
    setNumeroOrcamento("");
    setCliente("");
    setObra("");
    window.localStorage.removeItem(CENTRAL_KEY);
    window.localStorage.removeItem(CENTRAL_NUMERO_KEY);
    window.localStorage.removeItem(CENTRAL_CLIENTE_KEY);
    window.localStorage.removeItem(CENTRAL_OBRA_KEY);
    window.localStorage.removeItem(CENTRAL_ORCAMENTO_ID_KEY);
  };

  const gerarNumeroOrcamento = async () => {
    const dataAtual = new Date();
    const prefixoData = `ORC${dataAtual.getFullYear().toString().slice(-2)}${(dataAtual.getMonth() + 1).toString().padStart(2, "0")}`;
    let query = supabase
      .from("orcamentos")
      .select("numero_formatado")
      .like("numero_formatado", `${prefixoData}%`)
      .order("numero_formatado", { ascending: false })
      .limit(1);

    if (empresaId) query = query.eq("empresa_id", empresaId);

    const { data, error } = await query;
    if (error) throw error;

    const ultimo = data?.[0]?.numero_formatado;
    const sequencia = ultimo ? Number(String(ultimo).slice(-2)) + 1 : 1;
    return `${prefixoData}${sequencia.toString().padStart(2, "0")}`;
  };

  const salvarOrcamento = async () => {
    if (!empresaId) {
      setMensagem("Empresa não encontrada para salvar o orçamento.");
      return;
    }
    if (itens.length === 0) {
      setMensagem("Adicione pelo menos um projeto antes de salvar.");
      return;
    }

    try {
      setSalvando(true);
      setMensagem("");
      const numeroFinal = editId && numeroOrcamento && numeroOrcamento !== "Novo orçamento"
        ? numeroOrcamento
        : await gerarNumeroOrcamento();
      const payload = {
        numero_formatado: numeroFinal,
        cliente_nome: cliente || "Consumidor",
        obra_referencia: obra || "Projetos",
        itens: {
          tipo: "orcamento_projetos",
          cliente,
          obra,
          projetos: itens,
          resumo: totais,
        },
        valor_total: Number(totais.valor || 0),
        metragem_total: 0,
        peso_total: 0,
        empresa_id: empresaId,
        theme_color: theme.menuIconColor || "#07385a",
      };

      const { error } = editId
        ? await supabase.from("orcamentos").update(payload).eq("id", editId)
        : await supabase.from("orcamentos").insert([payload]);
      if (error) throw error;

      setNumeroOrcamento(numeroFinal);
      setMensagem(`Orçamento ${numeroFinal} salvo com sucesso.`);
      router.push(`/admin/relatorio.orcamento?filtro=${encodeURIComponent(numeroFinal)}`);
    } catch (erro) {
      const texto = erro instanceof Error ? erro.message : "Erro desconhecido";
      setMensagem(`Não foi possível salvar o orçamento. ${texto}`);
    } finally {
      setSalvando(false);
    }
  };

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
            className="rounded-[2rem] border bg-white p-6 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.32)] md:p-8"
            style={{ borderColor: `${theme.menuBackgroundColor}1A` }}
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: theme.menuBackgroundColor }}>
                  Composição do orçamento
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl" style={{ color: theme.contentTextLightBg }}>
                  Projetos da mesma obra
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 opacity-70" style={{ color: theme.contentTextLightBg }}>
                  Cada projeto enviado pelos cálculos entra aqui como um item do mesmo cliente, pronto para revisar, imprimir e depois salvar como orçamento único.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <ResumoCard icon={<Layers3 size={22} />} label="Projetos" value={String(totais.projetos)} />
                <ResumoCard icon={<Layers3 size={22} />} label="m²" value={`${numeroDecimal(totais.area)} m²`} />
                <ResumoCard icon={<Plus size={22} />} label="Peças" value={String(totais.pecas)} />
                <ResumoCard icon={<FileDown size={22} />} label="Total" value={moeda(totais.valor)} />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm" style={{ borderColor: `${theme.menuBackgroundColor}18` }}>
            <div className="grid gap-4 xl:grid-cols-[0.75fr_1fr_1fr_auto] xl:items-end">
              <Field label="Nº orçamento">
                <input
                  value={numeroOrcamento}
                  onChange={(e) => setNumeroOrcamento(e.target.value)}
                  placeholder="Novo orçamento"
                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                />
              </Field>
              <Field label="Cliente">
                <input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Cliente do orçamento"
                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                />
              </Field>
              <Field label="Obra / referência">
                <input
                  value={obra}
                  onChange={(e) => setObra(e.target.value)}
                  placeholder="Ex.: Obra Centro"
                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                {itens.length > 0 ? (
                  <PDFDownloadLink
                    document={<CentralImpressaoPDF itens={itensPdf} nomeEmpresa={nomeEmpresa} logoUrl={theme.logoLightUrl || theme.logoUrl || theme.logoDarkUrl} numeroOrcamento={numeroOrcamento} cliente={cliente} obra={obra} />}
                    fileName={`composicao_projetos_${new Date().toISOString().slice(0, 10)}.pdf`}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white transition hover:brightness-95"
                    style={{ backgroundColor: theme.menuBackgroundColor }}
                  >
                    {({ loading: gerando }) => (
                      <>
                        <FileDown size={16} />
                        {gerando ? "Gerando..." : "Gerar PDF"}
                      </>
                    )}
                  </PDFDownloadLink>
                ) : (
                  <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-500">
                    <FileDown size={16} />
                    Gerar PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={salvarOrcamento}
                  disabled={salvando}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-500"
                  title="Salvar esta composição como orçamento único."
                >
                  <Save size={16} />
                  {salvando ? "Salvando..." : "Salvar orçamento"}
                </button>
                <button
                  type="button"
                  onClick={limparTudo}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <X size={16} />
                  Limpar
                </button>
              </div>
            </div>

            {mensagem ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{mensagem}</p>
            ) : null}

            <div className="mt-5 space-y-4">
              {itens.length > 0 ? (
                itens.map((item, index) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <div className="flex h-56 shrink-0 items-center justify-center rounded-2xl bg-[#f7fafc] p-4 lg:w-72">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.desenhoUrl} alt={item.projeto} className="max-h-full max-w-full object-contain" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                              Projeto {index + 1}
                            </p>
                            <h2 className="mt-1 text-xl font-normal text-[#0f2742]">
                              {nomeProjetoVisivel(item.projeto)}
                            </h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editarItem(item)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                              title="Editar projeto"
                            >
                              <PencilLine size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removerItem(item.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                              title="Remover projeto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <Field label="Largura">
                            <input
                              type="number"
                              value={item.largura}
                              onChange={(e) => atualizarItem(item.id, "largura", Number(e.target.value || 0))}
                              className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                            />
                          </Field>
                          <Field label="Altura">
                            <input
                              type="number"
                              value={item.altura}
                              onChange={(e) => atualizarItem(item.id, "altura", Number(e.target.value || 0))}
                              className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                            />
                          </Field>
                          <Field label="Quantidade">
                            <input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => atualizarItem(item.id, "quantidade", Number(e.target.value || 0))}
                              className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                            />
                          </Field>
                          <Field label="Modo">
                            <select
                              value={item.modo}
                              onChange={(e) => atualizarItem(item.id, "modo", e.target.value)}
                              className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                            >
                              <option>Kit</option>
                              <option>Barra</option>
                            </select>
                          </Field>
                          <Field label="Cor do perfil / kit">
                            <input
                              value={item.corPerfil || item.corKit || ""}
                              onChange={(e) => atualizarItem(item.id, "corPerfil", e.target.value)}
                              className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                            />
                          </Field>
                          <Field label="Vidro">
                            <input
                              value={item.vidro || ""}
                              onChange={(e) => atualizarItem(item.id, "vidro", e.target.value)}
                              className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                            />
                          </Field>
                          {!(ehJanelaCorrer4Folhas(item.projeto) || ehJanelaCorrer2Folhas(item.projeto)) ? (
                            <Field label="Trilho">
                              <input
                                value={item.trilho || ""}
                                onChange={(e) => atualizarItem(item.id, "trilho", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {!(ehJanelaCorrer4Folhas(item.projeto) || ehJanelaCorrer2Folhas(item.projeto)) ? (
                            <Field label="Puxador">
                              <input
                                value={formatarPuxador(item.puxador, item.tamanhoPuxador)}
                                onChange={(e) => atualizarItem(item.id, "puxador", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          <Field label="Trinco">
                            <input
                              value={item.trinco || ""}
                              onChange={(e) => atualizarItem(item.id, "trinco", e.target.value)}
                              className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                            />
                          </Field>
                          <Field label="Valor do projeto">
                            <input
                              value={numeroDecimal(item.valorTotal || 0)}
                              onChange={(e) => atualizarItem(item.id, "valorTotal", parseNumero(e.target.value))}
                              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-bold text-slate-600">Nenhum projeto na composição.</p>
                  <p className="mt-1 text-sm text-slate-500">Abra um cálculo de projeto e clique em PDF + para enviar o item para cá.</p>
                </div>
              )}
            </div>

            {itens.length > 0 ? (
              <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
                <TotalResumo label="Quantidade de vão" value={String(totais.projetos)} />
                <TotalResumo label="Quantidade de peças" value={String(totais.pecas)} />
                <TotalResumo label="M² total" value={`${numeroDecimal(totais.area)} m²`} />
                <TotalResumo label="Valor total do orçamento" value={moeda(totais.valor)} strong />
              </div>
            ) : null}
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

function TotalResumo({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg text-[#0f2742] ${strong ? "font-black" : "font-normal"}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}



