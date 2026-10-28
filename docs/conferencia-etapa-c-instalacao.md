# Etapa C — revisão e preparação de instalação

Revisão local em 28/10/2026, branch develop. Não executada no Supabase.

## Evidências e limites

O snapshot documentado do projeto hjrzcjbwfmybffnhurqj contém 25 unidades pendentes do pedido nº 2: quatro Box 2 folhas, quatro Box de canto e 17 avulsas (11 vidros e seis kits/ferragens). Não foi realizada nova consulta remota nesta revisão. As medidas dos dois vãos são 1400 × 2800 mm, até o teto: fixos 700 × 2745 e móveis 750 × 2780 mm. O planejador e seu teste usam os IDs reais das linhas e os números 1 e 2; não criam peças.

A usuária informou a auditoria de gc_inicializar_unidades_avulsas e gc_inicializar_unidades_desenhos: autenticação, empresa e Gestão exigidas; INSERT ON CONFLICT DO NOTHING, sem excluir/recriar. Isso reduz o risco anteriormente apontado para essas duas funções; elas ainda podem acrescentar unidades e devem ficar sem concorrência durante a instalação. O relatório recebido é evidência fornecida, não uma extração independente das definições SQL nesta execução.

Os mecanismos gc_proteger_financeiro_pedido, gc_pedido_unidades_empresa_consistente e gc_proteger_unidade_box2folhas não são removidos, desativados ou substituídos. As demais RPCs de revisão e liberação ainda requerem comparação com suas definições reais antes de integrar escrita por conjunto. A instalação somente cria estrutura vazia, sem ativar essa integração.

## Correções nesta revisão

- Tempo máximo de espera por bloqueio de 5 segundos e por comando de 60 segundos na migração e recuperação. Erro deixa a transação abortada: emitir ROLLBACK antes de qualquer nova tentativa.
- Pré-condição explícita para o schema privado já existente; nenhum schema substituto criado silenciosamente.
- Conjunto inicial não pode trazer medidas conferidas; começa pendente, versão 1.
- Vínculo valida tipo Box 2 folhas, origem, ordinal do conjunto e situação pendente. Bloqueio de linha serializa o vínculo com atualização do conjunto; unidade é somente lida com bloqueio compartilhado. FKs continuam verificando empresa, pedido e projeto.
- Consultas de pré/pós-instalação e rollback restrito à estrutura vazia, sem CASCADE.
- Testes adicionais de isolamento real entre empresas, papéis repetidos, falha ao final do DDL, rollback de vínculos, proteção individual e recuperação vazia/ocupada.

## Instalação proposta — somente após autorização

1. Confirmar o projeto pelo painel, ref hjrzcjbwfmybffnhurqj; conferir que a sessão SQL é administrativa e que não há trabalhos de inicialização/revisão em execução. Não passar chave de serviço para o navegador.
2. Pausar operações de escrita de pedidos/unidades na janela combinada. Se não for possível controlar concorrência, adiar. Não desabilitar RLS ou gatilhos.
3. Obter backup no recurso já existente do Supabase, se disponível, e registrar identificador, horário, cobertura e procedimento de restauração. Não assumir que o plano possui backup/PITR. Na ausência, preparar exportação PostgreSQL consistente das tabelas públicas de pedidos, unidades, revisões, financeiro e dependências, junto das definições públicas/privadas, constraints, índices, funções, gatilhos, RLS e grants. Usar conexão administrativa já configurada de forma segura, sem incluir URL com senha em scripts, logs, histórico ou artefatos do repositório; não exportar segredos de conexão nem senhas de roles.
4. Verificar o backup: arquivo existente e não vazio, SHA-256, inventário de objetos (`pg_restore --list` para formato custom), contagens e IDs compatíveis com o snapshot; testar restauração em PostgreSQL local descartável com dependências auth/roles equivalentes. Registrar sucesso e divergências. Listar o arquivo não substitui o ensaio de restauração. Não criar outro Supabase. Se não houver backup restaurável validado, não instalar.
5. Executar a auditoria somente leitura de 20261027 e a pré-instalação de 20261028. Guardar resultados em local restrito fora do repositório, sem credenciais. Os hashes de dados agregados não revelam conteúdo, mas podem custar memória em bases grandes; conferir tamanho e janela primeiro.
6. Verificar: três proteções presentes/ativas e suas definições; RLS e gc_modulo_permitido; schema privado sem CREATE para papéis de aplicação; nenhuma tabela/índice da Etapa C já existente; tipos/constraints compatíveis. Comparar todas as 25 unidades com o snapshot documentado. Qualquer divergência exige revisão, sem sobrescrever dados.
7. Executar exclusivamente 20261027_conjuntos_estrutura.sql integralmente, com cliente que pare no primeiro erro (psql ON_ERROR_STOP ou transação única no editor). Não executar novamente as migrações de 20261025/26 trazidas da main. O SQL não é idempotente de reaplicação: existência prévia aborta, em vez de aceitar instalação divergente.
8. Rodar pós-instalação e novamente pré-instalação: três tabelas vazias, FKs validadas, RLS ativa, somente SELECT para authenticated e nenhum acesso para anon, nenhuma execução direta das funções privadas para esses papéis. Confirmar hashes de pedidos/unidades e de todos os gatilhos existentes exatamente iguais ao pré. Confirmar os 25 IDs, medidas, versões e situações preservados. Hash divergente não autoriza restaurar/apagar automaticamente.
9. Registrar resultados e liberar a janela somente após validar. Não popular conjuntos, alterar peças ou ativar interface/conferência/liberação nesta etapa.

