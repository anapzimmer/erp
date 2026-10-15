-- Testes de segurança e consistência do Founders
-- Executar somente após:
-- 1) 20261015_founders_fundacao.sql
-- 2) 20261015_founders_correcao_seguranca.sql
--
-- Regras deste script:
-- - roda em transação;
-- - cria parceiros Founders temporários para duas empresas que ainda não participam do Founders;
-- - não usa COMMIT;
-- - termina com ROLLBACK (sem efeitos persistentes).
--
-- Observação importante:
-- Para não alterar dados reais de autenticação nem parceiros já existentes,
-- o script reutiliza usuários já existentes em auth.users/perfis_usuarios
-- e só seleciona empresas sem registro prévio em public.founders_parceiros.

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
  v_contribuicao_bloqueio_id uuid;
  v_credito_contribuicao_id uuid;
  v_estorno_contribuicao_id uuid;
  v_credito_id uuid;
  v_debito_id uuid;
  v_saldo integer;
  v_pontos_concedidos integer;
  v_count integer;
  v_key_base text := 'founders-teste-' || replace(gen_random_uuid()::text, '-', '');
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if to_regprocedure('public.gc_founders_admin_ajustar_pontos(uuid,text,integer,text,text,uuid)') is null then
    raise exception 'Pré-requisito ausente: função gc_founders_admin_ajustar_pontos.';
  end if;
  if to_regprocedure('public.gc_founders_admin_atualizar_contribuicao(uuid,text,integer,text)') is null then
    raise exception 'Pré-requisito ausente: função gc_founders_admin_atualizar_contribuicao.';
  end if;
  if to_regclass('public.perfis_usuarios') is null then
    raise exception 'Pré-requisito ausente: tabela public.perfis_usuarios.';
  end if;

  select fa.usuario_id
  into v_admin_user
  from glasscode_private.founders_admins fa
  where fa.ativo is true
  order by fa.criado_em asc
  limit 1;

  if v_admin_user is null then
    raise exception 'Teste bloqueado: nenhum usuário ativo em founders_admins.';
  end if;

  -- Usuária A (não-admin, quando possível)
  select pu.id, pu.empresa_id
  into v_user_a, v_empresa_a
  from public.perfis_usuarios pu
  where pu.empresa_id is not null
    and not exists (
      select 1
      from public.founders_parceiros fp
      where fp.empresa_id = pu.empresa_id
    )
    and pu.id <> v_admin_user
    and not exists (
      select 1
      from glasscode_private.founders_admins fa
      where fa.usuario_id = pu.id
        and fa.ativo is true
    )
  order by pu.id
  limit 1;

  if v_user_a is null then
    raise exception 'Teste bloqueado: não foi possível encontrar usuária A em empresa sem parceiro Founders. Use homologação com dados fictícios.';
  end if;

  -- Usuária B de empresa diferente
  select pu.id, pu.empresa_id
  into v_user_b, v_empresa_b
  from public.perfis_usuarios pu
  where pu.empresa_id is not null
    and not exists (
      select 1
      from public.founders_parceiros fp
      where fp.empresa_id = pu.empresa_id
    )
    and pu.id <> v_admin_user
    and pu.id <> v_user_a
    and pu.empresa_id <> v_empresa_a
  order by pu.id
  limit 1;

  if v_user_b is null then
    raise exception 'Teste bloqueado: é necessário ao menos 2 empresas distintas sem parceiro Founders. Use homologação com dados fictícios.';
  end if;

  -- Parceiros Founders temporários (somente para empresas sem parceiro prévio).
  insert into public.founders_parceiros(
    empresa_id,
    status,
    data_adesao,
    ciclo_avaliacao_inicio,
    ciclo_avaliacao_fim,
    participacao_inicio,
    participacao_fim,
    valor_mensal_acordado,
    quantidade_usuarios_inclusos
  )
  values
    (
      v_empresa_a, 'ativo', v_hoje, v_hoje, v_hoje + 90, v_hoje, null, 39.90, 3
    ),
    (
      v_empresa_b, 'ativo', v_hoje, v_hoje, v_hoje + 90, v_hoje, null, 39.90, 3
    );

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

  -- TESTE 1: gc_founders_empresa_ativa não permite consultar empresa arbitrária (não-admin)
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  begin
    perform public.gc_founders_empresa_ativa(v_empresa_b);
    raise exception 'Falha: consulta de empresa arbitrária deveria ser negada.';
  exception
    when sqlstate '42501' then
      null;
  end;

  -- TESTE 2: crédito, débito e estorno com validações fortes (admin)
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
  into v_pontos_concedidos
  from public.founders_contribuicoes c
  where c.id = v_contribuicao_id;

  if coalesce(v_pontos_concedidos, 0) <> 15 then
    raise exception 'Falha: contribuição aprovada sem pontos esperados (esperado 15, atual %).', coalesce(v_pontos_concedidos, 0);
  end if;

  select l.id
  into v_credito_contribuicao_id
  from public.founders_pontos_ledger l
  where l.empresa_id = v_empresa_a
    and l.idempotency_key = 'contribuicao_credito:' || v_contribuicao_id::text
    and l.tipo = 'credito'
    and l.origem = 'contribuicao'
    and l.referencia_id = v_contribuicao_id
  order by l.criado_em desc
  limit 1;

  if v_credito_contribuicao_id is null then
    raise exception 'Falha: crédito de contribuição deve usar origem=contribuicao e referencia_id da contribuição.';
  end if;

  perform public.gc_founders_admin_atualizar_contribuicao(
    v_contribuicao_id,
    'rejeitada',
    null,
    'Rejeição de teste'
  );

  -- Regra efetiva atual: pontos_concedidos permanece histórico na contribuição;
  -- neutralização ocorre no ledger com estorno.
  select c.pontos_concedidos
  into v_pontos_concedidos
  from public.founders_contribuicoes c
  where c.id = v_contribuicao_id;

  if coalesce(v_pontos_concedidos, 0) <> 15 then
    raise exception 'Falha: pontos_concedidos deveria permanecer 15 após rejeição estornada (valor histórico). Atual: %.', coalesce(v_pontos_concedidos, 0);
  end if;

  if not exists (
    select 1
    from public.founders_pontos_ledger l
    where l.empresa_id = v_empresa_a
      and l.idempotency_key = 'contribuicao_estorno:' || v_contribuicao_id::text
      and l.tipo = 'estorno_credito'
      and l.origem = 'estorno'
      and l.referencia_id = v_credito_contribuicao_id
      and l.lancamento_relacionado_id = v_credito_contribuicao_id
      and l.pontos = 15
  ) then
    raise exception 'Falha: estorno da contribuição rejeitada deve referenciar o lançamento de crédito original.';
  end if;

  select l.id
  into v_estorno_contribuicao_id
  from public.founders_pontos_ledger l
  where l.empresa_id = v_empresa_a
    and l.idempotency_key = 'contribuicao_estorno:' || v_contribuicao_id::text
  order by l.criado_em desc
  limit 1;

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

  -- TESTE 4.1: rejeição deve ser bloqueada quando os pontos já foram utilizados
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  select public.gc_founders_criar_contribuicao(
    'Contribuição para bloqueio de rejeição',
    'Fluxo de teste para rejeição bloqueada por saldo insuficiente.',
    'Produto',
    v_key_base || '-contribuicao-bloqueio'
  ) into v_contribuicao_bloqueio_id;

  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  perform public.gc_founders_admin_atualizar_contribuicao(
    v_contribuicao_bloqueio_id,
    'aprovada',
    200,
    'Aprovação para teste de bloqueio'
  );

  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform public.gc_founders_resgatar_beneficio(
    v_beneficio_id,
    10,
    v_key_base || '-resgate-consumo',
    'Consumo de saldo para bloquear rejeição'
  );

  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  begin
    perform public.gc_founders_admin_atualizar_contribuicao(
      v_contribuicao_bloqueio_id,
      'rejeitada',
      null,
      'Tentativa de rejeição com saldo consumido'
    );
    raise exception 'Falha: rejeição deveria ser bloqueada com saldo já utilizado.';
  exception
    when sqlstate '22023' then
      if position('Regularize o saldo por ajuste administrativo antes de rejeitar' in sqlerrm) = 0 then
        raise;
      end if;
  end;

  -- Concorrência real (duas sessões independentes) é validada no roteiro separado:
  -- database/20261015_founders_correcao_seguranca_teste_concorrencia_roteiro.sql

  select public.gc_founders_saldo_pontos(v_empresa_a) into v_saldo;
  if v_saldo < 0 then
    raise exception 'Falha: saldo da empresa A ficou negativo (%).', v_saldo;
  end if;

  perform set_config('founders_test.admin_user_id', v_admin_user::text, true);
  perform set_config('founders_test.user_a_id', v_user_a::text, true);
  perform set_config('founders_test.user_b_id', v_user_b::text, true);
  perform set_config('founders_test.empresa_a_id', v_empresa_a::text, true);
  perform set_config('founders_test.empresa_b_id', v_empresa_b::text, true);
  perform set_config('founders_test.contribuicao_id', v_contribuicao_id::text, true);
  perform set_config('founders_test.beneficio_id', v_beneficio_id::text, true);
