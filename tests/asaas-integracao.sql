-- Executar somente dentro da transação de fixture no laboratório local.
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $$
DECLARE empresa uuid:=gen_random_uuid(); outra uuid:=gen_random_uuid(); assinatura uuid; c uuid; r jsonb; fim timestamptz; quantidade integer;
BEGIN
 INSERT INTO glasscode_private.asaas_assinaturas(empresa_id,asaas_cliente_id,asaas_assinatura_id,plano,valor_centavos,modalidade)
 VALUES(empresa,'cus_ficticio','sub_ficticia','essencial',27990,'BOLETO') RETURNING id INTO assinatura;
 r:=public.gc_asaas_processar_pagamento('pay_ficticio','sub_ficticia','cus_ficticio',27990,current_date,'PENDING','BOLETO');
 IF (r->>'acesso_liberado')::boolean THEN RAISE EXCEPTION 'Pendente liberou'; END IF;
 r:=public.gc_asaas_processar_pagamento('pay_ficticio','sub_ficticia','cus_ficticio',27990,current_date,'CONFIRMED','BOLETO');
 IF NOT (r->>'acesso_liberado')::boolean THEN RAISE EXCEPTION 'Confirmado não liberou'; END IF;
 fim:=(r->>'acesso_pago_ate')::timestamptz;
 r:=public.gc_asaas_processar_pagamento('pay_ficticio','sub_ficticia','cus_ficticio',27990,current_date,'RECEIVED','BOLETO');
 IF (r->>'acesso_pago_ate')::timestamptz<>fim THEN RAISE EXCEPTION 'Duplicata ampliou período'; END IF;
 SELECT count(*) INTO quantidade FROM glasscode_private.asaas_pagamentos WHERE assinatura_id=assinatura;
 IF quantidade<>1 THEN RAISE EXCEPTION 'Pagamento duplicado'; END IF;
 BEGIN
   PERFORM public.gc_asaas_processar_pagamento('pay_ficticio','sub_ficticia','cus_outra',27990,current_date,'RECEIVED','BOLETO');
   RAISE EXCEPTION 'Aceitou cliente errado' USING errcode='XX999';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 r:=public.gc_asaas_processar_pagamento('pay_ficticio','sub_ficticia','cus_ficticio',27990,current_date,'REFUNDED','BOLETO');
 IF (r->>'acesso_liberado')::boolean OR r->>'acesso_pago_ate' IS NOT NULL THEN RAISE EXCEPTION 'Estorno manteve período'; END IF;
 r:=public.gc_asaas_processar_pagamento('pay_ficticio','sub_ficticia','cus_ficticio',27990,current_date,'CONFIRMED','BOLETO');
 IF (r->>'acesso_liberado')::boolean THEN RAISE EXCEPTION 'Evento antigo desfez estorno'; END IF;
 UPDATE glasscode_private.asaas_assinaturas SET status='suspensa' WHERE id=assinatura;
 r:=public.gc_asaas_processar_pagamento('pay_renovacao','sub_ficticia','cus_ficticio',27990,current_date,'CONFIRMED','BOLETO');
 IF (r->>'acesso_liberado')::boolean THEN RAISE EXCEPTION 'Pagamento desfez suspensão'; END IF;
 INSERT INTO glasscode_private.asaas_assinaturas(empresa_id,asaas_cliente_id,asaas_assinatura_id,plano,valor_centavos,modalidade,ambiente)
 VALUES(outra,'cus_cartao','sub_cartao','essencial',27990,'CREDIT_CARD','production');
 IF public.gc_asaas_vinculo_ativo('sub_cartao','sandbox') THEN RAISE EXCEPTION 'Ambiente misturado'; END IF;
 IF NOT public.gc_asaas_vinculo_ativo('sub_cartao','production') THEN RAISE EXCEPTION 'Vínculo ausente'; END IF;
 r:=public.gc_asaas_processar_pagamento('pay_cartao','sub_cartao','cus_cartao',27990,current_date,'CONFIRMED','CREDIT_CARD');
 IF NOT (r->>'acesso_liberado')::boolean THEN RAISE EXCEPTION 'Cartão não liberou'; END IF;
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 BEGIN
  PERFORM public.gc_asaas_processar_pagamento('pay_fraude','sub_cartao','cus_cartao',27990,current_date,'CONFIRMED','CREDIT_CARD');
  RAISE EXCEPTION 'Usuário comum processou pagamento' USING errcode='XX999';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_function_privilege('authenticated','public.gc_asaas_vincular_painel(uuid,text,text,text,bigint,text,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'RPC exposta'; END IF;
 RAISE NOTICE 'PASSOU: pendência, confirmação, duplicação, isolamento, estorno, evento antigo, suspensão, cartão, ambientes e permissões.';
END $$;
