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
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
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
  pecasDivisao?: number;
  origemRota?: string;
  materiais?: ProjetoIndividualMaterial[];
};

export type OtimizacaoPerfil = {
  codigo: string;
  descricao: string;
  comprimentoBarra: number;
  barras: number[][];
  totalCortes: number;
  barrasOriginais: number;
  valorUnitario: number;
  valorOriginal: number;
  valorOtimizado: number;
};

const CENTRAL_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_CLIENTE_KEY = "glasscode:central-impressao:cliente";
const CENTRAL_OBRA_KEY = "glasscode:central-impressao:obra";
const CENTRAL_NUMERO_KEY = "glasscode:central-impressao:numero";
const CENTRAL_ORCAMENTO_ID_KEY = "glasscode:central-impressao:orcamento-id";
const CENTRAL_USAR_OTIMIZACAO_KEY = "glasscode:central-impressao:usar-otimizacao";
const CENTRAL_IMPRIMIR_OTIMIZACAO_KEY = "glasscode:central-impressao:imprimir-otimizacao";

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
const ehFixos = (projeto?: string) => /fixos|fixo/i.test(String(projeto || ""));
const ehPma2f = (projeto?: string) => /pma2f|m[aã]o amiga 2/i.test(String(projeto || ""));

const nomeProjetoVisivel = (projeto?: string) => {
  if (projeto === "PFV1F - KIT") return "Porta de correr atrás do Vão - 1 folha";
  if (projeto === "PFV2F - KIT") return "Porta de correr atrás do vão - 2 folhas";
  if (projeto === "PC2F - KIT") return "Porta de correr 2 folhas";
  if (projeto === "PC4F - KIT") return "Porta de correr 4 folhas";
  if (projeto === "JC4F - KIT") return "Janela de correr 4 folhas";
  if (projeto === "JC2F - KIT") return "Janela de correr 2 folhas";
  if (projeto === "PG - 1 folha") return "Porta de giro - 1 folha";
  if (ehFixos(projeto)) return "Fixos";
  if (ehPma2f(projeto)) return "Mão Amiga 2 folhas";
  return projeto || "Projeto";
};

