-- Aplicação manual autorizada. Não altera preços nem orçamentos existentes.
begin;
create table public.configuracao_medida_vidro (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  limite_mm numeric not null default 3210 check (limite_mm > 0 and limite_mm < 'Infinity'::numeric),
  percentual numeric not null default 7 check (percentual between 0 and 100)
);
alter table public.configuracao_medida_vidro enable row level security;
revoke all on public.configuracao_medida_vidro from anon, authenticated;
grant select, insert, update on public.configuracao_medida_vidro to authenticated;
grant all on public.configuracao_medida_vidro to service_role;
create policy empresa_regra_vidro on public.configuracao_medida_vidro for all to authenticated
using (empresa_id in (select p.empresa_id from public.perfis_usuarios p where p.id = auth.uid()))
with check (empresa_id in (select p.empresa_id from public.perfis_usuarios p where p.id = auth.uid()));

alter table public.vidros add column chapas jsonb not null default '[]'::jsonb;
alter table public.vidros add constraint vidros_chapas_validas check (
  jsonb_typeof(chapas) = 'array' and
  not jsonb_path_exists(chapas, '$[*] ? (@.type() != "object" || !exists(@.largura_mm) || !exists(@.altura_mm) || @.largura_mm.type() != "number" || @.altura_mm.type() != "number" || @.largura_mm <= 0 || @.altura_mm <= 0)')
);
-- Mantém as políticas existentes de vidros; libera somente a nova coluna.
grant select (chapas), insert (chapas), update (chapas) on public.vidros to authenticated;
commit;

-- Verificação: SELECT * FROM information_schema.columns WHERE table_schema='public'
-- AND table_name IN ('configuracao_medida_vidro','vidros') AND column_name IN ('limite_mm','percentual','chapas');
-- Reversão: restaurar primeiro a versão anterior da aplicação e exportar somente
-- as configurações/chapas que devam ser preservadas. Em transação autorizada:
-- DROP TABLE public.configuracao_medida_vidro;
-- ALTER TABLE public.vidros DROP COLUMN chapas;
-- A reversão elimina configurações e chapas; não altera os snapshots dos orçamentos.
