"use server";

type AnalyzeImageInput = {
  mimeType: string;
  base64Data: string;
  prompt?: string;
};

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

export type ItemOrcamentoImagem = {
  id: string;
  projeto: string;
  quantidade: number;
  largura: number;
  altura: number;
  observacao?: string;
  confianca?: "alta" | "media" | "baixa";
};

const DEFAULT_PROMPT = [
  "Analise a imagem enviada e descreva o que voce identifica.",
  "Responda em Markdown, com secoes curtas:",
  "1) Resumo visual",
  "2) Elementos detectados",
  "3) Possiveis problemas/inconsistencias",
  "4) Recomendacoes praticas",
].join("\n");

export async function analyzeImageWithGemini(input: AnalyzeImageInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY nao configurada no servidor.");
  }

  if (!input.base64Data || !input.mimeType) {
    throw new Error("Imagem invalida para analise.");
  }

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: input.prompt?.trim() || DEFAULT_PROMPT },
            {
              inline_data: {
                mime_type: input.mimeType,
                data: input.base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Falha ao analisar imagem no Gemini.");
  }

  const markdown =
    data.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim() || "Nenhum conteudo foi retornado pela analise.";

  return markdown;
}

const PROMPT_ORCAMENTO_IMAGEM = [
  "Voce e um assistente tecnico de uma vidracaria.",
  "Leia a imagem enviada, normalmente um desenho manual de obra, e extraia os vaos para orcamento.",
  "Identifique quantidade, tipo do projeto, largura e altura em milimetros.",
  "Quando o desenho tiver uma porta ou janela com uma folha fixa e uma movel, classifique como Janela 2 folhas ou Porta 2 folhas conforme o desenho/altura.",
  "Quando tiver quatro folhas, classifique como Janela 4 folhas.",
  "Se nao tiver certeza, use Outro e coloque a duvida em observacao.",
  "Responda somente JSON valido, sem markdown, neste formato:",
  "{ \"itens\": [{ \"projeto\": \"Janela 2 folhas\", \"quantidade\": 1, \"largura\": 1000, \"altura\": 940, \"observacao\": \"\", \"confianca\": \"alta\" }], \"observacoesGerais\": \"\" }",
].join("\\n");

const extrairJson = (texto: string) => {
  const limpo = texto
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio >= 0 && fim > inicio) return limpo.slice(inicio, fim + 1);
  return limpo;
};

const normalizarProjeto = (valor: unknown): ItemOrcamentoImagem["projeto"] => {
  const texto = String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (texto.includes("janela") && texto.includes("4")) return "Janela 4 folhas";
  if (texto.includes("janela") && texto.includes("2")) return "Janela 2 folhas";
  if (texto.includes("porta") && texto.includes("2")) return "Porta 2 folhas";
  if (texto.includes("porta") && texto.includes("giro")) return "Porta de giro 1 folha";
  if (texto.includes("box")) return "Box 2 folhas";
  if (texto.includes("max")) return "Maxim-ar";
  return "Outro";
};

const numeroSeguro = (valor: unknown) => {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor || "").replace(/[^\d,.-]/g, "").replace(",", ".");
  return Number(texto) || 0;
};

export async function extrairOrcamentoDaImagem(input: AnalyzeImageInput): Promise<{
  itens: ItemOrcamentoImagem[];
  observacoesGerais: string;
  bruto: string;
}> {
  const bruto = await analyzeImageWithGemini({
    ...input,
    prompt: input.prompt?.trim() || PROMPT_ORCAMENTO_IMAGEM,
  });

  try {
    const parsed = JSON.parse(extrairJson(bruto)) as {
      itens?: Array<Record<string, unknown>>;
      observacoesGerais?: string;
    };

    const itens = (parsed.itens || [])
      .map((item, index): ItemOrcamentoImagem => ({
        id: `img-${Date.now()}-${index}`,
        projeto: normalizarProjeto(item.projeto),
        quantidade: Math.max(1, Math.round(numeroSeguro(item.quantidade))),
        largura: Math.round(numeroSeguro(item.largura)),
        altura: Math.round(numeroSeguro(item.altura)),
        observacao: String(item.observacao || ""),
        confianca: item.confianca === "baixa" || item.confianca === "media" ? item.confianca : "alta",
      }))
      .filter((item) => item.largura > 0 && item.altura > 0);

    return {
      itens,
      observacoesGerais: String(parsed.observacoesGerais || ""),
      bruto,
    };
  } catch {
    throw new Error(`Nao foi possivel transformar a leitura em itens do orcamento. Retorno bruto: ${bruto.slice(0, 800)}`);
  }
}
