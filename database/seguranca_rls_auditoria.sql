-- Blindagem RLS das tabelas privadas do sistema.
-- Execute no SQL Editor do Supabase depois de revisar.
-- Objetivo: impedir leitura/escrita anonima e limitar dados pela empresa do usuario logado.

do $$
declare
  tabela text;
  politica record;
begin
  foreach tabela in array array[
    'clientes',
    'orcamentos',
    'vidros',
    'perfis',
    'ferragens',
    'kits',
    'servicos',
    'acabamentos',
    'tabelas',
    'vidro_precos_grupos',
    'configuracoes_branding'
  ]
  loop
    if to_regclass(format('public.%I', tabela)) is null then
      continue;
    end if;

    execute format('alter table if exists public.%I enable row level security', tabela);
    execute format('alter table if exists public.%I force row level security', tabela);

    for politica in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = tabela
    loop
      execute format('drop policy if exists %I on public.%I', politica.policyname, tabela);
    end loop;

    execute format('drop policy if exists %I on public.%I', tabela || '_empresa_select', tabela);
    execute format('drop policy if exists %I on public.%I', tabela || '_empresa_insert', tabela);
    execute format('drop policy if exists %I on public.%I', tabela || '_empresa_update', tabela);
    execute format('drop policy if exists %I on public.%I', tabela || '_empresa_delete', tabela);

    execute format(
      'create policy %I on public.%I for select using (
        exists (
          select 1
          from public.perfis_usuarios pu
          where pu.id::text = auth.uid()::text
            and pu.empresa_id::text = %I.empresa_id::text
        )
      )',
      tabela || '_empresa_select',
      tabela,
      tabela
    );

    execute format(
      'create policy %I on public.%I for insert with check (
        exists (
          select 1
          from public.perfis_usuarios pu
          where pu.id::text = auth.uid()::text
            and pu.empresa_id::text = %I.empresa_id::text
        )
      )',
      tabela || '_empresa_insert',
      tabela,
      tabela
    );

    execute format(
      'create policy %I on public.%I for update using (
        exists (
          select 1
          from public.perfis_usuarios pu
          where pu.id::text = auth.uid()::text
            and pu.empresa_id::text = %I.empresa_id::text
        )
      ) with check (
        exists (
          select 1
          from public.perfis_usuarios pu
          where pu.id::text = auth.uid()::text
            and pu.empresa_id::text = %I.empresa_id::text
        )
      )',
      tabela || '_empresa_update',
      tabela,
      tabela,
      tabela
    );

    execute format(
      'create policy %I on public.%I for delete using (
        exists (
          select 1
          from public.perfis_usuarios pu
          where pu.id::text = auth.uid()::text
            and pu.empresa_id::text = %I.empresa_id::text
        )
      )',
      tabela || '_empresa_delete',
      tabela,
      tabela
    );
  end loop;
end $$;

do $$
declare
  politica record;
begin
  for politica in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('empresas', 'perfis_usuarios')
  loop
    execute format('drop policy if exists %I on public.%I', politica.policyname, politica.tablename);
  end loop;
end $$;

alter table if exists public.empresas enable row level security;
alter table if exists public.empresas force row level security;

drop policy if exists empresas_usuario_select on public.empresas;
drop policy if exists empresas_usuario_update on public.empresas;

create policy empresas_usuario_select on public.empresas
for select using (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id::text = auth.uid()::text
      and pu.empresa_id::text = empresas.id::text
  )
);

create policy empresas_usuario_update on public.empresas
for update using (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id::text = auth.uid()::text
      and pu.empresa_id::text = empresas.id::text
  )
) with check (
  exists (
    select 1
    from public.perfis_usuarios pu
    where pu.id::text = auth.uid()::text
      and pu.empresa_id::text = empresas.id::text
  )
);

alter table if exists public.perfis_usuarios enable row level security;
alter table if exists public.perfis_usuarios force row level security;

drop policy if exists perfis_usuarios_proprio_select on public.perfis_usuarios;
drop policy if exists perfis_usuarios_proprio_update on public.perfis_usuarios;

create policy perfis_usuarios_proprio_select on public.perfis_usuarios
for select using (id::text = auth.uid()::text);

create policy perfis_usuarios_proprio_update on public.perfis_usuarios
for update using (id::text = auth.uid()::text) with check (id::text = auth.uid()::text);
