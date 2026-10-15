-- Fundação do módulo Glass Code Founders
-- Etapa 2: estrutura de dados + permissões + funções de domínio
-- Não executa cobrança; apenas prepara contratos e segurança.
begin;

do $$
begin
  if to_regprocedure('public.gc_proprietaria()') is null then
    raise exception 'Pré-requisito ausente: execute painel_plataforma.sql antes desta migração.';
  end if;
  if to_regclass('public.empresas') is null then
    raise exception 'Tabela pública obrigatória ausente: public.empresas.';
  end if;
  if to_regclass('public.perfis_usuarios') is null then
    raise exception 'Tabela pública obrigatória ausente: public.perfis_usuarios.';
  end if;
end $$;

create schema if not exists glasscode_private;
revoke all on schema glasscode_private from public, anon, authenticated;

create sequence if not exists public.founders_numero_fundador_seq start 1 increment 1 minvalue 1;

create table if not exists public.founders_parceiros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id) on delete restrict,
  numero_fundador integer not null unique,
  data_adesao date not null default (now() at time zone 'America/Sao_Paulo')::date,
  valor_mensal_acordado numeric(12,2) not null default 39.90 check (valor_mensal_acordado >= 0),
  quantidade_usuarios_inclusos integer not null default 3 check (quantidade_usuarios_inclusos between 1 and 200),
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'pausado', 'encerrado')),
  ciclo_avaliacao_inicio date not null default (now() at time zone 'America/Sao_Paulo')::date,
  ciclo_avaliacao_fim date not null default ((now() at time zone 'America/Sao_Paulo')::date + 90),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (ciclo_avaliacao_fim >= ciclo_avaliacao_inicio)
);

