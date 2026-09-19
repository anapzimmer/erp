-- Correção baseada no diagnóstico fornecido em 19/09/2026.
-- Execute antes de painel_plataforma.sql. Nenhum registro é apagado.
begin;

alter table public.tipologias enable row level security;
drop policy if exists gc_tipologias_empresa on public.tipologias;
create policy gc_tipologias_empresa on public.tipologias
for all to authenticated
using (exists (
  select 1 from public.perfis_usuarios p
  where p.id = (select auth.uid()) and p.empresa_id = tipologias.empresa_id
))
with check (exists (
  select 1 from public.perfis_usuarios p
  where p.id = (select auth.uid()) and p.empresa_id = tipologias.empresa_id
));

-- Os componentes herdam a empresa do modelo; não possuem empresa_id próprio.
do $$
declare tabela text;
begin
  foreach tabela in array array['tipologias_ferragens','tipologias_perfis','tipologias_vidros'] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('drop policy if exists gc_tipologia_componentes on public.%I', tabela);
    execute format(
      'create policy gc_tipologia_componentes on public.%1$I for all to authenticated
       using (exists (select 1 from public.tipologias t join public.perfis_usuarios p on p.empresa_id = t.empresa_id
         where t.id = %1$I.tipologia_id and p.id = (select auth.uid())))
       with check (exists (select 1 from public.tipologias t join public.perfis_usuarios p on p.empresa_id = t.empresa_id
         where t.id = %1$I.tipologia_id and p.id = (select auth.uid())))', tabela);
  end loop;
end $$;

-- Não permitir que uma conta modifique seu próprio role ou vínculo de empresa.
alter table public.usuarios enable row level security;
drop policy if exists gc_usuario_proprio on public.usuarios;
create policy gc_usuario_proprio on public.usuarios
for select to authenticated using (id = (select auth.uid()));

-- Sem vínculo de empresa e sem uso encontrado no código atual.
-- Preservar dados, mas não conceder acesso pela API sem definir sua titularidade.
alter table public.ferragens_cores enable row level security;
alter table public.materiais enable row level security;
alter table public.medidas enable row level security;

commit;
