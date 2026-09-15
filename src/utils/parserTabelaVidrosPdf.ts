// src/utils/parserTabelaVidrosPdf.ts

export type ProdutoTabelaPdf = {
  codigo: string
  descricao: string
  preco: number
  precoTexto: string
}

export type DiagnosticoTabelaPdf = {
  textoOriginal: string
  textoPreparado: string
  codigosCandidatos: string[]
  rejeitados: string[]
  totalProdutos: number
}

const normalizarBusca = (valor: string) =>
  (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()

const converterPreco = (valor: string) => {
  const numero = Number(
    valor
      .replace(/\./g, "")
      .replace(",", "."),
  )

  return Number.isFinite(numero) ? numero : 0
}

const limparTexto = (texto: string) =>
  texto
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim()

const removerCabecalhoERodape = (texto: string) => {
  let resultado = texto

  const marcadoresCabecalho = [
    "ProdutoDescriçãoPreço",
    "Produto Descrição Preço",
    "PRODUTODESCRIÇÃOPREÇO",
    "PRODUTO DESCRIÇÃO PREÇO",
    "PRODUTODESCRICAOPRECO",
    "PRODUTO DESCRICAO PRECO",
  ]

  for (const marcador of marcadoresCabecalho) {
    const posicao = resultado
      .toUpperCase()
      .indexOf(marcador.toUpperCase())

    if (posicao >= 0) {
      resultado = resultado.slice(posicao + marcador.length)
      break
    }
  }

  const marcadoresRodape = [
    "Dimensão máxima",
    "DIMENSÃO MÁXIMA",
    "Dimensao maxima",
    "DIMENSAO MAXIMA",
    "PEDIDOS E ALTERAÇÕES",
    "PEDIDOS E ALTERACOES",
  ]

  let menorPosicao = -1

  for (const marcador of marcadoresRodape) {
    const posicao = resultado
      .toUpperCase()
      .indexOf(marcador.toUpperCase())

    if (
      posicao >= 0 &&
      (menorPosicao === -1 || posicao < menorPosicao)
    ) {
      menorPosicao = posicao
    }
  }

  if (menorPosicao >= 0) {
    resultado = resultado.slice(0, menorPosicao)
  }

  return resultado.trim()
}

/*
 * O PDF devolve linhas como:
 *
 * INCLW04TEVIDRO INCOLOR 04MM LOW-E TEMPERADO497,00
 * ACINC06TEACIDATO INCOLOR 06MM TEMPERADO275,00
 * FUM08BXBOX FUME 08MM225,50
 * INC04MODINCOLOR 04MM MODULADO TEMPERADO143,00
 *
 * Portanto, não podemos tentar descobrir o fim do código apenas
 * pelo tamanho. Usamos a palavra que inicia a descrição como divisor.
 */
const inicioDescricaoProduto =
  "VIDRO|ESPELHO|BOX|ACIDATO|INCOLOR|LAMINADO|LAM\\.?|REFLECTA|REFL(?:ECTA)?|REFLETIVO|COOL(?:\\s+LITE)?|NEUTRAL|CRISTAL|CANELADO|BOREAL|MINI|PONTILHADO|EXTRA"

const regexProdutoLinha = new RegExp(
  `^([A-Z0-9._/-]{4,24}?)(${inicioDescricaoProduto})\\s*(.*?)(\\d{1,4}(?:\\.\\d{3})*,\\d{2})$`,
  "i",
)

const interpretarLinha = (
  linhaOriginal: string,
): ProdutoTabelaPdf | null => {
  const linha = linhaOriginal
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()

  const match = linha.match(regexProdutoLinha)

  if (!match) return null

  const codigo = match[1].trim()
  const inicioDescricao = match[2].trim()
  const restanteDescricao = match[3].trim()
  const precoTexto = match[4].trim()

  const descricao = `${inicioDescricao} ${restanteDescricao}`
    .replace(/\s+/g, " ")
    .trim()

  const preco = converterPreco(precoTexto)

  const codigoValido =
    codigo.length >= 4 &&
    codigo.length <= 20 &&
    /[A-Z]/.test(codigo) &&
    /\d/.test(codigo)

  if (
    !codigoValido ||
    !descricao ||
    !Number.isFinite(preco) ||
    preco <= 0
  ) {
    return null
  }

  return {
    codigo,
    descricao,
    preco,
    precoTexto,
  }
}

const splitLinhaComAspas = (linha: string, delimitador: string) => {
  const partes: string[] = []
  let atual = ""
  let emAspas = false

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i]

    if (char === '"') {
      emAspas = !emAspas
      continue
    }

    if (!emAspas && char === delimitador) {
      partes.push(atual)
      atual = ""
      continue
    }

    atual += char
  }

  partes.push(atual)

  return partes
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0)
}

