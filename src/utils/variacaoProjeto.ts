export type EixoVariacaoProjeto = "altura" | "kit"

type OpcaoEixoVariacao = {
  value: string
  label: string
}

export type GrupoEixoVariacaoProjeto = {
  key: EixoVariacaoProjeto
  label: string
  options: OpcaoEixoVariacao[]
}

export const GRUPOS_VARIACAO_BOX: GrupoEixoVariacaoProjeto[] = [
  {
    key: "altura",
    label: "Tipo de Box",
    options: [
      { value: "padrao", label: "Tradicional" },
      { value: "teto", label: "Até o teto" },
    ],
  },
  {
    key: "kit",
    label: "Tipo de Kit",
    options: [
      { value: "tradicional", label: "Tradicional" },
      { value: "quadrado", label: "Quadrado" },
      { value: "outro", label: "Evidence" },
    ],
  },
]

const EIXO_POR_VALOR = new Map<string, EixoVariacaoProjeto>(
  GRUPOS_VARIACAO_BOX.flatMap((grupo) => grupo.options.map((opcao) => [opcao.value, grupo.key] as const))
)

const LABEL_POR_VALOR = new Map<string, string>(
  GRUPOS_VARIACAO_BOX.flatMap((grupo) => grupo.options.map((opcao) => [opcao.value, opcao.label] as const))
)

const normalizarValor = (valor?: string | null): string =>
  String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

export const ehVariacaoDeDesenho = (valor?: string | null): boolean =>
  /\.(png|jpe?g|webp|gif|svg)$/i.test(String(valor || "").trim())

export const getEixoVariacaoProjeto = (valor?: string | null): EixoVariacaoProjeto | null => {
  const normalizado = normalizarValor(valor)
  return EIXO_POR_VALOR.get(normalizado) || null
}

export const decomporVariacaoTecnica = (valor?: string | null): Partial<Record<EixoVariacaoProjeto, string>> => {
  return String(valor || "")
    .split("|")
    .map((parte) => normalizarValor(parte))
    .filter(Boolean)
    .reduce<Partial<Record<EixoVariacaoProjeto, string>>>((acc, parte) => {
      const eixo = getEixoVariacaoProjeto(parte)
      if (eixo) acc[eixo] = parte
      return acc
    }, {})
}

export const montarVariacaoTecnica = (selecao: Partial<Record<EixoVariacaoProjeto, string>>): string => {
  const partes = GRUPOS_VARIACAO_BOX
    .map((grupo) => normalizarValor(selecao[grupo.key]))
    .filter(Boolean)

  return partes.join("|")
}

export const formatarVariacaoTecnica = (valor?: string | null): string => {
  const composta = decomporVariacaoTecnica(valor)
  const partes = GRUPOS_VARIACAO_BOX
    .map((grupo) => {
      const selecionado = composta[grupo.key]
      if (!selecionado) return null
      return `${grupo.label}: ${LABEL_POR_VALOR.get(selecionado) || selecionado}`
    })
    .filter(Boolean)

  if (partes.length > 0) return partes.join(" · ")

  const texto = String(valor || "").trim()
  if (!texto) return ""
  return texto
    .split("|")
    .map((parte) => LABEL_POR_VALOR.get(normalizarValor(parte)) || parte)
    .join(" · ")
}

export const correspondeRestricaoTecnica = (restricao?: string | null, selecao?: string | null): boolean => {
  const restricaoNormalizada = String(restricao || "").trim()
  if (!restricaoNormalizada) return true
  if (ehVariacaoDeDesenho(restricaoNormalizada)) return false

  const restricaoPorEixo = decomporVariacaoTecnica(restricaoNormalizada)
  const selecaoPorEixo = decomporVariacaoTecnica(selecao)
  const eixosRestritos = Object.entries(restricaoPorEixo) as Array<[EixoVariacaoProjeto, string]>

  if (eixosRestritos.length === 0) {
    return normalizarValor(restricaoNormalizada) === normalizarValor(selecao)
  }

  return eixosRestritos.every(([eixo, valor]) => selecaoPorEixo[eixo] === valor)
}

export const getGruposVariacaoTecnicaDisponiveis = (restricoes: Array<string | null | undefined>): GrupoEixoVariacaoProjeto[] => {
  const valores = new Set<string>()

  restricoes.forEach((restricao) => {
    if (!restricao || ehVariacaoDeDesenho(restricao)) return

    String(restricao)
      .split("|")
      .map((parte) => normalizarValor(parte))
      .filter(Boolean)
      .forEach((parte) => valores.add(parte))
  })

  return GRUPOS_VARIACAO_BOX
    .map((grupo) => ({
      ...grupo,
      options: grupo.options.filter((opcao) => valores.has(normalizarValor(opcao.value))),
    }))
    .filter((grupo) => grupo.options.length > 0)
}

export const isValorEixoAltura = (valor?: string | null): boolean => {
  const v = normalizarValor(valor)
  return GRUPOS_VARIACAO_BOX[0].options.some((o) => o.value === v)
}

export const getOpcoesRestricaoTecnicaBox = () => {
  const simples = GRUPOS_VARIACAO_BOX.flatMap((grupo) =>
    grupo.options.map((opcao) => ({
      valor: opcao.value,
      label: `${grupo.label}: ${opcao.label}`,
    }))
  )

  const combinadas = GRUPOS_VARIACAO_BOX[0].options.flatMap((altura) =>
    GRUPOS_VARIACAO_BOX[1].options.map((kit) => ({
      valor: `${altura.value}|${kit.value}`,
      label: `${altura.label} · ${kit.label}`,
    }))
  )

  return [...simples, ...combinadas]
}