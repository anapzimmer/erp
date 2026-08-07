//app/src/app/(calculos)/jc4fcbs/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { gerarNumeroOrcamentoPadrao } from "@/utils/orcamentoNumero";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
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
import type {
  ProjetoIndividualDados,
  ProjetoIndividualMaterial,
} from "../../relatorios/projetoindividual/ProjetoIndividualPDF";
import { LoteRapidoProjetos, useLoteRapidoProjetos } from "@/components/LoteRapidoProjetos";
import { JC4FCBSPDF } from "../../relatorios/jc4fcbs/JC4FCBSPDF";

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

type PerfilCadastro = {
  id: string;
  codigo: string;
  nome: string;
  cores?: string | null;
  categoria?: string | null;
  preco?: number | null;
  empresa_id: string;
  nome_completo?: string | null;
};

type FerragemCadastro = {
  id: string;
  codigo: string;
  nome: string;
  preco?: number | null;
  categoria?: string | null;
  cores?: string | null;
  codigo_interno?: string | null;
  empresa_id?: string | null;
};

type ItemCatalogo = {
  id: string;
  tipo: "perfil" | "ferragem";
  descricao: string;
  preco: number;
};

type PC4FCBSDados = Omit<ProjetoIndividualDados, "materiais"> & {
  alturaPeitoril: number;
  alturaJanela: number;
  alturaTotal: number;
  vidroPeitoril: string;
  vidroJanelaBandeira: string;
  tuboPerfil: string;
};

type PC4FCBSOrcamentoPersistido = {
  tipo?: string;
  modo?: string;
  dados?: Partial<PC4FCBSDados>;
  materiais?: ProjetoIndividualMaterial[];
};

type CentralImpressaoProjetoItem = {
  id: string;
  numero?: string;
  projeto?: string;
  cliente?: string;
  medidas?: string;
  largura?: number;
  altura?: number;
  quantidade?: number;
  modo?: string;
  desenhoUrl?: string;
  vidro?: string;
  vidroBandeira?: string;
  corKit?: string;
  corPerfil?: string;
  tuboPerfil?: string;
  trilho?: string;
  puxador?: string;
  tamanhoPuxador?: string;
  trinco?: string;
  valorTotal?: number;
  materiais?: ProjetoIndividualMaterial[];
  origemRota?: string;
  alturaPeitoril?: number;
  alturaJanela?: number;
  alturaBandeira?: number;
  alturaTotal?: number;
  vidroPeitoril?: string;
  vidroJanela?: string;
  tubo?: string;
  temTrinco?: boolean;
  medidasDetalhadas?: string;
};

const PROJETO_DRAFT_KEY = "glasscode:jc4fcbs:rascunho";
const PROJETO_DRAFT_KEY_LEGADO = "glasscode:pc4fcbs:rascunho";
const CENTRAL_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_CLIENTE_KEY = "glasscode:central-impressao:cliente";

const corKitOpcoes = ["Escolher", "Preto", "Branco", "Fosco"];
const trincoOpcoes = ["Sem trinco", "Com trinco"];

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const hojePtBr = () => new Date().toLocaleDateString("pt-BR");

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const numero = (valor: number, casas = 2) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

const parseNumeroPtBr = (valor: string) =>
  Number(valor.replace(/\./g, "").replace(",", ".") || 0);

const ehUnidadeM2 = (unidade?: string) =>
  normalizarTexto(unidade).includes("m2");

const formatarQtdMaterial = (qtd: number, unidade?: string) =>
  ehUnidadeM2(unidade) ? numero(qtd) : String(Number(qtd || 0));

const parseQtdMaterial = (valor: string, unidade?: string) =>
  ehUnidadeM2(unidade) ? parseNumeroPtBr(valor) : Number(valor || 0);

const limitarNumero4Digitos = (valor: string) =>
  Number(valor.replace(/\D/g, "").slice(0, 4) || 0);

const arredondar5cm = (valor: number) =>
  Math.ceil(Math.max(0, Number(valor || 0)) / 50) * 50;

const obterEspessuraVidro = (texto?: string | null) => {
  const match = String(texto || "").match(/(\d{1,2})\s*mm/i);
  return match ? Number(match[1]) : 0;
};

const formatarVidroCadastro = (vidro: VidroCadastro) => {
  const partes = [vidro.nome];
  const espessura = vidro.espessura ? String(vidro.espessura).replace(/\s*mm$/i, "")
    : "";
  if (espessura) partes.push(`${espessura}mm`);
  return partes.join(" ");
};

const criarMaterial = (
  parcial?: Partial<ProjetoIndividualMaterial>
): ProjetoIndividualMaterial => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID()
      : String(Date.now() + Math.random()),
  qtd: parcial?.qtd ?? 1,
  unidade: parcial?.unidade ?? "und",
  descricao: parcial?.descricao ?? "Novo item",
  valorUnitario: parcial?.valorUnitario ?? 0,
  codigoPerfil: parcial?.codigoPerfil,
  comprimentoBarra: parcial?.comprimentoBarra,
  cortes: parcial?.cortes,
});

const calcularBarrasPorCortes = (
  cortesOriginais: number[],
  comprimentoBarra = 6000
) => {
  const barras: number[] = [];
  const cortes = cortesOriginais
    .map((corte) => Math.ceil(Number(corte || 0)))
    .filter((corte) => corte > 0)
    .sort((a, b) => b - a);

  cortes.forEach((corte) => {
    const indice = barras.findIndex?.(
      (usado) => usado + corte <= comprimentoBarra
    );

    if (indice >= 0) {
      barras[indice] += corte;
    } else {
      barras.push(corte);
    }
  });

  return barras.length;
};

const montarDescricaoComCor = (
  codigo: string,
  nome: string,
  cor?: string | null
) => {
  const descricaoBase = `${codigo} - ${nome}`.trim();
  const corTexto = String(cor || "").trim();

  if (
    !corTexto ||
    normalizarTexto(descricaoBase).includes(normalizarTexto(corTexto))
  ) {
    return descricaoBase.toUpperCase();
  }

  return `${descricaoBase} | ${corTexto}`.toUpperCase();
};

const desenhoPC4FCBS = (trinco?: string) =>
  trinco === "Com trinco" ? "/desenhos/JC4FCBS_comtrinco.png"
    : "/desenhos/JC4FCBS_semtrinco.png";

const codigoCompativel = (codigoCadastro: string, codigoBase: string) => {
  if (!codigoCadastro || !codigoBase) return false;
  if (codigoCadastro === codigoBase) return true;

  const cadastroLimpo = codigoCadastro.replace(/[^a-z0-9]/g, "");
  const baseLimpa = codigoBase.replace(/[^a-z0-9]/g, "");

  if (cadastroLimpo === baseLimpa) return true;
  if (codigoCadastro.startsWith(`${codigoBase}-`)) return true;
  if (!codigoCadastro.startsWith(codigoBase)) return false;

  return /^[a-z]{1,8}$/.test(codigoCadastro.slice(codigoBase.length));
};

const navegarComEnter = (
  evento: React.KeyboardEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >
) => {
  if (evento.key !== "Enter") return;

  evento.preventDefault();

  const campos = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-keyboard-field="true"]:not([disabled])'
    )
  ).filter((campo) => campo.offsetParent !== null);

  const indiceAtual = campos.indexOf(evento.currentTarget);
  const proximo = campos[indiceAtual + 1];

  if (proximo) {
    proximo.focus();
    if (
      proximo instanceof HTMLInputElement ||
      proximo instanceof HTMLTextAreaElement
    ) {
      proximo.select();
    }
  }
};

const ordemMaterialDescricao = (
  descricaoOriginal?: string,
  unidadeOriginal?: string
) => {
  const descricao = normalizarTexto(descricaoOriginal);
  const unidade = normalizarTexto(unidadeOriginal);

  if (descricao.includes("vidro") || unidade.includes("m2")) return 0;
  if (descricao.includes("tubo")) return 1;
  if (
    descricao.includes("vt") ||
    descricao.includes("perfil") ||
    unidade.includes("barra")
  ) {
    return 2;
  }

  return 3;
};