create table if not exists public.founders_contribuicoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  parceiro_id uuid not null references public.founders_parceiros(id) on delete restrict,
  autor_id uuid not null references auth.users(id) on delete restrict,
  titulo text not null check (length(trim(titulo)) between 3 and 180),
  descricao text not null check (length(trim(descricao)) between 10 and 20000),
  categoria text not null check (length(trim(categoria)) between 2 and 80),
  status text not null default 'enviada' check (
    status in ('rascunho', 'enviada', 'em_triagem', 'em_votacao', 'aprovada', 'rejeitada', 'implementada')
  ),
  pontos_previstos integer not null default 0 check (pontos_previstos between 0 and 100000),
  pontos_concedidos integer not null default 0 check (pontos_concedidos between 0 and 100000),
  validada_em timestamptz,
  validada_por uuid references auth.users(id) on delete set null,
  nota_administrativa text not null default '' check (length(nota_administrativa) <= 4000),
  idempotency_key text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists founders_contribuicoes_idempotency_idx
  on public.founders_contribuicoes(empresa_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.founders_contribuicao_anexos (
  id uuid primary key default gen_random_uuid(),
  contribuicao_id uuid not null references public.founders_contribuicoes(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  autor_id uuid not null references auth.users(id) on delete restrict,
  storage_bucket text not null default 'founders-anexos' check (length(trim(storage_bucket)) between 3 and 63),
  storage_path text not null check (length(trim(storage_path)) between 10 and 1000),
  nome_arquivo text not null check (length(trim(nome_arquivo)) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
  tamanho_bytes bigint not null check (tamanho_bytes between 1 and 10485760),
  hash_arquivo text,
  criado_em timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table if not exists public.founders_votacoes (
  id uuid primary key default gen_random_uuid(),
  contribuicao_id uuid not null unique references public.founders_contribuicoes(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 3 and 180),
  descricao text not null check (length(trim(descricao)) between 10 and 8000),
  status text not null default 'rascunho' check (status in ('rascunho', 'aberta', 'encerrada', 'cancelada')),
  abre_em timestamptz,
  encerra_em timestamptz,
  criada_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (encerra_em is null or abre_em is null or encerra_em > abre_em)
);

create table if not exists public.founders_votos (
  id uuid primary key default gen_random_uuid(),
  votacao_id uuid not null references public.founders_votacoes(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  usuario_id uuid not null references auth.users(id) on delete restrict,
  voto text not null check (voto in ('favor', 'contra', 'abster')),
  observacao text not null default '' check (length(observacao) <= 1500),
  criado_em timestamptz not null default now(),
  unique (votacao_id, empresa_id)
);

create table if not exists public.founders_pontos_ledger (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  parceiro_id uuid not null references public.founders_parceiros(id) on delete restrict,
  tipo text not null check (tipo in ('credito', 'debito', 'estorno_credito', 'estorno_debito')),
  origem text not null check (origem in ('contribuicao', 'beneficio', 'ajuste', 'estorno', 'importacao')),
  referencia_id uuid,
  pontos integer not null check (pontos > 0),
  descricao text not null check (length(trim(descricao)) between 3 and 1000),
  idempotency_key text not null check (length(trim(idempotency_key)) between 8 and 180),
  lancado_por uuid references auth.users(id) on delete set null,
  lancamento_relacionado_id uuid references public.founders_pontos_ledger(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, idempotency_key)
);

create unique index if not exists founders_pontos_ref_unica_idx
  on public.founders_pontos_ledger(empresa_id, origem, referencia_id, tipo)
  where referencia_id is not null and tipo in ('credito', 'debito');

create table if not exists public.founders_beneficios (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (length(trim(codigo)) between 2 and 60),
  nome text not null check (length(trim(nome)) between 3 and 120),
  descricao text not null check (length(trim(descricao)) between 5 and 4000),
  pontos_necessarios integer not null check (pontos_necessarios > 0),
  limite_por_empresa integer check (limite_por_empresa is null or limite_por_empresa > 0),
  estoque_total integer check (estoque_total is null or estoque_total >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.founders_resgates (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  parceiro_id uuid not null references public.founders_parceiros(id) on delete restrict,
  beneficio_id uuid not null references public.founders_beneficios(id) on delete restrict,
  solicitado_por uuid not null references auth.users(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  pontos_total integer not null check (pontos_total > 0),
  status text not null default 'solicitado' check (status in ('solicitado', 'aprovado', 'entregue', 'cancelado', 'negado')),
  observacao text not null default '' check (length(observacao) <= 2000),
  idempotency_key text not null check (length(trim(idempotency_key)) between 8 and 180),
  lancamento_debito_id uuid unique references public.founders_pontos_ledger(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, idempotency_key)
);

create table if not exists glasscode_private.founders_admins (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  papel text not null default 'admin' check (papel in ('owner', 'admin', 'operador')),
  ativo boolean not null default true,
  concedido_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists glasscode_private.founders_auditoria (
  id bigint generated always as identity primary key,
  autor_id uuid references auth.users(id) on delete set null,
  acao text not null check (length(trim(acao)) between 3 and 120),
  alvo_tipo text not null check (length(trim(alvo_tipo)) between 3 and 80),
  alvo_id uuid,
  empresa_id uuid references public.empresas(id) on delete set null,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists glasscode_private.founders_config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

insert into glasscode_private.founders_config(chave, valor)
values
  ('mensalidade_sugerida_centavos', to_jsonb(3990)),
  ('usuarios_inclusos_padrao', to_jsonb(3)),
  ('capacidade_primeira_turma', to_jsonb(30)),
  ('avaliacao_inicial_dias', to_jsonb(90)),
  ('pontos_contribuicao_validada_padrao', to_jsonb(100))
on conflict (chave) do nothing;

create or replace function glasscode_private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create or replace function public.gc_founders_definir_numero_fundador()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.numero_fundador is null or new.numero_fundador <= 0 then
    new.numero_fundador := nextval('public.founders_numero_fundador_seq');
  end if;
  return new;
end $$;

create or replace function public.gc_founders_admin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select auth.uid() is not null and (
    public.gc_proprietaria()
    or exists (
      select 1
      from glasscode_private.founders_admins a
      where a.usuario_id = auth.uid()
        and a.ativo
    )
  );
$$;

create or replace function public.gc_founders_empresa_id()
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select p.empresa_id
  from public.perfis_usuarios p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.gc_founders_empresa_ativa(p_empresa_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare empresa uuid := coalesce(p_empresa_id, public.gc_founders_empresa_id());
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if empresa is null then
    return false;
  end if;
  return exists (
    select 1
    from public.founders_parceiros fp
    where fp.empresa_id = empresa
      and fp.status = 'ativo'
      and hoje between fp.ciclo_avaliacao_inicio and fp.ciclo_avaliacao_fim
  );
end $$;

create or replace function public.gc_founders_saldo_pontos(p_empresa_id uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path=''
as $$
declare empresa uuid := coalesce(p_empresa_id, public.gc_founders_empresa_id());
declare saldo integer;
begin
  if empresa is null then
    raise exception 'Empresa não vinculada' using errcode='22023';
  end if;
  if not public.gc_founders_admin() and empresa <> public.gc_founders_empresa_id() then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  select coalesce(sum(
    case
      when tipo in ('credito', 'estorno_debito') then pontos
      else -pontos
    end
  ), 0)::integer
  into saldo
  from public.founders_pontos_ledger
  where empresa_id = empresa;
  return coalesce(saldo, 0);
end $$;

create or replace function public.gc_founders_registrar_auditoria(
  p_acao text,
  p_alvo_tipo text,
  p_alvo_id uuid,
  p_empresa_id uuid,
  p_detalhes jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if not public.gc_founders_admin() then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  insert into glasscode_private.founders_auditoria(autor_id, acao, alvo_tipo, alvo_id, empresa_id, detalhes)
  values (auth.uid(), trim(p_acao), trim(p_alvo_tipo), p_alvo_id, p_empresa_id, coalesce(p_detalhes, '{}'::jsonb));
end $$;

create or replace function public.gc_founders_criar_contribuicao(
  p_titulo text,
  p_descricao text,
  p_categoria text,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare empresa uuid := public.gc_founders_empresa_id();
declare parceiro uuid;
declare contribuição uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if not public.gc_founders_empresa_ativa(empresa) then
    raise exception 'Sua empresa não está ativa no programa Founders.' using errcode='42501';
  end if;
  select id into parceiro from public.founders_parceiros where empresa_id = empresa;
  if parceiro is null then
    raise exception 'Parceiro Founders não encontrado para a empresa.' using errcode='22023';
  end if;
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) < 8 then
    raise exception 'A chave de idempotência deve ter ao menos 8 caracteres.' using errcode='22023';
  end if;
  insert into public.founders_contribuicoes(
    empresa_id, parceiro_id, autor_id, titulo, descricao, categoria, idempotency_key
  )
  values (
    empresa, parceiro, auth.uid(), trim(p_titulo), trim(p_descricao), trim(p_categoria), nullif(trim(p_idempotency_key), '')
  )
  returning id into contribuição;
  return contribuição;
end $$;

create or replace function public.gc_founders_anexar_contribuicao(
  p_contribuicao_id uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_nome_arquivo text,
  p_mime_type text,
  p_tamanho_bytes bigint,
  p_hash_arquivo text default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare empresa uuid := public.gc_founders_empresa_id();
declare anexo uuid;
declare contrib public.founders_contribuicoes;
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if not public.gc_founders_empresa_ativa(empresa) then
    raise exception 'Sua empresa não está ativa no programa Founders.' using errcode='42501';
  end if;
  select * into contrib
  from public.founders_contribuicoes
  where id = p_contribuicao_id
    and empresa_id = empresa;
  if contrib.id is null then
    raise exception 'Contribuição não encontrada para sua empresa.' using errcode='22023';
  end if;
  if left(trim(p_storage_path), 36) <> empresa::text or substr(trim(p_storage_path), 37, 1) <> '/' then
    raise exception 'O caminho do anexo deve iniciar com o id da empresa.' using errcode='22023';
  end if;
  insert into public.founders_contribuicao_anexos(
    contribuicao_id, empresa_id, autor_id, storage_bucket, storage_path, nome_arquivo, mime_type, tamanho_bytes, hash_arquivo
  )
  values (
    p_contribuicao_id, empresa, auth.uid(), trim(p_storage_bucket), trim(p_storage_path), trim(p_nome_arquivo),
    trim(p_mime_type), p_tamanho_bytes, nullif(trim(coalesce(p_hash_arquivo, '')), '')
  )
  returning id into anexo;
  return anexo;
end $$;

create or replace function public.gc_founders_votar(
  p_votacao_id uuid,
  p_voto text,
  p_observacao text default ''
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare empresa uuid := public.gc_founders_empresa_id();
declare voto_id uuid;
declare votacao public.founders_votacoes;
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if not public.gc_founders_empresa_ativa(empresa) then
    raise exception 'Sua empresa não está ativa no programa Founders.' using errcode='42501';
  end if;
  select * into votacao from public.founders_votacoes where id = p_votacao_id;
  if votacao.id is null then
    raise exception 'Votação não encontrada.' using errcode='22023';
  end if;
  if votacao.status <> 'aberta' then
    raise exception 'A votação não está aberta.' using errcode='22023';
  end if;
  if votacao.abre_em is not null and now() < votacao.abre_em then
    raise exception 'A votação ainda não iniciou.' using errcode='22023';
  end if;
  if votacao.encerra_em is not null and now() > votacao.encerra_em then
    raise exception 'A votação já foi encerrada.' using errcode='22023';
  end if;
  insert into public.founders_votos(votacao_id, empresa_id, usuario_id, voto, observacao)
  values (p_votacao_id, empresa, auth.uid(), trim(p_voto), left(coalesce(p_observacao, ''), 1500))
  returning id into voto_id;
  return voto_id;
exception
  when unique_violation then
    raise exception 'Sua empresa já registrou voto nesta votação.' using errcode='22023';
end $$;

create or replace function public.gc_founders_resgatar_beneficio(
  p_beneficio_id uuid,
  p_quantidade integer,
  p_idempotency_key text,
  p_observacao text default ''
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare empresa uuid := public.gc_founders_empresa_id();
declare parceiro public.founders_parceiros;
declare beneficio public.founders_beneficios;
declare saldo integer;
declare pontos_total integer;
declare resgate_id uuid;
declare lancamento_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade inválida.' using errcode='22023';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'Informe uma chave de idempotência válida.' using errcode='22023';
  end if;
  if not public.gc_founders_empresa_ativa(empresa) then
    raise exception 'Sua empresa não está ativa no programa Founders.' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_resgate_' || empresa::text, 0));

  if exists (
    select 1 from public.founders_resgates
    where empresa_id = empresa and idempotency_key = trim(p_idempotency_key)
  ) then
    raise exception 'Resgate duplicado detectado para a mesma chave de idempotência.' using errcode='22023';
  end if;

  select * into parceiro from public.founders_parceiros where empresa_id = empresa;
  if parceiro.id is null then
    raise exception 'Parceiro Founders não encontrado para a empresa.' using errcode='22023';
  end if;

  select * into beneficio from public.founders_beneficios where id = p_beneficio_id;
  if beneficio.id is null or beneficio.ativo is not true then
    raise exception 'Benefício indisponível.' using errcode='22023';
  end if;

  pontos_total := beneficio.pontos_necessarios * p_quantidade;
  saldo := public.gc_founders_saldo_pontos(empresa);
  if saldo < pontos_total then
    raise exception 'Saldo insuficiente para este resgate.' using errcode='22023';
  end if;

  if beneficio.limite_por_empresa is not null and (
    select coalesce(sum(r.quantidade), 0)
    from public.founders_resgates r
    where r.empresa_id = empresa
      and r.beneficio_id = beneficio.id
      and r.status in ('solicitado', 'aprovado', 'entregue')
  ) + p_quantidade > beneficio.limite_por_empresa then
    raise exception 'Limite de resgates por empresa excedido para este benefício.' using errcode='22023';
  end if;

  if beneficio.estoque_total is not null and (
    select coalesce(sum(r.quantidade), 0)
    from public.founders_resgates r
    where r.beneficio_id = beneficio.id
      and r.status in ('solicitado', 'aprovado', 'entregue')
  ) + p_quantidade > beneficio.estoque_total then
    raise exception 'Estoque indisponível para este benefício.' using errcode='22023';
  end if;

  insert into public.founders_resgates(
    empresa_id, parceiro_id, beneficio_id, solicitado_por, quantidade, pontos_total, observacao, idempotency_key
  )
  values (
    empresa, parceiro.id, beneficio.id, auth.uid(), p_quantidade, pontos_total, left(coalesce(p_observacao, ''), 2000), trim(p_idempotency_key)
  )
  returning id into resgate_id;

  insert into public.founders_pontos_ledger(
    empresa_id, parceiro_id, tipo, origem, referencia_id, pontos, descricao, idempotency_key, lancado_por
  )
  values (
    empresa,
    parceiro.id,
    'debito',
    'beneficio',
    resgate_id,
    pontos_total,
    'Resgate de benefício: ' || beneficio.nome,
    'resgate:' || resgate_id::text,
    auth.uid()
  )
  returning id into lancamento_id;

  update public.founders_resgates
  set lancamento_debito_id = lancamento_id
  where id = resgate_id;

  return resgate_id;
end $$;

create or replace function public.gc_founders_admin_definir_parceiro(
  p_empresa_id uuid,
  p_status text,
  p_valor_mensal_acordado numeric,
  p_quantidade_usuarios_inclusos integer,
  p_ciclo_inicio date,
  p_ciclo_fim date
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare parceiro_id uuid;
declare antes jsonb;
declare depois jsonb;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  if p_empresa_id is null or not exists(select 1 from public.empresas where id = p_empresa_id) then
    raise exception 'Empresa inválida.' using errcode='22023';
  end if;
  if p_status not in ('ativo', 'inativo', 'pausado', 'encerrado') then
    raise exception 'Status inválido.' using errcode='22023';
  end if;
  if p_ciclo_fim < p_ciclo_inicio then
    raise exception 'Período de avaliação inválido.' using errcode='22023';
  end if;

  select to_jsonb(fp) into antes from public.founders_parceiros fp where fp.empresa_id = p_empresa_id;

  insert into public.founders_parceiros(
    empresa_id, status, valor_mensal_acordado, quantidade_usuarios_inclusos, ciclo_avaliacao_inicio, ciclo_avaliacao_fim
  )
  values (
    p_empresa_id, p_status, p_valor_mensal_acordado, p_quantidade_usuarios_inclusos, p_ciclo_inicio, p_ciclo_fim
  )
  on conflict (empresa_id) do update
  set
    status = excluded.status,
    valor_mensal_acordado = excluded.valor_mensal_acordado,
    quantidade_usuarios_inclusos = excluded.quantidade_usuarios_inclusos,
    ciclo_avaliacao_inicio = excluded.ciclo_avaliacao_inicio,
    ciclo_avaliacao_fim = excluded.ciclo_avaliacao_fim,
    atualizado_em = now()
  returning id into parceiro_id;

  select to_jsonb(fp) into depois from public.founders_parceiros fp where fp.id = parceiro_id;
  perform public.gc_founders_registrar_auditoria(
    'founders_admin_definir_parceiro',
    'parceiro',
    parceiro_id,
    p_empresa_id,
    jsonb_build_object('antes', antes, 'depois', depois)
  );
  return parceiro_id;
end $$;

create or replace function public.gc_founders_admin_ajustar_pontos(
  p_empresa_id uuid,
  p_tipo text,
  p_pontos integer,
  p_motivo text,
  p_idempotency_key text,
  p_referencia_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare parceiro public.founders_parceiros;
declare saldo integer;
declare lancamento_id uuid;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  if p_tipo not in ('credito', 'debito', 'estorno_credito', 'estorno_debito') then
    raise exception 'Tipo de lançamento inválido.' using errcode='22023';
  end if;
  if p_pontos is null or p_pontos <= 0 then
    raise exception 'A quantidade de pontos deve ser maior que zero.' using errcode='22023';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Informe um motivo com ao menos 3 caracteres.' using errcode='22023';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'A chave de idempotência deve ter ao menos 8 caracteres.' using errcode='22023';
  end if;

  select * into parceiro from public.founders_parceiros where empresa_id = p_empresa_id;
  if parceiro.id is null then
    raise exception 'Empresa não cadastrada como parceira Founders.' using errcode='22023';
  end if;

  if p_tipo in ('debito', 'estorno_credito') then
    saldo := public.gc_founders_saldo_pontos(p_empresa_id);
    if saldo < p_pontos then
      raise exception 'Ajuste recusado: saldo insuficiente para débito.' using errcode='22023';
    end if;
  end if;

  insert into public.founders_pontos_ledger(
    empresa_id, parceiro_id, tipo, origem, referencia_id, pontos, descricao, idempotency_key, lancado_por
  )
  values (
    p_empresa_id, parceiro.id, p_tipo, 'ajuste', p_referencia_id, p_pontos, trim(p_motivo), trim(p_idempotency_key), auth.uid()
  )
  returning id into lancamento_id;

  perform public.gc_founders_registrar_auditoria(
    'founders_admin_ajustar_pontos',
    'pontos_ledger',
    lancamento_id,
    p_empresa_id,
    jsonb_build_object('tipo', p_tipo, 'pontos', p_pontos, 'motivo', trim(p_motivo))
  );
  return lancamento_id;
exception
  when unique_violation then
    raise exception 'Lançamento duplicado para a mesma chave de idempotência.' using errcode='22023';
end $$;

create or replace function public.gc_founders_admin_atualizar_contribuicao(
  p_contribuicao_id uuid,
  p_status text,
  p_pontos_concedidos integer default null,
  p_nota_administrativa text default ''
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare c public.founders_contribuicoes;
declare conceder integer;
declare idempotencia text;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  if p_status not in ('em_triagem', 'em_votacao', 'aprovada', 'rejeitada', 'implementada') then
    raise exception 'Status administrativo inválido.' using errcode='22023';
  end if;

  select * into c from public.founders_contribuicoes where id = p_contribuicao_id for update;
  if c.id is null then
    raise exception 'Contribuição não encontrada.' using errcode='22023';
  end if;

  update public.founders_contribuicoes
  set
    status = p_status,
    nota_administrativa = left(coalesce(p_nota_administrativa, ''), 4000),
    validada_em = case when p_status in ('aprovada', 'rejeitada', 'implementada') then now() else validada_em end,
    validada_por = case when p_status in ('aprovada', 'rejeitada', 'implementada') then auth.uid() else validada_por end
  where id = p_contribuicao_id;

  if p_status in ('aprovada', 'implementada') then
    conceder := coalesce(p_pontos_concedidos, c.pontos_previstos, 0);
    if conceder > 0 and c.pontos_concedidos = 0 then
      idempotencia := 'contribuicao_credito:' || c.id::text;
      perform public.gc_founders_admin_ajustar_pontos(
        c.empresa_id,
        'credito',
        conceder,
        'Crédito por contribuição validada',
        idempotencia,
        c.id
      );
      update public.founders_contribuicoes
      set pontos_concedidos = conceder
      where id = c.id;
    end if;
  end if;

  perform public.gc_founders_registrar_auditoria(
    'founders_admin_atualizar_contribuicao',
    'contribuicao',
    c.id,
    c.empresa_id,
    jsonb_build_object('status', p_status, 'pontos_concedidos', coalesce(p_pontos_concedidos, c.pontos_concedidos))
  );
end $$;

create or replace function public.gc_founders_admin_painel(p_busca text default '', p_pagina integer default 0)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare deslocamento integer := greatest(0, least(coalesce(p_pagina, 0), 100000)) * 50;
declare busca text := left(coalesce(p_busca, ''), 100);
declare resultado jsonb;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  select jsonb_build_object(
    'resumo', jsonb_build_object(
      'parceiros_ativos', (select count(*) from public.founders_parceiros where status='ativo'),
      'contribuicoes_abertas', (select count(*) from public.founders_contribuicoes where status in ('enviada', 'em_triagem', 'em_votacao')),
      'votacoes_abertas', (select count(*) from public.founders_votacoes where status='aberta'),
      'resgates_pendentes', (select count(*) from public.founders_resgates where status='solicitado')
    ),
    'parceiros', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select fp.*, e.nome as empresa_nome
      from public.founders_parceiros fp
      join public.empresas e on e.id = fp.empresa_id
      where e.nome ilike '%' || busca || '%' or fp.numero_fundador::text ilike '%' || busca || '%'
      order by fp.numero_fundador
      limit 50 offset deslocamento
    ) t), '[]'::jsonb),
    'contribuicoes', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select c.id, c.empresa_id, e.nome as empresa_nome, c.titulo, c.categoria, c.status, c.criado_em, c.pontos_concedidos
      from public.founders_contribuicoes c
      join public.empresas e on e.id = c.empresa_id
      where c.titulo ilike '%' || busca || '%' or e.nome ilike '%' || busca || '%'
      order by c.criado_em desc
      limit 50 offset deslocamento
    ) t), '[]'::jsonb)
  ) into resultado;
  return resultado;
end $$;

create or replace function public.gc_founders_minha_area()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare empresa uuid := public.gc_founders_empresa_id();
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if empresa is null then
    raise exception 'Empresa não vinculada' using errcode='22023';
  end if;
  if not public.gc_founders_empresa_ativa(empresa) then
    raise exception 'Sua empresa não está ativa no programa Founders.' using errcode='42501';
  end if;
  return jsonb_build_object(
    'empresa_id', empresa,
    'parceiro', (select to_jsonb(fp) from public.founders_parceiros fp where fp.empresa_id = empresa),
    'saldo_pontos', public.gc_founders_saldo_pontos(empresa),
    'contribuicoes', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select id, titulo, categoria, status, criado_em, pontos_concedidos
      from public.founders_contribuicoes
      where empresa_id = empresa
      order by criado_em desc
      limit 50
    ) t), '[]'::jsonb),
    'votacoes_abertas', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select v.id, v.titulo, v.descricao, v.abre_em, v.encerra_em,
        exists(select 1 from public.founders_votos fv where fv.votacao_id = v.id and fv.empresa_id = empresa) as voto_registrado
      from public.founders_votacoes v
      where v.status = 'aberta'
      order by v.criado_em desc
      limit 20
    ) t), '[]'::jsonb),
    'beneficios', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select id, codigo, nome, descricao, pontos_necessarios, limite_por_empresa, estoque_total
      from public.founders_beneficios
      where ativo
      order by pontos_necessarios asc, nome asc
      limit 100
    ) t), '[]'::jsonb)
  );
end $$;

create or replace function public.gc_founders_bloquear_alteracao_ledger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception 'O histórico de pontos é imutável. Use estorno por novo lançamento.' using errcode='22023';
end $$;

drop trigger if exists founders_parceiros_numero_trg on public.founders_parceiros;
create trigger founders_parceiros_numero_trg
before insert on public.founders_parceiros
for each row execute function public.gc_founders_definir_numero_fundador();

drop trigger if exists founders_parceiros_updated_at_trg on public.founders_parceiros;
create trigger founders_parceiros_updated_at_trg
before update on public.founders_parceiros
for each row execute function glasscode_private.touch_updated_at();

drop trigger if exists founders_contribuicoes_updated_at_trg on public.founders_contribuicoes;
create trigger founders_contribuicoes_updated_at_trg
before update on public.founders_contribuicoes
for each row execute function glasscode_private.touch_updated_at();

drop trigger if exists founders_votacoes_updated_at_trg on public.founders_votacoes;
create trigger founders_votacoes_updated_at_trg
before update on public.founders_votacoes
for each row execute function glasscode_private.touch_updated_at();

drop trigger if exists founders_beneficios_updated_at_trg on public.founders_beneficios;
create trigger founders_beneficios_updated_at_trg
before update on public.founders_beneficios
for each row execute function glasscode_private.touch_updated_at();

drop trigger if exists founders_resgates_updated_at_trg on public.founders_resgates;
create trigger founders_resgates_updated_at_trg
before update on public.founders_resgates
for each row execute function glasscode_private.touch_updated_at();

drop trigger if exists founders_admins_updated_at_trg on glasscode_private.founders_admins;
create trigger founders_admins_updated_at_trg
before update on glasscode_private.founders_admins
for each row execute function glasscode_private.touch_updated_at();

drop trigger if exists founders_config_updated_at_trg on glasscode_private.founders_config;
create trigger founders_config_updated_at_trg
before update on glasscode_private.founders_config
for each row execute function glasscode_private.touch_updated_at();

drop trigger if exists founders_ledger_immutavel_upd_trg on public.founders_pontos_ledger;
create trigger founders_ledger_immutavel_upd_trg
before update on public.founders_pontos_ledger
for each row execute function public.gc_founders_bloquear_alteracao_ledger();

drop trigger if exists founders_ledger_immutavel_del_trg on public.founders_pontos_ledger;
create trigger founders_ledger_immutavel_del_trg
before delete on public.founders_pontos_ledger
for each row execute function public.gc_founders_bloquear_alteracao_ledger();

alter table public.founders_parceiros enable row level security;
alter table public.founders_contribuicoes enable row level security;
alter table public.founders_contribuicao_anexos enable row level security;
alter table public.founders_votacoes enable row level security;
alter table public.founders_votos enable row level security;
alter table public.founders_pontos_ledger enable row level security;
alter table public.founders_beneficios enable row level security;
alter table public.founders_resgates enable row level security;
alter table glasscode_private.founders_admins enable row level security;
alter table glasscode_private.founders_auditoria enable row level security;
alter table glasscode_private.founders_config enable row level security;

revoke all on public.founders_parceiros, public.founders_contribuicoes, public.founders_contribuicao_anexos,
  public.founders_votacoes, public.founders_votos, public.founders_pontos_ledger, public.founders_beneficios,
  public.founders_resgates from public, anon;
revoke all on glasscode_private.founders_admins, glasscode_private.founders_auditoria, glasscode_private.founders_config from public, anon, authenticated;
revoke all on public.founders_numero_fundador_seq from public, anon;

grant select on public.founders_parceiros, public.founders_contribuicoes, public.founders_contribuicao_anexos,
  public.founders_votacoes, public.founders_votos, public.founders_pontos_ledger, public.founders_beneficios,
  public.founders_resgates to authenticated;
grant insert on public.founders_contribuicoes, public.founders_contribuicao_anexos, public.founders_votos, public.founders_resgates to authenticated;
grant usage, select on sequence public.founders_numero_fundador_seq to authenticated;

drop policy if exists founders_parceiros_select on public.founders_parceiros;
create policy founders_parceiros_select on public.founders_parceiros
for select to authenticated
using (
  public.gc_founders_admin()
  or exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = founders_parceiros.empresa_id
  )
);

drop policy if exists founders_parceiros_admin_write on public.founders_parceiros;
create policy founders_parceiros_admin_write on public.founders_parceiros
for all to authenticated
using (public.gc_founders_admin())
with check (public.gc_founders_admin());

drop policy if exists founders_contribuicoes_select on public.founders_contribuicoes;
create policy founders_contribuicoes_select on public.founders_contribuicoes
for select to authenticated
using (
  public.gc_founders_admin()
  or exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = founders_contribuicoes.empresa_id
  )
);

drop policy if exists founders_contribuicoes_insert on public.founders_contribuicoes;
create policy founders_contribuicoes_insert on public.founders_contribuicoes
for insert to authenticated
with check (
  exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = founders_contribuicoes.empresa_id
  )
  and founders_contribuicoes.autor_id = auth.uid()
);

drop policy if exists founders_contribuicoes_admin_update on public.founders_contribuicoes;
create policy founders_contribuicoes_admin_update on public.founders_contribuicoes
for update to authenticated
using (public.gc_founders_admin())
with check (public.gc_founders_admin());

drop policy if exists founders_contribuicao_anexos_select on public.founders_contribuicao_anexos;
create policy founders_contribuicao_anexos_select on public.founders_contribuicao_anexos
for select to authenticated
using (
  public.gc_founders_admin()
  or exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = founders_contribuicao_anexos.empresa_id
  )
);

