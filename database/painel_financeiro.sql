-- Atualização do painel já instalado. Controle interno; não emite boletos.
begin;
create table if not exists glasscode_private.contratos (
  empresa_id uuid primary key references public.empresas(id) on delete restrict,
  plano text not null check (length(trim(plano)) between 1 and 100),
  mensalidade_centavos bigint not null check (mensalidade_centavos between 1 and 100000000),
  dia_vencimento integer not null check (dia_vencimento between 1 and 28),
  email_financeiro text not null default '' check (length(email_financeiro) <= 254),
  atualizado_em timestamptz not null default now()
);
create table if not exists glasscode_private.cobrancas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  competencia date not null check (extract(day from competencia) = 1),
  descricao text not null,
  valor_centavos bigint not null check (valor_centavos > 0),
  vencimento date not null,
  status text not null default 'aberta' check (status in ('aberta','paga','cancelada')),
  pago_em date,
  criado_em timestamptz not null default now(),
  unique (empresa_id, competencia),
  check ((status = 'paga' and pago_em is not null) or (status <> 'paga' and pago_em is null))
);
create table if not exists glasscode_private.financeiro_historico (
  id bigint generated always as identity primary key,
  autor_id uuid not null,
  empresa_id uuid not null,
  acao text not null,
  motivo text not null,
  antes jsonb,
  depois jsonb not null,
  criado_em timestamptz not null default now()
);
revoke all on glasscode_private.contratos, glasscode_private.cobrancas, glasscode_private.financeiro_historico from public, anon, authenticated;
revoke all on all sequences in schema glasscode_private from public, anon, authenticated;

create or replace function public.gc_financeiro(p_busca text default '', p_pagina integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date; resultado jsonb;
begin
  if not public.gc_proprietaria() then raise exception 'Acesso exclusivo da proprietária' using errcode = '42501'; end if;
  with cobran as (
    select c.*, e.nome empresa,
      case when c.status = 'aberta' and c.vencimento < hoje then 'atrasada' else c.status end situacao
    from glasscode_private.cobrancas c join public.empresas e on e.id = c.empresa_id
  )
  select jsonb_build_object(
    'resumo', jsonb_build_object(
      'aberto', (select coalesce(sum(valor_centavos),0) from cobran where status = 'aberta'),
      'atrasado', (select coalesce(sum(valor_centavos),0) from cobran where situacao = 'atrasada'),
      'recebido_mes', (select coalesce(sum(valor_centavos),0) from cobran where status = 'paga' and date_trunc('month',pago_em) = date_trunc('month',hoje)),
      'contratos', (select count(*) from glasscode_private.contratos)),
    'contas', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select e.id, e.nome, c.plano, c.mensalidade_centavos, c.dia_vencimento, c.email_financeiro
      from public.empresas e left join glasscode_private.contratos c on c.empresa_id = e.id
      where e.nome ilike '%' || left(coalesce(p_busca,''),100) || '%'
      order by e.nome,e.id limit 50 offset greatest(0,least(coalesce(p_pagina,0),100000))*50
    ) t), '[]'::jsonb),
    'cobrancas', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select * from cobran where empresa ilike '%' || left(coalesce(p_busca,''),100) || '%'
      order by vencimento desc,id limit 50 offset greatest(0,least(coalesce(p_pagina,0),100000))*50
    ) t), '[]'::jsonb),
    'historico', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select h.id,h.acao,h.motivo,h.criado_em,e.nome empresa from glasscode_private.financeiro_historico h
      join public.empresas e on e.id=h.empresa_id order by h.id desc limit 50
    ) t), '[]'::jsonb)
  ) into resultado;
  return resultado;
end $$;

