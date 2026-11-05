
import "server-only";

import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { categoriaErroAsaas } from "@/lib/asaas/client";

import { processarEventoAsaas } from "@/lib/asaas/pagamentos";

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
  if (!["sandbox", "production"].includes(process.env.ASAAS_AMBIENTE || "")) {
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

  const pagamentoEvento =
    evento.payment &&
    typeof evento.payment === "object" &&
    !Array.isArray(evento.payment)
      ? (evento.payment as Record<string, unknown>)
      : null;

  const pagamentoId =
    pagamentoEvento && typeof pagamentoEvento.id === "string"
      ? pagamentoEvento.id
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

    const { data: registrado, error: erroRegistro } =
      await supabase.rpc("gc_asaas_registrar_evento", {
        p_evento_id: evento.id,
        p_tipo: evento.event,
        p_pagamento_id: pagamentoId,
        p_payload: evento,
      });

    if (erroRegistro || typeof registrado !== "boolean") {
      console.error(
        "Falha ao registrar evento Asaas:",
        erroRegistro?.code
      );

      return Response.json(
        { erro: "Falha ao registrar notificação." },
        { status: 500 }
      );
    }

    const processamento = await processarEventoAsaas(supabase, evento);
    return Response.json({ recebido: true, registrado, processamento });
    } catch (erro) {
    console.error("ASAAS WEBHOOK:", categoriaErroAsaas(erro));

    return Response.json(
      { erro: "Erro interno." },
      { status: 500 }
    );
  }
}