drop policy if exists founders_contribuicao_anexos_insert on public.founders_contribuicao_anexos;
create policy founders_contribuicao_anexos_insert on public.founders_contribuicao_anexos
for insert to authenticated
with check (
  exists (
    select 1
    from public.perfis_usuarios pu
    join public.founders_contribuicoes fc on fc.id = founders_contribuicao_anexos.contribuicao_id
    where pu.id = auth.uid()
      and pu.empresa_id = founders_contribuicao_anexos.empresa_id
      and fc.empresa_id = founders_contribuicao_anexos.empresa_id
  )
  and founders_contribuicao_anexos.autor_id = auth.uid()
);

drop policy if exists founders_votacoes_select on public.founders_votacoes;
create policy founders_votacoes_select on public.founders_votacoes
for select to authenticated
using (
  public.gc_founders_admin()
  or exists (
    select 1
    from public.founders_contribuicoes c
    join public.perfis_usuarios pu on pu.empresa_id = c.empresa_id
    where c.id = founders_votacoes.contribuicao_id
      and pu.id = auth.uid()
  )
);

drop policy if exists founders_votacoes_admin_write on public.founders_votacoes;
create policy founders_votacoes_admin_write on public.founders_votacoes
for all to authenticated
using (public.gc_founders_admin())
with check (public.gc_founders_admin());

