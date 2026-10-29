//app/(calculos)/sacadafrontal/page.tsx
"use client";
import { avisosAcrescimoVidro } from "@/utils/avisosMedidaVidro";
import AvisoAcrescimoVidro from "@/components/AvisoAcrescimoVidro";
import { precoMaterialVidro } from "@/utils/regraMedidaVidro";
import { useRegraMedidaVidro } from "@/context/RegraMedidaVidroContext";
import { corMaterialSelecionada } from "@/utils/materiaisConformeCor";
import { localizarClientePorNome } from "@/utils/tabelaClienteOrcamento";
import { confirmarEnvioOrcamento } from "@/utils/envioOrcamento";
import { useClienteOrcamento } from "@/context/OrcamentoContext";
import { DRAWING_COLORS } from "@/design/drawing";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Calculator, PanelsTopLeft, Ruler, SquareStack, Package2, Printer, Save, Search, FilePlus2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { formatarPreco } from "@/utils/formatarPreco";
import { normalizarPrecoCatalogo } from "@/utils/precos";
import { localizarVidroPorDescricao } from "@/utils/vidros";
import { calcularSacadaFrontal } from "@/utils/sacada-frontal-calc";
import { escolherItemPorCor } from "@/utils/catalogo-cor";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { SacadaFrontalPDF } from "@/app/relatorios/sacadafrontal/SacadaFrontalPDF";
import type { CentralImpressaoItem } from "@/app/relatorios/centralimpressao/CentralImpressaoPDF";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";

type ClienteSacada = {
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

type PerfilTabela = {
  codigo: string;
  nome: string;
  cores?: string | null;
  preco?: number | null;
};

type FerragemTabela = {
  codigo: string;
  nome: string;
  cores?: string | null;
  preco?: number | null;
};

type PrecoEspecial = {
  vidro_id: string;
  grupo_preco_id: string;
  preco: number;
};

type SacadaFrontalDraft = {
  clienteId: string;
  buscaCliente: string;
  obra: string;
  larguraVaoMm: string;
  alturaVaoMm: string;
  quantidadeVaos: string;
  quantidadeDivisoesLargura: string;
  tipoSacada: "panoramica" | "tubo";
  buscaVidro: string;
  vidroId: string;
  corPerfil: string;
};

type SacadaFrontalCentralItem = CentralImpressaoItem & {
  origemRota?: string;
  corPerfil?: string;
  centralDados?: SacadaFrontalDraft;
};

const CORES_PERFIL = ["Branco", "Preto", "Fosco"];
const TIPOS_SACADA = [
  { valor: "panoramica", label: "Sacada panorâmica" },
  { valor: "tubo", label: "Sacada tubo" },
] as const;
const SACADA_FRONTAL_DRAFT_KEY = "sacada-frontal-draft";
const CENTRAL_IMPRESSAO_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_IMPRESSAO_CLIENTE_KEY = "glasscode:central-impressao:cliente";
const CENTRAL_IMPRESSAO_OBRA_KEY = "glasscode:central-impressao:obra";
const CODIGOS_COR_PERFIL = new Set(["CAN625", "SUP626", "NYL314", "NYL042"]);
const CODIGOS_SEMPRE_PRETO = new Set(["GUA033", "GUA33"]);
const CODIGOS_EQUIVALENTES: Record<string, string[]> = {
  NYL314: ["NYL314", "NYL342"],
  GUA033: ["GUA033", "GUA33"],
  GUA33: ["GUA33", "GUA033"],
};

const normalizarTextoComparacao = (texto?: string | null) =>
  (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const normalizarCodigo = (codigo?: string | null) =>
  (codigo || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

const corCompativel = (coresBanco?: string | null, corSelecionada?: string) => {
  if (!coresBanco || !corSelecionada) {
    return false;
  }

  const corNormalizada = normalizarTextoComparacao(corSelecionada).replace(/\s+/g, "");
  if (!corNormalizada) {
    return false;
  }

  const lista = coresBanco
    .toLowerCase()
    .split(/[;,/|]+/)
    .map((cor) => normalizarTextoComparacao(cor).replace(/\s+/g, ""))
    .filter(Boolean);

  return lista.includes(corNormalizada);
};

const atendeCor = (coresItem?: string | null, corSelecionada?: string) => corCompativel(coresItem, corSelecionada);

const formatarNumero = (valor: number, casasDecimais = 3) =>
  valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casasDecimais,
  });

const normalizarNumeroInteiro = (valor: string) => Number(valor.replace(/\D/g, "")) || 0;

const montarDescricaoVidro = (vidro?: Vidro | null) => {
  if (!vidro) {
    return "Vidro nao selecionado";
  }

  return [vidro.nome, vidro.espessura, vidro.tipo]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" - ");
};

const normalizarPrecoFerragem = (preco?: number | string | null) => {
  if (typeof preco === "number") {
    return Number.isFinite(preco) ? preco : 0;
  }

  if (typeof preco !== "string") {
    return 0;
  }

  const bruto = preco.trim();
  if (!bruto) {
    return 0;
  }

  // Remove simbolos de moeda e caracteres nao numericos, preservando separadores.
  const somenteNumero = bruto.replace(/[^\d,.-]/g, "");
  if (!somenteNumero) {
    return 0;
  }

  const temVirgula = somenteNumero.includes(",");
  const temPonto = somenteNumero.includes(".");

  let normalizado = somenteNumero;

  if (temVirgula && temPonto) {
    // Decide separador decimal pelo ultimo simbolo encontrado.
    const ultimaVirgula = somenteNumero.lastIndexOf(",");
    const ultimoPonto = somenteNumero.lastIndexOf(".");
    if (ultimaVirgula > ultimoPonto) {
      // Ex.:: 1.234,56 -> 1234.56
      normalizado = somenteNumero.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // Ex.:: 1,234.56 -> 1234.56
      normalizado = somenteNumero.replace(/,/g, "");
    }
  } else if (temVirgula) {
    // Ex.:: 12,50 -> 12.50
    normalizado = somenteNumero.replace(/,/g, ".");
  } else {
    normalizado = somenteNumero;
  }

  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : 0;
};

const resolverCorAcessorio = (codigo: string, corPerfilSelecionada: string) => {
  const codigoNorm = normalizarCodigo(codigo);

  if (CODIGOS_COR_PERFIL.has(codigoNorm)) {
    return corPerfilSelecionada;
  }

  if (CODIGOS_SEMPRE_PRETO.has(codigoNorm)) {
    return "Preto";
  }

  return "";
};

const resolverFerragemPorCodigoECor = (
  ferragensTabela: FerragemTabela[],
  codigo: string,
  nomeFallback: string,
  corUsar: string
): { preco: number; corEncontrada: string } => {
  const codigoNorm = normalizarCodigo(codigo);
  const corNorm = normalizarTextoComparacao(corUsar);
  const codigosAceitos = [
    ...(CODIGOS_EQUIVALENTES[codigoNorm] || [codigoNorm]).map((item) => normalizarCodigo(item)),
  ];

  // Mapa de sufixo de código → cor (ex: CAN625-BC → BC → branco)
  const SUFIXO_COR: Record<string, string> = { BC: "branco", PT: "preto", NF: "fosco" };

  // Busca por código: exato OU código do banco começa com o código alvo
  // Isso cobre CAN625 (exato) e CAN625-BC → CAN625BC (prefixo)
  const candidatos = ferragensTabela.filter((f) => {
    const fCodigo = normalizarCodigo(f.codigo);
    return codigosAceitos.some((aceito) => fCodigo === aceito || fCodigo.startsWith(aceito));
  });

  if (candidatos.length === 0) {
    const semCorOuPadrao = escolherItemPorCor(candidatos, "", (f) => f.cores);
    if (semCorOuPadrao && normalizarPrecoFerragem(semCorOuPadrao.preco) > 0) {
      return {
        preco: normalizarPrecoFerragem(semCorOuPadrao.preco),
        corEncontrada: semCorOuPadrao.cores || "Padrão",
      };
    }

    return { preco: 0, corEncontrada: corUsar || "Padrão" };
  }

  // 1️⃣ tentar achar por campo cores
  if (corNorm) {
    const comCor = candidatos.find((f) => corCompativel(f.cores, corNorm));
    if (comCor && normalizarPrecoFerragem(comCor.preco) > 0) {
      return { preco: normalizarPrecoFerragem(comCor.preco), corEncontrada: corUsar };
    }

    // 2️⃣ tentar por sufixo do código (ex: CAN625-BC → BC → branco)
    const comSufixo = candidatos.find((f) => {
      const fCodigo = normalizarCodigo(f.codigo);
      return Object.entries(SUFIXO_COR).some(
        ([sufixo, corSufixo]) => fCodigo.endsWith(sufixo) && corSufixo === corNorm
      );
    });
    if (comSufixo && normalizarPrecoFerragem(comSufixo.preco) > 0) {
      return { preco: normalizarPrecoFerragem(comSufixo.preco), corEncontrada: corUsar };
    }

    const semCorOuPadrao = escolherItemPorCor(candidatos, "", (f) => f.cores);
    if (semCorOuPadrao && normalizarPrecoFerragem(semCorOuPadrao.preco) > 0) {
      return {
        preco: normalizarPrecoFerragem(semCorOuPadrao.preco),
        corEncontrada: semCorOuPadrao.cores || "Padrão",
      };
    }

    return { preco: 0, corEncontrada: corUsar || "Padrão" };
  }

  // 3️⃣ tentar entrada sem cor (padrão) — código exato sem sufixo de cor
  const semCor = candidatos.find((f) => {
    const fCodigo = normalizarCodigo(f.codigo);
    const ehExato = codigosAceitos.includes(fCodigo);
    return ehExato && (!f.cores || f.cores.trim() === "");
  });
  if (semCor && normalizarPrecoFerragem(semCor.preco) > 0) {
    return { preco: normalizarPrecoFerragem(semCor.preco), corEncontrada: "Padrão" };
  }

  // 4️⃣ qualquer com preço
  const comPreco = candidatos.find((f) => normalizarPrecoFerragem(f.preco) > 0);
  if (comPreco) {
    return { preco: normalizarPrecoFerragem(comPreco.preco), corEncontrada: comPreco.cores || "Padrão" };
  }

  return { preco: 0, corEncontrada: corUsar || "Padrão" };
};

