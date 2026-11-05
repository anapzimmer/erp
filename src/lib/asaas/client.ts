
import "server-only";

export function ambienteAsaas(): "sandbox" | "production" {
 const ambiente = process.env.ASAAS_AMBIENTE;
 if (ambiente !== "sandbox" && ambiente !== "production") throw new Error("ASAAS_AMBIENTE inválido.");
 return ambiente;
}

export class AsaasApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    public readonly descricao: string
  ) {
    super(`ASAAS_HTTP_${status}: ${codigo} - ${descricao}`);
    this.name = "AsaasApiError";
  }
}

function extrairErroAsaas(
  texto: string
): { codigo: string; descricao: string } {
  try {
    const resposta: unknown = JSON.parse(texto);

    if (typeof resposta !== "object" || resposta === null) {
      return {
        codigo: "RESPOSTA_INVALIDA",
        descricao: "Resposta de erro não estruturada.",
      };
    }

    const dados = resposta as Record<string, unknown>;
    const erros = Array.isArray(dados.errors) ? dados.errors : [];
    const primeiro = erros[0];

    if (typeof primeiro === "object" && primeiro !== null) {
      const erro = primeiro as Record<string, unknown>;

      return {
        codigo:
          typeof erro.code === "string"
            ? erro.code.slice(0, 100)
            : "ERRO_ASAAS",
        descricao:
          typeof erro.description === "string"
            ? erro.description.slice(0, 300)
            : "O Asaas rejeitou a solicitação.",
      };
    }
  } catch {
    // Não expor respostas não estruturadas.
  }

  return {
    codigo: "ERRO_ASAAS",
    descricao: "O Asaas não retornou detalhes estruturados.",
  };
}

export async function asaasRequest<T>(
  path: string
): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  const ambiente = ambienteAsaas();

  if (!apiKey?.trim()) {
    throw new Error("ASAAS_API_KEY não configurada no servidor.");
  }

  if ((ambiente === "production" && apiKey.includes("_hmlg_")) || (ambiente === "sandbox" && apiKey.includes("_prod_"))) throw new Error("ASAAS_AMBIENTE incompatível com a chave.");

  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Caminho da API Asaas inválido.");
  }

  const response = await fetch(`${ambiente === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3"}${path}`, {
    method: "GET",
    headers: {
      access_token: apiKey,
      "User-Agent": "GlassCode/1.0",
      accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });

  const texto = await response.text();

  if (!response.ok) {
    const erro = extrairErroAsaas(texto);

    throw new AsaasApiError(
      response.status,
      erro.codigo,
      erro.descricao
    );
  }

  if (!texto) {
    throw new Error("O Asaas retornou uma resposta vazia.");
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error("O Asaas retornou JSON inválido.");
  }
}

// Only fixed categories may enter logs or diagnostic responses.
export function categoriaErroAsaas(error: unknown): string {
  if (error instanceof AsaasApiError) return `ASAAS_HTTP_${error.status}`;
  if (!(error instanceof Error)) return "ERRO_DESCONHECIDO";
  if (error.name === "TimeoutError" || error.name === "AbortError") return "TEMPO_ESGOTADO";
  if (error.message.includes("ASAAS_API_KEY")) return "CHAVE_NAO_CONFIGURADA";
  if (error.message.includes("ASAAS_AMBIENTE")) return "AMBIENTE_INCORRETO";
  if (error.message.includes("fetch failed")) return "FALHA_DE_REDE";
  if (error.message.includes("JSON") || error.message.includes("resposta vazia")) return "RESPOSTA_INVALIDA";
  return "ERRO_DESCONHECIDO";
}
