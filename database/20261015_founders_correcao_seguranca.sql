-- Correção de segurança do módulo Founders
-- Não destrutiva: sem drop table/truncate/delete de dados de negócio.
-- Pré-requisito: database/20261015_founders_fundacao.sql já aplicada.
begin;

do $$
declare
  v_invalid_anexos integer;
  v_dup_estornos integer;
begin
  if to_regprocedure('public.gc_founders_admin()') is null then
    raise exception 'Pré-requisito ausente: gc_founders_admin() não encontrada.';
  end if;
  if to_regclass('public.founders_parceiros') is null
    or to_regclass('public.founders_contribuicoes') is null
    or to_regclass('public.founders_contribuicao_anexos') is null
    or to_regclass('public.founders_votacoes') is null
    or to_regclass('public.founders_votos') is null
    or to_regclass('public.founders_pontos_ledger') is null
    or to_regclass('public.founders_beneficios') is null
    or to_regclass('public.founders_resgates') is null then
    raise exception 'Estruturas Founders incompletas. Verifique a migração base.';
  end if;

  select count(*)
  into v_invalid_anexos
  from public.founders_contribuicao_anexos a
  where a.storage_bucket <> 'founders-anexos'
     or a.storage_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.+$';

  if v_invalid_anexos > 0 then
    raise exception
      'Foram encontrados % anexos com bucket/caminho incompatível. Corrija os dados antes de aplicar esta migração.',
      v_invalid_anexos;
  end if;

  select count(*)
  into v_dup_estornos
  from (
    select empresa_id, origem, referencia_id, tipo, count(*) qtd
    from public.founders_pontos_ledger
    where referencia_id is not null
      and tipo in ('estorno_credito', 'estorno_debito')
    group by empresa_id, origem, referencia_id, tipo
    having count(*) > 1
  ) t;

  if v_dup_estornos > 0 then
    raise exception
      'Foram encontrados % grupos de estornos duplicados no ledger. Resolva antes da migração.',
      v_dup_estornos;
  end if;
end $$;

-- 1) Separar ciclo de avaliação da validade da participação
alter table public.founders_parceiros
  add column if not exists participacao_inicio date,
  add column if not exists participacao_fim date;

update public.founders_parceiros
set participacao_inicio = coalesce(participacao_inicio, data_adesao, ciclo_avaliacao_inicio)
where participacao_inicio is null;

alter table public.founders_parceiros
  alter column participacao_inicio set not null,
  alter column participacao_inicio set default (now() at time zone 'America/Sao_Paulo')::date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'founders_parceiros_participacao_periodo_chk'
      and conrelid = 'public.founders_parceiros'::regclass
  ) then
    alter table public.founders_parceiros
      add constraint founders_parceiros_participacao_periodo_chk
      check (participacao_fim is null or participacao_fim >= participacao_inicio);
  end if;
end $$;

-- 2) Reforçar proteção contra insert direto (contorno de RPC)
revoke insert on public.founders_contribuicoes from authenticated;
revoke insert on public.founders_contribuicao_anexos from authenticated;
revoke insert on public.founders_votos from authenticated;
revoke insert on public.founders_resgates from authenticated;
revoke usage, select on sequence public.founders_numero_fundador_seq from authenticated;

drop policy if exists founders_contribuicoes_insert on public.founders_contribuicoes;
drop policy if exists founders_contribuicao_anexos_insert on public.founders_contribuicao_anexos;
drop policy if exists founders_votos_insert on public.founders_votos;

-- 3) RLS de votação: empresas participantes visualizam votações abertas
drop policy if exists founders_votacoes_select on public.founders_votacoes;
create policy founders_votacoes_select on public.founders_votacoes
for select to authenticated
using (
  public.gc_founders_admin()
  or (
    founders_votacoes.status = 'aberta'
    and public.gc_founders_empresa_ativa()
  )
  or exists (
    select 1
    from public.founders_contribuicoes c
    join public.perfis_usuarios pu on pu.empresa_id = c.empresa_id
    where c.id = founders_votacoes.contribuicao_id
      and pu.id = auth.uid()
  )
);

