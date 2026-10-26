-- Etapa 1 de Gestão: pedidos. Requer 20261025_modulos_empresa.sql.
begin;
create table public.gc_pedidos (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id),
 numero bigint generated always as identity unique,
 orcamento_id text,
 origem_snapshot jsonb,
 cliente text not null check(length(trim(cliente)) between 1 and 200),
 obra text not null default '' check(length(obra)<=200),
 prazo date,
 observacoes text not null default '' check(length(observacoes)<=3000),
 itens jsonb not null,
 total numeric(16,2) not null check(total>=0),
 situacao text not null default 'conferencia' check(situacao in ('conferencia','liberado','producao','pronto','entregue','cancelado')),
 versao integer not null default 1,
 criado_por uuid not null,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 unique(empresa_id,orcamento_id)
);
create table public.gc_pedido_eventos (
 id bigint generated always as identity primary key,
 pedido_id uuid not null references public.gc_pedidos(id),
 empresa_id uuid not null references public.empresas(id),
 autor uuid not null,
 evento text not null,
 detalhe text not null,
 criado_em timestamptz not null default now()
);
create index on public.gc_pedidos(empresa_id,criado_em desc);
create index on public.gc_pedido_eventos(empresa_id,pedido_id,criado_em);
alter table public.gc_pedidos enable row level security;
alter table public.gc_pedido_eventos enable row level security;
revoke all on public.gc_pedidos,public.gc_pedido_eventos from public,anon,authenticated;
grant select on public.gc_pedidos,public.gc_pedido_eventos to authenticated;
create policy pedidos_leitura on public.gc_pedidos for select to authenticated using(public.gc_modulo_permitido(empresa_id,'gestao'));
create policy eventos_leitura on public.gc_pedido_eventos for select to authenticated using(public.gc_modulo_permitido(empresa_id,'gestao'));

create or replace function glasscode_private.pedido_empresa() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare empresa uuid;
begin
 select empresa_id into empresa from public.perfis_usuarios where id=auth.uid();
 if empresa is null or not public.gc_modulo_permitido(empresa,'gestao') then raise exception 'Módulo Gestão não liberado para esta conta.' using errcode='42501'; end if;
 return empresa;
end $$;
create or replace function glasscode_private.pedido_total(p_itens jsonb) returns numeric
language plpgsql immutable set search_path='' as $$
declare item jsonb; total numeric:=0; qtd numeric; preco numeric;
begin
 if p_itens is null or jsonb_typeof(p_itens)<>'array' then raise exception 'Informe os itens do pedido.'; end if;
 if jsonb_array_length(p_itens) not between 1 and 200 then raise exception 'Informe de 1 a 200 itens.'; end if;
 for item in select value from jsonb_array_elements(p_itens) loop
  if jsonb_typeof(item)<>'object' or coalesce(length(trim(item->>'descricao')),0) not between 1 and 500
   or jsonb_typeof(item->'quantidade') is distinct from 'number' or jsonb_typeof(item->'preco') is distinct from 'number' then raise exception 'Item inválido.'; end if;
  qtd:=(item->>'quantidade')::numeric; preco:=(item->>'preco')::numeric;
  if qtd<=0 or qtd>1000000 or preco<0 or preco>100000000 or qtd<>round(qtd,3) or preco<>round(preco,2) then raise exception 'Quantidade ou preço inválido.'; end if;
  total:=total+round(qtd*preco,2);
 end loop;
 return total;
end $$;
revoke all on function glasscode_private.pedido_empresa(),glasscode_private.pedido_total(jsonb) from public,anon,authenticated;