export default function PC4FCBSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const centralItemId = searchParams.get("centralItem");
  const centralLoteId = searchParams.get("loteId");
  const returnTo =
    searchParams.get("returnTo") || "/admin/relatorio.orcamento";

  const { empresaId } = useAuth();
  const { theme } = useTheme();
  const logoUsuario =
    theme.logoLightUrl || theme.logoUrl || theme.logoDarkUrl || null;

  const [clientes, setClientes] = useState<ClienteCadastro[]>([]);
  const [vidros, setVidros] = useState<VidroCadastro[]>([]);
  const [precosVidroGrupos, setPrecosVidroGrupos] = useState<
    PrecoVidroGrupo[]
  >([]);
  const [perfis, setPerfis] = useState<PerfilCadastro[]>([]);
  const [ferragens, setFerragens] = useState<FerragemCadastro[]>([]);

  const [listaClientesAberta, setListaClientesAberta] = useState(false);
  const [listaVidroPeitorilAberta, setListaVidroPeitorilAberta] =
    useState(false);
  const [listaVidroJanelaAberta, setListaVidroJanelaAberta] =
    useState(false);

  const clienteInputRef = useRef<HTMLInputElement>(null);
  const vidroPeitorilInputRef = useRef<HTMLInputElement>(null);
  const vidroJanelaInputRef = useRef<HTMLInputElement>(null);

  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [mensagemSistema, setMensagemSistema] = useState<{
    tipo: "sucesso" | "erro" | "aviso";
    titulo: string;
    mensagem: string;
    aoFechar?: () => void;
  } | null>(null);

  const [dados, setDados] = useState<PC4FCBSDados>({
    projeto: "Janela de correr com bandeira e peitoril",
    numero: "005412",
    data: hojePtBr(),
    cliente: "",
    largura: 0,
    altura: 0,
    alturaPeitoril: 0,
    alturaJanela: 0,
    alturaTotal: 0,
    quantidade: 1,
    trilho: "",
    vidro: "Escolher",
    vidroPeitoril: "Escolher",
    vidroJanelaBandeira: "Escolher",
    corKit: "Escolher",
    tuboPerfil: "Escolher",
    puxador: "",
    tamanhoPuxador: "",
    trinco: "Sem trinco",
    observacao: "Imagem ilustrativa do projeto",
  });

  const [materiais, setMateriais] = useState<ProjetoIndividualMaterial[]>([]);

  const atualizarCampo = <K extends keyof PC4FCBSDados>(
    campo: K,
    valor: PC4FCBSDados[K]
  ) => setDados((atual) => ({ ...atual, [campo]: valor }));

  const atualizarMaterial = <K extends keyof ProjetoIndividualMaterial>(
    id: string,
    campo: K,
    valor: ProjetoIndividualMaterial[K]
  ) => {
    setMateriais((lista) =>
      lista.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const duplicarMaterial = (item: ProjetoIndividualMaterial) => {
    setMateriais((lista) => [...lista, criarMaterial({ ...item })]);
  };

  const removerMaterial = (id: string) => {
    setMateriais((lista) =>
      lista.filter((item) => item.id !== id)
    );
  };

  useEffect(() => {
    if (!empresaId) return;

    const carregar = async () => {
      const [
        { data: clientesData },
        { data: vidrosData },
        { data: precosData },
        { data: perfisData },
        { data: ferragensData },
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, grupo_preco_id")
          .eq("empresa_id", empresaId)
          .order("nome"),
        supabase
          .from("vidros")
          .select("id, nome, espessura, tipo, preco")
          .eq("empresa_id", empresaId)
          .order("nome"),
        supabase
          .from("vidro_precos_grupos")
          .select("vidro_id, grupo_preco_id, preco")
          .eq("empresa_id", empresaId),
        supabase
          .from("perfis")
          .select(
            "id, codigo, nome, cores, categoria, preco, empresa_id, nome_completo"
          )
          .eq("empresa_id", empresaId)
          .order("nome"),
        supabase
          .from("ferragens")
          .select(
            "id, codigo, nome, preco, categoria, cores, codigo_interno, empresa_id"
          )
          .eq("empresa_id", empresaId)
          .order("nome"),
      ]);

      setClientes((clientesData || []) as ClienteCadastro[]);
      setVidros((vidrosData || []) as VidroCadastro[]);
      setPrecosVidroGrupos((precosData || []) as PrecoVidroGrupo[]);
      setPerfis((perfisData || []) as PerfilCadastro[]);
      setFerragens((ferragensData || []) as FerragemCadastro[]);
    };

    carregar();
  }, [empresaId]);

  useEffect(() => {
    if (editId || centralItemId) {
      setRascunhoRestaurado(true);
      return;
    }

    try {
      const salvo =
        localStorage.getItem(PROJETO_DRAFT_KEY) ||
        localStorage.getItem(PROJETO_DRAFT_KEY_LEGADO);

      if (salvo) {
        const rascunho = JSON.parse(salvo) as {
          dados?: Partial<PC4FCBSDados>;
          materiais?: ProjetoIndividualMaterial[];
        };

        if (rascunho.dados) {
          setDados((atual) => ({ ...atual, ...rascunho.dados }));
        }

        if (Array.isArray(rascunho.materiais)) {
          setMateriais(rascunho.materiais);
        }
      }
    } catch (erro) {
      console.warn("Não foi possível restaurar o rascunho do JC4FCBS:", erro);
    } finally {
      setRascunhoRestaurado(true);
    }
  }, [centralItemId, editId]);

  useEffect(() => {
    if (!rascunhoRestaurado || editId || centralItemId) return;

    try {
      localStorage.setItem(
        PROJETO_DRAFT_KEY,
        JSON.stringify({ dados, materiais })
      );
    } catch (erro) {
      console.warn("Não foi possível salvar o rascunho do JC4FCBS:", erro);
    }
  }, [
    centralItemId,
    dados,
    editId,
    materiais,
    rascunhoRestaurado,
  ]);

  useEffect(() => {
    if (!centralItemId) return;

    try {
      const salvo = localStorage.getItem(CENTRAL_KEY);
      const lista = salvo ? (JSON.parse(salvo) as CentralImpressaoProjetoItem[])
        : [];
      const item = lista.find((registro) => registro.id === centralItemId);

      if (!item) return;

      setDados((atual) => ({
        ...atual,
        projeto: "Janela de correr com bandeira e peitoril",
        numero: item.numero || atual.numero,
        cliente: item.cliente || "",
        largura: Number(item.largura || 0),
        altura: Number(item.alturaTotal || item.altura || 0),
        alturaTotal: Number(item.alturaTotal || item.altura || 0),
        alturaPeitoril: Number(item.alturaPeitoril || 0),
        alturaJanela: Number(item.alturaJanela || 0),
        quantidade: Number(item.quantidade || 1),
        vidroPeitoril: item.vidroPeitoril || item.vidro || "Escolher",
        vidroJanelaBandeira:
          item.vidroJanela || item.vidroBandeira || "Escolher",
        corKit: item.corPerfil || item.corKit || "Escolher",
        tuboPerfil: item.tuboPerfil || "Escolher",
        trinco: item.trinco || "Sem trinco",
      }));

      setMateriais(Array.isArray(item.materiais) ? item.materiais : []);
    } catch {
      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao carregar",
        mensagem: "Não foi possível carregar este projeto.",
      });
    }
  }, [centralItemId]);

