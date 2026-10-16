# Programa de Parceiros Fundadores — oferta e evolução proposta

## Implementado nesta etapa (develop)

- `/fundadores`: página pública comercial, sem acesso às APIs ou dados de parceiros; `/founders` permanece privado.
- `/planos`: seção separada dos três planos, que conservam seus preços e recursos.
- `src/config/foundersComercial.ts`: oferta em centavos, limite de 30 empresas, 3 usuários, 3 mensalidades pagas promocionais de R$ 99,90 e regular de R$ 199,90. Também contém os parâmetros propostos de descontos, sem ativá-los no banco.
- `src/config/comercial.ts`: WhatsApp compartilhado com Planos. Abrir o link não envia a mensagem automaticamente.
- Inclusão exata de `/fundadores` nas listas de páginas públicas e no sitemap; sem alterar a decisão de acesso às rotas privadas.

**A configuração é comercial, não é fonte de autorização, cobrança nem atualização de contratos.** A publicação desta etapa não torna o modelo interno compatível automaticamente. Nenhuma migração foi criada ou aplicada e nenhum registro foi modificado.

## Diagnóstico do modelo atual

O painel `src/components/founders/FoundersAdminView.tsx` inicializa `valor_mensal_acordado` em `39.90`. O tipo/formulário e a API `src/app/api/plataforma/founders/route.ts` transportam um valor mensal e um ciclo de avaliação; isso não representa dois preços e três pagamentos confirmados. Alterar apenas o número produziria um contrato incompleto.

Ocorrências legadas preservadas:

| Local | Significado |
| --- | --- |
| `database/20261015_founders_fundacao.sql` | Default `valor_mensal_acordado = 39.90`, configuração `mensalidade_sugerida_centavos = 3990`, avaliação de 90 dias |
| `src/components/founders/FoundersAdminView.tsx` | Valor inicial do cadastro interno, ainda legado |
| `docs/FOUNDERS_PERMISSOES.md` | Documentação da configuração antiga |
| `database/20261015_founders_correcao_seguranca_testes.sql` | Dados controlados do contrato antigo |
| `database/20261016_founders_votacoes_admin_testes.sql` | Dados controlados do contrato antigo |
| `database/20261017_founders_cadastro_parceiros_testes.sql` e `..._concorrencia.md` | Cenários de capacidade, numeração e concorrência com dados legados |

As migrações e seus testes históricos não devem sofrer substituição cega. O painel antigo permanece assim até aprovar a evolução; não usar seu valor inicial como condição da nova oferta.

### Conflito de acesso

`PlatformAccessGate.tsx` consulta `gc_minha_situacao` e, por compatibilidade, `gc_acesso_permitido`. O teste geral de cinco dias pode bloquear a tela interna mesmo com participação Founders ativa. Na correção de segurança SQL, `gc_founders_empresa_ativa` considera status e datas de participação, mas não a situação geral de acesso do ERP. Habilitar a participação não deve, sozinho, conceder assinatura paga ou ignorar suspensão.

O ciclo de avaliação de 90 dias não pode ser convertido em promoção nem em gratuidade. A regra nova deve contar mensalidades pagas, não apenas dias decorridos. Contar pagamentos sem identificar a competência também é insuficiente: dois lançamentos do mesmo pagamento não podem consumir duas mensalidades promocionais.

## Modelo proposto — depende de aprovação

Reaproveitar a estrutura de parceiros, ledger de pontos, benefícios e resgates. Acrescentar o vínculo comercial ao modelo de assinatura existente, após conferir suas restrições, sem criar uma segunda assinatura concorrente para a mesma empresa.

| Informação | Tratamento proposto |
| --- | --- |
| Versão da oferta e aceite | Registrar condições aceitas e autor/data, por empresa |
| Preços promocional e regular | Inteiros em centavos, snapshot contratual; alterações de configuração não reescrevem contratos |
| Quantidade promocional | 3 competências pagas distintas, confirmadas e auditadas |
| Ativação comercial | Data de habilitação contratual, separada da participação |
| Primeira mensalidade paga | Data real confirmada do primeiro pagamento |
| Fim previsto da promoção | Informação estimada; pagamento e competência determinam a mudança de preço |
| Contratação | Pendente, ativa, cancelada; inadimplência apurada pelas competências e vencimentos |
| Participação Founders | Reutilizar ativo/inativo/pausado/encerrado e datas atuais |
| Acesso ERP | Decisão efetiva derivada de teste, cobertura paga e bloqueios administrativos |
| Usuários | Limite 3 validado também no servidor, incluindo convites concorrentes |

Não converter parceiros existentes automaticamente. A nova migração deve adicionar campos compatíveis e manter registros legados identificados até revisão e aceite individual. Não inferir pagamentos de datas de adesão ou do valor acordado.

### Regra de acesso proposta

1. Suspensão administrativa prevalece sobre teste e pagamento, preservando os canais públicos de suporte.
2. Sem suspensão, teste gratuito permanece cinco dias conforme a regra geral, sem consumir mensalidades promocionais.
3. Contrato com cobertura paga vigente libera os recursos contratados mesmo depois do teste, com validação no banco e no servidor.
4. Teste vencido sem cobertura válida bloqueia o ERP; apenas ser fundador não contorna esse bloqueio.
5. Cancelamento impede renovação; preservar o acesso até o fim da competência já paga, salvo suspensão administrativa. Essa política precisa ser aprovada.
6. Pausar/encerrar participação interrompe as ações exclusivas do programa; não deve apagar o histórico nem cancelar uma competência paga silenciosamente. Preço e plano seguintes exigem definição e aceite.
7. Avaliação consultiva de 90 dias, se mantida, não controla gratuidade nem desconto promocional.

