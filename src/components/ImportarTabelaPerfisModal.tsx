"use client"

import { useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Loader2,
  Lock,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { decodeCsvFile } from "@/utils/csvEncoding"
import { extrairPerfisTabelaPdfComDiagnostico, ProdutoPerfilPdf } from "@/utils/parserTabelaPerfisPdf"

type Perfil = {
  id: string
  codigo: string
  nome: string
  cores: string
  preco: number | null
  categoria: string
  empresa_id?: string
}

type AcaoImportacao = "atualizar" | "vincular" | "criar" | "ignorar"

type ItemRevisao = ProdutoPerfilPdf & {
  revisaoId: string
  acao: AcaoImportacao
  perfilId: string
  precoAnterior: number | null
  selecionado: boolean
}

type Props = {
  aberto: boolean
  onClose: () => void
  empresaId: string
  perfis: Perfil[]
  onConcluido: () => Promise<void> | void
}

const normalizar = (valor: string | number | null | undefined) =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()

const formatarTexto = (valor: string) => {
  const limpo = (valor || "").trim().toLowerCase().replace(/\s+/g, " ")
  if (!limpo) return ""
  return limpo.charAt(0).toUpperCase() + limpo.slice(1)
}

const converterPreco = (valor: string) => {
  const numero = Number(valor.replace(/\./g, "").replace(",", "."))
  return Number.isFinite(numero) ? numero : 0
}

const extrairPerfisCsv = (texto: string): ProdutoPerfilPdf[] => {
  const linhas = texto.split(/\r?\n/).filter((linha) => linha.trim()).slice(1)
  return linhas.flatMap((linha, index) => {
    const colunas = linha.split(";").map((coluna) => coluna.replace(/['"]+/g, "").trim())
    const codigo = colunas[0] || ""
    const nome = colunas[1] || ""
    const cores = colunas[2] || "Padrão"
    const preco = converterPreco(colunas[3] || "0")
    const categoria = colunas[4] || "Perfil"

    if (!codigo || !nome) return []

    return [{
      codigo: codigo.toUpperCase(),
      codigoOriginal: codigo.toUpperCase(),
      nome: formatarTexto(nome),
      cores: formatarTexto(cores),
      categoria: formatarTexto(categoria),
      preco,
      precoTexto: (colunas[3] || "0").trim(),
      descricaoOriginal: nome,
    } satisfies ProdutoPerfilPdf]
  })
}

export default function ImportarTabelaPerfisModal({
  aberto,
  onClose,
  empresaId,
  perfis,
  onConcluido,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivoInfo, setArquivoInfo] = useState<{ nome: string; tamanho: string } | null>(null)
  const [itens, setItens] = useState<ItemRevisao[]>([])
  const [processando, setProcessando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [busca, setBusca] = useState("")
  const [diagnostico, setDiagnostico] = useState("")
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(false)
  const [diagnosticoCopiado, setDiagnosticoCopiado] = useState(false)

  const itensFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    if (!termo) return itens
    return itens.filter((item) =>
      normalizar(`${item.codigo} ${item.nome} ${item.cores} ${item.categoria} ${item.preco}`).includes(termo),
    )
  }, [itens, busca])

  const resumo = useMemo(
    () => ({
      total: itens.length,
      atualizar: itens.filter((item) => item.acao === "atualizar").length,
      vincular: itens.filter((item) => item.acao === "vincular").length,
      criar: itens.filter((item) => item.acao === "criar").length,
      ignorar: itens.filter((item) => item.acao === "ignorar").length,
      selecionados: itens.filter((item) => item.selecionado && item.acao !== "ignorar").length,
    }),
    [itens],
  )
  const modalRevisaoAberta = itens.length > 0 || processando

  if (!aberto) return null

  const atualizarItem = (revisaoId: string, alteracoes: Partial<ItemRevisao>) => {
    setItens((atuais) =>
      atuais.map((item) => {
        if (item.revisaoId !== revisaoId) return item
        const novoItem = { ...item, ...alteracoes }
        if (alteracoes.acao === "ignorar") novoItem.selecionado = false
        if (alteracoes.acao && alteracoes.acao !== "ignorar" && alteracoes.selecionado === undefined) {
          novoItem.selecionado = true
        }
        if (
          (alteracoes.acao === "vincular" || alteracoes.acao === "atualizar") &&
          !novoItem.perfilId
        ) {
          const sugestao = perfis.find((perfil) => normalizar(perfil.codigo) === normalizar(novoItem.codigo))
          novoItem.perfilId = sugestao?.id || ""
          novoItem.precoAnterior = sugestao?.preco ? Number(sugestao.preco) : null
        }
        return novoItem
      }),
    )
  }

  const prepararRevisao = (produtos: ProdutoPerfilPdf[]) => {
    const revisao = produtos.map<ItemRevisao>((produto, index) => {
      const existenteExato = perfis.find(
        (perfil) =>
          normalizar(perfil.codigo) === normalizar(produto.codigo) &&
          normalizar(perfil.cores) === normalizar(produto.cores),
      )
      const sugestao = existenteExato || perfis.find(
        (perfil) =>
          normalizar(perfil.codigo) === normalizar(produto.codigo) ||
          normalizar(perfil.nome) === normalizar(produto.nome),
      )

      return {
        ...produto,
        revisaoId: `${produto.codigo}-${produto.cores}-${index}`,
        acao: existenteExato ? "atualizar" : sugestao ? "vincular" : "criar",
        perfilId: sugestao?.id || "",
        precoAnterior: sugestao?.preco ? Number(sugestao.preco) : null,
        selecionado: true,
      }
    })

    setItens(revisao)
  }

  const lerArquivo = async (arquivo: File) => {
    setErro("")
    setItens([])
    setDiagnostico("")
    setDiagnosticoCopiado(false)
    setArquivoInfo({
      nome: arquivo.name,
      tamanho: `${(arquivo.size / (1024 * 1024)).toFixed(1)} MB`,
    })
    setProcessando(true)

    try {
      let produtos: ProdutoPerfilPdf[] = []

      if (arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf")) {
        const formData = new FormData()
        formData.append("arquivo", arquivo)

        const resposta = await fetch("/api/importar-tabela-vidros", {
          method: "POST",
          body: formData,
        })

        const retorno = await resposta.json().catch(() => null)
        if (!resposta.ok) {
          throw new Error(retorno?.detalhe || retorno?.erro || "Não foi possível ler o PDF.")
        }

        const resultado = extrairPerfisTabelaPdfComDiagnostico(retorno?.texto || "")
        produtos = resultado.produtos || []
        setDiagnostico(JSON.stringify(resultado.diagnostico, null, 2))
      } else {
        produtos = extrairPerfisCsv(await decodeCsvFile(arquivo))
        setDiagnostico(JSON.stringify({ totalProdutos: produtos.length }, null, 2))
      }

      if (!produtos.length) {
        throw new Error("Não encontramos perfis com código, descrição, cor e preço nesse arquivo.")
      }

      prepararRevisao(produtos)
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Erro inesperado ao analisar o arquivo."
      setErro(mensagem)
      setDiagnostico(mensagem)
    } finally {
      setProcessando(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const confirmarImportacao = async () => {
    setErro("")
    setSalvando(true)

    try {
      const selecionados = itens.filter((item) => item.selecionado && item.acao !== "ignorar")

      for (const item of selecionados) {
        const payload = {
          codigo: item.codigo.toUpperCase().trim(),
          nome: formatarTexto(item.nome),
          cores: formatarTexto(item.cores || "Padrão"),
          categoria: formatarTexto(item.categoria || "Perfil"),
          preco: Number(item.preco) || null,
          empresa_id: empresaId,
        }

        if ((item.acao === "atualizar" || item.acao === "vincular") && item.perfilId) {
          const { error } = await supabase
            .from("perfis")
            .update(payload)
            .eq("id", item.perfilId)
            .eq("empresa_id", empresaId)
          if (error) throw error
          continue
        }

        const { error } = await supabase.from("perfis").insert([payload])
        if (error) throw error
      }

      await onConcluido()
      onClose()
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Erro ao importar perfis."
      setErro(mensagem)
      setDiagnostico(mensagem)
    } finally {
      setSalvando(false)
    }
  }

  const copiarDiagnostico = async () => {
    const texto = erro || diagnostico || `Leitura concluída com sucesso. ${itens.length} itens encontrados.`
    await navigator.clipboard.writeText(texto)
    setDiagnosticoCopiado(true)
    window.setTimeout(() => setDiagnosticoCopiado(false), 1600)
  }

  return (
    <div
      data-importador-catalogo="overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navigation/30 px-4 py-6 backdrop-blur-[2px]"
    >
      <div
        data-importador-catalogo="box"
        data-importador-vazio={modalRevisaoAberta ? undefined : "true"}
        className="flex flex-col overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_24px_70px_var(--shadow)]"
        style={modalRevisaoAberta
          ? {
              width: "calc(100vw - 32px)",
              maxWidth: "calc(100vw - 32px)",
              minWidth: "min(1180px, calc(100vw - 32px))",
              height: "calc(100vh - 32px)",
              maxHeight: "calc(100vh - 32px)",
            }
          : {
              width: "min(760px, calc(100vw - 32px))",
              maxWidth: "min(760px, calc(100vw - 32px))",
              height: "auto",
              maxHeight: "calc(100vh - 32px)",
            }}
      >
        <header className="flex shrink-0 flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-surface-secondary text-text-secondary">
              <FileText size={20} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-text-secondary">Catálogo de perfis</p>
              <h2 className="mt-1 text-base font-medium text-text-primary">Importar tabela de perfis</h2>
              <p className="text-xs text-text-secondary">Revise os itens identificados e escolha como deseja importar.</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-5 top-5 rounded-xl border border-border p-2 text-text-secondary transition hover:bg-surface-secondary hover:text-text-secondary lg:static" title="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-b border-border bg-surface-secondary/60 px-4 py-3 text-xs font-normal text-text-secondary sm:gap-6 lg:gap-10">
          <div className="flex items-center gap-2.5 text-text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-[11px] font-normal text-text-primary">1</span>
            <span>Enviar arquivo</span>
          </div>
          <div className="hidden h-px w-20 bg-border sm:block" />
          <div className="flex items-center gap-2.5 text-text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-[11px] text-text-primary">2</span>
            <span>Revisar itens</span>
          </div>
          <div className="hidden h-px w-20 bg-border sm:block" />
          <div className="flex items-center gap-2.5 text-text-secondary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-[11px] text-text-secondary">3</span>
            <span>Importar</span>
          </div>
        </div>

        <main className={`${modalRevisaoAberta ? "min-h-0 flex-1" : "flex-none"} overflow-y-auto bg-surface-secondary/40 p-3`}>
          {!itens.length && !processando ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-secondary/40 text-center transition hover:border-border-strong hover:bg-surface"
            >
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface text-text-secondary">
                <Upload size={22} />
              </span>
              <span className="text-base font-medium text-text-primary">Selecione a tabela do fornecedor</span>
              <span className="mt-2 text-sm text-text-secondary">PDF com texto selecionável, TXT ou CSV</span>
            </button>
          ) : null}

          {processando ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-surface text-center">
              <Loader2 className="mb-4 animate-spin text-text-secondary" size={34} />
              <p className="text-base font-semibold text-text-primary">Lendo arquivo</p>
              <p className="mt-1 text-sm text-text-secondary">Separando código, descrição, cor e preço...</p>
            </div>
          ) : null}

          {!!itens.length && (
            <div className="space-y-4">
              <div className="mb-5 grid grid-cols-12 gap-3">
                <div className="col-span-12 flex items-center justify-between rounded-2xl border border-border/80 bg-surface p-4 shadow-sm 2xl:col-span-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-success-soft text-success">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-text-primary">Arquivo enviado com sucesso</p>
                      <p className="mt-0.5 text-[11px] text-text-secondary">{arquivoInfo?.nome} • {arquivoInfo?.tamanho}</p>
                    </div>
                  </div>
                  <button onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-normal text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary">
                    <Upload size={13} />
                    Trocar
                  </button>
                </div>
                <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:col-span-9">
                  {[
                    ["Total de itens", resumo.total, "bg-border"],
                    ["Atualizar", resumo.atualizar, "bg-success"],
                    ["Vincular", resumo.vincular, "bg-info"],
                    ["Criar", resumo.criar, "bg-info"],
                    ["Ignorar", resumo.ignorar, "bg-warning"],
                  ].map(([label, valor, cor]) => (
                    <div key={label} className="rounded-2xl border border-border/80 bg-surface p-3 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[11px] font-normal text-text-secondary">
                        <span className={`h-2 w-2 rounded-full ${cor}`} />
                        {label}
                      </div>
                      <p className="mt-1.5 text-lg font-normal text-text-primary">{valor}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid items-center gap-3 xl:grid-cols-[1fr_auto_auto]">
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por código, nome, cor ou categoria..."
                    className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-border-strong"
                  />
                </div>
                <button onClick={() => setItens((atuais) => atuais.map((item) => ({ ...item, selecionado: true })))} className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-normal text-text-secondary hover:bg-surface-secondary">Selecionar todos</button>
                <button onClick={() => setItens((atuais) => atuais.map((item) => ({ ...item, selecionado: false })))} className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-normal text-text-secondary hover:bg-surface-secondary">Limpar seleção</button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="min-h-[360px] max-h-[calc(100vh-430px)] overflow-auto">
                  <table className="w-full min-w-[1500px] table-fixed text-left text-xs">
                    <colgroup>
                      <col className="w-10" />
                      <col className="w-[110px]" />
                      <col className="w-[310px]" />
                      <col className="w-[160px]" />
                      <col className="w-[180px]" />
                      <col className="w-[135px]" />
                      <col className="w-[150px]" />
                      <col className="w-[455px]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-surface-secondary text-[10px] uppercase tracking-[0.12em] text-text-secondary">
                      <tr>
                        <th className="w-10 px-3 py-3"></th>
                        <th className="px-3 py-3 font-normal">Código</th>
                        <th className="px-3 py-3 font-normal">Descrição</th>
                        <th className="px-3 py-3 font-normal">Cor</th>
                        <th className="px-3 py-3 font-normal">Categoria</th>
                        <th className="px-3 py-3 font-normal">Preço</th>
                        <th className="px-3 py-3 font-normal">Ação</th>
                        <th className="px-3 py-3 font-normal">Vinculação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {itensFiltrados.map((item) => {
                        return (
                        <tr key={item.revisaoId} className="hover:bg-surface-secondary/80">
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.selecionado}
                              onChange={(e) => atualizarItem(item.revisaoId, { selecionado: e.target.checked })}
                              className="h-3.5 w-3.5 rounded border-border-strong accent-slate-600"
                            />
                          </td>
                          <td className="px-3 py-2 font-normal text-text-primary">{item.codigo}</td>
                          <td className="px-3 py-2 text-text-primary">
                            <input
                              value={item.nome}
                              onChange={(e) => atualizarItem(item.revisaoId, { nome: e.target.value })}
                              className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-border focus:bg-surface"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.cores}
                              onChange={(e) => atualizarItem(item.revisaoId, { cores: e.target.value })}
                              className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-border focus:bg-surface"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.categoria}
                              onChange={(e) => atualizarItem(item.revisaoId, { categoria: e.target.value })}
                              className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-border focus:bg-surface"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={String(item.preco).replace(".", ",")}
                              onChange={(e) => atualizarItem(item.revisaoId, { preco: converterPreco(e.target.value) })}
                              className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-right outline-none focus:border-border-strong"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <select
                                value={item.acao}
                                onChange={(e) => atualizarItem(item.revisaoId, { acao: e.target.value as AcaoImportacao })}
                                className="w-full appearance-none rounded-lg border border-border bg-surface py-1.5 pl-4 pr-7 text-xs font-normal text-text-primary outline-none focus:border-border-strong"
                              >
                                <option value="atualizar">Atualizar</option>
                                <option value="vincular">Vincular</option>
                                <option value="criar">Criar</option>
                                <option value="ignorar">Ignorar</option>
                              </select>
                              <span
                                className={`absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${
                                  item.acao === "atualizar"
                                    ? "bg-success"
                                    : item.acao === "vincular"
                                      ? "bg-info"
                                      : item.acao === "criar"
                                        ? "bg-info"
                                        : "bg-warning"
                                }`}
                              />
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                            </div>
                            {item.precoAnterior !== null && (
                              <p className="mt-1 text-[10px] text-text-secondary">Anterior: R$ {item.precoAnterior.toFixed(2).replace(".", ",")}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {item.acao === "atualizar" || item.acao === "vincular" ? (
                              <select
                                value={item.perfilId || ""}
                                onChange={(e) => {
                                  const perfilSelecionado = perfis.find((perfil) => perfil.id === e.target.value)
                                  atualizarItem(item.revisaoId, {
                                    perfilId: e.target.value,
                                    precoAnterior: perfilSelecionado?.preco ? Number(perfilSelecionado.preco) : null,
                                  })
                                }}
                                className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] font-normal text-text-primary outline-none focus:border-border-strong"
                              >
                                <option value="">Selecionar perfil...</option>
                                {perfis.map((perfil) => (
                                  <option key={perfil.id} value={perfil.id}>
                                    {perfil.codigo} - {perfil.nome} - {perfil.cores || "Padrão"}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-text-secondary">—</span>
                            )}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {erro ? <p className="mt-4 rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">{erro}</p> : null}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
          <button
            type="button"
            onClick={() => setDiagnosticoAberto((atual) => !atual)}
            className="flex items-center gap-2 text-sm font-normal text-text-secondary"
          >
            Diagnóstico da extração
            <ChevronDown size={15} className={diagnosticoAberto ? "rotate-180" : ""} />
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-text-secondary md:flex"><Lock size={13} /> Seus dados estão seguros</span>
            <button onClick={onClose} className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-normal text-text-secondary hover:bg-surface-secondary">Cancelar</button>
            <button
              onClick={() => void confirmarImportacao()}
              disabled={!resumo.selecionados || salvando}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-normal text-on-primary disabled:opacity-50"
            >
              {salvando ? "Importando..." : `Importar selecionados (${resumo.selecionados})`}
            </button>
          </div>
          {diagnosticoAberto && (diagnostico || erro || itens.length > 0) ? (
            <div className={`w-full rounded-xl border p-4 ${erro ? "border-danger-soft bg-danger-soft" : "border-success-soft bg-success-soft"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {erro ? <AlertCircle size={16} className="mt-0.5 text-danger" /> : <CheckCircle2 size={16} className="mt-0.5 text-success" />}
                  <div>
                    <p className={`text-sm font-normal ${erro ? "text-danger" : "text-success"}`}>
                      {erro ? "Não foi possível concluir a leitura." : `Leitura concluída com sucesso. ${itens.length} itens encontrados.`}
                    </p>
                    {erro ? <p className="mt-1 text-xs text-danger">{erro}</p> : null}
                  </div>
                </div>
                <button type="button" onClick={() => void copiarDiagnostico()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:bg-surface-secondary" title="Copiar diagnóstico">
                  <Copy size={14} />
                </button>
              </div>
              {diagnostico && !erro ? (
                <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-surface/70 p-3 text-[11px] text-text-secondary">{diagnostico}</pre>
              ) : null}
              {diagnosticoCopiado ? <p className="mt-2 text-xs text-text-secondary">Diagnóstico copiado.</p> : null}
            </div>
          ) : null}
        </footer>

        <input ref={inputRef} type="file" accept=".pdf,.csv,.txt" className="hidden" onChange={(e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) void lerArquivo(arquivo)
        }} />
      </div>
    </div>
  )
}
