-- Glass Code ERP - estrutura do banco para Cadastro/Calculo de Projetos
-- Rode este arquivo no Supabase SQL Editor.
-- Ele e idempotente: pode ser executado mais de uma vez sem duplicar colunas/tabelas.

create extension if not exists pgcrypto;

create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  categoria text not null default '',
  desenho text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists public.projetos_folhas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  numero_folha integer not null default 1,
  tipo_folha text not null default '',
  formula_largura text not null default '',
  formula_altura text not null default '',
  observacao text not null default ''
);

create table if not exists public.projetos_kits (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  kit_id uuid not null references public.kits(id) on delete restrict,
  espessura_vidro text not null default '',
  largura_referencia numeric not null default 0,
  altura_referencia numeric not null default 0,
  tolerancia_mm numeric not null default 50,
  observacao text not null default ''
);

create table if not exists public.projetos_ferragens (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  ferragem_id uuid not null references public.ferragens(id) on delete restrict,
  quantidade numeric not null default 1,
  usar_no_kit boolean not null default false,
  usar_no_perfil boolean not null default true,
  observacao text not null default ''
);

create table if not exists public.projetos_perfis (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  perfil_id uuid not null references public.perfis(id) on delete restrict,
  qtd_largura numeric not null default 0,
  qtd_altura numeric not null default 0,
  qtd_outros numeric not null default 0,
  tipo_fornecimento text not null default 'barra'
);

-- Compatibilidade com versoes anteriores do front e com o calculo atual.
alter table public.projetos add column if not exists empresa_id uuid;
alter table public.projetos add column if not exists nome text;
alter table public.projetos add column if not exists categoria text default '';
alter table public.projetos add column if not exists desenho text default '';
alter table public.projetos add column if not exists criado_em timestamptz default now();

alter table public.projetos_folhas add column if not exists projeto_id uuid;
alter table public.projetos_folhas add column if not exists numero_folha integer default 1;
alter table public.projetos_folhas add column if not exists tipo_folha text default '';
alter table public.projetos_folhas add column if not exists formula_largura text default '';
alter table public.projetos_folhas add column if not exists formula_altura text default '';
alter table public.projetos_folhas add column if not exists observacao text default '';

alter table public.projetos_kits add column if not exists projeto_id uuid;
alter table public.projetos_kits add column if not exists kit_id uuid;
alter table public.projetos_kits add column if not exists espessura_vidro text default '';
alter table public.projetos_kits add column if not exists largura_referencia numeric default 0;
alter table public.projetos_kits add column if not exists altura_referencia numeric default 0;
alter table public.projetos_kits add column if not exists tolerancia_mm numeric default 50;
alter table public.projetos_kits add column if not exists observacao text default '';
alter table public.projetos_kits add column if not exists variacao_restrita text;

alter table public.projetos_ferragens add column if not exists projeto_id uuid;
alter table public.projetos_ferragens add column if not exists ferragem_id uuid;
alter table public.projetos_ferragens add column if not exists quantidade numeric default 1;
alter table public.projetos_ferragens add column if not exists usar_no_kit boolean default false;
alter table public.projetos_ferragens add column if not exists usar_no_perfil boolean default true;
alter table public.projetos_ferragens add column if not exists observacao text default '';
alter table public.projetos_ferragens add column if not exists variacao_restrita text;

alter table public.projetos_perfis add column if not exists projeto_id uuid;
alter table public.projetos_perfis add column if not exists perfil_id uuid;
alter table public.projetos_perfis add column if not exists qtd_largura numeric default 0;
alter table public.projetos_perfis add column if not exists qtd_altura numeric default 0;
alter table public.projetos_perfis add column if not exists qtd_outros numeric default 0;
alter table public.projetos_perfis add column if not exists tipo_fornecimento text default 'barra';
alter table public.projetos_perfis add column if not exists variacao_restrita text;
-- Coluna antiga lida como fallback pelo codigo de edicao.
alter table public.projetos_perfis add column if not exists quantidade numeric;

-- Limpeza de dados orfaos antes de criar foreign keys.
-- O erro 23503 acontece quando uma linha filha aponta para um projeto que nao existe mais.
delete from public.projetos_folhas pf
where pf.projeto_id is null
   or not exists (select 1 from public.projetos p where p.id = pf.projeto_id);

delete from public.projetos_kits pk
where pk.projeto_id is null
   or not exists (select 1 from public.projetos p where p.id = pk.projeto_id)
   or pk.kit_id is null
   or not exists (select 1 from public.kits k where k.id = pk.kit_id);

delete from public.projetos_ferragens pf
where pf.projeto_id is null
   or not exists (select 1 from public.projetos p where p.id = pf.projeto_id)
   or pf.ferragem_id is null
   or not exists (select 1 from public.ferragens f where f.id = pf.ferragem_id);

delete from public.projetos_perfis pp
where pp.projeto_id is null
   or not exists (select 1 from public.projetos p where p.id = pp.projeto_id)
   or pp.perfil_id is null
   or not exists (select 1 from public.perfis pe where pe.id = pp.perfil_id);

