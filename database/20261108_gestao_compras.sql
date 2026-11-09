-- Requer Gestão de Pedidos e glasscode_private.pedido_empresa().
-- Aplicar apenas após backup e autorização. Não altera pedidos nem financeiro.
begin;
create table public.gc_compras (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
 numero bigint generated always as identity unique, requisicao uuid not null,
 fornecedor text not null check(length(trim(fornecedor)) between 1 and 200),
 referencia text not null default '' check(length(referencia)<=200), previsao date,
 observacoes text not null default '' check(length(observacoes)<=3000),
 cancelada boolean not null default false, criado_por uuid not null, criado_em timestamptz not null default now(),
 unique(empresa_id,requisicao)
);
create table public.gc_compra_itens (
 id uuid primary key default gen_random_uuid(), compra_id uuid not null references public.gc_compras(id),
 empresa_id uuid not null references public.empresas(id), pedido_id uuid not null references public.gc_pedidos(id),
 chave text not null, identidade text not null, material jsonb not null,
 quantidade numeric(14,3) not null check(quantidade>0), preco numeric(14,2) not null check(preco>=0),
 unique(compra_id,pedido_id,chave)
);
create table public.gc_compra_eventos (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
 compra_id uuid not null references public.gc_compras(id), item_id uuid references public.gc_compra_itens(id),
 tipo text not null check(tipo in ('criada','recebimento','estorno','cancelamento')),
 quantidade numeric(14,3) not null default 0, motivo text not null check(length(motivo)<=1000),
 estorno_de uuid unique references public.gc_compra_eventos(id), requisicao uuid not null,
 autor uuid not null, criado_em timestamptz not null default now(), unique(empresa_id,requisicao),
 check ((tipo='recebimento' and quantidade>0 and item_id is not null) or
        (tipo='estorno' and quantidade<0 and item_id is not null and estorno_de is not null) or
        (tipo in ('criada','cancelamento') and quantidade=0))
);
create index on public.gc_compra_itens(empresa_id,pedido_id,chave,identidade);
create index on public.gc_compras(empresa_id,criado_em);
create index on public.gc_compra_eventos(empresa_id,compra_id);
alter table public.gc_compras enable row level security;
alter table public.gc_compra_itens enable row level security;
alter table public.gc_compra_eventos enable row level security;
revoke all on public.gc_compras,public.gc_compra_itens,public.gc_compra_eventos from public,anon,authenticated;
revoke all on sequence public.gc_compras_numero_seq from public,anon,authenticated;
grant select on public.gc_compras,public.gc_compra_itens,public.gc_compra_eventos to authenticated;
create policy compras_leitura on public.gc_compras for select to authenticated using(public.gc_modulo_permitido(empresa_id,'gestao'));
create policy compra_itens_leitura on public.gc_compra_itens for select to authenticated using(public.gc_modulo_permitido(empresa_id,'gestao'));
create policy compra_eventos_leitura on public.gc_compra_eventos for select to authenticated using(public.gc_modulo_permitido(empresa_id,'gestao'));

