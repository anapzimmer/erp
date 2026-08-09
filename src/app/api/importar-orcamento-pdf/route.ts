import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ItemExtraido = {
  id: string;
  projeto: string;
  quantidade: number;
  largura: number;
  altura: number;
  observacao?: string;
  confianca?: "alta" | "media" | "baixa";
};

const normalizarTexto = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const classificarProjeto = (descricao: string): ItemExtraido["projeto"] => {
  const texto = normalizarTexto(descricao);
  if (texto.includes("JANELA") && (texto.includes("04 FOLHAS") || texto.includes("4 FOLHAS"))) return "Janela 4 folhas";
  if (texto.includes("JANELA") && (texto.includes("02 FOLHAS") || texto.includes("2 FOLHAS"))) return "Janela 2 folhas";
  if (texto.includes("PORTA") && (texto.includes("02 FOLHAS") || texto.includes("2 FOLHAS"))) return "Porta 2 folhas";
  if (texto.includes("PORTA") && texto.includes("GIRO")) return "Porta de giro 1 folha";
  if (texto.includes("BOX")) return "Box 2 folhas";
  if (texto.includes("MAXIM") || texto.includes("MAX")) return "Maxim-ar";
  return "Outro";
};

const limparTextoPdf = (texto: string) =>
  String(texto || "")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

const extrairEntre = (texto: string, inicio: string, fim: string) => {
  const indiceInicio = texto.indexOf(inicio);
  if (indiceInicio < 0) return "";
  const depois = texto.slice(indiceInicio + inicio.length);
  const indiceFim = depois.indexOf(fim);
  return (indiceFim >= 0 ? depois.slice(0, indiceFim) : depois).trim();
};

const extrairCliente = (texto: string) => {
  const match = texto.match(/Cliente\s*\n([^\n]+)/i);
  return match?.[1]?.trim() || "";
};

const extrairPedido = (texto: string) => {
  const match = texto.match(/Nro\.Pedido\s*\nCliente\s*\n[^\n]+\s*\n\d+\s*\nPagina[\s\S]{0,80}?Nro\.Pedido:\s*\n(\d+)/i)
    || texto.match(/Nro\.Pedido\s*\nCliente\s*\n[^\n]+\s*\n\d+\s*\nPagina[\s\S]{0,50}?(\d{3,})/i);
  return match?.[1]?.trim() || "";
};

const extrairVidrosDoBloco = (bloco: string) => {
  const linhas = bloco.split("\n").map((linha) => linha.trim()).filter(Boolean);
  const vidros: string[] = [];
  for (let i = 0; i < linhas.length; i++) {
    if (/^VIDRO\b/i.test(linhas[i] || "")) {
      const medida = linhas[i + 1] || "";
      const matchMedida = medida.match(/^(\d{3,4})(\d{3,4})$/);
      vidros.push(matchMedida ? `${linhas[i]} ${matchMedida[1]} x ${matchMedida[2]}` : linhas[i] || "");
    }
  }
  return vidros;
};

const parsearItensOrcamento = (texto: string): ItemExtraido[] => {
  const itens: ItemExtraido[] = [];
  const blocos = texto.split(/\n(?=Nro\.Ped\.Tempera\b)/g);

  blocos.forEach((bloco, index) => {
    if (!/\bProjeto\b/i.test(bloco)) return;

    const projetoDescricao = extrairEntre(bloco, "Projeto", "Categoria:") || "Projeto";
    const dimensoes = bloco.match(/Item Nro\s*\n\/\s*\n(\d{3,4})\s*\n(\d{3,4})\s*\nAltura\s*\nLargura\s*\n(\d+)/i);

    if (!dimensoes) return;

    const altura = Number(dimensoes[1] || 0);
    const largura = Number(dimensoes[2] || 0);
    const quantidade = Math.max(1, Number(dimensoes[3] || 1));
    if (!largura || !altura) return;

    const vidros = extrairVidrosDoBloco(bloco);
    const ambiente = extrairEntre(bloco, "Ambiente:", "WVETRO");
    const projeto = classificarProjeto(projetoDescricao);

    itens.push({
      id: `pdf-${Date.now()}-${index}`,
      projeto,
      quantidade,
      largura,
      altura,
      observacao: [
        projetoDescricao.replace(/\s+/g, " "),
        vidros.length ? `Vidros: ${vidros.join(" | ")}` : "",
        ambiente ? `Ambiente: ${ambiente.replace(/\s+/g, " ")}` : "",
      ].filter(Boolean).join(" - "),
      confianca: projeto === "Outro" ? "media" : "alta",
    });
  });

  return itens;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const arquivoRecebido = formData.get("arquivo");

    if (!arquivoRecebido || typeof arquivoRecebido === "string" || !(arquivoRecebido instanceof File)) {
      return NextResponse.json({ erro: "Nenhum arquivo PDF foi recebido." }, { status: 400 });
    }

    const nomeArquivo = arquivoRecebido.name || "orcamento.pdf";
    if (!nomeArquivo.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ erro: "Envie um arquivo PDF." }, { status: 400 });
    }

    if (arquivoRecebido.size > 15 * 1024 * 1024) {
      return NextResponse.json({ erro: "O PDF deve possuir no maximo 15 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await arquivoRecebido.arrayBuffer());
    // @ts-expect-error O pacote nao possui tipagem para este caminho interno.
    const modulo = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = typeof modulo.default === "function" ? modulo.default : typeof modulo === "function" ? modulo : null;

    if (!pdfParse) throw new Error("A funcao de leitura do pdf-parse nao foi carregada corretamente.");

    const resultado = await pdfParse(buffer);
    const texto = limparTextoPdf(String(resultado?.text || ""));

    if (!texto) {
      return NextResponse.json(
        { erro: "Nao foi encontrado texto no PDF. O documento pode ser escaneado como imagem." },
        { status: 422 },
      );
    }

    const itens = parsearItensOrcamento(texto);

    return NextResponse.json({
      sucesso: true,
      arquivo: nomeArquivo,
      paginas: Number(resultado?.numpages || 1),
      pedido: extrairPedido(texto),
      cliente: extrairCliente(texto),
      itens,
      observacoesGerais: itens.length
        ? `${itens.length} item(ns) encontrado(s) no PDF. Confira os projetos classificados como Outro.`
        : "O PDF foi lido, mas nao encontramos blocos de projeto com altura, largura e quantidade.",
      textoAmostra: texto.slice(0, 1200),
    });
  } catch (error) {
    console.error("ERRO AO IMPORTAR ORCAMENTO PDF:", error);
    const detalhe = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return NextResponse.json({ erro: "Nao foi possivel processar o PDF.", detalhe }, { status: 500 });
  }
}