create or replace function public.gc_financeiro_alterar(p_acao text, p_dados jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare empresa uuid; anterior jsonb; novo jsonb; contrato glasscode_private.contratos;
  cobranca glasscode_private.cobrancas; mes date; dia date;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.gc_proprietaria() then raise exception 'Acesso exclusivo da proprietária' using errcode = '42501'; end if;
  if p_acao is null or p_acao not in ('contrato','gerar','pagar','reabrir','cancelar') or p_dados is null
    or length(trim(coalesce(p_dados->>'motivo',''))) < 3 or length(p_dados->>'motivo') > 500 then
    raise exception 'Informe uma ação válida e um motivo entre 3 e 500 caracteres' using errcode = '22023';
  end if;
  if p_acao in ('contrato','gerar') then
    empresa := (p_dados->>'empresa_id')::uuid;
    if empresa is null or not exists(select 1 from public.empresas where id = empresa) then
      raise exception 'Empresa não encontrada' using errcode = '22023';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('financeiro'||empresa::text,0));
    select * into contrato from glasscode_private.contratos where empresa_id = empresa;
    anterior := to_jsonb(contrato);
    if p_acao = 'contrato' then
      if length(trim(coalesce(p_dados->>'plano',''))) not between 1 and 100
        or coalesce(p_dados->>'mensalidade_centavos','') !~ '^[0-9]{1,9}$'
        or (p_dados->>'mensalidade_centavos')::bigint not between 1 and 100000000
        or coalesce(p_dados->>'dia_vencimento','') !~ '^[0-9]{1,2}$'
        or (p_dados->>'dia_vencimento')::integer not between 1 and 28
        or length(coalesce(p_dados->>'email_financeiro','')) > 254 then
        raise exception 'Confira plano, mensalidade e dia de vencimento (1 a 28)' using errcode = '22023';
      end if;
      insert into glasscode_private.contratos values (
        empresa,trim(p_dados->>'plano'),(p_dados->>'mensalidade_centavos')::bigint,
        (p_dados->>'dia_vencimento')::integer,trim(coalesce(p_dados->>'email_financeiro','')),now()
      ) on conflict(empresa_id) do update set plano=excluded.plano,mensalidade_centavos=excluded.mensalidade_centavos,
        dia_vencimento=excluded.dia_vencimento,email_financeiro=excluded.email_financeiro,atualizado_em=now()
      returning to_jsonb(contratos.*) into novo;
    else
      if contrato.empresa_id is null then raise exception 'Cadastre o plano desta empresa primeiro' using errcode = '22023'; end if;
      if coalesce(p_dados->>'competencia','') !~ '^[0-9]{4}-[0-9]{2}-01$' then raise exception 'Competência inválida' using errcode = '22023'; end if;
      mes := (p_dados->>'competencia')::date;
      if exists(select 1 from glasscode_private.cobrancas where empresa_id=empresa and competencia=mes) then
        raise exception 'Já existe uma cobrança para esta empresa neste mês' using errcode = '22023';
      end if;
      insert into glasscode_private.cobrancas(empresa_id,competencia,descricao,valor_centavos,vencimento)
        values(empresa,mes,contrato.plano,contrato.mensalidade_centavos,mes+contrato.dia_vencimento-1)
        returning to_jsonb(cobrancas.*) into novo;
      anterior := null;
    end if;
  else
    select * into cobranca from glasscode_private.cobrancas where id=(p_dados->>'id')::uuid for update;
    if cobranca.id is null then raise exception 'Cobrança não encontrada' using errcode = '22023'; end if;
    empresa:=cobranca.empresa_id; anterior:=to_jsonb(cobranca);
    if (p_acao in ('pagar','cancelar') and cobranca.status <> 'aberta') or (p_acao='reabrir' and cobranca.status='aberta') then
      raise exception 'O estado da cobrança mudou. Atualize a lista antes de continuar' using errcode='22023';
    end if;
    if p_acao='pagar' then
      if coalesce(p_dados->>'pago_em','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Data de pagamento inválida' using errcode='22023'; end if;
      dia:=(p_dados->>'pago_em')::date;
      if dia > hoje then raise exception 'A data do pagamento não pode estar no futuro' using errcode='22023'; end if;
    end if;
    update glasscode_private.cobrancas set status=case p_acao when 'pagar' then 'paga' when 'cancelar' then 'cancelada' else 'aberta' end,
      pago_em=case when p_acao='pagar' then dia else null end where id=cobranca.id returning to_jsonb(cobrancas.*) into novo;
  end if;
  insert into glasscode_private.financeiro_historico(autor_id,empresa_id,acao,motivo,antes,depois)
    values(auth.uid(),empresa,p_acao,trim(p_dados->>'motivo'),anterior,novo);
end $$;
revoke all on function public.gc_financeiro(text,integer), public.gc_financeiro_alterar(text,jsonb) from public,anon,authenticated;
grant execute on function public.gc_financeiro(text,integer), public.gc_financeiro_alterar(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
