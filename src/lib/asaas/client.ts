
import "server-only";

const ASAAS_SANDBOX_URL = "https://api-sandbox.asaas.com/v3";

type AsaasRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

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
    throw new Error("Integração Asaas limitada ao Sandbox nesta etapa.");
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Caminho da API Asaas inválido.");
  }

  const response = await fetch(`${ASAAS_SANDBOX_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      access_token: apiKey,
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
    // Não registrar a chave, os dados financeiros ou a resposta completa.
    throw new Error(
      `Falha na comunicação com o Asaas (HTTP ${response.status}).`
    );
  }

  if (!texto) {
    throw new Error("O Asaas retornou uma resposta vazia.");
  }

  return JSON.parse(texto) as T;
}
