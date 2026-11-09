-- Numeração global, compatível com orcamentos_numero_formatado_key.
-- Não altera números existentes, dados de orçamentos ou políticas da lixeira.
begin;
create table if not exists glasscode_private.orcamento_contadores (
 prefixo text primary key, ultimo bigint not null check(ultimo>=0)
);
revoke all on glasscode_private.orcamento_contadores from public,anon,authenticated;
alter table glasscode_private.orcamento_contadores enable row level security;
create or replace function public.gc_reservar_numero_orcamento()
returns text language plpgsql security definer set search_path='' as $$
declare prefixo_atual text:='OR'||to_char(now() at time zone 'America/Sao_Paulo','DDMM'); maior bigint; proximo bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.perfis_usuarios where id=auth.uid() and empresa_id is not null)
    or not public.gc_acesso_permitido() or not public.gc_teste_valido() then
   raise exception 'Acesso não autorizado para gerar orçamento.' using errcode='42501';
 end if;
 insert into glasscode_private.orcamento_contadores(prefixo,ultimo) values(prefixo_atual,0) on conflict do nothing;
 perform 1 from glasscode_private.orcamento_contadores where prefixo=prefixo_atual for update;
 -- SECURITY DEFINER permite contar os números ocupados sem expor registros de outras empresas ou da lixeira.
 select coalesce(max(substring(numero_formatado from 7)::bigint),0) into maior
 from public.orcamentos where numero_formatado ~ ('^'||prefixo_atual||'[0-9]{1,15}$');
 update glasscode_private.orcamento_contadores set ultimo=greatest(ultimo,maior)+1 where prefixo=prefixo_atual returning ultimo into proximo;
 return prefixo_atual||case when proximo<10 then '0' else '' end||proximo::text;
end $$;
revoke all on function public.gc_reservar_numero_orcamento() from public,anon;
grant execute on function public.gc_reservar_numero_orcamento() to authenticated;
commit;
-- Reservas abandonadas deixam lacunas intencionais; números nunca são reciclados.
-- Reversão: preservar contador e números, revogar EXECUTE da RPC somente se o
-- salvamento de novos orçamentos for suspenso. A versão anterior pode repetir números.
