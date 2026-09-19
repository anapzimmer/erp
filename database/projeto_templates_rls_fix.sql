-- Corrige a política SELECT identificada no Supabase e ativa o RLS.
-- Preserva registros; não concede inclusão, alteração ou exclusão.
begin;

alter table public.projeto_templates enable row level security;

drop policy if exists "Templates por empresa - select"
  on public.projeto_templates;

create policy "Templates por empresa - select"
on public.projeto_templates
for select to authenticated
using (
  exists (
    select 1
    from public.perfis_usuarios p
    where p.id = (select auth.uid())
      and p.empresa_id = projeto_templates.empresa_id
  )
);

commit;
