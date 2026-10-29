"use client";
import { avisosAcrescimoVidro } from "@/utils/avisosMedidaVidro";
import AvisoAcrescimoVidro from "@/components/AvisoAcrescimoVidro";
import { precoMaterialVidro } from "@/utils/regraMedidaVidro";
import { useRegraMedidaVidro } from "@/context/RegraMedidaVidroContext";
import { resultadoConformeCor } from "@/utils/materiaisConformeCor";
import { localizarClientePorNome } from "@/utils/tabelaClienteOrcamento";
import { confirmarEnvioOrcamento } from "@/utils/envioOrcamento";
import { useClienteOrcamento } from "@/context/OrcamentoContext";
import { DRAWING_COLORS } from "@/design/drawing";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, FilePlus2, Package2, PanelsTopLeft, Printer, Ruler, Save, Search, SquareStack } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { gerarNumeroOrcamentoPadrao } from "@/utils/orcamentoNumero";
import { formatarPreco } from "@/utils/formatarPreco";
import { normalizarPrecoCatalogo } from "@/utils/precos";
import { localizarVidroPorDescricao } from "@/utils/vidros";
import { calcularSacadaTorre } from "@/utils/sacada-torre-calc";
import { escolherItemPorCor } from "@/utils/catalogo-cor";
import type { CentralImpressaoItem } from "@/app/relatorios/centralimpressao/CentralImpressaoPDF";
import { SacadaTorrePDF } from "@/app/relatorios/sacadatorre/SacadaTorrePDF";
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
  categoria?: string | null;
};

type FerragemTabela = {
  codigo: string;
  nome: string;
  cores?: string | null;
  preco?: number | string | null;
};

type PrecoEspecial = {
  vidro_id: string;
  grupo_preco_id: string;
  preco: number;
};

type SacadaTorreDraft = {
  clienteId: string;
  buscaCliente: string;
  obra: string;
  larguraVaoMm: string;
  alturaVaoMm: string;
  quantidadeVaos: string;
  quantidadeDivisoesLargura: string;
  quantidadeTorresPorVidro: string;
  buscaVidro: string;
  vidroId: string;
  corPerfil: string;
  torreCodigo: string;
  usarGrapa3019: boolean;
  usarGrapa1305: boolean;
};

type SacadaTorreCentralItem = CentralImpressaoItem & {
  origemRota?: string;
  corPerfil?: string;
  centralDados?: SacadaTorreDraft;
};

const CORES_PERFIL = ["Branco", "Preto", "Fosco", "Inox"];
const SACADA_TORRE_DRAFT_KEY = "sacada-torre-draft";
const CENTRAL_IMPRESSAO_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_IMPRESSAO_CLIENTE_KEY = "glasscode:central-impressao:cliente";
const CENTRAL_IMPRESSAO_OBRA_KEY = "glasscode:central-impressao:obra";

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizarBusca = (texto?: string | number | null) =>
  normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizarCodigo = (codigo?: string | null) =>
  String(codigo || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

const normalizarNumeroInteiro = (valor: string) => Number(String(valor || "").replace(/\D/g, "")) || 0;

const normalizarPreco = (preco?: number | string | null) => {
  if (typeof preco === "number") return Number.isFinite(preco) ? preco : 0;
  if (typeof preco !== "string") return 0;
  const somenteNumero = preco.trim().replace(/[^\d,.-]/g, "");
  if (!somenteNumero) return 0;
  const temVirgula = somenteNumero.includes(",");
  const temPonto = somenteNumero.includes(".");
  const normalizado = temVirgula && temPonto
    ? somenteNumero.lastIndexOf(",") > somenteNumero.lastIndexOf(".")
      ? somenteNumero.replace(/\./g, "").replace(/,/g, ".")
      : somenteNumero.replace(/,/g, "")
    : temVirgula ? somenteNumero.replace(/,/g, ".") : somenteNumero;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : 0;
};

const corCompativel = (coresBanco?: string | null, corSelecionada?: string) => {
  if (!coresBanco || !corSelecionada) return false;
  const cor = normalizarTexto(corSelecionada).replace(/\s+/g, "");
  return coresBanco
    .split(/[;,/|]+/)
    .map((item) => normalizarTexto(item).replace(/\s+/g, ""))
    .filter(Boolean)
    .includes(cor);
};

const montarDescricaoVidro = (vidro?: Vidro | null) => {
  if (!vidro) return "Vidro nao selecionado";
  return [vidro.nome, vidro.espessura, vidro.tipo]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" - ");
};

const formatarNumero = (valor: number, casasDecimais = 3) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casasDecimais,
  });

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const corPerfilSvg = (cor?: string) => {
  const corNormalizada = normalizarTexto(cor).replace(/\s+/g, "");
  if (corNormalizada === "branco") return { fill: "#F6F8F8", stroke: "#8F9AA1", shadow: "#DCE2E4" };
  if (corNormalizada === "preto") return { fill: "#606A70", stroke: "#38444B", shadow: "#89949A" };
  if (corNormalizada === "fosco") return { fill: "#B6BEC1", stroke: "#8F9AA1", shadow: "#DCE2E4" };
  return { fill: "#DCE2E4", stroke: "#8F9AA1", shadow: "#F6F8F8" };
};

