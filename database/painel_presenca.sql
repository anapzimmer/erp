-- Execute após a instalação do painel da plataforma.
begin;
create table if not exists glasscode_private.presenca_sessoes (
  sessao_id uuid primary key references auth.sessions(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  visto_em timestamptz not null default now()
);
alter table glasscode_private.presenca_sessoes enable row level security;
revoke all on glasscode_private.presenca_sessoes from public, anon, authenticated;

create or replace function public.gc_registrar_presenca()
returns void language plpgsql security definer set search_path = '' as $$
declare sessao uuid := (auth.jwt()->>'session_id')::uuid;
begin
  if auth.uid() is null or sessao is null or not exists (
    select 1 from auth.sessions s where s.id=sessao and s.user_id=auth.uid()
      and (s.not_after is null or s.not_after > now())
  ) then raise exception 'Sessão inválida' using errcode='42501'; end if;
  insert into glasscode_private.presenca_sessoes(sessao_id,usuario_id,visto_em)
  values(sessao,auth.uid(),now()) on conflict(sessao_id) do update set visto_em=now();
end $$;

create or replace function public.gc_consultar_presenca(p_usuarios uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.gc_proprietaria() then raise exception 'Acesso exclusivo da proprietária' using errcode='42501'; end if;
  if coalesce(cardinality(p_usuarios),0)>50 then raise exception 'Limite excedido' using errcode='22023'; end if;
  return coalesce((select jsonb_object_agg(t.usuario_id,jsonb_build_object('online',t.online,'visto_em',t.visto_em)) from (
    select p.usuario_id,max(p.visto_em) visto_em,
      bool_or(p.visto_em>now()-interval '90 seconds' and (s.not_after is null or s.not_after>now())) online
    from glasscode_private.presenca_sessoes p join auth.sessions s on s.id=p.sessao_id
    where p.usuario_id=any(p_usuarios) group by p.usuario_id
  ) t),'{}'::jsonb);
end $$;
revoke all on function public.gc_registrar_presenca() from public,anon,authenticated;
revoke all on function public.gc_consultar_presenca(uuid[]) from public,anon,authenticated;
grant execute on function public.gc_registrar_presenca() to authenticated;
grant execute on function public.gc_consultar_presenca(uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
