import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { asaasRequest } from "@/lib/asaas/client";
import { precosPlanosCentavos } from "@/config/comercial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plano = keyof typeof precosPlanosCentavos;

type Reserva = {
  checkout_id: string;
  checkout_asaas_id: string | null;
  checkout_status: string;
  checkout_plano: string;
  checkout_modalidade: string;
  criado_novo: boolean;
};

function respostaErro(erro: string, status: number) {
  return NextResponse.json(
    { erro },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  if (process.env.ASAAS_AMBIENTE !== "sandbox") {
    return respostaErro("Ambiente indisponível.", 503);
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return respostaErro("Usuário não autenticado.", 401);
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return respostaErro("Sessão inválida.", 401);
  }

  let entrada: unknown;

  try {
    if (Number(request.headers.get("content-length")) > 8192) {
      return respostaErro("Solicitação muito grande.", 413);
    }

    const texto = await request.text();

    if (Buffer.byteLength(texto, "utf8") > 8192) {
      return respostaErro("Solicitação muito grande.", 413);
    }

    entrada = JSON.parse(texto);
  } catch {
    return respostaErro("Dados inválidos.", 400);
  }

  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return respostaErro("Dados inválidos.", 400);
  }

  const dados = entrada as Record<string, unknown>;

  const plano = dados.plano;
  const modalidade = dados.pagamento;

  if (
    typeof plano !== "string" ||
    !Object.prototype.hasOwnProperty.call(
      precosPlanosCentavos,
      plano
    )
  ) {
    return respostaErro("Plano inválido.", 400);
  }

  // Nesta etapa, apenas cartão recorrente.
  if (modalidade !== "CREDIT_CARD") {
    return respostaErro(
      "A assinatura por Pix ainda está em preparação.",
      400
    );
  }

  const nome = typeof dados.nome === "string"
    ? dados.nome.trim()
    : "";

  const documento = typeof dados.documento === "string"
    ? dados.documento.replace(/\D/g, "")
    : "";

  const email = typeof dados.email === "string"
    ? dados.email.trim()
    : "";

  if (
    nome.length < 2 ||
    nome.length > 150 ||
    ![11, 14].includes(documento.length) ||
    /^(\d)\1+$/.test(documento) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return respostaErro("Dados de faturamento inválidos.", 400);
  }

  // A validação completa dos dígitos verificadores
  // deve ser compartilhada com o servidor antes
  // de habilitar o checkout para clientes.

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return respostaErro("Configuração indisponível.", 503);
  }

  const usuarioSupabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: usuario, error: erroUsuario } =
    await usuarioSupabase.auth.getUser(token);

  if (erroUsuario || !usuario.user) {
    return respostaErro("Sessão inválida ou expirada.", 401);
  }

  const { data: empresaId, error: erroEmpresa } =
    await usuarioSupabase.rpc("gc_empresa_para_contratacao");

  if (erroEmpresa || typeof empresaId !== "string") {
    return respostaErro("Contratação não autorizada.", 403);
  }

  const admin = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const planoValido = plano as Plano;
  const valorCentavos = precosPlanosCentavos[planoValido];

  const { data: reservas, error: erroReserva } = await admin.rpc(
    "gc_asaas_reservar_checkout",
    {
      p_empresa_id: empresaId,
      p_plano: planoValido,
      p_valor_centavos: valorCentavos,
      p_modalidade: modalidade,
    }
  );

  if (erroReserva) {
    return respostaErro(
      "Já existe uma contratação em andamento ou não foi possível reservar o checkout.",
      409
    );
  }

  const reserva = (reservas as Reserva[] | null)?.[0];

  if (!reserva) {
    return respostaErro("Falha ao reservar contratação.", 500);
  }

  if (!reserva.criado_novo) {
    if (reserva.checkout_status === "pendente" &&
        reserva.checkout_asaas_id) {
      return NextResponse.json({
        url: `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(
          reserva.checkout_asaas_id
        )}`,
        reutilizado: true,
      });
    }

    return respostaErro(
      "A contratação está em processamento. Não iniciaremos outra cobrança automaticamente.",
      409
    );
  }

  // Para evitar chamadas externas com origem arbitrária,
  // usamos um endereço de retorno fixo.
  const retorno = "https://www.glasscode.com.br/contratar";

  try {
    const agora = new Date();
    const primeiraCobranca = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, "0"),
      String(agora.getDate()).padStart(2, "0"),
    ].join("-") + " 12:00:00";

    const checkout = await asaasRequest<{ id?: string }>(
      "/checkouts",
      {
        method: "POST",
        body: {
          billingTypes: ["CREDIT_CARD"],
          chargeTypes: ["RECURRENT"],
          minutesToExpire: 60,
          externalReference: reserva.checkout_id,
          callback: {
            successUrl: retorno,
            cancelUrl: retorno,
            expiredUrl: retorno,
          },
          items: [
            {
              name: `Glass Code - ${planoValido}`,
              description: "Assinatura mensal Glass Code",
              quantity: 1,
              value: valorCentavos / 100,
            },
          ],
          subscription: {
            cycle: "MONTHLY",
            nextDueDate: primeiraCobranca,
          },
        },
      }
    );

    if (!checkout.id) {
      throw new Error("Checkout sem identificador.");
    }

    const { data: confirmado, error: erroConfirmacao } =
      await admin.rpc("gc_asaas_confirmar_checkout", {
        p_checkout_id: reserva.checkout_id,
        p_asaas_checkout_id: checkout.id,
      });

    if (erroConfirmacao || confirmado !== true) {
      return respostaErro(
        "Checkout criado, mas aguardando conciliação. Não tente criar outro.",
        503
      );
    }

    return NextResponse.json({
      url: `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(
        checkout.id
      )}`,
      reutilizado: false,
    });
  } catch {
    // Não liberar automaticamente a reserva:
    // a chamada pode ter chegado ao Asaas.
    return respostaErro(
      "Não foi possível confirmar a criação do checkout. A tentativa foi preservada para evitar duplicidade.",
      503
    );
  }
}