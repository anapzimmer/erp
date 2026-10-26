-- Revisões por orçamento recalculado. Requer Pedidos e Recebimentos.
begin;
alter table public.gc_pedidos add column revisao integer not null default 1;
create table public.gc_pedido_revisoes(id bigint generated always as identity primary key,pedido_id uuid not null references public.gc_pedidos(id),empresa_id uuid not null references public.empresas(id),numero integer not null,autor uuid not null,criado_em timestamptz not null default now(),motivo text not null,tipo text not null,anterior jsonb not null,novo jsonb not null,unique(pedido_id,numero));
alter table public.gc_pedido_revisoes enable row level security;
revoke all on public.gc_pedido_revisoes from public,anon,authenticated;
grant select on public.gc_pedido_revisoes to authenticated;
create policy pedido_revisoes_empresa on public.gc_pedido_revisoes for select to authenticated using(public.gc_modulo_permitido(empresa_id,'gestao'));
create function public.gc_revisar_pedido(p_id uuid,p_versao integer,p_orcamento text,p_alterado text,p_tipo text,p_motivo text,p_aprovado boolean,p_conferencia_producao text) returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.pedido_empresa(); pedido public.gc_pedidos%rowtype; origem jsonb; novo public.gc_pedidos%rowtype; valor numeric;
begin
 select * into pedido from public.gc_pedidos where id=p_id and empresa_id=empresa for update;
 if not found then raise exception 'Pedido indisponível.'; end if;
 if pedido.versao is distinct from p_versao then raise exception 'Pedido alterado. Reabra antes de revisar.'; end if;
 if pedido.situacao in ('entregue','cancelado') then raise exception 'Pedido encerrado não pode ser revisado.'; end if;
 if p_tipo is null or p_tipo not in ('tecnica','comercial') or p_motivo is null or length(trim(p_motivo)) not between 3 and 500 then raise exception 'Informe tipo e motivo da revisão.'; end if;
 if pedido.situacao in ('producao','pronto') and coalesce(length(trim(p_conferencia_producao)),0)<10 then raise exception 'Pause a produção e registre a conferência das peças e materiais já utilizados.'; end if;
 select to_jsonb(o) into origem from public.orcamentos o where o.id::text=p_orcamento and o.empresa_id=empresa and o.gc_excluido_em is null for update;
 if origem is null then raise exception 'Orçamento indisponível.'; end if;
 if p_alterado is null or (origem->>'gc_alterado_em')::timestamptz is distinct from p_alterado::timestamptz then raise exception 'Orçamento alterado. Busque novamente.'; end if;
 if lower(trim(origem->>'cliente_nome')) is distinct from lower(trim(pedido.cliente)) then raise exception 'O cliente do orçamento deve ser o mesmo do pedido.'; end if;
 valor:=pedido.total;
 if p_tipo='comercial' then
  if p_aprovado is distinct from true then raise exception 'Confirme a aprovação do cliente.'; end if;
  if not public.gc_financeiro_permitido(empresa) then raise exception 'Revisão comercial exige permissão financeira.'; end if;
  valor:=(origem->>'valor_total')::numeric;
  if valor is null or valor<0 then raise exception 'Total inválido.'; end if;
  if valor<>pedido.total and exists(select 1 from public.gc_parcelas where pedido_id=p_id and not cancelada) then raise exception 'Há parcelas ativas. A revisão de valor exige conciliação financeira antes de aplicar; pagamentos não serão alterados.'; end if;
 end if;
 update public.gc_pedidos set origem_snapshot=origem,total=valor,
 itens=case when p_tipo='comercial' and valor<>pedido.total then jsonb_build_array(jsonb_build_object('descricao','Orçamento revisado '||(origem->>'numero_formatado'),'quantidade',1,'preco',valor)) else itens end,
 situacao='conferencia',revisao=revisao+1,versao=versao+1,atualizado_em=now() where id=p_id returning * into novo;
 insert into public.gc_pedido_revisoes(pedido_id,empresa_id,numero,autor,motivo,tipo,anterior,novo) values(p_id,empresa,novo.revisao,auth.uid(),trim(p_motivo),p_tipo,to_jsonb(pedido),to_jsonb(novo));
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(p_id,empresa,auth.uid(),'revisao','Revisão '||novo.revisao||' ('||p_tipo||'): '||trim(p_motivo)||case when pedido.situacao in ('producao','pronto') then '. Conferência de produção: '||p_conferencia_producao else '' end);
end $$;
revoke all on function public.gc_revisar_pedido(uuid,integer,text,text,text,text,boolean,text) from public,anon;
grant execute on function public.gc_revisar_pedido(uuid,integer,text,text,text,text,boolean,text) to authenticated;
commit;
