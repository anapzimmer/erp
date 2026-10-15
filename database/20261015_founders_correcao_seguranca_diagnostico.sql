-- Diagnóstico pré-correção (executar antes de 20261015_founders_correcao_seguranca.sql)
-- Somente leitura.

-- 1) Estruturas esperadas
select
  to_regclass('public.founders_parceiros') as founders_parceiros,
  to_regclass('public.founders_contribuicoes') as founders_contribuicoes,
  to_regclass('public.founders_contribuicao_anexos') as founders_contribuicao_anexos,
  to_regclass('public.founders_votacoes') as founders_votacoes,
  to_regclass('public.founders_votos') as founders_votos,
  to_regclass('public.founders_pontos_ledger') as founders_pontos_ledger,
  to_regclass('public.founders_beneficios') as founders_beneficios,
  to_regclass('public.founders_resgates') as founders_resgates,
  to_regclass('glasscode_private.founders_admins') as founders_admins,
  to_regclass('glasscode_private.founders_auditoria') as founders_auditoria,
  to_regclass('storage.objects') as storage_objects,
  to_regclass('storage.buckets') as storage_buckets;

select
  to_regprocedure('public.gc_founders_admin()') as gc_founders_admin,
  to_regprocedure('public.gc_founders_empresa_ativa(uuid)') as gc_founders_empresa_ativa,
  to_regprocedure('public.gc_founders_anexar_contribuicao(uuid,text,text,text,text,bigint,text)') as gc_founders_anexar_contribuicao,
  to_regprocedure('public.gc_founders_resgatar_beneficio(uuid,integer,text,text)') as gc_founders_resgatar_beneficio,
  to_regprocedure('public.gc_founders_admin_ajustar_pontos(uuid,text,integer,text,text,uuid)') as gc_founders_admin_ajustar_pontos,
  to_regprocedure('public.gc_founders_admin_atualizar_contribuicao(uuid,text,integer,text)') as gc_founders_admin_atualizar_contribuicao;

-- 1.1) Bucket founders-anexos existe?
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
from storage.buckets
where id = 'founders-anexos';

-- 2) Checar anexos incompatíveis com as novas regras de bucket/caminho
select
  count(*) as anexos_invalidos
from public.founders_contribuicao_anexos a
where a.storage_bucket <> 'founders-anexos'
   or a.storage_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.+$';

select
  a.id, a.empresa_id, a.storage_bucket, a.storage_path, a.criado_em
from public.founders_contribuicao_anexos a
where a.storage_bucket <> 'founders-anexos'
   or a.storage_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.+$'
order by a.criado_em desc
limit 50;

-- 3) Duplicidade potencial de estornos no ledger
select
  empresa_id, origem, referencia_id, tipo, count(*) as qtd
from public.founders_pontos_ledger
where referencia_id is not null
  and tipo in ('estorno_credito', 'estorno_debito')
group by empresa_id, origem, referencia_id, tipo
having count(*) > 1
order by qtd desc, empresa_id
limit 100;

-- 4) Duplicidade potencial de créditos/débitos por referência
select
  empresa_id, origem, referencia_id, tipo, count(*) as qtd
from public.founders_pontos_ledger
where referencia_id is not null
  and tipo in ('credito', 'debito')
group by empresa_id, origem, referencia_id, tipo
having count(*) > 1
order by qtd desc, empresa_id
limit 100;

-- 5) Verificar privilégios diretos de INSERT para authenticated
select
  table_schema, table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in ('founders_contribuicoes', 'founders_contribuicao_anexos', 'founders_votos', 'founders_resgates')
  and privilege_type = 'INSERT'
order by table_name;

-- 6) Verificar políticas de INSERT ainda existentes
select
  schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('founders_contribuicoes', 'founders_contribuicao_anexos', 'founders_votos', 'founders_resgates')
  and cmd = 'INSERT'
order by tablename, policyname;

-- 7) Participação e ciclo de avaliação atuais
select
  status,
  count(*) as total
from public.founders_parceiros
group by status
order by status;

select
  id, empresa_id, numero_fundador, data_adesao, ciclo_avaliacao_inicio, ciclo_avaliacao_fim, status
from public.founders_parceiros
order by criado_em desc
limit 50;

-- 8) Colunas de ownership no Storage (compatibilidade de validação de anexos)
select
  c.column_name,
  c.data_type
from information_schema.columns c
where c.table_schema = 'storage'
  and c.table_name = 'objects'
  and c.column_name in ('owner', 'owner_id', 'metadata')
order by c.column_name;

-- 9) EXECUTE em funções sensíveis
select
  p.oid::regprocedure as funcao,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'gc_founders_registrar_auditoria',
    'gc_founders_bloquear_alteracao_ledger',
    'gc_founders_admin_ajustar_pontos',
    'gc_founders_admin_atualizar_contribuicao',
    'gc_founders_anexar_contribuicao',
    'gc_founders_empresa_ativa'
  )
order by funcao::text;
