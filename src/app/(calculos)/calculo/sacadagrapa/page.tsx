"use client";

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
import { calcularSacadaGrapa } from "@/utils/sacada-grapa-calc";
import { escolherItemPorCor } from "@/utils/catalogo-cor";
import type { CentralImpressaoItem } from "@/app/relatorios/centralimpressao/CentralImpressaoPDF";
import { SacadaGrapaPDF } from "@/app/relatorios/sacadagrapa/SacadaGrapaPDF";
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

type SacadaGrapaDraft = {
  clienteId: string;
  buscaCliente: string;
  obra: string;
  larguraVaoMm: string;
  alturaVaoMm: string;
  quantidadeVaos: string;
  quantidadeDivisoesLargura: string;
  grapasLateraisPorVao: string;
  grapasInferioresPorVao: string;
  grapas1305PorUniao: string;
  tuboPosicao: "sem" | "em-cima" | "entre-meios" | "em-cima-e-entre-meios";
  tuboCodigo: string;
  buscaVidro: string;
  vidroId: string;
  corPerfil: string;
};

type SacadaGrapaCentralItem = CentralImpressaoItem & {
  origemRota?: string;
  corPerfil?: string;
  centralDados?: SacadaGrapaDraft;
};

const CORES_PERFIL = ["Branco", "Preto", "Fosco", "Inox"];
const TUBO_POSICOES = [
  { valor: "sem", label: "Sem tubo" },
  { valor: "em-cima", label: "Tubo na largura" },
  { valor: "entre-meios", label: "Tubo no meio" },
  { valor: "em-cima-e-entre-meios", label: "Largura + meio" },
] as const;
const SACADA_GRAPA_DRAFT_KEY = "sacada-grapa-draft";
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

const corPerfilSvg = () => {
  return { fill: "#eef2f5", stroke: "#aeb9c3", shadow: "#d9e0e6" };
};

const posicaoVerticalGrapa = (index: number, total: number, glassY: number, glassH: number, alturaGrapa: number) => {
  if (total <= 1) return glassY + glassH * 0.16 - alturaGrapa / 2;
  const inicio = glassY + glassH * 0.14;
  const fim = glassY + glassH * 0.86;
  return inicio + ((fim - inicio) * index) / (total - 1) - alturaGrapa / 2;
};

