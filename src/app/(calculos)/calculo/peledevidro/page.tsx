//app/calculo/peledevidro/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Calculator, Grid3X3, Ruler, SquareStack, Package2, Printer, Save, Search, FilePlus2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { gerarNumeroOrcamentoPadrao } from "@/utils/orcamentoNumero";
import { formatarPreco } from "@/utils/formatarPreco";
import { calcularPeleDeVidro } from "@/utils/pele-de-vidro-calc";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PeleDeVidroPDF } from "@/app/relatorios/peledevidro/PeleDeVidroPDF";
import type { CentralImpressaoItem } from "@/app/relatorios/centralimpressao/CentralImpressaoPDF";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";

// Função utilitária para normalizar textos para comparação (remove acentos, deixa minúsculo, trim)
const normalizarTextoComparacao = (texto?: string | null) =>
  (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

type ClientePV = {
  id: string;
  nome: string;
  grupo_preco_id?: string | null;
};

type Vidro = {
  id: string;
  nome: string;
  espessura?: string | null;
  tipo?: string | null;
  preco: number;
};

type PrecoEspecial = {
  vidro_id: string;
  grupo_preco_id: string;
  preco: number;
};

type PeleDeVidroDraft = {
  clienteId: string;
  buscaCliente: string;
  obra: string;
  larguraVaoMm: string;
  alturaVaoMm: string;
  quadrosHorizontal: string;
  quadrosVertical: string;
  quantidadeLajes: string;
  quantidadeFachadas: string;
  quadrosFixos: string;
  quadrosMoveis: string;
  buscaVidro: string;
  vidroId: string;
};

const PV_DRAFT_KEY = "pele-de-vidro-draft";
const CENTRAL_IMPRESSAO_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_IMPRESSAO_CLIENTE_KEY = "glasscode:central-impressao:cliente";
const CENTRAL_IMPRESSAO_OBRA_KEY = "glasscode:central-impressao:obra";

type PeleDeVidroCentralItem = CentralImpressaoItem & {
  origemRota?: string;
  centralDados?: PeleDeVidroDraft;
};

const formatarNumero = (valor: number, casasDecimais = 3) =>
  valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casasDecimais,
  });

const montarDescricaoVidro = (vidro?: Vidro | null) => {
  if (!vidro) return "Vidro não selecionado";
  return [vidro.nome, vidro.espessura, vidro.tipo]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" - ");
};

