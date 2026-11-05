-- Cobranças criadas no Asaas. Não remove históricos ou vínculos existentes.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.gc_asaas_processar_pagamento(text,text,text,bigint,date,text,text)') IS NULL OR to_regprocedure('public.gc_assinatura_paga_vigente()') IS NULL THEN RAISE EXCEPTION 'Instale a estrutura Asaas existente antes desta migration'; END IF;
END $$;
ALTER TABLE glasscode_private.asaas_assinaturas ADD COLUMN IF NOT EXISTS ambiente text CHECK (ambiente IN ('sandbox','production'));
-- NULL exige vínculo explícito pela proprietária; não inferir o ambiente de registros antigos.
CREATE OR REPLACE FUNCTION public.gc_asaas_processar_pagamento(p_pagamento_id text, p_assinatura_asaas_id text, p_cliente_asaas_id text, p_valor_centavos bigint, p_vencimento date, p_status text, p_modalidade text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_assinatura glasscode_private.asaas_assinaturas%ROWTYPE;
  v_status text;
  v_fim_ciclo timestamptz;
  v_pagamento_existente glasscode_private.asaas_pagamentos%ROWTYPE;
  v_linhas integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Operação não autorizada'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_pagamento_id), '') IS NULL
     OR nullif(btrim(p_assinatura_asaas_id), '') IS NULL
     OR nullif(btrim(p_cliente_asaas_id), '') IS NULL
     OR p_valor_centavos IS NULL
     OR p_valor_centavos <= 0
     OR p_vencimento IS NULL
     OR p_modalidade IS NULL OR p_modalidade NOT IN ('BOLETO','CREDIT_CARD','PIX')
     OR p_status IS NULL OR p_status NOT IN ('PENDING','CONFIRMED','RECEIVED','OVERDUE','REFUNDED','DELETED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL')
  THEN
    RAISE EXCEPTION 'Dados de pagamento inválidos';
  END IF;

  SELECT *
  INTO v_assinatura
  FROM glasscode_private.asaas_assinaturas
  WHERE asaas_assinatura_id = p_assinatura_asaas_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada';
  END IF;

  IF v_assinatura.asaas_cliente_id IS DISTINCT FROM p_cliente_asaas_id
     OR v_assinatura.valor_centavos IS DISTINCT FROM p_valor_centavos
     OR v_assinatura.modalidade IS DISTINCT FROM p_modalidade
  THEN
    RAISE EXCEPTION 'Cobrança não corresponde à assinatura';
  END IF;

  SELECT *
  INTO v_pagamento_existente
  FROM glasscode_private.asaas_pagamentos
  WHERE asaas_pagamento_id = p_pagamento_id
  FOR UPDATE;

  IF FOUND AND (
    v_pagamento_existente.empresa_id IS DISTINCT FROM v_assinatura.empresa_id
    OR v_pagamento_existente.assinatura_id IS DISTINCT FROM v_assinatura.id
    OR v_pagamento_existente.valor_centavos IS DISTINCT FROM p_valor_centavos
    OR v_pagamento_existente.vencimento IS DISTINCT FROM p_vencimento
  ) THEN
    RAISE EXCEPTION 'Pagamento já associado a dados diferentes';
  END IF;

  v_status := CASE p_status
    WHEN 'PENDING' THEN 'pendente'
    WHEN 'CONFIRMED' THEN 'confirmado'
    WHEN 'RECEIVED' THEN 'recebido'
    WHEN 'OVERDUE' THEN 'vencido'
    WHEN 'DELETED' THEN 'cancelado'
    ELSE 'estornado'
  END;

  INSERT INTO glasscode_private.asaas_pagamentos (
    empresa_id,
    assinatura_id,
    asaas_pagamento_id,
    valor_centavos,
    vencimento,
    status,
    confirmado_em
  )
  VALUES (
    v_assinatura.empresa_id,
    v_assinatura.id,
    p_pagamento_id,
    p_valor_centavos,
    p_vencimento,
    v_status,
    CASE
      WHEN v_status IN ('confirmado', 'recebido') THEN now()
      ELSE NULL
    END
  )
  ON CONFLICT (asaas_pagamento_id)
  DO UPDATE SET
    status = CASE
      WHEN glasscode_private.asaas_pagamentos.status IN ('estornado','cancelado')
        AND EXCLUDED.status IN ('pendente','confirmado','recebido','vencido')
      THEN glasscode_private.asaas_pagamentos.status
      WHEN glasscode_private.asaas_pagamentos.status='recebido' AND EXCLUDED.status='confirmado' THEN 'recebido'
      WHEN glasscode_private.asaas_pagamentos.status IN ('confirmado', 'recebido')
           AND EXCLUDED.status = 'pendente'
      THEN glasscode_private.asaas_pagamentos.status
      ELSE EXCLUDED.status
    END,
    confirmado_em = COALESCE(
      glasscode_private.asaas_pagamentos.confirmado_em,
      EXCLUDED.confirmado_em
    ),
    atualizado_em = now()
    WHERE glasscode_private.asaas_pagamentos.empresa_id=EXCLUDED.empresa_id
      AND glasscode_private.asaas_pagamentos.assinatura_id=EXCLUDED.assinatura_id
      AND glasscode_private.asaas_pagamentos.valor_centavos=EXCLUDED.valor_centavos
      AND glasscode_private.asaas_pagamentos.vencimento=EXCLUDED.vencimento;
  GET DIAGNOSTICS v_linhas=ROW_COUNT;
  IF v_linhas<>1 THEN RAISE EXCEPTION 'Pagamento associado a dados diferentes'; END IF;


  SELECT max((vencimento + interval '1 month') AT TIME ZONE 'America/Sao_Paulo')
    INTO v_fim_ciclo FROM glasscode_private.asaas_pagamentos
    WHERE assinatura_id=v_assinatura.id AND status IN ('confirmado','recebido');
  UPDATE glasscode_private.asaas_assinaturas SET
    acesso_pago_ate=v_fim_ciclo,
    status=CASE WHEN status IN ('cancelada','suspensa') THEN status
      WHEN v_fim_ciclo>now() THEN 'ativa'
      WHEN v_status IN ('vencido','estornado','cancelado') THEN 'inadimplente'
      ELSE 'pendente' END,
    atualizada_em=now() WHERE id=v_assinatura.id;
  RETURN jsonb_build_object('processado',true,
    'acesso_liberado',coalesce(v_fim_ciclo>now(),false) AND v_assinatura.status NOT IN ('cancelada','suspensa'),
    'acesso_pago_ate',v_fim_ciclo);

END;
$function$
;
CREATE OR REPLACE FUNCTION public.gc_asaas_finalizar_evento(p_evento_id text,p_erro text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Não autorizado' USING errcode='42501'; END IF;
 IF p_erro IS NOT NULL AND p_erro NOT IN ('ESTADO_NAO_SUPORTADO','SEM_RECURSO_SUPORTADO') THEN RAISE EXCEPTION 'Categoria inválida'; END IF;
 UPDATE glasscode_private.asaas_eventos SET processado_em=CASE WHEN p_erro IS NULL THEN now() ELSE NULL END,erro=p_erro WHERE asaas_evento_id=p_evento_id;
END $$;
CREATE OR REPLACE FUNCTION public.gc_asaas_vinculo_ativo(p_assinatura text,p_ambiente text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Não autorizado' USING errcode='42501'; END IF;
 RETURN EXISTS(SELECT 1 FROM glasscode_private.asaas_assinaturas WHERE asaas_assinatura_id=p_assinatura AND ambiente=p_ambiente);
END $$;
CREATE OR REPLACE FUNCTION public.gc_asaas_vincular_painel(p_empresa uuid,p_assinatura text,p_cliente text,p_plano text,p_valor bigint,p_modalidade text,p_ambiente text,p_autor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a glasscode_private.asaas_assinaturas%rowtype;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT EXISTS(SELECT 1 FROM glasscode_private.proprietaria WHERE usuario_id=p_autor) THEN RAISE EXCEPTION 'Não autorizado' USING errcode='42501'; END IF;
 IF p_empresa IS NULL OR p_assinatura IS NULL OR p_assinatura !~ '^sub_[A-Za-z0-9_]+$' OR p_cliente IS NULL OR p_cliente !~ '^cus_[A-Za-z0-9_]+$'
 OR p_plano IS NULL OR p_plano NOT IN ('essencial','profissional','completo') OR p_valor IS NULL OR p_valor<=0
 OR p_modalidade IS NULL OR p_modalidade NOT IN ('BOLETO','CREDIT_CARD','PIX') OR p_ambiente IS NULL OR p_ambiente NOT IN ('sandbox','production') THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_empresa::text,0));
 SELECT * INTO a FROM glasscode_private.asaas_assinaturas WHERE empresa_id=p_empresa FOR UPDATE;
 IF FOUND THEN
   IF a.asaas_assinatura_id IS DISTINCT FROM p_assinatura OR a.asaas_cliente_id IS DISTINCT FROM p_cliente OR a.valor_centavos IS DISTINCT FROM p_valor
     OR a.modalidade IS DISTINCT FROM p_modalidade OR a.plano IS DISTINCT FROM p_plano OR (a.ambiente IS NOT NULL AND a.ambiente<>p_ambiente) THEN
     RAISE EXCEPTION 'Empresa já vinculada com condições diferentes; conciliação necessária'; END IF;
   UPDATE glasscode_private.asaas_assinaturas SET ambiente=p_ambiente,atualizada_em=now() WHERE id=a.id;
 ELSE
   INSERT INTO glasscode_private.asaas_assinaturas(empresa_id,asaas_cliente_id,asaas_assinatura_id,plano,valor_centavos,modalidade,ambiente)
   VALUES(p_empresa,p_cliente,p_assinatura,p_plano,p_valor,p_modalidade,p_ambiente);
 END IF;
 INSERT INTO glasscode_private.asaas_eventos(asaas_evento_id,tipo,payload,processado_em)
 VALUES('vinculo:'||gen_random_uuid()::text,'CONFIGURACAO_VINCULO',jsonb_build_object('empresa_id',p_empresa,'assinatura',p_assinatura,'ambiente',p_ambiente,'autor_id',p_autor),now());
END $$;
REVOKE ALL ON FUNCTION public.gc_asaas_processar_pagamento(text,text,text,bigint,date,text,text),public.gc_asaas_finalizar_evento(text,text),public.gc_asaas_vinculo_ativo(text,text),public.gc_asaas_vincular_painel(uuid,text,text,text,bigint,text,text,uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gc_asaas_processar_pagamento(text,text,text,bigint,date,text,text),public.gc_asaas_finalizar_evento(text,text),public.gc_asaas_vinculo_ativo(text,text),public.gc_asaas_vincular_painel(uuid,text,text,text,bigint,text,text,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
