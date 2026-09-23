import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const responder = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function autorizar(request: Request) {
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ")) return { erro: responder({ erro: "Entre na sua conta para continuar." }, 401) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { erro: responder({ erro: "Serviço indisponível." }, 503) };
  // Usa a sessão da solicitante, nunca uma chave que contorne as permissões do banco.
  const db = createClient(url, key, { global: { headers: { Authorization: token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await db.auth.getUser(token.slice(7));
  if (error || !user) return { erro: responder({ erro: "Sessão expirada. Entre novamente." }, 401) };
  const acesso = await db.rpc("gc_proprietaria");
  if (acesso.error) return { erro: responder({ erro: "Painel indisponível. Confira a ativação no Supabase." }, 503) };
  if (acesso.data !== true) return { erro: responder({ erro: "Acesso exclusivo da proprietária do Glass Code." }, 403) };
  return { db };
}

export async function GET(request: Request) {
  try {
    const acesso = await autorizar(request);
    if (acesso.erro) return acesso.erro;
    const url = new URL(request.url);
    if (url.searchParams.get("verificar") === "1") return responder({ proprietaria: true });
    const pagina = Number(url.searchParams.get("pagina") || 0);
    const financeiro = url.searchParams.get("modo") === "financeiro";
    const historico = url.searchParams.get("modo") === "acessos";
    const suporte = url.searchParams.get("modo") === "suporte";
    if (suporte) {
  const { data, error } = await acesso.db!.rpc("gc_suporte_admin");

  if (error) {
    return responder(
      {
        erro:
          error.code === "PGRST202"
            ? "O suporte administrativo ainda precisa ser ativado no Supabase."
            : "Não foi possível carregar os chamados de suporte.",
      },
      503
    );
  }

  return responder(data);
}
    const parametros = {
      p_busca: (url.searchParams.get("busca") || "").slice(0, 100),
      p_pagina: Number.isInteger(pagina) && pagina >= 0 ? Math.min(pagina, 100000) : 0,
    };
    let { data, error } = await acesso.db!.rpc(historico ? "gc_historico_acessos" : financeiro ? "gc_financeiro" : "gc_painel_situacoes", parametros);
    if (!historico && !financeiro && error?.code === 'PGRST202') ({ data, error } = await acesso.db!.rpc('gc_painel', parametros));
    if (error) return responder({ erro: historico && error.code === "PGRST202" ? "Ative a atualização painel_historico_acessos.sql no Supabase para consultar os logins." : financeiro && error.code === "PGRST202" ? "O financeiro ainda precisa ser ativado no Supabase. Execute a atualização painel_financeiro.sql." : "Não foi possível carregar o painel." }, 503);
    if (historico) {
      const ids = [...new Set((data?.eventos || []).map((e: { usuario_id: string }) => e.usuario_id).filter((id: unknown) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))];
      const presenca = await acesso.db!.rpc('gc_consultar_presenca', { p_usuarios: ids });
      return responder({ ...data, presenca_disponivel: !presenca.error, eventos: (data?.eventos || []).map((e: { usuario_id: string }) => ({ ...e, presenca: presenca.error ? null : presenca.data?.[e.usuario_id] || { online: false, visto_em: null } })) });
    }
    return responder(data);
  } catch { return responder({ erro: "Não foi possível conectar ao painel." }, 503); }
}

export async function POST(request: Request) {
  try {
    const acesso = await autorizar(request);
    if (acesso.erro) return acesso.erro;
    let body;
    try { body = await request.json(); } catch { return responder({ erro: "Solicitação inválida." }, 400); }
if (body?.acao === "suporte_anexo") {
  if (
    typeof body.caminho !== "string" ||
    body.caminho.length < 3 ||
    body.caminho.length > 1000
  ) {
    return responder({ erro: "Anexo inválido." }, 400);
  }

  // Primeiro confirma no banco que:
  // 1. a solicitante é a proprietária;
  // 2. o arquivo realmente pertence a um chamado de suporte.
  const { data: caminhoValidado, error: validacaoErro } =
    await acesso.db!.rpc("gc_suporte_anexo_admin", {
      p_caminho: body.caminho,
    });

  if (validacaoErro || !caminhoValidado) {
    return responder(
      { erro: "Não foi possível abrir o anexo." },
      403
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return responder(
      { erro: "Serviço de anexos indisponível." },
      503
    );
  }

  // Cliente exclusivo do servidor.
  // A Service Role nunca é enviada para o navegador.
  const adminDb = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: assinatura, error: assinaturaErro } =
    await adminDb.storage
      .from("suporte-anexos")
      .createSignedUrl(caminhoValidado, 60);

  if (assinaturaErro || !assinatura?.signedUrl) {
    return responder(
      { erro: "Não foi possível gerar o acesso ao anexo." },
      503
    );
  }

  return responder({
    url: assinatura.signedUrl,
  });
}

if (body?.acao === "suporte_responder") {
  if (
    typeof body.chamadoId !== "string" ||
    typeof body.mensagem !== "string"
  ) {
    return responder(
      { erro: "Dados da resposta inválidos." },
      400
    );
  }

  const mensagem = body.mensagem.trim();

  if (!mensagem) {
    return responder(
      { erro: "Digite uma mensagem para responder ao cliente." },
      400
    );
  }

  if (mensagem.length > 10000) {
    return responder(
      { erro: "A mensagem é muito longa." },
      400
    );
  }

  const { data, error } = await acesso.db!.rpc(
    "gc_suporte_responder_admin",
    {
      p_chamado_id: body.chamadoId,
      p_mensagem: mensagem,
    }
  );

  if (error || !data) {
    return responder(
      { erro: "Não foi possível enviar a resposta." },
      503
    );
  }

  return responder({
    sucesso: true,
    mensagem: data,
  });
}

if (body?.acao === "suporte_status") {
  if (
    typeof body.chamadoId !== "string" ||
    typeof body.status !== "string"
  ) {
    return responder(
      { erro: "Dados do chamado inválidos." },
      400
    );
  }

  const statusPermitidos = [
    "novo",
    "em_analise",
    "em_atendimento",
    "aguardando_cliente",
    "resolvido",
  ];

  if (!statusPermitidos.includes(body.status)) {
    return responder(
      { erro: "Status inválido." },
      400
    );
  }

  const { data, error } = await acesso.db!.rpc(
    "gc_suporte_atualizar_status_admin",
    {
      p_chamado_id: body.chamadoId,
      p_status: body.status,
    }
  );

  if (error || !data) {
    return responder(
      { erro: "Não foi possível atualizar o status do chamado." },
      503
    );
  }

  return responder({
    sucesso: true,
    chamado: data,
  });
}
    if (body?.acao === 'reenviar_confirmacao') {
      if (typeof body.email !== 'string' || body.email.length > 254 || typeof body.alvo !== 'string') return responder({ erro: 'Cadastro inválido.' }, 400);
      const { data: painel, error: consultaErro } = await acesso.db!.rpc('gc_painel', { p_busca: body.email, p_pagina: 0 });
      if (consultaErro) return responder({ erro: 'Não foi possível verificar o cadastro.' }, 503);
      const usuario = painel?.usuarios?.find((u: { id: string; email: string }) => u.id === body.alvo && u.email === body.email);
      if (!usuario) return responder({ erro: 'Usuário não encontrado.' }, 404);
      if (usuario.confirmado) return responder({ erro: 'Este e-mail já está confirmado. Atualize a lista.' }, 409);
      const { error } = await acesso.db!.auth.resend({ type: 'signup', email: usuario.email });
      if (error) return responder({ erro: error.status === 429 ? 'Aguarde alguns minutos antes de reenviar. O limite de envios foi atingido.' : 'Não foi possível reenviar. Confira o serviço de e-mail do Supabase e tente novamente.' }, error.status === 429 ? 429 : 503);
      return responder({ sucesso: true });
    }
    if (body?.acao === 'situacao') {
      const d = body.dados;
      if (!d || typeof d !== 'object' || Array.isArray(d) || JSON.stringify(d).length > 6000 ||
        typeof d.alvo !== 'string' || !/^[0-9a-f-]{36}$/i.test(d.alvo)) return responder({erro:'Dados de situação inválidos.'},400);
      const {error} = await acesso.db!.rpc('gc_definir_situacao',{p_tipo:d.tipo,p_alvo:d.alvo,p_situacao:d.situacao,p_categoria:d.categoria,p_motivo:d.motivo,p_mensagem:d.mensagem,p_contato:d.contato,p_prazo:d.prazo||null});
      if(error) return responder({erro:error.code==='PGRST202'?'Ative a atualização painel_situacao_contas.sql no Supabase.':error.code==='22023'?error.message:'Não foi possível salvar a situação. Confira os dados informados.'},error.code?.startsWith('22')?400:503);
      return responder({sucesso:true});
    }
    if (body?.acao !== undefined) {
      if (!["contrato", "gerar", "pagar", "reabrir", "cancelar"].includes(body.acao) || !body.dados ||
        typeof body.dados !== "object" || Array.isArray(body.dados) || JSON.stringify(body.dados).length > 10000) {
        return responder({ erro: "Operação financeira inválida." }, 400);
      }
      const { error } = await acesso.db!.rpc("gc_financeiro_alterar", { p_acao: body.acao, p_dados: body.dados });
      if (error) return responder({ erro: error.code === "22023" ? error.message : error.code?.startsWith("22") ? "Confira os valores e as datas informados." : "Não foi possível salvar no financeiro. Confira se a atualização foi instalada." }, error.code?.startsWith("22") ? 400 : 503);
      return responder({ sucesso: true });
    }
    if (!body || !["empresa", "usuario"].includes(body.tipo) || typeof body.alvo !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.alvo) ||
      typeof body.bloqueado !== "boolean" || typeof body.motivo !== "string" || body.motivo.trim().length < 3 || body.motivo.length > 500) {
      return responder({ erro: "Informe o cadastro e um motivo entre 3 e 500 caracteres." }, 400);
    }
    const { error } = await acesso.db!.rpc("gc_alterar_acesso", {
      p_tipo: body.tipo, p_alvo: body.alvo, p_bloqueado: body.bloqueado, p_motivo: body.motivo.trim(),
    });
    if (error) return responder({ erro: error.code === "22023" ? error.message : "Não foi possível alterar o acesso." }, error.code === "22023" ? 400 : 503);
    return responder({ sucesso: true });
  } catch { return responder({ erro: "Não foi possível conectar ao painel." }, 503); }
}