export default function CalculoPeleDeVidroPage() {
  const { theme } = useTheme();
  const { user, empresaId, nomeEmpresa, loading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");
  const centralItemId = searchParams.get("centralItem");
  const returnTo = searchParams.get("returnTo") || "/central-impressao";

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  const [listaClientes, setListaClientes] = useState<ClientePV[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [clienteIndex, setClienteIndex] = useState(-1);
  const [obra, setObra] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState("");
  const [editNumeroFormatado, setEditNumeroFormatado] = useState("");
  const editCarregadoRef = useRef(false);

  const [larguraVaoMm, setLarguraVaoMm] = useState("");
  const [alturaVaoMm, setAlturaVaoMm] = useState("");
  const [quadrosHorizontal, setQuadrosHorizontal] = useState("");
  const [quadrosVertical, setQuadrosVertical] = useState("");
  const [quantidadeLajes, setQuantidadeLajes] = useState("");
  const [quantidadeFachadas, setQuantidadeFachadas] = useState("");
  const [quadrosFixos, setQuadrosFixos] = useState("");
  const [quadrosMoveis, setQuadrosMoveis] = useState("");
  const [vidros, setVidros] = useState<Vidro[]>([]);
  const [buscaVidro, setBuscaVidro] = useState("");
  const [vidroId, setVidroId] = useState("");
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoEspecial[]>([]);
  const [carregandoInsumos, setCarregandoInsumos] = useState(true);
  const [draftHidratado, setDraftHidratado] = useState(false);

  const chaveDraft = useMemo(
    () => `${PV_DRAFT_KEY}:${empresaId || "global"}`,
    [empresaId]
  );



  // Hidratar draft do localStorage
  useEffect(() => {
    setDraftHidratado(false);
    if (typeof window === "undefined" || editId || centralItemId) {
      setDraftHidratado(true);
      return;
    }
    try {
      const bruto = window.localStorage.getItem(chaveDraft);
      if (!bruto) { setDraftHidratado(true); return; }
      const draft = JSON.parse(bruto) as Partial<PeleDeVidroDraft>;
      if (typeof draft.clienteId === "string") setClienteId(draft.clienteId);
      if (typeof draft.buscaCliente === "string") setBuscaCliente(draft.buscaCliente);
      if (typeof draft.obra === "string") setObra(draft.obra);
      if (typeof draft.larguraVaoMm === "string") setLarguraVaoMm(draft.larguraVaoMm);
      if (typeof draft.alturaVaoMm === "string") setAlturaVaoMm(draft.alturaVaoMm);
      if (typeof draft.quadrosHorizontal === "string") setQuadrosHorizontal(draft.quadrosHorizontal);
      if (typeof draft.quadrosVertical === "string") setQuadrosVertical(draft.quadrosVertical);
      if (typeof draft.quantidadeLajes === "string") setQuantidadeLajes(draft.quantidadeLajes);
      if (typeof draft.quantidadeFachadas === "string") setQuantidadeFachadas(draft.quantidadeFachadas);
      if (typeof draft.quadrosFixos === "string") setQuadrosFixos(draft.quadrosFixos);
      if (typeof draft.quadrosMoveis === "string") setQuadrosMoveis(draft.quadrosMoveis);
      if (typeof draft.buscaVidro === "string") setBuscaVidro(draft.buscaVidro);
      if (typeof draft.vidroId === "string") setVidroId(draft.vidroId);
    } catch {
      console.warn("Não foi possível restaurar rascunho da pele de vidro");
    } finally {
      setDraftHidratado(true);
    }
  }, [centralItemId, chaveDraft, editId]);

  // Persistir draft
  useEffect(() => {
    if (!draftHidratado || typeof window === "undefined" || editId || centralItemId) return;
    const draft: PeleDeVidroDraft = {
      clienteId, buscaCliente, obra, larguraVaoMm, alturaVaoMm,
      quadrosHorizontal, quadrosVertical, quantidadeLajes, quantidadeFachadas,
      quadrosFixos, quadrosMoveis, buscaVidro, vidroId,
    };
    window.localStorage.setItem(chaveDraft, JSON.stringify(draft));
  }, [clienteId, buscaCliente, obra, larguraVaoMm, alturaVaoMm, quadrosHorizontal, quadrosVertical, quantidadeLajes, quantidadeFachadas, quadrosFixos, quadrosMoveis, buscaVidro, vidroId, chaveDraft, draftHidratado, editId, centralItemId]);

  // Carregar insumos
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      if (!empresaId) {
        if (ativo) { setVidros([]); setCarregandoInsumos(false); }
        return;
      }
      setCarregandoInsumos(true);
      const [resVidros, resClientes, resPrecos] = await Promise.all([
        supabase.from("vidros").select("id, nome, espessura, tipo, preco").eq("empresa_id", empresaId).order("nome", { ascending: true }),
        supabase.from("clientes").select("id, nome, grupo_preco_id").eq("empresa_id", empresaId).order("nome", { ascending: true }),
        supabase.from("vidro_precos_grupos").select("vidro_id, grupo_preco_id, preco").eq("empresa_id", empresaId),
      ]);
      if (!ativo) return;
      setVidros((resVidros.data || []) as Vidro[]);
      if (resClientes.data) setListaClientes(resClientes.data as ClientePV[]);
      if (resPrecos.data) setPrecosEspeciais(resPrecos.data as PrecoEspecial[]);
      setCarregandoInsumos(false);
    };
    carregar();
    return () => { ativo = false; };
  }, [empresaId]);

  // Carregar orçamento para edição
  const carregarOrcamentoParaEdicao = useCallback(async (id: string) => {
    try {
      const { data: orc, error } = await supabase
        .from("orcamentos").select("*").eq("id", id).single();
      if (error || !orc) return;
      const itens = orc.itens as Record<string, unknown> | null;
      if (!itens) return;
      setBuscaCliente(orc.cliente_nome || "");
      setObra(orc.obra_referencia || "");
      setEditNumeroFormatado(orc.numero_formatado || "");
      if (itens.larguraVaoMm != null) setLarguraVaoMm(String(itens.larguraVaoMm));
      if (itens.alturaVaoMm != null) setAlturaVaoMm(String(itens.alturaVaoMm));
      if (itens.quadrosHorizontal != null) setQuadrosHorizontal(String(itens.quadrosHorizontal));
      if (itens.quadrosVertical != null) setQuadrosVertical(String(itens.quadrosVertical));
      if (itens.quantidadeLajes != null) setQuantidadeLajes(String(itens.quantidadeLajes));
      if (itens.quantidadeFachadas != null) setQuantidadeFachadas(String(itens.quantidadeFachadas));
      if (itens.quadrosFixos != null) setQuadrosFixos(String(itens.quadrosFixos));
      if (itens.quadrosMoveis != null) setQuadrosMoveis(String(itens.quadrosMoveis));
      if (itens.vidroId) setVidroId(String(itens.vidroId));
      const clienteEncontrado = listaClientes.find((c) => c.nome === orc.cliente_nome);
      if (clienteEncontrado) setClienteId(String(clienteEncontrado.id));
    } catch (err) {
      console.error("Erro ao carregar orçamento para edição:", err);
    }
  }, [listaClientes]);

  useEffect(() => {
    if (editId && !carregandoInsumos && listaClientes.length > 0 && !editCarregadoRef.current) {
      carregarOrcamentoParaEdicao(editId);
      editCarregadoRef.current = true;
    }
  }, [editId, carregandoInsumos, listaClientes.length, carregarOrcamentoParaEdicao]);

  useEffect(() => {
    if (!centralItemId || typeof window === "undefined") return;

    try {
      const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = salvo ? (JSON.parse(salvo) as PeleDeVidroCentralItem[]) : [];
      const item = lista.find((projeto) => projeto.id === centralItemId);
      const dados = item?.centralDados;

      if (!dados) {
        setDraftHidratado(true);
        return;
      }

      setClienteId(dados.clienteId || "");
      setBuscaCliente(dados.buscaCliente || item?.cliente || "");
      setObra(dados.obra || "");
      setLarguraVaoMm(dados.larguraVaoMm || "");
      setAlturaVaoMm(dados.alturaVaoMm || "");
      setQuadrosHorizontal(dados.quadrosHorizontal || "");
      setQuadrosVertical(dados.quadrosVertical || "");
      setQuantidadeLajes(dados.quantidadeLajes || "");
      setQuantidadeFachadas(dados.quantidadeFachadas || "");
      setQuadrosFixos(dados.quadrosFixos || "");
      setQuadrosMoveis(dados.quadrosMoveis || "");
      setBuscaVidro(dados.buscaVidro || item?.vidro || "");
      setVidroId(dados.vidroId || "");
      setDraftHidratado(true);
    } catch (erro) {
      console.warn("Não foi possível restaurar a pele de vidro da central:", erro);
      setDraftHidratado(true);
    }
  }, [centralItemId]);

  useEffect(() => {
    if (!carregandoInsumos && !vidros.length && vidroId) setVidroId("");
  }, [carregandoInsumos, vidroId, vidros]);

  const vidroSelecionado = useMemo(
    () => vidros.find((v) => v.id === vidroId) || null,
    [vidroId, vidros]
  );

  const vidrosFiltrados = useMemo(() => {
    const termo = buscaVidro.trim().toLowerCase();
    if (!termo) return vidros;
    return vidros.filter((v) =>
      [v.nome, v.espessura, v.tipo, String(v.preco)].filter(Boolean).join(" ").toLowerCase().includes(termo)
    );
  }, [buscaVidro, vidros]);

  // Valores numéricos
  const larguraNum = Math.max(Number(larguraVaoMm) || 0, 0);
  const alturaNum = Math.max(Number(alturaVaoMm) || 0, 0);
  const qH = Math.max(Math.floor(Number(quadrosHorizontal) || 0), 0);
  const qV = Math.max(Math.floor(Number(quadrosVertical) || 0), 0);
  const lajes = Math.max(Math.floor(Number(quantidadeLajes) || 0), 0);
  const fachadas = Math.max(Math.floor(Number(quantidadeFachadas) || 0), 0);
  const fixos = Math.max(Math.floor(Number(quadrosFixos) || 0), 0);
  const moveis = Math.max(Math.floor(Number(quadrosMoveis) || 0), 0);

  const precoVidroM2Efetivo = useMemo(() => {
    if (!vidroSelecionado) return 0;
    const clienteObj = listaClientes.find((c) => String(c.id) === String(clienteId));
    const grupoId = clienteObj?.grupo_preco_id;
    if (grupoId) {
      const especial = precosEspeciais.find(
        (p) => String(p.vidro_id) === String(vidroSelecionado.id) && String(p.grupo_preco_id) === String(grupoId)
      );
      if (especial) return Number(especial.preco);
    }
    return Number(vidroSelecionado.preco) || 0;
  }, [clienteId, listaClientes, precosEspeciais, vidroSelecionado]);

  // Buscar perfis e acessórios do banco
  const [perfisDb, setPerfisDb] = useState<any[]>([]);
  const [acessoriosDb, setAcessoriosDb] = useState<any[]>([]);

  const nomeArquivoPDF = `Orçamento ${editNumeroFormatado || "PV"} ${(buscaCliente || "Cliente").replace(/[\\/:*?"<>|]/g, "")}.pdf`;


  useEffect(() => {
    if (!empresaId) return;
    const buscarPerfisEAcessorios = async () => {
      const { data: perfisData } = await supabase.from("perfis").select("*").eq("empresa_id", empresaId);
      setPerfisDb(perfisData || []);
      const { data: acessoriosData } = await supabase.from("ferragens").select("*").eq("empresa_id", empresaId);
      setAcessoriosDb(acessoriosData || []);
    };
    buscarPerfisEAcessorios();
  }, [empresaId]);

  // Interligar perfis e acessórios com os cadastros do banco
  const resultado = useMemo(() => {
    
    const res = calcularPeleDeVidro({
      larguraVaoMm: larguraNum,
      alturaVaoMm: alturaNum,
      quadrosHorizontal: qH,
      quadrosVertical: qV,
      quantidadeLajes: lajes,
      quantidadeFachadas: fachadas,
      quadrosFixos: fixos,
      quadrosMoveis: moveis,
      precoVidroM2: precoVidroM2Efetivo,
      perfisDb,
      acessoriosDb,
    });

    // Perfis: buscar dados completos do cadastro
    const perfisCompletos = res.perfis.map((p) => {
      const cadastro = perfisDb.find((db) => db.codigo === p.codigo || db.nome === p.nome);
      return {
        ...p,
        nome: cadastro?.nome || p.nome,
        codigo: cadastro?.codigo || p.codigo,
        kgmt: cadastro?.kgmt ?? p.kgmt ?? "-",
        precoBarra: cadastro?.preco_barra ?? p.precoBarra ?? 0,
        unidade: (() => {
          // Corrige unidade dos CL para 3MT
          const nome = (cadastro?.nome || p.nome || "").toLowerCase();
          if (nome.includes("cantoneira") || nome.includes("cunha")) return "3MT";
          return cadastro?.unidade ?? p.unidade ?? "6MT";
        })(),
        cadastroEncontrado: !!cadastro,
      };
    });
    // Acessórios: buscar dados completos do cadastro
    const acessoriosCompletos = res.acessorios.map((a) => {
      // Busca na tabela ferragens (acessoriosDb) pelo código ou nome
      const cadastro = acessoriosDb.find((db) =>
        db.codigo?.toLowerCase() === a.codigo?.toLowerCase() ||
        db.nome?.toLowerCase() === a.nome?.toLowerCase()
      );
      const precoUnitario = cadastro?.preco ?? a.precoUnitario ?? 0;
      const quantidade = Number(a.quantidade) || 0;
      return {
        ...a,
        nome: cadastro?.nome || a.nome,
        codigo: cadastro?.codigo || a.codigo || "-",
        unidade: cadastro?.unidade || a.unidade || "UN",
        precoUnitario,
        valorTotal: quantidade === 0 ? 0 : Number((quantidade * precoUnitario).toFixed(2)),
        cadastroEncontrado: !!cadastro,
      };
    });
    return {
      ...res,
      perfis: perfisCompletos,
      acessorios: acessoriosCompletos,
    };
  }, [larguraNum, alturaNum, qH, qV, lajes, fachadas, fixos, moveis, precoVidroM2Efetivo, perfisDb, acessoriosDb]);

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (!termo) return listaClientes;
    return listaClientes.filter((c) => c.nome?.toLowerCase().includes(termo));
  }, [buscaCliente, listaClientes]);

  const nomeClienteSelecionado = useMemo(
    () => listaClientes.find((c) => String(c.id) === String(clienteId))?.nome || "",
    [clienteId, listaClientes]
  );

  const handleSalvar = async () => {
    if (centralItemId) {
      enviarParaCentralImpressao();
      return;
    }

    if (salvando) return;
    setSalvando(true);
    setMensagemSalvo("");
    try {
      let numeroFinal = editNumeroFormatado;
      if (!editId) {
        numeroFinal = await gerarNumeroOrcamentoPadrao(supabase);
      }

      const dadosParaSalvar = {
        numero_formatado: numeroFinal,
        cliente_nome: nomeClienteSelecionado || "Consumidor",
        obra_referencia: obra || "Geral",
        itens: {
          tipo: "pele_de_vidro",
          larguraVaoMm: larguraNum,
          alturaVaoMm: alturaNum,
          quadrosHorizontal: qH,
          quadrosVertical: qV,
          quantidadeLajes: lajes,
          quantidadeFachadas: fachadas,
          quadrosFixos: fixos,
          quadrosMoveis: moveis,
          vidroId,
          vidroDescricao: montarDescricaoVidro(vidroSelecionado),
          perfis: resultado.perfis,
          acessorios: resultado.acessorios,
        },
        valor_total: totalGeral, // Usa o total corrigido da tela
        empresa_id: empresaId,
        metragem_total: resultado.areaVidro,
        peso_total: 0,
        theme_color: theme.menuIconColor || "#1e3a5a",
      };

      if (editId) {
        const { error } = await supabase.from("orcamentos").update(dadosParaSalvar).eq("id", editId);
        if (error) throw error;
        setMensagemSalvo(`Orçamento ${numeroFinal} atualizado com sucesso!`);
        setTimeout(() => router.push("/admin/relatorio.orcamento"), 1200);
      } else {
        const { error } = await supabase.from("orcamentos").insert([dadosParaSalvar]);
        if (error) throw error;
        setMensagemSalvo(`Orçamento ${numeroFinal} salvo com sucesso!`);
      }
      setTimeout(() => setMensagemSalvo(""), 4000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao salvar:", error);
      setMensagemSalvo(`Erro ao salvar: ${message}`);
      setTimeout(() => setMensagemSalvo(""), 5000);
    } finally {
      setSalvando(false);
    }
  };

 const handleNovo = () => {
  router.replace("/calculo/peledevidro");

  // Resetar edição
  setEditNumeroFormatado("");
  editCarregadoRef.current = false;

  // Cliente e obra
  setClienteId("");
  setBuscaCliente("");
  setObra("");

  // Medidas
  setLarguraVaoMm("");
  setAlturaVaoMm("");

  // Quadros
  setQuadrosHorizontal("");
  setQuadrosVertical("");

  // Quantidades
  setQuantidadeLajes("");
  setQuantidadeFachadas("");
  setQuadrosFixos("");
  setQuadrosMoveis("");

  // Vidro
  setBuscaVidro("");
  setVidroId("");

  // Mensagem
  setMensagemSalvo("");

  // Limpar rascunho
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(chaveDraft);
  }
};

  const conteudoCarregando = loading || carregandoInsumos;

  const totalPerfis = useMemo(() => {
    return resultado.perfis.reduce((acc, p) => {
      const nome = p.nome?.toLowerCase() || "";
      let codigo = p.codigo || "-";
      if (nome.includes("meia")) codigo = "FC243";
      else if (nome.includes("coluna de centro")) codigo = "FC202";
      else if (nome.includes("cadeirinha")) codigo = "FC225";
      else if (nome.includes("travessa")) codigo = "FC227";
      else if (nome.includes("perfil quadro")) codigo = "FC261";
      else if (nome.includes("cantoneira")) codigo = "CL006";
      else if (nome.includes("cunha")) codigo = "CL011";
      const cadastroCorrigido = perfisDb.find((db) => db.codigo === codigo);
      const precoBarra = cadastroCorrigido?.preco ?? p.precoBarra;
      return acc + (precoBarra > 0 ? precoBarra * p.barras : 0);
    }, 0);
  }, [resultado.perfis, perfisDb]);

  const totalAcessorios = useMemo(() => {
    return resultado.acessorios.reduce((acc, acessorio) => {

      const nome = acessorio.nome?.toLowerCase() || "";
      let codigo = acessorio.codigo || "-";
      let quantidade = acessorio.quantidade;

      if (nome.includes("presilha painel")) {
        codigo = "PRE950";
      } else if (nome.includes("presilha coluna")) {
        codigo = "PRE951";
      } else if (nome.includes("fecho max-ar")) {
        codigo = "FEC152D";
      } else if (nome.includes("braço max")) {
        codigo = "BRA589";
      } else if (nome.includes("ancoragem h")) {
        codigo = "ANC951";
      } else if (nome.includes("ancoragem inferior")) {
        codigo = "ANC964";
      } else if (nome.includes("gua160")) {
        codigo = "GUA160";
        quantidade = Math.ceil(quantidade / 50);
      } else if (nome.includes("gua161")) {
        codigo = "GUA161";
        quantidade = Math.ceil(quantidade / 50);
      } else if (nome.includes("gua162")) {
        codigo = "GUA162";
        quantidade = Math.ceil(quantidade / 50);
      } else if (nome.includes("fita vhb")) {
        codigo = "FITA4970";
      }

      const cadastro = acessoriosDb.find((db) => db.codigo === codigo);
      const preco = cadastro?.preco ?? acessorio.precoUnitario ?? 0;

      return acc + quantidade * preco;

    }, 0);
  }, [resultado.acessorios, acessoriosDb]);

  const totalVidro = resultado.valorVidro;

  const totalGeral = totalPerfis + totalVidro + totalAcessorios;

  const perfisPDF = resultado.perfis.map((perfil) => {
    const nome = perfil.nome?.toLowerCase() || "";
    let codigo = perfil.codigo || "-";
    let kgmt = 0;
    if (nome.includes("meia")) { codigo = "FC243"; kgmt = 1.009; }
    else if (nome.includes("coluna de centro")) { codigo = "FC202"; kgmt = 1.729; }
    else if (nome.includes("cadeirinha")) { codigo = "FC225"; kgmt = 0.603; }
    else if (nome.includes("travessa")) { codigo = "FC227"; kgmt = 0.65; }
    else if (nome.includes("perfil quadro")) { codigo = "FC261"; kgmt = 0.61; }
    else if (nome.includes("cantoneira")) { codigo = "CL006"; kgmt = 1.12; }
    else if (nome.includes("cunha")) { codigo = "CL011"; kgmt = 0.32; }

    const cadastro = perfisDb.find((db) => db.codigo === codigo);
    const precoBarra = cadastro?.preco ?? perfil.precoBarra ?? 0;
    const valorTotal = precoBarra * perfil.barras;

    // Corrigir kgTotal: recalcular sempre
    const unidadeStr = cadastro?.unidade ?? perfil.unidade ?? "6MT";
    let comprimentoBarra = 6;
    const match = unidadeStr.match(/(\d+)/);
    if (match) comprimentoBarra = Number(match[1]);
    const kgTotal = Number((kgmt * comprimentoBarra * perfil.barras).toFixed(3));

    return {
      ...perfil,
      codigo,
      kgmt,
      precoBarra,
      valorTotal,
      kgTotal,
    };
  });

