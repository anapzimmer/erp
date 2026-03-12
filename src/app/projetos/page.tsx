"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import Image from "next/image"
import {
  Plus, X, Trash2, Edit2, Package, Layers, Wrench,
  Save, Grid3x3, FolderOpen, ImageIcon, AlignLeft,
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

const deduplicarItensTecnicos = <T extends { codigo?: string | null; nome?: string | null }>(lista: T[]) => {
  const mapa = new Map<string, T>()
  for (const item of lista) {
    const chaveCodigo = String(item.codigo || "").toLowerCase().trim()
    const chaveNome = limparNomeTecnico(item.nome)
    const chave = chaveNome || chaveCodigo
    if (!chave) continue
    if (!mapa.has(chave)) mapa.set(chave, item)
  }
  return Array.from(mapa.values())
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
type ProjetoFolha = {
  id?: string
  numero_folha: number
  tipo_folha: string
  formula_largura: string
  formula_altura: string
  observacao: string
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
}
type ProjetoFerragem = {
  id?: string
  ferragem_id: string
  nome?: string
  quantidade: number
  usar_no_kit: boolean
  usar_no_perfil: boolean
  observacao: string
}
type ProjetoPerfil = {
  id?: string
  perfil_id: string
  nome?: string
  qtd_largura: number
  qtd_altura: number
  qtd_outros: number
  tipo_fornecimento: "barra"
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
  categoria?: string | null
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

// ─── CATÁLOGO DE DESENHOS ────────────────────────────────────────────────────
const DESENHOS: Record<string, { label: string; arquivo: string }[]> = {
  "Portas": [
    { label: "Porta 2 Folhas Completo", arquivo: "porta2fls-completo.png" },
    { label: "Porta 2 Folhas Simples", arquivo: "porta2fls-simples.png" },
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

const criarOpcaoVersao = (stem: string): VariacaoOpcao => {
  const nome = stem.split("-").pop() || ""
  const numeroMatch = nome.match(/(\d+)$/)
  const base = nome.replace(/\d+$/, "")

  if (base === "simples") {
    return { key: stem, label: "Simples", arquivo: criarArquivo(stem) }
  }

  if (base === "completo" || base === "completa") {
    const sufixo = numeroMatch ? ` ${numeroMatch[1]}` : ""
    return { key: stem, label: `Completo${sufixo}`, arquivo: criarArquivo(stem) }
  }

  return { key: stem, label: nome.toUpperCase(), arquivo: criarArquivo(stem) }
}

const getVariacoesDesenho = (arquivoAtual: string): VariacaoGrupo[] => {
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

    if (STEMS_DESENHOS.has(stemCI) && STEMS_DESENHOS.has(stemCS)) {
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

  const baseVersao = stemAtual.replace(/-(simples|completo\d*|completa\d*)$/, "")
  if (baseVersao !== stemAtual) {
    const regexFamilia = new RegExp(`^${escapeRegExp(baseVersao)}-(simples|completo\\d*|completa\\d*)$`)
    const stemsFamilia = Array.from(STEMS_DESENHOS).filter((stem) => regexFamilia.test(stem))

    if (stemsFamilia.length >= 2) {
      const opcoes = stemsFamilia
        .sort((a, b) => {
          const aNome = a.split("-").pop() || ""
          const bNome = b.split("-").pop() || ""

          const rank = (nome: string) => {
            if (nome === "simples") return 0
            if (nome === "completo" || nome === "completa") return 1
            if (/^completo\d+$/.test(nome) || /^completa\d+$/.test(nome)) return 2
            return 3
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
  if (/porta|deslizante|pma|giro|pivotante|maxim|basculante/.test(textoProjeto)) return "portas"
  if (/janela/.test(textoProjeto)) return "janelas"
  if (/box/.test(textoProjeto)) return "box"
  return "generico"
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
  const [ferragensDB, setFerragensDB] = useState<FerragemDBItem[]>([])
  const [perfisDB, setPerfisDB] = useState<PerfilDBItem[]>([])
  const [carregando, setCarregando] = useState(true)

  // ── Modal formulário ──
  const [showModal, setShowModal] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<"geral" | "folhas" | "kits" | "ferragens" | "perfis">("geral")
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // ── Picker de desenho ──
  const [showPicker, setShowPicker] = useState(false)
  const [categoriaPicker, setCategoriaPicker] = useState("Portas")
  const [variacoesCustom, setVariacoesCustom] = useState<VariacaoCustom[]>([])
  const [novaVariacaoNome, setNovaVariacaoNome] = useState("")
  const [novaVariacaoOpcoes, setNovaVariacaoOpcoes] = useState<VariacaoCustomDraftOpcao[]>([
    { id: "a", label: "Opção A", arquivo: "" },
    { id: "b", label: "Opção B", arquivo: "" },
  ])

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
      supabase.from("kits").select("id, nome, largura, altura, categoria").eq("empresa_id", empresaId).order("nome"),
      supabase.from("ferragens").select("id, nome, codigo, categoria").eq("empresa_id", empresaId).order("nome"),
      supabase.from("perfis").select("id, nome, codigo, categoria").eq("empresa_id", empresaId).order("nome"),
    ])
    if (resProjetos.data) setProjetos(resProjetos.data)
    if (resKits.data) setKitsDB(resKits.data as KitDBItem[])
    if (resFerragens.data) setFerragensDB(deduplicarItensTecnicos(resFerragens.data as FerragemDBItem[]))
    if (resPerfis.data) setPerfisDB(deduplicarItensTecnicos(resPerfis.data as PerfilDBItem[]))
    setCarregando(false)
  }, [empresaId])

  const storageVariacoesKey = `projetos:variacoes-custom:${empresaId || "global"}`

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

  // ─── ABRIR EDIÇÃO ─────────────────────────────────────────────────────────
  const abrirEdicao = async (projeto: Projeto) => {
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
      folhas: (detalhe.projetos_folhas || []).sort((a, b) => a.numero_folha - b.numero_folha),
      kits: (detalhe.projetos_kits || []).map((k) => ({ ...k, nome: k.kits?.nome || undefined })),
      ferragens: (detalhe.projetos_ferragens || []).map((f) => ({ ...f, nome: f.ferragens?.nome || undefined })),
      perfis: (detalhe.projetos_perfis || []).map((p) => ({
        ...p,
        nome: p.perfis?.nome || undefined,
        qtd_largura: Number(p.qtd_largura ?? p.quantidade ?? 0),
        qtd_altura: Number(p.qtd_altura ?? 0),
        qtd_outros: Number(p.qtd_outros ?? 0),
      })),
    })
    setEditandoId(projeto.id)
    setAbaAtiva("geral")
    setShowModal(true)
  }

  // ─── SALVAR ───────────────────────────────────────────────────────────────
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

      if (editandoId) {
        await supabase.from("projetos").update({
          nome: form.nome.trim(),
          categoria: form.categoria,
          desenho: form.desenho,
        }).eq("id", editandoId)

        await Promise.all([
          supabase.from("projetos_folhas").delete().eq("projeto_id", editandoId),
          supabase.from("projetos_kits").delete().eq("projeto_id", editandoId),
          supabase.from("projetos_ferragens").delete().eq("projeto_id", editandoId),
          supabase.from("projetos_perfis").delete().eq("projeto_id", editandoId),
        ])
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

      if (form.folhas.length > 0) {
        await supabase.from("projetos_folhas").insert(
          form.folhas.map(f => ({
            projeto_id: projetoId,
            numero_folha: f.numero_folha,
            tipo_folha: f.tipo_folha,
            formula_largura: f.formula_largura,
            formula_altura: f.formula_altura,
            observacao: f.observacao,
          }))
        )
      }

      if (form.kits.length > 0) {
        await supabase.from("projetos_kits").insert(
          form.kits.map(k => ({
            projeto_id: projetoId,
            kit_id: k.kit_id,
            espessura_vidro: k.espessura_vidro,
            largura_referencia: k.largura_referencia,
            altura_referencia: k.altura_referencia,
            tolerancia_mm: k.tolerancia_mm,
            observacao: k.observacao,
          }))
        )
      }

      if (form.ferragens.length > 0) {
        await supabase.from("projetos_ferragens").insert(
          form.ferragens.map(f => ({
            projeto_id: projetoId,
            ferragem_id: f.ferragem_id,
            quantidade: f.quantidade,
            usar_no_kit: f.usar_no_kit,
            usar_no_perfil: f.usar_no_perfil,
            observacao: f.observacao,
          }))
        )
      }

      if (form.perfis.length > 0) {
        await supabase.from("projetos_perfis").insert(
          form.perfis.map(p => ({
            projeto_id: projetoId,
            perfil_id: p.perfil_id,
            qtd_largura: p.qtd_largura,
            qtd_altura: p.qtd_altura,
            qtd_outros: p.qtd_outros,
            tipo_fornecimento: p.tipo_fornecimento,
          }))
        )
      }

      setModalAviso({
        titulo: "Salvo!",
        mensagem: `Projeto "${form.nome}" ${editandoId ? "atualizado" : "cadastrado"} com sucesso.`,
        tipo: "sucesso",
      })
      fecharModal()
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

  const fecharModal = () => {
    setShowModal(false)
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setAbaAtiva("geral")
    setShowPicker(false)
  }

  // ─── HELPERS FOLHAS ──────────────────────────────────────────────────────
  const adicionarFolha = () => {
    const numero = form.folhas.length + 1
    setForm(prev => ({
      ...prev,
      // Aplica fórmulas iniciais por tipo para acelerar o cadastro.
      folhas: [...prev.folhas, {
        numero_folha: numero,
        ...getPresetFolhaPorTipo(detectarTipoProjetoVisual(prev), numero),
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
  const adicionarKit = () => {
    if (!kitsDB.length) return
    const kit = kitsDB[0]
    setForm(prev => ({
      ...prev,
      kits: [...prev.kits, {
        kit_id: String(kit.id),
        nome: kit.nome,
        espessura_vidro: "8mm",
        largura_referencia: Number(kit.largura) || 0,
        altura_referencia: Number(kit.altura) || 0,
        tolerancia_mm: 50,
        observacao: "",
      }],
    }))
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
  const getFerragensDisponiveis = (ferragemAtualId?: string) => {
    const selecionadas = form.ferragens.map(item => String(item.ferragem_id))
    return ferragensDB.filter((item) => {
      const id = String(item.id)
      return id === String(ferragemAtualId || "") || !selecionadas.includes(id)
    })
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
      }],
    }))
  }
  const atualizarFerragem = <K extends keyof ProjetoFerragem>(i: number, campo: K, val: ProjetoFerragem[K]) => {
    setForm(prev => {
      const arr = [...prev.ferragens]
      if (campo === "ferragem_id") {
        const found = ferragensDB.find((x) => String(x.id) === String(val))
        arr[i] = { ...arr[i], ferragem_id: String(val), nome: found?.nome || "" }
      } else {
        arr[i] = { ...arr[i], [campo]: val }
      }
      return { ...prev, ferragens: arr }
    })
  }
  const removerFerragem = (i: number) => {
    setForm(prev => ({ ...prev, ferragens: prev.ferragens.filter((_, idx) => idx !== i) }))
  }

  // ─── HELPERS PERFIS ──────────────────────────────────────────────────────
  const getPerfisDisponiveis = (perfilAtualId?: string) => {
    const selecionados = form.perfis.map(item => String(item.perfil_id))
    return perfisDB.filter((item) => {
      const id = String(item.id)
      return id === String(perfilAtualId || "") || !selecionados.includes(id)
    })
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
      }],
    }))
  }
  const atualizarPerfil = <K extends keyof ProjetoPerfil>(i: number, campo: K, val: ProjetoPerfil[K]) => {
    setForm(prev => {
      const arr = [...prev.perfis]
      if (campo === "perfil_id") {
        const found = perfisDB.find((x) => String(x.id) === String(val))
        arr[i] = { ...arr[i], perfil_id: String(val), nome: found?.nome || "" }
      } else {
        arr[i] = { ...arr[i], [campo]: val }
      }
      return { ...prev, perfis: arr }
    })
  }
  const removerPerfil = (i: number) => {
    setForm(prev => ({ ...prev, perfis: prev.perfis.filter((_, idx) => idx !== i) }))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const todosDesenhos = Object.values(DESENHOS).flat()
  const desenhosPorArquivo = new Map(todosDesenhos.map((d) => [d.arquivo, d]))
  const desenhoAtual = todosDesenhos.find(d => d.arquivo === form.desenho)
  const variacoesAutomaticas = getVariacoesDesenho(form.desenho)
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

    if (arquivos.some((arquivo) => !ARQUIVOS_DESENHOS.has(arquivo))) {
      setModalAviso({ titulo: "Atenção", mensagem: "Um dos desenhos escolhidos não existe no catálogo.", tipo: "aviso" })
      return
    }

    const novaVariacao: VariacaoCustom = {
      id: `${Date.now()}`,
      label: nome,
      opcoes: opcoesSaneadas,
    }

    setVariacoesCustom((prev) => [...prev, novaVariacao])
    setNovaVariacaoNome("")
    setNovaVariacaoOpcoes([
      { id: "a", label: "Opção A", arquivo: form.desenho },
      { id: "b", label: "Opção B", arquivo: "" },
    ])
    setModalAviso({ titulo: "Sucesso", mensagem: "Variação personalizada cadastrada e salva para próximos projetos.", tipo: "sucesso" })
  }

  const removerVariacaoManual = (id: string) => {
    setVariacoesCustom((prev) => prev.filter((item) => item.id !== id))
  }

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
              <div>
                <h2 className="text-lg font-black" style={{ color: theme.modalTextColor || theme.contentTextLightBg }}>
                  {editandoId ? "Editar Projeto" : "Novo Projeto"}
                </h2>
                <p className="text-xs text-gray-400">{form.nome || "Preencha os dados abaixo"}</p>
              </div>
              <button
                onClick={fecharModal}
                className="p-2 rounded-xl text-gray-500 transition-all"
                style={{ backgroundColor: "#ffffffb3" }}
              >
                <X size={20} />
              </button>
            </div>

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

                    {showPicker && (
                      <div className="mt-2 border border-gray-100 rounded-2xl overflow-hidden shadow-lg bg-white">
                        {/* Tabs categorias */}
                        <div className="flex gap-1 p-2 overflow-x-auto bg-gray-50 border-b border-gray-100">
                          {Object.keys(DESENHOS).map(cat => (
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
                          {DESENHOS[categoriaPicker].map(d => (
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
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Variações do desenho
                      </p>

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
                                  {opcao.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-[11px] text-gray-400 mt-3">
                        Ao trocar a variação, o projeto mantém todos os dados e altera apenas o desenho.
                      </p>
                    </div>
                  )}

                  {form.desenho && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Cadastrar variação manual
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Se não existir variação automática, cadastre aqui uma vez e ela aparecerá nos próximos cadastros.
                      </p>

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
                        Salvar variação
                      </button>

                      {variacoesCustom.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            Variações personalizadas salvas
                          </p>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {variacoesCustom.map((grupo) => (
                              <div key={grupo.id} className="flex items-center justify-between gap-2 rounded-xl bg-white border border-gray-100 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-gray-600 truncate">{grupo.label}</p>
                                  <p className="text-[11px] text-gray-400 truncate">
                                    {grupo.opcoes.map((op) => `${op.label}: ${desenhosPorArquivo.get(op.arquivo)?.label || op.arquivo}`).join(" | ")}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removerVariacaoManual(grupo.id)}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                                  title="Remover variação"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
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
                      Defina quantas folhas o projeto terá, a fórmula de largura/altura de cada uma e uma observação opcional para orientar o orçamento.
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Observação</p>
                      <p className="text-xs text-emerald-800 font-medium">Salve instruções como &quot;folha central móvel&quot;, &quot;usar medida até bandeira&quot; ou &quot;conferir lado A e lado B&quot;.</p>
                    </div>
                  </div>

                  {form.folhas.length === 0 && (
                    <div className="text-center py-12 text-gray-300 text-sm font-bold">
                      Nenhuma folha adicionada
                    </div>
                  )}

                  {form.folhas.map((folha, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
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
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                            Observação da Folha
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Ex: Folha central móvel, usar medida de vão livre, conferir sobreposição no encontro."
                            value={folha.observacao}
                            onChange={e => atualizarFolha(idx, "observacao", e.target.value)}
                            className="w-full p-3 rounded-xl bg-white border border-gray-200 text-sm outline-none resize-none"
                            style={{ color: theme.contentTextLightBg }}
                          />
                        </div>
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
                      onClick={adicionarKit}
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

                  {!kitsDB.length && (
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 text-xs font-bold">
                      Nenhum kit cadastrado. Acesse Cadastros → Kits primeiro.
                    </div>
                  )}
                  {form.kits.length === 0 && !!kitsDB.length && (
                    <div className="text-center py-12 text-gray-300 text-sm font-bold">Nenhum kit vinculado</div>
                  )}

                  {form.kits.map((kit, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
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
                              <option key={item.id} value={item.id}>{item.nome}</option>
                            ))}
                          </select>
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

                  {!ferragensDB.length && (
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 text-xs font-bold">
                      Nenhuma ferragem cadastrada. Acesse Cadastros → Ferragens primeiro.
                    </div>
                  )}
                  {form.ferragens.length === 0 && !!ferragensDB.length && (
                    <div className="text-center py-12 text-gray-300 text-sm font-bold">Nenhuma ferragem adicionada</div>
                  )}

                  {form.ferragens.map((f, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ferragem</label>
                          <select
                            value={f.ferragem_id}
                            onChange={e => atualizarFerragem(idx, "ferragem_id", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          >
                            {getFerragensDisponiveis(String(f.ferragem_id)).map((fer) => (
                              <option key={fer.id} value={fer.id}>
                                {fer.codigo ? `${fer.codigo} - ${fer.nome}` : fer.nome}
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
                            <span className="text-sm font-bold text-gray-600">Usado no kit</span>
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
                            <span className="text-sm font-bold text-gray-600">Usado no perfil</span>
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
                    Perfis ficam fixos como barra e sem cor nesta etapa. A cor do perfil será definida depois no orçamento/motor de cálculo. Se o modelo for vendido em kit, use a aba de kits para o orçamento identificar o kit mais próximo pela medida e pela espessura do vidro.
                  </div>

                  {!perfisDB.length && (
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 text-xs font-bold">
                      Nenhum perfil cadastrado. Acesse Cadastros → Perfis primeiro.
                    </div>
                  )}
                  {form.perfis.length === 0 && !!perfisDB.length && (
                    <div className="text-center py-12 text-gray-300 text-sm font-bold">Nenhum perfil adicionado</div>
                  )}

                  {form.perfis.map((p, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Perfil</label>
                          <select
                            value={p.perfil_id}
                            onChange={e => atualizarPerfil(idx, "perfil_id", e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold outline-none"
                            style={{ color: theme.contentTextLightBg }}
                          >
                            {getPerfisDisponiveis(String(p.perfil_id)).map((per) => (
                              <option key={per.id} value={per.id}>
                                {per.codigo ? `${per.codigo} - ${per.nome}` : per.nome}
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