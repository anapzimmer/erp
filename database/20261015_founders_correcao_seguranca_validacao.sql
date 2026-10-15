-- Validação pós-correção (executar após 20261015_founders_correcao_seguranca.sql)
-- Somente leitura.

-- 1) Novas colunas de participação
select
  column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'founders_parceiros'
  and column_name in ('participacao_inicio', 'participacao_fim')
order by column_name;

-- 2) Grants diretos de INSERT removidos
select
  table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in ('founders_contribuicoes', 'founders_contribuicao_anexos', 'founders_votos', 'founders_resgates')
  and privilege_type = 'INSERT'
order by table_name;

-- 3) Políticas de INSERT removidas dos alvos
select
  schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('founders_contribuicoes', 'founders_contribuicao_anexos', 'founders_votos')
  and cmd = 'INSERT'
order by tablename, policyname;

-- 4) Política de leitura das votações aberta para participantes ativos
select
  schemaname, tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'founders_votacoes'
  and policyname = 'founders_votacoes_select';

-- 5) Índice de estorno único disponível
select
  indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'founders_pontos_ledger'
  and indexname = 'founders_pontos_ref_estorno_unica_idx';

-- 6) Storage (configuração manual via painel): validar bucket e políticas esperadas
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'founders-anexos';

select
  schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'founders_storage_select',
    'founders_storage_insert',
    'founders_storage_update',
    'founders_storage_delete'
  )
order by policyname;

-- 7) Assinaturas das funções críticas
select
  to_regprocedure('public.gc_founders_empresa_ativa(uuid)') as gc_founders_empresa_ativa,
  to_regprocedure('public.gc_founders_anexar_contribuicao(uuid,text,text,text,text,bigint,text)') as gc_founders_anexar_contribuicao,
  to_regprocedure('public.gc_founders_admin_ajustar_pontos(uuid,text,integer,text,text,uuid)') as gc_founders_admin_ajustar_pontos,
  to_regprocedure('public.gc_founders_resgatar_beneficio(uuid,integer,text,text)') as gc_founders_resgatar_beneficio,
  to_regprocedure('public.gc_founders_admin_atualizar_contribuicao(uuid,text,integer,text)') as gc_founders_admin_atualizar_contribuicao;

-- 8) Funções SECURITY DEFINER e grants críticos
select
  p.oid::regprocedure as funcao,
  p.prosecdef as security_definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'gc_founders_empresa_ativa',
    'gc_founders_anexar_contribuicao',
    'gc_founders_admin_ajustar_pontos',
    'gc_founders_resgatar_beneficio',
    'gc_founders_admin_atualizar_contribuicao',
    'gc_founders_registrar_auditoria',
    'gc_founders_bloquear_alteracao_ledger'
  )
order by funcao::text;

-- 9) Escrita direta removida para authenticated
select
  table_name,
  privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in (
    'founders_parceiros',
    'founders_contribuicoes',
    'founders_contribuicao_anexos',
    'founders_votacoes',
    'founders_votos',
    'founders_pontos_ledger',
    'founders_beneficios',
    'founders_resgates'
  )
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
order by table_name, privilege_type;

-- 10) Validação de anexos consulta storage.objects e metadados reais
select
  position('from storage.objects' in lower(pg_get_functiondef('public.gc_founders_anexar_contribuicao(uuid,text,text,text,text,bigint,text)'::regprocedure))) > 0
    as consulta_storage_objects,
  position('metadata' in lower(pg_get_functiondef('public.gc_founders_anexar_contribuicao(uuid,text,text,text,text,bigint,text)'::regprocedure))) > 0
    as valida_metadata_storage;
