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
