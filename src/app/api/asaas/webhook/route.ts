
import "server-only";

import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenValido(recebido: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!esperado || !recebido) return false;

  const a = Buffer.from(recebido, "utf8");
  const b = Buffer.from(esperado, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (process.env.ASAAS_AMBIENTE !== "sandbox") {
    return Response.json(
      { erro: "Ambiente indisponível." },
      { status: 503 }
    );
  }

  if (!tokenValido(request.headers.get("asaas-access-token"))) {
    return Response.json(
      { erro: "Não autorizado." },
      { status: 401 }
    );
  }

  const limiteBytes = 256 * 1024;
  let texto: string;

  try {
    const tamanho = Number(request.headers.get("content-length"));

    if (tamanho > limiteBytes) {
      return Response.json(
        { erro: "Notificação muito grande." },
        { status: 413 }
      );
    }

    texto = await request.text();

    if (Buffer.byteLength(texto, "utf8") > limiteBytes) {
      return Response.json(
        { erro: "Notificação muito grande." },
        { status: 413 }
      );
    }
  } catch {
    return Response.json(
      { erro: "Erro ao ler a notificação." },
      { status: 400 }
    );
  }

  let dados: unknown;

  try {
    dados = JSON.parse(texto);
  } catch {
    return Response.json(
      { erro: "JSON inválido." },
      { status: 400 }
    );
  }

  if (
    !dados ||
    typeof dados !== "object" ||
    Array.isArray(dados)
  ) {
    return Response.json(
      { erro: "Evento inválido." },
      { status: 400 }
    );
  }

  const evento = dados as Record<string, unknown>;

  if (
    typeof evento.id !== "string" ||
    !evento.id.trim() ||
    typeof evento.event !== "string" ||
    !evento.event.trim()
  ) {
    return Response.json(
      { erro: "Identificação inválida." },
      { status: 400 }
    );
  }

  const pagamento =
    evento.payment &&
    typeof evento.payment === "object" &&
    !Array.isArray(evento.payment)
      ? (evento.payment as Record<string, unknown>)
      : null;

  const pagamentoId =
    pagamento && typeof pagamento.id === "string"
      ? pagamento.id
      : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Configuração privada do Supabase ausente.");

    return Response.json(
      { erro: "Serviço indisponível." },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.rpc(
      "gc_asaas_registrar_evento",
      {
        p_evento_id: evento.id,
        p_tipo: evento.event,
        p_pagamento_id: pagamentoId,
        p_payload: evento,
      }
    );

    if (error) {
      console.error("Falha ao registrar evento Asaas:", error.code);

      return Response.json(
        { erro: "Falha ao registrar notificação." },
        { status: 500 }
      );
    }

    if (typeof data !== "boolean") {
      console.error("Resposta inesperada da função Asaas.");

      return Response.json(
        { erro: "Falha ao confirmar registro." },
        { status: 500 }
      );
    }

    return Response.json(
      {
        recebido: true,
        registrado: data,
        processamento: "pendente",
      },
      { status: 200 }
    );
  } catch {
    console.error("Erro interno no recebimento Asaas.");

    return Response.json(
      { erro: "Erro interno." },
      { status: 500 }
    );
  }
}