export default function CalculoSacadaFrontalPage() {
  const { regra: regraMedidaVidro } = useRegraMedidaVidro();
  const { theme } = useTheme();
  const { user, empresaId, nomeEmpresa, loading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");
  const centralItemId = searchParams.get("centralItem");
  const returnTo = searchParams.get("returnTo") || "/central-impressao";

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  const [listaClientes, setListaClientes] = useState<ClienteSacada[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [clienteIndex, setClienteIndex] = useState(-1);
  const [obra, setObra] = useState("");
  const orcamentoAtivo = useClienteOrcamento({ cliente: clienteId, onCliente: setClienteId, porId: true, obra, onObra: setObra, busca: buscaCliente, onBusca: setBuscaCliente });

  const [salvando, setSalvando] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState("");
  const [editNumeroFormatado, setEditNumeroFormatado] = useState("");
  const editCarregadoRef = useRef(false);
  const envioEmAndamentoRef = useRef(false);

  const [larguraVaoMm, setLarguraVaoMm] = useState("");
  const [alturaVaoMm, setAlturaVaoMm] = useState("");
  const [quantidadeVaos, setQuantidadeVaos] = useState("");
  const [quantidadeDivisoesLargura, setQuantidadeDivisoesLargura] = useState("");
  const tipoSacadaDaMatriz = searchParams.get("tipoSacada");
  const [tipoSacada, setTipoSacada] = useState<"panoramica" | "tubo">(tipoSacadaDaMatriz === "tubo" ? "tubo" : "panoramica");
  const [vidros, setVidros] = useState<Vidro[]>([]);
  const [perfisTabela, setPerfisTabela] = useState<PerfilTabela[]>([]);
  const [ferragensTabela, setFerragensTabela] = useState<FerragemTabela[]>([]);
  const [buscaVidro, setBuscaVidro] = useState("");
  const [vidroId, setVidroId] = useState("");
  const [corPerfil, setCorPerfil] = useState("");
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoEspecial[]>([]);
  const [carregandoInsumos, setCarregandoInsumos] = useState(true);
  const [draftHidratado, setDraftHidratado] = useState(false);

  useEffect(() => {
    if (!editId && !centralItemId && (tipoSacadaDaMatriz === "tubo" || tipoSacadaDaMatriz === "panoramica")) setTipoSacada(tipoSacadaDaMatriz);
  }, [tipoSacadaDaMatriz, editId, centralItemId]);

  const chaveDraft = useMemo(
    () => `${SACADA_FRONTAL_DRAFT_KEY}:${empresaId || "global"}`,
    [empresaId]
  );

  useEffect(() => {
    setDraftHidratado(false);

    if (typeof window === "undefined" || editId || centralItemId) {
      setDraftHidratado(true);
      return;
    }

    try {
      const bruto = window.localStorage.getItem(chaveDraft);
      if (!bruto) {
        setDraftHidratado(true);
        return;
      }

      const draft = JSON.parse(bruto) as Partial<SacadaFrontalDraft>;

      if (typeof draft.clienteId === "string") setClienteId(draft.clienteId);
      if (typeof draft.buscaCliente === "string") setBuscaCliente(draft.buscaCliente);
      if (typeof draft.obra === "string") setObra(draft.obra);
      if (typeof draft.larguraVaoMm === "string") setLarguraVaoMm(draft.larguraVaoMm);
      if (typeof draft.alturaVaoMm === "string") setAlturaVaoMm(draft.alturaVaoMm);
      if (typeof draft.quantidadeVaos === "string") setQuantidadeVaos(draft.quantidadeVaos);
      if (typeof draft.quantidadeDivisoesLargura === "string") setQuantidadeDivisoesLargura(draft.quantidadeDivisoesLargura);
      if (tipoSacadaDaMatriz === "tubo" || tipoSacadaDaMatriz === "panoramica") setTipoSacada(tipoSacadaDaMatriz);
       else if (draft.tipoSacada === "tubo" || draft.tipoSacada === "panoramica") setTipoSacada(draft.tipoSacada);
      if (typeof draft.buscaVidro === "string") setBuscaVidro(draft.buscaVidro);
      if (typeof draft.vidroId === "string") setVidroId(draft.vidroId);
      if (typeof draft.corPerfil === "string") setCorPerfil(draft.corPerfil);
    } catch (error) {
      console.warn("Nao foi possivel restaurar rascunho da sacada frontal:", error);
    } finally {
      setDraftHidratado(true);
    }
  }, [centralItemId, chaveDraft, editId, tipoSacadaDaMatriz]);

  useEffect(() => {
    if (!draftHidratado || typeof window === "undefined" || editId || centralItemId) {
      return;
    }

    const draft: SacadaFrontalDraft = {
      clienteId,
      buscaCliente,
      obra,
      larguraVaoMm,
      alturaVaoMm,
      quantidadeVaos,
      quantidadeDivisoesLargura,
      tipoSacada,
      buscaVidro,
      vidroId,
      corPerfil,
    };

    window.localStorage.setItem(chaveDraft, JSON.stringify(draft));
  }, [
    alturaVaoMm,
    buscaCliente,
    buscaVidro,
    chaveDraft,
    clienteId,
    corPerfil,
    centralItemId,
    draftHidratado,
    editId,
    larguraVaoMm,
    obra,
    quantidadeDivisoesLargura,
    quantidadeVaos,
    tipoSacada,
    vidroId,
  ]);

  useEffect(() => {
    let ativo = true;

    const carregarInsumos = async () => {
      if (!empresaId) {
        if (ativo) {
          setVidros([]);
          setPerfisTabela([]);
          setFerragensTabela([]);
          setCarregandoInsumos(false);
        }
        return;
      }

      setCarregandoInsumos(true);

      const [resVidros, resPerfis, resFerragens, resClientes, resPrecos] = await Promise.all([
        supabase.from("vidros").select("id, nome, espessura, tipo, preco").eq("empresa_id", empresaId).order("nome", { ascending: true }),
        supabase.from("perfis").select("codigo, nome, cores, preco").eq("empresa_id", empresaId).order("codigo", { ascending: true }),
        supabase.from("ferragens").select("codigo, nome, cores, preco").eq("empresa_id", empresaId).order("nome", { ascending: true }),
        supabase.from("clientes").select("id, nome, grupo_preco_id").eq("empresa_id", empresaId).order("nome", { ascending: true }),
        supabase.from("vidro_precos_grupos").select("vidro_id, grupo_preco_id, preco").eq("empresa_id", empresaId),
      ]);

      if (!ativo) {
        return;
      }

      if (resVidros.error || resPerfis.error || resFerragens.error) {
        if (resVidros.error) {
          console.error("Erro ao carregar vidros da sacada frontal:", resVidros.error);
        }
        if (resPerfis.error) {
          console.error("Erro ao carregar perfis da sacada frontal:", resPerfis.error);
        }
        if (resFerragens.error) {
          console.error("Erro ao carregar ferragens da sacada frontal:", resFerragens.error);
        }
        setVidros([]);
        setPerfisTabela([]);
        setFerragensTabela([]);
        setCarregandoInsumos(false);
        return;
      }

      const ferragensCarregadas = (resFerragens.data || []) as FerragemTabela[];

      setVidros((resVidros.data || []) as Vidro[]);
      setPerfisTabela((resPerfis.data || []) as PerfilTabela[]);
      setFerragensTabela(ferragensCarregadas);
      if (resClientes.data) setListaClientes(resClientes.data as ClienteSacada[]);
      if (resPrecos.data) setPrecosEspeciais(resPrecos.data as PrecoEspecial[]);
      setCarregandoInsumos(false);

      if (process.env.NODE_ENV !== "production") {
        const codigosAlvo = ["NYL", "TAM", "NYLON", "TAMPA"];
        const relacionadas = ferragensCarregadas.filter((f) => {
          const cod = normalizarCodigo(f.codigo);
          const nom = normalizarTextoComparacao(f.nome);
          return codigosAlvo.some((alvo) => cod.includes(alvo) || nom.includes(alvo.toLowerCase()));
        });
        console.log(
          "[DEBUG][SACADA] Ferragens NYL/TAMPA encontradas no banco:",
          relacionadas.map((f) => ({ codigo: f.codigo, nome: f.nome, cores: f.cores, preco: f.preco }))
        );
        console.log(
          "[DEBUG][SACADA] Total de ferragens carregadas:",
          ferragensCarregadas.length,
          "| Todos os codigos:",
          ferragensCarregadas.map((f) => f.codigo)
        );
      }
    };

    carregarInsumos();

    return () => {
      ativo = false;
    };
  }, [empresaId]);

  const carregarOrcamentoParaEdicao = useCallback(async (id: string) => {
    try {
      const { data: orc, error } = await supabase
        .from("orcamentos")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !orc) return;

      const itensData = orc.itens as Record<string, unknown> | null;
      if (!itensData) return;

      // Preencher campos do formulário
      setBuscaCliente(orc.cliente_nome || "");
      setObra(orc.obra_referencia || "");
      setEditNumeroFormatado(orc.numero_formatado || "");

      if (itensData.larguraVaoMm != null) setLarguraVaoMm(String(itensData.larguraVaoMm));
      if (itensData.alturaVaoMm != null) setAlturaVaoMm(String(itensData.alturaVaoMm));
      if (itensData.quantidadeVaos != null) setQuantidadeVaos(String(itensData.quantidadeVaos));
      if (itensData.divisoesPorVao != null) setQuantidadeDivisoesLargura(String(itensData.divisoesPorVao));
      if (itensData.tipoSacada === "tubo" || itensData.tipoSacada === "panoramica") setTipoSacada(itensData.tipoSacada);
      if (itensData.corPerfil) setCorPerfil(String(itensData.corPerfil));
      if (itensData.vidroId) setVidroId(String(itensData.vidroId));

      // Vincular cliente pelo nome
      const clienteEncontrado = localizarClientePorNome(listaClientes, orc.cliente_nome);
      if (clienteEncontrado) setClienteId(String(clienteEncontrado.id));
    } catch (err) {
      console.error("Erro ao carregar Orçamento para edição:", err);
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
      const lista = salvo ? (JSON.parse(salvo) as SacadaFrontalCentralItem[]) : [];
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
      setQuantidadeVaos(dados.quantidadeVaos || "");
      setQuantidadeDivisoesLargura(dados.quantidadeDivisoesLargura || "");
      setTipoSacada(dados.tipoSacada === "tubo" ? "tubo" : "panoramica");
      setBuscaVidro(dados.buscaVidro || item?.vidro || "");
      setVidroId(dados.vidroId || "");
      setCorPerfil(dados.corPerfil || item?.corKit || "");
      setDraftHidratado(true);
    } catch (erro) {
      console.warn("Não foi possível restaurar a sacada frontal da central:", erro);
      setDraftHidratado(true);
    }
  }, [centralItemId]);

  useEffect(() => {
    if (!carregandoInsumos && !vidros.length && vidroId) {
      setVidroId("");
    }
  }, [carregandoInsumos, vidroId, vidros]);

  const vidroSelecionado = useMemo(
    () => vidros.find((vidro) => String(vidro.id) === String(vidroId)) || localizarVidroPorDescricao(vidros, buscaVidro, montarDescricaoVidro),
    [buscaVidro, vidroId, vidros]
  );

  const vidrosFiltrados = useMemo(() => {
    const termo = buscaVidro.trim().toLowerCase();

    if (!termo) {
      return vidros;
    }

    return vidros.filter((vidro) => {
      const textoBusca = [vidro.nome, vidro.espessura, vidro.tipo, String(vidro.preco)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return textoBusca.includes(termo);
    });
  }, [buscaVidro, vidros]);

  useEffect(() => {
    if (!carregandoInsumos && vidroId && !vidrosFiltrados.some((vidro) => vidro.id === vidroId)) {
      setVidroId("");
    }
  }, [carregandoInsumos, vidroId, vidrosFiltrados]);

  const larguraNumero = normalizarNumeroInteiro(larguraVaoMm);
  const alturaNumero = normalizarNumeroInteiro(alturaVaoMm);
  const quantidadeNumero = Math.max(Number(quantidadeVaos) || 0, 0);
  const quantidadeDivisoesNumero = Math.max(Number(quantidadeDivisoesLargura) || 0, 1);

  const precoVidroM2Efetivo = useMemo(() => {
    if (!vidroSelecionado) return 0;
    const clienteObj = listaClientes.find((c) => String(c.id) === String(clienteId));
    const grupoId = clienteObj?.grupo_preco_id;
    if (grupoId) {
      const especial = precosEspeciais.find(
        (p) => String(p.vidro_id) === String(vidroSelecionado.id) && String(p.grupo_preco_id) === String(grupoId)
      );
      if (especial?.preco != null) return normalizarPrecoCatalogo(especial.preco);
    }
    return normalizarPrecoCatalogo(vidroSelecionado.preco);
  }, [clienteId, listaClientes, precosEspeciais, vidroSelecionado]);

  const resultado = useMemo(
    () => calcularSacadaFrontal({
        regraMedidaVidro,
      larguraVaoMm: larguraNumero,
      alturaVaoMm: alturaNumero,
      quantidadeVaos: quantidadeNumero,
      quantidadeDivisoesLargura: quantidadeDivisoesNumero,
      precoVidroM2: precoVidroM2Efetivo,
      vidroDescricao: montarDescricaoVidro(vidroSelecionado),
      tipoSacada,
    }),
    [regraMedidaVidro, alturaNumero, larguraNumero, quantidadeDivisoesNumero, quantidadeNumero, precoVidroM2Efetivo, tipoSacada, vidroSelecionado]
  );

  const corPerfilSelecionada = Boolean(normalizarTextoComparacao(corPerfil));

  const perfisComPrecoTabela = useMemo(() => {
    if (!corMaterialSelecionada(corPerfil)) return [];
    return resultado.perfis.map((perfilResultado) => {
      if (!corPerfilSelecionada) {
        return {
          ...perfilResultado,
          corEncontrada: "",
          precoBarra: 0,
          valorTotal: 0,
        };
      }

      const corSelecionada = normalizarTextoComparacao(corPerfil);
      const codigoResultado = normalizarCodigo(perfilResultado.codigo);
      const candidatosMesmoCodigo = perfisTabela.filter(
        (perfilTabela) => normalizarCodigo(perfilTabela.codigo) === codigoResultado
      );

      const perfilDaTabela =
        escolherItemPorCor(candidatosMesmoCodigo, corSelecionada, (perfilTabela) => perfilTabela.cores) ||
        candidatosMesmoCodigo.find((perfilTabela) => normalizarPrecoFerragem(perfilTabela.preco) > 0) ||
        candidatosMesmoCodigo[0];

      const precoBarra = normalizarPrecoFerragem(perfilDaTabela?.preco);

      return {
        ...perfilResultado,
        nome: perfilDaTabela?.nome || perfilResultado.nome,
        corEncontrada: perfilDaTabela?.cores || corPerfil,
        precoBarra,
        valorTotal: Number((precoBarra * perfilResultado.quantidadeBarras).toFixed(2)),
      };
    });
  }, [corPerfil, corPerfilSelecionada, perfisTabela, resultado.perfis]);

const acessoriosComPrecoTabela = useMemo(() => {
    if (!corMaterialSelecionada(corPerfil)) return [];
  const pontoDivisao = (quantidadeDivisoesNumero + 1) * quantidadeNumero;
  const quantidadeFixadores = pontoDivisao * 2;
  const guarnicaoM = Number(((resultado.larguraVidroMm * 2 * resultado.quantidadeTotalVidros) / 1000).toFixed(2));

  const regras = tipoSacada === "tubo"
    ? [
      { nome: "Chumbador", codigo: "CHU842", quantidade: pontoDivisao },
    ]
    : [
      { nome: "Canopla", codigo: "CAN625", quantidade: pontoDivisao },
      { nome: "Chumbador", codigo: "CHU842", quantidade: pontoDivisao },
      { nome: "Suporte fixacao corrimao", codigo: "SUP626", quantidade: pontoDivisao },
      { nome: "Suporte fixacao vidro", codigo: "SUP627", quantidade: pontoDivisao },
      { nome: "Parafuso 1/4 x 5/8", codigo: "PAR656", quantidade: quantidadeFixadores, pacote: 100 },
      { nome: "Porca 1/4", codigo: "POR517", quantidade: quantidadeFixadores, pacote: 100 },
      { nome: "Tampa nylon 3/4", codigo: "NYL314", quantidade: quantidadeFixadores, pacote: 100 },
      { nome: "Tapa furo 3/8", codigo: "NYL042", quantidade: quantidadeDivisoesNumero * 3, pacote: 100, precoPorPacote: true },
      { nome: "Guarnicao", codigo: "GUA33", quantidade: guarnicaoM, pacote: 50 },
    ];

  return regras.map(({ nome, codigo, quantidade, pacote, precoPorPacote }) => {
    const corUsar = resolverCorAcessorio(codigo, corPerfil);
    const resultado = resolverFerragemPorCodigoECor(
      ferragensTabela,
      codigo,
      nome,
      corUsar
    );

    const precoUnitario = resultado.preco;
    const quantidadeNecessaria = Number(quantidade) || 0;

    const quantidadePacote = pacote ? Math.ceil(quantidadeNecessaria / pacote) * pacote
      : quantidadeNecessaria;
    const quantidadeParaPreco = precoPorPacote && pacote ? Math.ceil(quantidadeNecessaria / pacote)
      : quantidadePacote;

    if (process.env.NODE_ENV !== "production" && precoUnitario === 0) {
      const codigoNorm = normalizarCodigo(codigo);
      const codigosAceitos = new Set([
        ...(CODIGOS_EQUIVALENTES[codigoNorm] || [codigoNorm]).map((item) => normalizarCodigo(item)),
      ]);
      const registros = ferragensTabela
        .filter((f) => codigosAceitos.has(normalizarCodigo(f.codigo)))
        .map((f) => ({ codigo: f.codigo, nome: f.nome, cores: f.cores, preco: f.preco }));

      console.warn("[SACADA][FERRAGENS] Acessorio zerado", {
        codigo,
        nome,
        corPerfil,
        corUsar,
        registrosBanco: registros,
      });
    }

    return {
      nome,
      codigo,
      corEncontrada: resultado.corEncontrada,
      quantidade: quantidadeNecessaria,
      quantidadePacote: pacote ? quantidadePacote : undefined,
      pacote,
      precoPorPacote: Boolean(precoPorPacote),
      precoUnitario,
      valorTotal: Number((quantidadeParaPreco * precoUnitario).toFixed(2)),
    };
  });
}, [
  corPerfil,
  ferragensTabela,
  quantidadeDivisoesNumero,
  quantidadeNumero,
  resultado.larguraVidroMm,
  resultado.quantidadeTotalVidros,
  tipoSacada
]);

  // Log temporário para debug de acessórios
  useEffect(() => {
    if (acessoriosComPrecoTabela.length > 0 && ferragensTabela.length > 0) {
      console.table(
        acessoriosComPrecoTabela.map((a) => ({
          nome: a.nome,
          codigo: a.codigo,
          cor: a.corEncontrada,
          preco: a.precoUnitario,
          qtd: a.quantidade,
          valorTotal: a.valorTotal,
          status: a.precoUnitario > 0 ? "OK" : "⚠️ ZERADO",
        }))
      );

      const zerados = acessoriosComPrecoTabela.filter((a) => a.precoUnitario === 0);
      if (zerados.length > 0) {
        console.warn("[SACADA] Acessórios zerados:", zerados.map((a) => a.codigo));
        zerados.forEach((a) => {
          const codigoNorm = normalizarCodigo(a.codigo);
          const codigosAceitos = new Set([
            ...(CODIGOS_EQUIVALENTES[codigoNorm] || [codigoNorm]).map((item) => normalizarCodigo(item)),
          ]);
          const nobanco = ferragensTabela
            .filter((f) => codigosAceitos.has(normalizarCodigo(f.codigo)))
            .map((f) => ({ codigo: f.codigo, nome: f.nome, cores: f.cores, preco: f.preco }));
          console.warn(`[SACADA] ${a.codigo} (${a.nome}) - registros no banco:`, nobanco.length > 0 ? nobanco : "NENHUM ENCONTRADO");
        });
      }
    }
  }, [acessoriosComPrecoTabela, ferragensTabela]);

  const totalPerfisCalculado = useMemo(
    () => Number(perfisComPrecoTabela.reduce((acc, perfil) => acc + perfil.valorTotal, 0).toFixed(2)),
    [perfisComPrecoTabela]
  );

  const totalAcessoriosCalculado = useMemo(
    () => Number(acessoriosComPrecoTabela.reduce((acc, acessorio) => acc + acessorio.valorTotal, 0).toFixed(2)),
    [acessoriosComPrecoTabela]
  );

  const totalGeralCalculado = useMemo(
    () => Number((resultado.totalVidro + totalPerfisCalculado + totalAcessoriosCalculado).toFixed(2)),
    [resultado.totalVidro, totalPerfisCalculado, totalAcessoriosCalculado]
  );

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (!termo) return listaClientes;
    return listaClientes.filter((c) => c.nome?.toLowerCase().includes(termo));
  }, [buscaCliente, listaClientes]);

  const nomeClienteSelecionado = useMemo(
    () => listaClientes.find((c) => String(c.id) === String(clienteId))?.nome || "",
    [clienteId, listaClientes]
  );

  const montarMateriaisCentral = (): ProjetoIndividualMaterial[] => [
    {
      id: "vidro-sacada-frontal",
      qtd: resultado.areaTotalVidro,
      unidade: "m2",
      descricao: `VIDRO ${montarDescricaoVidro(vidroSelecionado)}`.toUpperCase(),
      ...precoMaterialVidro(precoVidroM2Efetivo, `${resultado.larguraVidroMm}x${resultado.alturaVidroMm}`, regraMedidaVidro),
      medida: `${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm`,
      vidroDescricao: montarDescricaoVidro(vidroSelecionado).toUpperCase(),
    },
    ...perfisComPrecoTabela.map((perfil) => ({
      id: `perfil-${perfil.codigo}`,
      qtd: Number(perfil.quantidadeBarras || 0),
      unidade: "barra",
      descricao: `${perfil.codigo} - ${perfil.nome}`.toUpperCase(),
      valorUnitario: Number(perfil.precoBarra || 0),
      codigoPerfil: perfil.codigo,
      comprimentoBarra: 6000,
      cortes: perfil.cortes?.length ? perfil.cortes : perfil.comprimentoTotal ? [Number(perfil.comprimentoTotal)] : [],
    })),
    ...acessoriosComPrecoTabela.map((acessorio) => ({
      id: `acessorio-${acessorio.codigo}`,
      qtd: acessorio.precoUnitario > 0 ? Number((acessorio.valorTotal / acessorio.precoUnitario).toFixed(3))
        : Number(acessorio.quantidadePacote || acessorio.quantidade || 0),
      unidade: acessorio.pacote ? "pacote" : "und",
      descricao: `${acessorio.codigo} - ${acessorio.nome}`.toUpperCase(),
      valorUnitario: Number(acessorio.precoUnitario || 0),
      origemCalculo: tipoSacada === "panoramica" && acessorio.pacote
        ? `sacada-panoramica:pacote:${acessorio.codigo}`
        : undefined,
      codigoOriginalCalculo: acessorio.codigo,
      quantidadeBasePacote: acessorio.pacote ? Number(acessorio.quantidade || 0) : undefined,
      tamanhoPacote: acessorio.pacote,
      precoPorPacote: acessorio.pacote ? Boolean(acessorio.precoPorPacote) : undefined,
    })),
  ];

  const montarItemCentral = (id?: string): SacadaFrontalCentralItem => {
    const centralDados: SacadaFrontalDraft = {
      clienteId,
      buscaCliente,
      obra,
      larguraVaoMm,
      alturaVaoMm,
      quantidadeVaos,
      quantidadeDivisoesLargura,
      tipoSacada,
      buscaVidro,
      vidroId,
      corPerfil,
    };

    return {
      id: id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      numero: "Novo Orçamento",
      projeto: tipoSacada === "tubo" ? "Sacada frontal tubo" : "Sacada frontal panorâmica",
      cliente: nomeClienteSelecionado || buscaCliente || "",
      medidas: `${larguraNumero} x ${alturaNumero} mm`,
      largura: larguraNumero,
      altura: alturaNumero,
      quantidade: quantidadeNumero,
      modo: tipoSacada === "tubo" ? "Sacada tubo" : "Sacada panorâmica",
      desenhoUrl: "",
      vidro: montarDescricaoVidro(vidroSelecionado),
      corKit: corPerfil || "Não selecionada",
      corPerfil: corPerfil || "Não selecionada",
      trilho: `${quantidadeDivisoesNumero} divisão(ões)`,
      trinco: tipoSacada === "tubo" ? "Sacada tubo" : "Sacada panorâmica",
      pecasDivisao: resultado.quantidadeVidrosPorVao,
      medidasDetalhadas: `Vidro: ${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm\nDivisões por vão: ${quantidadeDivisoesNumero}\nTipo: ${tipoSacada === "tubo" ? "Sacada tubo" : "Sacada panorâmica"}`,
      valorTotal: totalGeralCalculado,
      materiais: montarMateriaisCentral(),
      origemRota: "/calculo/sacadafrontal",
      centralDados,
    };
  };

  const enviarParaCentralImpressao = async () => {
    if (envioEmAndamentoRef.current) return;
    envioEmAndamentoRef.current = true;
    setSalvando(true);
    try {
      const itemCentral = montarItemCentral(centralItemId || undefined);
    if (!await confirmarEnvioOrcamento([itemCentral])) return;
      const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = salvo ? (JSON.parse(salvo) as SacadaFrontalCentralItem[]) : [];
      const proximaLista = centralItemId && lista.some((item) => item.id === centralItemId) ? lista.map((item) => item.id === centralItemId ? itemCentral : item)
        : [...lista, itemCentral];

      window.localStorage.setItem(CENTRAL_IMPRESSAO_KEY, JSON.stringify(proximaLista));
      const clienteCentral = nomeClienteSelecionado || buscaCliente;
      if (clienteCentral) window.localStorage.setItem(CENTRAL_IMPRESSAO_CLIENTE_KEY, clienteCentral);
      if (obra) window.localStorage.setItem(CENTRAL_IMPRESSAO_OBRA_KEY, (itemCentral as { obra?: string }).obra ?? obra);
      window.localStorage.removeItem(chaveDraft);
      router.push(centralItemId ? returnTo : "/central-impressao");
    } catch (erro) {
      console.warn("Não foi possível enviar a sacada frontal para a central:", erro);
      setMensagemSalvo("Erro ao enviar para a central de impressão.");
      setTimeout(() => setMensagemSalvo(""), 5000);
    } finally {
      envioEmAndamentoRef.current = false;
      setSalvando(false);
    }
  };

  const handleSalvar = async () => {
    // Novos projetos e itens da Central não geram registros/números novos aqui.
    // A Central mantém a composição e controla a finalização do orçamento.
    if (!editId || orcamentoAtivo || centralItemId) {
      await enviarParaCentralImpressao();
      return;
    }

    if (salvando) return;
    setSalvando(true);
    setMensagemSalvo("");

    try {
      const numeroFinal = editNumeroFormatado;

      const dadosParaSalvar = {
        numero_formatado: numeroFinal,
        cliente_nome: nomeClienteSelecionado || "Consumidor",
        obra_referencia: obra || "Geral",
        itens: {
          tipo: "sacada_frontal",
          larguraVaoMm: larguraNumero,
          alturaVaoMm: alturaNumero,
          quantidadeVaos: quantidadeNumero,
          divisoesPorVao: quantidadeDivisoesNumero,
          tipoSacada,
          corPerfil: corPerfil || "Não selecionada",
          vidroId,
          vidroDescricao: montarDescricaoVidro(vidroSelecionado),
          perfis: perfisComPrecoTabela,
          acessorios: acessoriosComPrecoTabela,
        },
        valor_total: totalGeralCalculado,
        empresa_id: empresaId,
        metragem_total: resultado.areaTotalVidro,
        peso_total: 0,
        theme_color: DRAWING_COLORS.ink,
      };

      const { error } = await supabase.from("orcamentos").update(dadosParaSalvar).eq("id", editId).eq("empresa_id", empresaId);
      if (error) throw error;
      setMensagemSalvo(`Orçamento ${numeroFinal} atualizado com sucesso!`);
      setTimeout(() => router.push("/admin/relatorio.orcamento"), 1200);
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

  const conteudoCarregando = loading || carregandoInsumos;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F6F8F8" }}>
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

        <main className="gc-sacada p-4 md:p-6 flex-1 space-y-5">

          {conteudoCarregando ? (
            <div className="flex flex-1 items-center justify-center min-h-[60vh]">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: "transparent", borderRightColor: theme.menuIconColor, borderBottomColor: theme.menuIconColor, borderLeftColor: theme.menuIconColor }} />
            </div>
          ) : (<>

          <div className="gc-page-title"><div><span className="gc-eyebrow">PROJETOS & CÁLCULOS / SACADAS</span><h1>Sacada frontal</h1><p>Configuração e orçamento técnico</p></div><PanelsTopLeft size={23} strokeWidth={1.5} /></div>


          <style jsx global>{`
            .gc-sacada { --gc-graphite:#38444B; --gc-silver:#8F9AA1; --gc-mist:#DCE2E4; --gc-lime:#C8D463; --gc-ice:#F6F8F8; color:var(--gc-graphite); }
            .gc-sacada .gc-page-title { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:2px 0 4px; color:var(--gc-graphite); }
            .gc-sacada .gc-page-title h1 { font-size:clamp(23px,2vw,29px); font-weight:650; letter-spacing:-.035em; line-height:1.25; }
            .gc-sacada .gc-page-title p { font-size:13px; color:#6E7C83; margin-top:3px; }
            .gc-sacada .gc-eyebrow { display:block; font-size:10px; letter-spacing:.1em; font-weight:650; color:var(--gc-silver); margin-bottom:5px; }
            .gc-sacada .gc-toolbar,.gc-sacada .gc-config,.gc-sacada .gc-preview-section { background:#fff!important; border-color:var(--gc-mist)!important; box-shadow:none!important; }
            .gc-sacada .gc-toolbar button { border-radius:7px!important; box-shadow:none!important; letter-spacing:.02em; text-transform:none!important; font-size:12px; }
            .gc-sacada .gc-toolbar button:hover { border-color:var(--gc-lime)!important; filter:brightness(.97); }
            .gc-sacada .gc-toolbar input { border-radius:7px!important; }
            .gc-sacada .gc-config-heading > div:first-child { border-radius:6px!important; background:#F1F3E5!important; color:var(--gc-graphite)!important; letter-spacing:.08em!important; }
            .gc-sacada .gc-config-heading h1 { font-size:18px!important; letter-spacing:-.02em; }
            .gc-sacada .gc-fields label { border-radius:8px!important; border-color:var(--gc-mist)!important; background:var(--gc-ice)!important; transition:border-color .15s ease; }
            .gc-sacada .gc-fields label:focus-within { border-color:var(--gc-lime)!important; box-shadow:0 0 0 2px #C8D46333; }
            .gc-sacada .gc-fields input,.gc-sacada .gc-fields select { min-width:0; }
            .gc-sacada .gc-section-heading { display:flex; gap:11px; align-items:center; margin:0 0 14px; min-height:44px; color:var(--gc-graphite); }
            .gc-sacada .gc-section-heading > div { min-width:0; }
            .gc-sacada .gc-section-heading h2,.gc-sacada .gc-section-heading p { line-height:1.45; }
            .gc-sacada .gc-section-heading h2 { font-size:15px; font-weight:650; letter-spacing:-.015em; }
            .gc-sacada .gc-section-heading p { font-size:12px; color:#78868C; margin-top:1px; }
            .gc-sacada .gc-step { flex-shrink:0; border:1px solid var(--gc-mist); background:#fff; border-radius:7px; font-size:11px; font-weight:650; color:#66747A; padding:8px; }
            .gc-sacada .gc-preview-section { border:1px solid var(--gc-mist); border-radius:12px; padding:18px; }
            .gc-sacada .gc-preview-section > article { max-width:760px; margin:14px auto 0; border:0!important; box-shadow:none!important; padding:4px!important; }
            .gc-sacada .gc-preview-section svg { max-height:320px; }
            .gc-sacada section article { border-color:var(--gc-mist)!important; box-shadow:none!important; }
            .gc-sacada section article h2,.gc-sacada section article h3 { font-size:15px!important; font-weight:650!important; }
            .gc-sacada table thead { background:#F1F3F3!important; }
            .gc-sacada table th { letter-spacing:.05em!important; }
            .gc-sacada table tbody tr:hover { background:#F5F7F0!important; }
            .gc-sacada button:focus-visible,.gc-sacada input:focus-visible,.gc-sacada select:focus-visible { outline:2px solid var(--gc-lime); outline-offset:2px; }
            @media(max-width:640px) { .gc-sacada .gc-toolbar > div:last-of-type { flex-wrap:wrap; } .gc-sacada .gc-preview-section { padding:12px; } }
          `}</style>

          {/* CLIENTE / OBRA / AÇÕES */}
          <div className="gc-toolbar rounded-xl border px-3 py-3 flex flex-col xl:flex-row xl:items-center gap-3" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)` }}>
            {/* Cliente */}
            <div className="flex items-center gap-2 flex-1 relative">
              <span className="text-[11px] font-medium uppercase tracking-wide whitespace-nowrap" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>Cliente:</span>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} style={{ color: theme.contentTextLightBg }} />
                <input
                  type="text"
                  placeholder="Pesquisar cliente..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none bg-transparent"
                  style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 13%, transparent)`, color: theme.contentTextLightBg }}
                  value={buscaCliente}
                  onChange={(e) => { setBuscaCliente(e.target.value); setMostrarClientes(true); setClienteIndex?.(-1); }}
                  onFocus={() => setMostrarClientes(true)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") setClienteIndex?.((p) => Math.min(p + 1, clientesFiltrados.length - 1));
                    if (e.key === "ArrowUp") setClienteIndex?.((p) => Math.max(p - 1, 0));
                    if (e.key === "Enter") {
                      const sel = clienteIndex >= 0 ? clientesFiltrados[clienteIndex] : clientesFiltrados[0];
                      if (sel) { setBuscaCliente(sel.nome); setClienteId(String(sel.id)); setMostrarClientes(false); }
                    }
                  }}
                />
                {mostrarClientes && buscaCliente && clientesFiltrados.length > 0 && (
                  <div className="absolute top-full left-0 w-full border rounded-xl shadow-xl z-50 max-h-60 overflow-auto py-1" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 13%, transparent)` }}>
                    {clientesFiltrados.map((c, i) => (
                      <div
                        key={c.id}
                        className="px-4 py-2 text-xs cursor-pointer"
                        style={{
                          backgroundColor: i === clienteIndex ? `color-mix(in srgb, ${theme.menuIconColor} 9%, transparent)` : "transparent",
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

            {/* Obra */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] font-medium uppercase tracking-wide whitespace-nowrap" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>Obra:</span>
              <input
                type="text"
                placeholder="Identificação da obra"
                className="flex-1 py-2 px-3 rounded-xl border text-sm outline-none bg-transparent"
                style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 13%, transparent)`, color: theme.contentTextLightBg }}
                value={obra}
                onChange={(e) => setObra(e.target.value)}
              />
            </div>

            {/* Botões */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setClienteId("");
                  setBuscaCliente("");
                  setObra("");
                  setLarguraVaoMm("");
                  setAlturaVaoMm("");
                  setQuantidadeVaos("");
                  setQuantidadeDivisoesLargura("");
                  setBuscaVidro("");
                  setVidroId("");
                  setCorPerfil("");
                  setMensagemSalvo("");
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium uppercase tracking-wider transition-all active:scale-95 border shadow-sm"
                style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 19%, transparent)`, color: theme.contentTextLightBg }}
              >
                <FilePlus2 size={16} />
                Novo
              </button>

              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                style={{ backgroundColor: "#F1F3E5", color: "#38444B", border: "1px solid #DCE2E4" }}
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-border border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Salvar
              </button>

              <button
                onClick={enviarParaCentralImpressao}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium uppercase tracking-wider transition-all active:scale-95 border shadow-sm"
                style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 19%, transparent)`, color: theme.contentTextLightBg }}
              >
                <FilePlus2 size={16} />
                PDF+
              </button>

              <PDFDownloadLink
                document={
                  <SacadaFrontalPDF
                      avisosMedida={avisosAcrescimoVidro({ materiais: montarMateriaisCentral() })}
                    nomeEmpresa={nomeEmpresa}
                    logoUrl={theme.logoLightUrl || undefined}
                    themeColor={theme.contentTextLightBg}
                    tituloDocumento={tipoSacada === "tubo" ? "Orçamento Sacada Tubo" : "Orçamento Sacada Panorâmica"}
                    nomeCliente={nomeClienteSelecionado || "Não selecionado"}
                    nomeObra={obra || "Geral"}
                    larguraVaoMm={larguraNumero}
                    alturaVaoMm={alturaNumero}
                    quantidadeVaos={quantidadeNumero}
                    divisoesPorVao={quantidadeDivisoesNumero}
                    corPerfil={corPerfil || "Não selecionada"}
                    vidroDescricao={montarDescricaoVidro(vidroSelecionado)}
                    medidaVidro={`${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm`}
                    areaTotal={resultado.areaTotalVidro}
                    totalVidro={resultado.totalVidro}
                    perfis={perfisComPrecoTabela}
                    acessorios={acessoriosComPrecoTabela}
                    totalPerfis={totalPerfisCalculado}
                    totalAcessorios={totalAcessoriosCalculado}
                    totalGeral={totalGeralCalculado}
                    larguraVidroMm={resultado.larguraVidroMm}
                    alturaVidroMm={resultado.alturaVidroMm}
                  />
                }
                fileName={`Sacada Frontal ${nomeClienteSelecionado || "Geral"} - ${Date.now().toString().slice(-6)}.pdf`}
              >
                {({ loading: pdfLoading }) => (
                  <button
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium uppercase tracking-wider transition-all active:scale-95 border shadow-sm"
                    style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 19%, transparent)`, color: theme.contentTextLightBg }}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? (
                      <div className="w-4 h-4 border-2 border-border-strong border-t-border-strong rounded-full animate-spin" />
                    ) : (
                      <Printer size={16} />
                    )}
                    Imprimir
                  </button>
                )}
              </PDFDownloadLink>
            </div>

            {mensagemSalvo && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${mensagemSalvo.includes("Erro") ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
                {mensagemSalvo}
              </span>
            )}
          </div>

          <section className="gc-config rounded-xl border p-4 md:p-5" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)` }}>
            <div className="flex flex-col gap-4">
              <div className="gc-config-heading max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em]" style={{ backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 7%, transparent)`, color: theme.menuIconColor }}>
                  <PanelsTopLeft size={14} />
                  Sacada Frontal
                </div>
                <h1 className="mt-2 text-xl md:text-2xl font-medium leading-tight" style={{ color: theme.contentTextLightBg }}>
                  01 · Configuração do projeto
                </h1>
                <p className="mt-2 max-w-2xl text-xs md:text-sm" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 70%, transparent)` }}>
                  Informe as dimensoes em mm, quantas pecas dividem cada vao na largura e selecione o vidro da sacada. O sistema arredonda o vidro, calcula perfis e barras.
                </p>
              </div>

              <div className="gc-fields grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-3 w-full">
                <label className="rounded-lg border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                    Largura do vao (mm)
                  </span>
                  <input
                    value={larguraVaoMm}
                    onChange={(e) => setLarguraVaoMm(e.target.value)}
                    inputMode="numeric"
                    className="mt-1.5 w-full bg-transparent text-lg font-medium outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-lg border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                    Altura do vao (mm)
                  </span>
                  <input
                    value={alturaVaoMm}
                    onChange={(e) => setAlturaVaoMm(e.target.value)}
                    inputMode="numeric"
                    className="mt-1.5 w-full bg-transparent text-lg font-medium outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-lg border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                    Quantidade de vãos
                  </span>
                  <input
                    value={quantidadeVaos}
                    onChange={(e) => setQuantidadeVaos(e.target.value)}
                    inputMode="numeric"
                    className="mt-1.5 w-full bg-transparent text-lg font-medium outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-lg border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                    Pecas por vao na largura
                  </span>
                  <input
                    value={quantidadeDivisoesLargura}
                    onChange={(e) => setQuantidadeDivisoesLargura(e.target.value)}
                    inputMode="numeric"
                    className="mt-1.5 w-full bg-transparent text-lg font-medium outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-lg border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                    Tipo de sacada
                  </span>
                  <select
                    value={tipoSacada}
                    onChange={(e) => setTipoSacada(e.target.value === "tubo" ? "tubo" : "panoramica")}
                    className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  >
                    {TIPOS_SACADA.map((tipo) => (
                      <option key={tipo.valor} value={tipo.valor} className="text-text-primary">
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-lg border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                    Cor dos perfis
                  </span>
                  <select
                    value={corPerfil}
                    onChange={(e) => setCorPerfil(e.target.value)}
                    className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  >
                    <option value="" className="text-text-primary">Selecione a cor</option>
                    {CORES_PERFIL.map((cor) => (
                      <option key={cor} value={cor} className="text-text-primary">
                        {cor}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-lg border px-3 py-2.5 sm:col-span-2 xl:col-span-1" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                    Cor do Vidro
                  </span>
                  <input
                    value={buscaVidro}
                    onChange={(e) => setBuscaVidro(e.target.value)}
                    placeholder="Digite para filtrar o vidro"
                    className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-2.5 py-1.5 text-xs outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                  <select
                    value={vidroId}
                    onChange={(e) => setVidroId(e.target.value)}
                    className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  >
                    <option value="" className="text-text-primary">Selecione o vidro</option>
                    {vidrosFiltrados.length === 0 ? (
                      <option value="" className="text-text-primary">Nenhum vidro encontrado</option>
                    ) : vidros.length === 0 ? (
                      <option value="" className="text-text-primary">Nenhum vidro cadastrado</option>
                    ) : (
                      vidrosFiltrados.map((vidro) => (
                        <option key={vidro.id} value={vidro.id} className="text-text-primary">
                          {montarDescricaoVidro(vidro)} - {formatarPreco(normalizarPrecoCatalogo(vidro.preco))}/m2
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            </div>
          </section>

          {/* Prévia técnica dinâmica — o desenho e seus cálculos originais foram preservados. */}
          <section className="gc-preview-section">
            <div className="gc-section-heading"><span className="gc-step">02</span><div><h2>Vista frontal do projeto</h2><p>Representação proporcional, atualizada conforme as medidas informadas.</p></div></div>
              <article className="rounded-xl border p-5" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                <h2 className="text-lg font-medium" style={{ color: theme.contentTextLightBg }}>
                  Vista frontal
                </h2>
                <p className="mt-1 text-sm" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 60%, transparent)` }}>
                  Representação proporcional do vão
                </p>
                <div className="mt-4">
                  {(() => {
                    const divisoes = Math.max(quantidadeDivisoesNumero, 1);
                    const larg = larguraNumero || 2000;
                    const alt = alturaNumero || 1000;

                    const svgW = 360;
                    const padL = 40;
                    const padR = 10;
                    const padTop = 15;
                    const padBot = 40;
                    const drawW = svgW - padL - padR;

                    const ratio = Math.min(Math.max(alt / larg, 0.3), 2.0);
                    const drawH = drawW * ratio;
                    const svgH = drawH + padTop + padBot;

                    const postW = Math.max(2.5, Math.min(7, drawW * 0.014));
                    const railH = Math.max(3.5, Math.min(10, drawH * 0.03));

                    const numPosts = divisoes + 1;
                    const totalPostW = numPosts * postW;
                    const glassW = (drawW - totalPostW) / divisoes;
                    const glassH = drawH - railH * 2;
                    const panoramica = tipoSacada === "panoramica";
                    // Folga inferior apenas visual: não altera medidas ou cálculos.
                    const folgaInferiorVisual = panoramica ? Math.max(7, Math.min(13, drawH * 0.075)) : 0;
                    const alturaVidroVisual = panoramica ? drawH - railH - folgaInferiorVisual : glassH;

                    const x0 = padL;
                    const y0 = padTop;


                    // Cor do perfil conforme seleção
                    const corPerfilNorm = normalizarTextoComparacao(corPerfil);
                    const corAluminio = corPerfilNorm === "branco" ? "#E5E9EA"
                      : corPerfilNorm === "preto" ? "#596269"
                        : corPerfilNorm === "fosco" ? "#A4ADB1"
                          : "#B6BEC1";
                    const corAluminioBorda = corPerfilNorm === "branco" ? "#BBC4C8"
                      : corPerfilNorm === "preto" ? "#424C53"
                        : corPerfilNorm === "fosco" ? "#89959B"
                          : "#929EA3";

                    // Cor do vidro (tom esverdeado/azulado de vidro temperado)
                    const corVidroFill = panoramica ? "#9EADB1" : DRAWING_COLORS.glass;
                    const corVidroBorda = panoramica ? "#8B989E" : DRAWING_COLORS.frame;
                    const corVidroReflexo = "#ffffff";

                    return (
                      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={corVidroFill} stopOpacity={panoramica ? 0.18 : 0.35} />
                            <stop offset="50%" stopColor={corVidroFill} stopOpacity={panoramica ? 0.11 : 0.18} />
                            <stop offset="100%" stopColor={corVidroFill} stopOpacity={panoramica ? 0.19 : 0.3} />
                          </linearGradient>
                          <linearGradient id="railGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={corAluminio} />
                            <stop offset="50%" stopColor={corAluminioBorda} />
                            <stop offset="100%" stopColor={corAluminio} />
                          </linearGradient>
                        </defs>

                        {/* Top rail - corrimão */}
                        <rect x={x0} y={y0} width={drawW} height={railH} fill="url(#railGrad)" rx={1.5} />
                        <rect x={x0} y={y0} width={drawW} height={railH} fill="none" stroke={corAluminioBorda} strokeWidth={0.5} rx={1.5} />

                        {/* Na panorâmica, vidro livre na base, como no guarda-corpo da referência.
                            Na sacada tubo, manter o trilho inferior do desenho original. */}
                        {!panoramica && (
                          <>
                            <rect x={x0} y={y0 + drawH - railH} width={drawW} height={railH} fill="url(#railGrad)" rx={1.5} />
                            <rect x={x0} y={y0 + drawH - railH} width={drawW} height={railH} fill="none" stroke={corAluminioBorda} strokeWidth={0.5} rx={1.5} />
                          </>
                        )}

                        {panoramica ? (
                          <>
                        {/* Panorâmica: desenho original preservado */}
                        {Array.from({ length: divisoes }).map((_, i) => {
                          const pX = x0 + i * (glassW + postW);
                          const gX = pX + postW;
                          return (
                            <g key={i}>
                              {/* Pontalete */}
                              <rect x={pX} y={y0} width={postW} height={drawH} fill={corAluminio} rx={0.5} />
                              <rect x={pX} y={y0} width={postW} height={drawH} fill="none" stroke={corAluminioBorda} strokeWidth={0.4} rx={0.5} />

                              {/* Base individual do pontalete: discreta e visível na panorâmica */}
                              {panoramica && (
                                <>
                                  <rect x={pX - 2.5} y={y0 + drawH - 3} width={postW + 5} height={3} rx={0.7} fill={corAluminioBorda} opacity={0.75} />
                                  <rect x={pX - 4} y={y0 + drawH} width={postW + 8} height={2} rx={0.6} fill={corAluminio} stroke={corAluminioBorda} strokeWidth={0.4} />
                                </>
                              )}

                              {/* Vidro */}
                              <rect x={gX} y={y0 + railH} width={glassW} height={alturaVidroVisual} fill="url(#glassGrad)" rx={1} />
                              <rect x={gX} y={y0 + railH} width={glassW} height={alturaVidroVisual} fill="none" stroke={corVidroBorda} strokeWidth={0.6} strokeOpacity={0.5} rx={1} />

                              {/* Reflexo diagonal */}
                              <line x1={gX + glassW * 0.18} y1={y0 + railH + (alturaVidroVisual) * 0.06} x2={gX + glassW * 0.08} y2={y0 + railH + (alturaVidroVisual) * 0.38} stroke={corVidroReflexo} strokeWidth={0.7} strokeOpacity={0.3} />
                              <line x1={gX + glassW * 0.24} y1={y0 + railH + (alturaVidroVisual) * 0.06} x2={gX + glassW * 0.14} y2={y0 + railH + (alturaVidroVisual) * 0.38} stroke={corVidroReflexo} strokeWidth={0.4} strokeOpacity={0.18} />

                            </g>
                          );
                        })}

                        {/* Last pontalete */}
                        <rect x={x0 + divisoes * (glassW + postW)} y={y0} width={postW} height={drawH} fill={corAluminio} rx={0.5} />
                        <rect x={x0 + divisoes * (glassW + postW)} y={y0} width={postW} height={drawH} fill="none" stroke={corAluminioBorda} strokeWidth={0.4} rx={0.5} />

                        {panoramica && (
                          <>
                            <rect x={x0 + divisoes * (glassW + postW) - 2.5} y={y0 + drawH - 3} width={postW + 5} height={3} rx={0.7} fill={corAluminioBorda} opacity={0.75} />
                            <rect x={x0 + divisoes * (glassW + postW) - 4} y={y0 + drawH} width={postW + 8} height={2} rx={0.6} fill={corAluminio} stroke={corAluminioBorda} strokeWidth={0.4} />
                          </>
                        )}

                          </>
                        ) : (
                          <>
                            {/* Tubos estruturais ao fundo, com brilho metálico discreto. */}
                            {Array.from({ length: divisoes + 1 }, (_, i) => {
                              const px = x0 + (drawW * i) / divisoes;
                              const tuboX = Math.max(x0, Math.min(px - postW / 2, x0 + drawW - postW));
                              return (
                                <g key={`tubo-${i}`}>
                                  <rect x={tuboX} y={y0 + railH} width={postW} height={drawH - railH * 2} fill="url(#railGrad)" stroke={corAluminioBorda} strokeWidth={0.5} />
                                  <line x1={tuboX + postW * 0.25} y1={y0 + railH + 1} x2={tuboX + postW * 0.25} y2={y0 + drawH - railH - 1} stroke="#fff" strokeOpacity={0.28} strokeWidth={0.55} />
                                </g>
                              );
                            })}
                            {/* Painéis sobrepostos aos tubos: a transparência deixa a estrutura aparecer por trás. */}
                            {Array.from({ length: divisoes }, (_, i) => {
                              const larguraPainel = drawW / divisoes;
                              const px = x0 + i * larguraPainel;
                              const junta = Math.max(0.45, Math.min(0.8, larguraPainel * 0.008));
                              return (
                                <g key={`vidro-tubo-${i}`}>
                                  <rect x={px + junta / 2} y={y0 + railH + 0.8} width={Math.max(larguraPainel - junta, 0)} height={Math.max(drawH - railH * 2 - 1.6, 0)} fill="#D8E8ED" fillOpacity={0.32} stroke="#94AAB3" strokeWidth={0.35} strokeOpacity={0.42} />
                                  <path d={`M ${px + larguraPainel * 0.47} ${y0 + railH + 5} l ${-larguraPainel * 0.23} ${Math.min(drawH * 0.31, 42)}`} stroke="#fff" strokeWidth={1.15} strokeOpacity={0.35} fill="none" />
                                  <path d={`M ${px + larguraPainel * 0.52} ${y0 + railH + 5} l ${-larguraPainel * 0.23} ${Math.min(drawH * 0.31, 42)}`} stroke="#fff" strokeWidth={0.6} strokeOpacity={0.22} fill="none" />
                                </g>
                              );
                            })}
                            {/* Perfil U apenas no perímetro. Tubo superior horizontal preservado. */}
                            <rect x={x0} y={y0} width={drawW} height={railH} fill="url(#railGrad)" stroke={corAluminioBorda} strokeWidth={0.55} />
                            <rect x={x0} y={y0 + drawH - railH} width={drawW} height={railH} fill="url(#railGrad)" stroke={corAluminioBorda} strokeWidth={0.5} />
                            <rect x={x0} y={y0 + railH} width={Math.max(1.4, postW * 0.35)} height={drawH - railH * 2} fill={corAluminio} stroke={corAluminioBorda} strokeWidth={0.3} />
                            <rect x={x0 + drawW - Math.max(1.4, postW * 0.35)} y={y0 + railH} width={Math.max(1.4, postW * 0.35)} height={drawH - railH * 2} fill={corAluminio} stroke={corAluminioBorda} strokeWidth={0.3} />
                          </>
                        )}

                        {/* Dimension: largura (bottom) */}
                        <line x1={x0} y1={y0 + drawH + 14} x2={x0 + drawW} y2={y0 + drawH + 14} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <line x1={x0} y1={y0 + drawH + 10} x2={x0} y2={y0 + drawH + 18} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <line x1={x0 + drawW} y1={y0 + drawH + 10} x2={x0 + drawW} y2={y0 + drawH + 18} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <text x={x0 + drawW / 2} y={y0 + drawH + 28} textAnchor="middle" fontSize={9.5} fill={theme.contentTextLightBg} opacity={0.6} fontWeight={700} fontFamily="Inter, Arial, sans-serif">
                          {formatarNumero(larg, 0)} mm
                        </text>

                        {/* Dimension: altura (left) */}
                        <line x1={x0 - 10} y1={y0} x2={x0 - 10} y2={y0 + drawH} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <line x1={x0 - 14} y1={y0} x2={x0 - 6} y2={y0} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <line x1={x0 - 14} y1={y0 + drawH} x2={x0 - 6} y2={y0 + drawH} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <text x={0} y={0} textAnchor="middle" fontSize={9.5} fill={theme.contentTextLightBg} opacity={0.6} fontWeight={700} fontFamily="Inter, Arial, sans-serif" transform={`translate(${x0 - 22}, ${y0 + drawH / 2}) rotate(-90)`}>
                          {formatarNumero(alt, 0)} mm
                        </text>
                      </svg>
                    );
                  })()}
                </div>
                {/* Medida do vidro e info de vãos */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  <span className="text-xs font-semibold" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 44%, transparent)` }}>
                    Vidro: {formatarNumero(resultado.larguraVidroMm, 0)} x {formatarNumero(resultado.alturaVidroMm, 0)} mm
                  </span>
                  {quantidadeNumero > 1 && (
                    <span className="text-xs font-semibold" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 31%, transparent)` }}>
                      x {quantidadeNumero} vãos
                    </span>
                  )}
                  <span className="text-xs" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 31%, transparent)` }}>
                    {quantidadeDivisoesNumero} {quantidadeDivisoesNumero === 1 ? "peça" : "peças"} por vão
                  </span>
                </div>
              </article>
          </section>

          <div className="gc-section-heading"><span className="gc-step">03</span><div><h2>Resultado do cálculo</h2><p>Medidas e valores calculados automaticamente.</p></div></div>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                titulo: "Medida de cada vidro",
                valor: `${formatarNumero(resultado.larguraVidroMm, 0)} x ${formatarNumero(resultado.alturaVidroMm, 0)} mm`,
                detalhe: `${resultado.quantidadeVidrosPorVao} vidros por vao`,
                icone: Ruler,
              },
              {
                titulo: "Área total de vidro",
                valor: `${formatarNumero(resultado.areaTotalVidro)} m²`,
                detalhe: resultado.vidroTipo,
                icone: SquareStack,
              },
              {
                titulo: "Total de vidro",
                valor: formatarPreco(resultado.totalVidro),
                detalhe: `${formatarPreco(resultado.precoVidroM2)}/m2`,
                icone: Package2,
              },
              {
                titulo: "Total geral",
                valor: formatarPreco(totalGeralCalculado),
                detalhe: "Perfis, acessorios e vidro com precos da tabela",
                icone: Calculator,
              },
            ].map((card) => (
              <article key={card.titulo} className="rounded-xl border px-3 py-3" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 44%, transparent)` }}>
                      {card.titulo}
                    </p>
                    <p className="mt-2 text-xl font-medium leading-tight" style={{ color: theme.contentTextLightBg }}>
                      {card.valor}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 64%, transparent)` }}>
                      {card.detalhe}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 8%, transparent)`, color: theme.menuIconColor }}>
                    <card.icone size={19} />
                  </div>
                </div>
              </article>
            ))}
          </section>

          <div className="gc-section-heading"><span className="gc-step">04</span><div><h2>Materiais e resumo técnico</h2><p>Perfis, acessórios e composição do orçamento.</p></div></div>
          <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-3">
            <article className="rounded-xl border overflow-hidden" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                <h2 className="text-lg font-medium" style={{ color: theme.contentTextLightBg }}>
                  Perfis de alumínio
                </h2>
                <p className="mt-1 text-sm" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 60%, transparent)` }}>
                  Barras calculadas com base em 6000 mm por barra.
                </p>
              </div>

              <div className="overflow-x-auto">
                {resultado.totalVidro > 0 && <AvisoAcrescimoVidro regra={regraMedidaVidro} medidas={[{ largura: resultado.larguraVidroMm, altura: resultado.alturaVidroMm }]} />}
                  <table className="w-full min-w-190 text-sm">
                  <thead style={{ backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 6%, transparent)`, color: theme.contentTextLightBg }}>
                    <tr>
                      <th className="text-left px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Perfil</th>
                      <th className="text-left px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Código</th>
                      <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Comprimento total</th>
                      <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Barras</th>
                      <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Preço barra</th>
                      <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfisComPrecoTabela.map((perfil, index) => (
                      <tr key={perfil.codigo} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `color-mix(in srgb, ${theme.screenBackgroundColor} 65%, transparent)` }}>
                        <td className="px-5 py-3 font-semibold" style={{ color: theme.contentTextLightBg }}>{perfil.nome}</td>
                        <td className="px-5 py-3" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 70%, transparent)` }}>{perfil.codigo}</td>
                        <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>{formatarNumero(perfil.comprimentoTotal, 0)} mm</td>
                        <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>{perfil.quantidadeBarras}</td>
                        <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>{corPerfilSelecionada ? formatarPreco(perfil.precoBarra) : "-"}</td>
                        <td className="px-5 py-3 text-right font-medium" style={{ color: theme.contentTextLightBg }}>{corPerfilSelecionada ? formatarPreco(perfil.valorTotal) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `1px solid color-mix(in srgb, ${theme.contentTextLightBg} 8%, transparent)` }}>
                      <td colSpan={5} className="px-5 py-3 text-right text-sm font-medium" style={{ color: theme.contentTextLightBg }}>
                        Total dos perfis
                      </td>
                      <td className="px-5 py-3 text-right text-base font-medium" style={{ color: theme.contentTextLightBg }}>
                        {formatarPreco(totalPerfisCalculado)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-t" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                  <h3 className="text-lg font-medium" style={{ color: theme.contentTextLightBg }}>
                    Acessorios
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 60%, transparent)` }}>
                    Valores localizados na tabela de ferragens conforme a cor selecionada.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-190 text-sm">
                    <thead style={{ backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 6%, transparent)`, color: theme.contentTextLightBg }}>
                      <tr>
                        <th className="text-left px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Acessorio</th>
                        <th className="text-left px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Codigo</th>
                        <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Qtd</th>
                        <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Preco unit.</th>
                        <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Valor total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acessoriosComPrecoTabela.map((acessorio, index) => (
                        <tr key={`${acessorio.codigo}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `color-mix(in srgb, ${theme.screenBackgroundColor} 65%, transparent)` }}>
                          <td className="px-5 py-3 font-semibold" style={{ color: theme.contentTextLightBg }}>{acessorio.nome}</td>
                          <td className="px-5 py-3" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 70%, transparent)` }}>{acessorio.codigo}</td>
                          <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>
                            {acessorio.quantidadePacote ? <span>{acessorio.quantidadePacote} <span className="text-[10px] opacity-60">(pct {acessorio.pacote})</span></span>
                              : acessorio.quantidade}
                          </td>
                          <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>{corPerfilSelecionada ? formatarPreco(acessorio.precoUnitario) : "-"}</td>
                          <td className="px-5 py-3 text-right font-medium" style={{ color: theme.contentTextLightBg }}>{corPerfilSelecionada ? formatarPreco(acessorio.valorTotal) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `1px solid color-mix(in srgb, ${theme.contentTextLightBg} 8%, transparent)` }}>
                        <td colSpan={4} className="px-5 py-3 text-right text-sm font-medium" style={{ color: theme.contentTextLightBg }}>
                          Total dos acessorios
                        </td>
                        <td className="px-5 py-3 text-right text-base font-medium" style={{ color: theme.contentTextLightBg }}>
                          {formatarPreco(totalAcessoriosCalculado)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </article>

            <div className="space-y-6">


              <article className="rounded-xl border p-5" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                <h2 className="text-lg font-medium" style={{ color: theme.contentTextLightBg }}>
                  Resumo técnico
                </h2>
                <div className="mt-5 space-y-4">
                  {[
                    ["Quantidade total de vidros", String(resultado.quantidadeTotalVidros)],
                    ["Pontaletes por vao", String(resultado.quantidadePontaletesPorVao)],
                    ["Área por peça", `${formatarNumero(resultado.areaVidroPorPeca)} m²`],
                    ["Vidro especificado", resultado.vidroTipo],
                    ["Cor dos perfis", corPerfil],
                    ["Medida para calculo", `${formatarNumero(resultado.larguraVidroCalculoMm, 0)} x ${formatarNumero(resultado.alturaVidroCalculoMm, 0)} mm`],
                    ["Total dos perfis", formatarPreco(totalPerfisCalculado)],
                    ["Total dos acessorios", formatarPreco(totalAcessoriosCalculado)],
                    ["Total geral", formatarPreco(totalGeralCalculado)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <span className="text-sm" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 56%, transparent)` }}>{label}</span>
                      <span className="text-sm font-medium text-right" style={{ color: theme.contentTextLightBg }}>{value}</span>
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
