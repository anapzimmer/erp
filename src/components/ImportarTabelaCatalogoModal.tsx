"use client"

import { useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { decodeCsvFile } from "@/utils/csvEncoding"
import { AlertCircle, CheckCircle2, ChevronDown, Copy, FileText, Loader2, Lock, Search, Upload, X } from "lucide-react"

type TipoCatalogo = "kits" | "ferragens"
type AcaoImportacao = "atualizar" | "vincular" | "criar" | "ignorar"

type ItemRevisao = {
  revisaoId: string
  id?: string | number
  codigo: string
  nome: string
  cores: string
  categoria: string
  largura: number
  altura: number
  preco: number
  acao: AcaoImportacao
  selecionado: boolean
}

type Props = {
  aberto: boolean
  tipo: TipoCatalogo
  empresaId: string
  existentes: any[]
  onClose: () => void
  onConcluido: () => Promise<void> | void
}

const moedaParaNumero = (valor: string) => {
  const limpo = valor.replace(/[^\d,.-]/g, "").trim()
  if (!limpo) return 0
  if (limpo.includes(",")) return Number(limpo.replace(/\./g, "").replace(",", ".")) || 0
  return Number(limpo) || 0
}

const formatarTexto = (texto: string) =>
  (texto || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^\w)|(\s+\w)/g, (letra) => letra.toUpperCase())

const normalizar = (texto: string | null | undefined) =>
  (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const coresConhecidas = ["BRANCO", "BRANCA", "PRETO", "PRETA", "FOSCO", "BRONZE", "GOLD", "CROMADO", "ROSE", "NATURAL"]

const separarCorDescricao = (descricaoOriginal: string) => {
  let descricao = descricaoOriginal.replace(/\s+/g, " ").trim()
  let cor = "Padrão"

  for (const corConhecida of coresConhecidas) {
    const regex = new RegExp(`(?:-|\\s)\\s*${corConhecida}\\b\\s*$`, "i")
    if (regex.test(descricao)) {
      const corNormalizada = corConhecida === "PRETA" ? "PRETO" : corConhecida === "BRANCA" ? "BRANCO" : corConhecida
      cor = formatarTexto(corNormalizada)
      descricao = descricao.replace(regex, "").trim()
      break
    }
  }

  return {
    descricao: descricao.replace(/\s*-\s*$/, "").replace(/\s+/g, " ").trim(),
    cor,
  }
}

const separarLinha = (linha: string) => {
  const delimitador = (linha.match(/;/g)?.length || 0) >= (linha.match(/,/g)?.length || 0) ? ";" : ","
  const valores: string[] = []
  let atual = ""
  let aspas = false

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i]
    if (char === '"') {
      aspas = !aspas
      continue
    }
    if (char === delimitador && !aspas) {
      valores.push(atual.trim())
      atual = ""
      continue
    }
    atual += char
  }

  valores.push(atual.trim())
  return valores.map((valor) => valor.replace(/^['"]|['"]$/g, "").trim())
}

const extrairDimensoes = (texto: string) => {
  const match = texto.match(/(\d{2,5})\s*(?:mm)?\s*[xX]\s*(\d{2,5})\s*(?:mm)?/)
  return {
    largura: match ? Number(match[1]) : 0,
    altura: match ? Number(match[2]) : 0,
  }
}

const extrairLinhasPdf = (texto: string, tipo: TipoCatalogo) => {
  const inicioDescricaoFerragem =
    "PARAFUSO|CHUMBADOR|PORCA|SUPORTE|FECHADURA|ROLDANA|PUXADOR|TRINCO|CAPUCHINHO|CILINDRO|PLACA|CONTRA|DOBRADICA|DOBRADIÇA|CANOPLA|TAMPA|TAPA|NYLON|KIT|CORRIMAO|CORRIMÃO|PONTALETE|PERFIL|CAPA|TRILHO|TUBO|CANTONEIRA|BARRA|GUIA"

  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => /\d+[,.]\d{2}$/.test(linha))
    .map((linha, index): ItemRevisao | null => {
      const precoMatch = linha.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[,.]\d{2})$/)
      if (!precoMatch) return null
      const preco = moedaParaNumero(precoMatch[1])
      const semPreco = linha.slice(0, precoMatch.index).trim()

      if (tipo === "ferragens") {
        const partes = semPreco.match(
          new RegExp(`^([A-Z0-9._/-]{3,24}?)(${inicioDescricaoFerragem})(.*)$`, "i"),
        )
        if (!partes) return null
        const { descricao, cor } = separarCorDescricao(`${partes[2]} ${partes[3]}`)
        return {
          revisaoId: `${partes[1]}-${index}`,
          codigo: partes[1].toUpperCase(),
          nome: formatarTexto(descricao),
          cores: cor,
          categoria: "Ferragem",
          largura: 0,
          altura: 0,
          preco,
          acao: "criar",
          selecionado: true,
        }
      }

      const dimensoes = extrairDimensoes(semPreco)
      return {
        revisaoId: `kit-${index}`,
        codigo: "",
        nome: formatarTexto(semPreco),
        cores: "Padrão",
        categoria: "Kit",
        largura: dimensoes.largura,
        altura: dimensoes.altura,
        preco,
        acao: "criar",
        selecionado: true,
      }
    })
    .filter(Boolean) as ItemRevisao[]
}

