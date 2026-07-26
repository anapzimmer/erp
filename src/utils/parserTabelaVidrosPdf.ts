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
