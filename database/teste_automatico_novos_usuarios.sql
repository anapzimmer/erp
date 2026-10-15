-- Executar após painel_testes.sql. Aplica 5 dias somente aos NOVOS cadastros.
-- Contas existentes mantêm os prazos e acessos atuais.
begin;
do $$ begin
  if to_regprocedure('public.gc_teste_valido()') is null then
    raise exception 'Execute painel_testes.sql antes desta atualização.';
  end if;
end $$;

create or replace function public.gc_iniciar_teste_cadastro()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  -- app_metadata é administrado pelo servidor. user_metadata nunca define o prazo.
  if new.raw_app_meta_data->'gc_teste' is null or new.raw_app_meta_data->'gc_teste'='null'::jsonb then
    new.raw_app_meta_data := jsonb_set(coalesce(new.raw_app_meta_data,'{}'::jsonb),'{gc_teste}',
      jsonb_build_object('dias',5,'inicio_em',now(),'expira_em',now()+interval '120 hours'));
  end if;
  return new;
end $$;
revoke all on function public.gc_iniciar_teste_cadastro() from public,anon,authenticated;
drop trigger if exists gc_teste_novo_cadastro on auth.users;
create trigger gc_teste_novo_cadastro before insert on auth.users
for each row execute function public.gc_iniciar_teste_cadastro();

create or replace function public.gc_minha_situacao()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a glasscode_private.acessos; teste jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501'; end if;
  if public.gc_proprietaria() then return jsonb_build_object('permitido',true,'situacao','ativa'); end if;
  select raw_app_meta_data->'gc_teste' into teste from auth.users where id=auth.uid();
  if not public.gc_teste_valido() then
    return jsonb_build_object('permitido',false,'situacao','suspensa_outro','teste',teste,
      'motivo_bloqueio',case when teste->>'pendente'='true' then 'teste_pendente' else 'teste_expirado' end,
      'mensagem',case when teste->>'pendente'='true' then 'Seu teste está aguardando liberação. Entre em contato com o suporte do Glass Code.' else 'Seu prazo de teste expirou. Para continuar usando o sistema, fale com nosso suporte pelo WhatsApp.' end);
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

notify pgrst,'reload schema';
commit;
