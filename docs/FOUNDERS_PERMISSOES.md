# Glass Code Founders — permissões e segurança

Este documento descreve as permissões da fundação do módulo Founders implementada em [20261015_founders_fundacao.sql](../database/20261015_founders_fundacao.sql).

## Objetivo

- Reusar autenticação atual (Supabase Auth + `perfis_usuarios`).
- Isolar dados entre empresas.
- Separar administração da plataforma (Founders) da administração das empresas clientes.
- Garantir que operações críticas sejam validadas no banco, sem confiar no frontend.

## Autorizadores do banco

## `gc_proprietaria()`

- Já existente no painel da plataforma.
- Continua sendo autoridade máxima.

## `gc_founders_admin()`

- Novo autorizador administrativo do Founders.
- Retorna `true` quando:
  - `gc_proprietaria()` é `true`, **ou**
  - a conta está ativa em `glasscode_private.founders_admins`.

Assim, o sistema já fica preparado para administradores futuros sem misturar com admin de empresa cliente.

## Vinculação usuário → empresa

- Continua via `public.perfis_usuarios`.
- A função `gc_founders_empresa_id()` resolve a empresa da sessão.
- As políticas RLS e funções de negócio usam esse vínculo para isolamento.

## Regras por domínio

## Parceiros (`founders_parceiros`)

- Leitura:
  - admins Founders/proprietária, ou usuários da própria empresa.
- Escrita:
  - somente admin Founders/proprietária.

## Contribuições e anexos

- Cliente só enxerga dados da própria empresa.
- Inserção de contribuição/anexo depende de empresa ativa no programa.
- Anexo exige validação de:
  - MIME permitido (`pdf/png/jpeg/webp`);
  - tamanho máximo (10MB);
  - caminho iniciado por `<empresa_id>/...` para evitar fuga de escopo.

## Votações e votos

- Cliente só vê votações relacionadas ao seu contexto.
- `founders_votos` tem `unique (votacao_id, empresa_id)`:
  - um voto por empresa por votação.
- Status e janela temporal também são validados no banco (`gc_founders_votar`).

## Pontos (ledger imutável)

- Tabela `founders_pontos_ledger` é histórico imutável.
- Trigger bloqueia `UPDATE` e `DELETE`.
- Estorno deve ser feito por novo lançamento (`estorno_*`), mantendo trilha histórica.
- Duplicidade controlada por:
  - `idempotency_key` por empresa;
  - índice de referência para evitar crédito/débito repetido do mesmo evento.
- Cliente não recebe permissão direta para alterar pontos.

## Resgates

- `gc_founders_resgatar_beneficio` é transacional.
- Impede:
  - saldo negativo;
  - resgate duplicado (idempotência);
  - excesso de limite por empresa;
  - estouro de estoque (quando aplicável).
- O débito de pontos é lançado na mesma operação do resgate.

## Auditoria

- Operações administrativas registram trilha em `glasscode_private.founders_auditoria`.
- Campos registrados: autor, ação, alvo, empresa e detalhes JSON.

## Configurações comerciais iniciais (parametrizadas)

Guardadas em `glasscode_private.founders_config`:

- `mensalidade_sugerida_centavos = 3990`
- `usuarios_inclusos_padrao = 3`
- `capacidade_primeira_turma = 30`
- `avaliacao_inicial_dias = 90`
- `pontos_contribuicao_validada_padrao = 100`

Sem ativação de cobrança nesta etapa.

## Observações

- RLS foi habilitado em todas as tabelas do módulo.
- Funções sensíveis usam `security definer` e validações explícitas.
- Não há dependência de validação exclusiva no frontend.
