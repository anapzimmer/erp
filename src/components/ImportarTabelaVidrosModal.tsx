"use client"

import { useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
  Loader2,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { extrairProdutosTabelaPdfComDiagnostico } from "@/utils/parserTabelaVidrosPdf"

type Vidro = {
  id: string
  codigo: string | null
  nome: string
  espessura: string
  tipo: string
  preco: number
  empresa_id: string
}

type ProdutoImportado = {
  codigo: string
  descricao: string
  preco: number
  nome: string
  espessura: string
  tipo: string
}

type AcaoImportacao = "atualizar" | "vincular" | "criar" | "ignorar"

type ItemRevisao = ProdutoImportado & {
  acao: AcaoImportacao
  vidroId: string
  sugestaoId: string
  confianca: number
  precoAnterior: number | null
  selecionado?: boolean
}

type Props = {
  aberto: boolean
  onClose: () => void
  empresaId: string
  vidros: Vidro[]
  onConcluido: () => Promise<void> | void
  corPrimaria?: string
  corDestaque?: string
}

const normalizar = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()

const formatarTipoImportado = (valor: string) => {
  const limpo = (valor || "").trim().toLowerCase().replace(/\s+/g, " ")
  if (!limpo) return ""
  return limpo.charAt(0).toUpperCase() + limpo.slice(1)
}

const descobrirCampos = (descricaoOriginal: string) => {
  const descricao = normalizar(descricaoOriginal)

  const espessuraEncontrada = descricao.match(
    /(?:^|\s)(\d{1,2}(?:\s*[+/]\s*\d{1,2})?)\s*MM(?:\s|$)/,
  )

  const espessura = espessuraEncontrada
    ? `${espessuraEncontrada[1].replace(/\s/g, "").padStart(2, "0")}mm`
    : ""

  const tipos = [
    "LOW-E TEMPERADO",
    "MODULADO TEMPERADO",
    "LAMINADO",
    "TEMPERADO",
    "BISOTE",
    "COMUM",
    "BOX",
  ]

  const tipo = formatarTipoImportado(tipos.find((item) => descricao.includes(item)) || "Comum")

  const removiveis = [
    "VIDRO",
    "ESPELHO",
    "BOX",
    "TEMPERADO",
    "LAMINADO",
    "MODULADO",
    "LOW E",
    "LOW-E",
    "BISOTE",
    "CEBRACE",
    "COMUM",
  ]

  let nome = descricao

  removiveis.forEach((palavra) => {
    nome = nome.replace(
      new RegExp(`\\b${palavra.replace("-", "[- ]?")}\\b`, "g"),
      " ",
    )
  })

  nome = nome
    .replace(/\b\d{1,2}(?:\s*[+/]\s*\d{1,2})?\s*MM\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!nome) {
    nome = descricao.includes("ESPELHO")
      ? "Espelho"
      : descricao.includes("BOX")
        ? "Box"
        : "Vidro"
  } else {
    nome = nome
      .toLowerCase()
      .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase())
  }

  return { nome, espessura, tipo }
}

const pontuarSemelhanca = (produto: ProdutoImportado, vidro: Vidro) => {
  const descricaoProduto = new Set(
    normalizar(`${produto.nome} ${produto.espessura} ${produto.tipo}`)
      .split(" ")
      .filter(Boolean),
  )

  const descricaoVidro = new Set(
    normalizar(`${vidro.nome} ${vidro.espessura} ${vidro.tipo}`)
      .split(" ")
      .filter(Boolean),
  )

  const comuns = [...descricaoProduto].filter((token) =>
    descricaoVidro.has(token),
  ).length

  const total = new Set([...descricaoProduto, ...descricaoVidro]).size || 1

  let nota = comuns / total

  if (
    produto.espessura &&
    normalizar(produto.espessura) === normalizar(vidro.espessura)
  ) {
    nota += 0.3
  }

  if (
    produto.tipo &&
    normalizar(vidro.tipo).includes(normalizar(produto.tipo))
  ) {
    nota += 0.2
  }

  return Math.min(nota, 1)
}

