-- Testes de 20261017_founders_cadastro_parceiros.sql
-- Executar somente após 20261015_founders_fundacao.sql, 20261015_founders_correcao_seguranca.sql
-- e 20261017_founders_cadastro_parceiros.sql, no SQL Editor (papel postgres).
--
-- Regras: tudo em transação, sem COMMIT, termina com ROLLBACK.
-- - Usa empresas existentes sem participação Founders e cria parceiros temporários com numero_fundador
--   explícito (nextval não é revertido pelo ROLLBACK).
-- - Dentro da transação, founders_config.capacidade_primeira_turma é ajustada para (ativos atuais + 2);
--   o ROLLBACK restaura o valor original. Essa linha fica bloqueada até o ROLLBACK.
-- - Não altera registros preexistentes além dessa configuração transitória.

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

create or replace function pg_temp.inserir_parceiro(p_empresa uuid, p_numero integer, p_status text)
returns void
language plpgsql
as $$
declare v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.founders_parceiros(
    empresa_id, numero_fundador, status, data_adesao, ciclo_avaliacao_inicio, ciclo_avaliacao_fim,
    participacao_inicio, valor_mensal_acordado, quantidade_usuarios_inclusos
  )
  values (p_empresa, p_numero, p_status, v_hoje, v_hoje, v_hoje + 90, v_hoje, 39.90, 3);
end $$;

do $$
declare
  v_admin_user uuid;
  v_user_comum uuid;
  v_emp uuid[];
  v_nome text;
  v_ativos integer;
  v_res jsonb;
  v_item jsonb;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_numero_antes integer;
  v_status text;
  v_owner_ok boolean;
  v_tem_cnpj boolean;
  v_cnpj text;
  v_termo text;
  v_n integer;