const gerarSvgSacadaTorre = ({
  largura, altura, divisoes, torresPorVidro, corPerfil, codigoTorre, usarGrapa3019 = true, usarGrapa1305 = true,
}: {
  largura: number; altura: number; divisoes: number; torresPorVidro: number;
  corPerfil?: string; codigoTorre?: string; usarGrapa3019?: boolean; usarGrapa1305?: boolean;
}) => {
  // Desenho técnico responsivo: mais divisões ampliam o viewBox horizontal,
  // sem aumentar a altura do cartão nem sobrepor os acessórios.
  const divs = Math.max(1, Math.floor(divisoes || 1));
  const towers = Math.max(0, Math.floor(torresPorVidro || 0));
  const panelW = Math.max(155, Math.min(250, 780 / divs));
  const glassW = panelW * divs;
  const glassH = Math.max(160, Math.min(235, panelW * Math.max(0.65, Math.min(1.25, (altura || 1100) / Math.max((largura || 3000) / divs, 1)))));
  const left = 90;
  const top = 24;
  const bottom = top + glassH;
  const baseY = bottom + 12; // pequena folga abaixo do vidro, como na Sacada Panorâmica
  const totalW = glassW + left + 56;
  const totalH = baseY + 88;
  const perfil = corPerfilSvg(corPerfil);
  const formatMm = (n: number) => Math.round(n || 0).toLocaleString("pt-BR");
  const glass = Array.from({ length: divs }, (_, i) => {
    const x = left + i * panelW;
    return `<g><rect x="${x + 1}" y="${top}" width="${panelW - 2}" height="${glassH}" fill="url(#gcGlass)" stroke="#9AAAB1" stroke-width="1.1"/>
      <path d="M${x + panelW * .18} ${top + glassH * .65} l${panelW * .38} ${-glassH * .53}" stroke="#fff" stroke-width="8" opacity=".23"/></g>`;
  }).join("");
  // Fixadores com mesma cor, tamanho e alinhamento em todas as divisões.
  const clamps = Array.from({ length: divs + 1 }, (_, i) => {
    const x = left + i * panelW;
    const ponta = i === 0 || i === divs;
    const markerY = top + 39;
    const stroke = "#9AAAB1"; // mesmo contorno do vidro
    if (ponta) {
      if (!usarGrapa3019) return "";
      const size = 11;
      const centerX = i === 0 ? x + 6 : x - 6;
      return `<g><rect x="${centerX - size / 2}" y="${markerY - size / 2}" width="${size}" height="${size}" rx="0.8" fill="#FFFFFF" stroke="${stroke}" stroke-width="1.1"/></g>`;
    }
    if (!usarGrapa1305) return "";
    const spacing = 11;
    return `<g>
      <circle cx="${x - spacing}" cy="${markerY}" r="3.2" fill="#FFFFFF" stroke="${stroke}" stroke-width="1.1"/>
      <circle cx="${x + spacing}" cy="${markerY}" r="3.2" fill="#FFFFFF" stroke="${stroke}" stroke-width="1.1"/>
    </g>`;
  }).join("");
  const towersSvg = Array.from({ length: divs }, (_, i) => Array.from({ length: towers }, (_, j) => {
    const x = left + i * panelW + panelW * (j + 1) / (towers + 1);
    return `<g><rect x="${x - 7}" y="${baseY - 48}" width="14" height="48" rx="2" fill="url(#gcMetal)" stroke="${perfil.stroke}" stroke-width=".9"/>
      <rect x="${x - 10}" y="${baseY - 2}" width="20" height="4" rx="1" fill="${perfil.fill}" stroke="${perfil.stroke}" stroke-width=".8"/></g>`;
  }).join("")).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" role="img" aria-label="Vista frontal de sacada torre com ${divs} vidros e fixações discretas" style="display:block;width:100%;height:auto;max-height:320px">
    <defs><linearGradient id="gcGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F6F8F8"/><stop offset="1" stop-color="#EAF1F3"/></linearGradient>
    <linearGradient id="gcMetal" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#F6F8F8"/><stop offset=".55" stop-color="${perfil.fill}"/><stop offset="1" stop-color="${perfil.shadow}"/></linearGradient></defs>
    ${glass}${clamps}${towersSvg}
    <g stroke="#A7B2B7" stroke-width=".8" fill="none"><line x1="${left - 25}" y1="${top}" x2="${left - 25}" y2="${bottom}"/><path d="M${left - 31} ${top}h12 M${left - 31} ${bottom}h12"/>
    <line x1="${left}" y1="${baseY + 43}" x2="${left + glassW}" y2="${baseY + 43}"/><path d="M${left} ${baseY + 37}v12 M${left + glassW} ${baseY + 37}v12"/></g>
    <text transform="translate(${left - 43} ${top + glassH / 2}) rotate(-90)" font-family="Arial,sans-serif" font-size="13" font-weight="600" text-anchor="middle" fill="#7E8C93">${formatMm(altura)} mm</text>
    <text x="${left + glassW / 2}" y="${baseY + 63}" font-family="Arial,sans-serif" font-size="14" font-weight="600" text-anchor="middle" fill="#7E8C93">${formatMm(largura)} mm</text>
  </svg>`;
};

export default function CalculoSacadaTorrePage() {
  const { regra: regraMedidaVidro } = useRegraMedidaVidro();
  const { theme } = useTheme();
  const { user, empresaId, nomeEmpresa, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const centralItemId = searchParams.get("centralItem");
  const returnTo = searchParams.get("returnTo") || "/central-impressao";

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);
  const [clientes, setClientes] = useState<ClienteSacada[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [obra, setObra] = useState("");
  const orcamentoAtivo = useClienteOrcamento({ cliente: clienteId, onCliente: setClienteId, porId: true, obra, onObra: setObra, busca: buscaCliente, onBusca: setBuscaCliente });

  const [vidros, setVidros] = useState<Vidro[]>([]);
  const [perfis, setPerfis] = useState<PerfilTabela[]>([]);
  const [ferragens, setFerragens] = useState<FerragemTabela[]>([]);
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoEspecial[]>([]);
  const [larguraVaoMm, setLarguraVaoMm] = useState("");
  const [alturaVaoMm, setAlturaVaoMm] = useState("");
  const [quantidadeVaos, setQuantidadeVaos] = useState("");
  const [quantidadeDivisoesLargura, setQuantidadeDivisoesLargura] = useState("2");
  const [quantidadeTorresPorVidro, setQuantidadeTorresPorVidro] = useState("1");
  const [buscaVidro, setBuscaVidro] = useState("");
  const [vidroId, setVidroId] = useState("");
  const [corPerfil, setCorPerfil] = useState("");
  const [torreCodigo, setTorreCodigo] = useState("");
  const [usarGrapa3019, setUsarGrapa3019] = useState(true);
  const [usarGrapa1305, setUsarGrapa1305] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const chaveDraft = useMemo(() => `${SACADA_TORRE_DRAFT_KEY}:${empresaId || "global"}`, [empresaId]);

  useEffect(() => {
    if (!empresaId) {
      setCarregando(false);
      return;
    }

    let ativo = true;
    setCarregando(true);

    Promise.all([
      supabase.from("vidros").select("id, nome, espessura, tipo, preco").eq("empresa_id", empresaId).order("nome", { ascending: true }),
      supabase.from("perfis").select("codigo, nome, cores, preco, categoria").eq("empresa_id", empresaId).order("codigo", { ascending: true }),
      supabase.from("ferragens").select("codigo, nome, cores, preco").eq("empresa_id", empresaId).order("codigo", { ascending: true }),
      supabase.from("clientes").select("id, nome, grupo_preco_id").eq("empresa_id", empresaId).order("nome", { ascending: true }),
      supabase.from("vidro_precos_grupos").select("vidro_id, grupo_preco_id, preco").eq("empresa_id", empresaId),
    ]).then(([resVidros, resPerfis, resFerragens, resClientes, resPrecos]) => {
      if (!ativo) return;
      if (resVidros.error) console.error("Erro ao carregar vidros da sacada com torre:", resVidros.error);
      if (resPerfis.error) console.error("Erro ao carregar perfis da sacada com torre:", resPerfis.error);
      if (resFerragens.error) console.error("Erro ao carregar ferragens da sacada com torre:", resFerragens.error);
      setVidros((resVidros.data || []) as Vidro[]);
      setPerfis((resPerfis.data || []) as PerfilTabela[]);
      setFerragens((resFerragens.data || []) as FerragemTabela[]);
      setClientes((resClientes.data || []) as ClienteSacada[]);
      setPrecosEspeciais((resPrecos.data || []) as PrecoEspecial[]);
      setCarregando(false);
    });

    return () => {
      ativo = false;
    };
  }, [empresaId]);

  useEffect(() => {
    if (typeof window === "undefined" || centralItemId) return;
    try {
      const bruto = window.localStorage.getItem(chaveDraft);
      if (!bruto) return;
      const draft = JSON.parse(bruto) as Partial<SacadaTorreDraft>;
      if (typeof draft.clienteId === "string") setClienteId(draft.clienteId);
      if (typeof draft.buscaCliente === "string") setBuscaCliente(draft.buscaCliente);
      if (typeof draft.obra === "string") setObra(draft.obra);
      if (typeof draft.larguraVaoMm === "string") setLarguraVaoMm(draft.larguraVaoMm);
      if (typeof draft.alturaVaoMm === "string") setAlturaVaoMm(draft.alturaVaoMm);
      if (typeof draft.quantidadeVaos === "string") setQuantidadeVaos(draft.quantidadeVaos);
      if (typeof draft.quantidadeDivisoesLargura === "string") setQuantidadeDivisoesLargura(draft.quantidadeDivisoesLargura);
      if (typeof draft.quantidadeTorresPorVidro === "string") setQuantidadeTorresPorVidro(draft.quantidadeTorresPorVidro);
      if (typeof draft.buscaVidro === "string") setBuscaVidro(draft.buscaVidro);
      if (typeof draft.vidroId === "string") setVidroId(draft.vidroId);
      if (typeof draft.corPerfil === "string") setCorPerfil(draft.corPerfil);
      if (typeof draft.torreCodigo === "string") setTorreCodigo(draft.torreCodigo);
      if (typeof draft.usarGrapa3019 === "boolean") setUsarGrapa3019(draft.usarGrapa3019);
      if (typeof draft.usarGrapa1305 === "boolean") setUsarGrapa1305(draft.usarGrapa1305);
    } catch (error) {
      console.warn("Nao foi possivel restaurar rascunho da sacada com torre:", error);
    }
  }, [centralItemId, chaveDraft]);

  useEffect(() => {
    if (typeof window === "undefined" || centralItemId) return;
    const draft: SacadaTorreDraft = {
      clienteId,
      buscaCliente,
      obra,
      larguraVaoMm,
      alturaVaoMm,
      quantidadeVaos,
      quantidadeDivisoesLargura,
      quantidadeTorresPorVidro,
      buscaVidro,
      vidroId,
      corPerfil,
      torreCodigo,
      usarGrapa3019,
      usarGrapa1305,
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
    larguraVaoMm,
    obra,
    quantidadeDivisoesLargura,
    quantidadeTorresPorVidro,
    quantidadeVaos,
    torreCodigo,
    usarGrapa3019,
    usarGrapa1305,
    vidroId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !centralItemId) return;
    try {
      const lista = JSON.parse(window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY) || "[]") as SacadaTorreCentralItem[];
      const item = lista.find((registro) => registro.id === centralItemId);
      const dados = item?.centralDados;
      if (!dados) return;
      setClienteId(dados.clienteId || "");
      setBuscaCliente(dados.buscaCliente || item?.cliente || "");
      setObra(dados.obra || "");
      setLarguraVaoMm(dados.larguraVaoMm || String(item?.largura || ""));
      setAlturaVaoMm(dados.alturaVaoMm || String(item?.altura || ""));
      setQuantidadeVaos(dados.quantidadeVaos || String(item?.quantidade || ""));
      setQuantidadeDivisoesLargura(dados.quantidadeDivisoesLargura || String(item?.pecasDivisao || "2"));
      setQuantidadeTorresPorVidro(dados.quantidadeTorresPorVidro || "1");
      setBuscaVidro(dados.buscaVidro || item?.vidro || "");
      setVidroId(dados.vidroId || "");
      setCorPerfil(dados.corPerfil || item?.corPerfil || item?.corKit || "");
      setTorreCodigo(dados.torreCodigo || "");
      setUsarGrapa3019(dados.usarGrapa3019 ?? true);
      setUsarGrapa1305(dados.usarGrapa1305 ?? true);
    } catch (error) {
      console.warn("Nao foi possivel restaurar a sacada com torre da central:", error);
    }
  }, [centralItemId]);

  const larguraNumero = normalizarNumeroInteiro(larguraVaoMm);
  const alturaNumero = normalizarNumeroInteiro(alturaVaoMm);
  const quantidadeNumero = Math.max(normalizarNumeroInteiro(quantidadeVaos), 0);
  const quantidadeDivisoesNumero = Math.max(normalizarNumeroInteiro(quantidadeDivisoesLargura), 1);
  const quantidadeTorresNumero = Math.max(normalizarNumeroInteiro(quantidadeTorresPorVidro), 0);

  const clientesFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaCliente);
    if (!termo) return clientes;
    return clientes.filter((cliente) => normalizarTexto(cliente.nome).includes(termo));
  }, [buscaCliente, clientes]);

  const clienteSelecionado = useMemo(
    () => buscaCliente.trim()
      ? localizarClientePorNome(clientes, buscaCliente)
      : clientes.find((cliente) => String(cliente.id) === String(clienteId)) || null,
    [clienteId, clientes, buscaCliente]
  );

  const vidrosFiltrados = useMemo(() => {
    const termo = normalizarBusca(buscaVidro);
    if (!termo) return vidros.slice(0, 80);
    return vidros.filter((vidro) => normalizarBusca(montarDescricaoVidro(vidro)).includes(termo)).slice(0, 80);
  }, [buscaVidro, vidros]);

  const vidroSelecionado = useMemo(
    () => vidros.find((vidro) => String(vidro.id) === String(vidroId)) || localizarVidroPorDescricao(vidros, buscaVidro, montarDescricaoVidro) || (buscaVidro.trim() ? vidrosFiltrados[0] : null) || null,
    [buscaVidro, vidroId, vidros, vidrosFiltrados]
  );

  useEffect(() => {
    if (!buscaVidro.trim() || vidrosFiltrados.length === 0) return;
    const selecionadoEstaNaLista = vidrosFiltrados.some((vidro) => String(vidro.id) === String(vidroId));
    if (!selecionadoEstaNaLista) {
      setVidroId(String(vidrosFiltrados[0].id));
    }
  }, [buscaVidro, vidroId, vidrosFiltrados]);

  const precoVidroM2Efetivo = useMemo(() => {
    if (!vidroSelecionado) return 0;
    const grupoId = clienteSelecionado?.grupo_preco_id;
    const especial = grupoId
      ? precosEspeciais.find((preco) => String(preco.vidro_id) === String(vidroSelecionado.id) && String(preco.grupo_preco_id) === String(grupoId))
      : null;
    return normalizarPrecoCatalogo(especial?.preco ?? vidroSelecionado.preco ?? 0);
  }, [clienteSelecionado?.grupo_preco_id, precosEspeciais, vidroSelecionado]);

  const torresDisponiveis = useMemo(() => {
    const encontrados = ferragens.filter((ferragem) => {
      const texto = normalizarTexto(`${ferragem.codigo} ${ferragem.nome}`);
      return texto.includes("torre") || texto.includes("inox");
    });
    if (!corPerfil) return encontrados;
    const filtradosPorCor = encontrados.filter((ferragem) => corCompativel(ferragem.cores, corPerfil));
    const padroes = encontrados.filter((ferragem) => !ferragem.cores || normalizarTexto(ferragem.cores).includes("padrao"));
    return filtradosPorCor.length ? filtradosPorCor : padroes.length ? padroes : encontrados;
  }, [corPerfil, ferragens]);

  const torreSelecionada = useMemo(() => {
    const codigo = normalizarCodigo(torreCodigo);
    const candidatos = ferragens.filter((ferragem) => normalizarCodigo(ferragem.codigo) === codigo);
    if (!candidatos.length) return null;
    return escolherItemPorCor(candidatos, corPerfil, (ferragem) => ferragem.cores);
  }, [corPerfil, ferragens, torreCodigo]);

  const grapa3019 = useMemo(() => {
    const candidatos = ferragens.filter((ferragem) => normalizarCodigo(ferragem.codigo) === "3019" || normalizarCodigo(ferragem.codigo).startsWith("3019"));
    return escolherItemPorCor(candidatos, corPerfil, (ferragem) => ferragem.cores) || null;
  }, [corPerfil, ferragens]);

  const grapa1305 = useMemo(() => {
    const candidatos = ferragens.filter((ferragem) => normalizarCodigo(ferragem.codigo) === "1305" || normalizarCodigo(ferragem.codigo).startsWith("1305"));
    return escolherItemPorCor(candidatos, corPerfil, (ferragem) => ferragem.cores) || null;
  }, [corPerfil, ferragens]);

  const resultadoCompleto = useMemo(
    () =>
      calcularSacadaTorre({
        regraMedidaVidro,
        larguraVaoMm: larguraNumero,
        alturaVaoMm: alturaNumero,
        quantidadeVaos: quantidadeNumero,
        quantidadeDivisoesLargura: quantidadeDivisoesNumero,
        quantidadeTorresPorVidro: quantidadeTorresNumero,
        precoVidroM2: precoVidroM2Efetivo,
        vidroDescricao: montarDescricaoVidro(vidroSelecionado),
        torreCodigo: torreSelecionada?.codigo || torreCodigo,
        torreNome: torreSelecionada?.nome || "Torre",
        precoTorreUnitario: normalizarPreco(torreSelecionada?.preco),
        precoGrapa3019: normalizarPreco(grapa3019?.preco),
        precoGrapa1305: normalizarPreco(grapa1305?.preco),
      }),
    [
      regraMedidaVidro,
      alturaNumero,
      grapa1305?.preco,
      grapa3019?.preco,
      larguraNumero,
      precoVidroM2Efetivo,
      quantidadeDivisoesNumero,
      quantidadeNumero,
      quantidadeTorresNumero,
      torreCodigo,
      torreSelecionada?.codigo,
      torreSelecionada?.nome,
      torreSelecionada?.preco,
      vidroSelecionado,
    ]
  );

  // Acessórios opcionais: remover também quantidade e custo do resultado,
  // sem alterar a regra de dimensionamento do motor compartilhado.
  const resultadoFiltrado = useMemo(() => {
    const excluidos = resultadoCompleto.acessorios.filter((item) =>
      (normalizarCodigo(item.codigo) === "3019" && !usarGrapa3019) ||
      (normalizarCodigo(item.codigo) === "1305" && !usarGrapa1305)
    );
    const valorRemovido = excluidos.reduce((total, item) => total + item.quantidade * item.precoUnitario, 0);
    const quantidadeRemovida = excluidos.reduce((total, item) => total + item.quantidade, 0);
    return {
      ...resultadoCompleto,
      acessorios: resultadoCompleto.acessorios.filter((item) => !excluidos.includes(item)),
      quantidadeGrapas: Math.max(0, resultadoCompleto.quantidadeGrapas - quantidadeRemovida),
      totalAcessorios: Math.max(0, resultadoCompleto.totalAcessorios - valorRemovido),
      totalGeral: Math.max(0, resultadoCompleto.totalGeral - valorRemovido),
    };
  }, [resultadoCompleto, usarGrapa3019, usarGrapa1305]);

  const resultado = useMemo(() => resultadoConformeCor(resultadoFiltrado, corPerfil), [resultadoFiltrado, corPerfil]);

  const svgSacada = useMemo(
    () =>
      gerarSvgSacadaTorre({
        largura: larguraNumero || 2000,
        altura: alturaNumero || 1000,
        divisoes: quantidadeDivisoesNumero,
        torresPorVidro: quantidadeTorresNumero,
        corPerfil,
        codigoTorre: torreSelecionada?.codigo || torreCodigo || "Torre",
        usarGrapa3019,
        usarGrapa1305,
      }),
    [alturaNumero, corPerfil, larguraNumero, quantidadeDivisoesNumero, quantidadeTorresNumero, torreCodigo, torreSelecionada?.codigo, usarGrapa3019, usarGrapa1305]
  );

  const desenhoUrl = useMemo(() => svgDataUrl(svgSacada), [svgSacada]);

  const montarMateriaisCentral = useCallback((): ProjetoIndividualMaterial[] => [
    {
      id: "vidro-sacada-torre",
      qtd: resultado.areaTotalVidro,
      unidade: "m2",
      descricao: `VIDRO ${montarDescricaoVidro(vidroSelecionado)}`.toUpperCase(),
      ...precoMaterialVidro(precoVidroM2Efetivo, `${resultado.larguraVidroMm}x${resultado.alturaVidroMm}`, regraMedidaVidro),
      medida: `${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm`,
      vidroDescricao: montarDescricaoVidro(vidroSelecionado).toUpperCase(),
    },
    ...resultado.perfis.map((perfil) => ({
      id: `perfil-${perfil.codigo}`,
      qtd: perfil.quantidadeBarras,
      unidade: "barra",
      descricao: `${perfil.codigo} - ${perfil.nome}`.toUpperCase(),
      valorUnitario: perfil.precoBarra,
      codigoPerfil: perfil.codigo,
      comprimentoBarra: 6000,
      cortes: perfil.cortes,
    })),
    ...resultado.acessorios.map((acessorio) => ({
      id: `acessorio-${acessorio.codigo}`,
      qtd: acessorio.quantidade,
      unidade: "und",
      descricao: `${acessorio.codigo} - ${
        acessorio.codigo === "3019"
          ? grapa3019?.nome || acessorio.nome
          : acessorio.codigo === "1305"
            ? grapa1305?.nome || acessorio.nome
            : torreSelecionada?.nome || acessorio.nome
      }`.toUpperCase(),
      valorUnitario: acessorio.precoUnitario,
    })),
  ], [regraMedidaVidro, grapa1305?.nome, grapa3019?.nome, precoVidroM2Efetivo, resultado, torreSelecionada?.nome, vidroSelecionado]);

  const montarItemCentral = useCallback((id?: string): SacadaTorreCentralItem => {
    const centralDados: SacadaTorreDraft = {
      clienteId,
      buscaCliente,
      obra,
      larguraVaoMm,
      alturaVaoMm,
      quantidadeVaos,
      quantidadeDivisoesLargura,
      quantidadeTorresPorVidro,
      buscaVidro,
      vidroId,
      corPerfil,
      torreCodigo,
      usarGrapa3019,
      usarGrapa1305,
    };

    return {
      id: id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      numero: "Novo Orcamento",
      projeto: "Sacada com torre",
      cliente: clienteSelecionado?.nome || buscaCliente || "",
      medidas: `${larguraNumero} x ${alturaNumero} mm`,
      largura: larguraNumero,
      altura: alturaNumero,
      quantidade: quantidadeNumero,
      modo: "Sacada com torre",
      desenhoUrl,
      vidro: montarDescricaoVidro(vidroSelecionado),
      corKit: corPerfil || "Nao selecionada",
      corPerfil: corPerfil || "Nao selecionada",
      trilho: `${quantidadeDivisoesNumero} divisao(oes)`,
      trinco: `${quantidadeTorresNumero} torre(s) por vidro | 3019: ${usarGrapa3019 ? "Sim" : "Não"} | 1305: ${usarGrapa1305 ? "Sim" : "Não"}`,
      pecasDivisao: resultado.quantidadeVidrosPorVao,
      medidasDetalhadas: `Vidro: ${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm\nDivisoes por vao: ${quantidadeDivisoesNumero}\nTorres por vidro: ${quantidadeTorresNumero}\nTorre: ${torreSelecionada?.codigo || torreCodigo || "-"}\nPontas 3019: ${usarGrapa3019 ? "Sim" : "Não"}\nEntre vidros 1305: ${usarGrapa1305 ? "Sim" : "Não"}`,
      valorTotal: resultado.totalGeral,
      materiais: montarMateriaisCentral(),
      origemRota: "/calculo/sacadatorre",
      centralDados,
    };
  }, [
    alturaNumero,
    alturaVaoMm,
    buscaCliente,
    buscaVidro,
    clienteId,
    clienteSelecionado?.nome,
    corPerfil,
    desenhoUrl,
    larguraNumero,
    larguraVaoMm,
    montarMateriaisCentral,
    obra,
    quantidadeDivisoesLargura,
    quantidadeDivisoesNumero,
    quantidadeNumero,
    quantidadeTorresNumero,
    quantidadeTorresPorVidro,
    quantidadeVaos,
    resultado,
    torreCodigo,
    usarGrapa3019,
    usarGrapa1305,
    torreSelecionada?.codigo,
    vidroId,
    vidroSelecionado,
  ]);

  const enviarParaCentralImpressao = async () => {
    try {
      const itemCentral = montarItemCentral(centralItemId || undefined);
    if (!await confirmarEnvioOrcamento([itemCentral])) return;
      const lista = JSON.parse(window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY) || "[]") as SacadaTorreCentralItem[];
      const proximaLista = centralItemId && lista.some((item) => item.id === centralItemId)
        ? lista.map((item) => item.id === centralItemId ? itemCentral : item)
        : [...lista, itemCentral];

      window.localStorage.setItem(CENTRAL_IMPRESSAO_KEY, JSON.stringify(proximaLista));
      const clienteCentral = clienteSelecionado?.nome || buscaCliente;
      if (clienteCentral) window.localStorage.setItem(CENTRAL_IMPRESSAO_CLIENTE_KEY, clienteCentral);
      if (obra) window.localStorage.setItem(CENTRAL_IMPRESSAO_OBRA_KEY, (itemCentral as { obra?: string }).obra ?? obra);
      window.localStorage.removeItem(chaveDraft);
      router.push(centralItemId ? returnTo : "/central-impressao");
    } catch (error) {
      console.warn("Nao foi possivel enviar a sacada com torre para a central:", error);
      setMensagem("Erro ao enviar para a central de impressao.");
    }
  };

  const handleSalvar = async () => {
    if (orcamentoAtivo) { enviarParaCentralImpressao(); return; }
    if (centralItemId) {
      enviarParaCentralImpressao();
      return;
    }

    if (salvando) return;
    setSalvando(true);
    setMensagem("");

    try {
      const numeroFinal = await gerarNumeroOrcamentoPadrao(supabase);
      const dadosParaSalvar = {
        numero_formatado: numeroFinal,
        cliente_nome: clienteSelecionado?.nome || buscaCliente || "Consumidor",
        obra_referencia: obra || "Geral",
        itens: {
          tipo: "sacada_torre",
          larguraVaoMm: larguraNumero,
          alturaVaoMm: alturaNumero,
          quantidadeVaos: quantidadeNumero,
          divisoesPorVao: quantidadeDivisoesNumero,
          torresPorVidro: quantidadeTorresNumero,
          corPerfil,
          vidroId,
          vidroDescricao: montarDescricaoVidro(vidroSelecionado),
          torreCodigo,
          usarGrapa3019,
          usarGrapa1305,
          resultado,
          itemCentral: montarItemCentral(),
        },
        valor_total: resultado.totalGeral,
        empresa_id: empresaId,
      };

      const { error } = await supabase.from("orcamentos").insert(dadosParaSalvar);
      if (error) throw error;

      setMensagem(`Orcamento ${numeroFinal} salvo com sucesso.`);
      window.localStorage.removeItem(chaveDraft);
    } catch (error) {
      console.error("Erro ao salvar sacada com torre:", error);
      setMensagem("Erro ao salvar a sacada com torre.");
    } finally {
      setSalvando(false);
    }
  };

  const conteudoCarregando = loading || carregando;

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

        <main className="gc-torre p-4 md:p-6 flex-1 space-y-5 w-full min-w-0">
          {conteudoCarregando ? (
            <div className="flex flex-1 items-center justify-center min-h-[60vh]">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: "transparent", borderRightColor: theme.menuIconColor, borderBottomColor: theme.menuIconColor, borderLeftColor: theme.menuIconColor }} />
            </div>
          ) : (
            <>

          <style jsx global>{`
            .gc-torre { --gc-graphite:#38444B; --gc-silver:#8F9AA1; --gc-mist:#DCE2E4; --gc-lime:#C8D463; --gc-ice:#F6F8F8; color:var(--gc-graphite); }
            .gc-torre .gc-page-title { display:flex;align-items:center;justify-content:space-between;gap:16px;padding:2px 0 4px;color:var(--gc-graphite); }
            .gc-torre .gc-page-title h1 { font-size:clamp(23px,2vw,29px);font-weight:650;letter-spacing:-.035em;line-height:1.25; }
            .gc-torre .gc-page-title p { font-size:13px;color:#6E7C83;margin-top:3px; }
            .gc-torre .gc-eyebrow { display:block;font-size:10px;letter-spacing:.1em;font-weight:650;color:var(--gc-silver);margin-bottom:5px; }
            .gc-torre .gc-toolbar,.gc-torre .gc-config,.gc-torre .gc-preview-section { background:#fff!important;border-color:var(--gc-mist)!important;box-shadow:none!important; }
            .gc-torre .gc-toolbar button { border-radius:7px!important;box-shadow:none!important;letter-spacing:.02em;text-transform:none!important;font-size:12px; }
            .gc-torre .gc-toolbar button:hover { border-color:var(--gc-lime)!important;filter:brightness(.98); }
            .gc-torre .gc-toolbar input { border-radius:7px!important; }
            .gc-torre .gc-config > div > div:first-child > div:first-child > div:first-child { border-radius:6px!important;background:#F1F3E5!important;color:var(--gc-graphite)!important; }
            .gc-torre .gc-config h1 { font-size:18px!important;letter-spacing:-.02em; }
            .gc-torre .gc-fields label { border-radius:8px!important;border-color:var(--gc-mist)!important;background:var(--gc-ice)!important;transition:border-color .15s ease; }
            .gc-torre .gc-fields label:focus-within { border-color:var(--gc-lime)!important;box-shadow:0 0 0 2px #C8D46333; }
            .gc-torre .gc-fields input,.gc-torre .gc-fields select { min-width:0; }
            .gc-torre section article { border-color:var(--gc-mist)!important;box-shadow:none!important; }
            .gc-torre section article h2 { font-size:15px!important;font-weight:650!important; }
            .gc-torre table thead { background:#F1F3F3!important; }
            .gc-torre table tbody tr:hover { background:#F5F7F0!important; }
            .gc-torre .gc-section-heading { display:flex;gap:11px;align-items:center;margin:0 0 14px;min-height:44px;color:var(--gc-graphite); }
            .gc-torre .gc-section-heading h2 { font-size:15px;font-weight:650;letter-spacing:-.015em; }
            .gc-torre .gc-section-heading p { font-size:12px;color:#78868C;margin-top:1px; }
            .gc-torre .gc-step { flex-shrink:0;border:1px solid var(--gc-mist);background:#fff;border-radius:7px;font-size:11px;font-weight:650;color:#66747A;padding:8px; }
            .gc-torre .gc-preview-section { border:1px solid var(--gc-mist);border-radius:12px;padding:18px;background:#fff; }
            .gc-torre .gc-preview-section > article { max-width:760px;width:100%;margin:14px auto 0;border:0!important;box-shadow:none!important;padding:4px!important; }
            .gc-torre .gc-materials-section > article { border:1px solid var(--gc-mist);background:#fff; }
            .gc-torre .gc-preview-section svg { display:block;width:100%;height:auto;max-height:320px;object-fit:contain;margin:0 auto; }
            .gc-torre .gc-preview-section article > div { width:100%; }
            .gc-torre .gc-preview-section article > div > div { width:100%; }
            .gc-torre button:focus-visible,.gc-torre input:focus-visible,.gc-torre select:focus-visible { outline:2px solid var(--gc-lime);outline-offset:2px; }
          `}</style>
              <div className="gc-page-title"><div><span className="gc-eyebrow">PROJETOS & CÁLCULOS / SACADAS</span><h1>Sacada Torre</h1><p>Configuração e orçamento técnico</p></div><PanelsTopLeft size={23} strokeWidth={1.5} /></div>
              <div className="gc-toolbar rounded-xl border px-3 py-3 flex flex-col md:flex-row md:items-center gap-4" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)` }}>
                <div className="flex items-center gap-2 flex-1 relative">
                  <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>Cliente:</span>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} style={{ color: theme.contentTextLightBg }} />
                    <input
                      value={buscaCliente}
                      onChange={(e) => { setBuscaCliente(e.target.value); setClienteId(""); setMostrarClientes(true); }}
                      onFocus={() => setMostrarClientes(true)}
                      placeholder="Pesquisar cliente..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none bg-transparent"
                      style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 13%, transparent)`, color: theme.contentTextLightBg }}
                    />
                    {mostrarClientes && buscaCliente && clientesFiltrados.length > 0 && (
                      <div className="absolute top-full left-0 w-full border rounded-xl shadow-xl z-50 max-h-60 overflow-auto py-1" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 13%, transparent)` }}>
                        {clientesFiltrados.map((cliente) => (
                          <button
                            key={cliente.id}
                            type="button"
                            className="block w-full px-4 py-2 text-left text-xs"
                            style={{ color: theme.contentTextLightBg }}
                            onClick={() => { setBuscaCliente(cliente.nome); setClienteId(String(cliente.id)); setMostrarClientes(false); }}
                          >
                            {cliente.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>Obra:</span>
                  <input
                    value={obra}
                    onChange={(e) => setObra(e.target.value)}
                    placeholder="Identificacao da obra"
                    className="flex-1 py-2 px-3 rounded-xl border text-sm outline-none bg-transparent"
                    style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 13%, transparent)`, color: theme.contentTextLightBg }}
                  />
                </div>

                <button
                  onClick={() => {
                    setLarguraVaoMm("");
                    setAlturaVaoMm("");
                    setQuantidadeVaos("");
                    setQuantidadeDivisoesLargura("2");
                    setQuantidadeTorresPorVidro("1");
                    setVidroId("");
                    setBuscaVidro("");
                    setTorreCodigo("");
                    setUsarGrapa3019(true);
                    setUsarGrapa1305(true);
                    setMensagem("");
                    window.localStorage.removeItem(chaveDraft);
                  }}
                  className="px-5 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider border shadow-sm"
                  style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 19%, transparent)`, color: theme.contentTextLightBg }}
                >
                  Novo
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{ backgroundColor: "#F1F3E5", color: "#38444B", border: "1px solid #DCE2E4" }}
                >
                  {salvando ? <div className="w-4 h-4 border-2 border-border border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                  Salvar
                </button>
                <button
                  onClick={enviarParaCentralImpressao}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider border shadow-sm"
                  style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 19%, transparent)`, color: theme.contentTextLightBg }}
                >
                  <FilePlus2 size={16} />
                  PDF+
                </button>
                <PDFDownloadLink
                  document={
                    <SacadaTorrePDF
                      avisosMedida={avisosAcrescimoVidro({ materiais: montarMateriaisCentral() })}
                      nomeEmpresa={nomeEmpresa}
                      logoUrl={theme.logoLightUrl || undefined}
                      tituloDocumento="Orcamento Sacada com Torre"
                      numeroOrcamento="Previa"
                      nomeCliente={clienteSelecionado?.nome || buscaCliente || "Consumidor"}
                      nomeObra={obra || "Geral"}
                      larguraVaoMm={larguraNumero}
                      alturaVaoMm={alturaNumero}
                      quantidadeVaos={quantidadeNumero}
                      divisoesPorVao={quantidadeDivisoesNumero}
                      torresPorVidro={quantidadeTorresNumero}
                      corPerfil={corPerfil || "Nao selecionada"}
                      vidroDescricao={montarDescricaoVidro(vidroSelecionado)}
                      torreDescricao={torreSelecionada ? `${torreSelecionada.codigo} - ${torreSelecionada.nome}` : "Nao selecionada"}
                      medidaVidro={`${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm`}
                      areaTotal={resultado.areaTotalVidro}
                      totalVidro={resultado.totalVidro}
                      totalAcessorios={resultado.totalAcessorios}
                      totalGeral={resultado.totalGeral}
                      materiais={montarMateriaisCentral()}
                      desenhoUrl={desenhoUrl}
                    />
                  }
                  fileName={`Sacada com Torre ${clienteSelecionado?.nome || buscaCliente || "Geral"} - ${Date.now().toString().slice(-6)}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <button
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider border shadow-sm"
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

              {mensagem && (
                <span className={`inline-flex text-xs font-medium px-3 py-1 rounded-full ${mensagem.includes("Erro") ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
                  {mensagem}
                </span>
              )}

              <section className="gc-config rounded-xl border p-4 md:p-5" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)` }}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]" style={{ backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 6%, transparent)`, color: theme.menuIconColor }}>
                        <PanelsTopLeft size={14} />
                        Sacada com Torre
                      </div>
                      <h1 className="mt-2 text-xl md:text-2xl font-medium leading-tight" style={{ color: theme.contentTextLightBg }}>
                        01 · Configuração do projeto
                      </h1>
                    </div>
                    <p className="max-w-2xl text-xs md:text-sm" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 60%, transparent)` }}>
                      Informe medidas, divisões, torres por vidro e a torre cadastrada. O desenho e a relação de materiais atualizam automaticamente.
                    </p>
                  </div>

                  <div className="gc-fields grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
                    {[
                      ["Largura do vao (mm)", larguraVaoMm, setLarguraVaoMm],
                      ["Altura do vao (mm)", alturaVaoMm, setAlturaVaoMm],
                      ["Quantidade de vaos", quantidadeVaos, setQuantidadeVaos],
                      ["Quantas divisoes", quantidadeDivisoesLargura, setQuantidadeDivisoesLargura],
                      ["Torres por vidro", quantidadeTorresPorVidro, setQuantidadeTorresPorVidro],
                    ].map(([label, value, setter]) => (
                      <label key={String(label)} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                        <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                          {String(label)}
                        </span>
                        <input
                          value={String(value)}
                          onChange={(e) => (setter as (valor: string) => void)(e.target.value)}
                          inputMode="numeric"
                          className="mt-1.5 w-full bg-transparent text-lg font-medium outline-none"
                          style={{ color: theme.contentTextLightBg }}
                        />
                      </label>
                    ))}

                    <label className="rounded-2xl border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                        Cor dos perfis
                      </span>
                      <select
                        value={corPerfil}
                        onChange={(e) => setCorPerfil(e.target.value)}
                        className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        <option value="">Escolher cor</option>
                        {CORES_PERFIL.map((cor) => (
                          <option key={cor} value={cor} className="text-text-primary">{cor}</option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-2xl border px-3 py-2.5 sm:col-span-2 lg:col-span-1" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                        Cor do vidro
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
                        {vidrosFiltrados.map((vidro) => (
                          <option key={vidro.id} value={vidro.id} className="text-text-primary">
                            {montarDescricaoVidro(vidro)} - {formatarPreco(normalizarPrecoCatalogo((clienteSelecionado?.grupo_preco_id ? precosEspeciais.find(preco => String(preco.vidro_id) === String(vidro.id) && String(preco.grupo_preco_id) === String(clienteSelecionado.grupo_preco_id))?.preco : null) ?? vidro.preco ?? 0))}/m2
                          </option>
                        ))}
                      </select>
                      {vidroSelecionado && <span className="mt-2 block text-xs text-text-secondary">
                        Valor aplicado: {formatarPreco(precoVidroM2Efetivo)}/m² · {clienteSelecionado?.grupo_preco_id && precosEspeciais.some(p => String(p.vidro_id) === String(vidroSelecionado.id) && String(p.grupo_preco_id) === String(clienteSelecionado.grupo_preco_id) && p.preco != null) ? "Tabela do cliente" : "Preço padrão cadastrado"}
                      </span>}

                    </label>

                    <label className="rounded-2xl border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 7%, transparent)`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 50%, transparent)` }}>
                        Qual torre
                      </span>
                      <select
                        value={torreCodigo}
                        onChange={(e) => setTorreCodigo(e.target.value)}
                        className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        <option value="" className="text-text-primary">Selecione a torre</option>
                        {torresDisponiveis.map((perfil, index) => (
                          <option key={`${perfil.codigo}-${index}`} value={perfil.codigo} className="text-text-primary">
                            {perfil.codigo} - {perfil.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    {([
                      { label: "Grapas laterais 3019", descricao: "Quadradinhos nas extremidades do vidro", ativo: usarGrapa3019, alterar: setUsarGrapa3019 },
                      { label: "Fixação vidro/vidro 1305", descricao: "Bolinhas nas uniões entre os vidros", ativo: usarGrapa1305, alterar: setUsarGrapa1305 },
                    ] as const).map((opcao) => (
                      <fieldset key={opcao.label} className="min-w-0 rounded-lg border px-3 py-2.5" style={{ borderColor: "#DCE2E4", backgroundColor: "#F6F8F8" }}>
                        <legend className="px-1 text-xs font-semibold" style={{ color: "#38444B" }}>{opcao.label}</legend>
                        <p className="mb-1 text-[11px] leading-tight" style={{ color: "#78868C" }}>{opcao.descricao}</p>
                        <div className="flex gap-3 text-sm" style={{ color: "#38444B" }}>
                          <label className="flex items-center gap-2"><input type="radio" name={opcao.label} checked={opcao.ativo} onChange={() => opcao.alterar(true)} /> Sim</label>
                          <label className="flex items-center gap-2"><input type="radio" name={opcao.label} checked={!opcao.ativo} onChange={() => opcao.alterar(false)} /> Não</label>
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </div>
              </section>

              <section className="gc-preview-section">
                <div className="gc-section-heading"><span className="gc-step">02</span><div><h2>Vista frontal do projeto</h2><p>Representação proporcional, atualizada conforme as medidas e divisões informadas.</p></div></div>
                <article className="rounded-xl border p-4 shadow-none" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                  <h2 className="text-lg font-medium" style={{ color: theme.contentTextLightBg }}>Vista frontal</h2>
                  <p className="mt-1 text-sm" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 60%, transparent)` }}>Representação proporcional do vão</p>
                  <div className="mt-4 w-full p-2">
                    <div className="w-full" dangerouslySetInnerHTML={{ __html: svgSacada }} />
                  </div>
                  <p className="mt-2 text-center text-xs" style={{ color: "#8F9AA1" }}>
                    Vão: {formatarNumero(larguraNumero, 0)} × {formatarNumero(alturaNumero, 0)} mm · {quantidadeDivisoesNumero} {quantidadeDivisoesNumero === 1 ? "peça" : "peças"} por vão · {quantidadeTorresNumero} {quantidadeTorresNumero === 1 ? "torre" : "torres"} por vidro
                  </p>
                </article>
              </section>
              <div className="gc-section-heading"><span className="gc-step">03</span><div><h2>Resultado do cálculo</h2><p>Medidas e valores calculados automaticamente.</p></div></div>
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  { titulo: "Medida de cada vidro", valor: `${formatarNumero(resultado.larguraVidroMm, 0)} x ${formatarNumero(resultado.alturaVidroMm, 0)} mm`, detalhe: `${resultado.quantidadeVidrosPorVao} vidros por vao`, icone: Ruler },
                  { titulo: "Area total de vidro", valor: `${formatarNumero(resultado.areaTotalVidro)} m2`, detalhe: resultado.vidroTipo, icone: SquareStack },
                  { titulo: "Torres / grapas", valor: `${resultado.quantidadeTotalTorres} / ${resultado.quantidadeGrapas}`, detalhe: `3019: ${usarGrapa3019 ? "Sim" : "Não"} · 1305: ${usarGrapa1305 ? "Sim" : "Não"}`, icone: Package2 },
                  { titulo: "Total geral", valor: formatarPreco(resultado.totalGeral), detalhe: "Vidro, torre e grapa", icone: Calculator },
                ].map((card) => (
                  <article key={card.titulo} className="rounded-2xl border px-3 py-2.5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 44%, transparent)` }}>{card.titulo}</p>
                        <p className="mt-2 text-xl font-medium leading-tight" style={{ color: theme.contentTextLightBg }}>{card.valor}</p>
                        <p className="mt-1 text-xs" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 64%, transparent)` }}>{card.detalhe}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 8%, transparent)`, color: theme.menuIconColor }}>
                        <card.icone size={19} />
                      </div>
                    </div>
                  </article>
                ))}
              </section>
              <div className="gc-section-heading"><span className="gc-step">04</span><div><h2>Materiais e resumo técnico</h2><p>Torres, grapas e composição do orçamento.</p></div></div>
              <section className="gc-materials-section">
                <article className="rounded-xl border shadow-none overflow-hidden" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: `color-mix(in srgb, ${theme.contentTextLightBg} 6%, transparent)` }}>
                    <h2 className="text-lg font-medium" style={{ color: theme.contentTextLightBg }}>Relacao de materiais</h2>
                    <p className="mt-1 text-xs" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 60%, transparent)` }}>Torres e fixadores conforme as opções selecionadas.</p>
                  </div>

                  <div className="overflow-x-auto">
                    {resultado.totalVidro > 0 && <AvisoAcrescimoVidro regra={regraMedidaVidro} medidas={[{ largura: resultado.larguraVidroMm, altura: resultado.alturaVidroMm }]} />}
                  <table className="w-full min-w-170 text-sm">
                      <thead style={{ backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 6%, transparent)`, color: theme.contentTextLightBg }}>
                        <tr>
                          <th className="text-left px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Item</th>
                          <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Qtd</th>
                          <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Un.</th>
                          <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Valor unit.</th>
                          <th className="text-right px-5 py-3 font-medium uppercase tracking-[0.12em] text-[10px]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {montarMateriaisCentral().map((material, index) => (
                          <tr key={`${material.id}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `color-mix(in srgb, ${theme.screenBackgroundColor} 65%, transparent)` }}>
                            <td className="px-5 py-3" style={{ color: theme.contentTextLightBg }}>{material.descricao}</td>
                            <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>{formatarNumero(Number(material.qtd || 0), material.unidade === "barra" || material.unidade === "und" ? 0 : 3)}</td>
                            <td className="px-5 py-3 text-right" style={{ color: `color-mix(in srgb, ${theme.contentTextLightBg} 70%, transparent)` }}>{material.unidade}</td>
                            <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>{formatarPreco(Number(material.valorUnitario || 0))}</td>
                            <td className="px-5 py-3 text-right font-medium" style={{ color: theme.contentTextLightBg }}>{formatarPreco(Number(material.qtd || 0) * Number(material.valorUnitario || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
