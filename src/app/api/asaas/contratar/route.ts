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
type CheckoutAsaas = { id?: string; link?: string; status?: string };

function respostaErro(erro: string, status: number) {
  return NextResponse.json({ erro }, { status, headers: { "Cache-Control": "no-store" } });
}

function linkCheckoutValido(link: unknown): link is string {
  if (typeof link !== "string") return false;
  try {
    const url = new URL(link);
    return url.protocol === "https:" &&
      url.hostname === "sandbox.asaas.com" &&
      /^\/[a-zA-Z0-9_-]+\/checkoutSession\/show\/[a-zA-Z0-9_-]+$/.test(url.pathname) &&
      !url.search && !url.hash;
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  if (process.env.ASAAS_AMBIENTE !== "sandbox") return respostaErro("Ambiente indisponível.", 503);
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return respostaErro("Usuário não autenticado.", 401);
  const token = authorization.slice(7).trim();
  if (!token) return respostaErro("Sessão inválida.", 401);

  let entrada: unknown;
  try {
    if (Number(request.headers.get("content-length")) > 8192) return respostaErro("Solicitação muito grande.", 413);
    const texto = await request.text();
    if (Buffer.byteLength(texto, "utf8") > 8192) return respostaErro("Solicitação muito grande.", 413);
    entrada = JSON.parse(texto);
  } catch { return respostaErro("Dados inválidos.", 400); }
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return respostaErro("Dados inválidos.", 400);
  const dados = entrada as Record<string, unknown>;
  const plano = dados.plano;
  const modalidade = dados.pagamento;
  if (typeof plano !== "string" || !Object.prototype.hasOwnProperty.call(precosPlanosCentavos, plano)) return respostaErro("Plano inválido.", 400);
  if (modalidade !== "CREDIT_CARD") return respostaErro("A assinatura por Pix ainda está em preparação.", 400);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return respostaErro("Configuração indisponível.", 503);
  const usuarioSupabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: usuario, error: erroUsuario } = await usuarioSupabase.auth.getUser(token);
  if (erroUsuario || !usuario.user) return respostaErro("Sessão inválida ou expirada.", 401);
  const { data: empresaId, error: erroEmpresa } = await usuarioSupabase.rpc("gc_empresa_para_contratacao");
  if (erroEmpresa || typeof empresaId !== "string") return respostaErro("Contratação não autorizada.", 403);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const planoValido = plano as Plano;
  const valorCentavos = precosPlanosCentavos[planoValido];
  const { data: reservas, error: erroReserva } = await admin.rpc("gc_asaas_reservar_checkout", {
    p_empresa_id: empresaId, p_plano: planoValido, p_valor_centavos: valorCentavos, p_modalidade: modalidade,
  });
  if (erroReserva) return respostaErro("Já existe uma contratação em andamento ou não foi possível reservar o checkout.", 409);
  const reserva = (reservas as Reserva[] | null)?.[0];
  if (!reserva) return respostaErro("Falha ao reservar contratação.", 500);

  if (!reserva.criado_novo) {
    if (reserva.checkout_status === "pendente" && reserva.checkout_asaas_id) {
      const { data: link, error } = await admin.rpc("gc_asaas_link_checkout", {
        p_checkout_id: reserva.checkout_id, p_empresa_id: empresaId,
      });
      if (error) return respostaErro("Não foi possível consultar o link do checkout existente.", 503);
      if (linkCheckoutValido(link)) {
        return NextResponse.json({ url: link, reutilizado: true }, { headers: { "Cache-Control": "no-store" } });
      }
      return respostaErro("Checkout anterior sem link salvo. É necessária conciliação antes de outra tentativa.", 409);
    }
    return respostaErro("A contratação está em processamento. Não iniciaremos outra cobrança automaticamente.", 409);
  }

  const retorno = "https://www.glasscode.com.br/contratar";
  try {
    const primeiraCobranca = new Date().toISOString().slice(0, 10);
    const checkout = await asaasRequest<CheckoutAsaas>("/checkouts", {
      method: "POST",
      body: {
        billingTypes: ["CREDIT_CARD"], chargeTypes: ["RECURRENT"], minutesToExpire: 60,
        externalReference: reserva.checkout_id,
        callback: { successUrl: retorno, cancelUrl: retorno, expiredUrl: retorno },
        items: [{ name: `Glass Code - ${planoValido}`, description: "Assinatura mensal Glass Code", quantity: 1, value: valorCentavos / 100 }],
        subscription: { cycle: "MONTHLY", nextDueDate: primeiraCobranca },
      },
    });
    if (!checkout.id) throw new Error("Checkout sem identificador.");
    const { data: confirmado, error: erroConfirmacao } = await admin.rpc("gc_asaas_confirmar_checkout", {
      p_checkout_id: reserva.checkout_id, p_asaas_checkout_id: checkout.id,
    });
    if (erroConfirmacao || confirmado !== true) return respostaErro("Checkout criado, mas aguardando conciliação. Não tente criar outro.", 503);
    if (!linkCheckoutValido(checkout.link)) return respostaErro("O Asaas criou o checkout, mas não forneceu um link Sandbox válido. A tentativa foi preservada para conciliação.", 503);
    const { data: linkSalvo, error: erroLink } = await admin.rpc("gc_asaas_link_checkout", {
      p_checkout_id: reserva.checkout_id, p_empresa_id: empresaId, p_link: checkout.link,
    });
    if (erroLink || linkSalvo !== checkout.link) return respostaErro("Checkout criado, mas não foi possível salvar o link. Não tente criar outro.", 503);
    return NextResponse.json({ url: checkout.link, reutilizado: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return respostaErro("Não foi possível confirmar a criação do checkout. A tentativa foi preservada para evitar duplicidade.", 503);
  }
}