const regexPrecoTexto = /(R\$\s*)?\d{1,5}(?:\.\d{3})*,\d{2}$/i

const encontrarDelimitador = (linhas: string[]) => {
  const candidatos = [";", "\t", "|"]

  for (const delimitador of candidatos) {
    let validas = 0

    for (const linha of linhas.slice(0, 40)) {
      const partes = splitLinhaComAspas(linha, delimitador)
      if (partes.length < 3) continue

      const temPreco = partes.some((parte) => regexPrecoTexto.test(parte.replace(/\s+/g, " ").trim()))
      if (temPreco) validas += 1
    }

    if (validas >= 2) return delimitador
  }

  return null
}

const pareceCabecalho = (linha: string) => {
  const texto = normalizarBusca(linha)
  return (
    (texto.includes("COD") || texto.includes("PRODUTO")) &&
    texto.includes("DESCR") &&
    texto.includes("PRECO")
  )
}

const interpretarLinhaDelimitada = (linha: string, delimitador: string): ProdutoTabelaPdf | null => {
  const colunas = splitLinhaComAspas(linha, delimitador)
  if (colunas.length < 3) return null

  const precoIndex = colunas.findIndex((coluna) => regexPrecoTexto.test(coluna.replace(/\s+/g, " ").trim()))
  if (precoIndex < 0) return null

  const precoTexto = colunas[precoIndex]
    .replace(/^R\$\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()

  const codigoIndex = colunas.findIndex((coluna, index) => {
    if (index >= precoIndex) return false
    const valor = coluna.replace(/\s+/g, "").toUpperCase()
    return /^[A-Z0-9._/-]{3,24}$/.test(valor) && /[A-Z]/.test(valor) && /\d/.test(valor)
  })

  if (codigoIndex < 0) return null

  const codigo = colunas[codigoIndex].replace(/\s+/g, "").toUpperCase()

  const descricao = colunas
    .slice(codigoIndex + 1, precoIndex)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()

  if (!descricao) return null

  const preco = converterPreco(precoTexto)
  if (!Number.isFinite(preco) || preco <= 0) return null

  return {
    codigo,
    descricao,
    preco,
    precoTexto,
  }
}

export const extrairProdutosTabelaPdfComDiagnostico = (
  textoRecebido: string,
): {
  produtos: ProdutoTabelaPdf[]
  diagnostico: DiagnosticoTabelaPdf
} => {
  const textoOriginal = limparTexto(textoRecebido)
  const somenteTabela = removerCabecalhoERodape(textoOriginal)

  /*
   * Mantemos as quebras de linha vindas do pdf-parse.
   * Cada produto deste relatório está em uma linha própria.
   */
  const linhas = somenteTabela
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter(Boolean)

  const produtos: ProdutoTabelaPdf[] = []
  const codigos = new Set<string>()
  const rejeitados: string[] = []
  const codigosCandidatos: string[] = []

  for (const linha of linhas) {
    const pareceProduto =
      /\d{1,4}(?:\.\d{3})*,\d{2}\s*$/.test(linha) &&
      new RegExp(inicioDescricaoProduto, "i").test(linha)

    if (!pareceProduto) continue

    const produto = interpretarLinha(linha)

    if (!produto) {
      rejeitados.push(`[NÃO INTERPRETADO] ${linha}`)
      continue
    }

    codigosCandidatos.push(produto.codigo)

    if (codigos.has(produto.codigo)) {
      rejeitados.push(
        `[CÓDIGO DUPLICADO] ${produto.codigo} — ${linha}`,
      )
      continue
    }

    codigos.add(produto.codigo)
    produtos.push(produto)
  }

  /*
   * Segurança para PDFs que percam todas as quebras de linha:
   * insere quebra depois de cada preço quando o próximo produto começa.
   */
  if (produtos.length === 0) {
    const textoLinear = somenteTabela
      .replace(/\s+/g, " ")
      .replace(
        new RegExp(`(\\d{1,4}(?:\\.\\d{3})*,\\d{2})(?=[A-Z0-9._/-]{4,24}?(?:${inicioDescricaoProduto}))`, "gi"),
        "$1\n",
      )

    const linhasLineares = textoLinear
      .split(/\n+/)
      .map((linha) => linha.trim())
      .filter(Boolean)

    for (const linha of linhasLineares) {
      const produto = interpretarLinha(linha)

      if (!produto) {
        if (
          /\d{1,4}(?:\.\d{3})*,\d{2}\s*$/.test(linha)
        ) {
          rejeitados.push(
            `[NÃO INTERPRETADO - LINEAR] ${linha}`,
          )
        }
        continue
      }

      codigosCandidatos.push(produto.codigo)

      if (!codigos.has(produto.codigo)) {
        codigos.add(produto.codigo)
        produtos.push(produto)
      }
    }
  }

  return {
    produtos,
    diagnostico: {
      textoOriginal,
      textoPreparado: somenteTabela,
      codigosCandidatos,
      rejeitados,
      totalProdutos: produtos.length,
    },
  }
}

export const extrairProdutosTabelaPdf = (
  textoRecebido: string,
): ProdutoTabelaPdf[] =>
  extrairProdutosTabelaPdfComDiagnostico(textoRecebido)
    .produtos

export const extrairProdutosTabelaTextoComDiagnostico = (
  textoRecebido: string,
): {
  produtos: ProdutoTabelaPdf[]
  diagnostico: DiagnosticoTabelaPdf
} => {
  const textoOriginal = limparTexto(textoRecebido)
  const linhas = textoOriginal
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter(Boolean)

  const delimitador = encontrarDelimitador(linhas)

  const produtos: ProdutoTabelaPdf[] = []
  const codigos = new Set<string>()
  const codigosCandidatos: string[] = []
  const rejeitados: string[] = []

  for (const linha of linhas) {
    if (pareceCabecalho(linha)) continue

    const produto = delimitador
      ? interpretarLinhaDelimitada(linha, delimitador) || interpretarLinha(linha)
      : interpretarLinha(linha)

    if (!produto) {
      if (/\d{1,5}(?:\.\d{3})*,\d{2}\s*$/.test(linha)) {
        rejeitados.push(`[NÃO INTERPRETADO] ${linha}`)
      }
      continue
    }

    codigosCandidatos.push(produto.codigo)

    if (codigos.has(produto.codigo)) {
      rejeitados.push(`[CÓDIGO DUPLICADO] ${produto.codigo} — ${linha}`)
      continue
    }

    codigos.add(produto.codigo)
    produtos.push(produto)
  }

  return {
    produtos,
    diagnostico: {
      textoOriginal,
      textoPreparado: delimitador
        ? `Formato delimitado detectado: "${delimitador === "\t" ? "TAB" : delimitador}"`
        : "Formato por linha contínua",
      codigosCandidatos,
      rejeitados,
      totalProdutos: produtos.length,
    },
  }
}
