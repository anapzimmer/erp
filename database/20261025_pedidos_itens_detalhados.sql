-- Após a migração de Pedidos. Preserva os itens antigos e seus preços.
begin;
create or replace function glasscode_private.pedido_total(p_itens jsonb) returns numeric
language plpgsql immutable set search_path='' as $$
declare item jsonb; total numeric:=0; qtd numeric; preco numeric;
begin
 if p_itens is null or jsonb_typeof(p_itens)<>'array' then raise exception 'Informe os itens do pedido.'; end if;
 if jsonb_array_length(p_itens) not between 1 and 200 then raise exception 'Informe de 1 a 200 itens.'; end if;
 for item in select value from jsonb_array_elements(p_itens) loop
  if jsonb_typeof(item)<>'object' or coalesce(length(trim(item->>'descricao')),0) not between 1 and 500
   or jsonb_typeof(item->'quantidade') is distinct from 'number' or jsonb_typeof(item->'preco') is distinct from 'number' then raise exception 'Item inválido.'; end if;
  if item ? 'tipo' and coalesce(item->>'tipo','') not in ('vidro','material','servico') then raise exception 'Tipo de item inválido.'; end if;
  if item->>'tipo'='vidro' then
   if jsonb_typeof(item->'largura') is distinct from 'number' or jsonb_typeof(item->'altura') is distinct from 'number' or coalesce(length(trim(item->>'vidro')),0) not between 1 and 200 then raise exception 'Informe as medidas e a especificação do vidro.'; end if;
   if (item->>'largura')::numeric<=0 or (item->>'altura')::numeric<=0 or (item->>'largura')::numeric>100000 or (item->>'altura')::numeric>100000 then raise exception 'Medidas do vidro inválidas.'; end if;
  end if;
  qtd:=(item->>'quantidade')::numeric; preco:=(item->>'preco')::numeric;
  if qtd<=0 or qtd>1000000 or preco<0 or preco>100000000 or qtd<>round(qtd,3) or preco<>round(preco,2) then raise exception 'Quantidade ou preço inválido.'; end if;
  total:=total+round(qtd*preco,2);
 end loop;
 return total;
end $$;

revoke all on function glasscode_private.pedido_total(jsonb) from public,anon,authenticated;
commit;