end $$;

-- TESTE 5: isolamento real com papel authenticated + claims (RLS)
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('founders_test.user_b_id', true), true);

do $$
declare
  v_contribuicao_id uuid;
  v_empresa_a uuid;
begin
  v_contribuicao_id := current_setting('founders_test.contribuicao_id', true)::uuid;
  v_empresa_a := current_setting('founders_test.empresa_a_id', true)::uuid;

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
end $$;

reset role;

-- Sanidade: usuário A deve enxergar a própria contribuição
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('founders_test.user_a_id', true), true);

do $$
declare
  v_contribuicao_id uuid;
begin
  v_contribuicao_id := current_setting('founders_test.contribuicao_id', true)::uuid;

  if not exists (
    select 1
    from public.founders_contribuicoes c
    where c.id = v_contribuicao_id
  ) then
    raise exception 'Falha: usuária A deveria enxergar a própria contribuição.';
  end if;
end $$;

reset role;

-- TESTE 6: privilégios de EXECUTE e escrita direta
do $$
declare
  v_has_write_privilege boolean;
begin
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

  v_has_write_privilege :=
    has_table_privilege('authenticated', 'public.founders_parceiros', 'INSERT')
    or has_table_privilege('authenticated', 'public.founders_parceiros', 'UPDATE')
    or has_table_privilege('authenticated', 'public.founders_parceiros', 'DELETE')
    or has_table_privilege('authenticated', 'public.founders_contribuicoes', 'INSERT')
    or has_table_privilege('authenticated', 'public.founders_contribuicoes', 'UPDATE')
    or has_table_privilege('authenticated', 'public.founders_contribuicoes', 'DELETE')
    or has_table_privilege('authenticated', 'public.founders_contribuicao_anexos', 'INSERT')
    or has_table_privilege('authenticated', 'public.founders_contribuicao_anexos', 'UPDATE')
    or has_table_privilege('authenticated', 'public.founders_contribuicao_anexos', 'DELETE')
    or has_table_privilege('authenticated', 'public.founders_votacoes', 'INSERT')
    or has_table_privilege('authenticated', 'public.founders_votacoes', 'UPDATE')
    or has_table_privilege('authenticated', 'public.founders_votacoes', 'DELETE')
    or has_table_privilege('authenticated', 'public.founders_votos', 'INSERT')
    or has_table_privilege('authenticated', 'public.founders_votos', 'UPDATE')
    or has_table_privilege('authenticated', 'public.founders_votos', 'DELETE')
    or has_table_privilege('authenticated', 'public.founders_pontos_ledger', 'INSERT')
    or has_table_privilege('authenticated', 'public.founders_pontos_ledger', 'UPDATE')
    or has_table_privilege('authenticated', 'public.founders_pontos_ledger', 'DELETE')
    or has_table_privilege('authenticated', 'public.founders_beneficios', 'INSERT')
    or has_table_privilege('authenticated', 'public.founders_beneficios', 'UPDATE')
    or has_table_privilege('authenticated', 'public.founders_beneficios', 'DELETE')
    or has_table_privilege('authenticated', 'public.founders_resgates', 'INSERT')
    or has_table_privilege('authenticated', 'public.founders_resgates', 'UPDATE')
    or has_table_privilege('authenticated', 'public.founders_resgates', 'DELETE');

  if v_has_write_privilege then
    raise exception 'Falha: authenticated possui privilégios efetivos de escrita em tabelas Founders.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.gc_founders_empresa_ativa(uuid)',
    'EXECUTE'
  ) then
    raise exception 'Falha: authenticated deve manter EXECUTE em gc_founders_empresa_ativa(uuid).';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.gc_founders_anexar_contribuicao(uuid,text,text,text,text,bigint,text)',
    'EXECUTE'
  ) then
    raise exception 'Falha: authenticated deve manter EXECUTE em gc_founders_anexar_contribuicao(...).';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.gc_founders_resgatar_beneficio(uuid,integer,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Falha: authenticated deve manter EXECUTE em gc_founders_resgatar_beneficio(...).';
  end if;
end $$;

rollback;
