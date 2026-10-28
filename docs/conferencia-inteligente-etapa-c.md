# Conferência Inteligente — preparação da etapa C

Atualização em 28/10/2026: a revisão adicional, auditoria informada pela usuária,
backup, pré/pós-instalação e recuperação estão em [conferencia-etapa-c-instalacao.md](conferencia-etapa-c-instalacao.md).
Esse roteiro atualiza as pendências sobre as duas funções de inicialização descritas abaixo.
Validação atual: 44 testes aprovados, TypeScript sem erros e lint direcionado sem erros ou avisos.
As verificações anteriores abaixo permanecem como registro da primeira preparação.

Entrega preparada na develop. Nenhum commit, push, deploy ou migração no Supabase.

## Portabilidade seletiva

Origem analisada: main 3222a0169686ca78633edc3cc02bca3a2eea6062. A develop tinha apenas o cálculo e os artefatos A/B; a Gestão não existia nesta branch. Não houve merge de branches. Foram copiados 29 arquivos completos, listados abaixo, e apenas trechos necessários de revisão em 45 páginas de cálculo.

- src/app/gestao/pedidos/ConferenciaUnidadesAvulsas.tsx
- src/app/gestao/pedidos/EditarMedidasPedido.tsx
- src/app/gestao/pedidos/FinanceiroPedido.tsx
- src/app/gestao/pedidos/PreviaOrcamento.tsx
- src/app/gestao/pedidos/RelatorioPedidoFechado.tsx
- src/app/gestao/pedidos/RevisaoPedido.tsx
- src/app/gestao/pedidos/page.tsx
- src/app/gestao/pedidos/pedidos.module.css
- src/utils/rotasRevisaoPedido.ts
- src/utils/revisaoCalculoPedido.ts
- src/utils/diferencasRevisaoPedido.ts
- src/utils/quantidadeProjetoPedido.ts
- src/utils/financeiroPedidos.ts
- src/utils/pedidos.ts
- database/20261025_gestao_pedidos.sql
- database/20261025_gestao_recebimentos.sql
- database/20261025_modulos_empresa.sql
- database/20261025_pedidos_itens_detalhados.sql
- database/20261025_pedidos_revisoes.sql
- database/20261026_revisao_medidas_pedido.sql
- database/GESTAO_PEDIDOS.md
- database/MODULOS.md
- tests/gestao-pedidos-db.test.cjs
- src/app/gestao/financeiro/ConfiguracoesPagamento.tsx
- src/app/gestao/financeiro/PainelFinanceiro.tsx
- src/app/gestao/financeiro/configuracoes-pagamento.module.css
- src/app/gestao/financeiro/page.tsx
- src/app/gestao/financeiro/painel-financeiro.module.css
- src/app/modulos/page.tsx

Adaptações existentes:
- src/components/ConfiguracaoModal.tsx: suporte opcional a compacto exigido pela Gestão; padrão dos demais consumidores preservado.
- src/components/Header.tsx: acesso a Pedidos e Financeiro, preservando Founders e o layout da develop.
- As páginas de cálculo listadas no manifesto receberam armazenamento separado para revisão e retorno ao pedido. Não foram incorporadas as mudanças de preços, acréscimos, cores, kits, site ou outras regras da main.
- Financeiro e /modulos foram necessários porque os cartões da Gestão já apontam para essas rotas. Nenhum novo fluxo de conferência de vãos foi adicionado à interface.
- A integração local do motor compartilhado Box2 foi mantida. O único conflito textual foi a inclusão de imports no topo do Box2; ambos foram preservados.
- Durante a retomada, a usuária confirmou edições locais no tratamento de dias_vencimento do Financeiro e remoção da trava operacional do SQL. Foram preservadas. Não houve execução desse SQL, conforme confirmação da usuária.
- Não foram alterados package.json ou lockfile: todas as dependências necessárias já estavam instaladas (Next/React, Supabase, lucide, TypeScript e PGlite para testes locais).

Inventário completo, incluindo as 45 rotas: conferencia-etapa-c-portabilidade.json.

## Auditoria real por leitura da API

