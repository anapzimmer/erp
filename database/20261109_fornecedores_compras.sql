-- Após 20261108_gestao_compras.sql. Preserva compras anteriores e seus valores.
begin;
create table public.gc_fornecedores (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
 nome text not null check(length(trim(nome)) between 1 and 200), documento text not null default '' check(length(documento)<=20),
 contato text not null default '' check(length(contato)<=200), telefone text not null default '' check(length(telefone)<=30),
 email text not null default '' check(length(email)<=200), endereco text not null default '' check(length(endereco)<=500),
 observacoes text not null default '' check(length(observacoes)<=2000), ativo boolean not null default true,
 criado_em timestamptz not null default now(), unique(empresa_id,id)
);
alter table public.gc_fornecedores enable row level security;
revoke all on public.gc_fornecedores from public,anon,authenticated;
grant select,insert,update on public.gc_fornecedores to authenticated;
create policy fornecedores_acesso on public.gc_fornecedores for all to authenticated
 using(public.gc_modulo_permitido(empresa_id,'gestao')) with check(public.gc_modulo_permitido(empresa_id,'gestao'));
alter table public.gc_compras add column fornecedor_id uuid;
alter table public.gc_compras add constraint gc_compra_fornecedor_empresa foreign key(empresa_id,fornecedor_id) references public.gc_fornecedores(empresa_id,id);
create function public.gc_registrar_compra_fornecedor(p_requisicao uuid,p_fornecedor_id uuid,p_referencia text,p_previsao date,p_observacoes text,p_itens jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare emp uuid:=glasscode_private.pedido_empresa(); nome text; compra uuid;
begin
 perform 1 from public.empresas where id=emp for update;
 select id into compra from public.gc_compras where empresa_id=emp and requisicao=p_requisicao;
 if found then return compra; end if;
 select f.nome into nome from public.gc_fornecedores f where f.id=p_fornecedor_id and f.empresa_id=emp and f.ativo for share;
 if not found then raise exception 'Selecione um fornecedor ativo da empresa.'; end if;
 compra:=public.gc_registrar_compra(p_requisicao,nome,p_referencia,p_previsao,p_observacoes,p_itens);
 update public.gc_compras set fornecedor_id=p_fornecedor_id where id=compra and empresa_id=emp;
 return compra;
end $$;
revoke all on function public.gc_registrar_compra_fornecedor(uuid,uuid,text,date,text,jsonb) from public,anon;
grant execute on function public.gc_registrar_compra_fornecedor(uuid,uuid,text,date,text,jsonb) to authenticated;
commit;
-- Reversão: voltar interface anterior e revogar EXECUTE da nova RPC.
-- Manter cadastro e vínculo após uso real; não excluir histórico comercial.
