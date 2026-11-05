
import "server-only";

import { asaasRequest, categoriaErroAsaas } from "@/lib/asaas/client";

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

    if (resposta.object !== "list") {
      throw new Error("JSON inesperado.");
    }

    return Response.json(
      {
        conectado: true,
        ambiente: process.env.ASAAS_AMBIENTE,
        respostaValida: resposta.object === "list",
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    return Response.json(
      { conectado: false, diagnostico: categoriaErroAsaas(error) },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