drop policy if exists founders_votos_select on public.founders_votos;
create policy founders_votos_select on public.founders_votos
for select to authenticated
using (
  public.gc_founders_admin()
  or exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = founders_votos.empresa_id
  )
);

drop policy if exists founders_votos_insert on public.founders_votos;
create policy founders_votos_insert on public.founders_votos
for insert to authenticated
with check (
  exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = founders_votos.empresa_id
  )
  and founders_votos.usuario_id = auth.uid()
);

drop policy if exists founders_pontos_ledger_select on public.founders_pontos_ledger;
create policy founders_pontos_ledger_select on public.founders_pontos_ledger
for select to authenticated
using (
  public.gc_founders_admin()
  or exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = founders_pontos_ledger.empresa_id
  )
);

drop policy if exists founders_beneficios_select on public.founders_beneficios;
create policy founders_beneficios_select on public.founders_beneficios
for select to authenticated
using (public.gc_founders_admin() or ativo = true);

drop policy if exists founders_beneficios_admin_write on public.founders_beneficios;
create policy founders_beneficios_admin_write on public.founders_beneficios
for all to authenticated
using (public.gc_founders_admin())
with check (public.gc_founders_admin());

drop policy if exists founders_resgates_select on public.founders_resgates;
create policy founders_resgates_select on public.founders_resgates
for select to authenticated
using (
  public.gc_founders_admin()
  or exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = founders_resgates.empresa_id
  )
);

