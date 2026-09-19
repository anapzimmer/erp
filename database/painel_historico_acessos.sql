-- Atualização somente de consulta; não modifica o fluxo de autenticação.
begin;
create or replace function public.gc_historico_acessos(p_busca text default '', p_pagina integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare consulta text; resultado jsonb;
begin
  if not public.gc_proprietaria() then raise exception 'Acesso exclusivo da proprietária' using errcode='42501'; end if;
  consulta := 'select null::text id, null::text usuario_id, null::text email, null::text acao, null::timestamptz criado_em where false';
  if to_regclass('auth.audit_log_entries') is not null then
    consulta := 'select a.id::text, a.payload->>''actor_id'', a.payload->>''actor_username'', a.payload->>''action'', a.created_at
      from auth.audit_log_entries a where a.payload->>''action'' in (''login'',''logout'',''mfa_code_login'')';
  end if;
  execute '
    with auditoria(id,usuario_id,email,acao,criado_em) as (' || consulta || '), eventos as (
      select id,usuario_id,email,acao,criado_em,''auditoria''::text origem from auditoria
      union all
      select ''ultimo-''||u.id::text,u.id::text,u.email,''ultimo_login'',u.last_sign_in_at,''ultimo_login''
      from auth.users u where u.last_sign_in_at is not null and not exists (
        select 1 from auditoria a where a.usuario_id=u.id::text and a.acao in (''login'',''mfa_code_login'')
          and a.criado_em >= u.last_sign_in_at - interval ''1 minute''
      )
    ), lista as (
      select ev.id,ev.usuario_id,coalesce(nullif(ev.email,''''),u.email,''Conta não identificada'') email,
        e.nome empresa,ev.acao,ev.criado_em,ev.origem
      from eventos ev left join auth.users u on u.id::text=ev.usuario_id
      left join public.perfis_usuarios p on p.id=u.id left join public.empresas e on e.id=p.empresa_id
      where coalesce(ev.email,u.email,'''') ilike ''%''||$1||''%'' or coalesce(e.nome,'''') ilike ''%''||$1||''%''
      order by ev.criado_em desc,ev.id limit 50 offset $2
    ) select jsonb_build_object(''eventos'',coalesce((select jsonb_agg(to_jsonb(l)) from lista l),''[]''::jsonb))'
    into resultado using left(coalesce(p_busca,''),100),greatest(0,least(coalesce(p_pagina,0),100000))*50;
  return resultado;
end $$;
revoke all on function public.gc_historico_acessos(text,integer) from public,anon,authenticated;
grant execute on function public.gc_historico_acessos(text,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
