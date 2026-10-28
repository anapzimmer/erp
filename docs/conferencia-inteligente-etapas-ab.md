# Conferência inteligente — etapas A e B

Data: 27/10/2026. Trabalho em develop (base c57663f). Sem commit, push, merge, deploy ou operação no banco.

## Escopo e divergência de branches

O checkout começou na main, limpo. A develop existente é anterior à Gestão de Pedidos. Foi selecionada conforme solicitado; nenhuma alteração da main foi incorporada. Os arquivos de Gestão e SQL abaixo foram inspecionados somente com git show/git grep na main. Não estão disponíveis neste checkout develop. A integração da conferência na Gestão depende de alinhar essas branches por um procedimento Git autorizado antes das próximas etapas.

## Inventário e dependências

- src/app/(calculos)/box2fls/page.tsx: cálculo original, catálogo/cor, preço por cliente, materiais, PDF, lotes e salvamento. O useMemo de medidas agora chama o motor compartilhado; seus consumidores e o layout foram mantidos.
- src/app/(calculos)/boxcanto/page.tsx: cálculo próprio com quatro peças, larguras A e B (B é armazenada em alturaAteTubo). Auditado, não alterado.
- src/utils/preservarPrecosOrcamento.ts e tabelaClienteOrcamento.ts: preservação dos preços salvos e identificação da tabela do cliente; não alterados.
- src/utils/materiaisAutomaticos.ts, barras.ts, catalogo-cor.ts: composição de materiais, barras e seleção de cor; não alterados.
- Na main, src/app/gestao/pedidos/page.tsx e pedidos.module.css: fluxo, navegação e apresentação da Gestão.
- Na main, EditarMedidasPedido.tsx: identifica rota original, abre editor e recebe revisão; usa revisaoCalculoPedido, rotasRevisaoPedido, diferencasRevisaoPedido e quantidadeProjetoPedido.
- Na main, ConferenciaUnidadesAvulsas.tsx: conferência por peça com versão e estados pendente/conferida/liberada; permite editar quando pedido está em conferencia. Conferir exige medidas positivas; reabrir exige motivo.
- Na main, database/20261025_gestao_pedidos.sql, 20261025_modulos_empresa.sql, 20261025_gestao_recebimentos.sql, 20261025_pedidos_itens_detalhados.sql, 20261025_pedidos_revisoes.sql e 20261026_revisao_medidas_pedido.sql: origem de pedidos, permissões de módulos, recebimentos e revisões.

## Snapshots e segurança encontrados

origem_snapshot guarda o orçamento original. Os projetos podem estar em itens.documentoPdfCompleto e/ou itens.projetosPdf. Identificação, rota, quantidade, medidas, vidro, materiais e desenho vêm desses registros; a quantidade de conjuntos não deve ser inferida pela metragem comercial. A representação de um projeto em lote não identifica individualmente seus vãos.

A migração de gc_revisar_medidas_pedido verifica empresa, versão, motivo, situação e identidade do projeto; bloqueia encerrados, exige justificativa adicional em produção/pronto, registra antes/depois e preserva colunas comerciais do pedido. Porém não referencia unidades/conjuntos individuais no SQL versionado. A revisão global pode conflitar com a futura conferência individual se essa integração não for prevista.

gc_situacao_pedido valida empresa, versão e sequência de estados com bloqueio de linha. A definição versionada permite conferencia → liberado sem consultar a pendência individual das peças. Não é prova do comportamento do banco atual: funções remotas podem ter alterações não versionadas.

Não foram encontradas definições SQL versionadas para gc_inicializar_unidades_avulsas, gc_inicializar_unidades_desenhos, gc_conferir_unidade, gc_liberar_unidade e gc_reabrir_unidade. O componente chama conferir/reabrir com ID e versão, mas a segurança dessas funções, RLS e isolamento precisam ser auditados no banco de TESTES. Guardas na interface não substituem validação no servidor.

