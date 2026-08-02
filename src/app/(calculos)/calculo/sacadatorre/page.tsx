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
import { calcularSacadaTorre } from "@/utils/sacada-torre-calc";
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
  if (corNormalizada === "branco") return { fill: "#e9eef2", stroke: "#9aa9b7", shadow: "#cfd8df" };
  if (corNormalizada === "preto") return { fill: "#252a30", stroke: "#121417", shadow: "#4c535b" };
  if (corNormalizada === "fosco") return { fill: "#9aa0a6", stroke: "#68717a", shadow: "#c4c9ce" };
  return { fill: "#d8dde2", stroke: "#8c98a4", shadow: "#cfd8df" };
};

const gerarSvgSacadaTorre = ({
  largura,
  altura,
  divisoes,
  torresPorVidro,
  corPerfil,
  codigoTorre,
}: {
  largura: number;
  altura: number;
  divisoes: number;
  torresPorVidro: number;
  corPerfil?: string;
  codigoTorre?: string;
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
  const towerQty = Math.max(Math.floor(torresPorVidro || 0), 0);
  const panelW = (drawW - side * 2) / divs;
  const glassY = y0 + rail;
  const glassH = drawH - rail * 2;
  const profile = corPerfilSvg(corPerfil);
  const towerCode = codigoTorre || "TORRE";

  const divisionLines = Array.from({ length: Math.max(divs - 1, 0) }, (_, index) => {
    const x = x0 + side + panelW * (index + 1);
    return `<line x1="${x}" y1="${y0 + rail}" x2="${x}" y2="${y0 + drawH - rail}" stroke="#293442" stroke-width="1.2" opacity="0.75" />`;
  }).join("");

  const grapas = Array.from({ length: divs + 1 }, (_, index) => {
    const ehPonta = index === 0 || index === divs;
    const codigoGrapa = ehPonta ? "3019" : "1305";
    const x = index === 0 ? x0 + 8 : index === divs ? x0 + drawW - 26 : x0 + side + panelW * index - 18;
    const y = glassY + 32;
    const w = ehPonta ? 18 : 36;
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="30" rx="2" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1"/>
      <text x="${x + w + 8}" y="${y + 20}" font-family="Segoe UI, Arial" font-size="10" fill="#0f2742">${codigoGrapa}</text>
    </g>`;
  }).join("");

  const torres = Array.from({ length: divs }, (_, panelIndex) => {
    const baseX = x0 + side + panelW * panelIndex;
    return Array.from({ length: towerQty }, (_, towerIndex) => {
      const pos = towerQty === 1 ? 0.5 : (towerIndex + 1) / (towerQty + 1);
      const x = baseX + panelW * pos - 10;
      const y = y0 + drawH - rail - 80;
      return `<g>
        <rect x="${x}" y="${y}" width="20" height="96" rx="2" fill="url(#metalGrad)" stroke="${profile.stroke}" stroke-width="1.1"/>
        <line x1="${x + 3}" y1="${y + 5}" x2="${x + 3}" y2="${y + 90}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1"/>
        ${panelIndex === 0 && towerIndex === 0 ? `<text x="${x + 28}" y="${y + 46}" font-family="Segoe UI, Arial" font-size="11" fill="#0f2742">${towerCode}</text>` : ""}
      </g>`;
    }).join("");
  }).join("");

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
    <g filter="url(#softShadow)">${grapas}${torres}</g>
    <line x1="${x0}" y1="${y0 + drawH + 18}" x2="${x0 + drawW}" y2="${y0 + drawH + 18}" stroke="#1d7ed6" stroke-width="1"/>
    <text x="${x0 + drawW / 2}" y="${y0 + drawH + 38}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="13" font-weight="600" fill="#0f2742">${Math.round(largura || 0)} mm</text>
    <line x1="${x0 - 18}" y1="${y0}" x2="${x0 - 18}" y2="${y0 + drawH}" stroke="#1d7ed6" stroke-width="1"/>
    <text x="${x0 - 30}" y="${y0 + drawH / 2}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="13" font-weight="600" fill="#0f2742" transform="rotate(-90 ${x0 - 30} ${y0 + drawH / 2})">${Math.round(altura || 0)} mm</text>
  </svg>`;
};

export default function CalculoSacadaTorrePage() {
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
  const [quantidadeTorresPorVidro, setQuantidadeTorresPorVidro] = useState("1");
  const [buscaVidro, setBuscaVidro] = useState("");
  const [vidroId, setVidroId] = useState("");
  const [corPerfil, setCorPerfil] = useState("Branco");
  const [torreCodigo, setTorreCodigo] = useState("");
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
      setCorPerfil(dados.corPerfil || item?.corPerfil || item?.corKit || "Branco");
      setTorreCodigo(dados.torreCodigo || "");
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
    () => clientes.find((cliente) => String(cliente.id) === String(clienteId)) || null,
    [clienteId, clientes]
  );

  const vidrosFiltrados = useMemo(() => {
    const termo = normalizarBusca(buscaVidro);
    if (!termo) return vidros.slice(0, 80);
    return vidros.filter((vidro) => normalizarBusca(montarDescricaoVidro(vidro)).includes(termo)).slice(0, 80);
  }, [buscaVidro, vidros]);

  const vidroSelecionado = useMemo(
    () => vidros.find((vidro) => String(vidro.id) === String(vidroId)) || (buscaVidro.trim() ? vidrosFiltrados[0] : null) || null,
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
    return Number(especial?.preco ?? vidroSelecionado.preco ?? 0);
  }, [clienteSelecionado?.grupo_preco_id, precosEspeciais, vidroSelecionado]);

  const torresDisponiveis = useMemo(() => {
    const encontrados = ferragens.filter((ferragem) => {
      const texto = normalizarTexto(`${ferragem.codigo} ${ferragem.nome}`);
      return texto.includes("torre") || texto.includes("inox");
    });
    if (!corPerfil) return encontrados;
    const filtradosPorCor = encontrados.filter((ferragem) => corCompativel(ferragem.cores, corPerfil));
    return filtradosPorCor.length ? filtradosPorCor : encontrados;
  }, [corPerfil, ferragens]);

  const torreSelecionada = useMemo(() => {
    const codigo = normalizarCodigo(torreCodigo);
    const candidatos = ferragens.filter((ferragem) => normalizarCodigo(ferragem.codigo) === codigo);
    if (!candidatos.length) return null;
    return candidatos.find((ferragem) => corCompativel(ferragem.cores, corPerfil)) || candidatos[0];
  }, [corPerfil, ferragens, torreCodigo]);

  const grapa3019 = useMemo(() => {
    const candidatos = ferragens.filter((ferragem) => normalizarCodigo(ferragem.codigo) === "3019" || normalizarCodigo(ferragem.codigo).startsWith("3019"));
    return candidatos.find((ferragem) => corCompativel(ferragem.cores, corPerfil)) || candidatos[0] || null;
  }, [corPerfil, ferragens]);

  const grapa1305 = useMemo(() => {
    const candidatos = ferragens.filter((ferragem) => normalizarCodigo(ferragem.codigo) === "1305" || normalizarCodigo(ferragem.codigo).startsWith("1305"));
    return candidatos.find((ferragem) => corCompativel(ferragem.cores, corPerfil)) || candidatos[0] || null;
  }, [corPerfil, ferragens]);

  const resultado = useMemo(
    () =>
      calcularSacadaTorre({
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

  const svgSacada = useMemo(
    () =>
      gerarSvgSacadaTorre({
        largura: larguraNumero || 2000,
        altura: alturaNumero || 1000,
        divisoes: quantidadeDivisoesNumero,
        torresPorVidro: quantidadeTorresNumero,
        corPerfil,
        codigoTorre: torreSelecionada?.codigo || torreCodigo || "Torre",
      }),
    [alturaNumero, corPerfil, larguraNumero, quantidadeDivisoesNumero, quantidadeTorresNumero, torreCodigo, torreSelecionada?.codigo]
  );

  const desenhoUrl = useMemo(() => svgDataUrl(svgSacada), [svgSacada]);

  const montarMateriaisCentral = useCallback((): ProjetoIndividualMaterial[] => [
    {
      id: "vidro-sacada-torre",
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
  ], [grapa1305?.nome, grapa3019?.nome, precoVidroM2Efetivo, resultado, torreSelecionada?.nome, vidroSelecionado]);

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
      trinco: `${quantidadeTorresNumero} torre(s) por vidro | 3019 nas pontas | 1305 entre vidros`,
      pecasDivisao: resultado.quantidadeVidrosPorVao,
      medidasDetalhadas: `Vidro: ${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm\nDivisoes por vao: ${quantidadeDivisoesNumero}\nTorres por vidro: ${quantidadeTorresNumero}\nTorre: ${torreSelecionada?.codigo || torreCodigo || "-"}\nPontas: 3019\nEntre vidros: 1305`,
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
    torreSelecionada?.codigo,
    vidroId,
    vidroSelecionado,
  ]);

  const enviarParaCentralImpressao = () => {
    try {
      const itemCentral = montarItemCentral(centralItemId || undefined);
      const lista = JSON.parse(window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY) || "[]") as SacadaTorreCentralItem[];
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
      console.warn("Nao foi possivel enviar a sacada com torre para a central:", error);
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
                    setQuantidadeTorresPorVidro("1");
                    setVidroId("");
                    setBuscaVidro("");
                    setTorreCodigo("");
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
                    <SacadaTorrePDF
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
                      style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        <Printer size={16} />
                      )}
                      Imprimir PDF
                    </button>
                  )}
                </PDFDownloadLink>
              </div>

              {mensagem && (
                <span className={`inline-flex text-xs font-medium px-3 py-1 rounded-full ${mensagem.includes("Erro") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {mensagem}
                </span>
              )}

              <section className="rounded-4xl border p-6 md:p-8 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: `${theme.menuIconColor}12`, color: theme.menuIconColor }}>
                      <PanelsTopLeft size={14} />
                      Sacada com Torre
                    </div>
                    <h1 className="mt-4 text-3xl md:text-5xl font-semibold leading-tight" style={{ color: theme.contentTextLightBg }}>
                      Calculo de sacada com torre e grapa 3019
                    </h1>
                    <p className="mt-4 text-sm md:text-base" style={{ color: `${theme.contentTextLightBg}B3` }}>
                      Informe as dimensoes em mm, a quantidade de divisoes por vao, quantas torres entram em cada vidro e selecione a torre cadastrada.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 w-full xl:max-w-5xl">
                    {[
                      ["Largura do vao (mm)", larguraVaoMm, setLarguraVaoMm],
                      ["Altura do vao (mm)", alturaVaoMm, setAlturaVaoMm],
                      ["Quantidade de vaos", quantidadeVaos, setQuantidadeVaos],
                      ["Quantas divisoes", quantidadeDivisoesLargura, setQuantidadeDivisoesLargura],
                      ["Torres por vidro", quantidadeTorresPorVidro, setQuantidadeTorresPorVidro],
                    ].map(([label, value, setter]) => (
                      <label key={String(label)} className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: `${theme.contentTextLightBg}80` }}>
                          {String(label)}
                        </span>
                        <input
                          value={String(value)}
                          onChange={(e) => (setter as (valor: string) => void)(e.target.value)}
                          inputMode="numeric"
                          className="mt-3 w-full bg-transparent text-2xl font-semibold outline-none"
                          style={{ color: theme.contentTextLightBg }}
                        />
                      </label>
                    ))}

                    <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: `${theme.contentTextLightBg}80` }}>
                        Cor dos perfis
                      </span>
                      <select
                        value={corPerfil}
                        onChange={(e) => setCorPerfil(e.target.value)}
                        className="mt-3 w-full bg-transparent text-lg font-semibold outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        {CORES_PERFIL.map((cor) => (
                          <option key={cor} value={cor} className="text-slate-900">{cor}</option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-2xl border p-4 sm:col-span-2" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: `${theme.contentTextLightBg}80` }}>
                        Cor do vidro
                      </span>
                      <input
                        value={buscaVidro}
                        onChange={(e) => setBuscaVidro(e.target.value)}
                        placeholder="Digite para filtrar o vidro"
                        className="mt-3 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      />
                      <select
                        value={vidroId}
                        onChange={(e) => setVidroId(e.target.value)}
                        className="mt-3 w-full bg-transparent text-lg font-semibold outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        <option value="" className="text-slate-900">Selecione o vidro</option>
                        {vidrosFiltrados.map((vidro) => (
                          <option key={vidro.id} value={vidro.id} className="text-slate-900">
                            {montarDescricaoVidro(vidro)} - {formatarPreco(Number(vidro.preco) || 0)}/m2
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                      <span className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: `${theme.contentTextLightBg}80` }}>
                        Qual torre
                      </span>
                      <select
                        value={torreCodigo}
                        onChange={(e) => setTorreCodigo(e.target.value)}
                        className="mt-3 w-full bg-transparent text-lg font-semibold outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        <option value="" className="text-slate-900">Selecione a torre</option>
                        {torresDisponiveis.map((perfil, index) => (
                          <option key={`${perfil.codigo}-${index}`} value={perfil.codigo} className="text-slate-900">
                            {perfil.codigo} - {perfil.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { titulo: "Medida de cada vidro", valor: `${formatarNumero(resultado.larguraVidroMm, 0)} x ${formatarNumero(resultado.alturaVidroMm, 0)} mm`, detalhe: `${resultado.quantidadeVidrosPorVao} vidros por vao`, icone: Ruler },
                  { titulo: "Area total de vidro", valor: `${formatarNumero(resultado.areaTotalVidro)} m2`, detalhe: resultado.vidroTipo, icone: SquareStack },
                  { titulo: "Torres / grapas", valor: `${resultado.quantidadeTotalTorres} / ${resultado.quantidadeGrapas}`, detalhe: "3019 nas pontas e 1305 entre vidros", icone: Package2 },
                  { titulo: "Total geral", valor: formatarPreco(resultado.totalGeral), detalhe: "Vidro, torre e grapa", icone: Calculator },
                ].map((card) => (
                  <article key={card.titulo} className="rounded-[1.75rem] border p-5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: `${theme.contentTextLightBg}70` }}>{card.titulo}</p>
                        <p className="mt-3 text-2xl font-semibold leading-tight" style={{ color: theme.contentTextLightBg }}>{card.valor}</p>
                        <p className="mt-2 text-sm" style={{ color: `${theme.contentTextLightBg}A3` }}>{card.detalhe}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.menuIconColor}14`, color: theme.menuIconColor }}>
                        <card.icone size={22} />
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.9fr] gap-6">
                <article className="rounded-4xl border shadow-sm overflow-hidden" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                  <div className="px-6 py-5 border-b" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                    <h2 className="text-xl font-semibold" style={{ color: theme.contentTextLightBg }}>Relacao de materiais</h2>
                    <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>Torres pela ferragem selecionada, 3019 nas pontas e 1305 entre vidros.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-170 text-sm">
                      <thead style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.contentTextLightBg }}>
                        <tr>
                          <th className="text-left px-6 py-4 font-medium uppercase tracking-[0.14em] text-[11px]">Item</th>
                          <th className="text-right px-6 py-4 font-medium uppercase tracking-[0.14em] text-[11px]">Qtd</th>
                          <th className="text-right px-6 py-4 font-medium uppercase tracking-[0.14em] text-[11px]">Un.</th>
                          <th className="text-right px-6 py-4 font-medium uppercase tracking-[0.14em] text-[11px]">Valor unit.</th>
                          <th className="text-right px-6 py-4 font-medium uppercase tracking-[0.14em] text-[11px]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {montarMateriaisCentral().map((material, index) => (
                          <tr key={`${material.id}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `${theme.screenBackgroundColor}A6` }}>
                            <td className="px-6 py-4" style={{ color: theme.contentTextLightBg }}>{material.descricao}</td>
                            <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{formatarNumero(Number(material.qtd || 0), material.unidade === "barra" || material.unidade === "und" ? 0 : 3)}</td>
                            <td className="px-6 py-4 text-right" style={{ color: `${theme.contentTextLightBg}B3` }}>{material.unidade}</td>
                            <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{formatarPreco(Number(material.valorUnitario || 0))}</td>
                            <td className="px-6 py-4 text-right font-semibold" style={{ color: theme.contentTextLightBg }}>{formatarPreco(Number(material.qtd || 0) * Number(material.valorUnitario || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-4xl border p-6 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                  <h2 className="text-xl font-semibold" style={{ color: theme.contentTextLightBg }}>Vista frontal</h2>
                  <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>SVG gerado conforme divisoes, torres, 3019 e 1305.</p>
                  <div className="mt-5 rounded-3xl border bg-white p-4" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
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
