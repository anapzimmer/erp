-- Execute após orcamentos_armazenamento.sql. Não altera o agendamento existente.
begin;
create or replace function public.gc_limpar_orcamentos_periodo(p_inicio timestamptz,p_fim timestamptz,p_ids uuid[] default null,p_revisado_em timestamptz default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare empresa uuid; permissao jsonb; itens jsonb; n integer;
begin
 permissao=public.gc_armazenamento('consultar');
 if coalesce((permissao->>'autorizado')::boolean,false) is not true then raise exception 'Solicite autorização à Glass Code para administrar o armazenamento.'; end if;
 select empresa_id into empresa from public.perfis_usuarios where id=auth.uid();
 if p_inicio is null or p_fim is null or p_inicio>=p_fim then raise exception 'Informe um período válido: data inicial até data final.'; end if;
 if p_ids is null then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into itens from (
   select id,numero_formatado,cliente_nome,created_at,gc_alterado_em from public.orcamentos o
   where empresa_id=empresa and gc_excluido_em is null and created_at>=p_inicio and created_at<p_fim and not glasscode_private.orcamento_protegido(to_jsonb(o))
   order by created_at,id limit 500
  ) x;
  return jsonb_build_object('itens',itens,'revisado_em',statement_timestamp());
 end if;
 if coalesce(array_length(p_ids,1),0) not between 1 and 500 or p_revisado_em is null or p_revisado_em>now() then raise exception 'Consulte uma prévia válida antes de confirmar.'; end if;
 perform 1 from public.orcamentos where empresa_id=empresa and id=any(p_ids) for update;
 update public.orcamentos o set gc_excluido_em=now()
 where empresa_id=empresa and id=any(p_ids) and gc_excluido_em is null and created_at>=p_inicio and created_at<p_fim and gc_alterado_em<=p_revisado_em and not glasscode_private.orcamento_protegido(to_jsonb(o));
 get diagnostics n=row_count;
 return jsonb_build_object('quantidade',n);
end $$;
revoke all on function public.gc_limpar_orcamentos_periodo(timestamptz,timestamptz,uuid[],timestamptz) from public,anon;
grant execute on function public.gc_limpar_orcamentos_periodo(timestamptz,timestamptz,uuid[],timestamptz) to authenticated;
commit;
notify pgrst, 'reload schema';
