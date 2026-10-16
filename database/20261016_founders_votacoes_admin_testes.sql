-- Testes de 20261016_founders_votacoes_admin.sql
-- Executar somente após:
-- 1) 20261015_founders_fundacao.sql
-- 2) 20261015_founders_correcao_seguranca.sql
-- 3) 20261016_founders_votacoes_admin.sql
--
-- Regras: roda em transação, usa parceiros temporários de duas empresas sem participação Founders,
-- não usa COMMIT e termina com ROLLBACK (nenhum efeito persistente).
-- O bloqueio concorrente (deadlock) não é reproduzível em uma única sessão; a ordem de locks
-- está documentada no cabeçalho da migração.

begin;

create or replace function pg_temp.esperar_erro(p_sql text, p_sqlstate text, p_descricao text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_sqlstate then
      return;
    end if;
    raise exception 'Falha em "%": sqlstate inesperado % (%)', p_descricao, sqlstate, sqlerrm;
  end;
  raise exception 'Falha em "%": a operação deveria ter sido rejeitada.', p_descricao;
end $$;

do $$
declare
  v_admin_user uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_empresa_a uuid;
  v_empresa_b uuid;
  v_contrib_1 uuid;
  v_contrib_2 uuid;
  v_contrib_3 uuid;
  v_vot_1 uuid;
  v_vot_2 uuid;
  v_vot_3 uuid;
  v_res jsonb;
  v_item jsonb;
  v_lista jsonb;
  v_texto text;
  v_status text;
  v_count integer;
  v_votos_antes integer;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_key text := 'votacao-teste-' || replace(gen_random_uuid()::text, '-', '');
  v_privilegio text;
  v_tabela text;
  v_funcao text;
begin
  if to_regprocedure('public.gc_founders_admin_criar_votacao(uuid,text,text,timestamptz,timestamptz)') is null then
    raise exception 'Pré-requisito ausente: 20261016_founders_votacoes_admin.sql não aplicada.';
  end if;

  -- Os testes simulam usuários por claims; a sessão precisa ser administrativa (SQL Editor), não authenticated/anon.
  if current_user in ('authenticated', 'anon') then
    raise exception 'Teste bloqueado: execute como postgres/service_role, não como %.', current_user;
  end if;

  select fa.usuario_id into v_admin_user
  from glasscode_private.founders_admins fa
  where fa.ativo is true
  order by fa.criado_em asc
  limit 1;
  if v_admin_user is null then
    select p.usuario_id into v_admin_user
    from glasscode_private.proprietaria p
    order by p.usuario_id
    limit 1;
  end if;
  if v_admin_user is null then
    raise exception 'Teste bloqueado: nenhum administrador Founders ou proprietária encontrada.';
  end if;

  -- Usuárias A/B não podem ser administradoras nem proprietária (gc_founders_admin() aceita ambas)
  select pu.id, pu.empresa_id into v_user_a, v_empresa_a
  from public.perfis_usuarios pu
  where pu.empresa_id is not null
    and not exists (select 1 from public.founders_parceiros fp where fp.empresa_id = pu.empresa_id)
    and pu.id <> v_admin_user
    and not exists (select 1 from glasscode_private.founders_admins fa where fa.usuario_id = pu.id and fa.ativo is true)
    and not exists (select 1 from glasscode_private.proprietaria pr where pr.usuario_id = pu.id)
  order by pu.id
  limit 1;
  if v_user_a is null then
    raise exception 'Teste bloqueado: sem usuária A em empresa sem parceiro Founders.';
  end if;

  select pu.id, pu.empresa_id into v_user_b, v_empresa_b
  from public.perfis_usuarios pu
  where pu.empresa_id is not null
    and not exists (select 1 from public.founders_parceiros fp where fp.empresa_id = pu.empresa_id)
    and pu.id <> v_admin_user
    and pu.id <> v_user_a
    and pu.empresa_id <> v_empresa_a
    and not exists (select 1 from glasscode_private.founders_admins fa where fa.usuario_id = pu.id and fa.ativo is true)
    and not exists (select 1 from glasscode_private.proprietaria pr where pr.usuario_id = pu.id)
  order by pu.id
  limit 1;
  if v_user_b is null then
    raise exception 'Teste bloqueado: são necessárias 2 empresas distintas sem parceiro Founders.';
  end if;

  -- numero_fundador explícito: nextval() não é revertido pelo ROLLBACK e deixaria lacuna na numeração real.
  insert into public.founders_parceiros(
    empresa_id, numero_fundador, status, data_adesao, ciclo_avaliacao_inicio, ciclo_avaliacao_fim,
    participacao_inicio, participacao_fim, valor_mensal_acordado, quantidade_usuarios_inclusos
  )
  values
    (v_empresa_a, 2147483001, 'ativo', v_hoje, v_hoje, v_hoje + 90, v_hoje, null, 39.90, 3),
    (v_empresa_b, 2147483002, 'ativo', v_hoje, v_hoje, v_hoje + 90, v_hoje, null, 39.90, 3);

  -- Contribuições da empresa A
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  v_contrib_1 := public.gc_founders_criar_contribuicao('Sugestão de votação 1', 'Descrição da sugestão para votação 1.', 'Produto', v_key || '-1');
  v_contrib_2 := public.gc_founders_criar_contribuicao('Sugestão de votação 2', 'Descrição da sugestão para votação 2.', 'Produto', v_key || '-2');
  v_contrib_3 := public.gc_founders_criar_contribuicao('Sugestão de votação 3', 'Descrição da sugestão para votação 3.', 'Produto', v_key || '-3');

  -- TESTE 1: não-admin não executa RPCs administrativas
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_criar_votacao(%L, %L, %L, null, now() + interval ''7 days'')', v_contrib_1, 'Título válido', 'Descrição válida longa'), '42501', 'criar votação como não-admin');
  perform pg_temp.esperar_erro('select public.gc_founders_admin_resultado_votacao()', '42501', 'resultado como não-admin');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_participantes_votacao(%L)', gen_random_uuid()), '42501', 'participantes como não-admin');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_abrir_votacao(%L)', gen_random_uuid()), '42501', 'abrir como não-admin');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_encerrar_votacao(%L, true, %L)', gen_random_uuid(), 'x'), '42501', 'cancelar como não-admin');

  -- TESTE 2: criação (rascunho) e validações
  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_criar_votacao(%L, %L, %L, null, now() - interval ''1 day'')', v_contrib_1, 'Título válido', 'Descrição válida longa'), '22023', 'encerramento no passado');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_criar_votacao(%L, %L, %L, now() + interval ''2 days'', now() + interval ''1 day'')', v_contrib_1, 'Título válido', 'Descrição válida longa'), '22023', 'encerramento antes da abertura');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_criar_votacao(%L, %L, %L, null, now() + interval ''1 day'')', v_contrib_1, 'ab', 'Descrição válida longa'), '22023', 'título curto');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_criar_votacao(%L, %L, %L, null, now() + interval ''1 day'')', gen_random_uuid(), 'Título válido', 'Descrição válida longa'), '22023', 'contribuição inexistente');

  v_vot_1 := public.gc_founders_admin_criar_votacao(v_contrib_1, 'Votação teste 1', 'Descrição da votação de teste 1.', null, now() + interval '7 days');
  select status into v_status from public.founders_votacoes where id = v_vot_1;
  if v_status <> 'rascunho' then
    raise exception 'Falha: votação criada deveria estar em rascunho (%).', v_status;
  end if;
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_criar_votacao(%L, %L, %L, null, now() + interval ''7 days'')', v_contrib_1, 'Votação duplicada', 'Descrição duplicada longa'), '22023', 'votação duplicada para a mesma contribuição');

  -- TESTE 3: rascunho não aceita votos; edição só em rascunho
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform pg_temp.esperar_erro(format('select public.gc_founders_votar(%L, %L, %L)', v_vot_1, 'favor', ''), '22023', 'voto em rascunho');
  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  perform public.gc_founders_admin_atualizar_votacao(v_vot_1, 'Votação teste 1 (editada)', 'Descrição editada da votação 1.', null, now() + interval '10 days');

  -- TESTE 4: abrir
  perform public.gc_founders_admin_abrir_votacao(v_vot_1);
  select status into v_status from public.founders_votacoes where id = v_vot_1;
  if v_status <> 'aberta' then
    raise exception 'Falha: votação deveria estar aberta (%).', v_status;
  end if;
  select status into v_status from public.founders_contribuicoes where id = v_contrib_1;
  if v_status <> 'em_votacao' then
    raise exception 'Falha: contribuição deveria estar em_votacao (%).', v_status;
  end if;
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_abrir_votacao(%L)', v_vot_1), '22023', 'abrir votação já aberta');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_atualizar_votacao(%L, %L, %L, null, now() + interval ''3 days'')', v_vot_1, 'Título novo', 'Descrição nova longa'), '22023', 'editar votação aberta');

  -- TESTE 5: votos, duplicidade e resultado
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform public.gc_founders_votar(v_vot_1, 'favor', '');
  perform pg_temp.esperar_erro(format('select public.gc_founders_votar(%L, %L, %L)', v_vot_1, 'contra', ''), '22023', 'voto duplicado');
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform public.gc_founders_votar(v_vot_1, 'abster', '');

  -- parceiro não vê resultado de votação ainda aberta nem executa RPCs administrativas
  v_lista := public.gc_founders_resultados_votacoes();
  if exists (select 1 from jsonb_array_elements(v_lista) i where i->>'votacao_id' = v_vot_1::text) then
    raise exception 'Falha: parceiro não deveria ver resultado de votação em andamento.';
  end if;
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_resultado_votacao(%L)', v_vot_1), '42501', 'resultado administrativo como parceiro');

  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  v_res := public.gc_founders_admin_resultado_votacao(v_vot_1);
  v_item := v_res->0;
  if (v_item->>'total_votos')::int <> 2 or (v_item->>'favor')::int <> 1
     or (v_item->>'abster')::int <> 1 or (v_item->>'contra')::int <> 0 then
    raise exception 'Falha: totais inesperados: %', v_item;
  end if;
  if v_item->>'resultado_consultivo' <> 'favoravel' then
    raise exception 'Falha: resultado consultivo deveria ser favoravel: %', v_item;
  end if;
  if (v_item->>'participacao_percentual')::numeric
     <> round(100.0 * (v_item->>'total_votos')::int
        / greatest((v_item->>'empresas_elegiveis')::int, (v_item->>'total_votos')::int, 1), 1) then
    raise exception 'Falha: percentual de participação inconsistente: %', v_item;
  end if;

  -- TESTE 6: participantes sem revelar escolha
  v_res := public.gc_founders_admin_participantes_votacao(v_vot_1);
  v_texto := v_res::text;
  if v_texto like '%"voto"%' or v_texto like '%usuario_id%' or v_texto like '%observacao%' then
    raise exception 'Falha: participantes expõem dados do voto: %', v_texto;
  end if;
  select count(*) into v_count
  from jsonb_array_elements(v_res->'participantes') p
  where (p->>'participou')::boolean and p->>'empresa_id' in (v_empresa_a::text, v_empresa_b::text);
  if v_count <> 2 then
    raise exception 'Falha: as duas empresas deveriam constar como participantes (%).', v_count;
  end if;

  -- TESTE 7: prazo expirado (simulado) bloqueia voto, status efetivo e sincronização persistida
  update public.founders_votacoes
  set abre_em = now() - interval '2 hours', encerra_em = now() - interval '1 second'
  where id = v_vot_1;
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform pg_temp.esperar_erro(format('select public.gc_founders_votar(%L, %L, %L)', v_vot_1, 'contra', ''), '22023', 'voto após o prazo');
  v_item := public.gc_founders_montar_resultado_votacao(v_vot_1);
  if v_item->>'status' <> 'aberta' or v_item->>'status_efetivo' <> 'encerrada' then
    raise exception 'Falha: status efetivo deveria ser encerrada com status persistido aberta: %', v_item;
  end if;
  v_lista := public.gc_founders_resultados_votacoes();
  v_item := (select i from jsonb_array_elements(v_lista) i where i->>'votacao_id' = v_vot_1::text);
  if v_item is null then
    raise exception 'Falha: parceiro deveria ver o resultado agregado da votação finalizada.';
  end if;
  if v_item ? 'contribuicao_id' or v_item::text like '%"voto"%' or v_item::text like '%usuario_id%' then
    raise exception 'Falha: resultado de parceiro expõe dados indevidos: %', v_item;
  end if;
  select status into v_status from public.founders_votacoes where id = v_vot_1;
  if v_status <> 'encerrada' then
    raise exception 'Falha: sincronização deveria persistir status encerrada (%).', v_status;
  end if;
  select status into v_status from public.founders_contribuicoes where id = v_contrib_1;
  if v_status <> 'em_votacao' then
    raise exception 'Falha: encerramento da votação não deve alterar a contribuição (%).', v_status;
  end if;
  select count(*) into v_count from public.founders_votos where votacao_id = v_vot_1;
  if v_count <> 2 then
    raise exception 'Falha: votos deveriam ser preservados (%).', v_count;
  end if;
  select count(*) into v_count from public.founders_votos
  where votacao_id = v_vot_1 and ((empresa_id = v_empresa_a and voto = 'favor') or (empresa_id = v_empresa_b and voto = 'abster'));
  if v_count <> 2 then
    raise exception 'Falha: escolhas dos votos foram alteradas pelo encerramento por prazo.';
  end if;
  -- idempotência: nova sincronização (outras votações reais expiradas podem ser encerradas, o que é ignorado aqui)
  perform public.gc_founders_sincronizar_votacoes();
  select status into v_status from public.founders_votacoes where id = v_vot_1;
  if v_status <> 'encerrada' then
    raise exception 'Falha: votação temporária deveria permanecer encerrada (%).', v_status;
  end if;
  select count(*) into v_count
  from glasscode_private.founders_auditoria
  where acao = 'founders_votacao_encerrada_por_prazo' and alvo_id = v_vot_1;
  if v_count <> 1 then
    raise exception 'Falha: deveria existir exatamente 1 auditoria de encerramento por prazo (%).', v_count;
  end if;

  -- TESTE 8: cancelamento preserva votos, reverte contribuição e bloqueia novos votos
  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  v_vot_2 := public.gc_founders_admin_criar_votacao(v_contrib_2, 'Votação teste 2', 'Descrição da votação de teste 2.', null, now() + interval '7 days');
  perform public.gc_founders_admin_abrir_votacao(v_vot_2);
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform public.gc_founders_votar(v_vot_2, 'contra', '');
  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  select count(*) into v_votos_antes from public.founders_votos where votacao_id = v_vot_2;
  perform public.gc_founders_admin_encerrar_votacao(v_vot_2, true, 'Teste de cancelamento');
  select status into v_status from public.founders_votacoes where id = v_vot_2;
  if v_status <> 'cancelada' then
    raise exception 'Falha: votação deveria estar cancelada (%).', v_status;
  end if;
  select status into v_status from public.founders_contribuicoes where id = v_contrib_2;
  if v_status <> 'em_triagem' then
    raise exception 'Falha: contribuição deveria voltar a em_triagem (%).', v_status;
  end if;
  select count(*) into v_count from public.founders_votos where votacao_id = v_vot_2;
  if v_count <> v_votos_antes then
    raise exception 'Falha: cancelamento não deve apagar votos.';
  end if;
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform pg_temp.esperar_erro(format('select public.gc_founders_votar(%L, %L, %L)', v_vot_2, 'favor', ''), '22023', 'voto em votação cancelada');
  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_encerrar_votacao(%L, false, %L)', v_vot_2, ''), '22023', 'encerrar votação cancelada');

  -- TESTE 9: encerramento antecipado
  v_vot_3 := public.gc_founders_admin_criar_votacao(v_contrib_3, 'Votação teste 3', 'Descrição da votação de teste 3.', null, now() + interval '7 days');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_encerrar_votacao(%L, false, %L)', v_vot_3, ''), '22023', 'encerrar rascunho');
  perform public.gc_founders_admin_abrir_votacao(v_vot_3);
  -- a abertura e o encerramento ocorrem na mesma transação do teste; recua a abertura para simular transações distintas
  update public.founders_votacoes set abre_em = now() - interval '1 hour' where id = v_vot_3;
  perform public.gc_founders_admin_encerrar_votacao(v_vot_3, false, 'Encerramento antecipado de teste');
  select status into v_status from public.founders_votacoes where id = v_vot_3;
  if v_status <> 'encerrada' then
    raise exception 'Falha: votação deveria estar encerrada (%).', v_status;
  end if;
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform pg_temp.esperar_erro(format('select public.gc_founders_votar(%L, %L, %L)', v_vot_3, 'favor', ''), '22023', 'voto após encerramento antecipado');

  -- TESTE 10: auditoria registrada
  select count(*) into v_count
  from glasscode_private.founders_auditoria
  where acao in (
    'founders_admin_criar_votacao', 'founders_admin_atualizar_votacao', 'founders_admin_abrir_votacao',
    'founders_admin_encerrar_votacao', 'founders_admin_cancelar_votacao', 'founders_votacao_encerrada_por_prazo'
  )
  and alvo_id in (v_vot_1, v_vot_2, v_vot_3);
  if v_count < 8 then
    raise exception 'Falha: auditoria insuficiente das operações de votação (%).', v_count;
  end if;

  -- TESTE 11: privilégios (sem escrita direta e sem execução indevida)
  foreach v_tabela in array array['founders_votacoes', 'founders_votos'] loop
    foreach v_privilegio in array array['INSERT', 'UPDATE', 'DELETE'] loop
      if has_table_privilege('authenticated', 'public.' || v_tabela, v_privilegio)
         or has_table_privilege('anon', 'public.' || v_tabela, v_privilegio) then
        raise exception 'Falha: authenticated/anon possui % em %.', v_privilegio, v_tabela;
      end if;
    end loop;
    -- concessões por coluna não aparecem em has_table_privilege
    if has_any_column_privilege('authenticated', 'public.' || v_tabela, 'INSERT')
       or has_any_column_privilege('authenticated', 'public.' || v_tabela, 'UPDATE')
       or has_any_column_privilege('anon', 'public.' || v_tabela, 'INSERT')
       or has_any_column_privilege('anon', 'public.' || v_tabela, 'UPDATE') then
      raise exception 'Falha: concessão por coluna de escrita em %.', v_tabela;
    end if;
  end loop;

  foreach v_funcao in array array[
    'public.gc_founders_sincronizar_votacoes()',
    'public.gc_founders_montar_resultado_votacao(uuid)'
  ] loop
    if has_function_privilege('authenticated', v_funcao, 'EXECUTE')
       or has_function_privilege('anon', v_funcao, 'EXECUTE') then
      raise exception 'Falha: função interna % executável por clientes.', v_funcao;
    end if;
  end loop;

  foreach v_funcao in array array[
    'public.gc_founders_admin_criar_votacao(uuid,text,text,timestamptz,timestamptz)',
    'public.gc_founders_admin_atualizar_votacao(uuid,text,text,timestamptz,timestamptz)',
    'public.gc_founders_admin_abrir_votacao(uuid)',
    'public.gc_founders_admin_encerrar_votacao(uuid,boolean,text)',
    'public.gc_founders_admin_resultado_votacao(uuid,integer)',
    'public.gc_founders_admin_participantes_votacao(uuid)',
    'public.gc_founders_resultados_votacoes()',
    'public.gc_founders_votar(uuid,text,text)'
  ] loop
    if has_function_privilege('anon', v_funcao, 'EXECUTE') then
      raise exception 'Falha: anon pode executar %.', v_funcao;
    end if;
    if not has_function_privilege('authenticated', v_funcao, 'EXECUTE') then
      raise exception 'Falha: authenticated não pode executar %.', v_funcao;
    end if;
  end loop;
end $$;

rollback;
