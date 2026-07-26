-- Corrige as permissoes RLS das tabelas de preco.
-- Execute no SQL Editor do Supabase.
-- O problema identificado: SELECT encontra a tabela, mas DELETE remove 0 linhas.

alter table public.tabelas enable row level security;
alter table public.vidro_precos_grupos enable row level security;

drop policy if exists "tabelas_empresa_select" on public.tabelas;
drop policy if exists "tabelas_empresa_insert" on public.tabelas;
drop policy if exists "tabelas_empresa_update" on public.tabelas;
drop policy if exists "tabelas_empresa_delete" on public.tabelas;

create policy "tabelas_empresa_select" on public.tabelas
for select using (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = tabelas.empresa_id
  )
);

create policy "tabelas_empresa_insert" on public.tabelas
for insert with check (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = tabelas.empresa_id
  )
);

create policy "tabelas_empresa_update" on public.tabelas
for update using (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = tabelas.empresa_id
  )
) with check (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = tabelas.empresa_id
  )
);

create policy "tabelas_empresa_delete" on public.tabelas
for delete using (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = tabelas.empresa_id
  )
);

drop policy if exists "vidro_precos_grupos_empresa_select" on public.vidro_precos_grupos;
drop policy if exists "vidro_precos_grupos_empresa_insert" on public.vidro_precos_grupos;
drop policy if exists "vidro_precos_grupos_empresa_update" on public.vidro_precos_grupos;
drop policy if exists "vidro_precos_grupos_empresa_delete" on public.vidro_precos_grupos;

create policy "vidro_precos_grupos_empresa_select" on public.vidro_precos_grupos
for select using (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = vidro_precos_grupos.empresa_id
  )
);

create policy "vidro_precos_grupos_empresa_insert" on public.vidro_precos_grupos
for insert with check (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = vidro_precos_grupos.empresa_id
  )
);

create policy "vidro_precos_grupos_empresa_update" on public.vidro_precos_grupos
for update using (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = vidro_precos_grupos.empresa_id
  )
) with check (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = vidro_precos_grupos.empresa_id
  )
);

create policy "vidro_precos_grupos_empresa_delete" on public.vidro_precos_grupos
for delete using (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id = auth.uid()
      and pu.empresa_id = vidro_precos_grupos.empresa_id
  )
);
