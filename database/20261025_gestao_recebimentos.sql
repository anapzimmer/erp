-- Gestão: contas a receber dos pedidos. Requer as migrações de módulos e pedidos.
begin;
create table glasscode_private.financeiro_usuarios(usuario_id uuid primary key references auth.users(id),empresa_id uuid not null references public.empresas(id));
create table glasscode_private.financeiro_permissoes_historico(id bigint generated always as identity primary key,empresa_id uuid not null,usuario_id uuid not null,autor_id uuid not null,liberado boolean not null,motivo text not null,criado_em timestamptz not null default now());
revoke all on glasscode_private.financeiro_permissoes_historico from public,anon,authenticated;
revoke all on glasscode_private.financeiro_usuarios from public,anon,authenticated;
alter table glasscode_private.financeiro_usuarios enable row level security;
alter table glasscode_private.financeiro_permissoes_historico enable row level security;
create or replace function public.gc_financeiro_permitido(p_empresa uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.gc_modulo_permitido(p_empresa,'gestao') and (public.gc_proprietaria() or exists(select 1 from glasscode_private.financeiro_usuarios f where f.usuario_id=auth.uid() and f.empresa_id=p_empresa));
$$;
create or replace function public.gc_financeiro_usuario_admin(p_usuario uuid,p_liberar boolean default null,p_motivo text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare empresa uuid;
begin
 if not public.gc_proprietaria() then raise exception 'Acesso negado' using errcode='42501'; end if;
 select empresa_id into empresa from public.perfis_usuarios where id=p_usuario;
 if empresa is null then raise exception 'Usuário sem empresa vinculada.'; end if;
 if p_liberar is not null then
  if p_motivo is null or length(trim(p_motivo)) not between 3 and 500 then raise exception 'Informe um motivo.'; end if;
  if p_liberar then insert into glasscode_private.financeiro_usuarios values(p_usuario,empresa) on conflict(usuario_id) do update set empresa_id=excluded.empresa_id;
  else delete from glasscode_private.financeiro_usuarios where usuario_id=p_usuario; end if;
  insert into glasscode_private.financeiro_permissoes_historico(empresa_id,usuario_id,autor_id,liberado,motivo) values(empresa,p_usuario,auth.uid(),p_liberar,trim(p_motivo));
 end if;
 return exists(select 1 from glasscode_private.financeiro_usuarios where usuario_id=p_usuario and empresa_id=empresa);
end $$;
create table public.gc_parcelas (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas(id),pedido_id uuid not null references public.gc_pedidos(id),
 numero integer not null check(numero>0),valor numeric(16,2) not null check(valor>0),vencimento date not null,cancelada boolean not null default false,criado_em timestamptz not null default now()
);
create unique index gc_parcela_ativa on public.gc_parcelas(pedido_id,numero) where not cancelada;
create table public.gc_recebimentos (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas(id),parcela_id uuid not null references public.gc_parcelas(id),
 valor numeric(16,2) not null check(valor>0),data_pagamento date not null,forma text not null check(forma in ('pix','dinheiro','transferencia','cartao','boleto','outro')),
 observacao text not null default '' check(length(observacao)<=500),autor uuid not null,criado_em timestamptz not null default now(),
 estornado_em timestamptz,estornado_por uuid,motivo_estorno text,solicitacao uuid not null,unique(empresa_id,solicitacao)
);
create index on public.gc_parcelas(empresa_id,pedido_id);
create index on public.gc_recebimentos(empresa_id,parcela_id);
alter table public.gc_parcelas enable row level security;alter table public.gc_recebimentos enable row level security;
revoke all on public.gc_parcelas,public.gc_recebimentos from public,anon,authenticated;
grant select on public.gc_parcelas,public.gc_recebimentos to authenticated;
create policy financeiro_parcelas on public.gc_parcelas for select to authenticated using(public.gc_financeiro_permitido(empresa_id));
create policy financeiro_recebimentos on public.gc_recebimentos for select to authenticated using(public.gc_financeiro_permitido(empresa_id));
create or replace function glasscode_private.financeiro_empresa() returns uuid language plpgsql stable security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.pedido_empresa();
begin
 if not public.gc_financeiro_permitido(empresa) then raise exception 'Acesso financeiro não autorizado para este usuário.' using errcode='42501'; end if;return empresa;
end $$;
create or replace function public.gc_gerar_parcelas(p_pedido uuid,p_versao integer,p_parcelas jsonb) returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.financeiro_empresa(); pedido public.gc_pedidos%rowtype; item jsonb; soma numeric:=0; numero integer:=0; valor numeric;
begin
 select * into pedido from public.gc_pedidos where id=p_pedido and empresa_id=empresa for update;
 if not found then raise exception 'Pedido indisponível.'; end if;
 if pedido.situacao='cancelado' or pedido.versao is distinct from p_versao then raise exception 'Pedido cancelado ou alterado. Atualize a tela.'; end if;
 if exists(select 1 from public.gc_parcelas where pedido_id=p_pedido and not cancelada) then raise exception 'Este pedido já possui parcelas ativas.'; end if;
 if p_parcelas is null or jsonb_typeof(p_parcelas)<>'array' then raise exception 'Informe as parcelas.'; end if;
 if jsonb_array_length(p_parcelas) not between 1 and 60 then raise exception 'Informe de 1 a 60 parcelas.'; end if;
 for item in select value from jsonb_array_elements(p_parcelas) loop
  if jsonb_typeof(item->'valor') is distinct from 'number' or coalesce(item->>'vencimento','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Parcela inválida.'; end if;
  valor:=(item->>'valor')::numeric;
  if valor<=0 or valor>1000000000000 or valor<>round(valor,2) then raise exception 'Valor de parcela inválido.'; end if;
  soma:=soma+valor;numero:=numero+1;
  insert into public.gc_parcelas(empresa_id,pedido_id,numero,valor,vencimento) values(empresa,p_pedido,numero,valor,(item->>'vencimento')::date);
 end loop;
 if soma<>pedido.total then raise exception 'A soma das parcelas deve ser igual ao total do pedido.'; end if;
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(p_pedido,empresa,auth.uid(),'parcelamento','Parcelas geradas pelo financeiro');
end $$;
create or replace function public.gc_receber_parcela(p_parcela uuid,p_valor numeric,p_data date,p_forma text,p_observacao text,p_solicitacao uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.financeiro_empresa(); parcela public.gc_parcelas%rowtype; existente public.gc_recebimentos%rowtype; recebido numeric; registro uuid; estado text;
begin
 select * into parcela from public.gc_parcelas where id=p_parcela and empresa_id=empresa;
 if not found then raise exception 'Parcela indisponível.'; end if;
 select situacao into estado from public.gc_pedidos where id=parcela.pedido_id and empresa_id=empresa for update;
 select * into parcela from public.gc_parcelas where id=p_parcela for update;
 select * into existente from public.gc_recebimentos where empresa_id=empresa and solicitacao=p_solicitacao;
 if found then
  if existente.parcela_id=p_parcela and existente.valor=p_valor and existente.data_pagamento=p_data and existente.forma=p_forma and existente.observacao=coalesce(p_observacao,'') then return existente.id; end if;
  raise exception 'Solicitação já utilizada para outro recebimento.';
 end if;
 if estado='cancelado' or parcela.cancelada then raise exception 'Pedido ou parcela cancelado.'; end if;
 if p_solicitacao is null or p_valor is null or p_valor<=0 or p_valor<>round(p_valor,2) or p_valor>1000000000000 or p_data is null or p_data>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Confira valor e data do pagamento.'; end if;
 select coalesce(sum(valor),0) into recebido from public.gc_recebimentos where parcela_id=p_parcela and estornado_em is null;
 if recebido+p_valor>parcela.valor then raise exception 'Recebimento maior que o saldo da parcela.'; end if;
 insert into public.gc_recebimentos(empresa_id,parcela_id,valor,data_pagamento,forma,observacao,autor,solicitacao) values(empresa,p_parcela,p_valor,p_data,p_forma,coalesce(p_observacao,''),auth.uid(),p_solicitacao) returning id into registro;
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(parcela.pedido_id,empresa,auth.uid(),'recebimento','Recebimento registrado pelo financeiro');return registro;
end $$;
create or replace function public.gc_estornar_recebimento(p_id uuid,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.financeiro_empresa(); pedido uuid; registro public.gc_recebimentos%rowtype;
begin
 select p.pedido_id into pedido from public.gc_recebimentos r join public.gc_parcelas p on p.id=r.parcela_id where r.id=p_id and r.empresa_id=empresa;
 if pedido is null then raise exception 'Recebimento indisponível.'; end if;
 perform 1 from public.gc_pedidos where id=pedido for update;
 select * into registro from public.gc_recebimentos where id=p_id for update;
 if registro.estornado_em is not null then raise exception 'Recebimento já estornado.'; end if;
 if p_motivo is null or length(trim(p_motivo)) not between 3 and 500 then raise exception 'Informe o motivo do estorno.'; end if;
 update public.gc_recebimentos set estornado_em=now(),estornado_por=auth.uid(),motivo_estorno=trim(p_motivo) where id=p_id;
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(pedido,empresa,auth.uid(),'estorno','Estorno registrado pelo financeiro');
end $$;
create or replace function public.gc_cancelar_parcelas(p_pedido uuid,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid:=glasscode_private.financeiro_empresa();
begin
 perform 1 from public.gc_pedidos where id=p_pedido and empresa_id=empresa for update;
 if not found then raise exception 'Pedido indisponível.'; end if;
 if p_motivo is null or length(trim(p_motivo)) not between 3 and 500 then raise exception 'Informe o motivo do cancelamento.'; end if;
 if exists(select 1 from public.gc_recebimentos r join public.gc_parcelas p on p.id=r.parcela_id where p.pedido_id=p_pedido and not p.cancelada and r.estornado_em is null) then raise exception 'Estorne os recebimentos antes de cancelar as parcelas.'; end if;
 update public.gc_parcelas set cancelada=true where pedido_id=p_pedido and not cancelada;
 if not found then raise exception 'Não há parcelas ativas.'; end if;
 insert into public.gc_pedido_eventos(pedido_id,empresa_id,autor,evento,detalhe) values(p_pedido,empresa,auth.uid(),'parcelas_canceladas','Parcelamento cancelado: '||trim(p_motivo));
end $$;
-- Mesmo uma chamada direta de edição de pedido não pode alterar valores já parcelados.
create or replace function glasscode_private.proteger_financeiro_pedido() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.gc_parcelas where pedido_id=old.id and not cancelada) and
 (new.total is distinct from old.total or new.itens is distinct from old.itens or new.cliente is distinct from old.cliente or new.situacao='cancelado') then raise exception 'Cancele o parcelamento no financeiro antes desta alteração.'; end if;
 return new;
end $$;
create trigger gc_proteger_financeiro_pedido before update on public.gc_pedidos for each row execute function glasscode_private.proteger_financeiro_pedido();
revoke all on function glasscode_private.financeiro_empresa(),glasscode_private.proteger_financeiro_pedido() from public,anon,authenticated;
revoke all on function public.gc_financeiro_permitido(uuid),public.gc_financeiro_usuario_admin(uuid,boolean,text),public.gc_gerar_parcelas(uuid,integer,jsonb),public.gc_receber_parcela(uuid,numeric,date,text,text,uuid),public.gc_estornar_recebimento(uuid,text),public.gc_cancelar_parcelas(uuid,text) from public,anon;
grant execute on function public.gc_financeiro_permitido(uuid),public.gc_financeiro_usuario_admin(uuid,boolean,text),public.gc_gerar_parcelas(uuid,integer,jsonb),public.gc_receber_parcela(uuid,numeric,date,text,text,uuid),public.gc_estornar_recebimento(uuid,text),public.gc_cancelar_parcelas(uuid,text) to authenticated;
commit;
