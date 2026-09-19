-- Executar como postgres no SQL Editor. A transação não altera dados comerciais.
begin;

create schema if not exists glasscode_private;
revoke all on schema glasscode_private from public, anon, authenticated;

create table if not exists glasscode_private.proprietaria (
  singleton boolean primary key default true check (singleton),
  usuario_id uuid not null unique references auth.users(id) on delete restrict
);
create table if not exists glasscode_private.acessos (
  tipo text not null check (tipo in ('empresa', 'usuario')),
  alvo_id uuid not null,
  bloqueado boolean not null,
  motivo text not null,
  atualizado_em timestamptz not null default now(),
  primary key (tipo, alvo_id)
);
create table if not exists glasscode_private.historico (
  id bigint generated always as identity primary key,
  autor_id uuid not null,
  tipo text not null,
  alvo_id uuid not null,
  alvo_nome text not null,
  bloqueado boolean not null,
  motivo text not null,
  criado_em timestamptz not null default now()
);
revoke all on all tables in schema glasscode_private from public, anon, authenticated;
revoke all on all sequences in schema glasscode_private from public, anon, authenticated;

-- O e-mail serve somente para localizar a conta na primeira instalação.
-- Reexecutar a migração não concede acesso a uma nova conta com o mesmo e-mail.
do $$
declare conta uuid;
begin
  if not exists (select 1 from glasscode_private.proprietaria) then
    select id into strict conta from auth.users
      where lower(email) = 'engenheiraceo@gmail.com' and email_confirmed_at is not null;
    insert into glasscode_private.proprietaria(usuario_id) values (conta);
  end if;
end $$;

create or replace function public.gc_proprietaria()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from glasscode_private.proprietaria where usuario_id = auth.uid());
$$;

create or replace function public.gc_acesso_permitido()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (public.gc_proprietaria() or not exists (
    select 1 from glasscode_private.acessos a where a.bloqueado and (
      (a.tipo = 'usuario' and a.alvo_id = auth.uid()) or
      (a.tipo = 'empresa' and exists (
        select 1 from public.perfis_usuarios p where p.id = auth.uid() and p.empresa_id::text = a.alvo_id::text
      ))
    )
  ));
$$;

create or replace function public.gc_painel(p_busca text default '', p_pagina integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare resultado jsonb; deslocamento integer := greatest(0, least(coalesce(p_pagina, 0), 100000)) * 50;
begin
  if not public.gc_proprietaria() then raise exception 'Acesso exclusivo da proprietária' using errcode = '42501'; end if;
  with empresas as (
    select e.id, e.nome, coalesce(a.bloqueado, false) bloqueado,
      coalesce(a.motivo, '') motivo,
      exists(select 1 from public.perfis_usuarios p join glasscode_private.proprietaria o on o.usuario_id = p.id where p.empresa_id = e.id) protegida,
      (select count(*) from public.perfis_usuarios p where p.empresa_id = e.id) usuarios
    from public.empresas e left join glasscode_private.acessos a on a.tipo = 'empresa' and a.alvo_id = e.id
  ), usuarios as (
    select u.id, u.email, u.created_at criado_em, u.last_sign_in_at ultimo_acesso,
      u.email_confirmed_at is not null confirmado, p.empresa_id, e.nome empresa,
      coalesce(a.bloqueado, false) bloqueado, coalesce(a.motivo, '') motivo,
      coalesce(ae.bloqueado, false) empresa_bloqueada,
      exists(select 1 from glasscode_private.proprietaria o where o.usuario_id = u.id) protegida
    from auth.users u left join public.perfis_usuarios p on p.id = u.id
    left join public.empresas e on e.id = p.empresa_id
    left join glasscode_private.acessos a on a.tipo = 'usuario' and a.alvo_id = u.id
    left join glasscode_private.acessos ae on ae.tipo = 'empresa' and ae.alvo_id = p.empresa_id
  )
  select jsonb_build_object(
    'resumo', jsonb_build_object('empresas', (select count(*) from empresas),
      'usuarios', (select count(*) from usuarios), 'bloqueadas', (select count(*) from empresas where bloqueado),
      'pendentes', (select count(*) from usuarios where not confirmado)),
    'empresas', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select * from empresas where nome ilike '%' || left(coalesce(p_busca,''),100) || '%' order by nome, id limit 50 offset deslocamento
    ) t), '[]'::jsonb),
    'usuarios', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select * from usuarios where coalesce(email,'') ilike '%' || left(coalesce(p_busca,''),100) || '%' or coalesce(empresa,'') ilike '%' || left(coalesce(p_busca,''),100) || '%'
      order by criado_em desc, id limit 50 offset deslocamento
    ) t), '[]'::jsonb),
    'historico', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select * from glasscode_private.historico order by id desc limit 100
    ) t), '[]'::jsonb)
  ) into resultado;
  return resultado;