drop policy if exists founders_resgates_admin_update on public.founders_resgates;
create policy founders_resgates_admin_update on public.founders_resgates
for update to authenticated
using (public.gc_founders_admin())
with check (public.gc_founders_admin());

drop policy if exists founders_admins_rw on glasscode_private.founders_admins;
create policy founders_admins_rw on glasscode_private.founders_admins
for all to authenticated
using (public.gc_proprietaria())
with check (public.gc_proprietaria());

drop policy if exists founders_auditoria_select on glasscode_private.founders_auditoria;
create policy founders_auditoria_select on glasscode_private.founders_auditoria
for select to authenticated
using (public.gc_founders_admin());

drop policy if exists founders_config_rw on glasscode_private.founders_config;
create policy founders_config_rw on glasscode_private.founders_config
for all to authenticated
using (public.gc_founders_admin())
with check (public.gc_founders_admin());

revoke all on function
  public.gc_founders_definir_numero_fundador(),
  public.gc_founders_admin(),
  public.gc_founders_empresa_id(),
  public.gc_founders_empresa_ativa(uuid),
  public.gc_founders_saldo_pontos(uuid),
  public.gc_founders_registrar_auditoria(text,text,uuid,uuid,jsonb),
  public.gc_founders_criar_contribuicao(text,text,text,text),
  public.gc_founders_anexar_contribuicao(uuid,text,text,text,text,bigint,text),
  public.gc_founders_votar(uuid,text,text),
  public.gc_founders_resgatar_beneficio(uuid,integer,text,text),
  public.gc_founders_admin_definir_parceiro(uuid,text,numeric,integer,date,date),
  public.gc_founders_admin_ajustar_pontos(uuid,text,integer,text,text,uuid),
  public.gc_founders_admin_atualizar_contribuicao(uuid,text,integer,text),
  public.gc_founders_admin_painel(text,integer),
  public.gc_founders_minha_area(),
  public.gc_founders_bloquear_alteracao_ledger()
from public, anon;

grant execute on function
  public.gc_founders_admin(),
  public.gc_founders_empresa_id(),
  public.gc_founders_empresa_ativa(uuid),
  public.gc_founders_saldo_pontos(uuid),
  public.gc_founders_criar_contribuicao(text,text,text,text),
  public.gc_founders_anexar_contribuicao(uuid,text,text,text,text,bigint,text),
  public.gc_founders_votar(uuid,text,text),
  public.gc_founders_resgatar_beneficio(uuid,integer,text,text),
  public.gc_founders_admin_definir_parceiro(uuid,text,numeric,integer,date,date),
  public.gc_founders_admin_ajustar_pontos(uuid,text,integer,text,text,uuid),
  public.gc_founders_admin_atualizar_contribuicao(uuid,text,integer,text),
  public.gc_founders_admin_painel(text,integer),
  public.gc_founders_minha_area()
to authenticated;

notify pgrst, 'reload schema';
commit;
