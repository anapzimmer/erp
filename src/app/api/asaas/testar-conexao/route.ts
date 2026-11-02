
import "server-only";

import { asaasRequest } from "@/lib/asaas/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { erro: "Diagnóstico indisponível." },
      { status: 404 }
    );
  } 

  try {
    const resposta = await asaasRequest<{
      object?: string;
      hasMore?: boolean;
    }>("/customers?limit=1");

    return Response.json(
      {
        conectado: true,
        ambiente: "sandbox",
        respostaValida: resposta.object === "list",
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "";

      const chave = process.env.ASAAS_API_KEY;
const ambiente = process.env.ASAAS_AMBIENTE;

return Response.json({
  diagnostico: "TESTE_CONFIGURACAO_V2",
  chaveEncontrada: Boolean(chave?.trim()),
  ambienteCorreto: ambiente === "sandbox",
  chaveComEspacos: chave !== undefined && chave !== chave.trim(),
});

 const diagnostico = /^ASAAS_HTTP_\d{3}$/.test(mensagem)
  ? mensagem
  : mensagem.includes("ASAAS_API_KEY")
    ? "CHAVE_NAO_CONFIGURADA"
    : mensagem.includes("limitada ao Sandbox")
      ? "AMBIENTE_INCORRETO"
      : mensagem.includes("fetch failed")
        ? "FALHA_DE_REDE"
        : mensagem.includes("JSON")
          ? "RESPOSTA_INVALIDA"
          : "ERRO_DESCONHECIDO";

    return Response.json(
      {
        conectado: false,
        diagnostico,
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
