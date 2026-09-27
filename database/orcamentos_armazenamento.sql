-- Armazenamento de orçamentos. Execute no SQL Editor do Supabase.
-- A instalação não apaga orçamentos e mantém retenção ilimitada por padrão.
begin;
create schema if not exists glasscode_private;
create table if not exists glasscode_private.retencao_admins (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 empresa_id uuid not null references public.empresas(id) on delete cascade
);
create table if not exists glasscode_private.retencao_config (
 empresa_id uuid primary key references public.empresas(id) on delete cascade,
 dias integer check (dias in (30,90,180,365)), atualizado_em timestamptz not null default now()
);
alter table public.orcamentos add column if not exists gc_alterado_em timestamptz not null default now();
alter table public.orcamentos add column if not exists gc_excluido_em timestamptz;
create index if not exists orcamentos_retencao_idx on public.orcamentos(empresa_id,gc_excluido_em,gc_alterado_em);
-- Registros antigos recebem a data da instalação: nenhum é vencido retroativamente.
create or replace function glasscode_private.orcamento_data() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' or (to_jsonb(new)-'gc_alterado_em'-'gc_excluido_em') is distinct from (to_jsonb(old)-'gc_alterado_em'-'gc_excluido_em') then
  new.gc_alterado_em=now();
 elsif old.gc_excluido_em is not null and new.gc_excluido_em is null then new.gc_alterado_em=now();
 else new.gc_alterado_em=old.gc_alterado_em; end if;
 return new;
end $$;
drop trigger if exists gc_orcamento_data on public.orcamentos;
create trigger gc_orcamento_data before insert or update on public.orcamentos for each row execute function glasscode_private.orcamento_data();
-- Política restritiva se soma às regras de isolamento já existentes.
alter table public.orcamentos enable row level security;
drop policy if exists gc_ocultar_lixeira on public.orcamentos;
create policy gc_ocultar_lixeira on public.orcamentos as restrictive for all to authenticated using(gc_excluido_em is null) with check(gc_excluido_em is null);

create or replace function glasscode_private.orcamento_protegido(o jsonb) returns boolean language plpgsql stable security definer set search_path='' as $$
declare vinculo record; encontrado boolean; estado text;
begin
 estado=lower(trim(coalesce(nullif(o->>'status',''),o->>'situacao','')));
 -- Só reconhecemos estados explicitamente descartáveis. Estados desconhecidos são preservados.
 if estado not in ('','rascunho','pendente','aberto','em aberto','orcamento','orçamento','cancelado','recusado','rejeitado') then return true; end if;
 if coalesce(o->>'aprovado','false') <> 'false' or nullif(o->>'aprovado_em','') is not null then return true; end if;
 if nullif(o->>'pedido_id','') is not null or nullif(o->>'obra_id','') is not null then return true; end if;
 -- Um nome/referência textual não constitui vínculo com uma obra cadastrada.
 -- Preserva também vínculos reais por FK, inclusive itens de pedidos/obras de outros módulos.
 for vinculo in select ns.nspname,cl.relname,at.attname from pg_catalog.pg_constraint c
 join pg_catalog.pg_class cl on cl.oid=c.conrelid join pg_catalog.pg_namespace ns on ns.oid=cl.relnamespace
 join pg_catalog.pg_attribute at on at.attrelid=c.conrelid and at.attnum=c.conkey[1]
 where c.contype='f' and c.confrelid='public.orcamentos'::regclass loop
  execute format('select exists(select 1 from %I.%I where %I::text=$1)',vinculo.nspname,vinculo.relname,vinculo.attname) into encontrado using o->>'id';
  if encontrado then return true; end if;
 end loop;
 return false;
end $$;

-- Impede que rotinas antigas pulem a lixeira, mesmo executadas pelo agendador.
create or replace function glasscode_private.proteger_exclusao_orcamento() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.gc_excluido_em is null or old.gc_excluido_em > now()-interval '30 days' or glasscode_private.orcamento_protegido(to_jsonb(old)) then
  raise exception 'Use a lixeira de orçamentos. Exclusão definitiva exige 30 dias e ausência de vínculos.';
 end if;
 return old;
end $$;
drop trigger if exists gc_proteger_exclusao on public.orcamentos;
create trigger gc_proteger_exclusao before delete on public.orcamentos for each row execute function glasscode_private.proteger_exclusao_orcamento();