const gerarSvgsacadagrapa = ({
  largura,
  altura,
  divisoes,
  grapasLaterais,
  grapasInferiores,
  grapas1305PorUniao,
  tuboPosicao,
  corPerfil,
}: {
  largura: number;
  altura: number;
  divisoes: number;
  grapasLaterais: number;
  grapasInferiores: number;
  grapas1305PorUniao: number;
  tuboPosicao: "sem" | "em-cima" | "entre-meios" | "em-cima-e-entre-meios";
  corPerfil?: string;
}) => {
  const svgW = 900;
  const pad = 44;
  const labelPad = 24;
  const drawW = svgW - pad * 2;
  const ratio = Math.min(Math.max((altura || 1000) / (largura || 2000), 0.36), 0.82);
  const drawH = Math.round(drawW * ratio);
  const svgH = drawH + pad * 2 + labelPad;
  const x0 = pad;
  const y0 = pad;
  const rail = 12;
  const side = 10;
  const divs = Math.max(Math.floor(divisoes || 1), 1);
  const laterais = Math.max(Math.floor(grapasLaterais || 0), 0);
  const inferiores = Math.max(Math.floor(grapasInferiores || 0), 0);
  const grapasPorUniao = Math.max(Math.floor(grapas1305PorUniao || 0), 0);
  const panelW = (drawW - side * 2) / divs;
  const glassY = y0 + rail;
  const glassH = drawH - rail * 2;
  const profile = corPerfilSvg();
  const tubo = { fill: "#8b949e", stroke: "#58616b" };
  const temTuboEmCima = tuboPosicao === "em-cima" || tuboPosicao === "em-cima-e-entre-meios";
  const temTuboNoMeio = tuboPosicao === "entre-meios" || tuboPosicao === "em-cima-e-entre-meios";

  const divisionLines = Array.from({ length: Math.max(divs - 1, 0) }, (_, index) => {
    const x = x0 + side + panelW * (index + 1);
    return `<line x1="${x}" y1="${y0 + rail}" x2="${x}" y2="${y0 + drawH - rail}" stroke="#293442" stroke-width="1.2" opacity="0.75" />`;
  }).join("");

  const grapasLateraisSvg = Array.from({ length: laterais }, (_, index) => {
    const y = posicaoVerticalGrapa(index, laterais, glassY, glassH, 30);
    return `<g>
      <rect x="${x0 + 1}" y="${y}" width="20" height="30" rx="2" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
      <rect x="${x0 + drawW - 21}" y="${y}" width="20" height="30" rx="2" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
    </g>`;
  }).join("");

  const grapasInferioresSvg = Array.from({ length: divs }, (_, painelIndex) => {
    const painelX = x0 + side + panelW * painelIndex;
    return Array.from({ length: inferiores }, (_, index) => {
      const x = painelX + ((index + 1) / (inferiores + 1)) * panelW - 12;
      const y = y0 + drawH - rail - 3;
      return `<rect x="${x}" y="${y}" width="24" height="26" rx="2" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>`;
    }).join("");
  }).join("");

  const grapas1305Svg = temTuboNoMeio ? "" : Array.from({ length: Math.max(divs - 1, 0) }, (_, uniaoIndex) => {
    const x = x0 + side + panelW * (uniaoIndex + 1) - 18;
    return Array.from({ length: grapasPorUniao }, (_, index) => {
      const y = posicaoVerticalGrapa(index, grapasPorUniao, glassY, glassH, 28);
      return `<g>
        <rect x="${x}" y="${y}" width="36" height="28" rx="2" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
        ${index === 0 ? `<text x="${x + 42}" y="${y + 18}" font-family="Segoe UI, Arial" font-size="10" fill="#0f2742">1305</text>` : ""}
      </g>`;
    }).join("");
  }).join("");

  const tubosEmCimaSvg = temTuboEmCima
    ? `<rect x="${x0 - 3}" y="${y0 - 17}" width="${drawW + 6}" height="20" rx="2" fill="${tubo.fill}" stroke="${tubo.stroke}" stroke-width="1.2"/>
       <text x="${x0 + drawW / 2}" y="${y0 - 24}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="11" fill="#0f2742">TUBO NA LARGURA</text>`
    : "";

  const tubosMeioSvg = temTuboNoMeio
    ? Array.from({ length: Math.max(divs - 1, 0) }, (_, uniaoIndex) => {
      const tuboW = 18;
      const x = x0 + side + panelW * (uniaoIndex + 1) - tuboW / 2;
      const grapasNosLados = Array.from({ length: laterais }, (_, index) => {
        const y = posicaoVerticalGrapa(index, laterais, glassY, glassH, 24);
        return `<g>
          <rect x="${x - 24}" y="${y}" width="20" height="24" rx="2" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
          <rect x="${x + tuboW + 4}" y="${y}" width="20" height="24" rx="2" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
        </g>`;
      }).join("");
      return `<g>
        <rect x="${x}" y="${glassY}" width="${tuboW}" height="${glassH}" rx="2" fill="${tubo.fill}" stroke="${tubo.stroke}" stroke-width="1.2"/>
        ${grapasNosLados}
      </g>`;
    }).join("")
    : "";

  const tubosSvg = `${tubosEmCimaSvg}${tubosMeioSvg}`;

  const panels = Array.from({ length: divs }, (_, index) => {
    const x = x0 + side + panelW * index;
    return `<g>
      <rect x="${x}" y="${glassY}" width="${panelW}" height="${glassH}" fill="url(#glassGrad)" stroke="#9db7c7" stroke-width="0.8"/>
      <path d="M ${x + panelW * 0.1} ${glassY + glassH * 0.92} L ${x + panelW * 0.72} ${glassY + glassH * 0.12}" stroke="#ffffff" stroke-width="7" opacity="0.13"/>
      <path d="M ${x + panelW * 0.34} ${glassY + glassH * 0.86} L ${x + panelW * 0.9} ${glassY + glassH * 0.16}" stroke="#ffffff" stroke-width="4" opacity="0.16"/>
    </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}">
    <defs>
      <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef8ff"/>
        <stop offset="55%" stop-color="#dceff8"/>
        <stop offset="100%" stop-color="#f8fcff"/>
      </linearGradient>
      <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="45%" stop-color="${profile.fill}"/>
        <stop offset="100%" stop-color="${profile.shadow}"/>
      </linearGradient>
      <filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.16"/>
      </filter>
    </defs>
    <rect x="${x0}" y="${y0}" width="${drawW}" height="${drawH}" fill="#ffffff" stroke="#d8e0e8" stroke-width="1"/>
    ${panels}
    <rect x="${x0}" y="${y0}" width="${drawW}" height="${rail}" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
    <rect x="${x0}" y="${y0 + drawH - rail}" width="${drawW}" height="${rail}" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
    <rect x="${x0}" y="${y0}" width="${side}" height="${drawH}" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
    <rect x="${x0 + drawW - side}" y="${y0}" width="${side}" height="${drawH}" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
    ${divisionLines}
    ${tubosSvg}
    <g filter="url(#softShadow)">${grapasLateraisSvg}${grapasInferioresSvg}${grapas1305Svg}</g>
    <line x1="${x0}" y1="${y0 + drawH + 18}" x2="${x0 + drawW}" y2="${y0 + drawH + 18}" stroke="#1d7ed6" stroke-width="1"/>
    <text x="${x0 + drawW / 2}" y="${y0 + drawH + 38}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="13" font-weight="600" fill="#0f2742">${Math.round(largura || 0)} mm</text>
    <line x1="${x0 - 18}" y1="${y0}" x2="${x0 - 18}" y2="${y0 + drawH}" stroke="#1d7ed6" stroke-width="1"/>
    <text x="${x0 - 30}" y="${y0 + drawH / 2}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="13" font-weight="600" fill="#0f2742" transform="rotate(-90 ${x0 - 30} ${y0 + drawH / 2})">${Math.round(altura || 0)} mm</text>
  </svg>`;
};

export default function CalculosacadagrapaPage() {
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
  const [vidros, setVidros] = useState<Vidro[]>([]);
  const [perfis, setPerfis] = useState<PerfilTabela[]>([]);
  const [ferragens, setFerragens] = useState<FerragemTabela[]>([]);
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoEspecial[]>([]);
  const [larguraVaoMm, setLarguraVaoMm] = useState("");
  const [alturaVaoMm, setAlturaVaoMm] = useState("");
  const [quantidadeVaos, setQuantidadeVaos] = useState("");
  const [quantidadeDivisoesLargura, setQuantidadeDivisoesLargura] = useState("2");
  const [grapasLateraisPorVao, setGrapasLateraisPorVao] = useState("2");
  const [grapasInferioresPorVao, setGrapasInferioresPorVao] = useState("0");
  const [grapas1305PorUniao, setGrapas1305PorUniao] = useState("1");
  const [tuboPosicao, setTuboPosicao] = useState<"sem" | "em-cima" | "entre-meios" | "em-cima-e-entre-meios">("sem");
  const [tuboCodigo, setTuboCodigo] = useState("");
  const [buscaVidro, setBuscaVidro] = useState("");
  const [vidroId, setVidroId] = useState("");
  const [corPerfil, setCorPerfil] = useState("Branco");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const chaveDraft = useMemo(() => `${SACADA_GRAPA_DRAFT_KEY}:${empresaId || "global"}`, [empresaId]);

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
      if (resVidros.error) console.error("Erro ao carregar vidros da Sacada com Grapa:", resVidros.error);
      if (resPerfis.error) console.error("Erro ao carregar perfis da Sacada com Grapa:", resPerfis.error);
      if (resFerragens.error) console.error("Erro ao carregar ferragens da Sacada com Grapa:", resFerragens.error);
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
      const draft = JSON.parse(bruto) as Partial<SacadaGrapaDraft>;
      if (typeof draft.clienteId === "string") setClienteId(draft.clienteId);
      if (typeof draft.buscaCliente === "string") setBuscaCliente(draft.buscaCliente);
      if (typeof draft.obra === "string") setObra(draft.obra);
      if (typeof draft.larguraVaoMm === "string") setLarguraVaoMm(draft.larguraVaoMm);
      if (typeof draft.alturaVaoMm === "string") setAlturaVaoMm(draft.alturaVaoMm);
      if (typeof draft.quantidadeVaos === "string") setQuantidadeVaos(draft.quantidadeVaos);
      if (typeof draft.quantidadeDivisoesLargura === "string") setQuantidadeDivisoesLargura(draft.quantidadeDivisoesLargura);
      if (typeof draft.grapasLateraisPorVao === "string") setGrapasLateraisPorVao(draft.grapasLateraisPorVao);
      if (typeof draft.grapasInferioresPorVao === "string") setGrapasInferioresPorVao(draft.grapasInferioresPorVao);
      if (typeof draft.grapas1305PorUniao === "string") setGrapas1305PorUniao(draft.grapas1305PorUniao);
      if (draft.tuboPosicao) setTuboPosicao(draft.tuboPosicao);
      if (typeof draft.tuboCodigo === "string") setTuboCodigo(draft.tuboCodigo);
      if (typeof draft.buscaVidro === "string") setBuscaVidro(draft.buscaVidro);
      if (typeof draft.vidroId === "string") setVidroId(draft.vidroId);
      if (typeof draft.corPerfil === "string") setCorPerfil(draft.corPerfil);
    } catch (error) {
      console.warn("Nao foi possivel restaurar rascunho da Sacada com Grapa:", error);
    }
  }, [centralItemId, chaveDraft]);

  useEffect(() => {
    if (typeof window === "undefined" || centralItemId) return;
    const draft: SacadaGrapaDraft = {
      clienteId,
      buscaCliente,
      obra,
      larguraVaoMm,
      alturaVaoMm,
      quantidadeVaos,
      quantidadeDivisoesLargura,
      grapasLateraisPorVao,
      grapasInferioresPorVao,
      grapas1305PorUniao,
      tuboPosicao,
      tuboCodigo,
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
    larguraVaoMm,
    obra,
    quantidadeDivisoesLargura,
    grapasLateraisPorVao,
    grapasInferioresPorVao,
    grapas1305PorUniao,
    quantidadeVaos,
    tuboPosicao,
    tuboCodigo,
    vidroId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !centralItemId) return;
    try {
      const lista = JSON.parse(window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY) || "[]") as SacadaGrapaCentralItem[];
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
      setGrapasLateraisPorVao(dados.grapasLateraisPorVao || "2");
      setGrapasInferioresPorVao(dados.grapasInferioresPorVao || "0");
      setGrapas1305PorUniao(dados.grapas1305PorUniao || "1");
      setTuboPosicao(dados.tuboPosicao || "sem");
      setTuboCodigo(dados.tuboCodigo || "");
      setBuscaVidro(dados.buscaVidro || item?.vidro || "");
      setVidroId(dados.vidroId || "");
      setCorPerfil(dados.corPerfil || item?.corPerfil || item?.corKit || "Branco");
    } catch (error) {
      console.warn("Nao foi possivel restaurar a Sacada com Grapa da central:", error);
    }
  }, [centralItemId]);

  const larguraNumero = normalizarNumeroInteiro(larguraVaoMm);
  const alturaNumero = normalizarNumeroInteiro(alturaVaoMm);
  const quantidadeNumero = Math.max(normalizarNumeroInteiro(quantidadeVaos), 0);
  const quantidadeDivisoesNumero = Math.max(normalizarNumeroInteiro(quantidadeDivisoesLargura), 1);
  const grapasLateraisNumero = Math.max(normalizarNumeroInteiro(grapasLateraisPorVao), 0);
  const grapasInferioresNumero = Math.max(normalizarNumeroInteiro(grapasInferioresPorVao), 0);
  const grapas1305PorUniaoNumero = Math.max(normalizarNumeroInteiro(grapas1305PorUniao), 0);

  const clientesFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaCliente);
    if (!termo) return clientes;
    return clientes.filter((cliente) => normalizarTexto(cliente.nome).includes(termo));
  }, [buscaCliente, clientes]);

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => String(cliente.id) === String(clienteId)) || null,
    [clienteId, clientes]
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

  const tubosDisponiveis = useMemo(() => {
    const encontrados = perfis.filter((perfil) => {
      const texto = normalizarTexto(`${perfil.codigo} ${perfil.nome} ${perfil.categoria}`);
      return texto.includes("tubo");
    });
    if (!corPerfil) return encontrados;
    const filtradosPorCor = encontrados.filter((perfil) => corCompativel(perfil.cores, corPerfil));
    const padroes = encontrados.filter((perfil) => !perfil.cores || normalizarTexto(perfil.cores).includes("padrao"));
    return filtradosPorCor.length ? filtradosPorCor : padroes.length ? padroes : encontrados;
  }, [corPerfil, perfis]);

  const tuboSelecionado = useMemo(() => {
    const codigo = normalizarCodigo(tuboCodigo);
    const candidatos = perfis.filter((perfil) => normalizarCodigo(perfil.codigo) === codigo);
    if (!candidatos.length) return null;
    return escolherItemPorCor(candidatos, corPerfil, (perfil) => perfil.cores);
  }, [corPerfil, perfis, tuboCodigo]);

  const grapa3019 = useMemo(() => {
    const candidatos = ferragens.filter((ferragem) => normalizarCodigo(ferragem.codigo) === "3019" || normalizarCodigo(ferragem.codigo).startsWith("3019"));
    return escolherItemPorCor(candidatos, corPerfil, (ferragem) => ferragem.cores) || null;
  }, [corPerfil, ferragens]);

  const grapa1305 = useMemo(() => {
    const candidatos = ferragens.filter((ferragem) => normalizarCodigo(ferragem.codigo) === "1305" || normalizarCodigo(ferragem.codigo).startsWith("1305"));
    return escolherItemPorCor(candidatos, corPerfil, (ferragem) => ferragem.cores) || null;
  }, [corPerfil, ferragens]);

  const resultado = useMemo(
    () =>
      calcularSacadaGrapa({
        larguraVaoMm: larguraNumero,
        alturaVaoMm: alturaNumero,
        quantidadeVaos: quantidadeNumero,
        quantidadeDivisoesLargura: quantidadeDivisoesNumero,
        grapasLateraisPorVao: grapasLateraisNumero,
        grapasInferioresPorVao: grapasInferioresNumero,
        grapas1305PorUniao: grapas1305PorUniaoNumero,
        tuboPosicao,
        precoVidroM2: precoVidroM2Efetivo,
        vidroDescricao: montarDescricaoVidro(vidroSelecionado),
        tuboCodigo: tuboSelecionado?.codigo || tuboCodigo,
        tuboNome: tuboSelecionado?.nome || "Tubo",
        precoTuboBarra: normalizarPreco(tuboSelecionado?.preco),
        precoGrapa3019: normalizarPreco(grapa3019?.preco),
        precoGrapa1305: normalizarPreco(grapa1305?.preco),
      }),
    [
      alturaNumero,
      grapa1305?.preco,
      grapa3019?.preco,
      larguraNumero,
      precoVidroM2Efetivo,
      grapas1305PorUniaoNumero,
      grapasInferioresNumero,
      grapasLateraisNumero,
      quantidadeDivisoesNumero,
      quantidadeNumero,
      tuboPosicao,
      tuboCodigo,
      tuboSelecionado?.codigo,
      tuboSelecionado?.nome,
      tuboSelecionado?.preco,
      vidroSelecionado,
    ]
  );

  const svgSacada = useMemo(
    () =>
      gerarSvgsacadagrapa({
        largura: larguraNumero || 2000,
        altura: alturaNumero || 1000,
        divisoes: quantidadeDivisoesNumero,
        grapasLaterais: grapasLateraisNumero,
        grapasInferiores: grapasInferioresNumero,
        grapas1305PorUniao: grapas1305PorUniaoNumero,
        tuboPosicao,
        corPerfil,
      }),
    [alturaNumero, corPerfil, grapas1305PorUniaoNumero, grapasInferioresNumero, grapasLateraisNumero, larguraNumero, quantidadeDivisoesNumero, tuboPosicao]
  );

  const desenhoUrl = useMemo(() => svgDataUrl(svgSacada), [svgSacada]);

  const montarMateriaisCentral = useCallback((): ProjetoIndividualMaterial[] => [
    {
      id: "vidro-sacada-grapa",
      qtd: resultado.areaTotalVidro,
      unidade: "m2",
      descricao: `VIDRO ${montarDescricaoVidro(vidroSelecionado)}`.toUpperCase(),
      valorUnitario: precoVidroM2Efetivo,
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
    ...resultado.acessorios.filter((acessorio) => acessorio.quantidade > 0).map((acessorio) => ({
      id: `acessorio-${acessorio.codigo}`,
      qtd: acessorio.quantidade,
      unidade: "und",
      descricao: `${acessorio.codigo} - ${
        acessorio.codigo === "3019"
          ? grapa3019?.nome || acessorio.nome
          : acessorio.codigo === "1305"
            ? grapa1305?.nome || acessorio.nome
            : acessorio.nome
      }`.toUpperCase(),
      valorUnitario: acessorio.precoUnitario,
    })),
  ], [grapa1305?.nome, grapa3019?.nome, precoVidroM2Efetivo, resultado, vidroSelecionado]);

  const montarItemCentral = useCallback((id?: string): SacadaGrapaCentralItem => {
    const centralDados: SacadaGrapaDraft = {
      clienteId,
      buscaCliente,
      obra,
      larguraVaoMm,
      alturaVaoMm,
      quantidadeVaos,
      quantidadeDivisoesLargura,
      grapasLateraisPorVao,
      grapasInferioresPorVao,
      grapas1305PorUniao,
      tuboPosicao,
      tuboCodigo,
      buscaVidro,
      vidroId,
      corPerfil,
    };

    return {
      id: id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      numero: "Novo Orcamento",
      projeto: "Sacada com Grapa",
      cliente: clienteSelecionado?.nome || buscaCliente || "",
      medidas: `${larguraNumero} x ${alturaNumero} mm`,
      largura: larguraNumero,
      altura: alturaNumero,
      quantidade: quantidadeNumero,
      modo: "",
      desenhoUrl,
      vidro: montarDescricaoVidro(vidroSelecionado),
      corKit: corPerfil || "Nao selecionada",
      corPerfil: corPerfil || "Nao selecionada",
      trilho: "",
      puxador: "",
      trinco: "",
      pecasDivisao: resultado.quantidadeVidrosPorVao,
      medidasDetalhadas: `Vidro: ${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm\nDivisoes por vao: ${quantidadeDivisoesNumero}\nGrapas laterais por vao: ${grapasLateraisNumero}\nGrapas embaixo por vidro: ${grapasInferioresNumero}\n1305 por uniao: ${tuboPosicao === "entre-meios" || tuboPosicao === "em-cima-e-entre-meios" ? 0 : grapas1305PorUniaoNumero}\nTubo: ${tuboPosicao === "sem" ? "sem tubo" : `${tuboSelecionado?.codigo || tuboCodigo || "-"} (${tuboPosicao})`}`,
      valorTotal: resultado.totalGeral,
      materiais: montarMateriaisCentral(),
      origemRota: "/calculo/sacadagrapa",
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
    grapas1305PorUniao,
    grapas1305PorUniaoNumero,
    grapasInferioresNumero,
    grapasInferioresPorVao,
    grapasLateraisNumero,
    larguraNumero,
    larguraVaoMm,
    montarMateriaisCentral,
    obra,
    quantidadeDivisoesLargura,
    quantidadeDivisoesNumero,
    quantidadeNumero,
    grapasLateraisPorVao,
    quantidadeVaos,
    resultado,
    tuboCodigo,
    tuboPosicao,
    tuboSelecionado?.codigo,
    vidroId,
    vidroSelecionado,
  ]);

  const enviarParaCentralImpressao = () => {
    try {
      const itemCentral = montarItemCentral(centralItemId || undefined);
      const lista = JSON.parse(window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY) || "[]") as SacadaGrapaCentralItem[];
      const proximaLista = centralItemId && lista.some((item) => item.id === centralItemId)
        ? lista.map((item) => item.id === centralItemId ? itemCentral : item)
        : [...lista, itemCentral];

      window.localStorage.setItem(CENTRAL_IMPRESSAO_KEY, JSON.stringify(proximaLista));
      const clienteCentral = clienteSelecionado?.nome || buscaCliente;
      if (clienteCentral) window.localStorage.setItem(CENTRAL_IMPRESSAO_CLIENTE_KEY, clienteCentral);
      if (obra) window.localStorage.setItem(CENTRAL_IMPRESSAO_OBRA_KEY, obra);
      window.localStorage.removeItem(chaveDraft);
      router.push(centralItemId ? returnTo : "/central-impressao");
    } catch (error) {
      console.warn("Nao foi possivel enviar a Sacada com Grapa para a central:", error);
      setMensagem("Erro ao enviar para a central de impressao.");
    }
  };

  const handleSalvar = async () => {
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
          tipo: "sacada_grapa",
          larguraVaoMm: larguraNumero,
          alturaVaoMm: alturaNumero,
          quantidadeVaos: quantidadeNumero,
          divisoesPorVao: quantidadeDivisoesNumero,
          grapasLateraisPorVao: grapasLateraisNumero,
          grapasInferioresPorVao: grapasInferioresNumero,
          grapas1305PorUniao: grapas1305PorUniaoNumero,
          tuboPosicao,
          tuboCodigo,
          corPerfil,
          vidroId,
          vidroDescricao: montarDescricaoVidro(vidroSelecionado),
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
      console.error("Erro ao salvar Sacada com Grapa:", error);
      setMensagem("Erro ao salvar a Sacada com Grapa.");
    } finally {
      setSalvando(false);
    }
  };

  const conteudoCarregando = loading || carregando;

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
          ) : (
            <>
              <div className="rounded-2xl border p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
                <div className="flex items-center gap-2 flex-1 relative">
                  <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: `${theme.contentTextLightBg}80` }}>Cliente:</span>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} style={{ color: theme.contentTextLightBg }} />
                    <input
                      value={buscaCliente}
                      onChange={(e) => { setBuscaCliente(e.target.value); setMostrarClientes(true); }}
                      onFocus={() => setMostrarClientes(true)}
                      placeholder="Pesquisar cliente..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none bg-transparent"
                      style={{ borderColor: `${theme.contentTextLightBg}20`, color: theme.contentTextLightBg }}
                    />
                    {mostrarClientes && buscaCliente && clientesFiltrados.length > 0 && (
                      <div className="absolute top-full left-0 w-full border rounded-xl shadow-xl z-50 max-h-60 overflow-auto py-1" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}20` }}>
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
                  <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: `${theme.contentTextLightBg}80` }}>Obra:</span>
                  <input
                    value={obra}
                    onChange={(e) => setObra(e.target.value)}
                    placeholder="Identificacao da obra"
                    className="flex-1 py-2 px-3 rounded-xl border text-sm outline-none bg-transparent"
                    style={{ borderColor: `${theme.contentTextLightBg}20`, color: theme.contentTextLightBg }}
                  />
                </div>

                <button
                  onClick={() => {
                    setLarguraVaoMm("");
                    setAlturaVaoMm("");
                    setQuantidadeVaos("");
                    setQuantidadeDivisoesLargura("2");
                    setGrapasLateraisPorVao("2");
                    setGrapasInferioresPorVao("0");
                    setGrapas1305PorUniao("1");
                    setTuboPosicao("sem");
                    setVidroId("");
                    setBuscaVidro("");
                    setTuboCodigo("");
                    setMensagem("");
                    window.localStorage.removeItem(chaveDraft);
                  }}
                  className="px-5 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider border shadow-sm"
                  style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                >
                  Novo
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                  style={{ backgroundColor: theme.menuIconColor, color: "#fff" }}
                >
                  {salvando ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                  Salvar
                </button>
                <button
                  onClick={enviarParaCentralImpressao}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider border shadow-sm"
                  style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                >
                  <FilePlus2 size={16} />
                  PDF+
                </button>
                <PDFDownloadLink
                  document={
                    <SacadaGrapaPDF
                      nomeEmpresa={nomeEmpresa}
                      logoUrl={theme.logoLightUrl || undefined}
                      tituloDocumento="Orcamento Sacada com Grapa"
                      numeroOrcamento="Previa"
                      nomeCliente={clienteSelecionado?.nome || buscaCliente || "Consumidor"}
                      nomeObra={obra || "Geral"}
                      larguraVaoMm={larguraNumero}
                      alturaVaoMm={alturaNumero}
                      quantidadeVaos={quantidadeNumero}
                      divisoesPorVao={quantidadeDivisoesNumero}
                      grapasLateraisPorVao={grapasLateraisNumero}
                      grapasInferioresPorVao={grapasInferioresNumero}
                      grapas1305PorUniao={grapas1305PorUniaoNumero}
                      tuboDescricao={tuboPosicao === "sem" ? "Sem tubo" : `${tuboSelecionado?.codigo || tuboCodigo || "Tubo"} - ${tuboPosicao === "em-cima" ? "largura" : tuboPosicao === "entre-meios" ? "meio" : "largura + meio"}`}
                      corPerfil={corPerfil || "Nao selecionada"}
                      vidroDescricao={montarDescricaoVidro(vidroSelecionado)}
                      medidaVidro={`${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm`}
                      areaTotal={resultado.areaTotalVidro}
                      totalVidro={resultado.totalVidro}
                      totalAcessorios={resultado.totalAcessorios}
                      totalGeral={resultado.totalGeral}
                      materiais={montarMateriaisCentral()}
                      desenhoUrl={desenhoUrl}
                    />
                  }
                  fileName={`Sacada com Grapa ${clienteSelecionado?.nome || buscaCliente || "Geral"} - ${Date.now().toString().slice(-6)}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <button
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider border shadow-sm"
                      style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        <Printer size={16} />
                      )}
                      Imprimir
                    </button>
                  )}
                </PDFDownloadLink>
              </div>

              {mensagem && (
                <span className={`inline-flex text-xs font-medium px-3 py-1 rounded-full ${mensagem.includes("Erro") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {mensagem}
                </span>
              )}

              <section className="rounded-3xl border p-4 md:p-5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]" style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.menuIconColor }}>
                      <PanelsTopLeft size={14} />
                      Sacada com Grapa
                      </div>
                      <h1 className="mt-2 text-xl md:text-2xl font-medium leading-tight" style={{ color: theme.contentTextLightBg }}>
                        Cálculo de sacada com grapa
                      </h1>
                    </div>
                    <p className="max-w-2xl text-xs md:text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>
                      Informe medidas, divisões, grapas e tubo opcional. O desenho e a relação de materiais atualizam automaticamente.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2.5 w-full">
                    {[
                      ["Largura do vao (mm)", larguraVaoMm, setLarguraVaoMm],
                      ["Altura do vao (mm)", alturaVaoMm, setAlturaVaoMm],
                      ["Quantidade de vaos", quantidadeVaos, setQuantidadeVaos],
                      ["Quantas divisoes", quantidadeDivisoesLargura, setQuantidadeDivisoesLargura],
                      ["Grapas laterais", grapasLateraisPorVao, setGrapasLateraisPorVao],
                      ["Grapas embaixo por vidro", grapasInferioresPorVao, setGrapasInferioresPorVao],
                      ["1305 por uniao", grapas1305PorUniao, setGrapas1305PorUniao],
                    ].map(([label, value, setter]) => (
                      <label key={String(label)} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                        <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `${theme.contentTextLightBg}80` }}>
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

                    <label className="rounded-2xl border px-3 py-2.5" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `${theme.contentTextLightBg}80` }}>
                        Cor dos perfis
                      </span>
                      <select
                        value={corPerfil}
                        onChange={(e) => setCorPerfil(e.target.value)}
                        className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        {CORES_PERFIL.map((cor) => (
                          <option key={cor} value={cor} className="text-slate-900">{cor}</option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-2xl border px-3 py-2.5 col-span-2 xl:col-span-2" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `${theme.contentTextLightBg}80` }}>
                        Cor do vidro
                      </span>
                      <input
                        value={buscaVidro}
                        onChange={(e) => setBuscaVidro(e.target.value)}
                        placeholder="Digite para filtrar o vidro"
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-transparent px-2.5 py-1.5 text-xs outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      />
                      <select
                        value={vidroId}
                        onChange={(e) => setVidroId(e.target.value)}
                        className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        <option value="" className="text-slate-900">Selecione o vidro</option>
                        {vidrosFiltrados.map((vidro) => (
                          <option key={vidro.id} value={vidro.id} className="text-slate-900">
                            {montarDescricaoVidro(vidro)} - {formatarPreco(normalizarPrecoCatalogo(vidro.preco))}/m2
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-2xl border px-3 py-2.5 col-span-2 md:col-span-2 xl:col-span-1" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `${theme.contentTextLightBg}80` }}>
                        Tubo opcional
                      </span>
                      <select
                        value={tuboCodigo}
                        onChange={(e) => setTuboCodigo(e.target.value)}
                        className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        <option value="" className="text-slate-900">Selecione o tubo</option>
                        {tubosDisponiveis.map((perfil, index) => (
                          <option key={`${perfil.codigo}-${index}`} value={perfil.codigo} className="text-slate-900">
                            {perfil.codigo} - {perfil.nome}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-2xl border px-3 py-2.5 col-span-2 md:col-span-2 xl:col-span-1" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-medium" style={{ color: `${theme.contentTextLightBg}80` }}>
                        Posicao do tubo
                      </span>
                      <select
                        value={tuboPosicao}
                        onChange={(e) => setTuboPosicao(e.target.value as "sem" | "em-cima" | "entre-meios" | "em-cima-e-entre-meios")}
                        className="mt-1.5 w-full bg-transparent text-sm font-medium outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        {TUBO_POSICOES.map((opcao) => (
                          <option key={opcao.valor} value={opcao.valor} className="text-slate-900">{opcao.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  { titulo: "Medida de cada vidro", valor: `${formatarNumero(resultado.larguraVidroMm, 0)} x ${formatarNumero(resultado.alturaVidroMm, 0)} mm`, detalhe: `${resultado.quantidadeVidrosPorVao} vidros por vao`, icone: Ruler },
                  { titulo: "Area total de vidro", valor: `${formatarNumero(resultado.areaTotalVidro)} m2`, detalhe: resultado.vidroTipo, icone: SquareStack },
                  { titulo: "Grapas", valor: `${resultado.quantidadeGrapas}`, detalhe: `${resultado.quantidadeGrapas3019} da 3019 e ${resultado.quantidadeGrapas1305} da 1305`, icone: Package2 },
                  { titulo: "Total geral", valor: formatarPreco(resultado.totalGeral), detalhe: "Vidro, grapa e tubo", icone: Calculator },
                ].map((card) => (
                  <article key={card.titulo} className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: `${theme.contentTextLightBg}70` }}>{card.titulo}</p>
                        <p className="mt-2 text-xl font-medium leading-tight" style={{ color: theme.contentTextLightBg }}>{card.valor}</p>
                        <p className="mt-1 text-xs" style={{ color: `${theme.contentTextLightBg}A3` }}>{card.detalhe}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.menuIconColor}12`, color: theme.menuIconColor }}>
                        <card.icone size={19} />
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
                <article className="rounded-3xl border shadow-sm overflow-hidden" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                    <h2 className="text-lg font-medium" style={{ color: theme.contentTextLightBg }}>Relação de materiais</h2>
                    <p className="mt-1 text-xs" style={{ color: `${theme.contentTextLightBg}99` }}>3019 nas laterais/embaixo, 1305 nas uniões e tubo opcional.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-170 text-sm">
                      <thead style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.contentTextLightBg }}>
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
                          <tr key={`${material.id}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `${theme.screenBackgroundColor}A6` }}>
                            <td className="px-5 py-3" style={{ color: theme.contentTextLightBg }}>{material.descricao}</td>
                            <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>{formatarNumero(Number(material.qtd || 0), material.unidade === "barra" || material.unidade === "und" ? 0 : 3)}</td>
                            <td className="px-5 py-3 text-right" style={{ color: `${theme.contentTextLightBg}B3` }}>{material.unidade}</td>
                            <td className="px-5 py-3 text-right" style={{ color: theme.contentTextLightBg }}>{formatarPreco(Number(material.valorUnitario || 0))}</td>
                            <td className="px-5 py-3 text-right font-medium" style={{ color: theme.contentTextLightBg }}>{formatarPreco(Number(material.qtd || 0) * Number(material.valorUnitario || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-3xl border p-5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                  <h2 className="text-lg font-medium" style={{ color: theme.contentTextLightBg }}>Vista frontal</h2>
                  <p className="mt-1 text-xs" style={{ color: `${theme.contentTextLightBg}99` }}>Desenho conforme divisões, grapas, 1305 e tubo opcional.</p>
                  <div className="mt-4 rounded-2xl border bg-white p-3" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                    <div dangerouslySetInnerHTML={{ __html: svgSacada }} />
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


