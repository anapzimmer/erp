# Teste de concorrência — limite de empresas Founders ativas

**Somente em banco de homologação** (cópia do schema com a migração `20261017_founders_cadastro_parceiros.sql`
aplicada). **Nunca em produção**: o teste confirma transações e altera temporariamente a capacidade.
Use duas conexões `psql` separadas (sessões **A** e **B**) como `postgres`. Não execute pelo SQL Editor do
Supabase (cada execução é uma sessão separada e não permite controlar o COMMIT).

## 0. Preparação (sessão A, depois COMMIT)

```sql
-- Três empresas sem participação Founders e a capacidade atual
select id, nome from public.empresas e
where not exists (select 1 from public.founders_parceiros fp where fp.empresa_id = e.id)
order by id limit 3;                               -- anote E1, E2, E3
select valor as capacidade_original from glasscode_private.founders_config
where chave = 'capacidade_primeira_turma';         -- anote
select count(*) as ativos from public.founders_parceiros where status = 'ativo';   -- anote N

-- Deixa exatamente UMA vaga livre
update glasscode_private.founders_config set valor = to_jsonb(N + 1)   -- substitua N
where chave = 'capacidade_primeira_turma';
```

## Cenário 1 — dois cadastros novos disputando a última vaga

```sql
-- A
begin;
insert into public.founders_parceiros(empresa_id, numero_fundador, status, data_adesao,
  ciclo_avaliacao_inicio, ciclo_avaliacao_fim, valor_mensal_acordado, quantidade_usuarios_inclusos)
values ('E1', 2147483201, 'ativo', current_date, current_date, current_date + 90, 39.90, 3);
-- NÃO finalize ainda.

-- B (deve ficar BLOQUEADA aguardando A)
begin;
insert into public.founders_parceiros(empresa_id, numero_fundador, status, data_adesao,
  ciclo_avaliacao_inicio, ciclo_avaliacao_fim, valor_mensal_acordado, quantidade_usuarios_inclusos)
values ('E2', 2147483202, 'ativo', current_date, current_date, current_date + 90, 39.90, 3);

-- (outra conexão) confirme a espera:
select pid, wait_event_type, wait_event, left(query, 60) from pg_stat_activity
where wait_event_type = 'Lock' and state = 'active';          -- B com wait_event = 'advisory'

-- A
commit;
-- Esperado em B: ERROR 22023 "O limite de ... empresas Founders ativas foi atingido."
-- B
rollback;
```

Esperado: somente E1 existe em `founders_parceiros`.

## Cenário 2 — duas reativações disputando a última vaga

```sql
-- Preparação: pausar E1 e criar E2 pausada (commit), com 1 vaga livre.
update public.founders_parceiros set status = 'pausado' where empresa_id = 'E1';
insert into public.founders_parceiros(empresa_id, numero_fundador, status, data_adesao,
  ciclo_avaliacao_inicio, ciclo_avaliacao_fim, valor_mensal_acordado, quantidade_usuarios_inclusos)
values ('E2', 2147483202, 'pausado', current_date, current_date, current_date + 90, 39.90, 3);

-- A: begin; update public.founders_parceiros set status = 'ativo' where empresa_id = 'E1';
-- B: begin; update public.founders_parceiros set status = 'ativo' where empresa_id = 'E2';   -- bloqueia
-- A: commit;
-- Esperado em B: ERROR 22023. B: rollback;
```

## Cenário 3 — upsert da RPC contra UPDATE direto na mesma empresa (ausência de deadlock)

Com E1 pausada e uma vaga livre:

```sql
-- A: begin;
--    insert into public.founders_parceiros(empresa_id, numero_fundador, status, data_adesao,
--      ciclo_avaliacao_inicio, ciclo_avaliacao_fim, valor_mensal_acordado, quantidade_usuarios_inclusos)
--    values ('E1', 2147483203, 'ativo', current_date, current_date, current_date + 90, 39.90, 3)
--    on conflict (empresa_id) do update set status = excluded.status;
-- B: begin; update public.founders_parceiros set status = 'ativo' where empresa_id = 'E1';   -- bloqueia
-- A: commit;
-- Esperado: sem erro 40P01. B conclui sem erro (E1 já ativa; 0 novas vagas) e faz commit.
```

## Cenário 4 — isolamento não suportado

```sql
-- A: begin isolation level repeatable read;
--    update public.founders_parceiros set status = 'ativo' where empresa_id = 'E1';
-- Esperado: ERROR 25000 (isolamento READ COMMITTED exigido). A: rollback;
```

## Cenário 5 — limite conhecido (deadlock por ordem inversa)

```sql
-- A: begin; select 1 from public.founders_parceiros where empresa_id = 'E1' for update;   -- linha primeiro
-- B: begin; update public.founders_parceiros set status = 'ativo' where empresa_id = 'E1'; -- toma capacidade, espera linha
-- A: update public.founders_parceiros set status = 'ativo' where empresa_id = 'E1';        -- quer capacidade
-- Esperado: o PostgreSQL aborta uma delas com 40P01. A capacidade não é excedida.
```

Documenta o item (g) do cabeçalho da migração. Nenhum fluxo da aplicação faz isso.

## Verificação final e limpeza (homologação)

```sql
select count(*) filter (where status = 'ativo') as ativos from public.founders_parceiros;   -- <= capacidade
-- Remove somente as linhas de teste e restaura a capacidade
delete from public.founders_parceiros where numero_fundador in (2147483201, 2147483202, 2147483203);
update glasscode_private.founders_config set valor = '<capacidade_original>'::jsonb
where chave = 'capacidade_primeira_turma';
```

O delete atinge apenas as linhas de teste (numeração reservada 2147483201–2147483203). As auditorias
(`founders_auditoria`) não são geradas nesses INSERT/UPDATE diretos, mas confira se há registros residuais.
