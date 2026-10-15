-- Executar após painel_plataforma.sql e painel_situacao_contas.sql.
-- O prazo fica em app_metadata (somente o servidor administrativo pode alterar).
begin;
create or replace function public.gc_teste_valido()
returns boolean language plpgsql stable security definer set search_path='' as $$
declare teste jsonb; fim timestamptz;
begin
  if auth.uid() is null then return false; end if;
  select raw_app_meta_data->'gc_teste' into teste from auth.users where id=auth.uid();
  if teste is null then return true; end if;
  if teste->>'pendente'='true' then return false; end if;
  fim := (teste->>'expira_em')::timestamptz;
  return coalesce(isfinite(fim) and fim > now(), false);
exception when others then return false;
end $$;

create or replace function public.gc_acesso_permitido()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (public.gc_proprietaria() or (
    public.gc_teste_valido() and not exists (
      select 1 from glasscode_private.acessos a where a.bloqueado and (
        (a.tipo='usuario' and a.alvo_id=auth.uid()) or
        (a.tipo='empresa' and exists (
          select 1 from public.perfis_usuarios p where p.id=auth.uid() and p.empresa_id=a.alvo_id
        ))
      )
    )
  ));
$$;

create or replace function public.gc_minha_situacao()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a glasscode_private.acessos; teste jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501'; end if;
  if public.gc_proprietaria() then return jsonb_build_object('permitido',true,'situacao','ativa'); end if;
  select raw_app_meta_data->'gc_teste' into teste from auth.users where id=auth.uid();
  if not public.gc_teste_valido() then
    return jsonb_build_object('permitido',false,'situacao','suspensa_outro','teste',teste,
      'mensagem','Seu período de teste terminou ou ainda não foi liberado. Entre em contato com o Glass Code para continuar.');
  end if;
  select x.* into a from glasscode_private.acessos x where x.situacao<>'ativa' and (
    (x.tipo='usuario' and x.alvo_id=auth.uid()) or
    (x.tipo='empresa' and exists(select 1 from public.perfis_usuarios p where p.id=auth.uid() and p.empresa_id=x.alvo_id))
  ) order by x.bloqueado desc,case x.situacao when 'cancelada' then 0 when 'suspensa_inadimplencia' then 1 when 'suspensa_outro' then 2 when 'regularizacao' then 3 else 4 end,x.atualizado_em desc limit 1;
  return jsonb_build_object('permitido',public.gc_acesso_permitido(),'situacao',coalesce(a.situacao,'ativa'),
    'mensagem',coalesce(a.mensagem_cliente,''),'contato',coalesce(a.contato,''),'prazo',a.prazo,
    'inicio_em',a.inicio_em,'teste',teste,
    'prazo_vencido',coalesce(a.prazo<(now() at time zone 'America/Sao_Paulo')::date,false));
end $$;

create or replace function public.gc_painel_testes(p_busca text default '',p_pagina integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare painel jsonb; itens jsonb;
begin
  painel:=public.gc_painel_situacoes(p_busca,p_pagina);
  select coalesce(jsonb_agg(e.item||jsonb_build_object('teste',u.raw_app_meta_data->'gc_teste') order by e.ord),'[]'::jsonb)
    into itens from jsonb_array_elements(painel->'usuarios') with ordinality e(item,ord)
    join auth.users u on u.id::text=e.item->>'id';
  return jsonb_set(painel,'{usuarios}',itens);
end $$;

-- Registra alterações de teste, sem gravar senhas no histórico.
create or replace function public.gc_registrar_teste()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.raw_app_meta_data->'gc_teste' is distinct from new.raw_app_meta_data->'gc_teste' then
    insert into glasscode_private.historico(autor_id,tipo,alvo_id,alvo_nome,bloqueado,motivo,detalhes)
    select usuario_id,'usuario',new.id,new.email,false,'Período de teste atualizado',
      jsonb_build_object('antes',old.raw_app_meta_data->'gc_teste','depois',new.raw_app_meta_data->'gc_teste')
      from glasscode_private.proprietaria;
  end if;
  return new;
end $$;
drop trigger if exists gc_historico_teste on auth.users;
create trigger gc_historico_teste after update of raw_app_meta_data on auth.users
for each row execute function public.gc_registrar_teste();

revoke all on function public.gc_teste_valido(),public.gc_painel_testes(text,integer),public.gc_registrar_teste() from public,anon,authenticated;
grant execute on function public.gc_teste_valido(),public.gc_painel_testes(text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
