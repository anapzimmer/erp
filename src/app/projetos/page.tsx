"use client"

import { useState, useEffect, useCallback, useRef, useMemo, type MouseEventHandler } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
import { getOpcoesRestricaoTecnicaBox, GRUPOS_VARIACAO_BOX, isValorEixoAltura, getEixoVariacaoProjeto, ehVariacaoDeDesenho } from "@/utils/variacaoProjeto"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import { compareFerragensByNome, comparePerfisByNome } from "@/utils/ordemTecnica"
import Image from "next/image"
import {
  Plus, X, Trash2, Edit2, Package, Layers, Wrench,
  Save, Grid3x3, FolderOpen, ImageIcon, AlignLeft, Search,
} from "lucide-react"

const CORES_COMUNS = [
  "branco", "preto", "bronze", "inox", "fosco", "polido", "anodizado",
  "natural", "dourado", "cinza", "grafite", "champagne", "cromado",
]

const limparNomeTecnico = (nome?: string | null) => {
  const base = String(nome || "").toLowerCase().trim()
  const semParenteses = base.replace(/\(([^)]*)\)/g, "")
  const partes = semParenteses.split("-").map(p => p.trim()).filter(Boolean)
  const filtradas = partes.filter(p => !CORES_COMUNS.includes(p))
  return (filtradas.join("-") || semParenteses).replace(/\s+/g, " ").trim()
}

// ─── TIPOS ──────────────────────────────────────────────────────────────────
type Projeto = {
  id: string
  nome: string
  categoria: string
  desenho: string
  empresa_id: string
  criado_em: string
}
type TrilhoPorta = "aparente" | "interrompido" | "embutido"

type ProjetoFolha = {
  id?: string
  numero_folha: number
  quantidade_folhas: number
  tipo_folha: string
  formula_largura: string
  formula_altura: string
  observacao: string
  variacao_restrita?: string | null
  trilho_restrito?: string | null
}
type ProjetoKit = {
  id?: string
  kit_id: string
  nome?: string
  espessura_vidro: string
  largura_referencia: number
  altura_referencia: number
  tolerancia_mm: number
  observacao: string
  variacao_restrita?: string | null
}
type ProjetoFerragem = {
  id?: string
  ferragem_id: string
  nome?: string
  quantidade: number
  usar_no_kit: boolean
  usar_no_perfil: boolean
  observacao: string
  variacao_restrita?: string | null
}
type ProjetoPerfil = {
  id?: string
  perfil_id: string
  nome?: string
  qtd_largura: number
  qtd_altura: number
  qtd_outros: number
  tipo_fornecimento: string
  variacao_restrita?: string | null
  espessura_vidro_restrita?: string | null
  condicao?: string | null
  usar_no_kit?: boolean
  altura_max_kit?: number | null
}
type FormData = {
  nome: string
  categoria: string
  desenho: string
  folhas: ProjetoFolha[]
  kits: ProjetoKit[]
  ferragens: ProjetoFerragem[]
  perfis: ProjetoPerfil[]
}

type ProjetoVisualTipo = "aberturas" | "portas" | "janelas" | "box" | "generico"

type KitDBItem = {
  id: string
  nome: string
  largura: number | string | null
  altura: number | string | null
  cores?: string | null
  categoria?: string | null
}

type FerragemDBItem = {
  id: string
  nome: string
  codigo?: string | null
  categoria?: string | null
}

type PerfilDBItem = {
  id: string
  nome: string
  codigo?: string | null
  cores?: string | null
  categoria?: string | null
}

const normalizarBuscaItem = (valor?: string | null) =>
  String(valor || "").toLowerCase().trim()

const formatarRotuloItemTecnico = <T extends { codigo?: string | null; nome?: string | null }>(item: T) =>
  item.codigo ? `${item.codigo} - ${item.nome || ""}` : String(item.nome || "")

const formatarRotuloFerragem = (item: { codigo?: string | null; nome?: string | null }) => {
  const nomeBase = limparNomeTecnico(item.nome) || String(item.nome || "")
  return item.codigo ? `${item.codigo} - ${nomeBase}` : nomeBase
}

const formatarRotuloKit = (item: KitDBItem) => {
  const nomeBase = limparNomeTecnico(item.nome) || item.nome
  const largura = Number(item.largura || 0)
  const altura = Number(item.altura || 0)
  return `${nomeBase} · Ref. ${largura} x ${altura} mm`
}

const filtrarItensTecnicosPorBusca = <T extends { codigo?: string | null; nome?: string | null; categoria?: string | null }>(
  itens: T[],
  busca: string
) => {
  const termo = normalizarBuscaItem(busca)
  if (!termo) return itens

  return itens.filter((item) => {
    const campos = [item.codigo, item.nome, item.categoria]
    return campos.some((campo) => normalizarBuscaItem(campo).includes(termo))
  })
}

const reindexarMapaBusca = (mapa: Record<number, string>, indiceRemovido: number) => {
  const atualizado: Record<number, string> = {}

  Object.entries(mapa).forEach(([chave, valor]) => {
    const indice = Number(chave)
    if (Number.isNaN(indice) || indice === indiceRemovido) return
    atualizado[indice > indiceRemovido ? indice - 1 : indice] = valor
  })

  return atualizado
}

const perfilEhPreto = (perfil: { cores?: string | null; nome?: string | null }) => {
  const cores = normalizarBuscaItem(perfil.cores)
  const nome = normalizarBuscaItem(perfil.nome)
  return cores.includes("preto") || nome.includes("preto")
}

const getChavePerfilProjeto = (perfil?: { codigo?: string | null; nome?: string | null }) => {
  const codigo = normalizarBuscaItem(perfil?.codigo)
  const nomeBase = limparNomeTecnico(perfil?.nome)
  return codigo || nomeBase
}

const deduplicarPerfisPreferindoPreto = <T extends { codigo?: string | null; nome?: string | null; cores?: string | null }>(lista: T[]) => {
  const mapa = new Map<string, T>()

  for (const item of lista) {
    const chave = getChavePerfilProjeto(item)
    if (!chave) continue

    const existente = mapa.get(chave)
    if (!existente) {
      mapa.set(chave, item)
      continue
    }

    const idExistente = Number((existente as { id?: string | number }).id)
    const idAtual = Number((item as { id?: string | number }).id)
    const deveTrocarPorIdMenor = Number.isFinite(idAtual) && (!Number.isFinite(idExistente) || idAtual < idExistente)

    if (deveTrocarPorIdMenor) {
      mapa.set(chave, item)
    }
  }

  return Array.from(mapa.values()).sort((a, b) => comparePerfisByNome(a.nome, b.nome))
}

const ferragemEhBranca = (ferragem?: { cores?: string | null; nome?: string | null }) => {
  const cores = normalizarBuscaItem(ferragem?.cores)
  const nome = normalizarBuscaItem(ferragem?.nome)
  return cores.includes("branco") || nome.includes("branco")
}

const getChaveFerragemProjeto = (ferragem?: { codigo?: string | null; nome?: string | null }) => {
  const nomeBase = limparNomeTecnico(ferragem?.nome)
  const codigo = normalizarBuscaItem(ferragem?.codigo)
  return nomeBase || codigo
}

const deduplicarFerragensPorModelo = <T extends { id?: string | number; codigo?: string | null; nome?: string | null; cores?: string | null }>(lista: T[]) => {
  const mapa = new Map<string, T>()

  for (const item of lista) {
    const chave = getChaveFerragemProjeto(item)
    if (!chave) continue

    const existente = mapa.get(chave)
    if (!existente) {
      mapa.set(chave, item)
      continue
    }

    const itemBranca = ferragemEhBranca(item)
    const existenteBranca = ferragemEhBranca(existente)
    if (itemBranca && !existenteBranca) {
      mapa.set(chave, item)
      continue
    }

    const idExistente = Number(existente.id)
    const idAtual = Number(item.id)
    const deveTrocarPorIdMenor = Number.isFinite(idAtual) && (!Number.isFinite(idExistente) || idAtual < idExistente)

    if (deveTrocarPorIdMenor) {
      mapa.set(chave, item)
    }
  }

  return Array.from(mapa.values()).sort((a, b) => compareFerragensByNome(a.nome, b.nome))
}

const kitEhPreto = (kit: { cores?: string | null; nome?: string | null }) => {
  const cores = normalizarBuscaItem(kit.cores)
  const nome = normalizarBuscaItem(kit.nome)
  return cores.includes("preto") || nome.includes("preto")
}

const deduplicarKitsPorMedidaPreferindoPreto = <T extends { nome?: string | null; largura?: number | string | null; altura?: number | string | null; cores?: string | null }>(lista: T[]) => {
  const mapa = new Map<string, T>()

  for (const item of lista) {
    const chaveNome = limparNomeTecnico(item.nome)
    const largura = Number(item.largura || 0)
    const altura = Number(item.altura || 0)
    const chave = `${chaveNome}|${largura}|${altura}`
    if (!chaveNome && largura === 0 && altura === 0) continue

    const existente = mapa.get(chave)
    if (!existente || (kitEhPreto(item) && !kitEhPreto(existente))) {
      mapa.set(chave, item)
    }
  }

  return Array.from(mapa.values())
}

const VARIACAO_TOKEN = "__VARIACAO__="
const COND_TOKEN = "__COND__="
const USAR_KIT_TOKEN = "__USAR_NO_KIT__="
const ALTURA_MAX_KIT_TOKEN = "__ALTURA_MAX_KIT__="
const TRILHO_TOKEN = "__TRILHO__="
const ESPESSURA_VIDRO_TOKEN = "__ESP_VIDRO__="

const limparTextoComVariacao = (valor?: string | null) =>
  String(valor || "")
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(VARIACAO_TOKEN) && !linha.includes(TRILHO_TOKEN))
    .join("\n")
    .trim()

const limparTextoComCond = (valor?: string | null) =>
  String(valor || "")
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(COND_TOKEN))
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

const aplicarVariacaoNoTexto = (valor: string | null | undefined, variacao: string | null | undefined) => {
  const textoBase = limparTextoComVariacao(valor)
  if (!variacao) return textoBase
  return [textoBase, `${VARIACAO_TOKEN}${variacao}`].filter(Boolean).join("\n")
}

const QTD_FOLHA_TOKEN = "__QTD_FOLHA__="

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

const aplicarTrilhoNoTexto = (valor: string | null | undefined, trilhos: string | null | undefined) => {
  const textoBase = limparTextoComVariacao(valor)
  if (!trilhos) return textoBase
  return [textoBase, `${TRILHO_TOKEN}${trilhos}`].filter(Boolean).join("\n")
}

const aplicarQuantidadeFolhaNoTexto = (valor: string | null | undefined, quantidade: number | null | undefined) => {
  const textoBase = String(valor || "")
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(QTD_FOLHA_TOKEN))
    .join("\n")
    .trim()

  const qtd = Number(quantidade)
  const quantidadeFinal = Number.isFinite(qtd) && qtd > 0 ? Math.round(qtd) : 1
  return [textoBase, `${QTD_FOLHA_TOKEN}${quantidadeFinal}`].filter(Boolean).join("\n")
}

const aplicarCondicaoNoTexto = (valor: string | null | undefined, condicao: string | null | undefined) => {
  const textoBase = limparTextoComCond(valor)
  if (!condicao) return textoBase
  return [textoBase, `${COND_TOKEN}${condicao.trim()}`].filter(Boolean).join("\n")
}

const aplicarUsarNoKitNoTexto = (valor: string | null | undefined, usarNoKit: boolean | null | undefined) => {
  const textoBase = String(valor || "")
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(USAR_KIT_TOKEN))
    .join("\n")
    .trim()

  if (!usarNoKit) return textoBase
  return [textoBase, `${USAR_KIT_TOKEN}1`].filter(Boolean).join("\n")
}

const aplicarAlturaMaxKitNoTexto = (valor: string | null | undefined, alturaMax: number | null | undefined) => {
  const textoBase = String(valor || "")
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(ALTURA_MAX_KIT_TOKEN))
    .join("\n")
    .trim()

  const limite = Number(alturaMax)
  if (!Number.isFinite(limite) || limite <= 0) return textoBase
  return [textoBase, `${ALTURA_MAX_KIT_TOKEN}${Math.round(limite)}`].filter(Boolean).join("\n")
}

const aplicarEspessuraVidroNoTexto = (valor: string | null | undefined, espessura: string | null | undefined) => {
  const textoBase = String(valor || "")
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(ESPESSURA_VIDRO_TOKEN))
    .join("\n")
    .trim()

  const espessuraFinal = String(espessura || "").trim()
  if (!espessuraFinal) return textoBase
  return [textoBase, `${ESPESSURA_VIDRO_TOKEN}${espessuraFinal}`].filter(Boolean).join("\n")
}

type ProjetoDetalheResponse = {
  nome?: string | null
  categoria?: string | null
  desenho?: string | null
  projetos_folhas?: ProjetoFolha[]
  projetos_kits?: Array<ProjetoKit & { kits?: { nome?: string | null } | null }>
  projetos_ferragens?: Array<ProjetoFerragem & { ferragens?: { nome?: string | null } | null }>
  projetos_perfis?: Array<
    ProjetoPerfil & {
      perfis?: { nome?: string | null } | null
      quantidade?: number | null
      qtd_largura?: number | null
      qtd_altura?: number | null
      qtd_outros?: number | null
    }
  >
}

type ProjetoFolhaPersistencia = {
  projeto_id: string
  numero_folha: number
  tipo_folha: string
  formula_largura: string
  formula_altura: string
  observacao: string
}

type ProjetoKitPersistencia = {
  projeto_id: string
  kit_id: string
  espessura_vidro: string
  largura_referencia: number
  altura_referencia: number
  tolerancia_mm: number
  observacao: string
}

type ProjetoFerragemPersistencia = {
  projeto_id: string
  ferragem_id: string
  quantidade: number
  usar_no_kit: boolean
  usar_no_perfil: boolean
  observacao: string
}

type ProjetoPerfilPersistencia = {
  projeto_id: string
  perfil_id: string
  qtd_largura: number
  qtd_altura: number
  qtd_outros: number
  tipo_fornecimento: string
}

type ProjetoRelacionamentosSnapshot = {
  folhas: ProjetoFolhaPersistencia[]
  kits: ProjetoKitPersistencia[]
  ferragens: ProjetoFerragemPersistencia[]
  perfis: ProjetoPerfilPersistencia[]
}

const getMensagemErroSupabase = (error: unknown, contexto: string) => {
  if (error && typeof error === "object" && "message" in error) {
    const mensagem = String((error as { message?: unknown }).message || "")
    if (mensagem) return `${contexto}: ${mensagem}`
  }
  return contexto
}

const limparTextoSimples = (valor?: string | null) => String(valor || "").trim()

const normalizarNumero = (valor: unknown, fallback = 0) => {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : fallback
}

const somarSeDuplicado = (atual: number, proximo: number) => atual + proximo

