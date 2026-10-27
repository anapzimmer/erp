-- Executar após 20261025_pedidos_revisoes.sql. Revisão técnica: preserva contrato e financeiro.
begin;
create or replace function public.gc_revisar_medidas_pedido(p_id uuid,p_versao integer,p_campo text,p_indice integer,p_item jsonb,p_motivo text,p_conferencia text) returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.pedido_empresa(); pedido public.gc_pedidos%rowtype; novo public.gc_pedidos%rowtype; original jsonb; documento jsonb; projetos jsonb;
begin
 select * into pedido from public.gc_pedidos where id=p_id and empresa_id=empresa for update;
 if not found then raise exception 'Pedido indisponível.'; end if;
 if pedido.versao is distinct from p_versao then raise exception 'Pedido alterado. Reabra a conferência antes de revisar.'; end if;
 if pedido.situacao in ('entregue','cancelado') then raise exception 'Pedido encerrado não pode ser revisado.'; end if;
 if p_motivo is null or length(trim(p_motivo)) not between 3 and 500 then raise exception 'Informe o motivo da alteração (mínimo de 3 caracteres).'; end if;
 if pedido.situacao in ('producao','pronto') and coalesce(length(trim(p_conferencia)),0)<10 then raise exception 'Registre a pausa e a conferência da produção.'; end if;
 if p_campo is null or p_campo not in ('documentoPdfCompleto','projetosPdf') or p_indice is null or p_indice<0 then raise exception 'Projeto inválido.'; end if;
 documento:=pedido.origem_snapshot;
 projetos:=documento->'itens'->p_campo;
 if jsonb_typeof(projetos) is distinct from 'array' then raise exception 'Pedido sem projetos editáveis.'; end if;
 if p_indice>=jsonb_array_length(projetos) then raise exception 'Projeto não encontrado.'; end if;
 original:=projetos->p_indice;
 if jsonb_typeof(p_item) is distinct from 'object' or p_item->>'id' is distinct from original->>'id' or p_item->>'projeto' is distinct from original->>'projeto' then raise exception 'O projeto revisado não corresponde ao original.'; end if;
 if jsonb_typeof(p_item->'quantidade') is distinct from 'number' or (p_item->>'quantidade')::numeric<=0 then raise exception 'Quantidade inválida.'; end if;
 if p_item ? 'vidrosAvulsos' then
  if jsonb_typeof(p_item->'vidrosAvulsos') is distinct from 'array' then raise exception 'Relação de peças inválida.'; end if;
  if jsonb_array_length(p_item->'vidrosAvulsos')=0 then raise exception 'Informe as peças.'; end if;
 end if;
 documento:=jsonb_set(documento,array['itens',p_campo,p_indice::text],original||p_item,false);
 -- Atualiza a representação alternativa somente quando identifica o mesmo projeto.
 if p_campo='documentoPdfCompleto' and jsonb_typeof(documento->'itens'->'projetosPdf')='array' then
  documento:=jsonb_set(documento,'{itens,projetosPdf}',(select coalesce(jsonb_agg(case when x->>'id'=original->>'id' then x||p_item else x end order by n),'[]'::jsonb) from jsonb_array_elements(documento->'itens'->'projetosPdf') with ordinality a(x,n)),false);
 end if;
 update public.gc_pedidos set origem_snapshot=documento,situacao='conferencia',revisao=revisao+1,versao=versao+1,atualizado_em=now() where id=p_id returning * into novo;
 insert into public.gc_pedido_revisoes(pedido_id,empresa_id,numero,autor,motivo,tipo,anterior,novo) values(p_id,empresa,novo.revisao,auth.uid(),trim(p_motivo),'tecnica',to_jsonb(pedido),to_jsonb(novo));
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(p_id,empresa,auth.uid(),'revisao','Revisão técnica '||novo.revisao||': '||trim(p_motivo)||case when pedido.situacao in ('producao','pronto') then '. Conferência: '||p_conferencia else '' end);
end $$;
revoke all on function public.gc_revisar_medidas_pedido(uuid,integer,text,integer,jsonb,text,text) from public,anon;
grant execute on function public.gc_revisar_medidas_pedido(uuid,integer,text,integer,jsonb,text,text) to authenticated;
commit;
