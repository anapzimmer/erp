import { createClient } from "@supabase/supabase-js";
import type {
  FoundersPostPayload,
  FoundersVoto,
  FoundersStatusContribuicao,
  FoundersTipoPontos,
} from "@/types/founders";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const responder = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_REGEX.test(value);

const isDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value);

const isContribuicaoStatusAdmin = (
  value: unknown
): value is Exclude<
  FoundersStatusContribuicao,
  "rascunho" | "enviada"
> =>
  value === "em_triagem" ||
  value === "em_votacao" ||
  value === "aprovada" ||
  value === "rejeitada" ||
  value === "implementada";

const isVoto = (value: unknown): value is FoundersVoto =>
  value === "favor" ||
  value === "contra" ||
  value === "abster";

const isTipoPontos = (
  value: unknown
): value is FoundersTipoPontos =>
  value === "credito" ||
  value === "debito" ||
  value === "estorno_credito" ||
  value === "estorno_debito";

async function autorizar(request: Request) {
  const token = request.headers.get("authorization");

  if (!token?.startsWith("Bearer ")) {
    return {
      erro: responder(
        { erro: "Entre na sua conta para continuar." },
        401
      ),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      erro: responder(
        { erro: "Serviço indisponível." },
        503
      ),
    };
  }

  const db = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: token },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await db.auth.getUser(token.slice(7));

  if (error || !user) {
    return {
      erro: responder(
        {
          erro: "Sessão expirada. Entre novamente.",
        },
        401
      ),
    };
  }

  return { db, userId: user.id };
}

type FoundersDbClient = Exclude<
  Awaited<ReturnType<typeof autorizar>>,
  { erro: Response }
>["db"];

async function exigirAdmin(db: FoundersDbClient) {
  const acesso = await db.rpc("gc_founders_admin");
  if (acesso.error) {
    return responder(
      {
        erro: "Módulo Founders indisponível. Confira a migração no Supabase.",
      },
      503
    );
  }
  if (acesso.data !== true) {
    return responder(
      {
        erro: "Acesso administrativo Founders necessário.",
      },
      403
    );
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const acesso = await autorizar(request);
    if ("erro" in acesso) return acesso.erro;

    const url = new URL(request.url);
    const visao = url.searchParams.get("visao") || "minha-area";
    const busca = (url.searchParams.get("busca") || "").slice(
      0,
      100
    );
    const paginaValue = Number(
      url.searchParams.get("pagina") || 0
    );
    const pagina =
      Number.isInteger(paginaValue) && paginaValue >= 0
        ? Math.min(paginaValue, 100000)
        : 0;

    if (visao === "admin") {
      const erroAdmin = await exigirAdmin(acesso.db);
      if (erroAdmin) return erroAdmin;

      const { data, error } = await acesso.db.rpc(
        "gc_founders_admin_painel",
        {
          p_busca: busca,
          p_pagina: pagina,
        }
      );

      if (error) {
        return responder(
          {
            erro:
              error.code === "PGRST202"
                ? "Função administrativa Founders não encontrada. Aplique a migração da etapa 2."
                : "Não foi possível carregar o painel Founders.",
          },
          503
        );
      }

      return responder(data);
    }

    if (visao !== "minha-area") {
      return responder({ erro: "Visão inválida." }, 400);
    }

    const { data, error } = await acesso.db.rpc(
      "gc_founders_minha_area"
    );

    if (error) {
      return responder(
        {
          erro:
            error.code === "PGRST202"
              ? "Função do módulo Founders não encontrada. Aplique a migração da etapa 2."
              : error.code === "42501"
              ? "Sua empresa não está ativa no programa Founders."
              : "Não foi possível carregar sua área Founders.",
        },
        error.code === "42501" ? 403 : 503
      );
    }

    return responder(data);
  } catch {
    return responder(
      { erro: "Não foi possível conectar ao Founders." },
      503
    );
  }
}

