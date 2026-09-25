-- Pré-requisitos: tabelas suporte_chamados/suporte_mensagens e painel da proprietária.
-- Leitura individual: não modifica políticas ou mensagens do suporte existente.
begin;
create table if not exists glasscode_private.suporte_leituras (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  chamado_id uuid not null references public.suporte_chamados(id) on delete cascade,
  lido_ate timestamptz not null,
  primary key(usuario_id,chamado_id)
);
alter table glasscode_private.suporte_leituras enable row level security;
revoke all on glasscode_private.suporte_leituras from public,anon,authenticated;
create index if not exists suporte_mensagens_notificacoes_idx on public.suporte_mensagens(chamado_id,autor_tipo,created_at);

create or replace function public.gc_suporte_notificacoes()
returns jsonb language plpgsql security definer set search_path='' as $$
declare administradora boolean := coalesce(public.gc_proprietaria(),false); resultado jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501'; end if;
  with pendentes as (
    select c.id,c.titulo,ultima.em
    from public.suporte_chamados c
    left join glasscode_private.suporte_leituras l on l.chamado_id=c.id and l.usuario_id=auth.uid()
    cross join lateral (
      select max(evento.em) em from (
        select c.created_at em where administradora and c.usuario_id is distinct from auth.uid()
        union all
        select m.created_at from public.suporte_mensagens m where m.chamado_id=c.id
          and m.autor_tipo=case when administradora then 'cliente' else 'glass_code' end
          and m.usuario_id is distinct from auth.uid()
      ) evento
    ) ultima
    where (administradora or exists(select 1 from public.perfis_usuarios p where p.id=auth.uid() and p.empresa_id=c.empresa_id))
      and ultima.em>coalesce(l.lido_ate,'-infinity'::timestamptz)
  ) select jsonb_build_object('administradora',administradora,'total',(select count(*) from pendentes),
      'chamados',coalesce((select jsonb_agg(to_jsonb(t)) from (select * from pendentes order by em desc,id limit 10) t),'[]'::jsonb)) into resultado;
  return resultado;
end $$;

create or replace function public.gc_suporte_marcar_lido(p_chamado_id uuid,p_ate timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.suporte_chamados c where c.id=p_chamado_id
    and (coalesce(public.gc_proprietaria(),false) or exists(select 1 from public.perfis_usuarios p where p.id=auth.uid() and p.empresa_id=c.empresa_id)))
    then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_ate is null or p_ate>now() then raise exception 'Data inválida' using errcode='22023'; end if;
  insert into glasscode_private.suporte_leituras(usuario_id,chamado_id,lido_ate) values(auth.uid(),p_chamado_id,p_ate)
  on conflict(usuario_id,chamado_id) do update set lido_ate=greatest(glasscode_private.suporte_leituras.lido_ate,excluded.lido_ate);
end $$;
revoke all on function public.gc_suporte_notificacoes() from public,anon,authenticated;
revoke all on function public.gc_suporte_marcar_lido(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.gc_suporte_notificacoes() to authenticated;
grant execute on function public.gc_suporte_marcar_lido(uuid,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;