// ─── CATÁLOGO DE DESENHOS ────────────────────────────────────────────────────
const DESENHOS: Record<string, { label: string; arquivo: string }[]> = {
  "Portas": [
    { label: "Porta 2 Folhas Completo", arquivo: "porta2fls-completo.png" },
    { label: "Porta 2 Folhas Simples", arquivo: "porta2fls-simples.png" },
    { label: "Porta 2 Folhas Puxador", arquivo: "porta2fls-puxador.png" },
    { label: "Porta 2 Folhas Com Trinco", arquivo: "porta2fls-comtrinco.png" },
    { label: "Porta 4 Folhas - T1", arquivo: "porta4fls-completo1.png" },
    { label: "Porta 4 Folhas - T2", arquivo: "porta4fls-completo2.png" },
    { label: "Porta 4 Folhas - T3", arquivo: "porta4fls-completo3.png" },
    { label: "Porta 4 Folhas - T4", arquivo: "porta4fls-completo4.png" },
    { label: "Porta 4 Folhas - T5", arquivo: "porta4fls-completo5.png" },
    { label: "Porta 6 Folhas 4F2M (Completo)", arquivo: "porta6fls-4f2m-completo.png" },
    { label: "Porta 6 Folhas 4F2M (Simples)", arquivo: "porta6fls-4f2m-simples.png" },
    { label: "Porta Bandô 2 Fls (Completa)", arquivo: "portaband2fls-completa.png" },
    { label: "Porta Bandô 2 Fls (Simples)", arquivo: "portaband2fls-simples.png" },
    { label: "Porta Bandô 4 Fls (Completa)", arquivo: "portaband4fls-completa.png" },
    { label: "Porta Bandô 4 Fls (Simples)", arquivo: "portaband4fls-simples.png" },
    { label: "Porta Fora de Vão 1 Fl", arquivo: "portaforavao-1fls.png" },
    { label: "Porta Fora de Vão 1 Fl (Comp)", arquivo: "portaforavao-1flscompleto.png" },
    { label: "Porta Fora de Vão 2 Fls", arquivo: "portaforavao-2fls.png" },
    { label: "Porta Fora de Vão 2 Fls (Comp)", arquivo: "portaforavao-2flscompleto.png" },
    { label: "Porta de Giro 1 Folha", arquivo: "portagiro-1fls.png" },
    { label: "Porta de Giro 1 Folha (Comp)", arquivo: "portagiro-1flscompleto.png" },
    { label: "Porta de Giro 2 Folhas", arquivo: "portagiro-2fls.png" },
    { label: "Porta de Giro 2 Fls (Comp)", arquivo: "portagiro-2flscompleto.png" },
    { label: "Porta de Giro 4 Folhas", arquivo: "portagiro-4fls.png" },
    { label: "Porta de Giro 4 Fls (Comp)", arquivo: "portagiro-4flscompleto.png" },
  ],
  "Janelas": [
    { label: "Janela 2 Fls c/ Trinco BCT", arquivo: "janela-bct-trinco-2fls.png" },
    { label: "Janela 4 Fls c/ Trinco BCT", arquivo: "janela-bct-trinco-4fls.png" },
    { label: "Janela 2 Fls s/ Trinco BCT", arquivo: "janela-bst-trinco-2fls.png" },
    { label: "Janela 4 Fls s/ Trinco BCT", arquivo: "janela-bst-trinco-4fls.png" },
    { label: "Janela 2 Fls c/ Trilho", arquivo: "janela-c-trinco-2fls.png" },
    { label: "Janela 4 Fls c/ Trilho", arquivo: "janela-c-trinco-4fls.png" },
    { label: "Janela 2 Fls s/ Trilho", arquivo: "janela-s-trinco-2fls.png" },
    { label: "Janela 4 Fls s/ Trilho", arquivo: "janela-s-trinco-4fls.png" },
    { label: "Janela Canto c/ Trinco", arquivo: "janela-canto-ct.png" },
    { label: "Janela Canto s/ Trinco", arquivo: "janela-canto-st.png" },
    { label: "Janela Canto 90° c/ Trinco", arquivo: "janela-canto90-ct.png" },
    { label: "Janela Canto 90° s/ Trinco", arquivo: "janela-canto90-st.png" },
  ],
  "Box Banheiro": [
    { label: "Box Padrão", arquivo: "box-padrao.png" },
    { label: "Box Padrão 3 Fls", arquivo: "box-padrao3f.png" },
    { label: "Box Padrão 4 Fls", arquivo: "box-padrao4f.png" },
    { label: "Box Canto 3 Fls", arquivo: "box-canto3f.png" },
    { label: "Box Canto 4 Fls", arquivo: "box-canto4f.png" },
    { label: "Box Puxador Duplo", arquivo: "box-puxadorduplo.png" },
  ],
  "Deslizante": [
    { label: "Desl. 2 Fls CI Completo", arquivo: "deslizante-2fls-ci-completo.png" },
    { label: "Desl. 2 Fls CI Simples", arquivo: "deslizante-2fls-ci-simples.png" },
    { label: "Desl. 2 Fls CS Completo", arquivo: "deslizante-2fls-cs-completo.png" },
    { label: "Desl. 2 Fls CS Simples", arquivo: "deslizante-2fls-cs-simples.png" },
    { label: "Desl. 3 Fls CI Completo", arquivo: "deslizante-3fls-ci-completo.png" },
    { label: "Desl. 3 Fls CI Simples", arquivo: "deslizante-3fls-ci-simples.png" },
    { label: "Desl. 4 Fls CI Completo", arquivo: "deslizante-4fls-ci-completo.png" },
    { label: "Desl. 4 Fls CI Simples", arquivo: "deslizante-4fls-ci-simples.png" },
    { label: "Desl. 5 Fls CI Completo", arquivo: "deslizante-5fls-ci-completo.png" },
    { label: "Desl. 5 Fls CI Simples", arquivo: "deslizante-5fls-ci-simples.png" },
    { label: "Desl. 6 Fls CI Completo", arquivo: "deslizante-6fls-ci-completo.png" },
    { label: "Desl. 6 Fls CI Simples", arquivo: "deslizante-6fls-ci-simples.png" },
  ],
  "PMA": [
    { label: "PMA 2 Fls Completo", arquivo: "pma-2fs-completo.png" },
    { label: "PMA 2 Fls Simples", arquivo: "pma-2fs-simples.png" },
    { label: "PMA 3 Fls Completo", arquivo: "pma-3fs-completo.png" },
    { label: "PMA 3 Fls Simples", arquivo: "pma-3fs-simples.png" },
    { label: "PMA 4 Fls Completo", arquivo: "pma-4fs-completo.png" },
    { label: "PMA 4 Fls Simples", arquivo: "pma-4fs-simples.png" },
    { label: "PMA 5 Fls Completo", arquivo: "pma-5fs-completo.png" },
    { label: "PMA 5 Fls Simples", arquivo: "pma-5fs-simples.png" },
    { label: "PMA 6 Fls Completo", arquivo: "pma-6fs-completo.png" },
    { label: "PMA 6 Fls Simples", arquivo: "pma-6fs-simples.png" },
  ],
  "Fixo": [
    { label: "Fixo 1 Folha", arquivo: "fixo-1folha.png" },
    { label: "Fixo 2 Folhas", arquivo: "fixo-2folhas.png" },
    { label: "Fixo 3 Folhas", arquivo: "fixo-3folhas.png" },
    { label: "Fixo 4 Folhas", arquivo: "fixo-4folhas.png" },
    { label: "Fixo 5 Folhas", arquivo: "fixo-5folhas.png" },
    { label: "Fixo 6 Folhas", arquivo: "fixo-6folhas.png" },
  ],
  "Outros": [
    { label: "Basculante Única", arquivo: "basculate-unica.png" },
    { label: "Maxim-Ar Única", arquivo: "max-unica.png" },
    { label: "Pivotante Única", arquivo: "pivotante-unica.png" },
    { label: "Espelhos", arquivo: "espelhos.png" },
    { label: "Aberturas", arquivo: "aberturas.png" },
    { label: "Sem Imagem", arquivo: "sem-imagem.png" },
  ],
}

const TIPOS_FOLHA = ["Fixo", "Móvel", "Basculante", "Pivotante", "Maxim-Ar"]
const TRILHO_PORTA_OPCOES: Array<{ value: TrilhoPorta; label: string }> = [
  { value: "aparente", label: "Trilho Aparente" },
  { value: "interrompido", label: "Trilho Interrompido" },
  { value: "embutido", label: "Trilho Embutido" },
]

type VariacaoOpcao = {
  key: string
  label: string
  arquivo: string
}

type VariacaoGrupo = {
  id: string
  label: string
  opcoes: VariacaoOpcao[]
}

type VariacaoCustom = {
  id: string
  label: string
  opcoes: Array<{ label: string; arquivo: string }>
}

type VariacaoCustomDraftOpcao = {
  id: string
  label: string
  arquivo: string
}

const ARQUIVOS_DESENHOS = new Set(Object.values(DESENHOS).flat().map((d) => d.arquivo))
const STEMS_DESENHOS = new Set(Array.from(ARQUIVOS_DESENHOS).map((arquivo) => arquivo.replace(/\.png$/i, "")))

const PARES_TRINCO: Array<{ com: string; sem: string }> = [
  { com: "janela-c-trinco-2fls.png", sem: "janela-s-trinco-2fls.png" },
  { com: "janela-c-trinco-4fls.png", sem: "janela-s-trinco-4fls.png" },
  { com: "janela-bct-trinco-2fls.png", sem: "janela-bst-trinco-2fls.png" },
  { com: "janela-bct-trinco-4fls.png", sem: "janela-bst-trinco-4fls.png" },
  { com: "janela-canto-ct.png", sem: "janela-canto-st.png" },
  { com: "janela-canto90-ct.png", sem: "janela-canto90-st.png" },
]

const escapeRegExp = (valor: string) => valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const criarArquivo = (stem: string) => `${stem}.png`

