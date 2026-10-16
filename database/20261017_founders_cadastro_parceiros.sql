-- Founders: busca administrativa de empresas e limite atômico de empresas ativas
-- Não destrutiva: sem drop/truncate/delete e sem novas colunas em public.empresas.
-- Pré-requisitos: 20261015_founders_fundacao.sql, 20261015_founders_correcao_seguranca.sql
-- (a 20261016_founders_votacoes_admin.sql é independente desta).
--
-- 1) gc_founders_admin_buscar_empresas(text, integer)
--    - public.empresas tem FORCE ROW LEVEL SECURITY e a política atual só mostra a empresa do próprio usuário.
--    - A função é SECURITY DEFINER e lê as empresas como dona da função. O FORCE RLS vale até para o dono da
--      tabela, exceto para papéis com BYPASSRLS/superusuário (caso do postgres no Supabase, já usado por
--      painel_plataforma.sql). A migração ABORTA se o executor não tiver esse atributo.
--    - O RLS não é desativado nem alterado. Quem chama precisa passar em gc_founders_admin() dentro da função;
--      parceiros comuns recebem 42501 e nenhuma linha.
--    - Retorna apenas id, nome, cnpj (somente se a coluna existir) e se a empresa já participa. Máx. 20 linhas.
--    - O CNPJ só é consultado quando a coluna public.empresas.cnpj existe (verificado em pg_attribute).
--
-- 2) Limite de empresas ativas (gatilho em founders_parceiros)
--    - A capacidade vem de glasscode_private.founders_config ('capacidade_primeira_turma'); nada fixo no código.
--    - O gatilho BEFORE INSERT OR UPDATE OF status vale para qualquer escritor (RPC, service_role, SQL direto).
--    - Serializa com pg_advisory_xact_lock global ('founders_capacidade_parceiros'); a contagem ocorre depois
--      do bloqueio, então cadastros simultâneos não ultrapassam o limite (READ COMMITTED, padrão do Supabase).
--    - Só consome vaga quem passa a 'ativo' (novo ou reativado). Atualizar quem já é ativo nunca é bloqueado.
--    - O nome do gatilho ordena antes de founders_parceiros_numero_trg: uma rejeição acontece antes do nextval,
--      portanto não consome número de fundador. A numeração dos fundadores existentes não é alterada.
--    - Configuração ausente/inválida bloqueia novas ativações (falha segura, SQLSTATE 55000).
--    - ON CONFLICT DO UPDATE: o gatilho de linha BEFORE INSERT dispara antes da detecção do conflito; se já
--      existe linha da empresa, ele não conta (é um upsert). O UPDATE resultante dispara o gatilho de linha
--      BEFORE UPDATE OF status (status está no SET), que conta a reativação. Por isso não há contorno.
--    - Ordem de bloqueios: um gatilho de COMANDO (founders_parceiros_capacidade_lock_trg) toma o advisory lock
--      de capacidade antes de qualquer bloqueio de linha. Caminho único: capacidade -> linha, tanto em
--      INSERT ... ON CONFLICT quanto em UPDATE direto (sem ele, UPDATE direto = linha -> capacidade e upsert =
--      capacidade -> linha formariam deadlock). Nenhuma outra função do Founders escreve em founders_parceiros
--      nem toma o lock de capacidade; as demais (sync/resgate/votação) bloqueiam contribuições, votações ou
--      advisory por empresa, sem ciclo com este.
--
-- 3) Matriz de proteção da capacidade
--    PROTEGIDO pelo lock global (gatilho de comando, tomado antes de qualquer bloqueio de linha):
--      a) dois INSERT de empresas novas ativas simultâneos (RPC, service_role ou SQL direto);
--      b) duas reativações (UPDATE ... SET status='ativo') simultâneas, de empresas diferentes;
--      c) INSERT novo concorrente com reativação (UPDATE) concorrente;
--      d) INSERT ... ON CONFLICT DO UPDATE concorrente com qualquer um dos anteriores (statements de
--         INSERT e de UPDATE disparam o gatilho de comando; ON CONFLICT DO UPDATE dispara ambos);
--      e) comandos de várias linhas: gatilhos BEFORE ROW enxergam as linhas já alteradas pelo mesmo comando,
--         então o comando inteiro é rejeitado se a última vaga for excedida;
--      f) a segunda transação espera o COMMIT/ROLLBACK da primeira e conta com snapshot novo (READ COMMITTED);
--         em REPEATABLE READ/SERIALIZABLE o gatilho de comando aborta (25000) em vez de contar dado obsoleto.
--    DEPENDE de outros bloqueios já adquiridos pela transação (o lock global NÃO elimina o risco):
--      g) transação que já bloqueou uma linha de founders_parceiros (UPDATE de outra coluna, SELECT ... FOR
--         UPDATE) e só depois altera status: ordem linha -> capacidade, inversa à de quem entra por
--         capacidade -> linha na mesma empresa. O PostgreSQL detecta o ciclo e aborta UMA das transações
--         (40P01); a capacidade nunca é excedida, mas há erro e nova tentativa. As RPCs existentes não fazem isso;
--      h) transações que tomaram outros locks (founders_sync_empresa_*, linhas de contribuição/votação) antes
--         de escrever em founders_parceiros: nenhuma função atual escreve nessa tabela depois deles; se isso
--         mudar no futuro, a ordem global deve ser capacidade primeiro.
--    NÃO PROTEGIDO / fora do escopo:
--      i) BEFORE triggers futuros que alterem NEW.status sem que status esteja no SET (UPDATE OF status não
--         dispararia). Hoje só existem os gatilhos de numeração e de updated_at, que não tocam em status;
--      j) DELETE só libera vaga; TRUNCATE e session_replication_role=replica (superusuário) ignoram gatilhos;
--      k) lacunas pré-existentes: se já houver mais ativos que a capacidade, só novas ativações são bloqueadas.
begin;