Nenhum banco foi acessado. Não foi confirmada a identidade de uma conexão de testes. As 25 unidades do pedido #2 (4 Box2, 4 canto, 17 avulsas) são informação fornecida, não uma verificação desta execução. Nenhum registro ou histórico foi alterado.

## Motor extraído

Arquivo: src/utils/calculos-projetos/box2Folhas.ts.

calcularVidrosBox2Folhas preserva o contrato da página, inclusive zeros durante preenchimento e os nomes dos campos. calcularConjuntoBox2Folhas calcula somente um vão e devolve duas peças identificadas por função (fixo/móvel), separando fabricação de cobrança. Não cria IDs persistentes, não grava, não aprova, não libera, não recebe preços. Valida medidas finitas/positivas, descontos e trilho conhecido. A futura camada de snapshots deverá resolver explicitamente configurações antigas/ambíguas antes de chamá-lo.

Fórmulas em mm, L = largura do vão, H = altura:

| Peça | Largura real | Altura padrão | Altura até o teto |
|---|---|---|---|
| Fixo | L / 2 | máximo(0, H − 35) | máximo(0, H − 55) |
| Móvel | L / 2 + 50 | máximo(0, H) | máximo(0, H − 20) |

Cobrança: cada dimensão é arredondada para cima ao múltiplo de 50 mm. Área de cada tipo = largura cobrada × altura cobrada × quantidade de conjuntos / 1.000.000. Áreas individuais e total são arredondados a três casas, mantendo a soma antes do arredondamento final. A fabricação não recebe esse arredondamento: L=1385 resulta em 692,5 e 742,5 mm. Nenhum desconto foi criado ou modificado.

Box de canto auditado: aplica L/2 e L/2+50 independentemente aos lados A e B, mesmos descontos de altura, quatro peças e arredondamento comercial por dimensão. Extração adiada para a etapa G.

As fórmulas Box2 de main e develop são textualmente iguais. Há diferenças de integração no restante da página (revisões, seleção de kits, preços), que não foram portadas. Não houve comparação com snapshots reais; se houver divergência histórica, a integração futura deve impedir sobrescrita automática e solicitar validação técnica.

## Validação local

- node --test tests/box2Folhas.test.cjs tests/lote-envio-central.test.cjs tests/atualizar-precos-orcamento.test.cjs: 24 testes passaram. O teste de falha de armazenamento emite propositalmente mensagem de erro, mas passa.
- 6 testes novos: equivalência de 1.512 combinações com oráculo congelado do useMemo anterior; dimensões explícitas nos dois trilhos; dois conjuntos iguais/alteração isolada; repetição sem mutação; entradas inválidas; precisão e arredondamento.
- O teste com 17 avulsos é um snapshot sintético para verificar ausência de mutação, não valida o pedido #2 no banco.
- npx next typegen e npx tsc --noEmit: passaram. A primeira execução do TypeScript detectou tipos gerados da main para rotas ausentes na develop; regenerar os tipos corrigiu isso sem alterar código de aplicação.
- ESLint nos arquivos alterados e novos: zero erros, 19 avisos da página original. A mesma página no HEAD anterior também tem 19 avisos; motor e testes não acrescentaram avisos.
- Interface não alterada. Sem teste visual autenticado, persistência, produção ou consulta ao banco nesta fase.

## Arquivos desta etapa

- Alterado: src/app/(calculos)/box2fls/page.tsx.
- Criados: src/utils/calculos-projetos/box2Folhas.ts; tests/box2Folhas.test.cjs; tests/fixtures/box2Folhas-legado.cjs; este relatório.

## Próxima etapa

Antes da C: alinhar a base de Gestão na develop por fluxo autorizado, confirmar banco de testes e obter definições reais das funções/RLS e estado das 25 peças. Depois propor migração de conjuntos e vínculo com peças existentes, sem recriar os 17 avulsos. Testar idempotência, concorrência, isolamento por empresa, revisão global, histórico, reabertura e bloqueio de unidades pendentes/liberadas. Interface D, persistência E e proteção F permanecem pendentes. Nenhuma liberação parcial foi habilitada nesta execução.