const extrairItensTabela = (texto: string, tipo: TipoCatalogo) => {
  const linhas = texto.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean)
  if (!linhas.length) return []

  const linhasComSeparador = linhas.filter((linha) => linha.includes(";"))
  if (!linhasComSeparador.length) return extrairLinhasPdf(texto, tipo)

  const cabecalho = separarLinha(linhasComSeparador[0]).map(normalizar)
  const dados = linhasComSeparador.slice(1)
  const idx = (...nomes: string[]) => cabecalho.findIndex((h) => nomes.some((nome) => h.includes(nome)))

  return dados.map((linha, index): ItemRevisao | null => {
    const colunas = separarLinha(linha)
    if (tipo === "ferragens") {
      const codigo = colunas[idx("codigo", "cod") >= 0 ? idx("codigo", "cod") : 0] || ""
      const nome = colunas[idx("nome", "descricao", "ferragem") >= 0 ? idx("nome", "descricao", "ferragem") : 1] || ""
      if (!codigo || !nome) return null
      return {
        revisaoId: `${codigo}-${index}`,
        codigo: codigo.toUpperCase().trim(),
        nome: formatarTexto(nome),
        cores: formatarTexto(colunas[idx("cor", "cores") >= 0 ? idx("cor", "cores") : 2] || "Padrão"),
        categoria: formatarTexto(colunas[idx("categoria", "grupo") >= 0 ? idx("categoria", "grupo") : 4] || "Ferragem"),
        largura: 0,
        altura: 0,
        preco: moedaParaNumero(colunas[idx("preco", "valor") >= 0 ? idx("preco", "valor") : 3] || ""),
        acao: "criar",
        selecionado: true,
      }
    }

    const nome = colunas[idx("nome", "descricao", "kit") >= 0 ? idx("nome", "descricao", "kit") : 0] || ""
    if (!nome) return null
    const dimensoes = extrairDimensoes(nome)
    return {
      revisaoId: `kit-${index}`,
      codigo: "",
      nome: formatarTexto(nome),
      largura: Number(colunas[idx("largura")]) || dimensoes.largura,
      altura: Number(colunas[idx("altura")]) || dimensoes.altura,
      cores: formatarTexto(colunas[idx("cor", "cores") >= 0 ? idx("cor", "cores") : 3] || "Padrão"),
      categoria: formatarTexto(colunas[idx("categoria", "grupo") >= 0 ? idx("categoria", "grupo") : 4] || "Kit"),
      preco: moedaParaNumero(colunas[idx("preco", "valor") >= 0 ? idx("preco", "valor") : 5] || ""),
      acao: "criar",
      selecionado: true,
    }
  }).filter(Boolean) as ItemRevisao[]
}

