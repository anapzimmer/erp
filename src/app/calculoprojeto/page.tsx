"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/context/ThemeContext"
import { supabase } from "@/lib/supabaseClient"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import { CalculoVidroPDF } from "@/app/relatorios/calculovidros/CalculoVidroPDF"
import { RelatorioObraPDF } from "../relatorios/calculovidros/RelatorioObraPDF"
import { TemperaPDF } from "../relatorios/calculovidros/TemperaPDF"
import { compareFerragensByNome, comparePerfisByNome } from "@/utils/ordemTecnica"
import { correspondeRestricaoTecnica, decomporVariacaoTecnica, ehVariacaoDeDesenho, formatarVariacaoTecnica, getEixoVariacaoProjeto, getGruposVariacaoTecnicaDisponiveis, GRUPOS_VARIACAO_BOX, montarVariacaoTecnica } from "@/utils/variacaoProjeto"
import Image from "next/image"
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer"
import {
  Calculator, Package, Info,
  Scissors, Plus, Trash2, Save, Eye, X, Loader2, Printer,
} from "lucide-react"

// ─── TIPOS ──────────────────────────────────────────────────────────────────
type Projeto = {
  id: string
  nome: string
  categoria: string
  desenho: string
}

type ClienteItem = {
  id: string
  nome: string
  grupo_preco_id?: string | null
}

type PrecoVidroGrupo = {
  id: string
  vidro_id: string
  grupo_preco_id: string
  preco: number
}

type TrilhoPorta = "aparente" | "interrompido" | "embutido"

type ProjetoDetalhe = {
  folhas: Array<{
    numero_folha: number
    quantidade_folhas: number
    tipo_folha: string
    formula_largura: string
    formula_altura: string
    observacao: string
    variacao_restrita?: string | null
    trilho_restrito?: string | null
  }>
  kits: Array<{
    kit_id: string
    espessura_vidro: string
    largura_referencia: number
    altura_referencia: number
    tolerancia_mm: number
    observacao: string
    variacao_restrita: string | null
    kits?: { nome?: string | null } | null
  }>
  ferragens: Array<{
    ferragem_id: string
    quantidade: number
    usar_no_kit: boolean
    usar_no_perfil: boolean
    observacao: string
    variacao_restrita: string | null
    ferragens?: { nome?: string | null } | null
  }>
  perfis: Array<{
    perfil_id: string
    qtd_largura: number
    qtd_altura: number
    qtd_outros: number
    variacao_restrita: string | null
    espessura_vidro_restrita?: string | null
    condicao?: string | null
    usar_no_kit?: boolean
    altura_max_kit?: number | null
    perfis?: { nome?: string | null } | null
  }>
}

type VidroItem = {
  id: string
  nome: string
  espessura: string
  preco: number
  tipo?: string | null
}

type KitItem = {
  id: string
  nome: string
  largura: number
  altura: number
  preco: number
  categoria?: string | null
  cores?: string | null
}

type FerragemItem = {
  id: string
  nome: string
  codigo?: string | null
  preco: number
  cores?: string | null
}

type PerfilItem = {
  id: string
  nome: string
  codigo?: string | null
  preco: number
  cores?: string[] | string | null
}

// Item de resultado de cálculo de folha
type FolhaCalculada = {
  numero: number
  quantidadeFolhas: number
  tipo: string
  largura: number
  altura: number
  larguraArredondada: number
  alturaArredondada: number
  area: number
  vidro?: VidroItem | null
  precoM2Utilizado: number
  precoVidro: number
}

// Resultado de otimização de barra
type BarraOtimizada = {
  numero: number
  cortes: number[]
  usadoMm: number
  sobraMm: number
}

type CorteOtimizado = {
  perfilNome: string
  comprimentoBarra: number
  qtdBarras: number
  cortes: number[]
  qtdCortesLargura: number
  qtdCortesAltura: number
  qtdCortesOutros: number
  barras: BarraOtimizada[]
  aproveitamento: number
  desperdicioMm: number
  precoBarra: number
  precoTotal: number
}

// Resultado completo do cálculo
type ResultadoCalculo = {
  folhas: FolhaCalculada[]
  totalVidro: number
  precoVidroM2: number
  usouKit: boolean
  kit?: KitItem | null
  corKit?: string
  precoKit: number
  ferragens: Array<{ nome: string; qtd: number; precoUnit: number; total: number }>
  precoFerragens: number
  cortes: CorteOtimizado[]
  precoPerfis: number
  totalGeral: number
}

type ItemCalculoProjeto = {
  id: string
  projetoId: string
  largura: string
  altura: string
  largura2: string
  altura2: string
  qtd: string
  vidroId: string
  corMaterial: string
  modoCalculo: "kit" | "barra"
  variacaoDrawing: string
  variacaoAltura: string
  variacaoKit: string
  variacaoTrilho: TrilhoPorta | ""
}

type ResultadoProjetoCalculado = {
  itemId: string
  projeto: Projeto | null
  desenhoProjeto: string | null
  variacaoDrawing: string
  variacaoTecnica: string
  variacaoTrilho: ItemCalculoProjeto["variacaoTrilho"]
  vidro: VidroItem | null
  qtdProjeto: number
  larguraProjeto: number
  alturaProjeto: number
  corMaterial: string
  usandoPrecoEspecialVidro: boolean
  precoVidroM2Aplicado: number
  resultado: ResultadoCalculo
}

type ItemPreviewOrcamento = {
  id: string
  descricao: string
  desenhoUrl?: string
  tipo?: string
  especificacaoDesenho?: string
  trilhoLabel?: string
  medidaReal: string
  medidaCalc: string
  qtd: number
  total: number
  acabamento?: string
  servicos?: string
  planoCorte?: BarraOtimizada[]
  vao?: string
  corVidro?: string
  valorUnitario?: number
}

type OtimizacaoGlobalPerfil = {
  projetoId: string
  projetoNome: string
  perfilNome: string
  corMaterial: string
  comprimentoBarra: number
  precoBarra: number
  cortes: number[]
  qtdCortesLargura: number
  qtdCortesAltura: number
  qtdCortesOutros: number
  barras: BarraOtimizada[]
  qtdBarrasOriginal: number
  precoOriginal: number
  qtdBarrasOtimizada: number
  precoOtimizado: number
  aproveitamento: number
  desperdicioMm: number
}

const VARIACAO_TOKEN = "__VARIACAO__="
const COND_TOKEN = "__COND__="
const USAR_KIT_TOKEN = "__USAR_NO_KIT__="
const ALTURA_MAX_KIT_TOKEN = "__ALTURA_MAX_KIT__="
const ESPESSURA_VIDRO_TOKEN = "__ESP_VIDRO__="
const TRILHO_TOKEN = "__TRILHO__="
const QTD_FOLHA_TOKEN = "__QTD_FOLHA__="

const limparTextoComVariacao = (valor?: string | null) =>
  String(valor || "")
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(VARIACAO_TOKEN) && !linha.includes(TRILHO_TOKEN))
    .join("\n")
    .trim()

const extrairCondicaoDoTexto = (valor?: string | null): string | null => {
  const linhaCond = String(valor || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(COND_TOKEN))
  return linhaCond ? linhaCond.slice(COND_TOKEN.length).trim() || null : null
}

const extrairUsarNoKitDoTexto = (valor?: string | null): boolean => {
  const linhaUsarNoKit = String(valor || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(USAR_KIT_TOKEN))
  return linhaUsarNoKit ? linhaUsarNoKit.slice(USAR_KIT_TOKEN.length).trim() === "1" : false
}

const extrairAlturaMaxKitDoTexto = (valor?: string | null): number | null => {
  const linha = String(valor || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(ALTURA_MAX_KIT_TOKEN))
  if (!linha) return null
  const num = Number(linha.slice(ALTURA_MAX_KIT_TOKEN.length).trim())
  return Number.isFinite(num) && num > 0 ? num : null
}

const extrairEspessuraVidroDoTexto = (valor?: string | null): string | null => {
  const linha = String(valor || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(ESPESSURA_VIDRO_TOKEN))

  const espessura = linha ? linha.slice(ESPESSURA_VIDRO_TOKEN.length).trim() : ""
  return espessura || null
}

const extrairNumeroEspessura = (valor?: string | null): number | null => {
  const texto = String(valor || "").trim().replace(",", ".")
  if (!texto) return null

  const match = texto.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null

  const numero = Number(match[1])
  return Number.isFinite(numero) ? numero : null
}

const extrairQuantidadeFolhasDoNome = (valor?: string | null): number | null => {
  const texto = String(valor || "").toLowerCase()
  if (!texto) return null

  const match = texto.match(/(\d+)\s*(?:fls?|folhas?)/i) || texto.match(/(\d+)fls?/i)
  if (!match) return null

  const numero = Number(match[1])
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero) : null
}

const extrairVariacaoDoTexto = (valor?: string | null) => {
  const texto = String(valor || "")
  const linhaVariacao = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .find((linha) => linha.startsWith(VARIACAO_TOKEN))

  return {
    textoLimpo: limparTextoComVariacao(texto),
    variacao: linhaVariacao ? linhaVariacao.slice(VARIACAO_TOKEN.length).trim() || null : null,
  }
}

