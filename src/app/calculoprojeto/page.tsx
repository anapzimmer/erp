"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/context/ThemeContext"
import { supabase } from "@/lib/supabaseClient"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import Image from "next/image"
import {
  Calculator, Package, Wrench, Square,
  AlertTriangle, CheckCircle2, Info,
  Scissors, Plus, Trash2, Save,
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

type ProjetoDetalhe = {
  folhas: Array<{
    numero_folha: number
    tipo_folha: string
    formula_largura: string
    formula_altura: string
    observacao: string
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
}

type FerragemItem = {
  id: string
  nome: string
  codigo?: string | null
  preco: number
  cores?: string[] | null
}

type PerfilItem = {
  id: string
  nome: string
  codigo?: string | null
  preco: number
  comprimento_barra?: number | null
  cores?: string[] | string | null
}

// Item de resultado de cálculo de folha
type FolhaCalculada = {
  numero: number
  tipo: string
  largura: number
  altura: number
  area: number
  vidro?: VidroItem | null
  precoM2Utilizado: number
  precoVidro: number
}

// Resultado de otimização de barra
type CorteOtimizado = {
  perfilNome: string
  comprimentoBarra: number
  qtdBarras: number
  cortes: number[]
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
}

type ResultadoProjetoCalculado = {
  itemId: string
  projeto: Projeto | null
  vidro: VidroItem | null
  qtdProjeto: number
  larguraProjeto: number
  alturaProjeto: number
  corMaterial: string
  usandoPrecoEspecialVidro: boolean
  precoVidroM2Aplicado: number
  resultado: ResultadoCalculo
}

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
})

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
): { qtdBarras: number; cortes: number[]; aproveitamento: number; desperdicioMm: number } => {
  if (!cortes.length || comprimentoBarra <= 0) {
    return { qtdBarras: 0, cortes: [], aproveitamento: 0, desperdicioMm: 0 }
  }
  const folga = 5 // mm de folga por corte de serra
  const sorted = [...cortes].sort((a, b) => b - a)
  const barras: number[] = [] // espaço restante em cada barra

  for (const corte of sorted) {
    const corteComFolga = corte + folga
    const idx = barras.findIndex(esp => esp >= corteComFolga)
    if (idx >= 0) {
      barras[idx] -= corteComFolga
    } else {
      barras.push(comprimentoBarra - corteComFolga)
    }
  }

  const qtdBarras = barras.length
  const totalUsado = sorted.reduce((s, c) => s + c + folga, 0)
  const totalDisponivel = qtdBarras * comprimentoBarra
  const desperdicio = totalDisponivel - totalUsado
  const aproveitamento = totalDisponivel > 0 ? Math.round((totalUsado / totalDisponivel) * 100) : 0

  return { qtdBarras, cortes: sorted, aproveitamento, desperdicioMm: desperdicio }
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
  kitsDB: KitItem[]
  ferragensDB: FerragemItem[]
  perfisDB: PerfilItem[]
  qtd: number
}): ResultadoCalculo => {
  const {
    detalhe, largura, altura, largura2, altura2,
    vidroSelecionado, precoVidroM2, corMaterial, modoCalculo, variacaoDrawing,
    kitsDB, ferragensDB, perfisDB, qtd,
  } = params

  // Variáveis disponíveis para fórmulas
  const vars: Record<string, number> = {
    L: largura, A: altura,
    L1: largura, L2: largura2 || largura,
    A1: altura, A2: altura2 || altura,
    AB: altura2 || altura,
  }

  // ── Calcular folhas de vidro ──────────────────────────────────────────────
  const folhasCalc: FolhaCalculada[] = detalhe.folhas.map(f => {
    const w = Math.max(avaliarFormula(f.formula_largura, vars), 0)
    const h = Math.max(avaliarFormula(f.formula_altura, vars), 0)
    const wR = arred50(w)
    const hR = arred50(h)
    const area = Math.max((wR * hR) / 1_000_000, 0.25)
    return {
      numero: f.numero_folha,
      tipo: f.tipo_folha,
      largura: wR,
      altura: hR,
      area,
      vidro: vidroSelecionado,
      precoM2Utilizado: precoVidroM2,
      precoVidro: area * precoVidroM2 * qtd,
    }
  })

  const totalVidro = folhasCalc.reduce((s, f) => s + f.precoVidro, 0)

  // ── Filtrar itens aplicáveis à variação atual ─────────────────────────────
  const isAplicavel = (varRestrita: string | null | undefined) =>
    !varRestrita || varRestrita === variacaoDrawing

  // ── Kit: encontrar o mais próximo ─────────────────────────────────────────
  let kitSelecionado: KitItem | null = null
  let precoKit = 0

  if (modoCalculo === "kit") {
    // kits do projeto filtrados pela variação e espessura do vidro
    const kitsAplicaveis = detalhe.kits.filter(k => isAplicavel(k.variacao_restrita))
    const espessura = vidroSelecionado?.espessura || ""

    // Filtra por espessura (se contém o texto da espessura do vidro)
    const kitsFiltrados = kitsAplicaveis.filter(k =>
      !k.espessura_vidro ||
      !espessura ||
      k.espessura_vidro.toLowerCase().includes(espessura.toLowerCase()) ||
      espessura.toLowerCase().includes(k.espessura_vidro.toLowerCase())
    )

    // Escolhe pelo menor delta (distância euclidiana entre L×A e largura_referencia×altura_referencia)
    let menorDelta = Infinity
    for (const kitProj of kitsFiltrados) {
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
    .filter(f => modoCalculo === "kit" ? f.usar_no_kit : f.usar_no_perfil)
    .map(f => {
      const db = ferragensDB.find(x => x.id === f.ferragem_id)
      const nome = db?.nome || f.ferragens?.nome || "Ferragem"
      const precoUnit = db?.preco || 0
      return {
        nome,
        qtd: f.quantidade,
        precoUnit,
        total: f.quantidade * precoUnit * qtd,
      }
    })

  const precoFerragens = ferragensResult.reduce((s, f) => s + f.total, 0)

  // ── Perfis: calcular cortes e otimizar barras ─────────────────────────────
  const cortesResult: CorteOtimizado[] = []
  let precoPerfis = 0

  if (modoCalculo === "barra") {
    const perfisAplicaveis = detalhe.perfis.filter(p => isAplicavel(p.variacao_restrita))

    for (const pProj of perfisAplicaveis) {
      const db = perfisDB.find(x => x.id === pProj.perfil_id)
      if (!db) continue

      const comprimentoBarra = db.comprimento_barra || 6000
      const precoBarra = db.preco || 0

      // Monta lista de cortes: qtd_largura peças de L, qtd_altura peças de A, qtd_outros de (L+A)/2
      const listaCortes: number[] = [
        ...Array(pProj.qtd_largura * qtd).fill(largura),
        ...Array(pProj.qtd_altura * qtd).fill(altura),
        ...Array(pProj.qtd_outros * qtd).fill(Math.round((largura + altura) / 2)),
      ].filter(c => c > 0)

      if (!listaCortes.length) continue

      const otim = otimizarBarras(listaCortes, comprimentoBarra)
      const precoTotalPerfil = otim.qtdBarras * precoBarra

      cortesResult.push({
        perfilNome: db.nome,
        comprimentoBarra,
        qtdBarras: otim.qtdBarras,
        cortes: otim.cortes,
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
  const { theme } = useTheme()
  const { user, empresaId, nomeEmpresa, loading: checkingAuth } = useAuth()

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
  const [, setCarregando] = useState(true)

  // ── Seleções do usuário ──
  const [clienteId, setClienteId] = useState<string>("")
  const [obraReferencia, setObraReferencia] = useState("")
  const [itensCalculo, setItensCalculo] = useState<ItemCalculoProjeto[]>([criarItemCalculoProjeto()])
  const [detalhesProjetos, setDetalhesProjetos] = useState<Record<string, ProjetoDetalhe>>({})
  const [projetosCarregando, setProjetosCarregando] = useState<string[]>([])

  // ── Resultado ──
  const [resultados, setResultados] = useState<ResultadoProjetoCalculado[]>([])
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false)

  // ── Modal avisos ──
  const [modalAviso, setModalAviso] = useState<{
    titulo: string
    mensagem: string
    tipo?: "sucesso" | "erro" | "aviso"
  } | null>(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // ── Carregar listas ──────────────────────────────────────────────────────
  const carregarTudo = useCallback(async () => {
    if (!empresaId) return
    setCarregando(true)
    const [resProjetos, resClientes, resVidros, resPrecosEspeciais, resKits, resFerragens, resPerfis] = await Promise.all([
      supabase.from("projetos").select("id, nome, categoria, desenho").eq("empresa_id", empresaId).order("nome"),
      supabase.from("clientes").select("id, nome, grupo_preco_id").eq("empresa_id", empresaId).order("nome"),
      supabase.from("vidros").select("id, nome, espessura, tipo, preco").eq("empresa_id", empresaId).order("nome"),
      supabase.from("vidro_precos_grupos").select("id, vidro_id, grupo_preco_id, preco").eq("empresa_id", empresaId),
      supabase.from("kits").select("id, nome, largura, altura, preco, categoria").eq("empresa_id", empresaId).order("nome"),
      supabase.from("ferragens").select("id, nome, codigo, preco, cores").eq("empresa_id", empresaId).order("nome"),
      supabase.from("perfis").select("id, nome, codigo, preco, comprimento_barra, cores").eq("empresa_id", empresaId).order("nome"),
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
          folhas: (data.projetos_folhas || []).sort((a: { numero_folha: number }, b: { numero_folha: number }) => a.numero_folha - b.numero_folha),
          kits: data.projetos_kits || [],
          ferragens: data.projetos_ferragens || [],
          perfis: data.projetos_perfis || [],
        },
      }))
    }

    setProjetosCarregando((prev) => prev.filter((id) => id !== projetoId))
  }, [detalhesProjetos, projetosCarregando])

  const atualizarItem = <K extends keyof ItemCalculoProjeto>(id: string, campo: K, valor: ItemCalculoProjeto[K]) => {
    setItensCalculo((prev) => prev.map((item) => {
      if (item.id !== id) return item

      if (campo === "projetoId") {
        return {
          ...item,
          projetoId: String(valor),
          corMaterial: "",
          variacaoDrawing: "",
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
    setItensCalculo((prev) => [...prev, criarItemCalculoProjeto()])
    setResultados([])
  }

  const removerProjetoDaFila = (id: string) => {
    setItensCalculo((prev) => prev.length > 1 ? prev.filter((item) => item.id !== id) : prev)
    setResultados((prev) => prev.filter((item) => item.itemId !== id))
  }

  const getProjeto = (item: ItemCalculoProjeto) => projetos.find((projeto) => projeto.id === item.projetoId) || null
  const getDetalhe = (item: ItemCalculoProjeto) => (item.projetoId ? detalhesProjetos[item.projetoId] || null : null)
  const getVidro = (item: ItemCalculoProjeto) => vidrosDB.find((vidro) => vidro.id === item.vidroId) || null

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
    if (!detalhe) return []

    const set = new Set<string>()
    for (const perfilProjeto of detalhe.perfis) {
      const db = perfisDB.find((perfil) => perfil.id === perfilProjeto.perfil_id)
      normalizarListaCores(db?.cores).forEach((cor) => set.add(cor))
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }

  const getVariacoesDisponiveis = (item: ItemCalculoProjeto) => {
    const detalhe = getDetalhe(item)
    if (!detalhe) return []

    const arqs = new Set<string>()
    ;[
      ...detalhe.kits.map((kit) => kit.variacao_restrita),
      ...detalhe.ferragens.map((ferragem) => ferragem.variacao_restrita),
      ...detalhe.perfis.map((perfil) => perfil.variacao_restrita),
    ].filter(Boolean).forEach((arquivo) => arqs.add(String(arquivo)))

    return Array.from(arqs)
  }

  const totaisGerais = useMemo(() => {
    return resultados.reduce((acc, item) => {
      acc.totalVidro += item.resultado.totalVidro
      acc.totalKitsPerfis += item.resultado.usouKit ? item.resultado.precoKit : item.resultado.precoPerfis
      acc.totalFerragens += item.resultado.precoFerragens
      acc.totalGeral += item.resultado.totalGeral
      return acc
    }, { totalVidro: 0, totalKitsPerfis: 0, totalFerragens: 0, totalGeral: 0 })
  }, [resultados])

  const calcularTodos = () => {
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
        variacaoDrawing: item.variacaoDrawing,
        kitsDB,
        ferragensDB,
        perfisDB,
        qtd: Math.max(1, Number(item.qtd || 1)),
      })

      novosResultados.push({
        itemId: item.id,
        projeto,
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
      const numeroFinal = `${prefixoData}${seq.toString().padStart(2, "0")}`

      const itensOrcamento = resultados.flatMap((resultadoProjeto) => {
        const nomeProjeto = resultadoProjeto.projeto?.nome || "Projeto"
        const qtdProjeto = resultadoProjeto.qtdProjeto
        const itensProjeto: Array<{
          id: string
          descricao: string
          tipo?: string
          medidaReal: string
          medidaCalc: string
          qtd: number
          total: number
          acabamento?: string
          servicos?: string
        }> = []

        itensProjeto.push({
          id: `cab-${resultadoProjeto.itemId}`,
          descricao: `Projeto: ${nomeProjeto}`,
          tipo: resultadoProjeto.resultado.usouKit ? "Modo Kit" : "Modo Barra",
          medidaReal: `${resultadoProjeto.larguraProjeto}x${resultadoProjeto.alturaProjeto} mm`,
          medidaCalc: `${resultadoProjeto.larguraProjeto}x${resultadoProjeto.alturaProjeto} mm`,
          qtd: qtdProjeto,
          total: resultadoProjeto.resultado.totalGeral,
          acabamento: resultadoProjeto.corMaterial || undefined,
          servicos: resultadoProjeto.usandoPrecoEspecialVidro ? "Preço especial de vidro aplicado" : "Preço padrão de vidro",
        })

        resultadoProjeto.resultado.folhas.forEach((folha, index) => {
          itensProjeto.push({
            id: `folha-${resultadoProjeto.itemId}-${index}`,
            descricao: `Vidro ${nomeProjeto}`,
            tipo: `Folha ${folha.numero} ${folha.tipo}`,
            medidaReal: `${folha.largura}x${folha.altura} mm`,
            medidaCalc: `${folha.largura}x${folha.altura} mm`,
            qtd: qtdProjeto,
            total: folha.precoVidro,
            acabamento: resultadoProjeto.corMaterial || undefined,
          })
        })

        if (resultadoProjeto.resultado.kit) {
          itensProjeto.push({
            id: `kit-${resultadoProjeto.itemId}`,
            descricao: `Kit ${nomeProjeto}`,
            tipo: resultadoProjeto.resultado.kit.nome,
            medidaReal: `${resultadoProjeto.resultado.kit.largura}x${resultadoProjeto.resultado.kit.altura} mm`,
            medidaCalc: `${resultadoProjeto.resultado.kit.largura}x${resultadoProjeto.resultado.kit.altura} mm`,
            qtd: qtdProjeto,
            total: resultadoProjeto.resultado.precoKit,
            acabamento: resultadoProjeto.corMaterial || undefined,
          })
        }

        resultadoProjeto.resultado.ferragens.forEach((ferragem, index) => {
          itensProjeto.push({
            id: `ferr-${resultadoProjeto.itemId}-${index}`,
            descricao: `Ferragem ${nomeProjeto}`,
            tipo: ferragem.nome,
            medidaReal: "-",
            medidaCalc: "-",
            qtd: ferragem.qtd,
            total: ferragem.total,
            acabamento: resultadoProjeto.corMaterial || undefined,
          })
        })

        resultadoProjeto.resultado.cortes.forEach((corte, index) => {
          itensProjeto.push({
            id: `perfil-${resultadoProjeto.itemId}-${index}`,
            descricao: `Perfil ${nomeProjeto}`,
            tipo: `${corte.perfilNome} (${corte.aproveitamento}% ap.)`,
            medidaReal: `${corte.comprimentoBarra} mm barra`,
            medidaCalc: `${corte.qtdBarras} barra(s)`,
            qtd: corte.qtdBarras,
            total: corte.precoTotal,
            acabamento: resultadoProjeto.corMaterial || undefined,
          })
        })

        return itensProjeto
      })

      const metragemTotal = resultados.reduce((acc, resultadoProjeto) => {
        const areaProjeto = resultadoProjeto.resultado.folhas.reduce((s, folha) => s + folha.area, 0)
        return acc + (areaProjeto * resultadoProjeto.qtdProjeto)
      }, 0)

      const totalPecas = itensOrcamento.reduce((acc, item) => acc + (Number(item.qtd) || 0), 0)

      const payload = {
        numero_formatado: numeroFinal,
        cliente_nome: clienteSel.nome,
        obra_referencia: obraReferencia.trim() || "Composição de Projetos",
        itens: itensOrcamento,
        valor_total: Number(totaisGerais.totalGeral || 0),
        empresa_id: empresaId,
        metragem_total: Number(metragemTotal || 0),
        peso_total: 0,
        theme_color: theme.menuIconColor || "#1e3a5a",
      }

      const { error } = await supabase.from("orcamentos").insert([payload])
      if (error) throw error

      setModalAviso({
        titulo: "Sucesso",
        mensagem: `Orçamento ${numeroFinal} salvo com ${resultados.length} projeto(s) para ${clienteSel.nome}.`,
        tipo: "sucesso",
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido"
      setModalAviso({ titulo: "Erro ao salvar", mensagem: `Não foi possível salvar o orçamento. ${message}`, tipo: "erro" })
    } finally {
      setSalvandoOrcamento(false)
    }
  }

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ─── PAINEL ESQUERDO: CONFIGURAÇÕES ───────────────────── */}
            <div className="xl:col-span-1 space-y-5">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={16} style={{ color: theme.menuIconColor }} />
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">1. Cliente do Cálculo</h2>
                </div>

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

              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">2. Projetos do Cliente</p>
                  <p className="text-sm text-gray-500">Monte a lista e calcule tudo junto no final.</p>
                </div>
                <button
                  type="button"
                  onClick={adicionarProjetoNaFila}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
                >
                  <Plus size={14} /> Adicionar Projeto
                </button>
              </div>

              {itensCalculo.map((item, index) => {
                const projetoSel = getProjeto(item)
                const detalhe = getDetalhe(item)
                const vidroSel = getVidro(item)
                const coresMaterial = getCoresMaterial(item)
                const variacoes = getVariacoesDisponiveis(item)
                const usandoPrecoEspecialVidro = getUsandoPrecoEspecial(item)
                const precoVidroM2Aplicado = getPrecoVidroM2(item)
                const carregandoDetalhe = item.projetoId ? projetosCarregando.includes(item.projetoId) : false

                return (
                  <div key={item.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Projeto {index + 1}</p>
                        <p className="text-sm font-bold text-slate-700">{projetoSel?.nome || "Selecione a tipologia"}</p>
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
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Tipologia / Projeto</label>
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
                          <Image src={`/desenhos/${projetoSel.desenho}`} alt={projetoSel.nome} fill className="object-contain p-2" />
                        </div>
                        <div>
                          <p className="font-black text-sm" style={{ color: theme.contentTextLightBg }}>{projetoSel.nome}</p>
                          {projetoSel.categoria && <p className="text-xs text-gray-400 mt-0.5">{projetoSel.categoria}</p>}
                          {detalhe && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600">{detalhe.folhas.length} folha(s)</span>
                              {detalhe.kits.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600">{detalhe.kits.length} kit(s)</span>}
                              {detalhe.perfis.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700">{detalhe.perfis.length} perfil(is)</span>}
                              {detalhe.ferragens.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-50 text-violet-600">{detalhe.ferragens.length} ferragem(ns)</span>}
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
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Largura 2 (L2)</label>
                        <input
                          type="number" min={0} placeholder="Canto/Lado B"
                          value={item.largura2}
                          onChange={(e) => atualizarItem(item.id, "largura2", e.target.value)}
                          className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Alt. Bandeira (AB)</label>
                        <input
                          type="number" min={0} placeholder="Bandeira/A2"
                          value={item.altura2}
                          onChange={(e) => atualizarItem(item.id, "altura2", e.target.value)}
                          className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Quantidade</label>
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

                    {variacoes.length > 0 && (
                      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2">Variação do Projeto</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => atualizarItem(item.id, "variacaoDrawing", "")}
                            className="px-3 py-2 rounded-xl text-xs font-black border-2 transition-all"
                            style={!item.variacaoDrawing
                              ? { backgroundColor: "#8b5cf6", color: "#fff", borderColor: "#8b5cf6" }
                              : { backgroundColor: "#f5f3ff", color: "#7c3aed", borderColor: "#ddd6fe" }}
                          >
                            Todas
                          </button>
                          {variacoes.map((arquivo) => (
                            <button
                              key={arquivo}
                              type="button"
                              onClick={() => atualizarItem(item.id, "variacaoDrawing", arquivo)}
                              className="px-3 py-2 rounded-xl text-xs font-black border-2 transition-all truncate max-w-40"
                              style={item.variacaoDrawing === arquivo
                                ? { backgroundColor: "#8b5cf6", color: "#fff", borderColor: "#8b5cf6" }
                                : { backgroundColor: "#f5f3ff", color: "#7c3aed", borderColor: "#ddd6fe" }}
                              title={arquivo}
                            >
                              {arquivo.replace(/\.png$/i, "").split("-").slice(-2).join(" ")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                type="button"
                onClick={calcularTodos}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl text-sm font-black shadow-lg hover:opacity-90 active:scale-95 transition-all"
                style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}
              >
                <Calculator size={18} />
                Calcular Todos os Projetos
              </button>

              <button
                type="button"
                onClick={salvarComposicaoComoOrcamento}
                disabled={salvandoOrcamento || resultados.length === 0}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl text-sm font-black shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#0f766e", color: "#ffffff" }}
              >
                {salvandoOrcamento
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Save size={18} />
                }
                Salvar Composição como Orçamento
              </button>
            </div>

            {/* ─── PAINEL DIREITO: RESULTADO ────────────────────────── */}
            <div className="xl:col-span-2 space-y-5">

              {resultados.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
                    <Calculator size={36} className="text-gray-300" />
                  </div>
                  <p className="font-bold text-gray-400">Escolha o cliente e monte a lista de projetos</p>
                  <p className="text-gray-300 text-sm mt-1">O cálculo consolidado aparecerá aqui depois</p>
                </div>
              )}

              {resultados.length > 0 && (
                <>
                  <div
                    className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${theme.menuBackgroundColor}, ${theme.menuIconColor})` }}
                  >
                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                    <p className="text-[11px] uppercase tracking-widest font-black opacity-70 mb-1">Resultado Total do Cliente</p>
                    <p className="text-4xl font-black">{fmt(totaisGerais.totalGeral)}</p>
                    <p className="text-sm opacity-70 mt-1">
                      Cliente: {clienteSel?.nome || "—"} · {resultados.length} projeto(s) na composição
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {[
                        { label: "Vidros", valor: totaisGerais.totalVidro },
                        { label: "Kits / Perfis", valor: totaisGerais.totalKitsPerfis },
                        { label: "Ferragens", valor: totaisGerais.totalFerragens },
                        { label: "Total", valor: totaisGerais.totalGeral },
                      ].map(({ label, valor }) => (
                        <div key={label} className="bg-white/15 rounded-2xl p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                          <p className="text-lg font-black">{fmt(valor)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {resultados.map((itemResultado, index) => (
                    <div key={itemResultado.itemId} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Projeto {index + 1}</p>
                          <h3 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>{itemResultado.projeto?.nome || "Projeto"}</h3>
                          <p className="text-xs text-gray-400 mt-1">
                            Cliente: {clienteSel?.nome || "—"} · Vidro: {itemResultado.vidro?.nome || "—"}
                            {itemResultado.corMaterial && ` · Perfil ${itemResultado.corMaterial}`}
                            {itemResultado.resultado.usouKit ? " · Modo Kit" : " · Modo Barra"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtotal</p>
                          <p className="text-2xl font-black" style={{ color: theme.menuBackgroundColor }}>{fmt(itemResultado.resultado.totalGeral)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "Vidros", valor: itemResultado.resultado.totalVidro },
{ 
  label: itemResultado.resultado.usouKit ? "Kits" : "Perfis",
  valor: itemResultado.resultado.usouKit 
    ? itemResultado.resultado.precoKit 
    : itemResultado.resultado.precoPerfis
},                          { label: "Ferragens", valor: itemResultado.resultado.precoFerragens },
                          { label: "Total", valor: itemResultado.resultado.totalGeral },
                        ].map(({ label, valor }) => (
                          <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                            <p className="text-lg font-black text-slate-700">{fmt(valor)}</p>
                          </div>
                        ))}
                      </div>

                      {itemResultado.resultado.folhas.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Square size={16} className="text-blue-500" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Corte de Vidro</h4>
                          </div>
                          <div className="mb-3 rounded-2xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs font-medium text-blue-700">
                            Preço aplicado: {fmt(itemResultado.precoVidroM2Aplicado)}/m² {itemResultado.usandoPrecoEspecialVidro ? "pela tabela do cliente" : "pelo cadastro padrão do vidro"}.
                          </div>
                          <div className="space-y-2">
                            {itemResultado.resultado.folhas.map((folha, folhaIndex) => (
                              <div key={folhaIndex} className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-50">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                                  F{folha.numero} {folha.tipo}
                                </span>
                                <span className="text-sm font-bold text-gray-700 flex-1">{folha.largura} × {folha.altura} mm</span>
                                <span className="text-xs text-gray-400">{folha.area.toFixed(3)} m² · {fmt(folha.precoM2Utilizado)}/m²</span>
                                <span className="text-sm font-black text-blue-700">{fmt(folha.precoVidro)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {itemResultado.resultado.usouKit && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Package size={16} className="text-emerald-500" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Kit Selecionado</h4>
                          </div>

                          {itemResultado.resultado.kit ? (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                              <div>
                                <p className="font-black text-sm text-emerald-800">{itemResultado.resultado.kit.nome}</p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                  Ref.: {itemResultado.resultado.kit.largura} × {itemResultado.resultado.kit.altura} mm
                                  {itemResultado.corMaterial && ` · Cor: ${itemResultado.corMaterial}`}
                                </p>
                              </div>
                              <p className="ml-auto font-black text-emerald-700">{fmt(itemResultado.resultado.kit.preco || 0)}<span className="text-[10px] font-medium"> /un</span></p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                              <p className="text-sm text-amber-700 font-medium">
                                Nenhum kit compatível encontrado para esse projeto com essas medidas e espessura de vidro.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {!itemResultado.resultado.usouKit && itemResultado.resultado.cortes.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Scissors size={16} className="text-amber-500" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Otimização de Barras</h4>
                          </div>
                          <div className="space-y-4">
                            {itemResultado.resultado.cortes.map((corte, corteIndex) => (
                              <div key={corteIndex} className="rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                  <div>
                                    <p className="text-sm font-black text-gray-700">{corte.perfilNome}</p>
                                    <p className="text-xs text-gray-400">Barra: {corte.comprimentoBarra} mm · {corte.qtdBarras} barra(s) · {fmt(corte.precoBarra)}/barra</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-black text-amber-600">{fmt(corte.precoTotal)}</p>
                                    <p className={`text-xs font-bold ${corte.aproveitamento >= 80 ? "text-emerald-500" : corte.aproveitamento >= 60 ? "text-amber-500" : "text-red-400"}`}>
                                      {corte.aproveitamento}% aproveitado
                                    </p>
                                  </div>
                                </div>
                                <div className="px-4 py-3">
                                  <p className="text-[10px] text-gray-400">
                                    Desperdício estimado: {corte.desperdicioMm} mm • Serras de 5 mm consideradas
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {itemResultado.resultado.ferragens.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Wrench size={16} className="text-violet-500" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Ferragens</h4>
                          </div>
                          <div className="space-y-2">
                            {itemResultado.resultado.ferragens.map((ferragem, ferragemIndex) => (
                              <div key={ferragemIndex} className="flex items-center gap-3 p-3 rounded-2xl bg-violet-50/50 border border-violet-50">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-violet-100 text-violet-600 shrink-0">×{ferragem.qtd}</span>
                                <span className="text-sm font-bold text-gray-700 flex-1">{ferragem.nome}</span>
                                <span className="text-xs text-gray-400">{fmt(ferragem.precoUnit)}/un</span>
                                <span className="text-sm font-black text-violet-700">{fmt(ferragem.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
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
    </div>
  )
}
