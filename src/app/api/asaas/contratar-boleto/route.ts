
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { precosPlanosCentavos } from "@/config/comercial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plano = keyof typeof precosPlanosCentavos;

type ReservaBoleto = {
  assinatura_id: string;
  asaas_cliente_id: string | null;
  asaas_assinatura_id: string | null;
  assinatura_status: string;
  criado_novo: boolean;
};

function respostaErro(erro: string, status: number) {
  return NextResponse.json(
    { erro },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  // Nesta etapa, a integração funciona apenas no Sandbox.
  if (process.env.ASAAS_AMBIENTE !== "sandbox") {
    return respostaErro("Ambiente indisponível.", 503);
  }

  // Verificar autenticação.
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return respostaErro("Usuário não autenticado.", 401);
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return respostaErro("Sessão inválida.", 401);
  }

  // Ler e validar os dados recebidos.
  let entrada: unknown;

  try {
    const texto = await request.text();

    if (Buffer.byteLength(texto, "utf8") > 8192) {
      return respostaErro("Solicitação muito grande.", 413);
    }

    entrada = JSON.parse(texto);
  } catch {
    return respostaErro("Dados inválidos.", 400);
  }

  if (
    !entrada ||
    typeof entrada !== "object" ||
    Array.isArray(entrada)
  ) {
    return respostaErro("Dados inválidos.", 400);
  }

  const dados = entrada as Record<string, unknown>;
  const plano = dados.plano;

  if (
    typeof plano !== "string" ||
    !Object.prototype.hasOwnProperty.call(
      precosPlanosCentavos,
      plano
    )
  ) {
    return respostaErro("Plano inválido.", 400);
  }

  // Configuração do Supabase.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return respostaErro("Configuração indisponível.", 503);
  }

  // Cliente autenticado com o token do usuário.
  const usuarioSupabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: usuario, error: erroUsuario } =
    await usuarioSupabase.auth.getUser(token);

  if (erroUsuario || !usuario.user) {
    return respostaErro("Sessão inválida ou expirada.", 401);
  }

  // Somente o administrador pode contratar pela empresa.
  const { data: empresaId, error: erroEmpresa } =
    await usuarioSupabase.rpc("gc_empresa_para_contratacao");

  if (erroEmpresa || typeof empresaId !== "string") {
    return respostaErro("Contratação não autorizada.", 403);
  }

  // Cliente administrativo, utilizado somente no servidor.
  const admin = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const planoValido = plano as Plano;
  const valorCentavos = precosPlanosCentavos[planoValido];

  // Reservar a assinatura no Supabase.
  const { data: reservas, error: erroReserva } = await admin.rpc(
    "gc_asaas_reservar_boleto",
    {
      p_empresa_id: empresaId,
      p_plano: planoValido,
      p_valor_centavos: valorCentavos,
    }
  );

  if (erroReserva) {
    return respostaErro(
      "Não foi possível reservar a assinatura por boleto. Verifique se existe uma contratação com condições diferentes.",
      409
    );
  }

  const reserva = (reservas as ReservaBoleto[] | null)?.[0];

  if (!reserva) {
    return respostaErro("Falha ao reservar assinatura.", 500);
  }

  // IMPORTANTE:
  // Ainda não criamos clientes, assinaturas ou cobranças no Asaas.
  // A próxima etapa implementará a conciliação e a emissão segura.

  return NextResponse.json(
    {
      status: "preparando",
      mensagem:
        "Reserva registrada. A emissão do boleto ainda não está habilitada.",
      assinaturaId: reserva.assinatura_id,
      plano: planoValido,
      modalidade: "BOLETO",
      valorCentavos,
      reutilizado: !reserva.criado_novo,
    },
    {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
