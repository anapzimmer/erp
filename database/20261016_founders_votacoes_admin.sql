-- Founders: administração de votações
-- Não destrutiva: sem drop/truncate/delete. Preserva votações e votos existentes.
-- Pré-requisitos: 20261015_founders_fundacao.sql e 20261015_founders_correcao_seguranca.sql já aplicadas.
--
-- Regras de negócio (aprovadas):
-- - uma votação por contribuição e um voto por empresa por votação;
-- - sem quórum; resultado (favorável/contrário/empate) é apenas consultivo;
-- - a decisão de implementar a sugestão é independente da votação e continua em
--   gc_founders_admin_atualizar_contribuicao;
-- - votação deixa de aceitar votos ao fim do prazo; status persistido é sincronizado
--   por gc_founders_sincronizar_votacoes (pg_cron, quando disponível, e oportunisticamente);
-- - parceiros veem apenas resultados agregados; nenhuma RPC devolve a escolha por empresa.
--
-- Ordem de bloqueios (compatível com gc_founders_admin_atualizar_contribuicao):
--   1) pg_advisory_xact_lock('founders_sync_empresa_' || empresa_da_contribuicao)
--   2) founders_contribuicoes FOR UPDATE
--   3) founders_votacoes FOR UPDATE
-- gc_founders_votar usa somente FOR SHARE em founders_votacoes (sem outros bloqueios).
-- A sincronização usa FOR UPDATE SKIP LOCKED (nunca espera) e roda ao final das RPCs de escrita.
begin;

do $$
begin
  if to_regprocedure('public.gc_founders_admin()') is null
    or to_regprocedure('public.gc_founders_empresa_ativa(uuid)') is null
    or to_regprocedure('public.gc_founders_registrar_auditoria(text,text,uuid,uuid,jsonb)') is null
    or to_regprocedure('public.gc_founders_votar(uuid,text,text)') is null then
    raise exception 'Pré-requisito ausente: funções base do Founders.';
  end if;
  if to_regclass('public.founders_votacoes') is null
    or to_regclass('public.founders_votos') is null
    or to_regclass('public.founders_contribuicoes') is null
    or to_regclass('public.founders_parceiros') is null
    or to_regclass('glasscode_private.founders_auditoria') is null then
    raise exception 'Pré-requisito ausente: tabelas base do Founders.';
  end if;
  if to_regclass('public.founders_pontos_ref_estorno_unica_idx') is null then
    raise exception 'Pré-requisito ausente: migração 20261015_founders_correcao_seguranca.sql não aplicada.';
  end if;
end $$;

-- 1) Sincronização do status persistido (uso interno: cron/owner, sem EXECUTE para clientes)
create or replace function public.gc_founders_sincronizar_votacoes()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare encerradas integer := 0;
begin
  with candidatas as (
    select v.id
    from public.founders_votacoes v
    where v.status = 'aberta'
      and v.encerra_em is not null
      and v.encerra_em <= now()
    order by v.id
    for update skip locked
  ), atualizadas as (
    update public.founders_votacoes v
    set status = 'encerrada'
    from candidatas c
    where v.id = c.id
    returning v.id, v.contribuicao_id
  ), auditadas as (
    insert into glasscode_private.founders_auditoria(autor_id, acao, alvo_tipo, alvo_id, empresa_id, detalhes)
    select auth.uid(), 'founders_votacao_encerrada_por_prazo', 'votacao', a.id, fc.empresa_id,
      jsonb_build_object('origem', 'prazo')
    from atualizadas a
    join public.founders_contribuicoes fc on fc.id = a.contribuicao_id
    returning 1
  )
  select count(*)::integer into encerradas from auditadas;
  return encerradas;
end $$;