## Recuperação

- Falha antes do COMMIT: ROLLBACK. Confirmar que tabelas/índices novos não ficaram presentes e que os hashes permanecem iguais. Investigar erro de estrutura, permissão ou timeout; não aumentar limites indiscriminadamente.
- Instalação confirmada, ainda sem dados novos: mediante autorização específica, 20261028_conjuntos_rollback_vazio.sql bloqueia as três tabelas, verifica que estão vazias e remove apenas objetos da Etapa C e seus dois índices de suporte. Nenhuma peça, pedido ou gatilho legado é apagado. Não usa CASCADE; dependência posterior faz abortar.
- Se houver dados/dependências posteriores: rollback recusa. Preservar os dados e preparar correção para frente ou recuperação seletiva revisada. Não restaurar backup antigo sobre movimentações novas. Restauração exige autorização e ensaio compatível com o incidente.
- Backup e resultados de validação ainda não foram produzidos no ambiente real: são condições de execução, não tarefas declaradas concluídas.

## Compatibilidade futura e riscos restantes

As revisões originais e configuração são imutáveis; revisão comercial/técnica global não pode simplesmente reaproveitar um conjunto após mudar quantidade, trilho, materiais ou projeto. Futuras RPCs deverão bloquear pedido antes de conjunto, conferir versão do pedido/conjunto e reconciliar IDs/peças de forma explícita; divergência deve impedir conferência, não recriar peças. Ao persistir vínculos, validar também a linha de origem fixo/móvel e as medidas contra o snapshot autorizado e motor. O SQL desta fase não substitui essa RPC.

O gatilho de Box permanece fechado. Uma futura adaptação não deve confiar em booleano/token ou variável de sessão definida pelo navegador. Proposta a revisar: rotina privada sob papel técnico NOLOGIN dedicado, sem concessão de associação aos usuários; entrada por RPC autenticada que valide empresa, módulo, versões e estado do pedido, bloqueie as duas peças e atualize tudo na mesma transação. A guarda deve reconhecer a autoridade efetiva restrita dessa rotina e revalidar o vínculo. As RPCs individuais continuam sem esse papel e continuam bloqueadas. Não implementar essa exceção nesta etapa; testar com as definições reais antes de liberar.

Os testes de proteção Box usam um gatilho simulado do contrato informado e uma RPC individual simulada SECURITY DEFINER. Não provam o comportamento das RPCs reais. RLS dos conjuntos usa o predicado existente de módulo, cuja definição/grants devem ser conferidos no pré. Testes locais não cobrem concorrência real entre conexões, volume/tempo do índice nem o provedor Supabase. Índices não concorrentes podem bloquear escrita temporariamente; os limites abortam com segurança.

## Arquivos desta revisão

- Modificados: database/20261027_conjuntos_estrutura.sql; tests/conjuntos-estrutura-db.test.cjs; docs/conferencia-inteligente-etapa-c.md.
- Novos: database/20261028_conjuntos_pre_instalacao.sql; database/20261028_conjuntos_pos_instalacao.sql; database/20261028_conjuntos_rollback_vazio.sql; este roteiro.
- Nenhuma mudança adicional em páginas, motor A/B, manifesto ou snapshot da auditoria.

## Situação

Validação local final: 44 testes aprovados em seis arquivos, incluindo 1.512 comparações do motor e verificações SQL no PGlite. `npx tsc --noEmit` passou. ESLint direcionado a `tests/conjuntos-estrutura-db.test.cjs`, `src/utils/calculos-projetos/box2Folhas.ts` e `src/utils/calculos-projetos/planejarConjuntosBox2.ts` passou sem erros nem avisos. `git diff --check` passou. O teste negativo de armazenamento do lote imprime "sem espaço" intencionalmente e passa. Os avisos legados registrados na primeira revisão não foram objeto de limpeza geral.

Comando da suíte: `node --test tests/conjuntos-estrutura-db.test.cjs tests/box2Folhas.test.cjs tests/gestao-pedidos-db.test.cjs tests/planejar-conjuntos-box2.test.cjs tests/lote-envio-central.test.cjs tests/atualizar-precos-orcamento.test.cjs`.

Preparação técnica local concluída, com instalação condicionada ao backup validado, pré-checagens reais e autorização explícita. Sem migração remota, alterações de dados, commit, push, deploy ou interface D.
