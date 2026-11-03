
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { asaasRequest } from "@/lib/asaas/client";
import { precosPlanosCentavos } from "@/config/comercial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plano = keyof typeof precosPlanosCentavos;

type Reserva = {
  assinatura_id: string;
  asaas_cliente_id: string | null;
  asaas_assinatura_id: string | null;
  assinatura_status: string;
  criado_novo: boolean;
};

type DadosCliente = {
  empresa_nome: string;
  empresa_cnpj: string | null;
  email_financeiro: string | null;
};

type RecursoAsaas = {
  id?: string;
  customer?: string;
  subscription?: string;
  invoiceUrl?: string;
  status?: string;
};

type ListaAsaas = {
  data?: RecursoAsaas[];
};

function erro(mensagem: string, status: number) {
  return NextResponse.json(
    { erro: mensagem },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function resposta(dados: object, status = 200) {
  return NextResponse.json(dados, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function documentoValido(valor: string | null): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  return digitos.length === 11 || digitos.length === 14
    ? digitos
    : null;
}

function linkSeguro(valor: unknown): string | null {
  if (typeof valor !== "string") return null;

  try {
    const url = new URL(valor);
    if (
      url.protocol !== "https:" ||
      !["sandbox.asaas.com", "www.asaas.com", "asaas.com"]
        .includes(url.hostname)
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function vencimentoEmTresDias(): string {
  const agora = new Date();

  // Data civil em Brasília, sem depender do fuso do servidor.
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);

  const obter = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  const data = new Date(
    `${obter("year")}-${obter("month")}-${obter("day")}T12:00:00Z`
  );

  data.setUTCDate(data.getUTCDate() + 3);
  return data.toISOString().slice(0, 10);
}

async function primeiraCobranca(assinaturaAsaasId: string) {
  const lista = await asaasRequest<ListaAsaas>(
    `/subscriptions/${encodeURIComponent(assinaturaAsaasId)}/payments`
  );

  const cobranca = lista.data?.[0];
  return linkSeguro(cobranca?.invoiceUrl);
}

export async function POST(request: NextRequest) {
  if (process.env.ASAAS_AMBIENTE !== "sandbox") {
    return erro("Ambiente indisponível.", 503);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return erro("Usuário não autenticado.", 401);
  }

  const token = authorization.slice(7).trim();
  if (!token) return erro("Sessão inválida.", 401);

  let entrada: unknown;

  try {
    const texto = await request.text();
    if (Buffer.byteLength(texto, "utf8") > 8192) {
      return erro("Solicitação muito grande.", 413);
    }
    entrada = JSON.parse(texto);
  } catch {
    return erro("Dados inválidos.", 400);
  }

  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return erro("Dados inválidos.", 400);
  }

  const dados = entrada as Record<string, unknown>;
  const plano = dados.plano;

  if (
    typeof plano !== "string" ||
    !Object.prototype.hasOwnProperty.call(precosPlanosCentavos, plano)
  ) {
    return erro("Plano inválido.", 400);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return erro("Configuração indisponível.", 503);
  }

  const usuarioSupabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: usuario, error: erroUsuario } =
    await usuarioSupabase.auth.getUser(token);

  if (erroUsuario || !usuario.user) {
    return erro("Sessão inválida ou expirada.", 401);
  }

  const { data: empresaId, error: erroEmpresa } =
    await usuarioSupabase.rpc("gc_empresa_para_contratacao");

  if (erroEmpresa || typeof empresaId !== "string") {
    return erro("Contratação não autorizada.", 403);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const planoValido = plano as Plano;
  const valorCentavos = precosPlanosCentavos[planoValido];

  // Validar cadastro antes de reservar ou criar recursos.
  const { data: cadastros, error: erroCadastro } = await admin.rpc(
    "gc_asaas_dados_cliente_boleto",
    { p_empresa_id: empresaId }
  );

  if (erroCadastro) {
    return erro("Não foi possível consultar o cadastro financeiro.", 503);
  }

  const cadastro = (cadastros as DadosCliente[] | null)?.[0];
  const cpfCnpj = documentoValido(cadastro?.empresa_cnpj ?? null);
  const email = cadastro?.email_financeiro?.trim();

  if (
    !cadastro?.empresa_nome?.trim() ||
    !cpfCnpj ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return erro(
      "Complete o nome, CPF/CNPJ válido e e-mail financeiro da empresa antes de contratar.",
      422
    );
  }

  const { data: reservas, error: erroReserva } = await admin.rpc(
    "gc_asaas_reservar_boleto",
    {
      p_empresa_id: empresaId,
      p_plano: planoValido,
      p_valor_centavos: valorCentavos,
    }
  );

  if (erroReserva) {
    return erro(
      "Já existe uma contratação incompatível ou não foi possível reservar a assinatura.",
      409
    );
  }

  const reserva = (reservas as Reserva[] | null)?.[0];

  if (!reserva) {
    return erro("Não foi possível reservar a assinatura.", 500);
  }

  let clienteId = reserva.asaas_cliente_id;
  let assinaturaAsaasId = reserva.asaas_assinatura_id;

  // Uma assinatura já existente nunca deve ser recriada.
  if (assinaturaAsaasId) {
    try {
      const link = await primeiraCobranca(assinaturaAsaasId);

      if (link) {
        return resposta({
          url: link,
          reutilizado: true,
          modalidade: "BOLETO",
        });
      }

      return resposta({
        status: "aguardando_cobranca",
        mensagem:
          "A assinatura existe, mas a primeira cobrança ainda não está disponível no Asaas. Consulte novamente mais tarde.",
      }, 202);
    } catch {
      return erro(
        "Não foi possível consultar a cobrança existente. Nenhuma nova assinatura foi criada.",
        503
      );
    }
  }

  // Primeira tentativa de criação do cliente.
  if (!clienteId) {
    const { data: estado, error: erroEstado } = await admin.rpc(
      "gc_asaas_iniciar_cliente_boleto",
      { p_assinatura_id: reserva.assinatura_id }
    );

    if (erroEstado) {
      return erro("Não foi possível reservar a criação do cliente.", 503);
    }

    if (estado !== "iniciar") {
      return erro(
        "Já existe uma tentativa de cadastro no Asaas. É necessário conciliá-la antes de continuar.",
        409
      );
    }

    let cliente: RecursoAsaas;

    try {
      cliente = await asaasRequest<RecursoAsaas>("/customers", {
        method: "POST",
        body: {
          name: cadastro.empresa_nome.trim(),
          cpfCnpj,
          email,
          externalReference: empresaId,
        },
      });
    } catch {
      return erro(
        "Não foi possível confirmar o cadastro no Asaas. A tentativa foi preservada para conciliação.",
        503
      );
    }

    if (!cliente.id) {
      return erro("Cliente criado sem identificador. Conciliação necessária.", 503);
    }

    const { data: vinculado, error: erroVinculo } = await admin.rpc(
      "gc_asaas_vincular_cliente_boleto",
      {
        p_assinatura_id: reserva.assinatura_id,
        p_asaas_cliente_id: cliente.id,
      }
    );

    if (erroVinculo || vinculado !== true) {
      return erro(
        "Cliente criado no Asaas, mas vínculo pendente. Não tente outro cadastro.",
        503
      );
    }

    clienteId = cliente.id;
  }

  // Proteger a criação da assinatura.
  const { data: estadoAssinatura, error: erroInicio } = await admin.rpc(
    "gc_asaas_iniciar_criacao_boleto",
    { p_assinatura_id: reserva.assinatura_id }
  );

  if (erroInicio) {
    return erro("Não foi possível iniciar a criação da assinatura.", 503);
  }

  if (estadoAssinatura !== "iniciar") {
    return erro(
      "Existe uma criação de assinatura anterior que precisa ser conciliada. Não faremos outra cobrança automaticamente.",
      409
    );
  }

  let assinatura: RecursoAsaas;

  try {
    assinatura = await asaasRequest<RecursoAsaas>("/subscriptions", {
      method: "POST",
      body: {
        customer: clienteId,
        billingType: "BOLETO",
        value: valorCentavos / 100,
        cycle: "MONTHLY",
        nextDueDate: vencimentoEmTresDias(),
        description: `Glass Code - Plano ${planoValido}`,
        externalReference: reserva.assinatura_id,
      },
    });
  } catch {
    return erro(
      "Não foi possível confirmar a criação da assinatura no Asaas. A tentativa foi preservada para conciliação.",
      503
    );
  }

  if (!assinatura.id) {
    return erro(
      "O Asaas não retornou o identificador da assinatura. Conciliação necessária.",
      503
    );
  }

  const { data: confirmado, error: erroConfirmacao } = await admin.rpc(
    "gc_asaas_confirmar_criacao_boleto",
    {
      p_assinatura_id: reserva.assinatura_id,
      p_asaas_assinatura_id: assinatura.id,
    }
  );

  if (erroConfirmacao || confirmado !== true) {
    return erro(
      "Assinatura criada, mas aguardando conciliação com o banco. Não crie outra.",
      503
    );
  }

  try {
    const link = await primeiraCobranca(assinatura.id);

    if (link) {
      return resposta({
        url: link,
        reutilizado: false,
        modalidade: "BOLETO",
      });
    }

    return resposta({
      status: "aguardando_cobranca",
      mensagem:
        "Assinatura criada com sucesso. O Asaas ainda está preparando o primeiro boleto.",
    }, 202);
  } catch {
    return resposta({
      status: "aguardando_cobranca",
      mensagem:
        "Assinatura criada. Ainda não foi possível consultar o primeiro boleto.",
    }, 202);
  }
}
