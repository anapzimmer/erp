-- Execute no SQL Editor como postgres, após orcamentos_armazenamento.sql.
begin;
do $$ begin
 if to_regprocedure('glasscode_private.executar_retencao()') is null then
  raise exception 'Execute primeiro orcamentos_armazenamento.sql.';
 end if;
end $$;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
do $$ begin
 if to_regclass('cron.job') is null then
  raise exception 'Habilite pg_cron em Integrations > Cron no Supabase e execute novamente.';
 end if;
 if not exists(select 1 from cron.job where jobname='glasscode-retencao-orcamentos') then
  perform cron.schedule('glasscode-retencao-orcamentos','15 3 * * *','select glasscode_private.executar_retencao()');
 end if;
end $$;
commit;
select jobname, schedule, active from cron.job where jobname='glasscode-retencao-orcamentos';
