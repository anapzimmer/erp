-- Apenas NOVOS cadastros. Requer o controle base de painel_testes.sql.
-- Instala o iniciador/gatilho se ausentes; mantém o gatilho de criação de empresa/perfil.
-- Aplicar em produção somente com autorização; não altera prazos existentes.
begin;
do $$ begin
  if to_regprocedure('public.gc_teste_valido()') is null
    or to_regprocedure('public.gc_acesso_permitido()') is null
    or to_regprocedure('public.gc_minha_situacao()') is null then
    raise exception 'Falta o controle base de acesso e validade do teste (painel_testes.sql).';
  end if;
  if exists (select 1 from pg_trigger where tgrelid='auth.users'::regclass
    and tgname='gc_teste_novo_cadastro' and not tgisinternal
    and (tgfoid is distinct from to_regprocedure('public.gc_iniciar_teste_cadastro()')::oid
      or tgtype <> 7 or tgenabled not in ('O','A') or tgqual is not null)) then
    raise exception 'Gatilho existente difere do esperado. Revise antes de continuar.';
  end if;
end $$;
create or replace function public.gc_iniciar_teste_cadastro()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.raw_app_meta_data->'gc_teste' is null or new.raw_app_meta_data->'gc_teste'='null'::jsonb then
    new.raw_app_meta_data := jsonb_set(coalesce(new.raw_app_meta_data,'{}'::jsonb),'{gc_teste}',
      jsonb_build_object('dias',3,'inicio_em',now(),'expira_em',now()+interval '72 hours'));
  end if;
  return new;
end $$;
revoke all on function public.gc_iniciar_teste_cadastro() from public,anon,authenticated;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid='auth.users'::regclass
    and tgname='gc_teste_novo_cadastro' and not tgisinternal) then
    create trigger gc_teste_novo_cadastro before insert on auth.users
      for each row execute function public.gc_iniciar_teste_cadastro();
  end if;
end $$;
commit;
-- Verificação: select pg_get_functiondef('public.gc_iniciar_teste_cadastro()'::regprocedure);
-- Reversão: restaurar a definição anterior da função (5 dias / 120 hours).
-- A reversão só afeta futuros cadastros, sem estender os testes existentes.
-- Se função e gatilho eram ausentes: a reversão é remover SOMENTE
-- gc_teste_novo_cadastro em auth.users e public.gc_iniciar_teste_cadastro().
-- Não remover gc_teste_valido/gc_acesso_permitido: testes já iniciados continuam válidos.
-- Não alterar on_auth_user_created nem dados existentes durante a reversão.
