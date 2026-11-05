-- Executar no SQL Editor. Somente definições técnicas; nenhuma linha de clientes.
-- Copie o JSON da única célula retornada para concluir a compatibilidade das migrations.
SELECT jsonb_pretty(jsonb_build_object(
  'funcoes', (SELECT jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'nome', p.proname,
    'assinatura', pg_get_function_identity_arguments(p.oid),
    'definicao', pg_get_functiondef(p.oid), 'permissoes', p.proacl,
    'proprietario', pg_get_userbyid(p.proowner)))
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','glasscode_private') AND p.prokind='f'
    AND (p.proname LIKE 'gc_asaas_%' OR p.proname IN
      ('gc_empresa_para_contratacao','gc_minha_situacao','gc_acesso_permitido','gc_teste_valido','gc_assinatura_paga_vigente'))),
  'colunas', (SELECT jsonb_agg(to_jsonb(c)) FROM information_schema.columns c
    WHERE c.table_schema='glasscode_private' AND c.table_name LIKE 'asaas_%'),
  'restricoes', (SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,
    'nome',k.conname,'definicao',pg_get_constraintdef(k.oid)))
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='glasscode_private' AND c.relname LIKE 'asaas_%'),
  'rls', (SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,
    'ativa',c.relrowsecurity,'forcada',c.relforcerowsecurity,'permissoes',c.relacl))
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='glasscode_private' AND c.relname LIKE 'asaas_%' AND c.relkind='r'),
  'politicas', (SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p
    WHERE p.schemaname='glasscode_private' AND p.tablename LIKE 'asaas_%'),
  'gatilhos', (SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,
    'definicao',pg_get_triggerdef(t.oid),'ativo',t.tgenabled))
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname='glasscode_private' AND c.relname LIKE 'asaas_%')
)) AS diagnostico_tecnico;