-- Foreign keys que o PostgREST/Supabase precisa para embeds:
-- projetos_folhas(*), projetos_kits(*), projetos_ferragens(*), projetos_perfis(*)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projetos_folhas_projeto_id_fkey'
  ) then
    alter table public.projetos_folhas
      add constraint projetos_folhas_projeto_id_fkey
      foreign key (projeto_id) references public.projetos(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projetos_kits_projeto_id_fkey'
  ) then
    alter table public.projetos_kits
      add constraint projetos_kits_projeto_id_fkey
      foreign key (projeto_id) references public.projetos(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projetos_ferragens_projeto_id_fkey'
  ) then
    alter table public.projetos_ferragens
      add constraint projetos_ferragens_projeto_id_fkey
      foreign key (projeto_id) references public.projetos(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projetos_perfis_projeto_id_fkey'
  ) then
    alter table public.projetos_perfis
      add constraint projetos_perfis_projeto_id_fkey
      foreign key (projeto_id) references public.projetos(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projetos_empresa_id_fkey'
  ) then
    alter table public.projetos
      add constraint projetos_empresa_id_fkey
      foreign key (empresa_id) references public.empresas(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_projetos_empresa_id on public.projetos(empresa_id);
create index if not exists idx_projetos_nome on public.projetos(nome);
create index if not exists idx_projetos_folhas_projeto_id on public.projetos_folhas(projeto_id);
create index if not exists idx_projetos_kits_projeto_id on public.projetos_kits(projeto_id);
create index if not exists idx_projetos_ferragens_projeto_id on public.projetos_ferragens(projeto_id);
create index if not exists idx_projetos_perfis_projeto_id on public.projetos_perfis(projeto_id);

alter table public.projetos enable row level security;
alter table public.projetos_folhas enable row level security;
alter table public.projetos_kits enable row level security;
alter table public.projetos_ferragens enable row level security;
alter table public.projetos_perfis enable row level security;

drop policy if exists "projetos_empresa_select" on public.projetos;
drop policy if exists "projetos_empresa_insert" on public.projetos;
drop policy if exists "projetos_empresa_update" on public.projetos;
drop policy if exists "projetos_empresa_delete" on public.projetos;

create policy "projetos_empresa_select" on public.projetos
for select using (
  exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid() and pu.empresa_id = projetos.empresa_id
  )
);

create policy "projetos_empresa_insert" on public.projetos
for insert with check (
  exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid() and pu.empresa_id = projetos.empresa_id
  )
);

create policy "projetos_empresa_update" on public.projetos
for update using (
  exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid() and pu.empresa_id = projetos.empresa_id
  )
) with check (
  exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid() and pu.empresa_id = projetos.empresa_id
  )
);

create policy "projetos_empresa_delete" on public.projetos
for delete using (
  exists (
    select 1 from public.perfis_usuarios pu
    where pu.id = auth.uid() and pu.empresa_id = projetos.empresa_id
  )
);

drop policy if exists "projetos_folhas_empresa_all" on public.projetos_folhas;
drop policy if exists "projetos_kits_empresa_all" on public.projetos_kits;
drop policy if exists "projetos_ferragens_empresa_all" on public.projetos_ferragens;
drop policy if exists "projetos_perfis_empresa_all" on public.projetos_perfis;

create policy "projetos_folhas_empresa_all" on public.projetos_folhas
for all using (
  exists (
    select 1
    from public.projetos p
    join public.perfis_usuarios pu on pu.empresa_id = p.empresa_id
    where p.id = projetos_folhas.projeto_id and pu.id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.projetos p
    join public.perfis_usuarios pu on pu.empresa_id = p.empresa_id
    where p.id = projetos_folhas.projeto_id and pu.id = auth.uid()
  )
);

create policy "projetos_kits_empresa_all" on public.projetos_kits
for all using (
  exists (
    select 1
    from public.projetos p
    join public.perfis_usuarios pu on pu.empresa_id = p.empresa_id
    where p.id = projetos_kits.projeto_id and pu.id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.projetos p
    join public.perfis_usuarios pu on pu.empresa_id = p.empresa_id
    where p.id = projetos_kits.projeto_id and pu.id = auth.uid()
  )
);

create policy "projetos_ferragens_empresa_all" on public.projetos_ferragens
for all using (
  exists (
    select 1
    from public.projetos p
    join public.perfis_usuarios pu on pu.empresa_id = p.empresa_id
    where p.id = projetos_ferragens.projeto_id and pu.id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.projetos p
    join public.perfis_usuarios pu on pu.empresa_id = p.empresa_id
    where p.id = projetos_ferragens.projeto_id and pu.id = auth.uid()
  )
);

create policy "projetos_perfis_empresa_all" on public.projetos_perfis
for all using (
  exists (
    select 1
    from public.projetos p
    join public.perfis_usuarios pu on pu.empresa_id = p.empresa_id
    where p.id = projetos_perfis.projeto_id and pu.id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.projetos p
    join public.perfis_usuarios pu on pu.empresa_id = p.empresa_id
    where p.id = projetos_perfis.projeto_id and pu.id = auth.uid()
  )
);

-- Forca o Supabase/PostgREST a atualizar o cache de relacionamentos.
notify pgrst, 'reload schema';
