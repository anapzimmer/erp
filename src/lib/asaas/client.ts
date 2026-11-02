
import "server-only";

const ASAAS_SANDBOX_URL = "https://api-sandbox.asaas.com/v3";

type AsaasRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

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
  path: string,
  options: AsaasRequestOptions = {}
): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  const ambiente = process.env.ASAAS_AMBIENTE;

  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurada no servidor.");
  }

  if (ambiente !== "sandbox") {
    throw new Error(
      "Integração Asaas limitada ao Sandbox nesta etapa."
    );
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Caminho da API Asaas inválido.");
  }

  const response = await fetch(`${ASAAS_SANDBOX_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      access_token: apiKey,
      "User-Agent": "GlassCode/1.0",
      accept: "application/json",
      "Content-Type": "application/json",
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
    cache: "no-store",
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
