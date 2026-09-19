-- Somente consulta: reúne tabelas sem RLS e a família de tipologias.
-- Um único resultado evita o SQL Editor mostrar somente a última consulta.
select
  c.relname as tabela,
  c.relrowsecurity as rls_ativo,
  (
    select string_agg(a.attname || ' (' || pg_catalog.format_type(a.atttypid, a.atttypmod) || ')', ', ' order by a.attnum)
    from pg_attribute a
    where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  ) as colunas,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'nome', p.policyname, 'tipo', p.permissive, 'papeis', p.roles,
      'operacao', p.cmd, 'leitura', p.qual, 'gravacao', p.with_check
    ) order by p.policyname)
    from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
  ), '[]'::jsonb) as politicas,
  coalesce((
    select jsonb_agg(pg_get_constraintdef(k.oid))
    from pg_constraint k where k.conrelid = c.oid and k.contype = 'f'
  ), '[]'::jsonb) as vinculos
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and (not c.relrowsecurity or c.relname like 'tipologias%')
order by c.relname;