export default function ImportarTabelaVidrosModal({
  aberto,
  onClose,
  empresaId,
  vidros,
  onConcluido,
  corPrimaria = "#64748b",
  corDestaque = "#64748b",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [arquivoInfo, setArquivoInfo] = useState<{ nome: string; tamanho: string } | null>(null)
  const [itens, setItens] = useState<ItemRevisao[]>([])
  const [processando, setProcessando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [busca, setBusca] = useState("")
  const [diagnostico, setDiagnostico] = useState("")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(false)
  const modalRevisaoAberta = itens.length > 0 || processando

  const itensFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    if (!termo) return itens

    return itens.filter((item) =>
      normalizar(`${item.codigo} ${item.descricao} ${item.nome} ${item.espessura} ${item.tipo}`).includes(termo),
    )
  }, [itens, busca])

  const paginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return itensFiltrados.slice(inicio, inicio + itensPorPagina)
  }, [itensFiltrados, paginaAtual, itensPorPagina])

  const resumo = useMemo(
    () => ({
      total: itens.length,
      atualizar: itens.filter((item) => item.acao === "atualizar").length,
      vincular: itens.filter((item) => item.acao === "vincular").length,
      criar: itens.filter((item) => item.acao === "criar").length,
      ignorar: itens.filter((item) => item.acao === "ignorar").length,
      selecionados: itens.filter((item) => item.selecionado).length,
    }),
    [itens],
  )

  if (!aberto) return null

  const atualizarItem = (codigo: string, alteracoes: Partial<ItemRevisao>) => {
    setItens((atuais) =>
      atuais.map((item) => {
        if (item.codigo !== codigo) return item

        const novoItem = { ...item, ...alteracoes }

        if (alteracoes.tipo !== undefined) {
          novoItem.tipo = formatarTipoImportado(alteracoes.tipo)
        }

        if (
          (alteracoes.acao === "vincular" || alteracoes.acao === "atualizar") &&
          !novoItem.vidroId &&
          novoItem.sugestaoId
        ) {
          novoItem.vidroId = novoItem.sugestaoId
        }

        if (alteracoes.vidroId !== undefined) {
          const vidroSelecionado = vidros.find((v) => v.id === alteracoes.vidroId)
          if (vidroSelecionado) {
            novoItem.confianca = pontuarSemelhanca(novoItem, vidroSelecionado)
            novoItem.precoAnterior = Number(vidroSelecionado.preco)
          } else {
            novoItem.confianca = 0
            novoItem.precoAnterior = null
          }
        }

        return novoItem
      }),
    )
  }

  const toggleSelecionarTodos = (checked: boolean) => {
    setItens((atuais) => atuais.map((i) => ({ ...i, selecionado: checked })))
  }

  const toggleSelecionarPagina = (checked: boolean) => {
    const codigosPagina = new Set(paginados.map((p) => p.codigo))
    setItens((atuais) =>
      atuais.map((i) =>
        codigosPagina.has(i.codigo) ? { ...i, selecionado: checked } : i,
      ),
    )
  }

  const prepararRevisao = (produtos: ProdutoImportado[]) => {
    const revisao = produtos.map<ItemRevisao>((produto) => {
      const porCodigo = vidros.find(
        (vidro) =>
          normalizar(vidro.codigo || "") === normalizar(produto.codigo),
      )

      if (porCodigo) {
        return {
          ...produto,
          acao: "atualizar",
          vidroId: porCodigo.id,
          sugestaoId: porCodigo.id,
          confianca: 0.95,
          precoAnterior: Number(porCodigo.preco),
          selecionado: true,
        }
      }

      const sugestoes = vidros
        .map((vidro) => ({
          vidro,
          nota: pontuarSemelhanca(produto, vidro),
        }))
        .sort((a, b) => b.nota - a.nota)

      const melhor = sugestoes[0]
      const temSugestaoBoa = Boolean(melhor && melhor.nota >= 0.55)

      return {
        ...produto,
        acao: temSugestaoBoa ? "vincular" : "criar",
        vidroId: temSugestaoBoa ? melhor.vidro.id : "",
        sugestaoId: temSugestaoBoa ? melhor.vidro.id : "",
        confianca: temSugestaoBoa ? melhor.nota : 0,
        precoAnterior: temSugestaoBoa ? Number(melhor.vidro.preco) : null,
        selecionado: true,
      }
    })

    setItens(revisao)
  }

  const lerArquivo = async (arquivo: File) => {
    setErro("")
    setItens([])
    setArquivoInfo({
      nome: arquivo.name,
      tamanho: `${(arquivo.size / (1024 * 1024)).toFixed(1)} MB`,
    })
    setDiagnostico("")
    setProcessando(true)

    try {
      let texto = ""

      if (
        arquivo.type === "application/pdf" ||
        arquivo.name.toLowerCase().endsWith(".pdf")
      ) {
        const formData = new FormData()
        formData.append("arquivo", arquivo)

        const resposta = await fetch("/api/importar-tabela-vidros", {
          method: "POST",
          body: formData,
        })

        const retorno = await resposta.json().catch(() => null)

        if (!resposta.ok) {
          throw new Error(
            retorno?.detalhe || retorno?.erro || "Não foi possível ler o PDF.",
          )
        }

        texto = retorno?.texto || ""
      } else {
        texto = await arquivo.text()
      }

      const resultado = extrairProdutosTabelaPdfComDiagnostico(texto)
      const produtosExtraidos = resultado.produtos || []

      if (!produtosExtraidos.length) {
        throw new Error(
          "Não encontramos produtos com código, descrição e preço. Verifique se o arquivo possui texto selecionável.",
        )
      }

      const produtos: ProdutoImportado[] = produtosExtraidos.map((produto) => {
        const campos = descobrirCampos(produto.descricao)
        return {
          codigo: produto.codigo,
          descricao: produto.descricao,
          preco: produto.preco,
          nome: campos.nome,
          espessura: campos.espessura,
          tipo: formatarTipoImportado(campos.tipo),
        }
      })

      setDiagnostico(JSON.stringify(resultado.diagnostico, null, 2))
      prepararRevisao(produtos)
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Erro inesperado ao analisar o arquivo.",
      )
    } finally {
      setProcessando(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const confirmarImportacao = async () => {
    setErro("")
    setSalvando(true)

    try {
      const selecionados = itens.filter((i) => i.selecionado)

      for (const item of selecionados) {
        if (item.acao === "ignorar") continue

        if (item.acao === "criar") {
          const { error } = await supabase.from("vidros").insert({
            empresa_id: empresaId,
            codigo: item.codigo,
            nome: item.nome,
            espessura: item.espessura,
            tipo: formatarTipoImportado(item.tipo),
            preco: item.preco,
          })
          if (error) throw error
          continue
        }

        if (item.vidroId) {
          const { error } = await supabase
            .from("vidros")
            .update({ codigo: item.codigo, preco: item.preco })
            .eq("id", item.vidroId)
            .eq("empresa_id", empresaId)

          if (error) throw error
        }
      }

      await onConcluido()
      onClose()
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir a importação.",
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
      <div
        className="flex flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
        style={modalRevisaoAberta
          ? {
              width: "min(1680px, calc(100vw - 72px))",
              maxWidth: "min(1680px, calc(100vw - 72px))",
              minWidth: "min(1180px, calc(100vw - 72px))",
              height: "min(860px, calc(100vh - 72px))",
              maxHeight: "calc(100vh - 72px)",
            }
          : {
              width: "min(720px, calc(100vw - 32px))",
              maxWidth: "min(720px, calc(100vw - 32px))",
              height: "auto",
              maxHeight: "calc(100vh - 32px)",
            }}
      >
        {/* Header Principal */}
        <header className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50"
              style={{ color: "#64748b" }}
            >
              <FileText size={20} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                Catálogo de vidros
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Importar tabela de vidros
              </h2>
              <p className="text-xs text-slate-500">
                Revise os itens identificados e escolha como deseja importar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 lg:static"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        {/* Stepper Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-medium text-slate-500 sm:gap-6 lg:gap-10">
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
              1
            </span>
            <span>Enviar arquivo</span>
          </div>
          <div className="hidden h-px w-20 bg-slate-200 sm:block" />
          <div className="flex items-center gap-2.5 text-slate-900 font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-700">
              2
            </span>
            <span>Revisar itens</span>
          </div>
          <div className="hidden h-px w-20 bg-slate-200 sm:block" />
          <div className="flex items-center gap-2.5 text-slate-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-600">
              3
            </span>
            <span>Importar</span>
          </div>
        </div>

        {/* Conteúdo Principal Scrollável */}
        <main className={`${modalRevisaoAberta ? "min-h-0 flex-1" : "flex-none"} overflow-y-auto bg-slate-50/40 p-3`}>
          {!itens.length && !processando && (
            <div
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-slate-400"
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
              >
                <Upload size={22} />
              </div>
              <p className="text-lg font-semibold text-slate-800">
                Selecione a tabela do fornecedor
              </p>
              <p className="mt-2 max-w-lg text-sm text-slate-500">
                PDF com texto selecionável, TXT ou CSV (até 10 MB)
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void lerArquivo(file)
            }}
          />

          {processando && (
            <div className="flex min-h-[58vh] flex-col items-center justify-center rounded-[26px] border border-slate-200 bg-white">
              <Loader2 className="mb-3 animate-spin text-slate-600" size={30} />
              <p className="text-sm font-medium text-slate-700">
                Analisando PDF e extraindo os produtos...
              </p>
            </div>
          )}

          {erro && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-600">
              {erro}
            </div>
          )}

          {!!itens.length && (
            <>
              {/* Cards de Status e Resumo */}
              <div className="mb-5 grid grid-cols-12 gap-3">
                {/* Card do Arquivo */}
                <div className="col-span-12 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm 2xl:col-span-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Arquivo enviado com sucesso
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {arquivoInfo?.nome} • {arquivoInfo?.tamanho}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition"
                  >
                    <Upload size={13} />
                    Trocar
                  </button>
                </div>

                {/* Cards de Contagem */}
                <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:col-span-9">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-medium text-slate-500">
                      Total de itens
                    </p>
                    <p className="mt-1.5 text-lg font-medium text-slate-800">
                      {resumo.total}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Atualizar
                    </div>
                    <p className="mt-1.5 text-lg font-medium text-slate-800">
                      {resumo.atualizar}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Vincular
                    </div>
                    <p className="mt-1.5 text-lg font-medium text-slate-800">
                      {resumo.vincular}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      Criar
                    </div>
                    <p className="mt-1.5 text-lg font-medium text-slate-800">
                      {resumo.criar}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Ignorar
                    </div>
                    <p className="mt-1.5 text-lg font-medium text-slate-800">
                      {resumo.ignorar}
                    </p>
                  </div>
                </div>
              </div>

              {/* Controles de Filtro e Seleção */}
              <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(420px,1fr)_auto] xl:items-center">
                <div className="relative w-full">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={15}
                  />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por código, descrição ou nome..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => toggleSelecionarPagina(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <CheckCircle2 size={13} />
                    Selecionar página
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelecionarTodos(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <CheckCircle2 size={13} />
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelecionarTodos(false)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw size={13} />
                    Limpar seleção
                  </button>
                  <button
                    type="button"
                    onClick={() => setItens([])}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                    Limpar tudo
                  </button>
                </div>
              </div>

              {/* Tabela de Produtos com Scroll Horizontal */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="max-h-[56vh] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left text-[10px]">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                      <th className="w-[3%] px-1.5 py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-600"
                          checked={
                            paginados.length > 0 &&
                            paginados.every((i) => i.selecionado)
                          }
                          onChange={(e) =>
                            toggleSelecionarPagina(e.target.checked)
                          }
                        />
                      </th>
                      <th className="w-[7%] px-1.5 py-2">Código</th>
                      <th className="w-[24%] px-1.5 py-2">Descrição</th>
                      <th className="w-[13%] px-1.5 py-2">Nome</th>
                      <th className="w-[6%] px-1.5 py-2">Esp.</th>
                      <th className="w-[8%] px-1.5 py-2">Tipo</th>
                      <th className="w-[7%] px-1.5 py-2">Preço</th>
                      <th className="w-[9%] px-1.5 py-2">Ação</th>
                      <th className="w-[6%] px-1.5 py-2 text-center">Conf.</th>
                      <th className="w-[17%] px-1.5 py-2">Vinculação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginados.map((item) => {
                      const vidroVinculado = vidros.find(
                        (v) => v.id === item.vidroId,
                      )

                      return (
                        <tr
                          key={item.codigo}
                          className="hover:bg-slate-50/80 transition"
                        >
                          <td className="px-1.5 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!item.selecionado}
                              onChange={(e) =>
                                atualizarItem(item.codigo, {
                                  selecionado: e.target.checked,
                                })
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-600"
                            />
                          </td>

                          <td className="break-all px-1.5 py-2 text-[11px] font-normal text-slate-800">
                            {item.codigo}
                          </td>

                          <td className="px-1.5 py-2 text-[11px] text-slate-600" title={item.descricao}>
                            <span className="line-clamp-3 break-words leading-[1.25rem]">{item.descricao}</span>
                          </td>

                          <td className="px-1.5 py-2 text-[11px] text-slate-700">
                            {item.acao === "criar" ? (
                              <input
                                value={item.nome}
                                onChange={(e) =>
                                  atualizarItem(item.codigo, {
                                    nome: e.target.value,
                                  })
                                }
                                className="w-full min-w-0 rounded-lg border border-slate-200 px-1.5 py-1.5 text-[11px] outline-none focus:border-slate-400"
                              />
                            ) : (
                              item.nome || "—"
                            )}
                          </td>

                          <td className="px-1.5 py-2 text-[11px] text-slate-700">
                            {item.acao === "criar" ? (
                              <input
                                value={item.espessura}
                                onChange={(e) =>
                                  atualizarItem(item.codigo, {
                                    espessura: e.target.value,
                                  })
                                }
                                className="w-full min-w-0 rounded-lg border border-slate-200 px-1.5 py-1.5 text-[11px] outline-none focus:border-slate-400"
                              />
                            ) : (
                              item.espessura || "—"
                            )}
                          </td>

                          <td className="px-1.5 py-2 text-[11px] text-slate-700">
                            {item.acao === "criar" ? (
                              <input
                                value={item.tipo}
                                onChange={(e) =>
                                  atualizarItem(item.codigo, {
                                    tipo: e.target.value,
                                  })
                                }
                                className="w-full min-w-0 rounded-lg border border-slate-200 px-1.5 py-1.5 text-[11px] outline-none focus:border-slate-400"
                              />
                            ) : (
                              item.tipo || "—"
                            )}
                          </td>

                          <td className="px-1.5 py-2 text-[11px] font-normal">
                            <span className="rounded-md bg-slate-100 px-1.5 py-1 text-slate-700">
                              {item.preco.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>

                          <td className="px-1.5 py-2">
                            <div className="relative w-full min-w-0">
                              <select
                                value={item.acao}
                                onChange={(e) =>
                                  atualizarItem(item.codigo, {
                                    acao: e.target.value as AcaoImportacao,
                                  })
                                }
                                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-4 pr-5 text-[10px] font-normal text-slate-700 outline-none focus:border-slate-300"
                              >
                                <option value="atualizar">Atualizar</option>
                                <option value="vincular">Vincular</option>
                                <option value="criar">Criar</option>
                                <option value="ignorar">Ignorar</option>
                              </select>
                              <span
                                className={`absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${
                                  item.acao === "atualizar"
                                    ? "bg-emerald-500"
                                    : item.acao === "vincular"
                                      ? "bg-blue-500"
                                      : item.acao === "criar"
                                        ? "bg-purple-500"
                                        : "bg-amber-500"
                                }`}
                              />
                              <ChevronDown
                                size={12}
                                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                              />
                            </div>
                          </td>

                          <td className="px-1.5 py-2 text-center">
                            {item.confianca > 0 && item.acao !== "criar" ? (
                              <span
                                className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  item.confianca >= 0.8
                                    ? "bg-emerald-100/70 text-emerald-700"
                                    : item.confianca >= 0.5
                                      ? "bg-blue-100/70 text-blue-700"
                                      : "bg-amber-100/70 text-amber-700"
                                }`}
                              >
                                {Math.round(item.confianca * 100)}%
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="px-1.5 py-2">
                            {item.acao === "vincular" || item.acao === "atualizar" ? (
                              <div className="flex flex-col gap-1">
                                <select
                                  value={item.vidroId || ""}
                                  onChange={(e) =>
                                    atualizarItem(item.codigo, {
                                      vidroId: e.target.value,
                                    })
                                  }
                                  className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-[9px] text-slate-700 outline-none focus:border-slate-400"
                                >
                                  <option value="">Selecione para vincular...</option>
                                  {vidros.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.codigo ? `[${v.codigo}] ` : ""}
                                      {v.nome} {v.espessura} {v.tipo ? `| ${v.tipo}` : ""} - R$ {Number(v.preco).toFixed(2)}
                                    </option>
                                  ))}
                                </select>

                                {vidroVinculado ? (
                                  <span className="text-[10px] text-slate-500">
                                    Preço cadastrado: R${" "}
                                    {Number(vidroVinculado.preco).toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-normal text-amber-600">
                                    Nenhum vidro selecionado
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                {item.acao === "criar" ? "Novo cadastro" : "Ignorado"}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>

                {/* Paginação */}
                <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      disabled={paginaAtual === 1}
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    {[1, 2, 3, "...", Math.ceil(itensFiltrados.length / itensPorPagina)]
                      .filter(Boolean)
                      .map((num, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => typeof num === "number" && setPaginaAtual(num)}
                          className={`h-7 w-7 rounded-md font-medium ${
                            paginaAtual === num
                              ? "bg-slate-100 font-semibold text-slate-900"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    <button
                      type="button"
                      disabled={
                        paginaAtual >=
                        Math.ceil(itensFiltrados.length / itensPorPagina)
                      }
                      onClick={() => setPaginaAtual((p) => p + 1)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-40"
                    >
                      Próxima <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span>Itens por página:</span>
                      <select
                        value={itensPorPagina}
                        onChange={(e) => setItensPorPagina(Number(e.target.value))}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <span>
                      {(paginaAtual - 1) * itensPorPagina + 1}-
                      {Math.min(
                        paginaAtual * itensPorPagina,
                        itensFiltrados.length,
                      )}{" "}
                      de {itensFiltrados.length} itens
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Rodapé do Modal */}
        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div>
            {diagnostico && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDiagnosticoAberto(!diagnosticoAberto)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  Diagnóstico da extração
                  <ChevronDown
                    size={14}
                    className={`transition ${diagnosticoAberto ? "rotate-180" : ""}`}
                  />
                </button>
                <p className="text-[11px] text-slate-400">
                  Informações técnicas sobre a leitura do arquivo
                </p>

                {diagnosticoAberto && (
                  <div className="absolute bottom-full left-0 mb-2 w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                    <textarea
                      readOnly
                      value={diagnostico}
                      className="h-40 w-full rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-600 outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
              <Lock size={12} /> Seus dados estão seguros
            </span>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Voltar
            </button>

            {!!itens.length && (
              <button
                type="button"
                disabled={salvando}
                onClick={() => void confirmarImportacao()}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                Importar selecionados ({resumo.selecionados})
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