export default function ImportarTabelaCatalogoModal({ aberto, tipo, empresaId, existentes, onClose, onConcluido }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [itens, setItens] = useState<ItemRevisao[]>([])
  const [busca, setBusca] = useState("")
  const [erro, setErro] = useState("")
  const [processando, setProcessando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [arquivoInfo, setArquivoInfo] = useState<{ nome: string; tamanho: string } | null>(null)
  const [diagnostico, setDiagnostico] = useState("")
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(false)
  const [diagnosticoCopiado, setDiagnosticoCopiado] = useState(false)

  const titulo = tipo === "kits" ? "Importar tabela de kits" : "Importar tabela de ferragens"
  const subtitulo = tipo === "kits" ? "Catálogo de kits" : "Catálogo de ferragens"
  const modalRevisaoAberta = itens.length > 0 || processando

  const resumo = useMemo(() => ({
    total: itens.length,
    atualizar: itens.filter((item) => item.acao === "atualizar").length,
    vincular: itens.filter((item) => item.acao === "vincular").length,
    criar: itens.filter((item) => item.acao === "criar").length,
    ignorar: itens.filter((item) => item.acao === "ignorar").length,
    selecionados: itens.filter((item) => item.selecionado && item.acao !== "ignorar").length,
  }), [itens])

  const itensFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    if (!termo) return itens
    return itens.filter((item) =>
      [item.codigo, item.nome, item.cores, item.categoria].some((valor) => normalizar(valor).includes(termo)),
    )
  }, [busca, itens])

  if (!aberto) return null

  const prepararRevisao = (lista: ItemRevisao[]) => {
    setItens(lista.map((item, index) => {
      const existente = tipo === "ferragens"
        ? existentes.find((f) => normalizar(f.codigo) === normalizar(item.codigo) && normalizar(f.cores || "Padrão") === normalizar(item.cores || "Padrão"))
        : existentes.find((k) => normalizar(k.nome) === normalizar(item.nome) && normalizar(k.cores || "Padrão") === normalizar(item.cores || "Padrão"))

      return {
        ...item,
        revisaoId: `${item.revisaoId}-${index}`,
        id: existente?.id,
        acao: existente ? "atualizar" : "criar",
      }
    }))
  }

  const lerArquivo = async (arquivo: File) => {
    setErro("")
    setItens([])
    setDiagnostico("")
    setDiagnosticoCopiado(false)
    setArquivoInfo({ nome: arquivo.name, tamanho: `${(arquivo.size / (1024 * 1024)).toFixed(1)} MB` })
    setProcessando(true)

    try {
      let texto = ""
      const arquivoPdf = arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf")
      if (arquivoPdf) {
        const formData = new FormData()
        formData.append("arquivo", arquivo)
        const resposta = await fetch("/api/importar-tabela-vidros", { method: "POST", body: formData })
        const retorno = await resposta.json().catch(() => null)
        if (!resposta.ok) throw new Error(retorno?.detalhe || retorno?.erro || "Não foi possível ler o PDF.")
        texto = retorno?.texto || ""
      } else {
        texto = await decodeCsvFile(arquivo)
      }

      const encontrados = arquivoPdf ? extrairLinhasPdf(texto, tipo) : extrairItensTabela(texto, tipo)
      if (!encontrados.length) throw new Error("Não encontramos itens com descrição e preço nesse arquivo.")
      setDiagnostico(JSON.stringify({ totalProdutos: encontrados.length, arquivo: arquivo.name }, null, 2))
      prepararRevisao(encontrados)
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Erro inesperado ao analisar o arquivo."
      setErro(mensagem)
      setDiagnostico(mensagem)
    } finally {
      setProcessando(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const atualizarItem = (revisaoId: string, alteracoes: Partial<ItemRevisao>) => {
    setItens((atuais) => atuais.map((item) => {
      if (item.revisaoId !== revisaoId) return item
      const novo = { ...item, ...alteracoes }
      if (alteracoes.acao === "ignorar") novo.selecionado = false
      if (alteracoes.acao && alteracoes.acao !== "ignorar" && alteracoes.selecionado === undefined) novo.selecionado = true
      return novo
    }))
  }

  const confirmarImportacao = async () => {
    setErro("")
    setSalvando(true)
    try {
      const selecionados = itens.filter((item) => item.selecionado && item.acao !== "ignorar")
      for (const item of selecionados) {
        if (item.acao === "vincular" && !item.id) {
          throw new Error(`Selecione uma vinculação para ${item.nome}.`)
        }

        const payload = tipo === "ferragens"
          ? {
              codigo: item.codigo.toUpperCase().trim(),
              nome: formatarTexto(item.nome),
              cores: formatarTexto(item.cores || "Padrão"),
              categoria: formatarTexto(item.categoria || "Ferragem"),
              preco: Number(item.preco) || null,
              empresa_id: empresaId,
            }
          : {
              nome: formatarTexto(item.nome),
              largura: Number(item.largura) || 0,
              altura: Number(item.altura) || 0,
              categoria: formatarTexto(item.categoria || "Kit"),
              cores: formatarTexto(item.cores || "Padrão"),
              preco_por_cor: null,
              preco: Number(item.preco) || null,
              empresa_id: empresaId,
            }

        if ((item.acao === "atualizar" || item.acao === "vincular") && item.id) {
          const { error } = await supabase.from(tipo).update(payload).eq("id", item.id).eq("empresa_id", empresaId)
          if (error) throw error
        } else {
          const { error } = await supabase.from(tipo).insert([payload])
          if (error) throw error
        }
      }

      await onConcluido()
      onClose()
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Erro ao importar tabela."
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
    <div data-importador-catalogo="overlay" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
      <div
        data-importador-catalogo="box"
        data-importador-vazio={modalRevisaoAberta ? undefined : "true"}
        className="flex flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
      >
        <header className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-500">
              <FileText size={20} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">{subtitulo}</p>
              <h2 className="mt-1 text-base font-medium text-slate-800">{titulo}</h2>
              <p className="text-xs text-slate-500">Revise os itens identificados e escolha como deseja importar.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 lg:static" title="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-xs font-normal text-slate-500 sm:gap-6 lg:gap-10">
          {["Enviar arquivo", "Revisar itens", "Importar"].map((etapa, index) => (
            <div key={etapa} className="flex items-center gap-2.5 text-slate-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-normal text-slate-700">{index + 1}</span>
              <span>{etapa}</span>
              {index < 2 ? <div className="ml-4 hidden h-px w-20 bg-slate-200 sm:block" /> : null}
            </div>
          ))}
        </div>

        <main className={`${modalRevisaoAberta ? "min-h-0 flex-1" : "flex-none"} overflow-y-auto bg-slate-50/40 p-3`}>
          {!itens.length && !processando ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 text-center transition hover:border-slate-300 hover:bg-white"
            >
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                <Upload size={22} />
              </span>
              <span className="text-base font-medium text-slate-700">Selecione a tabela do fornecedor</span>
              <span className="mt-2 text-sm font-normal text-slate-500">PDF com texto selecionável, TXT ou CSV</span>
            </button>
          ) : null}

          {processando ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-white text-center">
              <Loader2 className="mb-4 animate-spin text-slate-500" size={34} />
              <p className="text-base font-medium text-slate-800">Lendo arquivo</p>
              <p className="mt-1 text-sm text-slate-500">Separando descrição, cor, categoria e preço...</p>
            </div>
          ) : null}

          {!!itens.length && (
            <div className="space-y-4">
              <div className="mb-5 grid grid-cols-12 gap-3">
                <div className="col-span-12 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm 2xl:col-span-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-normal text-slate-800">Arquivo enviado com sucesso</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{arquivoInfo?.nome} - {arquivoInfo?.tamanho}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-normal text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
                    <Upload size={13} />
                    Trocar
                  </button>
                </div>
                <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:col-span-9">
                  {[
                    ["Total de itens", resumo.total, "bg-slate-400"],
                    ["Atualizar", resumo.atualizar, "bg-emerald-500"],
                    ["Vincular", resumo.vincular, "bg-blue-500"],
                    ["Criar", resumo.criar, "bg-purple-500"],
                    ["Ignorar", resumo.ignorar, "bg-amber-500"],
                  ].map(([label, valor, cor]) => (
                    <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[11px] font-normal text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${cor}`} />
                        {label}
                      </div>
                      <p className="mt-1.5 text-lg font-normal text-slate-800">{valor}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid items-center gap-3 xl:grid-cols-[1fr_auto_auto]">
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, nome, cor ou categoria..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
                </div>
                <button type="button" onClick={() => setItens((atuais) => atuais.map((item) => ({ ...item, selecionado: true })))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal text-slate-600 hover:bg-slate-50">Selecionar todos</button>
                <button type="button" onClick={() => setItens((atuais) => atuais.map((item) => ({ ...item, selecionado: false })))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal text-slate-600 hover:bg-slate-50">Limpar seleção</button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="min-h-[360px] max-h-[calc(100vh-430px)] overflow-auto">
                  <table className="w-full min-w-[1500px] table-fixed text-left text-xs">
                    <colgroup>
                      <col className="w-10" />
                      {tipo === "ferragens" ? <col className="w-[110px]" /> : null}
                      <col className={tipo === "kits" ? "w-[360px]" : "w-[310px]"} />
                      {tipo === "kits" ? <><col className="w-[120px]" /><col className="w-[120px]" /></> : null}
                      <col className="w-[160px]" />
                      <col className="w-[180px]" />
                      <col className="w-[135px]" />
                      <col className="w-[150px]" />
                      <col className="w-[455px]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="w-10 px-3 py-3"></th>
                        {tipo === "ferragens" ? <th className="px-3 py-3 font-normal">Código</th> : null}
                        <th className="px-3 py-3 font-normal">Descrição</th>
                        {tipo === "kits" ? <><th className="px-3 py-3 font-normal">Largura</th><th className="px-3 py-3 font-normal">Altura</th></> : null}
                        <th className="px-3 py-3 font-normal">Cor</th>
                        <th className="px-3 py-3 font-normal">Categoria</th>
                        <th className="px-3 py-3 font-normal">Preço</th>
                        <th className="px-3 py-3 font-normal">Ação</th>
                        <th className="px-3 py-3 font-normal">Vinculação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itensFiltrados.map((item) => (
                        <tr key={item.revisaoId} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={item.selecionado} onChange={(e) => atualizarItem(item.revisaoId, { selecionado: e.target.checked })} className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-600" />
                          </td>
                          {tipo === "ferragens" ? <td className="px-3 py-2 text-slate-800">{item.codigo}</td> : null}
                          <td className="px-3 py-2"><input value={item.nome} onChange={(e) => atualizarItem(item.revisaoId, { nome: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-slate-200 focus:bg-white" /></td>
                          {tipo === "kits" ? (
                            <>
                              <td className="px-3 py-2"><input value={item.largura || ""} onChange={(e) => atualizarItem(item.revisaoId, { largura: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-right outline-none focus:border-slate-400" /></td>
                              <td className="px-3 py-2"><input value={item.altura || ""} onChange={(e) => atualizarItem(item.revisaoId, { altura: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-right outline-none focus:border-slate-400" /></td>
                            </>
                          ) : null}
                          <td className="px-3 py-2"><input value={item.cores} onChange={(e) => atualizarItem(item.revisaoId, { cores: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-slate-200 focus:bg-white" /></td>
                          <td className="px-3 py-2"><input value={item.categoria} onChange={(e) => atualizarItem(item.revisaoId, { categoria: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-slate-200 focus:bg-white" /></td>
                          <td className="px-3 py-2"><input value={String(item.preco).replace(".", ",")} onChange={(e) => atualizarItem(item.revisaoId, { preco: moedaParaNumero(e.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-right outline-none focus:border-slate-400" /></td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <select value={item.acao} onChange={(e) => atualizarItem(item.revisaoId, { acao: e.target.value as AcaoImportacao })} className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-4 pr-7 text-xs font-normal text-slate-700 outline-none focus:border-slate-400">
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
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {item.acao === "atualizar" || item.acao === "vincular" ? (
                              <select
                                value={item.id || ""}
                                onChange={(e) => atualizarItem(item.revisaoId, { id: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal text-slate-700 outline-none focus:border-slate-400"
                              >
                                <option value="">{tipo === "kits" ? "Selecionar kit..." : "Selecionar ferragem..."}</option>
                                {existentes.map((registro) => (
                                  <option key={registro.id} value={registro.id}>
                                    {tipo === "ferragens"
                                      ? `${registro.codigo || ""} - ${registro.nome || ""} - ${registro.cores || "Padrão"}`
                                      : `${registro.nome || ""} - ${registro.cores || "Padrão"}`}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {erro ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{erro}</p> : null}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button type="button" onClick={() => setDiagnosticoAberto((atual) => !atual)} className="flex items-center gap-2 text-sm font-normal text-slate-600">
            Diagnóstico da extração
            <ChevronDown size={15} className={diagnosticoAberto ? "rotate-180" : ""} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-slate-400 md:flex"><Lock size={13} /> Seus dados estão seguros</span>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-normal text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" onClick={() => void confirmarImportacao()} disabled={!resumo.selecionados || salvando} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-normal text-white disabled:opacity-50">
              {salvando ? "Importando..." : `Importar selecionados (${resumo.selecionados})`}
            </button>
          </div>
          {diagnosticoAberto && (diagnostico || erro || itens.length > 0) ? (
            <div className={`w-full rounded-xl border p-4 ${erro ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {erro ? <AlertCircle size={16} className="mt-0.5 text-red-500" /> : <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />}
                  <div>
                    <p className={`text-sm font-normal ${erro ? "text-red-700" : "text-emerald-700"}`}>
                      {erro ? "Não foi possível concluir a leitura." : `Leitura concluída com sucesso. ${itens.length} itens encontrados.`}
                    </p>
                    {erro ? <p className="mt-1 text-xs text-red-600">{erro}</p> : null}
                  </div>
                </div>
                <button type="button" onClick={() => void copiarDiagnostico()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" title="Copiar diagnóstico">
                  <Copy size={14} />
                </button>
              </div>
              {diagnostico && !erro ? (
                <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-white/70 p-3 text-[11px] text-slate-500">{diagnostico}</pre>
              ) : null}
              {diagnosticoCopiado ? <p className="mt-2 text-xs text-slate-500">Diagnóstico copiado.</p> : null}
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
