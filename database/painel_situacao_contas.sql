-- Gestão de situação. Não suspende por vencimento automaticamente e não exclui dados.
begin;
alter table glasscode_private.acessos add column if not exists situacao text;
alter table glasscode_private.acessos add column if not exists categoria text not null default 'outro';
alter table glasscode_private.acessos add column if not exists mensagem_cliente text not null default '';
alter table glasscode_private.acessos add column if not exists contato text not null default '';
alter table glasscode_private.acessos add column if not exists prazo date;
alter table glasscode_private.acessos add column if not exists inicio_em timestamptz not null default now();
update glasscode_private.acessos set situacao=case when bloqueado then 'suspensa_outro' else 'ativa' end where situacao is null;
alter table glasscode_private.acessos alter column situacao set default 'ativa';
alter table glasscode_private.acessos alter column situacao set not null;
alter table glasscode_private.historico add column if not exists situacao text;
alter table glasscode_private.historico add column if not exists detalhes jsonb;

create or replace function public.gc_definir_situacao(p_tipo text,p_alvo uuid,p_situacao text,p_categoria text,p_motivo text,p_mensagem text,p_contato text,p_prazo date)
returns void language plpgsql security definer set search_path='' as $$
declare nome text; bloqueio boolean; antes jsonb; depois jsonb;
begin
  if not public.gc_proprietaria() then raise exception 'Acesso exclusivo da proprietária' using errcode='42501'; end if;
  if p_tipo is null or p_tipo not in ('empresa','usuario') or p_alvo is null
    or p_situacao is null or p_situacao not in ('ativa','pagamento_pendente','regularizacao','suspensa_inadimplencia','suspensa_outro','cancelada')
    or p_categoria is null or p_categoria not in ('inadimplencia','solicitacao_cliente','fim_teste','seguranca','outro')
    or length(trim(coalesce(p_motivo,''))) not between 3 and 500
    or length(coalesce(p_mensagem,''))>1000 or length(coalesce(p_contato,''))>200 then
    raise exception 'Confira a situação, o motivo e os limites dos campos' using errcode='22023';
  end if;
  if p_situacao='regularizacao' and (p_prazo is null or p_prazo<(now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'Informe um prazo de regularização a partir de hoje' using errcode='22023';
  end if;
  if p_situacao in ('pagamento_pendente','suspensa_inadimplencia') and p_categoria<>'inadimplencia' then
    raise exception 'Esta situação exige motivo de inadimplência' using errcode='22023';
  end if;
  if p_situacao='suspensa_outro' and p_categoria='inadimplencia' then
    raise exception 'Para inadimplência, selecione a suspensão por inadimplência' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tipo||p_alvo::text,0));
  if p_tipo='usuario' then
    select email into nome from auth.users where id=p_alvo;
    if exists(select 1 from glasscode_private.proprietaria where usuario_id=p_alvo) then raise exception 'A conta da proprietária é protegida' using errcode='22023'; end if;
  else
    select e.nome into nome from public.empresas e where e.id=p_alvo;
    if exists(select 1 from public.perfis_usuarios p join glasscode_private.proprietaria o on o.usuario_id=p.id where p.empresa_id=p_alvo) then raise exception 'A empresa da proprietária é protegida' using errcode='22023'; end if;
  end if;
  if nome is null then raise exception 'Cadastro não encontrado' using errcode='22023'; end if;
  select to_jsonb(a) into antes from glasscode_private.acessos a where tipo=p_tipo and alvo_id=p_alvo;
  bloqueio:=p_situacao in ('suspensa_inadimplencia','suspensa_outro','cancelada');
  insert into glasscode_private.acessos(tipo,alvo_id,bloqueado,motivo,situacao,categoria,mensagem_cliente,contato,prazo,inicio_em)
    values(p_tipo,p_alvo,bloqueio,trim(p_motivo),p_situacao,p_categoria,trim(coalesce(p_mensagem,'')),trim(coalesce(p_contato,'')),case when p_situacao='regularizacao' then p_prazo else null end,now())
    on conflict(tipo,alvo_id) do update set bloqueado=excluded.bloqueado,motivo=excluded.motivo,situacao=excluded.situacao,categoria=excluded.categoria,
      mensagem_cliente=excluded.mensagem_cliente,contato=excluded.contato,prazo=excluded.prazo,
      inicio_em=case when acessos.situacao=excluded.situacao then acessos.inicio_em else now() end,atualizado_em=now()
    returning to_jsonb(acessos.*) into depois;
  insert into glasscode_private.historico(autor_id,tipo,alvo_id,alvo_nome,bloqueado,motivo,situacao,detalhes)
    values(auth.uid(),p_tipo,p_alvo,nome,bloqueio,trim(p_motivo),p_situacao,jsonb_build_object('antes',antes,'depois',depois));
