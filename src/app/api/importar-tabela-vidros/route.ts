import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const arquivoRecebido = formData.get("arquivo")

    if (
      !arquivoRecebido ||
      typeof arquivoRecebido === "string" ||
      !(arquivoRecebido instanceof File)
    ) {
      return NextResponse.json(
        { erro: "Nenhum arquivo PDF foi recebido." },
        { status: 400 },
      )
    }

    const nomeArquivo = arquivoRecebido.name || "arquivo.pdf"

    if (!nomeArquivo.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { erro: "O arquivo enviado não é um PDF." },
        { status: 400 },
      )
    }

    if (arquivoRecebido.size === 0) {
      return NextResponse.json(
        { erro: "O PDF enviado está vazio." },
        { status: 400 },
      )
    }

    if (arquivoRecebido.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { erro: "O PDF deve possuir no máximo 10 MB." },
        { status: 400 },
      )
    }

    const arrayBuffer = await arquivoRecebido.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    /*
     * Importante:
     * não importar diretamente de "pdf-parse".
     *
     * O arquivo principal do pacote pode tentar abrir um PDF interno
     * de teste quando executado dentro do Next.js.
     */
    // @ts-expect-error O pacote não possui tipagem para este caminho interno.
    const modulo = await import("pdf-parse/lib/pdf-parse.js")

    const pdfParse =
      typeof modulo.default === "function" ? modulo.default
        : typeof modulo === "function" ? modulo
          : null

    if (!pdfParse) {
      throw new Error(
        "A função de leitura do pdf-parse não foi carregada corretamente.",
      )
    }

    const resultado = await pdfParse(buffer)

    const texto = String(resultado?.text || "")
      .replace(/\u0000/g, "")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .trim()

    if (!texto) {
      return NextResponse.json(
        {
          erro:
            "Não foi encontrado texto no PDF. O documento pode ser uma imagem escaneada.",
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      sucesso: true,
      arquivo: nomeArquivo,
      paginas: Number(resultado?.numpages || 1),
      texto,
    })
  } catch (error) {
    console.error("ERRO NA IMPORTAÇÃO DO PDF:", error)

    const detalhe =
      error instanceof Error ? `${error.name}: ${error.message}`
        : String(error)

    return NextResponse.json(
      {
        erro: "Não foi possível processar o PDF.",
        detalhe,
      },
      { status: 500 },
    )
  }
}