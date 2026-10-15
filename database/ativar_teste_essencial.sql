-- Executar DEPOIS de painel_testes.sql. O prazo começa nesta ativação.
begin;
do $$
declare conta uuid;
begin
  if to_regprocedure('public.gc_painel_testes(text,integer)') is null then
    raise exception 'Execute painel_testes.sql antes de liberar esta conta.';
  end if;
  select id into strict conta from auth.users
    where id='b43d05af-cdd8-405e-9287-c0d427bc22df'
      and email='testeessencial@glasscode.com.br';
  update auth.users set banned_until=null,
    raw_app_meta_data=jsonb_set(coalesce(raw_app_meta_data,'{}'::jsonb),'{gc_teste}',
      jsonb_build_object('dias',5,'inicio_em',now(),'expira_em',now()+interval '5 days')),
    updated_at=now()
  where id=conta and raw_app_meta_data->'gc_teste'->>'pendente'='true';
end $$;
commit;
