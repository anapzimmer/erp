# Asaas — cobranças administradas no painel

Fluxo aprovado: criar clientes, assinaturas mensais e enviar links pelo Asaas. Glass Code somente consulta a API, registra pagamentos e atualiza o período pago. Não há mais criação de clientes, assinaturas ou checkout pela aplicação.

## Uso

1. Criar assinatura mensal ativa no Asaas, com modalidade definida (boleto, cartão ou Pix).
2. Em /plataforma → Assinaturas Asaas, informar o ID da empresa no Glass Code, o ID sub_ da assinatura e o plano. Somente a proprietária pode salvar. O valor e cliente são conferidos diretamente no Asaas; o vínculo não libera acesso.
3. Enviar o link de pagamento gerado no Asaas ao cliente.
4. O webhook confirma o pagamento e atualiza o período. Para pagamento anterior ao vínculo, reenviar a notificação pelo Asaas. Bloqueios administrativos permanecem.

## Implantação pendente

- Aplicar database/20261105_asaas_cobranca_painel.sql antes de publicar o código. A migration depende das funções/tabelas presentes no diagnóstico fornecido. As migrations de checkout preparadas anteriormente foram descartadas localmente; não aplicá-las. Nenhuma migration remota foi executada.
- Vercel: ASAAS_AMBIENTE=production, chave real em ASAAS_API_KEY e token privado ASAAS_WEBHOOK_TOKEN. O .env.local permanece intacto. Chaves de homologação são rejeitadas no ambiente real quando identificadas pelo prefixo.
- Configurar webhook real para https://www.glasscode.com.br/api/asaas/webhook com o mesmo token. Incluir eventos de pagamentos necessários: confirmação, recebimento, atualização, vencimento, exclusão, estorno e chargebacks. Eventos de checkout não são mais utilizados.
- Registros antigos recebem ambiente NULL: requerem vínculo explícito. Não converter registros de Sandbox para produção. Uma empresa já vinculada a outra assinatura exige conciliação; nenhum registro é apagado automaticamente.
- Executar validação operacional de entrega do webhook. Testes locais não comprovam entrega externa nem credenciais reais.

## Regras e limites

- Acesso pago depende da empresa do usuário, assinatura ativa e prazo válido. Mantém vencimento + um mês, conforme regra anterior. Não altera funções de teste gratuito ou bloqueio administrativo.
- Duplicatas não ampliam período. Estorno/exclusão/chargeback retiram o período correspondente; outros pagamentos continuam válidos. Reversão posterior de um estorno exige conciliação manual.
- A assinatura deve manter o valor e a modalidade vinculados. Alterações comerciais, estornos parciais e cancelamento de assinatura sem evento de pagamento precisam de conciliação. Não há painel de conciliação nesta entrega.
- Preço promocional de Fundadores não é automatizado. O plano vinculado não substitui mecanismos de permissões/módulos existentes; conferir concessão de recursos no painel atual.
- Tabelas, histórico e migrations antigas do banco foram preservados. Rotas de criação de cobranças, helpers de checkout e tela antiga foram removidos do código.

## Validação

Testes automatizados de consulta, diagnóstico, pagamento, ambiente e vínculo; SQL local com dados fictícios em transação revertida no laboratório existente. Não foram realizadas cobranças reais nem testes visuais autenticados. A fixture técnica não reproduz todas as FKs/fluxos de login de produção.

## Reversão

Pausar o webhook, restaurar versão compatível do código e aplicar database/20261105_asaas_cobranca_painel_reversao.sql. Preserva dados e coluna ambiente. Não desfaz períodos já recalculados nem cancela cobranças no Asaas. Revisar pagamentos pendentes antes de retomar o webhook.