const multiplicadorPecasProjeto = (projeto?: string, item?: Pick<ProjetoComposicao, "pecasDivisao" | "tamanhoPuxador">) => {
  const texto = String(projeto || "").toLowerCase();
  if (texto.includes("fixos") || texto.includes("fixo")) {
    return Math.min(6, Math.max(1, Number(item?.pecasDivisao || item?.tamanhoPuxador || 1)));
  }
  if (texto.includes("pma2f") || texto.includes("mao amiga 2") || texto.includes("mão amiga 2")) return 2;
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

const extrairCodigoPerfil = (material: ProjetoIndividualMaterial) =>
  String(material.codigoPerfil || material.descricao.split(" - ")[0] || "").trim().toUpperCase();

const modoProjetoEhBarra = (item: Pick<ProjetoComposicao, "modo">) =>
  String(item.modo || "").toLowerCase().includes("barra");

const calcularValorPerfisOriginaisItem = (item: ProjetoComposicao) =>
  item.materiais?.reduce((total, material) => {
    if (!String(material.unidade || "").toLowerCase().includes("barra") || !Array.isArray(material.cortes) || material.cortes.length === 0) {
      return total;
    }
    return total + (Number(material.qtd || 0) * Number(material.valorUnitario || 0));
  }, 0) || 0;

const calcularAreaVidrosItem = (item: ProjetoComposicao) => {
  const areaMateriais = item.materiais?.reduce((total, material) => {
    const descricao = String(material.descricao || "").toLowerCase();
    const unidade = String(material.unidade || "").toLowerCase();
    if (!descricao.includes("vidro") && !unidade.includes("m2")) return total;
    return total + Number(material.qtd || 0);
  }, 0) || 0;

  if (areaMateriais > 0) return areaMateriais;

  return (Number(item.largura || 0) * Number(item.altura || 0) * Number(item.quantidade || 0)) / 1_000_000;
};

const otimizarCortes = (cortesOriginais: number[], comprimentoBarra: number) => {
  const cortes = cortesOriginais
    .map((corte) => Math.ceil(Number(corte || 0)))
    .filter((corte) => corte > 0)
    .sort((a, b) => b - a);

  const barras: number[][] = [];

  cortes.forEach((corte) => {
    let melhorIndice = -1;
    let menorSobra = Number.POSITIVE_INFINITY;

    barras.forEach((barra, index) => {
      const usado = barra.reduce((soma, valor) => soma + valor, 0);
      const sobra = comprimentoBarra - usado - corte;
      if (sobra >= 0 && sobra < menorSobra) {
        melhorIndice = index;
        menorSobra = sobra;
      }
    });

    if (melhorIndice >= 0) {
      barras[melhorIndice].push(corte);
    } else {
      barras.push([corte]);
    }
  });

  return barras;
};

const calcularOtimizacaoPerfis = (itens: ProjetoComposicao[]): OtimizacaoPerfil[] => {
  const grupos = new Map<string, { codigo: string; descricao: string; comprimentoBarra: number; cortes: number[]; barrasOriginais: number; valorUnitario: number }>();

  itens.forEach((item) => {
    if (!modoProjetoEhBarra(item)) return;

    item.materiais?.forEach((material) => {
      if (!String(material.unidade || "").toLowerCase().includes("barra") || !Array.isArray(material.cortes) || material.cortes.length === 0) {
        return;
      }

      const codigo = extrairCodigoPerfil(material);
      const descricao = String(material.descricao || codigo).toUpperCase();
      const comprimentoBarra = Number(material.comprimentoBarra || 6000);
      const chave = `${codigo}|${descricao}|${comprimentoBarra}`;
      const grupo = grupos.get(chave) || { codigo, descricao, comprimentoBarra, cortes: [], barrasOriginais: 0, valorUnitario: Number(material.valorUnitario || 0) };

      grupo.cortes.push(...material.cortes.map((corte) => Number(corte || 0)));
      grupo.barrasOriginais += Number(material.qtd || 0);
      if (!grupo.valorUnitario && material.valorUnitario) grupo.valorUnitario = Number(material.valorUnitario || 0);
      grupos.set(chave, grupo);
    });
  });

  return Array.from(grupos.values())
    .map((grupo) => {
      const barras = otimizarCortes(grupo.cortes, grupo.comprimentoBarra);
      return {
        codigo: grupo.codigo,
        descricao: grupo.descricao,
        comprimentoBarra: grupo.comprimentoBarra,
        barras,
        totalCortes: grupo.cortes.length,
        barrasOriginais: grupo.barrasOriginais,
        valorUnitario: grupo.valorUnitario,
        valorOriginal: grupo.barrasOriginais * grupo.valorUnitario,
        valorOtimizado: barras.length * grupo.valorUnitario,
      };
    })
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
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
  const [usarOtimizacao, setUsarOtimizacao] = useState(false);
  const [imprimirOtimizacao, setImprimirOtimizacao] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      if (editId) {
        const idRascunho = window.localStorage.getItem(CENTRAL_ORCAMENTO_ID_KEY);
        const listaRascunho = carregarLista();

        if (idRascunho === editId && listaRascunho.length > 0) {
          setItens(listaRascunho);
          setNumeroOrcamento(window.localStorage.getItem(CENTRAL_NUMERO_KEY) || "Novo Orçamento");
          setCliente(window.localStorage.getItem(CENTRAL_CLIENTE_KEY) || listaRascunho[0]?.cliente || "");
          setObra(window.localStorage.getItem(CENTRAL_OBRA_KEY) || "");
          setUsarOtimizacao(window.localStorage.getItem(CENTRAL_USAR_OTIMIZACAO_KEY) === "1");
          setImprimirOtimizacao(window.localStorage.getItem(CENTRAL_IMPRIMIR_OTIMIZACAO_KEY) === "1");
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
            ? data.itens as { projetos?: ProjetoComposicao[]; cliente?: string; obra?: string; otimizacaoPerfis?: OtimizacaoPerfil[]; resumo?: { otimizacaoAplicada?: boolean } }
            : null;

          setItens(Array.isArray(itensSalvos?.projetos) ? itensSalvos.projetos : []);
          setNumeroOrcamento(data.numero_formatado || "Novo Orçamento");
          setCliente(data.cliente_nome || itensSalvos?.cliente || "");
          setObra(data.obra_referencia || itensSalvos?.obra || "");
          setUsarOtimizacao(Boolean(itensSalvos?.resumo?.otimizacaoAplicada));
          setImprimirOtimizacao(Array.isArray(itensSalvos?.otimizacaoPerfis) && itensSalvos.otimizacaoPerfis.length > 0);
          window.localStorage.setItem(CENTRAL_ORCAMENTO_ID_KEY, editId);
          setRascunhoCarregado(true);
          return;
        }
      }

      const lista = carregarLista();
      setItens(lista);
      setNumeroOrcamento(window.localStorage.getItem(CENTRAL_NUMERO_KEY) || "Novo Orçamento");
      setCliente(window.localStorage.getItem(CENTRAL_CLIENTE_KEY) || lista[0]?.cliente || "");
      setObra(window.localStorage.getItem(CENTRAL_OBRA_KEY) || "");
      setUsarOtimizacao(window.localStorage.getItem(CENTRAL_USAR_OTIMIZACAO_KEY) === "1");
      setImprimirOtimizacao(window.localStorage.getItem(CENTRAL_IMPRIMIR_OTIMIZACAO_KEY) === "1");
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
    window.localStorage.setItem(CENTRAL_USAR_OTIMIZACAO_KEY, usarOtimizacao ? "1" : "0");
    window.localStorage.setItem(CENTRAL_IMPRIMIR_OTIMIZACAO_KEY, imprimirOtimizacao ? "1" : "0");
    if (editId) {
      window.localStorage.setItem(CENTRAL_ORCAMENTO_ID_KEY, editId);
    }
  }, [cliente, editId, imprimirOtimizacao, itens, numeroOrcamento, obra, rascunhoCarregado, usarOtimizacao]);

  const otimizacaoPerfis = useMemo(() => calcularOtimizacaoPerfis(itens), [itens]);
  const otimizacaoAplicada = usarOtimizacao && otimizacaoPerfis.length > 0;
  const otimizacaoPerfisPdf = otimizacaoAplicada && imprimirOtimizacao ? otimizacaoPerfis : [];

  const totais = useMemo(() => {
    const base = itens.reduce(
      (acc, item) => {
        acc.projetos += 1;
        acc.pecas += Number(item.quantidade || 0) * multiplicadorPecasProjeto(item.projeto, item);
        acc.area += calcularAreaVidrosItem(item);
        acc.valorOriginal += Number(item.valorTotal || 0);
        return acc;
      },
      { projetos: 0, pecas: 0, area: 0, valorOriginal: 0 }
    );

    const valorPerfisOriginais = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOriginal || 0), 0);
    const valorPerfisOtimizados = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOtimizado || 0), 0);
    const economiaPerfis = Math.max(0, valorPerfisOriginais - valorPerfisOtimizados);
    const valor = otimizacaoAplicada
      ? base.valorOriginal - valorPerfisOriginais + valorPerfisOtimizados
      : base.valorOriginal;

    return {
      ...base,
      valor,
      valorPerfisOriginais,
      valorPerfisOtimizados,
      economiaPerfis,
      otimizacaoAplicada,
    };
  }, [itens, otimizacaoAplicada, otimizacaoPerfis]);

  const valoresRateadosPorItem = useMemo(() => {
    const mapa = new Map<string, number>();
    const valorPerfisOriginais = otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOriginal || 0), 0);
    const economiaPerfis = Math.max(0, valorPerfisOriginais - otimizacaoPerfis.reduce((total, perfil) => total + Number(perfil.valorOtimizado || 0), 0));

    itens.forEach((item) => {
      const valorOriginal = Number(item.valorTotal || 0);
      if (!otimizacaoAplicada || !modoProjetoEhBarra(item) || valorPerfisOriginais <= 0 || economiaPerfis <= 0) {
        mapa.set(item.id, valorOriginal);
        return;
      }

      const participacao = calcularValorPerfisOriginaisItem(item) / valorPerfisOriginais;
      mapa.set(item.id, Math.max(0, valorOriginal - (economiaPerfis * participacao)));
    });

    return mapa;
  }, [itens, otimizacaoAplicada, otimizacaoPerfis]);

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
      tamanhoPuxador: item.tamanhoPuxador,
      trinco: item.trinco,
      pecasDivisao: item.pecasDivisao || (ehFixos(item.projeto) ? Number(item.tamanhoPuxador || 1) : undefined),
      valorTotal: valoresRateadosPorItem.get(item.id) ?? Number(item.valorTotal || 0),
      materiais: item.materiais,
    })),
    [cliente, itens, valoresRateadosPorItem]
  );

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
      : projetoTexto.includes("fixos") || projetoTexto.includes("fixo")
        ? "/fixos"
      : projetoTexto.includes("pma2f") || projetoTexto.includes("mao amiga 2") || projetoTexto.includes("mão amiga 2")
        ? "/pma2f"
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
    window.localStorage.removeItem(CENTRAL_USAR_OTIMIZACAO_KEY);
    window.localStorage.removeItem(CENTRAL_IMPRIMIR_OTIMIZACAO_KEY);
    setUsarOtimizacao(false);
    setImprimirOtimizacao(false);
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
      setMensagem("Empresa não encontrada para salvar o Orçamento.");
      return;
    }
    if (itens.length === 0) {
      setMensagem("Adicione pelo menos um projeto antes de salvar.");
      return;
    }

    try {
      setSalvando(true);
      setMensagem("");
      const numeroFinal = editId && numeroOrcamento && numeroOrcamento !== "Novo Orçamento"
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
          projetosOtimizados: otimizacaoAplicada ? itensPdf : undefined,
          resumo: totais,
          otimizacaoPerfis: otimizacaoPerfisPdf,
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
      setMensagem(`Não foi possível salvar o Orçamento. ${texto}`);
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
                  Composição do Orçamento
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl" style={{ color: theme.contentTextLightBg }}>
                  Projetos da mesma obra
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 opacity-70" style={{ color: theme.contentTextLightBg }}>
                  Cada projeto enviado pelos cálculos entra aqui como um item do mesmo cliente, pronto para revisar, imprimir e depois salvar como Orçamento único.
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
              <Field label="Nº Orçamento">
                <input
                  value={numeroOrcamento}
                  onChange={(e) => setNumeroOrcamento(e.target.value)}
                  placeholder="Novo Orçamento"
                  className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                />
              </Field>
              <Field label="Cliente">
                <input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Cliente do Orçamento"
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
                    document={<CentralImpressaoPDF itens={itensPdf} nomeEmpresa={nomeEmpresa} logoUrl={theme.logoLightUrl || theme.logoUrl || theme.logoDarkUrl} numeroOrcamento={numeroOrcamento} cliente={cliente} obra={obra} otimizacaoPerfis={otimizacaoPerfisPdf} />}
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
                  title="Salvar esta composição como Orçamento único."
                >
                  <Save size={16} />
                  {salvando ? "Salvando..." : "Salvar Orçamento"}
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
                          {ehFixos(item.projeto) ? (
                            <Field label="Divisão">
                              <input
                                value={`${Math.min(6, Math.max(1, Number(item.pecasDivisao || item.tamanhoPuxador || 1)))} peça(s)`}
                                readOnly
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {!(ehFixos(item.projeto) || ehJanelaCorrer4Folhas(item.projeto) || ehJanelaCorrer2Folhas(item.projeto)) ? (
                            <Field label={ehPma2f(item.projeto) ? "Projeto" : "Trilho"}>
                              <input
                                value={item.trilho || ""}
                                onChange={(e) => atualizarItem(item.id, "trilho", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {!(ehFixos(item.projeto) || ehJanelaCorrer4Folhas(item.projeto) || ehJanelaCorrer2Folhas(item.projeto)) ? (
                            <Field label="Puxador">
                              <input
                                value={formatarPuxador(item.puxador, item.tamanhoPuxador)}
                                onChange={(e) => atualizarItem(item.id, "puxador", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          {!ehFixos(item.projeto) ? (
                            <Field label={ehPma2f(item.projeto) ? "Roldana" : "Trinco"}>
                              <input
                                value={item.trinco || ""}
                                onChange={(e) => atualizarItem(item.id, "trinco", e.target.value)}
                                className="w-full bg-transparent text-sm font-normal text-slate-700 outline-none"
                              />
                            </Field>
                          ) : null}
                          <Field label="Valor do projeto">
                            <input
                              value={numeroDecimal(valoresRateadosPorItem.get(item.id) ?? Number(item.valorTotal || 0))}
                              onChange={(e) => atualizarItem(item.id, "valorTotal", parseNumero(e.target.value))}
                              readOnly={otimizacaoAplicada}
                              className={`w-full bg-transparent text-sm font-bold text-slate-700 outline-none ${otimizacaoAplicada ? "cursor-default" : ""}`}
                            />
                            {otimizacaoAplicada ? (
                              <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                                Valor com otimização rateada
                              </p>
                            ) : null}
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
                <TotalResumo label="Valor total do Orçamento" value={moeda(totais.valor)} strong />
              </div>
            ) : null}

            {otimizacaoPerfis.length > 0 ? (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-[#0f2742]">Relação de materiais otimizada</h2>
                    <p className="text-sm text-slate-500">Cortes agrupados por perfil para aproveitamento em barras. Marque para gravar e imprimir essa otimização no Orçamento.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#0f2742] shadow-sm">
                      <input
                        type="checkbox"
                        checked={usarOtimizacao}
                        onChange={(event) => {
                          setUsarOtimizacao(event.target.checked);
                          if (!event.target.checked) setImprimirOtimizacao(false);
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Aplicar otimização no valor
                    </label>
                    <label className={`inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black shadow-sm ${usarOtimizacao ? "cursor-pointer text-[#0f2742]" : "cursor-not-allowed text-slate-400"}`}>
                      <input
                        type="checkbox"
                        checked={usarOtimizacao && imprimirOtimizacao}
                        onChange={(event) => setImprimirOtimizacao(event.target.checked)}
                        disabled={!usarOtimizacao}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Sair relação otimizada no PDF
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <TotalResumo label="Barras sem otimização" value={String(otimizacaoPerfis.reduce((total, perfil) => total + perfil.barrasOriginais, 0))} />
                  <TotalResumo label="Barras otimizadas" value={String(otimizacaoPerfis.reduce((total, perfil) => total + perfil.barras.length, 0))} />
                  <TotalResumo label="Economia estimada" value={moeda(totais.economiaPerfis)} strong={otimizacaoAplicada} />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {otimizacaoPerfis.map((perfil) => (
                    <article key={`${perfil.codigo}-${perfil.descricao}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{perfil.codigo}</p>
                          <h3 className="mt-1 text-sm font-black text-[#0f2742]">{perfil.descricao}</h3>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {perfil.barrasOriginais} → {perfil.barras.length} barras
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Valor: {moeda(perfil.valorOriginal)} → {moeda(perfil.valorOtimizado)}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {perfil.barras.map((barra, index) => {
                          const usado = barra.reduce((soma, corte) => soma + corte, 0);
                          return (
                            <p key={`${perfil.codigo}-${index}`} className="text-xs font-semibold text-slate-600">
                              Barra {index + 1}: {barra.join(" + ")} = {usado} mm
                            </p>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
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



