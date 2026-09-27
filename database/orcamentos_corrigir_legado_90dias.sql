-- Correção baseada no diagnóstico da Disk Vidros de 27/09/2026.
-- Não apaga registros. A próxima rotina diária moverá vencidos elegíveis à lixeira.
begin;
lock table public.orcamentos in share row exclusive mode;
create or replace function glasscode_private.orcamento_protegido(o jsonb) returns boolean language plpgsql stable security definer set search_path='' as $$
declare vinculo record; encontrado boolean; estado text;
begin
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

-- A correção de datas se limita à empresa e ao carimbo exato da instalação.
-- Edições/restaurações posteriores e registros já na lixeira não são alterados.
alter table public.orcamentos disable trigger gc_orcamento_data;
with datas as (
 select id,greatest(
   created_at,
   nullif(to_jsonb(o)->>'updated_at','')::timestamptz,
   nullif(to_jsonb(o)->>'excluir_em','')::timestamptz - interval '90 days'
 ) base
 from public.orcamentos o
 where empresa_id='b2ac500e-99be-4b50-a96b-39db8989dfd7'::uuid
 and gc_alterado_em='2026-09-27T12:31:38.47709Z'::timestamptz
 and gc_excluido_em is null
 and nullif(to_jsonb(o)->>'excluir_em','') is not null
 and exists(select 1 from glasscode_private.retencao_config c where c.empresa_id=o.empresa_id and c.dias=90)
)
update public.orcamentos o set gc_alterado_em=d.base from datas d
where o.id=d.id and d.base is not null and d.base<=o.gc_alterado_em;
alter table public.orcamentos enable trigger gc_orcamento_data;
commit;
notify pgrst, 'reload schema';
select to_char(created_at,'YYYY-MM') mes,
 count(*) filter(where gc_excluido_em is null and not glasscode_private.orcamento_protegido(to_jsonb(o))) elegiveis,
 count(*) filter(where gc_excluido_em is null and glasscode_private.orcamento_protegido(to_jsonb(o))) protegidos,
 count(*) filter(where gc_excluido_em is null and gc_alterado_em<now()-interval '90 days' and not glasscode_private.orcamento_protegido(to_jsonb(o))) vencidos_para_lixeira
from public.orcamentos o where empresa_id='b2ac500e-99be-4b50-a96b-39db8989dfd7'::uuid group by 1 order by 1;