-- 2) Montagem do resultado agregado (interno; sem autorização própria)
create or replace function public.gc_founders_montar_resultado_votacao(p_votacao_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select jsonb_build_object(
    'votacao_id', v.id,
    'contribuicao_id', v.contribuicao_id,
    'titulo', v.titulo,
    'status', v.status,
    'status_efetivo', case
      when v.status = 'aberta' and v.encerra_em is not null and v.encerra_em <= now() then 'encerrada'
      else v.status
    end,
    'abre_em', v.abre_em,
    'encerra_em', v.encerra_em,
    'total_votos', t.total,
    'favor', t.favor,
    'contra', t.contra,
    'abster', t.abster,
    'empresas_elegiveis', e.n,
    'participacao_percentual', round(100.0 * t.total / greatest(e.n, t.total, 1), 1),
    'resultado_consultivo', case
      when t.total = 0 then 'sem_votos'
      when t.favor > t.contra then 'favoravel'
      when t.contra > t.favor then 'contraria'
      else 'empate'
    end
  )
  from public.founders_votacoes v
  cross join lateral (
    select
      count(*)::integer as total,
      (count(*) filter (where fv.voto = 'favor'))::integer as favor,
      (count(*) filter (where fv.voto = 'contra'))::integer as contra,
      (count(*) filter (where fv.voto = 'abster'))::integer as abster
    from public.founders_votos fv
    where fv.votacao_id = v.id
  ) t
  cross join lateral (
    select count(*)::integer as n
    from public.founders_parceiros fp
    where fp.status = 'ativo'
      and fp.participacao_inicio <= (now() at time zone 'America/Sao_Paulo')::date
      and (fp.participacao_fim is null or fp.participacao_fim >= (now() at time zone 'America/Sao_Paulo')::date)
  ) e
  where v.id = p_votacao_id;
$$;

-- 3) Votar: mesma regra de negócio, agora com FOR SHARE para serializar com encerramento/cancelamento
create or replace function public.gc_founders_votar(
  p_votacao_id uuid,
  p_voto text,
  p_observacao text default ''
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare empresa uuid := public.gc_founders_empresa_id();
declare voto_id uuid;
declare votacao public.founders_votacoes;
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if not public.gc_founders_empresa_ativa(empresa) then
    raise exception 'Sua empresa não está ativa no programa Founders.' using errcode='42501';
  end if;
  select * into votacao from public.founders_votacoes where id = p_votacao_id for share;
  if votacao.id is null then
    raise exception 'Votação não encontrada.' using errcode='22023';
  end if;
  if votacao.status <> 'aberta' then
    raise exception 'A votação não está aberta.' using errcode='22023';
  end if;
  if votacao.abre_em is not null and now() < votacao.abre_em then
    raise exception 'A votação ainda não iniciou.' using errcode='22023';
  end if;
  if votacao.encerra_em is not null and now() > votacao.encerra_em then
    raise exception 'A votação já foi encerrada.' using errcode='22023';
  end if;
  insert into public.founders_votos(votacao_id, empresa_id, usuario_id, voto, observacao)
  values (p_votacao_id, empresa, auth.uid(), trim(p_voto), left(coalesce(p_observacao, ''), 1500))
  returning id into voto_id;
  return voto_id;
exception
  when unique_violation then
    raise exception 'Sua empresa já registrou voto nesta votação.' using errcode='22023';
end $$;

-- 4) Criar votação (rascunho) a partir de uma contribuição existente
create or replace function public.gc_founders_admin_criar_votacao(
  p_contribuicao_id uuid,
  p_titulo text,
  p_descricao text,
  p_abre_em timestamptz default null,
  p_encerra_em timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare empresa_contribuicao uuid;
declare c public.founders_contribuicoes;
declare v_titulo text := trim(coalesce(p_titulo, ''));
declare v_descricao text := trim(coalesce(p_descricao, ''));
declare nova_id uuid;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  if length(v_titulo) not between 3 and 180 then
    raise exception 'O título deve ter entre 3 e 180 caracteres.' using errcode='22023';
  end if;
  if length(v_descricao) not between 10 and 8000 then
    raise exception 'A descrição deve ter entre 10 e 8000 caracteres.' using errcode='22023';
  end if;
  if p_abre_em is not null and p_encerra_em is not null and p_encerra_em <= p_abre_em then
    raise exception 'O encerramento deve ser posterior à abertura.' using errcode='22023';
  end if;
  if p_encerra_em is not null and p_encerra_em <= now() then
    raise exception 'O encerramento deve estar no futuro.' using errcode='22023';
  end if;

  select fc.empresa_id into empresa_contribuicao
  from public.founders_contribuicoes fc
  where fc.id = p_contribuicao_id;
  if empresa_contribuicao is null then
    raise exception 'Contribuição não encontrada.' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_sync_empresa_' || empresa_contribuicao::text, 0));

  select * into c from public.founders_contribuicoes where id = p_contribuicao_id for update;
  if c.id is null then
    raise exception 'Contribuição não encontrada.' using errcode='22023';
  end if;
  if c.status not in ('enviada', 'em_triagem', 'em_votacao', 'aprovada') then
    raise exception 'Esta contribuição não pode receber uma votação no status atual.' using errcode='22023';
  end if;
  if exists (select 1 from public.founders_votacoes fv where fv.contribuicao_id = c.id) then
    raise exception 'Já existe uma votação para esta contribuição.' using errcode='22023';
  end if;

  insert into public.founders_votacoes(contribuicao_id, titulo, descricao, status, abre_em, encerra_em, criada_por)
  values (c.id, v_titulo, v_descricao, 'rascunho', p_abre_em, p_encerra_em, auth.uid())
  returning id into nova_id;

  perform public.gc_founders_registrar_auditoria(
    'founders_admin_criar_votacao', 'votacao', nova_id, c.empresa_id,
    jsonb_build_object('contribuicao_id', c.id, 'abre_em', p_abre_em, 'encerra_em', p_encerra_em)
  );
  perform public.gc_founders_sincronizar_votacoes();
  return nova_id;
end $$;

-- 5) Atualizar título, descrição e período enquanto a votação está em rascunho
create or replace function public.gc_founders_admin_atualizar_votacao(
  p_votacao_id uuid,
  p_titulo text,
  p_descricao text,
  p_abre_em timestamptz default null,
  p_encerra_em timestamptz default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare contribuicao uuid;
declare empresa_contribuicao uuid;
declare c public.founders_contribuicoes;
declare v public.founders_votacoes;
declare v_titulo text := trim(coalesce(p_titulo, ''));
declare v_descricao text := trim(coalesce(p_descricao, ''));
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  if length(v_titulo) not between 3 and 180 then
    raise exception 'O título deve ter entre 3 e 180 caracteres.' using errcode='22023';
  end if;
  if length(v_descricao) not between 10 and 8000 then
    raise exception 'A descrição deve ter entre 10 e 8000 caracteres.' using errcode='22023';
  end if;
  if p_abre_em is not null and p_encerra_em is not null and p_encerra_em <= p_abre_em then
    raise exception 'O encerramento deve ser posterior à abertura.' using errcode='22023';
  end if;
  if p_encerra_em is not null and p_encerra_em <= now() then
    raise exception 'O encerramento deve estar no futuro.' using errcode='22023';
  end if;

  select fv.contribuicao_id, fc.empresa_id into contribuicao, empresa_contribuicao
  from public.founders_votacoes fv
  join public.founders_contribuicoes fc on fc.id = fv.contribuicao_id
  where fv.id = p_votacao_id;
  if contribuicao is null then
    raise exception 'Votação não encontrada.' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_sync_empresa_' || empresa_contribuicao::text, 0));
  select * into c from public.founders_contribuicoes where id = contribuicao for update;
  select * into v from public.founders_votacoes where id = p_votacao_id for update;

  if v.id is null or c.id is null or v.contribuicao_id is distinct from c.id then
    raise exception 'A votação mudou durante a operação. Tente novamente.' using errcode='40001';
  end if;
  if v.status <> 'rascunho' then
    raise exception 'Somente votações em rascunho podem ser editadas.' using errcode='22023';
  end if;

  update public.founders_votacoes
  set titulo = v_titulo, descricao = v_descricao, abre_em = p_abre_em, encerra_em = p_encerra_em
  where id = v.id;

  perform public.gc_founders_registrar_auditoria(
    'founders_admin_atualizar_votacao', 'votacao', v.id, c.empresa_id,
    jsonb_build_object('abre_em', p_abre_em, 'encerra_em', p_encerra_em)
  );
  perform public.gc_founders_sincronizar_votacoes();
end $$;

-- 6) Abrir votação
create or replace function public.gc_founders_admin_abrir_votacao(p_votacao_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare contribuicao uuid;
declare empresa_contribuicao uuid;
declare c public.founders_contribuicoes;
declare v public.founders_votacoes;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;

  select fv.contribuicao_id, fc.empresa_id into contribuicao, empresa_contribuicao
  from public.founders_votacoes fv
  join public.founders_contribuicoes fc on fc.id = fv.contribuicao_id
  where fv.id = p_votacao_id;
  if contribuicao is null then
    raise exception 'Votação não encontrada.' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_sync_empresa_' || empresa_contribuicao::text, 0));
  select * into c from public.founders_contribuicoes where id = contribuicao for update;
  select * into v from public.founders_votacoes where id = p_votacao_id for update;

  if v.id is null or c.id is null or v.contribuicao_id is distinct from c.id then
    raise exception 'A votação mudou durante a operação. Tente novamente.' using errcode='40001';
  end if;
  if v.status <> 'rascunho' then
    raise exception 'Somente votações em rascunho podem ser abertas.' using errcode='22023';
  end if;
  if v.encerra_em is null or v.encerra_em <= now() then
    raise exception 'Defina um encerramento futuro antes de abrir a votação.' using errcode='22023';
  end if;
  if c.status not in ('enviada', 'em_triagem', 'em_votacao', 'aprovada') then
    raise exception 'A contribuição não pode receber votação no status atual.' using errcode='22023';
  end if;

  update public.founders_votacoes
  set status = 'aberta', abre_em = coalesce(abre_em, now())
  where id = v.id;

  update public.founders_contribuicoes
  set status = 'em_votacao'
  where id = c.id and status in ('enviada', 'em_triagem');

  perform public.gc_founders_registrar_auditoria(
    'founders_admin_abrir_votacao', 'votacao', v.id, c.empresa_id,
    jsonb_build_object('abre_em', coalesce(v.abre_em, now()), 'encerra_em', v.encerra_em)
  );
  perform public.gc_founders_sincronizar_votacoes();
end $$;

-- 7) Encerrar antecipadamente ou cancelar votação (votos são preservados)
create or replace function public.gc_founders_admin_encerrar_votacao(
  p_votacao_id uuid,
  p_cancelar boolean default false,
  p_motivo text default ''
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare contribuicao uuid;
declare empresa_contribuicao uuid;
declare c public.founders_contribuicoes;
declare v public.founders_votacoes;
declare expirada boolean;
declare motivo text := left(trim(coalesce(p_motivo, '')), 1000);
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;

  select fv.contribuicao_id, fc.empresa_id into contribuicao, empresa_contribuicao
  from public.founders_votacoes fv
  join public.founders_contribuicoes fc on fc.id = fv.contribuicao_id
  where fv.id = p_votacao_id;
  if contribuicao is null then
    raise exception 'Votação não encontrada.' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_sync_empresa_' || empresa_contribuicao::text, 0));
  select * into c from public.founders_contribuicoes where id = contribuicao for update;
  select * into v from public.founders_votacoes where id = p_votacao_id for update;

  if v.id is null or c.id is null or v.contribuicao_id is distinct from c.id then
    raise exception 'A votação mudou durante a operação. Tente novamente.' using errcode='40001';
  end if;

  expirada := v.status = 'aberta' and v.encerra_em is not null and v.encerra_em <= now();

  if coalesce(p_cancelar, false) then
    if v.status not in ('rascunho', 'aberta') or expirada then
      raise exception 'Somente votações em rascunho ou em andamento podem ser canceladas.' using errcode='22023';
    end if;
    update public.founders_votacoes set status = 'cancelada' where id = v.id;
    update public.founders_contribuicoes
    set status = 'em_triagem'
    where id = c.id and status = 'em_votacao';
  else
    if v.status <> 'aberta' then
      raise exception 'Somente votações abertas podem ser encerradas.' using errcode='22023';
    end if;
    if not expirada then
      if v.abre_em is null or v.abre_em >= now() then
        raise exception 'A votação ainda não iniciou; cancele-a em vez de encerrá-la.' using errcode='22023';
      end if;
      update public.founders_votacoes
      set status = 'encerrada', encerra_em = case when encerra_em is null or encerra_em > now() then now() else encerra_em end
      where id = v.id;
    else
      update public.founders_votacoes set status = 'encerrada' where id = v.id;
    end if;
  end if;

  perform public.gc_founders_registrar_auditoria(
    case when coalesce(p_cancelar, false) then 'founders_admin_cancelar_votacao' else 'founders_admin_encerrar_votacao' end,
    'votacao', v.id, c.empresa_id,
    jsonb_build_object('motivo', motivo, 'status_anterior', v.status)
  );
  perform public.gc_founders_sincronizar_votacoes();
end $$;

-- 8) Resultados agregados (administração): totais, participação e resultado consultivo
create or replace function public.gc_founders_admin_resultado_votacao(
  p_votacao_id uuid default null,
  p_pagina integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare deslocamento integer := greatest(0, least(coalesce(p_pagina, 0), 100000)) * 50;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  perform public.gc_founders_sincronizar_votacoes();
  return coalesce((
    select jsonb_agg(
      public.gc_founders_montar_resultado_votacao(v.id)
      || jsonb_build_object(
        'contribuicao_titulo', c.titulo,
        'contribuicao_status', c.status,
        'empresa_nome', e.nome,
        'criado_em', v.criado_em
      )
      order by v.criado_em desc, v.id
    )
    from (
      select fv.id, fv.contribuicao_id, fv.criado_em
      from public.founders_votacoes fv
      where p_votacao_id is null or fv.id = p_votacao_id
      order by fv.criado_em desc, fv.id
      limit 50 offset deslocamento
    ) v
    join public.founders_contribuicoes c on c.id = v.contribuicao_id
    join public.empresas e on e.id = c.empresa_id
  ), '[]'::jsonb);
end $$;

-- 9) Empresas participantes de uma votação, sem revelar a escolha
-- Necessária: administradoras têm SELECT em founders_votos via RLS, mas essa tabela contém a coluna "voto".
-- Esta RPC projeta somente empresa, número de fundador, participação e horário do voto.
create or replace function public.gc_founders_admin_participantes_votacao(p_votacao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  if not exists (select 1 from public.founders_votacoes where id = p_votacao_id) then
    raise exception 'Votação não encontrada.' using errcode='22023';
  end if;
  return jsonb_build_object(
    'votacao_id', p_votacao_id,
    'participantes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'empresa_id', fp.empresa_id,
          'empresa_nome', e.nome,
          'numero_fundador', fp.numero_fundador,
          'participou', fv.id is not null,
          'votou_em', fv.criado_em
        )
        order by fp.numero_fundador
      )
      from public.founders_parceiros fp
      join public.empresas e on e.id = fp.empresa_id
      left join public.founders_votos fv
        on fv.votacao_id = p_votacao_id and fv.empresa_id = fp.empresa_id
      where fv.id is not null
        or (
          fp.status = 'ativo'
          and fp.participacao_inicio <= hoje
          and (fp.participacao_fim is null or fp.participacao_fim >= hoje)
        )
    ), '[]'::jsonb)
  );