useEffect(() => {
  if (!editId) return;

  let ativo = true;

  const carregarOrcamentoSalvo = async () => {
    try {
      const { data: orcamento, error } = await supabase
        .from("orcamentos")
        .select(
          "id, numero_formatado, cliente_nome, obra_referencia, itens"
        )
        .eq("id", editId)
        .single();

      if (error) throw error;
      if (!ativo || !orcamento) return;

      const itensSalvos =
        orcamento.itens &&
        typeof orcamento.itens === "object" &&
        !Array.isArray(orcamento.itens) ? (orcamento.itens as PC4FCBSOrcamentoPersistido)
          : null;

      if (!itensSalvos) {
        setMensagemSistema({
          tipo: "erro",
          titulo: "Orçamento inválido",
          mensagem:
            "Não foi possível encontrar os dados deste orçamento.",
        });
        return;
      }

      if (
        itensSalvos.tipo &&
        itensSalvos.tipo !== "jc4fcbs" &&
        itensSalvos.tipo !== "pc4fcbs"
      ) {
        setMensagemSistema({
          tipo: "aviso",
          titulo: "Orçamento incompatível",
          mensagem:
            "Este orçamento não pertence ao projeto JC4FCBS.",
          aoFechar: () => router.push(returnTo),
        });
        return;
      }

      const dadosSalvos = itensSalvos.dados || {};

      setDados((atual) => ({
        ...atual,
        ...dadosSalvos,

        projeto:
          dadosSalvos.projeto ||
          "Janela de correr com bandeira e peitoril",

        numero:
          orcamento.numero_formatado ||
          dadosSalvos.numero ||
          atual.numero,

        cliente:
          orcamento.cliente_nome ||
          dadosSalvos.cliente ||
          atual.cliente,

        largura: Number(dadosSalvos.largura || 0),

        alturaTotal: Number(
          dadosSalvos.alturaTotal ||
          dadosSalvos.altura ||
          0
        ),

        altura: Number(
          dadosSalvos.alturaTotal ||
          dadosSalvos.altura ||
          0
        ),

        alturaPeitoril: Number(
          dadosSalvos.alturaPeitoril || 0
        ),

        alturaJanela: Number(
          dadosSalvos.alturaJanela || 0
        ),

        quantidade: Number(
          dadosSalvos.quantidade || 1
        ),

        vidroPeitoril:
          dadosSalvos.vidroPeitoril ||
          dadosSalvos.vidro ||
          "Escolher",

        vidroJanelaBandeira:
          dadosSalvos.vidroJanelaBandeira ||
          "Escolher",

        corKit:
          dadosSalvos.corKit ||
          "Escolher",

        tuboPerfil:
          dadosSalvos.tuboPerfil ||
          "Escolher",

        trinco:
          dadosSalvos.trinco ||
          "Sem trinco",
      }));

      setMateriais(
        Array.isArray(itensSalvos.materiais) ? itensSalvos.materiais
          : []
      );
    } catch (erro) {
      console.error(
        "Erro ao carregar orçamento JC4FCBS:",
        erro
      );

      if (!ativo) return;

      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao carregar",
        mensagem:
          erro instanceof Error ? erro.message
            : "Não foi possível carregar os dados do orçamento.",
        aoFechar: () => router.push(returnTo),
      });
    }
  };

  carregarOrcamentoSalvo();

  return () => {
    ativo = false;
  };
}, [editId, returnTo, router]);

  const alturaBandeira = Math.max(
    0,
    Number(dados.alturaTotal || 0) -
      Number(dados.alturaPeitoril || 0) -
      Number(dados.alturaJanela || 0)
  );

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.nome === dados.cliente) || null,
    [clientes, dados.cliente]
  );

  const vidroPeitorilSelecionado = useMemo(
    () =>
      vidros.find(
        (vidro) =>
          formatarVidroCadastro(vidro) === dados.vidroPeitoril
      ) || null,
    [dados.vidroPeitoril, vidros]
  );

  const vidroJanelaSelecionado = useMemo(
    () =>
      vidros.find(
        (vidro) =>
          formatarVidroCadastro(vidro) === dados.vidroJanelaBandeira
      ) || null,
    [dados.vidroJanelaBandeira, vidros]
  );

  const obterPrecoVidro = useCallback(
    (vidro: VidroCadastro | null) => {
      if (!vidro) return 0;

      const precoGrupo = clienteSelecionado?.grupo_preco_id ? precosVidroGrupos.find(
            (preco) =>
              String(preco.vidro_id) === String(vidro.id) &&
              String(preco.grupo_preco_id) ===
                String(clienteSelecionado.grupo_preco_id)
          )
        : null;

      return Number(precoGrupo?.preco ?? vidro.preco ?? 0);
    },
    [clienteSelecionado, precosVidroGrupos]
  );

  

  const precoVidroPeitoril = obterPrecoVidro(vidroPeitorilSelecionado);
  const precoVidroJanela = obterPrecoVidro(vidroJanelaSelecionado);

  const calculoVidro = useMemo(() => {
    const quantidade = Math.max(0, Number(dados.quantidade || 0));
    const largura = Math.max(0, Number(dados.largura || 0));

    const larguraPeitorilMedida = largura / 4;
    const alturaPeitorilMedida = Math.max(0, Number(dados.alturaPeitoril || 0));

    const larguraFixaMedida = largura / 4;
    const alturaFixaMedida = Math.max(0, Number(dados.alturaJanela || 0) - 60);

    const larguraMovelMedida = larguraFixaMedida + 50;
    const alturaMovelMedida = Math.max(0, Number(dados.alturaJanela || 0) - 20);

    const larguraBandeiraMedida = largura / 4;
    const alturaBandeiraMedida = Math.max(0, alturaBandeira);

    const areaPeitoril =
      (arredondar5cm(larguraPeitorilMedida) *
        arredondar5cm(alturaPeitorilMedida) *
        4 *
        quantidade) /
      1_000_000;

    const areaJanelaFixa =
      (arredondar5cm(larguraFixaMedida) *
        arredondar5cm(alturaFixaMedida) *
        2 *
        quantidade) /
      1_000_000;

    const areaJanelaMovel =
      (arredondar5cm(larguraMovelMedida) *
        arredondar5cm(alturaMovelMedida) *
        2 *
        quantidade) /
      1_000_000;

    const areaJanela = areaJanelaFixa + areaJanelaMovel;

    const areaBandeira =
      (arredondar5cm(larguraBandeiraMedida) *
        arredondar5cm(alturaBandeiraMedida) *
        4 *
        quantidade) /
      1_000_000;

    return {
      larguraPeitorilMedida,
      alturaPeitorilMedida,
      larguraFixaMedida,
      alturaFixaMedida,
      larguraMovelMedida,
      alturaMovelMedida,
      larguraBandeiraMedida,
      alturaBandeiraMedida,
      areaPeitoril: Number(areaPeitoril.toFixed(3)),
      areaJanelaFixa: Number(areaJanelaFixa.toFixed(3)),
      areaJanelaMovel: Number(areaJanelaMovel.toFixed(3)),
      areaJanela: Number(areaJanela.toFixed(3)),
      areaBandeira: Number(areaBandeira.toFixed(3)),
      areaTotalCobrada: Number(
        (areaPeitoril + areaJanela + areaBandeira).toFixed(3)
      ),
    };
  }, [
    alturaBandeira,
    dados.alturaJanela,
    dados.alturaPeitoril,
    dados.largura,
    dados.quantidade,
  ]);

  const perfilCorrespondeCor = useCallback(
    (perfil: PerfilCadastro) => {
      const cor = normalizarTexto(dados.corKit);
      if (!cor || cor === "escolher") return false;
      return normalizarTexto(perfil.cores).includes(cor);
    },
    [dados.corKit]
  );

  const buscarPerfil = useCallback(
    (codigo: string) => {
      const base = normalizarTexto(codigo);

      return (
        perfis.find(
          (perfil) =>
            codigoCompativel(normalizarTexto(perfil.codigo), base) &&
            perfilCorrespondeCor(perfil)
        ) || null
      );
    },
    [perfilCorrespondeCor, perfis]
  );

  const criarPerfilComCortes = useCallback(
    (codigo: string, cortesBase: number[]) => {
      const perfil = buscarPerfil(codigo);
      const quantidadeProjeto = Math.max(0, Number(dados.quantidade || 0));
      const cortes = Array.from(
        { length: quantidadeProjeto },
        () => cortesBase
      )
        .flat()
        .map(Number)
        .filter((corte) => corte > 0);

      if (!perfil || cortes.length === 0) return null;

      return criarMaterial({
        qtd: calcularBarrasPorCortes(cortes, 6000),
        unidade: "barra",
        descricao: `${perfil.codigo} - ${
          perfil.nome_completo || perfil.nome
        }${perfil.cores ? ` | ${perfil.cores}` : ""}`.toUpperCase(),
        valorUnitario: Number(perfil.preco || 0),
        codigoPerfil: perfil.codigo,
        comprimentoBarra: 6000,
        cortes,
      });
    },
    [buscarPerfil, dados.quantidade]
  );

  const tuboOpcoes = useMemo(() => {
    const opcoes = perfis
      .filter((perfil) => {
        const texto = normalizarTexto(
          `${perfil.codigo} ${perfil.nome} ${
            perfil.nome_completo || ""
          } ${perfil.categoria || ""}`
        );

        return (
          perfilCorrespondeCor(perfil) &&
          (texto.includes("tubo retangular") ||
            texto.includes("tubo quadrado"))
        );
      })
      .map(
        (perfil) =>
          `${String(perfil.codigo).toUpperCase()} - ${
            perfil.nome_completo || perfil.nome
          }`
      );

    return ["Escolher", ...Array.from(new Set(opcoes))];
  }, [perfilCorrespondeCor, perfis]);

  const perfilTuboSelecionado = useMemo(() => {
    const codigo = String(dados.tuboPerfil || "")
      .split("-")[0]
      ?.trim();

    return codigo ? buscarPerfil(codigo) : null;
  }, [buscarPerfil, dados.tuboPerfil]);

  const perfisAutomaticos = useMemo(() => {
    const largura = Number(dados.largura || 0);
    const alturaPeitoril = Number(dados.alturaPeitoril || 0);
    const alturaJanela = Number(dados.alturaJanela || 0);
    const espessuraJanela = obterEspessuraVidro(dados.vidroJanelaBandeira);

    if (
      dados.corKit === "Escolher" ||
      largura <= 0 ||
      dados.alturaTotal <= 0
    ) {
      return [];
    }

    const codigosLargura =
      espessuraJanela === 10 ? ["VT51A", "VT52A", "VT05", "VT13"]
        : espessuraJanela === 8 ? ["VT49A", "VT50A", "VT45", "VT63"]
          : [];

    const codigoAlturaDuasPecas =
      espessuraJanela === 10 ? "VT15" : espessuraJanela === 8 ? "VT16" : "";

    const codigoAlturaUnica =
      espessuraJanela === 10 ? "VT17" : espessuraJanela === 8 ? "VT47" : "";

    const codigoU =
      espessuraJanela === 10 ? "VT10" : espessuraJanela === 8 ? "VT66" : "";

    const itensLargura = codigosLargura.map((codigo) =>
      criarPerfilComCortes(codigo, [largura])
    );

    const perfilAlturaDuasPecas = codigoAlturaDuasPecas ? criarPerfilComCortes(codigoAlturaDuasPecas, [alturaJanela, alturaJanela])
      : null;

    const perfilAlturaUnica = codigoAlturaUnica ? criarPerfilComCortes(codigoAlturaUnica, [alturaJanela])
      : null;

    const cortesU = codigoU ? [
          ...Array.from({ length: 4 }, () => alturaPeitoril),
          ...Array.from({ length: 2 }, () => Number(alturaBandeira || 0)),
          ...Array.from({ length: 2 }, () => alturaJanela),
          ...Array.from({ length: 4 }, () => largura),
        ]
      : [];

    const perfilU = codigoU ? criarPerfilComCortes(codigoU, cortesU) : null;

    let tubo: ProjetoIndividualMaterial | null = null;

    if (perfilTuboSelecionado) {
      const cortesBase = [largura, largura, alturaPeitoril];
      const quantidadeProjeto = Math.max(0, Number(dados.quantidade || 0));
      const cortes = Array.from({ length: quantidadeProjeto }, () => cortesBase)
        .flat()
        .filter((corte) => corte > 0);

      tubo = criarMaterial({
        qtd: calcularBarrasPorCortes(cortes, 6000),
        unidade: "barra",
        descricao: `${perfilTuboSelecionado.codigo} - ${
          perfilTuboSelecionado.nome_completo || perfilTuboSelecionado.nome
        }${
          perfilTuboSelecionado.cores ? ` | ${perfilTuboSelecionado.cores}` : ""
        }`.toUpperCase(),
        valorUnitario: Number(perfilTuboSelecionado.preco || 0),
        codigoPerfil: perfilTuboSelecionado.codigo,
        comprimentoBarra: 6000,
        cortes,
      });
    }

    return [
      ...itensLargura,
      perfilAlturaDuasPecas,
      perfilAlturaUnica,
      perfilU,
      tubo,
    ].filter((item): item is ProjetoIndividualMaterial => Boolean(item));
  }, [
    alturaBandeira,
    criarPerfilComCortes,
    dados.alturaJanela,
    dados.alturaPeitoril,
    dados.alturaTotal,
    dados.corKit,
    dados.largura,
    dados.quantidade,
    dados.vidroJanelaBandeira,
    perfilTuboSelecionado,
  ]);

  const buscarFerragem = useCallback(
    (codigos: string[], ignorarCor = false) => {
      const cor = normalizarTexto(dados.corKit);

      return (
        ferragens.find((ferragem) => {
          const codigoCadastro = normalizarTexto(ferragem.codigo);
          const codigoInterno = normalizarTexto(ferragem.codigo_interno);
          const codigoOk = codigos.some((codigo) => {
            const base = normalizarTexto(codigo);
            return (
              codigoCompativel(codigoCadastro, base) ||
              codigoCompativel(codigoInterno, base)
            );
          });

          if (!codigoOk) return false;
          if (ignorarCor) return true;
          return normalizarTexto(ferragem.cores).includes(cor);
        }) || null
      );
    },
    [dados.corKit, ferragens]
  );

  const ferragensAutomaticas = useMemo(() => {
    const quantidade = Math.max(0, Number(dados.quantidade || 0));

    if (quantidade <= 0 || dados.corKit === "Escolher") return [];

    const regras: Array<{
      codigos: string[];
      multiplicador: number;
      ignorarCor?: boolean;
    }> = [
      { codigos: ["1560"], multiplicador: 1 },
      { codigos: ["KTJ3", "KTK"], multiplicador: 1, ignorarCor: true },
      { codigos: ["1125A"], multiplicador: 4, ignorarCor: true },
    ];

    if (dados.trinco === "Com trinco") {
      regras.push(
        { codigos: ["1335"], multiplicador: 2 },
        { codigos: ["1038.C-BC", "1038.C"], multiplicador: 2 }
      );
    }

    return regras
      .map((regra) => {
        const ferragem = buscarFerragem(
          regra.codigos,
          regra.ignorarCor
        );

        if (!ferragem) return null;

        return criarMaterial({
          qtd: quantidade * regra.multiplicador,
          unidade: "und",
          descricao: montarDescricaoComCor(
            ferragem.codigo,
            ferragem.nome,
            ferragem.cores
          ),
          valorUnitario: Number(ferragem.preco || 0),
        });
      })
      .filter(
        (item): item is ProjetoIndividualMaterial => Boolean(item)
      );
  }, [
    buscarFerragem,
    dados.corKit,
    dados.quantidade,
    dados.trinco,
  ]);

  useEffect(() => {
    if (
      dados.vidroPeitoril === "Escolher" ||
      dados.vidroJanelaBandeira === "Escolher"
    ) {
      return;
    }

    const novosVidros = [
      criarMaterial({
        qtd: calculoVidro.areaPeitoril,
        unidade: "m2",
        descricao: `VIDRO PEITORIL 4 PEÇAS ${calculoVidro.larguraPeitorilMedida}X${calculoVidro.alturaPeitorilMedida} ${dados.vidroPeitoril}`.toUpperCase(),
        valorUnitario: precoVidroPeitoril,
      }),
      criarMaterial({
        qtd: calculoVidro.areaJanelaFixa,
        unidade: "m2",
        descricao: `VIDRO FIXO 2 PEÇAS ${calculoVidro.larguraFixaMedida}X${calculoVidro.alturaFixaMedida} ${dados.vidroJanelaBandeira}`.toUpperCase(),
        valorUnitario: precoVidroJanela,
      }),
      criarMaterial({
        qtd: calculoVidro.areaJanelaMovel,
        unidade: "m2",
        descricao: `VIDRO MÓVEL 2 PEÇAS ${calculoVidro.larguraMovelMedida}X${calculoVidro.alturaMovelMedida} ${dados.vidroJanelaBandeira}`.toUpperCase(),
        valorUnitario: precoVidroJanela,
      }),
      criarMaterial({
        qtd: calculoVidro.areaBandeira,
        unidade: "m2",
        descricao: `VIDRO BANDEIRA 4 PEÇAS ${calculoVidro.larguraBandeiraMedida}X${calculoVidro.alturaBandeiraMedida} ${dados.vidroJanelaBandeira}`.toUpperCase(),
        valorUnitario: precoVidroJanela,
      }),
    ];

    setMateriais((lista) => {
      const manuais = lista.filter(
        (item) => !normalizarTexto(item.descricao).startsWith("vidro")
      );
      return [...novosVidros, ...manuais];
    });
  }, [
    calculoVidro.alturaBandeiraMedida,
    calculoVidro.alturaFixaMedida,
    calculoVidro.alturaMovelMedida,
    calculoVidro.alturaPeitorilMedida,
    calculoVidro.areaBandeira,
    calculoVidro.areaJanelaFixa,
    calculoVidro.areaJanelaMovel,
    calculoVidro.areaPeitoril,
    calculoVidro.larguraBandeiraMedida,
    calculoVidro.larguraFixaMedida,
    calculoVidro.larguraMovelMedida,
    calculoVidro.larguraPeitorilMedida,
    dados.vidroJanelaBandeira,
    dados.vidroPeitoril,
    precoVidroJanela,
    precoVidroPeitoril,
  ]);

  useEffect(() => {
    const codigosAutomaticos = [
      "vt49a",
      "vt50a",
      "vt45",
      "vt63",
      "vt16",
      "vt47",
      "vt66",
      "vt51a",
      "vt52a",
      "vt05",
      "vt13",
      "vt15",
      "vt17",
      "vt10",
      "1560",
      "ktj3",
      "ktk",
      "1125a",
      "1335",
      "1038c",
    ];

    setMateriais((lista) => {
      const manuais = lista.filter((item) => {
        const descricao = normalizarTexto(item.descricao);
        const ehTubo =
          descricao.includes("tubo retangular") ||
          descricao.includes("tubo quadrado");

        return (
          !ehTubo &&
          !codigosAutomaticos.some((codigo) =>
            descricao.replace(/[^a-z0-9]/g, "").includes(
              codigo.replace(/[^a-z0-9]/g, "")
            )
          )
        );
      });

      return [
        ...manuais,
        ...perfisAutomaticos,
        ...ferragensAutomaticas,
      ];
    });
  }, [ferragensAutomaticas, perfisAutomaticos]);

  const materiaisOrdenados = useMemo(
    () =>
      materiais
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const ordemA = ordemMaterialDescricao(
            a.item.descricao,
            a.item.unidade
          );
          const ordemB = ordemMaterialDescricao(
            b.item.descricao,
            b.item.unidade
          );

          return ordemA === ordemB ? a.index - b.index : ordemA - ordemB;
        })
        .map(({ item }) => item),
    [materiais]
  );

  const totalMateriais = useMemo(
    () =>
      materiais.reduce(
        (soma, item) =>
          soma +
          Number(item.qtd || 0) * Number(item.valorUnitario || 0),
        0
      ),
    [materiais]
  );

  const valorVidros = useMemo(
    () =>
      materiais
        .filter((item) =>
          normalizarTexto(item.descricao).includes("vidro")
        )
        .reduce(
          (soma, item) =>
            soma +
            Number(item.qtd || 0) *
              Number(item.valorUnitario || 0),
          0
        ),
    [materiais]
  );

  const valorPerfis = useMemo(
    () =>
      materiais
        .filter((item) => {
          const descricao = normalizarTexto(item.descricao);
          return (
            normalizarTexto(item.unidade).includes("barra") ||
            descricao.includes("vt") ||
            descricao.includes("tubo")
          );
        })
        .reduce(
          (soma, item) =>
            soma +
            Number(item.qtd || 0) *
              Number(item.valorUnitario || 0),
          0
        ),
    [materiais]
  );

  const valorFerragens = Math.max(
    0,
    totalMateriais - valorVidros - valorPerfis
  );

  const totalVidros = Number(dados.quantidade || 0) * 12;

  const projetoPdf: ProjetoIndividualDados = {
    ...dados,
    altura: dados.alturaTotal,
    vidro: `${dados.vidroPeitoril} / ${dados.vidroJanelaBandeira}`,
    observacao: `Peitoril: ${dados.alturaPeitoril} mm | Janela: ${dados.alturaJanela} mm | Bandeira: ${alturaBandeira} mm`,
    materiais,
  };

  const montarItemCentral = (
    id?: string
  ): CentralImpressaoProjetoItem => ({
    id:
      id ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID()
        : String(Date.now())),
    numero: dados.numero,
    projeto: "Janela de correr com bandeira e peitoril",
    cliente: dados.cliente,

    largura: Number(dados.largura || 0),
    altura: Number(dados.alturaTotal || 0),
    alturaTotal: Number(dados.alturaTotal || 0),
    alturaPeitoril: Number(dados.alturaPeitoril || 0),
    alturaJanela: Number(dados.alturaJanela || 0),
    alturaBandeira: Number(alturaBandeira || 0),
    quantidade: Number(dados.quantidade || 0),

    medidas: `${dados.largura} x ${dados.alturaTotal} mm`,
    modo: "Barra",
    desenhoUrl: desenhoPC4FCBS(dados.trinco),

    corKit: dados.corKit,
    corPerfil: dados.corKit,

    vidro: dados.vidroPeitoril,
    vidroPeitoril: dados.vidroPeitoril,
    vidroBandeira: dados.vidroJanelaBandeira,
    vidroJanela: dados.vidroJanelaBandeira,

    tuboPerfil: dados.tuboPerfil,
    tubo: dados.tuboPerfil,
    trinco: dados.trinco,
    temTrinco: dados.trinco === "Com trinco",

    valorTotal: Number(totalMateriais || 0),
    materiais,

    // Estes campos não pertencem ao JC4FCBS.
    trilho: "",
    puxador: "",
    tamanhoPuxador: "",

    origemRota: "/jc4fcbs",
  });

  const enviarParaCentral = () => {
    try {
      const salvo = localStorage.getItem(CENTRAL_KEY);
      const lista = salvo ? (JSON.parse(salvo) as CentralImpressaoProjetoItem[])
        : [];
      const novoItem = montarItemCentral(
        centralItemId || undefined
      );

      const proximaLista =
        centralItemId &&
        lista.some((item) => item.id === centralItemId) ? lista.map((item) =>
              item.id === centralItemId ? novoItem : item
            )
          : [...lista, novoItem];

      localStorage.setItem(
        CENTRAL_KEY,
        JSON.stringify(proximaLista)
      );
      localStorage.setItem(
        CENTRAL_CLIENTE_KEY,
        dados.cliente || ""
      );

      router.push(
        centralItemId ? returnTo : "/central-impressao"
      );
    } catch {
      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao enviar",
        mensagem:
          "Não foi possível enviar o projeto para a Central.",
      });
    }
  };

  const gerarNumeroOrcamento = async () => {
    return gerarNumeroOrcamentoPadrao(supabase);
  };
  const loteRapido = useLoteRapidoProjetos({
    centralLoteId,
    centralItemId,
    returnTo,
    dados,
    materiais,
    setDados,
    setMensagemSistema,
    montarItemCentral,
    onNavigate: router.push,
  });

  const salvarOrcamento = async () => {
    if (centralItemId) {
      enviarParaCentral();
      return;
    }

    if (!empresaId) return;

    if (
      dados.alturaPeitoril + dados.alturaJanela >
      dados.alturaTotal
    ) {
      setMensagemSistema({
        tipo: "aviso",
        titulo: "Alturas inválidas",
        mensagem:
          "A soma do peitoril com a janela ultrapassa a altura total.",
      });
      return;
    }

    try {
      setSalvandoOrcamento(true);

      const numeroFinal = editId ? dados.numero
        : await gerarNumeroOrcamento();

      const dadosAtualizados = {
        ...dados,
        numero: numeroFinal,
        altura: dados.alturaTotal,
      };

      const itens: PC4FCBSOrcamentoPersistido = {
        tipo: "jc4fcbs",
        modo: "barra",
        dados: dadosAtualizados,
        materiais,
      };

      const payload = {
        numero_formatado: numeroFinal,
        cliente_nome: dados.cliente || "Consumidor",
        obra_referencia: "JC4FCBS",
        itens,
        valor_total: totalMateriais,
        metragem_total: calculoVidro.areaTotalCobrada,
        peso_total: 0,
        empresa_id: empresaId,
        theme_color: theme.menuIconColor || "#07385a",
      };

      const { error } = editId ? await supabase
            .from("orcamentos")
            .update(payload)
            .eq("id", editId)
        : await supabase.from("orcamentos").insert([payload]);

      if (error) throw error;

      setDados(dadosAtualizados);

      setMensagemSistema({
        tipo: "sucesso",
        titulo: editId ? "Orçamento atualizado"
          : "Orçamento salvo",
        mensagem: `Orçamento ${numeroFinal} salvo com sucesso.`,
        aoFechar: () => router.push(returnTo),
      });
    } catch (erro) {
      setMensagemSistema({
        tipo: "erro",
        titulo: "Erro ao salvar",
        mensagem:
          erro instanceof Error ? erro.message
            : "Não foi possível salvar.",
      });
    } finally {
      setSalvandoOrcamento(false);
    }
  };

  const novoProjeto = () => {
    localStorage.removeItem(PROJETO_DRAFT_KEY);
    localStorage.removeItem(PROJETO_DRAFT_KEY_LEGADO);

    setDados({
      projeto: "Janela de correr com bandeira e peitoril",
      numero: "005412",
      data: hojePtBr(),
      cliente: "",
      largura: 0,
      altura: 0,
      alturaPeitoril: 0,
      alturaJanela: 0,
      alturaTotal: 0,
      quantidade: 1,
      trilho: "",
      vidro: "Escolher",
      vidroPeitoril: "Escolher",
      vidroJanelaBandeira: "Escolher",
      corKit: "Escolher",
      tuboPerfil: "Escolher",
      puxador: "",
      tamanhoPuxador: "",
      trinco: "Sem trinco",
      observacao: "Imagem ilustrativa do projeto",
    });

    setMateriais([]);
    setListaClientesAberta(false);
    setListaVidroPeitorilAberta(false);
    setListaVidroJanelaAberta(false);

    if (editId || centralItemId) {
      router.push("/jc4fcbs");
    }
  };

  const itensCatalogo = useMemo<ItemCatalogo[]>(() => {
    const itensPerfis = perfis.map((perfil) => ({
      id: `perfil-${perfil.id}`,
      tipo: "perfil" as const,
      descricao: `${perfil.codigo} - ${
        perfil.nome_completo || perfil.nome
      }${perfil.cores ? ` | ${perfil.cores}` : ""}`.toUpperCase(),
      preco: Number(perfil.preco || 0),
    }));

    const itensFerragens = ferragens.map((ferragem) => ({
      id: `ferragem-${ferragem.id}`,
      tipo: "ferragem" as const,
      descricao: montarDescricaoComCor(
        ferragem.codigo,
        ferragem.nome,
        ferragem.cores
      ),
      preco: Number(ferragem.preco || 0),
    }));

    return [...itensPerfis, ...itensFerragens];
  }, [ferragens, perfis]);

  const selecionarCatalogo = (
    idMaterial: string,
    item: ItemCatalogo
  ) => {
    setMateriais((lista) =>
      lista.map((material) =>
        material.id === idMaterial ? {
              ...material,
              descricao: item.descricao,
              unidade:
                item.tipo === "perfil" ? "barra" : "und",
              valorUnitario: item.preco,
            }
          : material
      )
    );
  };

  const clientesFiltrados = clientes
    .filter((cliente) =>
      cliente.nome
        .toLowerCase()
        .includes(dados.cliente.toLowerCase())
    )
    .slice(0, 8);

  const vidrosPeitorilFiltrados = vidros
    .filter((vidro) =>
      formatarVidroCadastro(vidro)
        .toLowerCase()
        .includes(
          dados.vidroPeitoril === "Escolher" ? ""
            : dados.vidroPeitoril.toLowerCase()
        )
    )
    .slice(0, 8);

  const vidrosJanelaFiltrados = vidros
    .filter((vidro) =>
      formatarVidroCadastro(vidro)
        .toLowerCase()
        .includes(
          dados.vidroJanelaBandeira === "Escolher" ? ""
            : dados.vidroJanelaBandeira.toLowerCase()
        )
    )
    .slice(0, 8);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#ffffff_0,#f5f8fb_34%,#eef3f7_100%)] text-[#0f2742]">
      <div className="flex min-h-screen w-full flex-col">
        <header className="relative z-40 mx-4 mt-4 grid shrink-0 grid-cols-1 items-center gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-4 shadow-[0_18px_50px_rgba(15,39,66,0.08)] backdrop-blur sm:mx-6 sm:px-6 xl:grid-cols-[minmax(180px,0.65fr)_minmax(280px,0.9fr)_minmax(520px,1.45fr)]">
          <div className="flex h-13.5 items-center">
            {logoUsuario ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUsuario}
                alt="Logo da empresa"
                className="max-h-13.5 max-w-55 object-contain"
              />
            ) : (
              <div className="text-[22px] font-semibold">
                Logo da empresa
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 xl:justify-end">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Projeto:
            </label>
            <input
              value={dados.projeto}
              onChange={(e) =>
                atualizarCampo("projeto", e.target.value)
              }
              className="w-full max-w-75 bg-transparent text-[17px] font-semibold uppercase outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3">
            <HeaderField
              icon={<FileText size={26} />}
              label="Nº Orçamento"
              value={dados.numero}
              green
            />
            <HeaderField
              icon={<Calendar size={26} />}
              label="Data"
              value={dados.data}
              green
            />

            <div className="relative flex min-h-12 items-center gap-3 border-t border-slate-200 py-2 sm:border-l sm:border-t-0 sm:px-4">
              <UserRound size={28} className="text-slate-500" />
              <div className="min-w-0 flex-1">
                <label className="block text-[10px] font-semibold uppercase text-slate-500">
                  Cliente
                </label>

                {listaClientesAberta ? (
                  <input
                    ref={clienteInputRef}
                    value={dados.cliente}
                    onChange={(e) =>
                      atualizarCampo("cliente", e.target.value)
                    }
                    onBlur={() =>
                      window.setTimeout(
                        () => setListaClientesAberta(false),
                        250
                      )
                    }
                    className="w-full bg-transparent text-sm font-semibold text-[#07385a] outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setListaClientesAberta(true)}
                    className="block w-full truncate text-left text-sm font-semibold text-[#07385a]"
                  >
                    {dados.cliente || "Digite o cliente"}
                  </button>
                )}
              </div>

              {listaClientesAberta && (
                <Dropdown>
                  {clientesFiltrados.map((cliente) => (
                    <DropdownButton
                      key={cliente.id}
                      onSelect={() => {
                        atualizarCampo("cliente", cliente.nome);
                        setListaClientesAberta(false);
                      }}
                    >
                      {cliente.nome}
                    </DropdownButton>
                  ))}
                </Dropdown>
              )}
            </div>
          </div>
        </header>

        <aside className="border-b border-slate-200 bg-white">
          <nav className="flex gap-2 overflow-x-auto px-4 py-2 sm:px-6">
            <MenuItem
              icon={<ClipboardList size={18} />}
              label="Orçamento"
              active
            />

            <PDFDownloadLink
              document={
                <JC4FCBSPDF
                  dados={{
                    ...projetoPdf,
                    alturaPeitoril: dados.alturaPeitoril,
                    alturaJanela: dados.alturaJanela,
                    alturaTotal: dados.alturaTotal,
                    alturaBandeira,
                    vidroPeitoril: dados.vidroPeitoril,
                    vidroJanelaBandeira: dados.vidroJanelaBandeira,
                    tuboPerfil: dados.tuboPerfil,
                  }}
                  logoUrl={logoUsuario}
                />
              }
              fileName={`JC4FCBS_${dados.numero || "novo"}.pdf`}
              className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Printer size={18} />
              Imprimir
            </PDFDownloadLink>

            <MenuItem
              icon={<FolderOpen size={18} />}
              label="Projetos"
              onClick={() => router.push("/matriz-projetos")}
            />
            <MenuItem
              icon={<FileText size={18} />}
              label="PDF +"
              onClick={enviarParaCentral}
            />
            <MenuItem
              icon={<Save size={18} />}
              label={
                salvandoOrcamento ? "Salvando..." : "Salvar"
              }
              onClick={salvarOrcamento}
            />
        <MenuItem
  icon={<Settings size={18} />}
  label="Configurações"
/>

<MenuItem
  icon={<HelpCircle size={18} />}
  label="Ajuda"
/>
          </nav>
        </aside>

        <section className="flex-1 bg-transparent p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(330px,400px)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,39,66,0.08)]">
              <SectionTitle>Desenho ilustrativo</SectionTitle>
              <div className="mt-3 flex min-h-97.5 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={desenhoPC4FCBS(dados.trinco)}
                  alt="Desenho JC4FCBS"
                  className="max-h-102.5 max-w-full object-contain"
                />
              </div>
            </section>

            <div className="space-y-4">
              <section className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,39,66,0.08)]">
                <SectionTitle>Dados do projeto</SectionTitle>

                <div className="mt-4 grid gap-3 overflow-visible md:grid-cols-3">
                  <DataInput
                    icon={<MoveHorizontal size={24} />}
                    label="Largura"
                    value={dados.largura}
                    suffix="mm"
                    onChange={(valor) =>
                      atualizarCampo("largura", valor)
                    }
                  />

                  <DataInput
                    icon={<MoveVertical size={24} />}
                    label="Altura peitoril"
                    value={dados.alturaPeitoril}
                    suffix="mm"
                    onChange={(valor) =>
                      atualizarCampo("alturaPeitoril", valor)
                    }
                  />

                  <DataInput
                    icon={<MoveVertical size={24} />}
                    label="Altura janela"
                    value={dados.alturaJanela}
                    suffix="mm"
                    onChange={(valor) =>
                      atualizarCampo("alturaJanela", valor)
                    }
                  />

                  <DataInput
                    icon={<MoveVertical size={24} />}
                    label="Altura total"
                    value={dados.alturaTotal}
                    suffix="mm"
                    onChange={(valor) => {
                      atualizarCampo("alturaTotal", valor);
                      atualizarCampo("altura", valor);
                    }}
                  />

                  <DataInput
                    icon={<Copy size={24} />}
                    label="Quantidade"
                    value={dados.quantidade}
                    onChange={(valor) =>
                      atualizarCampo("quantidade", valor)
                    }
                  />

                  <GlassField
                    fieldName="vidroPeitoril"
                    nextFieldName="vidroJanela"
                    label="Vidro do peitoril"
                    value={dados.vidroPeitoril}
                    open={listaVidroPeitorilAberta}
                    inputRef={vidroPeitorilInputRef}
                    options={vidrosPeitorilFiltrados}
                    onOpen={() =>
                      setListaVidroPeitorilAberta(true)
                    }
                    onClose={() =>
                      setListaVidroPeitorilAberta(false)
                    }
                    onType={(valor) =>
                      atualizarCampo("vidroPeitoril", valor)
                    }
                    onSelect={(vidro) => {
                      atualizarCampo(
                        "vidroPeitoril",
                        formatarVidroCadastro(vidro)
                      );
                      setListaVidroPeitorilAberta(false);
                    }}
                  />

                  <GlassField
                    fieldName="vidroJanela"
                    nextFieldName="corKit"
                    label="Vidro janela e bandeira"
                    value={dados.vidroJanelaBandeira}
                    open={listaVidroJanelaAberta}
                    inputRef={vidroJanelaInputRef}
                    options={vidrosJanelaFiltrados}
                    onOpen={() =>
                      setListaVidroJanelaAberta(true)
                    }
                    onClose={() =>
                      setListaVidroJanelaAberta(false)
                    }
                    onType={(valor) =>
                      atualizarCampo(
                        "vidroJanelaBandeira",
                        valor
                      )
                    }
                    onSelect={(vidro) => {
                      atualizarCampo(
                        "vidroJanelaBandeira",
                        formatarVidroCadastro(vidro)
                      );
                      setListaVidroJanelaAberta(false);
                    }}
                  />

                  <OptionInput
                    fieldName="corKit"
                    nextFieldName="tubo"
                    icon={<Palette size={24} />}
                    label="Cor do kit"
                    value={dados.corKit || "Escolher"}
                    options={corKitOpcoes}
                    onChange={(valor) =>
                      atualizarCampo("corKit", valor)
                    }
                  />

                  <OptionInput
                    fieldName="tubo"
                    nextFieldName="trinco"
                    icon={<Settings size={24} />}
                    label="Tubo"
                    value={dados.tuboPerfil || "Escolher"}
                    options={tuboOpcoes}
                    disabled={dados.corKit === "Escolher"}
                    onChange={(valor) =>
                      atualizarCampo("tuboPerfil", valor)
                    }
                  />

                  <OptionInput
                    fieldName="trinco"
                    icon={<Settings size={24} />}
                    label="Trinco"
                    value={dados.trinco || "Sem trinco"}
                    options={trincoOpcoes}
                    onChange={(valor) =>
                      atualizarCampo("trinco", valor)
                    }
                  />
                </div>

                {dados.alturaPeitoril + dados.alturaJanela >
                  dados.alturaTotal && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                    <AlertTriangle size={18} />
                    Peitoril + janela ultrapassam a altura total.
                  </div>
                )}
              </section>

              <LoteRapidoProjetos
                aberto={loteRapido.aberto}
                editando={loteRapido.editando}
                linhas={loteRapido.linhas}
                onAlternar={loteRapido.alternar}
                onAdicionar={loteRapido.adicionarLinha}
                onRemover={loteRapido.removerLinha}
                onAtualizar={loteRapido.atualizarLinha}
                onEnviar={loteRapido.enviar}
              />

                            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
                                      <SectionTitle>Relação de materiais</SectionTitle>
                                      <div className="flex items-center gap-2 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
                                        <button
                                          type="button"
                                          onClick={novoProjeto}
                                          className="rounded-xl bg-slate-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm"
                                        >
                                          Novo
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setMateriais((lista) => [...lista, criarMaterial()])}
                                          className="rounded-xl bg-[#07385a] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm"
                                        >
                                          Adicionar item
                                        </button>

                                      </div>
                                    </div>

                                    <div className="mt-4 overflow-x-auto overflow-y-visible border-y border-slate-200">
                                      <div className="grid min-w-180 grid-cols-[80px_2fr_70px_36px_115px_36px_105px] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        <div className="border-r border-slate-200/80 px-3 py-3 text-center">Qtd</div>
                                        <div className="border-r border-slate-200/80 px-3 py-3">Produto / descrição</div>
                                        <div className="border-r border-slate-200/80 px-3 py-3 text-center">Unidade</div>
                                        <div className="px-3 py-3 text-center" />
                                        <div className="border-r border-slate-200/80 px-3 py-3 text-right">Valor unit.</div>
                                        <div className="px-3 py-3 text-center" />
                                        <div className="px-3 py-3 text-right">Valor total</div>
                                      </div>
                                      {materiaisOrdenados.map((item) => (
                                        <div key={item.id} className="group relative grid min-h-9.25 min-w-180 grid-cols-[80px_2fr_70px_36px_115px_36px_105px] items-center border-t border-slate-200 bg-white text-xs leading-none text-[#10253f]">
                                          <div className="px-3 py-2">
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={formatarQtdMaterial(item.qtd, item.unidade)}
                                              onChange={(e) => atualizarMaterial(item.id, "qtd", parseQtdMaterial(e.target.value, item.unidade))}
                                              className="h-5 w-full bg-transparent p-0 text-center font-medium leading-5 outline-none focus:rounded-md focus:bg-slate-50"
                                            />
                                          </div>
                                          <div className="flex min-h-9 items-center px-3 py-1.5">
                                            <DescricaoMaterialInput
                                              item={item}
                                              itensCatalogo={itensCatalogo}
                                              atualizarMaterial={atualizarMaterial}
                                              selecionarItemCatalogo={selecionarCatalogo}
                                            />
                                          </div>
                                          <div className="px-3 py-2">
                                            <input
                                              value={item.unidade}
                                              onChange={(e) => atualizarMaterial(item.id, "unidade", e.target.value)}
                                              className="h-5 w-full bg-transparent p-0 text-center font-medium leading-5 outline-none focus:rounded-md focus:bg-slate-50"
                                            />
                                          </div>
                                          <div className="px-3 py-2 text-center font-medium">R$</div>
                                          <div className="px-3 py-2">
                                            <input
                                              value={numero(item.valorUnitario)}
                                              onChange={(e) => atualizarMaterial(item.id, "valorUnitario", parseNumeroPtBr(e.target.value))}
                                              className="h-5 w-full bg-transparent p-0 text-right font-medium leading-5 outline-none focus:rounded-md focus:bg-slate-50"
                                            />
                                          </div>
                                          <div className="px-3 py-2 text-center font-medium">R$</div>
                                          <div className="px-3 py-2 text-right font-medium">
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

                                    <div className="flex items-center justify-end gap-5 px-4 py-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0f2742]">Valor total do Orçamento</p>
                                      <div className="rounded-2xl bg-slate-100 px-7 py-3 text-xl font-bold text-[#0f2742]">
                                        {moeda(totalMateriais)}
                                      </div>
                                    </div>
                                  </section>
            </div>
          </div>

          <section className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,39,66,0.08)] md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard
              icon={<Grid2X2 size={30} />}
              label="Área total"
              value={`${numero(
                calculoVidro.areaTotalCobrada
              )} m2`}
              detail={`Bandeira: ${alturaBandeira} mm`}
              tone="green"
            />
            <SummaryCard
              icon={<ClipboardList size={30} />}
              label="Total de vidros"
              value={numero(totalVidros, 0)}
              detail="Peitoril + Janela + Bandeira"
              tone="blue"
            />
            <SummaryCard
              icon={<Layers3 size={30} />}
              label="Valor vidros"
              value={moeda(valorVidros)}
              detail="Vidros"
              tone="purple"
            />
            <SummaryCard
              icon={<RailSymbol size={30} />}
              label="Valor perfis"
              value={moeda(valorPerfis)}
              detail="Perfis e tubo"
              tone="blue"
            />
            <SummaryCard
              icon={<Wrench size={30} />}
              label="Valor ferragens"
              value={moeda(valorFerragens)}
              detail="Kits e acessórios"
              tone="orange"
            />
            <SummaryCard
              icon={<DollarSign size={30} />}
              label="Valor total"
              value={moeda(totalMateriais)}
              detail="Orçamento total"
              tone="emerald"
            />
          </section>
        </section>
      </div>

      {mensagemSistema && (
        <div className="fixed inset-0 z-60 flex items-start justify-center bg-slate-950/20 p-4 pt-8">
          <section className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                {mensagemSistema.tipo === "sucesso" ? (
                  <CheckCircle2 size={21} />
                ) : (
                  <AlertTriangle size={21} />
                )}
              </div>

              <div>
                <h2 className="text-sm font-black">
                  {mensagemSistema.titulo}
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  {mensagemSistema.mensagem}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const aoFechar =
                    mensagemSistema.aoFechar;
                  setMensagemSistema(null);
                  aoFechar?.();
                }}
                className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95"
                style={{
                  backgroundColor:
                    theme.modalButtonBackgroundColor ||
                    theme.menuBackgroundColor ||
                    "#07385a",
                  color: theme.modalButtonTextColor || "#ffffff",
                }}
              >
                OK
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function HeaderField({
  icon,
  label,
  value,
  green,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="flex min-h-13.5 items-center gap-3 border-t border-slate-200/80 py-2 sm:border-l sm:border-t-0 sm:px-5">
      <span className="text-slate-500">{icon}</span>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-slate-500">
          {label}
        </label>
        <span
          className={`text-sm font-semibold ${
            green ? "text-emerald-600" : ""
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${
        active ? "border-[#07385a]/15 bg-[#07385a]/5 text-[#07385a]"
          : "border-transparent text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#0f2742]">
        {children}
      </h2>
      <div className="mt-3 h-0.5 w-10 rounded-full bg-[#18bd72]" />
    </div>
  );
}

function DataInput({
  icon,
  label,
  value,
  suffix,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-h-19 items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 transition-colors focus-within:border-emerald-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
      <span className="flex w-7 shrink-0 justify-start text-[#0f2742]/65">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>

        <span className="mt-0.5 flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            min={0}
            max={9999}
            inputMode="numeric"
            data-keyboard-field="true"
            onKeyDown={(e) => {
              if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                e.preventDefault();
                return;
              }

              navegarComEnter(e);
            }}
            onChange={(e) =>
              onChange(limitarNumero4Digitos(e.target.value))
            }
            className="w-20.5 min-w-0 rounded-lg bg-transparent text-base font-semibold leading-tight text-[#10253f] outline-none focus-visible:bg-white/80"
          />

          {suffix && (
            <span className="text-sm font-semibold leading-tight text-[#10253f]">
              {suffix}
            </span>
          )}
        </span>
      </span>
    </label>
  );
}

function OptionInput({
  fieldName,
  nextFieldName,
  icon,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  fieldName: string;
  nextFieldName?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={`flex min-h-19 items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 transition-colors focus-within:border-emerald-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <span className="flex w-7 shrink-0 justify-start text-[#0f2742]/65">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>

        <select
          value={value}
          disabled={disabled}
          data-keyboard-field="true"
          data-keyboard-name={fieldName}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;

            e.preventDefault();

            if (nextFieldName) {
              const proximo = document.querySelector<HTMLElement>(
                `[data-keyboard-name="${nextFieldName}"]:not([disabled])`
              );

              proximo?.focus();

              if (proximo instanceof HTMLInputElement) {
                proximo.select();
              }
            }
          }}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full cursor-pointer appearance-auto rounded-lg border-0 bg-transparent p-0 text-base font-semibold leading-tight text-[#10253f] outline-none focus-visible:bg-white/80 disabled:cursor-not-allowed"
        >
          {options.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function GlassField({
  fieldName,
  nextFieldName,
  label,
  value,
  open,
  inputRef,
  options,
  onOpen,
  onClose,
  onType,
  onSelect,
}: {
  fieldName: string;
  nextFieldName: string;
  label: string;
  value: string;
  open: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  options: VidroCadastro[];
  onOpen: () => void;
  onClose: () => void;
  onType: (value: string) => void;
  onSelect: (vidro: VidroCadastro) => void;
}) {
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  useEffect(() => {
    if (open) {
      setIndiceAtivo(0);
    }
  }, [open]);

  return (
    <label className="relative flex min-h-19 items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 transition-colors focus-within:border-emerald-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
      <span className="flex w-7 shrink-0 justify-start text-[#0f2742]/65">
        <Layers size={24} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>

        <input
          ref={inputRef}
          value={value === "Escolher" ? "" : value}
          data-keyboard-field="true"
          data-keyboard-name={fieldName}
          placeholder="Digite o vidro"
          onFocus={(e) => {
            const input = e.currentTarget;
            onOpen();

            window.setTimeout(() => {
              if (document.contains(input)) {
                input.select();
              }
            }, 0);
          }}
          onClick={(e) => {
            onOpen();
            e.currentTarget.select();
          }}
          onChange={(e) => {
            onOpen();
            onType(e.target.value);
            setIndiceAtivo(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              onOpen();
              setIndiceAtivo((atual) =>
                Math.min(atual + 1, Math.max(options.length - 1, 0))
              );
              return;
            }

            if (e.key === "ArrowUp") {
              e.preventDefault();
              onOpen();
              setIndiceAtivo((atual) => Math.max(atual - 1, 0));
              return;
            }

            if (e.key === "Enter") {
              e.preventDefault();

              if (open && options[indiceAtivo]) {
                onSelect(options[indiceAtivo]);
              }

              // Procura novamente o campo pelo nome depois que o React
              // terminar de atualizar a seleção do vidro.
              window.setTimeout(() => {
                const proximoCampo =
                  document.querySelector<HTMLElement>(
                    `[data-keyboard-name="${nextFieldName}"]:not([disabled])`
                  );

                proximoCampo?.focus();

                if (proximoCampo instanceof HTMLInputElement) {
                  proximoCampo.select();
                }
              }, 50);

              return;
            }

            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
              e.currentTarget.blur();
            }
          }}
          onBlur={() => window.setTimeout(onClose, 250)}
          className="mt-0.5 w-full rounded-md bg-transparent p-0 text-sm font-semibold leading-tight text-[#10253f] outline-none placeholder:text-slate-400 focus-visible:bg-white/70"
        />
      </span>

      {open && (
        <Dropdown>
          {options.map((vidro, index) => (
            <DropdownButton
              key={vidro.id}
              active={index === indiceAtivo}
              onMouseEnter={() => setIndiceAtivo(index)}
              onSelect={() => onSelect(vidro)}
            >
              {formatarVidroCadastro(vidro)}
            </DropdownButton>
          ))}
        </Dropdown>
      )}
    </label>
  );
}

function Dropdown({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="absolute left-17.5 top-15 z-40 max-h-62.5 w-80 overflow-auto rounded-lg border border-[#07385a]/20 bg-white py-1 text-sm shadow-xl">
      {children}
    </div>
  );
}

function DropdownButton({
  children,
  onSelect,
  active = false,
  onMouseEnter,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  active?: boolean;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={`block w-full px-3 py-2 text-left font-semibold text-[#07385a] ${
        active ? "bg-[#07385a]/10" : "hover:bg-[#07385a]/10"
      }`}
    >
      {children}
    </button>
  );
}

function DescricaoMaterialInput({
  item,
  itensCatalogo,
  atualizarMaterial,
  selecionarItemCatalogo,
}: {
  item: ProjetoIndividualMaterial;
  itensCatalogo: ItemCatalogo[];
  atualizarMaterial: <K extends keyof ProjetoIndividualMaterial>(
    id: string,
    campo: K,
    valor: ProjetoIndividualMaterial[K]
  ) => void;
  selecionarItemCatalogo: (idMaterial: string, item: ItemCatalogo) => void;
}) {
  const [aberto, setAberto] = useState(false);

  const termo = item.descricao.trim().toLowerCase();

  const itensFiltrados = useMemo(() => {
    if (!termo || termo === "novo item") return itensCatalogo.slice(0, 10);

    return itensCatalogo
      .filter((catalogo) => catalogo.descricao.toLowerCase().includes(termo))
      .slice(0, 10);
  }, [itensCatalogo, termo]);

  return (
    <div className="relative w-full">
      <input
        value={item.descricao}
        onFocus={() => {
          if (item.descricao.toLowerCase() === "novo item") {
            atualizarMaterial(item.id, "descricao", "");
          }

          setAberto(true);
        }}
        onChange={(e) => {
          atualizarMaterial(item.id, "descricao", e.target.value.toUpperCase());
          setAberto(true);
        }}
        onBlur={() => window.setTimeout(() => setAberto(false), 250)}
        className="w-full bg-transparent text-xs font-medium uppercase outline-none focus:rounded-md focus:bg-slate-50"
      />

      {aberto && itensFiltrados.length > 0 && (
        <div className="absolute left-0 top-7 z-40 max-h-64 w-130 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {itensFiltrados.map((catalogo) => (
            <button
              key={catalogo.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selecionarItemCatalogo(item.id, catalogo);
                setAberto(false);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selecionarItemCatalogo(item.id, catalogo);
                setAberto(false);
              }}
              onClick={() => {
                selecionarItemCatalogo(item.id, catalogo);
                setAberto(false);
              }}
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-[#07385a] hover:bg-[#07385a]/10"
            >
              <span>{catalogo.descricao}</span>
              <span className="ml-2 text-[10px] text-slate-400">
                {catalogo.tipo}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "purple" | "orange" | "emerald";
}) {
  const tones = {
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    emerald: "bg-green-100 text-green-700",
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 xl:border-r xl:border-slate-200 last:border-r-0">
      <div
        className={`flex h-11 w-12 items-center justify-center rounded-lg ${tones[tone]}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-base font-semibold">
          {value}
        </p>
        <p className="text-[11px] text-slate-500">
          {detail}
        </p>
      </div>
    </div>
  );
}
