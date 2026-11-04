
import "server-only";

import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { asaasRequest } from "@/lib/asaas/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PagamentoAsaas = {
  id?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  subscription?: string;
  customer?: string;
  billingType?: string;
  deleted?: boolean;
};

function tokenValido(recebido: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!esperado || !recebido) return false;

  const a = Buffer.from(recebido, "utf8");
  const b = Buffer.from(esperado, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}

function dataValida(valor: unknown): valor is string {
  if (typeof valor !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const data = new Date(`${valor}T00:00:00.000Z`);

  return !Number.isNaN(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor;
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

    if (!pagamentoId || !pagamentoId.startsWith("pay_")) {
      return Response.json({
        recebido: true,
        registrado,
        processamento: "sem_pagamento",
      });
    }
 console.log("ASAAS DIAGNOSTICO:", {
      ambiente: process.env.ASAAS_AMBIENTE,
      chaveDisponivel: Boolean(process.env.ASAAS_API_KEY),
      tamanhoChave: process.env.ASAAS_API_KEY?.length ?? 0,
      tokenDisponivel: Boolean(process.env.ASAAS_WEBHOOK_TOKEN),
    });
    
    // Consultar a situação atual diretamente no Asaas.
    const pagamento = await asaasRequest<PagamentoAsaas>(
      `/payments/${encodeURIComponent(pagamentoId)}`
    );

    if (
      pagamento.id !== pagamentoId ||
      pagamento.deleted === true ||
      pagamento.billingType !== "BOLETO" ||
      !pagamento.subscription ||
      !pagamento.customer ||
      typeof pagamento.value !== "number" ||
      !Number.isFinite(pagamento.value) ||
      !dataValida(pagamento.dueDate)
    ) {
      return Response.json(
        { erro: "Dados da cobrança inválidos." },
        { status: 422 }
      );
    }

    // A primeira versão da função SQL ainda não trata
    // estornos, cancelamentos e outros estados.
    if (
      pagamento.status !== "PENDING" &&
      pagamento.status !== "CONFIRMED" &&
      pagamento.status !== "RECEIVED"
    ) {
      return Response.json(
        {
          recebido: true,
          registrado,
          processamento: "estado_nao_suportado",
        },
        { status: 200 }
      );
    }

    const valorCentavos = Math.round(pagamento.value * 100);

    if (
      Math.abs(pagamento.value * 100 - valorCentavos) > 0.001
    ) {
      return Response.json(
        { erro: "Valor monetário inválido." },
        { status: 422 }
      );
    }

    const { data: resultado, error: erroProcessamento } =
      await supabase.rpc("gc_asaas_processar_pagamento", {
        p_pagamento_id: pagamento.id,
        p_assinatura_asaas_id: pagamento.subscription,
        p_cliente_asaas_id: pagamento.customer,
        p_valor_centavos: valorCentavos,
        p_vencimento: pagamento.dueDate,
        p_status: pagamento.status,
        p_modalidade: pagamento.billingType,
      });

    if (erroProcessamento) {
      console.error(
        "Falha ao processar pagamento Asaas:",
        erroProcessamento.code
      );

      return Response.json(
        { erro: "Falha ao processar pagamento." },
        { status: 500 }
      );
    }

    return Response.json({
      recebido: true,
      registrado,
      processamento: "concluido",
      resultado,
    });
    } catch (erro) {
    if (erro instanceof Error) {
      console.error("ASAAS WEBHOOK - TIPO:", erro.name);
      console.error("ASAAS WEBHOOK - MENSAGEM:", erro.message);
    } else {
      console.error("ASAAS WEBHOOK - ERRO DESCONHECIDO");
    }

    return Response.json(
      { erro: "Erro interno." },
      { status: 500 }
    );
  }
}
