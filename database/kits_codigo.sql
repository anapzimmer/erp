alter table public.kits
  add column if not exists codigo text;

create index if not exists kits_empresa_codigo_idx
  on public.kits (empresa_id, codigo);
