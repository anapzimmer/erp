-- Testes de segurança e consistência do Founders
-- Executar somente após:
-- 1) 20261015_founders_fundacao.sql
-- 2) 20261015_founders_correcao_seguranca.sql
--
-- O script roda em transação e finaliza com ROLLBACK.
-- Não mantém dados persistidos.

begin;

do $$
declare
  v_admin_user uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_empresa_a uuid;
  v_empresa_b uuid;
  v_beneficio_id uuid;
  v_contribuicao_id uuid;
  v_credito_id uuid;
  v_debito_id uuid;
  v_saldo integer;
  v_count integer;
  v_key_base text := 'founders-teste-' || replace(gen_random_uuid()::text, '-', '');
begin
  if to_regprocedure('public.gc_founders_admin_ajustar_pontos(uuid,text,integer,text,text,uuid)') is null then
    raise exception 'Pré-requisito ausente: função gc_founders_admin_ajustar_pontos.';
  end if;
  if to_regprocedure('public.gc_founders_admin_atualizar_contribuicao(uuid,text,integer,text)') is null then
    raise exception 'Pré-requisito ausente: função gc_founders_admin_atualizar_contribuicao.';
  end if;

  select fa.user_id
  into v_admin_user
  from glasscode_private.founders_admins fa
  where fa.ativo is true
  order by fa.criado_em asc
  limit 1;

  if v_admin_user is null then
    raise exception 'Teste bloqueado: nenhum usuário ativo em founders_admins.';
  end if;

  select pu.id, pu.empresa_id
  into v_user_a, v_empresa_a
  from public.perfis_usuarios pu
  join public.founders_parceiros fp on fp.empresa_id = pu.empresa_id
  left join glasscode_private.founders_admins fa on fa.user_id = pu.id and fa.ativo is true
  where fp.status = 'ativo'
    and fa.user_id is null
  order by pu.id
  limit 1;

  if v_user_a is null then
    select pu.id, pu.empresa_id
    into v_user_a, v_empresa_a
    from public.perfis_usuarios pu
    join public.founders_parceiros fp on fp.empresa_id = pu.empresa_id
    where fp.status = 'ativo'
    order by pu.id
    limit 1;
  end if;

  if v_user_a is null then
    raise exception 'Teste bloqueado: nenhuma usuária vinculada a empresa Founders ativa.';
  end if;

  select pu.id, pu.empresa_id
  into v_user_b, v_empresa_b
  from public.perfis_usuarios pu
  join public.founders_parceiros fp on fp.empresa_id = pu.empresa_id
  where fp.status = 'ativo'
    and pu.empresa_id <> v_empresa_a
  order by pu.id
  limit 1;

  if v_user_b is null then
    raise exception 'Teste bloqueado: é necessário ao menos 2 empresas ativas para validar isolamento.';
  end if;

  insert into public.founders_beneficios(
    codigo, nome, descricao, pontos_necessarios, limite_por_empresa, estoque_total, ativo
  )
  values (
    'TESTE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    'Benefício Teste Founders',
    'Benefício temporário para validação da correção de segurança.',
    25,
    50,
    500,
    true
  )
  returning id into v_beneficio_id;

  -- TESTE 1: gc_founders_empresa_ativa não permite consultar empresa arbitrária
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  begin
    perform public.gc_founders_empresa_ativa(v_empresa_b);
    raise exception 'Falha: consulta de empresa arbitrária deveria ser negada.';
  exception
    when sqlstate '42501' then
      null;
  end;

  -- TESTE 2: crédito, débito e estorno com validações fortes
  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);

  select public.gc_founders_admin_ajustar_pontos(
    v_empresa_a,
    'credito',
    120,
    'Crédito de teste',
    v_key_base || '-credito',
    null
  ) into v_credito_id;

  select public.gc_founders_admin_ajustar_pontos(
    v_empresa_a,
    'debito',
    20,
    'Débito de teste',
    v_key_base || '-debito',
    null
  ) into v_debito_id;

  perform public.gc_founders_admin_ajustar_pontos(
    v_empresa_a,
    'estorno_debito',
    20,
    'Estorno do débito de teste',
    v_key_base || '-estorno-debito',
    v_debito_id
  );

  begin
    perform public.gc_founders_admin_ajustar_pontos(
      v_empresa_a,
      'estorno_credito',
      121,
      'Estorno inválido acima do crédito',
      v_key_base || '-estorno-credito-invalido',
      v_credito_id
    );
    raise exception 'Falha: estorno acima do crédito original deveria falhar.';
  exception
    when sqlstate '22023' then
      null;
  end;

  perform public.gc_founders_admin_ajustar_pontos(
    v_empresa_a,
    'estorno_credito',
    60,
    'Estorno parcial do crédito de teste',
    v_key_base || '-estorno-credito',
    v_credito_id
  );

  begin
    perform public.gc_founders_admin_ajustar_pontos(
      v_empresa_a,
      'estorno_credito',
      10,
      'Estorno duplicado do mesmo lançamento',
      v_key_base || '-estorno-credito-duplicado',
      v_credito_id
    );
    raise exception 'Falha: estorno duplicado deveria ser bloqueado.';
  exception
    when sqlstate '22023' then
      null;
  end;

  -- TESTE 3: rejeição/reaprovação sem crédito indevido
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  select public.gc_founders_criar_contribuicao(
    'Contribuição de teste de segurança',
    'Contribuição criada para validar rejeição, estorno e reaprovação.',
    'Produto',
    v_key_base || '-contribuicao'
  ) into v_contribuicao_id;

  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  perform public.gc_founders_admin_atualizar_contribuicao(
    v_contribuicao_id,
    'aprovada',
    15,
    'Aprovação de teste'
  );

  select c.pontos_concedidos
  into v_count
  from public.founders_contribuicoes c
  where c.id = v_contribuicao_id;
  if coalesce(v_count, 0) <> 15 then
    raise exception 'Falha: contribuição aprovada sem pontos esperados (esperado 15, atual %).', coalesce(v_count, 0);
  end if;

  perform public.gc_founders_admin_atualizar_contribuicao(
    v_contribuicao_id,
    'rejeitada',
    null,
    'Rejeição de teste'
  );

  select c.pontos_concedidos
  into v_count
  from public.founders_contribuicoes c
  where c.id = v_contribuicao_id;
  if coalesce(v_count, -1) <> 0 then
    raise exception 'Falha: contribuição rejeitada deveria ficar com pontos_concedidos = 0.';
  end if;

  begin
    perform public.gc_founders_admin_atualizar_contribuicao(
      v_contribuicao_id,
      'aprovada',
      15,
      'Tentativa de reaprovação após estorno'
    );
    raise exception 'Falha: reaprovação após estorno deveria exigir ajuste administrativo manual.';
  exception
    when sqlstate '22023' then
      null;
  end;

  -- TESTE 4: resgate (idempotência) e sincronização por empresa
  perform public.gc_founders_admin_ajustar_pontos(
    v_empresa_a,
    'credito',
    200,
    'Saldo para teste de resgate',
    v_key_base || '-saldo-resgate',
    null
  );

  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform public.gc_founders_resgatar_beneficio(
    v_beneficio_id,
    1,
    v_key_base || '-resgate',
    'Resgate de teste'
  );

  begin
    perform public.gc_founders_resgatar_beneficio(
      v_beneficio_id,
      1,
      v_key_base || '-resgate',
      'Resgate de teste duplicado'
    );
    raise exception 'Falha: idempotência de resgate deveria bloquear duplicidade.';
  exception
    when sqlstate '22023' then
      null;
  end;

  if not exists (
    select 1
    from pg_proc p
    where p.proname = 'gc_founders_admin_ajustar_pontos'
      and pg_get_functiondef(p.oid) ilike '%founders_sync_empresa_%'
  ) then
    raise exception 'Falha: lock por empresa não encontrado em gc_founders_admin_ajustar_pontos.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.proname = 'gc_founders_resgatar_beneficio'
      and pg_get_functiondef(p.oid) ilike '%founders_sync_empresa_%'
  ) then
    raise exception 'Falha: lock por empresa não encontrado em gc_founders_resgatar_beneficio.';
  end if;

  -- TESTE 5: isolamento entre empresas (RLS e função)
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);

  if exists (
    select 1
    from public.founders_contribuicoes c
    where c.id = v_contribuicao_id
  ) then
    raise exception 'Falha: isolamento RLS violado. Empresa B conseguiu enxergar contribuição da empresa A.';
  end if;

  begin
    perform public.gc_founders_empresa_ativa(v_empresa_a);
    raise exception 'Falha: empresa B não deveria consultar o status da empresa A.';
  exception
    when sqlstate '42501' then
      null;
  end;

  -- TESTE 6: privilégios de EXECUTE e escrita direta
  if has_function_privilege(
    'authenticated',
    'public.gc_founders_registrar_auditoria(text,text,uuid,uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Falha: authenticated não deve ter EXECUTE em gc_founders_registrar_auditoria.';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.gc_founders_bloquear_alteracao_ledger()',
    'EXECUTE'
  ) then
    raise exception 'Falha: authenticated não deve ter EXECUTE em gc_founders_bloquear_alteracao_ledger.';
  end if;

  select count(*)
  into v_count
  from information_schema.role_table_grants g
  where g.grantee = 'authenticated'
    and g.table_schema = 'public'
    and g.table_name in (
      'founders_contribuicoes',
      'founders_contribuicao_anexos',
      'founders_votos',
      'founders_resgates',
      'founders_pontos_ledger'
    )
    and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE');

  if v_count > 0 then
    raise exception 'Falha: authenticated ainda possui privilégios diretos de escrita em tabelas Founders.';
  end if;

  select public.gc_founders_saldo_pontos(v_empresa_a) into v_saldo;
  if v_saldo < 0 then
    raise exception 'Falha: saldo da empresa A ficou negativo (%).', v_saldo;
  end if;
end $$;

rollback;