A usuária identificou “Sistema VS Code Inicio”, project ref hjrzcjbwfmybffnhurqj, como ambiente de TESTES. O hostname de .env.local corresponde exatamente a esse ref. Foram realizadas somente requisições GET da API: pedido #2, suas unidades, metadados OpenAPI e snapshot técnico desse mesmo pedido. Nenhuma RPC foi invocada. Credenciais não foram impressas nem gravadas nos artefatos.

Pedido #2: afd02d1b-b222-47f1-98d0-206d05382d8d; empresa b2ac500e-99be-4b50-a96b-39db8989dfd7; situação conferencia, versão 2, revisão 2.

| Grupo | Registros | Situação |
|---|---:|---|
| Box 2 folhas | 4 | Todos pendentes, versão 1 |
| Box de canto | 4 | Todos pendentes, versão 1 |
| Vidros avulsos | 17 | Todos pendentes, versão 1 |
| Total | 25 | Nenhum registro modificado |

As 17 unidades avulsas são 11 vidros (2 de 500×1500 e 9 de 505×1500 mm) e 6 unidades de kits/ferragens, estas sem largura/altura. Não tratar todos os avulsos como vidro nem usar quantidade=1 do cartão agregado como quantidade física.

Box2: dois vãos de 1400×2800 mm, trilho Até o teto. Linha fixa d5aae598-7efc-482f-bfff-8992e8a091f9 e móvel 6b253fa2-3858-4cee-a041-a9ba2e2e0cc7. Cada linha já tem numero_unidade 1 e 2. As medidas reais 700×2745 e 750×2780 coincidem com o motor A/B. O planejamento local associa fixo 1 + móvel 1 e fixo 2 + móvel 2; não cria peças e não grava conjuntos.

A evidência técnica e os horários das consultas estão em conferencia-etapa-c-auditoria-api.json. É uma fotografia da consulta, não um monitoramento em tempo real.

## Funções e limites da auditoria

Todas as oito funções solicitadas estão expostas no OpenAPI:
- gc_inicializar_unidades_avulsas
- gc_inicializar_unidades_desenhos
- gc_conferir_unidade
- gc_reabrir_unidade
- gc_liberar_unidade
- gc_revisar_medidas_pedido
- gc_revisar_pedido
- gc_situacao_pedido

Definições locais existem para as três últimas nas migrações 20261025/26 copiadas. Elas verificam empresa, versão e estados; revisões registram antes/depois. A revisão comercial exige autorização financeira e conciliação quando há parcelas; a revisão técnica preserva o total contratado. O SQL local de transição global não verifica conjuntos. As funções remotas podem divergir dessas versões.

Não há conexão SQL direta ou ferramenta Supabase configurada para obter pg_get_functiondef, políticas reais, grants e triggers. A API confirma nomes, colunas e alguns vínculos, mas não demonstra o corpo das funções nem RLS efetiva. Não foi presumida equivalência. O arquivo 20261027_conjuntos_auditoria_somente_leitura.sql prepara as consultas de catálogo necessárias, dentro de transação READ ONLY. O resultado ainda precisa ser obtido e revisado antes de aplicar a estrutura.

## Estrutura preparada

20261027_conjuntos_estrutura.sql cria, sem preencher:

1. gc_pedido_conjuntos: UUID próprio; pedido/empresa/projeto; número do conjunto; tipo box2folhas; campo de origem e revisão original; dimensões originais imutáveis; dimensões conferidas separadas; configuração técnica e versão do motor; estado pendente/medida_registrada/validada; versão; autor, datas e motivo.
2. gc_pedido_conjunto_pecas: vínculo com a unidade já existente, identificada como fixo ou móvel. Uma unidade só pode ter um conjunto e cada conjunto só pode ter um fixo e um móvel. FKs compostas incluem empresa, pedido e projeto; exclusões são restritas.
3. gc_pedido_conjunto_historico: registro de criação, alteração e vínculo, com antes/depois, versão, autor, data e motivo; alteração e exclusão de histórico são bloqueadas.