begin
  if to_regprocedure('public.gc_founders_admin_buscar_empresas(text,integer)') is null
    or to_regprocedure('public.gc_founders_validar_capacidade()') is null then
    raise exception 'Pré-requisito ausente: 20261017_founders_cadastro_parceiros.sql não aplicada.';
  end if;
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

  select pu.id into v_user_comum
  from public.perfis_usuarios pu
  where pu.id <> v_admin_user
    and not exists (select 1 from glasscode_private.founders_admins fa where fa.usuario_id = pu.id and fa.ativo is true)
    and not exists (select 1 from glasscode_private.proprietaria pr where pr.usuario_id = pu.id)
  order by pu.id
  limit 1;
  if v_user_comum is null then
    raise exception 'Teste bloqueado: sem usuária comum (não administradora).';
  end if;

  select array_agg(x.id) into v_emp
  from (
    select e.id
    from public.empresas e
    where length(trim(e.nome)) >= 3
      and not exists (select 1 from public.founders_parceiros fp where fp.empresa_id = e.id)
    order by e.id
    limit 3
  ) x;
  if coalesce(array_length(v_emp, 1), 0) < 3 then
    raise exception 'Teste bloqueado: são necessárias 3 empresas sem participação Founders.';
  end if;

  select count(*)::integer into v_ativos from public.founders_parceiros where status = 'ativo';
  update glasscode_private.founders_config
     set valor = to_jsonb(v_ativos + 2)
   where chave = 'capacidade_primeira_turma';

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);

  -- Escritas diretas com numero_fundador explícito: via RPC o INSERT ... ON CONFLICT dispara o gatilho de
  -- numeração mesmo quando vira UPDATE, e nextval não é revertido pelo ROLLBACK (lacuna na numeração real).
  -- A RPC só é chamada no caso rejeitado de uma empresa nova (rejeitado antes do nextval).

  -- TESTE 1: dois cadastros dentro da capacidade
  perform pg_temp.inserir_parceiro(v_emp[1], 2147483011, 'ativo');
  perform pg_temp.inserir_parceiro(v_emp[2], 2147483012, 'ativo');

  -- TESTE 2: terceiro cadastro ativo excede a capacidade (RPC e INSERT direto) e não cria linha
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_definir_parceiro(%L, ''ativo'', 39.90, 3, %L, %L)', v_emp[3], v_hoje, v_hoje + 90), '22023', 'cadastro acima da capacidade via RPC (empresa nova)');
  perform pg_temp.esperar_erro(format('insert into public.founders_parceiros(empresa_id, numero_fundador, status, data_adesao, ciclo_avaliacao_inicio, ciclo_avaliacao_fim, participacao_inicio, valor_mensal_acordado, quantidade_usuarios_inclusos) values (%L, 2147483111, ''ativo'', %L, %L, %L, %L, 39.90, 3)', v_emp[3], v_hoje, v_hoje, v_hoje + 90, v_hoje), '22023', 'INSERT direto acima da capacidade');
  if exists (select 1 from public.founders_parceiros where empresa_id = v_emp[3]) then
    raise exception 'Falha: empresa rejeitada por capacidade foi gravada.';
  end if;

  -- TESTE 3: atualizar parceiro já ativo no limite continua permitido e preserva o número
  select numero_fundador into v_numero_antes from public.founders_parceiros where empresa_id = v_emp[1];
  update public.founders_parceiros set status = 'ativo', valor_mensal_acordado = 49.90 where empresa_id = v_emp[1];
  if (select numero_fundador from public.founders_parceiros where empresa_id = v_emp[1]) <> v_numero_antes then
    raise exception 'Falha: numero_fundador foi alterado em atualização.';
  end if;

  -- TESTE 4: pausar libera vaga; reativar o pausado depois de ocupar a vaga é rejeitado (UPDATE e UPSERT)
  update public.founders_parceiros set status = 'pausado' where empresa_id = v_emp[2];
  perform pg_temp.inserir_parceiro(v_emp[3], 2147483013, 'ativo');
  perform pg_temp.esperar_erro(format('update public.founders_parceiros set status = ''ativo'' where empresa_id = %L', v_emp[2]), '22023', 'reativação acima da capacidade via UPDATE direto');
  perform pg_temp.esperar_erro(format('insert into public.founders_parceiros(empresa_id, numero_fundador, status, data_adesao, ciclo_avaliacao_inicio, ciclo_avaliacao_fim, valor_mensal_acordado, quantidade_usuarios_inclusos) values (%L, 2147483112, ''ativo'', %L, %L, %L, 39.90, 3) on conflict (empresa_id) do update set status = excluded.status', v_emp[2], v_hoje, v_hoje, v_hoje + 90), '22023', 'reativação via INSERT ON CONFLICT DO UPDATE acima da capacidade');
  select status into v_status from public.founders_parceiros where empresa_id = v_emp[2];
  if v_status <> 'pausado' then
    raise exception 'Falha: parceiro rejeitado mudou de status (%).', v_status;
  end if;

  -- upsert de quem já é ativo (sem vaga livre) continua permitido: não é nova ocupação
  insert into public.founders_parceiros(empresa_id, numero_fundador, status, data_adesao, ciclo_avaliacao_inicio, ciclo_avaliacao_fim, valor_mensal_acordado, quantidade_usuarios_inclusos)
  values (v_emp[3], 2147483113, 'ativo', v_hoje, v_hoje, v_hoje + 90, 41.90, 3)
  on conflict (empresa_id) do update set status = excluded.status, valor_mensal_acordado = excluded.valor_mensal_acordado;
  if (select numero_fundador from public.founders_parceiros where empresa_id = v_emp[3]) <> 2147483013 then
    raise exception 'Falha: numero_fundador alterado pelo upsert.';
  end if;

  -- comando de várias linhas: duas reativações com uma única vaga livre devem falhar por inteiro
  update public.founders_parceiros set status = 'pausado' where empresa_id = v_emp[1];
  perform pg_temp.esperar_erro(format('update public.founders_parceiros set status = ''ativo'' where empresa_id in (%L, %L)', v_emp[1], v_emp[2]), '22023', 'duas reativações com uma vaga');
  if (select count(*) from public.founders_parceiros where empresa_id in (v_emp[1], v_emp[2]) and status = 'ativo') <> 0 then
    raise exception 'Falha: comando multi-linha rejeitado deixou linha ativa.';
  end if;

  -- TESTE 5: configuração inválida bloqueia novas ativações
  update glasscode_private.founders_config set valor = '"abc"'::jsonb where chave = 'capacidade_primeira_turma';
  perform pg_temp.esperar_erro(format('update public.founders_parceiros set status = ''ativo'' where empresa_id = %L', v_emp[2]), '55000', 'capacidade inválida');
  update glasscode_private.founders_config set valor = to_jsonb(0) where chave = 'capacidade_primeira_turma';
  perform pg_temp.esperar_erro(format('update public.founders_parceiros set status = ''ativo'' where empresa_id = %L', v_emp[2]), '55000', 'capacidade zero');

  -- TESTE 6: gatilho de comando (ordem de locks) e de linha existem; capacidade dispara antes da numeração
  if not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.founders_parceiros'::regclass
      and t.tgname = 'founders_parceiros_capacidade_lock_trg'
      and not t.tgisinternal
      and (t.tgtype & 1) = 0          -- nível de comando
      and (t.tgtype & 2) = 2          -- BEFORE
  ) then
    raise exception 'Falha: gatilho de comando do lock de capacidade ausente.';
  end if;
  if not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.founders_parceiros'::regclass and t.tgname = 'founders_parceiros_capacidade_trg' and not t.tgisinternal
  ) or not ('founders_parceiros_capacidade_trg' collate "C" < 'founders_parceiros_numero_trg' collate "C") then
    raise exception 'Falha: ordem/existência do gatilho de capacidade.';
  end if;

  -- TESTE 7: busca administrativa
  select exists (
    select 1 from pg_attribute where attrelid = 'public.empresas'::regclass and attname = 'cnpj' and attnum > 0 and not attisdropped
  ) into v_tem_cnpj;

  perform set_config('request.jwt.claim.sub', v_user_comum::text, true);
  perform pg_temp.esperar_erro('select public.gc_founders_admin_buscar_empresas(''abc'', 10)', '42501', 'busca por não-admin');

  perform set_config('request.jwt.claim.sub', v_admin_user::text, true);
  perform pg_temp.esperar_erro('select public.gc_founders_admin_buscar_empresas(''ab'', 10)', '22023', 'busca curta');
  perform pg_temp.esperar_erro('select public.gc_founders_admin_buscar_empresas(null, 10)', '22023', 'busca nula');
  perform pg_temp.esperar_erro(format('select public.gc_founders_admin_buscar_empresas(%L, 10)', repeat('a', 101)), '22023', 'busca longa');

  select nome into v_nome from public.empresas where id = v_emp[1];
  v_termo := left(trim(v_nome), 100);
  v_res := public.gc_founders_admin_buscar_empresas(v_termo, 20);
  select e into v_item from jsonb_array_elements(v_res) e where e->>'id' = v_emp[1]::text;
  if v_item is null then
    raise exception 'Falha: empresa % não encontrada pela busca por nome.', v_emp[1];
  end if;
  if (v_item->>'participante')::boolean is not true then
    raise exception 'Falha: empresa participante não marcada como participante.';
  end if;
  if (v_item ? 'id') is not true or (v_item ? 'nome') is not true or (v_item ? 'cnpj') is not true
     or (select count(*) from jsonb_object_keys(v_item)) <> 4 then
    raise exception 'Falha: a busca deve retornar somente id, nome, cnpj e participante.';
  end if;

  -- curingas devem ser literais
  foreach v_termo in array array['%%%', '___', E'\\\\\\']
  loop
    v_res := public.gc_founders_admin_buscar_empresas(v_termo, 20);
    for v_item in select e from jsonb_array_elements(v_res) e loop
      if strpos(v_item->>'nome', v_termo) = 0 then
        raise exception 'Falha: o termo "%" funcionou como curinga (nome "%").', v_termo, v_item->>'nome';
      end if;
    end loop;
  end loop;

  -- limite máximo
  v_res := public.gc_founders_admin_buscar_empresas(left(trim(v_nome), 3), 1000);
  if jsonb_array_length(v_res) > 20 then
    raise exception 'Falha: a busca ultrapassou o limite de 20 resultados.';
  end if;
  v_res := public.gc_founders_admin_buscar_empresas(left(trim(v_nome), 3), 1);
  if jsonb_array_length(v_res) > 1 then
    raise exception 'Falha: p_limite = 1 não foi respeitado.';
  end if;

  -- CNPJ somente se a coluna existir
  if v_tem_cnpj then
    execute 'select regexp_replace(cnpj::text, ''\D'', '''', ''g'') from public.empresas
             where length(regexp_replace(coalesce(cnpj::text, ''''), ''\D'', '''', ''g'')) = 14
             order by id limit 1'
      into v_cnpj;
    if v_cnpj is not null then
      v_res := public.gc_founders_admin_buscar_empresas(v_cnpj, 20);
      if jsonb_array_length(v_res) < 1 then
        raise exception 'Falha: a busca por CNPJ não retornou resultado.';
      end if;
    end if;
  else
    v_res := public.gc_founders_admin_buscar_empresas('12345678', 20);
    if exists (select 1 from jsonb_array_elements(v_res) e where e->>'cnpj' is not null) then
      raise exception 'Falha: cnpj não deveria ser retornado sem a coluna.';
    end if;
  end if;

  -- TESTE 8: privilégios e propriedade das funções
  if has_function_privilege('anon', 'public.gc_founders_admin_buscar_empresas(text,integer)', 'execute') then
    raise exception 'Falha: anon executa a busca de empresas.';
  end if;
  if not has_function_privilege('authenticated', 'public.gc_founders_admin_buscar_empresas(text,integer)', 'execute') then
    raise exception 'Falha: authenticated não executa a busca (a autorização é feita dentro da função).';
  end if;
  if has_function_privilege('anon', 'public.gc_founders_validar_capacidade()', 'execute')
     or has_function_privilege('authenticated', 'public.gc_founders_validar_capacidade()', 'execute')
     or has_function_privilege('anon', 'public.gc_founders_bloquear_capacidade()', 'execute')
     or has_function_privilege('authenticated', 'public.gc_founders_bloquear_capacidade()', 'execute') then
    raise exception 'Falha: função de gatilho executável por clientes.';
  end if;
  select bool_and(r.rolsuper or r.rolbypassrls) into v_owner_ok
  from pg_proc p join pg_roles r on r.oid = p.proowner
  where p.oid in (
    'public.gc_founders_admin_buscar_empresas(text,integer)'::regprocedure,
    'public.gc_founders_validar_capacidade()'::regprocedure,
    'public.gc_founders_bloquear_capacidade()'::regprocedure
  );
  if v_owner_ok is not true then
    raise exception 'Falha: o dono das funções não ignora o RLS (FORCE RLS em empresas).';
  end if;
  if not (select p.prosecdef and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%') from pg_proc p where p.oid = 'public.gc_founders_admin_buscar_empresas(text,integer)'::regprocedure) then
    raise exception 'Falha: a busca deve ser SECURITY DEFINER com search_path vazio.';
  end if;

  raise notice 'Testes de cadastro de parceiros Founders concluídos com sucesso.';
end $$;

rollback;