create function public.gc_registrar_compra(p_requisicao uuid,p_fornecedor text,p_referencia text,p_previsao date,p_observacoes text,p_itens jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare emp uuid:=glasscode_private.pedido_empresa(); compra uuid; item jsonb; pedido public.gc_pedidos%rowtype; qtd numeric; preco numeric; comprometido numeric; v_identidade text;
begin
 -- Serializa registros da empresa, inclusive duas abas concorrentes.
 perform 1 from public.empresas where id=emp for update;
 select id into compra from public.gc_compras where empresa_id=emp and requisicao=p_requisicao;
 if found then return compra; end if;
 if p_requisicao is null or p_itens is null or jsonb_typeof(p_itens)<>'array' then raise exception 'Informe os materiais.'; end if;
 if jsonb_array_length(p_itens) not between 1 and 200 then raise exception 'Selecione entre 1 e 200 materiais.'; end if;
 insert into public.gc_compras(empresa_id,requisicao,fornecedor,referencia,previsao,observacoes,criado_por)
 values(emp,p_requisicao,trim(p_fornecedor),coalesce(p_referencia,''),p_previsao,coalesce(p_observacoes,''),auth.uid()) returning id into compra;
 for item in select value from jsonb_array_elements(p_itens) loop
  select * into pedido from public.gc_pedidos where id=(item->>'pedido_id')::uuid and empresa_id=emp for update;
  if not found then raise exception 'Pedido indisponível.'; end if;
  if pedido.situacao in ('cancelado','entregue') or pedido.versao is distinct from (item->>'versao')::integer then raise exception 'Pedido alterado. Atualize a lista antes de comprar.'; end if;
  if coalesce(length(item->>'chave'),0) not between 1 and 300 or
    coalesce(length(item->'material'->>'descricao'),0) not between 1 and 500 or
    coalesce(length(item->'material'->>'unidade'),0) not between 1 and 50 then raise exception 'Material inválido.'; end if;
  v_identidade:=jsonb_build_array(item->'material'->>'descricao',item->'material'->>'unidade',coalesce(item->'material'->>'medida',''),coalesce(item->'material'->>'cor',''))::text;
  qtd:=(item->>'quantidade')::numeric; preco:=(item->>'preco')::numeric;
  if qtd is null or preco is null or qtd<=0 or qtd>1000000 or preco<0 or preco>100000000 or qtd<>round(qtd,3) or preco<>round(preco,2) or qtd::text='NaN' or preco::text='NaN' then raise exception 'Quantidade ou preço inválido.'; end if;
  select coalesce(sum(i.quantidade),0) into comprometido from public.gc_compra_itens i join public.gc_compras c on c.id=i.compra_id
   where i.empresa_id=emp and i.pedido_id=pedido.id and i.chave=item->>'chave' and i.identidade=v_identidade and not c.cancelada;
  if (item->>'necessario')::numeric is null or qtd+comprometido>(item->>'necessario')::numeric then raise exception 'Quantidade já comprada ou superior à necessidade. Atualize a lista.'; end if;
  insert into public.gc_compra_itens(compra_id,empresa_id,pedido_id,chave,identidade,material,quantidade,preco)
   values(compra,emp,pedido.id,item->>'chave',v_identidade,item->'material',qtd,preco);
 end loop;
 insert into public.gc_compra_eventos(empresa_id,compra_id,tipo,motivo,requisicao,autor) values(emp,compra,'criada','Compra registrada',p_requisicao,auth.uid());
 return compra;
end $$;

create function public.gc_receber_compra(p_item uuid,p_quantidade numeric,p_motivo text,p_requisicao uuid)
returns void language plpgsql security definer set search_path='' as $$
declare emp uuid:=glasscode_private.pedido_empresa(); item public.gc_compra_itens%rowtype; compra public.gc_compras%rowtype; recebido numeric;
begin
 perform 1 from public.empresas where id=emp for update;
 if exists(select 1 from public.gc_compra_eventos where empresa_id=emp and requisicao=p_requisicao) then return; end if;
 select * into item from public.gc_compra_itens where id=p_item and empresa_id=emp;
 if not found then raise exception 'Material indisponível.'; end if;
 select * into compra from public.gc_compras where id=item.compra_id and empresa_id=emp for update;
 if compra.cancelada then raise exception 'Compra cancelada.'; end if;
 select coalesce(sum(quantidade),0) into recebido from public.gc_compra_eventos where item_id=p_item and empresa_id=emp;
 if p_quantidade is null or p_quantidade<=0 or p_quantidade::text='NaN' or p_quantidade<>round(p_quantidade,3) or recebido+p_quantidade>item.quantidade then raise exception 'Recebimento superior ao saldo ou quantidade inválida.'; end if;
 insert into public.gc_compra_eventos(empresa_id,compra_id,item_id,tipo,quantidade,motivo,requisicao,autor)
 values(emp,compra.id,item.id,'recebimento',p_quantidade,coalesce(p_motivo,''),p_requisicao,auth.uid());
end $$;

create function public.gc_estornar_recebimento(p_evento uuid,p_motivo text,p_requisicao uuid)
returns void language plpgsql security definer set search_path='' as $$
declare emp uuid:=glasscode_private.pedido_empresa(); evento public.gc_compra_eventos%rowtype;
begin
 perform 1 from public.empresas where id=emp for update;
 if exists(select 1 from public.gc_compra_eventos where empresa_id=emp and requisicao=p_requisicao) then return; end if;
 if p_motivo is null or length(trim(p_motivo)) not between 3 and 1000 then raise exception 'Informe o motivo do estorno.'; end if;
 select * into evento from public.gc_compra_eventos where id=p_evento and empresa_id=emp and tipo='recebimento';
 if not found then raise exception 'Recebimento indisponível.'; end if;
 if exists(select 1 from public.gc_compra_eventos where estorno_de=evento.id) then raise exception 'Recebimento já estornado.'; end if;
 insert into public.gc_compra_eventos(empresa_id,compra_id,item_id,tipo,quantidade,motivo,estorno_de,requisicao,autor)
 values(emp,evento.compra_id,evento.item_id,'estorno',-evento.quantidade,trim(p_motivo),evento.id,p_requisicao,auth.uid());
end $$;

create function public.gc_cancelar_compra(p_compra uuid,p_motivo text,p_requisicao uuid)
returns void language plpgsql security definer set search_path='' as $$
declare emp uuid:=glasscode_private.pedido_empresa();
begin
 perform 1 from public.empresas where id=emp for update;
 if exists(select 1 from public.gc_compra_eventos where empresa_id=emp and requisicao=p_requisicao) then return; end if;
 if p_motivo is null or length(trim(p_motivo)) not between 3 and 1000 then raise exception 'Informe o motivo do cancelamento.'; end if;
 perform 1 from public.gc_compras where id=p_compra and empresa_id=emp and not cancelada for update;
 if not found then raise exception 'Compra indisponível.'; end if;
 if exists(select 1 from public.gc_compra_eventos where compra_id=p_compra and empresa_id=emp group by item_id having sum(quantidade)>0) then raise exception 'Estorne os recebimentos antes de cancelar.'; end if;
 update public.gc_compras set cancelada=true where id=p_compra and empresa_id=emp;
 insert into public.gc_compra_eventos(empresa_id,compra_id,tipo,motivo,requisicao,autor) values(emp,p_compra,'cancelamento',trim(p_motivo),p_requisicao,auth.uid());
end $$;
revoke all on function public.gc_registrar_compra(uuid,text,text,date,text,jsonb),public.gc_receber_compra(uuid,numeric,text,uuid),public.gc_estornar_recebimento(uuid,text,uuid),public.gc_cancelar_compra(uuid,text,uuid) from public,anon;
grant execute on function public.gc_registrar_compra(uuid,text,text,date,text,jsonb),public.gc_receber_compra(uuid,numeric,text,uuid),public.gc_estornar_recebimento(uuid,text,uuid),public.gc_cancelar_compra(uuid,text,uuid) to authenticated;
commit;
-- Reversão sem perda: retirar EXECUTE das quatro RPCs e SELECT das três tabelas
-- de authenticated, e voltar a versão anterior da interface. Preservar as tabelas
-- e eventos após uso real; não excluir registros comerciais para reverter código.
