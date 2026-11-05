-- Pausar webhook e restaurar código compatível antes. Não exclui histórico nem a coluna ambiente.
BEGIN;
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
  v_novo_status text;
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
     OR p_modalidade IS DISTINCT FROM 'BOLETO'
     OR p_status NOT IN ('PENDING', 'CONFIRMED', 'RECEIVED')
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
     OR v_assinatura.modalidade IS DISTINCT FROM 'BOLETO'
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
      WHEN glasscode_private.asaas_pagamentos.status IN ('confirmado', 'recebido')
           AND EXCLUDED.status = 'pendente'
      THEN glasscode_private.asaas_pagamentos.status
      ELSE EXCLUDED.status
    END,
    confirmado_em = COALESCE(
      glasscode_private.asaas_pagamentos.confirmado_em,
      EXCLUDED.confirmado_em
    ),
    atualizado_em = now();

  IF p_status = 'PENDING' THEN
    RETURN jsonb_build_object(
      'processado', true,
      'acesso_liberado', false,
      'motivo', 'pagamento_pendente'
    );
  END IF;

  IF v_assinatura.status IN ('cancelada', 'suspensa') THEN
    RETURN jsonb_build_object(
      'processado', true,
      'acesso_liberado', false,
      'motivo', 'assinatura_bloqueada'
    );
  END IF;

  v_fim_ciclo :=
    (
      (p_vencimento + INTERVAL '1 month')
      AT TIME ZONE 'America/Sao_Paulo'
    );

  IF v_fim_ciclo <= now() THEN
    RETURN jsonb_build_object(
      'processado', true,
      'acesso_liberado', false,
      'motivo', 'periodo_expirado'
    );
  END IF;

  UPDATE glasscode_private.asaas_assinaturas
  SET
    status = 'ativa',
    acesso_pago_ate = GREATEST(
      COALESCE(acesso_pago_ate, '-infinity'::timestamptz),
      v_fim_ciclo
    ),
    atualizada_em = now()
  WHERE id = v_assinatura.id;

  RETURN jsonb_build_object(
    'processado', true,
    'acesso_liberado', true,
    'empresa_id', v_assinatura.empresa_id,
    'acesso_pago_ate', GREATEST(
      COALESCE(v_assinatura.acesso_pago_ate, '-infinity'::timestamptz),
      v_fim_ciclo
    )
  );
END;
$function$
;
DROP FUNCTION IF EXISTS public.gc_asaas_finalizar_evento(text,text);
DROP FUNCTION IF EXISTS public.gc_asaas_vinculo_ativo(text,text);
DROP FUNCTION IF EXISTS public.gc_asaas_vincular_painel(uuid,text,text,text,bigint,text,text,uuid);
NOTIFY pgrst,'reload schema';
COMMIT;