Usar uma decisão canônica de acesso nas RPCs/RLS e API, refletida pelo frontend. Auditar todas as funções Founders que consultam apenas participação para impedir acesso direto após suspensão. Preservar isolamento por empresa e privilégios restritos; não confiar em preço, saldo, empresa ou status enviados pelo navegador.

**Impactos a aprovar:** mudança nas funções globais de acesso, no gate, nas RPCs/RLS Founders, na assinatura por empresa e na gestão de usuários; política de cancelamento/pausa e tratamento de registros legados. Nenhum desses itens foi implementado nesta etapa.

## Pontos, resgates e descontos propostos

Parâmetros iniciais centralizados em `foundersDescontosPropostos`: 100 pontos → R$ 10,00; 250 → R$ 25,00; 500 → R$ 50,00. Na próxima etapa, o catálogo administrativo persistido deve ser a fonte autorizada, com versão/vigência e snapshot no pedido. O frontend atual não deve ser fonte de saldo nem de autorização.

- Acumular por contribuições reconhecidas, nunca automaticamente por voto.
- Solicitação reserva pontos em transação; rejeição/cancelamento libera a reserva; aplicação conclui o consumo, sem débito duplicado. Preservar a semântica do ledger existente ao definir os lançamentos compensatórios.
- Um desconto de mensalidade por empresa e competência, protegido por restrição única e operação transacional, inclusive em aprovações concorrentes.
- Desconto financeiro apenas após três competências pagas confirmadas, sem empilhar resgates, sem transferência, conversão em dinheiro ou saldo negativo. Validar também o limite do valor da mensalidade.
- Distinguir solicitado, aprovado, rejeitado, cancelado e aplicado. Aprovação não significa desconto utilizado.
- Idempotência persistida por empresa/operação/chave, com comparação de payload; a mesma tentativa retomada após falha de rede usa a mesma chave. Os formulários atuais precisam preservar essa chave, em vez de criar um UUID novo em cada tentativa.
- Registrar concessão, reserva, aprovação, rejeição, aplicação, estorno, autor, data, justificativa, competência e referência financeira.
- Não reduzir cobranças automaticamente. Até integração financeira validada, aplicação deve ser conferida e registrada por administrador com evidência.
- Catálogo também pode conter treinamento e acesso antecipado, com disponibilidade e regras específicas.

O painel atual já possui concessão de pontos e partes do fluxo de resgate, mas declara pendências nas listagens de catálogo, extrato e resgates. Completar as RPCs e telas sobre as tabelas existentes, sem um catálogo paralelo. Revisar os retornos administrativos das sugestões para incluir descrição, observações e anexos, evitando sobrescrever observações antigas com campo vazio. Configuração do bucket privado de anexos e leitura autorizada permanecem pendências da auditoria anterior.

## Painel administrativo proposto

Aba Parceiros: empresa, número de fundador, participação, situação comercial, ativação, primeira mensalidade paga/início promocional, término previsto identificado como estimativa, contador de competências pagas, ambos os preços, usuários e saldo. Não chamar o ciclo de avaliação de assinatura paga.

Aba Pontuação e benefícios: catálogo versionado, extrato, pedidos, aprovar/rejeitar, descontos aprovados e efetivamente utilizados, histórico de cada ação. Paginação real e autorização administrativa em todas as ações.

## Migração e validação futuras

Somente após aprovação: nova migração versionada, sem editar SQL aplicado; restrições, índices únicos, RLS e RPCs transacionais; testes com empresas fictícias em ambiente local/homologação. Sem executar SQL em produção nesta entrega.

Cenários obrigatórios: teste vigente/vencido; fundador ativo sem pagamento; pagamento após teste vencido; suspensão com pagamento; três pagamentos e passagem para quarto; pagamento duplicado/estornado; cancelamento e pausa; dois admins resgatando simultaneamente; saldo insuficiente; reapresentação da mesma chave; acesso cruzado entre empresas; chamada direta à API/RPC; aplicação duplicada por competência; convites simultâneos acima de três usuários. Conferir migração de registros legados sem alterar seus termos.

## Revisão local da etapa pública

Executar `npm run dev` e abrir `/fundadores` e `/planos` no endereço local informado pelo Next. Não usar contas ou clientes reais. Conferir visita sem sessão, CTAs, FAQ, preços e telas estreitas. `/founders` continua sendo o painel interno e não foi incluído nas rotas públicas.

Validação realizada em 16/10/2026: TypeScript completo sem emissão e ESLint dos arquivos alterados aprovados; build de produção concluído com 87 páginas, incluindo `/fundadores`. Após ajustes visuais finais, ESLint aprovado novamente. Revisão no navegador local sem login, FAQ expandido, navegação entre as duas páginas e destino/mensagem dos links de WhatsApp conferidos sem enviar mensagem. Em largura de 390 px, ambas as páginas sem transbordamento horizontal após ajuste do cabeçalho. Comparação automatizada confirmou que a lista original de planos e recursos não mudou e que `/founders`, `/plataforma` e a API continuam fora da lista pública. `git diff --check` aprovado. Alterações locais na develop, sem commit, push ou deploy.