const extrairTrilhoDoTexto = (valor?: string | null): string | null => {
  const linhaTrilho = String(valor || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .find((linha) => linha.startsWith(TRILHO_TOKEN))

  const trilhosStr = linhaTrilho ? linhaTrilho.slice(TRILHO_TOKEN.length).trim().toLowerCase() : ""
  if (!trilhosStr) return null
  
  const trilhos = trilhosStr.split(",").map(t => t.trim()).filter(t => ["aparente", "interrompido", "embutido"].includes(t))
  return trilhos.length > 0 ? trilhos.join(",") : null
}

const extrairQuantidadeFolhaDoTexto = (valor?: string | null): number => {
  const linhaQtd = String(valor || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .find((linha) => linha.startsWith(QTD_FOLHA_TOKEN))

  const numero = linhaQtd ? Number(linhaQtd.slice(QTD_FOLHA_TOKEN.length).trim()) : 1
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero) : 1
}

type VariacaoProjetoOpcao = {
  arquivo: string
  label: string
}

const PARES_TRINCO: Array<{ com: string; sem: string }> = [
  { com: "janela-c-trinco-2fls.png", sem: "janela-s-trinco-2fls.png" },
  { com: "janela-c-trinco-4fls.png", sem: "janela-s-trinco-4fls.png" },
  { com: "janela-bct-trinco-2fls.png", sem: "janela-bst-trinco-2fls.png" },
  { com: "janela-bct-trinco-4fls.png", sem: "janela-bst-trinco-4fls.png" },
  { com: "janela-canto-ct.png", sem: "janela-canto-st.png" },
  { com: "janela-canto90-ct.png", sem: "janela-canto90-st.png" },
]

const formatarLabelVariacaoArquivo = (arquivo: string) => {
  const nome = arquivo.replace(/\.png$/i, "")

  const parTrinco = PARES_TRINCO.find((par) => par.com === arquivo || par.sem === arquivo)
  if (parTrinco) {
    return arquivo === parTrinco.com ? "Com trinco" : "Sem trinco"
  }

  if (/-ci(?:-|$)/i.test(nome)) return "CI"
  if (/-cs(?:-|$)/i.test(nome)) return "CS"
  if (/-puxador\d*$/i.test(nome)) {
    const numero = nome.match(/(\d+)$/)?.[1]
    return numero ? `Puxador ${numero}` : "Puxador"
  }
  if (/-comtrinco\d*$/i.test(nome)) {
    const numero = nome.match(/(\d+)$/)?.[1]
    return numero ? `Com trinco ${numero}` : "Com trinco"
  }
  if (/-simples\d*$/i.test(nome)) {
    const numero = nome.match(/(\d+)$/)?.[1]
    return numero ? `Simples ${numero}` : "Simples"
  }
  if (/-complet[oa]\d*$/i.test(nome)) {
    const numero = nome.match(/(\d+)$/)?.[1]
    return numero ? `Completo ${numero}` : "Completo"
  }

  return nome.split("-").slice(-2).join(" ") || nome
}

const normalizarTextoComparacao = (valor?: string | null) =>
  String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(png|jpe?g|webp|gif|svg)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const correspondeVariacaoVisualTextual = (restricao?: string | null, variacaoDrawing?: string | null): boolean => {
  const restricaoNorm = normalizarTextoComparacao(restricao)
  const drawingArquivoNorm = normalizarTextoComparacao(variacaoDrawing)
  const drawingLabelNorm = normalizarTextoComparacao(variacaoDrawing ? formatarLabelVariacaoArquivo(variacaoDrawing) : "")

  if (!restricaoNorm || !drawingArquivoNorm) return false
  if (restricaoNorm === drawingArquivoNorm) return true
  if (restricaoNorm === drawingLabelNorm) return true
  return drawingArquivoNorm.includes(restricaoNorm) || drawingLabelNorm.includes(restricaoNorm)
}

const obterChaveFamiliaVariacao = (arquivo: string): string | null => {
  const stem = String(arquivo || "").replace(/\.(png|jpe?g|webp|gif|svg)$/i, "")

  if (/^box-/i.test(stem)) return null

  if (/^porta\d+fls-(simples\d*|puxador\d*|comtrinco\d*|completo\d*|completa\d*)$/i.test(stem)) {
    return stem.replace(/-(simples\d*|puxador\d*|comtrinco\d*|completo\d*|completa\d*)$/i, "")
  }

  if (/^deslizante-\d+fls-(ci|cs)(-(simples\d*|completo\d*|completa\d*))?$/i.test(stem)) {
    return stem.replace(/-(simples\d*|completo\d*|completa\d*)$/i, "")
  }

  if (/^pma-\d+fs-(simples\d*|completo\d*|completa\d*)$/i.test(stem)) {
    return stem.replace(/-(simples\d*|completo\d*|completa\d*)$/i, "")
  }

  if (/^portaband\d+fls(-(simples\d*|completo\d*|completa\d*))?$/i.test(stem)) {
    return stem.replace(/-(simples\d*|completo\d*|completa\d*)$/i, "")
  }

  if (/^(portagiro|portaforavao)-\d+fls(completo|completa)?$/i.test(stem)) {
    return stem.replace(/(completo|completa)$/i, "")
  }

  return null
}

const getVariacoesAutomaticasProjeto = (
  desenho?: string | null,
  arquivosDisponiveis?: string[]
): VariacaoProjetoOpcao[] => {
  const arquivoAtual = String(desenho || "").trim()
  if (!arquivoAtual) return []

  const variacoes: VariacaoProjetoOpcao[] = []
  const disponiveis = new Set(
    (arquivosDisponiveis || [])
      .map((arquivo) => String(arquivo || "").trim())
      .filter(Boolean)
  )
  disponiveis.add(arquivoAtual)

  const adicionarVariacao = (arquivo: string, label?: string) => {
    const arquivoNormalizado = String(arquivo || "").trim()
    if (!arquivoNormalizado || !disponiveis.has(arquivoNormalizado)) return
    if (variacoes.some((item) => item.arquivo === arquivoNormalizado)) return
    const labelFinal = label && label.trim() ? label : formatarLabelVariacaoArquivo(arquivoNormalizado)
    variacoes.push({
      arquivo: arquivoNormalizado,
      label: labelFinal,
    })
  }

  adicionarVariacao(arquivoAtual)

  const parTrinco = PARES_TRINCO.find((par) => par.com === arquivoAtual || par.sem === arquivoAtual)
  if (parTrinco) {
    adicionarVariacao(parTrinco.sem, "Sem trinco")
    adicionarVariacao(parTrinco.com, "Com trinco")
  }

  if (/-ci(?:-|$)/i.test(arquivoAtual) || /-cs(?:-|$)/i.test(arquivoAtual)) {
    const arquivoCI = arquivoAtual.replace(/-cs(?=-|$)/gi, "-ci")
    const arquivoCS = arquivoAtual.replace(/-ci(?=-|$)/gi, "-cs")
    adicionarVariacao(arquivoCI, "CI")
    adicionarVariacao(arquivoCS, "CS")
  }

  const chaveFamiliaAtual = obterChaveFamiliaVariacao(arquivoAtual)

  if (chaveFamiliaAtual) {
    Array.from(disponiveis)
      .filter((arquivo) => arquivo !== arquivoAtual && obterChaveFamiliaVariacao(arquivo) === chaveFamiliaAtual)
      .sort((a, b) => {
        const aNome = a.replace(/\.(png|jpe?g|webp|gif|svg)$/i, "").split("-").pop() || ""
        const bNome = b.replace(/\.(png|jpe?g|webp|gif|svg)$/i, "").split("-").pop() || ""

        const rank = (nomeVersao: string) => {
          if (/^simples\d*$/i.test(nomeVersao)) return 0
          if (/^puxador\d*$/i.test(nomeVersao)) return 1
          if (/^comtrinco\d*$/i.test(nomeVersao)) return 2
          if (/^completo$|^completa$/i.test(nomeVersao)) return 3
          if (/^completo\d+$|^completa\d+$/i.test(nomeVersao)) return 4
          return 5
        }

        const rankA = rank(aNome)
        const rankB = rank(bNome)
        if (rankA !== rankB) return rankA - rankB

        const numA = Number((aNome.match(/(\d+)$/) || ["", "0"])[1])
        const numB = Number((bNome.match(/(\d+)$/) || ["", "0"])[1])
        if (numA !== numB) return numA - numB

        return a.localeCompare(b, "pt-BR")
      })
      .forEach((arquivo) => adicionarVariacao(arquivo))
  }

  return variacoes
}

// Remove cor entre parênteses no final do nome, ex: "Roldana 1125a (amarela)" → "roldana 1125a"
const normalizarNomeFerragem = (nome: string): string =>
  nome.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase()

const normalizarListaCores = (valor: string[] | string | null | undefined): string[] => {
  if (Array.isArray(valor)) {
    return valor.map((item) => String(item || "").trim()).filter(Boolean)
  }

  if (typeof valor === "string") {
    return valor
      .split(/[,;/\n|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

const criarItemCalculoProjeto = (): ItemCalculoProjeto => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  projetoId: "",
  largura: "",
  altura: "",
  largura2: "",
  altura2: "",
  qtd: "1",
  vidroId: "",
  corMaterial: "",
  modoCalculo: "kit",
  variacaoDrawing: "",
  variacaoAltura: "",
  variacaoKit: "",
  variacaoTrilho: "",
})

const validarItemCalculoProjeto = (item: unknown): item is ItemCalculoProjeto => {
  if (!item || typeof item !== "object") return false

  const candidato = item as Record<string, unknown>
  return typeof candidato.id === "string"
    && typeof candidato.projetoId === "string"
    && typeof candidato.largura === "string"
    && typeof candidato.altura === "string"
    && typeof candidato.largura2 === "string"
    && typeof candidato.altura2 === "string"
    && typeof candidato.qtd === "string"
    && typeof candidato.vidroId === "string"
    && typeof candidato.corMaterial === "string"
    && (candidato.modoCalculo === "kit" || candidato.modoCalculo === "barra")
    && typeof candidato.variacaoDrawing === "string"
    && typeof candidato.variacaoAltura === "string"
    && typeof candidato.variacaoKit === "string"
    && (typeof candidato.variacaoTrilho === "string" || typeof candidato.variacaoTrilho === "undefined")
}

const normalizarItensCalculo = (itens: unknown): ItemCalculoProjeto[] => {
  if (!Array.isArray(itens)) return [criarItemCalculoProjeto()]

  const itensNormalizados = itens
    .map((item) => {
      if (!item || typeof item !== "object") return null

      const candidato = item as Record<string, unknown>
      const variacaoTecnicaLegacy = typeof candidato.variacaoTecnica === "string" ? candidato.variacaoTecnica : ""
      const variacaoTecnicaDecomposta = decomporVariacaoTecnica(variacaoTecnicaLegacy)

      return {
        id: typeof candidato.id === "string" ? candidato.id : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        projetoId: typeof candidato.projetoId === "string" ? candidato.projetoId : "",
        largura: typeof candidato.largura === "string" ? candidato.largura : "",
        altura: typeof candidato.altura === "string" ? candidato.altura : "",
        largura2: typeof candidato.largura2 === "string" ? candidato.largura2 : "",
        altura2: typeof candidato.altura2 === "string" ? candidato.altura2 : "",
        qtd: typeof candidato.qtd === "string" ? candidato.qtd : "1",
        vidroId: typeof candidato.vidroId === "string" ? candidato.vidroId : "",
        corMaterial: typeof candidato.corMaterial === "string" ? candidato.corMaterial : "",
        modoCalculo: candidato.modoCalculo === "barra" ? "barra" : "kit",
        variacaoDrawing: typeof candidato.variacaoDrawing === "string" ? candidato.variacaoDrawing : "",
        variacaoAltura: typeof candidato.variacaoAltura === "string" ? candidato.variacaoAltura : (variacaoTecnicaDecomposta.altura || ""),
        variacaoKit: typeof candidato.variacaoKit === "string" ? candidato.variacaoKit : (variacaoTecnicaDecomposta.kit || ""),
        variacaoTrilho: typeof candidato.variacaoTrilho === "string" ? (candidato.variacaoTrilho as ItemCalculoProjeto["variacaoTrilho"]) : "",
      }
    })
    .filter((item): item is ItemCalculoProjeto => item !== null && validarItemCalculoProjeto(item))

  return itensNormalizados.length > 0 ? itensNormalizados : [criarItemCalculoProjeto()]
}

// ─── ENGINE: AVALIAR CONDIÇÃO (ex: "A > 1900") ───────────────────────────────
const avaliarCondicao = (cond: string | null | undefined, vars: Record<string, number>): boolean => {
  if (!cond) return true
  const match = cond.trim().match(/^(.+?)(>=|<=|!=|>|<|==|=)(.+)$/)
  if (!match) return true
  const left = avaliarFormula(match[1].trim(), vars)
  const right = avaliarFormula(match[3].trim(), vars)
  if (isNaN(left) || isNaN(right)) return true
  switch (match[2]) {
    case ">":  return left > right
    case "<":  return left < right
    case ">=": return left >= right
    case "<=": return left <= right
    case "==": case "=": return left === right
    case "!=": return left !== right
    default:   return true
  }
}

// ─── ENGINE: AVALIAR FÓRMULA ─────────────────────────────────────────────────
const avaliarFormula = (formula: string, vars: Record<string, number>): number => {
  try {
    let expr = formula
    // Substitui variáveis mais longas primeiro para evitar conflitos
    Object.entries(vars)
      .sort((a, b) => b[0].length - a[0].length)
      .forEach(([k, v]) => {
        expr = expr.replace(new RegExp(`\\b${k}\\b`, "gi"), String(v))
      })
    return Number(new Function(`return (${expr})`)()) || 0
  } catch {
    return 0
  }
}

// ─── ENGINE: ARREDONDA PARA CIMA DE 50mm ─────────────────────────────────────
const arred50 = (v: number) => Math.ceil(v / 50) * 50

// ─── ENGINE: OTIMIZAÇÃO DE BARRAS (first-fit decreasing) ────────────────────
const otimizarBarras = (
  cortes: number[],
  comprimentoBarra: number
): { qtdBarras: number; cortes: number[]; barras: BarraOtimizada[]; aproveitamento: number; desperdicioMm: number } => {
  if (!cortes.length || comprimentoBarra <= 0) {
    return { qtdBarras: 0, cortes: [], barras: [], aproveitamento: 0, desperdicioMm: 0 }
  }
  const folga = 5
  const sorted = [...cortes].sort((a, b) => b - a)
  const barras: Array<{ restante: number; cortes: number[] }> = []

  for (const corte of sorted) {
    const corteComFolga = corte + folga
    const idx = barras.findIndex((barra) => barra.restante >= corteComFolga)
    if (idx >= 0) {
      barras[idx].restante -= corteComFolga
      barras[idx].cortes.push(corte)
    } else {
      barras.push({ restante: comprimentoBarra - corteComFolga, cortes: [corte] })
    }
  }

  const qtdBarras = barras.length
  const totalUsado = sorted.reduce((s, c) => s + c + folga, 0)
  const totalDisponivel = qtdBarras * comprimentoBarra
  const desperdicio = totalDisponivel - totalUsado
  const aproveitamento = totalDisponivel > 0 ? Math.round((totalUsado / totalDisponivel) * 100) : 0
  const barrasDetalhadas: BarraOtimizada[] = barras.map((barra, index) => ({
    numero: index + 1,
    cortes: barra.cortes,
    usadoMm: comprimentoBarra - barra.restante,
    sobraMm: barra.restante,
  }))

  return { qtdBarras, cortes: sorted, barras: barrasDetalhadas, aproveitamento, desperdicioMm: desperdicio }
}

// ─── ENGINE: CALCULAR PROJETO COMPLETO ───────────────────────────────────────
const calcularProjeto = (params: {
  detalhe: ProjetoDetalhe
  largura: number
  altura: number
  largura2: number
  altura2: number
  vidroSelecionado: VidroItem | null
  precoVidroM2: number
  corMaterial: string
  modoCalculo: "kit" | "barra"
  variacaoDrawing: string
  variacaoTecnica: string
  variacaoTrilho: ItemCalculoProjeto["variacaoTrilho"]
  projetoEhPorta: boolean
  kitsDB: KitItem[]
  ferragensDB: FerragemItem[]
  perfisDB: PerfilItem[]
  qtd: number
}): ResultadoCalculo => {
  const {
    detalhe, largura, altura, largura2, altura2,
    vidroSelecionado, precoVidroM2, corMaterial, modoCalculo, variacaoDrawing, variacaoTecnica,
    variacaoTrilho, projetoEhPorta,
    kitsDB, ferragensDB, perfisDB, qtd,
  } = params

  // Variáveis disponíveis para fórmulas
  const vars: Record<string, number> = {
    L: largura, A: altura,
    L1: largura, L2: largura2 || largura,
    A1: altura, A2: altura2 || altura,
    AB: altura2 || altura,
  }
  const variacaoTecnicaDecomposta = decomporVariacaoTecnica(variacaoTecnica)
  const kitSelecionadoTecnico = String(variacaoTecnicaDecomposta.kit || "").trim()
  const kitComPerfilAte3000 = kitSelecionadoTecnico === "quadrado" || kitSelecionadoTecnico === "outro"

  // ── Calcular folhas de vidro ──────────────────────────────────────────────
  const isAplicavel = (varRestrita: string | null | undefined) => {
    if (!varRestrita) return true
    const partes = String(varRestrita).split(",").map(s => s.trim()).filter(Boolean)
    if (partes.length === 0) return true
    return partes.some(parte => {
      if (ehVariacaoDeDesenho(parte)) return !!variacaoDrawing && parte === variacaoDrawing
      const eixo = getEixoVariacaoProjeto(parte)
      if (eixo || parte.includes("|")) return correspondeRestricaoTecnica(parte, variacaoTecnica)
      if (correspondeVariacaoVisualTextual(parte, variacaoDrawing)) return true
      return correspondeRestricaoTecnica(parte, variacaoTecnica)
    })
  }

  const temFolhaComRestricaoVisual = detalhe.folhas.some((f) => {
    const partes = String(f.variacao_restrita || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    return partes.some((parte) => ehVariacaoDeDesenho(parte))
  })

  const folhasCalc: FolhaCalculada[] = detalhe.folhas
    .filter((f) => {
      if (variacaoDrawing && temFolhaComRestricaoVisual && !f.variacao_restrita) return false
      if (!isAplicavel(f.variacao_restrita)) return false
      if (!projetoEhPorta) return true
      if (!variacaoTrilho) return true
      if (!f.trilho_restrito) return true
      const trilhosPermitidos = f.trilho_restrito.split(",").map(t => t.trim())
      return trilhosPermitidos.includes(variacaoTrilho)
    })
    .map(f => {
    const quantidadeFolhas = Math.max(1, Number(f.quantidade_folhas || 1))
    const w = Math.max(avaliarFormula(f.formula_largura, vars), 0)
    const h = Math.max(avaliarFormula(f.formula_altura, vars), 0)
    const wR = arred50(w)
    const hR = arred50(h)
    const area = Math.max((wR * hR) / 1_000_000, 0.25)
    return {
      numero: f.numero_folha,
      quantidadeFolhas,
      tipo: f.tipo_folha,
      largura: Math.round(w),
      altura: Math.round(h),
      larguraArredondada: wR,
      alturaArredondada: hR,
      area,
      vidro: vidroSelecionado,
      precoM2Utilizado: precoVidroM2,
      precoVidro: area * precoVidroM2 * qtd * quantidadeFolhas,
    }
  })

  const totalVidro = folhasCalc.reduce((s, f) => s + f.precoVidro, 0)

  // ── Kit: encontrar o mais próximo ─────────────────────────────────────────
  let kitSelecionado: KitItem | null = null
  let precoKit = 0

  if (modoCalculo === "kit") {
    // kits do projeto filtrados pela variação e espessura do vidro
    const kitsAplicaveis = detalhe.kits.filter(k => isAplicavel(k.variacao_restrita))
    const espessura = vidroSelecionado?.espessura || ""
    const quantidadeFolhasProjeto = detalhe.folhas.reduce((total, folha) => total + Math.max(1, Number(folha.quantidade_folhas || 1)), 0)

    // Filtra por espessura (se contém o texto da espessura do vidro)
    const kitsFiltrados = kitsAplicaveis.filter(k =>
      !k.espessura_vidro ||
      !espessura ||
      k.espessura_vidro.toLowerCase().includes(espessura.toLowerCase()) ||
      espessura.toLowerCase().includes(k.espessura_vidro.toLowerCase())
    )

    // Se o usuário escolheu tipo de kit, prioriza kits amarrados àquele tipo.
    const kitSelecionadoTecnicoAtual = String(decomporVariacaoTecnica(variacaoTecnica).kit || "").trim()
    const kitsPreferenciais = (() => {
      if (!kitSelecionadoTecnicoAtual) return kitsFiltrados
      const candidatos = kitsFiltrados.filter((k) => {
        const partes = String(k.variacao_restrita || "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
        if (partes.length === 0) return false
        return partes.some((parte) => {
          if (ehVariacaoDeDesenho(parte)) return false
          const decomposta = decomporVariacaoTecnica(parte)
          return decomposta.kit === kitSelecionadoTecnicoAtual && correspondeRestricaoTecnica(parte, variacaoTecnica)
        })
      })
      return candidatos.length > 0 ? candidatos : kitsFiltrados
    })()

    const kitsPriorizadosPorFolhas = (() => {
      const candidatos = kitsPreferenciais.filter((kitProj) => {
        const dbKit = kitsDB.find((kit) => kit.id === kitProj.kit_id)
        const quantidadeKit = extrairQuantidadeFolhasDoNome(dbKit?.nome)
        return quantidadeKit !== null && quantidadeKit === quantidadeFolhasProjeto
      })
      return candidatos.length > 0 ? candidatos : kitsPreferenciais
    })()

    // Escolhe pelo menor delta (distância euclidiana entre L×A e largura_referencia×altura_referencia)
    let menorDelta = Infinity
    for (const kitProj of kitsPriorizadosPorFolhas) {
      const dbKit = kitsDB.find(k => k.id === kitProj.kit_id)
      if (!dbKit) continue
      const delta = Math.abs(largura - kitProj.largura_referencia) + Math.abs(altura - kitProj.altura_referencia)
      if (delta < menorDelta) {
        menorDelta = delta
        kitSelecionado = dbKit
      }
    }

    if (kitSelecionado) {
      precoKit = (kitSelecionado.preco || 0) * qtd
    }
  }

  // ── Ferragens ─────────────────────────────────────────────────────────────
  const ferragensResult: ResultadoCalculo["ferragens"] = detalhe.ferragens
    .filter(f => isAplicavel(f.variacao_restrita))
    .filter(f => modoCalculo === "kit" ? (f.usar_no_kit || Boolean(f.variacao_restrita)) : f.usar_no_perfil)
    .map(f => {
      const base = ferragensDB.find(x => x.id === f.ferragem_id)
      const nomeBase = base?.nome || f.ferragens?.nome || "Ferragem"
      const corAlvo = corMaterial.trim().toLowerCase()
      const codigoBase = base?.codigo?.trim().toLowerCase()
      const nomeNorm = base ? normalizarNomeFerragem(base.nome) : null
      // 1ª tentativa: mesmo código + cor selecionada
      // 2ª tentativa: mesmo nome normalizado + cor selecionada
      const variante = corAlvo
        ? (
            ferragensDB.find(x =>
              x.id !== base?.id &&
              !!codigoBase &&
              (x.codigo || "").trim().toLowerCase() === codigoBase &&
              (x.cores || "").trim().toLowerCase() === corAlvo
            ) ||
            ferragensDB.find(x =>
              x.id !== base?.id &&
              !!nomeNorm &&
              normalizarNomeFerragem(x.nome) === nomeNorm &&
              (x.cores || "").trim().toLowerCase() === corAlvo
            )
          )
        : null
      const db = variante || base
      const nome = db?.nome || nomeBase
      const precoUnit = db?.preco || 0
      return {
        nome,
        qtd: f.quantidade,
        precoUnit,
        total: f.quantidade * precoUnit * qtd,
      }
    })
    .sort((a, b) => compareFerragensByNome(a.nome, b.nome))

  const precoFerragens = ferragensResult.reduce((s, f) => s + f.total, 0)

  // ── Perfis: calcular cortes para posterior consolidação por projeto ───────
  const cortesResult: CorteOtimizado[] = []
  let precoPerfis = 0

  const calcularPerfisNesteModo =
    modoCalculo === "barra" ||
    detalhe.perfis.some((p) => {
      const possuiRestricaoKit = String(p.variacao_restrita || "")
        .split(",")
        .map((parte) => parte.trim())
        .filter(Boolean)
        .some((parte) => {
          if (ehVariacaoDeDesenho(parte)) return false
          return Boolean(decomporVariacaoTecnica(parte).kit)
        })
      const incluiPorRegraKit = modoCalculo === "kit" && kitComPerfilAte3000 && altura <= 3000 && possuiRestricaoKit
      return incluiPorRegraKit || Boolean(p.usar_no_kit) || Boolean(String(p.condicao || "").trim())
    })

  if (calcularPerfisNesteModo) {
    const perfisAplicaveis = detalhe.perfis
      .filter((p) => {
        const espessuraPerfil = String(p.espessura_vidro_restrita || "").trim().toLowerCase()
        const espessuraAtual = String(vidroSelecionado?.espessura || "").trim().toLowerCase()
        const espessuraPerfilNumero = extrairNumeroEspessura(espessuraPerfil)
        const espessuraAtualNumero = extrairNumeroEspessura(espessuraAtual)
        const condicaoExiste = Boolean(String(p.condicao || "").trim())
        const possuiRestricaoKit = String(p.variacao_restrita || "")
          .split(",")
          .map((parte) => parte.trim())
          .filter(Boolean)
          .some((parte) => {
            if (ehVariacaoDeDesenho(parte)) return false
            return Boolean(decomporVariacaoTecnica(parte).kit)
          })
        const incluiPorRegraKit = modoCalculo === "kit" && kitComPerfilAte3000 && altura <= 3000 && possuiRestricaoKit
        const podeNoModoAtual =
          modoCalculo === "barra" ||
          Boolean(p.usar_no_kit) ||
          condicaoExiste ||
          incluiPorRegraKit

        if (!podeNoModoAtual) return false
        if (!isAplicavel(p.variacao_restrita)) return false
        if (espessuraPerfil) {
          if (espessuraPerfilNumero !== null && espessuraAtualNumero !== null) {
            if (Math.abs(espessuraPerfilNumero - espessuraAtualNumero) > 0.001) return false
          } else {
            const espPerfilLimpa = espessuraPerfil.replace(/\s+/g, "")
            const espAtualLimpa = espessuraAtual.replace(/\s+/g, "")
            if (!espAtualLimpa || (!espPerfilLimpa.includes(espAtualLimpa) && !espAtualLimpa.includes(espPerfilLimpa))) return false
          }
        }
        return !condicaoExiste || avaliarCondicao(p.condicao, vars)
      })
      .sort((a, b) => {
        const nomeA = perfisDB.find((perfil) => perfil.id === a.perfil_id)?.nome || a.perfis?.nome || ""
        const nomeB = perfisDB.find((perfil) => perfil.id === b.perfil_id)?.nome || b.perfis?.nome || ""
        return comparePerfisByNome(nomeA, nomeB)
      })

    for (const pProj of perfisAplicaveis) {
      const db = perfisDB.find(x => x.id === pProj.perfil_id)
      if (!db) continue

      const comprimentoBarra = 6000
      const precoBarra = db.preco || 0

      // Monta lista de cortes: qtd_largura peças de L, qtd_altura peças de A, qtd_outros de (L+A)/2
      const qtdCortesLargura = largura > 0 ? Math.max(0, pProj.qtd_largura * qtd) : 0
      const qtdCortesAltura = altura > 0 ? Math.max(0, pProj.qtd_altura * qtd) : 0
      const qtdCortesOutros = (largura + altura) > 0 ? Math.max(0, pProj.qtd_outros * qtd) : 0
      const listaCortes: number[] = [
        ...Array(qtdCortesLargura).fill(largura),
        ...Array(qtdCortesAltura).fill(altura),
        ...Array(qtdCortesOutros).fill(Math.round((largura + altura) / 2)),
      ].filter(c => c > 0)

      if (!listaCortes.length) continue

      const otim = otimizarBarras(listaCortes, comprimentoBarra)
      const precoTotalPerfil = otim.qtdBarras * precoBarra

      cortesResult.push({
        perfilNome: db.nome,
        comprimentoBarra,
        qtdBarras: otim.qtdBarras,
        cortes: otim.cortes,
        qtdCortesLargura,
        qtdCortesAltura,
        qtdCortesOutros,
        barras: otim.barras,
        aproveitamento: otim.aproveitamento,
        desperdicioMm: otim.desperdicioMm,
        precoBarra,
        precoTotal: precoTotalPerfil,
      })

      precoPerfis += precoTotalPerfil
    }
  }

  const totalGeral = totalVidro + precoKit + precoFerragens + precoPerfis

  return {
    folhas: folhasCalc,
    totalVidro,
    precoVidroM2,
    usouKit: modoCalculo === "kit",
    kit: kitSelecionado,
    corKit: corMaterial,
    precoKit,
    ferragens: ferragensResult,
    precoFerragens,
    cortes: cortesResult,
    precoPerfis,
    totalGeral,
  }
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function CalculoProjetoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const { user, empresaId, nomeEmpresa, loading: checkingAuth } = useAuth()
  const editId = searchParams.get("edit")
  const returnTo = searchParams.get("returnTo")

  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [sidebarExpandido, setSidebarExpandido] = useState(true)

  // ── Banco de dados ──
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [clientesDB, setClientesDB] = useState<ClienteItem[]>([])
  const [vidrosDB, setVidrosDB] = useState<VidroItem[]>([])
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoVidroGrupo[]>([])
  const [kitsDB, setKitsDB] = useState<KitItem[]>([])
  const [ferragensDB, setFerragensDB] = useState<FerragemItem[]>([])
  const [perfisDB, setPerfisDB] = useState<PerfilItem[]>([])
  const [desenhosPasta, setDesenhosPasta] = useState<string[]>([])
  const [, setCarregando] = useState(true)

  // ── Seleções do usuário ──
  const [clienteId, setClienteId] = useState<string>("")
  const [obraReferencia, setObraReferencia] = useState("")
  const [itensCalculo, setItensCalculo] = useState<ItemCalculoProjeto[]>([criarItemCalculoProjeto()])
  const [detalhesProjetos, setDetalhesProjetos] = useState<Record<string, ProjetoDetalhe>>({})
  const [projetosCarregando, setProjetosCarregando] = useState<string[]>([])
  const [nomesVariacaoPersonalizados, setNomesVariacaoPersonalizados] = useState<Record<string, string>>({})

  // ── Resultado ──
  const [resultados, setResultados] = useState<ResultadoProjetoCalculado[]>([])
  const [abaResultados, setAbaResultados] = useState<"resumo" | "caderno" | "otimizacao">("resumo")
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false)
  const [mostrarPreviewOrcamento, setMostrarPreviewOrcamento] = useState(false)
  const [tipoPreviewPdf, setTipoPreviewPdf] = useState<"comercial" | "caderno" | "tempera">("comercial")
  const [numeroOrcamentoEdicao, setNumeroOrcamentoEdicao] = useState<string | null>(null)

  // ── Modal avisos ──
  const [modalAviso, setModalAviso] = useState<{
    titulo: string
    mensagem: string
    confirmar?: () => void
    tipo?: "sucesso" | "erro" | "aviso"
    labelConfirmar?: string
    labelCancelar?: string
  } | null>(null)
  const rascunhoRestauradoRef = useRef(false)
  const edicaoCarregadaRef = useRef(false)
  const secaoProjetosRef = useRef<HTMLElement | null>(null)
  const secaoResultadosRef = useRef<HTMLElement | null>(null)
  const projetoPendenteScrollRef = useRef<string | null>(null)

  const getChaveRascunho = useCallback(() => {
    if (!empresaId) return null
    return `calculoprojeto:rascunho:${empresaId}:${user?.id || "anon"}`
  }, [empresaId, user?.id])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const rolarParaProjetos = useCallback(() => {
    secaoProjetosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const rolarParaResultados = useCallback(() => {
    secaoResultadosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  // ── Carregar listas ──────────────────────────────────────────────────────
  const carregarTudo = useCallback(async () => {
    if (!empresaId) return
    setCarregando(true)
    const [resProjetos, resClientes, resVidros, resPrecosEspeciais, resKits, resFerragens, resPerfis] = await Promise.all([
      supabase.from("projetos").select("id, nome, categoria, desenho").eq("empresa_id", empresaId).order("nome"),
      supabase.from("clientes").select("id, nome, grupo_preco_id").eq("empresa_id", empresaId).order("nome"),
      supabase.from("vidros").select("id, nome, espessura, tipo, preco").eq("empresa_id", empresaId).order("nome"),
      supabase.from("vidro_precos_grupos").select("id, vidro_id, grupo_preco_id, preco").eq("empresa_id", empresaId),
      supabase.from("kits").select("id, nome, largura, altura, preco, categoria, cores").eq("empresa_id", empresaId).order("nome"),
      supabase.from("ferragens").select("id, nome, codigo, preco, cores").eq("empresa_id", empresaId).order("nome"),
      supabase.from("perfis").select("id, nome, codigo, preco, cores").eq("empresa_id", empresaId).order("nome"),
    ])
    if (resProjetos.data) setProjetos(resProjetos.data as Projeto[])
    if (resClientes.data) setClientesDB(resClientes.data as ClienteItem[])
    if (resVidros.data) setVidrosDB(resVidros.data as VidroItem[])
    if (resPrecosEspeciais.data) setPrecosEspeciais(resPrecosEspeciais.data as PrecoVidroGrupo[])
    if (resKits.data) setKitsDB(resKits.data as KitItem[])
    if (resFerragens.data) setFerragensDB(resFerragens.data as FerragemItem[])
    if (resPerfis.data) setPerfisDB(resPerfis.data as PerfilItem[])
    setCarregando(false)
  }, [empresaId])

  useEffect(() => {
    if (empresaId) carregarTudo()
  }, [empresaId, carregarTudo])

  useEffect(() => {
    let cancelado = false

    const carregarDesenhosPasta = async () => {
      try {
        const res = await fetch("/api/desenhos", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json() as { arquivos?: unknown }
        if (cancelado) return

        const arquivos = Array.isArray(data.arquivos)
          ? data.arquivos.map((item) => String(item || "").trim()).filter(Boolean)
          : []

        setDesenhosPasta(arquivos)
      } catch {
        if (!cancelado) setDesenhosPasta([])
      }
    }

    carregarDesenhosPasta()

    return () => {
      cancelado = true
    }
  }, [empresaId])

  useEffect(() => {
    if (!empresaId || typeof window === "undefined") return
    const chave = `variacao-box:nomes:${empresaId}`
    try {
      const bruto = window.localStorage.getItem(chave)
      if (!bruto) return
      const dados = JSON.parse(bruto)
      if (dados && typeof dados === "object") {
        setNomesVariacaoPersonalizados(dados as Record<string, string>)
      }
    } catch {
      // ignora inconsistencias de armazenamento local
    }
  }, [empresaId])

  useEffect(() => {
    if (!empresaId || typeof window === "undefined") return
    const chave = `variacao-box:nomes:${empresaId}`
    window.localStorage.setItem(chave, JSON.stringify(nomesVariacaoPersonalizados))
  }, [empresaId, nomesVariacaoPersonalizados])

  useEffect(() => {
    const chave = getChaveRascunho()
    if (!chave || rascunhoRestauradoRef.current || typeof window === "undefined" || editId) return

    try {
      const bruto = window.localStorage.getItem(chave)
      if (!bruto) {
        rascunhoRestauradoRef.current = true
        return
      }

      const rascunho = JSON.parse(bruto) as {
        clienteId?: string
        obraReferencia?: string
        itensCalculo?: unknown
      }

      if (typeof rascunho.clienteId === "string") setClienteId(rascunho.clienteId)
      if (typeof rascunho.obraReferencia === "string") setObraReferencia(rascunho.obraReferencia)
      setItensCalculo(normalizarItensCalculo(rascunho.itensCalculo))
    } catch {
      window.localStorage.removeItem(chave)
    } finally {
      rascunhoRestauradoRef.current = true
    }
  }, [editId, getChaveRascunho])

  useEffect(() => {
    const carregarOrcamentoEdicao = async () => {
      if (!empresaId || !editId || edicaoCarregadaRef.current) return

      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero_formatado, cliente_nome, obra_referencia, itens")
        .eq("empresa_id", empresaId)
        .eq("id", editId)
        .single()

      if (error || !data) {
        setModalAviso({ titulo: "Erro", mensagem: "Não foi possível carregar o orçamento para edição.", tipo: "erro" })
        return
      }

      const itensSalvos = data.itens as unknown
      const payload = (itensSalvos && typeof itensSalvos === "object" && !Array.isArray(itensSalvos))
        ? itensSalvos as {
            tipo?: string
            draft?: {
              clienteId?: string
              obraReferencia?: string
              itensCalculo?: unknown
            }
          }
        : null

      if (payload?.tipo !== "calculoprojeto") {
        setModalAviso({ titulo: "Atenção", mensagem: "Este orçamento não foi criado no cálculo de projetos.", tipo: "aviso" })
        return
      }

      setNumeroOrcamentoEdicao(data.numero_formatado || null)
      setObraReferencia(payload.draft?.obraReferencia || data.obra_referencia || "")
      setItensCalculo(normalizarItensCalculo(payload.draft?.itensCalculo))

      const clienteDraft = payload.draft?.clienteId
      if (clienteDraft && clientesDB.some((c) => c.id === clienteDraft)) {
        setClienteId(clienteDraft)
      } else {
        const clientePorNome = clientesDB.find((c) => c.nome === data.cliente_nome)
        if (clientePorNome) setClienteId(clientePorNome.id)
      }

      setResultados([])
      edicaoCarregadaRef.current = true
      rascunhoRestauradoRef.current = true
    }

    carregarOrcamentoEdicao()
  }, [clientesDB, editId, empresaId])

  // ── Cliente selecionado ───────────────────────────────────────────────────
  const clienteSel = clientesDB.find(c => c.id === clienteId) || null
  const carregarDetalheProjeto = useCallback(async (projetoId: string) => {
    if (!projetoId || detalhesProjetos[projetoId] || projetosCarregando.includes(projetoId)) return

    setProjetosCarregando((prev) => [...prev, projetoId])
    const { data } = await supabase
      .from("projetos")
      .select("*, projetos_folhas(*), projetos_kits(*, kits(nome)), projetos_ferragens(*, ferragens(nome)), projetos_perfis(*, perfis(nome))")
      .eq("id", projetoId)
      .single()

    if (data) {
      setDetalhesProjetos((prev) => ({
        ...prev,
        [projetoId]: {
          folhas: (data.projetos_folhas || []).map((folha: { observacao?: string | null }) => {
            const meta = extrairVariacaoDoTexto(folha.observacao)
            return {
              ...folha,
              quantidade_folhas: extrairQuantidadeFolhaDoTexto(folha.observacao),
              observacao: meta.textoLimpo,
              variacao_restrita: meta.variacao ?? null,
              trilho_restrito: extrairTrilhoDoTexto(folha.observacao),
            }
          }).sort((a: { numero_folha: number }, b: { numero_folha: number }) => a.numero_folha - b.numero_folha),
          kits: (data.projetos_kits || []).map((kit: { observacao?: string | null; variacao_restrita?: string | null }) => {
            const meta = extrairVariacaoDoTexto(kit.observacao)
            return {
              ...kit,
              observacao: meta.textoLimpo,
              variacao_restrita: kit.variacao_restrita ?? meta.variacao ?? null,
            }
          }),
          ferragens: (data.projetos_ferragens || []).map((ferragem: { observacao?: string | null; variacao_restrita?: string | null }) => {
            const meta = extrairVariacaoDoTexto(ferragem.observacao)
            return {
              ...ferragem,
              observacao: meta.textoLimpo,
              variacao_restrita: ferragem.variacao_restrita ?? meta.variacao ?? null,
            }
          }),
          perfis: (data.projetos_perfis || []).map((perfil: { tipo_fornecimento?: string | null; variacao_restrita?: string | null }) => {
            const meta = extrairVariacaoDoTexto(perfil.tipo_fornecimento)
            return {
              ...perfil,
              variacao_restrita: perfil.variacao_restrita ?? meta.variacao ?? null,
              espessura_vidro_restrita: extrairEspessuraVidroDoTexto(perfil.tipo_fornecimento),
              condicao: extrairCondicaoDoTexto(perfil.tipo_fornecimento),
              usar_no_kit: extrairUsarNoKitDoTexto(perfil.tipo_fornecimento),
              altura_max_kit: extrairAlturaMaxKitDoTexto(perfil.tipo_fornecimento),
            }
          }),
        },
      }))
    }

    setProjetosCarregando((prev) => prev.filter((id) => id !== projetoId))
  }, [detalhesProjetos, projetosCarregando])

  useEffect(() => {
    if (!rascunhoRestauradoRef.current) return

    const projetoIds = Array.from(new Set(
      itensCalculo
        .map((item) => item.projetoId)
        .filter(Boolean)
    ))

    projetoIds.forEach((projetoId) => carregarDetalheProjeto(projetoId))
  }, [carregarDetalheProjeto, itensCalculo])

  useEffect(() => {
    const chave = getChaveRascunho()
    if (!chave || !rascunhoRestauradoRef.current || typeof window === "undefined" || editId) return

    const payload = {
      clienteId,
      obraReferencia,
      itensCalculo,
    }

    window.localStorage.setItem(chave, JSON.stringify(payload))
  }, [clienteId, editId, getChaveRascunho, itensCalculo, obraReferencia])

  useEffect(() => {
    const projetoId = projetoPendenteScrollRef.current
    if (!projetoId) return

    if (!itensCalculo.some((item) => item.id === projetoId)) {
      projetoPendenteScrollRef.current = null
      return
    }

    if (typeof window === "undefined") return

    window.requestAnimationFrame(() => {
      document.getElementById(`projeto-card-${projetoId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
      projetoPendenteScrollRef.current = null
    })
  }, [itensCalculo])

  const atualizarItem = <K extends keyof ItemCalculoProjeto>(id: string, campo: K, valor: ItemCalculoProjeto[K]) => {
    setItensCalculo((prev) => prev.map((item) => {
      if (item.id !== id) return item

      if (campo === "projetoId") {
        return {
          ...item,
          projetoId: String(valor),
          corMaterial: "",
          variacaoDrawing: "",
          variacaoAltura: "",
          variacaoKit: "",
          variacaoTrilho: "",
        }
      }

      return { ...item, [campo]: valor }
    }))
    setResultados([])

    if (campo === "projetoId" && typeof valor === "string" && valor) {
      carregarDetalheProjeto(valor)
    }
  }

  const adicionarProjetoNaFila = () => {
    const novoProjeto = criarItemCalculoProjeto()
    projetoPendenteScrollRef.current = novoProjeto.id
    setItensCalculo((prev) => [...prev, novoProjeto])
    setResultados([])
  }

  const removerProjetoDaFila = (id: string) => {
    setItensCalculo((prev) => prev.length > 1 ? prev.filter((item) => item.id !== id) : prev)
    setResultados((prev) => prev.filter((item) => item.itemId !== id))
  }

  const getProjeto = useCallback(
    (item: ItemCalculoProjeto) => projetos.find((projeto) => projeto.id === item.projetoId) || null,
    [projetos]
  )
  const getDetalhe = useCallback(
    (item: ItemCalculoProjeto) => (item.projetoId ? detalhesProjetos[item.projetoId] || null : null),
    [detalhesProjetos]
  )
  const getVidro = (item: ItemCalculoProjeto) => vidrosDB.find((vidro) => vidro.id === item.vidroId) || null

  const projetosSemKitNoCalculo = useMemo(() => {
    return itensCalculo.flatMap((item, index) => {
      const detalhe = getDetalhe(item)
      if (!detalhe || item.modoCalculo !== "kit") return []

      const variacaoTecnicaSelecionada = montarVariacaoTecnica({
        altura: item.variacaoAltura,
        kit: item.variacaoKit,
      })

      const isAplicavel = (variacaoRestrita?: string | null) => {
        if (!variacaoRestrita) return true
        const partes = String(variacaoRestrita).split(",").map(s => s.trim()).filter(Boolean)
        if (partes.length === 0) return true
        return partes.some(parte => {
          if (ehVariacaoDeDesenho(parte)) return !!item.variacaoDrawing && parte === item.variacaoDrawing
          const eixo = getEixoVariacaoProjeto(parte)
          if (eixo || parte.includes("|")) return correspondeRestricaoTecnica(parte, variacaoTecnicaSelecionada)
          if (correspondeVariacaoVisualTextual(parte, item.variacaoDrawing)) return true
          return correspondeRestricaoTecnica(parte, variacaoTecnicaSelecionada)
        })
      }

      const kitsAplicaveis = detalhe.kits.filter((kit) => isAplicavel(kit.variacao_restrita))
      if (kitsAplicaveis.length > 0) return []

      return [{
        itemId: item.id,
        indice: index + 1,
        nome: getProjeto(item)?.nome || `Projeto ${index + 1}`,
        motivo: "sem kit cadastrado",
      }]
    })
  }, [getDetalhe, getProjeto, itensCalculo])

  const confirmarProjetoSemKitNoCalculo = useCallback((acao: () => void) => {
    if (projetosSemKitNoCalculo.length === 0) {
      acao()
      return
    }

    const listaProjetos = projetosSemKitNoCalculo
      .map((projeto) => `${projeto.indice}. ${projeto.nome} (${projeto.motivo})`)
      .join("\n")

    setModalAviso({
      titulo: "Projeto sem kit cadastrado",
      mensagem: `Os projetos abaixo estão em modo kit, mas sem kit cadastrado:\n${listaProjetos}\n\nDeseja calcular mesmo assim?`,
      tipo: "aviso",
      confirmar: acao,
      labelConfirmar: "Calcular mesmo assim",
      labelCancelar: "Revisar projetos",
    })
  }, [projetosSemKitNoCalculo])

  const getPrecoVidroM2 = (item: ItemCalculoProjeto) => {
    const vidroSel = getVidro(item)
    if (!vidroSel) return 0
    if (!clienteSel?.grupo_preco_id) return Number(vidroSel.preco || 0)

    const especial = precosEspeciais.find((preco) =>
      String(preco.grupo_preco_id) === String(clienteSel.grupo_preco_id) &&
      String(preco.vidro_id) === String(vidroSel.id)
    )

    return Number(especial?.preco ?? vidroSel.preco ?? 0)
  }

  const getUsandoPrecoEspecial = (item: ItemCalculoProjeto) => {
    const vidroSel = getVidro(item)
    if (!vidroSel || !clienteSel?.grupo_preco_id) return false

    return precosEspeciais.some((preco) =>
      String(preco.grupo_preco_id) === String(clienteSel.grupo_preco_id) &&
      String(preco.vidro_id) === String(vidroSel.id)
    )
  }

  const getCoresMaterial = (item: ItemCalculoProjeto) => {
    const detalhe = getDetalhe(item)
    if (!detalhe) return ["Preto"]

    const set = new Set<string>()
    for (const perfilProjeto of detalhe.perfis) {
      const db = perfisDB.find((perfil) => perfil.id === perfilProjeto.perfil_id)
      normalizarListaCores(db?.cores).forEach((cor) => set.add(cor))
    }
    for (const kitProjeto of detalhe.kits) {
      const db = kitsDB.find((kit) => kit.id === kitProjeto.kit_id)
      normalizarListaCores(db?.cores).forEach((cor) => set.add(cor))
    }
    // Inclui cores das próprias ferragens vinculadas (e suas variantes irmãs)
    for (const ferragemProjeto of detalhe.ferragens) {
      const base = ferragensDB.find((f) => f.id === ferragemProjeto.ferragem_id)
      if (!base?.cores) continue
      const codigoBase = base.codigo?.trim().toLowerCase()
      const nomeNorm = normalizarNomeFerragem(base.nome)
      ferragensDB
        .filter(f =>
          (!!codigoBase && (f.codigo || "").trim().toLowerCase() === codigoBase) ||
          normalizarNomeFerragem(f.nome) === nomeNorm
        )
        .forEach(f => normalizarListaCores(f.cores).forEach(cor => set.add(cor)))
    }

    const lista = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
    return lista.length > 0 ? lista : ["Preto"]
  }

  const desenhosDisponiveisCadastro = useMemo(() => {
    const set = new Set<string>()
    projetos.forEach((projeto) => {
      const arquivo = String(projeto.desenho || "").trim()
      if (arquivo) set.add(arquivo)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [projetos])

  const desenhosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    desenhosDisponiveisCadastro.forEach((arquivo) => set.add(arquivo))
    desenhosPasta.forEach((arquivo) => set.add(arquivo))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [desenhosDisponiveisCadastro, desenhosPasta])

  const getRestricoesProjeto = useCallback((item: ItemCalculoProjeto) => {
    const detalhe = getDetalhe(item)
    const brutos = [
      ...(detalhe?.folhas || []).map((folha) => folha.variacao_restrita),
      ...(detalhe?.kits || []).map((kit) => kit.variacao_restrita),
      ...(detalhe?.ferragens || []).map((ferragem) => ferragem.variacao_restrita),
      ...(detalhe?.perfis || []).map((perfil) => perfil.variacao_restrita),
    ]
    return brutos.flatMap(v => v ? String(v).split(",").map(s => s.trim()).filter(Boolean) : [null])
  }, [getDetalhe])

  const getVariacoesDesenhoDisponiveis = (item: ItemCalculoProjeto): VariacaoProjetoOpcao[] => {
    const projeto = getProjeto(item)
    if (!projeto?.desenho) return []

    const mapa = new Map<string, VariacaoProjetoOpcao>()

    getVariacoesAutomaticasProjeto(projeto?.desenho, desenhosDisponiveis).forEach((variacao) => {
      mapa.set(variacao.arquivo, variacao)
    })

    return Array.from(mapa.values())
  }

  const getGruposVariacaoTecnica = useCallback(
    (item: ItemCalculoProjeto) => getGruposVariacaoTecnicaDisponiveis(getRestricoesProjeto(item)),
    [getRestricoesProjeto]
  )

  const getQuantidadeFolhasAplicaveis = (item: ItemCalculoProjeto): number => {
    const detalhe = getDetalhe(item)
    const projeto = getProjeto(item)
    if (!detalhe || !projeto) return 0

    const variacaoDrawingAtiva = String(item.variacaoDrawing || projeto.desenho || "").trim()
    const variacaoTecnica = montarVariacaoTecnica({
      altura: item.variacaoAltura,
      kit: item.variacaoKit,
    })
    const textoProjeto = `${projeto.nome} ${projeto.categoria} ${projeto.desenho}`.toLowerCase()
    const projetoEhPorta = /porta|deslizante|pma|giro|pivotante|maxim|basculante/.test(textoProjeto)

    const isAplicavel = (varRestrita: string | null | undefined) => {
      if (!varRestrita) return true
      const partes = String(varRestrita).split(",").map((s) => s.trim()).filter(Boolean)
      if (partes.length === 0) return true
      return partes.some((parte) => {
        if (ehVariacaoDeDesenho(parte)) return !!variacaoDrawingAtiva && parte === variacaoDrawingAtiva
        const eixo = getEixoVariacaoProjeto(parte)
        if (eixo || parte.includes("|")) return correspondeRestricaoTecnica(parte, variacaoTecnica)
        if (correspondeVariacaoVisualTextual(parte, variacaoDrawingAtiva)) return true
        return correspondeRestricaoTecnica(parte, variacaoTecnica)
      })
    }

    const temFolhaComRestricaoVisual = detalhe.folhas.some((f) => {
      const partes = String(f.variacao_restrita || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      return partes.some((parte) => ehVariacaoDeDesenho(parte))
    })

    return detalhe.folhas.filter((f) => {
      if (variacaoDrawingAtiva && temFolhaComRestricaoVisual && !f.variacao_restrita) return false
      if (!isAplicavel(f.variacao_restrita)) return false
      if (!projetoEhPorta) return true
      if (!item.variacaoTrilho) return true
      if (!f.trilho_restrito) return true
      const trilhosPermitidos = String(f.trilho_restrito).split(",").map((t) => t.trim())
      return trilhosPermitidos.includes(item.variacaoTrilho)
    }).reduce((total, folha) => total + Math.max(1, Number(folha.quantidade_folhas || 1)), 0)
  }

  const formatarResumoVariacaoSelecionada = useCallback(
    (variacaoDrawing?: string | null, variacaoTecnica?: string | null) =>
      [
        variacaoTecnica ? formatarVariacaoTecnica(variacaoTecnica) : "",
        variacaoDrawing
          ? (nomesVariacaoPersonalizados[variacaoDrawing]?.trim() || formatarLabelVariacaoArquivo(variacaoDrawing))
          : "",
      ].filter(Boolean).join(" · "),
    [nomesVariacaoPersonalizados]
  )

  const formatarLabelTrilho = (trilho?: TrilhoPorta | "" | null) => {
    if (trilho === "aparente") return "Aparente"
    if (trilho === "interrompido") return "Interrompido"
    if (trilho === "embutido") return "Embutido"
    return ""
  }

  useEffect(() => {
    setItensCalculo((prev) => {
      let houveMudanca = false

      const atualizados = prev.map((item) => {
        const grupos = getGruposVariacaoTecnica(item)
        if (grupos.length === 0) {
          if (!item.variacaoAltura && !item.variacaoKit) return item
          houveMudanca = true
          return {
            ...item,
            variacaoAltura: "",
            variacaoKit: "",
          }
        }

        let proximo = item

        grupos.forEach((grupo) => {
          const campo = grupo.key === "altura" ? "variacaoAltura" : "variacaoKit"
          const valorAtual = proximo[campo]
          const valorEhValido = grupo.options.some((opcao) => opcao.value === valorAtual)

          if (!valorEhValido) {
            houveMudanca = true
            proximo = {
              ...proximo,
              [campo]: grupo.options[0]?.value || "",
            }
          }
        })

        if (!grupos.some((grupo) => grupo.key === "altura") && proximo.variacaoAltura) {
          houveMudanca = true
          proximo = { ...proximo, variacaoAltura: "" }
        }

        if (!grupos.some((grupo) => grupo.key === "kit") && proximo.variacaoKit) {
          houveMudanca = true
          proximo = { ...proximo, variacaoKit: "" }
        }

        return proximo
      })

      return houveMudanca ? atualizados : prev
    })
  }, [getGruposVariacaoTecnica])

  const totaisGerais = useMemo(() => {
    return resultados.reduce((acc, item) => {
      acc.totalVidro += item.resultado.totalVidro
      if (item.resultado.usouKit) acc.totalKits += item.resultado.precoKit
      acc.totalPerfisOriginal += item.resultado.precoPerfis
      acc.totalFerragens += item.resultado.precoFerragens
      acc.totalGeralOriginal += item.resultado.totalGeral
      return acc
    }, { totalVidro: 0, totalKits: 0, totalPerfisOriginal: 0, totalFerragens: 0, totalGeralOriginal: 0 })
  }, [resultados])

  const otimizacaoGlobalPerfis = useMemo(() => {
    const grupos = new Map<string, OtimizacaoGlobalPerfil>()

    resultados.forEach((itemResultado) => {
      if (!itemResultado.resultado.cortes.length) return

      itemResultado.resultado.cortes.forEach((corte) => {
        const projetoId = itemResultado.projeto?.id || itemResultado.itemId
        const projetoNome = itemResultado.projeto?.nome || "Projeto"
        const corMaterial = itemResultado.corMaterial || "Sem cor definida"
        const chave = [
          corte.perfilNome,
          corMaterial,
          corte.comprimentoBarra,
          corte.precoBarra,
        ].join("|")

        const existente = grupos.get(chave)
        if (existente) {
          existente.cortes.push(...corte.cortes)
          existente.qtdCortesLargura += corte.qtdCortesLargura
          existente.qtdCortesAltura += corte.qtdCortesAltura
          existente.qtdCortesOutros += corte.qtdCortesOutros
          existente.qtdBarrasOriginal += corte.qtdBarras
          existente.precoOriginal += corte.precoTotal
          if (!existente.projetoNome.split(" | ").includes(projetoNome)) {
            existente.projetoNome = `${existente.projetoNome} | ${projetoNome}`
          }
          if (existente.projetoId !== projetoId) {
            existente.projetoId = "multi"
          }
          return
        }

        grupos.set(chave, {
          projetoId,
          projetoNome,
          perfilNome: corte.perfilNome,
          corMaterial,
          comprimentoBarra: corte.comprimentoBarra,
          precoBarra: corte.precoBarra,
          cortes: [...corte.cortes],
          qtdCortesLargura: corte.qtdCortesLargura,
          qtdCortesAltura: corte.qtdCortesAltura,
          qtdCortesOutros: corte.qtdCortesOutros,
          barras: [],
          qtdBarrasOriginal: corte.qtdBarras,
          precoOriginal: corte.precoTotal,
          qtdBarrasOtimizada: 0,
          precoOtimizado: 0,
          aproveitamento: 0,
          desperdicioMm: 0,
        })
      })
    })

    const gruposOtimizados = Array.from(grupos.values())
      .map((grupo) => {
        const otim = otimizarBarras(grupo.cortes, grupo.comprimentoBarra)
        return {
          ...grupo,
          cortes: [...grupo.cortes].sort((a, b) => b - a),
          barras: otim.barras,
          qtdBarrasOtimizada: otim.qtdBarras,
          precoOtimizado: otim.qtdBarras * grupo.precoBarra,
          aproveitamento: otim.aproveitamento,
          desperdicioMm: otim.desperdicioMm,
        }
      })
      .sort((a, b) => {
        const perfil = a.perfilNome.localeCompare(b.perfilNome, "pt-BR")
        if (perfil !== 0) return perfil
        const cor = a.corMaterial.localeCompare(b.corMaterial, "pt-BR")
        if (cor !== 0) return cor
        return a.projetoNome.localeCompare(b.projetoNome, "pt-BR")
      })

    const resumo = gruposOtimizados.reduce((acc, grupo) => {
      acc.barrasOriginais += grupo.qtdBarrasOriginal
      acc.barrasOtimizadas += grupo.qtdBarrasOtimizada
      acc.precoOriginal += grupo.precoOriginal
      acc.precoOtimizado += grupo.precoOtimizado
      return acc
    }, { barrasOriginais: 0, barrasOtimizadas: 0, precoOriginal: 0, precoOtimizado: 0 })

    return {
      grupos: gruposOtimizados,
      resumo,
      economiaBarras: Math.max(0, resumo.barrasOriginais - resumo.barrasOtimizadas),
      economiaValor: Math.max(0, resumo.precoOriginal - resumo.precoOtimizado),
    }
  }, [resultados])

  const totaisCalculados = useMemo(() => {
    const totalPerfis = otimizacaoGlobalPerfis.grupos.length > 0
      ? otimizacaoGlobalPerfis.resumo.precoOtimizado
      : totaisGerais.totalPerfisOriginal

    return {
      totalVidro: totaisGerais.totalVidro,
      totalKits: totaisGerais.totalKits,
      totalPerfis,
      totalFerragens: totaisGerais.totalFerragens,
      totalGeral: totaisGerais.totalVidro + totaisGerais.totalKits + totaisGerais.totalFerragens + totalPerfis,
      totalPerfisOriginal: totaisGerais.totalPerfisOriginal,
      totalGeralOriginal: totaisGerais.totalGeralOriginal,
      economiaPerfis: Math.max(0, totaisGerais.totalPerfisOriginal - totalPerfis),
      economiaTotal: Math.max(0, totaisGerais.totalGeralOriginal - (totaisGerais.totalVidro + totaisGerais.totalKits + totaisGerais.totalFerragens + totalPerfis)),
    }
  }, [otimizacaoGlobalPerfis, totaisGerais])

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const otimizacaoGlobalParaPDF = useMemo(() => {
    return otimizacaoGlobalPerfis.grupos
      .map((grupo) => ({
        id: `${grupo.projetoId}-${grupo.perfilNome}-${grupo.corMaterial}-${grupo.comprimentoBarra}`,
        projetoNome: grupo.projetoNome,
        perfilNome: grupo.perfilNome,
        perfilCodigo: perfisDB.find((p) => p.nome === grupo.perfilNome)?.codigo || "-",
        corMaterial: grupo.corMaterial,
        comprimentoBarra: grupo.comprimentoBarra,
        qtdBarrasOriginal: grupo.qtdBarrasOriginal,
        qtdBarrasOtimizada: grupo.qtdBarrasOtimizada,
        aproveitamento: grupo.aproveitamento,
        desperdicioMm: grupo.desperdicioMm,
        precoOtimizado: grupo.precoOtimizado,
        precoOriginal: grupo.precoOriginal,
        cortes: grupo.cortes,
        qtdCortesLargura: grupo.qtdCortesLargura,
        qtdCortesAltura: grupo.qtdCortesAltura,
        qtdCortesOutros: grupo.qtdCortesOutros,
        barras: grupo.barras,
      }))
      .sort((a, b) => {
        return comparePerfisByNome(a.perfilNome, b.perfilNome)
      })
  }, [otimizacaoGlobalPerfis.grupos, perfisDB])


  const relatorioObra = useMemo(() => {
    return resultados.map((itemResultado) => {
      const nomesPerfis = Array.from(new Set(itemResultado.resultado.cortes.map((corte) => corte.perfilNome)))
        .sort((a, b) => comparePerfisByNome(a, b))
      const variacaoLabel = formatarResumoVariacaoSelecionada(itemResultado.variacaoDrawing, itemResultado.variacaoTecnica) || null
      const textoProjeto = `${itemResultado.projeto?.nome || ""} ${itemResultado.projeto?.categoria || ""} ${itemResultado.projeto?.desenho || ""}`.toLowerCase()
      const ehPorta = /porta|deslizante|pma|giro|pivotante|maxim|basculante/.test(textoProjeto)
      const desenhoAtivo = itemResultado.desenhoProjeto || itemResultado.variacaoDrawing || itemResultado.projeto?.desenho || ""

      return {
        itemId: itemResultado.itemId,
        projetoNome: itemResultado.projeto?.nome || "Projeto",
        desenhoUrl: itemResultado.desenhoProjeto ? `/desenhos/${itemResultado.desenhoProjeto}` : null,
        variacaoLabel,
        ehPorta,
        especificacaoDesenho: desenhoAtivo
          ? (nomesVariacaoPersonalizados[desenhoAtivo]?.trim() || formatarLabelVariacaoArquivo(desenhoAtivo))
          : null,
        trilhoLabel: itemResultado.variacaoTrilho ? formatarLabelTrilho(itemResultado.variacaoTrilho) : null,
        quantidade: itemResultado.qtdProjeto,
        vao: `${itemResultado.larguraProjeto} x ${itemResultado.alturaProjeto} mm`,
        vidro: [itemResultado.vidro?.nome, itemResultado.vidro?.espessura].filter(Boolean).join(" · ") || "Vidro não definido",
        corMaterial: itemResultado.corMaterial || "Sem cor definida",
        modoCalculo: itemResultado.resultado.usouKit ? "Kit" : "Barra",
        subtotal: itemResultado.resultado.totalGeral,
        folhas: itemResultado.resultado.folhas.map((folha) => ({
          id: `${itemResultado.itemId}-folha-${folha.numero}`,
          titulo: `Folha ${folha.numero} ${folha.tipo}`,
          quantidadeFolhas: folha.quantidadeFolhas,
          medida: `${folha.largura} x ${folha.altura} mm`,
          medidaCalc: `${folha.larguraArredondada} x ${folha.alturaArredondada} mm`,
          area: folha.area,
          total: folha.precoVidro,
        })),
        kitNome: itemResultado.resultado.kit?.nome || null,
        kitQuantidade: itemResultado.resultado.usouKit && itemResultado.resultado.kit
          ? itemResultado.qtdProjeto
          : 0,
        perfis: nomesPerfis,
        ferragens: itemResultado.resultado.ferragens.map((ferragem, index) => {
          const corAlvo = (itemResultado.corMaterial || "").trim().toLowerCase()
          const baseByNome = ferragensDB.find((f) => f.nome === ferragem.nome)
          const codigoBase = baseByNome?.codigo?.trim().toLowerCase()
          const nomeNorm = normalizarNomeFerragem(ferragem.nome)
          // Mesma lógica do calcularProjeto: 1ª por código+cor, 2ª por nome normalizado+cor
          const variante = corAlvo
            ? (
                ferragensDB.find(x =>
                  !!codigoBase &&
                  (x.codigo || "").trim().toLowerCase() === codigoBase &&
                  (x.cores || "").trim().toLowerCase() === corAlvo
                ) ||
                ferragensDB.find(x =>
                  normalizarNomeFerragem(x.nome) === nomeNorm &&
                  (x.cores || "").trim().toLowerCase() === corAlvo
                )
              )
            : null
          const db = variante || baseByNome
          return {
            id: `${itemResultado.itemId}-ferragem-${index}`,
            nome: db?.nome || ferragem.nome,
            codigo: db?.codigo || null,
            qtd: ferragem.qtd * itemResultado.qtdProjeto,
            unidade: "un",
            total: (db?.preco || ferragem.precoUnit || 0) * ferragem.qtd * itemResultado.qtdProjeto,
          }
        }).sort((a, b) => compareFerragensByNome(a.nome, b.nome)),
        otimizacao: itemResultado.resultado.cortes.map((corte) => ({
          id: `${itemResultado.itemId}-${corte.perfilNome}-${corte.comprimentoBarra}`,
          perfilCodigo: perfisDB.find((perfil) => perfil.nome === corte.perfilNome)?.codigo || "-",
          perfilNome: corte.perfilNome,
          comprimentoBarra: corte.comprimentoBarra,
          qtdBarras: corte.qtdBarras,
          cortes: corte.cortes,
          aproveitamento: corte.aproveitamento,
          desperdicioMm: corte.desperdicioMm,
          total: corte.precoTotal,
          barras: corte.barras,
        })),
      }
    })
  }, [ferragensDB, formatarResumoVariacaoSelecionada, nomesVariacaoPersonalizados, perfisDB, resultados])

  const dadosOrcamentoComercial = useMemo(() => {
    const totalPerfisOriginalBarra = resultados.reduce((acc, resultadoProjeto) => {
      return acc + resultadoProjeto.resultado.precoPerfis
    }, 0)

    const fatorOtimGlobalPerfis = totalPerfisOriginalBarra > 0
      ? (otimizacaoGlobalPerfis.resumo.precoOtimizado / totalPerfisOriginalBarra)
      : 1

    const totalPerfisPorProjeto = resultados.reduce<Record<string, number>>((acc, resultadoProjeto) => {
      const projetoId = resultadoProjeto.projeto?.id || resultadoProjeto.itemId
      acc[projetoId] = resultadoProjeto.resultado.precoPerfis * fatorOtimGlobalPerfis
      return acc
    }, {})

    const itens: ItemPreviewOrcamento[] = resultados.map((resultadoProjeto) => {
      const projetoId = resultadoProjeto.projeto?.id || resultadoProjeto.itemId
      const vaoProjeto = `${resultadoProjeto.larguraProjeto}x${resultadoProjeto.alturaProjeto} mm`
      const corVidroProjeto = [resultadoProjeto.vidro?.nome, resultadoProjeto.vidro?.espessura].filter(Boolean).join(" · ") || "-"
      const variacaoProjeto = formatarResumoVariacaoSelecionada(resultadoProjeto.variacaoDrawing, resultadoProjeto.variacaoTecnica)
      const totalProjeto =
        resultadoProjeto.resultado.totalVidro +
        resultadoProjeto.resultado.precoKit +
        resultadoProjeto.resultado.precoFerragens +
        (totalPerfisPorProjeto[projetoId] || 0)

      return {
        id: `orc-${resultadoProjeto.itemId}`,
        descricao: `${resultadoProjeto.projeto?.nome || "Projeto"}${variacaoProjeto ? ` (${variacaoProjeto})` : ""}`,
        desenhoUrl: resultadoProjeto.desenhoProjeto ? `/desenhos/${resultadoProjeto.desenhoProjeto}` : undefined,
        tipo: resultadoProjeto.resultado.usouKit ? "Modo Kit" : "Modo Barra",
        especificacaoDesenho: resultadoProjeto.desenhoProjeto
          ? (nomesVariacaoPersonalizados[resultadoProjeto.desenhoProjeto]?.trim() || formatarLabelVariacaoArquivo(resultadoProjeto.desenhoProjeto))
          : undefined,
        trilhoLabel: resultadoProjeto.variacaoTrilho ? formatarLabelTrilho(resultadoProjeto.variacaoTrilho) : undefined,
        medidaReal: vaoProjeto,
        medidaCalc: vaoProjeto,
        qtd: resultadoProjeto.qtdProjeto,
        total: totalProjeto,
        acabamento: resultadoProjeto.corMaterial || undefined,
        vao: vaoProjeto,
        corVidro: corVidroProjeto,
        valorUnitario: resultadoProjeto.qtdProjeto > 0 ? totalProjeto / resultadoProjeto.qtdProjeto : totalProjeto,
        servicos: [
          resultadoProjeto.resultado.usouKit
            ? "Estrutura calculada por kit"
            : "Estrutura calculada por barra com otimização global",
          resultadoProjeto.usandoPrecoEspecialVidro ? "Preço especial de vidro aplicado" : "Preço padrão de vidro",
        ].join(" · "),
      }
    })

    return {
      itens,
      metragemTotal: resultados.reduce((acc, resultadoProjeto) => {
        const areaProjeto = resultadoProjeto.resultado.folhas.reduce((s, folha) => s + folha.area, 0)
        return acc + (areaProjeto * resultadoProjeto.qtdProjeto)
      }, 0),
      totalPecas: resultados.reduce((acc, resultadoProjeto) => acc + resultadoProjeto.qtdProjeto, 0),
    }
  }, [
    formatarResumoVariacaoSelecionada,
    nomesVariacaoPersonalizados,
    otimizacaoGlobalPerfis.resumo.precoOtimizado,
    resultados,
  ])

  const executarCalculoTodos = () => {
    if (!clienteId) {
      setModalAviso({ titulo: "Atenção", mensagem: "Selecione primeiro o cliente deste cálculo.", tipo: "aviso" })
      return
    }

    const novosResultados: ResultadoProjetoCalculado[] = []

    for (let index = 0; index < itensCalculo.length; index += 1) {
      const item = itensCalculo[index]
      const projeto = getProjeto(item)
      const detalhe = getDetalhe(item)
      const vidro = getVidro(item)

      if (!item.projetoId || !projeto) {
        setModalAviso({ titulo: "Atenção", mensagem: `Selecione o projeto do item ${index + 1}.`, tipo: "aviso" })
        return
      }

      if (!detalhe) {
        setModalAviso({ titulo: "Atenção", mensagem: `O projeto ${projeto.nome} ainda está carregando. Aguarde e tente novamente.`, tipo: "aviso" })
        return
      }

      if (!item.largura || !item.altura) {
        setModalAviso({ titulo: "Atenção", mensagem: `Informe largura e altura do projeto ${projeto.nome}.`, tipo: "aviso" })
        return
      }

      if (!item.vidroId || !vidro) {
        setModalAviso({ titulo: "Atenção", mensagem: `Selecione o vidro do projeto ${projeto.nome}.`, tipo: "aviso" })
        return
      }

      const precoVidroM2Aplicado = getPrecoVidroM2(item)
      const variacaoTecnica = montarVariacaoTecnica({
        altura: item.variacaoAltura,
        kit: item.variacaoKit,
      })
      const textoProjeto = `${projeto.nome} ${projeto.categoria} ${projeto.desenho}`.toLowerCase()
      const projetoEhPorta = /porta|deslizante|pma|giro|pivotante|maxim|basculante/.test(textoProjeto)

      const variacaoDrawingAtiva = String(item.variacaoDrawing || projeto.desenho || "").trim()

      const resultado = calcularProjeto({
        detalhe,
        largura: Number(item.largura),
        altura: Number(item.altura),
        largura2: Number(item.largura2 || 0),
        altura2: Number(item.altura2 || 0),
        vidroSelecionado: vidro,
        precoVidroM2: precoVidroM2Aplicado,
        corMaterial: item.corMaterial,
        modoCalculo: item.modoCalculo,
        variacaoDrawing: variacaoDrawingAtiva,
        variacaoTecnica,
        variacaoTrilho: item.variacaoTrilho,
        projetoEhPorta,
        kitsDB,
        ferragensDB,
        perfisDB,
        qtd: Math.max(1, Number(item.qtd || 1)),
      })

      novosResultados.push({
        itemId: item.id,
        projeto,
        desenhoProjeto: (variacaoDrawingAtiva && ehVariacaoDeDesenho(variacaoDrawingAtiva)
          ? variacaoDrawingAtiva
          : projeto.desenho || "").trim() || null,
        variacaoDrawing: variacaoDrawingAtiva,
        variacaoTecnica,
        variacaoTrilho: item.variacaoTrilho,
        vidro,
        qtdProjeto: Math.max(1, Number(item.qtd || 1)),
        larguraProjeto: Number(item.largura),
        alturaProjeto: Number(item.altura),
        corMaterial: item.corMaterial,
        usandoPrecoEspecialVidro: getUsandoPrecoEspecial(item),
        precoVidroM2Aplicado,
        resultado,
      })
    }

    setResultados(novosResultados)
    setAbaResultados("resumo")

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        rolarParaResultados()
      })
    }
  }

  const calcularTodos = () => {
    confirmarProjetoSemKitNoCalculo(executarCalculoTodos)
  }

  const salvarComposicaoComoOrcamento = async () => {
    if (!empresaId) {
      setModalAviso({ titulo: "Atenção", mensagem: "Empresa não identificada para salvar o orçamento.", tipo: "aviso" })
      return
    }

    if (!clienteSel) {
      setModalAviso({ titulo: "Atenção", mensagem: "Selecione o cliente antes de salvar.", tipo: "aviso" })
      return
    }

    if (resultados.length === 0) {
      setModalAviso({ titulo: "Atenção", mensagem: "Calcule os projetos antes de salvar o orçamento.", tipo: "aviso" })
      return
    }

    setSalvandoOrcamento(true)
    try {
      let numeroFinal = numeroOrcamentoEdicao || ""
      if (!editId) {
        const dataAtual = new Date()
        const prefixoData = `ORC${dataAtual.getFullYear().toString().slice(-2)}${(dataAtual.getMonth() + 1).toString().padStart(2, "0")}`
        const { data: ultimos } = await supabase
          .from("orcamentos")
          .select("numero_formatado")
          .like("numero_formatado", `${prefixoData}%`)
          .order("numero_formatado", { ascending: false })
          .limit(1)

        let seq = 1
        if (ultimos && ultimos.length > 0) {
          seq = parseInt(String(ultimos[0].numero_formatado || "").slice(-2), 10) + 1
        }
        numeroFinal = `${prefixoData}${seq.toString().padStart(2, "0")}`
      }

      const itensTempera = dadosOrcamentoComercial.itens.map((item) => ({
        id: item.id,
        descricao: item.descricao,
        desenhoUrl: item.desenhoUrl,
        corVidro: item.corVidro,
        vao: item.vao,
        qtd: item.qtd,
      }))

      const itensPersistidos = {
        tipo: "calculoprojeto",
        comercial: {
          itens: dadosOrcamentoComercial.itens,
          metragemTotal: Number(dadosOrcamentoComercial.metragemTotal || 0),
          totalPecas: Number(dadosOrcamentoComercial.totalPecas || 0),
        },
        tecnico: {
          relatorioObra,
          otimizacaoGlobal: otimizacaoGlobalParaPDF,
        },
        tempera: {
          itens: itensTempera,
        },
        draft: {
          clienteId,
          obraReferencia,
          itensCalculo,
        },
      }

      const payload = {
        numero_formatado: numeroFinal,
        cliente_nome: clienteSel.nome,
        obra_referencia: obraReferencia.trim() || "Composição de Projetos",
        itens: itensPersistidos,
        valor_total: Number(totaisCalculados.totalGeral || 0),
        empresa_id: empresaId,
        metragem_total: Number(dadosOrcamentoComercial.metragemTotal || 0),
        peso_total: 0,
        theme_color: theme.menuIconColor || "#1e3a5a",
      }

      let orcamentoSalvoId: string | null = editId

      if (editId) {
        const { error } = await supabase
          .from("orcamentos")
          .update(payload)
          .eq("id", editId)
          .eq("empresa_id", empresaId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("orcamentos")
          .insert([payload])
          .select("id")
          .single()

        if (error) throw error
        orcamentoSalvoId = data?.id || null
      }

      const chaveRascunho = getChaveRascunho()
      if (chaveRascunho && typeof window !== "undefined") {
        window.localStorage.removeItem(chaveRascunho)
      }

      const destino = returnTo || "/admin/relatorio.orcamento"
      const query = orcamentoSalvoId ? `?highlight=${encodeURIComponent(String(orcamentoSalvoId))}` : ""
      router.push(`${destino}${query}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido"
      setModalAviso({ titulo: "Erro ao salvar", mensagem: `Não foi possível salvar o orçamento. ${message}`, tipo: "erro" })
    } finally {
      setSalvandoOrcamento(false)
    }
  }

  const documentoPreviewOrcamento = (
    <CalculoVidroPDF
      itens={dadosOrcamentoComercial.itens}
      nomeEmpresa={nomeEmpresa}
      logoUrl={theme.logoLightUrl ?? null}
      nomeCliente={clienteSel?.nome || "Cliente não selecionado"}
      themeColor={theme.contentTextLightBg}
      textColor={theme.contentTextLightBg}
      nomeObra={obraReferencia || "Composição de Projetos"}
      pesoTotal={0}
      metragemTotal={Number(dadosOrcamentoComercial.metragemTotal || 0)}
      valorTotal={Number(totaisCalculados.totalGeral || 0)}
      totalPecas={Number(dadosOrcamentoComercial.totalPecas || 0)}
      numeroOrcamento="PRÉVIA"
    />
  )

  const documentoPreviewCaderno = (
    <RelatorioObraPDF
      nomeEmpresa={nomeEmpresa}
      logoUrl={theme.logoLightUrl ?? null}
      nomeCliente={clienteSel?.nome || "Cliente não selecionado"}
      nomeObra={obraReferencia || "Composição de Projetos"}
      themeColor={theme.contentTextLightBg}
      relatorioObra={relatorioObra}
      otimizacaoGlobal={otimizacaoGlobalParaPDF}
    />
  )

  const documentoPreviewTempera = (
    <TemperaPDF
      nomeEmpresa={nomeEmpresa}
      logoUrl={theme.logoLightUrl ?? null}
      nomeCliente={clienteSel?.nome || "Cliente nao selecionado"}
      nomeObra={obraReferencia || "Composicao de Projetos"}
      themeColor={theme.contentTextLightBg}
      itens={dadosOrcamentoComercial.itens.map((item) => ({
        id: item.id,
        descricao: item.descricao,
        desenhoUrl: item.desenhoUrl,
        corVidro: item.corVidro,
        especificacaoDesenho: item.especificacaoDesenho,
        trilhoLabel: item.trilhoLabel,
        vao: item.vao,
        qtd: item.qtd,
      }))}
    />
  )

  if (checkingAuth) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: theme.menuBackgroundColor }} />
    </div>
  )

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <ThemeLoader />
      <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido}
        setExpandido={setSidebarExpandido}
      />

      <div className="flex-1 flex flex-col w-full overflow-hidden">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user?.email || ""}
          handleSignOut={handleSignOut}
        />

        {editId && (
          <div className="px-4 md:px-8 pt-4">
            <div className="max-w-7xl mx-auto rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Editando orçamento {numeroOrcamentoEdicao || ""}. Ao salvar, você retorna para o relatório de orçamentos.
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">

          {/* ─── TOPO ─────────────────────────────────────────────────── */}
          <div
            className="relative overflow-hidden rounded-3xl border border-white/40 shadow-xl mb-8 p-6 md:p-8"
            style={{ background: `linear-gradient(120deg, ${theme.menuBackgroundColor}10, #ffffff 40%, ${theme.menuIconColor}10)` }}
          >
            <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full blur-3xl" style={{ backgroundColor: `${theme.menuBackgroundColor}25` }} />
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl shrink-0" style={{ backgroundColor: `${theme.menuIconColor}18`, color: theme.menuIconColor }}>
                <Calculator size={30} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-black text-gray-400">Motor de Cálculo</p>
                <h1 className="text-3xl font-black mt-0.5" style={{ color: theme.contentTextLightBg }}>Calcular Projeto</h1>
                <p className="text-gray-500 text-sm mt-1 max-w-xl">
                  Escolha o cliente uma única vez, monte vários projetos para esse cliente e calcule tudo de uma vez, com vidro por tabela e cor de perfil vinda do cadastro de perfis.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)] gap-6 items-start">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={16} style={{ color: theme.menuIconColor }} />
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">1. Cliente do Cálculo</h2>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] gap-4">
                  <div className="space-y-3">
                    <select
                      value={clienteId}
                      onChange={e => { setClienteId(e.target.value); setResultados([]) }}
                      className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    >
                      <option value="">— Selecione o cliente —</option>
                      {clientesDB.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                      ))}
                    </select>

                    <div className="rounded-2xl border p-3 text-xs font-medium"
                      style={{
                        backgroundColor: clienteSel?.grupo_preco_id ? "#eff6ff" : "#f8fafc",
                        borderColor: clienteSel?.grupo_preco_id ? "#bfdbfe" : "#e5e7eb",
                        color: clienteSel?.grupo_preco_id ? "#1d4ed8" : "#64748b",
                      }}
                    >
                      {clienteSel
                        ? clienteSel.grupo_preco_id
                          ? "Cliente com tabela de vidro vinculada. Todos os projetos abaixo usarão essa tabela antes do preço padrão do vidro."
                          : "Cliente sem tabela vinculada. Todos os projetos usarão o preço padrão do cadastro de vidros."
                        : "Defina primeiro o cliente. O cálculo inteiro será feito para um único cliente por vez."}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Obra / Referência</label>
                    <input
                      type="text"
                      value={obraReferencia}
                      onChange={(e) => setObraReferencia(e.target.value)}
                      placeholder="Ex: Residencial Silva - Torre A"
                      className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                      style={{ color: theme.contentTextLightBg }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Fluxo do Lançamento</p>
                <h2 className="text-lg font-black mt-1" style={{ color: theme.contentTextLightBg }}>Cadastro e resultado no mesmo eixo</h2>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Projetos</p>
                    <p className="text-2xl font-black text-gray-700">{itensCalculo.length}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Calculados</p>
                    <p className="text-2xl font-black text-gray-700">{resultados.length}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={rolarParaProjetos}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    <Plus size={14} /> Continuar Lançamento
                  </button>
                  <button
                    type="button"
                    onClick={rolarParaResultados}
                    disabled={resultados.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                  >
                    <Eye size={14} /> Ver Resultado
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  O lançamento ficou em largura total e o cálculo desce direto para a área de resultado.
                </p>
              </div>
            </div>

            <section ref={secaoProjetosRef} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">2. Itens do Orçamento</p>
                  <p className="text-sm text-gray-500">Monte os itens do orçamento e depois siga para o cálculo e conferência final.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={adicionarProjetoNaFila}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <Plus size={14} /> Adicionar Item
                  </button>
                  <button
                    type="button"
                    onClick={resultados.length > 0 ? rolarParaResultados : calcularTodos}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all"
                    style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                  >
                    {resultados.length > 0 ? <Eye size={14} /> : <Calculator size={14} />}
                    {resultados.length > 0 ? "Ir para Resultado" : "Calcular Itens"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
              {itensCalculo.map((item, index) => {
                const projetoSel = getProjeto(item)
                const detalhe = getDetalhe(item)
                const vidroSel = getVidro(item)
                const coresMaterial = getCoresMaterial(item)
                const variacoesDesenho = getVariacoesDesenhoDisponiveis(item)
                const gruposVariacaoTecnica = getGruposVariacaoTecnica(item)
                const variacaoTecnicaSelecionada = montarVariacaoTecnica({
                  altura: item.variacaoAltura,
                  kit: item.variacaoKit,
                })
                const getNomeVariacao = (value: string, fallback: string) => {
                  const custom = nomesVariacaoPersonalizados[value]
                  return custom && custom.trim() ? custom : fallback
                }
                const desenhoPreview = (item.variacaoDrawing && ehVariacaoDeDesenho(item.variacaoDrawing)
                  ? item.variacaoDrawing
                  : projetoSel?.desenho || "").trim()
                const labelDesenhoPreview = desenhoPreview
                  ? getNomeVariacao(desenhoPreview, formatarLabelVariacaoArquivo(desenhoPreview))
                  : ""
                // Detecção de características do projeto
                const textoProjeto = `${projetoSel?.nome || ""} ${projetoSel?.categoria || ""} ${projetoSel?.desenho || ""}`.toLowerCase()
                const projetoEBox = !!(projetoSel && textoProjeto.includes("box"))
                const projetoEPorta = /porta|deslizante|pma|giro|pivotante|maxim|basculante/.test(textoProjeto)
                const usaL2 = !!(detalhe?.folhas.some(f => /\bL2\b/i.test(f.formula_largura + " " + f.formula_altura)))
                const usaAB = !!(detalhe?.folhas.some(f => /\bAB\b|\bA2\b/i.test(f.formula_largura + " " + f.formula_altura)))
                const kitAxisGroup = GRUPOS_VARIACAO_BOX.find(g => g.key === "kit")!
                const kitTypesDosProjeto = (() => {
                  if (!detalhe || !projetoEBox) return []
                  const valoresKit = new Set(
                    detalhe.kits.flatMap(k =>
                      (k.variacao_restrita || "").split(",").map(s => s.trim()).filter(Boolean)
                    ).filter(v => getEixoVariacaoProjeto(v) === "kit")
                  )
                  return valoresKit.size > 0
                    ? kitAxisGroup.options.filter(o => valoresKit.has(o.value))
                    : kitAxisGroup.options
                })()
                const usandoPrecoEspecialVidro = getUsandoPrecoEspecial(item)
                const precoVidroM2Aplicado = getPrecoVidroM2(item)
                const carregandoDetalhe = item.projetoId ? projetosCarregando.includes(item.projetoId) : false
                return (
                  <div id={`projeto-card-${item.id}`} key={item.id} className="rounded-3xl border border-gray-100 bg-gray-50/60 p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Item {index + 1}</p>
                        <p className="text-sm font-bold text-gray-700">{projetoSel?.nome || "Selecione o projeto base"}</p>
                      </div>
                      {itensCalculo.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerProjetoDaFila(item.id)}
                          className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                          title="Remover projeto"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Projeto Base</label>
                      <select
                        value={item.projetoId}
                        onChange={(e) => atualizarItem(item.id, "projetoId", e.target.value)}
                        className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        <option value="">— Selecione um projeto —</option>
                        {projetos.map((projeto) => (
                          <option key={projeto.id} value={projeto.id}>{projeto.nome}{projeto.categoria ? ` (${projeto.categoria})` : ""}</option>
                        ))}
                      </select>
                    </div>

                    {projetoSel?.desenho && (
                      <div className="flex gap-4 items-center">
                        <div
                          className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 shrink-0"
                          style={{ background: `linear-gradient(140deg, ${theme.menuBackgroundColor}0a, #f8fafc)` }}
                        >
                          <Image src={`/desenhos/${desenhoPreview}`} alt={labelDesenhoPreview || projetoSel.nome} fill className="object-contain p-2" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Item {index + 1}</p>
                          <p className="font-black text-sm" style={{ color: theme.contentTextLightBg }}>{projetoSel.nome}</p>
                          {projetoSel.categoria && <p className="text-xs text-gray-400 mt-0.5">{projetoSel.categoria}</p>}
                          {labelDesenhoPreview && <p className="text-xs text-gray-500 mt-0.5">Modelo: {labelDesenhoPreview}</p>}
                          {detalhe && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">{getQuantidadeFolhasAplicaveis(item)} folha(s)</span>
                              {detalhe.kits.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">{detalhe.kits.length} kit(s)</span>}
                              {detalhe.perfis.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">{detalhe.perfis.length} perfil(is)</span>}
                              {detalhe.ferragens.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">{detalhe.ferragens.length} ferragem(ns)</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {carregandoDetalhe && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.menuBackgroundColor }} />
                        Carregando estrutura do projeto...
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Largura (L) *</label>
                        <input
                          type="number" min={0} placeholder="Ex: 1200"
                          value={item.largura}
                          onChange={(e) => atualizarItem(item.id, "largura", e.target.value)}
                          className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                          style={{ color: theme.contentTextLightBg }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Altura (A) *</label>
                        <input
                          type="number" min={0} placeholder="Ex: 1500"
                          value={item.altura}
                          onChange={(e) => atualizarItem(item.id, "altura", e.target.value)}
                          className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                          style={{ color: theme.contentTextLightBg }}
                        />
                      </div>
                      {usaL2 && (
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Largura 2 (L2)</label>
                          <input
                            type="number" min={0} placeholder="Canto/Lado B"
                            value={item.largura2}
                            onChange={(e) => atualizarItem(item.id, "largura2", e.target.value)}
                            className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                          />
                        </div>
                      )}
                      {usaAB && (
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Alt. Bandeira (AB)</label>
                          <input
                            type="number" min={0} placeholder="Bandeira/A2"
                            value={item.altura2}
                            onChange={(e) => atualizarItem(item.id, "altura2", e.target.value)}
                            className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Quantidade do Item</label>
                        <input
                          type="number" min={1} placeholder="1"
                          value={item.qtd}
                          onChange={(e) => atualizarItem(item.id, "qtd", e.target.value)}
                          className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Vidro do Cadastro *</label>
                      <select
                        value={item.vidroId}
                        onChange={(e) => atualizarItem(item.id, "vidroId", e.target.value)}
                        className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                        style={{ color: theme.contentTextLightBg }}
                      >
                        <option value="">— Selecione o vidro —</option>
                        {vidrosDB.map((vidro) => (
                          <option key={vidro.id} value={vidro.id}>{vidro.nome} {vidro.espessura ? `· ${vidro.espessura}` : ""}{vidro.tipo ? ` · ${vidro.tipo}` : ""}</option>
                        ))}
                      </select>
                    </div>

                    {vidroSel && (
                      <div className="rounded-2xl border p-3 text-xs font-medium"
                        style={{
                          backgroundColor: usandoPrecoEspecialVidro ? "#ecfdf5" : "#f8fafc",
                          borderColor: usandoPrecoEspecialVidro ? "#a7f3d0" : "#e5e7eb",
                          color: usandoPrecoEspecialVidro ? "#047857" : "#64748b",
                        }}
                      >
                        <strong>Preço do vidro aplicado:</strong> {fmt(precoVidroM2Aplicado)}/m²
                        {usandoPrecoEspecialVidro ? " via tabela do cliente." : " via cadastro padrão do vidro."}
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Cor do Perfil / Material</label>
                      {coresMaterial.length > 0 ? (
                        <select
                          value={item.corMaterial}
                          onChange={(e) => atualizarItem(item.id, "corMaterial", e.target.value)}
                          className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                          style={{ color: theme.contentTextLightBg }}
                        >
                          <option value="">— Selecione a cor do cadastro de perfis —</option>
                          {coresMaterial.map((cor) => <option key={cor} value={cor}>{cor}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nenhuma cor cadastrada nos perfis. Digite manualmente"
                          value={item.corMaterial}
                          onChange={(e) => atualizarItem(item.id, "corMaterial", e.target.value)}
                          className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 block">Modo de Cálculo</label>
                      <div className="flex gap-2">
                        {([
                          { key: "kit", label: "Por Kit", icon: Package },
                          { key: "barra", label: "Por Barra", icon: Scissors },
                        ] as const).map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => atualizarItem(item.id, "modoCalculo", key)}
                            className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-black border-2 transition-all"
                            style={item.modoCalculo === key
                              ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                              : { backgroundColor: "#f9fafb", color: "#6b7280", borderColor: "#e5e7eb" }}
                          >
                            <Icon size={14} /> {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {projetoEPorta && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo de Trilho (Portas)</p>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { key: "", label: "Todos" },
                            { key: "aparente", label: "Aparente" },
                            { key: "interrompido", label: "Interrompido" },
                            { key: "embutido", label: "Embutido" },
                          ] as const).map((opcao) => (
                            <button
                              key={opcao.key || "todos"}
                              type="button"
                              onClick={() => {
                                const novoValor = item.variacaoTrilho === opcao.key ? "" : opcao.key
                                atualizarItem(item.id, "variacaoTrilho", novoValor)
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-black border-2 transition-all"
                              style={item.variacaoTrilho === opcao.key
                                ? { backgroundColor: "#374151", color: "#fff", borderColor: "#374151" }
                                : { backgroundColor: "#f3f4f6", color: "#6b7280", borderColor: "#d1d5db" }}
                            >
                              {opcao.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Essa escolha filtra apenas as folhas de porta configuradas com esse tipo de trilho no cadastro.
                        </p>
                      </div>
                    )}

                    {/* Tipo de Box + Kit — exclusivo para projetos Box */}
                    {projetoEBox && (() => {
                      const gruposBox = gruposVariacaoTecnica.filter(g => g.key === "altura" || g.key === "kit")
                      const alturaGroup = gruposBox.find(g => g.key === "altura")
                      const mostrarKit = kitTypesDosProjeto.length > 0
                      if (!alturaGroup && !mostrarKit) return null
                      return (
                        <div className="rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: theme.menuBackgroundColor + "33", backgroundColor: theme.menuBackgroundColor + "08" }}>
                          {alturaGroup && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.menuBackgroundColor }}>Tipo de Box</p>
                              <div className="flex flex-wrap gap-2">
                                {alturaGroup.options.map((opcao) => (
                                  <button
                                    key={opcao.value}
                                    type="button"
                                    onClick={() => atualizarItem(item.id, "variacaoAltura", item.variacaoAltura === opcao.value ? "" : opcao.value)}
                                    className="px-3 py-2 rounded-xl text-xs font-black border-2 transition-all"
                                    style={item.variacaoAltura === opcao.value
                                      ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                                      : { backgroundColor: "#f9fafb", color: "#6b7280", borderColor: "#e5e7eb" }}
                                  >
                                    {getNomeVariacao(opcao.value, opcao.label)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {mostrarKit && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.menuBackgroundColor }}>Tipo de Kit</p>
                              <div className="flex flex-wrap gap-2">
                                {kitTypesDosProjeto.map((opcao) => (
                                  <button
                                    key={opcao.value}
                                    type="button"
                                    onClick={() => atualizarItem(item.id, "variacaoKit", item.variacaoKit === opcao.value ? "" : opcao.value)}
                                    className="px-3 py-2 rounded-xl text-xs font-black border-2 transition-all"
                                    style={item.variacaoKit === opcao.value
                                      ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                                      : { backgroundColor: "#f9fafb", color: "#6b7280", borderColor: "#e5e7eb" }}
                                  >
                                    {getNomeVariacao(opcao.value, opcao.label)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {(item.variacaoAltura || item.variacaoKit) && (
                            <p className="text-[11px] font-bold" style={{ color: theme.menuBackgroundColor }}>
                              {[
                                item.variacaoAltura && (() => {
                                  const opc = alturaGroup?.options.find(o => o.value === item.variacaoAltura)
                                  return opc ? getNomeVariacao(opc.value, opc.label) : null
                                })(),
                                item.variacaoKit && (() => {
                                  const opc = kitAxisGroup.options.find(o => o.value === item.variacaoKit)
                                  return opc ? getNomeVariacao(opc.value, opc.label) : null
                                })(),
                              ].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    {/* Variação Técnica — eixos não tratados pelo bloco box */}
                    {gruposVariacaoTecnica.filter(g => !(projetoEBox && (g.key === "kit" || g.key === "altura"))).length > 0 && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Variação Técnica</p>
                        {gruposVariacaoTecnica.filter(g => !(projetoEBox && (g.key === "kit" || g.key === "altura"))).map((grupo) => {
                          const campo = grupo.key === "altura" ? "variacaoAltura" : "variacaoKit"
                          const valorSelecionado = item[campo]

                          return (
                            <div key={grupo.key} className="space-y-2">
                              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{grupo.label}</p>
                              <div className="flex flex-wrap gap-2">
                                {grupo.options.map((opcao) => (
                                  <button
                                    key={opcao.value}
                                    type="button"
                                    onClick={() => atualizarItem(item.id, campo, opcao.value)}
                                    className="px-3 py-2 rounded-xl text-xs font-black border-2 transition-all"
                                    style={valorSelecionado === opcao.value
                                      ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                                      : { backgroundColor: "#f3f4f6", color: "#6b7280", borderColor: "#d1d5db" }}
                                  >
                                    {opcao.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                        {variacaoTecnicaSelecionada && !projetoEBox && (
                          <p className="text-[11px] font-bold text-violet-700">
                            Seleção ativa: {formatarVariacaoTecnica(variacaoTecnicaSelecionada)}
                          </p>
                        )}
                      </div>
                    )}

                    {variacoesDesenho.length > 1 && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Qual Tipologia Deste Projeto?</p>
                        {variacoesDesenho.length > 1 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            <button
                              type="button"
                              onClick={() => atualizarItem(item.id, "variacaoDrawing", "")}
                              className="px-3 py-2 rounded-xl text-xs font-black border-2 transition-all"
                              style={!item.variacaoDrawing
                                ? { backgroundColor: "#374151", color: "#fff", borderColor: "#374151" }
                                : { backgroundColor: "#f3f4f6", color: "#6b7280", borderColor: "#d1d5db" }}
                            >
                              Padrão do projeto
                            </button>
                            {variacoesDesenho.map((variacao) => (
                              <button
                                key={variacao.arquivo}
                                type="button"
                                onClick={() => atualizarItem(item.id, "variacaoDrawing", variacao.arquivo)}
                                className="px-3 py-2 rounded-xl text-xs font-black border-2 transition-all truncate max-w-40"
                                style={item.variacaoDrawing === variacao.arquivo
                                  ? { backgroundColor: "#374151", color: "#fff", borderColor: "#374151" }
                                  : { backgroundColor: "#f3f4f6", color: "#6b7280", borderColor: "#d1d5db" }}
                                title={variacao.arquivo}
                              >
                                {getNomeVariacao(variacao.arquivo, variacao.label)}
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-gray-400">
                          Ao escolher uma opção, o desenho acima muda para acompanhar o modelo selecionado.
                        </p>

                      </div>
                    )}
                  </div>
                )
              })}
              </div>

              <div className="sticky bottom-4 z-10 rounded-3xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl p-4">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ações do Motor</p>
                    <p className="text-sm text-gray-500">Você pode lançar mais projetos aqui embaixo, calcular e seguir direto para o resultado.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex gap-3">
                    <button
                      type="button"
                      onClick={adicionarProjetoNaFila}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <Plus size={16} />
                      Adicionar Item
                    </button>

                    <button
                      type="button"
                      onClick={calcularTodos}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black shadow-lg hover:opacity-90 active:scale-95 transition-all"
                      style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                    >
                      <Calculator size={16} />
                      Calcular Todos os Projetos
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoPreviewPdf("comercial")
                        setMostrarPreviewOrcamento(true)
                      }}
                      disabled={resultados.length === 0}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#ffffff", color: theme.menuBackgroundColor, border: `1px solid ${theme.menuBackgroundColor}22` }}
                    >
                      <Eye size={16} />
                      Ver / Imprimir
                    </button>

                    <button
                      type="button"
                      onClick={salvarComposicaoComoOrcamento}
                      disabled={salvandoOrcamento || resultados.length === 0}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#0f766e", color: "#ffffff" }}
                    >
                      {salvandoOrcamento
                        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <Save size={16} />
                      }
                      Salvar Orçamento
                    </button>

                    <button
                      type="button"
                      onClick={rolarParaResultados}
                      disabled={resultados.length === 0}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black border border-gray-200 bg-gray-50 text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye size={16} />
                      Ir para Resultado
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section ref={secaoResultadosRef} className="space-y-5">

              {resultados.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
                    <Calculator size={36} className="text-gray-300" />
                  </div>
                  <p className="font-bold text-gray-400">Escolha o cliente e monte a lista de projetos</p>
                  <p className="text-gray-300 text-sm mt-1">Quando calcular, a tela desce sozinha para esta área</p>
                </div>
              )}

              {resultados.length > 0 && (
                <>
                  {/* ── Barra de Abas ── */}
                  <div className="flex items-center gap-2 px-6 py-4 rounded-3xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
                    {[
                      { id: "resumo", label: "Resumo Geral", count: null },
                      { id: "caderno", label: "Caderno Técnico", count: null },
                      { id: "otimizacao", label: "Otimização", count: otimizacaoGlobalPerfis.grupos.length > 0 ? otimizacaoGlobalPerfis.grupos.length : 0 },
                    ].map((aba) => (
                      <button
                        key={aba.id}
                        onClick={() => setAbaResultados(aba.id as "resumo" | "caderno" | "otimizacao")}
                        className="px-4 py-2 rounded-2xl text-sm font-black whitespace-nowrap transition-all border-2"
                        style={abaResultados === aba.id
                          ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                          : { backgroundColor: "#f9fafb", color: "#6b7280", borderColor: "#e5e7eb" }}
                      >
                        {aba.label}
                        {aba.count !== null && aba.count > 0 && <span className="ml-1 text-xs opacity-70">({aba.count})</span>}
                      </button>
                    ))}
                  </div>

                  {/* ABA: RESUMO */}
                  {abaResultados === "resumo" && (
                  <div
                    className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${theme.menuBackgroundColor}, ${theme.menuIconColor})` }}
                  >
                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                    <p className="text-[11px] uppercase tracking-widest font-black opacity-70 mb-1">Resumo Geral do Orçamento</p>
                    <p className="text-4xl font-black">{fmt(totaisCalculados.totalGeral)}</p>
                    <p className="text-sm opacity-70 mt-1">
                      Cliente: {clienteSel?.nome || "—"} · {resultados.length} item(ns) no orçamento
                    </p>
                    {totaisCalculados.economiaTotal > 0 && (
                      <p className="text-xs opacity-80 mt-2">
                        Total original: {fmt(totaisCalculados.totalGeralOriginal)} · economia consolidada: {fmt(totaisCalculados.economiaTotal)}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
                      {[
                        { label: "Vidros", valor: totaisCalculados.totalVidro, detalhe: "" },
                        {
                          label: "Kits",
                          valor: totaisCalculados.totalKits,
                          detalhe: totaisCalculados.totalKits > 0 ? "itens em modo kit" : "sem kits",
                        },
                        {
                          label: "Perfis",
                          valor: totaisCalculados.totalPerfis,
                          detalhe: "otimizado por projeto",
                        },
                        { label: "Ferragens", valor: totaisCalculados.totalFerragens, detalhe: "" },
                        { label: "Total", valor: totaisCalculados.totalGeral, detalhe: "com otimização de perfis" },
                      ].map(({ label, valor, detalhe }) => (
                        <div key={label} className="bg-white/15 rounded-2xl p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                          <p className="text-lg font-black">{fmt(valor)}</p>
                          {detalhe && <p className="text-[10px] opacity-70 mt-1">{detalhe}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* ABA: RELATÓRIO */}
                  {abaResultados === "caderno" && (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Caderno Técnico da Obra</p>
                        <h3 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>Vidros, materiais e perfis do orçamento</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Quadro consolidado para conferência da obra antes de salvar ou imprimir o orçamento.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {relatorioObra.map((obra, index) => (
                        <div key={obra.itemId} className="rounded-2xl border border-gray-100 overflow-hidden">
                          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Item {index + 1}</p>
                              <h4 className="text-base font-black text-gray-800">{obra.projetoNome}</h4>
                            </div>
                            <div className="flex flex-wrap justify-end gap-1.5 text-[10px] font-bold">
                              <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Vão {obra.vao}</span>
                              <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Qtd {obra.quantidade}</span>
                              <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600">{obra.vidro}</span>
                              <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600">{obra.corMaterial}</span>
                              <span className={`px-2 py-1 rounded-lg ${obra.modoCalculo === "Kit" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{obra.modoCalculo}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
                            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Tamanhos dos Vidros</p>
                              <div className="space-y-2">
                                {obra.folhas.map((folha) => (
                                  <div key={folha.id} className="rounded-xl bg-white border border-gray-100 px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-sm font-black text-gray-700">{folha.titulo}</p>
                                      <p className="text-sm font-black text-gray-700">{fmt(folha.total)}</p>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">Vão calculado: {folha.medida}</p>
                                    <p className="text-[11px] text-gray-400 mt-1">Quantidade: {folha.quantidadeFolhas * obra.quantidade} · Área: {folha.area.toFixed(3)} m²</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Estrutura / Ferragens</p>
                                <div className="space-y-2 text-sm text-gray-700">
                                  <p><span className="font-black">Modo:</span> {obra.modoCalculo}</p>
                                  {obra.kitNome && <p><span className="font-black">Kit:</span> {obra.kitNome}</p>}
                                  <p><span className="font-black">Perfis:</span> {obra.perfis.length > 0 ? obra.perfis.join(" · ") : "Sem perfis"}</p>
                                  <p><span className="font-black">Subtotal:</span> {fmt(obra.subtotal)}</p>
                                </div>
                                {obra.ferragens.length > 0 && (
                                  <div className="mt-3 space-y-1">
                                    {obra.ferragens.map((ferragem) => (
                                      <p key={ferragem.id} className="text-xs text-gray-600">
                                        {(ferragem.codigo ? `${ferragem.codigo} | ` : "") + ferragem.nome}: {ferragem.qtd} un
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* ABA: OTIMIZAÇÃO */}
                  {abaResultados === "otimizacao" && (
                  <>
                  {otimizacaoGlobalPerfis.grupos.length > 0 && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Perfis Consolidados</p>
                          <h3 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>Otimização de Perfis por Item</h3>
                          <p className="text-xs text-gray-400 mt-1">
                            Consolida medidas do mesmo item para aproveitar barras antes de definir a compra final.
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Economia Potencial</p>
                          <p className="text-2xl font-black" style={{ color: theme.menuBackgroundColor }}>{fmt(otimizacaoGlobalPerfis.economiaValor)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "Barras Individuais", valor: String(otimizacaoGlobalPerfis.resumo.barrasOriginais) },
                          { label: "Barras Consolidadas", valor: String(otimizacaoGlobalPerfis.resumo.barrasOtimizadas) },
                          { label: "Valor Individual", valor: fmt(otimizacaoGlobalPerfis.resumo.precoOriginal) },
                          { label: "Valor Consolidado", valor: fmt(otimizacaoGlobalPerfis.resumo.precoOtimizado) },
                        ].map(({ label, valor }) => (
                          <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                            <p className="text-lg font-black text-gray-700">{valor}</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        {[...otimizacaoGlobalPerfis.grupos]
                          .sort((a, b) => {
                            const ordemPerfis = comparePerfisByNome(a.perfilNome, b.perfilNome)
                            if (ordemPerfis !== 0) return ordemPerfis
                            const nomeComp = a.perfilNome.localeCompare(b.perfilNome, "pt-BR")
                            if (nomeComp !== 0) return nomeComp
                            return a.projetoNome.localeCompare(b.projetoNome, "pt-BR")
                          })
                          .map((grupo, index) => (
                          <div key={`${grupo.projetoId}-${grupo.perfilNome}-${grupo.corMaterial}-${index}`} className="rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 gap-4">
                              <div>
                                <p className="text-sm font-black text-gray-700">{grupo.projetoNome} · {grupo.perfilNome}</p>
                                <p className="text-xs text-gray-400">
                                  Cor: {grupo.corMaterial} · Barra: {grupo.comprimentoBarra} mm · {grupo.cortes.length} corte(s)
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-gray-700">{fmt(grupo.precoOtimizado)}</p>
                                <p className="text-xs font-bold text-gray-400">
                                  {grupo.qtdBarrasOriginal} barra(s) individual · {grupo.qtdBarrasOtimizada} consolidada(s)
                                </p>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                                <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Aproveitamento {grupo.aproveitamento}%</span>
                                <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Desperdício {grupo.desperdicioMm} mm</span>
                                <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Economia {fmt(Math.max(0, grupo.precoOriginal - grupo.precoOtimizado))}</span>
                              </div>
                              <p className="text-[11px] text-gray-500">
                                Cortes agrupados: {grupo.cortes.join(" · ")} mm
                              </p>
                              <p className="text-[11px] text-gray-500">
                                Origem dos cortes: Largura {grupo.qtdCortesLargura} · Altura {grupo.qtdCortesAltura} · Outros {grupo.qtdCortesOutros}
                              </p>
                              <div className="text-[11px] text-gray-500 space-y-1">
                                <p>Barras consolidadas:</p>
                                {grupo.barras.map((barra) => (
                                  <p key={barra.numero}>
                                    #{barra.numero}: {barra.cortes.join(" · ")} mm
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </>
                  )}
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      <CadastrosAvisoModal
        aviso={modalAviso}
        onClose={() => setModalAviso(null)}
        colors={{
          bg: theme.modalBackgroundColor,
          text: theme.modalTextColor,
          primaryButtonBg: theme.modalButtonBackgroundColor,
          primaryButtonText: theme.modalButtonTextColor,
          success: theme.modalIconSuccessColor,
          error: theme.modalIconErrorColor,
          warning: theme.modalIconWarningColor,
        }}
      />

      {mostrarPreviewOrcamento && (
        <div className="fixed inset-0 z-120 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pré-visualização</p>
                <h3 className="text-sm font-black" style={{ color: theme.contentTextLightBg }}>
                  {tipoPreviewPdf === "comercial"
                    ? "Orçamento comercial sem salvar"
                    : tipoPreviewPdf === "caderno"
                      ? "Caderno técnico da obra"
                      : "Tempera"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <button
                    type="button"
                    onClick={() => setTipoPreviewPdf("comercial")}
                    className="px-3 py-2 rounded-2xl text-xs font-black border transition-all"
                    style={tipoPreviewPdf === "comercial"
                      ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                      : { backgroundColor: "#fff", color: "#64748b", borderColor: "#e5e7eb" }}
                  >
                    Orçamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPreviewPdf("caderno")}
                    className="px-3 py-2 rounded-2xl text-xs font-black border transition-all"
                    style={tipoPreviewPdf === "caderno"
                      ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                      : { backgroundColor: "#fff", color: "#64748b", borderColor: "#e5e7eb" }}
                  >
                    Caderno Técnico
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPreviewPdf("tempera")}
                    className="px-3 py-2 rounded-2xl text-xs font-black border transition-all"
                    style={tipoPreviewPdf === "tempera"
                      ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                      : { backgroundColor: "#fff", color: "#64748b", borderColor: "#e5e7eb" }}
                  >
                    Tempera
                  </button>
                </div>

                <PDFDownloadLink
                  document={tipoPreviewPdf === "comercial" ? documentoPreviewOrcamento : tipoPreviewPdf === "caderno" ? documentoPreviewCaderno : documentoPreviewTempera}
                  fileName={`${tipoPreviewPdf === "comercial" ? "orcamento" : tipoPreviewPdf === "caderno" ? "caderno_tecnico" : "tempera"}_${(clienteSel?.nome || "cliente").toLowerCase().replace(/\s+/g, "_")}.pdf`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
                >
                  {({ loading }) => loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Gerando PDF</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><Printer size={14} /> Baixar PDF</span>
                  )}
                </PDFDownloadLink>

                <button
                  type="button"
                  onClick={() => setMostrarPreviewOrcamento(false)}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 transition-all"
                  title="Fechar preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-200">
              <div className="md:hidden px-4 pt-4 flex items-center gap-2 bg-gray-200">
                <button
                  type="button"
                  onClick={() => setTipoPreviewPdf("comercial")}
                  className="flex-1 px-3 py-2 rounded-2xl text-xs font-black border transition-all"
                  style={tipoPreviewPdf === "comercial"
                    ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                    : { backgroundColor: "#fff", color: "#64748b", borderColor: "#e5e7eb" }}
                >
                  Orçamento
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPreviewPdf("caderno")}
                  className="flex-1 px-3 py-2 rounded-2xl text-xs font-black border transition-all"
                  style={tipoPreviewPdf === "caderno"
                    ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                    : { backgroundColor: "#fff", color: "#64748b", borderColor: "#e5e7eb" }}
                >
                  Caderno Técnico
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPreviewPdf("tempera")}
                  className="flex-1 px-3 py-2 rounded-2xl text-xs font-black border transition-all"
                  style={tipoPreviewPdf === "tempera"
                    ? { backgroundColor: theme.menuBackgroundColor, color: "#fff", borderColor: theme.menuBackgroundColor }
                    : { backgroundColor: "#fff", color: "#64748b", borderColor: "#e5e7eb" }}
                >
                  Tempera
                </button>
              </div>

              <PDFViewer style={{ width: "100%", height: "100%" }}>
                {tipoPreviewPdf === "comercial" ? documentoPreviewOrcamento : tipoPreviewPdf === "caderno" ? documentoPreviewCaderno : documentoPreviewTempera}
              </PDFViewer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