end $$;

-- 10) Resultados agregados para parceiros (somente votações finalizadas; sem identificação de votos)
create or replace function public.gc_founders_resultados_votacoes()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if not (public.gc_founders_admin() or public.gc_founders_empresa_ativa()) then
    raise exception 'Sua empresa não está ativa no programa Founders.' using errcode='42501';
  end if;
  perform public.gc_founders_sincronizar_votacoes();
  return coalesce((
    select jsonb_agg(
      public.gc_founders_montar_resultado_votacao(v.id) - 'contribuicao_id' - 'status'
      order by v.encerra_em desc nulls last, v.id
    )
    from (
      select fv.id, fv.encerra_em
      from public.founders_votacoes fv
      where fv.status = 'encerrada'
        or (fv.status = 'aberta' and fv.encerra_em is not null and fv.encerra_em <= now())
      order by fv.encerra_em desc nulls last, fv.id
      limit 20
    ) v
  ), '[]'::jsonb);
end $$;

-- 11) Privilégios de execução
revoke execute on function
  public.gc_founders_sincronizar_votacoes(),
  public.gc_founders_montar_resultado_votacao(uuid)
from public, anon, authenticated;

revoke execute on function
  public.gc_founders_admin_criar_votacao(uuid,text,text,timestamptz,timestamptz),
  public.gc_founders_admin_atualizar_votacao(uuid,text,text,timestamptz,timestamptz),
  public.gc_founders_admin_abrir_votacao(uuid),
  public.gc_founders_admin_encerrar_votacao(uuid,boolean,text),
  public.gc_founders_admin_resultado_votacao(uuid,integer),
  public.gc_founders_admin_participantes_votacao(uuid),
  public.gc_founders_resultados_votacoes(),
  public.gc_founders_votar(uuid,text,text)
from public, anon;

grant execute on function
  public.gc_founders_admin_criar_votacao(uuid,text,text,timestamptz,timestamptz),
  public.gc_founders_admin_atualizar_votacao(uuid,text,text,timestamptz,timestamptz),
  public.gc_founders_admin_abrir_votacao(uuid),
  public.gc_founders_admin_encerrar_votacao(uuid,boolean,text),
  public.gc_founders_admin_resultado_votacao(uuid,integer),
  public.gc_founders_admin_participantes_votacao(uuid),
  public.gc_founders_resultados_votacoes(),
  public.gc_founders_votar(uuid,text,text)
to authenticated;

-- 12) Agendamento opcional do encerramento automático (somente se pg_cron já estiver habilitado)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.schedule(
        'founders_sincronizar_votacoes',
        '* * * * *',
        'select public.gc_founders_sincronizar_votacoes();'
      );
    exception when others then
      raise notice 'Não foi possível agendar o pg_cron (%). Agende manualmente: select public.gc_founders_sincronizar_votacoes();', sqlerrm;
    end;
  else
    raise notice 'pg_cron não habilitado. O status persistido será sincronizado pelas RPCs administrativas; habilite pg_cron e agende gc_founders_sincronizar_votacoes().';
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