-- 4) Duplicidade adicional para estornos no ledger
create unique index if not exists founders_pontos_ref_estorno_unica_idx
  on public.founders_pontos_ledger(empresa_id, origem, referencia_id, tipo)
  where referencia_id is not null and tipo in ('estorno_credito', 'estorno_debito');

-- 5) Revisão de funções críticas SECURITY DEFINER
create or replace function public.gc_founders_empresa_ativa(p_empresa_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare empresa_sessao uuid := public.gc_founders_empresa_id();
declare empresa uuid := coalesce(p_empresa_id, empresa_sessao);
declare admin_founders boolean := public.gc_founders_admin();
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_empresa_id is not null
     and empresa_sessao is distinct from p_empresa_id
     and admin_founders is not true then
    raise exception 'Acesso negado para consultar a participação de outra empresa.' using errcode='42501';
  end if;

  if empresa is null then
    return false;
  end if;

  return exists (
    select 1
    from public.founders_parceiros fp
    where fp.empresa_id = empresa
      and fp.status = 'ativo'
      and fp.participacao_inicio <= hoje
      and (fp.participacao_fim is null or fp.participacao_fim >= hoje)
  );
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
declare objeto_storage record;
declare mime_storage text;
declare tamanho_storage bigint;
declare storage_tem_owner boolean := false;
declare storage_tem_owner_id boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária' using errcode='42501';
  end if;
  if not public.gc_founders_empresa_ativa(empresa) then
    raise exception 'Sua empresa não está ativa no programa Founders.' using errcode='42501';
  end if;
  if coalesce(trim(p_storage_bucket), '') <> 'founders-anexos' then
    raise exception 'Bucket inválido para anexos do Founders.' using errcode='22023';
  end if;
  if p_storage_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.+$' then
    raise exception 'Caminho do anexo inválido.' using errcode='22023';
  end if;
  if split_part(trim(p_storage_path), '/', 1) <> empresa::text then
    raise exception 'O caminho do anexo deve iniciar com o id da empresa.' using errcode='22023';
  end if;
  if p_mime_type not in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp') then
    raise exception 'Tipo de arquivo não permitido.' using errcode='22023';
  end if;
  if p_tamanho_bytes is null or p_tamanho_bytes < 1 or p_tamanho_bytes > 10485760 then
    raise exception 'Tamanho de arquivo inválido.' using errcode='22023';
  end if;

  select * into contrib
  from public.founders_contribuicoes
  where id = p_contribuicao_id
    and empresa_id = empresa;

  if contrib.id is null then
    raise exception 'Contribuição não encontrada para sua empresa.' using errcode='22023';
  end if;

  select exists(
    select 1
    from information_schema.columns c
    where c.table_schema = 'storage'
      and c.table_name = 'objects'
      and c.column_name = 'owner'
  ) into storage_tem_owner;

  select exists(
    select 1
    from information_schema.columns c
    where c.table_schema = 'storage'
      and c.table_name = 'objects'
      and c.column_name = 'owner_id'
  ) into storage_tem_owner_id;

  begin
    if storage_tem_owner then
      execute $q$
        select o.id, o.metadata
        from storage.objects o
        where o.bucket_id = 'founders-anexos'
          and o.name = $1
          and coalesce(o.owner, auth.uid()) = auth.uid()
        limit 1
      $q$
      into objeto_storage
      using trim(p_storage_path);
    elsif storage_tem_owner_id then
      execute $q$
        select o.id, o.metadata
        from storage.objects o
        where o.bucket_id = 'founders-anexos'
          and o.name = $1
          and coalesce((o.owner_id)::text, auth.uid()::text) = auth.uid()::text
        limit 1
      $q$
      into objeto_storage
      using trim(p_storage_path);
    else
      execute $q$
        select o.id, o.metadata
        from storage.objects o
        where o.bucket_id = 'founders-anexos'
          and o.name = $1
        limit 1
      $q$
      into objeto_storage
      using trim(p_storage_path);
    end if;
  exception
    when insufficient_privilege then
      raise exception 'Não foi possível validar o arquivo no Storage com as permissões atuais. Configure a validação de anexos no backend administrativo.' using errcode='42501';
  end;

  if objeto_storage.id is null then
    raise exception 'Arquivo não encontrado no Storage para o caminho informado.' using errcode='22023';
  end if;

  mime_storage := lower(coalesce(
    objeto_storage.metadata->>'mimetype',
    objeto_storage.metadata->>'mimeType',
    objeto_storage.metadata->>'content_type',
    objeto_storage.metadata->>'contentType',
    ''
  ));
  if mime_storage = '' then
    raise exception 'Metadados do arquivo sem MIME válido no Storage.' using errcode='22023';
  end if;
  if mime_storage <> lower(trim(p_mime_type)) then
    raise exception 'MIME informado difere do arquivo existente no Storage.' using errcode='22023';
  end if;

  if coalesce(objeto_storage.metadata->>'size', '') !~ '^[0-9]+$' then
    raise exception 'Metadados do arquivo sem tamanho válido no Storage.' using errcode='22023';
  end if;
  tamanho_storage := (objeto_storage.metadata->>'size')::bigint;
  if tamanho_storage < 1 or tamanho_storage > 10485760 then
    raise exception 'Tamanho do arquivo no Storage está fora do limite permitido.' using errcode='22023';
  end if;
  if tamanho_storage <> p_tamanho_bytes then
    raise exception 'Tamanho informado difere do arquivo existente no Storage.' using errcode='22023';
  end if;

  insert into public.founders_contribuicao_anexos(
    contribuicao_id, empresa_id, autor_id, storage_bucket, storage_path, nome_arquivo, mime_type, tamanho_bytes, hash_arquivo
  )
  values (
    p_contribuicao_id, empresa, auth.uid(), 'founders-anexos', trim(p_storage_path), trim(p_nome_arquivo),
    trim(p_mime_type), p_tamanho_bytes, nullif(trim(coalesce(p_hash_arquivo, '')), '')
  )
  returning id into anexo;

  return anexo;
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
declare ref_registro public.founders_pontos_ledger;
declare tipo_referencia_esperado text;
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_sync_empresa_' || p_empresa_id::text, 0));

  select * into parceiro
  from public.founders_parceiros
  where empresa_id = p_empresa_id
  for update;

  if parceiro.id is null then
    raise exception 'Empresa não cadastrada como parceira Founders.' using errcode='22023';
  end if;

  if p_tipo in ('estorno_credito', 'estorno_debito') then
    if p_referencia_id is null then
      raise exception 'Estorno exige referência do lançamento original.' using errcode='22023';
    end if;
    tipo_referencia_esperado :=
      case p_tipo
        when 'estorno_credito' then 'credito'
        else 'debito'
      end;

    select * into ref_registro
    from public.founders_pontos_ledger
    where id = p_referencia_id
      and empresa_id = p_empresa_id;
    if ref_registro.id is null then
      raise exception 'Lançamento de referência não encontrado para estorno.' using errcode='22023';
    end if;
    if ref_registro.tipo <> tipo_referencia_esperado then
      raise exception 'Tipo de estorno incompatível com o lançamento original (%).', ref_registro.tipo using errcode='22023';
    end if;
    if p_pontos > ref_registro.pontos then
      raise exception 'Estorno inválido: os pontos informados excedem o lançamento original.' using errcode='22023';
    end if;
    if exists (
      select 1
      from public.founders_pontos_ledger l
      where l.empresa_id = p_empresa_id
        and l.referencia_id = p_referencia_id
        and l.tipo = p_tipo
    ) then
      raise exception 'Este lançamento já possui estorno para o tipo informado.' using errcode='22023';
    end if;
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
    jsonb_build_object('tipo', p_tipo, 'pontos', p_pontos, 'motivo', trim(p_motivo), 'referencia_id', p_referencia_id)
  );

  return lancamento_id;
