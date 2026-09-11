-- Adiciona campos de preço por m² para cálculo especial de espelhos LED + adesivo.
-- Script idempotente: pode ser executado mais de uma vez sem erro.
ALTER TABLE public.acabamentos
  ADD COLUMN IF NOT EXISTS preco_jato numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_adesivo numeric(12,2) NOT NULL DEFAULT 0;
