-- Após 20261109_fornecedores_compras.sql. Preserva vínculos existentes.
begin;
alter table public.gc_fornecedores add column dados_cadastrais jsonb not null default '{}'::jsonb
 check (jsonb_typeof(dados_cadastrais) = 'object');
commit;
-- Reversão: voltar a interface anterior e manter a coluna para preservar dados.