const formatarLabelArquivoDesenho = (arquivo: string) => {
  const nome = String(arquivo || "")
    .replace(/\.(png|jpe?g|webp|gif|svg)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!nome) return arquivo
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

const criarOpcaoVersao = (stem: string): VariacaoOpcao => {
  const nome = stem.split("-").pop() || ""
  const numeroMatch = nome.match(/(\d+)$/)
  const base = nome.replace(/\d+$/, "").toLowerCase()

  if (base === "simples") {
    const sufixo = numeroMatch ? ` ${numeroMatch[1]}` : ""
    return { key: stem, label: `Simples${sufixo}`, arquivo: criarArquivo(stem) }
  }

  if (base === "puxador") {
    const sufixo = numeroMatch ? ` ${numeroMatch[1]}` : ""
    return { key: stem, label: `Puxador${sufixo}`, arquivo: criarArquivo(stem) }
  }

  if (base === "comtrinco") {
    const sufixo = numeroMatch ? ` ${numeroMatch[1]}` : ""
    return { key: stem, label: `Com trinco${sufixo}`, arquivo: criarArquivo(stem) }
  }

  if (base === "completo" || base === "completa") {
    const sufixo = numeroMatch ? ` ${numeroMatch[1]}` : ""
    return { key: stem, label: `Completo${sufixo}`, arquivo: criarArquivo(stem) }
  }

  return { key: stem, label: nome.toUpperCase(), arquivo: criarArquivo(stem) }
}

const getVariacoesDesenho = (arquivoAtual: string, stemsDisponiveis: Set<string> = STEMS_DESENHOS): VariacaoGrupo[] => {
  if (!arquivoAtual) return []

  const variacoes: VariacaoGrupo[] = []
  const stemAtual = arquivoAtual.replace(/\.png$/i, "")

  const parTrinco = PARES_TRINCO.find((par) => par.com === arquivoAtual || par.sem === arquivoAtual)
  if (parTrinco) {
    variacoes.push({
      id: "trinco",
      label: "Trinco",
      opcoes: [
        { key: "sem", label: "Sem trinco", arquivo: parTrinco.sem },
        { key: "com", label: "Com trinco", arquivo: parTrinco.com },
      ],
    })
  }

  if (/-ci(?:-|$)/.test(stemAtual) || /-cs(?:-|$)/.test(stemAtual)) {
    const stemCI = stemAtual.replace(/-cs(?=-|$)/g, "-ci")
    const stemCS = stemAtual.replace(/-ci(?=-|$)/g, "-cs")

    if (stemsDisponiveis.has(stemCI) && stemsDisponiveis.has(stemCS)) {
      variacoes.push({
        id: "sistema",
        label: "Sistema",
        opcoes: [
          { key: "ci", label: "CI", arquivo: criarArquivo(stemCI) },
          { key: "cs", label: "CS", arquivo: criarArquivo(stemCS) },
        ],
      })
    }
  }

  const baseFamilia = stemAtual.replace(/-(simples\d*|puxador\d*|comtrinco\d*|completo\d*|completa\d*)$/, "")
  const regexFamilia = new RegExp(`^${escapeRegExp(baseFamilia)}-(.+)$`)
  const stemsFamilia = Array.from(stemsDisponiveis).filter((stem) => regexFamilia.test(stem))

  if (stemsFamilia.length >= 2) {
    const opcoes = stemsFamilia
      .sort((a, b) => {
        const aNome = a.split("-").pop() || ""
        const bNome = b.split("-").pop() || ""

        const rank = (nome: string) => {
          if (/^simples\d*$/i.test(nome)) return 0
          if (/^puxador\d*$/i.test(nome)) return 1
          if (/^comtrinco\d*$/i.test(nome)) return 2
          if (nome === "completo" || nome === "completa") return 3
          if (/^completo\d+$/.test(nome) || /^completa\d+$/.test(nome)) return 4
          return 5
        }

        const rankA = rank(aNome)
        const rankB = rank(bNome)
        if (rankA !== rankB) return rankA - rankB

        const numA = Number((aNome.match(/(\d+)$/) || ["", "0"])[1])
        const numB = Number((bNome.match(/(\d+)$/) || ["", "0"])[1])
        return numA - numB
      })
      .map((stem) => criarOpcaoVersao(stem))

    variacoes.push({
      id: "versao",
      label: "Versão",
      opcoes,
    })
  }

  return variacoes
}

const FORM_VAZIO: FormData = {
  nome: "",
  categoria: "",
  desenho: "",
  folhas: [],
  kits: [],
  ferragens: [],
  perfis: [],
}

const detectarTipoProjetoVisual = (dados: Pick<FormData, "nome" | "categoria" | "desenho">): ProjetoVisualTipo => {
  const textoProjeto = `${dados.nome} ${dados.categoria} ${dados.desenho}`.toLowerCase()

  if (/abertur/.test(textoProjeto)) return "aberturas"
  if (/janela|maxim|basculante/.test(textoProjeto)) return "janelas"
  if (/porta|deslizante|pma|giro|pivotante/.test(textoProjeto)) return "portas"
  if (/box/.test(textoProjeto)) return "box"
  return "generico"
}

const getEspessuraPadraoKitPorTipo = (tipo: ProjetoVisualTipo) => {
  if (tipo === "portas") return "10mm"
  if (tipo === "janelas") return "8mm"
  return "8mm"
}

const getPresetFolhaPorTipo = (tipo: ProjetoVisualTipo, numeroFolha: number): Pick<ProjetoFolha, "tipo_folha" | "formula_largura" | "formula_altura" | "observacao"> => {
  if (tipo === "aberturas") {
    return {
      tipo_folha: "Móvel",
      formula_largura: "L / 2 - 5",
      formula_altura: "AB - 10",
      observacao: "Abertura padrão com ajuste de folga lateral e superior.",
    }
  }

  if (tipo === "portas") {
    return {
      tipo_folha: numeroFolha % 2 === 0 ? "Móvel" : "Fixo",
      formula_largura: "L / 2 - 12",
      formula_altura: "A - 45",
      observacao: "Porta deslizante com compensação de trilho e transpasse.",
    }
  }

  if (tipo === "janelas") {
    return {
      tipo_folha: numeroFolha % 2 === 0 ? "Móvel" : "Fixo",
      formula_largura: numeroFolha % 2 === 0 ? "L / 2 + 50" : "L / 2",
      formula_altura: numeroFolha % 2 === 0 ? "A - 20" : "A - 60",
      observacao: "Janela com diferença entre folhas fixas e móveis.",
    }
  }

  if (tipo === "box") {
    return {
      tipo_folha: numeroFolha % 2 === 0 ? "Móvel" : "Fixo",
      formula_largura: numeroFolha % 2 === 0 ? "L / 2 + 50" : "L / 2",
      formula_altura: "A - 40",
      observacao: "Box com folha móvel compensada no transpasse.",
    }
  }

  return {
    tipo_folha: "Fixo",
    formula_largura: "L",
    formula_altura: "A",
    observacao: "",
  }
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ProjetosPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const { user, empresaId, nomeEmpresa, loading: checkingAuth } = useAuth()

  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [sidebarExpandido, setSidebarExpandido] = useState(true)

  // ── Dados ──
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [kitsDB, setKitsDB] = useState<KitDBItem[]>([])
  const [ferragensOriginaisDB, setFerragensOriginaisDB] = useState<FerragemDBItem[]>([])
  const [ferragensDB, setFerragensDB] = useState<FerragemDBItem[]>([])
  const [perfisOriginaisDB, setPerfisOriginaisDB] = useState<PerfilDBItem[]>([])
  const [perfisDB, setPerfisDB] = useState<PerfilDBItem[]>([])
  const [carregando, setCarregando] = useState(true)

  // ── Modal formulário ──
  const [showModal, setShowModal] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<"geral" | "folhas" | "kits" | "ferragens" | "perfis">("geral")
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [buscaKitDisponivel, setBuscaKitDisponivel] = useState("")
  const [kitsSelecionadosParaAdicionar, setKitsSelecionadosParaAdicionar] = useState<string[]>([])
  const [buscaFerragemDisponivel, setBuscaFerragemDisponivel] = useState("")
  const [ferragensSelecionadasParaAdicionar, setFerragensSelecionadasParaAdicionar] = useState<string[]>([])
  const [buscaPerfilDisponivel, setBuscaPerfilDisponivel] = useState("")
  const [perfisSelecionadosParaAdicionar, setPerfisSelecionadosParaAdicionar] = useState<string[]>([])
  const [buscaFerragemPorLinha, setBuscaFerragemPorLinha] = useState<Record<number, string>>({})
  const [buscaPerfilPorLinha, setBuscaPerfilPorLinha] = useState<Record<number, string>>({})
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [showCloseDraftModal, setShowCloseDraftModal] = useState(false)
  const [nomesVariacaoPersonalizados, setNomesVariacaoPersonalizados] = useState<Record<string, string>>({})
  const [editandoNomesVariacao, setEditandoNomesVariacao] = useState(false)

  // ── Picker de desenho ──
  const [showPicker, setShowPicker] = useState(false)
  const [categoriaPicker, setCategoriaPicker] = useState("Portas")
  const [desenhosPasta, setDesenhosPasta] = useState<string[]>([])
  const [editandoNomesDesenho, setEditandoNomesDesenho] = useState(false)
  const [variacoesCustom, setVariacoesCustom] = useState<VariacaoCustom[]>([])
  const [variacaoCustomSelecionadaId, setVariacaoCustomSelecionadaId] = useState<string | null>(null)
  const [buscaVariacaoCustom, setBuscaVariacaoCustom] = useState("")
  const [novaVariacaoNome, setNovaVariacaoNome] = useState("")
  const [novaVariacaoOpcoes, setNovaVariacaoOpcoes] = useState<VariacaoCustomDraftOpcao[]>([
    { id: "a", label: "Opção A", arquivo: "" },
    { id: "b", label: "Opção B", arquivo: "" },
  ])
  const draftRestauradoRef = useRef<string | null>(null)

  // ── Modal de aviso ──
  const [modalAviso, setModalAviso] = useState<{
    titulo: string
    mensagem: string
    confirmar?: () => void
    tipo?: "sucesso" | "erro" | "aviso"
  } | null>(null)

  const carregarTudo = useCallback(async () => {
    if (!empresaId) return

    setCarregando(true)
    const [resProjetos, resKits, resFerragens, resPerfis] = await Promise.all([
      supabase.from("projetos").select("*").eq("empresa_id", empresaId).order("criado_em", { ascending: false }),
      supabase.from("kits").select("id, nome, largura, altura, cores, categoria").eq("empresa_id", empresaId).order("nome"),
      supabase.from("ferragens").select("id, nome, codigo, categoria").eq("empresa_id", empresaId).order("nome"),
      supabase
        .from("perfis")
        .select("id, nome, codigo, cores, categoria")
        .eq("empresa_id", empresaId)
        .order("codigo", { ascending: true })
        .order("nome", { ascending: true }),
    ])
    if (resProjetos.data) setProjetos(resProjetos.data)
    if (resKits.data) {
      const kitsCarregados = resKits.data as KitDBItem[]
      setKitsDB(deduplicarKitsPorMedidaPreferindoPreto(kitsCarregados))
    }
    if (resFerragens.data) {
      const ferragensCarregadas = resFerragens.data as FerragemDBItem[]
      setFerragensOriginaisDB(ferragensCarregadas)
      setFerragensDB(deduplicarFerragensPorModelo(ferragensCarregadas))
    }
    if (resPerfis.data) {
      const perfisCarregados = resPerfis.data as PerfilDBItem[]
      setPerfisOriginaisDB(perfisCarregados)
      setPerfisDB(deduplicarPerfisPreferindoPreto(perfisCarregados))
    }
    setCarregando(false)
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
    let cancelado = false

    const carregarDesenhosPasta = async () => {
      try {
        const resposta = await fetch("/api/desenhos", { cache: "no-store" })
        const payload = await resposta.json().catch(() => ({ arquivos: [] }))
        const arquivos = Array.isArray(payload?.arquivos)
          ? payload.arquivos.map((arquivo: unknown) => String(arquivo || "").trim()).filter(Boolean)
          : []

        if (!cancelado) setDesenhosPasta(arquivos)
      } catch {
        if (!cancelado) setDesenhosPasta([])
      }
    }

    carregarDesenhosPasta()

    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!empresaId || typeof window === "undefined") return
    const chave = `variacao-box:nomes:${empresaId}`
    window.localStorage.setItem(chave, JSON.stringify(nomesVariacaoPersonalizados))
  }, [empresaId, nomesVariacaoPersonalizados])

  const storageVariacoesKey = `projetos:variacoes-custom:${empresaId || "global"}`
  const draftProjetoKey = `projetos:draft:${empresaId || "sem_empresa"}:${editandoId || "novo"}`

  // ─── EFEITOS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (empresaId) carregarTudo()
  }, [empresaId, carregarTudo])

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(storageVariacoesKey)
      if (!bruto) {
        setVariacoesCustom([])
        return
      }

      const parsed = JSON.parse(bruto) as VariacaoCustom[]
      if (!Array.isArray(parsed)) {
        setVariacoesCustom([])
        return
      }

      const saneadas = parsed
        .filter((item) => item && typeof item.id === "string" && typeof item.label === "string" && Array.isArray(item.opcoes))
        .map((item) => ({
          id: item.id,
          label: item.label,
          opcoes: item.opcoes.filter((op) => op && typeof op.label === "string" && typeof op.arquivo === "string"),
        }))
        .filter((item) => item.opcoes.length >= 2)

      setVariacoesCustom(saneadas)
    } catch {
      setVariacoesCustom([])
    }
  }, [storageVariacoesKey])

  useEffect(() => {
    try {
      window.localStorage.setItem(storageVariacoesKey, JSON.stringify(variacoesCustom))
    } catch {
      // Ignora falha de persistencia para nao quebrar o modal.
    }
  }, [variacoesCustom, storageVariacoesKey])

  useEffect(() => {
    if (!showModal || !empresaId) return
    if (editandoId) {
      draftRestauradoRef.current = draftProjetoKey
      return
    }
    if (draftRestauradoRef.current === draftProjetoKey) return

    try {
      const raw = sessionStorage.getItem(draftProjetoKey)
      if (!raw) {
        draftRestauradoRef.current = draftProjetoKey
        return
      }

      const draft = JSON.parse(raw) as {
        form?: FormData
        editandoId?: string | null
        abaAtiva?: "geral" | "folhas" | "kits" | "ferragens" | "perfis"
        categoriaPicker?: string
        showPicker?: boolean
        variacaoCustomSelecionadaId?: string | null
        novaVariacaoNome?: string
        novaVariacaoOpcoes?: VariacaoCustomDraftOpcao[]
      }

      if (draft.form) setForm(draft.form)
      if (draft.editandoId !== undefined) setEditandoId(draft.editandoId)
      if (draft.abaAtiva) setAbaAtiva(draft.abaAtiva)
      if (draft.categoriaPicker) setCategoriaPicker(draft.categoriaPicker)
      if (typeof draft.showPicker === "boolean") setShowPicker(draft.showPicker)
      if (draft.variacaoCustomSelecionadaId !== undefined) setVariacaoCustomSelecionadaId(draft.variacaoCustomSelecionadaId)
      if (typeof draft.novaVariacaoNome === "string") setNovaVariacaoNome(draft.novaVariacaoNome)
      if (Array.isArray(draft.novaVariacaoOpcoes) && draft.novaVariacaoOpcoes.length > 0) {
        setNovaVariacaoOpcoes(draft.novaVariacaoOpcoes)
      }
    } catch (error) {
      console.error("Erro ao restaurar rascunho de projeto:", error)
    } finally {
      draftRestauradoRef.current = draftProjetoKey
    }
  }, [showModal, empresaId, draftProjetoKey, editandoId])

  useEffect(() => {
    if (!showModal || !empresaId) return
    if (editandoId) return

    const temDadosNoForm =
      !!form.nome.trim() ||
      !!form.categoria.trim() ||
      !!form.desenho ||
      form.folhas.length > 0 ||
      form.kits.length > 0 ||
      form.ferragens.length > 0 ||
      form.perfis.length > 0

    const temDadosVariacao =
      !!novaVariacaoNome.trim() ||
      novaVariacaoOpcoes.some((opcao) => !!opcao.label.trim() || !!opcao.arquivo)

    if (!temDadosNoForm && !temDadosVariacao && !editandoId) {
      sessionStorage.removeItem(draftProjetoKey)
      return
    }

    const payload = {
      form,
      editandoId,
      abaAtiva,
      categoriaPicker,
      showPicker,
      variacaoCustomSelecionadaId,
      novaVariacaoNome,
      novaVariacaoOpcoes,
      updatedAt: Date.now(),
    }

    sessionStorage.setItem(draftProjetoKey, JSON.stringify(payload))
  }, [
    showModal,
    empresaId,
    draftProjetoKey,
    editandoId,
    form,
    abaAtiva,
    categoriaPicker,
    showPicker,
    variacaoCustomSelecionadaId,
    novaVariacaoNome,
    novaVariacaoOpcoes,
  ])

  // ─── ABRIR EDIÇÃO ─────────────────────────────────────────────────────────
  const abrirEdicao = async (projeto: Projeto) => {
    sessionStorage.removeItem(`projetos:draft:${empresaId || "sem_empresa"}:${projeto.id}`)
    draftRestauradoRef.current = null

    const { data } = await supabase
      .from("projetos")
      .select(`*, projetos_folhas(*), projetos_kits(*, kits(nome)), projetos_ferragens(*, ferragens(nome)), projetos_perfis(*, perfis(nome))`)
      .eq("id", projeto.id)
      .single()

    if (!data) return
    const detalhe = data as ProjetoDetalheResponse

    setForm({
      nome: detalhe.nome || "",
      categoria: detalhe.categoria || "",
      desenho: detalhe.desenho || "",
      folhas: (detalhe.projetos_folhas || []).map((folha) => {
        const metaObservacao = extrairVariacaoDoTexto(folha.observacao)
        return {
          ...folha,
          quantidade_folhas: extrairQuantidadeFolhaDoTexto(folha.observacao),
          observacao: metaObservacao.textoLimpo,
          variacao_restrita: metaObservacao.variacao ?? null,
          trilho_restrito: extrairTrilhoDoTexto(folha.observacao),
        }
      }).sort((a, b) => a.numero_folha - b.numero_folha),
      kits: (detalhe.projetos_kits || []).map((k) => {
        const metaObservacao = extrairVariacaoDoTexto(k.observacao)
        return {
          ...k,
          nome: k.kits?.nome || undefined,
          observacao: metaObservacao.textoLimpo,
          variacao_restrita: k.variacao_restrita ?? metaObservacao.variacao ?? null,
        }
      }),
      ferragens: (detalhe.projetos_ferragens || []).map((f) => {
        const metaObservacao = extrairVariacaoDoTexto(f.observacao)
        return {
          ...f,
          nome: f.ferragens?.nome || undefined,
          observacao: metaObservacao.textoLimpo,
          variacao_restrita: f.variacao_restrita ?? metaObservacao.variacao ?? null,
        }
      }).sort((a, b) => compareFerragensByNome(a.nome, b.nome)),
      perfis: (detalhe.projetos_perfis || []).map((p) => {
        return {
          ...p,
          perfil_id: String(p.perfil_id),
          nome: perfisOriginaisDB.find((perfil) => String(perfil.id) === String(p.perfil_id))?.nome || p.perfis?.nome || undefined,
          qtd_largura: Number(p.qtd_largura ?? p.quantidade ?? 0),
          qtd_altura: Number(p.qtd_altura ?? 0),
          qtd_outros: Number(p.qtd_outros ?? 0),
          tipo_fornecimento: extrairVariacaoDoTexto((p as { tipo_fornecimento?: string | null }).tipo_fornecimento || "barra").textoLimpo || "barra",
          variacao_restrita: p.variacao_restrita ?? extrairVariacaoDoTexto((p as { tipo_fornecimento?: string | null }).tipo_fornecimento || "barra").variacao ?? null,
          espessura_vidro_restrita: extrairEspessuraVidroDoTexto((p as { tipo_fornecimento?: string | null }).tipo_fornecimento),
          condicao: extrairCondicaoDoTexto((p as { tipo_fornecimento?: string | null }).tipo_fornecimento),
          usar_no_kit: extrairUsarNoKitDoTexto((p as { tipo_fornecimento?: string | null }).tipo_fornecimento),
          altura_max_kit: extrairAlturaMaxKitDoTexto((p as { tipo_fornecimento?: string | null }).tipo_fornecimento),
        }
      }).sort((a, b) => comparePerfisByNome(a.nome, b.nome)),
    })
    setEditandoId(projeto.id)
    setAbaAtiva("geral")
    setShowModal(true)
  }

  // ─── SALVAR ───────────────────────────────────────────────────────────────
  const carregarSnapshotRelacionamentos = async (projetoId: string): Promise<ProjetoRelacionamentosSnapshot> => {
    const [folhas, kits, ferragens, perfis] = await Promise.all([
      supabase.from("projetos_folhas").select("projeto_id, numero_folha, tipo_folha, formula_largura, formula_altura, observacao").eq("projeto_id", projetoId),
      supabase.from("projetos_kits").select("projeto_id, kit_id, espessura_vidro, largura_referencia, altura_referencia, tolerancia_mm, observacao").eq("projeto_id", projetoId),
      supabase.from("projetos_ferragens").select("projeto_id, ferragem_id, quantidade, usar_no_kit, usar_no_perfil, observacao").eq("projeto_id", projetoId),
      supabase.from("projetos_perfis").select("projeto_id, perfil_id, qtd_largura, qtd_altura, qtd_outros, tipo_fornecimento").eq("projeto_id", projetoId),
    ])

    const erros = [folhas.error, kits.error, ferragens.error, perfis.error].filter(Boolean)
    if (erros.length > 0) {
      throw new Error(getMensagemErroSupabase(erros[0], "Erro ao preparar snapshot do projeto"))
    }

    return {
      folhas: (folhas.data || []) as ProjetoFolhaPersistencia[],
      kits: (kits.data || []) as ProjetoKitPersistencia[],
      ferragens: (ferragens.data || []) as ProjetoFerragemPersistencia[],
      perfis: (perfis.data || []) as ProjetoPerfilPersistencia[],
    }
  }

  const persistirRelacionamentosProjeto = async (payload: ProjetoRelacionamentosSnapshot) => {
    if (payload.folhas.length > 0) {
      const { error: folhasError } = await supabase.from("projetos_folhas").insert(payload.folhas)
      if (folhasError) throw new Error(getMensagemErroSupabase(folhasError, "Erro ao salvar folhas do projeto"))
    }

    if (payload.kits.length > 0) {
      const { error: kitsError } = await supabase.from("projetos_kits").insert(payload.kits)
      if (kitsError) throw new Error(getMensagemErroSupabase(kitsError, "Erro ao salvar kits do projeto"))
    }

    if (payload.ferragens.length > 0) {
      const { error: ferragensError } = await supabase.from("projetos_ferragens").insert(payload.ferragens)
      if (ferragensError) throw new Error(getMensagemErroSupabase(ferragensError, "Erro ao salvar ferragens do projeto"))
    }

    if (payload.perfis.length > 0) {
      const { error: perfisError } = await supabase.from("projetos_perfis").insert(payload.perfis)
      if (perfisError) throw new Error(getMensagemErroSupabase(perfisError, "Erro ao salvar perfis do projeto"))
    }
  }

  const restaurarSnapshotRelacionamentos = async (snapshot: ProjetoRelacionamentosSnapshot) => {
    await persistirRelacionamentosProjeto(snapshot)
  }

  const normalizarPayloadProjeto = (projetoId: string): ProjetoRelacionamentosSnapshot => {
    const folhas = form.folhas
      .map((folha, indice) => ({
        projeto_id: projetoId,
        numero_folha: normalizarNumero(folha.numero_folha, indice + 1) || indice + 1,
        tipo_folha: limparTextoSimples(folha.tipo_folha),
        formula_largura: limparTextoSimples(folha.formula_largura),
        formula_altura: limparTextoSimples(folha.formula_altura),
        observacao: aplicarQuantidadeFolhaNoTexto(
          aplicarTrilhoNoTexto(
            aplicarVariacaoNoTexto(limparTextoSimples(folha.observacao), folha.variacao_restrita),
          folha.trilho_restrito ?? null
          ),
          folha.quantidade_folhas
        ),
      }))
      .filter((folha) => folha.tipo_folha || folha.formula_largura || folha.formula_altura)

    const kitsPorId = new Map<string, ProjetoKitPersistencia>()
    form.kits.forEach((kit) => {
      const kitId = limparTextoSimples(kit.kit_id)
      if (!kitId) return

      kitsPorId.set(kitId, {
        projeto_id: projetoId,
        kit_id: kitId,
        espessura_vidro: limparTextoSimples(kit.espessura_vidro) || getEspessuraPadraoKitPorTipo(detectarTipoProjetoVisual(form)),
        largura_referencia: normalizarNumero(kit.largura_referencia),
        altura_referencia: normalizarNumero(kit.altura_referencia),
        tolerancia_mm: normalizarNumero(kit.tolerancia_mm, 50),
        observacao: aplicarVariacaoNoTexto(limparTextoSimples(kit.observacao), kit.variacao_restrita),
      })
    })

    const ferragensPorId = new Map<string, ProjetoFerragemPersistencia>()
    form.ferragens.forEach((ferragem) => {
      const ferragemId = limparTextoSimples(ferragem.ferragem_id)
      if (!ferragemId) return

      const existente = ferragensPorId.get(ferragemId)
      const quantidadeAtual = Math.max(1, normalizarNumero(ferragem.quantidade, 1))

      ferragensPorId.set(ferragemId, {
        projeto_id: projetoId,
        ferragem_id: ferragemId,
        quantidade: existente ? somarSeDuplicado(existente.quantidade, quantidadeAtual) : quantidadeAtual,
        usar_no_kit: Boolean(existente?.usar_no_kit || ferragem.usar_no_kit),
        usar_no_perfil: Boolean(existente?.usar_no_perfil || ferragem.usar_no_perfil),
        observacao: aplicarVariacaoNoTexto(limparTextoSimples(ferragem.observacao), ferragem.variacao_restrita),
      })
    })

    const perfisPorId = new Map<string, ProjetoPerfilPersistencia>()
    form.perfis.forEach((perfil) => {
      const perfilId = limparTextoSimples(String(perfil.perfil_id || ""))
      if (!perfilId) return

      const chavePerfil = [
        perfilId,
        String(perfil.variacao_restrita || "").trim(),
        String(perfil.espessura_vidro_restrita || "").trim(),
        String(perfil.condicao || "").trim(),
        Boolean(perfil.usar_no_kit) ? "1" : "0",
        perfil.altura_max_kit ?? "",
      ].join("|")

      const existente = perfisPorId.get(chavePerfil)

      perfisPorId.set(chavePerfil, {
        projeto_id: projetoId,
        perfil_id: perfilId,
        qtd_largura: existente ? somarSeDuplicado(existente.qtd_largura, Math.max(0, normalizarNumero(perfil.qtd_largura))) : Math.max(0, normalizarNumero(perfil.qtd_largura)),
        qtd_altura: existente ? somarSeDuplicado(existente.qtd_altura, Math.max(0, normalizarNumero(perfil.qtd_altura))) : Math.max(0, normalizarNumero(perfil.qtd_altura)),
        qtd_outros: existente ? somarSeDuplicado(existente.qtd_outros, Math.max(0, normalizarNumero(perfil.qtd_outros))) : Math.max(0, normalizarNumero(perfil.qtd_outros)),
        tipo_fornecimento: aplicarEspessuraVidroNoTexto(
          aplicarAlturaMaxKitNoTexto(
            aplicarUsarNoKitNoTexto(
              aplicarCondicaoNoTexto(
                aplicarVariacaoNoTexto(
                  limparTextoSimples(perfil.tipo_fornecimento) || existente?.tipo_fornecimento || "barra",
                  perfil.variacao_restrita ?? null
                ),
                perfil.condicao ?? null
              ),
              Boolean(perfil.usar_no_kit)
            ),
            perfil.altura_max_kit ?? null
          ),
          perfil.espessura_vidro_restrita ?? null
        ),
      })
    })

    return {
      folhas,
      kits: Array.from(kitsPorId.values()),
      ferragens: Array.from(ferragensPorId.values()),
      perfis: Array.from(perfisPorId.values()),
    }
  }

  const salvar = async () => {
    if (!form.nome.trim()) {
      setModalAviso({ titulo: "Atenção", mensagem: "O nome do projeto é obrigatório.", tipo: "aviso" })
      return
    }
    if (!empresaId) {
      setModalAviso({ titulo: "Atenção", mensagem: "Empresa não identificada para salvar o projeto.", tipo: "aviso" })
      return
    }
    setSalvando(true)
    try {
      let projetoId = editandoId
      let snapshotAnterior: ProjetoRelacionamentosSnapshot | null = null

      if (editandoId) {
        snapshotAnterior = await carregarSnapshotRelacionamentos(editandoId)

        const { error: updateProjetoError } = await supabase.from("projetos").update({
          nome: form.nome.trim(),
          categoria: form.categoria,
          desenho: form.desenho,
        }).eq("id", editandoId)
        if (updateProjetoError) throw new Error(getMensagemErroSupabase(updateProjetoError, "Erro ao atualizar projeto"))

        const deleteResults = await Promise.all([
          supabase.from("projetos_folhas").delete().eq("projeto_id", editandoId),
          supabase.from("projetos_kits").delete().eq("projeto_id", editandoId),
          supabase.from("projetos_ferragens").delete().eq("projeto_id", editandoId),
          supabase.from("projetos_perfis").delete().eq("projeto_id", editandoId),
        ])
        const deleteErrors = deleteResults
          .map((result) => result.error)
          .filter(Boolean)

        if (deleteErrors.length > 0) {
          throw new Error(getMensagemErroSupabase(deleteErrors[0], "Erro ao limpar itens antigos do projeto"))
        }
      } else {
        const { data, error } = await supabase.from("projetos").insert([{
          nome: form.nome.trim(),
          categoria: form.categoria,
          desenho: form.desenho,
          empresa_id: empresaId,
        }]).select("id").single()
        if (error) throw error
        projetoId = data.id
      }

      const payloadNormalizado = normalizarPayloadProjeto(String(projetoId))

      try {
        await persistirRelacionamentosProjeto(payloadNormalizado)
      } catch (errorRelacionamentos) {
        if (editandoId && snapshotAnterior) {
          await restaurarSnapshotRelacionamentos(snapshotAnterior)
        }
        throw errorRelacionamentos
      }

      setModalAviso({
        titulo: "Salvo!",
        mensagem: `Projeto "${form.nome}" ${editandoId ? "atualizado" : "cadastrado"} com sucesso.`,
        tipo: "sucesso",
      })
      sessionStorage.removeItem(draftProjetoKey)
      draftRestauradoRef.current = null
      fecharModalSemConfirmacao()
      carregarTudo()
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : "Erro inesperado."
      setModalAviso({ titulo: "Erro ao salvar", mensagem, tipo: "erro" })
    } finally {
      setSalvando(false)
    }
  }

  const deletar = (projeto: Projeto) => {
    setModalAviso({
      titulo: "Excluir projeto",
      mensagem: `Deseja excluir permanentemente "${projeto.nome}"?\nTodos os dados associados (folhas, ferragens, perfis) serão removidos.`,
      confirmar: async () => {
        await supabase.from("projetos").delete().eq("id", projeto.id)
        carregarTudo()
      },
    })
  }

  const fecharModalSemConfirmacao = () => {
    setShowModal(false)
    setShowCloseDraftModal(false)
    setForm(FORM_VAZIO)
    setBuscaKitDisponivel("")
    setKitsSelecionadosParaAdicionar([])
    setBuscaFerragemDisponivel("")
    setFerragensSelecionadasParaAdicionar([])
    setBuscaPerfilDisponivel("")
    setPerfisSelecionadosParaAdicionar([])
    setBuscaFerragemPorLinha({})
    setBuscaPerfilPorLinha({})
    setEditandoId(null)
    setAbaAtiva("geral")
    setShowPicker(false)
    setVariacaoCustomSelecionadaId(null)
  }

  const fecharModal = () => {
    if (temDadosNaoSalvosNoModal) {
      setShowCloseDraftModal(true)
      return
    }

    fecharModalSemConfirmacao()
  }

  // ─── HELPERS FOLHAS ──────────────────────────────────────────────────────
  const adicionarFolha = () => {
    const numero = form.folhas.length + 1
    setForm(prev => ({
      ...prev,
      // Aplica fórmulas iniciais por tipo para acelerar o cadastro.
      folhas: [...prev.folhas, {
        numero_folha: numero,
        quantidade_folhas: 1,
        ...getPresetFolhaPorTipo(detectarTipoProjetoVisual(prev), numero),
        variacao_restrita: null,
        trilho_restrito: null,
      }],
    }))
  }
  const atualizarFolha = <K extends keyof ProjetoFolha>(i: number, campo: K, val: ProjetoFolha[K]) => {
    setForm(prev => {
      const arr = [...prev.folhas]
      arr[i] = { ...arr[i], [campo]: val }
      return { ...prev, folhas: arr }
    })
  }
  const removerFolha = (i: number) => {
    setForm(prev => ({
      ...prev,
      folhas: prev.folhas.filter((_, idx) => idx !== i).map((f, idx) => ({ ...f, numero_folha: idx + 1 })),
    }))
  }

  const aplicarPresetEmFolha = (indiceFolha: number) => {
    setForm((prev) => {
      const tipo = detectarTipoProjetoVisual(prev)
      const folhas = [...prev.folhas]
      const alvo = folhas[indiceFolha]
      if (!alvo) return prev

      folhas[indiceFolha] = {
        ...alvo,
        ...getPresetFolhaPorTipo(tipo, alvo.numero_folha),
      }

      return { ...prev, folhas }
    })
  }

  const aplicarPresetEmTodasFolhas = () => {
    setForm((prev) => {
      const tipo = detectarTipoProjetoVisual(prev)
      return {
        ...prev,
        folhas: prev.folhas.map((folha, idx) => ({
          ...folha,
          ...getPresetFolhaPorTipo(tipo, idx + 1),
        })),
      }
    })
  }

  // ─── HELPERS KITS ───────────────────────────────────────────────────────
  const criarProjetoKitAPartirDoBanco = useCallback((kit: KitDBItem, tipoProjeto: ProjetoVisualTipo): ProjetoKit => ({
    kit_id: String(kit.id),
    nome: kit.nome,
    espessura_vidro: getEspessuraPadraoKitPorTipo(tipoProjeto),
    largura_referencia: Number(kit.largura) || 0,
    altura_referencia: Number(kit.altura) || 0,
    tolerancia_mm: 50,
    observacao: "",
    variacao_restrita: null,
  }), [])

  const adicionarKit = (kitSelecionado?: KitDBItem) => {
    const kit = kitSelecionado || kitsDB[0]
    if (!kit) return
    const tipoProjeto = detectarTipoProjetoVisual(form)
    setForm(prev => ({
      ...prev,
      kits: [...prev.kits, criarProjetoKitAPartirDoBanco(kit, tipoProjeto)],
    }))
  }

  const handleAdicionarKitClick: MouseEventHandler<HTMLButtonElement> = () => {
    adicionarKit()
  }

  const alternarSelecaoKitParaAdicionar = (kitId: string) => {
    setKitsSelecionadosParaAdicionar((prev) =>
      prev.includes(kitId)
        ? prev.filter((id) => id !== kitId)
        : [...prev, kitId]
    )
  }

  const kitsDisponiveisFiltrados = filtrarItensTecnicosPorBusca(kitsDB, buscaKitDisponivel)

  const selecionarOuLimparTodosKitsFiltrados = () => {
    const idsFiltrados = kitsDisponiveisFiltrados.map((kit) => String(kit.id))
    const todosSelecionados = idsFiltrados.length > 0 && idsFiltrados.every((id) => kitsSelecionadosParaAdicionar.includes(id))

    setKitsSelecionadosParaAdicionar((prev) => {
      if (todosSelecionados) {
        return prev.filter((id) => !idsFiltrados.includes(id))
      }

      return Array.from(new Set([...prev, ...idsFiltrados]))
    })
  }

  const adicionarKitsSelecionados = () => {
    if (kitsSelecionadosParaAdicionar.length === 0) return

    const kitsSelecionados = kitsDB.filter((kit) => kitsSelecionadosParaAdicionar.includes(String(kit.id)))
    if (kitsSelecionados.length === 0) return
    const tipoProjeto = detectarTipoProjetoVisual(form)

    setForm((prev) => ({
      ...prev,
      kits: [...prev.kits, ...kitsSelecionados.map((kit) => criarProjetoKitAPartirDoBanco(kit, tipoProjeto))],
    }))
    setKitsSelecionadosParaAdicionar([])
  }

  const atualizarKit = <K extends keyof ProjetoKit>(i: number, campo: K, val: ProjetoKit[K]) => {
    setForm(prev => {
      const arr = [...prev.kits]
      if (campo === "kit_id") {
        const found = kitsDB.find(x => String(x.id) === String(val))
        arr[i] = {
          ...arr[i],
          kit_id: String(val),
          nome: found?.nome || "",
          largura_referencia: Number(found?.largura) || arr[i].largura_referencia,
          altura_referencia: Number(found?.altura) || arr[i].altura_referencia,
        }
      } else {
        arr[i] = { ...arr[i], [campo]: val }
      }
      return { ...prev, kits: arr }
    })
  }
  const removerKit = (i: number) => {
    setForm(prev => ({ ...prev, kits: prev.kits.filter((_, idx) => idx !== i) }))
  }

  // ─── HELPERS FERRAGENS ───────────────────────────────────────────────────
  const getCatalogoFerragensParaLinha = (ferragemAtualId?: string, ferragemAtualNome?: string) => {
    const ferragemAtual = ferragensOriginaisDB.find((item) => String(item.id) === String(ferragemAtualId || ""))
    if (ferragemAtual) {
      if (ferragensDB.some((item) => String(item.id) === String(ferragemAtual.id))) return ferragensDB
      return [ferragemAtual, ...ferragensDB]
    }

    if (!ferragemAtualId || !ferragemAtualNome) return ferragensDB

    const ferragemFallback: FerragemDBItem = {
      id: String(ferragemAtualId),
      nome: ferragemAtualNome,
    }

    if (ferragensDB.some((item) => String(item.id) === String(ferragemFallback.id))) return ferragensDB
    return [ferragemFallback, ...ferragensDB]
  }

  const getFerragensDisponiveis = (ferragemAtualId?: string) => {
    const selecionadas = form.ferragens.map(item => String(item.ferragem_id))
    const ferragemAtualNome = form.ferragens.find((item) => String(item.ferragem_id) === String(ferragemAtualId || ""))?.nome
    return getCatalogoFerragensParaLinha(ferragemAtualId, ferragemAtualNome).filter((item) => {
      const id = String(item.id)
      return id === String(ferragemAtualId || "") || !selecionadas.includes(id)
    })
  }

  const getFerragensFiltradas = (indice: number, ferragemAtualId?: string) =>
    filtrarItensTecnicosPorBusca(getFerragensDisponiveis(ferragemAtualId), buscaFerragemPorLinha[indice] || "")

  const alternarSelecaoFerragemParaAdicionar = (ferragemId: string) => {
    setFerragensSelecionadasParaAdicionar((prev) =>
      prev.includes(ferragemId)
        ? prev.filter((id) => id !== ferragemId)
        : [...prev, ferragemId]
    )
  }

  const ferragensDisponiveisFiltradas = filtrarItensTecnicosPorBusca(getFerragensDisponiveis(), buscaFerragemDisponivel)

  const selecionarOuLimparTodasFerragensFiltradas = () => {
    const idsFiltrados = ferragensDisponiveisFiltradas.map((ferragem) => String(ferragem.id))
    const todosSelecionados = idsFiltrados.length > 0 && idsFiltrados.every((id) => ferragensSelecionadasParaAdicionar.includes(id))

    setFerragensSelecionadasParaAdicionar((prev) => {
      if (todosSelecionados) {
        return prev.filter((id) => !idsFiltrados.includes(id))
      }

      return Array.from(new Set([...prev, ...idsFiltrados]))
    })
  }

  const adicionarFerragensSelecionadas = () => {
    if (ferragensSelecionadasParaAdicionar.length === 0) return

    const ferragensSelecionadas = getFerragensDisponiveis().filter((ferragem) =>
      ferragensSelecionadasParaAdicionar.includes(String(ferragem.id))
    )
    if (ferragensSelecionadas.length === 0) return

    setForm((prev) => ({
      ...prev,
      ferragens: [
        ...prev.ferragens,
        ...ferragensSelecionadas.map((ferragem) => ({
          ferragem_id: String(ferragem.id),
          nome: ferragem.nome,
          quantidade: 1,
          usar_no_kit: false,
          usar_no_perfil: false,
          observacao: "",
          variacao_restrita: null,
        })),
      ].sort((a, b) => compareFerragensByNome(a.nome, b.nome)),
    }))
    setFerragensSelecionadasParaAdicionar([])
  }

  const adicionarFerragem = () => {
    const disponiveis = getFerragensDisponiveis()
    if (!disponiveis.length) return
    const f = disponiveis[0]
    setForm(prev => ({
      ...prev,
      ferragens: [...prev.ferragens, {
        ferragem_id: f.id,
        nome: f.nome,
        quantidade: 1,
        usar_no_kit: false,
        usar_no_perfil: false,
        observacao: "",
        variacao_restrita: null,
      }].sort((a, b) => compareFerragensByNome(a.nome, b.nome)),
    }))
  }
  const atualizarFerragem = <K extends keyof ProjetoFerragem>(i: number, campo: K, val: ProjetoFerragem[K]) => {
    setForm(prev => {
      const arr = [...prev.ferragens]
      if (campo === "ferragem_id") {
        const found = ferragensOriginaisDB.find((x) => String(x.id) === String(val)) || ferragensDB.find((x) => String(x.id) === String(val))
        arr[i] = { ...arr[i], ferragem_id: String(val), nome: found?.nome || "" }
      } else {
        arr[i] = { ...arr[i], [campo]: val }
      }
      return { ...prev, ferragens: arr }
    })
  }
  const removerFerragem = (i: number) => {
    setForm(prev => ({ ...prev, ferragens: prev.ferragens.filter((_, idx) => idx !== i) }))
    setBuscaFerragemPorLinha((prev) => reindexarMapaBusca(prev, i))
  }

  // ─── HELPERS PERFIS ──────────────────────────────────────────────────────
  const getCatalogoPerfisParaLinha = (perfilAtualId?: string, perfilAtualNome?: string) => {
    const perfilAtual = perfisOriginaisDB.find((item) => String(item.id) === String(perfilAtualId || ""))
    if (perfilAtual) {
      if (perfisDB.some((item) => String(item.id) === String(perfilAtual.id))) return perfisDB
      return [perfilAtual, ...perfisDB]
    }

    if (!perfilAtualId || !perfilAtualNome) return perfisDB

    const perfilFallback: PerfilDBItem = {
      id: String(perfilAtualId),
      nome: perfilAtualNome,
    }

    if (perfisDB.some((item) => String(item.id) === String(perfilFallback.id))) return perfisDB
    return [perfilFallback, ...perfisDB]
  }

  const getPerfisDisponiveis = (perfilAtualId?: string, perfilAtualNome?: string) => {
    const selecionados = form.perfis.map(item => String(item.perfil_id))
    return getCatalogoPerfisParaLinha(perfilAtualId, perfilAtualNome).filter((item) => {
      const id = String(item.id)
      return id === String(perfilAtualId || "") || !selecionados.includes(id)
    })
  }

  const getPerfisFiltrados = (indice: number, perfilAtualId?: string, perfilAtualNome?: string) =>
    filtrarItensTecnicosPorBusca(getPerfisDisponiveis(perfilAtualId, perfilAtualNome), buscaPerfilPorLinha[indice] || "")

  const alternarSelecaoPerfilParaAdicionar = (perfilId: string) => {
    setPerfisSelecionadosParaAdicionar((prev) =>
      prev.includes(perfilId)
        ? prev.filter((id) => id !== perfilId)
        : [...prev, perfilId]
    )
  }

  const perfisDisponiveisFiltrados = filtrarItensTecnicosPorBusca(getPerfisDisponiveis(), buscaPerfilDisponivel)

  const selecionarOuLimparTodosPerfisFiltrados = () => {
    const idsFiltrados = perfisDisponiveisFiltrados.map((perfil) => String(perfil.id))
    const todosSelecionados = idsFiltrados.length > 0 && idsFiltrados.every((id) => perfisSelecionadosParaAdicionar.includes(id))

    setPerfisSelecionadosParaAdicionar((prev) => {
      if (todosSelecionados) {
        return prev.filter((id) => !idsFiltrados.includes(id))
      }

      return Array.from(new Set([...prev, ...idsFiltrados]))
    })
  }

  const adicionarPerfisSelecionados = () => {
    if (perfisSelecionadosParaAdicionar.length === 0) return

    const perfisSelecionados = getPerfisDisponiveis().filter((perfil) =>
      perfisSelecionadosParaAdicionar.includes(String(perfil.id))
    )
    if (perfisSelecionados.length === 0) return

    setForm((prev) => ({
      ...prev,
      perfis: [
        ...prev.perfis,
        ...perfisSelecionados.map((perfil) => ({
          perfil_id: String(perfil.id),
          nome: perfil.nome,
          qtd_largura: 0,
          qtd_altura: 0,
          qtd_outros: 0,
          tipo_fornecimento: "barra",
          variacao_restrita: null,
          espessura_vidro_restrita: null,
          condicao: null,
          usar_no_kit: false,
          altura_max_kit: null,
        })),
      ].sort((a, b) => comparePerfisByNome(a.nome, b.nome)),
    }))
    setPerfisSelecionadosParaAdicionar([])
  }

  const adicionarPerfil = () => {
    const disponiveis = getPerfisDisponiveis()
    if (!disponiveis.length) return
    const p = disponiveis[0]
    setForm(prev => ({
      ...prev,
      perfis: [...prev.perfis, {
        perfil_id: p.id,
        nome: p.nome,
        qtd_largura: 0,
        qtd_altura: 0,
        qtd_outros: 0,
        tipo_fornecimento: "barra",
        variacao_restrita: null,
        espessura_vidro_restrita: null,
        condicao: null,
        usar_no_kit: false,
        altura_max_kit: null,
      }].sort((a, b) => comparePerfisByNome(a.nome, b.nome)),
    }))
  }
  const atualizarPerfil = <K extends keyof ProjetoPerfil>(i: number, campo: K, val: ProjetoPerfil[K]) => {
    setForm(prev => {
      const arr = [...prev.perfis]
      if (campo === "perfil_id") {
        const found = perfisOriginaisDB.find((x) => String(x.id) === String(val)) || perfisDB.find((x) => String(x.id) === String(val))
        arr[i] = { ...arr[i], perfil_id: String(val), nome: found?.nome || arr[i]?.nome || "" }
      } else {
        arr[i] = { ...arr[i], [campo]: val }
      }
      return { ...prev, perfis: arr }
    })
  }
  const removerPerfil = (i: number) => {
    setForm(prev => ({ ...prev, perfis: prev.perfis.filter((_, idx) => idx !== i) }))
    setBuscaPerfilPorLinha((prev) => reindexarMapaBusca(prev, i))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const catalogoDesenhos = useMemo(() => {
    const mapa = new Map<string, { label: string; arquivo: string; categoria: string }>()

    Object.entries(DESENHOS).forEach(([categoria, itens]) => {
      itens.forEach((item) => {
        mapa.set(item.arquivo, { ...item, categoria })
      })
    })

    desenhosPasta.forEach((arquivo) => {
      if (mapa.has(arquivo)) return
      mapa.set(arquivo, {
        arquivo,
        label: formatarLabelArquivoDesenho(arquivo),
        categoria: "Pasta",
      })
    })

    return Array.from(mapa.values()).reduce<Record<string, { label: string; arquivo: string }[]>>((acc, item) => {
      if (!acc[item.categoria]) acc[item.categoria] = []
      acc[item.categoria].push({ label: item.label, arquivo: item.arquivo })
      return acc
    }, {})
  }, [desenhosPasta])

  useEffect(() => {
    const categorias = Object.keys(catalogoDesenhos)
    if (categorias.length === 0) return
    if (!catalogoDesenhos[categoriaPicker]) {
      setCategoriaPicker(categorias[0])
    }
  }, [catalogoDesenhos, categoriaPicker])

  const todosDesenhos = useMemo(() => Object.values(catalogoDesenhos).flat(), [catalogoDesenhos])
  const stemsDesenhosDisponiveis = useMemo(
    () => new Set(todosDesenhos.map((d) => d.arquivo.replace(/\.(png|jpe?g|webp|gif|svg)$/i, ""))),
    [todosDesenhos]
  )
  const desenhosPorArquivo = new Map(todosDesenhos.map((d) => [d.arquivo, d]))
  const desenhoAtual = todosDesenhos.find(d => d.arquivo === form.desenho)
  const variacoesAutomaticas = getVariacoesDesenho(form.desenho, stemsDesenhosDisponiveis)
  const variacoesManuais = variacoesCustom
    .filter((grupo) => grupo.opcoes.some((opcao) => opcao.arquivo === form.desenho))
    .map((grupo) => ({
      id: `custom-${grupo.id}`,
      label: `${grupo.label} (Personalizado)`,
      opcoes: grupo.opcoes.map((opcao) => ({
        key: `${grupo.id}-${opcao.arquivo}`,
        label: opcao.label,
        arquivo: opcao.arquivo,
      })),
    }))
  const variacoesDesenho = [...variacoesAutomaticas, ...variacoesManuais]
  const tipoProjetoVisual = detectarTipoProjetoVisual(form)
  const ultimoTipoProjetoRef = useRef<ProjetoVisualTipo | null>(null)

  useEffect(() => {
    const tipoAnterior = ultimoTipoProjetoRef.current
    ultimoTipoProjetoRef.current = tipoProjetoVisual

    if (!tipoAnterior || tipoAnterior === tipoProjetoVisual) return

    const espessuraAnterior = getEspessuraPadraoKitPorTipo(tipoAnterior)
    const novaEspessura = getEspessuraPadraoKitPorTipo(tipoProjetoVisual)

    if (espessuraAnterior === novaEspessura) return

    setForm((prev) => {
      let houveMudanca = false

      const kits = prev.kits.map((kit) => {
        const espessuraAtual = limparTextoSimples(kit.espessura_vidro)
        if (espessuraAtual && espessuraAtual !== espessuraAnterior) return kit

        houveMudanca = true
        return {
          ...kit,
          espessura_vidro: novaEspessura,
        }
      })

      return houveMudanca ? { ...prev, kits } : prev
    })
  }, [tipoProjetoVisual])

  const projetoEhPorta = tipoProjetoVisual === "portas"
  const projetoUsaPresetVariacaoBox =
    tipoProjetoVisual === "box" ||
    normalizarBuscaItem(`${form.nome} ${form.categoria} ${desenhoAtual?.label || ""}`).includes("box")
  const opcoesRestricaoBox = projetoUsaPresetVariacaoBox
    ? getOpcoesRestricaoTecnicaBox().map((opcao, indice) => ({
        label: opcao.label,
        arquivo: opcao.valor,
        corBg: (["#eef2ff", "#fef3c7", "#ecfdf5", "#fdf2f8", "#fff7ed"] as const)[indice % 5],
        corText: (["#4338ca", "#d97706", "#059669", "#db2777", "#ea580c"] as const)[indice % 5],
      }))
    : []

  // Opções planas de variação para usar nos selects de cada item (ferragem/kit/perfil)
  const variacaoOpcoesFlat = Array.from(new Map(
    [
      ...variacoesDesenho.flatMap((grupo, gi) =>
        grupo.opcoes.map(opcao => ({
          label: `${grupo.label}: ${opcao.label}`,
          arquivo: opcao.arquivo,
          corBg: (["#eff6ff", "#fef3c7", "#ecfdf5", "#f5f3ff", "#fff7ed"] as const)[gi % 5],
          corText: (["#3b82f6", "#d97706", "#10b981", "#8b5cf6", "#f97316"] as const)[gi % 5],
        }))
      ),
      ...opcoesRestricaoBox,
    ].map((opcao) => [opcao.arquivo, opcao] as const)
  ).values())
  const temOpcoesRestricao = variacaoOpcoesFlat.length > 0

  // Para folhas: apenas as opções de altura (Tradicional / Até o teto)
  const variacaoOpcoesFolha = variacaoOpcoesFlat.filter(op => isValorEixoAltura(op.arquivo))

  // Para kits: apenas opções do eixo "kit" (Tradicional/Quadrado/Outro) — sem altura, sem combinados
  const variacaoOpcoesKit = variacaoOpcoesFlat.filter(op => {
    if (ehVariacaoDeDesenho(op.arquivo)) return true
    return getEixoVariacaoProjeto(op.arquivo) === "kit"
  })

  // Para ferragens: separa por eixo para reduzir confusão de aplicação
  const variacaoOpcoesFerragemKit = variacaoOpcoesFlat.filter(op =>
    !ehVariacaoDeDesenho(op.arquivo) && getEixoVariacaoProjeto(op.arquivo) === "kit"
  )
  const variacaoOpcoesFerragemBoxDesenho = variacaoOpcoesFlat.filter(op =>
    ehVariacaoDeDesenho(op.arquivo) || isValorEixoAltura(op.arquivo)
  )

  const getNomeVariacao = (valor: string, fallback: string) => {
    const custom = nomesVariacaoPersonalizados[valor]
    return custom && custom.trim() ? custom : fallback
  }

  // Para perfis: variações visuais + altura, sem eixo de kit
  const variacaoOpcoesPerfil = variacaoOpcoesFlat.filter(op =>
    ehVariacaoDeDesenho(op.arquivo) || isValorEixoAltura(op.arquivo)
  )

  const variacoesCustomFiltradas = variacoesCustom.filter((item) =>
    item.label.toLowerCase().includes(buscaVariacaoCustom.toLowerCase().trim())
  )

  const iniciarNovaVariacaoManual = () => {
    setVariacaoCustomSelecionadaId(null)
    setBuscaVariacaoCustom("")
    setNovaVariacaoNome("")
    setNovaVariacaoOpcoes([
      { id: "a", label: "Opção A", arquivo: form.desenho || "" },
      { id: "b", label: "Opção B", arquivo: "" },
    ])
  }

  const selecionarVariacaoManual = (id: string) => {
    if (id === "__nova__") {
      iniciarNovaVariacaoManual()
      return
    }

    const variacao = variacoesCustom.find((item) => item.id === id)
    if (!variacao) return

    setVariacaoCustomSelecionadaId(variacao.id)
    setNovaVariacaoNome(variacao.label)
    setNovaVariacaoOpcoes(
      variacao.opcoes.map((opcao, idx) => ({
        id: `${variacao.id}-${idx}`,
        label: opcao.label,
        arquivo: opcao.arquivo,
      }))
    )
  }

  const atualizarOpcaoNovaVariacao = (id: string, campo: "label" | "arquivo", valor: string) => {
    setNovaVariacaoOpcoes((prev) => prev.map((opcao) => (opcao.id === id ? { ...opcao, [campo]: valor } : opcao)))
  }

  const adicionarOpcaoNovaVariacao = () => {
    setNovaVariacaoOpcoes((prev) => {
      const proximoIndice = prev.length + 1
      return [
        ...prev,
        {
          id: `${Date.now()}-${proximoIndice}`,
          label: `Opção ${proximoIndice}`,
          arquivo: "",
        },
      ]
    })
  }

  const removerOpcaoNovaVariacao = (id: string) => {
    setNovaVariacaoOpcoes((prev) => {
      if (prev.length <= 2) return prev
      return prev.filter((opcao) => opcao.id !== id)
    })
  }

  const duplicarOpcaoNovaVariacao = (id: string) => {
    setNovaVariacaoOpcoes((prev) => {
      const indice = prev.findIndex((opcao) => opcao.id === id)
      if (indice < 0) return prev

      const origem = prev[indice]
      const clone: VariacaoCustomDraftOpcao = {
        id: `${Date.now()}-dup-${indice}`,
        label: origem.label ? `${origem.label} (copia)` : `Opção ${prev.length + 1}`,
        arquivo: origem.arquivo,
      }

      return [...prev.slice(0, indice + 1), clone, ...prev.slice(indice + 1)]
    })
  }

  const salvarVariacaoManual = () => {
    if (!form.desenho) {
      setModalAviso({ titulo: "Atenção", mensagem: "Selecione um desenho antes de cadastrar variação.", tipo: "aviso" })
      return
    }

    const nome = novaVariacaoNome.trim()
    const opcoesSaneadas = novaVariacaoOpcoes
      .map((opcao, idx) => ({
        label: opcao.label.trim() || `Opção ${idx + 1}`,
        arquivo: opcao.arquivo.trim(),
      }))
      .filter((opcao) => opcao.arquivo)

    if (!nome) {
      setModalAviso({ titulo: "Atenção", mensagem: "Informe o nome da variação (ex.: Trinco).", tipo: "aviso" })
      return
    }

    if (opcoesSaneadas.length < 2) {
      setModalAviso({ titulo: "Atenção", mensagem: "Cadastre pelo menos duas opções com desenho selecionado.", tipo: "aviso" })
      return
    }

    const arquivos = opcoesSaneadas.map((opcao) => opcao.arquivo)
    const arquivosUnicos = new Set(arquivos)
    if (arquivosUnicos.size < 2) {
      setModalAviso({ titulo: "Atenção", mensagem: "As opções precisam apontar para desenhos diferentes.", tipo: "aviso" })
      return
    }

    const novaVariacaoId = variacaoCustomSelecionadaId || `${Date.now()}`
    const novaVariacao: VariacaoCustom = {
      id: novaVariacaoId,
      label: nome,
      opcoes: opcoesSaneadas,
    }

    setVariacoesCustom((prev) => {
      if (variacaoCustomSelecionadaId) {
        return prev.map((item) => (item.id === variacaoCustomSelecionadaId ? novaVariacao : item))
      }
      return [...prev, novaVariacao]
    })

    setVariacaoCustomSelecionadaId(novaVariacaoId)
    setModalAviso({
      titulo: "Sucesso",
      mensagem: variacaoCustomSelecionadaId
        ? "Variação personalizada atualizada."
        : "Variação personalizada cadastrada e salva para próximos projetos.",
      tipo: "sucesso",
    })
  }

  const removerVariacaoManual = (id: string) => {
    setVariacoesCustom((prev) => prev.filter((item) => item.id !== id))
    if (variacaoCustomSelecionadaId === id) {
      iniciarNovaVariacaoManual()
    }
  }

  useEffect(() => {
    if (!variacaoCustomSelecionadaId) return
    const existe = variacoesCustom.some((item) => item.id === variacaoCustomSelecionadaId)
    if (!existe) setVariacaoCustomSelecionadaId(null)
  }, [variacoesCustom, variacaoCustomSelecionadaId])

  useEffect(() => {
    setNovaVariacaoOpcoes((prev) => {
      if (!prev.length) {
        return [
          { id: "a", label: "Opção A", arquivo: form.desenho || "" },
          { id: "b", label: "Opção B", arquivo: "" },
        ]
      }

      return prev.map((opcao, index) => {
        if (index !== 0) return opcao
        if (opcao.arquivo && opcao.arquivo !== form.desenho) return opcao
        return { ...opcao, arquivo: form.desenho || "" }
      })
    })
  }, [form.desenho])

  const temDadosNaoSalvosNoModal =
    showModal && (
      !!form.nome.trim() ||
      !!form.categoria.trim() ||
      !!form.desenho ||
      form.folhas.length > 0 ||
      form.kits.length > 0 ||
      form.ferragens.length > 0 ||
      form.perfis.length > 0 ||
      !!novaVariacaoNome.trim() ||
      novaVariacaoOpcoes.some((opcao) => !!opcao.label.trim() || !!opcao.arquivo)
    )

  useEffect(() => {
    if (!temDadosNaoSalvosNoModal) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [temDadosNaoSalvosNoModal])

  if (checkingAuth) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: theme.menuBackgroundColor }} />
    </div>
  )

  // ─── ABAS DO MODAL ────────────────────────────────────────────────────────
  const ABAS = [
    { key: "geral" as const, label: "Geral", icon: AlignLeft },
    { key: "folhas" as const, label: `Folhas (${form.folhas.length})`, icon: Layers },
    { key: "kits" as const, label: `Kits (${form.kits.length})`, icon: Package },
    { key: "ferragens" as const, label: `Ferragens (${form.ferragens.length})`, icon: Wrench },
    { key: "perfis" as const, label: `Perfis (${form.perfis.length})`, icon: Package },
  ]

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

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">

          {/* Topo */}
          <div
            className="relative overflow-hidden rounded-3xl border border-white/40 shadow-xl mb-8 p-6 md:p-8"
            style={{
              background: `linear-gradient(120deg, ${theme.menuBackgroundColor}10, #ffffff 40%, ${theme.menuIconColor}10)`,
            }}
          >
            <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full blur-3xl" style={{ backgroundColor: `${theme.menuBackgroundColor}25` }} />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: `${theme.menuIconColor}20` }} />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] font-black text-gray-400">Cadastro de Engenharia</p>
                <h1 className="text-3xl md:text-4xl font-black mt-1" style={{ color: theme.contentTextLightBg }}>
                  Projetos
                </h1>
                <p className="text-gray-500 text-sm mt-2 max-w-2xl">
                  Estruture folhas, kits, ferragens e perfis sem variação por cor. O motor de cálculo fará a inteligência de combinação depois.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-3 rounded-2xl bg-white/80 border border-gray-100 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Projetos</p>
                  <p className="text-lg font-black" style={{ color: theme.contentTextLightBg }}>{projetos.length}</p>
                </div>
                <button
                  onClick={() => { setForm(FORM_VAZIO); setEditandoId(null); setAbaAtiva("geral"); setShowModal(true) }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black shadow-md hover:opacity-90 active:scale-95 transition-all"
                  style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                >
                  <Plus size={18} />
                  Novo Projeto
                </button>
              </div>
            </div>
          </div>

          {/* Lista */}
          {carregando ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: theme.menuBackgroundColor }} />
            </div>
          ) : projetos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
                <FolderOpen size={36} className="text-gray-300" />
              </div>
              <p className="font-bold text-gray-400">Nenhum projeto cadastrado</p>
              <p className="text-gray-300 text-sm mt-1">Clique em &quot;Novo Projeto&quot; para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {projetos.map(projeto => (
                <div
                  key={projeto.id}
                  className="group bg-white/90 backdrop-blur rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  {/* Imagem */}
                  <div
                    className="relative h-44 flex items-center justify-center overflow-hidden"
                    style={{ background: `linear-gradient(140deg, ${theme.menuBackgroundColor}10, #ffffff 55%, ${theme.menuIconColor}14)` }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: `${theme.menuBackgroundColor}08` }} />
                    {projeto.desenho ? (
                      <Image
                        src={`/desenhos/${projeto.desenho}`}
                        alt={projeto.nome}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <ImageIcon size={40} className="text-gray-200" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    {projeto.categoria && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                        {projeto.categoria}
                      </p>
                    )}
                    <h3 className="font-black text-sm leading-tight truncate" style={{ color: theme.contentTextLightBg }}>
                      {projeto.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => abrirEdicao(projeto)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                        style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                      >
                        <Edit2 size={13} /> Editar
                      </button>
                      <button
                        onClick={() => deletar(projeto)}
                        className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════ MODAL FORMULÁRIO ═══════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: `linear-gradient(145deg, ${theme.menuBackgroundColor}55, ${theme.contentTextLightBg}55)` }}
        >
          <div
            className="w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border"
            style={{
              backgroundColor: theme.modalBackgroundColor || "#fff",
              borderColor: `${theme.menuBackgroundColor}22`,
              maxHeight: "92vh",
            }}
          >
            {/* Header modal */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{
                borderColor: `${theme.menuBackgroundColor}22`,
                background: `linear-gradient(120deg, ${theme.menuBackgroundColor}16, ${theme.menuIconColor}12)`,
              }}
            >
              <div className="flex items-center gap-3">
                {form.desenho && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/60 border border-white/40">
                    <Image src={`/desenhos/${form.desenho}`} alt="" fill className="object-contain p-1" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-black" style={{ color: theme.modalTextColor || theme.contentTextLightBg }}>
                    {editandoId ? "Editar Projeto" : "Novo Projeto"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {form.nome || "Preencha os dados abaixo"}
                    {temOpcoesRestricao && (
                      <span className="ml-2 inline-flex items-center gap-0.5 font-black" style={{ color: "#8b5cf6" }}>
                        · {variacaoOpcoesFlat.map((g) => g.label).join(", ")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={fecharModal}
                className="p-2 rounded-xl text-gray-500 transition-all"
                style={{ backgroundColor: "#ffffffb3" }}
              >
                <X size={20} />
              </button>
            </div>

            {projetoUsaPresetVariacaoBox && (
              <div className="px-6 py-3 border-b" style={{ borderColor: `${theme.menuBackgroundColor}22`, backgroundColor: "#fafafa" }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: "#6b7280" }}>
                    Nomes de Variação do Box
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditandoNomesVariacao((v) => !v)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all"
                    style={{ borderColor: "#d1d5db", color: "#4b5563", backgroundColor: "#fff" }}
                  >
                    {editandoNomesVariacao ? "Ocultar edição" : "Editar nomes"}
                  </button>
                </div>
                {editandoNomesVariacao && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {GRUPOS_VARIACAO_BOX.flatMap((grupo) => grupo.options).map((opcao) => (
                      <input
                        key={`nome-var-${opcao.value}`}
                        type="text"
                        value={nomesVariacaoPersonalizados[opcao.value] || opcao.label}
                        onChange={(e) => setNomesVariacaoPersonalizados((prev) => ({ ...prev, [opcao.value]: e.target.value }))}
                        className="w-full p-2 rounded-lg border text-xs font-bold"
                        placeholder={opcao.label}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div
              className="flex border-b shrink-0 px-2 py-1 gap-1 overflow-x-auto"
              style={{ borderColor: `${theme.menuBackgroundColor}22` }}
            >
              {ABAS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setAbaAtiva(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
                    abaAtiva === key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  style={abaAtiva === key ? { backgroundColor: theme.menuBackgroundColor } : {}}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── ABA GERAL ───────────────────────────────────────────── */}
              {abaAtiva === "geral" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                        Nome do Projeto *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Porta Social 2 Folhas"
                        value={form.nome}
                        onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                        className="w-full p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        style={{ color: theme.contentTextLightBg }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                        Categoria
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Porta, Janela, Box..."
                        value={form.categoria}
                        onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                        className="w-full p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        style={{ color: theme.contentTextLightBg }}
                      />
                    </div>
                  </div>

                  {/* Picker de Desenho */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                      Desenho / Modelo Visual
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPicker(!showPicker)}
                      className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3 hover:bg-gray-100 transition-all text-left"
                    >
                      {form.desenho ? (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white border border-gray-100">
                          <Image src={`/desenhos/${form.desenho}`} alt="" fill className="object-contain p-1" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                          <ImageIcon size={22} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-600 truncate">
                          {desenhoAtual?.label || "Selecionar desenho"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{form.desenho || "Nenhum selecionado"}</p>
                      </div>
                      <Grid3x3 size={18} className="text-gray-400 shrink-0" />
                    </button>

                    <div className="mt-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                        Arquivo manual do desenho
                      </label>
                      <input
                        type="text"
                        value={form.desenho}
                        onChange={(e) => setForm((p) => ({ ...p, desenho: e.target.value.trim() }))}
                        placeholder="Ex: box-frontal-personalizado.png"
                        className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Use este campo quando o desenho existir na pasta, mas não aparecer no catálogo.
                      </p>
                    </div>

                    {showPicker && (
                      <div className="mt-2 border border-gray-100 rounded-2xl overflow-hidden shadow-lg bg-white">
                        {/* Tabs categorias */}
                        <div className="flex gap-1 p-2 overflow-x-auto bg-gray-50 border-b border-gray-100">
                          {Object.keys(catalogoDesenhos).map(cat => (
                            <button
                              key={cat}
                              onClick={() => setCategoriaPicker(cat)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                                categoriaPicker === cat ? "text-white shadow-sm" : "text-gray-400 hover:bg-gray-200"
                              }`}
                              style={categoriaPicker === cat ? { backgroundColor: theme.menuBackgroundColor } : {}}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                        {/* Grade */}
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 max-h-56 overflow-y-auto">
                          {(catalogoDesenhos[categoriaPicker] || []).map(d => (
                            <button
                              key={d.arquivo}
                              type="button"
                              onClick={() => {
                                setForm(p => ({ ...p, desenho: d.arquivo }))
                                setShowPicker(false)
                              }}
                              title={d.label}
                              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                                form.desenho === d.arquivo
                                  ? "shadow-md scale-105"
                                  : "border-transparent hover:border-gray-200"
                              }`}
                              style={form.desenho === d.arquivo
                                ? { borderColor: theme.menuIconColor }
                                : {}}
                            >
                              <Image
                                src={`/desenhos/${d.arquivo}`}
                                alt={d.label}
                                fill
                                className="object-contain p-1 bg-gray-50"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {form.desenho && variacoesDesenho.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Variações do desenho
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditandoNomesDesenho((v) => !v)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all"
                          style={{ borderColor: "#d1d5db", color: "#4b5563", backgroundColor: "#fff" }}
                        >
                          {editandoNomesDesenho ? "Ocultar nomes" : "Editar nomes"}
                        </button>
                      </div>

                      <div className="space-y-3">
                        {variacoesDesenho.map((grupo) => (
                          <div key={grupo.id}>
                            <p className="text-[11px] font-bold text-gray-500 mb-1">{grupo.label}</p>
                            <div className="flex flex-wrap gap-2">
                              {grupo.opcoes.map((opcao) => (
                                <button
                                  key={opcao.key}
                                  type="button"
                                  onClick={() => setForm((prev) => ({ ...prev, desenho: opcao.arquivo }))}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                                    form.desenho === opcao.arquivo
                                      ? "text-white shadow-sm"
                                      : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100"
                                  }`}
                                  style={form.desenho === opcao.arquivo ? { backgroundColor: theme.menuBackgroundColor } : {}}
                                >
                                  {getNomeVariacao(opcao.arquivo, opcao.label)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {editandoNomesDesenho && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Array.from(new Map(
                            variacoesDesenho
                              .flatMap((grupo) => grupo.opcoes)
                              .map((opcao) => [opcao.arquivo, opcao] as const)
                          ).values()).map((opcao) => (
                            <div key={`nome-desenho-${opcao.arquivo}`}>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                                {opcao.label}
                              </label>
                              <input
                                type="text"
                                value={nomesVariacaoPersonalizados[opcao.arquivo] || ""}
                                onChange={(e) =>
                                  setNomesVariacaoPersonalizados((prev) => {
                                    const proximo = { ...prev }
                                    const valor = e.target.value
                                    if (valor.trim()) proximo[opcao.arquivo] = valor
                                    else delete proximo[opcao.arquivo]
                                    return proximo
                                  })
                                }
                                className="w-full p-2 rounded-lg border text-xs font-bold"
                                placeholder={opcao.label}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-gray-400 mt-3">
                        Ao trocar a variação, o projeto mantém todos os dados e altera apenas o desenho.
                      </p>
                    </div>
                  )}

                  {form.desenho && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Variações personalizadas
                        </p>
                        <button
                          type="button"
                          onClick={iniciarNovaVariacaoManual}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black text-white"
                          style={{ backgroundColor: theme.menuBackgroundColor }}
                        >
                          <Plus size={12} /> Nova variação
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Selecione uma variação e amarre os desenhos de cada opção. Use + para criar uma nova na hora.
                      </p>

                      <div className="mb-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                          Buscar variação
                        </label>
                        <input
                          type="text"
                          value={buscaVariacaoCustom}
                          onChange={(e) => setBuscaVariacaoCustom(e.target.value)}
                          placeholder="Digite para filtrar variações salvas"
                          className="w-full mb-2 p-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold outline-none"
                        />

                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                          Variação em edição
                        </label>
                        <select
                          value={variacaoCustomSelecionadaId || "__nova__"}
                          onChange={(e) => selecionarVariacaoManual(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold outline-none"
                        >
                          <option value="__nova__">Nova variação</option>
                          {variacoesCustomFiltradas.map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </select>
                        {buscaVariacaoCustom.trim() && variacoesCustomFiltradas.length === 0 && (
                          <p className="mt-1 text-[11px] text-gray-400">Nenhuma variação encontrada para esse filtro.</p>
                        )}
                      </div>

                      <div className="space-y-3 mb-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                            Nome da Variação
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Trinco"
                            value={novaVariacaoNome}
                            onChange={(e) => setNovaVariacaoNome(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>

                        {novaVariacaoOpcoes.map((opcao, index) => (
                          <div key={opcao.id} className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                                Opção {index + 1}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => duplicarOpcaoNovaVariacao(opcao.id)}
                                  className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-[10px] font-black"
                                  title="Duplicar opção"
                                >
                                  Duplicar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removerOpcaoNovaVariacao(opcao.id)}
                                  disabled={novaVariacaoOpcoes.length <= 2}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all disabled:opacity-40"
                                  title="Remover opção"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={opcao.label}
                                onChange={(e) => atualizarOpcaoNovaVariacao(opcao.id, "label", e.target.value)}
                                className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold outline-none"
                                placeholder={`Nome da opção ${index + 1}`}
                              />

                              <select
                                value={opcao.arquivo}
                                onChange={(e) => atualizarOpcaoNovaVariacao(opcao.id, "arquivo", e.target.value)}
                                className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold outline-none"
                              >
                                <option value="">Selecionar desenho</option>
                                {todosDesenhos.map((d) => (
                                  <option key={d.arquivo} value={d.arquivo}>{d.label}</option>
                                ))}
                              </select>
                            </div>

                            <input
                              type="text"
                              value={opcao.arquivo}
                              onChange={(e) => atualizarOpcaoNovaVariacao(opcao.id, "arquivo", e.target.value.trim())}
                              className="w-full mt-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold outline-none"
                              placeholder="Ou digite manualmente o arquivo (ex: desenho-custom.png)"
                            />

                            {opcao.arquivo && (
                              <p className="text-[11px] text-gray-400 mt-1 truncate">
                                {desenhosPorArquivo.get(opcao.arquivo)?.label || opcao.arquivo}
                              </p>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={adicionarOpcaoNovaVariacao}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-all"
                        >
                          <Plus size={12} /> Adicionar opção
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={salvarVariacaoManual}
                        className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm hover:opacity-90 transition-all"
                        style={{ backgroundColor: theme.menuBackgroundColor }}
                      >
                        {variacaoCustomSelecionadaId ? "Atualizar variação" : "Salvar variação"}
                      </button>

                      {variacaoCustomSelecionadaId && (
                        <button
                          type="button"
                          onClick={() => removerVariacaoManual(variacaoCustomSelecionadaId)}
                          className="ml-2 px-4 py-2 rounded-xl text-xs font-black bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all"
                        >
                          Excluir variação
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── ABA FOLHAS ──────────────────────────────────────────── */}
              {abaAtiva === "folhas" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-gray-400 font-bold">
                      Defina quantas folhas iguais cada item terá e a fórmula de largura/altura de cada configuração.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={aplicarPresetEmTodasFolhas}
                        disabled={form.folhas.length === 0}
                        className="px-3 py-2 rounded-xl text-[11px] font-black border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-all disabled:opacity-40"
                      >
                        Aplicar em Todas
                      </button>
                      <button
                        onClick={adicionarFolha}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all"
                        style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                      >
                        <Plus size={13} /> Adicionar Folha
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Cola rápida</p>
                      <div className="space-y-1 text-xs text-blue-900 font-medium">
                        <p><strong>L</strong> = Largura total</p>
                        <p><strong>A</strong> = Altura total</p>
                        <p><strong>L1</strong> = Largura lado A</p>
                        <p><strong>L2</strong> = Largura lado B</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Mais variáveis</p>
                      <div className="space-y-1 text-xs text-amber-900 font-medium">
                        <p><strong>A1</strong> = Altura lado A</p>
                        <p><strong>A2</strong> = Altura lado B</p>
                        <p><strong>AB</strong> = Altura porta até bandeira</p>
                        <p className="pt-1">Exemplos: L / 2 - 5, A - 20, AB - 10</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Quantidade</p>
                      <p className="text-xs text-emerald-800 font-medium">Use a quantidade para repetir a mesma configuração de folha sem precisar cadastrar linhas duplicadas.</p>
                    </div>
                  </div>

                  {form.folhas.length === 0 && (
                    <div className="text-center py-12 text-gray-300 text-sm font-bold">
                      Nenhuma folha adicionada
                    </div>
                  )}

                  {form.folhas.map((folha, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100" style={folha.variacao_restrita ? { borderLeftColor: "#8b5cf6", borderLeftWidth: "4px" } : {}}>
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <span
                          className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg"
                          style={{ backgroundColor: `${theme.menuBackgroundColor}15`, color: theme.menuBackgroundColor }}
                        >
                          Folha {folha.numero_folha}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => aplicarPresetEmFolha(idx)}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border border-gray-200 text-gray-600 bg-white hover:bg-gray-100 transition-all"
                          >
                            Aplicar Preset
                          </button>
                          <button
                            onClick={() => removerFolha(idx)}
                            className="p-1.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                            Tipo da Folha
                          </label>
                          <select
                            value={folha.tipo_folha}
                            onChange={e => atualizarFolha(idx, "tipo_folha", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          >
                            {TIPOS_FOLHA.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                            Quantidade de Folhas
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={folha.quantidade_folhas}
                            onChange={e => atualizarFolha(idx, "quantidade_folhas", Math.max(1, Number(e.target.value || 1)))}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                            Fórmula Largura
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: L / 2 - 5"
                            value={folha.formula_largura}
                            onChange={e => atualizarFolha(idx, "formula_largura", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-mono outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                            Fórmula Altura
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: A - 10"
                            value={folha.formula_altura}
                            onChange={e => atualizarFolha(idx, "formula_altura", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-mono outline-none"
                          />
                        </div>
                        {projetoEhPorta && (
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                              Tipo de Trilho (Porta)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {TRILHO_PORTA_OPCOES.map((opcao) => {
                                const selecionados = (folha.trilho_restrito || "").split(",").map(s => s.trim()).filter(Boolean)
                                const ativo = selecionados.includes(opcao.value)
                                return (
                                  <button
                                    key={opcao.value}
                                    type="button"
                                    onClick={() => {
                                      const novosTrilhos = ativo 
                                        ? selecionados.filter(v => v !== opcao.value)
                                        : [...selecionados, opcao.value]
                                      atualizarFolha(idx, "trilho_restrito", novosTrilhos.length > 0 ? novosTrilhos.join(",") : null)
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                    style={{
                                      backgroundColor: ativo ? "#f3f4f6" : "#fafbfc",
                                      borderColor: ativo ? "#374151" : "#e5e7eb",
                                      color: ativo ? "#374151" : "#9ca3af",
                                    }}
                                  >
                                    {opcao.label}
                                  </button>
                                )
                              })}
                            </div>
                            {!folha.trilho_restrito && (
                              <span className="text-[10px] text-gray-400 italic">Nenhum — aplica em todos</span>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">
                              Um vidro pode servir para múltiplos tipos. Filtra o cálculo quando cliente escolhe trilho.
                            </p>
                          </div>
                        )}
                        {variacaoOpcoesFolha.length > 0 && (
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: "#7c3aed" }}>
                              Tipo de Box
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {variacaoOpcoesFolha.map(op => {
                                const selecionados = (folha.variacao_restrita || "").split(",").map(s => s.trim()).filter(Boolean)
                                const ativo = selecionados.includes(op.arquivo)
                                return (
                                  <button
                                    key={op.arquivo}
                                    type="button"
                                    onClick={() => {
                                      const novos = ativo ? selecionados.filter(v => v !== op.arquivo) : [...selecionados, op.arquivo]
                                      atualizarFolha(idx, "variacao_restrita", novos.length > 0 ? novos.join(",") : null)
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                    style={{
                                      backgroundColor: ativo ? "#f5f3ff" : "#f9fafb",
                                      borderColor: ativo ? "#8b5cf6" : "#e5e7eb",
                                      color: ativo ? "#6d28d9" : "#9ca3af",
                                    }}
                                  >
                                    {getNomeVariacao(op.arquivo, op.label)}
                                  </button>
                                )
                              })}
                              {!folha.variacao_restrita && (
                                <span className="text-[10px] text-gray-400 italic self-center">Nenhuma — aplica em todas</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── ABA KITS ─────────────────────────────────────────────── */}
              {abaAtiva === "kits" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-bold">Vincule kits que devem ser escolhidos pelo orçamento conforme espessura e medida mais próxima.</p>
                    <button
                      onClick={handleAdicionarKitClick}
                      disabled={!kitsDB.length}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                      style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                    >
                      <Plus size={13} /> Adicionar Kit
                    </button>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 font-medium">
                    Exemplo: numa porta de 2 folhas, o orçamento consulta os kits vinculados, filtra pela espessura do vidro e escolhe o kit cuja largura/altura de referência ficar mais próxima da medida calculada.
                  </div>

                  {variacoesDesenho.length > 0 && (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3">
                      <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Variações detectadas neste projeto</p>
                      <p className="text-xs text-violet-900 font-medium">
                        Variações:{" "}
                        {variacoesDesenho.map((g, i) => (
                          <span key={g.id}>{i > 0 && " · "}<strong>{g.label}</strong> ({g.opcoes.map(o => o.label).join(" / ")})</span>
                        ))}.
                        {" "}Use <strong className="text-violet-700">&quot;Aplica em&quot;</strong> para restringir um kit a uma variação. Sem restrição, o kit é considerado em todas.
                      </p>
                    </div>
                  )}

                  {!kitsDB.length && (
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 text-xs font-bold">
                      Nenhum kit cadastrado. Acesse Cadastros → Kits primeiro.
                    </div>
                  )}

                  {!!kitsDB.length && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                        <div className="relative flex-1">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Digite para filtrar kits por nome ou categoria"
                            value={buscaKitDisponivel}
                            onChange={e => setBuscaKitDisponivel(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={selecionarOuLimparTodosKitsFiltrados}
                            disabled={kitsDisponiveisFiltrados.length === 0}
                            className="px-3 py-2 rounded-xl text-xs font-black border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
                          >
                            {kitsDisponiveisFiltrados.length > 0 && kitsDisponiveisFiltrados.every((item) => kitsSelecionadosParaAdicionar.includes(String(item.id)))
                              ? "Limpar filtrados"
                              : "Selecionar filtrados"}
                          </button>
                          <button
                            type="button"
                            onClick={adicionarKitsSelecionados}
                            disabled={kitsSelecionadosParaAdicionar.length === 0}
                            className="px-3 py-2 rounded-xl text-xs font-black shadow-sm disabled:opacity-40"
                            style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                          >
                            Adicionar selecionados ({kitsSelecionadosParaAdicionar.length})
                          </button>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-2 space-y-2">
                        {kitsDisponiveisFiltrados.length === 0 ? (
                          <div className="px-3 py-8 text-center text-xs font-bold text-gray-300">
                            Nenhum kit encontrado para este filtro.
                          </div>
                        ) : kitsDisponiveisFiltrados.map((item) => {
                          const kitId = String(item.id)
                          const selecionado = kitsSelecionadosParaAdicionar.includes(kitId)

                          return (
                            <label
                              key={kitId}
                              className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all"
                              style={selecionado
                                ? { backgroundColor: `${theme.menuBackgroundColor}12`, borderColor: `${theme.menuBackgroundColor}40` }
                                : { backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
                            >
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={() => alternarSelecaoKitParaAdicionar(kitId)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black truncate" style={{ color: theme.contentTextLightBg }}>
                                  {item.nome}
                                </p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                  Ref. {Number(item.largura || 0)} x {Number(item.altura || 0)} mm{item.categoria ? ` · ${item.categoria}` : ""}
                                </p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {form.kits.length === 0 && !!kitsDB.length && (
                    <div className="text-center py-12 text-gray-300 text-sm font-bold">Nenhum kit vinculado</div>
                  )}

                  {form.kits.map((kit, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3"
                      style={kit.variacao_restrita ? { borderLeftColor: "#8b5cf6", borderLeftWidth: "4px" } : {}}
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Kit</label>
                          <select
                            value={kit.kit_id}
                            onChange={e => atualizarKit(idx, "kit_id", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          >
                            {kitsDB.map(item => (
                              <option key={item.id} value={item.id}>{formatarRotuloKit(item)}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-[10px] text-gray-400 font-medium">
                            Referência selecionada: {kit.largura_referencia} x {kit.altura_referencia} mm
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Espessura do Vidro</label>
                          <input
                            type="text"
                            placeholder="Ex: 8mm"
                            value={kit.espessura_vidro}
                            onChange={e => atualizarKit(idx, "espessura_vidro", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tolerância (mm)</label>
                          <input
                            type="number"
                            min={0}
                            value={kit.tolerancia_mm}
                            onChange={e => atualizarKit(idx, "tolerancia_mm", Number(e.target.value))}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Largura de Referência</label>
                          <input
                            type="number"
                            min={0}
                            value={kit.largura_referencia}
                            onChange={e => atualizarKit(idx, "largura_referencia", Number(e.target.value))}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Altura de Referência</label>
                          <input
                            type="number"
                            min={0}
                            value={kit.altura_referencia}
                            onChange={e => atualizarKit(idx, "altura_referencia", Number(e.target.value))}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div className="md:col-span-2 xl:col-span-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Observação</label>
                          <input
                            type="text"
                            placeholder="Ex: usar quando porta 2 folhas com bandeira"
                            value={kit.observacao}
                            onChange={e => atualizarKit(idx, "observacao", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none"
                          />
                        </div>
                        {variacaoOpcoesKit.length > 0 && (
                          <div className="md:col-span-2 xl:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: "#7c3aed" }}>
                              Tipo de kit (qual variação usa?)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => atualizarKit(idx, "variacao_restrita", null)}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                style={{
                                  backgroundColor: !kit.variacao_restrita ? "#f5f3ff" : "#f9fafb",
                                  borderColor: !kit.variacao_restrita ? "#8b5cf6" : "#e5e7eb",
                                  color: !kit.variacao_restrita ? "#6d28d9" : "#9ca3af",
                                }}
                              >
                                Todas as variações
                              </button>
                              {variacaoOpcoesKit.map(op => {
                                const selecionados = (kit.variacao_restrita || "").split(",").map(s => s.trim()).filter(Boolean)
                                const ativo = selecionados.includes(op.arquivo)
                                return (
                                  <button
                                    key={op.arquivo}
                                    type="button"
                                    onClick={() => {
                                      const novos = ativo ? selecionados.filter(v => v !== op.arquivo) : [...selecionados, op.arquivo]
                                      atualizarKit(idx, "variacao_restrita", novos.length > 0 ? novos.join(",") : null)
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                    style={{
                                      backgroundColor: ativo ? "#f5f3ff" : "#f9fafb",
                                      borderColor: ativo ? "#8b5cf6" : "#e5e7eb",
                                      color: ativo ? "#6d28d9" : "#9ca3af",
                                    }}
                                  >
                                    {getNomeVariacao(op.arquivo, op.label)}
                                  </button>
                                )
                              })}
                              {!kit.variacao_restrita && (
                                <span className="text-[10px] text-gray-400 italic self-center">Aplica em todos os tipos</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removerKit(idx)}
                        className="mt-6 p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── ABA FERRAGENS ────────────────────────────────────────── */}
              {abaAtiva === "ferragens" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-bold">Ferragens necessárias e quantidades em barra para este modelo.</p>
                    <button
                      onClick={adicionarFerragem}
                      disabled={!getFerragensDisponiveis().length}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                      style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                    >
                      <Plus size={13} /> Adicionar
                    </button>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 font-medium">
                    Nesta etapa o cadastro considera ferragens por barra e sem definição de cor. A cor será escolhida depois no orçamento/motor de cálculo. Quando o projeto trabalhar com kit, use a aba de kits para buscar o kit correto pela medida mais próxima e pela espessura do vidro.
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900 font-medium">
                    Marque aqui quais ferragens entram como acessórios do cálculo de kit e quais entram no cálculo ligado aos perfis. Assim o orçamento consegue somar: vidros + kit mais próximo + acessórios necessários.
                  </div>

                  {variacoesDesenho.length > 0 && (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3">
                      <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1.5">
                        Atenção — este projeto tem variações
                      </p>
                      <p className="text-xs text-violet-900 font-medium">
                        Variações detectadas:{" "}
                        {variacoesDesenho.map((g, i) => (
                          <span key={g.id}>{i > 0 && " · "}<strong>{g.label}</strong> ({g.opcoes.map(o => o.label).join(" / ")})</span>
                        ))}.
                        {" "}Use <strong className="text-violet-700">&quot;Aplica em&quot;</strong> em cada ferragem para indicar se ela é exclusiva de uma variação — exemplo: o <em>trinco</em> só entra na variação &quot;Com trinco&quot;.
                      </p>
                    </div>
                  )}

                  {!ferragensDB.length && (
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 text-xs font-bold">
                      Nenhuma ferragem cadastrada. Acesse Cadastros → Ferragens primeiro.
                    </div>
                  )}

                  {!!ferragensDB.length && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                        <div className="relative flex-1">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Digite para filtrar ferragens por codigo, nome ou categoria"
                            value={buscaFerragemDisponivel}
                            onChange={e => setBuscaFerragemDisponivel(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={selecionarOuLimparTodasFerragensFiltradas}
                            disabled={ferragensDisponiveisFiltradas.length === 0}
                            className="px-3 py-2 rounded-xl text-xs font-black border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
                          >
                            {ferragensDisponiveisFiltradas.length > 0 && ferragensDisponiveisFiltradas.every((item) => ferragensSelecionadasParaAdicionar.includes(String(item.id)))
                              ? "Limpar filtradas"
                              : "Selecionar filtradas"}
                          </button>
                          <button
                            type="button"
                            onClick={adicionarFerragensSelecionadas}
                            disabled={ferragensSelecionadasParaAdicionar.length === 0}
                            className="px-3 py-2 rounded-xl text-xs font-black shadow-sm disabled:opacity-40"
                            style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                          >
                            Adicionar selecionadas ({ferragensSelecionadasParaAdicionar.length})
                          </button>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-2 space-y-2">
                        {ferragensDisponiveisFiltradas.length === 0 ? (
                          <div className="px-3 py-8 text-center text-xs font-bold text-gray-300">
                            Nenhuma ferragem encontrada para este filtro.
                          </div>
                        ) : ferragensDisponiveisFiltradas.map((item) => {
                          const ferragemId = String(item.id)
                          const selecionada = ferragensSelecionadasParaAdicionar.includes(ferragemId)

                          return (
                            <label
                              key={ferragemId}
                              className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all"
                              style={selecionada
                                ? { backgroundColor: `${theme.menuBackgroundColor}12`, borderColor: `${theme.menuBackgroundColor}40` }
                                : { backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
                            >
                              <input
                                type="checkbox"
                                checked={selecionada}
                                onChange={() => alternarSelecaoFerragemParaAdicionar(ferragemId)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black truncate" style={{ color: theme.contentTextLightBg }}>
                                  {formatarRotuloFerragem(item)}
                                </p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                  {item.categoria || "Sem categoria"}
                                </p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {form.ferragens.length === 0 && !!ferragensDB.length && (
                    <div className="text-center py-12 text-gray-300 text-sm font-bold">Nenhuma ferragem adicionada</div>
                  )}

                  {form.ferragens.map((f, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3"
                      style={f.variacao_restrita ? { borderLeftColor: "#8b5cf6", borderLeftWidth: "4px" } : {}}
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Buscar ferragem</label>
                          <input
                            type="text"
                            value={buscaFerragemPorLinha[idx] || ""}
                            onChange={e => setBuscaFerragemPorLinha(prev => ({ ...prev, [idx]: e.target.value }))}
                            placeholder="Digite código, nome ou categoria"
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ferragem</label>
                          <select
                            value={f.ferragem_id}
                            onChange={e => atualizarFerragem(idx, "ferragem_id", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          >
                            {getFerragensFiltradas(idx, String(f.ferragem_id)).length === 0 && (
                              <option value={f.ferragem_id}>Nenhuma ferragem encontrada</option>
                            )}
                            {getFerragensFiltradas(idx, String(f.ferragem_id)).map((fer) => (
                              <option key={fer.id} value={fer.id}>
                                {formatarRotuloFerragem(fer)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Quantidade</label>
                          <input
                            type="number"
                            min={1}
                            value={f.quantidade}
                            onChange={e => atualizarFerragem(idx, "quantidade", Number(e.target.value))}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="w-full flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={f.usar_no_kit}
                              onChange={e => atualizarFerragem(idx, "usar_no_kit", e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm font-bold text-gray-600">Aplicar no modo Kit</span>
                          </label>
                        </div>
                        <div className="flex items-end">
                          <label className="w-full flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={f.usar_no_perfil}
                              onChange={e => atualizarFerragem(idx, "usar_no_perfil", e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm font-bold text-gray-600">Aplicar no modo Barra</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2 xl:col-span-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Observação</label>
                          <input
                            type="text"
                            value={f.observacao}
                            onChange={e => atualizarFerragem(idx, "observacao", e.target.value)}
                            placeholder="Ex: acessório obrigatório quando usar kit de porta 2 folhas"
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none"
                          />
                        </div>
                        {(variacaoOpcoesFerragemKit.length > 0 || variacaoOpcoesFerragemBoxDesenho.length > 0) && (
                          <div className="sm:col-span-2 xl:col-span-4">
                            <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: "#7c3aed" }}>
                              Aplicação por variação
                            </label>
                            {variacaoOpcoesFerragemKit.length > 0 && (
                              <div className="mb-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-violet-400 mb-1">Tipo de Kit</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {variacaoOpcoesFerragemKit.map(op => {
                                    const selecionados = (f.variacao_restrita || "").split(",").map(s => s.trim()).filter(Boolean)
                                    const ativo = selecionados.includes(op.arquivo)
                                    return (
                                      <button
                                        key={op.arquivo}
                                        type="button"
                                        onClick={() => {
                                          const novos = ativo ? selecionados.filter(v => v !== op.arquivo) : [...selecionados, op.arquivo]
                                          atualizarFerragem(idx, "variacao_restrita", novos.length > 0 ? novos.join(",") : null)
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                        style={{
                                          backgroundColor: ativo ? "#f5f3ff" : "#f9fafb",
                                          borderColor: ativo ? "#8b5cf6" : "#e5e7eb",
                                          color: ativo ? "#6d28d9" : "#9ca3af",
                                        }}
                                      >
                                        {getNomeVariacao(op.arquivo, op.label)}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            {variacaoOpcoesFerragemBoxDesenho.length > 0 && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-violet-400 mb-1">Tipo de Box / Desenho</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {variacaoOpcoesFerragemBoxDesenho.map(op => {
                                    const selecionados = (f.variacao_restrita || "").split(",").map(s => s.trim()).filter(Boolean)
                                    const ativo = selecionados.includes(op.arquivo)
                                    return (
                                      <button
                                        key={op.arquivo}
                                        type="button"
                                        onClick={() => {
                                          const novos = ativo ? selecionados.filter(v => v !== op.arquivo) : [...selecionados, op.arquivo]
                                          atualizarFerragem(idx, "variacao_restrita", novos.length > 0 ? novos.join(",") : null)
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                        style={{
                                          backgroundColor: ativo ? "#f5f3ff" : "#f9fafb",
                                          borderColor: ativo ? "#8b5cf6" : "#e5e7eb",
                                          color: ativo ? "#6d28d9" : "#9ca3af",
                                        }}
                                      >
                                        {getNomeVariacao(op.arquivo, op.label)}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            {!f.variacao_restrita && (
                              <span className="text-[10px] text-gray-400 italic self-center">Nenhuma — aplica em todas</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removerFerragem(idx)}
                        className="mt-6 p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── ABA PERFIS ───────────────────────────────────────────── */}
              {abaAtiva === "perfis" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-bold">Perfis do projeto com quantidades separadas para largura, altura e outros.</p>
                    <button
                      onClick={adicionarPerfil}
                      disabled={!getPerfisDisponiveis().length}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                      style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                    >
                      <Plus size={13} /> Adicionar
                    </button>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 font-medium">
                    Perfis ficam fixos como barra nesta etapa. A lista mostra uma opção por perfil, sem repetir as variações de cor, e o projeto preserva o item salvo ao reabrir a edição. Se o modelo for vendido em kit, use a aba de kits para o orçamento identificar o kit mais próximo pela medida e pela espessura do vidro.
                  </div>

                  {variacoesDesenho.length > 0 && (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3">
                      <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Variações detectadas</p>
                      <p className="text-xs text-violet-900 font-medium">
                        Use <strong className="text-violet-700">&quot;Aplica em&quot;</strong> para restringir um perfil a uma variação específica. Perfis sem restrição entram em todas as variações.
                      </p>
                    </div>
                  )}

                  {!perfisDB.length && (
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 text-xs font-bold">
                      Nenhum perfil cadastrado. Acesse Cadastros → Perfis primeiro.
                    </div>
                  )}

                  {!!perfisDB.length && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                        <div className="relative flex-1">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Digite para filtrar perfis por codigo, nome ou categoria"
                            value={buscaPerfilDisponivel}
                            onChange={e => setBuscaPerfilDisponivel(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={selecionarOuLimparTodosPerfisFiltrados}
                            disabled={perfisDisponiveisFiltrados.length === 0}
                            className="px-3 py-2 rounded-xl text-xs font-black border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
                          >
                            {perfisDisponiveisFiltrados.length > 0 && perfisDisponiveisFiltrados.every((item) => perfisSelecionadosParaAdicionar.includes(String(item.id)))
                              ? "Limpar filtrados"
                              : "Selecionar filtrados"}
                          </button>
                          <button
                            type="button"
                            onClick={adicionarPerfisSelecionados}
                            disabled={perfisSelecionadosParaAdicionar.length === 0}
                            className="px-3 py-2 rounded-xl text-xs font-black shadow-sm disabled:opacity-40"
                            style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
                          >
                            Adicionar selecionados ({perfisSelecionadosParaAdicionar.length})
                          </button>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-2 space-y-2">
                        {perfisDisponiveisFiltrados.length === 0 ? (
                          <div className="px-3 py-8 text-center text-xs font-bold text-gray-300">
                            Nenhum perfil encontrado para este filtro.
                          </div>
                        ) : perfisDisponiveisFiltrados.map((item) => {
                          const perfilId = String(item.id)
                          const selecionado = perfisSelecionadosParaAdicionar.includes(perfilId)

                          return (
                            <label
                              key={perfilId}
                              className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all"
                              style={selecionado
                                ? { backgroundColor: `${theme.menuBackgroundColor}12`, borderColor: `${theme.menuBackgroundColor}40` }
                                : { backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
                            >
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={() => alternarSelecaoPerfilParaAdicionar(perfilId)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black truncate" style={{ color: theme.contentTextLightBg }}>
                                  {formatarRotuloItemTecnico(item)}
                                </p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                  {item.categoria || "Sem categoria"}
                                </p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {form.perfis.length === 0 && !!perfisDB.length && (
                    <div className="text-center py-12 text-gray-300 text-sm font-bold">Nenhum perfil adicionado</div>
                  )}

                  {form.perfis.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3"
                      style={p.variacao_restrita ? { borderLeftColor: "#8b5cf6", borderLeftWidth: "4px" } : {}}
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Buscar perfil</label>
                          <input
                            type="text"
                            value={buscaPerfilPorLinha[idx] || ""}
                            onChange={e => setBuscaPerfilPorLinha(prev => ({ ...prev, [idx]: e.target.value }))}
                            placeholder="Digite código, nome ou categoria"
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Perfil</label>
                          <select
                            value={p.perfil_id}
                            onChange={e => atualizarPerfil(idx, "perfil_id", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          >
                            {getPerfisFiltrados(idx, String(p.perfil_id), p.nome).length === 0 && (
                              <option value={p.perfil_id}>Nenhum perfil encontrado</option>
                            )}
                            {getPerfisFiltrados(idx, String(p.perfil_id), p.nome).map((per) => (
                              <option key={per.id} value={per.id}>
                                {formatarRotuloItemTecnico(per)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Qtd Largura</label>
                          <input
                            type="number"
                            min={0}
                            value={p.qtd_largura}
                            onChange={e => atualizarPerfil(idx, "qtd_largura", Number(e.target.value))}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Qtd Altura</label>
                          <input
                            type="number"
                            min={0}
                            value={p.qtd_altura}
                            onChange={e => atualizarPerfil(idx, "qtd_altura", Number(e.target.value))}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Qtd Outros</label>
                          <input
                            type="number"
                            min={0}
                            value={p.qtd_outros}
                            onChange={e => atualizarPerfil(idx, "qtd_outros", Number(e.target.value))}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Forma de Venda</label>
                          <div className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-500">
                            Em Barra
                          </div>
                        </div>
                        <div className="sm:col-span-2 xl:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: "#0891b2" }}>
                            Condição de aplicação
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: A > 1900  |  L >= 1200  |  A >= 1800 (vazio = sempre)"
                            value={p.condicao || ""}
                            onChange={e => atualizarPerfil(idx, "condicao", e.target.value.trim() || null)}
                            className="w-full p-2.5 rounded-xl text-xs font-bold outline-none border transition-all"
                            style={{
                              backgroundColor: p.condicao ? "#ecfeff" : "#ffffff",
                              borderColor: p.condicao ? "#06b6d4" : "#e5e7eb",
                              color: p.condicao ? "#0e7490" : "#6b7280",
                            }}
                          />
                          {p.condicao && (
                            <p className="text-[10px] text-cyan-600 mt-0.5 font-bold">Só entra no cálculo quando: {p.condicao}</p>
                          )}
                        </div>
                        <div className="sm:col-span-2 xl:col-span-1">
                          <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: "#0f766e" }}>
                            Calcular Junto no Kit
                          </label>
                          <button
                            type="button"
                            onClick={() => atualizarPerfil(idx, "usar_no_kit", !p.usar_no_kit)}
                            className="w-full p-2.5 rounded-xl text-xs font-black border transition-all"
                            style={{
                              backgroundColor: p.usar_no_kit ? "#ecfdf5" : "#ffffff",
                              borderColor: p.usar_no_kit ? "#10b981" : "#e5e7eb",
                              color: p.usar_no_kit ? "#047857" : "#6b7280",
                            }}
                          >
                            {p.usar_no_kit ? "Sim - incluir também no modo Kit" : "Não - só no modo Barra"}
                          </button>
                        </div>
                        <div className="sm:col-span-2 xl:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: "#b45309" }}>
                            Espessura do vidro para este perfil
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { valor: null, label: "Todas" },
                              { valor: "8mm", label: "8mm" },
                              { valor: "10mm", label: "10mm" },
                            ].map((opcao) => {
                              const ativo = (p.espessura_vidro_restrita || null) === opcao.valor
                              return (
                                <button
                                  key={opcao.label}
                                  type="button"
                                  onClick={() => atualizarPerfil(idx, "espessura_vidro_restrita", opcao.valor)}
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                  style={{
                                    backgroundColor: ativo ? "#fff7ed" : "#f9fafb",
                                    borderColor: ativo ? "#f59e0b" : "#e5e7eb",
                                    color: ativo ? "#b45309" : "#9ca3af",
                                  }}
                                >
                                  {opcao.label}
                                </button>
                              )
                            })}
                          </div>
                          {!p.espessura_vidro_restrita && (
                            <p className="text-[10px] text-gray-400 mt-1">Sem filtro de espessura. O perfil vale para qualquer espessura.</p>
                          )}
                        </div>
                        {variacaoOpcoesPerfil.length > 0 && (
                          <div className="sm:col-span-2 xl:col-span-5">
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: "#7c3aed" }}>
                              Aplica em qual variação? (altura/desenho)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => atualizarPerfil(idx, "variacao_restrita", null)}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                style={{
                                  backgroundColor: !p.variacao_restrita ? "#f5f3ff" : "#f9fafb",
                                  borderColor: !p.variacao_restrita ? "#8b5cf6" : "#e5e7eb",
                                  color: !p.variacao_restrita ? "#6d28d9" : "#9ca3af",
                                }}
                              >
                                Todas as variações
                              </button>
                              {variacaoOpcoesPerfil.map(op => {
                                const selecionados = (p.variacao_restrita || "").split(",").map(s => s.trim()).filter(Boolean)
                                const ativo = selecionados.includes(op.arquivo)
                                return (
                                  <button
                                    key={op.arquivo}
                                    type="button"
                                    onClick={() => {
                                      const novos = ativo ? selecionados.filter(v => v !== op.arquivo) : [...selecionados, op.arquivo]
                                      atualizarPerfil(idx, "variacao_restrita", novos.length > 0 ? novos.join(",") : null)
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                    style={{
                                      backgroundColor: ativo ? "#f5f3ff" : "#f9fafb",
                                      borderColor: ativo ? "#8b5cf6" : "#e5e7eb",
                                      color: ativo ? "#6d28d9" : "#9ca3af",
                                    }}
                                  >
                                    {op.label}
                                  </button>
                                )
                              })}
                              {!p.variacao_restrita && (
                                <span className="text-[10px] text-gray-400 italic self-center">Aplica em todas</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removerPerfil(idx)}
                        className="mt-6 p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Footer modal */}
            <div
              className="flex items-center justify-between px-6 py-4 border-t shrink-0"
              style={{ borderColor: `${theme.menuBackgroundColor}22`, backgroundColor: "#ffffffcc" }}
            >
              <button
                onClick={fecharModal}
                className="px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all"
                style={{ backgroundColor: `${theme.menuBackgroundColor}12` }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-black shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
              >
                {salvando
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Save size={15} />
                }
                {editandoId ? "Atualizar" : "Salvar Projeto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseDraftModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black text-slate-800 mb-2">Alterações não salvas</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Há alterações não salvas. Fechar agora manterá um rascunho para você continuar depois. Deseja fechar?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCloseDraftModal(false)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={fecharModalSemConfirmacao}
                className="flex-1 py-2.5 rounded-2xl text-sm font-black text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: theme.menuBackgroundColor }}
              >
                Fechar e manter rascunho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de avisos */}
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
    </div>
  )
}