export async function POST(request: Request) {
  try {
    const acesso = await autorizar(request);
    if ("erro" in acesso) return acesso.erro;

    let body: FoundersPostPayload;

    try {
      body = (await request.json()) as FoundersPostPayload;
    } catch {
      return responder(
        { erro: "Solicitação inválida." },
        400
      );
    }

    if (body.acao === "enviar_contribuicao") {
      if (
        typeof body.titulo !== "string" ||
        typeof body.descricao !== "string" ||
        typeof body.categoria !== "string" ||
        body.titulo.trim().length < 3 ||
        body.descricao.trim().length < 10 ||
        body.categoria.trim().length < 2
      ) {
        return responder(
          { erro: "Dados da contribuição inválidos." },
          400
        );
      }

      const { data, error } = await acesso.db.rpc(
        "gc_founders_criar_contribuicao",
        {
          p_titulo: body.titulo,
          p_descricao: body.descricao,
          p_categoria: body.categoria,
          p_idempotency_key: body.idempotency_key || null,
        }
      );

      if (error) {
        return responder(
          {
            erro:
              error.code === "42501"
                ? "Sua empresa não está ativa no programa Founders."
                : "Não foi possível enviar a contribuição.",
          },
          error.code === "42501" ? 403 : 503
        );
      }

      return responder({ sucesso: true, data: { id: data } });
    }

    if (body.acao === "anexar_contribuicao") {
      if (
        !isUuid(body.contribuicao_id) ||
        typeof body.storage_bucket !== "string" ||
        typeof body.storage_path !== "string" ||
        typeof body.nome_arquivo !== "string" ||
        typeof body.mime_type !== "string" ||
        !Number.isInteger(body.tamanho_bytes)
      ) {
        return responder(
          { erro: "Dados do anexo inválidos." },
          400
        );
      }

      const { data, error } = await acesso.db.rpc(
        "gc_founders_anexar_contribuicao",
        {
          p_contribuicao_id: body.contribuicao_id,
          p_storage_bucket: body.storage_bucket,
          p_storage_path: body.storage_path,
          p_nome_arquivo: body.nome_arquivo,
          p_mime_type: body.mime_type,
          p_tamanho_bytes: body.tamanho_bytes,
          p_hash_arquivo: body.hash_arquivo || null,
        }
      );

      if (error) {
        return responder(
          {
            erro:
              error.code === "22023"
                ? error.message
                : "Não foi possível registrar o anexo da contribuição.",
          },
          error.code?.startsWith("22") ? 400 : 503
        );
      }

      return responder({ sucesso: true, data: { id: data } });
    }

    if (body.acao === "votar") {
      if (!isUuid(body.votacao_id) || !isVoto(body.voto)) {
        return responder(
          { erro: "Dados do voto inválidos." },
          400
        );
      }

      const { data, error } = await acesso.db.rpc(
        "gc_founders_votar",
        {
          p_votacao_id: body.votacao_id,
          p_voto: body.voto,
          p_observacao: body.observacao || "",
        }
      );

      if (error) {
        return responder(
          {
            erro:
              error.code === "22023"
                ? error.message
                : "Não foi possível registrar o voto.",
          },
          error.code?.startsWith("22") ? 400 : 503
        );
      }

      return responder({ sucesso: true, data: { id: data } });
    }

    if (body.acao === "resgatar_beneficio") {
      if (
        !isUuid(body.beneficio_id) ||
        !Number.isInteger(body.quantidade) ||
        body.quantidade <= 0 ||
        typeof body.idempotency_key !== "string"
      ) {
        return responder(
          { erro: "Dados do resgate inválidos." },
          400
        );
      }

      const { data, error } = await acesso.db.rpc(
        "gc_founders_resgatar_beneficio",
        {
          p_beneficio_id: body.beneficio_id,
          p_quantidade: body.quantidade,
          p_idempotency_key: body.idempotency_key,
          p_observacao: body.observacao || "",
        }
      );

      if (error) {
        return responder(
          {
            erro:
              error.code === "22023"
                ? error.message
                : "Não foi possível solicitar o resgate.",
          },
          error.code?.startsWith("22") ? 400 : 503
        );
      }

      return responder({ sucesso: true, data: { id: data } });
    }

    if (body.acao === "admin_definir_parceiro") {
      const erroAdmin = await exigirAdmin(acesso.db);
      if (erroAdmin) return erroAdmin;

      if (
        !isUuid(body.empresa_id) ||
        typeof body.status !== "string" ||
        typeof body.valor_mensal_acordado !== "number" ||
        !Number.isInteger(body.quantidade_usuarios_inclusos) ||
        !isDate(body.ciclo_avaliacao_inicio) ||
        !isDate(body.ciclo_avaliacao_fim)
      ) {
        return responder(
          { erro: "Dados do parceiro inválidos." },
          400
        );
      }

      const { data, error } = await acesso.db.rpc(
        "gc_founders_admin_definir_parceiro",
        {
          p_empresa_id: body.empresa_id,
          p_status: body.status,
          p_valor_mensal_acordado: body.valor_mensal_acordado,
          p_quantidade_usuarios_inclusos:
            body.quantidade_usuarios_inclusos,
          p_ciclo_inicio: body.ciclo_avaliacao_inicio,
          p_ciclo_fim: body.ciclo_avaliacao_fim,
        }
      );

      if (error) {
        return responder(
          {
            erro:
              error.code === "22023"
                ? error.message
                : "Não foi possível salvar o parceiro Founders.",
          },
          error.code?.startsWith("22") ? 400 : 503
        );
      }

      return responder({ sucesso: true, data: { id: data } });
    }

    if (body.acao === "admin_ajustar_pontos") {
      const erroAdmin = await exigirAdmin(acesso.db);
      if (erroAdmin) return erroAdmin;

      if (
        !isUuid(body.empresa_id) ||
        !isTipoPontos(body.tipo) ||
        !Number.isInteger(body.pontos) ||
        body.pontos <= 0 ||
        typeof body.motivo !== "string" ||
        typeof body.idempotency_key !== "string"
      ) {
        return responder(
          { erro: "Dados de ajuste de pontos inválidos." },
          400
        );
      }

      if (
        body.referencia_id !== undefined &&
        body.referencia_id !== null &&
        !isUuid(body.referencia_id)
      ) {
        return responder(
          { erro: "Referência inválida para ajuste de pontos." },
          400
        );
      }

      const { data, error } = await acesso.db.rpc(
        "gc_founders_admin_ajustar_pontos",
        {
          p_empresa_id: body.empresa_id,
          p_tipo: body.tipo,
          p_pontos: body.pontos,
          p_motivo: body.motivo,
          p_idempotency_key: body.idempotency_key,
          p_referencia_id: body.referencia_id || null,
        }
      );

      if (error) {
        return responder(
          {
            erro:
              error.code === "22023"
                ? error.message
                : "Não foi possível registrar o ajuste de pontos.",
          },
          error.code?.startsWith("22") ? 400 : 503
        );
      }

      return responder({ sucesso: true, data: { id: data } });
    }

    if (body.acao === "admin_atualizar_contribuicao") {
      const erroAdmin = await exigirAdmin(acesso.db);
      if (erroAdmin) return erroAdmin;

      if (
        !isUuid(body.contribuicao_id) ||
        !isContribuicaoStatusAdmin(body.status)
      ) {
        return responder(
          {
            erro:
              "Dados de atualização da contribuição inválidos.",
          },
          400
        );
      }

      if (
        body.pontos_concedidos !== undefined &&
        (!Number.isInteger(body.pontos_concedidos) ||
          body.pontos_concedidos < 0)
      ) {
        return responder(
          { erro: "Pontos concedidos inválidos." },
          400
        );
      }

      const { error } = await acesso.db.rpc(
        "gc_founders_admin_atualizar_contribuicao",
        {
          p_contribuicao_id: body.contribuicao_id,
          p_status: body.status,
          p_pontos_concedidos:
            body.pontos_concedidos ?? null,
          p_nota_administrativa:
            body.nota_administrativa || "",
        }
      );

      if (error) {
        return responder(
          {
            erro:
              error.code === "22023"
                ? error.message
                : "Não foi possível atualizar a contribuição.",
          },
          error.code?.startsWith("22") ? 400 : 503
        );
      }

      return responder({
        sucesso: true,
        mensagem: "Contribuição atualizada.",
      });
    }

    return responder(
      { erro: "Ação do Founders inválida." },
      400
    );
  } catch {
    return responder(
      { erro: "Não foi possível conectar ao Founders." },
      503
    );
  }
}
