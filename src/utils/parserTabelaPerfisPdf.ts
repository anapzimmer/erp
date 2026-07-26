export type ProdutoPerfilPdf = {
  codigo: string
  codigoOriginal: string
  nome: string
  cores: string
  categoria: string
  preco: number
  precoTexto: string
  descricaoOriginal: string
}

export type DiagnosticoTabelaPerfisPdf = {
  textoOriginal: string
  textoPreparado: string
  codigosCandidatos: string[]
  rejeitados: string[]
  totalProdutos: number
}

const converterPreco = (valor: string) => {
  const texto = valor.trim()
  const numero = Number(texto.replace(/\./g, "").replace(",", "."))
  return Number.isFinite(numero) ? numero : 0
}

const formatarTexto = (valor: string) => {
  const limpo = (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")

  if (!limpo) return ""
  return limpo.charAt(0).toUpperCase() + limpo.slice(1)
}

const normalizarBusca = (valor: string) =>
  (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()

const limparTexto = (texto: string) =>
  texto
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim()

const removerCabecalhoERodape = (texto: string) => {
  const linhas = texto
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter(Boolean)

  const linhasTabela: string[] = []
  let encontrouTabela = false

  for (const linha of linhas) {
    const linhaNormalizada = normalizarBusca(linha)

    if (linhaNormalizada.includes("PRODUTO") && linhaNormalizada.includes("PRECO")) {
      encontrouTabela = true
      continue
    }

    if (!encontrouTabela) continue

    const ehRodape =
      linhaNormalizada.includes("DIMENSAO MAXIMA") ||
      linhaNormalizada.includes("DIMENSAO MINIMA") ||
      linhaNormalizada.includes("VIDROS MODELADOS") ||
      linhaNormalizada.includes("VIDROS ACIMA") ||
      linhaNormalizada.includes("PEDIDOS E ALTERACOES")

    if (ehRodape) break

    const ehCabecalhoOuPagina =
      linhaNormalizada.includes("TABELA PRECO") ||
      linhaNormalizada.includes("DISK VIDROS LTDA") ||
      /^PAG\s*:?\s*\d+$/.test(linhaNormalizada) ||
      /^\d{2}\/\d{2}\/\d{4}$/.test(linhaNormalizada) ||
      /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}$/.test(linhaNormalizada)

    if (!ehCabecalhoOuPagina) linhasTabela.push(linha)
  }

  return linhasTabela.join("\n").trim()
}

const inferirCategoria = (nome: string) => {
  const texto = normalizarBusca(nome)
  if (texto.includes("PARAFUSO")) return "Parafuso"
  if (texto.includes("CHUMBADOR")) return "Chumbador"
  if (texto.includes("PORCA")) return "Porca"
  if (texto.includes("CORRIMAO")) return "Corrimao"
  if (texto.includes("PONTALETE")) return "Pontalete"
  if (texto.includes("CANOPLA")) return "Canopla"
  if (texto.includes("TAPA FURO")) return "Tapa furo"
  if (texto.includes("TUBO")) return "Tubo"
  if (texto.includes("CANTONEIRA")) return "Cantoneira"
  if (texto.includes("TRILHO")) return "Trilho"
  if (texto.includes("CAPA")) return "Capa"
  if (texto.includes("CLIC")) return "Clic"
  if (texto.includes("TRANSPASSE")) return "Transpasse"
  if (texto.includes("CADEIRINHA")) return "Cadeirinha"
  if (texto.includes("TELA")) return "Tela"
  if (texto.includes("BARRA CHATA")) return "Barra chata"
  if (texto.includes("PERFIL U")) return "Perfil u"
  return "Perfil"
}

const coresConhecidas = [
  "BRANCO",
  "BRANCA",
  "PRETO",
  "PRETA",
  "FOSCO",
  "CROMADO",
  "BRILHANTE",
  "GOLD",
  "ROSE",
  "BRONZE",
  "NATURAL",
]

const inicioDescricaoPerfil =
  "TUBO|CANTONEIRA|PERFIL|TRILHO|CAPA|CLIC|TRANSPASSE|CADEIRINHA|BARRA|SOLEIRA|GUIA|PUXADOR|SUPORTE|FECHADURA|TAMPA|ESCOVA|KIT|PARAFUSO|CHUMBADOR|PORCA|CORRIMAO|PONTALETE|CANOPLA|TAPA|NYLON"

const regexLinhaPerfil = new RegExp(
  `^([A-Z0-9._/-]{3,24}?)(${inicioDescricaoPerfil})(.*?)(\\d{1,4}(?:\\.\\d{3})*,\\d{2})$`,
  "i",
)

const normalizarCor = (cor: string) => {
  if (cor === "PRETA") return "PRETO"
  if (cor === "BRANCA") return "BRANCO"
  return cor
}

const interpretarLinha = (linhaOriginal: string): ProdutoPerfilPdf | null => {
  const linha = linhaOriginal.replace(/\s+/g, " ").trim().toUpperCase()
  const match = linha.match(regexLinhaPerfil)
  if (!match) return null

  const codigoOriginal = match[1].trim()
  const inicioDescricao = match[2].trim()
  const restoDescricao = match[3].trim()
  const precoTexto = match[4].trim()
  const preco = converterPreco(precoTexto)

  const codigo = codigoOriginal.split("-")[0].trim()
  let descricao = `${inicioDescricao} ${restoDescricao}`.replace(/\s+/g, " ").trim()

  let cores = "Padrão"
  for (const cor of coresConhecidas) {
    const regexCor = new RegExp(`(?:-|\\s)\\s*${cor}\\b(?:\\s*\\d{1,3})?\\s*$`, "i")
    if (regexCor.test(descricao)) {
      cores = formatarTexto(normalizarCor(cor))
      descricao = descricao.replace(regexCor, "").trim()
      break
    }
  }

  descricao = descricao.replace(/\s*-\s*$/, "").replace(/\s+/g, " ").trim()

  if (!codigo || !descricao || !preco) return null

  const nome = formatarTexto(descricao)
  return {
    codigo,
    codigoOriginal,
    nome,
    cores,
    categoria: inferirCategoria(nome),
    preco,
    precoTexto,
    descricaoOriginal: descricao,
  }
}

export const extrairPerfisTabelaPdfComDiagnostico = (
  textoRecebido: string,
): { produtos: ProdutoPerfilPdf[]; diagnostico: DiagnosticoTabelaPerfisPdf } => {
  const textoOriginal = limparTexto(textoRecebido)
  const somenteTabela = removerCabecalhoERodape(textoOriginal)
  const linhas = somenteTabela
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter(Boolean)

  const produtos: ProdutoPerfilPdf[] = []
  const vistos = new Set<string>()
  const rejeitados: string[] = []
  const codigosCandidatos: string[] = []

  for (const linha of linhas) {
    const pareceProduto =
      /\d{1,4}(?:\.\d{3})*,\d{2}\s*$/.test(linha) &&
      new RegExp(inicioDescricaoPerfil, "i").test(linha)

    if (!pareceProduto) continue

    const produto = interpretarLinha(linha)
    if (!produto) {
      rejeitados.push(`[NAO INTERPRETADO] ${linha}`)
      continue
    }

    const chave = `${produto.codigo}|${produto.nome}|${produto.cores}`
    codigosCandidatos.push(produto.codigoOriginal)

    if (vistos.has(chave)) {
      rejeitados.push(`[DUPLICADO NO ARQUIVO] ${produto.codigoOriginal} - ${produto.nome} - ${produto.cores}`)
      continue
    }

    vistos.add(chave)
    produtos.push(produto)
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