exception
  when unique_violation then
    raise exception 'Lançamento duplicado para a mesma chave de idempotência/referência.' using errcode='22023';
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('founders_sync_empresa_' || empresa::text, 0));

  if exists (
    select 1
    from public.founders_resgates
    where empresa_id = empresa
      and idempotency_key = trim(p_idempotency_key)
  ) then
    raise exception 'Resgate duplicado detectado para a mesma chave de idempotência.' using errcode='22023';
  end if;

  select * into parceiro
  from public.founders_parceiros
  where empresa_id = empresa
  for update;

  if parceiro.id is null then
    raise exception 'Parceiro Founders não encontrado para a empresa.' using errcode='22023';
  end if;

  select * into beneficio
  from public.founders_beneficios
  where id = p_beneficio_id
  for update;

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
declare idempotencia_credito text;
declare idempotencia_estorno text;
declare lancamento_credito_id uuid;
declare estorno_credito_existe boolean := false;
begin
  if not public.gc_founders_admin() then
    raise exception 'Acesso administrativo Founders necessário.' using errcode='42501';
  end if;
  if p_status not in ('em_triagem', 'em_votacao', 'aprovada', 'rejeitada', 'implementada') then
    raise exception 'Status administrativo inválido.' using errcode='22023';
  end if;

  select * into c
  from public.founders_contribuicoes
  where id = p_contribuicao_id
  for update;

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
    idempotencia_credito := 'contribuicao_credito:' || c.id::text;
    idempotencia_estorno := 'contribuicao_estorno:' || c.id::text;
    estorno_credito_existe := exists (
      select 1
      from public.founders_pontos_ledger l
      where l.empresa_id = c.empresa_id
        and l.idempotency_key = idempotencia_estorno
    );

    if estorno_credito_existe then
      raise exception 'Contribuição já estornada após rejeição. Para novo crédito, use ajuste administrativo com auditoria.' using errcode='22023';
    end if;

    conceder := coalesce(p_pontos_concedidos, c.pontos_previstos, 0);
    if conceder > 0 and c.pontos_concedidos = 0 then
      perform public.gc_founders_admin_ajustar_pontos(
        c.empresa_id,
        'credito',
        conceder,
        'Crédito por contribuição validada',
        idempotencia_credito,
        c.id
      );
      update public.founders_contribuicoes
      set pontos_concedidos = conceder
      where id = c.id;
    end if;
  end if;

  if p_status = 'rejeitada' and c.pontos_concedidos > 0 then
    idempotencia_credito := 'contribuicao_credito:' || c.id::text;
    idempotencia_estorno := 'contribuicao_estorno:' || c.id::text;
    select l.id
      into lancamento_credito_id
    from public.founders_pontos_ledger l
    where l.empresa_id = c.empresa_id
      and l.tipo = 'credito'
      and l.idempotency_key = idempotencia_credito
    order by l.criado_em desc
    limit 1;

    if lancamento_credito_id is null then
      raise exception 'Não foi possível localizar o lançamento de crédito para estorno da contribuição.' using errcode='22023';
    end if;

    if not exists (
      select 1
      from public.founders_pontos_ledger l
      where l.empresa_id = c.empresa_id
        and l.idempotency_key = idempotencia_estorno
    ) then
      perform public.gc_founders_admin_ajustar_pontos(
        c.empresa_id,
        'estorno_credito',
        c.pontos_concedidos,
        'Estorno por rejeição da contribuição',
        idempotencia_estorno,
        lancamento_credito_id
      );
    end if;
  end if;

  perform public.gc_founders_registrar_auditoria(
    'founders_admin_atualizar_contribuicao',
    'contribuicao',
    c.id,
    c.empresa_id,
    jsonb_build_object(
      'status_anterior', c.status,
      'status_novo', p_status,
      'pontos_concedidos', coalesce(p_pontos_concedidos, c.pontos_concedidos)
    )
  );
end $$;

-- 6) Revisão de privilégios (SECURITY DEFINER e escrita direta)
revoke update, delete on public.founders_parceiros,
  public.founders_contribuicoes,
  public.founders_contribuicao_anexos,
  public.founders_votacoes,
  public.founders_votos,
  public.founders_pontos_ledger,
  public.founders_beneficios,
  public.founders_resgates
from authenticated;

revoke execute on function public.gc_founders_registrar_auditoria(text,text,uuid,uuid,jsonb) from authenticated;
revoke execute on function public.gc_founders_bloquear_alteracao_ledger() from authenticated;

-- 7) Storage (storage.objects) foi removido desta migração para políticas.
-- Motivo: em ambientes Supabase gerenciados, o papel disponível no SQL Editor
-- pode não ser owner da tabela storage.objects.
-- As políticas do bucket founders-anexos devem ser configuradas pelo painel Storage.

notify pgrst, 'reload schema';
commit;
