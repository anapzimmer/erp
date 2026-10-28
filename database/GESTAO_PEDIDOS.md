# Gestão — Pedidos (etapa 1)

## Ativação
1. Se ainda não foi instalada, executar `20261025_modulos_empresa.sql` no SQL Editor do Supabase.
2. Executar **uma vez** `20261025_gestao_pedidos.sql` como administrador. A migração é transacional e não apaga registros.
3. Em Plataforma > Empresas > Módulos, liberar Gestão para a empresa contratante.
4. Abrir Gestão > Pedidos no ERP.

## Entrega
- Pedido manual com itens, cliente, obra, prazo e observações.
- Aprovação/conversão de orçamento salvo com cópia integral do original, valores preservados e conversão única por orçamento.
- Conferência > liberado > em produção > pronto > entregue; cancelamento antes de entregue, com motivo.
- Alteração de conteúdo apenas em conferência; pedidos convertidos permitem editar prazo/observações, sem mudar os valores aprovados.
- Histórico e proteção contra edição simultânea por versão.
- Banco calcula o total manual; alterações diretas nas tabelas não são concedidas aos usuários.
- Orçamentos vinculados ficam protegidos da limpeza/lixeira/exclusão, inclusive após cancelamento do pedido.

## Segurança e limites
- RLS isola por empresa e contratação; RPCs repetem a autorização antes de escrever, com sessão do usuário, sem service_role.
- Nesta etapa os usuários autenticados da empresa com Gestão liberada podem operar pedidos. O financeiro exige uma autorização individual adicional, concedida pela proprietária.
- O andamento é manual. Com a atualização de recebimentos, permite parcelamento e baixa manual. Não emite notas ou cobranças bancárias, nem executa reservas, cortes ou baixa de estoque.
- Histórico não tem exclusão pela interface. Pedidos não são apagados: são cancelados.
- Cancelar um pedido não permite reconverter a mesma origem; uma nova proposta deve ser salva como novo orçamento.
- A atualização estende a função de retenção da migração orcamentos_corrigir_legado_90dias.sql. Se houver regras customizadas no banco, compare-as antes de instalar.

## Verificação
`node --test tests/gestao-pedidos-db.test.cjs` executa as migrações em PostgreSQL local isolado (PGlite) com usuários de duas empresas: bloqueio sem módulo, elevação negada, isolamento, edição direta negada, validação de itens, duplicidade de conversão, snapshot, versões, estados, retenção e revogação. Não utiliza dados reais.

Após instalar, confirmar também no Supabase com duas contas reais: empresa liberada, empresa sem Gestão, revogação e conversão de um orçamento de teste. O teste local não valida políticas preexistentes de perfis/orçamentos nem a instalação remota.

## Continuação: financeiro dos pedidos
1. Depois das migrações de módulos e pedidos, execute **uma vez** `20261025_gestao_recebimentos.sql` no SQL Editor do Supabase. Não execute novamente as migrações já instaladas.
2. Em Plataforma > Usuários > Permissão financeira, autorize o responsável da empresa, registrando o motivo. Gestão também precisa estar liberada para a empresa.
3. Em Gestão > Pedidos, abra um pedido e localize Financeiro do pedido.
4. Distribua as parcelas, ajuste entrada, valores e vencimentos, e confirme. A soma deve ser exatamente igual ao pedido.
5. Registre pagamentos integrais ou parciais. Os saldos e atrasos são calculados a partir dos recebimentos não estornados.
6. Para corrigir, estorne com motivo. Para renegociar, estorne pagamentos, cancele o parcelamento e crie outro. Todos os registros são preservados.

O botão de recebimento registra uma informação manual; não emite boleto, não confirma pagamento bancário e não emite nota fiscal. Financeiro não é acessível apenas por conhecer a URL: a autorização é aplicada também no banco. Parcelamento ativo impede mudar os valores ou cancelar o pedido antes de resolver as parcelas.

A proprietária só acessa dados operacionais financeiros da própria empresa, com Gestão liberada; a administração permite autorizar responsáveis de outras empresas, sem misturar seus dados.

A suíte local também verifica bloqueio financeiro sem permissão, total de parcelas, pagamento parcial, repetição da mesma solicitação, excesso de pagamento, estorno, renegociação, escrita direta negada, isolamento e revogação. A instalação no Supabase e a experiência com contas reais ainda devem ser verificadas após executar o arquivo.

## Itens detalhados
Execute `20261025_pedidos_itens_detalhados.sql` após Pedidos para validar os novos campos também no banco. Vidro avulso informa medidas de corte em mm, especificação e preço negociado por peça. Não calcula folgas nem recalcula por m². Projetos são trazidos por Aprovar orçamento, com desenhos existentes no snapshot; pedidos antigos sem imagem não ganham desenhos inventados. A inclusão direta pela matriz de projetos permanece para a próxima etapa.
## Revisão de pedidos
Executar `20261025_pedidos_revisoes.sql` uma vez após Pedidos e Recebimentos.
Em um pedido aberto, usar Revisar pedido. Editar/recalcular e salvar a proposta nas telas existentes; buscar a proposta do mesmo cliente, comparar com a versão atual e registrar o motivo.
Revisão técnica mantém total e parcelas. Revisão comercial exige confirmação de aprovação e permissão financeira. Se houver mudança de total com parcelas ativas, é bloqueada: complemento, crédito e devolução ainda não foram implementados. Não estornar pagamentos reais apenas para contornar esse bloqueio.
Pedido em produção/pronto exige registro da pausa e conferência operacional, que deve ser realizada pela equipe. A aplicação volta para conferência e exige nova liberação. Não há integração automática com máquinas ou planos de corte.
O histórico guarda autor, data, motivo e snapshots completos anteriores e novos, consultáveis por empresa. A revisão usa contador próprio, separado da versão de concorrência. Pedidos entregues/cancelados não podem ser revisados. Nesta etapa a versão é exibida na tela; PDFs específicos de pedidos versionados ainda não estão disponíveis.
