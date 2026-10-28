# Salvar conferência do vão — 28/10/2026

Implementação local solicitada após a instalação da Etapa C. Não executada no Supabase.

## Uso

Cada vão do Box 2 folhas tem botão **Salvar conferência**, campo de motivo (mínimo três caracteres), estado de carregamento/gravação e confirmação da versão salva. Ao reabrir, busca as medidas no banco. Cancelar edição retorna à última medida salva, ou à original se nunca foi salva. O primeiro registro pode confirmar as medidas originais sem alterá-las. Cada vão é independente.

O botão só grava com pedido em conferência, leitura concluída, medidas válidas e motivo preenchido. Repetição durante a requisição é bloqueada. Erros mantêm as entradas; não há mensagem falsa de sucesso nem gravação local apresentada como persistência. Se faltar a função no banco, informa que a gravação ainda precisa ser ativada.

## Limite da operação

Salva medidas conferidas do **conjunto**, identifica/vincula as duas unidades existentes e registra histórico transacional. Recalcula a exibição dos vidros a partir do vão salvo usando o motor box2folhas-v1. Não grava medidas conferidas nem muda a situação das unidades individuais. Não altera preço, parcelas, snapshot comercial ou liberação de produção. Preserva integralmente o gatilho que bloqueia conferência individual do Box. A futura aplicação das medidas nas peças/produção exige integração separada e auditada; o aviso da tela informa isso.

## Segurança

RPC usa auth.uid e o helper privado pedido_empresa existente. Empresa, configuração, quantidade, linhas, unidades e autor são resolvidos no servidor. Só recebe identidade do projeto, número do vão, versões esperadas, medidas novas e motivo. Valida snapshot único, exatamente duas peças no vão, IDs das linhas presentes no snapshot e dimensões originais compatíveis com o motor. Ambiguidades são recusadas. Requer as unidades previamente inicializadas; não cria peças.

Bloqueia pedido, unidades e conjunto durante a operação. Exige versão do pedido e do conjunto; duas abas não sobrescrevem silenciosamente. Revisão ou mudança do snapshot original bloqueia a continuidade até reconciliação explícita. Conjuntos existentes sem a configuração completa também são recusados, sem sobrescrever os originais.

Função SECURITY DEFINER com search_path vazio, execução somente para authenticated. Não concede DML nas tabelas nem altera qualquer função/gatilho legado. Medidas e históricos são registrados na mesma transação; falha reverte tudo. Não existe parâmetro de bypass para os gatilhos.

## Ativação pendente de aprovação

O único SQL novo a aplicar é `database/20261028_conjuntos_salvar_medidas.sql`, após backup e confirmação do ambiente. Não repetir a migração da estrutura C, que já foi instalada. Não executar rollback como etapa de instalação.

Ainda depende de autorização para execução remota. Após aplicar, testar com usuário autorizado: salvar um vão, reabrir para conferir persistência, confirmar que o outro vão não mudou e que as peças/preço/situação do pedido continuam preservados. Esses testes de gravação reais não foram feitos nesta execução.

Se for necessário desativar a funcionalidade, preparar revogação de EXECUTE na nova RPC e ocultação/desativação do botão; preservar os conjuntos e históricos gravados. Não usar rollback de tabelas vazias após iniciar o uso.

## Arquivos

- `src/app/gestao/pedidos/ConferenciaConjuntosBox2Folhas.tsx`: botão, motivo, leitura e gravação por vão.
- `src/app/gestao/pedidos/EditarMedidasPedido.tsx`: contexto do pedido/projeto para a conferência.
- `database/20261028_conjuntos_salvar_medidas.sql`: RPC nova, sem execução remota.
- `tests/conjuntos-salvar-medidas-db.test.cjs`: autorização, isolamento, persistência, conflitos e atomicidade em PGlite descartável, usando o snapshot das 25 unidades.

O helper de autorização é simulado nos testes novos; as definições remotas e concorrência real entre conexões não são provadas por PGlite. Nenhuma credencial foi lida ou armazenada nesta implementação.

## Validação local

31 testes passaram em `conjuntos-salvar-medidas-db`, `conjuntos-estrutura-db`, `planejar-conjuntos-box2` e `box2Folhas`, incluindo 1.512 comparações do motor. TypeScript (`npx tsc --noEmit`) passou. Lint do componente de conferência e teste novo passou sem erros/avisos; diff-check passou. Sem teste autenticado de navegador nem execução remota da RPC nesta entrega.
