"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Calculator, PanelsTopLeft, Ruler, SquareStack, Package2, Printer, Save, Search, FilePlus2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { formatarPreco } from "@/utils/formatarPreco";
import { calcularSacadaFrontal } from "@/utils/sacada-frontal-calc";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { SacadaFrontalPDF } from "@/app/relatorios/sacadafrontal/SacadaFrontalPDF";

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
  buscaVidro: string;
  vidroId: string;
  corPerfil: string;
};

const CORES_PERFIL = ["Branco", "Preto", "Fosco"];
const SACADA_FRONTAL_DRAFT_KEY = "sacada-frontal-draft";
const CODIGOS_COR_PERFIL = new Set(["CAN625", "SUP626", "NYL314", "NYL042"]);
const CODIGOS_SEMPRE_PRETO = new Set(["GUA033"]);
const CODIGOS_EQUIVALENTES: Record<string, string[]> = {
  NYL314: ["NYL314", "NYL342"],
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
    .split(",")
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

const semCorCadastrada = (coresItem?: string | null) => !normalizarTextoComparacao(coresItem);

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
      // Ex.: 1.234,56 -> 1234.56
      normalizado = somenteNumero.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // Ex.: 1,234.56 -> 1234.56
      normalizado = somenteNumero.replace(/,/g, "");
    }
  } else if (temVirgula) {
    // Ex.: 12,50 -> 12.50
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
  const { theme } = useTheme();
  const { user, empresaId, nomeEmpresa, loading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  const [listaClientes, setListaClientes] = useState<ClienteSacada[]>([]);
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
  const [quantidadeVaos, setQuantidadeVaos] = useState("");
  const [quantidadeDivisoesLargura, setQuantidadeDivisoesLargura] = useState("");
  const [vidros, setVidros] = useState<Vidro[]>([]);
  const [perfisTabela, setPerfisTabela] = useState<PerfilTabela[]>([]);
  const [ferragensTabela, setFerragensTabela] = useState<FerragemTabela[]>([]);
  const [buscaVidro, setBuscaVidro] = useState("");
  const [vidroId, setVidroId] = useState("");
  const [corPerfil, setCorPerfil] = useState("");
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoEspecial[]>([]);
  const [carregandoInsumos, setCarregandoInsumos] = useState(true);
  const [draftHidratado, setDraftHidratado] = useState(false);

  const chaveDraft = useMemo(
    () => `${SACADA_FRONTAL_DRAFT_KEY}:${empresaId || "global"}`,
    [empresaId]
  );

  useEffect(() => {
    setDraftHidratado(false);

    if (typeof window === "undefined" || editId) {
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
      if (typeof draft.buscaVidro === "string") setBuscaVidro(draft.buscaVidro);
      if (typeof draft.vidroId === "string") setVidroId(draft.vidroId);
      if (typeof draft.corPerfil === "string") setCorPerfil(draft.corPerfil);
    } catch (error) {
      console.warn("Nao foi possivel restaurar rascunho da sacada frontal:", error);
    } finally {
      setDraftHidratado(true);
    }
  }, [chaveDraft]);

  useEffect(() => {
    if (!draftHidratado || typeof window === "undefined" || editId) {
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
    draftHidratado,
    larguraVaoMm,
    obra,
    quantidadeDivisoesLargura,
    quantidadeVaos,
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
      if (itensData.corPerfil) setCorPerfil(String(itensData.corPerfil));
      if (itensData.vidroId) setVidroId(String(itensData.vidroId));

      // Vincular cliente pelo nome
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
    if (!carregandoInsumos && !vidros.length && vidroId) {
      setVidroId("");
    }
  }, [carregandoInsumos, vidroId, vidros]);

  const vidroSelecionado = useMemo(
    () => vidros.find((vidro) => vidro.id === vidroId) || null,
    [vidroId, vidros]
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
      if (especial) return Number(especial.preco);
    }
    return Number(vidroSelecionado.preco) || 0;
  }, [clienteId, listaClientes, precosEspeciais, vidroSelecionado]);

  const resultado = useMemo(
    () => calcularSacadaFrontal({
      larguraVaoMm: larguraNumero,
      alturaVaoMm: alturaNumero,
      quantidadeVaos: quantidadeNumero,
      quantidadeDivisoesLargura: quantidadeDivisoesNumero,
      precoVidroM2: precoVidroM2Efetivo,
      vidroDescricao: montarDescricaoVidro(vidroSelecionado),
    }),
    [alturaNumero, larguraNumero, quantidadeDivisoesNumero, quantidadeNumero, precoVidroM2Efetivo, vidroSelecionado]
  );

  const corPerfilSelecionada = Boolean(normalizarTextoComparacao(corPerfil));

  const perfisComPrecoTabela = useMemo(() => {
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
      const perfilDaTabela = perfisTabela.find((perfilTabela) => {
        const mesmoCodigo = normalizarTextoComparacao(perfilTabela.codigo) === normalizarTextoComparacao(perfilResultado.codigo);
        if (!mesmoCodigo) {
          return false;
        }

        return atendeCor(perfilTabela.cores, corSelecionada);
      }) || perfisTabela.find((perfilTabela) =>
        normalizarTextoComparacao(perfilTabela.codigo) === normalizarTextoComparacao(perfilResultado.codigo)
      );

      const precoBarra = Number(perfilDaTabela?.preco) || perfilResultado.precoBarra;

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
  const pontoDivisao = (quantidadeDivisoesNumero + 1) * quantidadeNumero;
  const guarnicaoMm = (resultado.larguraVidroMm * 2 + 50) * resultado.quantidadeTotalVidros;

  const regras = [
    { nome: "Canopla", codigo: "CAN625", quantidade: pontoDivisao },
    { nome: "Chumbador", codigo: "CHU842", quantidade: pontoDivisao },
    { nome: "Suporte fixacao corrimao", codigo: "SUP626", quantidade: pontoDivisao },
    { nome: "Suporte fixacao vidro", codigo: "SUP627", quantidade: pontoDivisao },
    { nome: "Parafuso 1/4 x 5/8", codigo: "PAR656", quantidade: pontoDivisao, pacote: 100 },
    { nome: "Porca 1/4", codigo: "POR517", quantidade: pontoDivisao, pacote: 100 },
    { nome: "Tampa nylon 3/4", codigo: "NYL314", quantidade: pontoDivisao, pacote: 100 },
    { nome: "Tapa furo 3/8", codigo: "NYL042", quantidade: quantidadeDivisoesNumero * 3 * quantidadeNumero, pacote: 100 },
    { nome: "Guarnicao", codigo: "GUA033", quantidade: Number((guarnicaoMm / 1000).toFixed(2)), pacote: 50 },
  ];

  return regras.map(({ nome, codigo, quantidade, pacote }) => {
    const corUsar = resolverCorAcessorio(codigo, corPerfil);
    const resultado = resolverFerragemPorCodigoECor(
      ferragensTabela,
      codigo,
      nome,
      corUsar
    );

    const precoUnitario = resultado.preco;
    const quantidadeNecessaria = Number(quantidade) || 0;

    const quantidadePacote = pacote
      ? Math.ceil(quantidadeNecessaria / pacote) * pacote
      : quantidadeNecessaria;

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
      precoUnitario,
      valorTotal: Number((quantidadePacote * precoUnitario).toFixed(2)),
    };
  });
}, [
  corPerfil,
  ferragensTabela,
  quantidadeDivisoesNumero,
  quantidadeNumero,
  resultado.larguraVidroMm,
  resultado.quantidadeTotalVidros
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

  const handleSalvar = async () => {
    if (salvando) return;
    setSalvando(true);
    setMensagemSalvo("");

    try {
      let numeroFinal = editNumeroFormatado;

      if (!editId) {
        const dataAtual = new Date();
        const prefixoData = `SAC${dataAtual.getFullYear().toString().slice(-2)}${(dataAtual.getMonth() + 1).toString().padStart(2, "0")}`;
        const { data: ultimos } = await supabase
          .from("orcamentos")
          .select("numero_formatado")
          .like("numero_formatado", `${prefixoData}%`)
          .order("numero_formatado", { ascending: false })
          .limit(1);

        let seq = 1;
        if (ultimos && ultimos.length > 0) {
          seq = parseInt(ultimos[0].numero_formatado.slice(-2)) + 1;
        }
        numeroFinal = `${prefixoData}${seq.toString().padStart(2, "0")}`;
      }

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

  const conteudoCarregando = loading || carregandoInsumos;

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
            {/* Cliente */}
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

            {/* Obra */}
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

              <PDFDownloadLink
                document={
                  <SacadaFrontalPDF
                    nomeEmpresa={nomeEmpresa}
                    logoUrl={theme.logoLightUrl || undefined}
                    themeColor={theme.contentTextLightBg}
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
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 border shadow-sm"
                    style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                      <Printer size={16} />
                    )}
                    PDF
                  </button>
                )}
              </PDFDownloadLink>
            </div>

            {mensagemSalvo && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${mensagemSalvo.includes("Erro") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                {mensagemSalvo}
              </span>
            )}
          </div>

          <section className="rounded-4xl border p-6 md:p-8 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: `${theme.menuIconColor}12`, color: theme.menuIconColor }}>
                  <PanelsTopLeft size={14} />
                  Sacada Frontal
                </div>
                <h1 className="mt-4 text-3xl md:text-5xl font-black leading-none" style={{ color: theme.contentTextLightBg }}>
                  Cálculo de orçamento sacada com gradil de alumínio
                </h1>
                <p className="mt-4 max-w-2xl text-sm md:text-base" style={{ color: `${theme.contentTextLightBg}B3` }}>
                  Informe as dimensoes em mm, quantas pecas dividem cada vao na largura e selecione o vidro da tabela. O sistema arredonda o vidro, calcula perfis e barras.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 w-full md:w-auto md:min-w-105">
                <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Largura do vao (mm)
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
                    Altura do vao (mm)
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
                    Quantidade de vãos
                  </span>
                  <input
                    value={quantidadeVaos}
                    onChange={(e) => setQuantidadeVaos(e.target.value)}
                    inputMode="numeric"
                    className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Pecas por vao na largura
                  </span>
                  <input
                    value={quantidadeDivisoesLargura}
                    onChange={(e) => setQuantidadeDivisoesLargura(e.target.value)}
                    inputMode="numeric"
                    className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Cor dos perfis
                  </span>
                  <select
                    value={corPerfil}
                    onChange={(e) => setCorPerfil(e.target.value)}
                    className="mt-3 w-full bg-transparent text-lg font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  >
                    <option value="" className="text-slate-900">Selecione a cor</option>
                    {CORES_PERFIL.map((cor) => (
                      <option key={cor} value={cor} className="text-slate-900">
                        {cor}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border p-4 sm:col-span-2 xl:col-span-1" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Vidro da tabela
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
                    ) : vidros.length === 0 ? (
                      <option value="" className="text-slate-900">Nenhum vidro cadastrado</option>
                    ) : (
                      vidrosFiltrados.map((vidro) => (
                        <option key={vidro.id} value={vidro.id} className="text-slate-900">
                          {montarDescricaoVidro(vidro)} - {formatarPreco(Number(vidro.preco) || 0)}/m2
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
              <article key={card.titulo} className="rounded-[1.75rem] border p-5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: `${theme.contentTextLightBg}70` }}>
                      {card.titulo}
                    </p>
                    <p className="mt-3 text-2xl font-black leading-tight" style={{ color: theme.contentTextLightBg }}>
                      {card.valor}
                    </p>
                    <p className="mt-2 text-sm" style={{ color: `${theme.contentTextLightBg}A3` }}>
                      {card.detalhe}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.menuIconColor}14`, color: theme.menuIconColor }}>
                    <card.icone size={22} />
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-6">
            <article className="rounded-4xl border shadow-sm overflow-hidden" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
              <div className="px-6 py-5 border-b" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                <h2 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>
                  Perfis de alumínio
                </h2>
                <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>
                  Barras calculadas com base em 6000 mm por barra.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-190 text-sm">
                  <thead style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.contentTextLightBg }}>
                    <tr>
                      <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Perfil</th>
                      <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Código</th>
                      <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Comprimento total</th>
                      <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Barras</th>
                      <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Preço barra</th>
                      <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfisComPrecoTabela.map((perfil, index) => (
                      <tr key={perfil.codigo} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `${theme.screenBackgroundColor}A6` }}>
                        <td className="px-6 py-4 font-semibold" style={{ color: theme.contentTextLightBg }}>{perfil.nome}</td>
                        <td className="px-6 py-4" style={{ color: `${theme.contentTextLightBg}B3` }}>{perfil.codigo}</td>
                        <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{formatarNumero(perfil.comprimentoTotal, 0)} mm</td>
                        <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{perfil.quantidadeBarras}</td>
                        <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{corPerfilSelecionada ? formatarPreco(perfil.precoBarra) : "-"}</td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: theme.contentTextLightBg }}>{corPerfilSelecionada ? formatarPreco(perfil.valorTotal) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `1px solid ${theme.contentTextLightBg}14` }}>
                      <td colSpan={5} className="px-6 py-4 text-right text-sm font-bold" style={{ color: theme.contentTextLightBg }}>
                        Total dos perfis
                      </td>
                      <td className="px-6 py-4 text-right text-base font-black" style={{ color: theme.contentTextLightBg }}>
                        {formatarPreco(totalPerfisCalculado)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-t" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                <div className="px-6 py-5 border-b" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                  <h3 className="text-lg font-black" style={{ color: theme.contentTextLightBg }}>
                    Acessorios
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>
                    Valores localizados na tabela de ferragens conforme a cor selecionada.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-190 text-sm">
                    <thead style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.contentTextLightBg }}>
                      <tr>
                        <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Acessorio</th>
                        <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Codigo</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Qtd</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Preco unit.</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Valor total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acessoriosComPrecoTabela.map((acessorio, index) => (
                        <tr key={`${acessorio.codigo}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `${theme.screenBackgroundColor}A6` }}>
                          <td className="px-6 py-4 font-semibold" style={{ color: theme.contentTextLightBg }}>{acessorio.nome}</td>
                          <td className="px-6 py-4" style={{ color: `${theme.contentTextLightBg}B3` }}>{acessorio.codigo}</td>
                          <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>
                            {acessorio.quantidadePacote
                              ? <span>{acessorio.quantidadePacote} <span className="text-[10px] opacity-60">(pct {acessorio.pacote})</span></span>
                              : acessorio.quantidade}
                          </td>
                          <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{corPerfilSelecionada ? formatarPreco(acessorio.precoUnitario) : "-"}</td>
                          <td className="px-6 py-4 text-right font-bold" style={{ color: theme.contentTextLightBg }}>{corPerfilSelecionada ? formatarPreco(acessorio.valorTotal) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `1px solid ${theme.contentTextLightBg}14` }}>
                        <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold" style={{ color: theme.contentTextLightBg }}>
                          Total dos acessorios
                        </td>
                        <td className="px-6 py-4 text-right text-base font-black" style={{ color: theme.contentTextLightBg }}>
                          {formatarPreco(totalAcessoriosCalculado)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </article>

            <div className="space-y-6">
              {/* Preview visual da sacada */}
              <article className="rounded-4xl border p-6 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                <h2 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>
                  Vista frontal
                </h2>
                <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>
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

                    const x0 = padL;
                    const y0 = padTop;

                    const vidroLargMm = resultado.larguraVidroMm;
                    const showLabelInside = divisoes <= 8 && glassW > 28;

                    // Cor do perfil conforme seleção
                    const corPerfilNorm = normalizarTextoComparacao(corPerfil);
                    const corAluminio = corPerfilNorm === "branco"
                      ? "#e8e8e8"
                      : corPerfilNorm === "preto"
                        ? "#2a2a2a"
                        : corPerfilNorm === "fosco"
                          ? "#8c8c8c"
                          : "#9e9e9e";
                    const corAluminioBorda = corPerfilNorm === "branco"
                      ? "#c0c0c0"
                      : corPerfilNorm === "preto"
                        ? "#1a1a1a"
                        : corPerfilNorm === "fosco"
                          ? "#6b6b6b"
                          : "#787878";

                    // Cor do vidro (tom esverdeado/azulado de vidro temperado)
                    const corVidroFill = "#b8e6e0";
                    const corVidroBorda = "#7cbfb5";
                    const corVidroReflexo = "#ffffff";

                    return (
                      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={corVidroFill} stopOpacity={0.35} />
                            <stop offset="50%" stopColor={corVidroFill} stopOpacity={0.18} />
                            <stop offset="100%" stopColor={corVidroFill} stopOpacity={0.3} />
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

                        {/* Bottom rail - perfil inferior */}
                        <rect x={x0} y={y0 + drawH - railH} width={drawW} height={railH} fill="url(#railGrad)" rx={1.5} />
                        <rect x={x0} y={y0 + drawH - railH} width={drawW} height={railH} fill="none" stroke={corAluminioBorda} strokeWidth={0.5} rx={1.5} />

                        {/* Glass panels & pontaletes */}
                        {Array.from({ length: divisoes }).map((_, i) => {
                          const pX = x0 + i * (glassW + postW);
                          const gX = pX + postW;
                          return (
                            <g key={i}>
                              {/* Pontalete */}
                              <rect x={pX} y={y0} width={postW} height={drawH} fill={corAluminio} rx={0.5} />
                              <rect x={pX} y={y0} width={postW} height={drawH} fill="none" stroke={corAluminioBorda} strokeWidth={0.4} rx={0.5} />

                              {/* Vidro */}
                              <rect x={gX} y={y0 + railH} width={glassW} height={glassH} fill="url(#glassGrad)" rx={1} />
                              <rect x={gX} y={y0 + railH} width={glassW} height={glassH} fill="none" stroke={corVidroBorda} strokeWidth={0.6} strokeOpacity={0.5} rx={1} />

                              {/* Reflexo diagonal */}
                              <line x1={gX + glassW * 0.18} y1={y0 + railH + glassH * 0.06} x2={gX + glassW * 0.08} y2={y0 + railH + glassH * 0.38} stroke={corVidroReflexo} strokeWidth={0.7} strokeOpacity={0.3} />
                              <line x1={gX + glassW * 0.24} y1={y0 + railH + glassH * 0.06} x2={gX + glassW * 0.14} y2={y0 + railH + glassH * 0.38} stroke={corVidroReflexo} strokeWidth={0.4} strokeOpacity={0.18} />

                              {showLabelInside && (
                                <text x={gX + glassW / 2} y={y0 + railH + glassH / 2 + 3} textAnchor="middle" fontSize={glassW > 55 ? 7.5 : 6} fill="#4a7a73" opacity={0.55} fontWeight={600} fontFamily="system-ui, sans-serif">
                                  {formatarNumero(vidroLargMm, 0)}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        {/* Last pontalete */}
                        <rect x={x0 + divisoes * (glassW + postW)} y={y0} width={postW} height={drawH} fill={corAluminio} rx={0.5} />
                        <rect x={x0 + divisoes * (glassW + postW)} y={y0} width={postW} height={drawH} fill="none" stroke={corAluminioBorda} strokeWidth={0.4} rx={0.5} />

                        {/* Dimension: largura (bottom) */}
                        <line x1={x0} y1={y0 + drawH + 14} x2={x0 + drawW} y2={y0 + drawH + 14} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <line x1={x0} y1={y0 + drawH + 10} x2={x0} y2={y0 + drawH + 18} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <line x1={x0 + drawW} y1={y0 + drawH + 10} x2={x0 + drawW} y2={y0 + drawH + 18} stroke={theme.contentTextLightBg} strokeWidth={0.6} strokeOpacity={0.4} />
                        <text x={x0 + drawW / 2} y={y0 + drawH + 28} textAnchor="middle" fontSize={9.5} fill={theme.contentTextLightBg} opacity={0.6} fontWeight={700} fontFamily="system-ui, sans-serif">
                          {formatarNumero(larg, 0)} mm
                        </text>

                        {/* Dimension: altura (left) */}
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
                {/* Medida do vidro e info de vãos */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  <span className="text-xs font-semibold" style={{ color: `${theme.contentTextLightBg}70` }}>
                    Vidro: {formatarNumero(resultado.larguraVidroMm, 0)} × {formatarNumero(resultado.alturaVidroMm, 0)} mm
                  </span>
                  {quantidadeNumero > 1 && (
                    <span className="text-xs font-semibold" style={{ color: `${theme.contentTextLightBg}50` }}>
                      × {quantidadeNumero} vãos
                    </span>
                  )}
                  <span className="text-xs" style={{ color: `${theme.contentTextLightBg}50` }}>
                    {quantidadeDivisoesNumero} {quantidadeDivisoesNumero === 1 ? "peça" : "peças"} por vão
                  </span>
                </div>
              </article>

              <article className="rounded-4xl border p-6 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                <h2 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>
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