end $$;

-- Compatibilidade: comandos antigos continuam sincronizando estado e auditoria.
create or replace function public.gc_alterar_acesso(p_tipo text,p_alvo uuid,p_bloqueado boolean,p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_bloqueado is null then raise exception 'Situação inválida' using errcode='22023'; end if;
  perform public.gc_definir_situacao(p_tipo,p_alvo,case when p_bloqueado then 'suspensa_outro' else 'ativa' end,'outro',p_motivo,'','',null);
end $$;

create or replace function public.gc_painel_situacoes(p_busca text default '',p_pagina integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare painel jsonb; grupo text; itens jsonb;
begin
  painel:=public.gc_painel(p_busca,p_pagina);
  foreach grupo in array array['empresas','usuarios'] loop
    select coalesce(jsonb_agg(e.item||jsonb_build_object('situacao',coalesce(a.situacao,'ativa'),'categoria',coalesce(a.categoria,'outro'),
      'mensagem_cliente',coalesce(a.mensagem_cliente,''),'contato',coalesce(a.contato,''),'prazo',a.prazo,'inicio_em',a.inicio_em) order by e.ord),'[]'::jsonb)
      into itens from jsonb_array_elements(painel->grupo) with ordinality e(item,ord)
      left join glasscode_private.acessos a on a.alvo_id::text=e.item->>'id' and a.tipo=case grupo when 'empresas' then 'empresa' else 'usuario' end;
    painel:=jsonb_set(painel,array[grupo],itens);
  end loop;
  return painel;
end $$;

-- Retorna somente a mensagem pública para a própria conta. Nunca expõe notas internas.
create or replace function public.gc_minha_situacao()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a glasscode_private.acessos;
begin
  if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501'; end if;
  if public.gc_proprietaria() then return jsonb_build_object('permitido',true,'situacao','ativa'); end if;
  select x.* into a from glasscode_private.acessos x where x.situacao<>'ativa' and (
    (x.tipo='usuario' and x.alvo_id=auth.uid()) or (x.tipo='empresa' and exists(select 1 from public.perfis_usuarios p where p.id=auth.uid() and p.empresa_id=x.alvo_id))
  ) order by x.bloqueado desc,case x.situacao when 'cancelada' then 0 when 'suspensa_inadimplencia' then 1 when 'suspensa_outro' then 2 when 'regularizacao' then 3 else 4 end,x.atualizado_em desc limit 1;
  return jsonb_build_object('permitido',public.gc_acesso_permitido(),'situacao',coalesce(a.situacao,'ativa'),
    'mensagem',coalesce(a.mensagem_cliente,''),'contato',coalesce(a.contato,''),'prazo',a.prazo,'inicio_em',a.inicio_em,
    'prazo_vencido',coalesce(a.prazo<(now() at time zone 'America/Sao_Paulo')::date,false));
end $$;
revoke all on function public.gc_definir_situacao(text,uuid,text,text,text,text,text,date),public.gc_painel_situacoes(text,integer),public.gc_minha_situacao() from public,anon,authenticated;
grant execute on function public.gc_definir_situacao(text,uuid,text,text,text,text,text,date),public.gc_painel_situacoes(text,integer),public.gc_minha_situacao() to authenticated;
notify pgrst,'reload schema';
commit;