create or replace function public.gc_armazenamento(p_acao text default 'consultar', p_dias integer default null, p_antes timestamptz default null, p_ids uuid[] default null, p_email text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare empresa uuid; dona boolean; autorizado boolean; resultado jsonb; n integer; alvo uuid; alvo_empresa uuid;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 dona=coalesce(public.gc_proprietaria(),false);
 select empresa_id into empresa from public.perfis_usuarios where id=auth.uid();
 if empresa is null then raise exception 'Empresa não identificada.'; end if;
 autorizado=dona or exists(select 1 from glasscode_private.retencao_admins where usuario_id=auth.uid() and empresa_id=empresa);
 if p_acao in ('autorizar','revogar') then
  if not dona then raise exception 'Somente a proprietária Glass Code pode autorizar responsáveis.'; end if;
  select u.id,p.empresa_id into alvo,alvo_empresa from auth.users u join public.perfis_usuarios p on p.id=u.id where lower(u.email)=lower(trim(p_email));
  if alvo is null or alvo_empresa is null then raise exception 'Usuário com empresa vinculada não encontrado.'; end if;
  if p_acao='autorizar' then insert into glasscode_private.retencao_admins values(alvo,alvo_empresa) on conflict(usuario_id) do update set empresa_id=excluded.empresa_id;
  else delete from glasscode_private.retencao_admins where usuario_id=alvo; end if;
  return jsonb_build_object('ok',true);
 end if;
 if p_acao='consultar' then
  return jsonb_build_object('autorizado',autorizado,'proprietaria',dona,'dias',(select dias from glasscode_private.retencao_config where empresa_id=empresa));
 end if;
 if not autorizado then raise exception 'Solicite autorização à Glass Code para administrar o armazenamento.'; end if;
 if p_acao='configurar' then
  if p_dias is not null and p_dias not in (30,90,180,365) then raise exception 'Prazo inválido.'; end if;
  insert into glasscode_private.retencao_config values(empresa,p_dias,now()) on conflict(empresa_id) do update set dias=excluded.dias,atualizado_em=now();
  return jsonb_build_object('ok',true);
 elsif p_acao in ('previa','limpar') then
  if p_antes is null or p_antes>now() then raise exception 'Informe uma data de corte no passado.'; end if;
  if p_acao='previa' then
   select coalesce(jsonb_agg(x),'[]'::jsonb) into resultado from (
    select id,numero_formatado,cliente_nome,valor_total,gc_alterado_em from public.orcamentos o where empresa_id=empresa and gc_excluido_em is null and gc_alterado_em<p_antes and not glasscode_private.orcamento_protegido(to_jsonb(o)) order by gc_alterado_em limit 500
   ) x;
   return resultado;
  end if;
  if coalesce(array_length(p_ids,1),0) not between 1 and 500 then raise exception 'Revise de 1 a 500 orçamentos por vez.'; end if;
  -- Bloqueia edição concorrente antes de revalidar todos os critérios.
  perform 1 from public.orcamentos where empresa_id=empresa and id=any(p_ids) for update;
  update public.orcamentos o set gc_excluido_em=now() where empresa_id=empresa and id=any(p_ids) and gc_excluido_em is null and gc_alterado_em<p_antes and not glasscode_private.orcamento_protegido(to_jsonb(o));
  get diagnostics n=row_count; return jsonb_build_object('quantidade',n);
 elsif p_acao='lixeira' then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into resultado from (select id,numero_formatado,cliente_nome,gc_excluido_em from public.orcamentos where empresa_id=empresa and gc_excluido_em is not null order by gc_excluido_em desc limit 500) x;
  return resultado;
 elsif p_acao='restaurar' then
  update public.orcamentos set gc_excluido_em=null where empresa_id=empresa and id=any(p_ids) and gc_excluido_em>now()-interval '30 days';
  get diagnostics n=row_count; return jsonb_build_object('quantidade',n);
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.gc_armazenamento(text,integer,timestamptz,uuid[],text) from public,anon;
grant execute on function public.gc_armazenamento(text,integer,timestamptz,uuid[],text) to authenticated;

create or replace function glasscode_private.executar_retencao() returns void language plpgsql security definer set search_path='' as $$
begin
 update public.orcamentos o set gc_excluido_em=now() from glasscode_private.retencao_config c where c.empresa_id=o.empresa_id and c.dias is not null and o.gc_excluido_em is null and o.gc_alterado_em<now()-make_interval(days=>c.dias) and not glasscode_private.orcamento_protegido(to_jsonb(o));
 delete from public.orcamentos o where gc_excluido_em<now()-interval '30 days' and not glasscode_private.orcamento_protegido(to_jsonb(o));
end $$;
revoke all on function glasscode_private.proteger_exclusao_orcamento(), glasscode_private.orcamento_data(), glasscode_private.orcamento_protegido(jsonb), glasscode_private.executar_retencao() from public,anon,authenticated;
revoke all on glasscode_private.retencao_admins, glasscode_private.retencao_config from public,anon,authenticated;
drop policy if exists gc_sem_exclusao_direta on public.orcamentos;
create policy gc_sem_exclusao_direta on public.orcamentos as restrictive for delete to authenticated using(false);
commit;
-- Ative a extensão pg_cron no Supabase e execute o arquivo de agendamento junto.