RLS utiliza gc_modulo_permitido para leitura. anon não recebe acesso; authenticated recebe apenas SELECT. Não existe RPC de escrita nova nem política que permita inserir, alterar ou apagar pela aplicação. Todas as funções auxiliares têm search_path vazio e execução direta revogada. As futuras RPCs deverão validar sessão, empresa, versão do pedido, versão do conjunto, completude das duas peças e estado de produção.

A migração adiciona somente índices compostos às tabelas existentes para suportar FKs. Não adiciona/atualiza/exclui peças, não inicializa unidades e não substitui funções existentes. Não tem estado liberado, não habilita liberação parcial, não toca estoque/cortes/financeiro. Box de canto permanece para etapa G.

O utilitário planejarConjuntosBox2.ts é uma prévia pura: usa IDs explícitos de linhas, ordinal da unidade, medidas originais e motor validado. Recusa peças faltantes, duplicadas, não pendentes, de origem divergente ou medidas incompatíveis. Não usa metragem comercial para contar peças e não sobrescreve valores históricos. Só gera proposta; os conjuntos ainda não são salvos.

## Riscos e condições para aplicação

- Revisar as definições remotas de inicialização, revisão, reabertura e liberação, RLS e triggers. Um processo legado que apague/recrie unidades pode colidir com as novas FKs; não substituir funções sem essa análise.
- Conferir novamente as 25 unidades e seus IDs imediatamente antes de uma futura execução. Os índices exigem que não existam inconsistências de identidade; índices/FKs podem bloquear brevemente tabelas durante a instalação.
- Não reaplicar as seis migrações antigas copiadas da main: elas são histórico/dependência local, não atualizações pendentes do banco existente.
- A criação das tabelas não migra nem valida conjuntos automaticamente. A atribuição das peças precisa de etapa explícita, idempotente e transacional após a auditoria; somente dados confirmados podem ser vinculados.
- A completude do conjunto (as duas peças) e bloqueios de revisão/liberação global precisam ser implementados nas futuras RPCs das etapas E/F; não são habilitados pela etapa C.
- Permissões da aplicação foram verificadas localmente em PostgreSQL descartável, não por contas de usuários reais no Supabase.
- Não foi realizado teste visual autenticado nem fluxo real de gravação no ERP. A portabilidade foi validada com TypeScript, lint, testes locais e comparação de código.

Antes de aplicar: obter e revisar o resultado da auditoria somente leitura, validar a estrutura contra as políticas reais, confirmar o plano de instalação/backup e receber aprovação explícita da usuária. Não avançar para a interface (D) nesta entrega.

## Validação final

- `npx next typegen`: concluído.
- `npx tsc --noEmit`: aprovado, sem erros, inclusive após os ajustes finais de dependências dos efeitos.
- ESLint nos 66 arquivos TypeScript/JavaScript selecionados pelo manifesto e no planejador: 0 erros e 903 avisos. A comparação inicial das fontes de origem registrou 902 avisos; permanece um aviso adicional do fluxo importado de restauração de estado dos vidros avulsos. Não foi feita limpeza geral dos avisos legados.
- Foram corrigidas as dependências de efeitos relacionadas à chave da Central e ao token de revisão, para acompanhar mudanças de sessão sem referências antigas.
- `git diff --check`: aprovado.
- `node --test tests/box2Folhas.test.cjs tests/gestao-pedidos-db.test.cjs tests/planejar-conjuntos-box2.test.cjs tests/conjuntos-estrutura-db.test.cjs tests/lote-envio-central.test.cjs tests/atualizar-precos-orcamento.test.cjs`: 38 testes aprovados, nenhum erro. Inclui 1.512 comparações de equivalência do motor.
- Testes SQL executados somente no PGlite descartável em memória; nenhuma migração executada no Supabase.
- As edições locais do Financeiro e a retirada da trava operacional da proposta SQL foram preservadas conforme confirmação da usuária. A ausência dessa trava não autoriza executar a migração: a auditoria e a aprovação continuam pendentes.

Etapa C preparada localmente; auditoria remota das definições SQL e políticas ainda incompleta. Nenhum commit, push ou publicação realizado.
