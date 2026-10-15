# Checklist — segurança e integração (Founders etapa 2)

## 1) Pré-migração (obrigatório)

- [ ] Confirmar backup e janela de manutenção do banco.
- [ ] Garantir que `painel_plataforma.sql` já foi aplicado (`gc_proprietaria()` existente).
- [ ] Validar existência de `public.empresas` e `public.perfis_usuarios`.
- [ ] Confirmar que o bucket de anexos planejado (`founders-anexos`) existe.

## 2) Aplicação segura da migração

- [ ] Executar [20261015_founders_fundacao.sql](../database/20261015_founders_fundacao.sql) no SQL Editor como role com permissão administrativa.
- [ ] Verificar finalização com `commit` sem erros.
- [ ] Confirmar `notify pgrst, 'reload schema'` aplicado.

## 3) Verificação estrutural no banco

- [ ] Tabelas públicas criadas:
  - `founders_parceiros`
  - `founders_contribuicoes`
  - `founders_contribuicao_anexos`
  - `founders_votacoes`
  - `founders_votos`
  - `founders_pontos_ledger`
  - `founders_beneficios`
  - `founders_resgates`
- [ ] Tabelas privadas criadas:
  - `glasscode_private.founders_admins`
  - `glasscode_private.founders_auditoria`
  - `glasscode_private.founders_config`

## 4) Segurança/RLS

- [ ] RLS habilitado em todas as tabelas do módulo.
- [ ] Cliente de empresa A não enxerga registros da empresa B.
- [ ] Usuário autenticado sem vínculo em `perfis_usuarios` não acessa dados de empresa.
- [ ] `founders_pontos_ledger` não permite `UPDATE`/`DELETE` (imutabilidade).
- [ ] Operações administrativas falham para não-admin Founders.

## 5) Regras críticas de negócio

- [ ] Número de fundador único e atribuído automaticamente.
- [ ] Uma empresa vota uma única vez por votação (`unique`).
- [ ] Duplicidade de pontos bloqueada por idempotência.
- [ ] Resgate com saldo insuficiente é recusado.
- [ ] Resgate duplicado por mesma chave é recusado.
- [ ] Contribuição/anexo só para empresa ativa no programa.
- [ ] Anexo com MIME/tamanho inválido é recusado.

## 6) API (contrato e integração)

- [ ] `GET /api/plataforma/founders?visao=minha-area` retorna dados da empresa logada.
- [ ] `GET /api/plataforma/founders?visao=admin` exige admin Founders.
- [ ] `POST` com ações de empresa valida payload e regra no banco.
- [ ] `POST` com ações admin exige `gc_founders_admin`.
- [ ] Códigos HTTP coerentes: 400/401/403/503.

## 7) Auditoria

- [ ] Alteração administrativa de parceiro registra evento em `founders_auditoria`.
- [ ] Ajuste administrativo de pontos registra evento.
- [ ] Atualização administrativa de contribuição registra evento.

## 8) Pós-aplicação

- [ ] Revisar logs de erro da API do projeto.
- [ ] Validar endpoints com duas contas:
  - admin Founders/proprietária;
  - usuária de empresa participante.
- [ ] Validar endpoint com usuária de empresa não participante.
- [ ] Congelar schema e só avançar para telas após aprovação dessa base.