const acessoriosPDF = resultado.acessorios.map((a) => {
  const nome = a.nome?.toLowerCase() || ""

  let codigo = a.codigo || "-"
  let unidade = a.unidade || "UN"
  let quantidade = a.quantidade || 0

  if (nome.includes("presilha painel")) {
    codigo = "PRE950"
    unidade = "Peça"
  }

  else if (nome.includes("presilha coluna")) {
    codigo = "PRE951"
    unidade = "Peça"
  }

  else if (nome.includes("fecho max-ar")) {
    codigo = "FEC152D"
    unidade = "Unidade"
  }

  else if (nome.includes("braço max")) {
    codigo = "BRA589"
    unidade = "Unidade"
  }

  else if (nome.includes("ancoragem h")) {
    codigo = "ANC951"
    unidade = "Peça"
  }

  else if (nome.includes("ancoragem inferior")) {
    codigo = "ANC964"
    unidade = "Peça"
  }

  else if (nome.includes("gua160")) {
    codigo = "GUA160"
    unidade = "Rolo 50mt"
    quantidade = Math.ceil(quantidade / 50)
  }

  else if (nome.includes("gua161")) {
    codigo = "GUA161"
    unidade = "Rolo 50mt"
    quantidade = Math.ceil(quantidade / 50)
  }

  else if (nome.includes("gua162")) {
    codigo = "GUA162"
    unidade = "Rolo 50mt"
    quantidade = Math.ceil(quantidade / 50)
  }

  else if (nome.includes("fita vhb")) {
    codigo = "FITA4970"
    unidade = "Rolo 33mt"
  }

  const cadastro = acessoriosDb.find((db) => db.codigo === codigo)

  const precoUnitario = cadastro?.preco ?? a.precoUnitario ?? 0
  const valorTotal = quantidade * precoUnitario

  return {
    ...a,
    codigo,
    unidade,
    quantidade,
    precoUnitario,
    valorTotal
  }
})

  const montarMateriaisCentral = (): ProjetoIndividualMaterial[] => [
    {
      id: "vidro-pele-de-vidro",
      qtd: resultado.areaVidro,
      unidade: "m2",
      descricao: `VIDRO ${formatarNumero(resultado.larguraQuadroMm, 0)}x${formatarNumero(resultado.alturaQuadroMm, 0)} ${montarDescricaoVidro(vidroSelecionado)}`.toUpperCase(),
      valorUnitario: precoVidroM2Efetivo,
    },
    ...perfisPDF.map((perfil) => ({
      id: `perfil-${perfil.codigo}`,
      qtd: Number(perfil.barras || 0),
      unidade: "barra",
      descricao: `${perfil.codigo} - ${perfil.nome}`.toUpperCase(),
      valorUnitario: Number(perfil.precoBarra || 0),
      codigoPerfil: perfil.codigo,
      comprimentoBarra: 6000,
      cortes: perfil.metroLinear ? [Number(perfil.metroLinear)] : [],
    })),
    ...acessoriosPDF.map((acessorio) => ({
      id: `acessorio-${acessorio.codigo}`,
      qtd: Number(acessorio.quantidade || 0),
      unidade: acessorio.unidade || "und",
      descricao: `${acessorio.codigo} - ${acessorio.nome}`.toUpperCase(),
      valorUnitario: Number(acessorio.precoUnitario || 0),
    })),
  ];

  const montarItemCentral = (id?: string): PeleDeVidroCentralItem => {
    const centralDados: PeleDeVidroDraft = {
      clienteId,
      buscaCliente,
      obra,
      larguraVaoMm,
      alturaVaoMm,
      quadrosHorizontal,
      quadrosVertical,
      quantidadeLajes,
      quantidadeFachadas,
      quadrosFixos,
      quadrosMoveis,
      buscaVidro,
      vidroId,
    };

    return {
      id: id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      numero: "Novo Orçamento",
      projeto: "Pele de vidro",
      cliente: nomeClienteSelecionado || buscaCliente || "",
      medidas: `${larguraNum} x ${alturaNum} mm`,
      largura: larguraNum,
      altura: alturaNum,
      quantidade: Math.max(fachadas, 1),
      modo: "Cálculo",
      desenhoUrl: "",
      vidro: montarDescricaoVidro(vidroSelecionado),
      corKit: "Padrão",
      trilho: String(qH),
      trinco: String(qV),
      alturaAteTubo: lajes,
      puxador: String(fixos),
      tamanhoPuxador: String(moveis),
      pecasDivisao: Math.max(qH * qV, 1),
      medidasDetalhadas: `Quadro: ${formatarNumero(resultado.larguraQuadroMm, 0)} x ${formatarNumero(resultado.alturaQuadroMm, 0)} mm\nTotal de quadros: ${resultado.totalQuadros}\nFixos: ${fixos} | Móveis: ${moveis}`,
      valorTotal: totalGeral,
      materiais: montarMateriaisCentral(),
      origemRota: "/calculo/peledevidro",
      centralDados,
    };
  };

  const enviarParaCentralImpressao = () => {
    try {
      const itemCentral = montarItemCentral(centralItemId || undefined);
      const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = salvo ? (JSON.parse(salvo) as PeleDeVidroCentralItem[]) : [];
      const proximaLista = centralItemId && lista.some((item) => item.id === centralItemId)
        ? lista.map((item) => item.id === centralItemId ? itemCentral : item)
        : [...lista, itemCentral];

      window.localStorage.setItem(CENTRAL_IMPRESSAO_KEY, JSON.stringify(proximaLista));
      const clienteCentral = nomeClienteSelecionado || buscaCliente;
      if (clienteCentral) window.localStorage.setItem(CENTRAL_IMPRESSAO_CLIENTE_KEY, clienteCentral);
      if (obra) window.localStorage.setItem(CENTRAL_IMPRESSAO_OBRA_KEY, obra);
      window.localStorage.removeItem(chaveDraft);
      router.push(centralItemId ? returnTo : "/central-impressao");
    } catch (erro) {
      console.warn("Não foi possível enviar a pele de vidro para a central:", erro);
      setMensagemSalvo("Erro ao enviar para a central de impressão.");
      setTimeout(() => setMensagemSalvo(""), 5000);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido}
        setExpandido={setSidebarExpandido}
      />

      <div className="flex-1 flex flex-col w-full min-w-0">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user?.email || ""}
          handleSignOut={signOut}
        />

        <main className="p-4 md:p-8 flex-1 space-y-6">
          {conteudoCarregando ? (
            <div className="flex flex-1 items-center justify-center min-h-[60vh]">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: "transparent", borderRightColor: theme.menuIconColor, borderBottomColor: theme.menuIconColor, borderLeftColor: theme.menuIconColor }} />
            </div>
          ) : (<>

            {/* CLIENTE / OBRA / AÇÕES */}
            <div className="rounded-2xl border p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
              <div className="flex items-center gap-2 flex-1 relative">
                <span className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: `${theme.contentTextLightBg}80` }}>Cliente:</span>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} style={{ color: theme.contentTextLightBg }} />
                  <input
                    type="text"
                    placeholder="Pesquisar cliente..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none bg-transparent"
                    style={{ borderColor: `${theme.contentTextLightBg}20`, color: theme.contentTextLightBg }}
                    value={buscaCliente}
                    onChange={(e) => { setBuscaCliente(e.target.value); setMostrarClientes(true); setClienteIndex(-1); }}
                    onFocus={() => setMostrarClientes(true)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") setClienteIndex((p) => Math.min(p + 1, clientesFiltrados.length - 1));
                      if (e.key === "ArrowUp") setClienteIndex((p) => Math.max(p - 1, 0));
                      if (e.key === "Enter") {
                        const sel = clienteIndex >= 0 ? clientesFiltrados[clienteIndex] : clientesFiltrados[0];
                        if (sel) { setBuscaCliente(sel.nome); setClienteId(String(sel.id)); setMostrarClientes(false); }
                      }
                    }}
                  />
                  {mostrarClientes && buscaCliente && clientesFiltrados.length > 0 && (
                    <div className="absolute top-full left-0 w-full border rounded-xl shadow-xl z-50 max-h-60 overflow-auto py-1" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}20` }}>
                      {clientesFiltrados.map((c, i) => (
                        <div
                          key={c.id}
                          className="px-4 py-2 text-xs cursor-pointer"
                          style={{
                            backgroundColor: i === clienteIndex ? `${theme.menuIconColor}18` : "transparent",
                            color: theme.contentTextLightBg,
                            fontWeight: i === clienteIndex ? 700 : 400,
                          }}
                          onClick={() => { setBuscaCliente(c.nome); setClienteId(String(c.id)); setMostrarClientes(false); }}
                        >
                          {c.nome}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: `${theme.contentTextLightBg}80` }}>Obra:</span>
                <input
                  type="text"
                  placeholder="Identificação da obra"
                  className="flex-1 py-2 px-3 rounded-xl border text-sm outline-none bg-transparent"
                  style={{ borderColor: `${theme.contentTextLightBg}20`, color: theme.contentTextLightBg }}
                  value={obra}
                  onChange={(e) => setObra(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNovo}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 border shadow-sm"
                  style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                >
                  <FilePlus2 size={16} />
                  Novo
                </button>

                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                  style={{ backgroundColor: theme.menuIconColor, color: "#fff" }}
                >
                  {salvando ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Salvar
                </button>

                <button
                  onClick={enviarParaCentralImpressao}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 border shadow-sm"
                  style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                >
                  <FilePlus2 size={16} />
                  PDF+
                </button>

                <PDFDownloadLink
                  document={
                    <PeleDeVidroPDF
                      nomeEmpresa={nomeEmpresa}
                      logoUrl={theme.logoLightUrl || undefined}
                      themeColor={theme.contentTextLightBg}
                      nomeCliente={buscaCliente}
                      nomeObra={obra}
                      larguraVaoMm={larguraNum}
                      alturaVaoMm={alturaNum}
                      quadrosHorizontal={qH}
                      quadrosVertical={qV}
                      quantidadeLajes={lajes}
                      quantidadeFachadas={fachadas}
                      vidroDescricao={montarDescricaoVidro(vidroSelecionado)}
                      areaVidro={resultado.areaVidro}
                      totalVidro={totalVidro}
                      perfis={perfisPDF}
                      acessorios={acessoriosPDF}
                      totalPerfis={totalPerfis}
                      totalAcessorios={totalAcessorios}
                      totalGeral={totalGeral}
                    />
                  }
                  fileName={nomeArquivoPDF}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 border shadow-sm"
                  style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                >
                  Imprimir PDF
                </PDFDownloadLink>
              </div>

              {mensagemSalvo && (
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${mensagemSalvo.includes("Erro") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {mensagemSalvo}
                </span>
              )}
            </div>

            {/* HEADER + INPUTS */}
            <section className="rounded-4xl border p-6 md:p-8 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: `${theme.menuIconColor}12`, color: theme.menuIconColor }}>
                    <Grid3X3 size={14} />
                    Pele de Vidro
                  </div>
                  <h1 className="mt-4 text-3xl md:text-5xl font-black leading-none" style={{ color: theme.contentTextLightBg }}>
                    Cálculo de orçamento pele de vidro
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm md:text-base" style={{ color: `${theme.contentTextLightBg}B3` }}>
                    Informe as dimensões em mm, a quantidade de quadros na horizontal e vertical, e selecione o vidro. O sistema calcula perfis, acessórios e barras automaticamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 w-full md:w-auto md:min-w-105">
                  <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Largura do vão (mm)
                    </span>
                    <input
                      value={larguraVaoMm}
                      onChange={(e) => setLarguraVaoMm(e.target.value)}
                      inputMode="numeric"
                      className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </label>

                  <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Altura do vão (mm)
                    </span>
                    <input
                      value={alturaVaoMm}
                      onChange={(e) => setAlturaVaoMm(e.target.value)}
                      inputMode="numeric"
                      className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </label>

                  <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Qtd. de fachadas
                    </span>
                    <input
                      value={quantidadeFachadas}
                      onChange={(e) => setQuantidadeFachadas(e.target.value)}
                      inputMode="numeric"
                      placeholder="0"
                      className="mt-3 w-full bg-transparent text-2xl font-black outline-none placeholder:text-sm placeholder:font-normal placeholder:opacity-40"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </label>

                  <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Quadros horizontal
                    </span>
                    <input
                      value={quadrosHorizontal}
                      onChange={(e) => setQuadrosHorizontal(e.target.value)}
                      inputMode="numeric"
                      className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </label>

                  <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Quadros vertical
                    </span>
                    <input
                      value={quadrosVertical}
                      onChange={(e) => setQuadrosVertical(e.target.value)}
                      inputMode="numeric"
                      className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </label>

                  <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Quantidade de lajes
                    </span>
                    <input
                      value={quantidadeLajes}
                      onChange={(e) => setQuantidadeLajes(e.target.value)}
                      inputMode="numeric"
                      placeholder="0 = térreo"
                      className="mt-3 w-full bg-transparent text-2xl font-black outline-none placeholder:text-sm placeholder:font-normal placeholder:opacity-40"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </label>

                  <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Quadros fixos
                    </span>
                    <input
                      type="number"
                      value={quadrosFixos}
                      onChange={(e) => setQuadrosFixos(e.target.value)}
                      inputMode="numeric"
                      className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </label>

                  <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Quadros móveis
                    </span>
                    <input
                      type="number"
                      value={quadrosMoveis}
                      onChange={(e) => setQuadrosMoveis(e.target.value)}
                      inputMode="numeric"
                      className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </label>

                  <label className="rounded-2xl border p-4 sm:col-span-2 xl:col-span-1" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                      Vidro da fachada
                    </span>
                    <input
                      value={buscaVidro}
                      onChange={(e) => setBuscaVidro(e.target.value)}
                      placeholder="Digite para filtrar o vidro"
                      className="mt-3 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    />
                    <select
                      value={vidroId}
                      onChange={(e) => setVidroId(e.target.value)}
                      className="mt-3 w-full bg-transparent text-lg font-black outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    >
                      <option value="" className="text-slate-900">Selecione o vidro</option>
                      {vidrosFiltrados.length === 0 ? (
                        <option value="" className="text-slate-900">Nenhum vidro encontrado</option>
                      ) : (
                        vidrosFiltrados.map((v) => (
                          <option key={v.id} value={v.id} className="text-slate-900">
                            {montarDescricaoVidro(v)} - {formatarPreco(Number(v.preco) || 0)}/m²
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                </div>
              </div>
            </section>

            {/* CARDS RESUMO */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                {
                  titulo: "Medida de cada quadro",
                  valor: `${formatarNumero(resultado.larguraQuadroMm, 0)} x ${formatarNumero(resultado.alturaQuadroMm, 0)} mm`,
                  detalhe: `${resultado.totalQuadros} quadros no total`,
                  icone: Ruler,
                },
                {
                  titulo: "Área total de vidro",
                  valor: `${formatarNumero(resultado.areaVidro)} m²`,
                  detalhe: montarDescricaoVidro(vidroSelecionado),
                  icone: SquareStack,
                },
                {
                  titulo: "Total de vidro",
                  valor: formatarPreco(totalVidro),
                  detalhe: `${formatarPreco(precoVidroM2Efetivo)}/m²`,
                  icone: Package2,
                },
                {
                  titulo: "Total geral",
                  valor: formatarPreco(totalGeral),
                  detalhe: "Perfis + acessórios + vidro",
                  icone: Calculator,
                },
              ].map((card) => (
                <article key={card.titulo} className="rounded-[1.75rem] border p-5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: `${theme.contentTextLightBg}70` }}>{card.titulo}</p>
                      <p className="mt-3 text-2xl font-black leading-tight" style={{ color: theme.contentTextLightBg }}>{card.valor}</p>
                      <p className="mt-2 text-sm" style={{ color: `${theme.contentTextLightBg}A3` }}>{card.detalhe}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.menuIconColor}14`, color: theme.menuIconColor }}>
                      <card.icone size={22} />
                    </div>
                  </div>
                </article>
              ))}
            </section>

            {/* TABELAS + PREVIEW */}
            <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-6">
              <article className="rounded-4xl border shadow-sm overflow-hidden" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                {/* Perfis */}
                <div className="px-6 py-5 border-b" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                  <h2 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>Perfis de alumínio</h2>
                  <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>Barras de 6000 mm. {lajes > 0 ? `Multiplicado por ${lajes} laje(s).` : "Térreo (sem multiplicador de lajes)."}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.contentTextLightBg }}>
                      <tr>
                        <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Código</th>
                        <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Perfil</th>
                        <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Unidade</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">KG/MT</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Metro linear</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Barras</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">KG total</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Preço barra</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Valor total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.perfis.map((perfil, index) => {
                        const nome = perfil.nome?.toLowerCase() || "";
                        let codigo = perfil.codigo || "-";
                        let kgmtStr = "0"; // Usaremos uma string para exibir e converter

                        // Definindo códigos e pesos fixos (ajustado para converter vírgula em ponto)
                        if (nome.includes("meia")) { codigo = "FC243"; kgmtStr = "1.009"; }
                        else if (nome.includes("coluna de centro")) { codigo = "FC202"; kgmtStr = "1.729"; }
                        else if (nome.includes("cadeirinha")) { codigo = "FC225"; kgmtStr = "0.603"; }
                        else if (nome.includes("travessa")) { codigo = "FC227"; kgmtStr = "0.65"; }
                        else if (nome.includes("perfil quadro")) { codigo = "FC261"; kgmtStr = "0.61"; }
                        else if (nome.includes("cantoneira")) { codigo = "CL006"; kgmtStr = "1.12"; }
                        else if (nome.includes("cunha")) { codigo = "CL011"; kgmtStr = "0.32"; }

                        const cadastroCorrigido = perfisDb.find((db) => db.codigo === codigo);
                        let precoBarra = cadastroCorrigido?.preco ?? perfil.precoBarra;

                        const precoBarraDisplay = precoBarra > 0 ? formatarPreco(precoBarra) : "-";
                        const valorTotal = precoBarra > 0 ? precoBarra * perfil.barras : 0;

                        // CÁLCULO DO KG TOTAL PARA EXIBIÇÃO
                        // Pegamos o número de metros da unidade (ex: "6MT" -> 6)
                        const match = perfil.unidade?.match(/(\d+)/);
                        const unidadeNum = match ? Number(match[1]) : 6;

                        // Calculamos na hora para garantir que reflita as correções de kgmt acima
                        const kgTotalCalculado = (Number(kgmtStr) * unidadeNum * perfil.barras);
                        const kgTotalDisplay = kgTotalCalculado > 0 ? kgTotalCalculado.toFixed(2) : "-";

                        return (
                          <tr key={perfil.nome} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `${theme.screenBackgroundColor}A6` }}>
                            <td className="px-6 py-4 text-xs" style={{ color: theme.contentTextLightBg }}>{codigo}</td>
                            <td className="px-6 py-4 text-xs" style={{ color: theme.contentTextLightBg }}>{perfil.nome}</td>
                            <td className="px-6 py-4 text-xs" style={{ color: theme.contentTextLightBg }}>{perfil.unidade}</td>
                            <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>
                              {kgmtStr.replace('.', ',')} {/* Exibe com vírgula para o usuário */}
                            </td>
                            <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>
                              {formatarNumero(perfil.metroLinear, 0)} mm
                            </td>
                            <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>{perfil.barras}</td>

                            {/* COLUNA KG TOTAL CORRIGIDA */}
                            <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>
                              {kgTotalDisplay}
                            </td>

                            <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>{precoBarraDisplay}</td>
                            <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>
                              {valorTotal > 0 ? formatarPreco(valorTotal) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {/* TOTAL VALOR EM DINHEIRO */}
                      <tr style={{ borderTop: `1px solid ${theme.contentTextLightBg}14` }}>
                        <td colSpan={8} className="px-6 py-4 text-right text-sm font-bold" style={{ color: theme.contentTextLightBg }}>
                          Total dos perfis
                        </td>
                        <td className="px-6 py-4 text-right text-base font-black" style={{ color: theme.contentTextLightBg }}>
                          {formatarPreco(totalPerfis)}
                        </td>
                      </tr>
                      {/* TOTAL PESO EM KG */}
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-right text-sm " style={{ color: theme.contentTextLightBg }}>
                          Total KG dos perfis
                        </td>
                        <td className="px-6 py-4 text-right text-base " style={{ color: theme.contentTextLightBg }}>
                          {resultado.perfis.reduce((acc, p) => {
                            const nome = p.nome?.toLowerCase() || "";
                            let kgmtNum = 0;
                            if (nome.includes("meia")) kgmtNum = 1.009;
                            else if (nome.includes("coluna de centro")) kgmtNum = 1.729;
                            else if (nome.includes("cadeirinha")) kgmtNum = 0.603;
                            else if (nome.includes("travessa")) kgmtNum = 0.65;
                            else if (nome.includes("perfil quadro")) kgmtNum = 0.61;
                            else if (nome.includes("cantoneira")) kgmtNum = 1.12;
                            else if (nome.includes("cunha")) kgmtNum = 0.32;
                            else kgmtNum = Number(p.kgmt) || 0;
                            const match = p.unidade?.match(/(\d+)/);
                            const unidadeNum = match ? Number(match[1]) : 6;
                            return acc + (kgmtNum * unidadeNum * p.barras);
                          }, 0).toFixed(2)} Kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Acessórios */}
                <div className="border-t" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                  <div className="px-6 py-5 border-b" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                    <h3 className="text-lg font-black" style={{ color: theme.contentTextLightBg }}>Acessórios</h3>
                    <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>Presilhas, fechos e braços calculados por quadro.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.contentTextLightBg }}>
                        <tr>
                          <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Código</th>
                          <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Acessório</th>
                          <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Unidade</th>
                          <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Qtd</th>
                          <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Preço unit.</th>
                          <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Valor total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.acessorios.map((acessorio, index) => {
                          const nome = acessorio.nome?.toLowerCase() || "";
                          let codigo = acessorio.codigo || "-";
                          let unidade = acessorio.unidade || "UN";
                          let quantidade = acessorio.quantidade;

                          // Mapeamento de Códigos e Unidades conforme sua lista
                          if (nome.includes("presilha painel")) {
                            codigo = "PRE950"; unidade = "Peça";
                          } else if (nome.includes("presilha coluna")) {
                            codigo = "PRE951"; unidade = "Peça";
                          } else if (nome.includes("fecho max-ar")) {
                            codigo = "FEC152D"; unidade = "Unidade";
                          } else if (nome.includes("braço max")) {
                            codigo = "BRA589"; unidade = "Unidade";
                          } else if (nome.includes("ancoragem h")) {
                            codigo = "ANC951"; unidade = "Peça";
                          } else if (nome.includes("ancoragem inferior")) {
                            codigo = "ANC964"; unidade = "Peça";
                          } else if (nome.includes("gua160")) {
                            codigo = "GUA160"; unidade = "Rolo 50mt";
                            quantidade = Math.ceil(quantidade / 50); // Converte metros para rolos
                          } else if (nome.includes("gua161")) {
                            codigo = "GUA161"; unidade = "Rolo 50mt";
                            quantidade = Math.ceil(quantidade / 50);
                          } else if (nome.includes("gua162")) {
                            codigo = "GUA162"; unidade = "Rolo 50mt";
                            quantidade = Math.ceil(quantidade / 50);
                          } else if (nome.includes("fita vhb")) {
                            codigo = "FITA4970"; unidade = "Rolo 33mt";
                            // quantidade já está arredondada no cálculo, não arredondar novamente
                          }

                          // Buscar preço atualizado no banco de dados pelo código
                          const cadastroCorrigido = acessoriosDb.find((db) => db.codigo === codigo);
                          const precoUnitario = cadastroCorrigido?.preco ?? acessorio.precoUnitario ?? 0;
                          const valorTotalLinha = (quantidade || 0) * (precoUnitario || 0);// O valor correto da linha

                          return (
                            <tr key={acessorio.nome} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `${theme.screenBackgroundColor}A6` }}>
                              <td className="px-6 py-4 text-xs" style={{ color: theme.contentTextLightBg }}>{codigo}</td>
                              <td className="px-6 py-4 text-xs" style={{ color: theme.contentTextLightBg }}>{acessorio.nome}</td>
                              <td className="px-6 py-4 text-xs" style={{ color: theme.contentTextLightBg }}>{unidade}</td>
                              <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>{quantidade}</td>
                              <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>
                                {precoUnitario > 0 ? formatarPreco(precoUnitario) : "-"}
                              </td>
                              <td className="px-6 py-4 text-right text-xs" style={{ color: theme.contentTextLightBg }}>
                                {valorTotalLinha > 0 ? formatarPreco(valorTotalLinha) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: `1px solid ${theme.contentTextLightBg}14` }}>
                          <td colSpan={5} className="px-6 py-4 text-right text-sm font-bold" style={{ color: theme.contentTextLightBg }}>
                            Total dos acessórios
                          </td>
                          <td className="px-6 py-4 text-right text-base font-black" style={{ color: theme.contentTextLightBg }}>
                            {formatarPreco(totalAcessorios)}
                          </td>

                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </article>

              <div className="space-y-6">
                {/* Preview visual */}
                <article className="rounded-4xl border p-6 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                  <h2 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>Vista frontal</h2>
                  <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>Representação proporcional da fachada</p>
                  <div className="mt-4">
                    {(() => {
                      const nH = Math.max(qH, 1);
                      const nV = Math.max(qV, 1);
                      const larg = larguraNum || 2000;
                      const alt = alturaNum || 2000;

                      const svgW = 360;
                      const padL = 40;
                      const padR = 10;
                      const padTop = 15;
                      const padBot = 40;
                      const drawW = svgW - padL - padR;

                      const ratio = Math.min(Math.max(alt / larg, 0.3), 2.5);
                      const drawH = drawW * ratio;
                      const svgH = drawH + padTop + padBot;

                      const mullionW = Math.max(2, Math.min(6, drawW * 0.012));
                      const glassW = (drawW - (nH + 1) * mullionW) / nH;
                      const glassH = (drawH - (nV + 1) * mullionW) / nV;

                      const x0 = padL;
                      const y0 = padTop;

                      // Cor do perfil branco
                      const corPerfil = "#e8e8e8";
                      // Padronizar cor do perfil igual Sacada Frontal: sempre branco
                      const corAluminio = "#e8e8e8";
                      const corAluminioBorda = "#e8e8e8";

                      const corVidroFill = "#b8e6e0";
                      const corVidroBorda = "#7cbfb5";
                      const corVidroReflexo = "#ffffff";

                      // Remover duplicidade: garantir que não haja outras declarações dessas variáveis neste bloco

                      return (
                        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="pvRailGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={corAluminio} />
                              <stop offset="50%" stopColor={typeof corAluminioBorda === "string" ? corAluminioBorda : "#787878"} />
                              <stop offset="100%" stopColor={corAluminio} />
                            </linearGradient>
                            <linearGradient id="pvGlassGrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={corVidroFill} stopOpacity={0.35} />
                              <stop offset="50%" stopColor={corVidroFill} stopOpacity={0.18} />
                              <stop offset="100%" stopColor={corVidroFill} stopOpacity={0.3} />
                            </linearGradient>
                          </defs>

                          {/* Background frame — perfil alumínio */}
                          <rect x={x0} y={y0} width={drawW} height={drawH} fill="url(#pvRailGrad)" rx={2} />
                          <rect x={x0} y={y0} width={drawW} height={drawH} fill="none" stroke={typeof corAluminioBorda === "string" ? corAluminioBorda : "#787878"} strokeWidth={0.7} rx={2} />

                          {/* Glass panels grid */}
                          {Array.from({ length: nH }).map((_, col) =>
                            Array.from({ length: nV }).map((_, row) => {
                              const gX = x0 + mullionW + col * (glassW + mullionW);
                              const gY = y0 + mullionW + row * (glassH + mullionW);
                              return (
                                <g key={`${col}-${row}`}>
                                  {/* Vidro */}
                                  <rect x={gX} y={gY} width={glassW} height={glassH} fill="url(#pvGlassGrad)" rx={0.5} />
                                  <rect x={gX} y={gY} width={glassW} height={glassH} fill="none" stroke={corVidroBorda} strokeWidth={0.6} strokeOpacity={0.5} rx={0.5} />

                                  {/* Reflexo diagonal */}
                                  <line x1={gX + glassW * 0.18} y1={gY + glassH * 0.06} x2={gX + glassW * 0.08} y2={gY + glassH * 0.38} stroke={corVidroReflexo} strokeWidth={0.7} strokeOpacity={0.3} />
                                  <line x1={gX + glassW * 0.24} y1={gY + glassH * 0.06} x2={gX + glassW * 0.14} y2={gY + glassH * 0.38} stroke={corVidroReflexo} strokeWidth={0.4} strokeOpacity={0.18} />
                                </g>
                              );
                            })
                          )}

                          {/* Dimension: largura */}
                          <line x1={x0} y1={y0 + drawH + 14} x2={x0 + drawW} y2={y0 + drawH + 14} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                          <line x1={x0} y1={y0 + drawH + 10} x2={x0} y2={y0 + drawH + 18} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                          <line x1={x0 + drawW} y1={y0 + drawH + 10} x2={x0 + drawW} y2={y0 + drawH + 18} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                          <text x={x0 + drawW / 2} y={y0 + drawH + 28} textAnchor="middle" fontSize={9.5} fill={theme.contentTextLightBg} opacity={0.6} fontWeight={700} fontFamily="system-ui, sans-serif">
                            {formatarNumero(larg, 0)} mm
                          </text>

                          {/* Dimension: altura */}
                          <line x1={x0 - 10} y1={y0} x2={x0 - 10} y2={y0 + drawH} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                          <line x1={x0 - 14} y1={y0} x2={x0 - 6} y2={y0} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                          <line x1={x0 - 14} y1={y0 + drawH} x2={x0 - 6} y2={y0 + drawH} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                          <text x={0} y={0} textAnchor="middle" fontSize={9.5} fill={theme.contentTextLightBg} opacity={0.6} fontWeight={700} fontFamily="system-ui, sans-serif" transform={`translate(${x0 - 22}, ${y0 + drawH / 2}) rotate(-90)`}>
                            {formatarNumero(alt, 0)} mm
                          </text>
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                    <span className="text-xs font-semibold" style={{ color: `${theme.contentTextLightBg}70` }}>
                      Quadro: {formatarNumero(resultado.larguraQuadroMm, 0)} x {formatarNumero(resultado.alturaQuadroMm, 0)} mm
                    </span>
                    <span className="text-xs" style={{ color: `${theme.contentTextLightBg}50` }}>
                      {qH}x{qV} = {qH * qV} quadros{lajes > 0 ? ` x ${lajes} lajes` : ""}
                    </span>
                  </div>
                </article>

                {/* Resumo técnico */}
                <article className="rounded-4xl border p-6 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                  <h2 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>Resumo técnico</h2>
                  <div className="mt-5 space-y-4">
                    {[
                      ["Total de quadros", String(resultado.totalQuadros)],
                      ["Quadros fixos", String(fixos)],
                      ["Quadros móveis", String(moveis)],
                      ["Meias colunas", String(resultado.meiaColuna)],
                      ["Colunas de centro", String(resultado.colunaCentro)],
                      ["Área de vidro", `${formatarNumero(resultado.areaVidro)} m²`],
                      ["Quantidade de lajes", lajes === 0 ? "Térreo" : String(lajes)],
                      ["Quantidade de Fachadas", fachadas === 0 ? "0" : String(fachadas)],
                      ["Vidro especificado", montarDescricaoVidro(vidroSelecionado)],
                      ["Total dos perfis", formatarPreco(totalPerfis)],
                      ["Total dos acessórios", formatarPreco(totalAcessorios)],
                      ["Total do vidro", formatarPreco(totalVidro)],
                      ["Total geral", formatarPreco(totalGeral)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4">
                        <span className="text-sm" style={{ color: `${theme.contentTextLightBg}8F` }}>{label}</span>
                        <span className="text-sm font-bold text-right" style={{ color: theme.contentTextLightBg }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          </>)}
        </main>
      </div>
    </div>
  );
}

