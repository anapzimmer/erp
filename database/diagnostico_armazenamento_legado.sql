-- Diagnóstico somente leitura. Execute no SQL Editor e envie o resultado JSON.
-- Não mostra nomes de clientes, e-mails ou valores dos orçamentos.
with base as (
 select o.empresa_id, to_char(o.created_at,'YYYY-MM') mes,
 o.gc_excluido_em, o.gc_alterado_em,
 glasscode_private.orcamento_protegido(to_jsonb(o)) protegido,
 lower(coalesce(to_jsonb(o)->>'status',to_jsonb(o)->>'situacao','')) estado,
 coalesce(to_jsonb(o)->>'obra_referencia','') referencia,
 nullif(to_jsonb(o)->'dados'->>'obra','') is not null obra_texto,
 nullif(to_jsonb(o)->>'obra_id','') is not null or nullif(to_jsonb(o)->>'pedido_id','') is not null vinculo_id,
 nullif(to_jsonb(o)->>'excluir_em','') vencimento_antigo
 from public.orcamentos o
), meses as (
 select empresa_id,mes,count(*) total,
 count(*) filter(where gc_excluido_em is null and not protegido) elegiveis,
 count(*) filter(where gc_excluido_em is null and protegido) protegidos,
 count(*) filter(where gc_excluido_em is not null) na_lixeira,
 count(*) filter(where referencia not in ('','Projetos') or obra_texto) com_referencia_textual,
 count(*) filter(where vinculo_id) com_obra_ou_pedido_id,
 array_agg(distinct estado) estados_encontrados,
 min(gc_alterado_em) menor_data_nova_contagem,max(gc_alterado_em) maior_data_nova_contagem,
 min(vencimento_antigo) primeiro_vencimento_antigo,max(vencimento_antigo) ultimo_vencimento_antigo
 from base group by empresa_id,mes
), configuracoes as (
 select e.id empresa_id,e.nome,
 c.dias prazo_atual_dias,c.atualizado_em,
 case when c.empresa_id is null then 'Sem configuração migrada; manter sempre' when c.dias is null then 'Manter sempre' else 'Prazo configurado' end situacao
 from public.empresas e left join glasscode_private.retencao_config c on c.empresa_id=e.id
 where exists(select 1 from public.orcamentos o where o.empresa_id=e.id)
)
select jsonb_build_object(
 'configuracoes',(select jsonb_agg(to_jsonb(c)) from configuracoes c),
 'por_mes',(select jsonb_agg(to_jsonb(m) order by empresa_id,mes) from meses m)
) diagnostico;