do $$
begin
  if to_regprocedure('public.gc_founders_admin()') is null
    or to_regclass('public.founders_parceiros') is null
    or to_regclass('public.empresas') is null
    or to_regclass('glasscode_private.founders_config') is null then
    raise exception 'Pré-requisito ausente: objetos base do Founders.';
  end if;
  if to_regprocedure('public.gc_founders_admin_definir_parceiro(uuid,text,numeric,integer,date,date)') is null then
    raise exception 'Pré-requisito ausente: gc_founders_admin_definir_parceiro.';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.founders_parceiros'::regclass and tgname = 'founders_parceiros_numero_trg'
  ) then
    raise exception 'Pré-requisito ausente: gatilho founders_parceiros_numero_trg.';
  end if;
  if not exists (
    select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls)
  ) then
    raise exception 'Execute como postgres: o dono das funções precisa de BYPASSRLS/superusuário para ler empresas (FORCE RLS).';
  end if;
  if not exists (
    select 1 from glasscode_private.founders_config
    where chave = 'capacidade_primeira_turma'
      and jsonb_typeof(valor) = 'number'
  ) then
    raise exception 'Configuração capacidade_primeira_turma ausente ou inválida em founders_config.';
  end if;
end $$;

-- 1) Busca administrativa de empresas
create or replace function public.gc_founders_admin_buscar_empresas(
  p_busca text,
  p_limite integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  termo text := trim(coalesce(p_busca, ''));
  digitos text := regexp_replace(coalesce(p_busca, ''), '\D', '', 'g');
  limite integer := greatest(1, least(coalesce(p_limite, 10), 20));
  padrao text;
  tem_cnpj boolean;
  resultado jsonb;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  if length(termo) < 3 then
    raise exception 'Informe ao menos 3 caracteres para pesquisar.' using errcode='22023';
  end if;
  if length(termo) > 100 then
    raise exception 'A pesquisa deve ter no máximo 100 caracteres.' using errcode='22023';
  end if;

  -- escapa os curingas do ILIKE: barra invertida, % e _ passam a ser literais
  padrao := '%' || replace(replace(replace(termo, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  select exists (
    select 1 from pg_attribute
    where attrelid = 'public.empresas'::regclass
      and attname = 'cnpj'
      and attnum > 0
      and not attisdropped
  ) into tem_cnpj;

  if tem_cnpj then
    execute $q$
      select coalesce(jsonb_agg(
        jsonb_build_object('id', x.id, 'nome', x.nome, 'cnpj', x.cnpj, 'participante', fp.id is not null)
        order by x.nome, x.id
      ), '[]'::jsonb)
      from (
        select e.id, e.nome, e.cnpj::text as cnpj
        from public.empresas e
        where e.nome ilike $1
           or (length($2) >= 8
               and regexp_replace(coalesce(e.cnpj::text, ''), '\D', '', 'g') like $2 || '%')
        order by e.nome, e.id
        limit $3
      ) x
      left join public.founders_parceiros fp on fp.empresa_id = x.id
    $q$
    into resultado
    using padrao, digitos, limite;
  else
    select coalesce(jsonb_agg(
      jsonb_build_object('id', x.id, 'nome', x.nome, 'cnpj', null, 'participante', fp.id is not null)
      order by x.nome, x.id
    ), '[]'::jsonb)
    into resultado
    from (
      select e.id, e.nome
      from public.empresas e
      where e.nome ilike padrao
      order by e.nome, e.id
      limit limite
    ) x
    left join public.founders_parceiros fp on fp.empresa_id = x.id;
  end if;

  return resultado;
end $$;

-- 2) Limite atômico de empresas ativas
create or replace function public.gc_founders_validar_capacidade()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  config jsonb;
  capacidade_texto text;
  capacidade numeric;
  ativos integer;
begin
  if new.status is distinct from 'ativo' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'ativo' then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_capacidade_parceiros', 0));

  -- INSERT ... ON CONFLICT DO UPDATE dispara este gatilho como INSERT antes de detectar o conflito;
  -- a linha existente será validada pelo gatilho de UPDATE (reativação), então não consome vaga aqui.
  if tg_op = 'INSERT' and exists (
    select 1 from public.founders_parceiros fp where fp.empresa_id = new.empresa_id
  ) then
    return new;
  end if;

  select c.valor into config
  from glasscode_private.founders_config c
  where c.chave = 'capacidade_primeira_turma';

  if config is null or jsonb_typeof(config) <> 'number' then
    raise exception 'Capacidade Founders não configurada.' using errcode='55000';
  end if;
  capacidade_texto := config #>> '{}';
  capacidade := capacidade_texto::numeric;
  if capacidade < 1 or capacidade > 100000 or capacidade <> trunc(capacidade) then
    raise exception 'Capacidade Founders inválida na configuração.' using errcode='55000';
  end if;

  select count(*)::integer into ativos
  from public.founders_parceiros fp
  where fp.status = 'ativo';

  if ativos >= capacidade::integer then
    raise exception 'O limite de % empresas Founders ativas foi atingido.', capacidade::integer
      using errcode='22023';
  end if;

  return new;
end $$;

-- Gatilho de comando (statement-level): dispara ANTES de qualquer gatilho de linha e antes de qualquer
-- bloqueio de linha do comando. Garante a ordem única "lock de capacidade -> lock de linha" em todos os
-- caminhos (RPC com INSERT ... ON CONFLICT, UPDATE direto, service_role). Sem ele, um UPDATE direto
-- (linha -> lock de capacidade) e um upsert da mesma empresa (lock de capacidade -> linha) poderiam
-- gerar deadlock.
create or replace function public.gc_founders_bloquear_capacidade()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  -- Em REPEATABLE READ/SERIALIZABLE o snapshot é anterior à espera pelo lock e a contagem ficaria obsoleta
  -- (duas transações poderiam ocupar a última vaga). Falha fechada em vez de contar com dado velho.
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Alterações de status de parceiros Founders exigem isolamento READ COMMITTED.'
      using errcode='25000';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_capacidade_parceiros', 0));
  return null;
end $$;

create or replace trigger founders_parceiros_capacidade_lock_trg
before insert or update of status on public.founders_parceiros
for each statement execute function public.gc_founders_bloquear_capacidade();

-- "capacidade" ordena antes de "numero": a rejeição ocorre antes do nextval do número de fundador
create or replace trigger founders_parceiros_capacidade_trg
before insert or update of status on public.founders_parceiros
for each row execute function public.gc_founders_validar_capacidade();

-- 3) Privilégios de execução
revoke execute on function public.gc_founders_validar_capacidade() from public, anon, authenticated;
revoke execute on function public.gc_founders_bloquear_capacidade() from public, anon, authenticated;

revoke execute on function public.gc_founders_admin_buscar_empresas(text,integer) from public, anon;
grant execute on function public.gc_founders_admin_buscar_empresas(text,integer) to authenticated;

-- 4) Verificação pós-criação: CREATE OR REPLACE preserva o dono anterior de uma função já existente.
-- O dono efetivo precisa ignorar o FORCE RLS de empresas e ler as tabelas usadas. O RLS não é alterado.
do $$
declare
  v_dono name;
  v_proc regprocedure;
begin
  foreach v_proc in array array[
    'public.gc_founders_admin_buscar_empresas(text,integer)'::regprocedure,
    'public.gc_founders_validar_capacidade()'::regprocedure,
    'public.gc_founders_bloquear_capacidade()'::regprocedure
  ]
  loop
    select r.rolname into v_dono
    from pg_proc p join pg_roles r on r.oid = p.proowner
    where p.oid = v_proc and (r.rolsuper or r.rolbypassrls);
    if v_dono is null then
      raise exception 'O dono de % não tem BYPASSRLS/superusuário; o FORCE RLS de empresas bloquearia a leitura.', v_proc;
    end if;
  end loop;

  select r.rolname into v_dono
  from pg_proc p join pg_roles r on r.oid = p.proowner
  where p.oid = 'public.gc_founders_admin_buscar_empresas(text,integer)'::regprocedure;
  if not has_table_privilege(v_dono, 'public.empresas', 'select')
     or not has_table_privilege(v_dono, 'public.founders_parceiros', 'select')
     or not has_schema_privilege(v_dono, 'glasscode_private', 'usage')
     or not has_table_privilege(v_dono, 'glasscode_private.founders_config', 'select') then
    raise exception 'O dono % não tem SELECT/USAGE necessários para a busca e a capacidade.', v_dono;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
