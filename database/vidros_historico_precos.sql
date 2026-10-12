-- Execute uma vez no SQL Editor do Supabase antes de usar o histórico.
-- Registra alterações futuras; não inventa preços anteriores à instalação.
begin;
create table if not exists public.vidros_historico_precos (
  id bigint generated always as identity primary key,
  empresa_id text not null,
  tabela_id text,
  vidro_id text not null,
  descricao text not null,
  preco_anterior numeric,
  preco_novo numeric,
  operacao text not null,
  usuario_id uuid,
  criado_em timestamptz not null default now()
);
create index if not exists vidros_historico_empresa_tabela_data
  on public.vidros_historico_precos (empresa_id, tabela_id, criado_em desc);
alter table public.vidros_historico_precos enable row level security;
revoke all on public.vidros_historico_precos from anon, authenticated;
grant select on public.vidros_historico_precos to authenticated;
drop policy if exists historico_precos_empresa on public.vidros_historico_precos;
create policy historico_precos_empresa on public.vidros_historico_precos
for select to authenticated using (
  exists (select 1 from public.perfis_usuarios p
    where p.id = auth.uid() and p.empresa_id::text = vidros_historico_precos.empresa_id)
);

create or replace function public.registrar_historico_preco_vidro()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  registro jsonb;
  anterior numeric;
  novo numeric;
  vidro text;
  tabela text;
  descricao_vidro text;
begin
  if TG_OP = 'UPDATE' and NEW.preco is not distinct from OLD.preco then
    return NEW;
  end if;
  if TG_OP = 'DELETE' then registro := to_jsonb(OLD);
  else registro := to_jsonb(NEW); end if;
  if TG_OP <> 'INSERT' then anterior := OLD.preco; end if;
  if TG_OP <> 'DELETE' then novo := NEW.preco; end if;
  if TG_TABLE_NAME = 'vidros' then
    vidro := registro->>'id';
    descricao_vidro := concat_ws(' ', registro->>'nome', registro->>'espessura', registro->>'tipo');
  else
    vidro := registro->>'vidro_id';
    tabela := registro->>'grupo_preco_id';
    select concat_ws(' ', v.nome, v.espessura, v.tipo) into descricao_vidro
      from public.vidros v where v.id::text = vidro;
  end if;
  insert into public.vidros_historico_precos
    (empresa_id, tabela_id, vidro_id, descricao, preco_anterior, preco_novo, operacao, usuario_id)
  values (registro->>'empresa_id', tabela, vidro, coalesce(descricao_vidro, vidro), anterior, novo, TG_OP, auth.uid());
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
revoke all on function public.registrar_historico_preco_vidro() from public;
drop trigger if exists historico_preco on public.vidros;
create trigger historico_preco after insert or update or delete on public.vidros
for each row execute function public.registrar_historico_preco_vidro();
drop trigger if exists historico_preco on public.vidro_precos_grupos;
create trigger historico_preco after insert or update or delete on public.vidro_precos_grupos
for each row execute function public.registrar_historico_preco_vidro();
commit;
