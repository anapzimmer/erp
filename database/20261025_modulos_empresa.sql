begin;
create table if not exists glasscode_private.modulos_empresa (
 empresa_id uuid primary key references public.empresas(id) on delete cascade,
 gestao boolean not null default false,
 producao boolean not null default false,
 atualizado_em timestamptz not null default now(),
 check (not producao or gestao)
);
create table if not exists glasscode_private.modulos_historico (
 id bigint generated always as identity primary key,
 empresa_id uuid not null,
 autor_id uuid not null,
 anterior jsonb,
 novo jsonb not null,
 motivo text not null,
 criado_em timestamptz not null default now()
);
revoke all on glasscode_private.modulos_empresa, glasscode_private.modulos_historico from public, anon, authenticated;
alter table glasscode_private.modulos_empresa enable row level security;
alter table glasscode_private.modulos_historico enable row level security;

-- Toda futura tabela operacional deve aplicar esta função em USING e WITH CHECK.
-- Empresa vem da linha protegida, nunca de um campo confiado ao navegador.
create or replace function public.gc_modulo_permitido(p_empresa uuid, p_modulo text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and p_modulo in ('gestao','producao')
 and public.gc_acesso_permitido() and public.gc_teste_valido()
 and exists(select 1 from public.perfis_usuarios p where p.id=auth.uid() and p.empresa_id=p_empresa)
 and exists(select 1 from glasscode_private.modulos_empresa m where m.empresa_id=p_empresa
   and m.gestao and (p_modulo='gestao' or m.producao));
$$;
create or replace function public.gc_meus_modulos()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('gestao', coalesce(bool_or(public.gc_modulo_permitido(p.empresa_id,'gestao')),false),
 'producao', coalesce(bool_or(public.gc_modulo_permitido(p.empresa_id,'producao')),false))
 from public.perfis_usuarios p where p.id=auth.uid();
$$;
create or replace function public.gc_modulos_admin(p_empresa uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.gc_proprietaria() then raise exception 'Acesso negado' using errcode='42501'; end if;
 if not exists(select 1 from public.empresas where id=p_empresa) then raise exception 'Empresa inexistente'; end if;
 return jsonb_build_object('gestao',coalesce((select gestao from glasscode_private.modulos_empresa where empresa_id=p_empresa),false),
 'producao',coalesce((select producao from glasscode_private.modulos_empresa where empresa_id=p_empresa),false),
 'historico',coalesce((select jsonb_agg(t) from (select anterior,novo,motivo,criado_em from glasscode_private.modulos_historico where empresa_id=p_empresa order by id desc limit 20) t),'[]'::jsonb));
end $$;
create or replace function public.gc_salvar_modulos(p_empresa uuid,p_gestao boolean,p_producao boolean,p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
declare antes jsonb;
begin
 if not public.gc_proprietaria() then raise exception 'Acesso negado' using errcode='42501'; end if;
 if p_gestao is null or p_producao is null or p_motivo is null or length(trim(p_motivo)) not between 3 and 500 or (p_producao and not p_gestao) then raise exception 'Informe módulos e motivo válidos' using errcode='22023'; end if;
 perform 1 from public.empresas where id=p_empresa for update;
 if not found then raise exception 'Empresa inexistente'; end if;
 select to_jsonb(m) into antes from glasscode_private.modulos_empresa m where empresa_id=p_empresa;
 insert into glasscode_private.modulos_empresa(empresa_id,gestao,producao) values(p_empresa,p_gestao,p_producao)
 on conflict(empresa_id) do update set gestao=excluded.gestao,producao=excluded.producao,atualizado_em=now();
 insert into glasscode_private.modulos_historico(empresa_id,autor_id,anterior,novo,motivo)
 values(p_empresa,auth.uid(),antes,jsonb_build_object('gestao',p_gestao,'producao',p_producao),trim(p_motivo));
end $$;
revoke all on function public.gc_modulo_permitido(uuid,text),public.gc_meus_modulos(),public.gc_modulos_admin(uuid),public.gc_salvar_modulos(uuid,boolean,boolean,text) from public,anon;
grant execute on function public.gc_modulo_permitido(uuid,text),public.gc_meus_modulos(),public.gc_modulos_admin(uuid),public.gc_salvar_modulos(uuid,boolean,boolean,text) to authenticated;
commit;