create or replace function public.gc_criar_pedido(p_cliente text,p_obra text,p_prazo date,p_observacoes text,p_itens jsonb,p_orcamento text default null,p_orcamento_alterado text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.pedido_empresa(); pedido uuid; origem jsonb; total numeric; linhas jsonb;
begin
 if p_orcamento is not null then
  select to_jsonb(o) into origem from public.orcamentos o where o.id::text=p_orcamento and o.empresa_id=empresa for update;
  if origem is null or nullif(origem->>'gc_excluido_em','') is not null then raise exception 'Orçamento indisponível para conversão.'; end if;
  select id into pedido from public.gc_pedidos where empresa_id=empresa and orcamento_id=p_orcamento;
  if pedido is not null then return pedido; end if;
  if p_orcamento_alterado is null or (origem->>'gc_alterado_em')::timestamptz is distinct from p_orcamento_alterado::timestamptz then raise exception 'O orçamento mudou. Busque novamente e confira os valores antes de aprovar.'; end if;
  p_cliente:=origem->>'cliente_nome'; p_obra:=coalesce(origem->>'obra_referencia','');
  total:=(origem->>'valor_total')::numeric;
  if total is null or total<0 or total>100000000 then raise exception 'Confira o total do orçamento antes de aprovar.'; end if;
  linhas:=jsonb_build_array(jsonb_build_object('descricao','Orçamento '||coalesce(origem->>'numero_formatado',p_orcamento),'quantidade',1,'preco',round(total,2)));
 else
  linhas:=p_itens; total:=glasscode_private.pedido_total(linhas);
 end if;
 insert into public.gc_pedidos(empresa_id,orcamento_id,origem_snapshot,cliente,obra,prazo,observacoes,itens,total,criado_por)
 values(empresa,p_orcamento,origem,trim(p_cliente),coalesce(p_obra,''),p_prazo,coalesce(p_observacoes,''),linhas,total,auth.uid()) returning id into pedido;
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(pedido,empresa,auth.uid(),'criado',case when p_orcamento is null then 'Pedido manual criado' else 'Orçamento aprovado e convertido. Valores e dados originais preservados.' end);
 return pedido;
end $$;
create or replace function public.gc_editar_pedido(p_id uuid,p_versao integer,p_cliente text,p_obra text,p_prazo date,p_observacoes text,p_itens jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.pedido_empresa(); pedido public.gc_pedidos%rowtype;
begin
 select * into pedido from public.gc_pedidos where id=p_id and empresa_id=empresa for update;
 if not found then raise exception 'Pedido indisponível.'; end if;
 if pedido.versao is distinct from p_versao then raise exception 'Pedido atualizado por outro usuário. Reabra antes de salvar.'; end if;
 if pedido.situacao<>'conferencia' then raise exception 'A edição é permitida apenas em conferência.'; end if;
 -- Orçamentos convertidos mantêm o preço aprovado; apenas prazo e observações podem mudar.
 update public.gc_pedidos set cliente=case when orcamento_id is null then trim(p_cliente) else cliente end,
 obra=case when orcamento_id is null then coalesce(p_obra,'') else obra end,
 itens=case when orcamento_id is null then p_itens else itens end,
 total=case when orcamento_id is null then glasscode_private.pedido_total(p_itens) else total end,
 prazo=p_prazo,observacoes=coalesce(p_observacoes,''),versao=versao+1,atualizado_em=now() where id=p_id;
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(p_id,empresa,auth.uid(),'editado','Dados atualizados durante conferência');
end $$;
create or replace function public.gc_situacao_pedido(p_id uuid,p_versao integer,p_situacao text,p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.pedido_empresa(); pedido public.gc_pedidos%rowtype; proxima text;
begin
 select * into pedido from public.gc_pedidos where id=p_id and empresa_id=empresa for update;
 if not found then raise exception 'Pedido indisponível.'; end if;
 if pedido.versao is distinct from p_versao then raise exception 'Pedido atualizado por outro usuário. Reabra antes de alterar.'; end if;
 proxima:=case pedido.situacao when 'conferencia' then 'liberado' when 'liberado' then 'producao' when 'producao' then 'pronto' when 'pronto' then 'entregue' else null end;
 if p_situacao is null or not ((proxima is not null and p_situacao=proxima) or (p_situacao='cancelado' and pedido.situacao not in ('cancelado','entregue'))) then raise exception 'Mudança de situação não permitida.'; end if;
 if p_motivo is null or length(trim(p_motivo)) not between 3 and 500 then raise exception 'Informe um motivo entre 3 e 500 caracteres.'; end if;
 update public.gc_pedidos set situacao=p_situacao,versao=versao+1,atualizado_em=now() where id=p_id;
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(p_id,empresa,auth.uid(),p_situacao,pedido.situacao||' → '||p_situacao||': '||trim(p_motivo));
end $$;
-- Impede limpeza, lixeira e exclusão do orçamento que originou um pedido.
create or replace function glasscode_private.proteger_orcamento_pedido() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.gc_pedidos p where p.orcamento_id=old.id::text and p.empresa_id=old.empresa_id) then
  if TG_OP='DELETE' then raise exception 'Orçamento vinculado a pedido não pode ser excluído.'; end if;
  if (to_jsonb(new)->>'gc_excluido_em') is distinct from (to_jsonb(old)->>'gc_excluido_em') and nullif(to_jsonb(new)->>'gc_excluido_em','') is not null then raise exception 'Orçamento vinculado a pedido não pode ir para a lixeira.'; end if;
 end if;
 if TG_OP='DELETE' then return old; end if; return new;
end $$;
revoke all on function glasscode_private.proteger_orcamento_pedido() from public,anon,authenticated;
create trigger gc_proteger_orcamento_pedido before delete or update on public.orcamentos for each row execute function glasscode_private.proteger_orcamento_pedido();
revoke all on function public.gc_criar_pedido(text,text,date,text,jsonb,text,text),public.gc_editar_pedido(uuid,integer,text,text,date,text,jsonb),public.gc_situacao_pedido(uuid,integer,text,text) from public,anon;
grant execute on function public.gc_criar_pedido(text,text,date,text,jsonb,text,text),public.gc_editar_pedido(uuid,integer,text,text,date,text,jsonb),public.gc_situacao_pedido(uuid,integer,text,text) to authenticated;
create or replace function glasscode_private.orcamento_protegido(o jsonb) returns boolean language plpgsql stable security definer set search_path='' as $$
declare vinculo record; encontrado boolean; estado text;
begin
 if exists(select 1 from public.gc_pedidos p where p.orcamento_id=o->>'id' and p.empresa_id::text=o->>'empresa_id') then return true; end if;
 estado=lower(trim(coalesce(nullif(o->>'status',''),o->>'situacao','')));
 -- Só reconhecemos estados explicitamente descartáveis. Estados desconhecidos são preservados.
 if estado not in ('','rascunho','pendente','aberto','em aberto','orcamento','orçamento','cancelado','recusado','rejeitado') then return true; end if;
 if coalesce(o->>'aprovado','false') <> 'false' or nullif(o->>'aprovado_em','') is not null then return true; end if;
 if nullif(o->>'pedido_id','') is not null or nullif(o->>'obra_id','') is not null then return true; end if;
 -- Um nome/referência textual não constitui vínculo com uma obra cadastrada.
 -- Preserva também vínculos reais por FK, inclusive itens de pedidos/obras de outros módulos.
 for vinculo in select ns.nspname,cl.relname,at.attname from pg_catalog.pg_constraint c
 join pg_catalog.pg_class cl on cl.oid=c.conrelid join pg_catalog.pg_namespace ns on ns.oid=cl.relnamespace
 join pg_catalog.pg_attribute at on at.attrelid=c.conrelid and at.attnum=c.conkey[1]
 where c.contype='f' and c.confrelid='public.orcamentos'::regclass loop
  execute format('select exists(select 1 from %I.%I where %I::text=$1)',vinculo.nspname,vinculo.relname,vinculo.attname) into encontrado using o->>'id';
  if encontrado then return true; end if;
 end loop;
 return false;
end $$;
commit;