end $$;

create or replace function public.gc_alterar_acesso(p_tipo text, p_alvo uuid, p_bloqueado boolean, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare nome text; anterior boolean;
begin
  if not public.gc_proprietaria() then raise exception 'Acesso exclusivo da proprietária' using errcode = '42501'; end if;
  if p_tipo is null or p_tipo not in ('empresa','usuario') or p_alvo is null or p_bloqueado is null
    or p_motivo is null or length(trim(p_motivo)) < 3 or length(p_motivo) > 500 then
    raise exception 'Informe um alvo válido e um motivo entre 3 e 500 caracteres' using errcode = '22023';
  end if;
  -- Serializa alterações do mesmo alvo; histórico e estado são gravados juntos.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tipo || p_alvo::text, 0));
  if p_tipo = 'usuario' then
    select email into nome from auth.users where id = p_alvo;
    if exists(select 1 from glasscode_private.proprietaria where usuario_id = p_alvo) then
      raise exception 'A conta da proprietária é protegida' using errcode = '22023';
    end if;
  else
    select e.nome into nome from public.empresas e where e.id = p_alvo;
    if exists(select 1 from public.perfis_usuarios p join glasscode_private.proprietaria o on o.usuario_id = p.id where p.empresa_id = p_alvo) then
      raise exception 'A empresa da proprietária é protegida' using errcode = '22023';
    end if;
  end if;
  if nome is null then raise exception 'Cadastro não encontrado' using errcode = '22023'; end if;
  select bloqueado into anterior from glasscode_private.acessos where tipo = p_tipo and alvo_id = p_alvo;
  if coalesce(anterior, false) = p_bloqueado then return; end if;
  insert into glasscode_private.acessos(tipo, alvo_id, bloqueado, motivo)
    values(p_tipo, p_alvo, p_bloqueado, trim(p_motivo)) on conflict(tipo, alvo_id)
    do update set bloqueado = excluded.bloqueado, motivo = excluded.motivo, atualizado_em = now();
  insert into glasscode_private.historico(autor_id, tipo, alvo_id, alvo_nome, bloqueado, motivo)
    values(auth.uid(), p_tipo, p_alvo, nome, p_bloqueado, trim(p_motivo));
end $$;

revoke all on function public.gc_proprietaria() from public, anon, authenticated;
revoke all on function public.gc_acesso_permitido() from public, anon, authenticated;
revoke all on function public.gc_painel(text, integer) from public, anon, authenticated;
revoke all on function public.gc_alterar_acesso(text, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.gc_proprietaria(), public.gc_acesso_permitido(), public.gc_painel(text, integer), public.gc_alterar_acesso(text, uuid, boolean, text) to authenticated;

-- Restringe acesso mesmo com um token já emitido. Mantém as políticas de isolamento existentes.
-- Tabelas privadas sem RLS exigem correção antes da ativação, em vez de uma falsa proteção.
do $$
declare t record;
begin
  for t in
    select c.oid, c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p') and (
      c.relrowsecurity or c.relname in ('empresas','perfis_usuarios') or exists (
        select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'empresa_id' and not a.attisdropped
      )
    )
  loop
    if not t.relrowsecurity then
      raise exception 'Ativação interrompida: a tabela public.% precisa de RLS e políticas de isolamento antes de instalar o painel.', t.relname;
    end if;
    execute format('drop policy if exists gc_acesso_plataforma on public.%I', t.relname);
    execute format('create policy gc_acesso_plataforma on public.%I as restrictive for all to authenticated using ((select public.gc_acesso_permitido())) with check ((select public.gc_acesso_permitido()))', t.relname);
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
